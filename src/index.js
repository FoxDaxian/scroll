/*
 * @Author: fox 
 * @Date: 2018-05-03 11:07:37 
 * @Last Modified by: fox
 * @Last Modified time: 2018-05-11 12:17:24
 */

// touchstart:		手指触摸到一个 DOM 元素时触发。
// touchmove:		手指在一个 DOM 元素上滑动时触发。
// touchend:		手指从一个 DOM 元素上移开时触发。

// touches:		正在触摸屏幕的所有手指的一个列表。
// targetTouches:  正在触摸当前 DOM 元素上的手指的一个列表。
// changedTouches: 涉及当前事件的手指的一个列表

import { throttle, debounce } from '../tools/jstool';
import 'scss/index.scss';

const noop = function () { };
const throwError = function () {
    throw new Error('arguments error');
};
class Scroll {
    mark = {
        isVertical: true,
        identifier: null, // 唯一标识符，表明是否是同一次触摸过程
        direction: 'vertical', // horizontal vertical 默认垂直
        scrollbars: false,
        bounce: true,
        isBounds: false,
        // 正常滚动
        scroll: {
            touchPoint: 0, // touchstart 点
            curTranslate: 0, // 当前translate,
            maxTranslate: 0, // 最大translate，不包括橡皮筋超出的
            x: 0,
            y: 0
        },
        // 惯性运动
        inertialMotion: {
            speed: 0, // 速度
            a: 40, // 减速度
            dir: null,
            canMotion: false,
            time: {
                last: 0,
                now: 0,
                touch: null
            },
            dist: {
                last: 0,
                now: 0
            }
        },
        lastMoveE: null
    };

    operate = {
        radId: null
    };

    opt = {
        offsetSize: 'offsetHeight',
        rule: 'height',
        clientSize: 'clientHeight',
        clientDir: 'clientY',
        dir: 'y'
    };

    eventQueue = {
        onTouchStart: [],
        onTouchMove: [],
        onTouchEnd: [],
        onRefresh: [],
        onScrollStart: [],
        onScroll: [],
        onScrollEnd: [],
        setCoordinate: [],
        setBarTranslate: []
    };

    // 边缘伸缩部分
    stretch = {
        scrollMax: 100,
        max:
            this.mark.direction === 'vertical'
                ? document.documentElement.clientHeight
                : document.documentElement.clientWidth, // 最大伸缩距离
        strength: 4, // 边缘牵扯力
        multiple: 0.2, // 回缩倍数
        radId: null, // 待reqframe的id
        stretchMax: 0,
        specialValue: 0.1
    };

    bar = {
        x: 0,
        y: 0,
        el: null,
        scrollMax: 0, // bar 能滚动的最大值
        time: 500,
        stId: null,
        lastWrapBox: 0
    };

