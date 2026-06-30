# 路面损伤检测智能体

> Road Damage Detection Agent — AI4S 课程大作业

**纯静态页面，零依赖，部署到 GitHub Pages 后打开浏览器就能用。**

## 使用方式

### 直接使用（GitHub Pages）

打开 **https://jxy715.github.io/road-damage-detector/** ，三步完成：

1. 输入 [DashScope API Key](https://dashscope.aliyun.com/) 并保存
2. 上传路面图片（拖拽或点击）
3. 点击「开始检测」→ 查看报告 → 导出 Markdown

> 不需要安装 Python、不需要运行命令行、不需要部署 Vercel。DashScope API 已支持浏览器 CORS 跨域调用。

### 本地使用

```bash
git clone https://github.com/jxy715/road-damage-detector.git
cd road-damage-detector
# 直接双击 index.html 即可（或 python -m http.server）
```

## 功能

- **损伤检测**: 裂缝、坑槽、车辙、松散、修补等 12+ 种
- **8种边缘场景**: 低光照、运动模糊、遮挡、雨雪积水、阴影、低分辨率、纹理混淆、视角倾斜
- **CV模型矫正**: 评估传统CV模型适用性，给出预处理建议
- **报告导出**: 一键导出 Markdown

## 技术

- **前端**: 单文件 HTML（CSS + JS 全部内联）
- **AI模型**: 阿里云 qwen-vl-plus
- **API**: DashScope 兼容 OpenAI 格式，浏览器直连无需代理

## 架构

```
浏览器 ──→ DashScope API (qwen-vl-plus)
    ↑ CORS 已支持 (access-control-allow-origin: *)
```
