/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
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
 * Module Description: Sears will like to see the total customer spending total should be indicated on the customer record, main section as Header field. 
 *
 * Version    Date            Author           Remarks
 * 1.00       31 May 2016     mjpascual	   	   initial
 * 1.10       22 June 2016    mjpascual        added the transaction count
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */
define(['N/record', 'N/search', './NSUtil', 'N/error', 'N/runtime'], function(record, search, NSUtil, error, runtime)
{
	function afterSubmit_calcTotalPurchaseHistory(context)
	{
		var stLogTitle = 'afterSubmit_calcTotalPurchaseHistory';
		
		try
		{
			//Role checking
			var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role_2');
			var objUser = runtime.getCurrentUser();
			if(objUser.role == stRestrictedRole)
			{
				return;
			}
			log.debug(stLogTitle, '>> Entry Log <<');
			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);
			
			//Get current record
			var recCurrent = context.newRecord;
			var stRecType = recCurrent.type;
			
			log.debug(stLogTitle, 'context.type = ' + context.type +' | stRecType = '+stRecType);
			
			//Initialize
			var flTranTotal = 0;
			var flTranTotalOld = 0;
			var flCustSpendTot = 0;
			var flNewCustSpendTot = 0;
			var flNewTranTotalCount = 0;
			var flCount = 1;
			var flTranTotalCurr = NSUtil.forceFloat(recCurrent.getValue('total'));
			var stCustomerId = recCurrent.getValue('entity') || recCurrent.getValue('customer');
		
			log.debug(stLogTitle, 'stCustomerId = ' + stCustomerId);

			if(NSUtil.isEmpty(stCustomerId))
			{
				throw error.create({
					name: 'MISSING_REQ_ARG',
					message: 'No customer found.'
				});
			}
			
			//Get Customer's 'Customer Spending Total' value
			var objCustomer = search.lookupFields({
				type: record.Type.CUSTOMER,
				id: stCustomerId,
				columns: ['custentity_sears_customer_spending_total', 'custentity_sears_total_tran']
			});
			
			flTranTotalCount = NSUtil.forceInt(objCustomer.custentity_sears_total_tran);
			flCustSpendTot = NSUtil.forceFloat(objCustomer.custentity_sears_customer_spending_total)
			
			log.debug(stLogTitle, 'flCustSpendTot = ' + flCustSpendTot + ' | flTranTotalCount = '+flTranTotalCount);
			
			//On Create
			if (context.type == context.UserEventType.CREATE)
			{
				flTranTotal = flTranTotalCurr;
			} 
			
			//On Delete
			if (context.type == context.UserEventType.DELETE)
			{
				flTranTotal = flTranTotalCurr * -1;
				flCount = flCount * -1;
			} 
			
			//On Edit
			if (context.type == context.UserEventType.EDIT)
			{
				
				var recOld = context.oldRecord;
				flTranTotalOld = recOld.getValue('total');
				
				log.debug(stLogTitle, 'flTranTotalCurr = '+flTranTotalCurr+' | flTranTotalOld = '+flTranTotalOld);
				
				if(flTranTotalCurr != flTranTotalOld)
				{
					flTranTotal = flTranTotalCurr - flTranTotalOld;
				}
				
				flCount = 0;
			} 
			
			//If Cash Sale or Invoice: Add Total to Customer Spending Total
			if(stRecType == record.Type.CASH_SALE || stRecType == record.Type.INVOICE)
			{
				log.debug(stLogTitle, 'Adding flTranTotal = '+flTranTotal);
				flNewCustSpendTot = flCustSpendTot + flTranTotal;
				flNewTranTotalCount = flTranTotalCount + flCount;
			} 
			//Else If Credit Memo, Return Authorization, and Cash Refund: Subtract Total FROM Customer Spending Total
			else if (stRecType == record.Type.CREDIT_MEMO || stRecType == record.Type.RETURN_AUTHORIZATION || stRecType == record.Type.CASH_REFUND)
			{
				log.debug(stLogTitle, 'Subtracting flTranTotal = '+flTranTotal);
				flNewCustSpendTot = flCustSpendTot - flTranTotal;
				flNewTranTotalCount = flTranTotalCount - flCount;
			}
			//Throw error
			else 
			{
				return;
			}
			
			log.debug(stLogTitle, 'flNewTranTotalCount = ' + flNewTranTotalCount);
			

			//Update customer fields
			var stRecId = record.submitFields({
			    type: record.Type.CUSTOMER,
			    id: stCustomerId,
			    values: {
			    	custentity_sears_customer_spending_total : flNewCustSpendTot,
			    	custentity_sears_total_tran : flNewTranTotalCount
			    },
			    options: {
			        enableSourcing: false,
			        ignoreMandatoryFields : true
			    }
			});
			
			log.audit(stLogTitle, 'stRecId = ' + stRecId + '| Total amt updated ='+flNewCustSpendTot);
			
			
		}
		catch (e)
		{
			if (e.message != undefined)
			{
				log.error('ERROR' , e.name + ' ' + e.message);
				throw e.name + ' ' + e.message;
			}
			else
			{
				log.error('ERROR', 'Unexpected Error' , e.toString()); 
				throw error.create({
					name: '99999',
					message: e.toString()
				});
			}
		}
		finally
		{
			log.debug(stLogTitle, '>> Exit Log <<');
		}

	}

	return {
		afterSubmit : afterSubmit_calcTotalPurchaseHistory
	};
});
