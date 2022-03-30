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
 * 1.00       30 June 2016     mjpascual	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/record', 'N/ui/serverWidget', 'N/runtime', 'N/redirect', './NSUtil', 'N/error', './LibJsonApigee'], function(record, serverWidget, runtime, redirect, NSUtil, error, LibWebReq) {
	
	/**
	 * Set Line Item
	 * @param option
	 * @param objParam
	 */
	function doSetLineItem(option, objParam)
	{
		var stLogTitle = 'suitelet_loyaltyReward.doSetLineItem';
		log.debug(stLogTitle, 'Creating the form...');

		var flRedeemableAmt = NSUtil.forceFloat(option.request.parameters.custpage_redeemable_bal);
		var stAmtToRedeem = option.request.parameters.custpage_amt_to_redeem;
		var flAmtToRedeem = NSUtil.forceFloat(stAmtToRedeem);
		
		var arrRedAmts = objParam.stParamRedemptionAmt.split(',');
		var arrDiscItms =  objParam.stParamDiscItemsIds.split(',');
		
		log.debug(stLogTitle, 'stAmtToRedeem = '+stAmtToRedeem + ' | flRedeemableAmt = '+flRedeemableAmt+ ' | arrRedAmts = '+JSON.stringify(objParam));
		
		var intIndexAmt = arrRedAmts.indexOf(stAmtToRedeem);
		var stDiscountItem = arrDiscItms[intIndexAmt];
		
		log.debug(stLogTitle, 'intIndexAmt = '+intIndexAmt + ' | stDiscountItem = '+stDiscountItem);
		
		//Create the HTML
		var stHtml = '<html>';

		stHtml += '<head>';
		stHtml += '<script language="JavaScript">';
		
		if(flRedeemableAmt >= flAmtToRedeem)
		{
		
			stHtml += 'if (window.opener)';
			stHtml += '{';
			
			stHtml += 'window.opener.nlapiSelectNewLineItem("item");';
			stHtml += 'window.opener.nlapiSetCurrentLineItemValue("item", "item", "' + objParam.stParamSubtotalItem + '", true, true);';        					
			stHtml += 'window.opener.nlapiCommitLineItem("item");';
		
			stHtml += 'window.opener.nlapiSelectNewLineItem("item");';
			stHtml += 'window.opener.nlapiSetCurrentLineItemValue("item", "item", "' + stDiscountItem + '", true, true);';        		
			stHtml += 'window.opener.nlapiSetCurrentLineItemValue("item", "amount", "' + (flAmtToRedeem*-1) + '", true, true);';        			
			stHtml += 'window.opener.nlapiCommitLineItem("item");';
			
			stHtml += '}';
			stHtml += '';
			stHtml += 'window.close();';
		}
		stHtml += '</script>';
		stHtml += '</head>';
		stHtml += '<body>';
		
		if (flRedeemableAmt < flAmtToRedeem)
		{
			log.debug(stLogTitle, 'User Error: Amount to Redeem should be lesser than or equal Redeemable Amount');
			stHtml += 'Amount to Redeem should be lesser than or equal Redeemable Amount';
		} 
		
		stHtml += '</body>';
		stHtml += '</html>';

		log.debug(stLogTitle, 'Redirected..');
		
		return stHtml;
	}

	/**
	 * Show Rejection Page
	 * @option
	 */
	function showPopup(option, objParam)
	{
		var stLogTitle = 'suitelet_loyaltyReward.showPopup';
		log.debug(stLogTitle, 'Creating the form...');
		
		var stLoyaltyId = option.request.parameters.custpage_loyalty;
		var stCCV = option.request.parameters.custpage_cvv;
		var stLine = option.request.parameters.custpage_line;
		var arrRedAmt = objParam.stParamRedemptionAmt.split(',');
		var intMultiplier = NSUtil.forceInt(objParam.stParamConvPt);
		
		log.debug(stLogTitle, 'stLoyaltyId = '+stLoyaltyId + ' | stCCV = '+stCCV+ ' | stLine = '+stLine + '  | arrRedAmt = '+ arrRedAmt);
		
		//CALL RESLET
		var objResponse = LibWebReq.getBalance(stLoyaltyId, stCCV);
		log.debug(stLogTitle, 'objResponse ='+JSON.stringify(objResponse));
		
		//Create Form
		var objForm = serverWidget.createForm({
			title: 'Loyalty Rewards',
			hideNavBar : true
		});
		
		var objError = objForm.addField({
			id : 'custpage_error',
			type : serverWidget.FieldType.TEXT,
			label : 'ERROR:'
		});
		
		objError.updateDisplayType({
			displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		if(NSUtil.isEmpty(objResponse))
		{
			objError.defaultValue = 'Loyalty Reward cannot be found.';
			return objForm;
		}
		
		var objBody = JSON.parse(objResponse.body);
		
		if(objBody.userStatus != 'ACTIVE')
		{
			objError.defaultValue = 'Loyalty Reward is '+objBody.userStatus;
			return objForm;
		}
		
		objError.updateDisplayType({
			displayType : serverWidget.FieldDisplayType.HIDDEN
		});
		
		//Action Field
		var objFldAction = objForm.addField({
			id : 'custpage_action',
			type : serverWidget.FieldType.TEXT,
			label : 'Process'
		});
		objFldAction.defaultValue = 'PROCESS';
		objFldAction.updateDisplayType({
			displayType : serverWidget.FieldDisplayType.HIDDEN
		});
		
		var objLine = objForm.addField({
			id : 'custpage_line',
			type : serverWidget.FieldType.TEXT,
			label : 'stLine'
		});
		objLine.defaultValue = stLine;
		objLine.updateDisplayType({
			displayType : serverWidget.FieldDisplayType.HIDDEN
		});
		
		//Redeemable Balance
		var objFldBalance = objForm.addField({
			id : 'custpage_redeemable_bal',
			type : serverWidget.FieldType.INTEGER,
			label : 'Redeemable Balance (PTS)'
		});
		objFldBalance.defaultValue = objBody.redeemableBalance;
		objFldBalance.updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		});
		objFldBalance.updateLayoutType({
			layoutType : serverWidget.FieldLayoutType.ENDROW
		});
		
		//Amount to be Redeemed
		var objFldAmt = objForm.addField({
			id : 'custpage_amt_to_redeem',
			type : serverWidget.FieldType.SELECT,
			label : 'Amount to be Redeemed ($)'
		});
		
		objFldAmt.updateLayoutType({
			layoutType : serverWidget.FieldLayoutType.ENDROW
		});
		
		if(!NSUtil.isEmpty(arrRedAmt))
		{
			var flReedamableBalance = NSUtil.forceFloat(objBody.redeemableBalance);
			
			for (var intCtr = 0; intCtr < arrRedAmt.length; intCtr++)
			{
				var flCurrAmt = NSUtil.forceFloat(arrRedAmt[intCtr]) * intMultiplier;
				log.debug(stLogTitle, 'flCurrAmt = '+flCurrAmt + ' | flReedamableBalance = '+flReedamableBalance);
				
				if(flReedamableBalance >= flCurrAmt)
				{
					objFldAmt.addSelectOption({
						value: arrRedAmt[intCtr],
						text: arrRedAmt[intCtr]
					});
				}
			}
		}
			
		//Amount to be Redeemed
		objForm.addField({
			id : 'custpage_note',
			type : serverWidget.FieldType.LABEL,
			label : objParam.stParamConvPt+' pts :  $'+objParam.stParamConvDollar
		});
		
		//Submit Button
		objForm.addSubmitButton({
			label : 'Apply Rewards'
		});
		
		
		return objForm;
	}
	
	/**
	 * Entry ->  Suitelet
	 * @param option
	 */
	function suitelet_loyaltyReward(option)
	{
		var stLogTitle = 'suitelet_loyaltyReward';
		log.debug(stLogTitle, '>> Entry Log <<');
	
		//Getters
		var objParam = {};
		objParam.stParamSubtotalItem = runtime.getCurrentScript().getParameter('custscript_subtotal_item');
		objParam.stParamRedemptionAmt = runtime.getCurrentScript().getParameter('custscript_redemption_amts');
		objParam.stParamDiscItemsIds = runtime.getCurrentScript().getParameter('custscript_reward_ids');
		objParam.stParamConvPt = runtime.getCurrentScript().getParameter('custscript_conv_pt');
		objParam.stParamConvDollar = runtime.getCurrentScript().getParameter('custscript_conv_dollar');

		if(NSUtil.isEmpty(objParam.stParamSubtotalItem) || NSUtil.isEmpty(objParam.stParamRedemptionAmt) || NSUtil.isEmpty(objParam.stParamConvPt) || NSUtil.isEmpty(objParam.stParamConvDollar) || NSUtil.isEmpty(objParam.stParamDiscItemsIds))
		{
			throw error.create({
				name: 'MISSING_REQ_ARG',
				message: 'Script parameters should not be empty'
			});
		}
			
		try
		{
			//Getters
			var stAction = option.request.parameters.custpage_action;
	
			log.debug(stLogTitle, 'stAction = '+stAction);
			
			if (stAction == 'PROCESS')
			{
				var stHtml = doSetLineItem(option, objParam);
				option.response.write(stHtml);
			}
			else
			{
				var objForm = showPopup(option, objParam);
				option.response.writePage(objForm);
			}

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

	return{
		onRequest : suitelet_loyaltyReward
	};
});
