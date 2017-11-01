var OmsOpLog = require('../src/OmsOpLog');
var OmsOpLogSubscriptions = require('../src/OmsOpLogSubscriptions');
var OmsSubscriptions = require('../src/OmsSubscriptions');

var collection1 = require('mongolocal')();
var opLog1 = OmsOpLog(collection1, {
	max: 1000
}, {
	server: 'dsnyc1'
});

var opLogSubscriptions1 = OmsOpLogSubscriptions(opLog1);
var omsSubscriptions1 = OmsSubscriptions(opLogSubscriptions1);

omsSubscriptions1.findSubscribe({}, function(error, operation, arg2, arg3) {
	if(error)
		console.error("ERR", error);
	console.log("OP", operation, "ARG2", arg2, arg3);
});


collection1.insert({key: "val"});
collection1.update({}, {key: "val2"});
collection1.update({}, {key: "val3"});

//console.log(collection1.collection);
//console.log(collection2.collection);
