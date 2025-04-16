## 一、开始

本文是`babel`源码解析的第一部分，主要讲下[@babel/cli](https://github.com/babel/babel/blob/v7.16.4/packages/babel-cli)和[@babel/core](https://github.com/babel/babel/tree/v7.16.4/packages/babel-core)的核心逻辑。

如果对`babel`用法不熟悉的同学，建议先阅读[官方文档](https://babel.dev/)，或者这篇[Babel基础](https://juejin.cn/post/7041067247615344654)。


## 二、@babel/cli

本次分析的`babel`版本是[v7.16.4](https://github.com/babel/babel/tree/v7.16.4)。

`babel`的使用方式有多种：

1. 可以直接引入核心库`@babel/core`，通过调用`babel.transformSync`等方法进行转化。
2. 引入脚手架`@babel/cli`和核心库`@babel/core`，通过`npx babel src --out-dir lib`等方式进行转化

看下[@babel/cli](https://github.com/babel/babel/blob/v7.16.4/packages/babel-cli/src/babel/index.ts#L9)的逻辑，主要对判断输入参数中有没有`--out-dir`，也就是转化后的输出目录，如果有的话调用[dircommand](https://github.com/babel/babel/blob/v7.16.4/packages/babel-cli/src/babel/dir.ts#L20)，没有的话调用[fileCommand](https://github.com/babel/babel/blob/v7.16.4/packages/babel-cli/src/babel/file.ts#L15)。


```js
// packages/babel-cli/src/babel/index.ts

import dirCommand from "./dir";
import fileCommand from "./file";

const opts = parseArgv(process.argv);

if (opts) {
  const fn = opts.cliOptions.outDir ? dirCommand : fileCommand;
  fn(opts).catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
} else {
  process.exitCode = 2;
}
```

[dircommand](https://github.com/babel/babel/blob/v7.16.4/packages/babel-cli/src/babel/dir.ts#L20)和[fileCommand](https://github.com/babel/babel/blob/v7.16.4/packages/babel-cli/src/babel/file.ts#L15)最后都会调用[util.compile](https://github.com/babel/babel/blob/v7.16.4/packages/babel-cli/src/babel/util.ts#L82)对文件进行编译，不同的是`dircommand`会对输入的所有文件依次调用`compile`方法。

```js
// packages/babel-cli/src/babel/file.ts

export default async function ({
  cliOptions,
  babelOptions,
}) {
  // ...
  return await util.compile(filename, {
    ...babelOptions,
    sourceFileName: sourceFilename,
    // Since we're compiling everything to be merged together,
    // "inline" applies to the final output file, but not to the individual
    // files being concatenated.
    sourceMaps:
      babelOptions.sourceMaps === "inline"
        ? true
        : babelOptions.sourceMaps,
  });
}
```

[utils.compile](https://github.com/babel/babel/blob/v7.16.4/packages/babel-cli/src/babel/util.ts#L82)方法则是调用了`@babel/core`中的[transformFile](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transform-file.ts#L26)方法，返回`babel`转化结果。

```ts
export function compile(filename: string, opts: any | Function): Promise<any> {
  opts = {
    ...opts,
    caller: CALLER,
  };

  return new Promise((resolve, reject) => {
    babel.transformFile(filename, opts, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
```


## 三、@babel/core

[@babel/core](https://github.com/babel/babel/tree/v7.16.4/packages/babel-core)是`babel`的核心，主要起串联的作用，功能包括加载配置、调用`@babel/parser`解析AST、调用`@babel/traverse`遍历并操作AST、调用`@babel/generator`生成代码。

我们接着上面来看，[transformFile](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transform-file.ts#L26)做了3件事：

1. [loadConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/full.ts#L51)加载配置
2. 读取源文件得到`code`
3. 调用[run](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transformation/index.ts#L30)并返回其结果

```ts
const transformFileRunner = gensync<
  (filename: string, opts?: InputOptions) => FileResult | null
>(function* (filename, opts: InputOptions) {
  const options = { ...opts, filename };

  const config: ResolvedConfig | null = yield* loadConfig(options);
  if (config === null) return null;

  const code = yield* fs.readFile(filename, "utf8");
  return yield* run(config, code);
});

export const transformFile = transformFileRunner.errback as TransformFile;
```

### 1. 加载配置

先看下`Babel`加载配置的流程图，`Babel`对配置的处理有些复杂，我们边看源码边梳理下。


<img src="http://doc.uwayfly.com/babel-load-config.png" width="800">

上面的`loadConfig`就是`full.js`中的[loadFullConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/full.ts#L51)方法。

[loadFullConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/full.ts#L51)先调用了[loadPrivatePartialConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/partial.ts#L68)：

```js
export default gensync<(inputOpts: unknown) => ResolvedConfig | null>(
  function* loadFullConfig(inputOpts) {
    const result = yield* loadPrivatePartialConfig(inputOpts);
    // ...
  }
)
```

[loadPrivatePartialConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/partial.ts#L68)主要调用了[buildRootChain](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/config-chain.ts#L137)，构建配置链：

```js
export default function* loadPrivatePartialConfig(
  inputOpts: unknown,
): Handler<PrivPartialConfig | null> {
  const args = inputOpts ? validate("arguments", inputOpts) : {};

  const {
    envName = getEnv(),
    cwd = ".",
    root: rootDir = ".",
    rootMode = "root",
    caller,
    cloneInputAst = true,
  } = args;
  const absoluteCwd = path.resolve(cwd);
  const absoluteRootDir = resolveRootMode(
    path.resolve(absoluteCwd, rootDir),
    rootMode,
  );

  const filename =
    typeof args.filename === "string"
      ? path.resolve(cwd, args.filename)
      : undefined;

  const showConfigPath = yield* resolveShowConfigPath(absoluteCwd);

  const context: ConfigContext = {
    filename,
    cwd: absoluteCwd,
    root: absoluteRootDir,
    envName,
    caller,
    showConfig: showConfigPath === filename,
  };

  const configChain = yield* buildRootChain(args, context);
  // ...
}
```

[buildRootChain](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/config-chain.ts#L137)首先调用[loadProgrammaticChain](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/config-chain.ts#L353)，生成[programmatic options](https://babeljs.io/docs/en/options#primary-options)，可翻译成编程选项，通过`@babel/cli`或者`babel.transfrom`的方式使用时会用到。

```js
export function* buildRootChain(
  opts: ValidatedOptions,
  context: ConfigContext,
): Handler<RootConfigChain | null> {
  const programmaticLogger = new ConfigPrinter();
  const programmaticChain = yield* loadProgrammaticChain(
    {
      options: opts,
      dirname: context.cwd,
    },
    context,
    undefined,
    programmaticLogger,
  );
  // ...
}
```

然后判断如果指定了`configFile`，会调用[loadConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/files/configuration.ts#L132)去加载配置文件，否则调用[findRootConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/files/configuration.ts#L93)去加载根配置。

```js
// ...
let configFile;
if (typeof opts.configFile === "string") {
  configFile = yield* loadConfig(
    opts.configFile,
    context.cwd,
    context.envName,
    context.caller,
  );
} else if (opts.configFile !== false) {
  configFile = yield* findRootConfig(
    context.root,
    context.envName,
    context.caller,
  );
}
```

[loadConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/files/configuration.ts#L132)比较简单，就是读取`configFile`内容

```js
export function* loadConfig(
  name: string,
  dirname: string,
  envName: string,
  caller: CallerMetadata | void,
): Handler<ConfigFile> {
  const filepath = require.resolve(name, { paths: [dirname] });

  const conf = yield* readConfig(filepath, envName, caller);
  if (!conf) {
    throw new Error(`Config file ${filepath} contains no configuration data`);
  }

  debug("Loaded config %o from %o.", name, dirname);
  return conf;
}

function readConfig(filepath, envName, caller): Handler<ConfigFile | null> {
  const ext = path.extname(filepath);
  return ext === ".js" || ext === ".cjs" || ext === ".mjs"
    ? readConfigJS(filepath, { envName, caller })
    : readConfigJSON5(filepath);
}
```

[findRootConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/files/configuration.ts#L93)则会尝试在根目录中寻找配置文件，文件后缀搜寻顺序是`.js`、`.cjs`、`.mjs`、`.json`，如果存在多个根配置文件，则会报错。

注意这里搜寻的根目录，就是命令执行时的当前目录。如果命令写在`package.json`中，则根目录就是`package.json`所在的目录。

```js
export const ROOT_CONFIG_FILENAMES = [
  "babel.config.js",
  "babel.config.cjs",
  "babel.config.mjs",
  "babel.config.json",
];
export function findRootConfig(
  dirname: string,
  envName: string,
  caller: CallerMetadata | void,
): Handler<ConfigFile | null> {
  return loadOneConfig(ROOT_CONFIG_FILENAMES, dirname, envName, caller);
}

function* loadOneConfig(
  names: string[],
  dirname: string,
  envName: string,
  caller: CallerMetadata | void,
  previousConfig: ConfigFile | null = null,
): Handler<ConfigFile | null> {
  const configs = yield* gensync.all(
    names.map(filename =>
      readConfig(path.join(dirname, filename), envName, caller),
    ),
  );
  const config = configs.reduce((previousConfig: ConfigFile | null, config) => {
    if (config && previousConfig) {
      throw new Error(
        `Multiple configuration files found. Please remove one:\n` +
          ` - ${path.basename(previousConfig.filepath)}\n` +
          ` - ${config.filepath}\n` +
          `from ${dirname}`,
      );
    }

    return config || previousConfig;
  }, previousConfig);

  if (config) {
    debug("Found configuration %o from %o.", config.filepath, dirname);
  }
  return config;
}
```

另外，[buildRootChain](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/config-chain.ts#L137)中还会通过[findRelativeConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/files/configuration.ts#L57)加载相对配置，相对配置搜寻位置就是从当前目录向上找到第一个的`package.json`的目录，依次寻找`.babelrc`、`babelrc.js`等文件，找到其中一个就停止。

注意这里是上面的不同，它是`Babel`默认行为，有多个配置文件只取优先级最后的文件类型，不会报错。

[findRelativeConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/files/configuration.ts#L57)会返回`ignore`忽略文件列表和`config`。


```js
const RELATIVE_CONFIG_FILENAMES = [
  ".babelrc",
  ".babelrc.js",
  ".babelrc.cjs",
  ".babelrc.mjs",
  ".babelrc.json",
];
const BABELIGNORE_FILENAME = ".babelignore";

export function* findRelativeConfig(
  packageData: FilePackageData,
  envName: string,
  caller: CallerMetadata | void,
): Handler<RelativeConfig> {
  let config = null;
  let ignore = null;

  const dirname = path.dirname(packageData.filepath);

  for (const loc of packageData.directories) {
    if (!config) {
      config = yield* loadOneConfig(
        RELATIVE_CONFIG_FILENAMES,
        loc,
        envName,
        caller,
        packageData.pkg?.dirname === loc
          ? packageToBabelConfig(packageData.pkg as ConfigFile)
          : null,
      );
    }

    if (!ignore) {
      const ignoreLoc = path.join(loc, BABELIGNORE_FILENAME);
      ignore = yield* readIgnoreConfig(ignoreLoc);

      if (ignore) {
        debug("Found ignore %o from %o.", ignore.filepath, dirname);
      }
    }
  }

  return { config, ignore };
}
```

回到[buildRootChain](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/config-chain.ts#L137)中，获取到`programmaticChain`、`configFileChain`、`fileChain`后，将它们融合并返回。

```js
export function* buildRootChain(){
  // ...
  const chain = mergeChain(
    mergeChain(mergeChain(emptyChain(), configFileChain), fileChain),
    programmaticChain,
  );

  return {
    plugins: isIgnored ? [] : dedupDescriptors(chain.plugins),
    presets: isIgnored ? [] : dedupDescriptors(chain.presets),
    options: isIgnored ? [] : chain.options.map(o => normalizeOptions(o)),
    fileHandling: isIgnored ? "ignored" : "transpile",
    ignore: ignoreFile || undefined,
    babelrc: babelrcFile || undefined,
    config: configFile || undefined,
    files: chain.files,
  };
}

function mergeChain(target: ConfigChain, source: ConfigChain): ConfigChain {
  target.options.push(...source.options);
  target.plugins.push(...source.plugins);
  target.presets.push(...source.presets);
  for (const file of source.files) {
    target.files.add(file);
  }

  return target;
}
```

回到[loadPrivatePartialConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/partial.ts#L68)中，接下来对`configChain`中的`options`做了融合和规范化，并返回`options/context/files`等信息。

```js
export default function* loadPrivatePartialConfig(){
  const merged: ValidatedOptions = {
    assumptions: {},
  };
  configChain.options.forEach(opts => {
    mergeOptions(merged as any, opts);
  });

  const options: NormalizedOptions = {
    ...merged,
    targets: resolveTargets(merged, absoluteRootDir),

    // Tack the passes onto the object itself so that, if this object is
    // passed back to Babel a second time, it will be in the right structure
    // to not change behavior.
    cloneInputAst,
    babelrc: false,
    configFile: false,
    browserslistConfigFile: false,
    passPerPreset: false,
    envName: context.envName,
    cwd: context.cwd,
    root: context.root,
    rootMode: "root",
    filename:
      typeof context.filename === "string" ? context.filename : undefined,

    plugins: configChain.plugins.map(descriptor =>
      createItemFromDescriptor(descriptor),
    ),
    presets: configChain.presets.map(descriptor =>
      createItemFromDescriptor(descriptor),
    ),
  };

  return {
    options,
    context,
    fileHandling: configChain.fileHandling,
    ignore: configChain.ignore,
    babelrc: configChain.babelrc,
    config: configChain.config,
    files: configChain.files,
  };
}
```

回到[loadFullConfig](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/full.ts#L51)中，获取到上面的配置信息后，调用[recursePresetDescriptors](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/full.ts#L92)对`presets`做处理。

`presets`执行顺序一般是倒序的，也就是最下面的先执行，从这里我们可以看出原因，如果`descriptor.ownPass`不为`true`，则通过`presets.unshift`依次添加处理后的`preset`。

如果`presets`的每一项还有`presets`的话，会递归进行处理。最后对`preset`的`options`进行默认配置的融合。

```js
const ignored = yield* enhanceError(
  context,
  function* recursePresetDescriptors(
    rawPresets: Array<UnloadedDescriptor>,
    pluginDescriptorsPass: Array<UnloadedDescriptor>,
  ): Handler<true | void> {
    const presets: Array<{
      preset: ConfigChain | null;
      pass: Array<UnloadedDescriptor>;
    }> = [];

    for (let i = 0; i < rawPresets.length; i++) {
      const descriptor = rawPresets[i];
      if (descriptor.options !== false) {
        try {
          // Presets normally run in reverse order, but if they
          // have their own pass they run after the presets
          // in the previous pass.
          if (descriptor.ownPass) {
            presets.push({
              preset: yield* loadPresetDescriptor(
                descriptor,
                presetContext,
              ),
              pass: [],
            });
          } else {
            presets.unshift({
              preset: yield* loadPresetDescriptor(
                descriptor,
                presetContext,
              ),
              pass: pluginDescriptorsPass,
            });
          }
        } catch (e) {
          if (e.code === "BABEL_UNKNOWN_OPTION") {
            checkNoUnwrappedItemOptionPairs(rawPresets, i, "preset", e);
          }
          throw e;
        }
      }
    }

    // resolve presets
    if (presets.length > 0) {
      // The passes are created in the same order as the preset list, but are inserted before any
      // existing additional passes.
      pluginDescriptorsByPass.splice(
        1,
        0,
        ...presets
          .map(o => o.pass)
          .filter(p => p !== pluginDescriptorsPass),
      );

      for (const { preset, pass } of presets) {
        if (!preset) return true;

        pass.push(...preset.plugins);

        const ignored = yield* recursePresetDescriptors(
          preset.presets,
          pass,
        );
        if (ignored) return true;

        preset.options.forEach(opts => {
          mergeOptions(optionDefaults, opts);
        });
      }
    }
  },
)(presetsDescriptors, pluginDescriptorsByPass[0]);
```

接下来通过[loadPluginDescriptors](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/config/full.ts#L175)对`plugin`做了处理，最后返回了`options`和`passes`。

```js
yield* enhanceError(context, function* loadPluginDescriptors() {
  pluginDescriptorsByPass[0].unshift(...initialPluginsDescriptors);

  for (const descs of pluginDescriptorsByPass) {
    const pass = [];
    passes.push(pass);

    for (let i = 0; i < descs.length; i++) {
      const descriptor: UnloadedDescriptor = descs[i];
      if (descriptor.options !== false) {
        try {
          pass.push(yield* loadPluginDescriptor(descriptor, pluginContext));
        } catch (e) {
          if (e.code === "BABEL_UNKNOWN_PLUGIN_PROPERTY") {
            // print special message for `plugins: ["@babel/foo", { foo: "option" }]`
            checkNoUnwrappedItemOptionPairs(descs, i, "plugin", e);
          }
          throw e;
        }
      }
    }
  }
})();

opts.plugins = passes[0];
opts.presets = passes
  .slice(1)
  .filter(plugins => plugins.length > 0)
  .map(plugins => ({ plugins }));
opts.passPerPreset = opts.presets.length > 0;

return {
  options: opts,
  passes: passes,
};
```

### 2. run

回到`@babel/core`中的`transformFile`方法，通过`loadConfig`获取到配置后，之后又读取了文件，接着调用了`run`方法。

[run](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transformation/index.ts#L30)方法在`packages/babel-core/src/transformation/index.ts`中，其首先调用了[normalizeFile](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transformation/normalize-file.ts#L23)方法。

```js
export function* run(
  config: ResolvedConfig,
  code: string,
  ast?: t.File | t.Program | null,
): Handler<FileResult> {
  const file = yield* normalizeFile(
    config.passes,
    normalizeOptions(config),
    code,
    ast,
  );
  // ...
}
```

[normalizeFile](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transformation/normalize-file.ts#L23)先判断是否有`ast`，如果没有的话，会调用`parser`方法生成，如果已经有的话，会对其进行校验。

接着判断如果需要`sourceMap`的话，会尝试调用`convertSourceMap.fromObject`、 `convertSourceMap.fromComment`等生成`inputMap`。

最后返回一个新的`File`对象。

```js
import parser from "../parser";

export default function* normalizeFile(
  pluginPasses: PluginPasses,
  options: any,
  code: string,
  ast?: t.File | t.Program | null,
): Handler<File> {
  code = `${code || ""}`;

  if (ast) {
    if (ast.type === "Program") {
      ast = file(ast, [], []);
    } else if (ast.type !== "File") {
      throw new Error("AST root must be a Program or File node");
    }

    if (options.cloneInputAst) {
      ast = cloneDeep(ast);
    }
  } else {
    ast = yield* parser(pluginPasses, options, code);
  }

  let inputMap = null;
  if (options.inputSourceMap !== false) {
    // If an explicit object is passed in, it overrides the processing of
    // source maps that may be in the file itself.
    if (typeof options.inputSourceMap === "object") {
      inputMap = convertSourceMap.fromObject(options.inputSourceMap);
    }

    if (!inputMap) {
      const lastComment = extractComments(INLINE_SOURCEMAP_REGEX, ast);
      if (lastComment) {
        try {
          inputMap = convertSourceMap.fromComment(lastComment);
        } catch (err) {
          debug("discarding unknown inline input sourcemap", err);
        }
      }
    }
    // ...
  }

  return new File(options, {
    code,
    ast,
    inputMap,
  });
}
```


回到`run`方法中，通过`normalizeFile`获取到一个规则化的`File`后，会调用[transformFile](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transformation/index.ts#L76)进行转化。

```js
export function* run() {
  // ...
  const opts = file.opts;
  try {
    yield* transformFile(file, config.passes);
  } catch (e) {
    e.message = `${opts.filename ?? "unknown"}: ${e.message}`;
    if (!e.code) {
      e.code = "BABEL_TRANSFORM_ERROR";
    }
    throw e;
  }
  // ...

  let outputCode, outputMap;
  try {
    if (opts.code !== false) {
      ({ outputCode, outputMap } = generateCode(config.passes, file));
    }
  } catch (e) {
    e.message = `${opts.filename ?? "unknown"}: ${e.message}`;
    if (!e.code) {
      e.code = "BABEL_GENERATE_ERROR";
    }
    throw e;
  }

  return {
    metadata: file.metadata,
    options: opts,
    ast: opts.ast === true ? file.ast : null,
    code: outputCode === undefined ? null : outputCode,
    map: outputMap === undefined ? null : outputMap,
    sourceType: file.ast.program.sourceType,
  };
}
```

[transformFile](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transformation/index.ts#L76)方法中，将所有的`plugins`中的`visitor`放入`visitors`中，然后将他们融合成一个`visitor`，接着调用`traverse`对AST进行遍历、增删改等操作。


```js
import traverse from "@babel/traverse";

function* transformFile(file: File, pluginPasses: PluginPasses): Handler<void> {
  for (const pluginPairs of pluginPasses) {
    const passPairs = [];
    const passes = [];
    const visitors = [];

    for (const plugin of pluginPairs.concat([loadBlockHoistPlugin()])) {
      const pass = new PluginPass(file, plugin.key, plugin.options);

      passPairs.push([plugin, pass]);
      passes.push(pass);
      visitors.push(plugin.visitor);
    }

    for (const [plugin, pass] of passPairs) {
      const fn = plugin.pre;
      if (fn) {
        const result = fn.call(pass, file);

        // @ts-expect-error - If we want to support async .pre
        yield* [];

        if (isThenable(result)) {
          throw new Error(
            `You appear to be using an plugin with an async .pre, ` +
              `which your current version of Babel does not support. ` +
              `If you're using a published plugin, you may need to upgrade ` +
              `your @babel/core version.`,
          );
        }
      }
    }

    // merge all plugin visitors into a single visitor
    const visitor = traverse.visitors.merge(
      visitors,
      passes,
      file.opts.wrapPluginVisitorMethod,
    );
    traverse(file.ast, visitor, file.scope);

    for (const [plugin, pass] of passPairs) {
      const fn = plugin.post;
      if (fn) {
        const result = fn.call(pass, file);

        // @ts-expect-error - If we want to support async .post
        yield* [];

        if (isThenable(result)) {
          throw new Error(
            `You appear to be using an plugin with an async .post, ` +
              `which your current version of Babel does not support. ` +
              `If you're using a published plugin, you may need to upgrade ` +
              `your @babel/core version.`,
          );
        }
      }
    }
  }
}
```

关于`@babel/traverse`以后会讲。回到`run`方法中，后面主要调用了[generateCode](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transformation/file/generate.ts#L9)去生成`code`：

```js
import generateCode from "./file/generate";

export function* run() {
  // ...
  let outputCode, outputMap;
  try {
    if (opts.code !== false) {
      ({ outputCode, outputMap } = generateCode(config.passes, file));
    }
  } catch (e) {
    e.message = `${opts.filename ?? "unknown"}: ${e.message}`;
    if (!e.code) {
      e.code = "BABEL_GENERATE_ERROR";
    }
    throw e;
  }

  return {
    metadata: file.metadata,
    options: opts,
    ast: opts.ast === true ? file.ast : null,
    code: outputCode === undefined ? null : outputCode,
    map: outputMap === undefined ? null : outputMap,
    sourceType: file.ast.program.sourceType,
  };
}
```

[generateCode](https://github.com/babel/babel/blob/v7.16.4/packages/babel-core/src/transformation/file/generate.ts#L9)方法中先遍历`plugins`，如果`plugin.generatorOverride`存在，则调用`plugin.generatorOverride`方法。

如果没有`result`，也就是`plugin中`没有覆盖`generate`方法，或者有覆盖但没有产出，会调用`@babel/generator`生成代码。

另外通过`mergeSourceMap`对`sourceMap`进行了融合，最后返回了`outputCode和outputMap`。

```js
import generate from "@babel/generator";
export default function generateCode(
  pluginPasses: PluginPasses,
  file: File,
): {
  outputCode: string;
  outputMap: SourceMap | null;
} {
  const { opts, ast, code, inputMap } = file;

  const results = [];
  for (const plugins of pluginPasses) {
    for (const plugin of plugins) {
      const { generatorOverride } = plugin;
      if (generatorOverride) {
        const result = generatorOverride(
          ast,
          opts.generatorOpts,
          code,
          generate,
        );

        if (result !== undefined) results.push(result);
      }
    }
  }

  let result;
  if (results.length === 0) {
    result = generate(ast, opts.generatorOpts, code);
  } else if (results.length === 1) {
    result = results[0];

    if (typeof result.then === "function") {
      throw new Error(
        `You appear to be using an async codegen plugin, ` +
          `which your current version of Babel does not support. ` +
          `If you're using a published plugin, ` +
          `you may need to upgrade your @babel/core version.`,
      );
    }
  } else {
    throw new Error("More than one plugin attempted to override codegen.");
  }

  let { code: outputCode, map: outputMap } = result;

  if (outputMap && inputMap) {
    outputMap = mergeSourceMap(inputMap.toObject(), outputMap);
  }

  if (opts.sourceMaps === "inline" || opts.sourceMaps === "both") {
    outputCode += "\n" + convertSourceMap.fromObject(outputMap).toComment();
  }

  if (opts.sourceMaps === "inline") {
    outputMap = null;
  }

  return { outputCode, outputMap };
}
```

到这里`@babel/core`的主流程就分析完了，`babel`的主流程非常清晰，主函数非常简单，起串联作用，每一个函数名都见名知义，文件的总行数、函数的总行数没有特别长的，方便阅读和维护，这些都是值得我们学习的。


### 3. API说明

我们顺便看一下`@babel/core`所暴露出的API。主要有以下几种：
- `transform`，参数为`code`，进行转换
- `transformFile`，参数为文件名
- `transfromFromAst`，参数为AST
- `parse`，参数为`code`，生成AST

上面几个API都有三种版本，`sync`、`async`、`errBack`，分别是同步调用、`Promise`调用、回调函数调用，对此想深入了解的可以看我之前的[关于gensync的文章](https://juejin.cn/post/7037313030643777544)。

## 四、总结

本文介绍了`@babel/core`的主流程，主要是加载配置的讲解，欢迎讨论。

在分析`@babel/core`的过程中，我们跳过了3个重要的包，`@babel/parser`、`@babel/parser`、`@babel/generator`，这些才是`babel`真正的灵魂，会在之后解析。


## 五、系列文章

1. [Babel基础](https://juejin.cn/post/7041067247615344654)
2. Babel源码解析之@babel/core
3. [Babel源码解析之@babel/parser](https://juejin.cn/post/7041068763566833672)
4. [Babel源码解析之@babel/traverse](https://juejin.cn/post/7041069084292677663/)
5. [Babel源码解析之@babel/generator](https://juejin.cn/post/7041069387607965710)
