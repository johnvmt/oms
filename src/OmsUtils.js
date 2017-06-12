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

OmsUtils.operationFunctionArguments = function(operationObject) {
	switch(operationObject.operation) {
		case 'insert':
			return [operationObject.doc, operationObject.options];
			break;
		case 'update':
			return [{_id: operationObject.unmodifiedDoc._id}, operationObject.updateOperation, operationObject.options];
			break;
		case 'remove':
			return [{_id: operationObject.doc._id}, operationObject.options];
			break;
		case 'subscribe':
			return [operationObject.status, (typeof operationObject.options == 'object' && operationObject.options != null) ? operationObject.options : {}];
			break;
		default:
			throw new Error('undefined_operation_type');
			break;
	}
};

// Return a minimum operationDoc from operation type and operation
OmsUtils.operationDoc = function(operationObject) {
	return {
		date: new Date(),
		operation: operationObject
	};
};

/**
 *
 * @param operationDoc
 */
OmsUtils.operationDocMin = function (operationDoc) {
	return {
		_id: operationDoc._id,
		operation: OmsUtils.operationObjectMin(operationDoc.operation)
	};
};

/**
 *
 * @param operationObject
 */
OmsUtils.operationObjectMin = function (operationObject) {
	switch(operationObject.operation) {
		case 'remove':
			return {
				operation: operationObject.operation,
				doc: {_id: operationObject.doc._id},
				options: operationObject.options
			};
			break;
		case 'update':
			return {
				operation: operationObject.operation,
				unmodifiedDoc: {_id: operationObject.unmodifiedDoc._id},
				updateOperation: operationObject.updateOperation,
				options: operationObject.options
			};
			break;
		case 'insert':
		case 'subscribe':
		default:
			return operationObject;
			break;
	}
};

// Convert emitted event args array into object
OmsUtils.operationObject = function(operationType, operationArgs) {
	switch(operationType) {
		case 'insert':
		case 'remove':
			return {
				operation: operationType,
				doc: operationArgs[0],
				options: (typeof operationArgs[1] != 'object' && operationArgs[1] == null) ? {} : operationArgs[1]
			};
			break;
		case 'update':
			return {
				operation: operationType,
				unmodifiedDoc: operationArgs[0],
				modifiedDoc: operationArgs[1],
				updateOperation: operationArgs[2],
				options: (typeof operationArgs[3] != 'object' || operationArgs[3] == null) ? {} : operationArgs[3]
			};
			break;
		case 'subscribe':
			return {
				operation: operationType,
				status: operationArgs[0],
				options: (typeof operationArgs[1] != 'object' || operationArgs[1] == null) ? {} : operationArgs[1]
			};
			break;
		default:
			throw new Error('undefined_operation_type');
			break;
	}
};

module.exports = OmsUtils;