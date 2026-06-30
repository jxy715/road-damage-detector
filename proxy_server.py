"""
路面损伤检测智能体 - 本地API代理服务器

作用：解决浏览器CORS跨域限制问题。
前端请求 → localhost:5000/proxy → DashScope API → 返回前端

启动方式：python proxy_server.py
"""

import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
PORT = 5000


class ProxyHandler(BaseHTTPRequestHandler):
    """处理前端代理请求，转发到DashScope API"""

    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self._set_cors_headers()
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == "/proxy":
            try:
                # 读取前端发来的请求体
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)

                # 获取API Key（从请求头中获取）
                api_key = self.headers.get("X-API-Key", "")
                if not api_key:
                    self._send_error(401, "缺少 API Key（请在请求头中设置 X-API-Key）")
                    return

                # 构建对DashScope的请求
                req = urllib.request.Request(
                    DASHSCOPE_URL,
                    data=body,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}",
                    },
                    method="POST",
                )

                # 发起请求
                with urllib.request.urlopen(req, timeout=120) as resp:
                    response_body = resp.read()
                    self._send_response(200, response_body, resp.headers.get_content_type())

            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8", errors="replace")
                print(f"[代理] DashScope API 返回错误 {e.code}: {error_body[:300]}")
                self._send_error(e.code, error_body)

            except Exception as e:
                print(f"[代理] 转发失败: {e}")
                self._send_error(500, str(e))
        else:
            self._send_error(404, "未知路径，请使用 /proxy")

    def _set_cors_headers(self):
        """设置CORS响应头，允许前端跨域访问"""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")

    def _send_response(self, code, body, content_type="application/json"):
        self.send_response(code)
        self._set_cors_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, code, message):
        body = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        """自定义日志输出"""
        print(f"[代理] {args[0]}")


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", PORT), ProxyHandler)
    print("=" * 60)
    print("  路面损伤检测智能体 - 本地代理服务器")
    print(f"  监听地址: http://127.0.0.1:{PORT}")
    print("  按 Ctrl+C 停止服务器")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[代理] 服务器已停止")
        server.server_close()
