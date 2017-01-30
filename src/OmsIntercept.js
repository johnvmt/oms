var QueueEmitter = require('queue-emitter');

function OmsIntercept(collection) {
	this.collection = collection;
	this._maxOpId = 0;

	this._replicateCollectionFunctions();
}

OmsIntercept.prototype.__proto__ = QueueEmitter.prototype;

OmsIntercept.prototype._replicateCollectionFunctions = function() {
	var omsIntercept = this;
	var functions = omsIntercept._objectPublicFunctions(this.collection); // get collection's public functions
	var excludeFunctions = ['isCapped'];
	functions.forEach(function(functionName) {
		if(typeof omsIntercept[functionName] == 'undefined' && excludeFunctions.indexOf(functionName) < 0) { // safety check, don't override own functions
			// set own public function to match collection's function
			omsIntercept[functionName] = function () {
				omsIntercept._collectionFunction(functionName, Array.prototype.slice.call(arguments));
			}
		}
	});
};

OmsIntercept.prototype._collectionFunction = function(functionName, functionArguments) {
	var omsIntercept = this;
	var opId = omsIntercept._maxOpId;
	var opCompleteArgs = undefined;
	omsIntercept._maxOpId++;

	// callback is last argument
	// remove it and only call it when queues complete
	if(Array.isArray(functionArguments) && functionArguments.length > 0 && typeof functionArguments[functionArguments.length - 1] == 'function')
		var completeCallback = functionArguments.pop();

	// Called after completing pre-processing queue
	function preCallback(error) {
		if(error !== null) // exit if prep-processing functions return an error
			opCallback(error);
		else // proceed if queue finished successfully
			omsIntercept.collection[functionName].apply(omsIntercept.collection, functionArguments.concat([opCallback]));
	}

	// Called after the operation
	function opCallback() {
		opCompleteArgs = Array.prototype.slice.call(arguments); // store to pass through original callback
		omsIntercept.emit.apply(omsIntercept, [functionName].concat(opId).concat(opCompleteArgs).concat([opEmitCallback]));
	}

	function opEmitCallback(error) {
		if(typeof completeCallback == 'function') {
			var completeArgs = Array.prototype.slice.call(arguments);
			completeArgs.shift(); // remove opId
			completeCallbackSafe(completeArgs);
		}
	}

	// Only call if completeCallback is a function
	function completeCallbackSafe() {
		if(typeof completeCallback == 'function')
			completeCallback.apply(omsIntercept, opCompleteArgs);
	}

	// emit(pre-OP, opId, <opArgs>)
	omsIntercept.emit.apply(omsIntercept, ['pre-' + functionName].concat(opId).concat(functionArguments).concat([preCallback]));
};

OmsIntercept.prototype._objectPublicFunctions = function(object) {
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

module.exports = function(collection) {
	return new OmsIntercept(collection);
};