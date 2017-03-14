var FauxMongo = require('fauxmongo');
var OmsUtils = {};

/**
 * Returns true if query matches document
 * @param doc
 * @param query
 * @returns {*}
 * @private
 */
OmsUtils.docMatch = function(doc, query) {
	return FauxMongo.matchQuery(doc, query);
};

OmsUtils.operationFunctionArguments = function(operationType, operationObject) {
	switch(operationType) {
		case 'insert':
			return [operationObject.doc, operationObject.options];
			break;
		case 'update':
			return [{_id: operationObject.unmodifiedDoc._id}, operationObject.updateOperation, operationObject.options];
			break;
		case 'remove':
			return [{_id: operationObject.doc._id}, operationObject.options];
			break;
		default:
			throw new Error('undefined_operation_type');
			break;
	}
};

// Return a minimum operationDoc from operation type and operation
OmsUtils.operationDoc = function(opType, operationObject) {

	return {
		type: opType,
		date: new Date(),
		operation: operationObject
	};

};

// Convert emitted event args array into object
OmsUtils.operationObject = function(operationType, operationArgs) {
	switch(operationType) {
		case 'insert':
			return {
				doc: operationArgs[0],
				options: (typeof operationArgs[1] != 'object' && operationArgs[1] == null) ? {} : operationArgs[1]
			};
			break;
		case 'update':
			return {
				unmodifiedDoc: operationArgs[0],
				modifiedDoc: operationArgs[1],
				updateOperation: operationArgs[2],
				options: (typeof operationArgs[3] != 'object' && operationArgs[3] == null) ? {} : operationArgs[3]
			};
			break;
		case 'remove':
			return {
				doc: operationArgs[0],
				options: (typeof operationArgs[1] != 'object' && operationArgs[1] == null) ? {} : operationArgs[1]
			};
			break;
		default:
			throw new Error('undefined_operation_type');
			break;
	}
};

module.exports = OmsUtils;