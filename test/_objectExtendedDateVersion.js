var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Object Versions', function(){
	describe('Create and update', function(){
		it('should create an object, update it and check the update is applied', function(done) {
			oms.objectInsert("mytype", {key: "someval1" }, function(error, object) {
				if(error)
					throw error;
				var id = object._id;

				updateMultiple(2, 10, function() {
					oms.objectExtendedDateVersion(id, new Date(), function(error, objectExtended) {
						console.log(error, objectExtended);
						done();
					});
				});

				function updateMultiple(index, max, callback) {
					if(index < max) {
						oms.objectUpdate(id, {key: "someval" + index}, function(error, success) {
							if(error)
								throw error;
							else
								updateMultiple(index + 1, max, callback);
						});
					}
					else
						callback();
				}
			});
		});
	});
});