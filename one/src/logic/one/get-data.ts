import { ONE_PICK_PREFIX, ONE_DATA_URL } from '../config/config';
import rawData from '../config/one-data.json';


const getVol = (url: string) => +url.split('--')[0];
const getDate = (url: string) => url.split('--')[1].replace(/-/g, '.');
const getLinkIndex = (url: string) => +url.split('--')[2];

const getRawLink = (vol: number) => `${ONE_PICK_PREFIX}${vol}`;


type RawItem = {
  pic: string;
  text: string;
  picName: string;
};

export type OneItem = RawItem & {
  url: string;
  name: string;
};

function format(list: RawItem[]): OneItem[] {
  const newData = [...list].map(item => ({
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

/**
 * 本地快照：随构建打包进产物。
 * 用于首屏立即渲染，以及 CDN 不可用时的兜底。
 */
export function getOneData(): OneItem[] {
  return format(rawData as RawItem[]);
}

/**
 * CDN 上的最新数据：运行时拉取。
 * 这样每期数据更新只需上传对象存储，不必重新构建部署整站。
 */
export async function fetchOneData(): Promise<OneItem[]> {
  if (!ONE_DATA_URL) {
    throw new Error('ONE_DATA_URL 未配置（构建时需注入 VITE_ONE_DATA_URL）');
  }

  const res = await fetch(ONE_DATA_URL, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`拉取 ONE 数据失败: ${res.status}`);
  }

  return format((await res.json()) as RawItem[]);
}
