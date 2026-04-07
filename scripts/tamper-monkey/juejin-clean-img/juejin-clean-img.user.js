// ==UserScript==
// @name         掘金编辑器 - 清理转存失败图片文本
// @namespace    https://juejin.cn/
// @version      1.0.0
// @description  一键清理掘金编辑器中复制 Markdown 时产生的"转存失败，建议直接上传图片文件"文本
// @author       novlan1
// @match        https://juejin.cn/editor/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ========== 配置 ==========
  // "转存失败"的文本，掘金可能会在图片 src 前面加上这段文字
  const FAIL_TEXT = '转存失败，建议直接上传图片文件';

  // ========== 创建悬浮按钮 ==========
  function createCleanButton() {
    const btn = document.createElement('button');
    btn.id = 'juejin-clean-img-btn';
    btn.textContent = '🧹 清理转存失败';
    Object.assign(btn.style, {
      position: 'fixed',
      right: '20px',
      bottom: '80px',
      zIndex: '99999',
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#fff',
      backgroundColor: '#1e80ff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      boxShadow: '0 2px 12px rgba(30, 128, 255, 0.4)',
      transition: 'all 0.2s ease',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#1171e6';
      btn.style.transform = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#1e80ff';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', handleClean);
    document.body.appendChild(btn);
  }

  // ========== 显示提示 ==========
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    const bgColor = type === 'success' ? '#52c41a' : '#faad14';
    Object.assign(toast.style, {
      position: 'fixed',
      right: '20px',
      bottom: '130px',
      zIndex: '999999',
      padding: '8px 16px',
      fontSize: '13px',
      color: '#fff',
      backgroundColor: bgColor,
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      transition: 'opacity 0.3s ease',
      opacity: '1',
    });
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ========== 核心清理逻辑 ==========
  function handleClean() {
    // 掘金编辑器使用 CodeMirror（bytemd），获取编辑器实例
    const cmElement = document.querySelector('.CodeMirror');

    if (cmElement && cmElement.CodeMirror) {
      // ---- 方式1：通过 CodeMirror API 操作（最可靠） ----
      const cm = cmElement.CodeMirror;
      const content = cm.getValue();
      const cleaned = cleanMarkdownContent(content);

      if (content !== cleaned) {
        cm.setValue(cleaned);
        const count = countReplacements(content, cleaned);
        showToast(`✅ 已清理 ${count} 处"转存失败"文本`);
      } else {
        showToast('👍 没有发现需要清理的内容', 'warn');
      }
      return;
    }

    // ---- 方式2：通过 bytemd 编辑器的 textarea 操作 ----
    const textarea = document.querySelector('.bytemd-editor textarea');
    if (textarea) {
      // 触发 React/Vue 的 input 事件以同步状态
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      ).set;

      const content = textarea.value;
      const cleaned = cleanMarkdownContent(content);

      if (content !== cleaned) {
        nativeInputValueSetter.call(textarea, cleaned);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        const count = countReplacements(content, cleaned);
        showToast(`✅ 已清理 ${count} 处"转存失败"文本`);
      } else {
        showToast('👍 没有发现需要清理的内容', 'warn');
      }
      return;
    }

    // ---- 方式3：直接操作 CodeMirror 的 DOM 行（兜底方案） ----
    const lines = document.querySelectorAll('.CodeMirror-line');
    if (lines.length > 0) {
      let count = 0;
      lines.forEach((line) => {
        if (line.textContent.includes(FAIL_TEXT)) {
          // 直接修改 DOM 文本（注意：这种方式可能不会同步到编辑器状态）
          const spans = line.querySelectorAll('span');
          spans.forEach((span) => {
            if (span.textContent.includes(FAIL_TEXT)) {
              span.textContent = span.textContent.replace(FAIL_TEXT, '');
              count++;
            }
          });
        }
      });

      if (count > 0) {
        showToast(`✅ 已清理 ${count} 处（DOM模式，建议手动检查）`, 'warn');
      } else {
        showToast('👍 没有发现需要清理的内容', 'warn');
      }
      return;
    }

    showToast('⚠️ 未找到编辑器，请确认在编辑页面', 'warn');
  }

  // ========== Markdown 内容清理 ==========
  function cleanMarkdownContent(content) {
    // 第一步：保护代码块和行内代码，避免误清理
    const codeBlocks = [];
    let result = content;

    // 保护围栏代码块（```...```），支持多行
    result = result.replace(/(```[\s\S]*?```)/g, (match) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(match);
      return placeholder;
    });

    // 保护行内代码（`...`），不跨行
    result = result.replace(/(`[^`\n]+`)/g, (match) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(match);
      return placeholder;
    });

    // 第二步：在非代码区域执行清理

    // 模式1: <img src="转存失败，建议直接上传图片文件\nhttps://xxx" ... alt="转存失败，建议直接上传图片文件">
    // 清理 src 属性中的"转存失败"前缀
    result = result.replace(
      /(<img\s[^>]*src\s*=\s*["'])转存失败，建议直接上传图片文件\s*/gi,
      '$1',
    );

    // 模式2: 清理 alt 属性中的"转存失败"文本
    result = result.replace(
      /(<img\s[^>]*alt\s*=\s*["'])转存失败，建议直接上传图片文件(["'])/gi,
      '$1$2',
    );

    // 模式3: Markdown 标准图片语法 ![转存失败，建议直接上传图片文件](url)
    result = result.replace(
      /!\[转存失败，建议直接上传图片文件\s*\]/g,
      '![]',
    );

    // 模式4: 单独一行的"转存失败，建议直接上传图片文件"文本
    result = result.replace(
      /^转存失败，建议直接上传图片文件\s*$/gm,
      '',
    );

    // 模式5: 清理可能残留的换行（src 中 URL 前的换行）
    result = result.replace(
      /(src\s*=\s*["'])\n(https?:\/\/)/gi,
      '$1$2',
    );

    // 第三步：还原代码块内容
    codeBlocks.forEach((block, index) => {
      result = result.replace(`__CODE_BLOCK_${index}__`, block);
    });

    return result;
  }

  // ========== 计算替换次数 ==========
  function countReplacements(original, cleaned) {
    // 排除代码块内的匹配，只统计实际被清理的数量
    const stripCode = str => str.replace(/(```[\s\S]*?```)/g, '').replace(/(`[^`\n]+`)/g, '');
    const originalCount = (stripCode(original).match(/转存失败，建议直接上传图片文件/g) || []).length;
    const cleanedCount = (stripCode(cleaned).match(/转存失败，建议直接上传图片文件/g) || []).length;
    return originalCount - cleanedCount;
  }

  // ========== 初始化 ==========
  // 等待页面加载完成后再创建按钮
  function init() {
    // 确保在编辑器页面
    if (!window.location.href.includes('juejin.cn/editor')) {
      return;
    }

    // 等待编辑器渲染完成
    const checkEditor = setInterval(() => {
      const editor =        document.querySelector('.CodeMirror')
        || document.querySelector('.bytemd')
        || document.querySelector('[class*="markdown-editor"]');

      if (editor) {
        clearInterval(checkEditor);
        createCleanButton();
        console.log('[掘金清理脚本] ✅ 已加载，点击右下角按钮清理"转存失败"文本');
      }
    }, 1000);

    // 30秒后停止检测
    setTimeout(() => clearInterval(checkEditor), 30000);
  }

  init();
}());
