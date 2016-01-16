var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Object Insertion', function(){
	describe('Regular object', function(){
		it('should return an _id when object is inserted', function(done) {
			oms.objectInsert({key: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.objectFind({_id: id}, function(error, results) {
						if(error)
							throw error;
						if(!results || results.length != 1)
							throw new Error("inserted object '" + id + "' not found in DB");
						done();
					});
				}
			});
		});
	});
});