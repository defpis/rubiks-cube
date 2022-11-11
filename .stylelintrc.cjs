module.exports = {
  plugins: ['stylelint-prettier'],
  extends: ['stylelint-config-standard', 'stylelint-prettier/recommended'],
  rules: {
    'prettier/prettier': true,
    'color-function-notation': 'legacy',
    'alpha-value-notation': 'number',
  },
};
