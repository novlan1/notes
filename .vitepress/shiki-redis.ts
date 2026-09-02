/**
 * Shiki 自定义语言：Redis（redis-cli 风格）
 *
 * 背景：shiki 2.x 的 bundledLanguages 里没有 redis（只有 sql / shell / bash），
 * 所以 VitePress 遇到 ```redis 代码块会打印
 *   The language 'redis' is not loaded, falling back to 'txt' for syntax highlighting.
 * 这里手写一份轻量 TextMate 语法注册进去即可（见 config.ts 的 markdown.languages）。
 *
 * 语法按 redis-cli 的会话输出设计，主要覆盖：
 * - 命令（SET / GETBIT / MULTI / EXEC ...）与选项（EX / NX / WITHSCORES ...）
 * - key（user:sign:202409、page:uv ...）
 * - 字符串、数字、通配符 *
 * - `>` 提示符、`#` 注释
 * - redis-cli 的响应行：OK / QUEUED / PONG / nil、`1) "value"` 列表项、`(error) ...`
 *
 * scope 命名沿用标准 TextMate 前缀（keyword.* / string.* / constant.numeric 等），
 * 这样不用改主题，github-light / github-dark 就能自动上色。
 */
export const redisLang = {
  name: 'redis',
  displayName: 'Redis',
  scopeName: 'source.redis',
  fileTypes: ['redis', 'rediscli'],
  // 别名走语法自带的 aliases（而不是 config 里的 languageAlias），
  // 因为 languageAlias 的 value 会被当成 bundled 语言名预加载，redis 不在 bundled 里会抛错
  aliases: ['rediscli', 'redis-cli'],
  patterns: [
    { include: '#comments' },
    { include: '#error-response' },
    { include: '#item-response' },
    { include: '#status-response' },
    { include: '#prompt' },
    { include: '#strings' },
    { include: '#numbers' },
    { include: '#operators' },
    { include: '#commands' },
    { include: '#keys' },
  ],
  repository: {
    comments: {
      match: '#.*$',
      name: 'comment.line.number-sign.redis',
    },

    // (error) ERR wrong number of arguments for 'set' command
    'error-response': {
      match: '^\\s*\\(error\\).*$',
      name: 'invalid.illegal.error.redis',
    },

    // 1) "zhangsan"  # 这条还是执行了
    'item-response': {
      begin: '^\\s*(\\d+\\))\\s*',
      beginCaptures: {
        '1': { name: 'punctuation.definition.list.redis' },
      },
      end: '$',
      patterns: [
        { include: '#comments' },
        { include: '#error-inline' },
        { include: '#strings' },
        { include: '#numbers' },
        { include: '#keys' },
      ],
    },

    // 列表项里的报错：1) (error) WRONGTYPE ...
    'error-inline': {
      match: '\\((error|nil|integer|empty [a-z ]+)\\)',
      name: 'invalid.illegal.error.redis',
    },

    // OK / QUEUED / PONG / nil 独占一行
    'status-response': {
      match: '^\\s*\\b(OK|QUEUED|PONG|nil)\\b\\s*$',
      name: 'support.constant.status.redis',
    },

    // > SET a 1
    prompt: {
      match: '^(\\s*)(>)(\\s*)',
      captures: {
        '2': { name: 'punctuation.definition.prompt.redis' },
      },
    },

    strings: {
      patterns: [
        {
          match: '"[^"]*"',
          name: 'string.quoted.double.redis',
        },
        {
          match: "'[^']*'",
          name: 'string.quoted.single.redis',
        },
      ],
    },

    numbers: {
      match: '(?<![\\w:.])-?\\d+(\\.\\d+)?\\b',
      name: 'constant.numeric.redis',
    },

    operators: {
      match: '\\*',
      name: 'keyword.operator.wildcard.redis',
    },

    // 命令与选项都是全大写（SETBIT / GEORADIUS / WITHSCORES / EX ...）
    commands: {
      match: '\\b[A-Z][A-Z0-9_]{1,}\\b',
      name: 'keyword.command.redis',
    },

    // key / 成员名，允许 : . - [ ] 等常见分隔
    // 用 string.unquoted（而非 variable.other），因为 github-light/dark 主题
    // 没有给 variable.other 配色，key 会退化成默认前景色
    keys: {
      match: '[A-Za-z_][\\w:.\\[\\]-]*',
      name: 'string.unquoted.key.redis',
    },
  },
};

export default redisLang;
