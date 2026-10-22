import { defineConfig } from 'vitepress';
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons';
import { demoMarkdownPlugin } from './demoMarkdownPlugin';

export default defineConfig({
  lang: 'zh-CN',
  title: 'STable',
  description: 'Vue 3 + TypeScript 数据表格组件文档',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    config(md) {
      md.use(demoMarkdownPlugin);
      md.use(groupIconMdPlugin);
    },
  },
  vite: {
    plugins: [groupIconVitePlugin()],
  },
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '组件', link: '/components/s-table' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
          ],
        },
      ],
      '/components/': [
        {
          text: 'STable',
          items: [{ text: '能力总览', link: '/components/s-table' }],
        },
        {
          text: '核心用法',
          items: [
            { text: '基础用法', link: '/components/s-table/basic' },
            { text: '列与单元格', link: '/components/s-table/columns' },
            { text: '排序、过滤与搜索', link: '/components/s-table/sorting-filtering' },
            { text: '分页与序号', link: '/components/s-table/pagination' },
            { text: '行选择', link: '/components/s-table/selection' },
            { text: '服务端数据', link: '/components/s-table/server-side' },
            { text: '展开行', link: '/components/s-table/expandable' },
            { text: '单元格与整行编辑', link: '/components/s-table/editing' },
            { text: '树形数据', link: '/components/s-table/tree' },
          ],
        },
        {
          text: '高级能力',
          items: [
            { text: '虚拟滚动', link: '/components/s-table/virtual' },
            { text: '框选与右键菜单', link: '/components/s-table/interactions' },
            { text: '行列拖拽', link: '/components/s-table/drag' },
            { text: '导入与导出', link: '/components/s-table/export' },
            { text: '行与单元格事件', link: '/components/s-table/events' },
            { text: '样式与主题', link: '/components/s-table/css' },
          ],
        },
        {
          text: '参考',
          items: [
            { text: '插槽', link: '/components/s-table/slots' },
            { text: 'API', link: '/components/s-table/api' },
            { text: 'TypeScript 类型', link: '/components/s-table/types' },
            { text: '最佳实践与性能', link: '/components/s-table/best-practices' },
            { text: 'SurelyVue 迁移', link: '/components/s-table/surelyvue-compat' },
            { text: '常见问题', link: '/components/s-table/faq' },
          ],
        },
      ],
    },
    footer: {
      message: 'Built with VitePress',
      copyright: 'Copyright © 2026 STable',
    },
    search: {
      provider: 'local',
    },
  },
});
