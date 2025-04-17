目前项目中vue.config.js中的alias配置中，加了一些额外逻辑：

```js
const alias = {
  src: path.resolve(__dirname, 'src'),
  '@': path.resolve(__dirname, 'src', getVueAppDir()), 
};
```

这样复制文件的相对路径，就可以当作引用路径。比如：

```js
import CertificationDialog from 'src/project/dzs-match/components/dialogs/certification-dialog';
```

这样引入子模块的内容，或者在一个很深的目录下引入其他内容，都是非常方便的。但缺点是在VSCode中无法跳转定义，于是写了个插件解决了这个问题。

<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/vscode-plugin-tip-define-2.png" width="600">


<img src="https://mike-1255355338.cos.ap-guangzhou.myqcloud.com/article/2022/vscode-plugin-tip-define.png" width="600">

核心逻辑非常简单：
- 判断当前行是否符合需求，即引入了src开头的文件，如果不是则退出；
- 判断引入的路径是否是文件，以及是否包含了后缀，如果不是，尝试找到引入的文件；
- 返回引入文件的地址


这里position偷了懒，只取了第一行第一列，原因是很多Vue文件，定义到第一行就够用了。

```js
const reg = /import\s+.*\s+from\s+'(.*)'/;
const lineText = line.text;

if (!lineText.match(reg)) {
  return;
}

const iPath = lineText.match(reg)[1];
const index = workDir.indexOf('/src');
let nPath = path.resolve(workDir.slice(0, index), iPath);

const postfixReg = /\.(js|ts|tsx|jsx|vue)$/;

if (!postfixReg.test(nPath)) {
  const jsPath = `${nPath}.js`; 
  const vuePath = `${nPath}.vue`; 
  const tsPath = `${nPath}.ts`; 
  const indexJSPath = path.resolve(nPath, 'index.js');
  const indexVuePath = path.resolve(nPath, 'index.vue');
  const indexTsPath = path.resolve(nPath, 'index.ts');

  const checkList = [jsPath, vuePath, tsPath, indexJSPath, indexVuePath, indexTsPath];
  
  for (const item of checkList) {
    if (fs.existsSync(item)) {
      nPath = item;
      break;
    }
  }
}
if (fs.existsSync(nPath)) {
  return new vscode.Location(vscode.Uri.file(nPath), new vscode.Position(0, 0));
} 
```

如果有相同需求的同学，可以搜索“tip-define”来使用。