function OmsLayers(cacheCollection, masterCollection) {
	var self = this;
	self.cacheCollection = cacheCollection;
	self.masterCollection = masterCollection;

	self._replicateFunctions(self.masterCollection);

	self.masterCollection.on('insert', function(doc, options) {
		self.cacheCollection.insert(doc, options);
	});

	self.masterCollection.on('update', function(unmodifiedDoc, modifiedDoc, updateOp, options) {
		self.cacheCollection.update({_id: unmodifiedDoc._id}, updateOp, options);
	});

	self.masterCollection.on('remove', function(doc, options) {
		self.cacheCollection.remove({_id: doc._id});
	});
}

OmsLayers.prototype._replicateFunctions = function(sourceObject) {
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

OmsLayers.prototype._objectPublicFunctions = function(object) {
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

module.exports = function(cacheCollection, masterCollection) {
	return new OmsLayers(cacheCollection, masterCollection);
};
