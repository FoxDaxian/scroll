import config from 'config';
import path from 'path';

const entry = path.resolve(__dirname, '../src/index.js');
const outputPath = path.resolve(__dirname, '../dist');

const webpackConfig = {
    entry,
    output: {
        filename: './static/bundle.js',
        path: outputPath
    },
    plugins: []
};

export default webpackConfig;
