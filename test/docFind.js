var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

function uniqueId() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
}

describe('OMS Doc Find', function(){
	describe('Database doc', function(){
		it('should insert a doc, then return it', function(done) {
			var key = uniqueId();

			oms.docInsert({key: key }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.docFind({key: key}, function(error, results) {
						if(error)
							throw error;
						if(!results || results.length != 1)
							throw new Error("inserted object '" + key + "' not found in DB");
						done();
					});
				}
			});
		});
	});
});