const { resolve } = require('path')
const webpack = require('webpack')
const ManifestPlugin = require('webpack-manifest-plugin')

module.exports = (env = {}) => {
  return {
    entry: {
      admin: resolve('./src')
    },
    output: {
      path: resolve('./public/js/admin'),
      filename: env.prod ? 'admin.bundle.[chunkhash].js' : 'admin.bundle.js'
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
    devtool: env.prod ? 'source-map' : 'eval',
    plugins: [
      new ManifestPlugin({
        fileName: resolve(__dirname, 'manifest.json'),
        basePath: '/js/admin/',
        writeToFileEmit: true
      }),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: env.prod ? '"production"' : '"development"'
        }
      })
    ]
  }
}
