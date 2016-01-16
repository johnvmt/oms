var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

function OmsMessenger(omsCore) {
	this.omsCore = omsCore;
}

OmsMessenger.prototype.destroy = function(channel, callback) {
	// only to adhere to other pub/sub-type systems
	callback(null, true);
};

OmsMessenger.prototype.create = function(channel, callback) {
	var self = this;
	self.omsCore.dbOperation('createCollection', [self.omsCore.config.messenger.collection, {
		capped: true,
		size: self.omsCore.config.messenger.size,
		max: self.omsCore.config.messenger.max
	}, triggerCallback]);

	function triggerCallback(error, result) {
		if(typeof callback === "function")
			callback(error, result);
	}
};

OmsMessenger.prototype.subscribe = function(channel, messageCallback, subscribeCallback) {
	var self = this;
	// TODO add check that collection exists, is capped (can use channelCreate)
	self.publish(channel, 'subscribe', {}, function(error, messageId) {
		if(error)
			triggerCallback(error, messageId);
		else {
			var findOptions = {channel: channel};
			var cursorOptions = {
				tailable: true,
				awaitdata: true,
				numberOfRetries: Number.MAX_VALUE
			};

			self.omsCore.collectionOperation(self.omsCore.config.messenger.collection, 'find', [findOptions, cursorOptions], processStream);

			function processStream(error, stream) {
				if(error)
					triggerCallback(error, null);
				else {
					try {
						stream.stream();

						var reachedStartObj = false;

						stream.on('data', function (object) {
							if (!reachedStartObj) {
								if (String(object._id) == String(messageId)) {
									reachedStartObj = true;
									triggerCallback(null, true);
								}
							}
							else if (typeof object.type === "string" && object.type === "message")
								messageCallback(null, object.message);
						});

						stream.on('error', function (error) {
							messageCallback(error, null);
						});

						stream.on('end', function () {
							messageCallback("cursor_end", null);
						});
					}
					catch(error) {
						triggerCallback(error, null);
					}
				}
			}
		}
	});

	function triggerCallback(error, result) {
		if(typeof subscribeCallback === "function")
			subscribeCallback(error, result);
	}
};

OmsMessenger.prototype.publish = function() {
	// channel, [msgType], object, callback
	var channel = arguments[0];
	var type = arguments.length == 4 ? arguments[1] : 'message';
	var object = arguments.length == 4 ? arguments[2] : arguments[1];
	var callback = arguments.length == 4 ? arguments[3] : arguments[2];

	var message = {channel: channel, type: type, message: object};

	var afterInsert = function(error) {
		if(typeof callback === 'function') {
			if (error)
				callback(error, null);
			else
				callback(null, message._id);
		}
	};

	this.omsCore.collectionOperation(this.omsCore.config.messenger.collection, 'insert', [message, afterInsert]);
};

module.exports = OmsMessenger;