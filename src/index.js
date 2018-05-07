/*
 * @Author: fox 
 * @Date: 2018-05-03 11:07:37 
 * @Last Modified by: fox
 * @Last Modified time: 2018-05-07 17:58:38
 */

// touchstart:		手指触摸到一个 DOM 元素时触发。
// touchmove:		手指在一个 DOM 元素上滑动时触发。
// touchend:		手指从一个 DOM 元素上移开时触发。

// touches:		正在触摸屏幕的所有手指的一个列表。
// targetTouches:  正在触摸当前 DOM 元素上的手指的一个列表。
// changedTouches: 涉及当前事件的手指的一个列表

import 'scss/index.scss';

class Scroll {
    mark = {
        identifier: null, // 唯一标识符，表明是否是同一次触摸过程
        direction: 'vertical', // horizontal vertical 默认垂直
        scrollbars: false,
        bounce: true,
        isBounds: false,
        // 正常滚动
        scroll: {
            touchPoiot: 0, // touchstart 点
            curTranslate: 0, // 当前translate,
            maxTranslate: 0 // 最大translate，不包括橡皮筋超出的
        },
        // 惯性运动
        inertialMotion: {
            speed: 0, // 速度
            a: 40, // 减速度
            dir: null,
            canMotion: false,
            time: {
                last: 0,
                now: 0
            },
            dist: {
                last: 0,
                now: 0
            }
        },
        lastMoveE: null,
        lastWrapBox: 0
    };

    eventQueue = {
        onTouchStart: [],
        onTouchMove: [],
        onTouchEnd: [],
        onRefresh: [],
        onScrollStart: [],
        onScroll: [],
        onScrollEnd: []
    };

    device = {
        screenH: window.screen.height,
        screenW: window.screen.width
    };

    // 边缘伸缩部分
    stretch = {
        scrollMax: 100,
        max: document.documentElement.clientHeight, // 最大伸缩距离
        strength: 4, // 边缘牵扯力
        multiple: 0.18, // 回缩倍数
        radId: null,
        bottomScrollMax: 0,
        specialValue: 0.1
    };

    bar = {
        el: null,
        scrollMax: 0, // bar 能滚动的最大值
        time: 1500,
        stId: null
    };

    constructor(
        classname,
        conf = {
            direction: 'vertical',
            bounce: true,
            scrollbars: false,
            smooth: 40, //惯性运动光滑，越小摩擦力越大
            pullForce: 4 // 边缘牵扯力，越大越难拉
        }
    ) {
        this.mark.direction = conf.direction;
        this.mark.scrollbars = conf.scrollbars;
        this.mark.bounce = conf.bounce;
        this.mark.inertialMotion.a = conf.smooth;
        this.stretch.strength = conf.pullForce;

        this.wrapBox = null;
        this.wrap = document.querySelector(classname);
        this.preventNativeScroll();
        this.wrapAll();
        if (this.mark.scrollbars) {
            this.scrollBar();
        }

        this.initTouchStart();
        this.initTouchMove();
        this.initTouchEnd();

        if (this.wrapBox.offsetHeight < this.wrap.offsetHeight) {
            this.stretch.bottomScrollMax = this.stretch.specialValue;
        } else {
            this.stretch.bottomScrollMax =
                (this.wrapBox.offsetHeight - this.wrap.offsetHeight) * -1;
            !this.stretch.bottomScrollMax &&
                (this.stretch.bottomScrollMax = this.stretch.specialValue);
        }
        this.mark.scroll.maxTranslate =
            this.wrapBox.offsetHeight - this.wrap.offsetHeight;
    }

    // 创建元素包裹容器内所有元素
    wrapAll() {
        const fragment = document.createDocumentFragment();
        this.wrapBox = document.createElement('div');
        this.wrapBox.classList.add('easybox');
        this.wrap.style.overflow = 'hidden';
        this.wrap.style.position = 'relative';
        // 需要手动设置高度
        this.wrap.style.height = `${this.stretch.max}px`;
        this.wrap.style.height = `60vh`;
        this.setTranslate(0);
        const allChildNodes = Array.from(this.wrap.children);
        allChildNodes.forEach((child, i) => {
            this.wrapBox.appendChild(this.wrap.removeChild(child));
        });
        fragment.appendChild(this.wrapBox);
        this.wrap.appendChild(fragment);
    }

