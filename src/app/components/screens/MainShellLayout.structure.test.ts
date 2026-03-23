import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('./MainShellLayout.tsx', import.meta.url), 'utf8');

test('MainShellLayout renders primary navigation with router links', () => {
  assert.match(source, /import\s+\{\s*NavLink\s*\}\s+from\s+'react-router'/);
  assert.match(source, /<NavLink/);
  assert.match(source, /to=\{args\.item\.href\}/);
});

test('MainShellLayout keeps sign out as an action button instead of a route link', () => {
  assert.match(source, /Cerrar sesión/);
  assert.doesNotMatch(source, /to="\/cerrar-sesion"/);
});
