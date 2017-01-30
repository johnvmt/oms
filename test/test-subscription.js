/**
 * Created by jmurphy on 1/27/17.
 */

var collection = require('mongolocal')();
var subscriptions = require('./src/OmsSubscriptions')(collection);

//console.log("ID", subscriptionId);

for(var ctr = 0; ctr < 10; ctr++) {
	collection.insert({type: "slide", object: ctr});
}

var subscriptionId = subscriptions.findSubscribe({type: "slide"}, function() {
	console.log("ARGS", arguments);
});

var object = {key: "val-1"};
collection.insert(object, function(error, result) {

	collection.update({_id: object._id}, {key: "val-2"}, function(error, result) {
		console.log("UPDATE", error, result);
	});
	//console.log("INSERT", error, result);
});
