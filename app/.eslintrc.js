module.exports = {
  extends: [
    '@hellomouse/eslint-config-typescript',
    'plugin:react/recommended'
  ],
  env: {
    browser: true,
    es6: true,
    node: true
  },
  rules: {
    // typescript exists
    'react/prop-types': 'off'
  }
};
