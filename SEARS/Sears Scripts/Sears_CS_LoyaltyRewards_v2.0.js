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
 * Module Description: Loyalty Rewards
 *
 * Version    Date            Author           Remarks
 * 1.00       30 June 2016    mjpascual	   	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/record', './NSUtil', 'N/error', 'N/runtime', './LibJsonApigee'], function(record, NSUtil, error, runtime, LibWebReq)
{
	var ST_TYPE = '';
	var ST_SUCCESS_ID = '200';

	function pageInit_loyaltyRewards(context)
	{
		ST_TYPE = context.mode;
	}
	
	/**
	 * Save Record
	 * @param context
	 * @returns {Boolean}
	 */
	function saveRecord_loyaltyRewards(context)
	{
		
		var stLogTitle = 'saveRecord_loyaltyRewards';
		
		try
		{	
			//Get parameters
			var objScript = runtime.getCurrentScript();
			
			//Company Script parameter
			var stParamRewardItems = objScript.getParameter('custscript_reward_ids');
			var stParamRedeemableAmt = objScript.getParameter('custscript_redemption_amts');
			
			//Script parameter 
			var stParamPriceLvl = objScript.getParameter('custscript_price_level');
			var flParamDollarToPoint = NSUtil.forceFloat(objScript.getParameter('custscript_dollar_to_point'));
			
			log.debug(stLogTitle, 'stParamPriceLvl = '+stParamRewardItems + ' | flParamDollarToPoint' + stParamRedeemableAmt );
			
			if (NSUtil.isEmpty(stParamRewardItems) || NSUtil.isEmpty(stParamRedeemableAmt) || NSUtil.isEmpty(stParamPriceLvl)  || NSUtil.isEmpty(flParamDollarToPoint)  )
			{
				throw error.create({
					name: 'MISSING_REQ_ARG',
					message:  'Missing script parameter'
				});
			}
			
			var arrRedeemableAmt = stParamRedeemableAmt.split(',');
			var arrRewardItems = stParamRewardItems.split(',');
			
			log.debug(stLogTitle, 'arrRedeemableAmt = '+arrRedeemableAmt + ' | arrRewardItems = '+arrRewardItems );
			
			if (ST_TYPE != 'create' && ST_TYPE != 'edit' && ST_TYPE != 'copy')
			{
				return;
			}
			
			var recCurrent = context.currentRecord;
			var stSublistName = context.sublistId;

			var intItemLen = recCurrent.getLineCount('item');
			
			var intRewItemCount = 0;
			var intRewPosition = 0;
			var flLineRewardAmt = 0;
			var flRedeemableBalance = 0;
			
			//Check Lines
			for (var intCtr = 0; intCtr < intItemLen; intCtr++)
			{
				var stItem = recCurrent.getSublistValue({
					sublistId: 'item',
					fieldId: 'item',
					line: intCtr
				});
				
				if(NSUtil.inArray(stItem, arrRewardItems))
				{
					intRewItemCount++;
					intRewPosition = intCtr;
					flLineRewardAmt = NSUtil.forceFloat(recCurrent.getSublistValue({
						sublistId: 'item',
						fieldId: 'amount',
						line: intCtr
					}));
				}
			}
			
			log.debug(stLogTitle, 'intRewItemCount = '+intRewItemCount);
			
			//Validations
			if(intRewItemCount > 1)
			{
				alert('USER ERROR: Loyalty Reward Item line should not be more than 1.');
				return false;
			} 
			else if(intRewItemCount == 1)
			{
				//Reward should be on the last item.
				if(intRewPosition != (intItemLen-1))
				{
					alert('USER ERROR: Reward Item should be on the last line.');
					return false;
				}
				
				if(flLineRewardAmt > 0)
				{
					alert('USER ERROR: Redeemable Item amount should be negative');
					return false;
				}
				
				//Convert to positive
				flLineRewardAmt = flLineRewardAmt*-1;
				
				//Call ESI
				var stLoyaltyId = recCurrent.getValue('custbody_loyalty_number');
				var stCCV = recCurrent.getValue('custbody_cvv'); 
				
				log.debug(stLogTitle, 'stLoyaltyId = '+stLoyaltyId + ' | stCCV = '+stCCV);
				
				//Required Loyalty Card..
				if(NSUtil.isEmpty(stLoyaltyId) || NSUtil.isEmpty(stCCV))
				{
					alert('Loyalty Number and CCV fields are required.');
					return false;
				}
				
				//No Loyalty Card found..
				if(NSUtil.isEmpty(stLoyaltyId) || NSUtil.isEmpty(stCCV))
				{
					return true;
				}
				
				//Amount Validation
				var objBalance =  LibWebReq.getBalance(stLoyaltyId, stCCV);
				log.audit(stLogTitle, 'objBalance = '+ JSON.stringify(objBalance));
				
				if(NSUtil.isEmpty(objBalance) || objBalance.code != ST_SUCCESS_ID)
				{
					alert('USER ERROR: Invalid Loyalty Number and CCV code.');
					return false;
				}
					
				log.debug(stLogTitle, 'objBalance.code = '+objBalance.code);
				
			
				if(!NSUtil.isEmpty(objBalance.body))
				{

					var objBodyBalance = JSON.parse(objBalance.body);
					
					if(objBodyBalance.userStatus != 'ACTIVE')
					{
						alert('USER ERROR: Loyalty Reward is '+objBodyBalance.userStatus);
						return false;
					}
					
					flRedeemableBalance = NSUtil.forceFloat(objBodyBalance.redeemableBalance) * flParamDollarToPoint;
				}
				
				//If redeemable balance amount is less than reward line item amount, throw an error
				if(flRedeemableBalance < flLineRewardAmt)
				{
					alert('USER ERROR: Redeemable Balance is not sufficient.');
					return false;
				}
				
				//If not on the list
				if(!NSUtil.inArray(flLineRewardAmt, arrRedeemableAmt))
				{
					alert('USER ERROR: Allowed redeemable amounts are: '+arrRedeemableAmt);
					return false;
				}
				
			}
			
			return true;
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
		return true;
	}

	return {
		pageInit: pageInit_loyaltyRewards,
		saveRecord : saveRecord_loyaltyRewards
	};
});
