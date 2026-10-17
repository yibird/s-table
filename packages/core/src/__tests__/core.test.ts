import { describe, expect, it, vi } from 'vitest';
import {
  cloneSelectionIntent,
  createRowIdAllocator,
  encodeRowKey,
  getPath,
  normalizeSelectionIntent,
  parseSafePath,
  setImmutablePath,
  updateSelectionIntentRows,
} from '../index';

describe('core utilities', () => {
  it('keeps row key types distinct', () => {
    expect(encodeRowKey(1)).not.toBe(encodeRowKey('1'));
  });

  it('restarts duplicate row id allocation for each row-model build', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const source = [{ id: 1 }, { id: 1 }];
    const allocator = createRowIdAllocator();
    allocator.resetForBuild(source);
    const firstBuild = [allocator.alloc('n:1', 1), allocator.alloc('n:1', 1)];
    allocator.resetForBuild(source);
    const secondBuild = [allocator.alloc('n:1', 1), allocator.alloc('n:1', 1)];

    expect(secondBuild).toEqual(firstBuild);
    warn.mockRestore();
  });

  it('normalizes and updates selection intent without mutating input', () => {
    const input = { mode: 'include' as const, includedRowKeys: [1, 1, '1'] };
    const normalized = normalizeSelectionIntent(input);
    expect(normalized).toEqual({ mode: 'include', includedRowKeys: [1, '1'] });
    expect(input.includedRowKeys).toEqual([1, 1, '1']);
    expect(updateSelectionIntentRows(normalized, [1], false)).toEqual({
      mode: 'include',
      includedRowKeys: ['1'],
    });
    expect(cloneSelectionIntent(normalized)).not.toBe(normalized);
  });

  it('protects object paths and preserves immutable branches', () => {
    expect(() => parseSafePath('__proto__.polluted')).toThrow();
    const source = { profile: { name: 'old' } };
    const next = setImmutablePath(source, 'profile.name', 'new');
    expect(next).toEqual({ profile: { name: 'new' } });
    expect(next).not.toBe(source);
    expect(next.profile).not.toBe(source.profile);
  });

  it('reads only own properties at each level and preserves literal key priority', () => {
    const inherited = Object.create({ name: 'inherited' });
    expect(getPath(inherited, 'name')).toBeUndefined();
    expect(getPath({ profile: inherited }, ['profile', 'name'])).toBeUndefined();
    expect(getPath({}, 'toString')).toBeUndefined();
    expect(
      getPath({ 'profile.name': 'literal', profile: { name: 'nested' } }, 'profile.name')
    ).toBe('literal');
    expect(getPath({ addresses: [{ city: 'London' }] }, 'addresses.0.city')).toBe('London');
  });
});
