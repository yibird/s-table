import type { InjectionKey, Ref } from 'vue';
import type { STableSize } from '../types';

/** 组件尺寸（与 Table size 保持一致） */
export type SComponentSize = STableSize;

/** Table 向子组件注入尺寸的 Context Key */
export const SizeContextKey: InjectionKey<Readonly<Ref<SComponentSize>>> = Symbol('STableSize');
