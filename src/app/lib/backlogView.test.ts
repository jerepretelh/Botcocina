import test from 'node:test';
import assert from 'node:assert/strict';

import { productBacklog } from '../data/backlog';
import { buildBacklogSections, summarizeBacklog } from './backlogView';

test('buildBacklogSections groups backlog items by status preserving epic hierarchy', () => {
  const sections = buildBacklogSections(productBacklog);

  assert.deepEqual(sections.map((section) => section.status), ['pending', 'in_progress', 'done']);
  assert.ok(sections.every((section) => section.epics.every((epic) => epic.items.length > 0)));

  const doneSection = sections.find((section) => section.status === 'done');
  assert.ok(doneSection);
  assert.ok(doneSection.epics.some((epic) => epic.epicTitle === 'Biblioteca global y navegación de overlays'));
  assert.ok(doneSection.epics.every((epic) => epic.items.every((item) => item.status === 'done')));
});

test('summarizeBacklog returns stable counts for epics, stories and tasks', () => {
  const summary = summarizeBacklog(productBacklog);

  assert.equal(summary.epics, productBacklog.length);
  assert.ok(summary.stories > 0);
  assert.ok(summary.tasks > 0);
  assert.equal(summary.pending + summary.inProgress + summary.done, summary.stories + summary.tasks);
});
