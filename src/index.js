/*
 * @Author: fox 
 * @Date: 2018-05-03 11:07:37 
 * @Last Modified by: fox
 * @Last Modified time: 2018-05-04 19:54:13
 */

// touchstart:		手指触摸到一个 DOM 元素时触发。
// touchmove:		手指在一个 DOM 元素上滑动时触发。
// touchend:		手指从一个 DOM 元素上移开时触发。

// touches:		正在触摸屏幕的所有手指的一个列表。
// targetTouches:  正在触摸当前 DOM 元素上的手指的一个列表。
// changedTouches: 涉及当前事件的手指的一个列表

class Scroll {
    mark = {
        identifier: null, // 唯一标识符，表明是否是同一次触摸过程
        direction: 'vertical', // horizontal vertical 默认垂直
        // 正常滚动
        scroll: {
            touchPoiot: 0, // touchstart 点
            curDist: 0 // 当前滚动距离
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
        }
    };

    className = {
        box: Symbol('box').toString()
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
        screenH: document.documentElement.clientHeight,
        screenW: document.documentElement.clientWidth
    };

    stretch = {
        max: 150,
        strength: 4,
        speed: 10
    };

    constructor(classname) {
        this.wrapBox = null;
        this.wrap = document.querySelector(classname);
        this.banNativeScroll();
        this.wrapAll();

        this.touchStart();
        this.touchMove();
        this.touchEnd();
    }

    // 创建元素包裹容器内所有元素
    wrapAll() {
        const fragment = document.createDocumentFragment();
        this.wrapBox = document.createElement('div');
        this.wrapBox.classList.add(this.className.box);
        const allChildNodes = Array.from(this.wrap.children);
        allChildNodes.forEach((child, i) => {
            this.wrapBox.appendChild(this.wrap.removeChild(child));
        });
        fragment.appendChild(this.wrapBox);
        this.wrap.appendChild(fragment);
    }

    // 禁止原生滚动
    banNativeScroll() {
        this.wrap.addEventListener('touchstart', function(e) {
            e.preventDefault();
        });
        this.wrap.addEventListener('mousewheel', function(e) {
            e.preventDefault();
        });
    }

    // 获取滑动距离
    getTranslate() {
        return this.wrapBox.style.transform.match(/-?\d+/)[0];
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
            y: !!this.wrapBox.style.transform ? this.getTranslate() : 0,
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

    refresh() {
        this.mark.scroll.curDist = 0;
        this.mark.inertialMotion.dist.now = 0;
        this.mark.inertialMotion.speed = 0;
        this.setTranslate(0);
        this.emit('onRefresh');
    }

    touchStart() {
        const fnName = this.touchStart.name;
        this.wrap.addEventListener('touchstart', e => {
            const touch = Array.from(e.touches)[0];
            this.emitEvent(fnName, e, touch);
            this.mark.scroll.touchPoiot = ~~touch.clientY;
            this.mark.identifier = touch.identifier;
            this.mark.inertialMotion.speed = 0;

            // 缓冲动画
            this.mark.inertialMotion.time.touch = e.timeStamp;
        });
    }
    touchMove() {
        const fnName = this.touchMove.name;
        let moveValue;
        this.wrap.addEventListener('touchmove', e => {
            const touch = Array.from(e.touches)[0];
            if (this.mark.identifier === touch.identifier) {
                // 不断更新 touchPoint 来 获取下一次move 移动的距离
                const moveNum = touch.clientY - this.mark.scroll.touchPoiot;

                // 边缘回弹
                if (moveValue >= 0) {
                    const restDist =
                        this.stretch.max - this.mark.scroll.curDist;

                    // 十字相乘，当前剩余可滑动距离 / 猴皮筋强度 / 当前剩余可滑动距离  = 想要的距离结果 / 这次和上次滑动距离的差
                    moveValue =
                        +this.mark.scroll.curDist +
                        restDist / this.stretch.strength * moveNum / restDist;

                    // 还差回缩
                } else {
                    moveValue = +this.mark.scroll.curDist + moveNum;
                }

                this.mark.scroll.touchPoiot = touch.clientY;
                this.mark.scroll.curDist = moveValue;

                this.setTranslate(moveValue);

                // 钩子函数部分
                if (!this.mark.inertialMotion.dist.now) {
                    this.emit(
                        'onScrollStart',
                        this.returnHookArgs('scrollstart', e, touch)
                    );
                }

                this.emitEvent(fnName, e, touch);

                if (this.mark.inertialMotion.dist.now) {
                    this.emit(
                        'onScroll',
                        this.returnHookArgs('scroll', e, touch)
                    );
                }

                // 缓冲动画
                this.mark.inertialMotion.dist.last = this.mark.inertialMotion.dist.now;
                this.mark.inertialMotion.dist.now = ~~touch.clientY;
                this.mark.inertialMotion.time.last = this.mark.inertialMotion.time.now;
                this.mark.inertialMotion.time.now = e.timeStamp;
            }
        });
    }
    touchEnd() {
        const fnName = this.touchEnd.name;
        this.wrap.addEventListener('touchend', e => {
            const touch = Array.from(e.changedTouches)[0];
            if (this.mark.identifier === touch.identifier) {
                this.emitEvent(fnName, e, touch);
                this.mark.identifier = null;
                !!this.wrapBox.style.transform &&
                    (this.mark.scroll.curDist = this.getTranslate());

				// 回弹减速度 利用数学公式
                if (this.mark.scroll.curDist > 0) {
                    let tempSpeed = this.stretch.speed;
                    const stretchFn = () => {
                        if (this.mark.scroll.curDist > 0) {
                            this.setTranslate(this.getTranslate() - tempSpeed);

                            tempSpeed =
                                this.getTranslate() *
                                this.stretch.speed /
                                this.mark.scroll.curDist;
                            console.log(tempSpeed);

                            this.getTranslate() < 0 && this.setTranslate(0);

                            this.mark.scroll.curDist = this.getTranslate();
                            requestAnimationFrame(stretchFn);
                        }
                    };
                    requestAnimationFrame(stretchFn);
                }

                // 缓冲动画
                if (e.timeStamp - this.mark.inertialMotion.time.now < 30) {
                    const time =
                        this.mark.inertialMotion.time.now -
                        this.mark.inertialMotion.time.last;
                    const dist = Math.abs(
                        this.mark.inertialMotion.dist.now -
                            this.mark.inertialMotion.dist.last
                    );
                    // 速度
                    this.mark.inertialMotion.speed = Math.min(
                        ~~(dist / (time / 1000) / 40),
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
                        this.setTranslate(
                            +this.mark.scroll.curDist +
                                this.mark.inertialMotion.speed *
                                    this.mark.inertialMotion.dir
                        );

                        if (this.mark.inertialMotion.speed > 0) {
                            this.mark.inertialMotion.speed -= Math.ceil(
                                this.mark.inertialMotion.speed /
                                    this.mark.inertialMotion.a
                            );
                            this.mark.scroll.curDist = this.getTranslate();
                            requestAnimationFrame(fn);
                            this.emit(
                                'onScroll',
                                this.returnHookArgs('scroll', e, touch)
                            );
                        } else {
                            this.emit(
                                'onScrollEnd',
                                this.returnHookArgs('scrollend', e, touch)
                            );
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
        });
    }
}

const scroll = new Scroll('.wrap');

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
    // console.log('scroll开始');
});
scroll.on('onScroll', args => {
    // console.log('scroll 中');
    // console.log(args.y);
});
scroll.on('onScrollEnd', args => {
    // console.log('scroll结束');
});

scroll.on('onRefresh', () => {
    console.log('刷新完成');
});
