module.exports = function (api) {
  api.cache(true);
  const plugins = [];

  // Skip dotenv plugin in test env — jest's moduleNameMapper
  // maps @env to jest.env.mock.ts so tests never touch real keys.
  if (process.env.NODE_ENV !== 'test') {
    plugins.push([
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: true,
        allowUndefined: false,
      },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};