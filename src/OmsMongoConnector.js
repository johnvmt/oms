var EventEmitter = require('wolfy87-eventemitter');
var FauxMongo = require('fauxmongo');
//var MongoLocal = require('mongolocal');
var OmsIntercept = require('./OmsIntercept');
var OmsSubscriptions = require('./OmsSubscriptions');
var Utils = require('./Utils');

// Access a Mongo Collection as Oms Collection
function OmsMongoConnector(mongoCollection) {

	var self = this;
	this.operationsQueue = [];
	this.mongoIntercept = OmsIntercept(mongoCollection);

	self._replicateCollectionFunctions();

	//this.localCollection = MongoLocal();

	var completeCallback = null;

	self.mongoIntercept.on('pre-insert', function() {

		var parsedArgs = Utils.parseArgs(
			arguments,
			[
				{name: 'opId', level: 0, validate: function(arg, allArgs) { return typeof(arg) != 'undefined' }},
				{name: 'docs', level: 0, validate: function(arg, allArgs) { return typeof(arg) == 'object' }},
				{name: 'options', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }, default: {}},
				{name: 'next', level: 0, validate: function(arg, allArgs) { return typeof(arg) === 'function'; }}
			]
		);

		self.queue(function(queueNext) {
			completeCallback = queueNext;
			self._docs = parsedArgs.docs; // cache the docs
			parsedArgs.next();
		});
	});

	self.mongoIntercept.on('insert', function(opId, error, result) {

		var next = arguments[arguments.length - 1];

		// emit saved docs
		if(!Array.isArray(self._docs)) // single doc insert
			self._docs = [self._docs];

		self._docs.forEach(function(doc) {
			self.emit('insert', doc);
		});

		delete self.docs;

		completeCallback(); // start next operation
		next(); // continue through insertion event queue
	});

	self.mongoIntercept.on('pre-update', function() {

		var parsedArgs = Utils.parseArgs(
			arguments,
			[
				{name: 'opId', level: 0, validate: function(arg, allArgs) { return typeof(arg) != 'undefined' }},
				{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
				{name: 'updateOperations', level: 0, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
				{name: 'options', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }, default: {}},
				{name: 'next', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'function'; }}
			]
		);

		if(typeof parsedArgs.query == 'string')
			parsedArgs.query = {_id: parsedArgs.query};

		self.queue(function(queueNext) {
			completeCallback = queueNext;

			if(typeof parsedArgs.options != 'object' || !parsedArgs.options.multi) {
				self.mongoIntercept.findOne(parsedArgs.query, function(error, doc) {
					var docs = [doc];
					postFind(error, docs);
				});
			}
			else
				self.mongoIntercept.find(parsedArgs.query, postFind);

			function postFind(error, docs) {
				if(error)
					parsedArgs.next(error);
				else {
					// Save unmodified docs
					self._unmodifiedDocs = {};
					docs.forEach(function(doc) {
						self._unmodifiedDocs[doc._id] = self._cloneObject(doc);
					});

					self._updateOperations = parsedArgs.updateOperations; // TODO validate?
					parsedArgs.next();
				}
			}
		});
	});

	self.mongoIntercept.on('update', function() {
		// TODO check for errors, don't emit on errors
		var next = arguments[arguments.length - 1];

		var validatedOperations = self._validateUpdate(self._updateOperations);
		Utils.objectForEach(self._unmodifiedDocs, function(unmodifiedDoc) {
			var modifiedDoc = self._updateDoc(unmodifiedDoc, validatedOperations, true);
			self.emit('update', unmodifiedDoc, modifiedDoc, self._updateOperations);
		});

		delete self._unmodifiedDocs;
		delete self._updateOperations;

		completeCallback();
		next();
	});

	self.mongoIntercept.on('pre-remove', function() {

		var parsedArgs = Utils.parseArgs(
			arguments,
			[
				{name: 'opId', level: 0, validate: function(arg, allArgs) { return typeof(arg) != 'undefined' }},
				{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
				{name: 'options', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }, default: {}},
				{name: 'next', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'function'; }}
			]
		);

		if(typeof parsedArgs.query == 'string')
			parsedArgs.query = {_id: parsedArgs.query};


		self.queue(function(queueNext) {
			completeCallback = queueNext;

			self.mongoIntercept.find(parsedArgs.query, function(error, docs) {
				if(error)
					parsedArgs.next(error);
				else {
					// Save unmodified docs
					self._unmodifiedDocs = {};
					docs.forEach(function(doc) {
						self._unmodifiedDocs[doc._id] = self._cloneObject(doc);
					});

					parsedArgs.next();
				}
			});
		});
	});

	self.mongoIntercept.on('remove', function() {
		var next = arguments[arguments.length - 1];

		// for each saved doc, emit the doc
		Utils.objectForEach(self._unmodifiedDocs, function(unmodifiedDoc) {
			self.emit('remove', unmodifiedDoc);
		});

		delete self._unmodifiedDocs;

		completeCallback();
		next();
	});
}

