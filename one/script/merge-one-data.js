/**
 * 合并「历史基线 + 增量小文件」→ 完整的 one-data.json
 *
 * 背景：one-data.json 约 1.3MB（近 5000 期）。早期每次 fetch 都把这个
 * 全量文件重写一遍并提交，导致 git 历史膨胀到 3.5G。
 *
 * 现在的策略：
 *   - git 里只提交：历史基线 one-data.base.json（一次性）+ 每期 ~100B 的增量小文件
 *   - 构建前由本脚本合并出 one-data.json —— 它是构建产物，不入库（已 gitignore）
 *   - 前端 src/logic/one/get-data.ts 仍直接 import one-data.json，无需改动
 *
 * 用法：node script/merge-one-data
 */

const path = require('path');
const { existsSync, readdirSync } = require('fs');
const { writeFileSync, readFileSync } = require('t-comm');

const CONFIG_DIR = path.resolve(__dirname, '../src/logic/config');
const BASE_PATH = path.join(CONFIG_DIR, 'one-data.base.json');
const INCREMENT_DIR = path.join(CONFIG_DIR, 'one-data');
const OUT_PATH = path.join(CONFIG_DIR, 'one-data.json');

const getVol = picName => +String(picName).split('--')[0];

function main() {
  const list = [];

  // 1. 历史基线（既往全部期数）
  if (existsSync(BASE_PATH)) {
    const base = readFileSync(BASE_PATH, true);
    if (Array.isArray(base)) list.push(...base);
  }

  // 2. 增量小文件（每次 fetch 新增的一期）
  if (existsSync(INCREMENT_DIR)) {
    readdirSync(INCREMENT_DIR)
      .filter(f => f.endsWith('.json'))
      .forEach((f) => {
        const item = readFileSync(path.join(INCREMENT_DIR, f), true);
        if (item && item.picName) list.push(item);
      });
  }

  // 3. 去重（增量与基线可能重复），以 picName 为唯一键
  const seen = new Set();
  const uniq = list.filter((item) => {
    if (!item || !item.picName || seen.has(item.picName)) return false;
    seen.add(item.picName);
    return true;
  });

  // 4. 按 vol 倒序，与前端 get-data.ts 的排序保持一致
  uniq.sort((a, b) => getVol(b.picName) - getVol(a.picName));

  writeFileSync(OUT_PATH, uniq, true);
  console.log(`>>> merge-one-data: 基线 + 增量 = ${uniq.length} 条 → ${OUT_PATH}`);
}

main();
