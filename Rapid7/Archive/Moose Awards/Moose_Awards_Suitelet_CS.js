/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Feb 2013     mburstein
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */

function pageInit(){
	// On page load, search for all moose type values and store in global object mooseInfo
	this.mooseInfo = getMooseTypeInfo();
}

function fieldChanged(type, name, linenum){
	/*
	 * When user selects Moose Award Type change the default value for fields:
	 * 	Core Value - custrecordr7mooseawardcorevalue
	 * 	Description - custrecordr7mooseawarddescription
	 * 	Image - custrecordr7mooseawardtypesimage
	 */
	
	/*
	 * Core Values
	 * 	1 - Continuous Learning
	 * 	2 - Individual Excellence
	 * 	3 - Teamwork
	 * 	4 - Disciplined Risk Taking
	 * 	5 - Meaningful Customer Partnerships
	 */
	
	if (name == 'custpage_mooseawardsmoose') {
		
		var mooseTypeId = nlapiGetFieldValue('custpage_mooseawardsmoose');
		if (mooseTypeId != null && mooseTypeId != '') {
			//var mooseInfo = getMooseTypeInfo(mooseTypeId);
			if (mooseInfo != null && mooseInfo != '') {
				
				var imageSource = '<div id="moose_img" style="width:300;"><center><img height="200" src="' + mooseInfo[mooseTypeId]['imageurl'] + '"></center></div>';
				// Format Description and Core Value
				var descAndCV = '';
				descAndCV += '<div style="width:400px; padding:5px; margin-top:0px;" id="description_CV"><h3><span style="font-weight:bold; font-family:trebuchet ms; font-size:22px; color:#FF0033;">' + mooseInfo[mooseTypeId]['corevalue'] + '</span></h3>';
				descAndCV += '<hr color="#0197b8"><p style="text-align:center; font-family:arial; font-size: 12px; color: ivory;">' + encodeHtmlEntities(mooseInfo[mooseTypeId]['description']) + '</p></div>';
				
				nlapiSetFieldValue('custpage_mooseawardsdescandcv', descAndCV);
				nlapiSetFieldValue('custpage_mooseawardsmooseimgid', mooseInfo[mooseTypeId]['imageid']);
				nlapiSetFieldValue('custpage_mooseawardsmooseimg', imageSource);
			}
		}
	}
}

function getMooseTypeInfo(){
	/*
	 * Lookup Moose Award Type Values
	 * 	Core Value - custrecordr7mooseawardcorevalue
	 * 	Description - custrecordr7mooseawarddescription
	 * 	Image - custrecordr7mooseawardtypesimage
	 */
		
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custrecordr7mooseawardcorevalue');
	columns[2] = new nlobjSearchColumn('custrecordr7mooseawarddescription');
	columns[3] = new nlobjSearchColumn('custrecordr7mooseawardtypesimage');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7mooseawardtypes', null, null, columns);
	
	// Initialize object to hold all moose values
	var objMoose = new Object;
			
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		var searchResult = arrSearchResults[i];
		
		var mooseInfo = new Object();
		var mooseTypeId = searchResult.getValue(columns[0]);
		mooseInfo['corevalue'] = searchResult.getText(columns[1]);
		mooseInfo['description'] = searchResult.getValue(columns[2]);
		mooseInfo['imageid'] = searchResult.getValue(columns[3]);
		mooseInfo['imageurl'] = searchResult.getText(columns[3]);
		
		// Build Object to hold Moose Values for each Moose type
		objMoose[mooseTypeId] = mooseInfo;
	}
	return objMoose;
}
