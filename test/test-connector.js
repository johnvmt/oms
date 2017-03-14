var collection = require('mongolocal')();
var connector = require('../src/OmsMongoConnector')(collection);

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

	connector.update({}, {key: "val3"}, function(error, result) {

		connector.remove({});
	});

});