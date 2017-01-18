var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Doc Date Versions', function(){
	describe('Create, update and fetch version as it existed at a certain date', function(){
		it('should create multiple versions of a doc and try fetch a version as it existed at a given date', function(done) {
			oms.docInsert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				var id = object._id;

				var dateNow = new Date();
				var baseDate = new Date();
				var versionEnd = 10;
				var msOffset = 1000 * 60 * 60;
				baseDate.setMilliseconds(dateNow.getMilliseconds() - (msOffset * versionEnd));

				updateMultiple(2, versionEnd, function() {
					baseDate.setMilliseconds(dateNow.getMilliseconds() - (msOffset * (versionEnd / 2) + 5000));
					oms.docFindDateVersion(id, baseDate, function(error, objectExtended) {
						if(error)
							console.log(error, objectExtended);
						delete oms.omsCore._date;
						done();
					});
				});


				function updateMultiple(index, max, callback) {
					if(index < max) {
						baseDate.setMilliseconds(baseDate.getMilliseconds() + msOffset);
						oms.omsCore._date = baseDate;
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