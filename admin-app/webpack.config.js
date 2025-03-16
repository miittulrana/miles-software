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
  target: 'web',
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    fallback: {
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "crypto": require.resolve("crypto-browserify")
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
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    // This is critical for React Bootstrap
    new webpack.ProvidePlugin({
      React: 'react'
    }),
    // Add window global for browser compatibility
    new webpack.DefinePlugin({
      'global': 'window',
      'window.process': 'process'
    })
  ],
  devtool: 'source-map'
};