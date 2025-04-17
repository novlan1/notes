最近做了一个功能，为公共子仓库自动更新版本、打tag、更新CHANGELOG。这么做的好处是使用子仓库的项目可以快速查看当前使用的版本，是否被别人回退了。

自动tag主要是借助了 standard-version 这个库，然后流水线上写个脚本，每次有MR被合并时就跑一下脚本，这次主要介绍下它的脚本。


脚本主要分为下面几步：

- 找到上一个tag，如果没有，直接执行version
- 判断距上一个tag有多少commit，如果没有直接返回，如果有则执行version

后面发现这个方式打tag有些频繁，改成间隔24小时后才能打第二个tag，也可以改成间隔一周等。

获取上一个tag，主要用的是`git describe`命令：

```bash
function getLastTag() {
  # tag=$(git tag | head -1)
  # 不能用这个，git tag 的结果不是按照时间排序的

  tag=$(git describe --abbrev=0)
  echo $tag
}
```


获取距某tag的commits数量，主要是用`git log`命令：

```bash
function getCommitsBeforeTag() {
  $tag=$1
  commits=$(git log $tag...HEAD --no-merges --oneline | wc -l)
  return $commits
}
```


判断上一个tag的时间距离现在是不是超过了24小时，注意 MAC 和 Linux 上获取某个时间的时间戳命令是不一样的。

```bash
function isLessOneDay() {
  curTag=$1
  tagTime=$(git log -1 --format=%ai ${curTag} | cat) # 获取某个tag的时间

  uname=$(uname)
  if [[ $uname = "Darwin" ]];then
    tagTimeStamp=$(date -j -f "%Y-%m-%d %H:%M:%S" "$tagTime" +%s)
  else
    tagTimeStamp=$(date -d "$tagTime" +%s) # 将时间转为时间戳
  fi;

  nowStamp=$(date +%s)
  if [[ $((nowStamp-tagTimeStamp)) -lt $((24*60*60)) ]];then
    return 1
  fi
  return 0
}
```

执行`startd-version`命令的函数：

```bash
function doStandardVerison() {
  if [[ ! -f "CHANGELOG.md" || $1 ]]; then
    npx standard-version --first-release
  else
    echo "Do release-as patch."
    npx standard-version --release-as patch
  fi

  git push --follow-tags origin
}
```

最后是主函数，就是调用了上面的各个方法：

```bash
function main() {
  tag=$(getLastTag)

  if [[ -z "$tag" ]]; then
    doStandardVerison true
    return
  fi;

  getCommitsBeforeTag $tag
  commits=$?
  echo "The number of commits is $commits"

  if [[ "$commits" -eq 0 ]];then
    return
  fi

  isLessOneDay $tag
  lessOneDay=$?
  echo "isLessOneDay returns $lessOneDay"

  if [[ $lessOneDay -eq 1  ]]; then
    return
  fi;

  doStandardVerison
}
```

__________

后面有个项目打tag打错了，用了这个命令`standard-version --release-as patch -t $(date +release-%Y%m%d-v)`，标签形如`release-20220629-v0.1.88`，如何将他们改过来呢？

`git show <tag_name>`可以拿到某个tag的commit，但是如果错误标签数目多，就比较麻烦。

看到 git 上贴有标签和对应的commit，那直接获取就简单了。

打新的 tag：

```ts
const a = document.getElementsByClassName('tag-content') || [];

const commands = [...a].map(item => {
  let title = item.querySelector('.tag-title a b').innerHTML;
  const commit = item.querySelector('.branch-commit a').innerHTML

  if (!title.startsWith('release')) {
    return ''
  }
  title = title.split('-')[2]
  return `git tag ${title} ${commit}`
}).filter(item => !!item)
  .join('\n')
  .concat('\ngit push --tags')
```

删除旧tag：

```ts
const commands2 = [...a].map(item => {
  let title = item.querySelector('.tag-title a b').innerHTML;
  const commit = item.querySelector('.branch-commit a').innerHTML
  if (!title.startsWith('release')) {
    return ''
  }
  return `git push origin --delete ${title}`
}).filter(item => !!item)
```

参考：

- [macOS date 命令增减时间](https://blog.csdn.net/u010022158/article/details/113403422)
- [Shell 获取函数的返回值](https://cloud.tencent.com/developer/article/1991405)
