#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * 笔记 Markdown 标题层级规范化脚本
 *
 * 规则：
 *   1. 文件顶部的一级标题（# xxx）保留不动。
 *   2. 把整篇文档切成若干「段」（section）：
 *      - 段的开头是「日期段标题」：一个 ## 标题，紧跟（可隔空行）一个形如
 *        `2026-05-27` 的日期行（用反引号包不包均可）。
 *      - 这种「段大标题」会被强制规范为 `## `。
 *   3. 一段内部的所有子标题，相对层级保持原样（深的还是深、浅的还是浅），
 *      但整体偏移：段内最浅的子标题映射为 `###`，更深的依次 `####`、`#####`…
 *   4. 围栏代码块（``` 或 ~~~）和 YAML frontmatter（--- ... ---）里的 `#`
 *      不会被当成标题处理。
 *   5. 不会修改一级标题（保留 `# xxx`），不会修改非标题内容。
 *
 * 用法：
 *   # 单文件，输出到 <input>.fixed.md
 *   node scripts/normalize-note-headings.cjs <input.md>
 *
 *   # 单文件，指定输出路径
 *   node scripts/normalize-note-headings.cjs <input.md> <output.md>
 *
 *   # 单文件，原地覆盖
 *   node scripts/normalize-note-headings.cjs <input.md> --inplace
 *
 *   # 多文件，每个文件分别输出到 <input>.fixed.md
 *   node scripts/normalize-note-headings.cjs a.md b.md c.md
 *
 *   # 多文件，原地覆盖（建议先 git commit）
 *   node scripts/normalize-note-headings.cjs a.md b.md c.md --inplace
 *
 *   # 用 shell glob（由 shell 展开）
 *   node scripts/normalize-note-headings.cjs docs/2026上/*.md --inplace
 */

const fs = require('fs');
const path = require('path');

// ---------- 工具函数 ----------

/** 是否是日期行，例如：2026-05-27、`2026-05-27`、2026/05/27 */
function isDateLine(line) {
  if (!line) return false;
  const s = line.trim().replace(/^`+|`+$/g, '').trim();
  return /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(s);
}

/** 解析一行 markdown 标题，返回 { level, text }；非标题返回 null */
function parseHeading(line) {
  const m = /^(#{1,6})\s+(.*)$/.exec(line);
  if (!m) return null;
  return { level: m[1].length, text: m[2] };
}

/** 给定层级 n，返回 n 个 # */
function hashes(n) {
  return '#'.repeat(Math.max(1, Math.min(n, 6)));
}

// ---------- 第一步：扫描出所有「段大标题」的行号 ----------

/**
 * 扫描整篇文档，标记出哪些行属于围栏代码块/frontmatter（要跳过），
 * 然后找出所有「段大标题」：一个 markdown 标题 + 后面紧跟（允许空行）一个日期行。
 *
 * 段大标题的层级不限（原文里 ## / ### / # 都可能写成段大标题，
 * 用日期行作为唯一信号），脚本统一改成 `##`。
 */
function analyze(lines) {
  const inFence = new Array(lines.length).fill(false);
  let fence = null; // null | '```' | '~~~'
  let inFrontmatter = false;

  // 处理 frontmatter
  if (lines[0] && lines[0].trim() === '---') {
    inFrontmatter = true;
    inFence[0] = true;
    for (let i = 1; i < lines.length; i++) {
      inFence[i] = true;
      if (lines[i].trim() === '---') {
        inFrontmatter = false;
        break;
      }
    }
  }

  // 处理围栏代码块
  for (let i = 0; i < lines.length; i++) {
    if (inFrontmatter) continue;
    const trimmed = lines[i].replace(/\s+$/, '');
    const fenceMatch = /^(\s{0,3})(`{3,}|~{3,})/.exec(trimmed);
    if (fence) {
      inFence[i] = true;
      // 围栏结束
      if (fenceMatch && trimmed.trim().startsWith(fence)) {
        fence = null;
      }
    } else if (fenceMatch) {
      fence = fenceMatch[2].slice(0, 3); // ``` 或 ~~~
      inFence[i] = true;
    }
  }

  // 找段大标题
  const sectionStarts = []; // 每个元素: { lineIdx, originalLevel }
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) continue;
    const h = parseHeading(lines[i]);
    if (!h) continue;
    // 一级标题 # 不参与（它是文档总标题）
    if (h.level === 1) continue;
    // 向下找到第一个非空 + 非 frontmatter/代码块的行
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (j < lines.length && !inFence[j] && isDateLine(lines[j])) {
      sectionStarts.push({ lineIdx: i, originalLevel: h.level });
    }
  }

  return { inFence, sectionStarts };
}

// ---------- 第二步：按段重写标题层级 ----------

