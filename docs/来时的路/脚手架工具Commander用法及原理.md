## 一、开始

[Commander](https://github.com/tj/commander.js) 是一个解析命令行输入的工具，很多脚手架工具都在用它，比如 `vue-cli`。

## 二、用法

### 1. 声明 program 变量

```js
// 引入全局对象
const { program } = require('commander');

// 或者创建本地Command对象
const { Command } = require('commander');
const program = new Command();

program.parse(process.argv);
```

### 2. option()

Commander 使用 `.option()` 方法来定义选项，同时可以附加选项的简介。每个选项可以定义一个短选项名称（`-` 后面接单个字符）和一个长选项名称（`--` 后面接一个或多个单词），使用逗号、空格或 `|` 分隔。


参数说明：

- 自定义命令标识，必须参数
  - 一长一断的标识，使用逗号、空格或 `|` 分隔
  - 标识后面可以跟参数，`<>` 为必须参数，`[]` 为可选参数，如 `-t --test <type>`
- 选项描述，可选参数，这个在你使用 `-h` 或 `--help` 参数时会显示对应的信息
- 选项的默认值，可选参数


```js
const { program } = require('commander')

program
  .option('-d, --debug', 'output extra debugging')
  .option('-s, --small', 'small pizza size')
  .option('-p, --pizza-type <type>', 'flavour of pizza');

program.parse(process.argv);

// 解析后的选项可以通过Command对象上的.opts()方法获取，同时会被传递给命令处理函数。
const options = program.opts();

if (options.debug) console.log(options);

console.log('pizza details:');

if (options.small) console.log('- small pizza size');

// 对于多个单词的长选项，选项名会转为驼峰命名法（camel-case），
// 例如--template-engine选项可通过program.opts().templateEngine获取。
if (options.pizzaType) console.log(`- ${options.pizzaType}`);
```

```bash
$ node examples/test-option.js -p
error: option '-p, --pizza-type <type>' argument missing

$ node examples/test-option.js -d -s -p vegetarian
{ debug: true, small: true, pizzaType: 'vegetarian' }
pizza details:
- small pizza size
- vegetarian

$ node examples/test-option.js --pizza-type=cheese
pizza details:
- cheese
```

#### （1）默认值

```js
program
  .option('-c, --cheese <type>', 'add the specified type of cheese', 'blue');

program.parse();

console.log(`cheese: ${program.opts().cheese}`);
```

```bash
$ node examples/default-option.js 
cheese: blue

$ node examples/default-option.js  --cheese stilton
cheese: stilton
```


#### （2）取反选项

可以定义一个以 `no-` 开头的 `boolean` 型长选项。在命令行中使用该选项时，会将对应选项的值置为 `false`。当只定义了带`no-` 的选项，未定义对应不带 `no-` 的选项时，该选项的默认值会被置为 `true`。

```js
const { program } = require('commander')

program.option('--no-opposite', 'test --no options') // 取反

program.parse(process.argv);

if(program.opts().opposite) {
  console.log('this is a word');
} else {
  console.log('this is a other word');
}
```

```bash
$ node examples/reverse-option.js              
this is a word

$ node examples/reverse-option.js --no-opposite
this is a other word
```

#### （3）自定义选项处理

`option()` 这个方法在选项描述的后面还可以跟上自定义函数和初始值两个参数，如：`option(命令，描述，自定义函数，自定义函数的参数的初始或默认值)`

函数接收两个参数：用户新输入的参数和当前已有的参数。

```js
function increaseFunc(value, preValue) {
  return preValue + 2;
}

program.option('-a, --add', 'add function', increaseFunc, 100);

program.parse(process.argv);

if(program.add > 100) {
  console.log(`current value: ${program.add}`)
}
```

```bash
$ node examples/custom-option.js -a
102

$ node examples/custom-option.js -a -a
104
```

#### （4）变长参数选项


定义选项时，可以通过使用 `...` 来设置参数为可变长参数。


在命令行中，用户可以输入多个参数，解析后会以数组形式存储在对应属性字段中。在输入下一个选项前（`-` 或 `--` 开头），用户输入的指令均会被视作变长参数。与普通参数一样的是，可以通过 `--` 标记当前命令的结束。


```js
program
  .option('-n, --number <numbers...>', 'specify numbers')
  .option('-l, --letter [letters...]', 'specify letters');

program.parse();

console.log('Options: ', program.opts());
console.log('Remaining arguments: ', program.args);
```

```bash
$ node examples/variable-option.js  -n 1 2 3 --letter a b c
Options:  { number: [ '1', '2', '3' ], letter: [ 'a', 'b', 'c' ] }
Remaining arguments:  []

$ node examples/variable-option.js  --letter=A -n80 operand
Options:  { letter: [ 'A' ], number: [ '80' ] }
Remaining arguments:  [ 'operand' ]

$ node examples/variable-option.js  --letter -n 1 -n 2 3 -- operand
Options:  { letter: true, number: [ '1', '2', '3' ] }
Remaining arguments:  [ 'operand' ]
```

### 3. requiredOption()

这个表示设置的选项为必填，其参数的写法与 `option()` 一样。


```js
const { program } = require('commander')

program
  .requiredOption('-a, --add <type>', 'add type must have be selected');
  
program.parse(process.argv);
```

```bash
$ node examples/require-option.js
error: required option '-a, --add <type>' not specified
```





### 4. version()

`.version()` 方法可以设置版本，其默认选项为 `-V` 和 `--version`，设置了版本后，命令行会输出当前的版本号。

```js
const { program } = require('commander');
program.version('0.0.1');

program.parse(process.argv);
```

```js
$ node ./examples/test.js -V
0.0.1
```

版本选项也支持自定义设置选项名称，可以在 `.version()` 方法里再传递一些参数（长选项名称、描述信息），用法与 `.option()` 方法类似。

```js
program.version('0.0.1', '-v, --vers', 'output the current version');
```

### 4. command()

通过 `.command()` 或 `.addCommand()` 可以配置命令，有两种实现方式：为命令绑定处理函数，或者将命令单独写成一个可执行文件。子命令支持嵌套。

`.command()` 的第一个参数为命令名称。命令参数可以跟在名称后面，也可以用 `.argument()` 单独指定。参数可为必选的（尖括号表示）、可选的（方括号表示）或变长参数（点号表示，如果使用，只能是最后一个参数）。

参数说明：

- 配置命令名称及参数，`command('命令名 <必填参数> [可选参数]')`，如：`command('create <name> [options]')`。
- 配置选项，可选。配置 `noHelp`、`isDefault` 这些参数。当 `opts.noHelp` 设置为 `true` 时，该命令不会打印在帮助信息里。当 `opts.isDefault` 设置为 `true` 时，若没有指定其他子命令，则会默认执行这个命令。如：`command('create <name> [options]', { noHelp: true, isDefault: true })`。

```js
const { program } = require('commander')

// 声明可变参数，可变参数会以数组的形式传递给处理函数。
program.command('start <name> [options...]')
  .action((name, options) => {
    console.log(name);
    console.log(options);
  })

program.parse(process.argv);
```

```bash
$ node examples/test-command.js start test 123
test
[ '123' ]
```

#### （1）description()

用来描述命令的一些提示、说明性的语句，我们在使用help命令时会打印出这些相关的描述

参数：
- 描述语句，如：`description('xxx')`。


#### （2）arguments()

子命令的参数可以通过 `.command()` 指定。对于有独立可执行文件的子命令来书，参数只能以这种方法指定。而对其他子命令，参数也可用以下方法。


```js
program
  .version('0.0.1')
  .arguments('<cmd> [env]')
  .description('test command')
  .action(function(cmdValue, envValue) {
    console.log('command:', cmdValue);
    console.log('environment:', envValue || 'no environment given');
  });


program.parse(process.argv);
```



#### （3）action()


自定义命令执行后的回调函数。


参数：
- 回调函数，包含的参数是可变的，比如说，你的命令没有定义可选和必选参数，则这个回调函数的第一个参数就是 `commander` 对象，否则依次往后推，回调函数最后的参数就是 `commander` 对象。

```js
program.command('start <name> [options]')
  .description('start a commander')
  .action((name, options, cmd) => {
    console.log(name); // 输出name
    console.log(options); // 输出name
    console.log(cmd); // 输出commander对象信息
  })

program.parse(process.argv);
```


#### （4）独立的可执行（子）命令



当 `.command()` 带有描述参数时（第2个参数不是对象），就意味着使用独立的可执行文件作为子命令。

Commander 将会尝试在入口脚本（例如 `./examples/pm`）的目录中搜索 `program-command` 形式的可执行文件，例如`pm-install`、`pm-search`。通过配置选项 `executableFile` 可以自定义名字。

```js
program
  .version('0.1.0')
  .command('install [name]', 'install one or more packages')
  .command('search [query]', 'search with optional query')
  .command('update', 'update installed packages', { executableFile: 'myUpdateSubCommand' })
  .command('list', 'list packages installed', { isDefault: true });
```


## 三、原理


### 1. 链式调用

Commander 使用方式是一种链式调用，链式调用的本质是内部维护不同层级的对象。

Commander 中有 Command、Option、Argument、Help、CommanderError 等几个类，Command 是最外层的，它拥有 `options`、`commands`、`parent` 等属性，其中 `options` 是包含 Option 对象的数组，`commands` 是包含 Command 对象的数组。

```js
class Command extends EventEmitter {
  /**
   * Initialize a new `Command`.
   *
   * @param {string} [name]
   */

  constructor(name) {
    super();
    /** @type {Command[]} */
    this.commands = [];
    /** @type {Option[]} */
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = true;
    /** @type {Argument[]} */
    this._args = [];
    /** @type {string[]} */
    this.args = []; // cli args with options removed
    this.rawArgs = [];
    this.processedArgs = []; // like .args but after custom processing and collecting variadic
    this._scriptPath = null;
    this._name = name || '';
    this._optionValues = {};
    // ...
  }
}
```


默认导出的 `program` 是 Command 的一个实例。

```js
exports = module.exports = new Command();
exports.program = exports; 
```

当调用 `.option()` 方法增加选项时，就是新建一个 Option，并把它添加到 `this.options` 中去。

```js
class Command extends EventEmitter {
  createOption(flags, description) {
    return new Option(flags, description);
  };

  /**
   * Internal implementation shared by .option() and .requiredOption()
   *
   * @api private
   */
  _optionEx(config, flags, description, fn, defaultValue) {
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === 'function') {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      // deprecated
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }

    return this.addOption(option);
  }

  option(flags, description, fn, defaultValue) {
    return this._optionEx({}, flags, description, fn, defaultValue);
  };
}

```

当调用 `.command(`) 方法创建子命令时，内部是新建了一个 Command，然后把它添加到 `this.commands` 中去，之后会在它的上下文上操作。

