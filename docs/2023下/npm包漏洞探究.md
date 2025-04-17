## 1. 开始

经常看见一些地方说某些npm包存在漏洞，具体是哪里有漏洞呢，会危害到哪方面呢，是以什么方式造成的呢？

我十分好奇，决定一探究竟，本文用来记录npm包漏洞的内部原因，会持续更新。


## 2. glob-parent

这个包的作用是在glob表达式中，提取非魔法字符串的部分，比如：

```ts
var globParent = require('glob-parent');

globParent('path/to/*.js'); // 'path/to'
globParent('/root/path/to/*.js'); // '/root/path/to'
globParent('/*.js'); // '/'
globParent('*.js'); // '.'
globParent('**/*.js'); // '.'
globParent('path/{to,from}'); // 'path'
globParent('path/!(to|from)'); // 'path'
```

这个包被`webpack-dev-server`、`chokidar`、`eslint`等流行库使用。

该库在`<5.1.2`前有ReDos(Denial of service)攻击风险，个人理解就是会让执行变慢，攻击者可以使用特殊文件或字符，使服务器不能正常工作。


漏洞前的代码：

```ts
var enclosure = /[\{\[].*[\/]*.*[\}\]]$/;
```

修复后的代码：

```ts
var enclosure = /[\{\[].*[\}\]]$/;
```

如何检测呢，如果下面的测试用例超时，则说明存在ReDoc风险。

```ts
it('should not be susceptible to SNYK-JS-GLOBPARENT-1016905', function(done) {
  // This will time out if susceptible.
  gp('{' + '/'.repeat(5000));

  done();
});
```

根本原因是正则的回溯原理，也就是`.*`已经包含了`[\/]*`，没必要再用`[\/]*.*`了，具体的执行步骤差异不是成倍，而是指数级的。

