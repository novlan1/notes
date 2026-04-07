// ==UserScript==
// @name         DCloud 插件市场 - 验证码自动识别填入
// @namespace    https://ext.dcloud.net.cn/
// @version      4.2.0
// @description  识别验证码、自动提交、错误弹窗自动重试、提交成功后自动续点下载、Watchdog 防卡死+自动刷新页面+刷新后自动恢复（需配合本地 OCR 服务使用）
// @author       novlan1
// @match        https://ext.dcloud.net.cn/*
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ========== 配置 ==========
  const CAPTCHA_IMG_ID = 'yw0'; // 验证码图片的 id
  const CAPTCHA_SRC_KEYWORD = 'captcha/download'; // 验证码图片 src 的关键词
  const CAPTCHA_INPUT_ID = 'download_captcha'; // 验证码输入框的 id
  const OCR_SERVER_URL = 'http://localhost:18099/ocr'; // 本地 OCR 服务地址
  const CAPTCHA_REGEX = /^[a-z]{4}$/; // 验证码格式：4 位小写字母
  const MAX_RETRY_COUNT = 5; // 识别失败时最大自动换图重试次数
  const SUBMIT_BTN_SELECTOR = '.btn.btn-primary'; // 提交按钮选择器
  const DOWNLOAD_BTN_TEXT = '下载插件并导入HBuilderX'; // 下载按钮文本（也匹配 HX 缩写）
  const WATCHDOG_TIMEOUT = 15000; // 看门狗超时时间（毫秒），超过此时间无活动则判定卡住
  const WATCHDOG_CHECK_INTERVAL = 3000; // 看门狗检查间隔（毫秒）
  const WATCHDOG_RECOVERY_TIMEOUT = 10000; // 看门狗恢复操作后的二级超时（毫秒），恢复操作后如果仍无新活动则刷新页面
  const WATCHDOG_MAX_CONSECUTIVE = 2; // 看门狗连续触发次数上限，超过则直接刷新页面
  const STORAGE_KEY_AUTO_DOWNLOAD = 'dcloud_captcha_auto_download'; // sessionStorage key：自动下载模式标记
  const AUTO_DOWNLOAD_DELAY = 2000; // 刷新页面后自动点击下载按钮的延迟（毫秒），等待页面渲染完成

  let retryCount = 0; // 当前连续重试计数（OCR 格式校验 + 错误弹窗 共享）
  let isProcessing = false; // 全局处理锁，防止并发重复触发
  let isSubmitting = false; // 提交等待锁，提交后到结果返回前阻止新的 OCR 处理
  let srcChangeTimer = null; // src 变化防抖定时器
  let userClickedDownload = false; // 用户是否手动点击过"下载插件并导入HBuilderX"按钮（运行时状态，刷新后通过 sessionStorage 恢复）
  let isAutoRefreshing = false; // 标记当前是否为脚本自动换图（区分用户手动操作）
  let submitSuccessTimer = null; // 提交成功轮询定时器
  let watchdogTimer = null; // 看门狗定时器
  let watchdogRecoveryTimer = null; // 看门狗恢复后的二级超时定时器
  let lastActivityTime = Date.now(); // 最后一次有效活动的时间戳
  let watchdogEnabled = false; // 看门狗是否已启用（用户首次点击下载后启用）
  let watchdogConsecutiveCount = 0; // 看门狗连续触发次数（成功恢复后重置）
  const MAX_TOTAL_RETRY = 8; // 全局最大重试次数（OCR 格式校验 + 错误弹窗 共享）

  // ========== 样式注入 ==========
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .captcha-base64-panel {
        margin-top: 8px;
        padding: 8px;
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
        word-break: break-all;
        max-height: 150px;
        overflow-y: auto;
      }
      .captcha-base64-panel .b64-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
        font-weight: bold;
        color: #333;
      }
      .captcha-base64-panel .b64-copy-btn {
        padding: 2px 8px;
        font-size: 11px;
        color: #fff;
        background-color: #007bff;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .captcha-base64-panel .b64-copy-btn:hover {
        background-color: #0056b3;
      }
      .captcha-base64-panel .b64-content {
        color: #666;
        font-family: monospace;
        font-size: 11px;
        line-height: 1.4;
        user-select: all;
      }
      .captcha-ocr-result {
        margin-top: 6px;
        padding: 6px 10px;
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        border-radius: 4px;
        font-size: 13px;
        color: #1890ff;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .captcha-ocr-result .ocr-text {
        font-weight: bold;
        font-size: 16px;
        letter-spacing: 2px;
        color: #096dd9;
      }
      .captcha-ocr-result .ocr-status {
        font-size: 11px;
        color: #999;
      }
      .captcha-ocr-result.ocr-error {
        background: #fff2f0;
        border-color: #ffccc7;
        color: #ff4d4f;
      }
      .captcha-ocr-result.ocr-loading {
        background: #fffbe6;
        border-color: #ffe58f;
        color: #faad14;
      }
    `;
    document.head.appendChild(style);
  }

  // ========== 看门狗（Watchdog）—— 防卡死核心机制 ==========
  // 每次有效活动时调用 tickActivity() 更新时间戳
  // 看门狗定期检查：如果超过 WATCHDOG_TIMEOUT 没有活动，判定卡住并自动恢复
  function tickActivity(reason) {
    lastActivityTime = Date.now();
    console.log(`[验证码OCR] 🐕 活动心跳: ${reason}`);
  }

  function startWatchdog() {
    stopWatchdog();
    watchdogEnabled = true;
    watchdogConsecutiveCount = 0;
    lastActivityTime = Date.now();
    console.log(`[验证码OCR] 🐕 看门狗已启动（超时阈值: ${WATCHDOG_TIMEOUT / 1000}秒，恢复超时: ${WATCHDOG_RECOVERY_TIMEOUT / 1000}秒，连续上限: ${WATCHDOG_MAX_CONSECUTIVE}次）`);

    watchdogTimer = setInterval(() => {
      const elapsed = Date.now() - lastActivityTime;
      if (elapsed < WATCHDOG_TIMEOUT) {
        // 有正常活动，重置连续触发计数
        if (watchdogConsecutiveCount > 0) {
          console.log(`[验证码OCR] 🐕 检测到正常活动，重置连续触发计数 (${watchdogConsecutiveCount} → 0)`);
          watchdogConsecutiveCount = 0;
        }
        return;
      }

      watchdogConsecutiveCount++;
      console.warn(`[验证码OCR] 🐕🚨 看门狗触发！已 ${(elapsed / 1000).toFixed(1)} 秒无活动，判定卡住（连续第 ${watchdogConsecutiveCount} 次）`);
      console.log(`[验证码OCR] 🐕 当前状态: isProcessing=${isProcessing}, isSubmitting=${isSubmitting}, retryCount=${retryCount}`);

      // 连续触发超过上限 → 直接刷新页面（说明之前的恢复操作都无效，可能被系统弹窗卡住）
      if (watchdogConsecutiveCount > WATCHDOG_MAX_CONSECUTIVE) {
        console.warn(`[验证码OCR] 🐕💀 看门狗已连续触发 ${watchdogConsecutiveCount} 次，恢复操作无效，直接刷新页面`);
        reloadPage();
        return;
      }

      // 重置所有状态
      resetAllState();

      // 判断当前页面状态并恢复
      const captchaImg = findCaptchaImg();
      const captchaVisible = captchaImg && (captchaImg.offsetParent !== null || captchaImg.closest('.modal.in'));

      if (captchaVisible) {
        // 验证码弹窗还在 → 换图重新识别
        console.log('[验证码OCR] 🐕 验证码弹窗仍在，尝试换图重新识别');
        tickActivity('看门狗恢复-换图');
        captchaImg.dataset.b64Processed = 'false';
        clickRefreshCaptcha();
      } else {
        // 没有验证码弹窗 → 可能被系统弹窗（"要打开 HBuilderX 吗？"）卡住
        // 尝试点击下载按钮，并启动二级超时检测
        console.log('[验证码OCR] 🐕 未检测到验证码弹窗，尝试重新点击下载按钮');
        tickActivity('看门狗恢复-重新下载');
        const clicked = autoClickDownloadBtn();
        if (!clicked) {
          // 下载按钮也找不到，直接刷新页面
          console.warn('[验证码OCR] 🐕💀 下载按钮也找不到，3秒后刷新页面');
          schedulePageReload(3000);
        } else {
          // 点击了下载按钮，启动二级超时：如果 N 秒内没有新的验证码弹窗出现，说明被系统弹窗卡住，刷新页面
          startRecoveryTimeout();
        }
      }
    }, WATCHDOG_CHECK_INTERVAL);
  }

  function stopWatchdog() {
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
    stopRecoveryTimeout();
  }

  // 看门狗恢复后的二级超时：点击下载按钮后，如果一段时间内没有新的验证码弹窗出现，说明被系统弹窗卡住
  function startRecoveryTimeout() {
    stopRecoveryTimeout();
    console.log(`[验证码OCR] 🐕⏱️ 启动恢复超时检测（${WATCHDOG_RECOVERY_TIMEOUT / 1000}秒内需出现验证码弹窗）`);
    watchdogRecoveryTimer = setTimeout(() => {
      watchdogRecoveryTimer = null;
      // 检查是否有新的验证码弹窗出现
      const captchaImg = findCaptchaImg();
      const captchaVisible = captchaImg && (captchaImg.offsetParent !== null || captchaImg.closest('.modal.in'));
      if (captchaVisible) {
        console.log('[验证码OCR] 🐕✅ 恢复超时检测：验证码弹窗已出现，恢复正常');
        return; // 正常恢复了
      }
      // 仍然没有验证码弹窗 → 被系统弹窗卡住了，刷新页面
      console.warn('[验证码OCR] 🐕💀 恢复超时！点击下载后仍无验证码弹窗出现（可能被浏览器系统弹窗卡住），刷新页面');
      reloadPage();
    }, WATCHDOG_RECOVERY_TIMEOUT);
  }

  function stopRecoveryTimeout() {
    if (watchdogRecoveryTimer) {
      clearTimeout(watchdogRecoveryTimer);
      watchdogRecoveryTimer = null;
    }
  }

  // 刷新页面（刷新前自动写入 sessionStorage 标记，确保刷新后能自动恢复）
  function reloadPage() {
    if (userClickedDownload) {
      try { sessionStorage.setItem(STORAGE_KEY_AUTO_DOWNLOAD, '1'); } catch (e) { /* ignore */ }
      console.log('[验证码OCR] 🔄 刷新前写入 sessionStorage 标记，确保刷新后自动恢复');
    }
    window.location.reload();
  }

  // 延迟刷新页面
  function schedulePageReload(delay) {
    console.warn(`[验证码OCR] 🔄 ${delay / 1000}秒后刷新页面...`);
    setTimeout(() => {
      reloadPage();
    }, delay);
  }

  // 重置所有状态（看门狗触发时 / 提交成功时 共用）
  function resetAllState() {
    isProcessing = false;
    isSubmitting = false;
    retryCount = 0;
    isAutoRefreshing = false;
    stopSubmitSuccessPolling();
    stopRecoveryTimeout();
    if (srcChangeTimer) {
      clearTimeout(srcChangeTimer);
      srcChangeTimer = null;
    }
  }

  // ========== 图片转 Base64 ==========
  function imgToBase64(imgElement) {
    return new Promise((resolve, reject) => {
      // 如果图片已经是 base64，直接返回
      if (imgElement.src.startsWith('data:')) {
        resolve(imgElement.src);
        return;
      }

      // 方式1：通过 canvas 绘制（同源图片）
      if (imgElement.complete && imgElement.naturalWidth > 0) {
        try {
          const base64 = drawToCanvas(imgElement);
          resolve(base64);
          return;
        } catch (e) {
          console.log('[验证码OCR] canvas 方式失败，尝试 fetch 方式', e);
        }
      }

      // 方式2：通过 fetch 获取图片二进制数据再转 base64
      fetchImgToBase64(imgElement.src)
        .then(resolve)
        .catch(reject);
    });
  }

  // 通过 canvas 绘制转换
  function drawToCanvas(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  // 通过 fetch 获取图片并转 base64
  function fetchImgToBase64(url) {
    // 处理相对路径
    const fullUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).href;

    return fetch(fullUrl, {
      credentials: 'include', // 携带 cookie，确保验证码 session 一致
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }

  // ========== OCR 识别 ==========
  function recognizeCaptcha(base64Str) {
    return new Promise((resolve, reject) => {
      // 优先使用 GM_xmlhttpRequest（跨域无限制）
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'POST',
          url: OCR_SERVER_URL,
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({ image: base64Str }),
          onload: (response) => {
            try {
              const data = JSON.parse(response.responseText);
              if (data.code === 0 && typeof data.result === 'string') {
                resolve({ result: data.result, valid: data.valid !== false });
              } else {
                reject(new Error(data.error || '识别失败'));
              }
            } catch (e) {
              reject(new Error('解析响应失败'));
            }
          },
          onerror: (err) => {
            reject(new Error('请求 OCR 服务失败，请确认本地服务已启动'));
          },
          ontimeout: () => {
            reject(new Error('OCR 服务请求超时'));
          },
          timeout: 10000,
        });
      } else {
        // 兜底：使用 fetch
        fetch(OCR_SERVER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Str }),
        })
          .then(res => res.json())
          .then((data) => {
            if (data.code === 0 && typeof data.result === 'string') {
              resolve({ result: data.result, valid: data.valid !== false });
            } else {
              reject(new Error(data.error || '识别失败'));
            }
          })
          .catch(() => {
            reject(new Error('请求 OCR 服务失败，请确认本地服务已启动'));
          });
      }
    });
  }

  // ========== 校验验证码格式 ==========
  function isValidCaptcha(text) {
    return CAPTCHA_REGEX.test(text);
  }

  // ========== 自动点击换图按钮 ==========
  function clickRefreshCaptcha() {
    // 标记为脚本自动换图，防止 observeRefreshButton 误重置计数器
    isAutoRefreshing = true;

    // 优先点击 yw0_button
    const refreshBtn = document.getElementById('yw0_button');
    if (refreshBtn) {
      refreshBtn.click();
      console.log('[验证码OCR] 🔄 已点击换图按钮 #yw0_button');
      // 延迟重置标记，确保事件冒泡完成后再重置
      setTimeout(() => { isAutoRefreshing = false; }, 50);
      return true;
    }

    // 兜底：点击验证码图片本身
    const captchaImg = findCaptchaImg();
    if (captchaImg) {
      captchaImg.click();
      console.log('[验证码OCR] 🔄 已点击验证码图片换图');
      setTimeout(() => { isAutoRefreshing = false; }, 50);
      return true;
    }

    isAutoRefreshing = false;
    console.warn('[验证码OCR] ⚠️ 未找到换图按钮');
    return false;
  }

  // ========== 自动点击"下载插件并导入HBuilderX"按钮 ==========
  function autoClickDownloadBtn() {
    const allBtns = document.querySelectorAll('a, button');
    for (const btn of allBtns) {
      const text = btn.textContent.trim();
      if (text.includes(DOWNLOAD_BTN_TEXT) || text.includes('下载插件并导入HX')) {
        console.log('[验证码OCR] 🖱️ 自动点击"下载插件并导入HBuilderX"按钮');
        btn.click();
        return true;
      }
    }
    console.warn('[验证码OCR] ⚠️ 未找到"下载插件并导入HBuilderX"按钮');
    return false;
  }

  // ========== 自动点击"提交"按钮 ==========
  function autoClickSubmitBtn() {
    // 查找 class 为 btn btn-primary 的提交按钮
    const submitBtns = document.querySelectorAll(SUBMIT_BTN_SELECTOR);
    for (const btn of submitBtns) {
      const text = btn.textContent.trim();
      if (text === '提交' || text === 'Submit') {
        console.log('[验证码OCR] 🖱️ 自动点击"提交"按钮');
        btn.click();
        return true;
      }
    }

    // 兜底：如果没找到文本匹配的，直接点击第一个 btn-primary
    if (submitBtns.length > 0) {
      console.log('[验证码OCR] 🖱️ 自动点击 btn-primary 按钮');
      submitBtns[0].click();
      return true;
    }

    console.warn('[验证码OCR] ⚠️ 未找到提交按钮');
    return false;
  }

  // ========== 填入验证码输入框 ==========
  function fillCaptchaInput(text) {
    const input = document.getElementById(CAPTCHA_INPUT_ID);
    if (!input) {
      console.warn(`[验证码OCR] ⚠️ 未找到验证码输入框 #${CAPTCHA_INPUT_ID}`);
      return false;
    }

    // 使用原生 setter 触发框架的响应式更新
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    ).set;

    nativeInputValueSetter.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // 聚焦输入框
    input.focus();

    console.log('[验证码OCR] ✅ 已自动填入验证码:', text);
    return true;
  }

  // ========== 显示 OCR 结果面板 ==========
  function showOcrResultPanel(container, status, text) {
    // 移除旧的 OCR 结果面板
    const oldPanel = container.querySelector('.captcha-ocr-result');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.className = 'captcha-ocr-result';

    if (status === 'loading') {
      panel.classList.add('ocr-loading');
      panel.innerHTML = '<span class="ocr-text">⏳ 正在识别验证码...</span>';
    } else if (status === 'success') {
      panel.innerHTML = `
        <span>🤖 OCR 识别结果: <span class="ocr-text">${text}</span></span>
        <span class="ocr-status">✅ 已自动填入</span>
      `;
    } else if (status === 'error') {
      panel.classList.add('ocr-error');
      panel.innerHTML = `<span>❌ ${text}</span>`;
    }

    container.appendChild(panel);
  }

  // ========== 显示 Base64 面板 ==========
  function showBase64Panel(base64Str, container) {
    // 移除旧面板
    const oldPanel = container.querySelector('.captcha-base64-panel');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.className = 'captcha-base64-panel';

    const label = document.createElement('div');
    label.className = 'b64-label';

    const labelText = document.createElement('span');
    labelText.textContent = `📋 Base64 (${formatSize(base64Str.length)})`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'b64-copy-btn';
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', () => {
      copyToClipboard(base64Str);
      copyBtn.textContent = '✅ 已复制';
      setTimeout(() => {
        copyBtn.textContent = '复制';
      }, 1500);
    });

    label.appendChild(labelText);
    label.appendChild(copyBtn);

    const content = document.createElement('div');
    content.className = 'b64-content';
    // 只显示前 200 个字符 + 省略号
    const displayText = base64Str.length > 200
      ? `${base64Str.substring(0, 200)}...`
      : base64Str;
    content.textContent = displayText;

    panel.appendChild(label);
    panel.appendChild(content);
    container.appendChild(panel);
  }

  // ========== 复制到剪贴板 ==========
  function copyToClipboard(text) {
    // 优先使用油猴 API
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(text, 'text');
      return;
    }
    // 兜底：navigator.clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
      return;
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  // ========== 格式化大小 ==========
  function formatSize(len) {
    if (len < 1024) return `${len} B`;
    return `${(len / 1024).toFixed(1)} KB`;
  }

  // ========== 处理验证码图片 ==========
  async function processCaptchaImg(img) {
    if (!img || img.dataset.b64Processed === 'true') return;
    if (isSubmitting) {
      console.log('[验证码OCR] ⏸️ 已提交等待结果中，跳过新的 OCR 处理');
      return;
    }
    if (isProcessing) {
      console.log('[验证码OCR] ⏸️ 正在处理中，跳过重复触发');
      return;
    }
    isProcessing = true;

    try {
      // 等待图片加载完成
      if (!img.complete) {
        await new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          // 超时兜底
          setTimeout(resolve, 3000);
        });
      }

      const base64 = await imgToBase64(img);
      console.log('[验证码OCR] ✅ 图片转 Base64 成功，长度:', base64.length);

      // 在验证码图片所在的容器中显示面板
      const container = img.closest('.captcha') || img.closest('.row') || img.parentElement;
      if (container) {
        // 显示 base64 面板
        showBase64Panel(base64, container);

        // 显示 OCR 加载状态
        showOcrResultPanel(container, 'loading');

        // 调用本地 OCR 服务识别
        try {
          tickActivity('OCR 请求发出');
          const { result: ocrResult, valid: serverValid } = await recognizeCaptcha(base64);
          tickActivity('OCR 响应返回');
          const isValid = serverValid && isValidCaptcha(ocrResult);

          console.log(`[验证码OCR] 🤖 识别结果: "${ocrResult}" (${isValid ? '有效' : '无效'}, 重试次数: ${retryCount}/${MAX_RETRY_COUNT})`);

          if (isValid) {
            // 识别结果有效，填入输入框
            retryCount = 0; // 重置重试计数
            const filled = fillCaptchaInput(ocrResult);

            showOcrResultPanel(
              container,
              'success',
              ocrResult,
            );

            if (filled) {
              // 填入成功后，设置提交锁并延迟自动点击提交按钮
              isSubmitting = true;
              console.log('[验证码OCR] 🔒 设置提交锁，阻止后续 OCR 触发');
              setTimeout(() => {
                tickActivity('提交验证码');
                autoClickSubmitBtn();
                // 提交后启动轮询检查验证码弹窗是否消失（兼容 DOM 移除和 CSS 隐藏两种方式）
                startSubmitSuccessPolling();
                // 提交后设置超时自动释放锁（防止弹窗未出现导致永久锁定）
                setTimeout(() => {
                  if (isSubmitting) {
                    console.log('[验证码OCR] 🔓 提交锁超时自动释放（5秒无响应）');
                    isSubmitting = false;
                    stopSubmitSuccessPolling();
                  }
                }, 5000);
              }, 600);
            } else {
              showOcrResultPanel(
                container,
                'error',
                `识别结果: ${ocrResult}（未找到输入框 #${CAPTCHA_INPUT_ID}，请手动填入）`,
              );
            }
          } else {
            // 识别结果无效，尝试自动换图重试（共享全局重试计数）
            if (retryCount < MAX_TOTAL_RETRY) {
              retryCount++;
              console.log(`[验证码OCR] ⚠️ 结果 "${ocrResult}" 不符合4位小写字母格式，自动换图重试 (${retryCount}/${MAX_TOTAL_RETRY})`);
              showOcrResultPanel(
                container,
                'error',
                `识别结果 "${ocrResult}" 不符合格式（需4位小写字母），自动换图重试中... (${retryCount}/${MAX_TOTAL_RETRY})`,
              );

              // 重置处理标记，允许重新处理
              img.dataset.b64Processed = 'false';

              // 延迟点击换图，等待 UI 更新
              setTimeout(() => {
                isProcessing = false; // 释放锁，允许下一次处理
                tickActivity('无效结果-换图重试');
                clickRefreshCaptcha();
              }, 500);
              return; // 提前返回，不标记为已处理
            }
            // 超过最大重试次数，重置计数器继续重试（由看门狗兜底防止无限循环）
            console.warn(`[验证码OCR] ⚠️ 已达全局最大重试次数 ${MAX_TOTAL_RETRY}，重置计数器继续尝试`);
            retryCount = 0;
            // 继续换图重试，不停下来
            img.dataset.b64Processed = 'false';
            setTimeout(() => {
              isProcessing = false;
              tickActivity('重试上限重置-继续换图');
              clickRefreshCaptcha();
            }, 1000);
            return;
          }
        } catch (ocrErr) {
          console.error('[验证码OCR] ❌ OCR 识别失败:', ocrErr.message);
          showOcrResultPanel(container, 'error', ocrErr.message);

          // OCR 服务异常时也自动换图重试
          if (retryCount < MAX_TOTAL_RETRY) {
            retryCount++;
            console.log(`[验证码OCR] 🔄 OCR 失败后自动换图重试 (${retryCount}/${MAX_TOTAL_RETRY})`);
            img.dataset.b64Processed = 'false';
            setTimeout(() => {
              isProcessing = false;
              tickActivity('OCR失败-换图重试');
              clickRefreshCaptcha();
            }, 500);
            return; // 提前返回，不标记为已处理
          } else {
            // 超过最大重试次数，重置计数器继续尝试
            console.warn(`[验证码OCR] ⚠️ OCR 失败已达全局最大重试次数 ${MAX_TOTAL_RETRY}，重置计数器继续尝试`);
            retryCount = 0;
            img.dataset.b64Processed = 'false';
            setTimeout(() => {
              isProcessing = false;
              tickActivity('OCR失败重试上限重置-继续换图');
              clickRefreshCaptcha();
            }, 1000);
            return;
          }
        }
      }

      img.dataset.b64Processed = 'true';
    } catch (err) {
      console.error('[验证码OCR] ❌ 处理失败:', err);
    } finally {
      isProcessing = false; // 确保锁一定释放
    }
  }

  // ========== 查找验证码图片 ==========
  function findCaptchaImg() {
    // 优先通过 id 查找
    const img = document.getElementById(CAPTCHA_IMG_ID);
    if (img && img.tagName === 'IMG') return img;

    // 通过 src 关键词查找
    const imgs = document.querySelectorAll('img');
    for (const item of imgs) {
      if (item.src.includes(CAPTCHA_SRC_KEYWORD)) {
        return item;
      }
    }

    return null;
  }

  // ========== 监听验证码图片变化 ==========
  function observeCaptcha() {
    // 使用 MutationObserver 监听 DOM 变化，捕获验证码弹窗出现
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // 新增节点
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // 检查新增节点本身是否是验证码图片
          if (node.tagName === 'IMG' && (node.id === CAPTCHA_IMG_ID || node.src?.includes(CAPTCHA_SRC_KEYWORD))) {
            processCaptchaImg(node);
            continue;
          }

          // 检查新增节点内部是否包含验证码图片
          const img = node.querySelector?.(`#${CAPTCHA_IMG_ID}, img[src*="${CAPTCHA_SRC_KEYWORD}"]`);
          if (img) {
            processCaptchaImg(img);
          }
        }

        // 属性变化（验证码图片 src 更新，比如点击"换一个"）
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          const { target } = mutation;
          if (target.tagName === 'IMG' && (target.id === CAPTCHA_IMG_ID || target.src?.includes(CAPTCHA_SRC_KEYWORD))) {
            // 如果正在提交等待结果，忽略 src 变化
            if (isSubmitting) {
              console.log('[验证码OCR] ⏸️ 提交等待中，忽略验证码图片 src 变化');
              continue;
            }
            target.dataset.b64Processed = 'false';
            // 防抖：避免短时间内多次 src 变化重复触发
            if (srcChangeTimer) clearTimeout(srcChangeTimer);
            srcChangeTimer = setTimeout(() => {
              srcChangeTimer = null;
              processCaptchaImg(target);
            }, 600);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });

    // 页面上已有的验证码图片也处理一下
    const existingImg = findCaptchaImg();
    if (existingImg) {
      processCaptchaImg(existingImg);
    }
  }

  // ========== 监听用户点击"下载"按钮，记录标记 ==========
  function observeDownloadBtn() {
    document.addEventListener('click', (e) => {
      const { target } = e;
      // 向上查找最近的 a 或 button（因为用户可能点击的是按钮内的子元素如 icon/span）
      const btn = target.closest('a, button');
      if (!btn) return;
      const text = btn.textContent.trim();
      if (text.includes(DOWNLOAD_BTN_TEXT) || text.includes('下载插件并导入HX')) {
      if (!userClickedDownload) {
          userClickedDownload = true;
          // 持久化到 sessionStorage，刷新页面后自动恢复
          try { sessionStorage.setItem(STORAGE_KEY_AUTO_DOWNLOAD, '1'); } catch (e) { /* ignore */ }
          console.log('[验证码OCR] 📌 检测到用户手动点击了"下载插件并导入HBuilderX"，后续将自动续点（已持久化）');
        }
        // 用户首次点击下载后启动看门狗
        if (!watchdogEnabled) {
          startWatchdog();
        }
        tickActivity('用户点击下载按钮');
      }
    }, true);
  }

  // ========== 监听"换一个"按钮点击 ==========
  function observeRefreshButton() {
    // 点击"换一个"按钮后，验证码图片的 src 会变化
    // 通过事件委托监听
    document.addEventListener('click', (e) => {
      const { target } = e;
      // 匹配"换一个"按钮或验证码图片本身（点击换图）
      if (
        (target.id === 'yw0_button')
        || (target.tagName === 'A' && target.textContent.includes('换一个'))
        || (target.tagName === 'IMG' && target.id === CAPTCHA_IMG_ID)
      ) {
        // 如果是脚本自动换图触发的，不重置计数器，也不重复触发处理
        if (isAutoRefreshing) {
          console.log('[验证码OCR] ⏭️ 脚本自动换图触发，跳过 observeRefreshButton 处理');
          return;
        }

        // 用户手动换图时重置所有计数器和锁
        console.log('[验证码OCR] 👆 用户手动换图，重置所有状态');
        retryCount = 0;
        isProcessing = false;
        isSubmitting = false;
        if (srcChangeTimer) {
          clearTimeout(srcChangeTimer); srcChangeTimer = null;
        }
        // 延迟处理，等待新验证码图片加载
        setTimeout(() => {
          const img = findCaptchaImg();
          if (img) {
            img.dataset.b64Processed = 'false';
            processCaptchaImg(img);
          }
        }, 800);
      }
    }, true);
  }

  // ========== 提交成功后的处理（自动续点下载） ==========
  function handleSubmitSuccess() {
    console.log('[验证码OCR] ✅ 验证码提交成功，释放所有锁并重置状态');
    resetAllState();
    tickActivity('提交成功');

    // 如果用户之前手动点击过下载按钮，自动续点下一个
    if (userClickedDownload) {
      console.log('[验证码OCR] 🔁 用户曾手动点击过下载，1.5秒后自动续点"下载插件并导入HBuilderX"');
      setTimeout(() => {
        tickActivity('自动续点下载');
        autoClickDownloadBtn();
      }, 1500);
    }
  }

  // ========== 轮询检查验证码弹窗是否消失 ==========
  // Bootstrap 弹窗关闭时可能不移除 DOM，而是通过 CSS 隐藏（display:none / 移除 in class）
  // 因此不能仅依赖 MutationObserver 的 removedNodes，需要轮询检查
  function startSubmitSuccessPolling() {
    stopSubmitSuccessPolling(); // 先清理旧的
    let pollCount = 0;
    const MAX_POLL = 20; // 最多轮询 20 次（共 10 秒）

    submitSuccessTimer = setInterval(() => {
      pollCount++;
      if (!isSubmitting || pollCount > MAX_POLL) {
        // 已被其他逻辑处理（如 removedNodes 检测到），或超时
        stopSubmitSuccessPolling();
        return;
      }

      // 检查验证码弹窗是否还可见
      const captchaImg = document.getElementById(CAPTCHA_IMG_ID);
      const captchaInput = document.getElementById(CAPTCHA_INPUT_ID);
      const modalVisible = captchaImg && (captchaImg.offsetParent !== null || captchaImg.closest('.modal.in'));
      const inputVisible = captchaInput && (captchaInput.offsetParent !== null || captchaInput.closest('.modal.in'));

      if (!modalVisible && !inputVisible) {
        // 验证码弹窗已不可见（可能是 DOM 移除，也可能是 CSS 隐藏）
        console.log('[验证码OCR] 🔍 轮询检测到验证码弹窗已不可见');
        handleSubmitSuccess();
      }
    }, 500);
  }

  function stopSubmitSuccessPolling() {
    if (submitSuccessTimer) {
      clearInterval(submitSuccessTimer);
      submitSuccessTimer = null;
    }
  }

  // ========== 监听错误提示弹窗 + 验证码弹窗消失 ==========
  function observeErrorDialog() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // ---- 1. 监听新增节点：检测错误弹窗 ----
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // 检查是否是 Bootstrap 模态弹窗
          const modal = node.classList?.contains('modal-dialog')
            ? node
            : node.querySelector?.('.modal-dialog');
          if (!modal) continue;

          // 检查弹窗内容是否包含验证码相关的错误提示
          const bodyText = modal.querySelector('.modal-body')?.textContent?.trim() || '';
          const isErrorDialog = bodyText.includes('验证码')
            || bodyText.includes('请输入')
            || bodyText.includes('captcha')
            || bodyText.includes('错误');

          if (!isErrorDialog) continue;

          console.log(`[验证码OCR] ⚠️ 检测到错误弹窗: "${bodyText}"`);

          // 查找"确认"按钮并点击
          const confirmBtn = modal.querySelector('.bootstrap-dialog-footer-buttons .btn')
            || modal.querySelector('.modal-footer .btn');

          if (confirmBtn) {
            // 延迟点击，确保弹窗完全渲染
            setTimeout(() => {
              // 释放提交锁（错误弹窗说明提交已有结果）
              if (isSubmitting) {
                isSubmitting = false;
                console.log('[验证码OCR] 🔓 错误弹窗出现，释放提交锁');
              }
              confirmBtn.click();
              console.log('[验证码OCR] 🖱️ 已自动点击"确认"按钮关闭错误弹窗');

              // 关闭弹窗后自动换图重试（不再有上限，由看门狗兜底）
              retryCount++;
              if (retryCount >= MAX_TOTAL_RETRY) {
                console.log(`[验证码OCR] 🔄 错误弹窗重试计数器重置 (${retryCount} → 0)`);
                retryCount = 0;
              }
              console.log(`[验证码OCR] 🔄 错误弹窗后自动换图重试 (${retryCount}/${MAX_TOTAL_RETRY})`);
              setTimeout(() => {
                isProcessing = false; // 释放锁，允许下一次处理
                tickActivity('错误弹窗-换图重试');
                clickRefreshCaptcha();
              }, 600);
            }, 300);
          }
        }

        // ---- 2. 监听移除节点：检测验证码弹窗消失（提交成功） ----
        for (const node of mutation.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // 检查被移除的节点是否包含验证码弹窗
          const hasCaptchaModal = (
            node.querySelector?.(`#${CAPTCHA_IMG_ID}`)
            || node.querySelector?.(`#${CAPTCHA_INPUT_ID}`)
            || node.querySelector?.('.modal-dialog')
          );

          if (hasCaptchaModal && isSubmitting) {
            handleSubmitSuccess();
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ========== 刷新后自动恢复 ==========
  // 检查 sessionStorage，如果之前用户点击过下载按钮，刷新后自动恢复状态并继续
  function tryAutoResumeAfterReload() {
    try {
      const flag = sessionStorage.getItem(STORAGE_KEY_AUTO_DOWNLOAD);
      if (flag === '1') {
        // 读取后立即删除标记（一次性使用，后续由运行时状态接管）
        sessionStorage.removeItem(STORAGE_KEY_AUTO_DOWNLOAD);
        userClickedDownload = true;
        console.log('[验证码OCR] 🔄 检测到 sessionStorage 标记，刷新后自动恢复自动下载模式（标记已清除）');

        // 启动看门狗
        startWatchdog();

        // 延迟自动点击下载按钮（等待页面渲染完成）
        setTimeout(() => {
          console.log(`[验证码OCR] 🔄 刷新后自动点击"下载插件并导入HBuilderX"按钮`);
          tickActivity('刷新后自动恢复-点击下载');
          const clicked = autoClickDownloadBtn();
          if (!clicked) {
            // 按钮可能还没渲染出来，再等一会儿重试
            console.log('[验证码OCR] 🔄 下载按钮未找到，2秒后重试');
            setTimeout(() => {
              tickActivity('刷新后自动恢复-重试点击下载');
              autoClickDownloadBtn();
            }, 2000);
          }
        }, AUTO_DOWNLOAD_DELAY);
      }
    } catch (e) {
      // sessionStorage 不可用时静默忽略
    }
  }

  // 清除自动下载标记（用户可手动调用 window.__stopAutoDownload() 停止）
  function clearAutoDownloadFlag() {
    try { sessionStorage.removeItem(STORAGE_KEY_AUTO_DOWNLOAD); } catch (e) { /* ignore */ }
    userClickedDownload = false;
    stopWatchdog();
    resetAllState();
    console.log('[验证码OCR] 🛑 已清除自动下载标记，脚本停止自动操作');
  }

  // ========== 初始化 ==========
  function init() {
    console.log('[验证码OCR] 🚀 脚本已加载（v4.2 - 自动识别 + 自动提交 + 自动续点 + Watchdog 防卡死 + 系统弹窗自动刷新 + 刷新后自动恢复 + 永不停止）');
    injectStyles();
    observeDownloadBtn(); // 监听用户是否手动点击过下载按钮
    observeCaptcha();
    observeRefreshButton();
    observeErrorDialog(); // 监听错误提示弹窗

    // 刷新后自动恢复
    tryAutoResumeAfterReload();

    // 暴露停止接口，用户可在控制台调用 window.__stopAutoDownload() 停止自动下载
    window.__stopAutoDownload = clearAutoDownloadFlag;
  }

  init();
}());