    // 配置滚动条
    scrollBar() {
        this.bar.el = document.createElement('div');
        this.bar.el.classList.add('easybar');
        this.wrap.appendChild(this.bar.el);
        document.body.addEventListener('touchmove', this.barScroll.bind(this));
    }

    barScroll() {
        if (!this.mark.scrollbars) {
            return;
        }
        if (this.bar.el.classList.contains('hidden')) {
            this.bar.el.classList.toggle('hidden');
        }
        this.bar.stId !== null && clearTimeout(this.bar.stId);
        if (this.wrapBox.offsetHeight !== this.mark.lastWrapBox) {
            this.setBarHeight();
        }
        const ratio =
            this.mark.scroll.curTranslate / this.mark.scroll.maxTranslate * -1;
        this.setbarTranslate(ratio * this.bar.scrollMax);
        this.bar.stId = setTimeout(() => {
            this.bar.el.classList.toggle('hidden');
        }, this.bar.time);
    }

    setbarTranslate(value) {
        this.bar.el.style.transform = `translateY(${value}px)`;
    }

    setBarHeight() {
        if (this.wrap.offsetHeight < this.wrapBox.offsetHeight) {
            this.bar.el.style.height = `${this.wrap.offsetHeight /
                this.wrapBox.offsetHeight *
                this.wrap.offsetHeight}px`;
            this.bar.scrollMax =
                this.wrap.offsetHeight - this.bar.el.offsetHeight;
            this.mark.lastWrapBox = this.wrapBox.offsetHeight;
        }
    }

    // 禁止原生滚动
    preventNativeScroll() {
        document.body.addEventListener('touchmove', function(e) {
            e.preventDefault();
        });
        document.body.addEventListener('mousewheel', function(e) {
            e.preventDefault();
        });
        if (
            window.navigator.userAgent.toLowerCase().match(/MicroMessenger/i) ==
            'micromessenger'
        ) {
            const fragment = document.createDocumentFragment();
            const forWxBox = document.createElement('div');
            forWxBox.classList.add('forWx');
            forWxBox.style.height = '100vh';
            const allChildNodes = Array.from(document.body.children);
            allChildNodes.forEach((child, i) => {
                if (
                    !['script', 'link'].includes(
                        child.nodeName.toLocaleLowerCase()
                    )
                ) {
                    forWxBox.appendChild(document.body.removeChild(child));
                }
            });
            fragment.appendChild(forWxBox);
            document.body.appendChild(fragment);

            forWxBox.addEventListener('touchmove', function(e) {
                e.preventDefault();
            });
        }
    }

    // 获取滑动距离
    getTranslate() {
        return +this.wrapBox.style.transform.match(/-?[\d\.]+/)[0];
    }

    // 设置translate
    setTranslate(value) {
        this.wrapBox.style.transform = `translateY(${value}px)`;
    }

    on(event, cb) {
        switch (event) {
            case 'onTouchStart':
                this.eventQueue[event].push(cb);
                break;
            case 'onTouchMove':
                this.eventQueue[event].push(cb);
                break;
            case 'onTouchEnd':
                this.eventQueue[event].push(cb);
                break;
            case 'onScrollStart':
                this.eventQueue[event].push(cb);
                break;
            case 'onScroll':
                this.eventQueue[event].push(cb);
                break;
            case 'onScrollEnd':
                this.eventQueue[event].push(cb);
                break;
            case 'onRefresh':
                this.eventQueue[event].push(cb);
                break;
            default:
                throw new Error(
                    'this hook does not exist, please see https://github.com/a13821190779/scroll/blob/master/README.md for more infomation'
                );
        }
    }

    emit(event, options = {}) {
        const events = this.eventQueue[event];
        for (let i = 0, len = events.length; i < len; i++) {
            events[i].call(this, options);
        }
    }

