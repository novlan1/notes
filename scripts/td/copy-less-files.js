#!/usr/bin/env node

/**
 * Less文件复制脚本 - Node.js版本
 * 将packages/components目录下的less文件复制到packages/uniapp-components目录下对应组件
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 将fs方法转换为Promise版本
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const access = promisify(fs.access);

// 配置路径
const BASE_DIR = "/Users/guowangyang/Documents/github/tdesign-miniprogram";
const SRC_DIR = path.join(BASE_DIR, "packages", "components");
const DEST_DIR = path.join(BASE_DIR, "packages", "uniapp-components");
const COMMON_SRC_DIR = path.join(SRC_DIR, "common");
const COMMON_DEST_DIR = path.join(DEST_DIR, "common");

// 颜色定义
const colors = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    RESET: '\x1b[0m'
};

function colorize(text, color) {
    return `${color}${text}${colors.RESET}`;
}

async function fileExists(filePath) {
    try {
        await access(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function directoryExists(dirPath) {
    try {
        const stats = await stat(dirPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

async function copyLessFiles() {
    console.error(colorize("开始复制less文件...", colors.BLUE));
    console.error(`源目录: ${SRC_DIR}`);
    console.error(`目标目录: ${DEST_DIR}`);
    console.error("");

    // 统计信息
    const stats = {
        copied: 0,
        created: 0,
        skipped: 0,
        errors: 0
    };

    try {
        // 读取源目录
        const items = await readdir(SRC_DIR);
        
        // 使用Promise.all处理所有组件
        await Promise.all(items.map(async (item) => {
            // 过滤掉node_modules和mixins目录
            if (item === 'node_modules' || item === 'mixins') {
                console.error(colorize(`⏭️  跳过目录: ${item}`, colors.YELLOW));
                return { success: false, reason: '过滤目录' };
            }
            
            const componentDir = path.join(SRC_DIR, item);
            
            // 检查是否是目录
            if (await directoryExists(componentDir)) {
                const componentName = item;
                
                // 源less文件路径
                const srcLessFile = path.join(componentDir, `${componentName}.less`);
                
                // 目标less文件路径
                const destComponentDir = path.join(DEST_DIR, componentName);
                const destLessFile = path.join(destComponentDir, `${componentName}.less`);
                
                // 检查源文件是否存在
                if (!(await fileExists(srcLessFile))) {
                    console.error(colorize(`⏭️  源文件不存在: ${srcLessFile}`, colors.YELLOW));
                    stats.skipped += 1;
                    return { success: false, reason: '源文件不存在' };
                }
                
                // 检查目标目录是否存在
                if (!(await directoryExists(destComponentDir))) {
                    console.error(colorize(`⏭️  目标目录不存在: ${destComponentDir}`, colors.YELLOW));
                    stats.skipped += 1;
                    return { success: false, reason: '目标目录不存在' };
                }
                
                try {
                    // 检查目标文件是否存在
                    if (await fileExists(destLessFile)) {
                        // 目标文件存在，直接覆盖
                        await copyFile(srcLessFile, destLessFile);
                        console.error(colorize(`✅ 已覆盖: ${componentName}.less`, colors.GREEN));
                        stats.copied += 1;
                    } else {
                        // 目标文件不存在，创建新文件
                        await copyFile(srcLessFile, destLessFile);
                        console.error(colorize(`🆕 已创建: ${componentName}.less`, colors.GREEN));
                        stats.created += 1;
                    }
                    
                    return { success: true };
                    
                } catch (error) {
                    console.error(colorize(`❌ 操作失败: ${componentName}.less - ${error.message}`, colors.RED));
                    stats.errors += 1;
                    return { success: false, reason: error.message };
                }
            }
            return { success: false, reason: '不是目录' };
        }));
        
    } catch (error) {
        console.error(colorize(`❌ 读取目录失败: ${error.message}`, colors.RED));
        return stats;
    }
    
    return stats;
}

// 递归查找所有less文件
async function findLessFilesRecursively(dirPath) {
    const lessFiles = [];
    
    async function traverse(currentPath) {
        try {
            const items = await readdir(currentPath);
            
            const tasks = items.map(async (item) => {
                const fullPath = path.join(currentPath, item);
                const stats = await stat(fullPath);
                
                if (stats.isDirectory()) {
                    // 递归遍历子目录，但跳过node_modules和mixins目录
                    if (item !== 'node_modules' && item !== 'mixins') {
                        await traverse(fullPath);
                    }
                } else if (stats.isFile() && path.extname(item) === '.less') {
                    // 检查文件路径是否包含mixins目录，如果包含则跳过
                    if (!fullPath.includes('/mixins/') && !fullPath.includes('\\mixins\\')) {
                        lessFiles.push(fullPath);
                    }
                }
            });
            
            await Promise.all(tasks);
        } catch (error) {
            console.error(colorize(`❌ 遍历目录失败: ${currentPath} - ${error.message}`, colors.RED));
        }
    }
    
    await traverse(dirPath);
    return lessFiles;
}

async function copyCommonLessFiles() {
    console.error(colorize("开始复制common目录less文件...", colors.BLUE));
    console.error(`源目录: ${COMMON_SRC_DIR}`);
    console.error(`目标目录: ${COMMON_DEST_DIR}`);
    console.error("");

    // 统计信息
    const stats = {
        copied: 0,
        created: 0,
        skipped: 0,
        errors: 0
    };

    try {
        // 递归遍历目录，查找所有less文件
        const lessFiles = await findLessFilesRecursively(COMMON_SRC_DIR);
        
        if (lessFiles.length === 0) {
            console.error(colorize("⚠️  未找到任何less文件", colors.YELLOW));
            return stats;
        }
        
        console.error(colorize(`发现 ${lessFiles.length} 个less文件`, colors.BLUE));
        
        // 使用Promise.all处理所有文件
        await Promise.all(lessFiles.map(async (srcFile) => {
            const relativePath = path.relative(COMMON_SRC_DIR, srcFile);
            const destFile = path.join(COMMON_DEST_DIR, relativePath);
            
            // 检查源文件是否存在
            if (!(await fileExists(srcFile))) {
                console.error(colorize(`⏭️  源文件不存在: ${relativePath}`, colors.YELLOW));
                stats.skipped += 1;
                return { success: false, reason: '源文件不存在' };
            }
            
            // 确保目标目录存在
            const destDir = path.dirname(destFile);
            if (!(await directoryExists(destDir))) {
                try {
                    await fs.promises.mkdir(destDir, { recursive: true });
                    console.error(colorize(`📁 创建目录: ${path.relative(COMMON_DEST_DIR, destDir)}`, colors.BLUE));
                } catch (error) {
                    console.error(colorize(`❌ 创建目录失败: ${destDir} - ${error.message}`, colors.RED));
                    stats.errors += 1;
                    return { success: false, reason: error.message };
                }
            }
            
            try {
                // 检查目标文件是否存在
                if (await fileExists(destFile)) {
                    // 目标文件存在，直接覆盖
                    await copyFile(srcFile, destFile);
                    console.error(colorize(`✅ 已覆盖: ${relativePath}`, colors.GREEN));
                    stats.copied += 1;
                } else {
                    // 目标文件不存在，创建新文件
                    await copyFile(srcFile, destFile);
                    console.error(colorize(`🆕 已创建: ${relativePath}`, colors.GREEN));
                    stats.created += 1;
                }
                
                return { success: true };
                
            } catch (error) {
                console.error(colorize(`❌ 操作失败: ${relativePath} - ${error.message}`, colors.RED));
                stats.errors += 1;
                return { success: false, reason: error.message };
            }
        }));
        
    } catch (error) {
        console.error(colorize(`❌ 复制common目录文件失败: ${error.message}`, colors.RED));
        return stats;
    }
    
    return stats;
}

/**
 * 生成index.css文件，将index.less中引用的内容合并，并将rpx转换为px
 */
