var OmsOpLogSubscriptions = require('../src/OmsOpLogSubscriptions');
var OmsOpLog = require('../src/OmsOpLog');
var OmsSubscriptions = require('../src/OmsSubscriptions')
var MongoLocal = require('mongolocal');

var collection1 = MongoLocal();

var opLog1 = OmsOpLog(collection1, {
	max: 4
}, {
	server: 'dsnyc1'
});
var opLogSubscriptions1 = OmsOpLogSubscriptions(opLog1);
var subscriptions1 = OmsSubscriptions(opLogSubscriptions1);

//console.log("ID", subscriptionId);

var subscriptionId = subscriptions1.findSubscribeObject({type: "slide"}, function() {
	//console.log("ARGS", arguments);
});

for(var ctr = 0; ctr < 10; ctr++) {
	collection1.insert({type: "slide", object: ctr});
}

console.log(Object.keys(opLog1.opLogCollection.collection).length);

console.log(opLog1.opLogCollection.collection);


/*
var object = {key: "val-1"};
collection1.insert(object, function(error, result) {
	collection.update({_id: object._id}, {key: "val-2"}, function(error, result) {
		console.log("UPDATE", error, result);
	});
	//console.log("INSERT", error, result);
});
*/
