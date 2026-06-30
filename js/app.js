/* ===== Road Damage Detection Agent - Core Logic ===== */

// API代理路径 - 自动适配部署环境
// 本地: http://127.0.0.1:5000 → 同源 /proxy
// GitHub Pages: jxyiii.github.io → 跨域请求 http://127.0.0.1:5000/proxy（代理已配置CORS）
const PROXY_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  ? '/proxy'
  : 'http://127.0.0.1:5000/proxy';

// ===== State Management =====
const state = {
  apiKey: '',
  uploadedImage: null,       // base64 data URL
  uploadedFile: null,        // File object
  edgeScenarios: [],
  results: null,
  isAnalyzing: false
};

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  loadApiKey();
  bindUploadEvents();
  bindEdgeOptions();
  bindAnalyzeButton();
  bindExportButtons();
});

// ===== API Key Management =====
function loadApiKey() {
  const saved = localStorage.getItem('dashscope_api_key');
  if (saved) {
    state.apiKey = saved;
    $('#apiKeyInput').value = saved;
    updateApiStatus(true);
  }
}

$('#saveApiKey').addEventListener('click', () => {
  const key = $('#apiKeyInput').value.trim();
  if (!key) {
    showToast('请输入有效的 API Key', 'error');
    return;
  }
  state.apiKey = key;
  localStorage.setItem('dashscope_api_key', key);
  updateApiStatus(true);
  showToast('API Key 已保存', 'success');
});

$('#clearApiKey').addEventListener('click', () => {
  state.apiKey = '';
  localStorage.removeItem('dashscope_api_key');
  $('#apiKeyInput').value = '';
  updateApiStatus(false);
  showToast('API Key 已清除', 'info');
});

function updateApiStatus(connected) {
  const statusEl = $('#apiStatus');
  if (connected) {
    statusEl.className = 'api-status connected';
    statusEl.textContent = '已连接 - DashScope API';
  } else {
    statusEl.className = 'api-status disconnected';
    statusEl.textContent = '未配置 API Key';
  }
}

// ===== Image Upload =====
function bindUploadEvents() {
  const uploadArea = $('#uploadArea');
  const fileInput = $('#fileInput');

  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
}

function handleFile(file) {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/bmp'];
  if (!validTypes.includes(file.type)) {
    showToast('请上传 JPG、PNG、WebP 或 BMP 格式的图片', 'error');
    return;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('图片大小不能超过 10MB', 'error');
    return;
  }

  state.uploadedFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    state.uploadedImage = e.target.result;
    showPreview(e.target.result, file);
  };
  reader.readAsDataURL(file);
}

function showPreview(dataUrl, file) {
  $('#previewImage').src = dataUrl;
  $('#imageInfo').textContent = `${file.name} (${formatFileSize(file.size)})`;
  $('#previewSection').classList.add('visible');
  $('#uploadArea').style.display = 'none';

  // Reset results
  $('#resultsSection').classList.remove('visible');
  state.results = null;
}

$('#removeImage').addEventListener('click', () => {
  state.uploadedImage = null;
  state.uploadedFile = null;
  $('#previewSection').classList.remove('visible');
  $('#uploadArea').style.display = '';
  $('#resultsSection').classList.remove('visible');
  state.results = null;
  $('#fileInput').value = '';
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ===== Edge Scenario Options =====
function bindEdgeOptions() {
  $$('.edge-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const checkbox = opt.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      opt.classList.toggle('selected', checkbox.checked);
      updateEdgeScenarios();
    });
  });
}

function updateEdgeScenarios() {
  state.edgeScenarios = [];
  $$('.edge-option input:checked').forEach(cb => {
    state.edgeScenarios.push(cb.value);
  });
}

// ===== Analyze =====
$('#analyzeBtn').addEventListener('click', async () => {
  if (!state.apiKey) {
    showToast('请先配置阿里云 DashScope API Key', 'error');
    return;
  }
  if (!state.uploadedImage) {
    showToast('请先上传路面图片', 'error');
    return;
  }
  if (state.isAnalyzing) return;

  updateEdgeScenarios();
  await runAnalysis();
});