function rewrite(lines) {
  const { inFence, sectionStarts } = analyze(lines);

  if (sectionStarts.length === 0) {
    return { output: lines.join('\n'), stats: { sections: 0, headingsRewritten: 0 } };
  }

  // 段边界：[start_i, start_{i+1})
  const sectionRanges = sectionStarts.map((s, idx) => ({
    start: s.lineIdx,
    end: idx + 1 < sectionStarts.length ? sectionStarts[idx + 1].lineIdx : lines.length,
    originalLevel: s.originalLevel,
  }));

  const out = lines.slice();
  let headingsRewritten = 0;

  for (const range of sectionRanges) {
    // 1) 强制把段大标题改为 `## `
    const headStr = lines[range.start];
    const head = parseHeading(headStr);
    if (head) {
      const newHead = `## ${head.text}`;
      if (newHead !== headStr) {
        out[range.start] = newHead;
        headingsRewritten++;
      }
    }

    // 2) 收集段内所有「子标题」（不含段大标题本身），找出最浅的层级
    const childIdxs = [];
    for (let i = range.start + 1; i < range.end; i++) {
      if (inFence[i]) continue;
      const h = parseHeading(lines[i]);
      if (!h) continue;
      childIdxs.push({ idx: i, level: h.level, text: h.text });
    }
    if (childIdxs.length === 0) continue;
    const minLevel = Math.min(...childIdxs.map((c) => c.level));
    // 偏移量：把最浅的映射为 ### → 偏移 = 3 - minLevel
    const offset = 3 - minLevel;

    for (const c of childIdxs) {
      const newLevel = c.level + offset;
      const newLine = `${hashes(newLevel)} ${c.text}`;
      if (newLine !== lines[c.idx]) {
        out[c.idx] = newLine;
        headingsRewritten++;
      }
    }
  }

  return {
    output: out.join('\n'),
    stats: { sections: sectionStarts.length, headingsRewritten },
  };
}

// ---------- 入口 ----------

function printHelp() {
  console.log(`用法:
  node scripts/normalize-note-headings.cjs <input.md> [output.md] [--inplace]
  node scripts/normalize-note-headings.cjs <input1.md> <input2.md> ... [--inplace]

参数:
  input.md     必填，要规范化的 markdown 文件，可传多个
  output.md    可选，仅在「单输入文件」时生效；默认 <input>.fixed.md
  --inplace    直接覆盖原文件（建议先 git commit）

说明:
  - 传入多个输入文件时，不允许同时再指定 output.md（无法一对多）。
  - 多文件模式下：未带 --inplace 时，每个文件分别输出到 <input>.fixed.md。
`);
}

function processOne(inputPath, outputPath) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);

  const { output, stats } = rewrite(lines);

  fs.writeFileSync(outputPath, output.replace(/\n/g, eol), 'utf8');
  return stats;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  const inplace = argv.includes('--inplace');
  const positional = argv.filter((a) => !a.startsWith('--'));

  if (positional.length === 0) {
    console.error('❌ 至少要传一个输入文件');
    printHelp();
    process.exit(1);
  }

  // 判定输入/输出：
  // - 1 个 positional：input = positional[0]，output 自动
  // - 2 个 positional 且未 --inplace：兼容旧用法 input + output
  // - >= 2 个 positional 且 --inplace：全部当作 input
  // - >= 3 个 positional：全部当作 input（output 必须自动）
  let inputs;
  let explicitOutput = null;

  if (positional.length === 1) {
    inputs = [positional[0]];
  } else if (positional.length === 2 && !inplace) {
    // 旧用法：第二个参数是输出
    inputs = [positional[0]];
    explicitOutput = positional[1];
  } else {
    inputs = positional;
  }

  // 校验每个输入文件
  const resolvedInputs = inputs.map((p) => path.resolve(p));
  for (const p of resolvedInputs) {
    if (!fs.existsSync(p)) {
      console.error(`❌ 找不到输入文件: ${p}`);
      process.exit(1);
    }
    if (!fs.statSync(p).isFile()) {
      console.error(`❌ 不是普通文件: ${p}`);
      process.exit(1);
    }
  }

  let totalSections = 0;
  let totalRewritten = 0;
  let okCount = 0;
  const failed = [];

  for (const inputPath of resolvedInputs) {
    let outputPath;
    if (inplace) {
      outputPath = inputPath;
    } else if (explicitOutput && resolvedInputs.length === 1) {
      outputPath = path.resolve(explicitOutput);
    } else {
      const ext = path.extname(inputPath);
      const base = ext ? inputPath.slice(0, -ext.length) : inputPath;
      outputPath = `${base}.fixed${ext || '.md'}`;
    }

    try {
      const stats = processOne(inputPath, outputPath);
      totalSections += stats.sections;
      totalRewritten += stats.headingsRewritten;
      okCount++;
      console.log(
        `✅ ${path.relative(process.cwd(), inputPath)}  (段:${stats.sections}, 改写:${stats.headingsRewritten})  →  ${path.relative(process.cwd(), outputPath)}`,
      );
    } catch (err) {
      failed.push({ inputPath, err });
      console.error(`❌ 处理失败: ${inputPath}\n   ${err && err.message ? err.message : err}`);
    }
  }

  console.log(`\n汇总: 成功 ${okCount}/${resolvedInputs.length}，段总数 ${totalSections}，改写行总数 ${totalRewritten}`);
  if (!inplace) {
    console.log(`\n👀 请先用 diff 工具核对，无误后再覆盖原文件。`);
  }
  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
