var assert = require('assert');
var mongolocal = require('mongolocal');
var Oms = require('../../');

describe('OmsSubscriptions FindSubscribeObject', function() {
	it('Should create a collection, subscribe to docs, and insert docs', function (done) {
		var collection1 = mongolocal();

		var opLog1 = Oms.OmsOplog(collection1, {
			max: 4
		}, {
			opLogTag: 'my-tag'
		});

		var opLogSubscriptions1 = Oms.OmsOplogSubscriptions(opLog1);
		var subscriptions1 = Oms.OmsSubscriptions(opLogSubscriptions1);

		var subscriptionId = subscriptions1.findSubscribeObject({tag: "my-tag"}, function(error, operationObject) {
			console.log("ARGS", error, operationObject);
		});

		for(var ctr = 0; ctr < 10; ctr++) {
			collection1.insert({tag: "my-tag", object: ctr});
		}

		for(var ctr = 0; ctr < 10; ctr++) {
			collection1.insert({tag: "not-my-tag", object: ctr});
		}

		//console.log(Object.keys(opLog1.opLogCollection.collection).length);

		//console.log(opLog1.opLogCollection.collection);

	});
});