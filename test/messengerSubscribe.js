var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Messenger Subscribe', function(){
	describe('Regular object', function(){
		it('should subscribe to a given channel', function(done) {
			var channel = "test";
			oms.messenger.subscribe(channel,
				function(error, obj) {
					console.log("RECEIVED MESSAGE ON CHANNEL", error, obj);
				},
				function(error, success) {
					if(error)
						throw error;
					else {
						// subscribed successfully
						done();
					}
				}
			);
		});
	});
});