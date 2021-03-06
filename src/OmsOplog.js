var MongoLocal = require('mongolocal');
var FunctionUtils = require('./FunctionUtils');
var OmsUtils = require('./OmsUtils');
var Utils = require('./Utils');

function OmsOplog(docCollection, opLogConfig, opTags) {
	var self = this;
	self.docCollection = docCollection;
	self.opLogCollection = MongoLocal(opLogConfig);
	self.docsLinkedList = self.opLogCollection.docsLinkedList;

	FunctionUtils.objectReplicateFunctions(self.opLogCollection, self);

	var opTypes = ['insert', 'update', 'remove'];

	opTypes.forEach(function(opType) {
		docCollection.on(opType, function() {
			var operationObject = OmsUtils.operationObject(opType, arguments); // Convert args to op object
			var operationDoc = OmsUtils.operationDoc(operationObject);

			if(typeof operationObject.options == 'object' && typeof operationObject.options._operation != 'undefined') { // op was applied
				var srcOperationDoc = operationObject.options._operation; // Get the op that was passed in; don't insert as-is because may be minified
				delete operationObject.options._operation; // Delete _operation so it doesn't continue to be passed on
				if(typeof srcOperationDoc._id == 'undefined' && typeof srcOperationDoc._srcId != 'undefined')
					operationDoc._id = srcOperationDoc._srcOpId;
				operationDoc.src = 'applied';
			}
			else
				operationDoc = Utils.objectMerge(opTags, operationDoc, {src: 'local'}); // Add user-defined tags
			self.opLogCollection.insert(operationDoc);
		});
	});
}

OmsOplog.prototype.applyOp = function(operationDoc) {
	var self = this;
	if(typeof operationDoc != 'undefined') {
		var searchId = (typeof operationDoc._id != 'undefined') ? operationDoc._id : operationDoc._srcOpId;

		if(typeof searchId != 'undefined') {
			self.opLogCollection.findOne({_id: searchId}, function(error, existingOperationDoc) {
				if(!error && existingOperationDoc == null) // Operation is not already in log
					applyCollectionOp(operationDoc);
			});
		}
		else // generated event (eg: an insert from findSubscribe)
			applyCollectionOp(operationDoc);
	}
	else
		throw new Error('operation_undefined');

	// Op has not previously been applied
	function applyCollectionOp(operationDoc) {

		// Tag the operation through mongolocal
		Utils.objectSet(operationDoc.operation, ['options', '_operation'], operationDoc);

		var collectionFunctionArgs = OmsUtils.operationFunctionArguments(operationDoc.operation);

		if(typeof self.docCollection[operationDoc.operation.operation] == 'function')
			self.docCollection[operationDoc.operation.operation].apply(self.docCollection, collectionFunctionArgs);
	}
};

module.exports = function(docCollection, opLogConfig, opTags) {
	return new OmsOplog(docCollection, opLogConfig, opTags);
};
