module.exports = {
  env: {
    es6: true,
    browser: true,
    jest: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  rules: {
    'prettier/prettier': 'warn',
    'no-console': 'off',
    'comma-spacing': 'error',
    semi: ['error', 'never'],
    eqeqeq: 'error',
    'no-alert': 'error',
    curly: 'error',
    'brace-style': ['error', '1tbs'],
    'object-curly-spacing': ['error', 'always'],
    'function-call-argument-newline': ['error', 'consistent'],
    'one-var-declaration-per-line': ['error', 'always'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'padding-line-between-statements': [
      'error',
      {
        blankLine: 'always',
        prev: ['const', 'let', 'var'],
        next: '*',
      },
      {
        blankLine: 'any',
        prev: ['const', 'let', 'var'],
        next: ['const', 'let', 'var'],
      },
    ],
  },
  overrides: [
    {
      // enable the rule specifically for TypeScript files and NOT tsx files.
      // This is mainly due to the fact that adding return types to react components
      // has many pitfalls and its just better to let eslint infer the return type,
      // as it's almost always correct.
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': ['error'],
      },
    },
  ],
  plugins: ['prettier', '@typescript-eslint'],
  extends: [
    'react-app',
    'plugin:prettier/recommended',
    'prettier/react',
    'plugin:@typescript-eslint/recommended',
  ],
}
