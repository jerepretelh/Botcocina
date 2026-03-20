import test from 'node:test';
import assert from 'node:assert/strict';

import { productBacklog } from './backlog';

test('product backlog has epics and every epic contains at least one item', () => {
  assert.ok(productBacklog.length > 0);

  for (const epic of productBacklog) {
    assert.ok(epic.id.length > 0);
    assert.ok(epic.title.length > 0);
    assert.ok(epic.items.length > 0);
  }
});
