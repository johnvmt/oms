var FunctionUtils = require('./FunctionUtils');

function OmsLayers(cacheCollection, masterCollection) {
	var self = this;
	self.cacheCollection = cacheCollection;
	self.masterCollection = masterCollection;

	FunctionUtils.objectReplicateFunctions(self.masterCollection, self);

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

module.exports = function(cacheCollection, masterCollection) {
	return new OmsLayers(cacheCollection, masterCollection);
};
