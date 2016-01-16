var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Object Deletion', function(){
	describe('Regular object', function(){
		it('should insert an object, then delete it', function(done) {
			oms.objectInsert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.objectDelete({_id: id}, function(error, success) {
						if(error)
							throw error;

						done();
					});
				}
			});
		});
	});
});