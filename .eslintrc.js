module.exports = {
  plugins: [
    "eslint-plugin-tsdoc"
  ],
  extends: [
    "@joystream/eslint-config",
    'plugin:sonarjs/recommended',
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "no-useless-constructor": "off",
    "@typescript-eslint/no-namespace": "off",
    "tsdoc/syntax": "warn",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        "selector": "enumMember",
        "format": ["UPPER_CASE"]
      },
      {
        "selector": "variable",
        "modifiers": ["const"],
        "format": ["camelCase", "UPPER_CASE"],
        "leadingUnderscore": "allow"
      },
      {
        "selector": ["memberLike"],
        "format": ["camelCase"],
        "leadingUnderscore": "allow"
      },
    ],
    "sonarjs/cognitive-complexity": "warn",
    "sonarjs/no-identical-functions": "warn",
    "sonarjs/no-duplicate-string": "warn",
    "sonarjs/no-collapsible-if": "warn",
    "sonarjs/no-nested-template-literals": "off",
    "sonarjs/no-small-switch": "off",
    "sonarjs/no-nested-switch": "off",
    "promise/param-names": "warn"
  },
  "overrides": [
    {
        "files": ["*.test.ts"],
        "rules": {
            "no-unused-expressions": "off"
        }
    }
  ]
}