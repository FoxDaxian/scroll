import cheerio from 'cheerio';

function HelloWorldPlugin(options) {
    // 使用 options 设置插件实例……
}

HelloWorldPlugin.prototype.apply = function(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
        for (let item of Object.entries(compilation.assets)) {
            const isHtml = /\.html$/.test(item[0]);
            if (isHtml) {
                const $ = cheerio.load(item[1].source());
                $('body').append(
                    `<script src="/socket.io/socket.io.js"></script>
					<script>var socket = io();socket.on('connect', function () {socket.on('reload', function () {window.location.reload()})})</script>
					`
                );
                compilation.assets[item[0]].source = () => $.html();
            }
        }
        callback();
    });
};

export default HelloWorldPlugin;
