/*
 * @author efagone
 */

function createRenewalOpportunityForSalesOrder(request, response){

	if (request.getMethod() == 'POST' || true) {
	
		//grab all parameters supplied
		
		var objRADetails = new raDetailsObject();
		objRADetails.salesorder = request.getParameter('custpage_salesorder');
		objRADetails.opportunity = request.getParameter('custpage_opportunity');
		objRADetails.cotermwith_opp = request.getParameter('custpage_cotermwithopp');
		objRADetails.coterm_date = request.getParameter('custpage_cotermwdate');
		objRADetails.str_linestosplit = request.getParameter('custpage_splitlines');
		objRADetails.str_linestokeep = request.getParameter('custpage_keeplines');
		objRADetails.workflow = request.getParameter('custpage_workflow');
		objRADetails.uplift = request.getParameter('custpage_upliftpercent');
        objRADetails.defaultCSM = nlapiGetContext().getSetting('SCRIPT', 'custscriptr7_default_csm_s');

		try {
			
			var objResponse = run_renewal_automation(objRADetails);
			if (!objResponse.success) {
				try {
					if (objRADetails.salesorder != null && objRADetails.salesorder != ''){
						nlapiSubmitField('salesorder', objRADetails.salesorder, 'custbodyr7_renewalautomation_error', objResponse.error);
					}
				} 
				catch (e2) {
				
				}
				response.writeLine('ERROR: ' + objResponse.error);
				return;
			}
			response.writeLine(arrCreatedOppIds.join(','));
			return;
			
		} 
		catch (e) {
			try {
				if (objRADetails.salesorder != null && objRADetails.salesorder != ''){
					nlapiSubmitField('salesorder', objRADetails.salesorder, 'custbodyr7_renewalautomation_error', e);
				}
			}
			catch (e2) {
			
			}
			response.writeLine('ERROR: UNEXPECTED_ERROR_CUS\n\n' + e);
			return;
		}
		
	}
	
	response.writeLine('ERROR: Something went wrong. Please contact an Administrator with details below:\n\nBad Method');
	return;
}