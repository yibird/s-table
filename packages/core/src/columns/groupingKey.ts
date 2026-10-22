/**
 * 分组键类型标记。
 *
 * TanStack 使用 `` `${groupingValue}` `` 作为分组 Map key，数字 `1` 与字符串 `'1'`、
 * `null` 与 `'null'` 会被合并。这里对非字符串原始值加类型前缀，既保持字符串分组值
 * 的兼容性（现有 API/显示不变），又避免不同类型互相串组。
 */
const GROUPING_KEY_PREFIX = '__s_table_group__';

/** 把分组值编码为 TanStack 可区分类型的字符串 key。 */
export const encodeGroupingValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null) return `${GROUPING_KEY_PREFIX}null`;
  if (value === undefined) return `${GROUPING_KEY_PREFIX}undefined`;
  if (typeof value === 'number') return `${GROUPING_KEY_PREFIX}number:${String(value)}`;
  if (typeof value === 'boolean') return `${GROUPING_KEY_PREFIX}boolean:${String(value)}`;
  if (typeof value === 'bigint') return `${GROUPING_KEY_PREFIX}bigint:${String(value)}`;
  return `${GROUPING_KEY_PREFIX}${typeof value}:${String(value)}`;
};

/** 把编码后的分组 key 还原为对外展示的原始值。 */
export const decodeGroupingValue = (value: unknown): unknown => {
  if (typeof value !== 'string' || !value.startsWith(GROUPING_KEY_PREFIX)) return value;
  const rest = value.slice(GROUPING_KEY_PREFIX.length);
  if (rest === 'null') return null;
  if (rest === 'undefined') return undefined;
  const separator = rest.indexOf(':');
  if (separator < 0) return value;
  const type = rest.slice(0, separator);
  const raw = rest.slice(separator + 1);
  if (type === 'number') {
    const number = Number(raw);
    return Number.isNaN(number) ? value : number;
  }
  if (type === 'boolean') return raw === 'true';
  if (type === 'bigint') {
    try {
      return BigInt(raw);
    } catch {
      return value;
    }
  }
  return value;
};
