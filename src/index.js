const scrollWrap = document.querySelector('.wrap');
console.log(scrollWrap);
var i = 0;
window.addEventListener(
    'scroll',
    function() {
        console.log(i++);
    },
    false
);
