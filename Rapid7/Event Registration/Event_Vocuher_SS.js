/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Jan 2013     mburstein
 *
 */

function beforeSubmit(type){
	
	if (type != 'delete') {
		var recType = nlapiGetRecordType();
		if (recType == 'customrecordr7eventvoucherpool') {
			
			var attId = nlapiGetFieldValue('custrecordr7eventvoucherpooleventattende');
				nlapiLogExecution('DEBUG','attId',attId);
			if(attId != null && attId != '' && attId != 'undefined'){

				nlapiSetFieldValue('custrecordr7eventvoucherpoolinactive','T');
	
			}
			else {

				nlapiSetFieldValue('custrecordr7eventvoucherpoolinactive','F');
			}
			//var submitId = nlapiSubmitRecord(recVoucher, false);
		}
	}
}