async function generateIndexCss(themeDir) {
    const indexLessPath = path.join(themeDir, 'index.less');
    const indexCssPath = path.join(themeDir, 'index.css');
    
    if (!(await fileExists(indexLessPath))) {
        console.error(colorize(`⚠️  index.less不存在，跳过生成index.css`, colors.YELLOW));
        return;
    }
    
    try {
        // 读取index.less内容
        const indexContent = await fs.promises.readFile(indexLessPath, 'utf8');
        
        // 提取所有@import语句
        const importRegex = /@import\s+['"](.+?)['"]/g;
        const matches = [];
        let match = importRegex.exec(indexContent);
        
        while (match !== null) {
            matches.push(match[1]);
            match = importRegex.exec(indexContent);
        }
        
        // 读取所有引用的文件内容
        const fileContents = await Promise.all(
            matches.map(async (importPath) => {
                const fullPath = path.join(themeDir, importPath);
                
                if (await fileExists(fullPath)) {
                    const fileContent = await fs.promises.readFile(fullPath, 'utf8');
                    return `\n/* ${importPath} */\n${fileContent}\n`;
                }
                return '';
            })
        );
        
        let finalContent = fileContents.join('');
        
        // 将rpx转换为px（数值乘以2）
        finalContent = finalContent.replace(/(\d+(?:\.\d+)?)rpx/g, (matchStr, num) => {
            const value = parseFloat(num) * 2;
            return `${value}px`;
        });
        
        // 写入index.css
        await fs.promises.writeFile(indexCssPath, finalContent, 'utf8');
        console.error(colorize(`✅ 生成index.css（rpx已转换为px）`, colors.GREEN));
        
    } catch (error) {
        console.error(colorize(`❌ 生成index.css失败: ${error.message}`, colors.RED));
    }
}

/**
 * 处理theme目录的特殊逻辑
 * 1. 将下划线开头的文件移动到raw子目录
 * 2. 修改_index.less的引用关系并重命名为index.css
 * 3. 修改_dark.less和_light.less中的page选择器
 * 4. 生成index.css，将rpx转换为px
 */
async function processThemeDirectory() {
    console.error(colorize("\n开始处理theme目录...", colors.BLUE));
    
    const themeDir = path.join(DEST_DIR, 'common', 'style', 'theme');
    const rawDir = path.join(themeDir, 'raw');
    
    // 确保raw目录存在
    if (!(await directoryExists(rawDir))) {
        try {
            await fs.promises.mkdir(rawDir, { recursive: true });
            console.error(colorize(`📁 创建raw目录`, colors.BLUE));
        } catch (error) {
            console.error(colorize(`❌ 创建raw目录失败: ${error.message}`, colors.RED));
            return;
        }
    }
    
    try {
        // 读取theme目录下的所有文件
        const files = await readdir(themeDir);
        
        // 处理下划线开头的文件（除了_index.less）
        const fileProcessTasks = files.map(async (file) => {
            const filePath = path.join(themeDir, file);
            const fileStats = await stat(filePath);
            
            if (fileStats.isFile() && file.startsWith('_') && file !== '_index.less' && file.endsWith('.less')) {
                const rawFilePath = path.join(rawDir, file);
                
                // 读取文件内容
                let content = await fs.promises.readFile(filePath, 'utf8');
                
                // 如果是_dark.less或_light.less，修改page选择器
                if (file === '_dark.less' || file === '_light.less') {
                    content = content.replace(
                        / {2}page,\n {2}\.page \{/g,
                        '  /* #ifdef H5 */\n  :root,\n  /* #endif */\n  page,\n  .page {'
                    );
                    console.error(colorize(`✏️  修改${file}中的page选择器`, colors.GREEN));
                }
                
                // 写入raw目录
                await fs.promises.writeFile(rawFilePath, content, 'utf8');
                
                // 删除原文件
                await fs.promises.unlink(filePath);
                console.error(colorize(`✅ 移动${file}到raw目录并删除原文件`, colors.GREEN));
            }
        });
        
        await Promise.all(fileProcessTasks);
        
        // 处理_index.less，修改引用关系并重命名为index.css
        const indexLessPath = path.join(themeDir, '_index.less');
        if (await fileExists(indexLessPath)) {
            let content = await fs.promises.readFile(indexLessPath, 'utf8');
            
            // 修改引用路径
            content = content.replace(/@import '\.\/_/g, "@import './raw/_");
            
            // 写入为index.css（注意：这里应该保持为less格式，不应该命名为css）
            // 根据需求，_index.less应该被重命名为index.css
            const newIndexPath = path.join(themeDir, 'index.css');
            await fs.promises.writeFile(newIndexPath, content, 'utf8');
            
            // 删除原_index.less文件
            await fs.promises.unlink(indexLessPath);
            console.error(colorize(`✅ 将_index.less重命名为index.css并修改引用路径`, colors.GREEN));
        }
        
        // 生成最终的index.css（从index.less，转换rpx为px）
        // 注意：这会覆盖上面生成的index.css
        await generateIndexCss(themeDir);
        
    } catch (error) {
        console.error(colorize(`❌ 处理theme目录失败: ${error.message}`, colors.RED));
    }
}

async function listComponents() {
    console.error("\n组件状态列表:");
    console.error("-".repeat(50));
    
    try {
        const items = await readdir(SRC_DIR);
        const components = [];
        
        // 使用Promise.all处理所有组件状态检查
        const componentStatuses = await Promise.all(items.map(async (item) => {
            // 过滤掉node_modules和mixins目录
            if (item === 'node_modules' || item === 'mixins') {
                return null;
            }
            
            const componentDir = path.join(SRC_DIR, item);
            
            if (await directoryExists(componentDir)) {
                const componentName = item;
                const srcLessFile = path.join(componentDir, `${componentName}.less`);
                const destComponentDir = path.join(DEST_DIR, componentName);
                const destLessFile = path.join(destComponentDir, `${componentName}.less`);
                
                let status = "未知";
                
                if (!(await fileExists(srcLessFile))) {
                    status = "源文件不存在";
                } else if (!(await directoryExists(destComponentDir))) {
                    status = "目标目录不存在";
                } else if (!(await fileExists(destLessFile))) {
                    status = "可创建";
                } else {
                    status = "可复制";
                }
                
                return { name: componentName, status };
            }
            return null;
        }));
        
        // 过滤掉null值并添加到components数组
        componentStatuses.forEach((component) => {
            if (component) {
                components.push(component);
            }
        });
        
        // 按状态排序
        components.sort((a, b) => {
            const statusOrder = { "可复制": 0, "可创建": 1, "源文件不存在": 2, "目标目录不存在": 3, "未知": 4 };
            return statusOrder[a.status] - statusOrder[b.status];
        });
        
        components.forEach((component) => {
            if (component.status === "可复制") {
                console.error(colorize(`✅ ${component.name}`, colors.GREEN));
            } else if (component.status === "可创建") {
                console.error(colorize(`🆕 ${component.name}`, colors.BLUE));
            } else {
                console.error(colorize(`⚠️  ${component.name} (${component.status})`, colors.YELLOW));
            }
        });
        
    } catch (error) {
        console.error(colorize(`❌ 读取组件列表失败: ${error.message}`, colors.RED));
    }
}

async function main() {
    console.error("Less文件复制工具 - Node.js版本");
    console.error("=".repeat(50));
    
    // 检查组件目录是否存在
    if (!(await directoryExists(SRC_DIR))) {
        console.error(colorize(`❌ 源目录不存在: ${SRC_DIR}`, colors.RED));
        return;
    }
    
    if (!(await directoryExists(DEST_DIR))) {
        console.error(colorize(`❌ 目标目录不存在: ${DEST_DIR}`, colors.RED));
        return;
    }
    
    // 显示组件状态
    await listComponents();
    
    console.error(`\n${"=".repeat(50)}`);
    
    // 询问是否继续（简化版，直接执行）
    console.error("\n开始执行组件less文件复制操作...\n");
    
    // 执行组件复制
    const componentStats = await copyLessFiles();
    
    // 显示组件复制结果
    console.error(`\n${"=".repeat(50)}`);
    console.error(colorize("组件less文件复制完成！", colors.BLUE));
    console.error(`成功复制: ${componentStats.copied} 个文件`);
    console.error(`成功创建: ${componentStats.created} 个文件`);
    console.error(`跳过: ${componentStats.skipped} 个文件`);
    console.error(`错误: ${componentStats.errors} 个文件`);
    
    console.error(`\n${"=".repeat(50)}`);
    
    // 检查common目录是否存在
    if (await directoryExists(COMMON_SRC_DIR)) {
        console.error("\n开始执行common目录less文件复制操作...\n");
        
        // 执行common目录复制
        const commonStats = await copyCommonLessFiles();
        
        // 显示common目录复制结果
        console.error(`\n${"=".repeat(50)}`);
        console.error(colorize("Common目录less文件复制完成！", colors.BLUE));
        console.error(`成功复制: ${commonStats.copied} 个文件`);
        console.error(`成功创建: ${commonStats.created} 个文件`);
        console.error(`跳过: ${commonStats.skipped} 个文件`);
        console.error(`错误: ${commonStats.errors} 个文件`);
        
        // 显示总体结果
        console.error(`\n${"=".repeat(50)}`);
        console.error(colorize("总体操作完成！", colors.BLUE));
        console.error(`组件文件 - 复制: ${componentStats.copied}, 创建: ${componentStats.created}, 跳过: ${componentStats.skipped}, 错误: ${componentStats.errors}`);
        console.error(`Common文件 - 复制: ${commonStats.copied}, 创建: ${commonStats.created}, 跳过: ${commonStats.skipped}, 错误: ${commonStats.errors}`);
        console.error(`总计 - 复制: ${componentStats.copied + commonStats.copied}, 创建: ${componentStats.created + commonStats.created}, 跳过: ${componentStats.skipped + commonStats.skipped}, 错误: ${componentStats.errors + commonStats.errors}`);
        
        // 处理theme目录的特殊逻辑
        console.error(`\n${"=".repeat(50)}`);
        await processThemeDirectory();
    } else {
        console.error(colorize("⚠️  Common源目录不存在，跳过common目录复制", colors.YELLOW));
    }
}

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error(colorize(`脚本执行失败: ${error.message}`, colors.RED));
        process.exit(1);
    });
}

module.exports = { copyLessFiles, copyCommonLessFiles, listComponents, processThemeDirectory };