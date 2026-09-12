import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

test('registration is a compact accessible three-field form', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  try {
    const {default:RegisterPage}=await server.ssrLoadModule('/src/pages/RegisterPage.jsx');
    const {destinationAfterAuth}=await server.ssrLoadModule('/src/utils/authRouting.js');
    const {AuthContext}=await server.ssrLoadModule('/src/context/authContext.js');
    const {ThemeProvider}=await server.ssrLoadModule('/src/context/ThemeContext.jsx');
    const {ToastProvider}=await server.ssrLoadModule('/src/context/ToastContext.jsx');
    globalThis.window={location:{search:''},matchMedia:()=>({matches:false})};
    globalThis.localStorage={getItem:()=>null,setItem(){}};
    const html=renderToString(React.createElement(MemoryRouter,null,
      React.createElement(AuthContext.Provider,{value:{register:async()=>{}}},
        React.createElement(ThemeProvider,null,React.createElement(ToastProvider,null,React.createElement(RegisterPage))))));
    assert.ok(html.includes('Start building a study plan that adapts when life changes.'));
    assert.ok(html.includes('name="name"')&&html.includes('name="email"')&&html.includes('name="password"'));
    assert.ok(html.includes('autoComplete="name"')&&html.includes('autoComplete="email"')&&html.includes('autoComplete="new-password"'));
    assert.ok(html.includes('Show password')&&html.includes('Create Account'));
    assert.ok(!html.includes('Confirm Password')&&!html.includes('confirmPassword')&&!html.includes('Get Started'));
    assert.equal(destinationAfterAuth({goalOnboarding:{status:'not_started'}}),'/onboarding/goals');
    assert.equal(destinationAfterAuth({goalOnboarding:{status:'in_progress'}}),'/onboarding/goals');
    assert.equal(destinationAfterAuth({goalOnboarding:{status:'completed'}}),'/dashboard');
    assert.equal(destinationAfterAuth({goalOnboarding:{status:'skipped'}}),'/dashboard');
    assert.equal(destinationAfterAuth({}),'/dashboard');
  } finally { delete globalThis.window;delete globalThis.localStorage;await server.close(); }
});
