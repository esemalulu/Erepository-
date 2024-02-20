// Mass Update Scripts for The Claim Record

function SetOpLinePartLineLinkAndTotalApprovedAmt(rec_type, rec_id)
{
	var claimRecord = nlapiLoadRecord(rec_type, rec_id);
	var opLineSubtype = 'recmachcustrecordclaimoperationline_claim';
	var opLineCount = claimRecord.getLineItemCount(opLineSubtype);	
	
	//******THE FOLLOWING CODE ARE FOR RECALCULATION OF REQUESTED TOTALS******
	var partLineSubtype = 'recmachcustrecordclaimpartline_claim';
	var partLineCount = claimRecord.getLineItemCount(partLineSubtype);
	var requestedLabor = 0;
	var requestedSublet = 0;
	var requestedShipping = parseFloat(claimRecord.getFieldValue('custrecordclaim_requestedshippingtotal'));
	if(isNaN(requestedShipping))
	{
		requestedShipping = 0;
		claimRecord.setFieldValue('custrecordclaim_requestedshippingtotal', requestedShipping);
	}
	var requestedClaimTotal = 0;
	var requestedPartsTotal = 0;
	var approvedSubletValue = 0;
	for (var i = 1; i <= opLineCount; i++)
	{
		requestedLabor += parseFloat(claimRecord.getLineItemValue(opLineSubtype, 'custrecordclaimoperationline_reqamount', i));
		requestedSublet += parseFloat(claimRecord.getLineItemValue(opLineSubtype, 'custrecordclaimoperationline_reqsublet', i));	
		approvedSubletValue = claimRecord.getLineItemValue(opLineSubtype, 'custrecordclaimoperationline_sublet', i);
		
		if (approvedSubletValue > 0)
		{
			claimRecord.setLineItemValue(opLineSubtype, 'custrecordclaimoperationline_reqsublet', i, approvedSubletValue);
		}
		else
		{
			claimRecord.setLineItemValue(opLineSubtype, 'custrecordclaimoperationline_reqsublet', i, 0.00);
		}
		
		var status = claimRecord.getLineItemValue(opLineSubtype, 'custrecordclaimoperationline_status', i); 
		if (status == null || status == '')
		{
			claimRecord.setLineItemValue(opLineSubtype, 'custrecordclaimoperationline_status', i, '1');
		}
		
		var requestedTime = claimRecord.getLineItemValue(opLineSubtype, 'custrecordoperationline_timerequested', i); 
		if (requestedTime == null || requestedTime == '')
		{
			claimRecord.setLineItemValue(opLineSubtype, 'custrecordoperationline_timerequested', i, '0');
		}
	}
	
	for (var i = 1; i <= partLineCount; i++)
	{
		requestedPartsTotal += parseFloat(claimRecord.getLineItemValue(partLineSubtype, 'custrecordclaimpartline_amount', i));
	}
	
	if(isNaN(requestedLabor))
		requestedLabor = 0;
	claimRecord.setFieldValue('custrecordclaim_requestedlabortotal', requestedLabor);
	if(isNaN(requestedPartsTotal))
		requestedPartsTotal = 0;
	claimRecord.setFieldValue('custrecordclaim_requestedpartstotal', requestedPartsTotal);
	if(isNaN(requestedSublet))
		requestedSublet = 0;
	claimRecord.setFieldValue('custrecordclaim_requestedsublettotal', requestedSublet);
	requestedClaimTotal += requestedLabor;
	requestedClaimTotal += requestedSublet;
	requestedClaimTotal += requestedShipping;
	if(isNaN(requestedClaimTotal))
		requestedClaimTotal = 0;
	claimRecord.setFieldValue('custrecordclaim_claimrequestedtotal', requestedClaimTotal);
	//******END CODE FOR THE RECALCULATION OF REQUESTED TOTALS******
	
	nlapiSubmitRecord(claimRecord, false, true);
}

function RecalculateRequestedTotal(rec_type, rec_id)
{
	var claimRecord = nlapiLoadRecord(rec_type, rec_id);
	var opLineSubtype = 'recmachcustrecordclaimoperationline_claim';
	var opLineCount = claimRecord.getLineItemCount(opLineSubtype);	
	
	//******THE FOLLOWING CODE ARE FOR RECALCULATION OF REQUESTED TOTALS******
	var partLineSubtype = 'recmachcustrecordclaimpartline_claim';
	var partLineCount = claimRecord.getLineItemCount(partLineSubtype);
	var requestedLabor = 0;
	var requestedSublet = 0;
	var requestedShipping = parseFloat(claimRecord.getFieldValue('custrecordclaim_requestedshippingtotal'));
	if(isNaN(requestedShipping))
	{
		requestedShipping = 0;
		claimRecord.setFieldValue('custrecordclaim_requestedshippingtotal', requestedShipping);
	}
	var requestedClaimTotal = 0;
	var requestedPartsTotal = 0;
	var approvedSubletValue = 0;
	for (var i = 1; i <= opLineCount; i++)
	{
		requestedLabor += parseFloat(claimRecord.getLineItemValue(opLineSubtype, 'custrecordclaimoperationline_reqamount', i));
		requestedSublet += parseFloat(claimRecord.getLineItemValue(opLineSubtype, 'custrecordclaimoperationline_reqsublet', i));	
		approvedSubletValue = claimRecord.getLineItemValue(opLineSubtype, 'custrecordclaimoperationline_sublet', i);
		
		if (approvedSubletValue > 0 && (requestedSublet == null || requestedSublet == ''))
		{
			claimRecord.setLineItemValue(opLineSubtype, 'custrecordclaimoperationline_reqsublet', i, approvedSubletValue);
		}
		
		var status = claimRecord.getLineItemValue(opLineSubtype, 'custrecordclaimoperationline_status', i); 
		if (status == null || status == '')
		{
			claimRecord.setLineItemValue(opLineSubtype, 'custrecordclaimoperationline_status', i, '1');
		}
		
		var requestedTime = claimRecord.getLineItemValue(opLineSubtype, 'custrecordoperationline_timerequested', i); 
		if (requestedTime == null || requestedTime == '')
		{
			claimRecord.setLineItemValue(opLineSubtype, 'custrecordoperationline_timerequested', i, '0');
		}
	}
	
	for (var i = 1; i <= partLineCount; i++)
	{
		requestedPartsTotal += parseFloat(claimRecord.getLineItemValue(partLineSubtype, 'custrecordclaimpartline_amount', i));
	}
	
	if(isNaN(requestedLabor))
		requestedLabor = 0;
	claimRecord.setFieldValue('custrecordclaim_requestedlabortotal', requestedLabor);
	if(isNaN(requestedPartsTotal))
		requestedPartsTotal = 0;
	claimRecord.setFieldValue('custrecordclaim_requestedpartstotal', requestedPartsTotal);
	if(isNaN(requestedSublet))
		requestedSublet = 0;
	claimRecord.setFieldValue('custrecordclaim_requestedsublettotal', requestedSublet);
	requestedClaimTotal += requestedLabor;
	requestedClaimTotal += requestedPartsTotal;
	requestedClaimTotal += requestedSublet;
	requestedClaimTotal += requestedShipping;
	if(isNaN(requestedClaimTotal))
		requestedClaimTotal = 0;
	claimRecord.setFieldValue('custrecordclaim_claimrequestedtotal', requestedClaimTotal);
	//******END CODE FOR THE RECALCULATION OF REQUESTED TOTALS******
	
	nlapiSubmitRecord(claimRecord, false, true);
	
}