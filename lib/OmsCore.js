var jsondiffpatch = require('jsondiffpatch');
var Utils = require('./Utils');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

function OmsCore(config) {
	this.setConfig(config);
}

OmsCore.prototype.collectionDocFind = function() {
	// collection, filters, [fields], callback
	var filterValidated = this.filterValidate(arguments[1]);

	var collectionConfig = arguments[0];
	if(arguments.length == 3) { // filters, callback
		var findArgs = [filterValidated];
		var callback = arguments[2];
	}
	else if(arguments.length == 4) { // filters, fields, callback
		var findArgs = [filterValidated, arguments[2]];
		var callback = arguments[3];
	}

	this.collectionOperation(collectionConfig.collection, 'find', findArgs, findResult);

	function findResult(error, cursor) {
		if(error)
			callback(error, null);
		else
			cursor.toArray(callback);
	}
};

OmsCore.prototype.collectionDocInsert = function(collectionConfig, object, callback) {
	var insertObject = Utils.objectMerge(object, this.objectExtendedAttributes()); // add extra attributes (created, modified)

	this.collectionOperation(collectionConfig.collection, 'insertOne', [insertObject, afterInsert]);

	function afterInsert(error, result) {
		if(typeof callback === 'function') {
			if(error)
				callback(error, null);
			else
				callback(null, insertObject); // return the object (now has _id attached)
		}
	}
};

OmsCore.prototype.collectionDocUpdate = function(collectionConfig, filter, updateAttributes, callback) {
	var self = this;

	var objFilter = this.filterValidate(filter);

	self.collectionDocFind(collectionConfig, objFilter, {deltas: 0}, function(error, resultObjects) {
		if(error)
			triggerCallback(error, null);
		else {
			var updatesRemaining = resultObjects.length;
			var updateErrors = [];
			if(updatesRemaining > 0) {
				resultObjects.forEach(function(resultObject) {
					updateObject(resultObject, updateAttributes, function(error, complete) {
						updatesRemaining--;
						if(error)
							updateErrors.push(error);
						if(updatesRemaining == 0)
							callback(updateErrors.length > 0 ? updateErrors : null, updateErrors.length  == 0);
					});
				});
			}
			else
				callback(null, []);
		}
	});

	function updateObject(objectToUpdate, updateAttributes, callback) {
		var extraMetadata = {
			modified: self.date(),
			version: objectToUpdate.version + 1
		};

		var updateExtended = Utils.objectMerge(updateAttributes, extraMetadata);

		try {
			var query = updateQuery(updateExtended, objectToUpdate);
			var updateFilter = {_id: objectToUpdate._id};
			self.collectionOperation(collectionConfig.collection, 'update', [updateFilter, query, callback]);
		}
		catch(error) {
			triggerCallback(error, null);
		}
	}

	function afterUpdate(error, result) {
		triggerCallback(error, !error);
	}

	function updateQuery(updateExtended, oldObjExtended) {
		var newObjExtended = Utils.objectMerge(oldObjExtended, updateExtended); // build new extended object from the old extended object so we can find differences

		var diff = self.diffDocs(newObjExtended, oldObjExtended, collectionConfig.attributesDiff);
		if(typeof diff === "undefined")
			throw new Error("diff_undefined");
		return {$set: updateExtended, $push: {deltas: {delta: diff, dateCreated: oldObjExtended.modified, dateReplaced: updateExtended.modified, version: oldObjExtended.version}}};
	}

	function triggerCallback(error, result) {
		if(typeof callback === "function")
			callback(error, result);
	}
};

OmsCore.prototype.collectionDocDelete = function(collectionConfig, filter, callback) {
	this.collectionOperation(collectionConfig.collection, 'remove', [filter, afterRemove]);

	function afterRemove(error, result) {
		callback(error, Utils.objectGet(result, ['result', 'n']));
	}
};

