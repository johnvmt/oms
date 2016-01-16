var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Object Versions', function(){
	describe('Create, update and fetch version', function(){
		it('should create multiple versions of an object and try fetch a specific version', function(done) {
			oms.objectInsert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				var id = object._id;

				updateMultiple(2, 10, function() {
					oms.objectFindVersion({_id: id}, 9, function(error, objectExtended) {
						console.log(error, objectExtended);
						done();
					});
				});

				function updateMultiple(index, max, callback) {
					if(index < max) {
						oms.objectUpdate(id, {object: "someval" + index}, function(error, success) {
							if(error) {
								console.log("ERR");
								throw error;
							}
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