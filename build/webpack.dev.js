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
import Mfs from 'memory-fs';

console.log = debug('console.log: ');
const { port } = config;
const mfs = new Mfs();

const htmlPath = path.resolve(__dirname, '../dist/index.html');
const hasHtml = () => {
    return fs.existsSync(htmlPath);
};
if (!hasHtml()) {
    defaultConf.plugins.push(
        new HtmlWebpackPlugin({
            title: 'scroll',
            filename: './index.html'
        })
    );
}

const compiler = webpack(defaultConf);
compiler.outputFileSystem = mfs;

const outpathPath = compiler.options.output.path;

const watching = compiler.watch(
    {
        aggregateTimeout: 500,
        ignored: /(node_modules|dist)/,
        poll: 1000
    },
    (err, stats) => {
        if (!err) {
            console.log('编译成功');
        }
    }
);

const app = express();
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(mfs.readFileSync(path.resolve(outpathPath, 'index.html')));
});

app.get('*', (req, res) => {
    try {
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

const server = httpServer.listen(port, async () => {
    const { port } = server.address();
    console.log(`链接为: http://localhost:${port}`);
});
io.on('connection', () => {
    console.log('io连接');
});
