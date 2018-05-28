# miniscroll

### so easy!

# install
```
npm i miniscroll
or
yarn add miniscroll
```

# usage

***notice: you'd better use the below html structure to avoid unnecessary trouble***

```
html
<div class="scrollWrap">
	<div class='you custom wrap'>
		<!-- content -->
	</div>
</div>
```



```
// const scroll = require('miniscroll')
import scroll from 'miniscroll'
new scroll(el);
```

or 

```
<script src='http://oqvlh6ipq.bkt.clouddn.com/miniScroll.js'></script>
new miniScroll(el);
```

# API
* Class
	
```
const scroll = new Scroll('.scrollWrap', {
	direction: 'vertical',
	bounce: true,
	scrollbars: true,
	smooth: 40,
	pullForce: 4
});
```

### first parameter can be classname id or element

### second object parameter are below


 | name       | mean                          | default  |
 | ---------- | ----------------------------- | -------- |
 | direction  | direction horizontal/vertical | vertical |
 | bounce     | open bounce                   | true     |
 | scrollbars | open scrollbars               | false    |
 | smooth     | scroll friction               | 40       |
 | pullForce  | rubber band pull force        | 4        |
	

* instance


|methods|mean|
|---|---|
|scroll.refresh()|refresh all and reset scroll position|
|scroll.destroy()|destory all event|
|scroll.on(eventName, cb)|a monitor, the ***eventName*** can be the following: onTouchStart onTouchMove onTouchEnd onScrollStart onScroll onScrollEnd onRefresh. the ***cb(use normal function you can get this)*** is callback, has one parameter, is object and has type, x, y|
|scroll.scrollTo({target, duration, callback})|scroll to the ***target*** position at ***duration(default 1s)*** second, once it arrives, trigger ***callback*** function, ***duration*** are seconds as a unit|
|scroll.scrollBy({target, duration, callback})|from now position, scroll  to the ***target*** position relative to the current position at ***duration(default 1s)*** second, once it arrives, trigger ***callback*** function, ***duration*** are seconds as a unit|
|scroll.scrollToElement({el, offset, duration, callback})|scroll to the ***el*** left vertices, you can assign the ***offset*** to precisely control the position, when ***offset*** is true, will be scroll to ***el*** center location. the remaining parameters are the same as above|
	
	
more info please vist https://github.com/a13821190779/scroll
	
	


