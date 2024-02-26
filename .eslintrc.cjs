module.exports = {
    extends: [
        "@virtuallyunknown/eslint-config",
        "@virtuallyunknown/eslint-config/stylistic",
    ],
    root: true,
    env: {
        node: true,
    },
    parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
    },
    ignorePatterns: ["*.*", "!src/**/*", "!test/**/*"],
};