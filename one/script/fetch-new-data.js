const https = require('https');

const path = require('path');
const { existsSync, readdirSync, mkdirSync } = require('fs');

const axios = require('axios');

const cheerio = require('cheerio');
const agent = new https.Agent({
  rejectUnauthorized: false, // 关键：忽略所有证书错误
});
const { writeFileSync, readFileSync, timeStampFormat } = require('t-comm');


const ONE_PREFIX = 'https://wufazhuce.com/one/';
// 历史基线：既往全部期数，一次性提交（约 1.3MB）
const ONE_DATA_BASE_PATH = path.resolve(__dirname, '../src/logic/config/one-data.base.json');
// 增量目录：每期一个 ~100B 的小文件。
// 历史教训：早期每次 fetch 都把 1.3MB 全量 json 重写一遍并提交，
// 导致 git 历史膨胀到 3.5G。现在只提交「新增的这一期」。
const ONE_DATA_DIR = path.resolve(__dirname, '../src/logic/config/one-data');


// 链接无序，但是不会偏离太远
// 以上一次链接为基准，从下面区间找
const MORE_VOL_NUM = [-100, 100];


function getInnerText(info) {
  return info.text().trim();
}

const getVol = url => +url.split('--')[0];
const getLinkIndex = url => +url.split('--')[2];


// 读取全部数据 = 历史基线 + 增量目录下的小文件
function readAllOneData() {
  let list = [];

  if (existsSync(ONE_DATA_BASE_PATH)) {
    list = readFileSync(ONE_DATA_BASE_PATH, true) || [];
  }

  if (existsSync(ONE_DATA_DIR)) {
    readdirSync(ONE_DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .forEach((f) => {
        const item = readFileSync(path.join(ONE_DATA_DIR, f), true);
        if (item && item.picName) list.push(item);
      });
  }

  return list;
}

function getLastLinkIndex() {
  const oneDataList = readAllOneData();
  oneDataList.sort((a, b) => {
    const aIndex = getVol(a.picName);
    const bIndex = getVol(b.picName);
    return bIndex - aIndex;
  });

  const lastOne = oneDataList[0];
  const linkIndex = getLinkIndex(lastOne.picName);
  const vol = getVol(lastOne.picName);

  return { linkIndex, vol };
}


function fetchRawText({ url, linkIndex }) {
  return new Promise((resolve, reject) => {
    const parseData = (html) => {
      const $ = cheerio.load(html);
      try {
        const pic = $('.one-imagen img').attr('src')
          .trim();
        const text = getInnerText($('.one-cita-wrapper .one-cita'));
        const vol = +getInnerText($('.one-titulo')).replace('VOL.', '');
        const month = getInnerText($('.one-pubdate .may'));
        const date = getInnerText($('.one-pubdate .dom'));

        resolve({
          text,
          pic,
          vol,
          month,
          date,
          linkIndex,
        });
      } catch (err) {
        reject(err);
      }
    };

    axios.get(url, { httpsAgent: agent })
      .then((res) => {
        parseData(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
}


async function main() {
  const {
    linkIndex: lastLinkIndex,
    vol: lastVol,
  } = getLastLinkIndex();
  console.log('>>> lastVol: ', lastVol);

  console.log('>>> lastLinkIndex: ', lastLinkIndex);
  const min = lastLinkIndex + MORE_VOL_NUM[0];
  const max = lastLinkIndex + MORE_VOL_NUM[1];
  const urlList = [];

  for (let i = min; i < max;i++) {
    urlList.push({
      url: `${ONE_PREFIX}${i}`,
      linkIndex: i,
    });
  }

  console.log('>>> urlList:\n', urlList);


  for (const item of urlList) {
    const { url, linkIndex } = item;

    try {
      const result = await fetchRawText({ url, linkIndex });

      if (result.vol === lastVol + 1) {
        console.log('>>> Found next vol:\n', result);
        updateOneDataJson(result);
        break;
      }
    } catch (e) {

    }
  }
}


function updateOneDataJson(info) {
  const { pic, text, vol, linkIndex, month, date } = info;

  const parsedDate = timeStampFormat(new Date(`${date} ${month}`).getTime(), 'yyyy-MM-dd');
  const parsedInfo = {
    pic,
    text,
    picName: `${vol}--${parsedDate}--${linkIndex}`,

  };
  console.log('>>> parsedInfo:\n', parsedInfo);

  // 只写增量小文件（~100B）：不再把 1.3MB 全量重写一遍。
  // 完整数据由 merge-one-data.js 在构建前合并生成。
  if (!existsSync(ONE_DATA_DIR)) {
    mkdirSync(ONE_DATA_DIR, { recursive: true });
  }
  const filePath = path.join(ONE_DATA_DIR, `${vol}.json`);
  writeFileSync(filePath, parsedInfo, true);
  console.log('>>> 已写入增量文件:', filePath);
}


main();
