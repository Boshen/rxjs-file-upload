const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {

  entry: [
    './test/test.page'
  ],

  resolve: {
    extensions: [
      '.ts',
      '.js'
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
        configFile: 'tsconfig.test.json'
      }
    }, {
      test: /\.css$/,
      loaders: [
        'style-loader',
        'css-loader'
      ]
    }]
  },

  devtool: 'inline-source-map',

  devServer: {
    contentBase: path.resolve(__dirname, 'dist'),
    stats: 'errors-only'
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './test/test.html'
    })
  ]

}
