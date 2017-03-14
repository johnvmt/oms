## OMS

	var mongoCollection = require('mongolocal')()
	var oms = require(".")(mongoCollection);
	
	oms.on('pre-insert', function() {
		console.log("PRE");
		console.log(arguments);
		arguments[1].key = "val2";
		arguments[arguments.length - 1](); // next() function
	});
	
	oms.on('insert', function() {
		console.log("INS");
		console.log(arguments);
		arguments[arguments.length - 1](); // next() function
	});
	
	oms.insert({key: "val"}, function (error, object) {
		console.log("EO", error, object);
	});