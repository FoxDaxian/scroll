import config from 'config';
import path from 'path';

const entry = path.resolve(__dirname, '../src/index.js');
const outputPath = path.resolve(__dirname, '../dist');

const webpackConfig = {
    entry,
    output: {
        filename: 'bundle.js',
        path: path.join(outputPath, 'static')
    },
    plugins: []
};

export default webpackConfig;
