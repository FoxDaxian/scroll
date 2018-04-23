/*
 * @Author: fox 
 * @Date: 2018-04-22 13:02:42 
 * @Last Modified by: fox
 * @Last Modified time: 2018-04-22 17:16:26
 */
import webpack from 'webpack';
import debug from 'debug';
import express from 'express';
import config from 'config';
import path from 'path';
import fs from 'fs';
import http from 'http';
import socketIo from 'socket.io';
import Mfs from 'memory-fs';
import merge from 'webpack-merge';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HappyPack from 'happypack';

// build by myself
import defaultConf from './webpack.default';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import myPlugin from '../plugins/reload';

const extractSass = new ExtractTextPlugin({
    filename: 'static/scss/[name].[contenthash].css'
});

console.log = debug('console.log: ');
const { port } = config;
const mfs = new Mfs();
const app = express();
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(mfs.readFileSync(path.resolve(outpathPath, 'index.html')));
});

app.get('*', (req, res) => {
    try {
        if (path.extname(req.path) === '.css') {
            res.set({
                'Content-Type': 'text/css'
            });
        }
        res.end(mfs.readFileSync(outpathPath + req.path));
    } catch (e) {
        console.log(e);
        res.set({
            'Content-Type': 'text/plain;charset=UTF-8'
        });
        res.status(404).end('未发现响应文件内容');
    }
});
const httpServer = http.createServer(app);
const io = socketIo(httpServer);

const htmlPath = path.resolve(__dirname, '../dist/index.html');
const hasHtml = () => {
    return fs.existsSync(htmlPath);
};
if (!hasHtml()) {
    defaultConf.plugins.push(
        new HtmlWebpackPlugin({
            filename: './index.html',
			template: path.resolve(__dirname, '../index.html')
        })
    );
}
defaultConf.plugins.push(new myPlugin());
const devConf = merge(defaultConf, {
    devtool: 'cheap-module-eval-source-map',
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: extractSass.extract({
					use: ['happypack/loader?id=scss'],
                    fallback: 'style-loader'
                })
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('dev')
        }),
		new HappyPack({
			id: 'scss',
			loaders: [
				'css-loader', 'sass-loader'
			]
		}),
        extractSass
    ]
});

const compiler = webpack(devConf);
compiler.outputFileSystem = mfs;

const outpathPath = compiler.options.output.path;

compiler.watch(
    {
        aggregateTimeout: 500,
        ignored: /(node_modules|dist)/,
        poll: 1000
    },
    (err, stats) => {
        if (!err) {
            io.emit('reload');
        }
    }
);

const server = httpServer.listen(port, async () => {
    const { port } = server.address();
    console.log(`链接为: http://localhost:${port}`);
});