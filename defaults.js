var defaults = {};

defaults.db = "mongodb://localhost:27017/test";

defaults.collections = {};

defaults.collections.objects = {
	collection: "objects",
	attributes: ['object'],
	attributesFetch: ['object', 'modified', 'created', 'version'],
	attributesDiff: ['object']
};

// messages, classes

defaults.messenger = {
	collection: "messenger",
	size: 5242880, // size of capped collection, in bytes
	max: 2 // max number of messages in capped collection (minimum 2)
};

module.exports = defaults;