/*
 * @Author: fox 
 * @Date: 2018-05-03 11:07:37 
 * @Last Modified by: fox
 * @Last Modified time: 2018-05-03 20:04:47
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
            a: 25, // 减速度
            dir: null,
            canMotion: false,
            time: {
                last: null,
                now: null
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

    getTranslate() {
        return this.wrapBox.style.transform.match(/-?\d+/)[0];
    }
    touchStart() {
        this.wrap.addEventListener('touchstart', e => {
            const touch = Array.from(e.touches)[0];
            this.mark.scroll.touchPoiot = touch.clientY;
            this.mark.identifier = touch.identifier;
            this.mark.inertialMotion.speed = 0;

            // 缓冲动画
            this.mark.inertialMotion.time.touch = e.timeStamp;
        });
    }
    touchMove() {
        this.wrap.addEventListener('touchmove', e => {
            const touch = Array.from(e.touches)[0];
            if (this.mark.identifier === touch.identifier) {
                const moveNum = touch.clientY - this.mark.scroll.touchPoiot;
                this.wrapBox.style.transform = `translateY(${+this.mark.scroll
                    .curDist + moveNum}px)`;

                // 缓冲动画
                this.mark.inertialMotion.dist.last = this.mark.inertialMotion.dist.now;
                this.mark.inertialMotion.dist.now = touch.clientY;
                this.mark.inertialMotion.time.last = this.mark.inertialMotion.time.now;
                this.mark.inertialMotion.time.now = e.timeStamp;
            }
        });
    }
    touchEnd() {
        this.wrap.addEventListener('touchend', e => {
            const touch = Array.from(e.changedTouches)[0];
            if (this.mark.identifier === touch.identifier) {
                this.mark.identifier = null;
                !!this.wrapBox.style.transform &&
                    (this.mark.scroll.curDist = this.getTranslate());

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

                    const fn = () => {
                        this.wrapBox.style.transform = `translateY(${+this.mark
                            .scroll.curDist +
                            this.mark.inertialMotion.speed *
                                this.mark.inertialMotion.dir}px)`;

                        if (this.mark.inertialMotion.speed > 0) {
                            this.mark.inertialMotion.speed -=
                                this.mark.inertialMotion.speed /
                                this.mark.inertialMotion.a;
                            if (this.mark.inertialMotion.speed < 0.5) {
                                this.mark.inertialMotion.speed = 0;
                            }
                            this.mark.scroll.curDist = this.getTranslate();
                            requestAnimationFrame(fn);
                        }
                    };
                    requestAnimationFrame(fn);
                }
            }
        });
    }
}

const scroll = new Scroll('.wrap');
