/*
 ***********************************************************************
 * 
 * The following javascript code is created by IT-Ration Consulting Inc.,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intented for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": IT-Ration Consulting shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 * 
 * Company:	IT-Ration Consulting inc., www.it-ration.com
 * Author: 	alexandre.girard@it-ration.com
 * File:	AX_CUE_BlankLeadSource.js
 * Date:	October 13th, 2009 
 * 
 ***********************************************************************/
//GLOBAL VARIABLES
var LEAD_SOURCE ='leadsource';
var CUSTOM_FORM = 'customform';

/**
 * BETA Test found that onPageInit function name doesn't fire for Quote because
 * AX_CUE_ProductLease.js Client level script deployed at Quote level has SAME function name.
 * This Causes Form level function with same name to be ignored. 
 * To Avoid confusion, Cloned version of onPageInit() function is created as onPageInitFromQuoteForm().
 * This new function will be referenced ONLY by Javelin Renewal Invoice-Quote FORM. 
 */
function onPageInitFromQuoteForm(){
	if(isCreate()){
		nlapiSetFieldValue(LEAD_SOURCE,'');
	}
}

function onPageInit(){
	if(isCreate()){
		nlapiSetFieldValue(LEAD_SOURCE,'');
	}
}

function onSaveRecord() {
	if(isCreate()){
		nlapiSetFieldValue(LEAD_SOURCE,'');
	}
    return true;
}

function postSourcing(machine, name) {

	var formId = nlapiGetFieldValue(CUSTOM_FORM);
	//If Form is initially Javelin Renewal Invoice-Quote (102) set lead source to 157326
	if(isCreate() && formId == '102'){
		nlapiSetFieldValue(LEAD_SOURCE,'157326');
	}
	if(name=='entity' && isCreate() && formId != '102'){
		nlapiSetFieldValue(LEAD_SOURCE,'');
	}
	
}

function isCreate(){
	recordId = nlapiGetRecordId();
	return (recordId=='' || recordId==null || recordId==-1)
}

