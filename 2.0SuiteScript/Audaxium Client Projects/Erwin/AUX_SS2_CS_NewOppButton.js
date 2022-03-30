/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
 
/**
* SCRIPT EXPLANATION:
*  - The purpose of this script is to show a button and navigate to a New Opportunity page upon click
*/ 
define(['N/url',
		'N/log'],

function(url, log){
	
	function newOppBtnClick(stLeadId, stSalesRepId) {

		//New opportunity url
		var stUrl = url.resolveRecord({
			recordType: 'opportunity',
			recordId: null,
			isEditMode: true
		});
		stUrl += '?';
		
		if(stLeadId && stLeadId != 'null'){
			stUrl += '&entity=' + stLeadId;
		} 
		if(stSalesRepId && stSalesRepId != 'null'){
			stUrl += '&salesrep=' + stSalesRepId;
		} 
		
		//alert(stUrl);
				
		window.location = stUrl;
	}
	
	function pageInit(context) {
		//just a holder function to allow upload of script file to file cabinet
	}

    return {
		
		pageInit: pageInit,
		
		newOppBtnClick : newOppBtnClick
    };

});
