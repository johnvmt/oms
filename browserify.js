// Runs from npm install
var fs = require('fs');
var browserify = require('browserify');

// Package sub-modules
var Oms = require('./src/Oms');
for(var inFile in Oms) {
	packageFile(inFile);
}

packageFile('Oms');

function packageFile(inFile) {
	var inFilePath = './src/' + inFile;

	var packageName = inFile.replace(/[^a-z0-9]+/gi, '').toLowerCase(); // remove non-alphanumeric characters, convert to lowercase
	var outFile = packageName + '.min.js';
	var standalone = packageName;
	var mapFile = standalone + '.js.map';

	var b = browserify({standalone: standalone, debug: true});
	b.add(inFilePath);

	b.plugin('minifyify', {map: mapFile});

	b.bundle(function (err, src, map) {
		fs.writeFileSync(mapFile, map);
	}).pipe(fs.createWriteStream(outFile));
}