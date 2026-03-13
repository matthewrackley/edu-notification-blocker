const path = require('node:path');
const TerserPlugin = require('terser-webpack-plugin');

/**
 * @type {import('webpack').Configuration} module.exports
 */
module.exports = {
  mode: 'production',
  target: 'node20',
  devtool: false,
  stats: 'errors-warnings',
  // ignoreWarnings property is AI generated
  ignoreWarnings: [
    {
      module: /express[\\/]lib[\\/]view\.js$/,
      message: /Critical dependency: the request of a dependency is an expression/
    }
  ],
  resolve: {
    fallback: {
      bufferutil: false,
      'utf-8-validate': false
    },
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
  entry: {
    server: './src/server.ts',
    'tray-launcher': './src/tray-launcher.ts',
    'electron-tray-main': './src/electron-tray/main.ts',
    controllers: [
      './src/controllers/config.controller.ts',
      './src/controllers/health.controller.ts',
      './src/controllers/session.controller.ts',
      './src/controllers/website.controller.ts'
    ],
    routes: [
      './src/routes/config.routes.ts',
      './src/routes/health.routes.ts',
      './src/routes/session.routes.ts',
      './src/routes/website.routes.ts'
    ],
    services: [
      './src/services/config.service.ts',
      './src/services/reaction.service.ts',
      './src/services/session.service.ts',
      './src/services/watched-websites.service.ts',
      './src/services/website-activity.service.ts',
      './src/services/ws.service.ts'
    ],
    utils: [
      './src/utils/env.ts',
      './src/utils/normalize-url.ts',
      './src/utils/time.ts'
    ]
  },
  // externalsPresets is AI generated
  externalsPresets: { node: true },
  // externals is AI generated
  externals: {
    electron: 'commonjs electron'
  },
  // optimization is AI generated
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: {
          condition: /@license|@preserve|^!/i,
          filename: 'THIRD_PARTY_LICENSES.txt',
          banner: false,
        },
        terserOptions: {
          format: {
            comments: false
          }
        }
      })
    ]
  },
  output: {
    filename: (pathData) => (
      pathData.chunk?.name === 'server'
        ? 'server.js'
        : pathData.chunk?.name === 'tray-launcher'
          ? 'tray-launcher.js'
          : pathData.chunk?.name === 'electron-tray-main'
            ? 'electron-tray/main.js'
          : 'helpers/[name].js'
    ),
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  }
};