```js
class Command extends EventEmitter {
  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === 'object' && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);

    const cmd = this.createCommand(name);
    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    cmd._hidden = !!(opts.noHelp || opts.hidden); // noHelp is deprecated old name for hidden
    cmd._executableFile = opts.executableFile || null; // Custom name for executable file, set missing to null to match constructor
    if (args) cmd.arguments(args);
    this.commands.push(cmd);
    cmd.parent = this;
    cmd.copyInheritedSettings(this);

    if (desc) return this;
    return cmd;
  };

  createCommand(name) {
    return new Command(name);
  };
}
```

### 2. 发布订阅模式


Commander 还有一个重要的点是利用了发布订阅模式，也就是添加新的 Option 后，会注册一个回调。该回调函数会解析用户传入的值，并赋值给 `this._optionValues`，当用户调用 `.opts()` 时会返回。

注意上面 `_optionEx` 方法的最后会调用 `this.addOption(option)`，注册回调的主要逻辑就在这里：

```js
class Command extends EventEmitter {
  addOption(option) {
    const oname = option.name();
    const name = option.attributeName();

    let defaultValue = option.defaultValue;

    // ...

    this.options.push(option);

    // handler for cli and env supplied values
    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
      // Note: using closure to access lots of lexical scoped variables.
      const oldValue = this.getOptionValue(name);

      // custom processing
      if (val !== null && option.parseArg) {
        try {
          val = option.parseArg(val, oldValue === undefined ? defaultValue : oldValue);
        } catch (err) {
          if (err.code === 'commander.invalidArgument') {
            const message = `${invalidValueMessage} ${err.message}`;
            this._displayError(err.exitCode, err.code, message);
          }
          throw err;
        }
      } else if (val !== null && option.variadic) {
        val = option._concatValue(val, oldValue);
      }

      // unassigned or boolean value
      if (typeof oldValue === 'boolean' || typeof oldValue === 'undefined') {
        // if no value, negate false, and we have a default, then use it!
        if (val == null) {
          this.setOptionValueWithSource(name, option.negate ? false : defaultValue || true, valueSource);
        } else {
          this.setOptionValueWithSource(name, val, valueSource);
        }
      } else if (val !== null) {
        // reassign
        this.setOptionValueWithSource(name, option.negate ? false : val, valueSource);
      }
    };

    this.on('option:' + oname, (val) => {
      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
      handleOptionValue(val, invalidValueMessage, 'cli');
    });

    if (option.envVar) {
      this.on('optionEnv:' + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, 'env');
      });
    }

    return this;
  }

  setOptionValueWithSource(key, value, source) {
    this.setOptionValue(key, value);
    this._optionValueSources[key] = source;
    return this;
  }

  setOptionValue(key, value) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
    return this;
  };

  opts() {
    if (this._storeOptionsAsProperties) {
      // Preserve original behaviour so backwards compatible when still using properties
      const result = {};
      const len = this.options.length;

      for (let i = 0; i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] = key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }

    return this._optionValues;
  };
}
```

