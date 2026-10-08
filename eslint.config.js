// @ts-check
const { defineConfig } = require('eslint/config')
const expo = require('eslint-config-expo/flat')

module.exports = defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      'apps/mobile/android/**',
      'apps/mobile/ios/**',
      '**/*.config.js',
    ],
  },
  expo,
])
