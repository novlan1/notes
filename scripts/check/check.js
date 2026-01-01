import { readFileSync } from 't-comm';
import * as glob from 'glob';

const SIDE_BAR_PATH = '.vitepress/sidebar.json';
const SIDE_BAR_WORK_PATH = '.vitepress/sidebar-work-docs.json';
const DOCS_GLOB = './docs/**/*.md';
const BLACK_LIST = [
  'docs/work/index.md',
];

function main() {
  const data = readFileSync(SIDE_BAR_PATH, true);
  const workData = readFileSync(SIDE_BAR_WORK_PATH, true);
  const list = [
    ...data.sidebar,
    ...workData.sidebar,
  ];

  const allItems = list.reduce((acc, item) => [
    ...acc,
    ...item.items,
  ], []);
  console.log('[allItems.length]', allItems.length);

  const docsList = glob.sync(DOCS_GLOB)
    .filter(item => !BLACK_LIST.includes(item));
  console.log('[docsList.length]', docsList.length);

  for (const item of docsList) {
    const found = allItems.find((config) => {
      const parsedLink = `${config.link.replace(/^\/|\.md$/g, '')}.md`;
      return item === parsedLink;
    });

    if (!found) {
      console.log(`${item} 文件未在 sidebar.json 中配置`);
    }
  }
}

main();
