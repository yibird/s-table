import type { STableRowData } from '../types/row';

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const ARRAY_INDEX_PATTERN = /^(0|[1-9]\d*)$/;

type MutableContainer = Record<string, unknown> | unknown[];

const getContainerValue = (container: MutableContainer, key: string): unknown =>
  (container as Record<string, unknown>)[key];

const setContainerValue = (container: MutableContainer, key: string, value: unknown): void => {
  (container as Record<string, unknown>)[key] = value;
};

const isContainer = (value: unknown): value is MutableContainer =>
  value !== null && typeof value === 'object';

const createContainer = (nextKey: string): MutableContainer =>
  ARRAY_INDEX_PATTERN.test(nextKey) ? [] : {};

const cloneContainer = (value: unknown, nextKey: string): MutableContainer => {
  if (Array.isArray(value)) return [...value];
  if (isContainer(value)) return { ...value };
  return createContainer(nextKey);
};

/** 解析并校验点路径，拒绝空片段与原型链写入。 */
export const parseSafePath = (path: string, label = '字段路径'): readonly string[] => {
  const keys = path.split('.');
  if (keys.some((key) => !key || UNSAFE_PATH_SEGMENTS.has(key))) {
    throw new Error(`${label} "${path}" 非法。`);
  }
  return keys;
};

/** 按安全路径读取字段；完整字段名优先于点路径，并且不会沿原型链取值。 */
export const getPath = (target: STableRowData, path: string | readonly string[]): unknown => {
  if (typeof path === 'string' && Object.prototype.hasOwnProperty.call(target, path)) {
    return (target as Record<string, unknown>)[path];
  }
  let cursor: unknown = target;
  for (const key of typeof path === 'string' ? parseSafePath(path) : path) {
    if (
      cursor == null ||
      typeof cursor !== 'object' ||
      !Object.prototype.hasOwnProperty.call(cursor, key)
    ) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
};

/** 向构建中的普通对象/数组写入点路径。 */
export const setMutablePath = (
  target: MutableContainer,
  keys: readonly string[],
  value: unknown
): void => {
  let cursor = target;
  for (let index = 0; index < keys.length - 1; index++) {
    const key = keys[index]!;
    const nextKey = keys[index + 1]!;
    const current = getContainerValue(cursor, key);
    if (!isContainer(current)) setContainerValue(cursor, key, createContainer(nextKey));
    cursor = getContainerValue(cursor, key) as MutableContainer;
  }
  setContainerValue(cursor, keys.at(-1)!, value);
};

/**
 * 不可变写入已校验的路径片段，并保留路径上已有数组的数组类型。
 *
 * 供已持有 `parseSafePath` 产物的调用方复用，避免每行重复 join + 重解析。
 */
export const setImmutablePathSegments = <TValue extends object>(
  source: TValue,
  keys: readonly string[],
  value: unknown
): TValue => {
  const root = cloneContainer(source, keys[0]!);
  let sourceCursor: unknown = source;
  let targetCursor = root;

  for (let index = 0; index < keys.length - 1; index++) {
    const key = keys[index]!;
    const nextKey = keys[index + 1]!;
    const sourceChild = isContainer(sourceCursor)
      ? getContainerValue(sourceCursor, key)
      : undefined;
    const targetChild = cloneContainer(sourceChild, nextKey);
    setContainerValue(targetCursor, key, targetChild);
    sourceCursor = sourceChild;
    targetCursor = targetChild;
  }
  setContainerValue(targetCursor, keys.at(-1)!, value);
  return root as TValue;
};

/** 不可变写入点路径，并保留路径上已有数组的数组类型。 */
export const setImmutablePath = <TValue extends object>(
  source: TValue,
  path: string,
  value: unknown
): TValue => setImmutablePathSegments(source, parseSafePath(path, '编辑字段路径'), value);
