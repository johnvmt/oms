var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Doc Versions', function(){
	describe('Create, update and fetch version', function(){
		it('should create multiple versions of a doc and try fetch a specific version', function(done) {
			oms.docInsert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				var id = object._id;

				updateMultiple(2, 10, function() {
					oms.docFindVersion({_id: id}, 9, function(error, objectExtended) {
						if(error)
							console.log(error, objectExtended);
						done();
					});
				});

				function updateMultiple(index, max, callback) {
					if(index < max) {
						oms.docUpdate({object: "someval" + index}, id, function(error, success) {
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