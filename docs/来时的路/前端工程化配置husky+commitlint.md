
## 一、husky和lint-staged

husky继承了Git下所有的钩子，在触发钩子的时候，husky可以阻止不合法的commit、push等等。注意使用husky之前，必须先将代码放到git 仓库中，否则本地没有.git文件，就没有地方去继承钩子了。 

lint-staged是一个可以提供运行脚本校验文件的插件平台；可以根据不同文件执行不同的命令。

lint-staged，一个仅仅过滤出Git代码暂存区文件(被committed的文件)的工具，并不像eslint那样需要配置忽略配置、配置内的文件全量遍历检查。


```bash
$ npm install husky lint-staged -D
```

package.json中增加prepare命令，顺便设置下lint-staged命令：

```js
"scripts": {
  "prepare": "husky install",
},
"lint-staged": {
  "*.{js,jsx,vue,ts,tsx}": [
    "eslint --fix"
  ]
}
```

然后执行以下命令会生成.husky文件夹：

```bash
$ npm run prepare
```


在.husky文件夹下增加pre-commit文件：

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

或者使用以下命令生成：

```bash
$ npx husky add .husky/pre-commit "npx lint-staged"
```

## 二、规范commit信息

### 1. Conventional Commits specification

要想规范git commit 提交，我们先要了解一下Commit Message格式，目前规范使用较多的是 [Angular 团队的规范](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines), 继而衍生了 [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0). 很多工具也是基于此规范, 它的 message 格式如下:

每次提交，Commit message 都包括三个部分：Header，Body 和 Footer。

```html
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

其中，Header 是必需的，Body 和 Footer 可以省略。

不管是哪一个部分，任何一行都不得超过100个字符。这是为了避免自动换行影响美观。

- 标题行(第一行/header): 必填, 描述主要修改类型和内容
- 主题内容(body): 描述为什么修改, 做了什么样的修改, 以及开发的思路等等
- 页脚注释(footer): 放 Breaking Changes 或 Closed Issues
- scope: commit 影响的范围, 比如: route, component, utils, build...
- subject: commit 的概述, 建议符合 50/72 formatting
- body: commit 具体修改内容, 可以分为多行, 建议符合 50/72 formatting
- footer: 一些备注, 通常是 BREAKING CHANGE 或修复的 bug 的链接.

1. Header
  - Header部分只有一行，包括三个字段：type（必需）、scope（可选）和subject（必需）。
  - type（必填）：type用于说明 commit 的类别。
  - scope（可选）：scope用于说明 commit 影响的范围，比如数据层、控制层、视图层等等，视项目不同而不同。
  - subject（必填）:subject是 commit 目的的简短描述，

2. Body（可省）
  - Body 部分是对本次 commit 的详细描述，可以分成多行。
3. Footer（可省）
  - Footer 部分只用于两种情况。
  - 1）不兼容变动
    - 如果当前代码与上一个版本不兼容，则 Footer 部分以BREAKING CHANGE开头，后面是对变动的描述、以及变动理由和迁移方法。
  - 2）关闭 Issue
    - 如果当前 commit 针对某个issue，那么可以在 Footer 部分关闭这个 issue 。
    - Closes #234。也可以一次关闭多个 issue。Closes #123, #245, #992


type 类型：

- feat：新增功能
- fix：bug 修复
- docs：文档更新
- style：不影响程序逻辑的代码修改(修改空白字符，格式缩进，补全缺失的分号等，没有改变代码逻辑)
- refactor：重构代码(既没有新增功能，也没有修复 bug)
- perf：性能, 体验优化
- test：新增测试用例或是更新现有测试
- build：主要目的是修改项目构建系统(例如 glup，webpack，rollup 的配置等)的提交
- ci：主要目的是修改项目继续集成流程(例如 Travis，Jenkins，GitLab CI，Circle等)的提交
- chore：不属于以上类型的其他类，比如构建流程, 依赖管理
- revert：回滚某个更早之前的提交

如果type为feat和fix，则该 commit 将肯定出现在 Change log 之中。其他情况（docs、chore、style、refactor、test）由你决定，要不要放入 Change log，建议是不要。


subject注意事项：

- 以动词开头，使用第一人称现在时，比如change，而不是changed或changes
- 第一个字母小写
- 结尾不加句号（.）




Body有两个注意点：

- 使用第一人称现在时，比如使用change而不是changed或changes。
- 应该说明代码变动的动机，以及与以前行为的对比。


### 2. 用Commitizen替代你的 git commit (使用工具生成符合规范的commit message)


上面我们已经了解了Commit Message的格式是什么样的了，如果让我们自己手动敲出那些格式也不是不可能，但是我相信那不是程序员的作风，大多数人会疯掉吧，，那么就需要通过`commitizen/cz-cli` 工具，我们需要借助它提供的  git cz  命令替代我们之前的  git commit  命令, 帮助我们生成符合规范的 commit message .


```bash
$ npm install --save-dev commitizen cz-conventional-changelog
```

package.json中增加：

```json
"config": {
  "commitizen": {
    "path": "./node_modules/cz-conventional-changelog"
  }
},
```


安装完可以在script添加命令或者：npx git-cz

在项目中.husky目录下添加一个prepare-commit-msg钩子：

```bash
$ npx husky add .husky/prepare-commit-msg "exec < /dev/tty && npx git-cz --hook || true"
```


### 3. commitlint

```bash
$ npm install @commitlint/cli @commitlint/config-conventional -D
```

在项目中.husky目录下添加一个commit-msg钩子：

```bash
$ npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

项目根目录下新建一个commitlint.config.js：

```bash
$ echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
```

这样在git commit时会校验commit的内容。


## 三、参考

1. [husky](https://github.com/typicode/husky)
2. [lint-staged](https://www.npmjs.com/package/lint-staged)
3. [commitizen](https://github.com/commitizen/cz-cli)
4. [cz-conventional-changelog](https://github.com/commitizen/cz-conventional-changelog)
5. [commitlint](https://github.com/conventional-changelog/commitlint)
6. [如何规范git commit提交](https://www.cnblogs.com/jiaoshou/p/11190619.html)

