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

### 方式一：Vercel 一键部署（推荐，无需本地运行）

点击下方按钮，1 分钟内完成部署，得到一个可直接使用的 URL：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/jxy715/road-damage-detector)

或手动操作：
1. 打开 [vercel.com/new](https://vercel.com/new)
2. 用 GitHub 账号登录，导入 `jxy715/road-damage-detector`
3. 点击 Deploy，等待 30 秒
4. 访问 Vercel 分配的 URL（如 `road-damage-detector.vercel.app`）
5. 输入 API Key + 上传图片 → 开始检测

> Vercel 免费额度：100GB 带宽/月，1000 次部署/天，个人使用完全够用。

### 方式二：本地运行

```bash
git clone https://github.com/jxy715/road-damage-detector.git
cd road-damage-detector
python app.py
# 浏览器打开 http://127.0.0.1:5000
```

### 开始检测

1. 输入 [DashScope API Key](https://dashscope.aliyun.com/)
2. 上传路面图片
3. 选择关注的边缘场景
4. 点击"开始分析"

## 技术架构

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│   浏览器前端      │ ──→ │  api/proxy.js     │ ──→ │  DashScope API │
│  (HTML/CSS/JS)  │ ←── │  (Vercel 云函数)  │ ←── │  (qwen-vl)    │
└─────────────────┘     └──────────────────┘     └───────────────┘
```

- **前端**: 原生 HTML/CSS/JavaScript
- **后端代理**: Vercel Serverless Function（自动解决 CORS，无需本地运行）
- **本地备选**: Python app.py（`python app.py`，适合离线开发）
- **AI模型**: 阿里云 qwen-vl-plus

## 项目结构

```
road-damage-detector/
├── index.html        # 主页面
├── api/
│   └── proxy.js      # Vercel Serverless 代理（云端部署用）
├── app.py            # Python 本地服务器（本地开发用）
├── vercel.json       # Vercel 部署配置
├── 启动服务器.bat     # Windows 一键启动
├── css/
│   └── style.css     # 样式
├── js/
│   └── app.js        # 核心逻辑（自动识别部署环境）
└── assets/           # 静态资源
```

## 注意事项

- 访问 GitHub Pages 时仍需在本地运行 `python app.py`，用于代理 API 请求
- 首次启动时请保持命令行窗口打开，按 `Ctrl+C` 停止
