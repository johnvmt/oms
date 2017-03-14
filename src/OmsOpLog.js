var MongoLocal = require('mongolocal');
var FunctionUtils = require('./FunctionUtils');
var OmsUtils = require('./OmsUtils');
var Utils = require('./Utils');

function OmsOpLog(docCollection, opLogConfig, opTags) {
	var self = this;
	self.docCollection = docCollection;
	self.opLogCollection = MongoLocal(opLogConfig);
	self.docsLinkedList = self.opLogCollection.docsLinkedList;

	FunctionUtils.objectReplicateFunctions(self.opLogCollection, self);

	var opTypes = ['insert', 'update', 'remove'];

	opTypes.forEach(function(opType) {
		docCollection.on(opType, function() {
			var operationObject = OmsUtils.operationObject(opType, arguments); // Convert args to op object
			if(typeof operationObject.options == 'object' && typeof operationObject.options._operation != 'undefined') { // op was applied
				var operationDoc = operationObject.options._operation;
				operationDoc._id = (typeof operationDoc._id != 'undefined') ? operationDoc._id : operationDoc._srcOpId;
			}
			else {
				var operationDoc = OmsUtils.operationDoc(opType, operationObject);
				operationDoc = Utils.objectMerge(opTags, operationDoc); // Add user-defined tags
			}

			self.opLogCollection.insert(operationDoc);
		});
	});
}

OmsOpLog.prototype.applyOp = function(operationDoc) {
	var self = this;
	if(typeof operationDoc != 'undefined') {
		var searchId = (typeof operationDoc._id != 'undefined') ? operationDoc._id : operationDoc._srcOpId;

		if(typeof searchId != 'undefined') {
			self.opLogCollection.findOne({_id: searchId}, function(error, existingOperationDoc) {
				if(!error && existingOperationDoc == null) // Operation is not already in log
					applyCollectionOp(operationDoc);
			});
		}
		else
			throw new Error('operation_id_undefined');
	}
	else
		throw new Error('operation_undefined');

	// Op has not previously been applied
	function applyCollectionOp(operationDoc) {
		// Tag the operation through mongolocal
		Utils.objectSet(operationDoc.operation, ['options', '_operation'], operationDoc);

		var collectionFunctionArgs = OmsUtils.operationFunctionArguments(operationDoc.type, operationDoc.operation);

		if(typeof self.docCollection[operationDoc.type] == 'function')
			self.docCollection[operationDoc.type].apply(self.docCollection, collectionFunctionArgs);
	}
};

OmsOpLog.prototype.opsAfterForEach = function(opId, callback) {
	var opLogCollection = this.opLogCollection;
	var opsList = opLogCollection._docsLinkedList;
	var listOp = opsList[opId];
	if(typeof listOp == 'undefined') // Operation is not in ops collection
		callback('op_not_found', null);
	else {
		while(listOp != null) {
			opLogCollection.findOne({_id: listOp.data}, callback); // Trigger callback for each subsequent op in list
			listOp = listOp.next;
		}
	}
};

module.exports = function(docCollection, opLogConfig, opTags) {
	return new OmsOpLog(docCollection, opLogConfig, opTags);
};
