import DefaultTheme from "vitepress/theme";
import imageViewer from "vitepress-plugin-image-viewer";
import "viewerjs/dist/viewer.min.css";
import { useRoute } from 'vitepress';

export default {
  extends: DefaultTheme,
  setup() {
    imageViewer(useRoute());
  },
};
