export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.m?[tj]sx?$': ['babel-jest', { cwd: '.' }],
    },
    moduleNameMapper: {
        '^#ansi-styles$': 'ansi-styles',
    },
};
