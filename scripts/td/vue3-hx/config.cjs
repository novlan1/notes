const ROOTS = {
  vue2: '/Users/guowangyang/Documents/github/tdesign-uniapp-starter-vue2-hx',
  vue3: '/Users/guowangyang/Documents/github/tdesign-uniapp-starter-vue3-hx',
};

/** 根据版本获取配置 */
function getConfig(version) {
  const root = ROOTS[version];
  if (!root) {
    console.error(`不支持的版本: ${version}，可选值: vue2, vue3`);
    process.exit(1);
  }
  return {
    root,
    dist: 'unpackage/dist/build/web',
    branch: 'docs',
    whiteListInDocsBranch: [
      '.git',
      '.gitignore',
      'node_modules',
      'unpackage',
    ],
  };
}

module.exports = { ROOTS, getConfig };
