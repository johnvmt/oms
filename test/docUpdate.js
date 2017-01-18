var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Doc Update', function(){
	describe('Create and update', function(){
		it('should create an doc, update it and check the update is applied', function(done) {
			oms.docInsert({object: "someval1" }, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof objectExtended != "object" || typeof objectExtended._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = objectExtended._id;

				oms.docUpdate({object: "someval22"}, id, function(error, docDiffs) {
					if(error)
						throw error;
					else {
						oms.docFind(id, function(error, results) {
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