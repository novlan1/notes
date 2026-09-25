export const LOGIN_LOCAL_STORAGE_TOKEN_NAME = 'image_manager_login_token';


export const REQUEST_CONFIG = {
  DEVELOP_URL: 'http://localhost:3008/api',
  PROD_URL: 'https://foo.com/api',
};


export const ONE_PICK_PREFIX = 'https://wufazhuce.com/one/';

// ONE 数据文件的 CDN 地址：运行时拉取最新数据，
// 避免每抓一期都要重新构建部署整站。
// 构建时由环境变量 VITE_ONE_DATA_URL 注入；未配置时只显示本地快照。
export const ONE_DATA_URL: string = import.meta.env.VITE_ONE_DATA_URL || '';
