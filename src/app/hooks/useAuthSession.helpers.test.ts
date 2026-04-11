import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTH_CONFIGURATION_ERROR,
  AUTH_OFFLINE_MESSAGE,
  buildPasswordResetRedirectUrl,
  normalizeAuthErrorMessage,
} from './useAuthSession.helpers';

test('normalizeAuthErrorMessage maps invalid credentials to product copy', () => {
  assert.equal(normalizeAuthErrorMessage('Invalid login credentials', 'signin'), 'Correo o contraseña incorrectos.');
});

test('normalizeAuthErrorMessage maps already registered email', () => {
  assert.equal(normalizeAuthErrorMessage('User already registered', 'signup'), 'Ya existe una cuenta con ese correo.');
});

test('normalizeAuthErrorMessage maps timeout and offline messages', () => {
  assert.equal(normalizeAuthErrorMessage('auth-session-timeout', 'session'), 'No pudimos validar tu sesión a tiempo. Reintenta.');
  assert.equal(normalizeAuthErrorMessage('Failed to fetch', 'session'), AUTH_OFFLINE_MESSAGE);
});

test('normalizeAuthErrorMessage falls back to context default when message is empty', () => {
  assert.equal(normalizeAuthErrorMessage('', 'request_reset'), 'No pudimos enviar el correo de recuperación.');
  assert.equal(normalizeAuthErrorMessage('', 'signup'), 'No pudimos crear tu cuenta.');
});

test('buildPasswordResetRedirectUrl preserves current path and points to auth reset mode', () => {
  const url = buildPasswordResetRedirectUrl({
    origin: 'https://chefbot.example',
    pathname: '/app',
    search: '?preview=1',
  });
  assert.equal(url, 'https://chefbot.example/app?preview=1#/auth?mode=reset');
});

test('auth configuration message is explicit for blocked environments', () => {
  assert.match(AUTH_CONFIGURATION_ERROR, /Supabase/i);
});
