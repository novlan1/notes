/**
 * 把 one-data.json 上传到腾讯云 COS（CDN 源站）。
 *
 * 数据走 CDN 的好处：每期更新只需传这一个文件，
 * 不必像之前那样把 1.4MB 的 json 提交进 git，也不必为了 100 字节
 * 重跑一次全站构建（VitePress 2m41s）。
 *
 * 只有密钥是敏感信息，放仓库 Secrets / 本地 .env.local：
 *   COS_SECRET_ID
 *   COS_SECRET_KEY
 *
 * 桶名、地域、对象路径都是公开信息，直接写在下面的常量里，
 * 需要换环境时用同名环境变量覆盖即可。
 */
const fs = require('fs');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');

// 本地从 one/.env.local 读；CI 里由 env 注入。
// dotenv 不会覆盖已存在的环境变量，所以两边都写没有冲突。
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const DATA_PATH = path.resolve(__dirname, '../src/logic/config/one-data.json');

// ---- 公开配置，直接写死 ----
const DEFAULT_BUCKET = 'mike-1255355338';
const DEFAULT_REGION = 'ap-guangzhou';
const DEFAULT_KEY = 'one/one-data.json';
const CDN_BASE = 'https://cdn.uwayfly.com';

const REQUIRED = ['COS_SECRET_ID', 'COS_SECRET_KEY'];


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
  } = process.env;

  const Bucket = process.env.COS_BUCKET || DEFAULT_BUCKET;
  const Region = process.env.COS_REGION || DEFAULT_REGION;
  const Key = process.env.COS_KEY || DEFAULT_KEY;

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
  console.log(`>>> CDN 地址: ${CDN_BASE}/${Key}`);
  console.log('>>> 提示：CDN/COS 需允许 https://novlan1.github.io 跨域 GET，否则前端拉不到');
}

main().catch((e) => {
  console.error('>>> 上传失败:', e && e.message ? e.message : e);
  process.exit(1);
});
