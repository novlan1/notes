import { readFileSync } from 't-comm';
import * as glob from 'glob';
import { existsSync } from 'fs';

const SIDE_BAR_PATH = '.vitepress/sidebar.json';
const DOCS_GLOB = './docs/**/*.md';
const BLACK_LIST = [];

function normalizeLink(link) {
  // 将 sidebar 中的 link 规范化为与 glob 输出一致的相对路径形式：./xxx.md
  const stripped = link.replace(/^\/+/, '').replace(/\.md$/, '');
  return `${stripped}.md`;
}

function main() {
  const data = readFileSync(SIDE_BAR_PATH, true);
  const list = [
    ...data.sidebar,
  ];

  const allItems = list.reduce((acc, item) => [
    ...acc,
    ...item.items,
  ], []);
  console.log('[allItems.length]', allItems.length);

  const docsList = glob.sync(DOCS_GLOB)
    .filter(item => !BLACK_LIST.includes(item));
  console.log('[docsList.length]', docsList.length);

  // 用 Set 加速比对
  const docsSet = new Set(docsList.map(p => p.replace(/^\.\//, '')));

  // 1) sidebar 中配置了但磁盘上不存在的文件
  const missingInDisk = [];
  for (const config of allItems) {
    if (!config.link) {
      missingInDisk.push({ text: config.text, link: '(empty)' });
      continue;
    }
    const parsedLink = normalizeLink(config.link);
    if (!docsSet.has(parsedLink) && !existsSync(parsedLink)) {
      missingInDisk.push({ text: config.text, link: config.link, parsedLink });
    }
  }

  if (missingInDisk.length) {
    console.log(`\n❌ sidebar.json 中配置但实际不存在的文件 (${missingInDisk.length}):`);
    missingInDisk.forEach((it, i) => {
      console.log(`  ${i + 1}. [${it.text}] ${it.link}`);
    });
  } else {
    console.log('\n✅ sidebar.json 中配置的文件全部存在');
  }

  // 2) 磁盘上存在但 sidebar.json 未配置的文件
  const missingInSidebar = [];
  for (const item of docsList) {
    const found = allItems.find((config) => {
      if (!config.link) return false;
      return item.replace(/^\.\//, '') === normalizeLink(config.link);
    });

    if (!found) {
      missingInSidebar.push(item);
    }
  }

  if (missingInSidebar.length) {
    console.log(`\n❌ 实际存在但未在 sidebar.json 中配置的文件 (${missingInSidebar.length}):`);
    missingInSidebar.forEach((it, i) => {
      console.log(`  ${i + 1}. ${it}`);
    });
  } else {
    console.log('\n✅ 所有 md 文件都已在 sidebar.json 中配置');
  }

  // 3) 重复配置检测（同一个 link 配置多次也会导致 allItems 比 docsList 多）
  const linkCount = new Map();
  for (const config of allItems) {
    if (!config.link) continue;
    const key = normalizeLink(config.link);
    linkCount.set(key, (linkCount.get(key) || 0) + 1);
  }
  const duplicated = [...linkCount.entries()].filter(([, c]) => c > 1);
  if (duplicated.length) {
    console.log(`\n❌ sidebar.json 中重复配置的 link (${duplicated.length}):`);
    duplicated.forEach(([link, count], i) => {
      console.log(`  ${i + 1}. ${link} (${count} 次)`);
    });
  }
}

main();
