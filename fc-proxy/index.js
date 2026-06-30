/**
 * 阿里云函数计算 FC - DashScope API 代理
 * 部署后获得 https://[id].[region].fc.aliyuncs.com/... 地址
 * 国内网络可直接访问
 */
const https = require('https');
const http = require('http');

exports.handler = async (req, resp, context) => {
  // 阿里云 FC HTTP 触发器的请求格式
  const url = new URL(req.url, 'http://localhost');
  const method = req.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    resp.setHeader('Access-Control-Allow-Origin', '*');
    resp.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    resp.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    resp.setHeader('Access-Control-Max-Age', '86400');
    resp.statusCode = 200;
    resp.end();
    return;
  }

  // 只接受 POST
  if (method !== 'POST') {
    resp.setHeader('Access-Control-Allow-Origin', '*');
    resp.setHeader('Content-Type', 'application/json');
    resp.statusCode = 405;
    resp.end(JSON.stringify({ error: '仅支持 POST 请求' }));
    return;
  }

  // 读取请求体
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    const apiKey = req.headers['x-api-key'] || '';

    if (!apiKey) {
      resp.setHeader('Access-Control-Allow-Origin', '*');
      resp.setHeader('Content-Type', 'application/json');
      resp.statusCode = 401;
      resp.end(JSON.stringify({ error: '缺少 API Key' }));
      return;
    }

    try {
      const postData = JSON.stringify(JSON.parse(body));

      const options = {
        hostname: 'dashscope.aliyuncs.com',
        port: 443,
        path: '/compatible-mode/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 55000,
      };

      const proxyReq = https.request(options, (proxyResp) => {
        let data = '';
        proxyResp.on('data', chunk => { data += chunk; });
        proxyResp.on('end', () => {
          resp.setHeader('Access-Control-Allow-Origin', '*');
          resp.setHeader('Content-Type', 'application/json');
          resp.statusCode = proxyResp.statusCode;
          resp.end(data);
        });
      });

      proxyReq.on('error', (err) => {
        resp.setHeader('Access-Control-Allow-Origin', '*');
        resp.setHeader('Content-Type', 'application/json');
        resp.statusCode = 502;
        resp.end(JSON.stringify({ error: `代理请求失败: ${err.message}` }));
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        resp.setHeader('Access-Control-Allow-Origin', '*');
        resp.setHeader('Content-Type', 'application/json');
        resp.statusCode = 504;
        resp.end(JSON.stringify({ error: '请求超时' }));
      });

      proxyReq.write(postData);
      proxyReq.end();

    } catch (err) {
      resp.setHeader('Access-Control-Allow-Origin', '*');
      resp.setHeader('Content-Type', 'application/json');
      resp.statusCode = 500;
      resp.end(JSON.stringify({ error: `请求解析失败: ${err.message}` }));
    }
  });
};
