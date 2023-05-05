module.exports = ({ config }) => {
  config.module.rules.push({
    test: /\.(ts|tsx)$/,
    use: [
      {
        loader: require.resolve('ts-loader'),
        // loader: require.resolve("ts-loader")
        // loader: 'ts-loader',
        // loader: require.resolve('awesome-typescript-loader'),
      },
    ],
    exclude: [/bower_components/, /node_modules/, /styles/],
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
  config.resolve.extensions.push('.js', '.jsx');
  return config;
  };
