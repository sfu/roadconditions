const { resolve } = require('path')
const webpack = require('webpack')

module.exports = (env = {}) => {
  return {
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
    devtool: 'eval',
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: env.prod ? '"production"' : '"development"'
        }
      })
    ]
  }
}
