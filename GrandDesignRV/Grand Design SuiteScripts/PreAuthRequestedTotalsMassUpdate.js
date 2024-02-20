/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Nov 2013     ibrahima
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function PreAuthRequestedTotalsMassUpdate(recType, recId) 
{
	/** @record customrecordrvspreauthorization */
	var preAuth = nlapiLoadRecord(recType, recId);	
	var lineCount = preAuth.getLineItemCount('recmachcustrecordpreauthopline_preauth');
	var laborRate = ConvertNSFieldToFloat(preAuth.getFieldValue('custrecordpreauth_laborrate'));
	
	if(laborRate == 0) //If no labor rate on pre-auth, get it from dealer
	{
		var dealerId = ConvertNSFieldToString(preAuth.getFieldValue('custrecordpreauth_customer'));		
		if(dealerId != '')
			laborRate = ConvertNSFieldToFloat(nlapiLookupField('customer', dealerId, 'custentityrvsapprovedlaborrate', false));
	}
	
	if(lineCount > 0)
	{
		var preAuthRequestedShipping = ConvertNSFieldToFloat(preAuth.getFieldValue('custrecordpreauth_shippingtotal'));
		var preAuthRequestedSublet  = 0;
		var preAuthRequestedLabor = 0;
		var preAuthRequestedTotal = 0;
		
		for (var i=1; i <= lineCount; i++)
		{
			var preAuthApprovedSublet = ConvertNSFieldToFloat(preAuth.getLineItemValue('recmachcustrecordpreauthopline_preauth', 'custrecordpreauthopline_sublet', i));	
			
			//Set requested sublet same as approved sublet.
			preAuth.selectLineItem('recmachcustrecordpreauthopline_preauth', i);
			preAuth.setCurrentLineItemValue('recmachcustrecordpreauthopline_preauth', 'custrecordpreauthopline_requestedsublet', preAuthApprovedSublet.toFixed(2));
			preAuthRequestedSublet += preAuthApprovedSublet;
					
			var requestedAmount = ConvertNSFieldToFloat(preAuth.getLineItemValue('recmachcustrecordpreauthopline_preauth', 'custrecordpreauthopline_requestedamount', i));
			var timeRequested = ConvertNSFieldToFloat(preAuth.getLineItemValue('recmachcustrecordpreauthopline_preauth', 'custrecordpreauthopline_timerequested', i));
			//If there is no requested amount, but timeRequested and laborRate is specified then set requested amount
			if(requestedAmount == 0 && timeRequested != 0 && laborRate != 0)
			{
				requestedAmount = (timeRequested * laborRate);
				preAuth.setCurrentLineItemValue('recmachcustrecordpreauthopline_preauth', 'custrecordpreauthopline_requestedamount', requestedAmount.toFixed(2));
			}
			else if(requestedAmount == 0)
			{
				preAuth.setCurrentLineItemValue('recmachcustrecordpreauthopline_preauth', 'custrecordpreauthopline_requestedamount', '0.00');
			}
			preAuthRequestedLabor += requestedAmount;
			
			preAuth.commitLineItem('recmachcustrecordpreauthopline_preauth');	

		}
		
		preAuthRequestedTotal = preAuthRequestedLabor + preAuthRequestedSublet + preAuthRequestedShipping;
		
		preAuth.setFieldValue('custrecordpreauth_requestedlabortotal', preAuthRequestedLabor.toFixed(2));
		preAuth.setFieldValue('custrecordpreauth_requestedsublettotal', preAuthRequestedSublet.toFixed(2));
		preAuth.setFieldValue('custrecordpreauth_requestedshippingtotal', preAuthRequestedShipping.toFixed(2));
		preAuth.setFieldValue('custrecordpreauth_requestedtotal', preAuthRequestedTotal.toFixed(2));
		
		nlapiSubmitRecord(preAuth, false, true);	
	}
}
