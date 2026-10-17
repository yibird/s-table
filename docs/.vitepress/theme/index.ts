import DefaultTheme from 'vitepress/theme';
import 'virtual:group-icons.css';
import './custom.css';
import '../../../packages/vue/src/styles/index.ts';
import DemoPreview from './DemoPreview.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DemoPreview', DemoPreview);
  },
};
