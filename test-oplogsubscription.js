var OmsOpLog = require('./src/OmsOpLog');
var OmsOpLogSubscriptions = require('./src/OmsOpLogSubscriptions');
var OmsSubscriptions = require('./src/OmsSubscriptions');

var collection1 = require('mongolocal')();
var opLog1 = OmsOpLog(collection1, {
	max: 1000
}, {
	server: 'dsnyc1'
});

var opLogSubscriptions1 = OmsOpLogSubscriptions(opLog1);
var subscriptions1 = OmsSubscriptions(opLogSubscriptions1);

//collection1.insert({key: "val"});
collection1.update({key: "val"}, {key: "val", $push: {pages: 'mypage'}}, {upsert: true});
//collection1.update({}, {key: "val3"});

subscriptions1.findSubscribeOne({}, function(error, operation, arg1, arg2) {
	if(error)
		console.error("ERR", error);
	console.log("OP", operation, arg1, arg2);
});

/*
opLogSubscriptions1.findSubscribeOne({}, {}, function(error, operationDoc) {
	if(error)
		console.error(error);
	console.log(operationDoc);
});
*/



//console.log(collection1.collection);
//console.log(collection2.collection);
