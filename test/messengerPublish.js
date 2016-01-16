var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Messenger Create Channel', function(){
	describe('Regular object', function(){
		it('should create a channel', function(done) {
			var channel = "test";
			oms.messenger.publish(channel, {key: new Date()}, function(error, id) {
				if(error)
					throw error;
				else
					done();
			});
		});
	});
});