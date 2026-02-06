// jest manual mock for @atlaskit/pragmatic-drag-and-drop/element/adapter
// Captures registrations to global.__PRAGMATIC_DND_MOCK_CALLS__ so tests can assert

const ensureGlobal = () => {
  if (!global.__PRAGMATIC_DND_MOCK_CALLS__) {
    global.__PRAGMATIC_DND_MOCK_CALLS__ = { draggable: [], droppable: [] };
  }
  return global.__PRAGMATIC_DND_MOCK_CALLS__;
};

module.exports = {
  draggable: (el, options) => {
    const g = ensureGlobal();
    g.draggable.push({ element: el || null, options });
    return () => { /* noop dispose */ };
  },
  droppable: (el, options) => {
    const g = ensureGlobal();
    g.droppable.push({ element: el || null, options });
    return () => { /* noop dispose */ };
  }
};
