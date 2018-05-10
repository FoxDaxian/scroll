# easyScroll

- [x] 直接一个列表，自动添加box，然后滚动
- [x] 速度相关操作, 拖动时间和拖动距离 构成速度
- [x] 惯性滚动
- [x] 触碰停止滚动
- [x] 各种钩子,(refresh)
- [x] 边缘回弹
- [x] 销毁所有事件
- [x] 可配置滚动条
- [x] 配置参数, 不多就几个 
- [x] 水平垂直方向滚动
- [x] 防抖
- [x] touchend不会触发的问题，目前原因未知，解决办法是主动触发touchend
- [x] scrollBy or scrollTo target: 目标距离，默认0 duration 持续时间，默认1(s) callback 回调函数， 默认 空函数，参数为当前坐标
- [x] scrollToElement  el:元素， el 或者 id 或者 class duration 持续时间，默认1(s)， callback，offset偏移量，true 元素正中间的位置
- [ ] 更友好的错误提示信息


默认高度为html高度，需手动设置高
建议用两层元素包裹起来所有的元素，方便布局

需 解决闲七杂八兼容问题
https://blog.csdn.net/yhb241/article/details/47447337 这个问题
http://www.cnblogs.com/baihuaxiu/p/6654496.html
点击穿透问题



