---
theme: smartblue
highlight: atom-one-dark
---

# 一个油猴脚本，解决掘金编辑器「转存失败」的烦恼

## 痛点

经常在掘金发文章的同学应该都遇到过这个问题：从其他平台复制 Markdown 内容粘贴到掘金编辑器时，图片会变成这样：

```html
<img src="转存失败，建议直接上传图片文件
https://cdn.example.com/image.png" alt="转存失败，建议直接上传图片文件">
```

图片无法正常显示，每张图都要手动删除「转存失败，建议直接上传图片文件」这段文字，文章图片一多，简直崩溃。

## 解决方案

写了一个 **油猴脚本**，在掘金编辑器页面添加一个悬浮按钮，**一键清理**所有「转存失败」文本。

### 效果

- 页面右下角出现 🧹 **清理转存失败** 按钮
- 点击后自动扫描 Markdown 源码，清理所有「转存失败」文本
- 清理完成后 toast 提示处理了多少处

### 支持的清理模式

| 模式                  | 示例                                                 |
| --------------------- | ---------------------------------------------------- |
| `<img>` 标签 src 属性 | `src="转存失败...https://xxx"` → `src="https://xxx"` |
| `<img>` 标签 alt 属性 | `alt="转存失败..."` → `alt=""`                       |
| Markdown 图片语法     | `![转存失败...](url)` → `![](url)`                   |
| 单独文本行            | 整行 `转存失败，建议直接上传图片文件` 直接移除       |

## 使用方法

### 1. 安装 Tampermonkey

在浏览器扩展商店搜索 [Tampermonkey](https://www.tampermonkey.net/) 并安装，支持 Chrome / Firefox / Edge。

### 2. 添加脚本

点击 Tampermonkey 图标 → **添加新脚本** → 粘贴以下代码 → `Ctrl + S` 保存：

```js
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

  const FAIL_TEXT = '转存失败，建议直接上传图片文件';

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

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      right: '20px',
      bottom: '130px',
      zIndex: '999999',
      padding: '8px 16px',
      fontSize: '13px',
      color: '#fff',
      backgroundColor: type === 'success' ? '#52c41a' : '#faad14',
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

  function handleClean() {
    // 方式1：CodeMirror API
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement && cmElement.CodeMirror) {
      const cm = cmElement.CodeMirror;
      const content = cm.getValue();
      const cleaned = cleanContent(content);
      if (content !== cleaned) {
        cm.setValue(cleaned);
        showToast(`✅ 已清理 ${countDiff(content, cleaned)} 处`);
      } else {
        showToast('👍 没有需要清理的内容', 'warn');
      }
      return;
    }

    // 方式2：textarea
    const textarea = document.querySelector('.bytemd-editor textarea');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype, 'value'
      ).set;
      const content = textarea.value;
      const cleaned = cleanContent(content);
      if (content !== cleaned) {
        setter.call(textarea, cleaned);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        showToast(`✅ 已清理 ${countDiff(content, cleaned)} 处`);
      } else {
        showToast('👍 没有需要清理的内容', 'warn');
      }
      return;
    }

    showToast('⚠️ 未找到编辑器', 'warn');
  }

  function cleanContent(content) {
    return content
      // <img> src 属性中的前缀
      .replace(/(<img\s[^>]*src\s*=\s*["'])转存失败，建议直接上传图片文件\s*/gi, '$1')
      // <img> alt 属性
      .replace(/(<img\s[^>]*alt\s*=\s*["'])转存失败，建议直接上传图片文件(["'])/gi, '$1$2')
      // Markdown 图片语法
      .replace(/!\[转存失败，建议直接上传图片文件\s*\]/g, '![]')
      // 单独一行
      .replace(/^转存失败，建议直接上传图片文件\s*$/gm, '')
      // src 中残留换行
      .replace(/(src\s*=\s*["'])\n(https?:\/\/)/gi, '$1$2');
  }

  function countDiff(a, b) {
    return (a.match(/转存失败，建议直接上传图片文件/g) || []).length -
           (b.match(/转存失败，建议直接上传图片文件/g) || []).length;
  }

  function init() {
    if (!location.href.includes('juejin.cn/editor')) return;
    const timer = setInterval(() => {
      if (document.querySelector('.CodeMirror') || document.querySelector('.bytemd')) {
        clearInterval(timer);
        createCleanButton();
        console.log('[掘金清理脚本] ✅ 已加载');
      }
    }, 1000);
    setTimeout(() => clearInterval(timer), 30000);
  }

  init();
})();
```

### 3. 使用

打开掘金编辑器 → 粘贴 Markdown 内容 → 点击右下角 **🧹 清理转存失败** 按钮 → 完成 ✅

## 原理简述

脚本通过以下优先级获取编辑器内容：

```
CodeMirror API → textarea → 兜底 DOM 操作
```

然后用正则匹配清理 `<img>` 标签的 `src`、`alt` 属性以及 Markdown `![]()` 语法中的「转存失败」文本，最后将清理后的内容写回编辑器。

## 最后

脚本很轻量，只在 `juejin.cn/editor/*` 页面生效，不影响其他网站。

如果对你有帮助，欢迎点个赞 👍
