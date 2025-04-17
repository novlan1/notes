## 一、背景

随着部署在devcloud项目的增多，比如研发平台、监控工具、自动化测试，以及更新迭代的频繁，之前的部署方案效率愈显低效，需要手动打包 => 登录服务器 => 解压缩到部署目录，后端项目还要`pm2 restart`，或者登录服务器后执行`git pull`，比较麻烦。

现开发了一个小工具，可以快速部署前端项目、Node.js后端项目。


## 二、思想

整体思路是：

1. 使用bash脚本上传项目压缩包
2. 在服务器上监控某目录，当该目录新增某项目的文件时，就部署该项目。

    - 前端项目直接解压到部署目录
    - 后端项目解压后，依次执行`npm install`、`pm2 restart`。


这里面最重要的是规范化，包括打包方式、前后端项目命名、压缩包名称、前端项目打包后路径、上传目录、部署目录等。

目前的规范包括：

- 打包方式
    - `gzip`，打包命令是`tar -zcvf`，对应的解压命令是`tar -zxvf`
- 前后端项目命名规范
    - 前端项目为`xxx-frontend`，后端项目为`xxx-backend`。不要跟着不规范的仓库名称走。
- 压缩包命名规范
    - 项目名称加`.tar.gz`
- 前端项目本地打包路径
    - 为`dist/project/xxx`
- 上传目录
    - `/root/watch-to-deploy-dir`
- 部署目录
    - `/root/deploy-dir`



## 三、使用指引


新项目接入需要增加1个文件，`.env.local`，并将其加入`.gitignore`中。其内容包含项目名称、服务器地址、服务器密码，如：

```bash
DEPLOY_PROJECT=xxx
HOST_NAME=1.1.1.1
HOST_PWD=xxx
```

然后安装deploy-bash：

```bash
$ npm install deploy-bash --save-dev
```

然后在package.json的script中增加这样一条命令：

```bash
{
  "deploy": "deploy 1"
}
```

部署的时候执行`npm run deploy`就行了。


如果后端项目之前没有配置[ecosystem.config.js](https://pm2.keymetrics.io/docs/usage/application-declaration/)的话，需要新增一下。

前端项目可以参考[pmd-auto-test-frontend](https://git.a.com/pmd-mobile/support/pmd-auto-test-frontend)，后端项目可以参考[pmd-auto-test-svr](https://git.a.com/pmd-mobile/support/pmd-auto-test-svr)。

## 四、deploy-bash

[deploy-bash](https://www.npmjs.com/package/deploy-bash)是部署脚本，使用方式是：

```bash
# 参数依次为 isBackEndProject、targetDir
$ npx deploy 1 /root

# targetDir可以为空：
$ npx deploy 1
```

- 第一个参数表示是否为后端项目，1: 是，0: 否，默认为0。
- 第二个参数表示上传目录，如果不传，则用默认逻辑。


## 五、知识点

编写过程中遇到一些小知识点，这里记录下。

1、 新 `publish` 的库还没同步到公司的镜像的时候，用：

```bash
$ npm install deploy-bash@latest --registry=https://registry.npmjs.org/
```

2、 tar 默认不打包隐藏文件，也就是以点开头的。

3、 不要开启 `git clean -xdf`，不然之前的 `npm install` 的 `node_modules` 会被清除。

```js
git clean -n
// 是一次 clean 的演习, 告诉你哪些文件会被删除，不会真的删除

git clean -f
// 删除当前目录下所有没有 track 过的文件
// 不会删除 .gitignore 文件里面指定的文件夹和文件, 不管这些文件有没有被 track 过

git clean -f <path>
// 删除指定路径下的没有被 track 过的文件

git clean -df
// 删除当前目录下没有被 track 过的文件和文件夹

git clean -xf
// 删除当前目录下所有没有 track 过的文件.
// 不管是否是 .gitignore 文件里面指定的文件夹和文件

git clean
// 对于刚编译过的项目也非常有用
// 如, 他能轻易删除掉编译后生成的 .o 和 .exe 等文件. 这个在打包要发布一个 release 的时候非常有用

git reset --hard
git clean -df
git status
// 运行后, 工作目录和缓存区回到最近一次 commit 时候一摸一样的状态。
// 此时建议运行 git status，会告诉你这是一个干净的工作目录, 又是一个新的开始了！
```

4、 bash字符串赋值时提供一个默认值，`var=${str-epr}`，比如：

```bash
function main() {
  var=${1-hello}
  echo $var
}

main # hello
main world # world
```


5、 发布包的 `package.json` 的 `files`中填 `"./dist/index.js"` 不生效，要填 `"dist/index.js"`。
6、 Git的多用户配置

(1) 配置文件

我们常用的配置文件有两个：

- 全局级别的配置文件：`~/.gitconfig`
- 仓库级别的配置文件：git 仓库中的`.git/config`

除了上面这两个，还有两个不怎么常用的配置文件：

- 系统级别的配置文件：`/etc/gitconfig`
- 工作区级别的配置文件：git 仓库中的`.git/config.worktree`

这四个配置文件的优先级由高至低为：
工作区（`.git/config.worktree`） > 仓库（`.git/config`） > 用户（`~/.gitconfig`） > 系统（`/etc/gitconfig`）

(2) 修改配置

命令行修改 git 配置的命令如下：

```bash
git config [--local|--global|--system] [key] [value]
```

举个例子，修改全局级别的用户信息：

```bash
git config --global user.name "您的名字"
git config --global user.email "您的邮箱"
```

设置的时候默认是--local。

查看配置的命令是：

```bash
git config [--local|--global|--system] [key]
```

查看配置的是按照优先级依次查找。

(3) 多用户配置

最简单的方式是在`~/.gitconfig`中增加1条对自己工作区的配置：

```bash
[user]
    name = youName
    email = youEmail@example.com

## 私人项目
[includeIf "gitdir:path/to/you/dir/"]
    path = ~/.gitconfig_self

## 工作项目
[includeIf "gitdir:path/to/work/dir/"]
    path = ~/.gitconfig_work
```

`~/.gitconfig_self`中内容：

```bash
[user]
    name = yourname-self
    email = yourname-self@gmail.com
```

`~/.gitconfig_work`中内容：

```bash
[user]
    name = yourname-work
    email = yourname-work@yourCompanyName.com
```

(4) 多用户配置的作用

- 参与Github开源项目
- Github的Contributions Graph需要提交的用户邮箱与登录邮箱一致


(5) 参考

- [Why are my contributions not showing up on my profile?](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-graphs-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile)
- [git config多用户配置](https://juejin.cn/post/7012499070367301646)
- [最简单的 Git 本地多用户管理](https://juejin.cn/post/7054370789050548231)

