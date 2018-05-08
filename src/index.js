/*
 * @Author: fox 
 * @Date: 2018-05-03 11:07:37 
 * @Last Modified by: fox
 * @Last Modified time: 2018-05-08 20:02:56
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
            touchPoiotY: 0, // touchstart 点
            curTranslateY: 0, // 当前translate,
            maxTranslateY: 0, // 最大translate，不包括橡皮筋超出的
            touchPoiotX: 0, // touchstart 点
            curTranslateX: 0, // 当前translate,
            maxTranslateX: 0, // 最大translate，不包括橡皮筋超出的
            x: 0,
            y: 0
        },
        // 惯性运动
        inertialMotion: {
            speedX: 0, // 速度
            speedY: 0, // 速度
            a: 40, // 减速度
            dirX: null,
            dirY: null,
            canMotion: false,
            time: {
                lastY: 0,
                nowY: 0,
                touchY: null,
                lastX: 0,
                nowX: 0,
                touchX: null
            },
            dist: {
                lastY: 0,
                nowY: 0,
                lastX: 0,
                nowX: 0
            }
        },
        lastMoveEY: null,
        lastMoveEX: null
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

    device = {
        screenH: window.screen.height,
        screenW: window.screen.width
    };

    // 边缘伸缩部分
    stretch = {
        scrollMax: 100,
        maxY: document.documentElement.clientHeight, // 最大伸缩距离
        maxX: document.documentElement.clientWidth, // 最大伸缩距离
        strength: 4, // 边缘牵扯力
        multiple: 0.18, // 回缩倍数
        radIdY: null, // 待reqframe的id
        radIdX: null,
        stretchMaxY: 0,
        stretchMaxX: 0,
        specialValue: 0.1
    };

    bar = {
        x: 0,
        y: 0,
        elX: null,
        elY: null,
        scrollMaxY: 0, // bar 能滚动的最大值
        scrollMaxX: 0, // bar 能滚动的最大值
        time: 1500,
        stIdY: null,
        stIdX: null,
        lastWrapBoxW: 0,
        lastWrapBoxH: 0
    };

    constructor(
        classname,
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
            this.mark.direction = direction;
            this.mark.scrollbars = scrollbars;
            this.mark.bounce = bounce;
            this.mark.inertialMotion.a = smooth;
            this.stretch.strength = pullForce;

            this.wrapBox = null;
            this.wrap = document.querySelector(classname);
            this.wrap.classList.add('easywrap');
            this.preventNativeScroll();
            this.wrapAll();
            if (this.mark.scrollbars) {
                this.scrollBar();
            }

            this.on('setBarTranslate', coordinate => {
                this.bar.x = coordinate.x;
                this.bar.y = coordinate.y;
                this.setbarTranslate(coordinate.x, coordinate.y);
            });
            this.on('setCoordinate', coordinate => {
                this.mark.scroll.x = coordinate.x;
                this.mark.scroll.y = coordinate.y;
                this.setTranslate(coordinate.x, coordinate.y);
            });
            this.initTouchStart();
            this.initTouchMove();
            this.initTouchEnd();

            if (this.wrapBox.offsetHeight < this.wrap.offsetHeight) {
                this.stretch.stretchMaxY = this.stretch.specialValue;
            } else {
                this.stretch.stretchMaxY =
                    (this.wrapBox.offsetHeight - this.wrap.offsetHeight) * -1;
                !this.stretch.stretchMaxY &&
                    (this.stretch.stretchMaxY = this.stretch.specialValue);
            }

            if (this.wrapBox.offsetWidth < this.wrap.offsetWidth) {
                this.stretch.stretchMaxX = this.stretch.specialValue;
            } else {
                this.stretch.stretchMaxX =
                    (this.wrapBox.offsetWidth - this.wrap.offsetWidth) * -1;
                !this.stretch.stretchMaxX &&
                    (this.stretch.stretchMaxX = this.stretch.specialValue);
            }

            this.mark.scroll.maxTranslateY =
                this.wrapBox.offsetHeight - this.wrap.offsetHeight;
            this.mark.scroll.maxTranslateX =
                this.wrapBox.offsetWidth - this.wrap.offsetWidth;
        } catch (e) {
            console.log(e, '===');
        }
    }

    // 创建元素包裹容器内所有元素
    wrapAll() {
        const fragment = document.createDocumentFragment();
        let elWidth = 0;
        let elHeight = 0;
        this.wrapBox = document.createElement('div');
        this.wrapBox.classList.add('easybox');
        // 需要手动设置高度
        this.setTranslate();
        const allChildNodes = Array.from(this.wrap.children);
        allChildNodes.forEach((child, i) => {
            elWidth +=
                child.offsetWidth +
                parseInt(getComputedStyle(child).marginLeft) +
                parseInt(getComputedStyle(child).marginRight);
            elHeight +=
                child.offsetHeight +
                parseInt(getComputedStyle(child).marginTop) +
                parseInt(getComputedStyle(child).marginBottom);
            this.wrapBox.appendChild(this.wrap.removeChild(child));
        });
        this.wrapBox.style.width = `${elWidth}px`;
        this.wrapBox.style.height = `${elHeight}px`;
        fragment.appendChild(this.wrapBox);
        this.wrap.appendChild(fragment);
    }

    // 配置滚动条
    scrollBar() {
        if (this.mark.direction === 'vertical') {
            this.bar.elY = document.createElement('div');
            this.bar.elY.classList.add('easybary');
            this.wrap.appendChild(this.bar.elY);
            this.on('onScroll', this.barScrollY.bind(this));
        } else if (this.mark.direction === 'horizontal') {
            this.bar.elX = document.createElement('div');
            this.bar.elX.classList.add('easybarx');
            this.wrap.appendChild(this.bar.elX);
            this.on('onScroll', this.barScrollX.bind(this));
        } else if (this.mark.direction === 'free') {
            this.bar.elY = document.createElement('div');
            this.bar.elY.classList.add('easybary');
            this.wrap.appendChild(this.bar.elY);
            this.on('onScroll', this.barScrollY.bind(this));

            this.bar.elX = document.createElement('div');
            this.bar.elX.classList.add('easybarx');
            this.wrap.appendChild(this.bar.elX);
            this.on('onScroll', this.barScrollX.bind(this));
        }
    }

    barScrollX() {
        if (this.bar.elX.classList.contains('hidden')) {
            this.bar.elX.classList.toggle('hidden');
        }
        this.bar.stIdX !== null && clearTimeout(this.bar.stIdX);
        if (this.wrapBox.offsetWidth !== this.bar.lastWrapBoxW) {
            this.setBarWidth();
        }
        const ratio =
            this.mark.scroll.curTranslateX /
            this.mark.scroll.maxTranslateX *
            -1;
        this.emit('setBarTranslate', {
            x: ratio * this.bar.scrollMaxX,
            y: this.bar.y
        });
        this.bar.stIdX = setTimeout(() => {
            this.bar.elX.classList.toggle('hidden');
        }, this.bar.time);
    }

    barScrollY() {
        if (this.bar.elY.classList.contains('hidden')) {
            this.bar.elY.classList.toggle('hidden');
        }
        this.bar.stIdY !== null && clearTimeout(this.bar.stIdY);
        if (this.wrapBox.offsetHeight !== this.bar.lastWrapBoxH) {
            this.setBarHeight();
        }
        const ratio =
            this.mark.scroll.curTranslateY /
            this.mark.scroll.maxTranslateY *
            -1;

        this.emit('setBarTranslate', {
            x: this.bar.x,
            y: ratio * this.bar.scrollMaxY
        });
        this.bar.stIdY = setTimeout(() => {
            this.bar.elY.classList.toggle('hidden');
        }, this.bar.time);
    }

    setbarTranslate(x = 0, y = 0) {
        if (this.mark.direction === 'vertical') {
            this.bar.elY.style.transform = `translateY(${y}px)`;
        } else if (this.mark.direction === 'horizontal') {
            this.bar.elX.style.transform = `translateX(${x}px)`;
        } else if (this.mark.direction === 'free') {
            this.bar.elX.style.transform = `translateX(${x}px)`;
            this.bar.elY.style.transform = `translateY(${y}px)`;
        }
    }

    setBarWidth() {
        if (this.wrap.offsetWidth < this.wrapBox.offsetWidth) {
            this.bar.elX.style.width = `${this.wrap.offsetWidth /
                this.wrapBox.offsetWidth *
                this.wrap.offsetWidth}px`;
            this.bar.scrollMaxX =
                this.wrap.offsetWidth - this.bar.elX.offsetWidth;
            this.bar.lastWrapBoxW = this.wrapBox.offsetWidth;
        }
    }

    setBarHeight() {
        if (this.wrap.offsetHeight < this.wrapBox.offsetHeight) {
            this.bar.elY.style.height = `${this.wrap.offsetHeight /
                this.wrapBox.offsetHeight *
                this.wrap.offsetHeight}px`;
            this.bar.scrollMaxY =
                this.wrap.offsetHeight - this.bar.elY.offsetHeight;
            this.bar.lastWrapBoxH = this.wrapBox.offsetHeight;
        }
    }

    // 禁止原生滚动
    preventNativeScroll() {
        var supportsPassive = false;
        try {
            var opts = Object.defineProperty({}, 'passive', {
                get: function() {
                    supportsPassive = true;
                }
            });
            window.addEventListener('test', null, opts);
        } catch (e) {}

        document.body.addEventListener(
            'touchmove',
            function(e) {
                e.preventDefault();
            },
            supportsPassive ? { passive: false } : false
        );
        if (!supportsPassive) {
            const fragment = document.createDocumentFragment();
            const forWxBox = document.createElement('div');
            forWxBox.classList.add('lowVersion');
            forWxBox.style.height = '100vh';
            const allChildNodes = Array.from(document.body.children);
            allChildNodes.forEach((child, i) => {
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

            forWxBox.addEventListener('touchmove', function(e) {
                e.preventDefault();
            });
        }
    }

    // 获取滑动距离
    getTranslate() {
        return this.wrapBox.style.transform.match(/-?[\d\.]+/g);
    }
    getTranslateY() {
        return +this.getTranslate()[1];
    }
    getTranslateX() {
        return +this.getTranslate()[0];
    }

    // 设置translate
    setTranslate(x = 0, y = 0) {
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
    emit(event, options = {}, coordinate = { x: 0, y: 0 }) {
        const events = this.eventQueue[event];
        for (let i = 0, len = events.length; i < len; i++) {
            events[i].call(this, options, coordinate);
        }
    }

    // 返回钩子函数的参数
    returnHookArgs(name, e, touch) {
        const options = {
            type: name,
            x: Math.round(this.getTranslateX() * 1000) / 1000,
            y: Math.round(this.getTranslateY() * 1000) / 1000
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
    retractionY(aimTranslate, e, touch) {
        let condition = false;
        if (aimTranslate === this.stretch.specialValue) {
            condition = true;
        }
        const stretchFn = () => {
            if (
                Math.abs(this.mark.scroll.curTranslateY) >
                Math.abs(aimTranslate)
            ) {
                let moveValue =
                    (Math.abs(this.getTranslateY()) - Math.abs(aimTranslate)) *
                    this.stretch.multiple;

                aimTranslate < 0 && (moveValue *= -1);

                if (condition) {
                    moveValue = this.getTranslateY() + moveValue;
                    Math.abs(this.getTranslateY()) <=
                        Math.abs(aimTranslate) + 0.2 && (moveValue = 0);
                } else {
                    moveValue = this.getTranslateY() - moveValue;
                    Math.abs(this.getTranslateY()) <=
                        Math.abs(aimTranslate) + 0.2 &&
                        (moveValue = aimTranslate);
                }

                this.emit('setCoordinate', {
                    x: this.mark.scroll.x,
                    y: moveValue
                });

                this.mark.scroll.curTranslateY = moveValue;
                this.stretch.radIdY = requestAnimationFrame(stretchFn);
            } else {
                this.emit(
                    'onScrollEnd',
                    this.returnHookArgs('scrollend', e, touch)
                );
            }
        };
        this.stretch.radIdY = requestAnimationFrame(stretchFn);
    }

    retractionX(aimTranslate, e, touch) {
        let condition = false;
        if (aimTranslate === this.stretch.specialValue) {
            condition = true;
        }
        const stretchFn = () => {
            if (
                Math.abs(this.mark.scroll.curTranslateX) >
                Math.abs(aimTranslate)
            ) {
                let moveValue =
                    (Math.abs(this.getTranslateX()) - Math.abs(aimTranslate)) *
                    this.stretch.multiple;

                aimTranslate < 0 && (moveValue *= -1);

                if (condition) {
                    moveValue = this.getTranslateX() + moveValue;
                    Math.abs(moveValue) <= Math.abs(aimTranslate) + 0.2 &&
                        (moveValue = 0);
                } else {
                    moveValue = this.getTranslateX() - moveValue;
                    Math.abs(moveValue) <= Math.abs(aimTranslate) + 0.2 &&
                        (moveValue = aimTranslate);
                }

                this.emit('setCoordinate', {
                    x: moveValue,
                    y: this.mark.scroll.y
                });

                this.mark.scroll.curTranslateX = moveValue;
                this.stretch.radIdX = requestAnimationFrame(stretchFn);
            } else {
                this.emit(
                    'onScrollEnd',
                    this.returnHookArgs('scrollend', e, touch)
                );
            }
        };
        this.stretch.radIdX = requestAnimationFrame(stretchFn);
    }

    refresh() {
        this.mark.scroll.curTranslateY = 0;
        this.mark.inertialMotion.dist.nowY = 0;
        this.mark.scroll.curTranslateX = 0;
        this.mark.inertialMotion.dist.nowX = 0;
        this.mark.inertialMotion.speedX = 0;
        this.mark.inertialMotion.speedY = 0;
        this.setTranslate();
        this.emit('onRefresh');
    }

    touchStart(e) {
        const touch = Array.from(e.touches)[0];
        this.emitEvent('touchStart', e, touch);
        this.mark.isBounds = true;
        this.mark.identifier = touch.identifier;
        this.mark.inertialMotion.speedX = 0;
        this.mark.inertialMotion.speedY = 0;
        this.mark.scroll.touchPoiotX = touch.clientX;
        this.mark.scroll.touchPoiotY = touch.clientY;
        this.mark.inertialMotion.time.touchY = e.timeStamp;
        this.mark.inertialMotion.time.touchX = e.timeStamp;
        this.stretch.radIdX !== null &&
            cancelAnimationFrame(this.stretch.radIdX);
        this.stretch.radIdY !== null &&
            cancelAnimationFrame(this.stretch.radIdY);
    }

    initTouchStart() {
        this.wrap.addEventListener('touchstart', this.touchStart.bind(this));
    }

    touchMoveY(e) {
        let moveValue;
        const touch = Array.from(e.touches)[0];
        if (this.mark.identifier === touch.identifier) {
            // 不断更新 touchPoint 来 获取下一次move 移动的距离
            const moveNum = touch.clientY - this.mark.scroll.touchPoiotY;

            moveValue = +this.mark.scroll.curTranslateY + moveNum;

            if (this.mark.bounce) {
                // 边缘回弹
                // 十字相乘，当前剩余可滑动距离 / 猴皮筋强度 / 当前剩余可滑动距离  = 想要的距离结果 / 这次和上次滑动距离的差
                if (this.mark.scroll.curTranslateY > 0) {
                    const restDist =
                        this.stretch.maxY - this.mark.scroll.curTranslateY;

                    moveValue =
                        this.mark.scroll.curTranslateY +
                        restDist / this.stretch.strength * moveNum / restDist;
                } else if (
                    this.mark.scroll.curTranslateY < this.stretch.stretchMaxY
                ) {
                    const restDist =
                        this.stretch.stretchMaxY -
                        this.mark.scroll.curTranslateY;

                    moveValue =
                        this.mark.scroll.curTranslateY +
                        restDist / this.stretch.strength * moveNum / restDist;
                }

                this.mark.scroll.touchPoiotY = touch.clientY;
                this.mark.scroll.curTranslateY = moveValue;
            } else {
                if (moveValue > 0) {
                    moveValue = 0;
                } else if (moveValue < this.stretch.stretchMaxY) {
                    moveValue = this.stretch.stretchMaxY;
                }
            }

            this.emit('setCoordinate', {
                x: this.mark.scroll.x,
                y: moveValue
            });

            // 钩子函数部分
            if (!this.mark.inertialMotion.dist.nowY) {
                this.emit(
                    'onScrollStart',
                    this.returnHookArgs('scrollstart', e, touch)
                );
            }

            if (this.mark.inertialMotion.dist.nowY) {
                this.emit('onScroll', this.returnHookArgs('scroll', e, touch));
            }

            // 缓冲动画
            this.mark.inertialMotion.dist.lastY = this.mark.inertialMotion.dist.nowY;
            this.mark.inertialMotion.dist.nowY = touch.clientY;
            this.mark.inertialMotion.time.lastY = this.mark.inertialMotion.time.nowY;
            this.mark.inertialMotion.time.nowY = e.timeStamp;
        }
    }
    touchMoveX(e) {
        let moveValue;
        const touch = Array.from(e.touches)[0];
        if (this.mark.identifier === touch.identifier) {
            // 不断更新 touchPoint 来 获取下一次move 移动的距离
            const moveNum = touch.clientX - this.mark.scroll.touchPoiotX;

            moveValue = +this.mark.scroll.curTranslateX + moveNum;

            if (this.mark.bounce) {
                // 边缘回弹
                // 十字相乘，当前剩余可滑动距离 / 猴皮筋强度 / 当前剩余可滑动距离  = 想要的距离结果 / 这次和上次滑动距离的差
                if (this.mark.scroll.curTranslateX > 0) {
                    const restDist =
                        this.stretch.maxX - this.mark.scroll.curTranslateX;

                    moveValue =
                        this.mark.scroll.curTranslateX +
                        restDist / this.stretch.strength * moveNum / restDist;
                } else if (
                    this.mark.scroll.curTranslateX < this.stretch.stretchMaxX
                ) {
                    const restDist =
                        this.stretch.stretchMaxX -
                        this.mark.scroll.curTranslateX;

                    moveValue =
                        this.mark.scroll.curTranslateX +
                        restDist / this.stretch.strength * moveNum / restDist;
                }

                this.mark.scroll.touchPoiotX = touch.clientX;
                this.mark.scroll.curTranslateX = moveValue;
            } else {
                if (moveValue > 0) {
                    moveValue = 0;
                } else if (moveValue < this.stretch.stretchMaxX) {
                    moveValue = this.stretch.stretchMaxX;
                }
            }

            this.emit('setCoordinate', {
                x: moveValue,
                y: this.mark.scroll.y
            });

            // 钩子函数部分
            if (!this.mark.inertialMotion.dist.nowX) {
                this.emit(
                    'onScrollStart',
                    this.returnHookArgs('scrollstart', e, touch)
                );
            }

            if (this.mark.inertialMotion.dist.nowX) {
                this.emit('onScroll', this.returnHookArgs('scroll', e, touch));
            }

            // 缓冲动画
            this.mark.inertialMotion.dist.lastX = this.mark.inertialMotion.dist.nowX;
            this.mark.inertialMotion.dist.nowX = touch.clientX;
            this.mark.inertialMotion.time.lastX = this.mark.inertialMotion.time.nowX;
            this.mark.inertialMotion.time.nowX = e.timeStamp;
        }
    }

    touchMove(e) {
        const fnName = 'touchMove';
        const touch = Array.from(e.touches)[0];

        if (this.mark.identifier === touch.identifier) {
            this.emitEvent(fnName, e, touch);
        }
    }

    // 超出边界，利用自定义事件
    outOfBoundsY(e) {
        const pageH = document.documentElement.clientHeight;
        const touch = Array.from(e.changedTouches)[0];
        if (
            (this.mark.scroll.curTranslateY > 0 && touch.clientY > pageH) ||
            (this.mark.scroll.curTranslateY < this.stretch.stretchMaxY &&
                touch.clientY < 0)
        ) {
            if (this.mark.isBounds) {
                var event = new CustomEvent('touchend', {
                    detail: {
                        outof: true,
                        e: this.mark.lastMoveEY
                    }
                });
                window.dispatchEvent(event);
            }
        }

        this.mark.lastMoveEY = e;
    }
    outOfBoundsX(e) {
        const pageW = document.documentElement.clientWidth;
        const touch = Array.from(e.changedTouches)[0];
        if (
            (this.mark.scroll.curTranslateX > 0 && touch.clientX > pageW) ||
            (this.mark.scroll.curTranslateX < this.stretch.stretchMaxX &&
                touch.clientX < 0)
        ) {
            if (this.mark.isBounds) {
                var event = new CustomEvent('touchend', {
                    detail: {
                        outof: true,
                        e: this.mark.lastMoveEX
                    }
                });
                window.dispatchEvent(event);
            }
        }

        this.mark.lastMoveEX = e;
    }

    initTouchMove() {
        if (this.mark.direction === 'vertical') {
            document.body.addEventListener(
                'touchmove',
                this.outOfBoundsY.bind(this)
            );
            document.body.addEventListener(
                'touchmove',
                this.touchMoveY.bind(this)
            );
        } else if (this.mark.direction === 'horizontal') {
            document.body.addEventListener(
                'touchmove',
                this.outOfBoundsX.bind(this)
            );
            document.body.addEventListener(
                'touchmove',
                this.touchMoveX.bind(this)
            );
        } else if (this.mark.direction === 'free') {
            document.body.addEventListener(
                'touchmove',
                this.outOfBoundsY.bind(this)
            );
            document.body.addEventListener(
                'touchmove',
                this.outOfBoundsX.bind(this)
            );
            document.body.addEventListener(
                'touchmove',
                this.touchMoveX.bind(this)
            );
            document.body.addEventListener(
                'touchmove',
                this.touchMoveY.bind(this)
            );
        }

        document.body.addEventListener('touchmove', this.touchMove.bind(this));
    }

    touchEndY(e) {
        let custom = e;
        if (e.detail.outof) {
            custom = e.detail.e;
        }
        const touch = Array.from(custom.changedTouches)[0];
        if (this.mark.identifier === touch.identifier) {
            this.mark.scroll.curTranslateY = this.getTranslateY();

            // 手指抬起的时候如果超过返回，则调用开始回缩
            // 回缩功能
            if (this.mark.scroll.curTranslateY > 0) {
                this.retractionY(0, custom, touch);
            } else if (
                this.mark.scroll.curTranslateY < this.stretch.stretchMaxY
            ) {
                this.retractionY(this.stretch.stretchMaxY, custom, touch);
            } else {
                // 缓冲动画
                if (
                    custom.timeStamp - this.mark.inertialMotion.time.nowY <
                    30
                ) {
                    const time =
                        this.mark.inertialMotion.time.nowY -
                        this.mark.inertialMotion.time.lastY;
                    const dist = Math.abs(
                        this.mark.inertialMotion.dist.nowY -
                            this.mark.inertialMotion.dist.lastY
                    );
                    // 速度
                    this.mark.inertialMotion.speedY = Math.min(
                        dist / (time / 1000) / 40,
                        50
                    );

                    // 方向
                    this.mark.inertialMotion.dirY =
                        this.mark.inertialMotion.dist.nowY -
                            this.mark.inertialMotion.dist.lastY >
                        0
                            ? 1
                            : -1;

                    this.mark.inertialMotion.dist.nowY = 0;

                    const fn = () => {
                        if (
                            this.mark.scroll.curTranslateY >
                                this.stretch.scrollMax &&
                            this.mark.bounce
                        ) {
                            this.mark.inertialMotion.speedY = 0;
                            this.retractionY(0, e, touch);
                        } else if (
                            this.mark.scroll.curTranslateY <
                                this.stretch.stretchMaxY -
                                    this.stretch.scrollMax &&
                            this.mark.bounce
                        ) {
                            this.mark.inertialMotion.speedY = 0;
                            this.retractionY(
                                this.stretch.stretchMaxY,
                                e,
                                touch
                            );
                        } else {
                            let moveValue =
                                this.mark.scroll.curTranslateY +
                                this.mark.inertialMotion.speedY *
                                    this.mark.inertialMotion.dirY;
                            if (this.mark.inertialMotion.speedY > 0) {
                                if (!this.mark.bounce) {
                                    if (this.getTranslateY() > 0) {
                                        this.mark.inertialMotion.speedY = 0;
                                        moveValue = 0;
                                        this.mark.scroll.curTranslateY = this.getTranslateY();
                                    } else if (
                                        this.getTranslateY() <
                                        this.stretch.stretchMaxY
                                    ) {
                                        this.mark.inertialMotion.speedY = 0;
                                        moveValue = this.stretch.stretchMaxY;
                                        this.mark.scroll.curTranslateY = this.getTranslateY();
                                    }
                                }
                                this.emit('setCoordinate', {
                                    x: this.mark.scroll.x,
                                    y: moveValue
                                });

                                this.mark.inertialMotion.speedY -=
                                    this.mark.inertialMotion.speedY /
                                    this.mark.inertialMotion.a;
                                if (this.mark.inertialMotion.speedY < 1) {
                                    this.mark.inertialMotion.speedY = 0;
                                }
                                this.mark.scroll.curTranslateY = this.getTranslateY();
                                this.emit(
                                    'onScroll',
                                    this.returnHookArgs('scroll', e, touch)
                                );

                                requestAnimationFrame(fn);
                            } else if (this.mark.bounce) {
                                if (this.mark.scroll.curTranslateY > 0) {
                                    this.mark.inertialMotion.speedY = 0;
                                    this.retractionY(0, e, touch);
                                } else if (
                                    this.mark.scroll.curTranslateY <
                                    this.stretch.stretchMaxY
                                ) {
                                    this.mark.inertialMotion.speedY = 0;
                                    this.retractionY(
                                        this.stretch.stretchMaxY,
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
                    this.mark.inertialMotion.dist.nowY = 0;
                    this.emit(
                        'onScrollEnd',
                        this.returnHookArgs('scrollend', e, touch)
                    );
                }
            }
        }
    }

    touchEndX(e) {
        let custom = e;
        if (e.detail.outof) {
            custom = e.detail.e;
        }
        const touch = Array.from(custom.changedTouches)[0];
        if (this.mark.identifier === touch.identifier) {
            this.mark.scroll.curTranslateX = this.getTranslateX();

            // 手指抬起的时候如果超过返回，则调用开始回缩
            // 回缩功能
            if (this.mark.scroll.curTranslateX > 0) {
                this.retractionX(0, custom, touch);
            } else if (
                this.mark.scroll.curTranslateX < this.stretch.stretchMaxX
            ) {
                this.retractionX(this.stretch.stretchMaxX, custom, touch);
            } else {
                // 缓冲动画
				// 安卓ios timestamp 不一致？？
				
				
				console.log(custom.timeStamp, '当前时间');
				console.log(this.mark.inertialMotion.time.nowX, '上一次大的');
                if (
                    custom.timeStamp - this.mark.inertialMotion.time.nowX <
                    40
                ) {
                    const time =
                        this.mark.inertialMotion.time.nowX -
                        this.mark.inertialMotion.time.lastX;
                    const dist = Math.abs(
                        this.mark.inertialMotion.dist.nowX -
                            this.mark.inertialMotion.dist.lastX
                    );
                    // 速度
                    this.mark.inertialMotion.speedX = Math.min(
                        dist / (time / 1000) / 50,
                        50
                    );

                    // 方向
                    this.mark.inertialMotion.dirX =
                        this.mark.inertialMotion.dist.nowX -
                            this.mark.inertialMotion.dist.lastX >
                        0
                            ? 1
                            : -1;

                    this.mark.inertialMotion.dist.nowX = 0;

                    const fn = () => {
                        if (
                            this.mark.scroll.curTranslateX >
                                this.stretch.scrollMax &&
                            this.mark.bounce
                        ) {
                            this.mark.inertialMotion.speedX = 0;
                            this.retractionX(0, e, touch);
                        } else if (
                            this.mark.scroll.curTranslateX <
                                this.stretch.stretchMaxX -
                                    this.stretch.scrollMax &&
                            this.mark.bounce
                        ) {
                            this.mark.inertialMotion.speedX = 0;
                            this.retractionX(
                                this.stretch.stretchMaxX,
                                e,
                                touch
                            );
                        } else {
                            let moveValue =
                                this.mark.scroll.curTranslateX +
                                this.mark.inertialMotion.speedX *
                                    this.mark.inertialMotion.dirX;

                            if (this.mark.inertialMotion.speedX > 0) {
                                if (!this.mark.bounce) {
                                    if (this.getTranslateX() > 0) {
                                        this.mark.inertialMotion.speedX = 0;
                                        moveValue = 0;
                                        this.mark.scroll.curTranslateX = this.getTranslateX();
                                    } else if (
                                        this.getTranslateX() <
                                        this.stretch.stretchMaxX
                                    ) {
                                        this.mark.inertialMotion.speedX = 0;
                                        moveValue = this.stretch.stretchMaxX;
                                        this.mark.scroll.curTranslateX = this.getTranslateX();
                                    }
                                }
                                this.emit('setCoordinate', {
                                    x: moveValue,
                                    y: this.mark.scroll.y
                                });
                                this.mark.inertialMotion.speedX -=
                                    this.mark.inertialMotion.speedX /
                                    this.mark.inertialMotion.a;
                                if (this.mark.inertialMotion.speedX < 1) {
                                    this.mark.inertialMotion.speedX = 0;
                                }
                                this.mark.scroll.curTranslateX = this.getTranslateX();
                                this.emit(
                                    'onScroll',
                                    this.returnHookArgs('scroll', e, touch)
                                );

                                requestAnimationFrame(fn);
                            } else if (this.mark.bounce) {
                                if (this.mark.scroll.curTranslateX > 0) {
                                    this.mark.inertialMotion.speedX = 0;
                                    this.retractionX(0, e, touch);
                                } else if (
                                    this.mark.scroll.curTranslateX <
                                    this.stretch.stretchMaxX
                                ) {
                                    this.mark.inertialMotion.speedX = 0;
                                    this.retractionX(
                                        this.stretch.stretchMaxX,
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
                    this.mark.inertialMotion.dist.nowX = 0;
                    this.emit(
                        'onScrollEnd',
                        this.returnHookArgs('scrollend', e, touch)
                    );
                }
            }
        }
    }

    touchEnd(e) {
        let custom = e;
        if (e.detail.outof) {
            custom = e.detail.e;
        }
        const touch = Array.from(custom.changedTouches)[0];
        this.mark.isBounds = false;

        if (this.mark.identifier === touch.identifier) {
            this.mark.identifier = null;
            this.emitEvent('touchEnd', custom, touch);
        }
    }

    initTouchEnd() {
        if (this.mark.direction === 'vertical') {
            window.addEventListener('touchend', this.touchEndY.bind(this));
            window.addEventListener('touchcancel', this.touchEndY.bind(this));
        } else if (this.mark.direction === 'horizontal') {
            window.addEventListener('touchend', this.touchEndX.bind(this));
            window.addEventListener('touchcancel', this.touchEndX.bind(this));
        } else if (this.mark.direction === 'free') {
            window.addEventListener('touchend', this.touchEndX.bind(this));
            window.addEventListener('touchend', this.touchEndY.bind(this));
            window.addEventListener('touchcancel', this.touchEndX.bind(this));
            window.addEventListener('touchcancel', this.touchEndY.bind(this));
        }

        window.addEventListener('touchend', this.touchEnd.bind(this));
        window.addEventListener('touchcancel', this.touchEnd.bind(this));
    }

    destroy() {
        // TODO start 和 move 重新取消
        // this.wrap.removeEventListener('touchstart', this.touchStartY.bind(this));
        // document.body.removeEventListener(
        //     'touchmove',
        //     this.outOfBounds.bind(this)
        // );
        // document.body.removeEventListener(
        //     'touchmove',
        //     this.touchMoveY.bind(this)
        // );

        window.removeEventListener('touchend', this.touchEnd.bind(this));
        window.removeEventListener('touchcancel', this.touchEnd.bind(this));

        this.eventQueue = {
            onTouchStart: [],
            onTouchMove: [],
            onTouchEnd: [],
            onRefresh: [],
            onScrollStart: [],
            onScroll: [],
            onScrollEnd: []
        };

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
    // direction: 'free',
    direction: 'horizontal',
    bounce: true,
    scrollbars: true,
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
