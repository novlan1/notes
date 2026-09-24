const fs = require('fs');
const https = require('https');


function downloadImage(allFilms) {
  for (let i = 0; i < allFilms.length; i++) {
    const picUrl = allFilms[i].pic;
    // 请求 -> 拿到内容
    // fs.writeFile('./xx.png','内容')
    https.get(picUrl, (res) => {
      res.setEncoding('binary');
      let str = '';
      res.on('data', (chunk) => {
        str += chunk;
      });
      res.on('end', () => {
        fs.writeFile(`./images/${i}.png`, str, 'binary', (err) => {
          if (!err) {
            console.log(`第${i}张图片下载成功`);
          }
        });
      });
    });
  }
}


module.exports = {
  downloadImage,
};
