import config from 'config';
import path from 'path';
import HappyPack from 'happypack';

const entry = path.resolve(__dirname, '../src/index.js');
const outputPath = path.resolve(__dirname, '../dist');

const webpackConfig = {
    entry,
    output: {
        filename: './static/bundle.js',
        path: outputPath
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: path.resolve(__dirname, '../node_modules'),
                use: ['happypack/loader?id=babel']
            }
        ]
    },
    plugins: [
        new HappyPack({
            id: 'babel',
            loaders: ['babel-loader']
        })
    ],
    resolve: {
        alias: {
            scss: path.resolve(__dirname, '../src/scss')
        }
    }
};

export default webpackConfig;
