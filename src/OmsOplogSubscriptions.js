var OmsSubscriptions = require('./OmsSubscriptions');
var OmsUtils = require('./OmsUtils');

function OmsOplogSubscriptions(opLogCollection) {
	var self = this;

	self.opLogCollection = opLogCollection;
	self.docCollection = opLogCollection.docCollection;
	self._subscriptions = {};
	self._collectionQueries = {};
	self._opLogQueries = {};

	this.opLogCollection.on('insert', function(opLogDoc) {
		self._publish(opLogDoc)
	});
}

/**
 *
 * @param lastOpId
 * @param collectionQuery
 * @param opLogQuery
 * @param callback
 */
OmsOplogSubscriptions.prototype.subscribeResume = function(lastOpId, collectionQuery, opLogQuery, callback) {
	var self = this;
	self.opLogCollection.findOne({_id: lastOpId}, function(error, lastOp) {
		if(error)
			callback(error, null);
		if(lastOp == null)
			callback('last_op_not_found', null);
		else { // Last op was found
			var listItem = self.opLogCollection.docsLinkedList.list[lastOpId];
			listItem = listItem.next; // skip the last operation

			nextOpLogItem();

			function nextOpLogItem() {
				if(listItem == null) // Reached end of oplog
					self.subscribe(collectionQuery, opLogQuery, callback);
				else {
					self.opLogCollection.findOne({_id: listItem.data}, function (error, opLogDoc) {
						if (error)
							callback(error, null);
						else {
							var opLogSubscriptionComputedDoc = self.opLogSubscriptionComputedDoc(opLogDoc, opLogQuery, collectionQuery);
							if (opLogSubscriptionComputedDoc != null)
								callback(null, opLogSubscriptionComputedDoc);
							listItem = listItem.next;
							nextOpLogItem();
						}
					});
				}
			}
		}
	});
};

/**
 * For a given opLogDoc, if queries match, determine how log action impacts subscription
 * Create an opLog doc that will be applied to client collection
 * Return null if no match
 * @param opLogDoc
 * @param opLogQuery
 * @param collectionQuery
 */
OmsOplogSubscriptions.prototype.opLogSubscriptionComputedDoc = function (opLogDoc, opLogQuery, collectionQuery) {
	if(OmsUtils.docMatch(opLogDoc, opLogQuery))
		return this.operationSubscriptionComputedDoc(opLogDoc, collectionQuery);
	else
		return null;
};

/**
 * For a given opLogDoc, if queries match, determine how log action impacts subscription
 * Create an opLog doc that will be applied to client collection
 * Return null if no match
 * @param opLogDoc
 * @param opLogQuery
 * @param collectionQuery
 */
OmsOplogSubscriptions.prototype.operationSubscriptionComputedDoc = function(opLogDoc, collectionQuery) {
	switch(opLogDoc.operation.operation) {
		case 'insert':
		case 'remove':
			if(OmsUtils.docMatch(opLogDoc.operation.doc, collectionQuery)) // Return original opLogDoc
				return this._objectMerge(opLogDoc, {src: 'subscription'});
			break;
		case 'update':
			var unmodifiedDocMatch = OmsUtils.docMatch(opLogDoc.operation.unmodifiedDoc, collectionQuery);
			var modifiedDocMatch = OmsUtils.docMatch(opLogDoc.operation.modifiedDoc, collectionQuery);

			if(unmodifiedDocMatch && modifiedDocMatch) // send original update
				return opLogDoc;
			else {
				if(unmodifiedDocMatch && !modifiedDocMatch) // send removal
					var operationObject = OmsUtils.operationObject('remove', [opLogDoc.operation.unmodifiedDoc]);
				else if(!unmodifiedDocMatch && modifiedDocMatch) // send insertion
					var operationObject = OmsUtils.operationObject('insert', [opLogDoc.operation.modifiedDoc]);
				else // Doesn't match at all
					return null;
				
				return this._objectMerge(operationDoc, {_srcOpId: opLogDoc._id, src: 'subscription_translated'}); // Assign ID of ID which triggered this event
			}
			break;
		default:
			throw new Error('unknown_event');
			break;
	}
	return null;
};

/**
 *
 * @param collectionQuery
 * @param opLogQuery
 * @param callback
 */
