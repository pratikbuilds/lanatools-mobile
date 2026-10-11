// @ts-check
const { defineConfig } = require('eslint/config')
const expo = require('eslint-config-expo/flat')

module.exports = defineConfig([
  {
    ignores: [
      '.claude/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      'apps/mobile/android/**',
      'apps/mobile/ios/**',
      '**/*.config.js',
    ],
  },
  expo,
  {
    // Flue's agent hooks share React's `use` prefix but not its rules: an
    // agent may declare an MCP connection conditionally.
    files: ['apps/agent/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
])
