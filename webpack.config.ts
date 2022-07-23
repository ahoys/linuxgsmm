import path from 'path';
import DotEnv from 'dotenv-webpack';

export default {
  name: 'linuxgsm-master',
  target: 'node',
  entry: path.resolve(__dirname, './src/index.ts'),
  output: {
    path: path.resolve(__dirname, './build'),
    filename: 'linuxgsmm.js',
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        use: 'ts-loader',
        include: path.resolve(__dirname, './src'),
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    modules: ['node_modules'],
  },
  plugins: [new DotEnv()],
  optimization: {
    minimize: false,
  },
};
