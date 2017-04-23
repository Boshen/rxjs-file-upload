const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {

  entry: {
    bundle: './test/test.page'
  },

  output: {
    filename: '[name].[chunkhash:8].js',
    path: path.resolve(__dirname, '../page')
  },

  resolve: {
    extensions: [
      '.ts',
      '.js'
    ],
    modules: [
      './node_modules'
    ]
  },

  module: {
    rules: [{
      test: /\.ts?$/,
      enforce: 'pre',
      loader: 'tslint-loader',
      exclude: [
        /node_modules/
      ],
      query: {
        emitErrors: true,
        formatter: 'stylish'
      }
    }, {
      test: /\.ts$/,
      loader: 'ts-loader',
      options: {
        configFileName: 'tsconfig.page.json'
      }
    }, {
      test: /\.css$/,
      loaders: [
        'style-loader',
        'css-loader'
      ]
    }]
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './test/test.html'
    }),

    new webpack.optimize.UglifyJsPlugin({
      mangle: {
        screw_ie8: true
      },
      compress: {
        screw_ie8: true,
        dead_code: true,
        warnings: false
      },
      beautify: false,
      sourceMap: false,
      comments: false
    })
  ]

}
