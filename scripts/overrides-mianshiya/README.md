在控制台粘贴以下代码并执行，才能允许复制。

```js
(function () {
  // 1. 强制恢复所有元素的文本选择能力（覆盖 CSS user-select: none）
  const s = document.createElement('style');
  s.setAttribute('data-unlock', '1');
  s.textContent = 'html, body, * { user-select: auto !important; -webkit-user-select: auto !important; -moz-user-select: auto !important; -ms-user-select: auto !important; }';
  document.documentElement.appendChild(s);

  // 2. 在捕获阶段拦掉 copy/cut/selectstart 的 preventDefault，让复制默认行为生效
  ['copy', 'cut', 'paste', 'selectstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      e.stopImmediatePropagation();
    }, true);
  });

  console.log('✅ 已解除选择/复制限制');
})();
```
