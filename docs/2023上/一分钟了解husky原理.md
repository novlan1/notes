## 1. 开始

`v7+`版本的`husky`原理太简单了，这里记录下。


## 2. 原理

简单来说，就是把`git`的钩子目录指定到了项目根目录中`.husky`文件夹下，默认情况下是`.git/hooks`下，其使用的命令是：

```js
const git = (args) => cp.spawnSync('git', args, { stdio: 'inherit' });
git(['config', 'core.hooksPath', dir]);
```

这样的话，就可以在`git`钩子中进行`commit`信息检查、`lint`检查等。

常见的`git`钩子有：

- commit-msg
- pre-commit
- post-commit
- pre-push


有一点要注意，`husky install`执行后，写在`.husky`中的`git`钩子才生效。如果你先执行了`npm install`，然后从被人项目拷贝过来`husky install`，但从未执行，那钩子是不会生效的。

`package.json`中的`prepare`命令会在`npm install`完成后执行。


## 3. 源码

核心源码只有两个文件：

```bash
- bin.ts
- index.ts
```

总共暴露出4个命令：

```ts
const cmds: { [key: string]: () => void } = {
  install: (): void => (ln > 1 ? help(2) : h.install(x)),
  uninstall: h.uninstall,
  set: hook(h.set),
  add: hook(h.add),
  ['-v']: () =>
    console.log(require(p.join(__dirname, '../package.json')).version),
}
```

`husky install`上面已经讲过了，`uninstall`是相反的命令：

```ts
git(['config', '--unset', 'core.hooksPath'])
```

`set`和`add`都是添加`git`钩子中的指令，`set`可以新增指令文件，`add`可以增加指令。

```ts
export function set(file: string, cmd: string): void {
  const dir = p.dirname(file)
  if (!fs.existsSync(dir)) {
    throw new Error(
      `can't create hook, ${dir} directory doesn't exist (try running husky install)`,
    )
  }

  fs.writeFileSync(
    file,
    `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${cmd}
`,
    { mode: 0o0755 },
  )

  l(`created ${file}`)
}
```

```ts
export function add(file: string, cmd: string): void {
  if (fs.existsSync(file)) {
    fs.appendFileSync(file, `${cmd}\n`)
    l(`updated ${file}`)
  } else {
    set(file, cmd)
  }
}
```

## 4. 结语

对`husky`的原理介绍到这就结束了，是不是很简单？

有兴趣的可以自己读下[源码](https://github.com/typicode/husky)，说不定有其他收获。


