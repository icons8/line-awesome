import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import Icons from 'unplugin-icons/webpack';
import { ExternalPackageIconLoader } from 'unplugin-icons/loaders';

export default {
  entry: './src/main.jsx',
  output: { clean: true },
  resolve: { extensions: ['.js', '.jsx'] },
  module: {
    rules: [
      { test: /\.jsx$/, loader: 'esbuild-loader', options: { loader: 'jsx', jsx: 'automatic' } },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    Icons({ compiler: 'jsx', jsx: 'react', customCollections: ExternalPackageIconLoader('line-awesome') }),
  ],
};
