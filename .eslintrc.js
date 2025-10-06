export default {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'import/extensions': ['error', 'ignorePackages'],
    'no-underscore-dangle': 'off',
    'max-len': ['error', { code: 120 }],
  },
};