async function runAnalysis() {
  state.isAnalyzing = true;
  const btn = $('#analyzeBtn');
  btn.classList.add('loading');
  btn.disabled = true;
  $('#loadingOverlay').classList.add('visible');

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt();

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': state.apiKey
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: state.uploadedImage } },
              { type: 'text', text: userPrompt }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      let errMsg;
      try {
        const errData = await response.json();
        errMsg = errData.error || errData.message || JSON.stringify(errData);
      } catch {
        errMsg = await response.text();
      }
      throw new Error(`API 请求失败 (${response.status}): ${errMsg}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    state.results = parseResults(rawContent);

    displayResults(state.results, rawContent);
    $('#resultsSection').classList.add('visible');
    $('#resultsSection').scrollIntoView({ behavior: 'smooth' });

    showToast('分析完成！', 'success');
  } catch (err) {
    console.error('Analysis error:', err);
    let errorMsg = err.message;
    // 友好的错误提示
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      errorMsg = '无法连接到服务器！请确认已运行 python app.py 并访问 http://127.0.0.1:5000';
    }
    showToast(`分析失败: ${errorMsg}`, 'error');
  } finally {
    state.isAnalyzing = false;
    btn.classList.remove('loading');
    btn.disabled = false;
    $('#loadingOverlay').classList.remove('visible');
  }
}

function buildSystemPrompt() {
  return `你是一个专业的道路路面损伤检测专家智能体。你的任务是分析道路路面图像，识别和分类各种路面损伤。

你的分析能力包括：
1. 裂缝检测：横向裂缝、纵向裂缝、网状裂缝、龟裂
2. 变形检测：车辙、拥包、沉陷、波浪
3. 表面损伤：坑槽、松散、麻面、泛油
4. 修补检测：修补、灌缝
5. 边缘场景分析：低光照、模糊、遮挡、水渍、阴影等条件下的检测
6. CV模型校准：评估图像质量对CV检测模型的影响，给出模型适用性建议

请严格按照以下JSON格式输出分析结果（不要包含markdown代码块标记）：
{
  "summary": {
    "total_damages": 数量,
    "high_severity": 数量,
    "medium_severity": 数量,
    "low_severity": 数量,
    "edge_scenario_count": 数量
  },
  "damages": [
    {
      "type": "损伤类型",
      "severity": "high/medium/low",
      "description": "详细描述",
      "position": "在图像中的位置",
      "confidence": "置信度百分比",
      "is_edge_case": true/false,
      "edge_notes": "边缘场景说明（如有）"
    }
  ],
  "edge_analysis": {
    "image_quality": "图像质量评估",
    "detection_difficulty": "检测难度评估",
    "challenges": ["面临的挑战1", "挑战2"],
    "recommendations": ["建议1", "建议2"]
  },
  "model_calibration": {
    "cv_model_suitability": "CV模型适用性评估",
    "confidence_adjustment": "是否需要调整置信度阈值",
    "additional_training_needed": "是否需要补充训练数据",
    "notes": "其他校准建议"
  },
  "overall_assessment": "整体路面状况评估和建议"
}`;
}

function buildUserPrompt() {
  let prompt = '请分析这张道路路面图像，识别所有路面损伤。';

  if (state.edgeScenarios.length > 0) {
    prompt += `\n\n特别关注以下边缘场景：${state.edgeScenarios.join('、')}。`;
    prompt += '\n请评估在这些边缘条件下检测的可靠性。';
  }

  prompt += '\n\n同时评估此图像用于CV模型检测的适用性，给出模型校准建议。';
  return prompt;
}

function parseResults(rawContent) {
  try {
    // Try to extract JSON from the response
    let jsonStr = rawContent.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn('Failed to parse JSON, using fallback:', e);
    return {
      summary: { total_damages: 0, high_severity: 0, medium_severity: 0, low_severity: 0, edge_scenario_count: 0 },
      damages: [],
      edge_analysis: null,
      model_calibration: null,
      overall_assessment: rawContent,
      _raw: true
    };
  }
}

// ===== Display Results =====
function displayResults(results, rawContent) {
  const summary = results.summary || {};

  // Summary cards
  $('#totalCount').textContent = summary.total_damages || 0;
  $('#highCount').textContent = summary.high_severity || 0;
  $('#mediumCount').textContent = summary.medium_severity || 0;
  $('#lowCount').textContent = summary.low_severity || 0;
  $('#edgeCount').textContent = summary.edge_scenario_count || 0;

  // Damage list
  const damageList = $('#damageList');
  const damages = results.damages || [];

  if (damages.length === 0 && results._raw) {
    damageList.innerHTML = `<div class="edge-analysis">
      <h3>分析结果</h3>
      <p>${escapeHtml(results.overall_assessment || '模型返回了非结构化响应')}</p>
    </div>`;
  } else if (damages.length === 0) {
    damageList.innerHTML = `<div class="edge-analysis">
      <h3>检测结果</h3>
      <p>未检测到明显的路面损伤，路面状况良好。</p>
    </div>`;
  } else {
    damageList.innerHTML = damages.map(d => {
      const svClass = `damage-severity ${d.severity}`;
      const sevLabel = { high: '严重', medium: '中等', low: '轻微' }[d.severity] || d.severity;
      const sevMeta = `meta-severity-${d.severity}`;

      let metaHTML = `<span class="${sevMeta}">${sevLabel}</span>`;
      if (d.position) metaHTML += `<span class="meta-position">位置: ${escapeHtml(d.position)}</span>`;
      if (d.confidence) metaHTML += `<span class="meta-position">置信度: ${escapeHtml(d.confidence)}</span>`;
      if (d.is_edge_case && d.edge_notes) metaHTML += `<span class="meta-edge">边缘场景: ${escapeHtml(d.edge_notes)}</span>`;

      return `<div class="damage-item">
        <div class="${svClass}"></div>
        <div class="damage-content">
          <div class="damage-type">${escapeHtml(d.type)}</div>
          <div class="damage-desc">${escapeHtml(d.description || '')}</div>
          <div class="damage-meta">${metaHTML}</div>
        </div>
      </div>`;
    }).join('');
  }

  // Edge analysis
  const edgeDiv = $('#edgeAnalysis');
  if (results.edge_analysis) {
    const ea = results.edge_analysis;
    edgeDiv.innerHTML = `
      <h3>边缘场景分析</h3>
      <p><strong>图像质量：</strong>${escapeHtml(ea.image_quality || 'N/A')}</p>
      <p><strong>检测难度：</strong>${escapeHtml(ea.detection_difficulty || 'N/A')}</p>
      ${ea.challenges ? `<p><strong>挑战：</strong>${ea.challenges.map(c => escapeHtml(c)).join('；')}</p>` : ''}
      ${ea.recommendations ? `<p><strong>建议：</strong>${ea.recommendations.map(r => escapeHtml(r)).join('；')}</p>` : ''}
    `;
    edgeDiv.style.display = 'block';
  } else {
    edgeDiv.style.display = 'none';
  }

  // Model calibration
  const calDiv = $('#calibrationSection');
  if (results.model_calibration) {
    const mc = results.model_calibration;
    calDiv.innerHTML = `
      <h3>CV模型校准建议</h3>
      <p><strong>模型适用性：</strong>${escapeHtml(mc.cv_model_suitability || 'N/A')}</p>
      <p><strong>置信度调整：</strong>${escapeHtml(mc.confidence_adjustment || 'N/A')}</p>
      <p><strong>补充训练：</strong>${escapeHtml(mc.additional_training_needed || 'N/A')}</p>
      ${mc.notes ? `<p><strong>备注：</strong>${escapeHtml(mc.notes)}</p>` : ''}
    `;
    calDiv.style.display = 'block';
  } else {
    calDiv.style.display = 'none';
  }

  // Overall assessment
  $('#overallAssessment').textContent = results.overall_assessment || '';

  // Raw response
  $('#rawResponse').textContent = rawContent;
}

// ===== Export =====
function bindExportButtons() {
  $('#exportReport').addEventListener('click', exportReport);
}

function exportReport() {
  if (!state.results) {
    showToast('没有可导出的结果', 'error');
    return;
  }

  const r = state.results;
  const now = new Date().toLocaleString('zh-CN');
  const edgeScenarios = state.edgeScenarios.length > 0 ? state.edgeScenarios.join('、') : '无';

  let report = `# 路面损伤检测报告\n\n`;
  report += `**检测时间：** ${now}\n`;
  report += `**边缘场景：** ${edgeScenarios}\n\n`;
  report += `---\n\n`;

  // Summary
  report += `## 检测概览\n\n`;
  report += `| 指标 | 数量 |\n|------|------|\n`;
  report += `| 损伤总数 | ${r.summary?.total_damages || 0} |\n`;
  report += `| 严重损伤 | ${r.summary?.high_severity || 0} |\n`;
  report += `| 中等损伤 | ${r.summary?.medium_severity || 0} |\n`;
  report += `| 轻微损伤 | ${r.summary?.low_severity || 0} |\n`;
  report += `| 边缘场景 | ${r.summary?.edge_scenario_count || 0} |\n\n`;

  // Damages
  if (r.damages && r.damages.length > 0) {
    report += `## 损伤详情\n\n`;
    r.damages.forEach((d, i) => {
      report += `### ${i + 1}. ${d.type} (${d.severity})\n`;
      report += `- **描述：** ${d.description || 'N/A'}\n`;
      report += `- **位置：** ${d.position || 'N/A'}\n`;
      report += `- **置信度：** ${d.confidence || 'N/A'}\n`;
      if (d.is_edge_case) report += `- **边缘场景：** ${d.edge_notes || '是'}\n`;
      report += `\n`;
    });
  }

  // Edge analysis
  if (r.edge_analysis) {
    const ea = r.edge_analysis;
    report += `## 边缘场景分析\n\n`;
    report += `- **图像质量：** ${ea.image_quality || 'N/A'}\n`;
    report += `- **检测难度：** ${ea.detection_difficulty || 'N/A'}\n`;
    if (ea.challenges) report += `- **挑战：** ${ea.challenges.join('；')}\n`;
    if (ea.recommendations) report += `- **建议：** ${ea.recommendations.join('；')}\n`;
    report += `\n`;
  }

  // Calibration
  if (r.model_calibration) {
    const mc = r.model_calibration;
    report += `## CV模型校准建议\n\n`;
    report += `- **模型适用性：** ${mc.cv_model_suitability || 'N/A'}\n`;
    report += `- **置信度调整：** ${mc.confidence_adjustment || 'N/A'}\n`;
    report += `- **补充训练：** ${mc.additional_training_needed || 'N/A'}\n`;
    if (mc.notes) report += `- **备注：** ${mc.notes}\n`;
    report += `\n`;
  }

  report += `## 整体评估\n\n${r.overall_assessment || 'N/A'}\n`;

  // Download
  const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `路面损伤检测报告_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('报告已下载', 'success');
}

// ===== Utility =====
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
