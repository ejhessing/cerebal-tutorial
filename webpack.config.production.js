const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: path.resolve('src', 'main.js'),
  output: {
    path: path.resolve('dist'),
    filename: 'main.js',
    publicPath: '/'
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: 'body',
      title: 'Cerebral demo application',
      template: path.resolve('src', 'index.template.ejs')
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    })
  ],
  module: {
    loaders: [{
      test: /\.js?$/,
      include: path.resolve('src'),
      loader: 'babel',
      query: {
        presets: ['es2015', 'stage-0', 'react']
      }
    }]
  }
}
