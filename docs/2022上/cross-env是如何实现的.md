## 一、开始

`cross-env`主要解决了在不同操作系统下设置环境变量的问题：

>在大多数Windows命令行中在使用NODE_ENV = production设置环境变量时会报错。同样，Windows和Linux命令如何设置环境变量也有所不同。 使用cross-env可以设置在不同的平台上有相同的NODE_ENV参数。



`cross-env`是怎样在`windows`系统下做到这一点的呢，我们一起看下。

## 二、源码

### 1. 入口

先看`package.json`，看到其暴露了两个命令，`cross-env`和`cross-env-shell`。


```js
"main": "src/index.js",
"bin": {
  "cross-env": "src/bin/cross-env.js",
  "cross-env-shell": "src/bin/cross-env-shell.js"
},
```

`cron-env.shell.js`文件如下，就是调用`main`文件中的`crossEnv`函数。

```js
#!/usr/bin/env node
const crossEnv = require('..')

crossEnv(process.argv.slice(2), {shell: true})
```

`cron-env.js`差不多，只是调用`crossEnv`函数的时候没有传入`shell：true`这个参数。

```js
#!/usr/bin/env node

const crossEnv = require('..')

crossEnv(process.argv.slice(2))
```

关于二者的不同，官方文档描述如下：

`cron-env`执行命令`cross-spawn`，而`cron-env-shell`使用`shellNode` 的选项`spawn`。

`cross-env-shell`主要作用在是当需要在整个内联 `shell` 脚本中设置环境变量时，而不仅仅是一个命令。

例如，如果想让环境变量连续应用于多个命令，那么需要将它们用引号括起来并使用 `cross-env-shell`而不是`cross-env`.

```js
{
  "scripts": {
    "greet": "cross-env-shell GREETING=Hi NAME=Joe \"echo $GREETING && echo $NAME\""
  }
}
```

经验法则是：如果你想传递`cross-env`一个包含你想要解释的特殊 `shell` 字符的命令，那么使用 `cross-env-shell`. 否则使用`cross-env`。

### 2. 主函数

`crossEnv`如下，先通过`parseCommand`解析参数，拿到环境变量设置、命令、命令参数。

然后通过`getEnvVars`拿到`process.env`上的所有变量。之后调用`cross-spawn`中的`spawn`方法执行。

此外，监听了执行中的`exit`事件，如果是用户主动退出的话，会执行`process.exit(0)`。

```js
const {spawn} = require('cross-spawn')

function crossEnv(args, options = {}) {
  const [envSetters, command, commandArgs] = parseCommand(args)
  const env = getEnvVars(envSetters)
  if (command) {
    const proc = spawn(
      // run `path.normalize` for command(on windows)
      commandConvert(command, env, true),
      // by default normalize is `false`, so not run for cmd args
      commandArgs.map(arg => commandConvert(arg, env)),
      {
        stdio: 'inherit',
        shell: options.shell,
        env,
      },
    )
    process.on('SIGTERM', () => proc.kill('SIGTERM'))
    process.on('SIGINT', () => proc.kill('SIGINT'))
    process.on('SIGBREAK', () => proc.kill('SIGBREAK'))
    process.on('SIGHUP', () => proc.kill('SIGHUP'))
    proc.on('exit', (code, signal) => {
      let crossEnvExitCode = code
      // exit code could be null when OS kills the process(out of memory, etc) or due to node handling it
      // but if the signal is SIGINT the user exited the process so we want exit code 0
      if (crossEnvExitCode === null) {
        crossEnvExitCode = signal === 'SIGINT' ? 0 : 1
      }
      process.exit(crossEnvExitCode) //eslint-disable-line no-process-exit
    })
    return proc
  }
  return null
}
```

`parseCommand`是解析命令和参数的函数，就是将看哪部分是设置环境变量、命令、命令参数。

比如`cross-env DEPLOY=server2 node build/build.js`中，就会返回`[{ DEPLOY:server2 }, node, build/build.js]`

