import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import SidebarToggle from './components/SidebarToggle.vue'
import imageViewer from 'vitepress-plugin-image-viewer'
import 'viewerjs/dist/viewer.min.css'
import { useRoute } from 'vitepress'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      // 关键：使用 layout-top 而不是 sidebar-nav-before / aside-outline-before
      // 这样按钮不会被 sidebar/aside 的 display:none 一起隐藏，避免"折叠后无法恢复"的死锁
      'layout-top': () => [
        h(SidebarToggle, { target: 'sidebar' }),
        h(SidebarToggle, { target: 'outline' }),
      ],
    }),
  setup() {
    imageViewer(useRoute())
  },
}
