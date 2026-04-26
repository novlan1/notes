#!/usr/bin/env node
/**
 * 清理笔记中的 Q:、A:、觉得AI解答怎么样？标记
 * 并给所有未加 ### 的问题加上 ###
 *
 * 用法：node scripts/clean-qa.js <文件路径>
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('用法：node scripts/clean-qa.js <文件路径>');
  process.exit(1);
}

const absPath = path.resolve(filePath);
let content = fs.readFileSync(absPath, 'utf-8');
const lines = content.split('\n');

const result = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  const trimmed = line.trim();

  // 跳过"觉得AI解答怎么样？"
  if (trimmed === '觉得AI解答怎么样？') {
    i++;
    continue;
  }

  // 跳过独占一行的 "Q："
  if (trimmed === 'Q：') {
    i++;
    continue;
  }

  // 跳过独占一行的 "A："
  if (trimmed === 'A：') {
    i++;
    continue;
  }

  // 检测问题行：下一个非空行是 "A："
  // 也处理问题行后直接跟内容（无 A：）的情况 —— 不需要，只有带 A: 的才是 Q/A 格式
  // 找到当前行后面的第一个非空行
  if (trimmed !== '' && !trimmed.startsWith('#')) {
    // 向前看：找到下一个非空行，判断是否是 "A："
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (j < lines.length && lines[j].trim() === 'A：') {
      // 当前行是问题，加 ###，并在问题后插入空行
      result.push('### ' + trimmed);
      result.push('');
      i++;
      continue;
    }
  }

  result.push(line);
  i++;
}

const output = result.join('\n');
fs.writeFileSync(absPath, output, 'utf-8');
console.log('完成：', absPath);