/* Object Version Functions */
OmsCore.prototype.collectionDocFindVersionDate = function(collectionConfig, filter, date, callback) {
	var self = this;
	var objFilter = self.filterValidate(filter); // TODO add version to filter (where dbversion >= version)

	var groupInclude = {};
	var groupIncludeKeys = collectionConfig.attributesFetch;
	groupIncludeKeys.forEach(function(diffKey) {
		groupInclude[diffKey] = {$first: '$' + diffKey};
	});

	var groupIncludeSimple = {};
	groupIncludeKeys.forEach(function(diffKey) {
		groupIncludeSimple[diffKey] = 1;
	});

	var aggregation = [
		{$match: objFilter},
		{
			"$project": Utils.objectMerge(
				{
					"deltas": {
						"$cond": {
							"if": {$or: [{$eq: [{$size: "$deltas"}, 0]}, {$lte: ["$modified", date]}]},
							"then": [null],
							"else": "$deltas"
						}
					},
					"_id": 1
				},
				groupIncludeSimple
			)
		},
		{$unwind: '$deltas'},
		{$match: {$or: [{'deltas.version':{ $exists: false}},{'deltas.dateReplaced': {$gte: date}}]}},
		{$group: Utils.objectMerge({deltas:{$push: '$deltas'}}, {_id: "$_id"},groupInclude)},
		{
			"$project" : Utils.objectMerge(
				{
					"deltas" : {
						"$cond" : {
							"if" : {$eq : ["$deltas", [null]]},
							"then" : [],
							"else" : "$deltas"
						}
					},
					"_id" : 1},
				groupIncludeSimple
			)
		}

	];

	this.collectionOperation(collectionConfig.collection, 'aggregate', [aggregation], function(error, resultCursor) {
		if(error)
			triggerCallback(error, null);
		else {
			var versionObjectsExtended = [];
			resultCursor.toArray(function(error, objectsExtended) {
				objectsExtended.forEach(function(objectExtended) {
					var versionObjectExtended = objectApplyDeltas(objectExtended, collectionConfig.attributesDiff);
					if(versionObjectExtended.version == version)
						versionObjectsExtended.push(versionObjectExtended);
				});
				triggerCallback(null, versionObjectsExtended);
			});
		}
	});

	function objectApplyDeltas(objectExtended, attributesDiff) {
		// apply all the deltas in the object (for a complete extendedObject from the db, this would result in version 1 of the object)
		return self.diffPatchDocMultiple(objectExtended, objectExtended.deltas, attributesDiff);
	}

	function triggerCallback(error, objectExtended) {
		if (typeof callback === "function")
			callback(error, objectExtended);
	}
};

OmsCore.prototype.collectionDocFindVersion = function(collectionConfig, filter, version, callback) {
	var self = this;
	var objFilter = self.filterValidate(filter); // TODO add version to filter (where dbversion >= version)

	var groupInclude = {};
	var groupIncludeKeys = collectionConfig.attributesFetch;
	groupIncludeKeys.forEach(function(diffKey) {
		groupInclude[diffKey] = {$first: '$' + diffKey};
	});

	var groupIncludeSimple = {};
	groupIncludeKeys.forEach(function(diffKey) {
		groupIncludeSimple[diffKey] = 1;
	});

	var aggregation = [
		{$match: objFilter},
		{
			"$project": Utils.objectMerge(
				{
					"deltas": {
						"$cond": {
							"if": {$or: [{$eq: [{$size: "$deltas"}, 0]}, {$eq: ["$version", version]}]},
							"then": [null],
							"else": "$deltas"
						}
					},
					"_id": 1
				},
				groupIncludeSimple
			)
		},
		{$unwind: '$deltas'},
		{$match: {$or: [{'deltas.version':{ $exists: false}},{'deltas.version': {$gte: version}}]}},
		{$group: Utils.objectMerge({deltas:{$push: '$deltas'}}, {_id: "$_id"},groupInclude)},
		{
			"$project" : Utils.objectMerge(
				{
				"deltas" : {
					"$cond" : {
						"if" : {$eq : ["$deltas", [null]]},
						"then" : [],
						"else" : "$deltas"
					}
				},
				"_id" : 1},
				groupIncludeSimple
			)
		}
	];

	this.collectionOperation(collectionConfig.collection, 'aggregate', [aggregation], function(error, resultCursor) {
		if(error)
			triggerCallback(error, null);
		else {
			var versionObjectsExtended = [];
			resultCursor.toArray(function(error, objectsExtended) {
				objectsExtended.forEach(function(objectExtended) {
					var versionObjectExtended = objectApplyDeltas(objectExtended, collectionConfig.attributesDiff);
					if(versionObjectExtended.version == version)
						versionObjectsExtended.push(versionObjectExtended);
				});
				triggerCallback(null, versionObjectsExtended);
			});
		}
	});

	function objectApplyDeltas(objectExtended, attributesDiff) {
		// apply all the deltas in the object (for a complete extendedObject from the db, this would result in version 1 of the object)
		return self.diffPatchDocMultiple(objectExtended, objectExtended.deltas, attributesDiff);
	}

	function triggerCallback(error, objectExtended) {
		if (typeof callback === "function")
			callback(error, objectExtended);
	}
};

/* Object Diff Functions */
OmsCore.prototype.diffDocs = function(objectExtended1, objectExtended2, diffAttributes) {
	return this.diff(Utils.objectGet(objectExtended1, [diffAttributes]), Utils.objectGet(objectExtended2, [diffAttributes]));
};

