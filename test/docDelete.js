var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Doc Deletion', function(){
	describe('Regular object', function(){
		it('should insert a doc, then delete it', function(done) {
			oms.docInsert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.docDelete({_id: id}, function(error, success) {
						if(error)
							throw error;

						done();
					});
				}
			});
		});
	});
});