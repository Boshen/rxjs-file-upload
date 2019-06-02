const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ChunkManifestPlugin = require('chunk-manifest-webpack-plugin')
const WebpackChunkHash = require('webpack-chunk-hash')

module.exports = {
  entry: {
    common: './test/common.page.ts',
    bundle: './test/test.page',
  },

  output: {
    filename: '[name].[chunkhash:8].js',
    chunkFilename: '[name].[chunkhash:8].js',
    path: path.resolve(__dirname, '../page'),
  },

  resolve: {
    extensions: ['.ts', '.js'],
    modules: ['./node_modules'],
  },

  module: {
    rules: [
      {
        test: /\.ts?$/,
        enforce: 'pre',
        loader: 'tslint-loader',
        exclude: [/node_modules/],
        query: {
          emitErrors: true,
          formatter: 'stylish',
        },
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          configFileName: 'tsconfig.page.json',
        },
      },
      {
        test: /\.css$/,
        loaders: ['style-loader', 'css-loader'],
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './test/test.html',
    }),

    new webpack.optimize.CommonsChunkPlugin({
      names: ['common', 'manifest'],
      minChunks: Infinity,
    }),

    new ChunkManifestPlugin({
      filename: 'chunk-manifest.json',
      manifestVariable: 'webpackManifest',
    }),

    new webpack.HashedModuleIdsPlugin(),

    new WebpackChunkHash(),

    // new webpack.optimize.UglifyJsPlugin({
    // mangle: {
    // screw_ie8: true
    // },
    // compress: {
    // screw_ie8: true,
    // dead_code: true,
    // warnings: false
    // },
    // beautify: false,
    // sourceMap: true,
    // comments: false
    // })
  ],
}
