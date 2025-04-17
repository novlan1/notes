
## 1. travis

首先注册[travis](https://www.travis-ci.com/)，然后在项目中添加`.travis.yml`配置文件，配置教程可以参考[这篇文章](http://www.ruanyifeng.com/blog/2017/12/travis_ci_tutorial.html)。

### 1.1. 内置变量

下面是travis的一些内置变量：

```bash
$ echo ${BASH_SOURCE}
/home/travis/.travis/functions

$ echo ${TRAVIS_BUILD_NUMBER}
3

$ echo $TRAVIS_REPO_SLUG
user/repo

$ echo $TRAVIS_BRANCH
master

$ echo $TRAVIS_PULL_REQUEST
false
```


### 1.2. 变量管理

travis变量可以放到它的网站，但是如果放在网站，比较难维护，比如github token存在有效期，比较好的办法是用travis命令行生成密钥，放在travis.yml文件中。


首先要安装Ruby的包travis

```bash
$ gem install travis
```

如果报错`Could not find a valid gem 'rubygame' (>= 0) in any repository`，可以[参考这里](https://stackoverflow.com/questions/9962051/could-not-find-a-valid-gem-in-any-repository-rubygame-and-others)，执行一下下面的命令：

```bash
$ gem sources --add https://rubygems.org/
```


装好travis后，用github token登录下travis：

```bash
# 假设获取到的github token是some_token
$ travis login --pro --github-token some_token
```

然后生成密钥：

```bash
$ travis encrypt GH_TOKEN=some_token --pro --add
```

## 2. codecov

测试框架是jest的，接入 codecov 很方便，不需要安装`nyc`。

要在 travis 网站保存 CODECOV_ENV 变量，然后在`.travis.yml`中`after_success`里面加上 codecov 命令即可。


## 3. docdash


docdash 是 jsdoc 文档一个模板，风格比较简洁，腾讯云IM的文档就是基于 docdash 构建的。

需要指定一个配置文件，然后将 jsdoc 命令添加到 script 中即可。

```json
"scripts": {
  "docs:gen": "jsdoc -c script/docs/jsdoc.json && cp script/docs/jsdoc.js docs",
}
```

相对于之前的jsdoc转markdown，然后用vuepress，docdash的优势有：
- 全部基于jsdoc，简单易维护，不用先转markdown再转文档；
- API目录扁平化，一目了然；
- 支持搜索（vuepress也支持）；
- 支持一键查看源代码；
- 导航栏可按模块分类，方便查看

vuepress更适合大项目，比如vue这种，对于一个中小型的API文档，docdash这种jsdoc模板足矣。

docdash使用注意事项：

1. class注释不要写在`class`上面，而要写在`constructor`上，否则docdash 会把其中 `static` 方法文档生成两份。
2. 多个文件如果`@module`名称一样的话，会生成多个相同的`section`，可以写脚本去掉重复的`section`
3. 如果一个声明了`@class`或者`@constructor`的文件没有引入并使用外部模块，`global`和`classes`两大部分中会有重复的方法。
   此时可以通过`import`一个模块然后将其导出解决，比如

```ts
export { bootstrap } from '../bootstrap';
```

4. 不要用`export class JsDocHandler`，而是`export { JsDocHandler }`，否则导航会变成`JsDocHandler#JsDocHandler`。



## 4. github actions


利用`github actions`也可以实现CI/CD，代码如下：

```yml
# action 的名称
name: Deploy GitHub Pages

# 触发条件：在 push 到 main 分支后
on:
  push:
    branches:
      - master

# 任务
jobs:
  build-and-deploy:
    # 服务器环境：最新版 Ubuntu
    runs-on: ubuntu-latest
    steps:
      # 拉取代码
      - name: Checkout
        uses: actions/checkout@v2
        with:
          persist-credentials: false

      # 生成静态文件
      - name: Build
        run: npm install && npm run docs:gen

      # 部署到 GitHub Pages
      - name: Deploy
        # 使用别人写好的一个 action
        uses: JamesIves/github-pages-deploy-action@releases/v3
        with:
          # 这里的 ACCESS_TOKEN 名字需要和下文中的相对应
          ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
          # 打包后的文件部署到哪个分支上
          BRANCH: gh-pages
          # 打包后的文件在哪里
          FOLDER: docs
```




## 5. 代码

.travis.yml

```yml
# .travis.yml
language: node_js
node_js:
- '14'
sudo: false
branches:
  only:
  - master
before_script:
- npm install
- npm install codecov
script:
- npm run docs:gen
- npm run test
after_success:
- cd $TRAVIS_BUILD_DIR
- chmod +x generateDocs.sh
- bash generateDocs.sh
- codecov
env:
  global:
  - secure: eGafAystS...
  - secure: uvIn3m4eO...
```

generateDocs.sh

```bash
#!/bin/sh

if [ "$TRAVIS_PULL_REQUEST" == "false" ] && [ "$TRAVIS_BRANCH" == "master" ] && [ "$TRAVIS_REPO_SLUG" == "" ]; then

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo 'Setting up the script...'
# Exit with nonzero exit code if anything fails
set -e

# Get the current gh-pages branch
git clone -b gh-pages http://github.com/$TRAVIS_REPO_SLUG repo
cd repo

##### Configure git.
# Set the push default to simple i.e. push only the current branch.
git config --global push.default simple
# Pretend to be an user called Travis CI.
git config user.name "Travis CI"
git config user.email "travis@travis-ci.org"

# Remove everything currently in the gh-pages branch.
# GitHub is smart enough to know which files have changed and which files have
# stayed the same and will only update the changed files. So the gh-pages branch
# can be safely cleaned, and it is sure that everything pushed later is the new
# documentation.
rm -rf *

# Need to create a .nojekyll file to allow filenames starting with an underscore
# to be seen on the gh-pages site. Therefore creating an empty .nojekyll file.
echo "" > .nojekyll

################################################################################
##### Generate JSDOC documents.          #####
echo 'Copying generated JSDoc code documentation...'
cp -R ../docs/* ./ ;

################################################################################
##### Upload the documentation to the gh-pages branch of the repository.   #####
# Only upload if JSDoc successfully created the documentation.
# Check this by verifying that the file index.html exists
if [ -f "index.html" ]; then

    echo 'Uploading documentation to the gh-pages branch...'
    # Add everything in this directory to the
    # gh-pages branch.
    # GitHub is smart enough to know which files have changed and which files have
    # stayed the same and will only update the changed files.
    git add --all

    # Commit the added files with a title and description containing the Travis CI
    # build number and the GitHub commit reference that issued this build.
    git commit -m "Deploy code docs to GitHub Pages Travis build: ${TRAVIS_BUILD_NUMBER}" -m "Commit: ${TRAVIS_COMMIT}"

    # Force push to the remote gh-pages branch.
    # The ouput is redirected to /dev/null to hide any sensitive credential data
    # that might otherwise be exposed.
    git push --force "https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG}" > /dev/null 2>&1
else
    echo '' >&2
    echo 'Warning: No documentation (html) files have been found!' >&2
    echo 'Warning: Not going to push the documentation to GitHub!' >&2
    exit 1
fi

fi
```


jsdoc.json

```json
{
  "tags": {
    "allowUnknownTags": false
  },
  "source": {
    "include": [
      "src",
      "README.md"
    ],
    "includePattern": "\\.(t|j)s$",
    "excludePattern": "(node_modules/|docs)"
  },
  "plugins": [
    "plugins/markdown",
    "node_modules/better-docs/typescript"
  ],
  "opts": {
    "template": "node_modules/docdash/",
    "encoding": "utf8",
    "destination": "docs/",
    "recurse": true,
    "verbose": true
  },
  "markdown": {
    "parser": "gfm",
    "hardwrap": true,
    "idInHeadings": true
  },
  "templates": {
    "cleverLinks": false,
    "monospaceLinks": false,
    "default": {
      "outputSourceFiles": true,
      "includeDate": false,
      "useLongnameInNav": true
    }
  },
  "docdash": {
    "static": true,
    "sort": false,
    "disqus": "",
    "search": true,
    "collapse": true,
    "typedefs": true,
    "commonNav": true,
    "removeQuotes": "none",
    "scripts": [
      "./jsdoc.js"
    ],
    "menu": {
      "Github repo": {
        "href": "",
        "target": "_blank",
        "class": "menu-item",
        "id": "repository"
      }
    }
  }
}
```

## 6. 参考资料

- https://docs.travis-ci.com/user/encryption-keys/
- http://www.ruanyifeng.com/blog/2017/12/travis_ci_tutorial.html



