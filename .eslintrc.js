module.exports = {
  parser: 'babel-eslint',
  parserOptions: {},
  extends: ['eslint:recommended'],
  globals: {},
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true,
    jquery: true
  },
  rules: {
    'no-console': 0,
    'one-var': ['error', 'never'],
    'no-extra-semi': 0
  },
  plugins: [],
  settings: {}
}
