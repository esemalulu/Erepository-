/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */


/**
 * A Server Side Script before submit that sets Approval Status of Invoice to Approved on create event
 * 
 *  @author Aurel Shenne A. Sinsin
 * @version 1.0
 */
function beforeSubmit_autoApproveInvoice(type)
{
	try 
	{
	    var stLoggerTitle = 'beforeSubmit_autoApproveInvoice';	    
	    nlapiLogExecution('DEBUG', stLoggerTitle, '>> Entry <<');
			
		// Continue only if event type is create
		if(type != 'create')
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, '>> Exit <<');
            return true;
		}
		
		var context = nlapiGetContext();
		var stApprovedStatus = context.getSetting('SCRIPT', 'custscript_iaa_approved');
        var stPendingApprovalStatus = context.getSetting('SCRIPT', 'custscript_iaa_pending_approval');
        var stARAccount = context.getSetting('SCRIPT', 'custscript_iaa_ar_account');
        var stEISSubisidiary = context.getSetting('SCRIPT', 'custscript_iaa_eis_subsidiary');
        nlapiLogExecution('DEBUG', stLoggerTitle, 'stApprovedStatus = ' + stApprovedStatus
            + '\n <br /> stPendingApprovalStatus = ' + stPendingApprovalStatus
            + '\n <br /> stARAccount = ' + stARAccount
            + '\n <br /> stEISSubisidiary = ' + stEISSubisidiary);
        
        if (isEmpty(stApprovedStatus) || isEmpty(stPendingApprovalStatus) || isEmpty(stARAccount) || isEmpty(stEISSubisidiary))
        {
            throw nlapiCreateError('99999', 'Missing script parameter(s).');
        }
				
		var stStatus = nlapiGetFieldValue('approvalstatus');
		var stSubsidiary = nlapiGetFieldValue('subsidiary');
		nlapiLogExecution('DEBUG',  stLoggerTitle, 'stStatus = ' + stStatus
		    + '\n <br /> stSubsidiary = ' + stSubsidiary);
		
		// Check if invoice is pending approval
		if(stStatus != stPendingApprovalStatus || stSubsidiary != stEISSubisidiary)
		{
			nlapiLogExecution('DEBUG',  stLoggerTitle, '>> Exit <<');
			return;
		}

		// Update status to Approved
		nlapiSetFieldValue('approvalstatus', stApprovedStatus);
		nlapiSetFieldValue('account', stARAccount);
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Approval Status is set to ' + stApprovedStatus
		    + '\n <br /> Account is set to ' + stARAccount);
		
		nlapiLogExecution('DEBUG', stLoggerTitle, '>> Done Approving <<');
	
		//9/28/2016
		//Loop through the Billable Item sublist and see if we can grab  vendor name from linked VB and set it on the line
		//itemcost is the internal id of sublist
		//	doc is the internal id of the sublist field that contains Internal ID of vendor bill
		//	url is the internal id of the sublist field that contains URL of the record (vendbill) is the string we are looking for
		var iccnt = nlapiGetLineItemCount('itemcost');
		if (iccnt > 0)
		{
			var vbIds = [];
			//Go through each line and build internal ID of vendor bill IDs to look up
			for (var i=1; i <= iccnt; i+=1)
			{
				var lineUrl = nlapiGetLineItemValue('itemcost', 'url', i),
					lineDoc = nlapiGetLineItemValue('itemcost', 'doc', i);
				
				nlapiLogExecution('debug','line // doc // url', i+' // '+lineDoc+' // '+lineUrl);
				
				if (lineUrl.indexOf('vendbill') > -1 && vbIds.indexOf(lineDoc) < 0)
				{
					vbIds.push(lineDoc);
					
					//testing
					//nlapiSetLineItemValue('itemcost', 'custcol_eis_vendor_name_rpt2', i, 'testing');
				}
			}
			
			//return;
			nlapiLogExecution('debug','vbIds', vbIds);
			
			//If we have VB IDs, look up Vendor Name field value on the linked Vendor Bill
			if (vbIds.length > 0)
			{
				//JSON value to hold VB ID to Vendor Name
				//we look for all VB in vbIds that HAS a value for vendor name
				var vbflt = [new nlobjSearchFilter('internalid', null, 'anyof', vbIds)],
					vbcol = [new nlobjSearchColumn('internalid'),
					         new nlobjSearchColumn('custbody_eis_vendor_name'),
					         new nlobjSearchColumn('custbody_charged_by_employee')],
					vbrs = nlapiSearchRecord('vendorbill', null, vbflt, vbcol);
				
				//Loop through each result set and update the itemcost line by doc field
				if (vbrs && vbrs.length > 0)
				{
					for (var vb=0; vb < vbrs.length; vb+=1)
					{
						var vbid = vbrs[vb].getValue('internalid'),
							vbname = vbrs[vb].getValue('custbody_eis_vendor_name'),
							vbemp = vbrs[vb].getValue('custbody_charged_by_employee'),
							cinvLine = nlapiFindLineItemValue('itemcost', 'doc', vbid);
						
						nlapiLogExecution('debug','found line', cinvLine+' matches vbid '+vbid+' // vbname: '+vbname+' // vbemp: '+vbemp);
						
						if (vbname)
						{
							nlapiSetLineItemValue('itemcost', 'custcol_eis_vendor_name_rpt2', cinvLine, vbname);
						}
						
						if (vbemp)
						{
							nlapiSetLineItemValue('itemcost', 'custcol_eis_employee_name_rpt', cinvLine, vbemp);
						}
						
					}
				}//End check to see if there are any Vendor Bills WITH Vendor Name in them
			} //End check for vbIds array
		}//End Check for itemcost (billable item sublist count)
		
		nlapiLogExecution('DEBUG', stLoggerTitle, '>> Done Setting Vendor Name if any <<');
	} 
	catch (error)
    {
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR','Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}


/**
 * Check if a string is empty
 * @param stValue (string) value to check
 * @returns {Boolean}
 */
function isEmpty (stValue) {
     if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
          return true;
     }

     return false;
}