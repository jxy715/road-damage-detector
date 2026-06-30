/**
 * Render.com 部署 - 静态站点 + DashScope API 代理
 * 自动从 GitHub 部署，提供 https://road-damage-detector.onrender.com
 */
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// API 代理
app.post('/api/proxy', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: '缺少 API Key' });

  try {
    const result = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });
    const data = await result.json();
    res.status(result.status).json(data);
  } catch (err) {
    res.status(502).json({ error: `代理请求失败: ${err.message}` });
  }
});

// 静态文件
app.use(express.static(__dirname));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
