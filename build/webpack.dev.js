import webpack from 'webpack';
import debug from 'debug';
import express from 'express';
import defaultConf from './webpack.default';
import config from 'config';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import fs from 'fs';
import socketIo from 'socket.io';
import http from 'http';

const log = debug('console.log: ');
const { port } = config;

const htmlPath = path.resolve(__dirname, '../dist/index.html');
const hasHtml = () => {
    return new Promise((resolve, reject) => {
        fs.exists(htmlPath, res => {
            return resolve(res);
        });
    });
};

const app = express();

app.use('/', express.static(path.resolve(__dirname, '../dist')));
const httpServer = http.createServer(app);

const io = socketIo(httpServer);

const server = httpServer.listen(port, async () => {
    if (!await hasHtml()) {
        defaultConf.plugins.push(
            new HtmlWebpackPlugin({
                title: 'scroll',
                filename: '../index.html'
            })
        );
    }
    const compiler = webpack(defaultConf);

    const watching = compiler.watch(
        {
            aggregateTimeout: 500,
            ignored: /(node_modules|dist)/,
            poll: 1000
        },
        (err, stats) => {
            if (!err) {
                log('编译成功');
            }
        }
    );

    const { port } = server.address();
    log(`链接为: http://localhost:${port}`);
});
io.on('connection', () => {
    log('io连接');
});
