import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAppAuthRouteDecision } from './appAuthRouting';

test('resolveAppAuthRouteDecision stores redirect for unauthenticated protected access', () => {
  const decision = resolveAppAuthRouteDecision({
    isReady: true,
    isAuthenticated: false,
    isAuthRoute: false,
    isRuntimeRoute: true,
    isPasswordRecoveryFlow: false,
    locationPathname: '/runtime-fijo',
    pendingRedirectPath: null,
  });

  assert.deepEqual(decision, { kind: 'store_redirect', path: '/runtime-fijo' });
});

test('resolveAppAuthRouteDecision redirects authenticated auth route to pending path', () => {
  const decision = resolveAppAuthRouteDecision({
    isReady: true,
    isAuthenticated: true,
    isAuthRoute: true,
    isRuntimeRoute: false,
    isPasswordRecoveryFlow: false,
    locationPathname: '/auth',
    pendingRedirectPath: '/runtime-fijo/receta-1',
  });

  assert.deepEqual(decision, { kind: 'redirect', to: '/runtime-fijo/receta-1' });
});

test('resolveAppAuthRouteDecision keeps password recovery on auth route', () => {
  const decision = resolveAppAuthRouteDecision({
    isReady: true,
    isAuthenticated: true,
    isAuthRoute: true,
    isRuntimeRoute: false,
    isPasswordRecoveryFlow: true,
    locationPathname: '/auth',
    pendingRedirectPath: '/runtime-fijo',
  });

  assert.deepEqual(decision, { kind: 'none' });
});

test('resolveAppAuthRouteDecision redirects authenticated root to runtime', () => {
  const decision = resolveAppAuthRouteDecision({
    isReady: true,
    isAuthenticated: true,
    isAuthRoute: false,
    isRuntimeRoute: false,
    isPasswordRecoveryFlow: false,
    locationPathname: '/',
    pendingRedirectPath: null,
  });

  assert.deepEqual(decision, { kind: 'redirect', to: '/runtime-fijo' });
});
