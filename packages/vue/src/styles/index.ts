/**
 * 样式聚合入口：less 侧统一在 index.less 声明（与消费方的 import 面一致），
 * TS 侧只导入该文件，避免两处入口清单漂移。
 */
import './index.less';
