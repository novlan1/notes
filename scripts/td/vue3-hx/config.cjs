const VUE3_HX_ROOT = '/Users/guowangyang/Documents/github/tdesign-uniapp-starter-vue3-hx';
const VUE2_HX_ROOT = '/Users/guowangyang/Documents/github/tdesign-uniapp-starter-vue2-hx';

const CONFIG = {
  VUE3_HX_ROOT,
  VUE2_HX_ROOT,
  root: VUE3_HX_ROOT,
  dist: 'unpackage/dist/build/web',
  branch: 'docs',
  whiteListInDocsBranch: [
    '.git',
    '.gitignore',
    'node_modules',
    'unpackage',
  ]
};

module.exports = CONFIG;
