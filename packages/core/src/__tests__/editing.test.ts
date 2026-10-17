import { describe, expect, it } from 'vitest';
import {
  applyEditingValues,
  cloneEditingState,
  isColumnEditable,
  replaceRecordInTree,
  sameEditingState,
} from '../index';

interface Node {
  id: number;
  name: string;
  profile?: { city: string };
  children?: Node[];
}

describe('framework-agnostic editing primitives', () => {
  it('clones editing state without sharing the values object', () => {
    const state = { mode: 'cell' as const, rowKey: 1, columnId: 'name', values: { name: 'Ada' } };
    const clone = cloneEditingState(state)!;

    expect(clone).toEqual(state);
    expect(clone).not.toBe(state);
    expect(clone.values).not.toBe(state.values);
    expect(cloneEditingState(null)).toBeNull();
  });

  it('compares editing transactions by mode, target and values', () => {
    const snapshot = {
      mode: 'cell' as const,
      rowKey: 1,
      columnId: 'name',
      values: { name: 'Ada' },
    };

    expect(sameEditingState({ ...snapshot, values: { ...snapshot.values } }, snapshot)).toBe(true);
    expect(sameEditingState({ ...snapshot, values: { name: 'Grace' } }, snapshot)).toBe(false);
    expect(
      sameEditingState({ ...snapshot, columnId: 'other', values: { name: 'Ada' } }, snapshot)
    ).toBe(false);
    expect(sameEditingState(null, snapshot)).toBe(false);
  });

  it('requires both an explicit editable switch and a write entry', () => {
    const record: Node = { id: 1, name: 'Ada' };

    expect(isColumnEditable({ editable: true, accessorKey: 'name' }, record, 0)).toBe(true);
    expect(isColumnEditable({ editable: true, valueSetter: () => record }, record, 0)).toBe(true);
    expect(isColumnEditable({ editable: false, accessorKey: 'name' }, record, 0)).toBe(false);
    expect(isColumnEditable({ editable: true }, record, 0)).toBe(false);
    expect(isColumnEditable(undefined, record, 0)).toBe(false);
    expect(
      isColumnEditable({ editable: (row: Node) => row.id === 1, accessorKey: 'name' }, record, 0)
    ).toBe(true);
    expect(
      isColumnEditable({ editable: (row: Node) => row.id === 2, accessorKey: 'name' }, record, 0)
    ).toBe(false);
  });

  it('replaces records immutably in flat and tree data sources', () => {
    const flat: Node[] = [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
    ];
    const flatResult = replaceRecordInTree(
      flat,
      flat[0]!,
      { ...flat[0]!, name: 'Ada Lovelace' },
      undefined
    );

    expect(flatResult.found).toBe(true);
    expect(flatResult.found && flatResult.data[0]!.name).toBe('Ada Lovelace');
    expect(flatResult.found && flatResult.data[1]).toBe(flat[1]);

    const tree: Node[] = [
      {
        id: 1,
        name: 'Parent',
        children: [{ id: 2, name: 'Child' }],
      },
      { id: 3, name: 'Sibling' },
    ];
    const child = tree[0]!.children![0]!;
    const treeResult = replaceRecordInTree(
      tree,
      child,
      { ...child, name: 'Child 2' },
      {
        childrenColumnName: 'children',
      }
    );

    expect(treeResult.found).toBe(true);
    expect(treeResult.found && treeResult.data[0]!.children![0]!.name).toBe('Child 2');
    expect(treeResult.found && treeResult.data[0]).not.toBe(tree[0]);
    expect(treeResult.found && treeResult.data[1]).toBe(tree[1]);
    expect(tree[0]!.children![0]!.name).toBe('Child');
  });

  it('writes draft values through valueSetter or safe accessor paths', () => {
    const record: Node = { id: 1, name: 'Ada', profile: { city: 'Paris' } };
    const getColumn = (columnId: string) =>
      columnId === 'name'
        ? { accessorKey: 'name' }
        : columnId === 'city'
          ? { accessorKey: 'profile.city' }
          : columnId === 'id'
            ? { valueSetter: (row: Node, value: unknown) => ({ ...row, id: Number(value) }) }
            : undefined;

    const next = applyEditingValues(record, { name: 'Grace', city: 'London', id: 9 }, getColumn);

    expect(next).toEqual({ id: 9, name: 'Grace', profile: { city: 'London' } });
    expect(next).not.toBe(record);
    expect(record.profile!.city).toBe('Paris');
  });
});
