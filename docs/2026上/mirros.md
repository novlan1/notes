```js
/**
 * 提取npm包列表，输出Markdown
 * @param {string} filterOwner - 要筛选的所有者，不传则导出全部
 */
function exportNpmTable(filterOwner = "x") {
  const rows = Array.from(document.querySelectorAll('.box-conten'));
  const result = [];

  for (const el of rows) {
    // 包名元素
    const nameEl = el.querySelector('.npm-name.fs20');
    if (!nameEl) continue;
    const pkgName = nameEl.textContent.trim();
    // 作者
    const ownerEl = el.querySelector('.l30 span:not(.mr10.fc-secondary)');
    const owner = ownerEl?.textContent.trim() || '';
    // 下载量
    const downloadEl = el.querySelector('.col-downloads span');
    const downloadText = downloadEl?.textContent.trim() || '';

    // 筛选
    if (filterOwner && owner !== filterOwner) continue;

    // 拼接链接，/ 转 %2F
    const encodedName = encodeURIComponent(pkgName);
    const link = `https://mirrors.tencent.com/#/private/npm/detail?repo_id=537&project_name=${encodedName}`;
    const pkgMd = `[${pkgName}](${link})`;

    result.push({
      pkgMd,
      owner,
      downloadText
    });
  }

  // 输出markdown表格
  let md = "| 包名称 | 近30日下载量 |\n";
  md += "| ---- | ---- |\n";
  for (const item of result) {
    md += `| ${item.pkgMd} | ${item.downloadText} |\n`;
  }
  console.log("===== Markdown 结果（直接全选复制）=====\n", md);
  return md;
}

// 默认提取 x 的包
const mdTable = exportNpmTable("x");
// 弹窗方便一键复制
prompt("复制下面Markdown表格", mdTable);
```
