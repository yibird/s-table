import { describe, it, expect, afterEach } from 'vite-plus/test';
import { nextTick, type App } from 'vue';
import { mountSTable } from '../helpers';
import type { STableColumn } from '../../types';

/**
 * 分组表头渲染测试 *
 * 校验 TanStack v9 稳定版内置的 rowSpan/colSpan 推算 * 每一行的单元colSpan 之和（叠加上rowSpan 贯通下来的列）必须等于叶子列数 * 且提前到顶的列（未分组列）应在顶部渲染并向下贯通 */

let app: App | null = null;
let host: HTMLElement | null = null;

const mountTable = async (columns: STableColumn<Record<string, unknown>>[]) => {
  const mounted = mountSTable<Record<string, unknown>>({
    columns,
    dataSource: [
      {
        id: 1,
        name: 'a',
        age: 2,
        chinese: 3,
        english: 4,
        math: 5,
        physics: 6,
        chemistry: 7,
        salary: 8,
        bonus: 9,
      },
    ],
  });
  app = mounted.app;
  host = mounted.host;
  await nextTick();
  await nextTick();
};

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

/** 读取 thead 每一行的 (colSpan,rowSpan) 网格覆盖，校验每行覆盖列数*/
const getCoverage = (): number[] => {
  const thead = host!.querySelector('thead')!;
  const trs = Array.from(thead.querySelectorAll('tr'));
  const coverage: number[] = Array.from({ length: trs.length }, () => 0);
  trs.forEach((tr, rowIndex) => {
    tr.querySelectorAll('th').forEach((th) => {
      const colSpan = Number(th.getAttribute('colspan') ?? '1');
      const rowSpan = Number(th.getAttribute('rowspan') ?? '1');
      for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
        coverage[r] += colSpan;
      }
    });
  });
  return coverage;
};

describe('分组表头', () => {
  it('二级分组表头：每行覆盖列数等于叶子列', async () => {
    const columns: STableColumn<Record<string, unknown>>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      {
        id: 'basicInfo',
        header: '基本信息',
        columns: [
          { id: 'name', accessorKey: 'name', header: '姓名' },
          { id: 'age', accessorKey: 'age', header: '年龄' },
        ],
      },
      {
        id: 'compensation',
        header: '薪酬',
        columns: [
          { id: 'salary', accessorKey: 'salary', header: '月薪' },
          { id: 'bonus', accessorKey: 'bonus', header: '奖金' },
        ],
      },
    ];
    await mountTable(columns);
    // 5 个叶子列：id, name, age, salary, bonus
    expect(getCoverage()).toEqual([5, 5]);
  });

  it('三级分组表头：每行覆盖列数等于叶子列', async () => {
    const columns: STableColumn<Record<string, unknown>>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: '姓名' },
      {
        id: 'scores',
        header: '成绩',
        columns: [
          {
            id: 'liberalArts',
            header: '文科',
            columns: [
              { id: 'chinese', accessorKey: 'chinese', header: '语文' },
              { id: 'english', accessorKey: 'english', header: '英语' },
            ],
          },
          {
            id: 'science',
            header: '理科',
            columns: [
              { id: 'math', accessorKey: 'math', header: '数学' },
              { id: 'physics', accessorKey: 'physics', header: '物理' },
              { id: 'chemistry', accessorKey: 'chemistry', header: '化学' },
            ],
          },
        ],
      },
    ];
    await mountTable(columns);
    // 7 个叶子列
    expect(getCoverage()).toEqual([7, 7, 7]);
  });

  it('三级表头：未分组列在首行渲染并向下贯rowSpan', async () => {
    const columns: STableColumn<Record<string, unknown>>[] = [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: '姓名' },
      {
        id: 'scores',
        header: '成绩',
        columns: [
          {
            id: 'liberalArts',
            header: '文科',
            columns: [
              { id: 'chinese', accessorKey: 'chinese', header: '语文' },
              { id: 'english', accessorKey: 'english', header: '英语' },
            ],
          },
        ],
      },
    ];
    await mountTable(columns);
    const firstRow = host!.querySelector('thead tr')!;
    const ths = Array.from(firstRow.querySelectorAll('th'));
    // 首行应包?ID（rowSpan=3
    const idCell = ths.find((th) => th.textContent?.includes('ID'));
    expect(idCell).toBeTruthy();
    expect(idCell!.getAttribute('rowspan')).toBe('3');
  });
});
