module.exports = {
  root: true,
  env: {
    es6: true,
    mocha: true,
    node: true,
    mongo: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: './',
  },
  plugins: ['@typescript-eslint', 'jsdoc', 'prettier', 'import'],
  extends: [
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
    'prettier/babel',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {},
    },
  },
  rules: {
    'no-console': 'off',
    'arrow-parens': ['error', 'always'],
    'prettier/prettier': ['error', { arrowParens: 'always' }],
    'comma-spacing': 'error',
    semi: ['error', 'never'],
    'no-unused-vars': 'off',
    eqeqeq: 'error',
    'no-alert': 'error',
    curly: 'error',
    'brace-style': ['error', '1tbs'],
    'object-curly-spacing': ['error', 'always'],
    'function-call-argument-newline': ['error', 'consistent'],
    'one-var-declaration-per-line': ['error', 'always'],
    'import/no-named-as-default-member': 'off',
    'import/no-named-as-default': 'off',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': (context) => [
      'error',
      {
        devDependencies: false,
        packageDir: [context.getFilename(), __dirname],
      },
    ],
    'import/default': 'off',
    'import/namespace': 'off',
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
}
