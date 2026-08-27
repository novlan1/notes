// node scripts/press/hx/publish-h5.cjs
//
// 将源仓库的打包产物，复制到 @docs 仓库的 docs 分支根目录，然后 commit + push
// 要求：@docs 仓库必须处于 docs 分支

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('./config.cjs');

const CONFIG = getConfig();

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
  console.log(`📦 源仓库: ${CONFIG.source}`);
  console.log(`   docs仓库: ${CONFIG.docs}`);
  console.log(`   构建产物: ${distPath}`);

  // 检查 docs 目录是否存在
  if (!fs.existsSync(CONFIG.docs)) {
    console.error(`❌ docs 目录不存在: ${CONFIG.docs}`);
    console.error(`   请先创建目录（mkdir -p ${CONFIG.docs}）`);
    process.exit(1);
  }

  // 检查 @docs 是否已初始化 git 并 checkout docs 分支
  const docsGitDir = path.join(CONFIG.docs, '.git');
  if (!fs.existsSync(docsGitDir)) {
    console.error(`❌ @docs 目录不是 git 仓库: ${CONFIG.docs}`);
    console.error(`   首次使用需要初始化（跟源仓库共享 origin，checkout docs 分支）：`);
    console.error(`     cd ${CONFIG.docs}`);
    console.error(`     git init`);
    console.error(`     git remote add origin git@github.com:novlan1/press-ui-demo-vue3-uni.git`);
    console.error(`     git fetch origin docs`);
    console.error(`     git checkout -b docs origin/docs`);
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
    console.error(`   请先在源仓库中用 HBuilderX 构建 h5`);
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
