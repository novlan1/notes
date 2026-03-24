// node scripts/td/install-deps.cjs
// node scripts/td/install-deps.cjs --pr 4368
//
// 不传参数：安装最新版本
//   pnpm i @tdesign/uniapp@latest
//   pnpm i @tdesign/uniapp-chat@latest
//
// 传 --pr <number>：安装指定 PR 版本
//   pnpm i https://pkg.pr.new/@tdesign/uniapp@<number>
//   npm i https://pkg.pr.new/@tdesign/uniapp-chat@<number>

const { execSync } = require('child_process');
const path = require('path');

const BASE_DIR = '/Users/guowangyang/Documents/github';

const PROJECTS = [
  'tdesign-uniapp-starter',
  'tdesign-uniapp-starter-apply',
  'tdesign-uniapp-starter-vue2-cli',
];

const PACKAGES = [
  '@tdesign/uniapp',
  '@tdesign/uniapp-chat',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const prIndex = args.indexOf('--pr');

  if (prIndex !== -1) {
    const prNumber = args[prIndex + 1];
    if (!prNumber) {
      console.error('错误：--pr 参数需要指定 PR 编号，例如：--pr 4309');
      process.exit(1);
    }
    return { mode: 'pr', prNumber };
  }

  return { mode: 'latest' };
}

function getInstallCommands(options) {
  if (options.mode === 'pr') {
    // PR 版本：第一个用 pnpm，第二个用 npm（pkg.pr.new 对 pnpm 支持不稳定）
    return [
      `pnpm i https://pkg.pr.new/@tdesign/uniapp@${options.prNumber}`,
      `pnpm i https://pkg.pr.new/@tdesign/uniapp-chat@${options.prNumber}`,
    ];
  }

  // 最新版本
  return PACKAGES.map(pkg => `pnpm i ${pkg}@latest`);
}

function run(cmd, cwd) {
  console.log(`\n> [${path.basename(cwd)}] ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function main() {
  const options = parseArgs();

  if (options.mode === 'pr') {
    console.log(`📦 安装 PR #${options.prNumber} 版本`);
  } else {
    console.log('📦 安装最新版本 (latest)');
  }

  const commands = getInstallCommands(options);

  for (const project of PROJECTS) {
    const projectPath = path.join(BASE_DIR, project);
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📁 ${project}`);
    console.log('='.repeat(50));

    run('pnpm store prune', projectPath);

    for (const cmd of commands) {
      run(cmd, projectPath);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('✅ 全部安装完成!');
}

main();
