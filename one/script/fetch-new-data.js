const https = require('https');

const path = require('path');

const axios = require('axios');

const cheerio = require('cheerio');
const agent = new https.Agent({
  rejectUnauthorized: false, // 关键：忽略所有证书错误
});
const { writeFileSync, readFileSync, timeStampFormat } = require('t-comm');


const ONE_PREFIX = 'https://wufazhuce.com/one/';
const ONE_DATA_JSON_PATH = path.resolve(__dirname, '../src/logic/config/one-data.json');


// 链接无序，但是不会偏离太远
// 以上一次链接为基准，从下面区间找
const MORE_VOL_NUM = [-100, 100];


function getInnerText(info) {
  return info.text().trim();
}

const getVol = url => +url.split('--')[0];
const getLinkIndex = url => +url.split('--')[2];


function getLastLinkIndex() {
  const oneDataList = readFileSync(ONE_DATA_JSON_PATH, true);
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

  console.log(`>>> 扫描区间: ${min} ~ ${max - 1}（共 ${urlList.length} 个链接）`);

  // 站点链接编号（/one/5273）与 VOL 编号（5101）不是单调对应的：
  // 实测 5273↔VOL.5101、5246↔VOL.5102、5306↔VOL.5104。
  // 所以不能「只找 lastVol + 1 然后 break」——那样一次运行只补一期，
  // 一旦落后（定时任务没跑 / 某次失败）缺口就再也补不回来。
  // 这里改成：一次遍历把窗口内所有比 lastVol 新的期都收齐，去重后按顺序补齐。
  const foundMap = new Map(); // vol -> info

  for (const item of urlList) {
    const { url, linkIndex } = item;

    try {
      const result = await fetchRawText({ url, linkIndex });

      // 只要比当前最新一期新就收下；同一 vol 可能有多个链接，取第一个
      if (result.vol > lastVol && !foundMap.has(result.vol)) {
        foundMap.set(result.vol, result);
      }
    } catch (e) {

    }
  }

  const newList = [...foundMap.values()].sort((a, b) => a.vol - b.vol);

  if (!newList.length) {
    console.log('>>> 没有更新的期，结束');
    return;
  }

  console.log(`>>> 本次新增 ${newList.length} 期: ${newList.map(item => item.vol).join(', ')}`);
  updateOneDataJsonList(newList);
}


function updateOneDataJsonList(infoList) {
  const oneDataList = readFileSync(ONE_DATA_JSON_PATH, true);
  const parsedList = infoList.map(info => {
    const { pic, text, vol, linkIndex, month, date } = info;
    const parsedDate = timeStampFormat(new Date(`${date} ${month}`).getTime(), 'yyyy-MM-dd');

    return {
      pic,
      text,
      picName: `${vol}--${parsedDate}--${linkIndex}`,
    };
  });

  console.log('>>> parsedList:\n', parsedList);
  writeFileSync(ONE_DATA_JSON_PATH, [...oneDataList, ...parsedList], true);
}


main();
