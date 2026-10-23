import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  MAX_COLUMN_DEPTH,
  resolveSafeColumnChildren,
  walkColumnTree,
  type ColumnTreeNode,
} from '../utils/columnTree';
import { getTreeChildren, setTreeChildren } from '../utils/tree';
import {
  createRowIdAllocator,
  decodeRowKey,
  disambiguateRowId,
  encodeRowKey,
  resolveRowKey,
} from '../utils/resolveRowKey';
import {
  cloneSelectionIntent,
  normalizeSelectionIntent,
  sameSelectionIntent,
  updateSelectionIntentRows,
} from '../state/selectionIntent';
import { encodeGroupingValue, decodeGroupingValue } from '../columns/groupingKey';
import { scheduleAnimationFrame } from '../utils/scheduler';
import { downloadBlob } from '../export/download';
import { createFlipDropController } from '../interaction/flipDrop';
import { createFlipAnimation } from '../interaction/flipAnimation';

describe('grouping key 编解码', () => {
  it('字符串保持原样，其他类型加前缀后可逆', () => {
    expect(encodeGroupingValue('技术部')).toBe('技术部');
    expect(encodeGroupingValue(1)).not.toBe(encodeGroupingValue('1'));
    expect(decodeGroupingValue(encodeGroupingValue(1))).toBe(1);
    expect(decodeGroupingValue(encodeGroupingValue('1'))).toBe('1');
    expect(decodeGroupingValue(encodeGroupingValue(null))).toBeNull();
    expect(decodeGroupingValue(encodeGroupingValue(undefined))).toBeUndefined();
    expect(decodeGroupingValue(encodeGroupingValue(true))).toBe(true);
    expect(decodeGroupingValue(encodeGroupingValue(10n))).toBe(10n);
  });

  it('未知或损坏的编码返回原值', () => {
    expect(decodeGroupingValue('普通文本')).toBe('普通文本');
    expect(decodeGroupingValue('__s_table_group__unknown')).toBe('__s_table_group__unknown');
    expect(decodeGroupingValue('__s_table_group__number:not-a-number')).toBe(
      '__s_table_group__number:not-a-number'
    );
    expect(decodeGroupingValue('__s_table_group__number:NaN')).toBe('__s_table_group__number:NaN');
    expect(decodeGroupingValue('__s_table_group__bigint:abc')).toBe('__s_table_group__bigint:abc');
    expect(decodeGroupingValue('__s_table_group__custom:value')).toBe(
      '__s_table_group__custom:value'
    );
  });
});

describe('列树遍历', () => {
  interface Node extends ColumnTreeNode<Node> {
    id: string;
  }
  const leaf = (id: string): Node => ({ id });

  it('按声明顺序前序遍历并给出子列', () => {
    const tree: Node[] = [{ id: 'a', columns: [leaf('a1'), leaf('a2')] }, leaf('b')];
    const visited: Array<[string, number, string[]]> = [];
    walkColumnTree(tree, (node, depth, children) => {
      visited.push([node.id, depth, children.map((child) => child.id)]);
    });
    expect(visited).toEqual([
      ['a', 0, ['a1', 'a2']],
      ['a1', 1, []],
      ['a2', 1, []],
      ['b', 0, []],
    ]);
  });

  it('过滤循环引用并通过 onUnsafe 通知', () => {
    const cyclic: Node = { id: 'cycle' };
    cyclic.columns = [cyclic, leaf('ok')];
    const onUnsafe = vi.fn();
    const visited: string[] = [];
    walkColumnTree([cyclic], (node) => visited.push(node.id), { onUnsafe });
    expect(visited).toEqual(['cycle', 'ok']);
    expect(onUnsafe).toHaveBeenCalled();
  });

  it('达到最大深度后停止下钻', () => {
    const deep: Node = { id: 'l0', columns: [{ id: 'l1', columns: [{ id: 'l2' }] }] };
    const onUnsafe = vi.fn();
    const visited: string[] = [];
    walkColumnTree([deep], (node) => visited.push(node.id), { maxDepth: 2, onUnsafe });
    expect(visited).toEqual(['l0', 'l1']);
    expect(onUnsafe).toHaveBeenCalled();
  });

  it('resolveSafeColumnChildren 对非数组子列返回空集合', () => {
    const node = { id: 'x', columns: undefined } as Node;
    const result = resolveSafeColumnChildren(node, 0, new Set());
    expect(result.children).toEqual([]);
    expect(MAX_COLUMN_DEPTH).toBeGreaterThan(0);
  });
});

