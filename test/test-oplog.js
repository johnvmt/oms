var OmsOpLog = require('../src/OmsOpLog');

var collection1 = require('mongolocal')();
var collection2 = require('mongolocal')();

var opLog1 = OmsOpLog(collection1, {
	max: 1000
}, {
	server: 'dsnyc1'
});

var opLog2 = OmsOpLog(collection2, {
	max: 1000
}, {
	server: 'dsnyc2'
});

opLog1.on('insert', function(operationDoc) {
	opLog2.applyOp(operationDoc);
});

opLog2.on('insert', function(operationDoc) {
	opLog1.applyOp(operationDoc);
});

collection1.insert({key: "val"});

console.log(collection1.collection);
console.log(collection2.collection);

collection1.update({}, {key: "val2"});

console.log(collection1.collection);
console.log(collection2.collection);

collection2.update({}, {key: "val3"});

console.log(collection1.collection);
console.log(collection2.collection);

collection2.remove({});

//console.log(opLog1.oplog.collection);

console.log(collection1.collection);
console.log(collection2.collection);