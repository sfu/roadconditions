const path = require('path')

module.exports = {
  entry: path.resolve('./src'),
  output: {
    path: path.resolve('./public/js/admin'),
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
    extensions: ['.js', '.jsx']
  }
}