describe('树形数据读写', () => {
  it('支持字段名与自定义 getChildren/setChildren', () => {
    const record = { id: 1, children: [{ id: 2 }] };
    expect(getTreeChildren(record, {})).toEqual([{ id: 2 }]);
    expect(getTreeChildren(record, undefined)).toBeUndefined();
    expect(
      getTreeChildren({ id: 1 } as { id: number }, { childrenColumnName: 'missing' })
    ).toBeUndefined();

    const custom = { id: 1, nodes: [{ id: 2 }] };
    expect(getTreeChildren(custom, { childrenColumnName: 'nodes' })).toEqual([{ id: 2 }]);

    const updated = setTreeChildren(record, {}, [{ id: 3 } as never]);
    expect(updated).not.toBe(record);
    expect(updated.children).toEqual([{ id: 3 }]);

    const customUpdated = setTreeChildren(
      custom,
      {
        childrenColumnName: 'nodes',
        setChildren: (node, children) => ({ ...node, nodes: children }),
      },
      [{ id: 4 } as never]
    );
    expect(customUpdated.nodes).toEqual([{ id: 4 }]);
  });
});

describe('行键解析与分配', () => {
  const onInvalid = vi.fn();
  afterEach(() => onInvalid.mockReset());

  it('支持字段、函数与索引回退', () => {
    expect(resolveRowKey({ id: 1 }, 0, 'id')).toBe(1);
    expect(resolveRowKey({ id: 'x' }, 0, (record) => record.id)).toBe('x');
    expect(resolveRowKey({ name: 'a' }, 2)).toBe(2);

    expect(resolveRowKey({ id: Number.NaN }, 3, 'id', { onInvalid })).toBe(3);
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(resolveRowKey({ id: -0 }, 4, 'id', { onInvalid })).toBe(4);
    expect(resolveRowKey({}, 5, 'id', { onInvalid })).toBe(5);
    expect(() => resolveRowKey({}, 0, () => null as never)).toThrow(TypeError);
    expect(resolveRowKey({}, 0, 'absent')).toBe(0);
    expect(() => resolveRowKey({ id: {} } as { id: string }, 0, 'id')).toThrow(TypeError);
  });

  it('编码、解码与重复 id 消歧', () => {
    expect(encodeRowKey(1)).toBe('n:1');
    expect(encodeRowKey('1')).toBe('s:1');
    expect(decodeRowKey('n:1')).toBe(1);
    expect(decodeRowKey('s:1')).toBe('1');
    expect(decodeRowKey('unknown')).toBe('unknown');
    expect(disambiguateRowId('s:a', 1)).toBe('s:a');
    expect(disambiguateRowId('s:a', 2)).toContain('s:a');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const allocator = createRowIdAllocator();
    expect(allocator.alloc('s:a', 'a')).toBe('s:a');
    expect(allocator.alloc('s:a', 'a')).not.toBe('s:a');
    expect(warn).toHaveBeenCalledTimes(1);
    allocator.resetForBuild([]);
    expect(allocator.alloc('s:a', 'a')).toBe('s:a');
    warn.mockRestore();
  });
});

describe('选择意图状态机', () => {
  it('克隆与相等比较', () => {
    const include = { mode: 'include' as const, includedRowKeys: [1, 2] };
    const clone = cloneSelectionIntent(include);
    expect(clone).toEqual(include);
    expect(clone).not.toBe(include);
    expect(sameSelectionIntent(include, { mode: 'include', includedRowKeys: [1, 2] })).toBe(true);
    expect(sameSelectionIntent(include, { mode: 'include', includedRowKeys: [1] })).toBe(false);
    expect(sameSelectionIntent(undefined, include)).toBe(false);
    expect(
      sameSelectionIntent(
        { mode: 'all', excludedRowKeys: ['a'] },
        { mode: 'all', excludedRowKeys: ['a'] }
      )
    ).toBe(true);
  });

  it('radio 只保留一个键', () => {
    expect(
      normalizeSelectionIntent({ mode: 'include', includedRowKeys: [1, 2, 2, 3] }, 'radio')
    ).toEqual({ mode: 'include', includedRowKeys: [1] });
    expect(normalizeSelectionIntent({ mode: 'all', excludedRowKeys: [1] }, 'radio')).toEqual({
      mode: 'include',
      includedRowKeys: [],
    });
    expect(
      updateSelectionIntentRows({ mode: 'include', includedRowKeys: [1] }, [2], true, 'radio')
    ).toEqual({ mode: 'include', includedRowKeys: [2] });
    expect(
      updateSelectionIntentRows({ mode: 'include', includedRowKeys: [1] }, [2], false, 'radio')
    ).toEqual({ mode: 'include', includedRowKeys: [] });
  });

  it('checkbox 去重并按 all/include 维护例外键', () => {
    expect(normalizeSelectionIntent({ mode: 'include', includedRowKeys: [1, '1', 1, 2] })).toEqual({
      mode: 'include',
      includedRowKeys: [1, '1', 2],
    });

    let intent = updateSelectionIntentRows({ mode: 'include', includedRowKeys: [] }, [1, 2], true);
    expect(intent).toEqual({ mode: 'include', includedRowKeys: [1, 2] });
    intent = updateSelectionIntentRows(intent, [1], false);
    expect(intent).toEqual({ mode: 'include', includedRowKeys: [2] });

    intent = { mode: 'all', excludedRowKeys: [3] };
    intent = updateSelectionIntentRows(intent, [4], false);
    expect(intent).toEqual({ mode: 'all', excludedRowKeys: [3, 4] });
    intent = updateSelectionIntentRows(intent, [4], true);
    expect(intent).toEqual({ mode: 'all', excludedRowKeys: [3] });
  });
});

