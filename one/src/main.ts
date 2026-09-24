
import { createApp } from 'vue';

import { createPinia } from 'pinia';

// ImageGrid 内部用 v-lazy 渲染图片，需要全局注册 lazy 指令，
// 否则指令解析不到，img 不会被赋值 src，页面上全是空图（只剩 alt 占位）。
import VueLazyload from 'vue-next-lazyload';

import App from './App.vue';
import router from './router';

import './assets/main.css';
import 'tdesign-vue-next/es/style/index.css';
import 'press-tdesign-vue-next/dist/index.css';
import './styles/tailwind.css';


const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueLazyload, {});

app.mount('#app');
