module.exports = {
  "env": {
  "node": true,
  "es6": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module",
    "ecmaFeatures": {
      "experimentalObjectRestSpread": true
    }
  },

  // "off"或者0    关闭规则关闭
  // "warn"或者1    在打开的规则作为警告（不影响退出代码）
  // "error"或者2    把规则作为一个错误（退出代码触发时为1）
  "rules": {
    "indent": ["error", 2],
    "linebreak-style": ["error", "windows"],
    "quotes": ["error", "single"],
    "semi": ["error", "never"],
    "no-alert": ["error"],
    "no-console": "off"
  }
};