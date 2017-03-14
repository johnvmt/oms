var OmsOpLog = require('../src/OmsOpLog');
var OmsOpLogSubscriptions = require('../src/OmsOpLogSubscriptions');

var collection1 = require('mongolocal')();
var opLog1 = OmsOpLog(collection1, {
	max: 1000
}, {
	server: 'dsnyc1'
});
var opLogSubscriptions1 = OmsOpLogSubscriptions(opLog1);



/*
var collection2 = require('mongolocal')();
var opLog2 = OmsOpLog(collection2, {
	max: 1000
}, {
	server: 'dsnyc2'
});
var opLogSubscriptions2 = OmsOpLogSubscriptions(opLog2);

opLogSubscriptions1.subscribe({key: "val"}, {}, function(error, opLogDoc) {
	opLog2.applyOp(opLogDoc);
});

opLogSubscriptions2.subscribe({}, {}, function(error, opLogDoc) {
	opLog1.applyOp(opLogDoc);
});



setTimeout(function() {
	//console.log(opLogDocId, opLog1.opLogCollection.collection);
	opLogSubscriptions1.subscribeResume(opLogDocId, {}, {}, function(error, opLogDoc) {
		console.log("RESUME", error, opLogDoc);
	});
}, 20);
*/

collection1.insert({key: "val"});
collection1.update({}, {key: "val2"});
collection1.update({}, {key: "val3"});

console.log(collection1.collection);
console.log(collection2.collection);