OmsMongoConnector.prototype.__proto__ = EventEmitter.prototype;

OmsMongoConnector.prototype.queue = function(callback) {
	var self = this;

	var queueNext = function() {
		self.operationsQueue.shift(); // remove current

		if(self.operationsQueue.length)
			self.operationsQueue[0]();
	};

	self.operationsQueue.push(callback);

	if(self.operationsQueue.length == 1)
		callback(queueNext);
};

OmsMongoConnector.prototype._replicateCollectionFunctions = function() {
	var connector = this;
	var targetObject = this.mongoIntercept;
	var functions = this._objectPublicFunctions(targetObject); // get collection's public functions
	var excludeFunctions = [];
	functions.forEach(function(functionName) {
		if(typeof connector[functionName] == 'undefined' && excludeFunctions.indexOf(functionName) < 0) { // safety check, don't override own functions
			// set own public function to match collection's function
			connector[functionName] = function () {
				targetObject[functionName].apply(targetObject, Array.prototype.slice.call(arguments));
			}
		}
	});
};

OmsMongoConnector.prototype._objectPublicFunctions = function(object) {
	function objFunctions(object) {
		var functionNames = [];
		for(var attribute in object) {
			if(typeof object[attribute] === 'function')
				functionNames.push(attribute);
		}
		return functionNames;
	}

	return objFunctions(object).filter(function(attribute) {
		return (attribute[0] !== '_' && attribute !== 'globalFunctions');
	});
};

/**
 * Validate and fix update operations
 * @param update
 * @returns {{}}
 * @private
 */
OmsMongoConnector.prototype._validateUpdate = function(update) {
	var validated = {};

	Utils.objectForEach(update, function(attributeVal, attributeKey) {
		if(attributeKey == '$set') // merge set with attributes already set
			validated['$set'] = Utils.objectMerge(validated['$set'], attributeKey);
		else if(attributeKey.charAt(0) == '$') // any other operation (pass through)
			validated[attributeKey] = attributeVal;
		else { // regular attribute (non-operation)
			if(typeof validated['$set'] != 'object' || validated['$set'] == null)
				validated['$set'] = {};
			validated['$set'][attributeKey] = attributeVal;
		}
	});

	return validated;
};

OmsMongoConnector.prototype._updateDoc = function(doc, updateOperations, clone) {
	if(typeof clone == 'boolean' && clone) // make a copy instead of updating in place
		doc = this._cloneObject(doc);
	var updateMongoOperators = {};
	Utils.objectForEach(updateOperations, function(operationValue, operationKey) {
		if(operationKey.charAt(0) == '$') // operation
			updateMongoOperators[operationKey] = operationValue;
		else
			doc[operationKey] = operationValue;
	});

	// TODO add options here
	FauxMongo.update(doc, updateMongoOperators);

	return doc;
};

OmsMongoConnector.prototype._cloneObject = function(object) {
	return JSON.parse(JSON.stringify(object));
};

module.exports = function(mongoCollection) {
	return new OmsMongoConnector(mongoCollection);
};