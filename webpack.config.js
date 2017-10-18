const { resolve } = require('path')

module.exports = {
  entry: resolve('./src'),
  output: {
    path: resolve('./public/js/admin'),
    filename: 'admin.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    modules: [resolve(__dirname, 'src'), resolve(__dirname, 'node_modules')]
  },
  devtool: 'eval'
}
