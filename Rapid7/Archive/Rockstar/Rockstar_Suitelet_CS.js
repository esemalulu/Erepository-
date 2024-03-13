/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Nov 2013     bach2
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

//MB: 11/22/13 - Added some logic for thanksgiving pick
//MB: 3/8/14 - Updated pick record lookup to search for specific record id 23 instead of department is none
function giveThanksgivingPick(){
	var objThanksgivingPick = getThanksgivingPick();
	nlapiSetFieldValue('custpage_pickcolor', objThanksgivingPick.pickColor);
	var imgSource = '<p style="text-align:center;">Thanksgiving Pick!<br><img src="' + objThanksgivingPick.imageURL + '"></p>';
	nlapiSetFieldValue('custpage_pickimage', imgSource);
	nlapiSetFieldValue('custpage_pickimageid', objThanksgivingPick.pickImage);
}

function getThanksgivingPick(){
	var objThanksgivingPick = new Object();
	// Search Thanksgiving pick record (easier to get image url as search)
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('internalid', null, 'is', 23);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('custrecordcustrecordr7guitarpickspickcol');
	columns[1] = new nlobjSearchColumn('custrecordr7guitarpickspickimage');
	
	try{
		var arrSearchPicks = nlapiSearchRecord('customrecordr7guitarpicks', null, filters, columns);
		if (arrSearchPicks != null) {
			var searchResult = arrSearchPicks[0];
			objThanksgivingPick.pickColor = searchResult.getValue(columns[0]);
			objThanksgivingPick.pickImage = searchResult.getValue(columns[1]);
			objThanksgivingPick.imageURL = searchResult.getText(columns[1]);	
		}
		else{
			objThanksgivingPick.pickColor = '';
			objThanksgivingPick.pickImage = '';
			objThanksgivingPick.imageURL = '';	
		}
	}
	catch(e){
		nlapiSendEmail(340932,340932,'Rockstar Error',e.name + ' : ' + e.message + '\nUser: ' + nlapiGetUser());
	}
	return objThanksgivingPick;
}

function getDepartmentPick(){
	var objDepartmentPick = new Object();
	// Get name and department of current user
	var context = nlapiGetContext();
	objDepartmentPick.userId = context.getUser();
	objDepartmentPick.departmentId = context.getDepartment();
	
	// MB: 3/4/2014 - Update to department record lookup for pick color - new field on department record: custrecordr7departmentguitarpickcolor
	var departmentPickId = nlapiLookupField('department',objDepartmentPick.departmentId,'custrecordr7departmentguitarpickcolor');
	if (departmentPickId != null) {
		var recPick = nlapiLoadRecord('customrecordr7guitarpicks', departmentPickId);
		var pickImageId = recPick.getFieldValue('custrecordr7guitarpickspickimage');
		objDepartmentPick.pickColor = recPick.getFieldValue('custrecordcustrecordr7guitarpickspickcol');
		objDepartmentPick.pickImage = pickImageId;
		if (pickImageId != null) {		
			var filePickImage = nlapiLoadFile(pickImageId);
			objDepartmentPick.imageURL = filePickImage.getURL();
		}
		else{
			objDepartmentPick.imageURL = '';
		}	
	}
	// If the department doesn't have a pick record then blank values;
	else {
		objDepartmentPick.pickColor = '';
		objDepartmentPick.pickImage = '';
		objDepartmentPick.imageURL = '';
	}
	
	return objDepartmentPick;
}

