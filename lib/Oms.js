var OmsCore = require('./OmsCore');
var OmsMessenger = require('./OmsMessenger');
var Utils = require('./Utils');

function Oms(config) {
	this.omsCore = new OmsCore(config);
	this.messenger = new OmsMessenger(this.omsCore);
}

Oms.prototype.objectFind = function() {
	var collArgs = Array.prototype.slice.call(arguments); // convert arguments to array
	collArgs.unshift(this.omsCore.config.collections.objects); // add collection as first argument
	this.omsCore.collectionDocFind.apply(this.omsCore, collArgs);
};

Oms.prototype.objectInsert = function(object, callback) {
	this.omsCore.collectionDocInsert(this.omsCore.config.collections.objects, object, callback);
};

Oms.prototype.objectDelete = function(filter, callback) {
	this.omsCore.collectionDocDelete(this.omsCore.config.collections.objects, filter, callback);
};

Oms.prototype.objectUpdate = function(filter, updateAttributes, callback) {
	this.omsCore.collectionDocUpdate(this.omsCore.config.collections.objects, filter, updateAttributes, callback);
};

Oms.prototype.objectFindVersion = function(filter, version, callback) {
	this.omsCore.collectionDocFindVersion(this.omsCore.config.collections.objects, filter, version, callback);
};

module.exports = Oms;