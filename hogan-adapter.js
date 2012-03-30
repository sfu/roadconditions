// https://gist.github.com/1515402
// http://allampersandall.blogspot.ca/2011/12/hoganjs-expressjs-nodejs.html

var HoganExpressAdapter=(function(){
	var init=function(hogan) {
		var compile=function(source){
			return function(options) {
			  return hogan.compile(source).render(options);
			};
		}
		return {compile:compile};
	};
	return {init:init};
}());

if(typeof module!== 'undefined' && module.exports){
	module.exports=HoganExpressAdapter;
} else if (typeof exports!=='undefined') {
	exports.HoganExpressAdapter=HoganExpressAdapter;
}