// ==UserScript==
// @name         DCloud 插件市场 - 验证码自动识别填入
// @namespace    https://ext.dcloud.net.cn/
// @version      3.7.0
// @description  识别验证码、自动提交、错误弹窗自动重试、提交成功后自动续点下载（需配合本地 OCR 服务使用）
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

  let retryCount = 0; // 当前连续重试计数（OCR 格式校验 + 错误弹窗 共享）
  let isProcessing = false; // 全局处理锁，防止并发重复触发
  let isSubmitting = false; // 提交等待锁，提交后到结果返回前阻止新的 OCR 处理
  let srcChangeTimer = null; // src 变化防抖定时器
  let userClickedDownload = false; // 用户是否手动点击过"下载插件并导入HBuilderX"按钮
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
              if (data.code === 0 && data.result) {
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
            if (data.code === 0 && data.result) {
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
    // 优先点击 yw0_button
    const refreshBtn = document.getElementById('yw0_button');
    if (refreshBtn) {
      refreshBtn.click();
      console.log('[验证码OCR] 🔄 已点击换图按钮 #yw0_button');
      return true;
    }

    // 兜底：点击验证码图片本身
    const captchaImg = findCaptchaImg();
    if (captchaImg) {
      captchaImg.click();
      console.log('[验证码OCR] 🔄 已点击验证码图片换图');
      return true;
    }

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
          const { result: ocrResult, valid: serverValid } = await recognizeCaptcha(base64);
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
                autoClickSubmitBtn();
                // 提交后设置超时自动释放锁（防止弹窗未出现导致永久锁定）
                setTimeout(() => {
                  if (isSubmitting) {
                    console.log('[验证码OCR] 🔓 提交锁超时自动释放（5秒无响应）');
                    isSubmitting = false;
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
                clickRefreshCaptcha();
              }, 500);
              return; // 提前返回，不标记为已处理
            }
            // 超过最大重试次数，填入结果但【不自动提交】，避免触发错误弹窗再次循环
            console.warn(`[验证码OCR] ⚠️ 已达全局最大重试次数 ${MAX_TOTAL_RETRY}，停止自动重试，请手动处理`);
            retryCount = 0;
            fillCaptchaInput(ocrResult); // 仍然填入，让用户自行判断
            showOcrResultPanel(
              container,
              'error',
              `识别结果 "${ocrResult}" 可能不准确（已重试${MAX_TOTAL_RETRY}次），已填入但未自动提交，请手动核实后提交`,
            );
          }
        } catch (ocrErr) {
          console.error('[验证码OCR] ❌ OCR 识别失败:', ocrErr.message);
          showOcrResultPanel(container, 'error', ocrErr.message);
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
          console.log('[验证码OCR] 📌 检测到用户手动点击了"下载插件并导入HBuilderX"，后续将自动续点');
        }
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
        // 手动换图时重置所有计数器和锁
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

              // 关闭弹窗后自动换图重试（共享全局重试计数）
              if (retryCount < MAX_TOTAL_RETRY) {
                retryCount++;
                console.log(`[验证码OCR] 🔄 错误弹窗后自动换图重试 (${retryCount}/${MAX_TOTAL_RETRY})`);
                setTimeout(() => {
                  isProcessing = false; // 释放锁，允许下一次处理
                  clickRefreshCaptcha();
                }, 600);
              } else {
                console.warn(`[验证码OCR] ⚠️ 全局重试已达上限 ${MAX_TOTAL_RETRY} 次，停止自动重试，请手动处理`);
                retryCount = 0;
                isProcessing = false;
              }
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
            console.log('[验证码OCR] ✅ 验证码弹窗已消失（提交成功），释放所有锁并重置状态');
            isSubmitting = false;
            isProcessing = false;
            retryCount = 0;
            if (srcChangeTimer) {
              clearTimeout(srcChangeTimer); srcChangeTimer = null;
            }

            // 如果用户之前手动点击过下载按钮，自动续点下一个
            if (userClickedDownload) {
              console.log('[验证码OCR] 🔁 用户曾手动点击过下载，1.5秒后自动续点"下载插件并导入HBuilderX"');
              setTimeout(() => {
                autoClickDownloadBtn();
              }, 1500);
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ========== 初始化 ==========
  function init() {
    console.log('[验证码OCR] 🚀 脚本已加载（v3.7 - 自动识别 + 自动提交 + 用户触发后自动续点下载 + 防死循环重试）');
    injectStyles();
    observeDownloadBtn(); // 监听用户是否手动点击过下载按钮
    observeCaptcha();
    observeRefreshButton();
    observeErrorDialog(); // 监听错误提示弹窗
  }

  init();
}());
