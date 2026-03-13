/**
 * DISCLAIMER:
 * I am familiar enough with webpack to understand exactly what is going on.
 * AI was used to generate initial config on the fly.
 * I did have to go in and modify the end result myself as it did not originally meet my end goals.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TerserPlugin from 'terser-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * @type {import('webpack').Configuration}
 */
const config = {
	mode: 'production',
	target: 'webworker',
	devtool: false,
	stats: 'errors-warnings',
	resolve: {
		extensionAlias: {
			'.js': ['.ts', '.js']
		},
		extensions: ['.ts', '.js']
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	entry: {
    background: './src/background.ts',
    api: './src/api/systemApp.ts',
    services: [
      './src/services/configStore.ts',
      './src/services/tabState.ts',
    ],
	},
	optimization: {
		splitChunks: false,
		runtimeChunk: false,
		minimize: true,
		minimizer: [
			new TerserPlugin({
				extractComments: {
					condition: /@license|@preserve|^!/i,
					filename: 'THIRD_PARTY_LICENSES.txt',
					banner: false
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
      pathData.chunk?.name === 'background'
        ? 'background.js'
        : 'helpers/[name].js'
    ),
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  }
};

export default config;
