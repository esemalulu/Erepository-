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
 * @NScriptType UserEventScript
 * 
 */
define(['N/record', 'N/error', 'N/url', './NSUtil',  './LibJsonApigee', 'N/runtime', 'N/file'], function(record, error, url, NSUtil, LibWebReq, runtime, file)
{
	var ST_SUCCESS_ID = '200';

	/**
	 * Loyalty Rewards
	 * @param context
	 */
	function afterSubmit_loyatltyRewards(context)
	{
		var stLogTitle = 'afterSubmit_SetVendorList';
		
		try
		{
		
			if (context.type == context.UserEventType.DELETE)
			{
				return true;
			}
			
			//Role checking
			var stRestrictedId = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role_2');
			var objUser = runtime.getCurrentUser();
			
			log.debug(stLogTitle, 'stRestrictedId = ' + stRestrictedId + '| objUser.id = ' + objUser.id);
			if(objUser.id == stRestrictedId)
			{
				log.debug(stLogTitle, 'exiting...');
				return;
			}
			
			if (!NSUtil.inArray(runtime.executionContext,[runtime.ContextType.USER_INTERFACE]))
			{
				return;
			}
			
			var objScript = runtime.getCurrentScript();
			var stParamPriceLvl = objScript.getParameter('custscript_price_levels');
			var stParamFolderId = objScript.getParameter('custscript_esi_folder_id');
			var stParamRewardItems = objScript.getParameter('custscript_reward_ids');
			
			log.debug(stLogTitle, 'stParamPriceLvl = ' + stParamPriceLvl + '| stParamFolderId = ' + stParamFolderId + '| stParamRewardItems = ' + stParamRewardItems);
			
			if(NSUtil.isEmpty(stParamPriceLvl) || NSUtil.isEmpty(stParamFolderId) || NSUtil.isEmpty(stParamRewardItems))
			{
				throw error.create({
					name: 'SCRIPT ERROR',
					message: 'Script parameters are required fields.'
				});
			}

            var stType = context.newRecord.type;
            var stId = context.newRecord.id;
            var arrRewardItems = stParamRewardItems.split(',');
            
            log.debug(stLogTitle, 'stType ='+stType + ' | stId ='+stId );
            log.debug(stLogTitle, 'arrRewardItems ='+arrRewardItems );
			
			var recCurrent = record.load({
				type: stType,
				id: stId
			});
			
			//ESI
			var stLoyaltyId = recCurrent.getValue('custbody_loyalty_number');
			var stCCV = recCurrent.getValue('custbody_cvv'); 
			
			if(NSUtil.isEmpty(stLoyaltyId) || NSUtil.isEmpty(stCCV))
			{
				return;
			}
				
			var intItemLen = recCurrent.getLineCount('item');
			
			//Initialize
			var arrObjSalesLineItems = [];
			var stTranId = '';
			var flLineRewardAmt = 0;
			var flTotalRewAmt = 0;
			var stTimeStamp = '';
			
			//Reversal of previous transaction
			var stPrevTranId = recCurrent.getValue('custbody_esi_tran_id');
			log.debug(stLogTitle, 'stPrevTranId = '+stPrevTranId);
			
			if(((record.Type.SALES_ORDER == stType && context.type == 'edit') ||  (record.Type.SALES_ORDER != stType && context.type == 'create')))
			{
				
				if(!NSUtil.isEmpty(stPrevTranId))
				{
					//BURN REVERSAL
					log.debug(stLogTitle, 'BURN REVERSAL');
					var objReverse = LibWebReq.reversePts(stLoyaltyId, stPrevTranId);
					log.audit(stLogTitle, 'objReverse ='+JSON.stringify(objReverse));
					
					if(NSUtil.isEmpty(objReverse) || objReverse.code != ST_SUCCESS_ID)
					{
						throw error.create({
								name: 'SYTSTEM ERROR',
								message: 'Reversing loyalty points has encountered an error. Please contact your administrator for more details.'
						});
					}
					
					recCurrent.setValue({
						fieldId : 'custbody_esi_tran_id',
						value : ''
					});
				}
				
				//EARNED REVERSAL
				log.debug(stLogTitle, 'EARNED REVERSAL');
				
//				var flEarnedPts = NSUtil.forceFloat(recCurrent.getValue('custbody_rewards_earned'));
//				log.debug(stLogTitle, 'flEarnedPts ='+flEarnedPts);
//				
//				if(flEarnedPts > 0)
//				{
//					var recOld = null;
//					if(record.Type.SALES_ORDER == stType)
//					{
//						recOld = context.oldRecord;
//					} 
//					else 
//					{
//						recOld = recCurrent;
//					}
//					
//				    LibWebReq.reverseEarnedPoints(stParamFolderId, recOld, stType, stId, stLoyaltyId);
//				    
//				    recCurrent.setValue({
//						fieldId : 'custbody_rewards_earned',
//						value : 0
//					});
//				}
				
				var flEarnedPts = NSUtil.forceFloat(recCurrent.getValue('custbody_rewards_earned'));
				
				log.debug(stLogTitle, 'flEarnedPts ='+flEarnedPts);
				
				if(flEarnedPts > 0)
				{
					var stEventId = recCurrent.getValue('custbody_esi_event_id');
					
					if(!NSUtil.isEmpty(stEventId))
					{
						var objRollback = LibWebReq.rollback(stLoyaltyId, stEventId);
						
						if(NSUtil.isEmpty(objRollback) || objRollback.code != ST_SUCCESS_ID)
						{
							throw error.create({
									name: 'SYTSTEM ERROR',
									message: 'Rollback of earned loyalty points has encountered an error. Please contact your administrator for more details.'
							});
						}
						
						recCurrent.setValue({
							fieldId : 'custbody_rewards_earned',
							value : ''
						});
						
						recCurrent.setValue({
							fieldId : 'custbody_esi_event_id',
							value : ''
						});
					}
				}
				
			}
				
			if(record.Type.SALES_ORDER == stType)
			{
				//Add Lines
				for (var intCtr = 0; intCtr < intItemLen; intCtr++)
				{
					var stItem = recCurrent.getSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						line: intCtr
					});
					
					var stItemTxt = recCurrent.getSublistText({
						sublistId: 'item',
						fieldId: 'item',
						line: intCtr
					});
					
					var stQty = recCurrent.getSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						line: intCtr
					});
					
					var stAmt = recCurrent.getSublistValue({
						sublistId: 'item',
						fieldId: 'amount',
						line: intCtr
					});
					
					var stPriceLvl = recCurrent.getSublistValue({
						sublistId: 'item',
						fieldId: 'price',
						line: intCtr
					});
					
					var stSKU = recCurrent.getSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_sku_srcd',
						line: intCtr
					});

					log.debug(stLogTitle, 'stItem = '+stItem + ' | stItemTxt = '+stItemTxt + ' | stQty = '+stQty + ' | stAmt = '+stAmt + ' | stPriceLvl = '+stPriceLvl + ' | stSKU = '+stSKU);

					var objItem = {}
					objItem.saleLineItemSequenceNumber = intCtr+1;
					objItem.saleLineItemDepartmentNo = '';
					objItem.saleLineItemItemNo = stItemTxt;
					objItem.saleLineItemSKU = stSKU;
					objItem.saleLineItemQuantity = stQty;
					objItem.saleLineItemSaleAmount = stAmt;
					if(stPriceLvl == stParamPriceLvl)
					{
						objItem.saleLineItemTags = ['Clearance'];
					}
					
					arrObjSalesLineItems.push(objItem);
					
					if(NSUtil.inArray(stItem, arrRewardItems))
					{
						flLineRewardAmt = NSUtil.forceFloat(recCurrent.getSublistValue({
							sublistId: 'item',
							fieldId: 'amount',
							line: intCtr
						}));
					}
				}
					
				flLineRewardAmt = flLineRewardAmt * -1;
				log.debug(stLogTitle, 'flLineRewardAmt = '+flLineRewardAmt);
				
				//BURN
				if(flLineRewardAmt > 0)
				{
					log.debug(stLogTitle, 'BURN');
					
					flLineRewardAmt = flLineRewardAmt*100; //TODO: 100 as script parameter
					
					var objBurn = LibWebReq.burnPts(stLoyaltyId, stCCV, flLineRewardAmt);
					log.audit(stLogTitle, 'objBurn ='+JSON.stringify(objBurn));
					
					if(NSUtil.isEmpty(objBurn) || objBurn.code != ST_SUCCESS_ID)
					{
						throw error.create({
							name: 'SYTSTEM ERROR',
							message: 'Burning loyalty points has encountered an error. Please contact your administrator for more details.'
						});
					}
					
					var objBody = JSON.parse(objBurn.body);
					stTranId = 	objBody.id;
				}
				
				//EARN
				log.debug(stLogTitle, 'EARN');
				log.debug(stLogTitle, 'arrObjSalesLineItems' + JSON.stringify(arrObjSalesLineItems));
				
				var dNow = new Date();
				stTimeStamp = dNow.getTime().toString();
				
				var objEarn = LibWebReq.earnPts(stLoyaltyId, arrObjSalesLineItems, stTimeStamp);
				
				
				
				if(NSUtil.isEmpty(objEarn) || objEarn.code != ST_SUCCESS_ID)
				{
					throw error.create({
							name: 'SYTSTEM ERROR',
							message: 'Earning loyalty points has encountered an error. Please contact your administrator for more details.'
					});
				}
				
				var objEarnBody = JSON.parse(objEarn.body);
				
				log.debug(stLogTitle , 'objEarnBody.valid ='+objEarnBody.valid);
				
				if(!objEarnBody.valid)
				{
					log.debug(stLogTitle , 'No rewards earned.');
				} 
				else 
				{
					var stRewards = 'Rewards Earned: ';
					var arrRewardsEarned = objEarnBody.rewards;
					
					log.debug(stLogTitle, 'objEarnBody.rewards ='+JSON.stringify(objEarnBody.rewards));
					
					if(!NSUtil.isEmpty(arrRewardsEarned))
					{
						for(var intRew = 0; intRew < arrRewardsEarned.length; intRew++)
						{
							var flRewAmt = NSUtil.forceFloat(arrRewardsEarned[intRew].rewardAmount);
							flTotalRewAmt += flRewAmt;
						}
						stRewards += flTotalRewAmt + ' pts';
					}
					log.debug(stLogTitle , ' stRewards ='+stRewards);
				}
				
				log.audit(stLogTitle , ' stTranId ='+stTranId);
				
				//Setter
				recCurrent.setValue({
					fieldId : 'custbody_esi_tran_id',
					value : stTranId
				});
				
				recCurrent.setValue({
					fieldId : 'custbody_rewards_earned',
					value : flTotalRewAmt
				});
				
				recCurrent.setValue({
					fieldId : 'custbody_esi_event_id',
					value : stTimeStamp
				});

			}
			
			recCurrent.save();
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
		afterSubmit : afterSubmit_loyatltyRewards
	};
});