    constructor(
        el = throwError(),
        {
            direction = 'vertical',
            bounce = true,
            scrollbars = false,
            smooth = 40, //惯性运动光滑，越小摩擦力越大
            pullForce = 4 // 边缘牵扯力，越大越难拉
        } = {
                direction: 'vertical',
                bounce: true,
                scrollbars: false,
                smooth: 40, //惯性运动光滑，越小摩擦力越大
                pullForce: 4 // 边缘牵扯力，越大越难拉
            }
    ) {
        try {
            el = el.nodeType ? el : document.body.querySelector(el);
            if (!el) {
                throw 'please pass the correct element';
            }
            this.mark.direction = direction;
            this.mark.scrollbars = scrollbars;
            this.mark.bounce = bounce;
            this.mark.inertialMotion.a = smooth;
            this.stretch.strength = pullForce;

            this.wrap = el;
            this.wrap.classList.add('easywrap');
            this.preventNativeScroll();

            this.mark.isVertical = this.mark.direction === 'vertical';
            if (!this.mark.isVertical) {
                this.opt = {
                    rule: 'width',
                    offsetSize: 'offsetWidth',
                    clientSize: 'clientWidth',
                    clientDir: 'clientX',
                    dir: 'x'
                };
            }
            this.opt = {
                rule: this.mark.isVertical ? 'height' : 'width',
                offsetSize: this.mark.isVertical
                    ? 'offsetHeight'
                    : 'offsetWidth',
                clientSize: this.mark.isVertical
                    ? 'clientHeight'
                    : 'clientWidth',
                clientDir: this.mark.isVertical ? 'clientY' : 'clientX',
                dir: this.mark.isVertical ? 'y' : 'x'
            };

            this.wrapAll();
            this.initMax()
            this.setTranslate();
            this.detect();
            if (this.mark.scrollbars) {
                this.scrollBar();
            }

            this.touchStart = this.touchStart.bind(this);
            this.outOfBounds = throttle(this.outOfBounds).bind(this);
            this.touchMove = throttle(this.touchMove).bind(this);
            this.touchEnd = this.touchEnd.bind(this);
            this.barScroll = this.barScroll.bind(this);

            this.initTouchStart();
            this.initTouchMove();
            this.initTouchEnd();

            this.on('setBarTranslate', coordinate => {
                this.bar.x = coordinate.x;
                this.bar.y = coordinate.y;
                this.setbarTranslate(coordinate.x, coordinate.y);
            });
            this.on('setCoordinate', coordinate => {
                this.mark.scroll.x = coordinate.x;
                this.mark.scroll.y = coordinate.y;
                this.setTranslate(this.mark.scroll.x, this.mark.scroll.y);
            });
        } catch (e) {
            throw e;
        }
    }

    detect() {
        const observer = new MutationObserver(debounce(() => {
            this.setEasyBox()
            this.initMax()
        }));
        const options = {
            childList: true,
            subtree: true
        };
        observer.observe(this.wrapBox, options);
    }

    // 创建元素包裹容器内所有元素
    wrapAll() {
        this.wrapBox = document.createElement('div');
        this.wrapBox.classList.add('easybox');
        this.setEasyBox()
        const fragment = document.createDocumentFragment();
        fragment.appendChild(this.wrapBox);
        this.wrap.appendChild(fragment);
    }

    setEasyBox() {
        const { elWidth, elHeight } = this.getInnerBoxSize()
        this.wrapBox.style.width = `${elWidth}px`;
        this.wrapBox.style.height = `${elHeight}px`;
    }

    getInnerBoxSize() {
        let elWidth = 0, elHeight = 0;
        const canAppend = !this.wrapAllChild
        this.wrapAllChild || (this.wrapAllChild = Array.from(this.wrap.children));
        this.wrapAllChild.forEach((child, i) => {
            elWidth +=
                child.offsetWidth +
                parseInt(getComputedStyle(child).marginLeft) +
                parseInt(getComputedStyle(child).marginRight);
            elHeight +=
                child.offsetHeight +
                parseInt(getComputedStyle(child).marginTop) +
                parseInt(getComputedStyle(child).marginBottom);

            canAppend && this.wrapBox.appendChild(this.wrap.removeChild(child));
        });
        return { elWidth, elHeight }
    }

    initMax() {
        if (
            this.wrapBox[this.opt.offsetSize] <
            this.wrap[this.opt.offsetSize]
        ) {
            this.stretch.stretchMax = this.stretch.specialValue;
        } else {
            this.stretch.stretchMax =
                (this.wrapBox[this.opt.offsetSize] -
                    this.wrap[this.opt.offsetSize]) *
                -1;
            !this.stretch.stretchMax &&
                (this.stretch.stretchMax = this.stretch.specialValue);
        }
        this.mark.scroll.maxTranslate =
            this.wrapBox[this.opt.offsetSize] -
            this.wrap[this.opt.offsetSize];
    }

    // 配置滚动条
    scrollBar() {
        this.bar.el = document.createElement('div');
        this.bar.el.classList.add(
            this.mark.isVertical ? 'easybary' : 'easybarx'
        );
        this.wrap.appendChild(this.bar.el);
        this.on('onScroll', this.barScroll);
    }

