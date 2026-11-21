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
          items: [
            { text: '能力总览', link: '/components/s-table' },
            { text: 'API', link: '/components/s-table/api' },
            { text: 'TypeScript 类型', link: '/components/s-table/types' },
            { text: '最佳实践与性能', link: '/components/s-table/best-practices' },
            { text: 'SurelyVue 迁移', link: '/components/s-table/surelyvue-compat' },
            { text: '常见问题', link: '/components/s-table/faq' },
          ],
        },
        {
          text: '基本用法',
          items: [
            { text: '基础表格', link: '/components/s-table/basic#基础表格' },
            { text: '边框', link: '/components/s-table/basic#边框' },
            { text: '斑马纹', link: '/components/s-table/basic#斑马纹' },
            { text: '尺寸', link: '/components/s-table/basic#尺寸' },
            { text: '高度与固定表头', link: '/components/s-table/basic#高度与固定表头' },
            { text: '固定行', link: '/components/s-table/basic#固定行' },
            { text: '空数据', link: '/components/s-table/basic#空数据' },
            { text: '加载状态', link: '/components/s-table/basic#加载状态' },
            { text: '自定义加载内容', link: '/components/s-table/basic#自定义加载内容' },
            { text: '国际化', link: '/components/s-table/basic#国际化' },
            { text: '标题与页脚', link: '/components/s-table/basic#标题与页脚' },
          ],
        },
        {
          text: '列与单元格',
          items: [
            { text: '取值方式', link: '/components/s-table/columns#取值方式' },
            {
              text: '类型安全的列 Helper',
              link: '/components/s-table/columns#类型安全的列-helper',
            },
            {
              text: '自定义 Header 与 Cell',
              link: '/components/s-table/columns#自定义-header-与-cell',
            },
            { text: 'Meta 扩展', link: '/components/s-table/columns#meta-扩展' },
            {
              text: '分组表头与单元格合并',
              link: '/components/s-table/columns#分组表头与单元格合并',
            },
            { text: '行分组与聚合', link: '/components/s-table/columns#行分组与聚合' },
            {
              text: '列 footer 与固定汇总',
              link: '/components/s-table/columns#列-footer-与固定汇总',
            },
            { text: '固定列', link: '/components/s-table/columns#固定列' },
            { text: '调整列宽', link: '/components/s-table/columns#调整列宽' },
            { text: '隐藏列', link: '/components/s-table/columns#隐藏列' },
            { text: '省略与 Tooltip', link: '/components/s-table/columns#省略与-tooltip' },
            { text: '表头通用菜单', link: '/components/s-table/columns#表头通用菜单' },
            {
              text: '自定义行 / 单元格 / 表头属性',
              link: '/components/s-table/columns#自定义行-单元格-表头属性',
            },
          ],
        },
        {
          text: '排序、过滤与搜索',
          items: [
            { text: '排序', link: '/components/s-table/sorting-filtering#排序' },
            { text: '过滤', link: '/components/s-table/sorting-filtering#过滤' },
            {
              text: '自定义过滤面板',
              link: '/components/s-table/sorting-filtering#自定义过滤面板',
            },
            { text: '列搜索', link: '/components/s-table/sorting-filtering#列搜索' },
            {
              text: '命令式清理与重置',
              link: '/components/s-table/sorting-filtering#命令式清理与重置状态',
            },
            {
              text: '客户端还是服务端',
              link: '/components/s-table/sorting-filtering#选择客户端还是服务端',
            },
          ],
        },
        {
          text: '分页与序号',
          items: [
            { text: '客户端分页', link: '/components/s-table/pagination#客户端分页' },
            { text: '分页位置', link: '/components/s-table/pagination#分页位置' },
            { text: '序号列', link: '/components/s-table/pagination#序号列' },
            { text: '服务端分页', link: '/components/s-table/pagination#服务端分页' },
            { text: '多位置与简洁模式', link: '/components/s-table/pagination#多位置与简洁模式' },
            {
              text: '标题、页脚与固定汇总',
              link: '/components/s-table/pagination#标题、页脚与固定汇总',
            },
          ],
        },
        {
          text: '行选择',
          items: [
            {
              text: '多选、单选与禁用行',
              link: '/components/s-table/selection#多选、单选与禁用行',
            },
            { text: '受控状态', link: '/components/s-table/selection#受控状态' },
            { text: '自定义批量选择', link: '/components/s-table/selection#自定义批量选择' },
            { text: '自定义选择单元格', link: '/components/s-table/selection#自定义选择单元格' },
            {
              text: '数据更新与跨页保留',
              link: '/components/s-table/selection#数据更新与跨页保留',
            },
            { text: '大数据选择意图', link: '/components/s-table/selection#大数据选择意图' },
            { text: '实例方法', link: '/components/s-table/selection#实例方法' },
            { text: '选择细节', link: '/components/s-table/selection#选择细节' },
          ],
        },
        {
          text: '展开行与树形',
          items: [
            { text: '展开行', link: '/components/s-table/expandable' },
            { text: '异步加载详情', link: '/components/s-table/expandable#异步加载详情' },
            { text: '自定义展开图标', link: '/components/s-table/expandable#自定义展开图标与位置' },
            { text: '树形数据', link: '/components/s-table/tree' },
            { text: '树拖拽', link: '/components/s-table/tree#树拖拽' },
          ],
        },
        {
          text: '编辑',
          items: [
            { text: '编辑列', link: '/components/s-table/editing#编辑列' },
            { text: '自定义编辑器', link: '/components/s-table/editing#自定义编辑器' },
            { text: '校验与生命周期', link: '/components/s-table/editing#校验与生命周期' },
            { text: '受控状态与实例方法', link: '/components/s-table/editing#受控状态和实例方法' },
            { text: 'Patch 提交', link: '/components/s-table/editing#patch-提交' },
          ],
        },
        {
          text: '虚拟滚动',
          items: [
            { text: '基础虚拟列表', link: '/components/s-table/virtual#基础虚拟列表' },
            { text: '固定行高快路径', link: '/components/s-table/virtual#固定行高快路径' },
            { text: '动态行高', link: '/components/s-table/virtual#动态行高' },
            { text: '横向与双向虚拟化', link: '/components/s-table/virtual#横向与双向虚拟化' },
            { text: '滚动触底', link: '/components/s-table/virtual#滚动触底' },
            { text: '实例滚动', link: '/components/s-table/virtual#实例滚动' },
            {
              text: '函数式行高与 autoHeight',
              link: '/components/s-table/virtual#函数式行高与-autoheight',
            },
          ],
        },
        {
          text: '框选、右键菜单与事件',
          items: [
            {
              text: '单元格与行范围选择',
              link: '/components/s-table/interactions#单元格与行范围选择',
            },
            { text: '复制框选内容', link: '/components/s-table/interactions#复制框选内容' },
            { text: '基础右键菜单', link: '/components/s-table/interactions#基础右键菜单' },
            { text: '动态业务菜单', link: '/components/s-table/interactions#动态业务菜单' },
            { text: '原生交互事件', link: '/components/s-table/interactions#原生交互事件' },
            {
              text: '键盘框选与多区间 API',
              link: '/components/s-table/interactions#键盘框选与多区间-api',
            },
            { text: '自定义浮层容器', link: '/components/s-table/interactions#自定义浮层容器' },
            { text: '事件清单', link: '/components/s-table/events#事件清单' },
          ],
        },
        {
          text: '拖拽',
          items: [
            { text: '列拖拽', link: '/components/s-table/drag#列拖拽' },
            { text: '列拖拽动画', link: '/components/s-table/drag#列拖拽动画' },
            { text: '行拖拽', link: '/components/s-table/drag#行拖拽' },
            { text: '行拖拽动画', link: '/components/s-table/drag#行拖拽动画' },
            { text: '拖拽权限', link: '/components/s-table/drag#拖拽权限' },
            { text: '自定义拖拽句柄', link: '/components/s-table/drag#自定义拖拽句柄' },
            { text: '命令式列顺序', link: '/components/s-table/drag#命令式列顺序' },
            { text: '整行拖拽与自定义预览', link: '/components/s-table/drag#整行拖拽与自定义预览' },
          ],
        },
        {
          text: '导入与导出',
          items: [
            { text: '实例 API', link: '/components/s-table/export#实例-api' },
            { text: '导出示例', link: '/components/s-table/export#导出示例' },
            { text: '读取数据快照', link: '/components/s-table/export#读取数据快照' },
            { text: '接入 xlsx / exceljs', link: '/components/s-table/export#接入-xlsx-exceljs' },
            { text: '导入', link: '/components/s-table/export#导入' },
          ],
        },
        {
          text: '样式与主题',
          items: [
            { text: 'CSS Variables', link: '/components/s-table/css#css-variables' },
            { text: '局部主题', link: '/components/s-table/css#局部主题' },
            { text: '多实例主题隔离', link: '/components/s-table/css#多实例主题隔离' },
            { text: '主题预设', link: '/components/s-table/css#主题预设' },
            { text: '浮层主题继承', link: '/components/s-table/css#浮层主题继承' },
            { text: '主题模式', link: '/components/s-table/css#主题模式' },
            {
              text: '语义化 Styles 与 Classes',
              link: '/components/s-table/css#语义化-styles-与-classes',
            },
            { text: 'CSS Class 稳定性', link: '/components/s-table/css#css-class-稳定性' },
          ],
        },
        {
          text: '插槽',
          items: [
            { text: '插槽总览', link: '/components/s-table/slots#插槽总览' },
            { text: 'empty / emptyAction', link: '/components/s-table/slots#empty' },
            { text: 'loading', link: '/components/s-table/slots#loading' },
            { text: 'expandedRowRender', link: '/components/s-table/slots#expandedrowrender' },
            { text: 'contextMenu', link: '/components/s-table/slots#contextmenu' },
            { text: 'scrollToBottom', link: '/components/s-table/slots#scrolltobottom' },
            { text: 'rowDragHandle', link: '/components/s-table/slots#rowdraghandle' },
            { text: 'cellEditor', link: '/components/s-table/slots#celleditor' },
            { text: 'filterPanel', link: '/components/s-table/slots#filterpanel' },
            { text: 'groupRow', link: '/components/s-table/slots#grouprow' },
            { text: 'summary', link: '/components/s-table/slots#summary' },
            { text: 'footer', link: '/components/s-table/slots#footer' },
          ],
        },
        {
          text: '服务端数据',
          items: [
            { text: '完整示例', link: '/components/s-table/server-side' },
            { text: '三个手动开关', link: '/components/s-table/server-side#三个手动开关' },
            { text: '请求状态模型', link: '/components/s-table/server-side#请求状态模型' },
            { text: '服务端过滤', link: '/components/s-table/server-side#服务端过滤' },
            { text: '并发请求', link: '/components/s-table/server-side#并发请求' },
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
