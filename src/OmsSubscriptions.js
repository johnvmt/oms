var OmsUtils = require('./OmsUtils');
/**
 *
 * @param config
 * @constructor
 */
function OmsSubscriptions(opLogSubscriptions) {
	this.opLogSubscriptions = opLogSubscriptions;
}

/**
 *
 * @param [query]
 * @param callback
 */
OmsSubscriptions.prototype.findSubscribeObject = function() {
	var query = (typeof arguments[1] == 'function') ? arguments[0] : {};
	var callback = (typeof arguments[0] == 'function') ? arguments[0] : arguments[1];
	return this.opLogSubscriptions.findSubscribe(query, {}, function(error, opLogDoc) {
		if(error)
			callback(error);
		else
			callback(error, opLogDoc.operation);
	});
};

/**
 *
 * @param [query]
 * @param subscribeCallback
 */
OmsSubscriptions.prototype.subscribeObject = function() {
	var query = (typeof arguments[1] == 'function') ? arguments[0] : {};
	var callback = (typeof arguments[0] == 'function') ? arguments[0] : arguments[1];
	return this.opLogSubscriptions.subscribe(query, {}, function(error, opLogDoc) {
		if(error)
			callback(error);
		else
			callback(error, opLogDoc.operation);
	});
};

/**
 *
 * @param [query]
 * @param callback
 */
OmsSubscriptions.prototype.findSubscribe = function() {
	var query = (typeof arguments[0] == 'function') ? {} : arguments[0];
	var callback = (typeof arguments[0] == 'function') ? arguments[0] : arguments[1];
	this.findSubscribeObject(query, function(error, operationObject) {
		if(error)
			callback(error);
		else
			callback.apply(this, [error, operationObject.operation].concat(OmsUtils.operationFunctionArguments(operationObject)));
	});
};

/**
 *
 * @param [query]
 * @param subscribeCallback
 */
OmsSubscriptions.prototype.subscribe = function() {
	var query = (typeof arguments[0] == 'function') ? {} : arguments[0];
	var callback = (typeof arguments[0] == 'function') ? arguments[0] : arguments[1];
	this.subscribeObject(query, function(error, operationObject) {
		if(error)
			callback(error);
		else
			callback.apply(this, [error, operationObject.operation].concat(OmsUtils.operationFunctionArguments(operationObject)));
	});
};

/**
 * Remove subscription
 * @param subscriptionId
 */
OmsSubscriptions.prototype.unsubscribe = function(subscriptionId) {
	return this.opLogSubscriptions.unsubscribe(subscriptionId);
};

module.exports = function(opLogSubscriptions) {
	return new OmsSubscriptions(opLogSubscriptions);
};