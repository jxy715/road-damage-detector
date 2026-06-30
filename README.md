# 路面损伤检测智能体

> Road Damage Detection Agent — AI4S 课程大作业

基于阿里云通义千问 qwen-vl-plus 视觉大模型的道路路面损伤智能检测系统，支持多种损伤类型识别与边缘场景分析。

## 功能特性

- **路面图像上传** — 支持 JPG/PNG/WebP/BMP，拖拽或点击上传
- **8种边缘场景分析** — 低光照、运动模糊、遮挡、雨雪积水、阴影、低分辨率、纹理混淆、视角倾斜
- **AI 损伤检测** — 识别裂缝、坑槽、车辙、松散、修补等 12+ 种损伤类型
- **CV模型校准** — 评估图像对传统 CV 检测模型的适用性，给出建议
- **检测报告导出** — 一键导出 Markdown 格式详细报告

## 快速开始

### 1. 获取 API Key

前往 [阿里云 DashScope](https://dashscope.aliyun.com/) 注册并获取 API Key。

### 2. 启动本地代理

```bash
# 克隆项目
git clone https://github.com/jxy715/road-damage-detector.git
cd road-damage-detector

# 安装依赖（仅需 Python 3）
# 无需额外安装，使用标准库

# 启动一体化服务器
python app.py
```

### 3. 打开应用

- **本地访问**: 浏览器打开 `http://127.0.0.1:5000`
- **在线访问**: [jxy715.github.io/road-damage-detector](https://jxy715.github.io/road-damage-detector/)（需本地运行代理）

### 4. 开始检测

1. 输入 DashScope API Key
2. 上传路面图片
3. 选择关注的边缘场景
4. 点击"开始分析"

## 技术架构

```
┌─────────────────┐     ┌──────────────┐     ┌───────────────┐
│   浏览器前端      │ ──→ │  app.py 代理  │ ──→ │  DashScope API │
│  (HTML/CSS/JS)  │ ←── │  (Python)    │ ←── │  (qwen-vl)    │
└─────────────────┘     └──────────────┘     └───────────────┘
```

- **前端**: 原生 HTML/CSS/JavaScript
- **代理**: Python http.server（解决浏览器 CORS 限制）
- **AI模型**: 阿里云 qwen-vl-plus

## 项目结构

```
road-damage-detector/
├── index.html        # 主页面
├── app.py            # 一体化服务器（启动入口）
├── 启动服务器.bat     # Windows 一键启动
├── css/
│   └── style.css     # 样式
├── js/
│   └── app.js        # 核心逻辑
└── assets/           # 静态资源
```

## 注意事项

- 访问 GitHub Pages 时仍需在本地运行 `python app.py`，用于代理 API 请求
- 首次启动时请保持命令行窗口打开，按 `Ctrl+C` 停止
