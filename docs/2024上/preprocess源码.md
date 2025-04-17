### 1. 开始

`preprocess` 是条件编译的核心，可以用来解析 `ifdef, ifndef, endif` 等关键词，当然还可以处理 `include、echo` 等。

### 2. preprocessor

#### 2.1. replace

内部有个 `replace` 方法，会根据正则 `rule`，依次解析 `source`，并传递给回调函数 `processor`，`processor` 可以是任意处理器。

```ts
function replace(rv: string, rule: any, processor: any) {
  const isRegex = typeof rule === 'string' || rule instanceof RegExp;
  const isArray = Array.isArray(rule);

  if (isRegex) {
    rule = [new RegExp(rule, 'gmi')];
  } else if (isArray) {
    rule = rule.map((subRule: string) => new RegExp(subRule, 'gmi'));
  } else {
    throw new Error('Rule must be a String, a RegExp, or an Array.');
  }

  return rule.reduce((rv: string, rule: RegExp) => rv.replace(rule, processor), rv);
}
```

#### 2.2. processIncludeDirective

先看 `processIncludeDirective`，这个可以处理 `#include` 以及 `#include-static`。

```ts
// 使用的地方
rv = replace(rv, opts.type.include, processIncludeDirective.bind(null, false, context, opts));
```

```ts
// 工具方法，读取文件内容
function getFileContents(path: string, failSilent: boolean, requesterPath: string) {
  try {
    fs.statSync(path);
  } catch (e) {
    if (failSilent) {
      return {
        error: true,
        contents: `${path} not found!`,
      };
    }
    let errMsg = path;
    errMsg = requesterPath ? `${errMsg} requested from ${requesterPath}` : errMsg;
    errMsg += ' not found!';
    throw new Error(errMsg);
  }
  return {
    error: false,
    contents: fs.readFileSync(path).toString(),
  };
}

function processIncludeDirective(
  isStatic: boolean,
  context: Record<string, any>,
  opts: Record<string, any>,
  match: any,
  linePrefix = '',
  file: string,
) {
  file = (file || '').trim();
  const indent = linePrefix.replace(/\S/g, ' ');
  const includedContext: any = copy(context);
  const includedOpts: any = copy(opts);
  includedContext.src = path.join(opts.srcDir, file);
  includedOpts.srcDir = path.dirname(includedContext.src);

  const fileContents = getFileContents(includedContext.src, opts.fileNotFoundSilentFail, context.src);
  if (fileContents.error) {
    return linePrefix + fileContents.contents;
  }

  let includedSource = fileContents.contents;
  if (isStatic) {
    includedSource = fileContents.contents;
  } else {
    includedSource = preprocessor(fileContents.contents, includedContext, includedOpts, true);
  }

  includedSource = normalizeEol(includedSource, indent);

  if (includedSource) {
    return linePrefix + includedSource;
  }
  return linePrefix;
}
```

可以看到还是比较好读的，拿到匹配出来的内容，比如 

```ts
// #include abc
```

上面的 `file` 就是 `abc`，获取到文件内容后，拼接到 `linePrefix` 后面。如果不是 `#include-static`，就递归处理获取到的文件内容。

#### 2.3. ifdef

再看下 ifdef 的处理。

```ts
if (opts.type.if) {
  rv = replaceRecursive(rv, opts.type.if, (
    startMatches: Record<string | number, any>,
    endMatches: Record<string | number, any>,
    include: string,
    recurse: Function,
  ) => {
    const variant = startMatches[1];
    const test = (startMatches[2] || '').trim();
    switch (variant) {
      case 'if':
      case 'ifdef':
        return testPasses(test, context)
          ? (padContent(startMatches.input) + recurse(include) + padContent(endMatches.input))
          : padContent(startMatches.input + include + endMatches.input);
      case 'ifndef':
        return !testPasses(test, context)
          ? (padContent(startMatches.input) + recurse(include) + padContent(endMatches.input))
          : padContent(startMatches.input + include + endMatches.input);
        //      case 'ifdef':
        //        return typeof getDeepPropFromObj(context, test) !== 'undefined'
        // ? (padContent(startMatches.input) + recurse(include) + padContent(endMatches.input))
        // : padContent(startMatches.input + include + endMatches.input) // fixed by xxxxxx
        //      case 'ifndef':
        //        return typeof getDeepPropFromObj(context, test) === 'undefined'
        // ? (padContent(startMatches.input) + recurse(include) + padContent(endMatches.input))
        // : padContent(startMatches.input + include + endMatches.input) // fixed by xxxxxx
      default:
        throw new Error(`Unknown if variant ${variant}.`);
    }
  });
}
```

先调用 `replaceRecursive`，递归处理正则。这里用了 `xregexp` 三方库的 `matchRecursive` 方法，用来方便的递归。

#### 2.4. replaceRecursive

以下面这段字符串为例，看看 `matchRecursive` 方法返回了什么：

```ts
const content = `
// #ifdef H5
console.log('1');
// #endif

// #ifndef H5
console.log('2');
// #endif

console.log('3');
`;
```


```ts
// 预设的 if 正则
if: {
  start: '[ \t]*(?://|/\\*)[ \t]*#(ifndef|ifdef|if)[ \t]+([^\n*]*)(?:\\*(?:\\*|/))?(?:[ \t]*\n+)?',
  end: '[ \t]*(?://|/\\*)[ \t]*#endif[ \t]*(?:\\*(?:\\*|/))?(?:[ \t]*\n)?',
},

const matches = XRegExp.matchRecursive(content, rule.start, rule.end, 'gmi', {
  valueNames: ['between', 'left', 'match', 'right'],
});
```

