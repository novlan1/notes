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

  const oneDataList = readFileSync(ONE_DATA_JSON_PATH, true);
  const parsedDate = timeStampFormat(new Date(`${date} ${month}`).getTime(), 'yyyy-MM-dd');
  const parsedInfo = {
    pic,
    text,
    picName: `${vol}--${parsedDate}--${linkIndex}`,

  };
  const newList = [
    ...oneDataList,
    parsedInfo,
  ];
  console.log('>>> parsedInfo:\n', parsedInfo);
  writeFileSync(ONE_DATA_JSON_PATH, newList, true);
}


main();
