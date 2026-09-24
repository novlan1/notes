import { ONE_PICK_PREFIX } from '../config/config';
import rawData from '../config/one-data.json';


const getVol = (url: string) => +url.split('--')[0];
const getDate = (url: string) => url.split('--')[1].replace(/-/g, '.');
const getLinkIndex = (url: string) => +url.split('--')[2];

const getRawLink = (vol: number) => `${ONE_PICK_PREFIX}${vol}`;


export function getOneData(): Array<{
  url: string;
  name: string;
}> {
  const newData = [...rawData].map(item => ({
    ...item,
    url: item.pic,
    name: `${getVol(item.picName)}. ${item.text} ${getDate(item.picName)}  ${getRawLink(getLinkIndex(item.picName))}`,
  }));

  newData.sort((a, b) => {
    const aIndex = getVol(a.picName);
    const bIndex = getVol(b.picName);
    return bIndex - aIndex;
  });

  return newData;
}
