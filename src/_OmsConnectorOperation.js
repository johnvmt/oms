function OmsConnectorOperation(query, connector) {
	this._connector = connector;
	this._docsLocked = 0;

	this._docIds = {};



}

OmsConnectorOperation.prototype.find = function(query, callback) {
	var self = this;

	self._connector.localSubscriptions.subscribe(query, function(error, operation, doc) {
		if(!error) {
			if(operation == 'insert') {

			}
		}
	});

	self._connector.mongoIntercept.find(query, function(error, result) {

		if(!error) {
			result.forEach(function(doc) {
				self._connector._insertDoc(doc);
				self._connector._lockDoc(doc._id);
			});
		}

		callback(error);

		/*
		findAndSubscribe on local

		on insert -- lockDoc
		on remove -- unlockDoc

		find from remote

		insert any from remote that are not in local
		lockDoc for each
		*/

	});
};