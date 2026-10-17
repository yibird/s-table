import type { STableRowData, STableRowKey, STableRowKeyField } from '../types/row';

/** 检查值是否为有效的行标识（排除 NaN、Infinity、-0 等边界值）。 */
const isValidRowKeyValue = (value: unknown): value is string | number => {
  if (typeof value === 'string') return true;
  if (typeof value === 'number') {
    // NaN / Infinity / -Infinity 会导致编码碰撞
    if (!Number.isFinite(value)) return false;
    // -0 和 0 的 String() 结果相同，视为无效以避免 rowsById 冲突
    if (Object.is(value, -0)) return false;
    return true;
  }
  return false;
};

export interface ResolveRowKeyOptions {
  onInvalid?: (message: string) => void;
}

/**
 * 从行数据中提取唯一标识。
 *
 * @param record 行数据。
 * @param index 行索引（rowKey 未提供时的 fallback）。
 * @param rowKey 行标识配置，支持函数或属性名。
 * @returns 行唯一标识。
 */
export function resolveRowKey<TData extends STableRowData>(
  record: TData,
  index: number,
  rowKey?: STableRowKeyField<TData> | ((record: TData) => STableRowKey) | undefined,
  options: Readonly<ResolveRowKeyOptions> = {}
): STableRowKey {
  if (typeof rowKey === 'function') {
    const value = rowKey(record);
    if (isValidRowKeyValue(value)) return value;
    // NaN / Infinity / -0 等无效值回退到索引，避免 rowsById 冲突
    if (typeof value === 'number' || typeof value === 'string') {
      options.onInvalid?.(
        `[STable] rowKey 函数返回了无效值 ${String(value)}（第 ${index} 行），已回退到索引。`
      );
      return index;
    }
    throw new TypeError('[STable] `rowKey` 函数必须返回 string 或 number。');
  }
  if (typeof rowKey === 'string') {
    // 防御原型链属性（如 constructor、toString）：仅检查自有属性
    if (!Object.prototype.hasOwnProperty.call(record, rowKey)) {
      options.onInvalid?.(
        `[STable] 数据行缺少自有属性 "${rowKey}"（第 ${index} 行），已回退到索引。`
      );
      return index;
    }
    const value = record[rowKey as keyof TData];
    if (isValidRowKeyValue(value)) return value;
    if (typeof value === 'number' || typeof value === 'string') {
      options.onInvalid?.(
        `[STable] rowKey 字段 "${rowKey}" 的值 ${String(value)} 无效（第 ${index} 行），已回退到索引。`
      );
      return index;
    }
    throw new TypeError(`[STable] 数据行缺少有效的 rowKey 字段 "${rowKey}"。`);
  }
  return index;
}

/** 类型前缀保证数字和同文本字符串拥有不同且可逆的 TanStack row.id。 */
export const encodeRowKey = (key: STableRowKey): string =>
  typeof key === 'number' ? `n:${key}` : `s:${key}`;

/** 重复业务 key 的内部区分符；解码时剥掉，公开 API 仍看到原始 rowKey。 */
const ROW_ID_DISAMBIGUATOR = '\0';

/** 同一公开 key 第 2 次出现起追加后缀，避免 TanStack `rowsById` 互相覆盖。 */
export const disambiguateRowId = (baseId: string, occurrence: number): string =>
  occurrence <= 1 ? baseId : `${baseId}${ROW_ID_DISAMBIGUATOR}${occurrence}`;

/**
 * 从 STable 写入 TanStack 的内部 row.id 恢复公开 key。
 *
 * 行模型创建时已经执行过一次用户 rowKey；后续渲染、选择和展开直接解码 row.id，
 * 可避免在可见行/选中行热路径重复调用业务函数，并保证同一 Row 的身份始终一致。
 * `s:` 后的内容无需额外转义：解码只移除首个类型前缀，其余字符均属于原始 key。
 */
export const decodeRowKey = (rowId: string): STableRowKey => {
  const separator = rowId.indexOf(ROW_ID_DISAMBIGUATOR);
  const encoded = separator === -1 ? rowId : rowId.slice(0, separator);
  if (encoded.startsWith('s:')) return encoded.slice(2);
  if (encoded.startsWith('n:')) {
    const numeric = Number(encoded.slice(2));
    if (Number.isFinite(numeric)) return numeric;
  }
  // 防御高级用户注入的非 STable row.id，不对未知编码做猜测性转换。
  return encoded;
};

/** 在一次 data 引用的行模型构建中分配唯一 row.id，并对重复业务 key 告警一次。 */
export const createRowIdAllocator = () => {
  let source: readonly unknown[] | undefined;
  const counts = new Map<string, number>();
  let warnedDuplicate = false;

  /** Row Model 每次重建都重新按遍历顺序分配重复 key 的后缀。 */
  const resetForBuild = (next: readonly unknown[]) => {
    source = next;
    counts.clear();
  };

  return {
    resetIfSourceChanged(next: readonly unknown[]) {
      if (next !== source) resetForBuild(next);
    },
    resetForBuild,
    alloc(baseId: string, publicKey?: STableRowKey): string {
      const occurrence = (counts.get(baseId) ?? 0) + 1;
      counts.set(baseId, occurrence);
      const id = disambiguateRowId(baseId, occurrence);
      if (occurrence === 2 && !warnedDuplicate) {
        warnedDuplicate = true;
        console.warn(
          `[STable] 检测到重复的 rowKey "${publicKey ?? baseId}"。行标识必须在整棵树中唯一，否则选择、展开和虚拟滚动状态会互相覆盖。`
        );
      }
      return id;
    },
  };
};