    barScroll() {
        if (this.bar.el.classList.contains('hidden')) {
            this.bar.el.classList.toggle('hidden');
        }
        this.bar.stId !== null && clearTimeout(this.bar.stId);
        if (this.wrapBox[this.opt.offsetSize] !== this.bar.lastWrapBox) {
            this.setBarSize();
        }

        const ratio =
            this.mark.scroll.curTranslate / this.mark.scroll.maxTranslate * -1;

        this.emit('setBarTranslate', {
            x: this.mark.isVertical ? this.bar.x : ratio * this.bar.scrollMax,
            y: this.mark.isVertical ? ratio * this.bar.scrollMax : this.bar.y
        });

        this.bar.stId = setTimeout(() => {
            if (
                !this.bar.el.classList.contains('hidden') &&
                this.mark.identifier === null
            ) {
                this.bar.el.classList.toggle('hidden');
            }
        }, this.bar.time);
    }

    setbarTranslate(x = 0, y = 0) {
        this.bar.el.style.transform = this.mark.isVertical
            ? `translateY(${y}px)`
            : `translateX(${x}px)`;
    }

    setBarSize() {
        if (
            this.wrap[this.opt.offsetSize] < this.wrapBox[this.opt.offsetSize]
        ) {
            this.bar.el.style[this.opt.rule] = `${this.wrap[
                this.opt.offsetSize
            ] /
                this.wrapBox[this.opt.offsetSize] *
                this.wrap[this.opt.offsetSize]}px`;
            this.bar.scrollMax =
                this.wrap[this.opt.offsetSize] -
                this.bar.el[this.opt.offsetSize];
            this.bar.lastWrapBox = this.wrapBox[this.opt.offsetSize];
        }
    }

    // 禁止原生滚动
    preventNativeScroll() {
        var supportsPassive = false;
        try {
            var opts = Object.defineProperty({}, 'passive', {
                get: function () {
                    supportsPassive = true;
                }
            });
            window.addEventListener('test', null, opts);
        } catch (e) { }

        document.body.addEventListener(
            'touchmove',
            function (e) {
                e.preventDefault();
            },
            supportsPassive ? { passive: false } : false
        );
        if (!supportsPassive) {
            const fragment = document.createDocumentFragment();
            const forWxBox = document.createElement('div');
            forWxBox.classList.add('lowVersion');
            forWxBox.style.height = '100vh';
            const bodyChild = Array.from(document.body.children);
            bodyChild.forEach((child, i) => {
                if (
                    !Array.includes.call(
                        ['script', 'link'],
                        child.nodeName.toLocaleLowerCase()
                    )
                ) {
                    forWxBox.appendChild(document.body.removeChild(child));
                }
            });
            fragment.appendChild(forWxBox);
            document.body.appendChild(fragment);

            forWxBox.addEventListener('touchmove', function (e) {
                e.preventDefault();
            });
        }
    }

    // 获取滑动距离
    getTranslate() {
        const arr = this.wrapBox.style.transform.match(/-?[\d\.]+/g);
        return this.mark.isVertical ? ~~arr[1] : ~~arr[0];
    }

    // 设置translate
    setTranslate(x = this.mark.scroll.x, y = this.mark.scroll.y) {
        this.wrapBox.style.transform = `translateX(${x}px) translateY(${y}px)`;
    }