    // 返回钩子函数参数
    returnHookArgs(name, e, touch) {
        const options = {
            type: name,
            timeStamp: e.timeStamp, // 时间戳
            srcElement: e.srcElement, // 事件源
            target: e.target, // 触发事件的节点
            x: 0,
            y: Math.round(this.getTranslate() * 1000) / 1000,
            force: 1 // 按压强度
        };
        return options;
    }

    // 第一个字符大写
    UpperFristCase(str) {
        return str.replace(/./, letter => {
            return letter.toLocaleUpperCase();
        });
    }

    emitEvent = (fnName, e, touch) => {
        this.emit(
            `on${this.UpperFristCase(fnName)}`,
            this.returnHookArgs(fnName.toLocaleLowerCase(), e, touch)
        );
    };

    // 回缩功能函数
    retraction(aimTranslate, e, touch) {
        let condition = false;
        if (aimTranslate === this.stretch.specialValue) {
            condition = true;
        }
        const stretchFn = () => {
            if (
                Math.abs(this.mark.scroll.curTranslate) > Math.abs(aimTranslate)
            ) {
                let moveValue =
                    (Math.abs(this.getTranslate()) - Math.abs(aimTranslate)) *
                    this.stretch.multiple;

                aimTranslate < 0 && (moveValue *= -1);

                if (condition) {
                    this.setTranslate(this.getTranslate() + moveValue);
                    Math.abs(this.getTranslate()) <=
                        Math.abs(aimTranslate) + 0.2 && this.setTranslate(0);
                } else {
                    this.setTranslate(this.getTranslate() - moveValue);
                    Math.abs(this.getTranslate()) <=
                        Math.abs(aimTranslate) + 0.2 &&
                        this.setTranslate(aimTranslate);
                }

                this.mark.scroll.curTranslate = this.getTranslate();
                this.emit('onScroll', this.returnHookArgs('scroll', e, touch));
                this.barScroll();
                this.stretch.radId = requestAnimationFrame(stretchFn);
            } else {
                this.emit(
                    'onScrollEnd',
                    this.returnHookArgs('scrollend', e, touch)
                );
            }
        };
        this.stretch.radId = requestAnimationFrame(stretchFn);
    }

    refresh() {
        this.mark.scroll.curTranslate = 0;
        this.mark.inertialMotion.dist.now = 0;
        this.mark.inertialMotion.speed = 0;
        this.setTranslate(0);
        this.emit('onRefresh');
    }

    touchStart(e) {
        this.mark.isBounds = true;
        const fnName = this.touchStart.name;
        const touch = Array.from(e.touches)[0];
        this.emitEvent(fnName, e, touch);

        this.mark.scroll.touchPoiot = touch.clientY;
        this.mark.identifier = touch.identifier;
        this.mark.inertialMotion.speed = 0;

        // 缓冲动画
        this.mark.inertialMotion.time.touch = e.timeStamp;
        this.stretch.radId !== null && cancelAnimationFrame(this.stretch.radId);
    }

    initTouchStart() {
        this.wrap.addEventListener('touchstart', this.touchStart.bind(this));
    }

