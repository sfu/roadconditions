module.exports = {
  parser: 'babel-eslint',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:import/errors',
    'plugin:import/warnings'
  ],
  globals: {},
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  rules: {
    'no-console': 0,
    'one-var': ['error', 'never'],
    'no-extra-semi': 0
  },
  plugins: ['react'],
  settings: {
    'import/resolver': 'webpack',
    'import/extensions': ['.js', '.jsx']
  }
}
