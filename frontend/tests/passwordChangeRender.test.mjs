import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

test('password-change pages render with auth and theme providers', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { default: ResetPassword } = await server.ssrLoadModule('/src/pages/ResetPassword.jsx');
    const { default: ForgotPassword } = await server.ssrLoadModule('/src/pages/ForgotPassword.jsx');
    const { default: SecuritySettings } = await server.ssrLoadModule('/src/components/settings/SecuritySettings.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/authContext.js');
    const { ThemeProvider } = await server.ssrLoadModule('/src/context/ThemeContext.jsx');
    const { ToastProvider } = await server.ssrLoadModule('/src/context/ToastContext.jsx');
    const render = (Component, query, theme) => {
      globalThis.window = { location: { search: query }, matchMedia: () => ({ matches: theme === 'dark' }) };
      globalThis.localStorage = { getItem: () => null };
      return renderToString(React.createElement(MemoryRouter, null,
        React.createElement(AuthContext.Provider, { value: { user: null, logout() {} } },
          React.createElement(ThemeProvider, null, React.createElement(ToastProvider, null, React.createElement(Component))))));
    };
    for (const theme of ['light', 'dark']) {
      const form = render(ResetPassword, '?token=' + 'a'.repeat(64), theme);
      assert.ok(form.includes('Create a New Password') && form.includes('Update Password'));
      assert.ok(form.includes('Show new password') && form.includes('Show confirm password'));
      assert.ok(form.includes('minLength="8"') && form.includes('autoComplete="new-password"'));
      assert.ok(!form.includes('a'.repeat(64)));
      assert.ok(form.includes(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'));
      assert.ok(render(ResetPassword, '', theme).includes('Invalid Reset Link'));
      assert.ok(render(ForgotPassword, '', theme).includes('Send Reset Link'));
      assert.ok(render(ResetPassword, '', theme).includes('href="/forgot-password"'));
      const security = render(SecuritySettings, '', theme);
      assert.ok(security.includes('Send Change Link') && !security.includes('Unavailable'));
    }
  } finally {
    delete globalThis.window; delete globalThis.localStorage;
    await server.close();
  }
});