`.version()` 方法内部其实也是利用了 `option`：

```js
class Command extends EventEmitter {
  version(str, flags, description) {
    if (str === undefined) return this._version;
    this._version = str;
    flags = flags || '-V, --version';
    description = description || 'output the version number';
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this.options.push(versionOption);
    this.on('option:' + versionOption.name(), () => {
      this._outputConfiguration.writeOut(`${str}\n`);
      this._exit(0, 'commander.version', str);
    });
    return this;
  };
}
```

当调用 `program.parse()` 的时候会触发回调：

```js
class Command extends EventEmitter {
  parse(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    this._parseCommand([], userArgs);

    return this;
  };

  _parseCommand(operands, unknown) {
    const parsed = this.parseOptions(unknown);
    this._parseOptionsEnv(); // after cli, so parseArg not called on both cli and env
    // ...
  }

  parseOptions(argv) {
    const operands = []; // operands, not options or values
    const unknown = []; // first unknown option and remaining unknown args
    let dest = operands;
    const args = argv.slice();

    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === '-';
    }

    // parse options
    let activeVariadicOption = null;
    while (args.length) {
      const arg = args.shift();

      // literal
      if (arg === '--') {
        if (dest === unknown) dest.push(arg);
        dest.push(...args);
        break;
      }

      if (activeVariadicOption && !maybeOption(arg)) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;

      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        // recognised option, call listener to assign value with possible custom processing
        if (option) {
          if (option.required) {
            const value = args.shift();
            if (value === undefined) this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            // historical behaviour is optional value is following arg unless an option
            if (args.length > 0 && !maybeOption(args[0])) {
              value = args.shift();
            }
            this.emit(`option:${option.name()}`, value);
          } else { // boolean flag
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }

      // Look for combo options following single dash, eat first one if known.
      if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (option.required || (option.optional && this._combineFlagAndOptionalValue)) {
            // option with value following in same argument
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            // boolean option, emit and put back remainder of arg for further processing
            this.emit(`option:${option.name()}`);
            args.unshift(`-${arg.slice(2)}`);
          }
          continue;
        }
      }
      // ...
    }
  }
}
```


Commander 的基本原理就是这样，本质是一个解析 `process.argv` 的工具，利用了发布订阅模式。源码内部还有很多有意思的东西，比如 [suggestSimilar](https://github.com/tj/commander.js/blob/v8.3.0/lib/suggestSimilar.js) 寻找相似命令的函数，是利用了 [Damerau–Levenshtein distance](https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance) 算法。。





## 四、总结

本文介绍了 Commander 的用法和基本原理，可以看到，即使是一个基本的解析命令行参数的工具，内部也包含了诸多的设计模式和设计理念。

另外，文章中的 Demo 可以在这个[仓库](https://github.com/novlan1/test-commander)中查看。
