
## 一、开始

[Chalk](https://github.com/chalk/chalk) 是一个控制台格式渲染工具，可以自由定义颜色、背景色以及格式等。

## 二、用法

直接看代码：

```js
import chalk from 'chalk';

const log = console.log;

// Combine styled and normal strings
log(chalk.blue('Hello') + ' World' + chalk.red('!'));

// Compose multiple styles using the chainable API
log(chalk.blue.bgRed.bold('Hello world!'));

// Pass in multiple arguments
log(chalk.blue('Hello', 'World!', 'Foo', 'bar', 'biz', 'baz'));

// Nest styles
log(chalk.red('Hello', chalk.underline.bgBlue('world') + '!'));

// Nest styles of the same type even (color, underline, background)
log(chalk.green(
	'I am a green line ' +
	chalk.blue.underline.bold('with a blue substring') +
	' that becomes green again!'
));

// ES2015 template literal
log(`
CPU: ${chalk.red('90%')}
RAM: ${chalk.green('40%')}
DISK: ${chalk.yellow('70%')}
`);

// Use RGB colors in terminal emulators that support it.
log(chalk.rgb(123, 45, 67).underline('Underlined reddish color'));
log(chalk.hex('#DEADED').bold('Bold gray!'));
```

## 三、原理

### 1. 本质

`chalk` 本质是利用了 [ANSI](https://en.wikipedia.org/wiki/ANSI_escape_code) 转义序列，当终端可以识别这些转义码时，就会输出不同的颜色、样式。

[ansistyles](https://github.com/thlorenz/ansistyles) 和 [ansicolors](https://github.com/thlorenz/ansicolors) 是两个更基本的格式化输出的库，但它们没有 `chalk` 功能丰富和灵活。

在 Bash 下输入：

```bash
echo -e "\033[31mRed Text\033[0m"
```

NodeJS 环境中输入：

```js
console.log("\033[31mRed Text\033[0m")
```

都会输出红色的 `Red Text`。

### 2. 具体实现

下面看下 `chalk` 内部实现。以 `chalk.red('hello')` 为例。

当访问 `chalk.red` 时，就是访问下面的 `styles.red`，它有一个 `getter` 方法，其返回一个 `builder` 函数。

访问 `.red` 时，先通过 `createStyler` 拿到 `open`、`close` 等值，就是颜色、格式的前后缀，然后通过 `createBuilder` 创建 `builder` 函数，同时保持当前的上下文，也就是 `styler`，主要包含 `parent`、`closeAll`、`openAll`。


```js
for (const [styleName, style] of Object.entries(ansiStyles)) {
	styles[styleName] = {
		get() {
			const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
			Object.defineProperty(this, styleName, {value: builder});
			return builder;
		},
	};
}

const createStyler = (open, close, parent) => {
	let openAll;
	let closeAll;
	if (parent === undefined) {
		openAll = open;
		closeAll = close;
	} else {
		openAll = parent.openAll + open;
		closeAll = close + parent.closeAll;
	}

	return {
		open,
		close,
		openAll,
		closeAll,
		parent,
	};
};

const createBuilder = (self, _styler, _isEmpty) => {
	// Single argument is hot path, implicit coercion is faster than anything
	// eslint-disable-next-line no-implicit-coercion
	const builder = (...arguments_) => applyStyle(builder, (arguments_.length === 1) ? ('' + arguments_[0]) : arguments_.join(' '));

	// We alter the prototype because we must return a function, but there is
	// no way to create a function with a different prototype
	Object.setPrototypeOf(builder, proto);

	builder[GENERATOR] = self;
	builder[STYLER] = _styler;
	builder[IS_EMPTY] = _isEmpty;

	return builder;
};
```

执行 `.red()` 方法时，会执行 `builder`，也就是 `applyStyle`。`applyStyle` 中会将 `openAll`、`string`、`closeAll` 拼接返回。


```js
const applyStyle = (self, string) => {
	if (self.level <= 0 || !string) {
		return self[IS_EMPTY] ? '' : string;
	}

	let styler = self[STYLER];

	if (styler === undefined) {
		return string;
	}

	const {openAll, closeAll} = styler;
	if (string.includes('\u001B')) {
		while (styler !== undefined) {
			// Replace any instances already present with a re-opening code
			// otherwise only the part of the string until said closing code
			// will be colored, and the rest will simply be 'plain'.
			string = stringReplaceAll(string, styler.close, styler.open);

			styler = styler.parent;
		}
	}

	// We can move both next actions out of loop, because remaining actions in loop won't have
	// any/visible effect on parts we add here. Close the styling before a linebreak and reopen
	// after next line to fix a bleed issue on macOS: https://github.com/chalk/chalk/pull/92
	const lfIndex = string.indexOf('\n');
	if (lfIndex !== -1) {
		string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
	}

	return openAll + string + closeAll;
};
```

`chalk` 巧妙的一点在于，在 `getter` 定义函数并返回，好处是可以链式调用。比如 `chalk.red.bold('hello')`，也就是函数生成了，调用的时机由用户决定，根本在于内部维护了 `parent`、`openAll`、`closeAll`。


## 四、总结

`chalk` 代码量很少，但是功能十分强大。`chalk` 内部利用了原型、`getter` 等 JS 特性，让它可以支持多种调用方式。

看了 `chalk` 源码后的有个感想，一个简单但是十分流行的库，内部往往有巧妙的方式，作者是花了心思的。


## 五、相关资料

1. [ANSI escape code](https://en.wikipedia.org/wiki/ANSI_escape_code)
2. [控制台终端输出颜色](https://www.cnblogs.com/opangle/p/4082692.html)
3. [源码赏析 chalk](https://www.jianshu.com/p/654f06f36ec5)