可以用[这个网站](https://regex101.com/)查看两个正则解析的性能差异，上面的测试用例，修复前执行时间超过`2s`，修复后执行只需要`0.8ms`。

下面是一些思考，其实我们自己写代码时，也有可能写出性能极差的正则，但是并不会被漏洞检测机构收录，可能是因为我们写的库用途不广，并不是基础库，没有被大型项目使用。


参考:
- https://nvd.nist.gov/vuln/detail/CVE-2020-28469
- https://security.snyk.io/vuln/SNYK-JS-GLOBPARENT-1016905
- https://regex101.com/
- https://github.com/gulpjs/glob-parent/issues/32
- https://github.com/gulpjs/glob-parent/pull/36/commits/c6db86422a9731d4f3d332ce4a81c27ea6b0ee46

## 3. xlsx

这个包`<0.19.3`的版本都有原型污染的漏洞，另外这个库已经不在`github`和`npm`上更新了，需要这样更新：

```
npm i https://cdn.sheetjs.com/xlsx-0.19.3/xlsx-0.19.3.tgz
```

看了下代码，并没有找到相关的漏洞修复提交记录，不知道是不是换了个源，人们就认为它修复了呢？


参考:
- https://nvd.nist.gov/vuln/detail/CVE-2023-30533
- https://cdn.sheetjs.com/advisories/CVE-2023-30533
- https://git.sheetjs.com/sheetjs/sheetjs/src/branch/master/CHANGELOG.md
- https://git.sheetjs.com/sheetjs/sheetjs/issues/2667
- https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
- https://www.leavesongs.com/PENETRATION/javascript-prototype-pollution-attack.html


## 4. file-type


这个包也是会引起Dos攻击，原因是读取 MKV 文件的时候处理不当，会造成无限循环。

有问题的版本为`>= 17.0.0, < 17.1.3`和`>= 13.0.0, < 16.5.4`，修复的版本为`17.1.3`和`16.5.4`。



参考：

- https://nvd.nist.gov/vuln/detail/CVE-2022-36313
- https://github.com/sindresorhus/file-type/releases/tag/v16.5.4
- https://github.com/sindresorhus/file-type/releases/tag/v17.1.3
- https://www.npmjs.com/package/file-type
- https://github.com/sindresorhus/file-type/commit/2c4d1200c99dffb7d515b9b9951ef43c22bf7e47
- https://github.com/sindresorhus/file-type/commit/d86835680f4cccbee1a60628783c36700ec9e254
- https://github.com/sindresorhus/file-type/commit/8f981c32e2750d2516457e305e502ee2ad715759#diff-c853b2249e99790d8725774cf63c90c5ab17112067df6e267f3701d7bf591d12
- https://github.com/sindresorhus/file-type/compare/v12.4.2...v13.0.0#diff-c853b2249e99790d8725774cf63c90c5ab17112067df6e267f3701d7bf591d12R611-R613
- https://security.snyk.io/vuln/SNYK-JS-FILETYPE-2958042
- https://security.netapp.com/advisory/ntap-20220909-0005/
- https://github.com/advisories/GHSA-mhxj-85r3-2x55

## 5. ejs

ejs是个模版解析工具，被express等库使用。

首先它本身是个javascript运行时工具，开发者需要自己对数据进行校验后再进行下一步处理或输出，不能这样：

```js
const express = require('express');
const app = express();
const PORT = 3000;
app.set('views', __dirname);
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index', req.query);
});

app.listen(PORT, ()=> {
    console.log(`Server is running on ${PORT}`);
});
```

有关ejs本身的漏洞是这样的，在query中的参数没被过滤，可以直接运行，造成RCE（远程代码执行`remote command/code execute`）攻击。


有问题的版本为`< 3.1.7`，修复的版本为`>= 3.1.7`。


参考：

- https://nvd.nist.gov/vuln/detail/CVE-2022-29078
- https://eslam.io/posts/ejs-server-side-template-injection-rce/
- https://github.com/mde/ejs/commit/15ee698583c98dadc456639d6245580d17a24baf
- https://github.com/mde/ejs/releases
- https://security.netapp.com/advisory/ntap-20220804-0001/
- https://github.com/advisories/GHSA-phwq-j96m-2c2q

## 6. qs

qs是字符串解析库，使用非常广泛。

关于它的一个漏洞也是原型污染类的，因为它可以用来解析对象，解决办法也很简单，就是过滤`__proto__`属性即可。

| 影响版本            | 修复版本 |
| ------------------- | -------- |
| >= 6.10.0, < 6.10.3 | 6.10.3   |
| >= 6.9.0, < 6.9.7   | 6.9.7    |
| >= 6.8.0, < 6.8.3   | 6.8.3    |
| >= 6.7.0, < 6.7.3   | 6.7.3    |
| >= 6.6.0, < 6.6.1   | 6.6.1    |
| >= 6.5.0, < 6.5.3   | 6.5.3    |
| >= 6.4.0, < 6.4.1   | 6.4.1    |
| >= 6.3.0, < 6.3.3   | 6.3.3    |
| < 6.2.4             | 6.2.4    |



参考：

- https://nvd.nist.gov/vuln/detail/CVE-2022-24999
- https://github.com/ljharb/qs/pull/428
- https://github.com/n8tz/CVE-2022-24999
- https://github.com/ljharb/qs/commit/4310742efbd8c03f6495f07906b45213da0a32ec
- https://github.com/ljharb/qs/commit/727ef5d34605108acb3513f72d5435972ed15b68
- https://github.com/ljharb/qs/commit/73205259936317b40f447c5cdb71c5b341848e1b
- https://github.com/ljharb/qs/commit/8b4cc14cda94a5c89341b77e5fe435ec6c41be2d
- https://github.com/ljharb/qs/commit/ba24e74dd17931f825adb52f5633e48293b584e1
- https://github.com/ljharb/qs/commit/e799ba57e573a30c14b67c1889c7c04d508b9105
- https://github.com/ljharb/qs/commit/ed0f5dcbef4b168a8ae299d78b1e4a2e9b1baf1f
- https://github.com/ljharb/qs/commit/f945393cfe442fe8c6e62b4156fd35452c0686ee
- https://github.com/ljharb/qs/commit/fc3682776670524a42e19709ec4a8138d0d7afda
- https://github.com/expressjs/express/releases/tag/4.17.3
- https://lists.debian.org/debian-lts-announce/2023/01/msg00039.html
- https://github.com/advisories/GHSA-hrpp-h998-j3pp



----- 2024.12.19 更新 ------

## 7. vant

亲身经历。

有发布权限的人发布了 [vant@2.13.5](https://www.npmjs.com/package/vant/v/2.13.5)，带了一个恶意程序 `lib/utils/support.js`，并增加了 `postinstall` 脚本命令，用户安装`vant`后，就会自动执行这个文件，然后在构建机挖矿。

影响范围：`vant` 被投毒后、未删之前期间，`package.json` 未锁定版本，从 `npm` 官方源下载 `vant` 的用户。

解决办法：

1. 官方删除有问题版本（已删除）
2. 构建机重装
3. 锁定版本号，避免出现类似问题

相关链接：https://github.com/youzan/vant/discussions/13273