OmsCore.prototype.diffPatchDocMultiple = function(objectExtended, deltasExtended, diffAttributes) {
	var self = this;

	if(deltasExtended.length > 0) {
		var versionObject = Utils.objectGet(objectExtended, [diffAttributes]);

		// warning: loops backwards through deltas, as this is how they are stored in DB
		for (var index = deltasExtended.length - 1; index >= 0; index--) {
			var deltaExtended = deltasExtended[index];
			self.diffPatch(versionObject, deltaExtended.delta);
			versionObject.modified = deltaExtended.dateCreated;
			versionObject.version = deltaExtended.version;
		}
	}
	else // most recent version is requested (no diffs to apply)
		var versionObject = Utils.objectGet(objectExtended, [diffAttributes.concat(['modified', 'version'])]);

	if(typeof objectExtended.created !== 'undefined')
		versionObject.created = objectExtended.created;
	if(typeof objectExtended._id !== 'undefined')
		versionObject._id = objectExtended._id;

	return versionObject;
};

/* Diff Functions */
OmsCore.prototype.diff = function(object1, object2) {
	return jsondiffpatch.diff(object1, object2);
};

OmsCore.prototype.diffPatch = function(object, diff) {
	return jsondiffpatch.patch(object, diff);
};

/* Database Helper Functions */
OmsCore.prototype.dbOperation = function(operation, operationArguments, callback) {
	this.getConn(function(error, db) {
		if(error)
			triggerCallback(error, null);
		else {
			try {
				var ret = db[operation].apply(db, operationArguments);
				triggerCallback(null, ret);
			}
			catch(error) {
				triggerCallback(error, null);
			}
		}
	});

	function triggerCallback(error, result) {
		if(typeof callback === "function")
			callback(error, result);
	}
};

OmsCore.prototype.collectionOperation = function(collectionName, operation, operationArguments, callback) {
	var self = this;
	self.getConn(function(error, dbConn) {
		if(error)
			triggerCallback(error, null);
		else {
			if(!(operationArguments instanceof Array))
				operationArguments= [];

			try {
				var collection = dbConn.collection(collectionName);
				if(operationArguments instanceof Array)
					var ret = collection[operation].apply(collection, operationArguments);
				else
					var ret = collection[operation].apply(collection);
				triggerCallback(null, ret);
			}
			catch(error) {
				triggerCallback(error, null);
			}
		}
	});

	function triggerCallback(error, result) {
		if(typeof callback === "function")
			callback(error, result);
	}
};

/* Utility Functions */
OmsCore.prototype.objectExtendedAttributes = function() {
	return {
		modified: this.date(),
		created: this.date(),
		version: 1,
		deltas: []
	};
};

OmsCore.prototype.filterValidate = function(filter) {
	var filterSanitized = {};
	if(typeof filter === "string") // passed an _id as string
		filterSanitized = Utils.objectMerge({_id: ObjectID(filter)}, filterSanitized);
	else if(filter instanceof  ObjectID) // passed an _id as ObjectId
		filterSanitized = Utils.objectMerge({_id: filter}, filterSanitized);
	else {
		filterSanitized = Utils.objectMerge(filter, filterSanitized);
		if(typeof filterSanitized._id === "string")
			filterSanitized._id = ObjectID(filterSanitized._id)
	}
	return filterSanitized;
};

OmsCore.prototype.date = function() {
	return new Date();
};

/* Config Functions */
OmsCore.prototype.setConfig = function(configOverride) {
	// merges with contents of defaults.js, with priority given to passed config
	var configDefaults = require('../defaults');
	this.config = Utils.objectMerge(configDefaults, configOverride);
};

/* Connection Functions */
OmsCore.prototype.getConn = function(callback) {
	var self = this;
	if(typeof self.dbConn === "object")
		callback(null, self.dbConn);
	else {
		self.connect(function(error, dbConn) {
			if(!error)
				self.dbConn = dbConn;
			callback(error, dbConn);
		});
	}
};

OmsCore.prototype.connect = function(callback) {
	// only called when first operation is made (eg: insert, update, query etc.)
	var url = this.config.db;
	MongoClient.connect(url, function(error, dbConn) {
		// TODO add authentication
		if(typeof callback === "function")
			callback(error, dbConn);
	});
};

OmsCore.prototype.disconnect = function(callback) {
	if(typeof this.dbConn === "object") {
		try {
			this.dbConn.close();
			callback(null, true);
		}
		catch(error) {
			callback(error, null);
		}
	}
};

module.exports = OmsCore;