```js
const envSetterRegex = /(\w+)=('(.*)'|"(.*)"|(.*))/

function parseCommand(args) {
  const envSetters = {}
  let command = null
  let commandArgs = []
  for (let i = 0; i < args.length; i++) {
    const match = envSetterRegex.exec(args[i])
    if (match) {
      let value

      if (typeof match[3] !== 'undefined') {
        value = match[3]
      } else if (typeof match[4] === 'undefined') {
        value = match[5]
      } else {
        value = match[4]
      }

      envSetters[match[1]] = value
    } else {
      // No more env setters, the rest of the line must be the command and args
      let cStart = []
      cStart = args
        .slice(i)
        // Regex:
        // match "\'" or "'"
        // or match "\" if followed by [$"\] (lookahead)
        .map(a => {
          const re = /\\\\|(\\)?'|([\\])(?=[$"\\])/g
          // Eliminate all matches except for "\'" => "'"
          return a.replace(re, m => {
            if (m === '\\\\') return '\\'
            if (m === "\\'") return "'"
            return ''
          })
        })
      command = cStart[0]
      commandArgs = cStart.slice(1)
      break
    }
  }

  return [envSetters, command, commandArgs]
}
```
`getEnvVars`会返回`process.env`中的变量，包括已有的和当前命令中设置的：

```js
function getEnvVars(envSetters) {
  const envVars = {...process.env}
  if (process.env.APPDATA) {
    envVars.APPDATA = process.env.APPDATA
  }
  Object.keys(envSetters).forEach(varName => {
    envVars[varName] = varValueConvert(envSetters[varName], varName)
  })
  return envVars
}
```
### 3. varValueConvert

`varValueConvert`会为当前的操作系统转化合适的变量，主要是替换中间的`:;`符号，对于一些变量名称，会替换为变量值：

```js
/**
 * Converts an environment variable value to be appropriate for the current OS.
 */
function varValueConvert(originalValue, originalName) {
  return resolveEnvVars(replaceListDelimiters(originalValue, originalName))
}

function replaceListDelimiters(varValue, varName = '') {
  const targetSeparator = isWindows() ? ';' : ':'
  if (!pathLikeEnvVarWhitelist.has(varName)) {
    return varValue
  }

  return varValue.replace(/(\\*):/g, (match, backslashes) => {
    if (backslashes.length % 2) {
      // Odd number of backslashes preceding it means it's escaped,
      // remove 1 backslash and return the rest as-is
      return match.substr(1)
    }
    return backslashes + targetSeparator
  })
}

function resolveEnvVars(varValue) {
  const envUnixRegex = /(\\*)(\$(\w+)|\${(\w+)})/g // $my_var or ${my_var} or \$my_var
  return varValue.replace(
    envUnixRegex,
    (_, escapeChars, varNameWithDollarSign, varName, altVarName) => {
      // do not replace things preceded by a odd number of \
      if (escapeChars.length % 2 === 1) {
        return varNameWithDollarSign
      }
      return (
        escapeChars.substr(0, escapeChars.length / 2) +
        (process.env[varName || altVarName] || '')
      )
    },
  )
}
```

看几个`varValueConvert`的测试用例：

```js
const JSON_VALUE = '{\\"foo\\":\\"bar\\"}'

beforeEach(() => {
  process.env.VAR1 = 'value1'
  process.env.VAR2 = 'value2'
  process.env.JSON_VAR = JSON_VALUE
})

test(`converts a : into a ; on Windows if PATH`, () => {
  isWindowsMock.mockReturnValue(true)
  expect(varValueConvert('foo:bar', 'PATH')).toBe('foo;bar')
})

test(`resolves multiple env variable values`, () => {
  isWindowsMock.mockReturnValue(true)
  expect(varValueConvert('foo-$VAR1-$VAR2')).toBe('foo-value1-value2')
})

test(`does not resolve an env variable prefixed with \\ on Windows`, () => {
  isWindowsMock.mockReturnValue(true)
  expect(varValueConvert('\\$VAR1')).toBe('$VAR1')
})

test(`resolves an env variable prefixed with \\\\ on Windows`, () => {
  isWindowsMock.mockReturnValue(true)
  expect(varValueConvert('\\\\$VAR1')).toBe('\\value1')
})
```

### 4. commandConvert

`commandConvert`会转化环境变量，比如`windows`下使用`${test}`，会被替换为`%test%`。

```js
/**
 * Converts an environment variable usage to be appropriate for the current OS
 */
function commandConvert(command, env, normalize = false) {
  if (!isWindows()) {
    return command
  }
  const envUnixRegex = /\$(\w+)|\${(\w+)}/g // $my_var or ${my_var}
  const convertedCmd = command.replace(envUnixRegex, (match, $1, $2) => {
    const varName = $1 || $2
    return env[varName] ? `%${varName}%` : ''
  })
  return normalize === true ? path.normalize(convertedCmd) : convertedCmd
}
```


### 5. is-windows

另外`cross-env`是这样判断是否是`windows`环境的：

```js
module.exports = () =>
  process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE)
```

## 三、总结

`cross-env`核心还是调用了`cross-spawn`，只是把参数处理了，并把它传入。

