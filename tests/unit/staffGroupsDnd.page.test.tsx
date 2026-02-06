import React from 'react';
import { render, screen, within, act, fireEvent } from '@testing-library/react';

describe('StaffGroupsDnd (pragmatic)', () => {
  afterEach(() => {
    // ensure clean module cache between tests — prevents cross-test React hook issues
    jest.resetModules();
    jest.restoreAllMocks();
    delete (global as any).__PRAGMATIC_DND_MOCK_CALLS__;
  });

  test('renders tree, registers adapter when present, and updates on onDrop', async () => {
    // ensure jest manual mock is used (tests/__mocks__/...)
    (global as any).__PRAGMATIC_DND_MOCK_CALLS__ = { draggable: [], droppable: [] };

    const { default: StaffGroupsDnd } = await import('../../src/pages/staff/StaffGroupsDnd');
    render(<StaffGroupsDnd />);

    // basic smoke
    expect(screen.getByText(/Staff Groups \(dnd\)/i)).toBeDefined();
    expect(screen.getByTestId('treeitem-a')).toBeDefined();

    const g = (global as any).__PRAGMATIC_DND_MOCK_CALLS__;
    expect(g.draggable.length).toBeGreaterThan(0);
    expect(g.droppable.length).toBeGreaterThan(0);

    // find droppable for r2 and call its onDrop to simulate a real adapter-driven drop
    const droppableR2 = g.droppable.find((c: any) => c.options?.elementId === 'r2');
    expect(droppableR2).toBeDefined();

    act(() => droppableR2.options.onDrop({ source: { elementId: 'a' }, destination: { elementId: 'r2', index: 0 } }));

    // A should appear after r2 in DOM ordering
    const ordered = Array.from(document.querySelectorAll('[data-testid^="treeitem-"]')) as HTMLElement[];
    const idxA = ordered.findIndex(el => el.dataset?.testid === 'treeitem-a');
    const idxR2 = ordered.findIndex(el => el.dataset?.testid === 'treeitem-r2');
    expect(idxA).toBeGreaterThan(idxR2);

    // also exercise the simulate button and commit UI (same code path, deterministic)
    expect(screen.getByTestId('simulate-move-btn')).toBeDefined();
    fireEvent.click(screen.getByTestId('simulate-move-btn'));

    const orderedAfter = Array.from(document.querySelectorAll('[data-testid^="treeitem-"]')) as HTMLElement[];
    const idxAAfter = orderedAfter.findIndex(el => el.dataset?.testid === 'treeitem-a');
    const idxR2After = orderedAfter.findIndex(el => el.dataset?.testid === 'treeitem-r2');
    expect(idxAAfter).toBeGreaterThan(idxR2After);

    const commitBtn = screen.getByRole('button', { name: /commit changes/i });
    expect(commitBtn).toBeDefined();
    expect(commitBtn.getAttribute('disabled')).toBeNull();
  });
});
