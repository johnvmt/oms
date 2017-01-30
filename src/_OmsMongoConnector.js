var MongoLocal = require('mongolocal');
var OmsIntercept = require('./OmsIntercept');
var OmsSubscriptions = require('./OmsSubscriptions');

// Access a Mongo Collection as Oms Collection
function OmsMongoConnector(mongoCollection) {

	this.operationsQueue = [];

	this.mongoIntercept = OmsIntercept(mongoCollection);

	this.localCollection = MongoLocal();
	this.localSubscriptions = OmsSubscriptions(this.localCollection);

	this.lockedDocuments = {};

	var lockedDocs = {
		id: numberInProgress
	};

	/*
	local on update, delete, insert
		check against all filters
	*/


	/*
	Emit insert, update delete for each
	Lock documents while updates are in progress

	On pre-insert, pre-update and pre-delete, find and cache the affected docs
	Cache the affected docs
	 */




	omsCollection.on('pre-insert', function(opId, object, callback) {
		//console.log(arguments);
		console.log("PRE-INSERT", opId, object);
		callback();
	});

	omsCollection.on('insert', function(opId, error, insertedObject, callback) {
		console.log("INSERT", opId, error, insertedObject);
		callback();
	});


	omsCollection.on('pre-update', function(opId, xxxx) {
		// find
		console.log("INSERT", opId, error, insertedObject);
		callback();
	});

	omsCollection.insert({key: "val"}, function (error, object) {
		console.log("EO", error, object);
	});

}

OmsMongoConnector.prototype._lockDoc = function(docId) {
	if(typeof this._lockedDocs[docId] !== 'number')
		this._lockedDocs[docId]++;
	else
		this._lockedDocs[docId] = 1;
};

OmsMongoConnector.prototype._unlockDoc = function(docId) {
	var self = this;
	if(typeof this._lockedDocs[docId] == 'number') {
		if(self._lockedDocs[docId] == 1) {
			delete self._lockedDocs[docId];
			self.localCollection.remove(docId);
		}
		else
			self._lockedDocs[docId]--;
	}
};

/**
 * Insert the remote doc, if it isn't already in the local collection
 * @param remoteDoc
 * @private
 */
OmsMongoConnector.prototype._insertDoc = function(remoteDoc) {
	var self = this;
	self.localCollection.find({_id: remoteDoc._id}, function(error, result) {
		if(!error && result.length < 1)
			self.localCollection.insert(remoteDoc);
	});
};

