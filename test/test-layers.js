var OmsLayers = require('./src/OmsLayers');
var MongoLocal = require('mongolocal');

var localCollection = MongoLocal();
var remoteCollection = MongoLocal();

var layers = OmsLayers(localCollection, remoteCollection);

localCollection.on('insert', function() {
	console.log("INSERT", arguments);
});

localCollection.on('update', function() {
	console.log("UPDATE", arguments);
});

localCollection.on('remove', function() {
	console.log("REMOVE", arguments);
});

localCollection.insert({key: "val"});

