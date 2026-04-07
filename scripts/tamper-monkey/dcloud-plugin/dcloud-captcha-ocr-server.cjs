/**
 * DCloud 验证码 OCR 识别本地服务
 *
 * 使用方式：
 *   1. 安装依赖：npm install ddddocr-node
 *   2. 启动服务：node dcloud-captcha-ocr-server.cjs
 *   3. 服务监听 http://localhost:18099
 *
 * API：
 *   POST /ocr
 *   Body: { "image": "base64字符串（带或不带 data:image/png;base64, 前缀均可）" }
 *   Response: { "code": 0, "result": "识别结果" }
 */

const http = require('http');
const { DdddOcr, CHARSET_RANGE } = require('ddddocr-node');

const PORT = 18099;

// 初始化 OCR 实例
let ocrInstance = null;

// 验证码格式：恰好 4 位小写字母
const CAPTCHA_REGEX = /^[a-z]{4}$/;

async function getOcr() {
  if (!ocrInstance) {
    ocrInstance = new DdddOcr();
    // 严格限制字符范围为纯小写字母（验证码为 4 位小写字母）
    ocrInstance.setRanges(CHARSET_RANGE.LOWER_CASE);
    console.log('[OCR] ✅ OCR 引擎初始化完成（字符范围: 小写字母, 期望长度: 4）');
  }
  return ocrInstance;
}

// 校验识别结果是否符合 4 位小写字母格式
function validateResult(result) {
  if (!result || typeof result !== 'string') return false;
  return CAPTCHA_REGEX.test(result);
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// 设置 CORS 响应头
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// 发送 JSON 响应
function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 健康检查
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { code: 0, message: 'OCR 服务运行中' });
    return;
  }

  // OCR 识别接口
  if (req.method === 'POST' && req.url === '/ocr') {
    try {
      const { image } = await parseBody(req);

      if (!image) {
        sendJson(res, 400, { code: -1, error: '缺少 image 参数' });
        return;
      }

      const ocr = await getOcr();
      const startTime = Date.now();
      const rawResult = await ocr.classification(image);
      // 统一转小写并去除空格
      const result = (rawResult || '').toLowerCase().replace(/\s/g, '');
      const elapsed = Date.now() - startTime;
      const valid = validateResult(result);

      console.log(`[OCR] ${valid ? '✅' : '⚠️'} 识别结果: "${result}" (${valid ? '有效' : '无效，期望4位小写字母'}) (耗时 ${elapsed}ms)`);
      sendJson(res, 200, { code: 0, result, valid });
    } catch (err) {
      console.error('[OCR] ❌ 识别失败:', err.message);
      sendJson(res, 500, { code: -1, error: err.message });
    }
    return;
  }

  // 404
  sendJson(res, 404, { code: -1, error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  DCloud 验证码 OCR 识别服务已启动            ║
║  地址: http://localhost:${PORT}               ║
║  接口: POST /ocr  { "image": "base64..." }  ║
║  按 Ctrl+C 停止服务                          ║
╚══════════════════════════════════════════════╝
  `);

  // 预热 OCR 引擎
  getOcr().catch(console.error);
});
