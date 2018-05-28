export const throttle = (fn, time = 16) => {
    let last;
    let timeId = null;

    return function() {
        const context = this;
        const args = arguments;
        const now = +new Date();
        if (last && now - last < time) {
            clearTimeout(timeId);
            timeId = setTimeout(() => {
                last = now;
                fn.apply(context, args);
            }, time);
        } else {
            fn.apply(context, args);
            last = now;
        }
    };
};

export const debounce = (fn, time = 16) => {
    let timeId = null;

    return function () {
        const context = this;
        const args = arguments;
        timeId && clearTimeout(timeId);

        timeId = setTimeout(function() {
            fn.call(context, args)
            timeId = null
        }, time);
    }
}
