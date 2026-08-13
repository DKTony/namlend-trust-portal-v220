const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['coverage/**'],
    // React Native Text renders apostrophes as text rather than HTML. The web
    // entity-escaping rule is therefore both noisy and inapplicable here.
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: ['jest.setup.js', '**/__tests__/**/*.{js,ts,tsx}', '**/*.{test,spec}.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
      },
    },
  },
]);
