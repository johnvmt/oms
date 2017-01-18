var EventEmitter = require('wolfy87-eventemitter');
var Utils = require('./Utils');

function Oms(collection) {
	this._collection = collection;
	this._maxOpId = 0;

	this._replicateCollectionFunctions();
}

Oms.prototype.__proto__ = EventEmitter.prototype;

Oms.prototype._replicateCollectionFunctions = function() {
	var oms = this;
	var functions = Utils.objectPublicFunctions(this._collection); // get collection's public functions
	var excludeFunctions = ['isCapped'];
	functions.forEach(function(functionName) {
		if(typeof oms[functionName] == 'undefined' && excludeFunctions.indexOf(functionName) < 0) { // safety check, don't override own functions
			// set own public function to match collection's function
			oms[functionName] = function () {
				oms._collectionFunction(functionName, Array.prototype.slice.call(arguments));
			}
		}
	});
};

Oms.prototype._collectionFunction = function(functionName, functionArguments) {
	var oms = this;
	var opId = oms._maxOpId;
	oms._maxOpId++;

	if(Array.isArray(functionArguments) && functionArguments.length > 0 && typeof functionArguments[functionArguments.length - 1] == 'function') // callback is last argument
		var completeCallback = functionArguments.pop();

	// Called after pre-processing
	function preCallback() {
		oms._collection[functionName].apply(this._collection, functionArguments.concat([opCallback]));
	}

	// Called after the operation
	function opCallback() {
		oms._emitQueue.apply(oms, [functionName].concat(opId).concat(Array.prototype.slice.call(arguments)).concat([opEmitCallback]));
	}

	function opEmitCallback() {
		if(typeof completeCallback == 'function') {
			var completeArgs = Array.prototype.slice.call(arguments);
			completeArgs.shift(); // remove opId
			completeCallback.apply(oms, completeArgs);
		}
	}

	// emit(pre-OP, opId, <opArgs>)
	this._emitQueue.apply(this, ['pre-' + functionName].concat(opId).concat(functionArguments).concat([preCallback]));
};

/**
 * Emit an event to a queue of functions
 * Each function must call next() for the queue to advance
 * @param eventName
 * @param {...*} eventArgs
 */
Oms.prototype._emitQueue = function() {
	var emitter = this;

	var functionArgs = Array.prototype.slice.call(arguments);
	var eventName = functionArgs.shift();
	var queueCompleteCallback = functionArgs.pop();

	var listenersConfig = emitter.getListeners(eventName);
	var listenersFns = [];
	listenersConfig.forEach(function(listenerConfig) {
		listenersFns.push(listenerConfig.listener);
	});

	Utils.callbackQueue(
		listenersFns,
		functionArgs,
		function() {
			// callback queue completed
			// remove 'once' callbacks
			listenersConfig.filter(function(listenerConfig) {
				return listenerConfig.once; // remove functions whose 'once' attribute is true
			}).forEach(function (listenerConfig) {
				emitter.off(eventName, listenerConfig.listener);
			});

			if(typeof queueCompleteCallback == 'function')
				queueCompleteCallback.apply(emitter, Array.prototype.slice.call(arguments));
		}
	);
};

module.exports = function(collection) {
	return new Oms(collection);
};