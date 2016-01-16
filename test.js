var Oms = require('./');

var omsObj = new Oms({});






/*
function f(x) {
	console.log(x)
}
eval("var func = " + f.toString());
func(123);
//fn(456);

//var x = 123;
//eval(evalStr);

var Utils = require('./lib/Utils');

var sysId = Utils.uniqueId();

omsObj.getConn(function(error, db) {
	var coll = db.collection('regex');

	var matchFn = function() {
		//var test = RegExp('^/books/([^?]*?)/([^\/\?]+)/([^?]*?)(?=\?|$)');
		return false;
	};
	var cursor = coll.find({$where: matchFn});

	cursor.toArray(function(error, arr) {
		console.log(arr);
	});

});
*/