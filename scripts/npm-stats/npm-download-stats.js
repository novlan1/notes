import https from 'https';
import { batchSendWxRobotMarkdown } from 't-comm';

// 需要统计的 npm 包列表
const PACKAGES = [
  'press-ui',
  't-comm',
  'tdesign-uniapp',
  '@tdesign/uniapp',
  'press-plus',
  'press-ui-next',
  'press-next',
  'press-swiper',
  'press-element-plus',
  'press-hooks',
  'press-shared',
  'press-tdesign-vue-next',
];

// 企业微信机器人配置
const WX_ROBOT_KEY = process.env.WX_ROBOT_KEY || 'd7ac7b67-0960-4b15-a407-6d682ba77247'; // 从环境变量获取机器人 key

/**
 * 获取指定时间范围的 npm 下载量
 * @param {string} packageName - npm 包名
 * @param {string} period - 时间范围：last-day, last-week, last-month
 * @returns {Promise<number>}
 */
function getNpmDownloads(packageName, period) {
  return new Promise((resolve, reject) => {
    const url = `https://api.npmjs.org/downloads/point/${period}/${packageName}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.downloads || 0);
        } catch (error) {
          console.error(`解析 ${packageName} ${period} 数据失败:`, error);
          resolve(0);
        }
      });
    }).on('error', (error) => {
      console.error(`获取 ${packageName} 下载量失败:`, error);
      resolve(0);
    });
  });
}

/**
 * 获取所有包的下载量统计
 * @param {string} period - 时间范围
 * @param {string} periodName - 时间范围名称（用于显示）
 * @returns {Promise<Array>}
 */
async function getAllPackagesStats(period, periodName) {
  const stats = [];

  for (const packageName of PACKAGES) {
    const downloads = await getNpmDownloads(packageName, period);
    stats.push({
      name: packageName,
      downloads,
    });
  }

  // 按下载量降序排序
  stats.sort((a, b) => b.downloads - a.downloads);

  return stats;
}

/**
 * 格式化数字，添加千分位分隔符
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 生成 Markdown 格式的统计报告
 * @param {Array} dailyStats - 每日统计
 * @param {Array} weeklyStats - 每周统计
 * @param {Array} monthlyStats - 每月统计
 * @returns {string}
 */
function generateMarkdownReport(dailyStats, weeklyStats, monthlyStats) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  let markdown = `# NPM 下载量统计报告<@guowangyang>\n\n`;
  markdown += `> 统计时间：${dateStr}\n\n`;

  // 每日统计
  markdown += `## 📊 昨日下载量\n\n`;
  markdown += `| 包名 | 下载量 |\n`;
  markdown += `|------|--------|\n`;
  dailyStats.forEach(stat => {
    markdown += `| ${stat.name} | ${formatNumber(stat.downloads)} |\n`;
  });
  const dailyTotal = dailyStats.reduce((sum, stat) => sum + stat.downloads, 0);
  markdown += `| **总计** | **${formatNumber(dailyTotal)}** |\n\n`;

  // 每周统计
  markdown += `## 📈 近7天下载量\n\n`;
  markdown += `| 包名 | 下载量 |\n`;
  markdown += `|------|--------|\n`;
  weeklyStats.forEach(stat => {
    markdown += `| ${stat.name} | ${formatNumber(stat.downloads)} |\n`;
  });
  const weeklyTotal = weeklyStats.reduce((sum, stat) => sum + stat.downloads, 0);
  markdown += `| **总计** | **${formatNumber(weeklyTotal)}** |\n\n`;

  // 每月统计
  markdown += `## 📅 近30天下载量\n\n`;
  markdown += `| 包名 | 下载量 |\n`;
  markdown += `|------|--------|\n`;
  monthlyStats.forEach(stat => {
    markdown += `| ${stat.name} | ${formatNumber(stat.downloads)} |\n`;
  });
  const monthlyTotal = monthlyStats.reduce((sum, stat) => sum + stat.downloads, 0);
  markdown += `| **总计** | **${formatNumber(monthlyTotal)}** |\n\n`;

  // 添加趋势分析
  markdown += `## 📊 趋势分析\n\n`;
  const avgDaily = dailyTotal;
  const avgWeekly = Math.round(weeklyTotal / 7);
  const avgMonthly = Math.round(monthlyTotal / 30);

  markdown += `- 昨日总下载量：${formatNumber(avgDaily)}\n`;
  markdown += `- 近7天日均下载量：${formatNumber(avgWeekly)}\n`;
  markdown += `- 近30天日均下载量：${formatNumber(avgMonthly)}\n\n`;

  // 找出增长最快的包
  const topPackage = monthlyStats[0];
  if (topPackage) {
    markdown += `🏆 **本月下载量冠军**：${topPackage.name}（${formatNumber(topPackage.downloads)} 次）\n`;
  }

  return markdown;
}

/**
 * 发送企业微信消息
 * @param {string} markdown - Markdown 格式的消息内容
 */
async function sendToWxRobot(markdown) {
  if (!WX_ROBOT_KEY) {
    console.error('❌ 未配置企业微信机器人 Key，请设置环境变量 WX_ROBOT_KEY');
    console.log('\n生成的报告内容：\n');
    console.log(markdown);
    return;
  }

  try {
    await batchSendWxRobotMarkdown({
      chatId: 'ALL',
      webhookUrl: WX_ROBOT_KEY,
      content: markdown,
      isV2: true,
    });
    console.log('✅ 消息发送成功！');
  } catch (error) {
    console.error('❌ 消息发送失败：', error);
    console.log('\n生成的报告内容：\n');
    console.log(markdown);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始统计 NPM 下载量...\n');

  try {
    // 获取各时间段的统计数据
    console.log('📊 正在获取昨日数据...');
    const dailyStats = await getAllPackagesStats('last-day', '昨日');

    console.log('📊 正在获取近7天数据...');
    const weeklyStats = await getAllPackagesStats('last-week', '近7天');

    console.log('📊 正在获取近30天数据...');
    const monthlyStats = await getAllPackagesStats('last-month', '近30天');

    // 生成报告
    console.log('\n📝 生成统计报告...');
    const report = generateMarkdownReport(dailyStats, weeklyStats, monthlyStats);

    // 发送到企业微信
    console.log('📤 发送到企业微信...\n');
    await sendToWxRobot(report);

    console.log('\n✨ 统计完成！');
  } catch (error) {
    console.error('❌ 统计过程出错：', error);
    process.exit(1);
  }
}

// 执行主函数
main();
