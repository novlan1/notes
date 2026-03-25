// 源仓库（构建产物所在）和 docs 仓库（发布目标）的路径配置
// @docs 目录是单独 clone 的一份仓库，专门 checkout docs 分支
const CONFIGS = {
  vue2: {
    source: '/Users/guowangyang/Documents/github/tdesign-uniapp-starter-vue2-hx',
    docs: '/Users/guowangyang/Documents/github/tdesign-uniapp-starter-vue2-hx@docs',
  },
  vue3: {
    source: '/Users/guowangyang/Documents/github/tdesign-uniapp-starter-vue3-hx',
    docs: '/Users/guowangyang/Documents/github/tdesign-uniapp-starter-vue3-hx@docs',
  },
};

/** 根据版本获取配置 */
function getConfig(version) {
  const config = CONFIGS[version];
  if (!config) {
    console.error(`不支持的版本: ${version}，可选值: vue2, vue3`);
    process.exit(1);
  }
  return {
    // 源仓库路径（构建产物所在）
    source: config.source,
    // docs 仓库路径（发布目标，checkout docs 分支）
    docs: config.docs,
    // 构建产物相对于源仓库的路径
    dist: 'unpackage/dist/build/web',
    // docs 分支名
    branch: 'docs',
    // 清空 docs 仓库时保留的文件/目录
    whiteList: [
      '.git',
      '.gitignore',
    ],
  };
}

module.exports = { CONFIGS, getConfig };
