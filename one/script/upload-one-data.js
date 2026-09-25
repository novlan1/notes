/**
 * 把 one-data.json 上传到腾讯云 COS（CDN 源站）。
 *
 * 数据走 CDN 的好处：每期更新只需传这一个文件，
 * 不必像之前那样把 1.4MB 的 json 提交进 git，也不必为了 100 字节
 * 重跑一次全站构建（VitePress 2m41s）。
 *
 * 需要的环境变量（本地放 one/.env.local，CI 放仓库 Secrets）：
 *   COS_SECRET_ID
 *   COS_SECRET_KEY
 *   COS_BUCKET      例如 one-1250000000
 *   COS_REGION      例如 ap-guangzhou
 *   COS_KEY         可选，对象路径，默认 one/one-data.json
 *   COS_CDN_URL     可选，仅用于打印 CDN 地址提示
 */
const fs = require('fs');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');

// 本地从 one/.env.local 读；CI 里由 env 注入。
// dotenv 不会覆盖已存在的环境变量，所以两边都写没有冲突。
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const DATA_PATH = path.resolve(__dirname, '../src/logic/config/one-data.json');

const REQUIRED = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION'];


async function main() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`>>> 缺少环境变量: ${missing.join(', ')}`);
    console.error('>>> 本地请在 one/.env.local 配置，CI 请在仓库 Settings → Secrets 配置');
    process.exit(1);
  }

  const {
    COS_SECRET_ID: SecretId,
    COS_SECRET_KEY: SecretKey,
    COS_BUCKET: Bucket,
    COS_REGION: Region,
  } = process.env;

  const Key = process.env.COS_KEY || 'one/one-data.json';

  const cos = new COS({ SecretId, SecretKey });

  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket,
      Region,
      Key,
      Body: fs.createReadStream(DATA_PATH),
      ContentType: 'application/json',
      Headers: {
        // 数据每天更新，避免中间层缓存住旧数据
        'Cache-Control': 'no-cache',
      },
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  const size = (fs.statSync(DATA_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`>>> 上传成功: ${Key} (${size} MB)`);
  if (process.env.COS_CDN_URL) {
    console.log(`>>> CDN 地址: ${process.env.COS_CDN_URL}/${Key}`);
  }
}

main().catch((e) => {
  console.error('>>> 上传失败:', e && e.message ? e.message : e);
  process.exit(1);
});
