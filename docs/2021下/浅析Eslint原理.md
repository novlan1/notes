

## 一、开始

Eslint 是日常工作中不可少的代码检测工具，本文简单介绍几个核心概念和 Eslint 的工作原理。Eslint 的官方文档写的比较详细，建议先阅读其文档后再读本文。

## 二、核心概念


Eslint 的核心概念包括`Rule`、`plugin`等。

### 1. Rule

关于规则[官方文档](https://eslint.bootcss.com/docs/developer-guide/working-with-rules)介绍的很详细。Eslint 官方的`rules`在`lib/rules`目录下，看一个具体的`rule`——[no-var](https://eslint.org/docs/rules/no-var)。

`no-var`规则就是禁止使用`var`声明变量，而是用`let`或`const`。下面是它的的代码。

可以看到它是一个对象，其包含`meta`对象和`create`函数。`meta`对象即为它的元信息，`create`函数则是`rule`运行时的方法。当检测到错误时，会调用`context.report`抛出错误，它的参数中包含一个`fix`方法，就是修复函数。

```js
module.exports = {
  meta: {
    type: "suggestion",

    docs: {
      description: "require `let` or `const` instead of `var`",
      recommended: false,
      url: "https://eslint.org/docs/rules/no-var"
    },

    schema: [],
    fixable: "code",

    messages: {
      unexpectedVar: "Unexpected var, use let or const instead."
    }
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    function hasSelfReferenceInTDZ(declarator) {
      if (!declarator.init) {
        return false;
      }
      const variables = context.getDeclaredVariables(declarator);

      return variables.some(hasReferenceInTDZ(declarator.init));
    }

    function canFix(node) {
      const variables = context.getDeclaredVariables(node);
      const scopeNode = getScopeNode(node);

      if (node.parent.type === "SwitchCase" ||
        node.declarations.some(hasSelfReferenceInTDZ) ||
        variables.some(isGlobal) ||
        variables.some(isRedeclared) ||
        variables.some(isUsedFromOutsideOf(scopeNode)) ||
        variables.some(hasNameDisallowedForLetDeclarations)
      ) {
        return false;
      }

      if (astUtils.isInLoop(node)) {
        if (variables.some(isReferencedInClosure)) {
          return false;
        }
        if (!isLoopAssignee(node) && !isDeclarationInitialized(node)) {
          return false;
        }
      }

      if (
        !isLoopAssignee(node) &&
        !(node.parent.type === "ForStatement" && node.parent.init === node) &&
        !astUtils.STATEMENT_LIST_PARENTS.has(node.parent.type)
      ) {

        // If the declaration is not in a block, e.g. `if (foo) var bar = 1;`, then it can't be fixed.
        return false;
      }

      return true;
    }

    /**
     * Reports a given variable declaration node.
     * @param {ASTNode} node A variable declaration node to report.
     * @returns {void}
     */
    function report(node) {
      context.report({
        node,
        messageId: "unexpectedVar",

        fix(fixer) {
          const varToken = sourceCode.getFirstToken(node, { filter: t => t.value === "var" });

          return canFix(node)
            ? fixer.replaceText(varToken, "let")
            : null;
        }
      });
    }

    return {
      "VariableDeclaration:exit"(node) {
        if (node.kind === "var") {
          report(node);
        }
      }
    };
  }
};
```

Rule 是 Eslint 的重要组成部分，有时间的话可以多看下其他 Rule 是怎样实现的。

### 2. Plugin

插件可以看作是第三方规则的集合，每个插件是一个命名格式为 `eslint-plugin-<plugin-name>` 的`npm`模块，看下`eslint-plugin-vue`的实现。

它包含了
- `rules`，一系列规则
- `configs`，为插件提供不同的配置，我们可以这样使用`extends:['plugin:vue/recommended']`，也就是使用其中一个`config`
- `processors`，为`.vue`文件提供特殊的处理方法
- `environments`，声明额外的环境


```js
module.exports = {
  rules: {
    'array-bracket-newline': require('./rules/array-bracket-newline'),
    'array-bracket-spacing': require('./rules/array-bracket-spacing'),
  // ...
  },
  configs: {
    base: require('./configs/base'),
    essential: require('./configs/essential'),
    'no-layout-rules': require('./configs/no-layout-rules'),
    recommended: require('./configs/recommended'),
    'strongly-recommended': require('./configs/strongly-recommended'),
    'vue3-essential': require('./configs/vue3-essential'),
    'vue3-recommended': require('./configs/vue3-recommended'),
    'vue3-strongly-recommended': require('./configs/vue3-strongly-recommended')
  },
  processors: {
    '.vue': require('./processor')
  },
  environments: {
    'setup-compiler-macros': {
            globals: {
            defineProps: 'readonly',
            defineEmits: 'readonly',
            defineExpose: 'readonly',
            withDefaults: 'readonly'
        }
    }
  }
}
```

### 3. extends

`extends`是 Eslint 的一个配置项，它支持的类型有：

- `eslint:recommended`、`eslint:all`，Eslint 的默认配置
- 可共享配置的名称，以`eslint-config`-开头，比如`eslint-config-standard`
- 插件，比如`plugin:vue-plugin-react/recommended`，或者省略`vue-plugin-`，即`plugin:react/recommended`
- 配置文件的路径，比如`./node_modules/coding-standard/eslintDefaults.js`

`extents`中的每一项内容最终都指向了一个和 ESLint 本身配置规则相同的对象。


### 4. CodePath

`Rule`不仅可以针对每个`Node.type`写规则，还可以针对`onCodePathStart/onCodePathEnd`做相应的判断，涉及到的一个概念就是`CodePath`。`CodePath`就是对代码结构做一定的拆分，在一些较为复杂的`Rule`中，只判断`Node.type`较为困难，这时可以对`codepath`判断。

下面是官网的一个例子：

```js
if (a && b) {
  foo();
}
bar();
```

<img src="http://doc.uwayfly.com/code-path-analysis-2.png" width="390">

上图可以看作一个大的`CodePath`，可以分为`5`段，每段称为`CodePathSegment`。

下面是`CodePath`的运用案例：

检查代码是否可达：

```js
function isReachable(segment) {
  return segment.reachable;
}

module.exports = function(context) {
  var codePathStack = [];

  return {
    // Stores CodePath objects.
    "onCodePathStart": function(codePath) {
      codePathStack.push(codePath);
    },
    "onCodePathEnd": function(codePath) {
      codePathStack.pop();
    },

    // Checks reachable or not.
    "ExpressionStatement": function(node) {
      var codePath = codePathStack[codePathStack.length - 1];

      // Checks the current code path segments.
      if (!codePath.currentSegments.some(isReachable)) {
        context.report({message: "Unreachable!", node: node});
      }
    }
  };
};
```

## 三、运行机制

### 1. 总体

<img src="http://doc.uwayfly.com/eslint-structure.png"  width="900">

直接看流程图就可以了，注意`eslint-disable-line`这种在行内注释来忽略规则的处理，会在[applyDisableDirectives](https://github.com/eslint/eslint/blob/v8.5.0/lib/linter/linter.js#L1383)中执行。


### 2. runRules

[runRules](https://github.com/eslint/eslint/blob/v8.5.0/lib/linter/linter.js#L957)是比较重要的内容，下面分析下其过程。

```js
function runRules(sourceCode, configuredRules, ruleMapper, parserName, languageOptions, settings, filename, disableFixes, cwd, physicalFilename) {
  const emitter = createEmitter();
  const nodeQueue = [];
  let currentNode = sourceCode.ast;

  Traverser.traverse(sourceCode.ast, {
    enter(node, parent) {
      node.parent = parent;
      nodeQueue.push({ isEntering: true, node });
    },
    leave(node) {
      nodeQueue.push({ isEntering: false, node });
    },
    visitorKeys: sourceCode.visitorKeys
  });

  /*
   * Create a frozen object with the ruleContext properties and methods that are shared by all rules.
   * All rule contexts will inherit from this object. This avoids the performance penalty of copying all the
   * properties once for each rule.
   */
  const sharedTraversalContext = Object.freeze(
    Object.assign(
      Object.create(BASE_TRAVERSAL_CONTEXT),
      {
        getAncestors: () => getAncestors(currentNode),
        getDeclaredVariables: sourceCode.scopeManager.getDeclaredVariables.bind(sourceCode.scopeManager),
        getCwd: () => cwd,
        getFilename: () => filename,
        getPhysicalFilename: () => physicalFilename || filename,
        getScope: () => getScope(sourceCode.scopeManager, currentNode),
        getSourceCode: () => sourceCode,
        markVariableAsUsed: name => markVariableAsUsed(sourceCode.scopeManager, currentNode, languageOptions, name),
        parserOptions: {
          ...languageOptions.parserOptions
        },
        parserPath: parserName,
        languageOptions,
        parserServices: sourceCode.parserServices,
        settings
      }
    )
  );

  const lintingProblems = [];

  Object.keys(configuredRules).forEach(ruleId => {
    const severity = ConfigOps.getRuleSeverity(configuredRules[ruleId]);

    // not load disabled rules
    if (severity === 0) {
      return;
    }

    const rule = ruleMapper(ruleId);

    if (!rule) {
      lintingProblems.push(createLintingProblem({ ruleId }));
      return;
    }

    const messageIds = rule.meta && rule.meta.messages;
    let reportTranslator = null;
    const ruleContext = Object.freeze(
      Object.assign(
        Object.create(sharedTraversalContext),
        {
          id: ruleId,
          options: getRuleOptions(configuredRules[ruleId]),
          report(...args) {

            /*
             * Create a report translator lazily.
             * In a vast majority of cases, any given rule reports zero errors on a given
             * piece of code. Creating a translator lazily avoids the performance cost of
             * creating a new translator function for each rule that usually doesn't get
             * called.
             *
             * Using lazy report translators improves end-to-end performance by about 3%
             * with Node 8.4.0.
             */
            if (reportTranslator === null) {
              reportTranslator = createReportTranslator({
                ruleId,
                severity,
                sourceCode,
                messageIds,
                disableFixes
              });
            }
            const problem = reportTranslator(...args);

            if (problem.fix && !(rule.meta && rule.meta.fixable)) {
              throw new Error("Fixable rules must set the `meta.fixable` property to \"code\" or \"whitespace\".");
            }
            if (problem.suggestions && !(rule.meta && rule.meta.hasSuggestions === true)) {
              if (rule.meta && rule.meta.docs && typeof rule.meta.docs.suggestion !== "undefined") {

                // Encourage migration from the former property name.
                throw new Error("Rules with suggestions must set the `meta.hasSuggestions` property to `true`. `meta.docs.suggestion` is ignored by ESLint.");
              }
              throw new Error("Rules with suggestions must set the `meta.hasSuggestions` property to `true`.");
            }
            lintingProblems.push(problem);
          }
        }
      )
    );

    const ruleListeners = createRuleListeners(rule, ruleContext);

    /**
     * Include `ruleId` in error logs
     * @param {Function} ruleListener A rule method that listens for a node.
     * @returns {Function} ruleListener wrapped in error handler
     */
    function addRuleErrorHandler(ruleListener) {
      return function ruleErrorHandler(...listenerArgs) {
        try {
          return ruleListener(...listenerArgs);
        } catch (e) {
          e.ruleId = ruleId;
          throw e;
        }
      };
    }

    // add all the selectors from the rule as listeners
    Object.keys(ruleListeners).forEach(selector => {
      const ruleListener = timing.enabled
        ? timing.time(ruleId, ruleListeners[selector])
        : ruleListeners[selector];

      emitter.on(
        selector,
        addRuleErrorHandler(ruleListener)
      );
    });
  });

  // only run code path analyzer if the top level node is "Program", skip otherwise
  const eventGenerator = nodeQueue[0].node.type === "Program"
    ? new CodePathAnalyzer(new NodeEventGenerator(emitter, { visitorKeys: sourceCode.visitorKeys, fallback: Traverser.getKeys }))
    : new NodeEventGenerator(emitter, { visitorKeys: sourceCode.visitorKeys, fallback: Traverser.getKeys });

  nodeQueue.forEach(traversalInfo => {
    currentNode = traversalInfo.node;

    try {
      if (traversalInfo.isEntering) {
        eventGenerator.enterNode(currentNode);
      } else {
        eventGenerator.leaveNode(currentNode);
      }
    } catch (err) {
      err.currentNode = currentNode;
      throw err;
    }
  });

  return lintingProblems;
}
```

1. 利用`Traverser.traverse`对`sourceCode.ast`进行递归遍历，将`node`放进`nodeQueue`中。`nodeQueue`是一个队列，一个`node`会被放入两次，一次是进入的时候，一次是离开的时候，结构类似：`A->B-C->...->C->B-A`。
2. 新建`sharedTraversalContext`，是`rule`的通用的上下文对象。
3. 遍历`configuredRules`，对每一个`rule`创建`ruleContext`，`ruleContext`上包含`report`方法，`report`方法运行时会收集错误到`lintingProblems`中。
4. 对每一个`rule`，执行它的`create`方法，得到返回值`ruleListeners`，其`key`是`node`节点，`valu`e是回调函数。对`ruleListeners`进行遍历，利用发布订阅模式，将`node`节点和对应的回调函数收集到`emitter`中。
5. 遍历`nodeQueue`，触发`emitter`的`emit`，也就是执行`node`节点上的回调。
6. 返回`lintingProblems`。

`runRules`利用了发布订阅模式、访问器模式，用一句话总结就是，一开始是收集代码中的`node`，然后收集`rule`的回调，最后遍历`node`，执行回调。



## 四、相关资料

1. [ESLint 工作原理探讨](https://zhuanlan.zhihu.com/p/53680918)
2. [Code Path Analysis Details](https://eslint.org/docs/developer-guide/code-path-analysis)
