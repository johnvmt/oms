var path = require('path');
var exportFiles = ('../exports.json');

var exportObjects = {};
exportFiles.forEach(function(exportFile) {
	exportObjects[exportFile] = require('./' + exportFile);
});

module.exports = exportObjects;