    touchMove(e) {
        const fnName = this.touchMove.name;
        let moveValue;
        const touch = Array.from(e.touches)[0];
        if (this.mark.identifier === touch.identifier) {
            // 不断更新 touchPoint 来 获取下一次move 移动的距离
            const moveNum = touch.clientY - this.mark.scroll.touchPoiot;

            moveValue = +this.mark.scroll.curTranslate + moveNum;

            if (this.mark.bounce) {
                // 边缘回弹
                // 十字相乘，当前剩余可滑动距离 / 猴皮筋强度 / 当前剩余可滑动距离  = 想要的距离结果 / 这次和上次滑动距离的差
                if (this.mark.scroll.curTranslate > 0) {
                    const restDist =
                        this.stretch.max - this.mark.scroll.curTranslate;

                    moveValue =
                        this.mark.scroll.curTranslate +
                        restDist / this.stretch.strength * moveNum / restDist;
                } else if (
                    this.mark.scroll.curTranslate < this.stretch.bottomScrollMax
                ) {
                    const restDist =
                        this.stretch.bottomScrollMax -
                        this.mark.scroll.curTranslate;

                    moveValue =
                        this.mark.scroll.curTranslate +
                        restDist / this.stretch.strength * moveNum / restDist;
                }

                this.mark.scroll.touchPoiot = touch.clientY;
                this.mark.scroll.curTranslate = moveValue;
            } else {
                if (moveValue > 0) {
                    moveValue = 0;
                } else if (moveValue < this.stretch.bottomScrollMax) {
                    moveValue = this.stretch.bottomScrollMax;
                }
            }

            this.setTranslate(moveValue);

            this.emitEvent(fnName, e, touch);

            // 钩子函数部分
            if (!this.mark.inertialMotion.dist.now) {
                this.emit(
                    'onScrollStart',
                    this.returnHookArgs('scrollstart', e, touch)
                );
            }

            if (this.mark.inertialMotion.dist.now) {
                this.emit('onScroll', this.returnHookArgs('scroll', e, touch));
            }

            // 缓冲动画
            this.mark.inertialMotion.dist.last = this.mark.inertialMotion.dist.now;
            this.mark.inertialMotion.dist.now = touch.clientY;
            this.mark.inertialMotion.time.last = this.mark.inertialMotion.time.now;
            this.mark.inertialMotion.time.now = e.timeStamp;
        }
    }

    // 超出边界，利用自定义事件
    outOfBounds(e) {
        const pageH = document.documentElement.clientHeight;
        const touch = Array.from(e.changedTouches)[0];

        if (
            (this.mark.scroll.curTranslate > 0 && touch.clientY > pageH) ||
            (this.mark.scroll.curTranslate < this.stretch.bottomScrollMax &&
                touch.clientY < 0)
        ) {
            if (this.mark.isBounds) {
                var event = new CustomEvent('touchend', {
                    detail: {
                        outof: true,
                        e: this.mark.lastMoveE
                    }
                });
                window.dispatchEvent(event);
            }
        }

        this.mark.lastMoveE = e;
    }

    initTouchMove() {
        document.body.addEventListener(
            'touchmove',
            this.outOfBounds.bind(this)
        );
        document.body.addEventListener('touchmove', this.touchMove.bind(this));
    }

