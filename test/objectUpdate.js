var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Object Update', function(){
	describe('Create and update', function(){
		it('should create an object, update it and check the update is applied', function(done) {
			oms.objectInsert({object: "someval1" }, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof objectExtended != "object" || typeof objectExtended._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = objectExtended._id;

				oms.objectUpdate(id, {object: "someval22"}, function(error, success) {
					if(error)
						throw error;
					else {
						oms.objectFind(id, function(error, results) {
							if(error)
								throw error;
							if(!results || results.length != 1)
								throw new Error("inserted object '" + id + "' not found in DB");
							else if(results[0].object != "someval22")
								throw new Error("Object not updated");
							done();
						});
					}
				});
			});
		});
	});
});