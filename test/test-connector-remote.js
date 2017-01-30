var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/test';
MongoClient.connect(url, function(err, db) {

	var collection = db.collection('test');

	var connector = require('./src/OmsMongoConnector')(collection);

	connector.on('insert', function() {
		console.log("INSERT", arguments);
	});

	connector.on('update', function() {
		console.log("UPDATE", arguments);
	});

	connector.on('remove', function() {
		console.log("REMOVE", arguments);
	});

	var doc = [{key: "val"},{key: "val2"}];
	connector.insert(doc, function(error, result) {
		connector.update({}, {key: "val3"}, {multi: true, emit: false}, function(error, result) {
			connector.remove({});
			db.close();
		});

	});
});
