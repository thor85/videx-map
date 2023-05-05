module.exports = ({ config }) => {
  config.module.rules.push({
    test: /\.(ts|tsx)$/,
    use: [
      {
        // loader: require.resolve('ts-loader'),
        // loader: require.resolve("ts-loader")
        loader: 'ts-loader',
        // loader: require.resolve('awesome-typescript-loader'),
      },
    ],
    // exclude: /node_modules/,
  });
  // config.module.rules.push({
  //   test: /\.(js|jsx)$/,
  //   use: [
  //     {
  //       loader: require.resolve('babel-loader'),
  //       // loader: require.resolve("ts-loader")
  //       // loader: 'ts-loader',
  //       // loader: require.resolve('awesome-typescript-loader'),
  //     },
  //   ],
  //   exclude: [/bower_components/, /node_modules/, /styles/],
  // });
  config.resolve.extensions.push('.ts', '.tsx');
  return config;
  };
