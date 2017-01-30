// Runs from npm install


var path = require('path');
var fs = require('fs');
var browserify = require('browserify');

var inFiles = require(path.join(__dirname, 'exports.json'));

inFiles.forEach(function(inFile) {
	var inFilePath = path.join(__dirname, 'src', inFile);

	var packageName = inFile.replace(/[^a-z0-9]+/gi, '').toLowerCase(); // remove non-alphanumeric characters, convert to lowercase
	var outFile = packageName + '.min.js';
	var standalone = packageName;
	var mapFile = standalone + '.js.map';

	var b = browserify({standalone: standalone, debug: true});
	b.add(inFilePath);

	b.plugin('minifyify', {map: mapFile});

	b.bundle(function (err, src, map) {
		fs.writeFileSync(mapFile, map);
		console.log("Out file: ", getFilesizeInBytes(outFile), "bytes");
	}).pipe(fs.createWriteStream(outFile));
});

function getFilesizeInBytes(filename) {
	var stats = fs.statSync(filename);
	var fileSizeInBytes = stats["size"];
	return fileSizeInBytes
}