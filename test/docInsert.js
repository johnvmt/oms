var assert = require('assert');
var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

describe('OMS Doc Insertion', function(){
	describe('Regular doc', function(){
		it('should return an _id when doc is inserted', function(done) {



			var mongoCollection = require('mongolocal')();
			var oms = require(".")(mongoCollection);

			oms.on('pre-insert', function() {
				console.log("PRE");
				console.log(arguments);
				arguments[1].key = "val2";
				arguments[arguments.length - 1](); // next() function
			});

			oms.on('insert', function() {
				console.log("INS");
				console.log(arguments);
				arguments[arguments.length - 1](); // next() function
			});


			oms.insert({key: "val"}, function (error, object) {
				console.log("EO", error, object);
			});




			/*
			oms.docInsert({key: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.docFind({_id: id}, function(error, results) {
						if(error)
							throw error;
						if(!results || results.length != 1)
							throw new Error("inserted object '" + id + "' not found in DB");
						done();
					});
				}
			});

			*/
		});
	});
});