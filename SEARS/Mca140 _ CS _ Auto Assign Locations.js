/**
 * 
 * @NApiVersion 2.x
 * @NScriptType clientscript
 */
define([ 'N/record', 'N/url', 'N/search',
		'N/format' ],

function(record, url, search, nformat) {
	var EntryPoint = {};

	EntryPoint.pageInit = function(){
		//om.locationassignment.process();
		document.getElementById("autoassignlocationsitem").click();
		log.debug('beforeSubmit::Location Auto Assignment');
	}

	return EntryPoint;
});