describe('调度与下载', () => {
  it('没有 rAF 时用微任务调度并支持取消', async () => {
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    Reflect.set(globalThis, 'requestAnimationFrame', undefined);
    Reflect.set(globalThis, 'cancelAnimationFrame', undefined);
    try {
      const run = vi.fn();
      scheduleAnimationFrame(run);
      await Promise.resolve();
      expect(run).toHaveBeenCalledTimes(1);

      const cancelled = vi.fn();
      scheduleAnimationFrame(cancelled).cancel();
      await Promise.resolve();
      expect(cancelled).not.toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  });

  it('downloadBlob 在非浏览器环境安全降级', () => {
    expect(downloadBlob(new Blob(['x']), 'x.csv')).toBe(false);
  });

  it('downloadBlob 创建并清理下载链接', async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { href: '', download: '', style: {} as CSSStyleDeclaration, click, remove };
    const originalDocument = globalThis.document;
    const originalUrl = globalThis.URL;
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Reflect.set(globalThis, 'document', {
      createElement: () => anchor,
      body: { appendChild: vi.fn() },
    });
    Reflect.set(globalThis, 'URL', { createObjectURL, revokeObjectURL });
    try {
      expect(downloadBlob(new Blob(['x']), 'data.csv')).toBe(true);
      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(remove).toHaveBeenCalled();
      expect(anchor.download).toBe('data.csv');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    } finally {
      Reflect.set(globalThis, 'document', originalDocument);
      Reflect.set(globalThis, 'URL', originalUrl);
    }
  });
});

describe('FLIP 动画与投放编排', () => {
  const makeElement = (top: number) => {
    const history: string[] = [];
    const style = {
      transition: '',
      willChange: '',
      get transform() {
        return '';
      },
      set transform(value: string) {
        history.push(value);
      },
    };
    const element = {
      style,
      history,
      getBoundingClientRect: () => ({ top, left: top }) as DOMRect,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    return element;
  };

  it('捕获位置、计算位移并清理动画状态', () => {
    const a = makeElement(0);
    const b = makeElement(50);
    const container = {
      querySelectorAll: () => [a, b],
      getBoundingClientRect: () => ({ top: 0, left: 0 }) as DOMRect,
    } as unknown as HTMLElement;
    const flip = createFlipAnimation({
      getContainer: () => container,
      selector: '.row',
      axis: 'y',
      getKey: (_element, index) => (index === 0 ? 'a' : 'b'),
      duration: 10,
    });
    const old = flip.capturePositions();
    expect(old).toEqual(
      new Map([
        ['a', 0],
        ['b', 50],
      ])
    );

    a.getBoundingClientRect = () => ({ top: 100, left: 100 }) as DOMRect;
    flip.animate(old);
    expect(a.history).toContain('translateY(-100px)');

    flip.cancel();
    expect(a.style.transition).toBe('');
    expect(a.style.willChange).toBe('');
  });

  it('无容器、超量元素与未变化元素安全跳过', () => {
    const empty = createFlipAnimation({
      getContainer: () => null,
      selector: '.row',
      axis: 'y',
      getKey: () => 'x',
    });
    expect(empty.capturePositions()).toEqual(new Map());
    empty.animate(new Map());

    const element = makeElement(0);
    const container = {
      querySelectorAll: () => [element],
      getBoundingClientRect: () => ({}) as DOMRect,
    } as unknown as HTMLElement;
    const flip = createFlipAnimation({
      getContainer: () => container,
      selector: '.row',
      axis: 'x',
      getKey: (_item, index) => (index === 0 ? 'a' : undefined),
      maxElements: 0,
    });
    expect(flip.capturePositions()).toEqual(new Map());
  });

  it('投放控制器按顺序捕获、提交与播放', async () => {
    const order: string[] = [];
    const controller = createFlipDropController({
      capturePositions: () => {
        order.push('capture');
        return new Map();
      },
      onDrop: () => {
        order.push('drop');
      },
      afterCommit: () => {
        order.push('commit');
      },
      animate: () => order.push('animate'),
      canAnimate: () => true,
    });
    await controller.handleDrop();
    expect(order).toEqual(['capture', 'drop', 'commit', 'animate']);

    const noAnimate: string[] = [];
    await createFlipDropController({
      capturePositions: () => {
        noAnimate.push('capture');
        return new Map<string, number>();
      },
      onDrop: () => {
        noAnimate.push('drop');
      },
      animate: () => noAnimate.push('animate'),
      canAnimate: () => false,
    }).handleDrop();
    expect(noAnimate).toEqual(['drop']);
  });
});
