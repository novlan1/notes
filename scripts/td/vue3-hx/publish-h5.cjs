// node scripts/td/vue3-hx/publish-h5.cjs --vue3
// node scripts/td/vue3-hx/publish-h5.cjs --vue2
//
// 将指定项目的打包产物，放到 docs 分支，然后推送到 github 进行 pages 构建
// 要求：当前项目必须在 develop 分支上才能执行

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
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

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: CONFIG.root, ...options });
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

/** 将源目录下的所有文件复制到目标目录 */
function copyDirContents(srcDir, destDir) {
  for (const item of fs.readdirSync(srcDir)) {
    copyRecursive(path.join(srcDir, item), path.join(destDir, item));
  }
}

/** 清空目录（保留 .git） */
function cleanWorkingDir() {
  console.log('清空工作目录...');
  for (const item of fs.readdirSync(CONFIG.root)) {
    if (CONFIG.whiteListInDocsBranch.includes(item)) continue;
    removeRecursive(path.join(CONFIG.root, item));
  }
}

/** 获取当前分支名 */
function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd: CONFIG.root })
    .toString()
    .trim();
}

/** 切换到目标分支，不存在则创建孤立分支 */
function checkoutTargetBranch() {
  try {
    run(`git checkout ${CONFIG.branch}`);
  } catch {
    console.log(`分支 ${CONFIG.branch} 不存在`);
    // console.log(`分支 ${CONFIG.branch} 不存在，创建孤立分支...`);
    // run(`git checkout --orphan ${CONFIG.branch}`);
    process.exit(1);
  }
}

/** 提交并推送 */
function commitAndPush() {
  const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  run('git add .');
  run(`git commit -m "deploy: ${timestamp}"`);
  run(`git push origin ${CONFIG.branch}`);
}

function main() {
  const currentBranch = getCurrentBranch();
  console.log(`📦 版本: ${version} | 项目: ${path.basename(CONFIG.root)}`);
  console.log(`当前分支: ${currentBranch}`);

  if (currentBranch !== 'develop') {
    console.error(`❌ 当前分支为 ${currentBranch}，只能在 develop 分支上执行发布操作`);
    process.exit(1);
  }

  const distPath = path.join(CONFIG.root, CONFIG.dist);

  if (!fs.existsSync(distPath)) {
    console.error(`dist 目录不存在: ${distPath}`);
    process.exit(1);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-h5-'));

  try {
    console.log(`复制 dist 到临时目录: ${tempDir}`);
    copyDirContents(distPath, tempDir);

    checkoutTargetBranch();
    cleanWorkingDir();

    console.log('复制文件到根目录...');
    copyDirContents(tempDir, CONFIG.root);

    commitAndPush();
    console.log('\n✅ 发布成功!');

    run(`git checkout ${currentBranch}`);
  } catch (err) {
    console.error('发布失败:', err.message);
    // try { run('git checkout -'); } catch {}
    process.exit(1);
  } finally {
    console.log(`清理临时目录: ${tempDir}`);
    removeRecursive(tempDir);
  }
}

main();
