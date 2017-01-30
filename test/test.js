var mongoCollection = require('mongolocal')();
var oms = require("./src/OmsIntercept")(mongoCollection);

oms.on('pre-insert', function(opId, object, callback) {
	//console.log(arguments);
	console.log("PRE-INSERT", opId, object);
	callback();
});

oms.on('insert', function(opId, error, insertedObject, callback) {
	console.log("INSERT", opId, error, insertedObject);
	callback();
});

oms.insert({key: "val"}, function (error, object) {
	console.log("EO", error, object);
});
