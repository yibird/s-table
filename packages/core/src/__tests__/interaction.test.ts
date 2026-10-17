import { describe, expect, it } from 'vitest';
import { createDragController, createFlipDropController, moveArrayItem } from '../index';

describe('framework-agnostic interaction controllers', () => {
  it('keeps drag state transitions and delegates only valid moves', async () => {
    const moves: Array<{ fromIndex: number; toIndex: number }> = [];
    const controller = createDragController({
      getItemCount: () => 3,
      onMove: (move) => {
        moves.push(move);
      },
    });

    controller.start(0);
    expect(controller.over(2)).toBe(true);
    await controller.drop();

    expect(moves).toEqual([{ fromIndex: 0, toIndex: 2 }]);
    expect(controller.state).toEqual({
      isDragging: false,
      dragFromIndex: -1,
      dragOverIndex: -1,
    });
    expect(moveArrayItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('runs FLIP drop phases in order and supports an external commit flush', async () => {
    const phases: string[] = [];
    const controller = createFlipDropController({
      canAnimate: () => true,
      capturePositions: () => {
        phases.push('capture');
        return new Map([['row', 10]]);
      },
      onDrop: () => {
        phases.push('drop');
      },
      afterCommit: () => {
        phases.push('commit');
      },
      animate: (positions) => {
        phases.push(`animate:${positions.get('row')}`);
      },
    });

    await controller.handleDrop();
    expect(phases).toEqual(['capture', 'drop', 'commit', 'animate:10']);
  });
});