    touchEnd(e) {
        const fnName = this.touchEnd.name;
        let custom = e;
        if (e.detail.outof) {
            custom = e.detail.e;
        }
        this.mark.isBounds = false;
        const touch = Array.from(custom.changedTouches)[0];
        if (this.mark.identifier === touch.identifier) {
            this.mark.identifier = null;
            this.emitEvent(fnName, custom, touch);
            this.mark.scroll.curTranslate = this.getTranslate();

            // 手指抬起的时候如果超过返回，则调用开始回缩
            // 回缩功能
            if (this.mark.scroll.curTranslate > 0) {
                this.retraction(0, custom, touch);
            } else if (
                this.mark.scroll.curTranslate < this.stretch.bottomScrollMax
            ) {
                this.retraction(this.stretch.bottomScrollMax, custom, touch);
            } else {
                // 缓冲动画
                if (custom.timeStamp - this.mark.inertialMotion.time.now < 30) {
                    const time =
                        this.mark.inertialMotion.time.now -
                        this.mark.inertialMotion.time.last;
                    const dist = Math.abs(
                        this.mark.inertialMotion.dist.now -
                            this.mark.inertialMotion.dist.last
                    );
                    // 速度
                    this.mark.inertialMotion.speed = Math.min(
                        dist / (time / 1000) / 40,
                        50
                    );

                    // 方向
                    this.mark.inertialMotion.dir =
                        this.mark.inertialMotion.dist.now -
                            this.mark.inertialMotion.dist.last >
                        0
                            ? 1
                            : -1;

                    this.mark.inertialMotion.dist.now = 0;

                    const fn = () => {
                        if (
                            this.mark.scroll.curTranslate >
                                this.stretch.scrollMax &&
                            this.mark.bounce
                        ) {
                            this.mark.inertialMotion.speed = 0;
                            this.retraction(0, e, touch);
                        } else if (
                            this.mark.scroll.curTranslate <
                                this.stretch.bottomScrollMax -
                                    this.stretch.scrollMax &&
                            this.mark.bounce
                        ) {
                            this.mark.inertialMotion.speed = 0;
                            this.retraction(
                                this.stretch.bottomScrollMax,
                                e,
                                touch
                            );
                        } else {
                            this.setTranslate(
                                this.mark.scroll.curTranslate +
                                    this.mark.inertialMotion.speed *
                                        this.mark.inertialMotion.dir
                            );
                            if (this.mark.inertialMotion.speed > 0) {
                                if (!this.mark.bounce) {
                                    if (this.getTranslate() > 0) {
                                        this.mark.inertialMotion.speed = 0;
                                        this.setTranslate(0);
                                        this.mark.scroll.curTranslate = this.getTranslate();
                                    } else if (
                                        this.getTranslate() <
                                        this.stretch.bottomScrollMax
                                    ) {
                                        this.mark.inertialMotion.speed = 0;
                                        this.setTranslate(
                                            this.stretch.bottomScrollMax
                                        );
                                        this.mark.scroll.curTranslate = this.getTranslate();
                                    }
                                }
                                this.mark.inertialMotion.speed -= Math.ceil(
                                    this.mark.inertialMotion.speed /
                                        this.mark.inertialMotion.a
                                );
                                this.mark.scroll.curTranslate = this.getTranslate();
                                this.emit(
                                    'onScroll',
                                    this.returnHookArgs('scroll', e, touch)
                                );
                                this.barScroll();

                                requestAnimationFrame(fn);
                            } else if (this.mark.bounce) {
                                if (this.mark.scroll.curTranslate > 0) {
                                    this.mark.inertialMotion.speed = 0;
                                    this.retraction(0, e, touch);
                                } else if (
                                    this.mark.scroll.curTranslate <
                                    this.stretch.bottomScrollMax
                                ) {
                                    this.mark.inertialMotion.speed = 0;
                                    this.retraction(
                                        this.stretch.bottomScrollMax,
                                        e,
                                        touch
                                    );
                                } else {
                                    this.emit(
                                        'onScrollEnd',
                                        this.returnHookArgs(
                                            'scrollend',
                                            e,
                                            touch
                                        )
                                    );
                                }
                            }
                        }
                    };
                    requestAnimationFrame(fn);
                } else {
                    this.mark.inertialMotion.dist.now = 0;
                    this.emit(
                        'onScrollEnd',
                        this.returnHookArgs('scrollend', e, touch)
                    );
                }
            }
        }
    }

    initTouchEnd() {
        window.addEventListener('touchend', this.touchEnd.bind(this));
        window.addEventListener('touchcancel', this.touchEnd.bind(this));
    }

    destroy() {
        this.wrap.removeEventListener('touchstart', this.touchStart.bind(this));
        document.body.removeEventListener(
            'touchmove',
            this.outOfBounds.bind(this)
        );
        document.body.removeEventListener(
            'touchmove',
            this.touchMove.bind(this)
        );
        window.removeEventListener('touchend', this.touchEnd.bind(this));
        window.removeEventListener('touchcancel', this.touchEnd.bind(this));

        // 滚动条
        if (this.mark.scrollbars) {
            document.body.removeEventListener(
                'touchmove',
                this.barScroll.bind(this)
            );
        }
    }
}

const scroll = new Scroll('.wrap', {
    direction: 'horizontal',
    bounce: true,
    scrollbars: false,
    smooth: 40,
    pullForce: 4
});

scroll.on('onTouchStart', args => {
    // console.log('touchstart');
});
scroll.on('onTouchMove', args => {
    // console.log('touchmove 中');
});
scroll.on('onTouchEnd', args => {
    // console.log('touchend结束了');
});

scroll.on('onScrollStart', args => {
    // console.log('滚动   ==开始');
});
scroll.on('onScroll', args => {
    // console.log('滚动   ==中');
});
scroll.on('onScrollEnd', args => {
    // console.log('滚动   ==结束');
});