    // 提供监听on
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
            case 'setCoordinate':
                this.eventQueue[event].push(cb);
                break;
            case 'setBarTranslate':
                this.eventQueue[event].push(cb);
                break;
            default:
                throw new Error(
                    `"${event}" hook does not exist, please see https://github.com/a13821190779/scroll/blob/master/README.md for more infomation`
                );
        }
    }

    // 触发监听
    emit(event, options = {}) {
        const events = this.eventQueue[event];
        for (let i = 0, len = events.length; i < len; i++) {
            events[i].call(this, options);
        }
    }

    // 返回钩子函数的参数
    returnHookArgs(name) {
        const options = {
            type: name,
            x: this.mark.scroll.x,
            y: this.mark.scroll.y
        };
        return options;
    }

    // 第一个字符大写
    UpperFristCase(str) {
        return str.replace(/./, letter => {
            return letter.toLocaleUpperCase();
        });
    }

    emitEvent = fnName => {
        this.emit(
            `on${this.UpperFristCase(fnName)}`,
            this.returnHookArgs(fnName.toLocaleLowerCase())
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
                    // 滚动尺寸小于容器尺寸
                    moveValue = this.getTranslate() + moveValue;
                    Math.abs(moveValue) <= Math.abs(aimTranslate) + 0.2 &&
                        (moveValue = 0);
                } else {
                    moveValue = this.getTranslate() - moveValue;
                    Math.abs(moveValue) <= Math.abs(aimTranslate) + 0.2 &&
                        (moveValue = aimTranslate);
                }

                this.emit('setCoordinate', {
                    x: this.mark.isVertical ? this.mark.scroll.x : moveValue,
                    y: this.mark.isVertical ? moveValue : this.mark.scroll.y
                });

                this.emit('onScroll', this.returnHookArgs('scroll'));

                this.mark.scroll.curTranslate = moveValue;
                this.stretch.radId = requestAnimationFrame(stretchFn);
                if (moveValue === aimTranslate || moveValue === 0) {
                    this.mark.inertialMotion.dist.now = 0;
                    this.emit('onScrollEnd', this.returnHookArgs('scrollend'));
                }
            }
        };
        this.stretch.radId = requestAnimationFrame(stretchFn);
    }

    refresh() {
        this.mark.scroll.curTranslate = 0;
        this.mark.inertialMotion.dist.now = 0;
        this.mark.inertialMotion.speed = 0;
        this.emit('setCoordinate', {
            x: 0,
            y: 0
        });
        this.emit('onRefresh');
    }

    touchStart(e) {
        const touch = Array.from(e.touches)[0];
        this.emitEvent('touchStart', e, touch);
        this.mark.isBounds = true;
        this.mark.identifier = touch.identifier;
        this.mark.inertialMotion.speed = 0;
        this.mark.inertialMotion.time.touch = e.timeStamp;
        this.stretch.radId !== null && cancelAnimationFrame(this.stretch.radId);
        this.operate.radId !== null && cancelAnimationFrame(this.operate.radId);
        this.mark.scroll.touchPoint = touch[this.opt.clientDir];
    }

    initTouchStart(remove) {
        const bind = remove ? 'removeEventListener' : 'addEventListener';
        this.wrap[bind]('touchstart', this.touchStart);
    }

    touchMove(e) {
        const fnName = 'touchMove';
        let moveValue;
        const touch = Array.from(e.touches)[0];
        if (this.mark.identifier === touch.identifier) {
            this.emitEvent(fnName, e, touch);
            // 不断更新 touchPoint 来 获取下一次move 移动的距离
            const moveNum =
                touch[this.opt.clientDir] - this.mark.scroll.touchPoint;

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
                    this.mark.scroll.curTranslate < this.stretch.stretchMax
                ) {
                    const restDist =
                        this.stretch.stretchMax - this.mark.scroll.curTranslate;

                    moveValue =
                        this.mark.scroll.curTranslate +
                        restDist / this.stretch.strength * moveNum / restDist;
                }

                this.mark.scroll.touchPoint = touch[this.opt.clientDir];
                this.mark.scroll.curTranslate = moveValue;
            } else {
                if (moveValue > 0) {
                    moveValue = 0;
                } else if (moveValue < this.stretch.stretchMax) {
                    moveValue = this.stretch.stretchMax;
                }
            }

            this.emit('setCoordinate', {
                x: this.mark.isVertical ? this.mark.scroll.x : moveValue,
                y: this.mark.isVertical ? moveValue : this.mark.scroll.y
            });

            // 钩子函数部分
            if (!this.mark.inertialMotion.dist.now) {
                this.emit('onScrollStart', this.returnHookArgs('scrollstart'));
            }

            if (this.mark.inertialMotion.dist.now) {
                this.emit('onScroll', this.returnHookArgs('scroll'));
            }

            // 缓冲动画
            this.mark.inertialMotion.dist.last = this.mark.inertialMotion.dist.now;
            this.mark.inertialMotion.dist.now = touch[this.opt.clientDir];
            this.mark.inertialMotion.time.last = this.mark.inertialMotion.time.now;
            this.mark.inertialMotion.time.now = e.timeStamp;
        }
    }

    // 超出边界，利用自定义事件
    outOfBounds(e) {
        const pageSize = document.documentElement[this.opt.clientSize];
        const touch = Array.from(e.changedTouches)[0];
        if (
            (this.mark.scroll.curTranslate > 0 &&
                touch[this.opt.clientDir] > pageSize) ||
            (this.mark.scroll.curTranslate < this.stretch.stretchMax &&
                touch[this.opt.clientDir] < 0)
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
    initTouchMove(remove) {
        const bind = remove ? 'removeEventListener' : 'addEventListener';

        document.body[bind]('touchmove', this.outOfBounds);
        document.body[bind]('touchmove', this.touchMove);
    }

    touchEnd(e) {
        let custom = e;
        if (e.detail.outof) {
            custom = e.detail.e;
        }
        this.mark.isBounds = false;
        const touch = Array.from(custom.changedTouches)[0];
        if (this.mark.identifier === touch.identifier) {
            this.mark.identifier = null;
            this.emitEvent('touchEnd', custom, touch);
            this.mark.scroll.curTranslate = this.getTranslate();
            if (
                this.mark.scrollbars &&
                !this.bar.el.classList.contains('hidden')
            ) {
                this.bar.el.classList.toggle('hidden');
            }

            // 手指抬起的时候如果超过返回，则调用开始回缩
            // 回缩功能
            if (this.mark.scroll.curTranslate > 0) {
                this.retraction(0, custom, touch);
            } else if (
                Math.abs(this.mark.scroll.curTranslate) >
                Math.abs(this.stretch.stretchMax)
            ) {
                this.retraction(this.stretch.stretchMax, custom, touch);
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
                            this.stretch.stretchMax -
                            this.stretch.scrollMax &&
                            this.mark.bounce
                        ) {
                            this.mark.inertialMotion.speed = 0;
                            this.retraction(this.stretch.stretchMax, e, touch);
                        } else {
                            let moveValue =
                                this.mark.scroll.curTranslate +
                                this.mark.inertialMotion.speed *
                                this.mark.inertialMotion.dir;

                            this.mark.inertialMotion.speed -=
                                this.mark.inertialMotion.speed /
                                this.mark.inertialMotion.a;
                            if (this.mark.inertialMotion.speed < 1) {
                                this.mark.inertialMotion.speed = 0;
                            }

                            if (this.mark.inertialMotion.speed > 0) {
                                if (!this.mark.bounce) {
                                    if (this.getTranslate() > 0) {
                                        this.mark.inertialMotion.speed = 0;
                                        moveValue = 0;
                                        this.mark.scroll.curTranslate = this.getTranslate();
                                    } else if (
                                        this.getTranslate() <
                                        this.stretch.stretchMax
                                    ) {
                                        this.mark.inertialMotion.speed = 0;
                                        moveValue = this.stretch.stretchMax;
                                        this.mark.scroll.curTranslate = this.getTranslate();
                                    }
                                } else if (this.mark.bounce) {
                                    if (this.mark.scroll.curTranslate > 0) {
                                        this.mark.inertialMotion.speed = 0;
                                        this.retraction(0, e, touch);
                                    } else if (
                                        this.mark.scroll.curTranslate <
                                        this.stretch.stretchMax
                                    ) {
                                        this.mark.inertialMotion.speed = 0;
                                        this.retraction(
                                            this.stretch.stretchMax,
                                            e,
                                            touch
                                        );
                                    }
                                }
                                this.emit('setCoordinate', {
                                    x: this.mark.isVertical
                                        ? this.mark.scroll.x
                                        : moveValue,
                                    y: this.mark.isVertical
                                        ? moveValue
                                        : this.mark.scroll.y
                                });

                                this.mark.scroll.curTranslate = this.getTranslate();
                                this.emit(
                                    'onScroll',
                                    this.returnHookArgs('scroll')
                                );

                                requestAnimationFrame(fn);
                            } else {
                                const translate = this.getTranslate();
                                if (
                                    translate < 0 &&
                                    translate > -this.mark.scroll.maxTranslate
                                ) {
                                    this.mark.inertialMotion.dist.now = 0;
                                    this.emit(
                                        'onScrollEnd',
                                        this.returnHookArgs('scrollend')
                                    );
                                }
                            }
                        }
                    };
                    requestAnimationFrame(fn);
                } else {
                    if (this.mark.inertialMotion.dist.now) {
                        this.mark.inertialMotion.dist.now = 0;
                        this.emit(
                            'onScrollEnd',
                            this.returnHookArgs('scrollend')
                        );
                    }
                }
            }
        }
    }

    initTouchEnd(remove) {
        const bind = remove ? 'removeEventListener' : 'addEventListener';

        window[bind]('touchend', this.touchEnd);
        window[bind]('touchcancel', this.touchEnd);
    }

    destroy() {
        this.initTouchStart(true);
        this.initTouchMove(true);
        this.initTouchEnd(true);

        this.eventQueue = {
            onTouchStart: [],
            onTouchMove: [],
            onTouchEnd: [],
            onRefresh: [],
            onScrollStart: [],
            onScroll: [],
            onScrollEnd: []
        };
    }

    easeOut(
        { target = 0, duration = 1, callback = noop } = {
            target: throwError()
        }
    ) {
        const start = this.mark.scroll[this.opt.dir];
        const condition = target > 0;
        target = Math.abs(target);
        const startTime = +new Date();
        // 假设初速度为0，单纯求加速度
        // s = Vot + a * t * t / 2
        const a = 2 * target / Math.pow(duration, 2);
        // 2as = Math.pow(vt,2) - Math.pow(v0,2)
        const v0 = Math.sqrt(2 * a * target);
        const fn = () => {
            let time = (+new Date() - startTime) / 1000;
            time > duration && (time = duration);
            const dist = v0 * time - 0.5 * a * time * time;
            const moveValue = condition
                ? start + dist
                : start - dist;
            this.emit('setCoordinate', {
                x: this.mark.isVertical ? this.mark.scroll.x : moveValue,
                y: this.mark.isVertical ? moveValue : this.mark.scroll.y
            });
            this.mark.scroll.curTranslate = this.getTranslate();

            this.emit('onScroll', this.returnHookArgs('scroll'));
            if (time < duration) {
                this.operate.radId = requestAnimationFrame(fn);
            } else {
                this.emit('onScrollEnd', this.returnHookArgs('scrollend'));
                this.operate.radId = null;
                callback();
            }
        };
        this.operate.radId = requestAnimationFrame(fn);
    }

    scrollBy(opt) {
        if (!this.operate.radId) {
            this.easeOut(opt);
        }
    }

    scrollTo(opt) {
        opt.target = opt.target - this.mark.scroll[this.opt.dir];
        if (!this.operate.radId) {
            this.easeOut(opt);
        }
    }

    // offsetX 和 offsetY定义像素级的偏移量，所以你可以滚动到元素并且加上特别的偏移量。但并不仅限于此。如果把这两个参数设置为true，元素将会位于屏幕的中间。
    scrollToElement(opt) {
        let { el, offset } = opt;
        el = el.nodeType ? el : this.wrap.querySelector(el);
        if (!el) {
            return;
        }
        offset =
            typeof offset === 'boolean'
                ? offset
                    ? el[this.opt.offsetSize] / 2
                    : 0
                : isNaN(parseInt(offset))
                    ? 0
                    : parseInt(offset);

        opt.target = -el.offsetTop - offset;
        if (!this.operate.radId) {
            this.scrollTo(opt);
        }
    }
}

module.exports = Scroll;
