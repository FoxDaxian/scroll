/*
 * @Author: fox 
 * @Date: 2018-04-22 13:02:42 
 * @Last Modified by: fox
 * @Last Modified time: 2018-05-28 15:32:47
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
import logs from '../tools/logs';
import chalk from 'chalk';
import open from 'open';

// build by myself
import defaultConf from './webpack.default';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import myPlugin from '../plugins/reload';
const { compilerStatsLogger } = logs;
import clear from '../tools/clear';

const extractSass = new ExtractTextPlugin({
    filename: 'static/scss/[name].[contenthash].css'
});

const log = debug('console.log: ');
const { port } = config;
const mfs = new Mfs();
const app = express();
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
} else {
    // 没有目录的模板html的时候
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
            'process.env.NODE_ENV': JSON.stringify('developer')
        }),
        new HappyPack({
            id: 'scss',
            loaders: ['css-loader', 'sass-loader']
        }),
        extractSass
    ]
});

const compiler = webpack(devConf);
compiler.outputFileSystem = mfs;

const outpathPath = compiler.options.output.path;
app.get('/', (req, res) => {
    res.set({
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
    });
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
        log(e, '=====', req.path);
        res.set({
            'Content-Type': 'text/plain;charset=UTF-8'
        });
        res.status(404).end('未发现响应文件内容');
    }
});

// 上一次编译的chunks的hash记录
let lastChunkHash = [];

let hasOpen = false;
compiler.watch(
    {
        aggregateTimeout: 500,
        ignored: /(node_modules|dist)/,
        poll: 1000
    },
    function(err, stats) {
        const compilerRes = stats.toJson();
        if (!err) {
            if (!hasOpen) {
                open(`http://localhost:${port}`);
                hasOpen = !hasOpen;
            }
            // 对比决定是否reoad
            if (
                lastChunkHash.length === 0 ||
                compilerRes.chunks.some((chunk, index) => {
                    return (
                        chunk.hash !== lastChunkHash[index].hash ||
                        chunk.files.some((fileName, i) => {
                            return fileName !== lastChunkHash[index].files[i];
                        })
                    );
                })
            ) {
                io.emit('reload');
                clear();
                process.stdout.write(
                    '\n\n' +
                        stats.toString({
                            colors: true,
                            modules: false,
                            children: false, // If you are using ts-loader, setting this to true will make TypeScript errors show up during build.
                            chunks: false,
                            chunkModules: false
                        }) +
                        '\n\n'
                );
            }
            lastChunkHash = compilerRes.chunks;
        }
    }
);

const server = httpServer.listen(port, async () => {
    const { port } = server.address();
    process.stdout.write(
        chalk.blueBright(`链接为: http://localhost:${port}\n`)
    );
});
