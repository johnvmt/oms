var FauxMongo = require('fauxmongo');
var FunctionUtils = require('./FunctionUtils');
var OmsUtils = require('./OmsUtils');
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

	FunctionUtils.objectReplicateFunctions(self, self.collection);

	// pass emitted events to publish function
	var operationTypes = ['insert', 'update', 'remove'];
	operationTypes.forEach(function(operationType) {
		self.collection.on(operationType, function() {
			self._publish(operationType, OmsUtils.operationObject(operationType, arguments)); // Convert into object, pass to publish function
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
OmsSubscriptions.prototype._publish = function(operationType, operationObject) {
	var self = this;
	var collection = self.collection;

	switch(operationType) {
		case 'insert':
		case 'remove':
			self._objectForEach(this.subscriptions, function(subscription, subscriptionId) {
				if(collection._docFilter(operationObject.doc, subscription.query))
					self._subscriptionCallback(subscription, operationType, operationObject.doc);
			});
			break;
		case 'update':
			self._objectForEach(self.subscriptions, function(subscription, subscriptionId) {
				var unmodifiedDocMatch = collection._docFilter(operationObject.unmodifiedDoc, subscription.query);
				var modifiedDocMatch = collection._docFilter(operationObject.modifiedDoc, subscription.query);

				if(unmodifiedDocMatch && modifiedDocMatch) // send update
					self._subscriptionCallback(subscription, 'update', operationObject.unmodifiedDoc, operationObject.modifiedDoc, operationObject.updateOperation);
				else if(unmodifiedDocMatch && !modifiedDocMatch) // send removal
					self._subscriptionCallback(subscription, 'remove', operationObject.unmodifiedDoc);
				else if(!unmodifiedDocMatch && modifiedDocMatch) // send insertion
					self._subscriptionCallback(subscription, 'insert', operationObject.modifiedDoc);
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

module.exports = function(config) {
	return new OmsSubscriptions(config);
};