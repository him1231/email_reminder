import React from 'react';
import { render, screen, within, act } from '@testing-library/react';

// We'll mock the pragmatic adapter before importing the component so the component's
// dynamic require picks up our mock implementation.

describe('StaffGroupsTest — pragmatic-dnd integration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('registers draggables/droppables and applies onDrop payload to in-memory tree', async () => {
    const droppableCalls: Array<{ element: HTMLElement | null; options: any }> = [];
    const draggableCalls: Array<{ element: HTMLElement | null; options: any }> = [];

    // prepare the manual jest mock (tests/__mocks__/... provides behavior)
    global.__PRAGMATIC_DND_MOCK_CALLS__ = { draggable: [], droppable: [] };

    const { default: StaffGroupsTest } = await import('../../src/pages/staff/StaffGroupsTest');

    render(<StaffGroupsTest />);

    const g = (global as any).__PRAGMATIC_DND_MOCK_CALLS__;
    // adapter should have been asked to make items draggable/droppable
    expect(g.draggable.length).toBeGreaterThan(0);
    expect(g.droppable.length).toBeGreaterThan(0);

    // find a registered droppable for root-2
    const droppableForR2 = g.droppable.find((c: any) => c.options?.elementId === 'r2');
    expect(droppableForR2).toBeDefined();

    // initial DOM: A should be present (rendered as its own treeitem)
    expect(screen.getByTestId('treeitem-a')).toBeDefined();

    // call the registered onDrop handler to simulate a real drop from the adapter
    const onDrop = droppableForR2.options.onDrop as (p: any) => void;
    act(() => onDrop({ source: { elementId: 'a' }, destination: { elementId: 'r2', index: 0 } }));

    // A should now appear after the Root 2 container in DOM order (simple structural check)
    const ordered = Array.from(document.querySelectorAll('[data-testid^="treeitem-"]')) as HTMLElement[];
    const idxA = ordered.findIndex(el => el.dataset?.testid === 'treeitem-a');
    const idxR2 = ordered.findIndex(el => el.dataset?.testid === 'treeitem-r2');
    expect(idxA).toBeGreaterThan(idxR2);

  });
});
