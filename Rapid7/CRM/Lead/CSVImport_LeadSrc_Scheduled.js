/* Since the PLS OLS Script does not trigger on CSV Imports, this script loads the Leads created 
 * and resubmits them to trigger the PLS OLS and other afterSubmit logic on the lead records.
 * @author - Suvarshi Bhadra  
 */
function processCSVLeadImports(){
	
	var searchResults = nlapiSearchRecord('customer',2489);
	
	var internalId='';
	var ctx = nlapiGetContext();
	
	if(searchResults!=null){
		nlapiLogExecution('DEBUG', 'Search Results Length', searchResults.length);		
	}
	
	for(var i=0;searchResults!=null && i<searchResults.length;i++){
		if(ctx.getRemainingUsage() <= 50){
			nlapiScheduleScript(ctx.getScriptId(),ctx.getDeploymentId());
			break;
		}
		internalId = searchResults[i].getValue('internalid');
		var custRecord = nlapiLoadRecord('customer', internalId);
		var coName = custRecord.getFieldValue('companyname');
		nlapiSubmitRecord(custRecord);
		nlapiLogExecution('DEBUG', 'Loaded And Submitted Company Name',coName);
	}
}