// admin-app/webpack.config.js
const path = require('path');
const webpack = require('webpack');
require('dotenv').config();

module.exports = {
  entry: './src/renderer.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'src')
  },
  target: 'electron-renderer',
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    fallback: {
      process: require.resolve('process/browser'),
      buffer: require.resolve('buffer/')
    }
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      },
      // Add this rule for HERE Maps UI CSS
      {
        test: /mapsjs-ui\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    // Add environment variables for HERE Maps
    new webpack.DefinePlugin({
      'process.env.HERE_API_KEY': JSON.stringify('TGQS7Az399FFMavDBe37kEgw2jTlb0ZmdVkwhNjy58c'),
      'process.env.HERE_APP_ID': JSON.stringify('024IidL11VF5DhXm6qKd')
    })
  ],
  devtool: 'source-map'
};