module.exports = {
  extends: [
    '@hellomouse/eslint-config-typescript',
    'plugin:react/recommended',
    'react-app'
  ],
  env: {
    browser: true,
    es6: true,
    node: true
  },
  rules: {
    // typescript exists
    'react/prop-types': 'off',
    // typescript is smart enough to figure out return types without defining them 1e+412 times
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
};