`matches` 结果如下，就是对字符串根据正则进行了分割。

```ts
[
  { name: 'between', value: '\n', start: 0, end: 1 },
  { name: 'left', value: '// #ifdef H5\n', start: 1, end: 14 },
  { name: 'match', value: "console.log('1');\n", start: 14, end: 32 },
  { name: 'right', value: '// #endif\n', start: 32, end: 42 },
  { name: 'between', value: '\n', start: 42, end: 43 },
  { name: 'left', value: '// #ifndef H5\n', start: 43, end: 57 },
  { name: 'match', value: "console.log('2');\n", start: 57, end: 75 },
  { name: 'right', value: '// #endif\n', start: 75, end: 85 },
  {
    name: 'between',
    value: "\nconsole.log('3');\n",
    start: 85,
    end: 104
  }
]
```

`replaceRecursive` 方法对遍历 `matches`，走到 `right` 时，对捕获到的 `matchGroup.match` 进行递归处理：


```ts
const matchGroup: Record<string, any> = {
  left: null,
  match: null,
  right: null,
};

return matches.reduce((builder: string, match: {
  name: string;
  value: string;
}) => {
  switch (match.name) {
    case 'between':
      builder += match.value;
      break;
    case 'left':
      matchGroup.left = startRegex.exec(match.value);
      break;
    case 'match':
      matchGroup.match = match.value;
      break;
    case 'right':
      matchGroup.right = endRegex.exec(match.value);
      // 不同的 preprocessOptions.type 对应的 processor 不同
      builder += processor(matchGroup.left, matchGroup.right, matchGroup.match, matchReplacePass);
      break;
  }
  return builder;
}, '');
```

#### 2.5. processor

不同的 `preprocessOptions.type` 对应的上面的 `processor` 不同，对于 `if`，就会判断是否满足条件，如果满足条件，则返回 `recurse(include)`，即 `matchReplacePass(matchGroup.match)`

```ts
switch (variant) {
  case 'if':
  case 'ifdef':
    return testPasses(test, context)
      ? (padContent(startMatches.input) + recurse(include) + padContent(endMatches.input))
      : padContent(startMatches.input + include + endMatches.input);
  case 'ifndef':
    return !testPasses(test, context)
      ? (padContent(startMatches.input) + recurse(include) + padContent(endMatches.input))
      : padContent(startMatches.input + include + endMatches.input);
    //      case 'ifdef':
    //        return typeof getDeepPropFromObj(context, test) !== 'undefined'
    // ? (padContent(startMatches.input) + recurse(include) + padContent(endMatches.input))
    // : padContent(startMatches.input + include + endMatches.input) // fixed by xxxxxx
    //      case 'ifndef':
    //        return typeof getDeepPropFromObj(context, test) === 'undefined'
    // ? (padContent(startMatches.input) + recurse(include) + padContent(endMatches.input))
    // : padContent(startMatches.input + include + endMatches.input) // fixed by xxxxxx
  default:
    throw new Error(`Unknown if variant ${variant}.`);
}
```

对于 `exclude` 类型的 `preprocessOptions.type`，如果满足条件的话，就会排除` recurse(include)`。

```ts
if (opts.type.exclude) {
  rv = replaceRecursive(rv, opts.type.exclude, (
    startMatches: Array<string>,
    endMatches: Array<string>,
    include: string,
    recurse: Function,
  ) => {
    const test = (startMatches[1] || '').trim();
    return testPasses(test, context) ? '' : recurse(include);
  });
}
```

对于 `extend` 类型的 `preprocessOptions.type`，如果满足条件的话，


`echo` 类型的话，就会获取对应的 `value`，然后拼接。

```ts
rv = replace(rv, opts.type.echo, (match: any, variable: string) => {
  variable = (variable || '').trim();
  // if we are surrounded by quotes, echo as a string
  const stringMatch = variable.match(/^(['"])(.*)\1$/);
  if (stringMatch) return stringMatch[2];

  return getDeepPropFromObj(context, (variable || '').trim());
});
```

其他类型就不一一列举了，大同小异。

### 3. 一些有用的片段

获取 `eol` 以及 替换 `eol`：

```ts
function getEolType(source: string) {
  let eol;
  let foundEolTypeCnt = 0;

  if (source.indexOf('\r\n') >= 0) {
    eol = '\r\n';
    foundEolTypeCnt += 1;
  }
  if (/\r[^\n]/.test(source)) {
    eol = '\r';
    foundEolTypeCnt += 1;
  }
  if (/[^\r]\n/.test(source)) {
    eol = '\n';
    foundEolTypeCnt += 1;
  }

  if (eol == null || foundEolTypeCnt > 1) {
    eol = os.EOL;
  }

  return eol;
}


function normalizeEol(source: string, indent = '') {
  // only process any kind of EOL if indentation has to be added, otherwise replace only non \n EOLs
  if (indent) {
    source = source.replace(/(?:\r?\n)|\r/g, `\n${indent}`);
  } else {
    source = source.replace(/(?:\r\n)|\r/g, '\n');
  }

  return source;
}

function restoreEol(normalizedSource: string, originalEol: string) {
  if (originalEol !== '\n') {
    normalizedSource = normalizedSource.replace(/\n/g, originalEol);
  }

  return normalizedSource;
}
```

### 4. 总结

如果有前后两个关键词，比如 `ifdef/endif`, `exclude/endexclude`，就用 `replaceRecursive`，否则就用 `replace`。

核心有以下几个：

1. 精确、丰富的正则
2. 严谨的递归
3. 防止多种类型的相互影响
