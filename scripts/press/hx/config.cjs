// 源仓库（构建产物所在）和 @docs 目录（发布目标）的路径配置
// @docs 不是独立 GitHub 仓库，而是当前仓库的另一个本地工作目录（关联同一个 origin，checkout docs 分支）
// 这跟 tdesign 的 `xxx@docs` 目录是同一个模式（参考 tdesign-uniapp-starter-vue3-hx vs xxx@docs）
//
// 使用前准备（一次性）：
// 1. 在 @docs 目录初始化 git + 关联 origin + checkout docs 分支（origin/docs 当前仓库已有内容，直接 checkout 即可）
//    cd /Users/guowangyang/Documents/github/press-ui-demo-vue3-uni@docs
//    git init
//    git remote add origin git@github.com:novlan1/press-ui-demo-vue3-uni.git
//    git fetch origin docs
//    git checkout -b docs origin/docs
// 2. push 到 origin/docs 后，GitHub Pages 会从 docs 分支根目录自动部署（无需任何 Action）

const CONFIG = {
  // 源仓库路径（构建产物所在）
  source: '/Users/guowangyang/Documents/github/press-ui-demo-vue3-uni',
  // docs 仓库路径（发布目标，checkout docs 分支）
  docs: '/Users/guowangyang/Documents/github/press-ui-demo-vue3-uni@docs',
  // 构建产物相对于源仓库的路径（HBuilderX h5 产物目录）
  // 新版 HBuilderX 产物是 web 目录；若你的 HBuilderX 产物是 h5 目录，改成 'unpackage/dist/build/h5'
  dist: 'unpackage/dist/build/web',
  // docs 分支名
  branch: 'docs',
  // 清空 docs 仓库时保留的文件/目录
  whiteList: [
    '.git',
    '.gitignore',
  ],
};

/** 获取配置 */
function getConfig() {
  return CONFIG;
}

module.exports = { CONFIG, getConfig };
