import type { STableRowKey, STableSelectionIntent } from '../types/row';
import { sameValues } from '../utils/same';
import { encodeRowKey } from '../utils/resolveRowKey';

export type STableSelectionType = 'checkbox' | 'radio';

export const EMPTY_SELECTION_INTENT: STableSelectionIntent = {
  mode: 'include',
  includedRowKeys: [],
};

export const cloneSelectionIntent = (intent: STableSelectionIntent): STableSelectionIntent =>
  intent.mode === 'all'
    ? { mode: 'all', excludedRowKeys: [...intent.excludedRowKeys] }
    : { mode: 'include', includedRowKeys: [...intent.includedRowKeys] };

export const sameSelectionIntent = (
  left: STableSelectionIntent | undefined,
  right: STableSelectionIntent
): boolean => {
  if (!left || left.mode !== right.mode) return false;
  const leftKeys = left.mode === 'all' ? left.excludedRowKeys : left.includedRowKeys;
  const rightKeys = right.mode === 'all' ? right.excludedRowKeys : right.includedRowKeys;
  return sameValues(leftKeys, rightKeys);
};

export const normalizeSelectionIntent = (
  intent: STableSelectionIntent,
  selectionType: STableSelectionType = 'checkbox'
): STableSelectionIntent => {
  if (selectionType === 'radio') {
    return intent.mode === 'include'
      ? { mode: 'include', includedRowKeys: intent.includedRowKeys.slice(0, 1) }
      : cloneSelectionIntent(EMPTY_SELECTION_INTENT);
  }
  const keys = intent.mode === 'all' ? intent.excludedRowKeys : intent.includedRowKeys;
  const seen = new Set<string>();
  const unique = keys.filter((key) => {
    const identity = encodeRowKey(key);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
  return intent.mode === 'all'
    ? { mode: 'all', excludedRowKeys: unique }
    : { mode: 'include', includedRowKeys: unique };
};

export const updateSelectionIntentRows = (
  current: STableSelectionIntent,
  keys: readonly STableRowKey[],
  selected: boolean,
  selectionType: STableSelectionType = 'checkbox'
): STableSelectionIntent => {
  if (selectionType === 'radio') {
    return selected && keys[0] !== undefined
      ? { mode: 'include', includedRowKeys: [keys[0]] }
      : cloneSelectionIntent(EMPTY_SELECTION_INTENT);
  }
  const currentKeys = new Map<string, STableRowKey>();
  const exceptions = current.mode === 'all' ? current.excludedRowKeys : current.includedRowKeys;
  for (const key of exceptions) currentKeys.set(encodeRowKey(key), key);
  for (const key of keys) {
    const identity = encodeRowKey(key);
    const shouldBeException = current.mode === 'all' ? !selected : selected;
    if (shouldBeException) currentKeys.set(identity, key);
    else currentKeys.delete(identity);
  }
  const nextKeys = [...currentKeys.values()];
  return current.mode === 'all'
    ? { mode: 'all', excludedRowKeys: nextKeys }
    : { mode: 'include', includedRowKeys: nextKeys };
};
