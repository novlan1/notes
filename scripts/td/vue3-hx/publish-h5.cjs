// node scripts/td/vue3-hx/publish-h5.cjs --vue3
// node scripts/td/vue3-hx/publish-h5.cjs --vue2
//
// 将源仓库的打包产物，复制到 @docs 仓库的 docs 分支根目录，然后 commit + push
// 要求：@docs 仓库必须处于 docs 分支

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('./config.cjs');

/** 解析命令行参数，获取版本 */
function parseVersion() {
  const args = process.argv.slice(2);
  if (args.includes('--vue3')) return 'vue3';
  if (args.includes('--vue2')) return 'vue2';
  console.error('错误：请指定版本参数 --vue2 或 --vue3');
  process.exit(1);
}

const version = parseVersion();
const CONFIG = getConfig(version);

function run(cmd, cwd) {
  console.log(`> [${path.basename(cwd)}] ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function removeRecursive(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const item of fs.readdirSync(target)) {
      removeRecursive(path.join(target, item));
    }
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}

/** 获取指定仓库的当前分支名 */
function getCurrentBranch(cwd) {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd })
    .toString()
    .trim();
}

/** 清空 docs 仓库工作目录（保留白名单中的文件） */
function cleanDocsDir() {
  console.log('清空 docs 仓库工作目录...');
  for (const item of fs.readdirSync(CONFIG.docs)) {
    if (CONFIG.whiteList.includes(item)) continue;
    removeRecursive(path.join(CONFIG.docs, item));
  }
}

/** 将源目录下的所有文件复制到目标目录 */
function copyDirContents(srcDir, destDir) {
  for (const item of fs.readdirSync(srcDir)) {
    copyRecursive(path.join(srcDir, item), path.join(destDir, item));
  }
}

/** 提交并推送 */
function commitAndPush() {
  const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  run('git add .', CONFIG.docs);
  run(`git commit -m "deploy: ${timestamp}"`, CONFIG.docs);
  run(`git push origin ${CONFIG.branch}`, CONFIG.docs);
}

function main() {
  const distPath = path.join(CONFIG.source, CONFIG.dist);
  console.log(`📦 版本: ${version}`);
  console.log(`   源仓库: ${CONFIG.source}`);
  console.log(`   docs仓库: ${CONFIG.docs}`);
  console.log(`   构建产物: ${distPath}`);

  // 检查 docs 仓库是否存在
  if (!fs.existsSync(CONFIG.docs)) {
    console.error(`❌ docs 仓库目录不存在: ${CONFIG.docs}`);
    console.error(`   请先 clone 仓库到该目录并 checkout docs 分支`);
    process.exit(1);
  }

  // 检查 docs 仓库是否在 docs 分支
  const docsBranch = getCurrentBranch(CONFIG.docs);
  if (docsBranch !== CONFIG.branch) {
    console.error(`❌ docs 仓库当前在 ${docsBranch} 分支，需要切换到 ${CONFIG.branch} 分支`);
    console.error(`   请执行: cd ${CONFIG.docs} && git checkout ${CONFIG.branch}`);
    process.exit(1);
  }

  // 检查构建产物是否存在
  if (!fs.existsSync(distPath)) {
    console.error(`❌ 构建产物目录不存在: ${distPath}`);
    console.error(`   请先在源仓库中执行构建`);
    process.exit(1);
  }

  // 清空 → 复制 → 提交 → 推送
  cleanDocsDir();

  console.log('复制构建产物到 docs 仓库...');
  copyDirContents(distPath, CONFIG.docs);

  commitAndPush();
  console.log('\n✅ 发布成功!');
}

main();
