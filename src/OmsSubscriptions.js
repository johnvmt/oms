var FauxMongo = require('fauxmongo');

/**
 *
 * @param config
 * @constructor
 */
function OmsSubscriptions(omsCollection) {
	var self = this;
	self.subscriptions = {};
	self.collection = omsCollection;
	self.maxSubscriptionId = 0;

	self._replicateFunctions(self.collection);

	// pass emitted events to publish function
	var events = ['insert', 'update', 'remove'];
	events.forEach(function(event) {
		self.collection.on(event, function() {
			self._publish.apply(self, [event].concat(Array.prototype.slice.call(arguments)));
		});
	});
}

/**
 *
 * @param [query]
 * @param callback
 */
OmsSubscriptions.prototype.findSubscribe = function() {
	var query = (typeof arguments[0] == 'function') ? {} : arguments[0];
	var callback = (typeof arguments[0] == 'function') ? arguments[0] : arguments[1];

	var self = this;
	var findComplete = false; // do not trigger subscription until find is complete

	var subscriptionId = self.subscribe(query, subscribeCallback);

	self.collection.find(query, function(error, docs) {
		if(error)
			callback(error, null);
		else {
			findComplete = true;
			docs.forEach(function(doc) {
				callback(null, 'insert', doc);
			});
		}
	});

	return subscriptionId;

	function subscribeCallback() {
		if(findComplete) // return once find has returned
			callback.apply(self, Array.prototype.slice.call(arguments));
	}
};

/**
 *
 * @param [query]
 * @param subscribeCallback
 */
OmsSubscriptions.prototype.subscribe = function() {
	var query = (typeof arguments[1] == 'function') ? arguments[0] : {};
	var subscribeCallback = (typeof arguments[0] == 'function') ? arguments[0] : arguments[1];

	this.maxSubscriptionId++;
	this.subscriptions[this.maxSubscriptionId] = {query: query, callback: subscribeCallback};
	return this.maxSubscriptionId;
};

/**
 * Remove subscription
 * @param subscriptionId
 */
OmsSubscriptions.prototype.unsubscribe = function(subscriptionId) {
	delete this.subscriptions[subscriptionId];
};

/**
 * Publish an event and arguments
 * @private
 */
OmsSubscriptions.prototype._publish = function() {
	var publishArgs = Array.prototype.slice.call(arguments);
	var operation = publishArgs.shift(); // remove the operation

	var self = this;
	var collection = self.collection;

	switch(operation) {
		case 'insert':
			var doc = publishArgs[0];
			self._objectForEach(this.subscriptions, function(subscription, subscriptionId) {
				if(collection._docFilter(doc, subscription.query))
					self._subscriptionCallback(subscription, operation, doc);
			});
			break;
		case 'remove':
			var doc = publishArgs[0];
			self._objectForEach(this.subscriptions, function(subscription, subscriptionId) {
				if(collection._docFilter(doc, subscription.query))
					self._subscriptionCallback(subscription, operation, doc);
			});
			break;
		case 'update':
			var unmodifiedDoc = publishArgs[0];
			var modifiedDoc = publishArgs[1];
			var updateOperations = publishArgs[2];
			self._objectForEach(this.subscriptions, function(subscription, subscriptionId) {
				var unmodifiedDocMatch = collection._docFilter(unmodifiedDoc, subscription.query);
				var modifiedDocMatch = collection._docFilter(modifiedDoc, subscription.query);

				if(unmodifiedDocMatch && modifiedDocMatch) // send update
					self._subscriptionCallback(subscription, 'update', unmodifiedDoc, modifiedDoc, updateOperations);
				else if(unmodifiedDocMatch && !modifiedDocMatch) // send removal
					self._subscriptionCallback(subscription, 'remove', unmodifiedDoc);
				else if(!unmodifiedDocMatch && modifiedDocMatch) // send insertion
					self._subscriptionCallback(subscription, 'insert', modifiedDoc);
			});
			break;
	}
};

/**
 * Returns true if query matches document
 * @param doc
 * @param query
 * @returns {*}
 * @private
 */
OmsSubscriptions.prototype._docFilter = function(doc, query) {
	return FauxMongo.matchQuery(doc, query);
};

/**
 *
 * @private
 */
OmsSubscriptions.prototype._subscriptionCallback = function() {
	var subscriptionCallbackArgs = Array.prototype.slice.call(arguments);
	var subscription = subscriptionCallbackArgs.shift();

	try {
		subscription.callback.apply(subscription, [null].concat(subscriptionCallbackArgs));
	}
	catch(error) {
		// TODO do something with the error
	}
};

OmsSubscriptions.prototype._objectForEach = function(object, callback) {
	// run function on each property (child) of object
	var property;
	for(property in object) { // pull keys before looping through?
		if (object.hasOwnProperty(property))
			callback(object[property], property, object);
	}
};

OmsSubscriptions.prototype._replicateFunctions = function(sourceObject) {
	var self = this;
	var functions = this._objectPublicFunctions(sourceObject); // get collection's public functions
	var excludeFunctions = [];
	functions.forEach(function(functionName) {
		if(typeof self[functionName] == 'undefined' && excludeFunctions.indexOf(functionName) < 0) { // safety check, don't override own functions
			// set own public function to match collection's function
			self[functionName] = function () {
				sourceObject[functionName].apply(sourceObject, Array.prototype.slice.call(arguments));
			}
		}
	});
};

OmsSubscriptions.prototype._objectPublicFunctions = function(object) {
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

module.exports = function(config) {
	return new OmsSubscriptions(config);
};