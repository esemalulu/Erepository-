/**
 * Author: joe.son@audaxium.com
 * Date: 5/25/2013
 * Record: Select transaction records on edit mode
 *  - Opp
 *  - Quote 
 *  - So
 *  - 
 * Desc:
 * Places opportunity configurator button when in Edit mode to allow users to access Opportunity Configurator Suitelet
 * as popup window
 * 
 */

function trxDisplayDiscBtnBeforeLoad(type, form, request){

	if ((type == 'edit' || type == 'create') && nlapiGetContext().getExecutionContext()=='userinterface') {
		
		//build URL Parameters
		var recType = nlapiGetRecordType();
		var recId = nlapiGetRecordId();
		var interfaceType = type;
		
		//add hidden text area to store item JSON 
		var itemJsonFld = form.addField('custpage_hiddenitems','longtext','');
		itemJsonFld.setDisplayType('hidden');
		
		form.addButton('custpage_applydiscbtn','Apply Discounts to Eligible Items','openDiscountProcessor()');
				
	}
	
}
