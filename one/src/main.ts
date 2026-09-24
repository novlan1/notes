
import { createApp } from 'vue';

import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

import './assets/main.css';
import 'tdesign-vue-next/es/style/index.css';
import 'press-tdesign-vue-next/dist/index.css';
import './styles/tailwind.css';


const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
