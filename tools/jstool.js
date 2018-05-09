export const throttle = (fn, time = 10) => {
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
