/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Jul 2013     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function pageInit(type){

	var arrElementsToRemove = new Array();
	arrElementsToRemove[arrElementsToRemove.length] = 'tbl_newrec625';
	arrElementsToRemove[arrElementsToRemove.length] = 'tbl_resetter';
	arrElementsToRemove[arrElementsToRemove.length] = 'tbl_secondaryresetter';
	arrElementsToRemove[arrElementsToRemove.length] = 'spn_ACTIONMENU_d1';
	arrElementsToRemove[arrElementsToRemove.length] = 'spn_secondaryACTIONMENU_d1';
	arrElementsToRemove[arrElementsToRemove.length] = 'tbl_customize';
	arrElementsToRemove[arrElementsToRemove.length] = 'tbl_secondarycustomize';
	
	for (var i = 0; arrElementsToRemove != null && i < arrElementsToRemove.length; i++) {
		var ele = document.getElementById(arrElementsToRemove[i]);
		if (ele != null) 
			ele.style.display = 'none';
	}
	
	nlapiDisableLineItemField('recmachcustrecordr7productdata_masterrec', 'custrecordr7competproddataopportunity', true);
	
}

function lineInit(type){
	
	if (type == 'recmachcustrecordr7productdata_masterrec') {
		var currentLineOpp = nlapiGetCurrentLineItemValue(type, 'custrecordr7competproddataopportunity');
		if (currentLineOpp == null || currentLineOpp == '') {
			var oppId = nlapiGetFieldValue('custrecordr7proddatamaster_opp');
			nlapiSetCurrentLineItemValue(type, 'custrecordr7competproddataopportunity', oppId, false);
		}
		
		
	}
}

function r7SaveRec(){
	
	var oppId = nlapiGetFieldValue('custrecordr7proddatamaster_opp');
	var lineCount = nlapiGetLineItemCount('recmachcustrecordr7productdata_masterrec');
	for (var i = 1; i <= lineCount; i++){
		var currentLineOpp = nlapiGetLineItemValue('recmachcustrecordr7productdata_masterrec', 'custrecordr7competproddataopportunity', i);
		if (currentLineOpp == null || currentLineOpp == '') {
			nlapiSelectLineItem('recmachcustrecordr7productdata_masterrec', i);
			nlapiSetCurrentLineItemValue(type, 'custrecordr7competproddataopportunity', oppId, false);
			nlapiCommitLineItem('recmachcustrecordr7productdata_masterrec');
		}
	}
	return true;	
}

function validateLine(type){
	
	if (type == 'recmachcustrecordr7productdata_masterrec') {
		var currentLineOpp = nlapiGetCurrentLineItemValue(type, 'custrecordr7competproddataopportunity');
		if (currentLineOpp == null || currentLineOpp == '') {
			var oppId = nlapiGetFieldValue('custrecordr7proddatamaster_opp');
			nlapiSetCurrentLineItemValue(type, 'custrecordr7competproddataopportunity', oppId, false);
		}		
	}
	return true;
}

