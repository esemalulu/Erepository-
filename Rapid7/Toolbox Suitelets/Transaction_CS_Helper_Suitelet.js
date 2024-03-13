/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Sep 2015     efagone
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function r7_transaction_cs_helper_suitelet(request, response){

	try {
	
		var cmd = request.getParameter('custparam_cmd');
		
		var objResponse = {};
		
		switch (cmd) {
			case 'getSalesRepLLCLocation':
				objResponse = getSalesRepLLCLocation(request.getParameter('custparam_salesrepid'));
				break;
		}
		
		nlapiLogExecution('AUDIT', 'Response', JSON.stringify(objResponse));
		response.setContentType('JSON');
		response.write(JSON.stringify(objResponse));
		return;
		
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR zc_sku_lock_cs_helper_suitelet', e);
		response.write(JSON.stringify({
			success: false,
			error: e
		}));
		return
	}
	
}

function getSalesRepLLCLocation(salesRepId){

	if (salesRepId) {
		return {
			success: true,
			salesRepId: salesRepId,
			llcLocation: nlapiLookupField('employee', salesRepId, 'location.custrecordllc_location')
		};
	}
	return {};
}