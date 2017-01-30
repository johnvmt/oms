var path = require('path');
var exportFiles = require(path.join(__dirname, '..', 'exports.json'));

var exportObjects = {};
exportFiles.forEach(function(exportFile) {
	exportObjects[exportFile] = require('./' + exportFile);
});

module.exports = exportObjects;