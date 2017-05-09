var exportFiles = [
	"OmsIntercept",
	"OmsLayers",
	"OmsMongoConnector",
	"OmsOplog",
	"OmsOplogSubscriptions",
	"OmsSubscriptions",
	"OmsUtils",
	"OmsWeb"
];

var exportObjects = {};
exportFiles.forEach(function(exportFile) {
	exportObjects[exportFile] = require('./' + exportFile);
});

module.exports = exportObjects;