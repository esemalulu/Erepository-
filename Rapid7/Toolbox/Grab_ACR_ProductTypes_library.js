/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Sep 2012     mburstein
 *
 */

/**
 * This function is used to build a multi dimensional array for easy access to product specific values.
 * 
 * @param acrId = internal ID of Product Type
 * @param acrFieldId = internal ID of ACR record field accessing specific value
 * @returns {Array} arrProductTypes[acrId][acrFiedlId]
 * 
 */

function grabAllProductTypes(byRecordId){

	var arrProductTypes = new Array();
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7acrrecordid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7acrexpirationfieldid');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7acrlicensefieldid');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7acrsalesrepfieldid');
	arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7acrsalesorderfieldid');
	arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7acritemoptionfieldid');
	arrSearchColumns[6] = new nlobjSearchColumn('custrecordr7acritemoptionfieldname');
	arrSearchColumns[7] = new nlobjSearchColumn('custrecordr7acrcustomerfieldid');
	arrSearchColumns[8] = new nlobjSearchColumn('custrecordr7acrcontactfieldid');
	arrSearchColumns[9] = new nlobjSearchColumn('custrecordr7acractivationid');
	arrSearchColumns[10] = new nlobjSearchColumn('custrecordr7acrtemplatefieldid');
	arrSearchColumns[11] = new nlobjSearchColumn('custrecordr7acrexpirationcomponentid');
	arrSearchColumns[12] = new nlobjSearchColumn('custrecordr7acrfieldidstoempty');
	arrSearchColumns[13] = new nlobjSearchColumn('custrecordr7acrserialnumberid'); //Product Serial Number
	arrSearchColumns[14] = new nlobjSearchColumn('custrecordr7acrresetrecid');
	arrSearchColumns[15] = new nlobjSearchColumn('custrecordr7acrresetlicenseid');
	arrSearchColumns[16] = new nlobjSearchColumn('custrecordr7acrresetactivation');
	arrSearchColumns[17] = new nlobjSearchColumn('custrecordr7acrresetcomments');
	arrSearchColumns[18] = new nlobjSearchColumn('custrecordr7acritemfamily_fieldid');
	// License Monitoring and IPR
	arrSearchColumns[19] = new nlobjSearchColumn('custrecordr7acrlicmarketingtemplaterecid');
	arrSearchColumns[20] = new nlobjSearchColumn('custrecordr7acrproductaccesscodeid');
	arrSearchColumns[21] = new nlobjSearchColumn('custrecordr7acriprreturnpath');
	// Display name
	arrSearchColumns[22] = new nlobjSearchColumn('name');
	arrSearchColumns[23] = new nlobjSearchColumn('custrecordr7acriprscriptid');
	arrSearchColumns[24] = new nlobjSearchColumn('custrecordr7acrdeployid');
	arrSearchColumns[25] = new nlobjSearchColumn('custrecordr7acrlicenseserialnumber'); //License Serial Number
	arrSearchColumns[26] = new nlobjSearchColumn('custrecordr7acrexpirationdateindaysid'); //Expiration in Days
	arrSearchColumns[27] = new nlobjSearchColumn('custrecordr7acrmarklictemplaterecid'); //Marketing License Template Record Id
	//feature management stuff
	arrSearchColumns[28] = new nlobjSearchColumn('custrecordr7acrfeaturemngcreatedfieldid'); 
	arrSearchColumns[29] = new nlobjSearchColumn('custrecordr7acrfeaturemngreclinkfieldid'); 
	//other
	arrSearchColumns[30] = new nlobjSearchColumn('custrecordr7acropportunityfieldid');
    arrSearchColumns[31] = new nlobjSearchColumn('custrecordr7acrcreatedfromlinehash'); 
    arrSearchColumns[32] = new nlobjSearchColumn('custrecordr7acrsync_up_ipims');
    arrSearchColumns[33] = new nlobjSearchColumn('custrecordr7acrpackagelicensefieldid');
	arrSearchColumns[34] = new nlobjSearchColumn('custrecordr7fulfilaspackageidentifier');

	var arrSearchResults = nlapiSearchRecord('customrecordr7acrproducttype', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var prodFields = new Object();
		
		var searchResult = arrSearchResults[i];
		var prodTypeId = searchResult.getId();
		var recordId = searchResult.getValue(arrSearchColumns[0]);
		prodFields['productid'] = prodTypeId;
		prodFields['recordid'] = recordId;
		prodFields['expiration'] = searchResult.getValue(arrSearchColumns[1]);
		prodFields['licenseid'] = searchResult.getValue(arrSearchColumns[2]);
		prodFields['salesrep'] = searchResult.getValue(arrSearchColumns[3]);
		prodFields['salesorder'] = searchResult.getValue(arrSearchColumns[4]);
		prodFields['optionid'] = searchResult.getValue(arrSearchColumns[5]);
		prodFields['optionname'] = searchResult.getValue(arrSearchColumns[6]);
		prodFields['customer'] = searchResult.getValue(arrSearchColumns[7]);
		prodFields['contact'] = searchResult.getValue(arrSearchColumns[8]);
		prodFields['activationid'] = searchResult.getValue(arrSearchColumns[9]);
		prodFields['templateid'] = searchResult.getValue(arrSearchColumns[10]);
		prodFields['componentid'] = searchResult.getValue(arrSearchColumns[11]);
		prodFields['emptyfields'] = searchResult.getValue(arrSearchColumns[12]);
		prodFields['serialid'] = searchResult.getValue(arrSearchColumns[13]);
		prodFields['resetrecid'] = searchResult.getValue(arrSearchColumns[14]);
		prodFields['resetlicenseid'] = searchResult.getValue(arrSearchColumns[15]);
		prodFields['resetactivation'] = searchResult.getValue(arrSearchColumns[16]);
		prodFields['resetcomments'] = searchResult.getValue(arrSearchColumns[17]);
		prodFields['itemfamily'] = searchResult.getValue(arrSearchColumns[18]);
		prodFields['marktemprecid'] = searchResult.getValue(arrSearchColumns[19]);
		prodFields['axscoderecid'] = searchResult.getValue(arrSearchColumns[20]);
		prodFields['returnpath'] = searchResult.getValue(arrSearchColumns[21]);
		prodFields['name'] = searchResult.getValue(arrSearchColumns[22]);
		prodFields['iprscriptid'] = searchResult.getValue(arrSearchColumns[23]);
		prodFields['iprdeployid'] = searchResult.getValue(arrSearchColumns[24]);
		prodFields['licserialid'] = searchResult.getValue(arrSearchColumns[25]);
		prodFields['expindaysid'] = searchResult.getValue(arrSearchColumns[26]);
		prodFields['marklictemprecid'] = searchResult.getValue(arrSearchColumns[27]);
		prodFields['fmrcreatedid'] = searchResult.getValue(arrSearchColumns[28]);
		prodFields['fmrreclinkid'] = searchResult.getValue(arrSearchColumns[29]);
		prodFields['opportunity'] = searchResult.getValue(arrSearchColumns[30]);
        prodFields['createdFromLineHash'] = searchResult.getValue(arrSearchColumns[31]);
        prodFields['syncUpWithIpims'] = searchResult.getValue(arrSearchColumns[32]);
        prodFields['packageLicense'] = searchResult.getValue(arrSearchColumns[33]);
		prodFields['fulfilAsPackageIdentifier'] = searchResult.getValue(arrSearchColumns[34]);
		if (byRecordId) {
			arrProductTypes[recordId] = prodFields;
		}
		else {
			arrProductTypes[prodTypeId] = prodFields;
		}
	}
	return arrProductTypes;
}