OmsOplogSubscriptions.prototype.findSubscribe = function(collectionQuery, opLogQuery, callback) {
	var self = this;
	var findComplete = false; // do not trigger subscription until find is complete

	var subscriptionId = self.subscribe(collectionQuery, opLogQuery, subscribeCallback);

	self.docCollection.find(collectionQuery, function(error, collectionDocs) {
		if(error)
			callback(error, null);
		else {
			findComplete = true;
			collectionDocs.forEach(function(doc) {
				// 'Insert' each found doc
				var operationObject = OmsUtils.operationObject('insert', [doc]);
				var operationDoc = self._objectMerge(OmsUtils.operationDoc(operationObject), {src: 'subscription_setup'});
				callback(null, operationDoc);
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
 * @param collectionQuery
 * @param opLogQuery
 * @param callback
 */
OmsOplogSubscriptions.prototype.subscribe = function(collectionQuery, opLogQuery, callback) {
	var collectionQueryKey = this._queryKey(this._collectionQueries, collectionQuery);
	this._collectionQueries[collectionQueryKey].usages++;

	var opLogQueryKey = this._queryKey(this._opLogQueries, opLogQuery);
	this._opLogQueries[opLogQueryKey].usages++;

	var subscriptionKey = this._uniqueId();
	this._subscriptions[subscriptionKey] = {collectionQueryKey: collectionQueryKey, opLogQueryKey: opLogQueryKey, callback: callback};
	return subscriptionKey;
};

/**
 *
 * @param opLogDoc
 * @private
 */
OmsOplogSubscriptions.prototype._publish = function(opLogDoc) {
	var self = this;

	var collectionQueryResults = {};
	var opLogQueryResults = {};

	this._objectForEach(self._subscriptions, function(subscription, subscriptionKey) {
		var collectionQueryKey = subscription.collectionQueryKey;
		var collectionQuery = self._collectionQueries[collectionQueryKey].query;

		var opLogQueryKey = subscription.opLogQueryKey;
		var opLogQuery = self._opLogQueries[opLogQueryKey].query;

		// Store the opLog query result
		if(typeof opLogQueryResults[opLogQueryKey] != 'boolean')
			opLogQueryResults[opLogQueryKey] = OmsUtils.docMatch(opLogDoc, opLogQuery);

		// OpLog query matches
		if(opLogQueryResults[opLogQueryKey]) {
			// Store the collection query result
			if(typeof collectionQueryResults[collectionQueryKey] != 'boolean')
				collectionQueryResults[collectionQueryKey] = self.operationSubscriptionComputedDoc(opLogDoc, collectionQuery);

			if(collectionQueryResults[collectionQueryKey] != null) // Collection query matched
				subscription.callback(null, collectionQueryResults[collectionQueryKey]);
		}
	});
};


/**
 * Loop over existing queries, comparing query to needle; return key if found
 * Add the query and return its key if it does not already exist
 * @param haystackObject
 * @param needle
 * @private
 */
OmsOplogSubscriptions.prototype._queryKey = function(queriesHaystack, queryNeedle) {
	var property;
	for(property in queriesHaystack) { // pull keys before looping through?
		if (queriesHaystack.hasOwnProperty(property) && this._objectDeepEqual(queriesHaystack[property].query, queryNeedle)) // Found needle
			return property;
	}

	// Needle not found, Add it
	var queryKey = this._uniqueId();
	queriesHaystack[queryKey] = {usages: 0, query: queryNeedle};
	return queryKey;
};

/**
 * Remove subscription
 * @param subscriptionId
 */
OmsOplogSubscriptions.prototype.unsubscribe = function(subscriptionId) {

	var subscription = this._subscriptions[subscriptionId];

	if(!subscription)
		throw new Error('subscription_not_found');
	else {
		var collectionQueryKey = subscription.collectionQueryKey;
		var collectionQueryConfig = this._collectionQueries[collectionQueryKey];
		collectionQueryConfig.usages--;
		if(collectionQueryConfig.usages <= 0)
			delete this._collectionQueries[collectionQueryKey];

		var opLogQueryKey = subscription.opLogQueryKey;
		var opLogQueryConfig = this._opLogQueries[opLogQueryKey];
		opLogQueryConfig.usages--;
		if(opLogQueryConfig.usages <= 0)
			delete this._opLogQueries[opLogQueryKey];
	}
};

OmsOplogSubscriptions.prototype._uniqueId = function() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
};

OmsOplogSubscriptions.prototype._objectDeepEqual = function (x, y) {
	if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
		if (Object.keys(x).length != Object.keys(y).length)
			return false;

		for(var prop in x) {
			if(y.hasOwnProperty(prop)) {
				if (! this._objectDeepEqual(x[prop], y[prop]))
					return false;
			}
			else
				return false;
		}
		return true;
	}
	else if(x !== y)
		return false;
	else
		return true;
};

OmsOplogSubscriptions.prototype._objectForEach = function(object, callback) {
	// run function on each property (child) of object
	var property;
	for(property in object) { // pull keys before looping through?
		if (object.hasOwnProperty(property))
			callback(object[property], property, object);
	}
};

OmsOplogSubscriptions.prototype._objectMerge = function() {
	var merged = {};
	this._objectForEach(arguments, function(argument) {
		for (var attrname in argument) {
			if(argument.hasOwnProperty(attrname))
				merged[attrname] = argument[attrname];
		}
	});
	return merged;
};

module.exports = function(opLogCollection) {
	return new OmsOplogSubscriptions(opLogCollection);
};