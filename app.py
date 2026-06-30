#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
============================================================================
  路面损伤检测智能体 - 一体化服务器
  Road Damage Detection Agent Server
  
  功能：
  1. 提供前端 HTML/CSS/JS 静态文件服务
  2. 代理 API 请求到阿里云 DashScope（解决浏览器 CORS 限制）
  
  启动方式：
      python app.py
  
  访问地址：
      http://127.0.0.1:5000
  
  按 Ctrl+C 停止服务器
============================================================================
"""

import json
import os
import sys
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# ======================== 配置 ========================
PORT = 5000
HOST = "127.0.0.1"
DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"

# 静态文件目录（与本脚本同目录）
BASE_DIR = Path(__file__).parent.resolve()

# MIME 类型映射
MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


class RoadDamageAgentServer(BaseHTTPRequestHandler):
    """一体化服务器：静态文件 + API 代理"""

    # ======================== 请求分发 ========================

    def do_OPTIONS(self):
        """CORS 预检请求"""
        self.send_response(200)
        self._set_cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        """处理 GET 请求：返回静态文件"""
        # 根路径 → index.html
        path = self.path.split("?")[0]  # 去掉查询参数
        if path == "/" or path == "":
            path = "/index.html"

        file_path = (BASE_DIR / path.lstrip("/")).resolve()

        # 安全检查：确保文件路径在 BASE_DIR 内
        try:
            file_path.relative_to(BASE_DIR)
        except ValueError:
            self._send_response(403, "403 Forbidden")
            return

        if file_path.exists() and file_path.is_file():
            self._serve_file(file_path)
        else:
            self._send_response(404, f"404 Not Found: {path}")

    def do_POST(self):
        """处理 POST 请求"""
        if self.path == "/proxy":
            self._handle_proxy()
        else:
            self._send_response(404, "404: 请使用 /proxy 路径发送 API 请求")

    # ======================== 静态文件服务 ========================

    def _serve_file(self, file_path):
        """返回静态文件"""
        ext = file_path.suffix.lower()
        content_type = MIME_TYPES.get(ext, "application/octet-stream")

        try:
            with open(file_path, "rb") as f:
                data = f.read()

            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", len(data))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self._send_response(500, f"读取文件失败: {e}")

    # ======================== API 代理 ========================

    def _handle_proxy(self):
        """将请求转发到 DashScope API"""
        try:
            # 读取前端发来的请求体
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)

            # 获取 API Key
            api_key = self.headers.get("X-API-Key", "")
            if not api_key:
                self._send_response(401, json.dumps({
                    "error": "缺少 API Key，请在网页中先配置 DashScope API Key"
                }, ensure_ascii=False))
                return

            # 构建对 DashScope 的请求
            req = urllib.request.Request(
                DASHSCOPE_URL,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                method="POST",
            )

            print(f"\n[代理] 正在调用 DashScope API (qwen-vl-plus)...")

            # 发起请求（超时 120 秒，大模型推理可能需要较长时间）
            with urllib.request.urlopen(req, timeout=120) as resp:
                response_body = resp.read()
                content_type = resp.headers.get_content_type()
                print(f"[代理] API 响应: {resp.status}, {len(response_body)} 字节")

                self.send_response(200)
                self._set_cors()
                self.send_header("Content-Type", content_type or "application/json")
                self.send_header("Content-Length", len(response_body))
                self.end_headers()
                self.wfile.write(response_body)

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            print(f"[代理] DashScope API 错误 ({e.code}): {error_body[:500]}")
            self._send_response(e.code, error_body)

        except Exception as e:
            msg = str(e)
            print(f"[代理] 请求失败: {msg}")
            self._send_response(500, json.dumps({
                "error": f"代理请求失败: {msg}"
            }, ensure_ascii=False))

    # ======================== 工具方法 ========================

    def _set_cors(self):
        """设置 CORS 响应头"""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")

    def _send_response(self, code, body):
        """发送 JSON 错误响应"""
        if isinstance(body, str):
            body = body.encode("utf-8")

        self.send_response(code)
        self._set_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        """自定义日志格式"""
        method = self.command
        status = args[0] if args else "-"
        # 只打印有意义的信息
        if self.path == "/proxy":
            print(f"  [{method}] {self.path} → {status}")
        elif "/css/" not in self.path and "/js/" not in self.path and "/assets/" not in self.path:
            print(f"  [{method}] {self.path} → {status}")


# ======================== 启动入口 ========================

def main():
    server = HTTPServer((HOST, PORT), RoadDamageAgentServer)

    print()
    print("=" * 62)
    print("  路面损伤检测智能体 - Road Damage Detection Agent")
    print("=" * 62)
    print()
    print(f"  服务器地址:  http://{HOST}:{PORT}")
    print(f"  API 代理:    http://{HOST}:{PORT}/proxy")
    print(f"  AI 模型:    阿里云 qwen-vl-plus")
    print()
    print("  使用方法:")
    print(f"  1. 在浏览器中打开 http://{HOST}:{PORT}")
    print("  2. 输入阿里云 DashScope API Key")
    print("  3. 上传路面图片，开始检测")
    print()
    print("  按 Ctrl+C 停止服务器")
    print("=" * 62)
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n服务器已停止。")
        server.server_close()


if __name__ == "__main__":
    main()
