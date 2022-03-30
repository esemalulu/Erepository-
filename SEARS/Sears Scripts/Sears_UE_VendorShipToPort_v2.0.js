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
 * Module Description: 
 * 
 * Item receipt is done on the port and then the transfer order will be created behind the scene, 
 * in order to process the item receipt when it hits the final destination (warehouse). 
 *
 * Version    Date            Author           Remarks
 * 1.00       04 June 2016    mjpascual	   	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */
define(['N/record', 'N/runtime', './NSUtil', 'N/error', 'N/search'], function(record, runtime, NSUtil, error, search)
{
	function afterSubmit_vendorShipToPort(context)
	{
		var stLogTitle = 'afterSubmit_vendorShipToPort';
		
		try
		{
			if (context.type == context.UserEventType.DELETE)
			{
				return;
			}
			//Role checking
			var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role_2');
			var objUser = runtime.getCurrentUser();
			if(objUser.role == stRestrictedRole)
			{
				return;
			}

			log.debug(stLogTitle, '>> Entry Log <<');
			log.debug(stLogTitle, 'context.type = ' + context.type);
			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);
	
			var objScript = runtime.getCurrentScript();
			var stPortOfTransit = objScript.getParameter('custscript_port_of_transit');

			if (NSUtil.isEmpty(stPortOfTransit))
			{
				throw error.create({
					name: 'MISSING_REQ_ARG',
					message:  'Missing script parameter'
				});
			}
			
			var recCurrent = context.newRecord;
			var stRecId = recCurrent.id;
	
			log.debug(stLogTitle, 'context.type = ' + context.type + ' | runtime.executionContext = ' + runtime.executionContext  + ' | stRecId = ' + stRecId);
		    
			if (context.type != context.UserEventType.CREATE && !NSUtil.inArray(runtime.executionContext,[runtime.ContextType.USER_INTERFACE]))
			{
				return;
			}
			
			//Trigger only if correct Item Receipt type
			var stPOId = recCurrent.getValue('createdfrom');
			var stPort = recCurrent.getValue('custbody_port');
			var stFinalLoc = recCurrent.getValue('custbody_final_location');
			
			var stLocation = '';
			
			var intLineCount = recCurrent.getLineCount('item');
			if(intLineCount != 0)
			{
				stLocation = recCurrent.getSublistValue({
					sublistId : 'item',
					fieldId : 'location',
					line : 0
				});
			}
			
			log.debug(stLogTitle, 'stPOId = '+ stPOId + ' | stPort = ' + stPort + ' | stFinalLoc = ' + stFinalLoc + ' | stLocation = ' + stLocation );
			
			//Checking if we need to execute the script.
			if(NSUtil.isEmpty(stPort) || NSUtil.isEmpty(stFinalLoc) || stLocation != stPortOfTransit)
			{
				log.debug(stLogTitle, 'Item receipt not for this script.... Exiting script...' );
				return
			}
	
			//Create a transfer order
			var recTO = record.create({
				type: record.Type.TRANSFER_ORDER,
				isDynamic: true
			});

			recTO.setValue({
				fieldId:'location',
				value:stLocation
			});

			recTO.setValue({
				fieldId:'transferlocation',
				value:stFinalLoc
			});
			
			recTO.setValue({
				fieldId:'custbody_sears_vendor_item_receipt',
				value : stRecId
			});
			
			recTO.setValue({
				fieldId:'custbody_vendor_ship_po',
				value : stPOId
			});
			
			
			for(var intCtr = 0; intCtr < intLineCount;  intCtr++)
			{
				log.debug(stLogTitle, 'intCtr = '+intCtr );
				
				var bChecked =  recCurrent.getSublistValue({
					sublistId : 'item',
					fieldId : 'itemreceive',
					line : intCtr
				});
				
				var stItem = recCurrent.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : intCtr
				});

				var stRate = recCurrent.getSublistValue({
					sublistId : 'item',
					fieldId : 'rate',
					line : intCtr
				});
				
				var stQty = recCurrent.getSublistValue({
					sublistId : 'item',
					fieldId : 'quantity',
					line : intCtr
				});
				
				log.debug(stLogTitle, 'intCtr = '+intCtr+' stItem = ' + stItem + ' | stQty = ' + stQty + ' | stRate = ' + stRate + ' | bChecked = ' + bChecked );
				
				if(bChecked)
				{
					recTO.selectNewLine({sublistId: 'item'});
					recTO.setCurrentSublistValue('item','item', stItem);
					recTO.setCurrentSublistValue('item','quantity', stQty);
					recTO.setCurrentSublistValue('item','rate', stRate);
					recTO.commitLine({sublistId: 'item'});
				}
			
			}

			var stTOid = recTO.save({
				enableSourcing: false,
				ignoreMandatoryFields: true
			});
			
			log.audit(stLogTitle, 'Transfer Order created = '+stTOid);
			
			if(!NSUtil.isEmpty(stTOid))
			{
				//Get the Trans Id
				var objRecSrch = search.lookupFields({
					type: record.Type.TRANSFER_ORDER,
					id: stTOid,
					columns: 'tranid'
				});
				
				var stTranId = objRecSrch.tranid;
				
				log.debug(stLogTitle, 'stTranId = '+stTranId);
				
				//Set the External Id
				var recObj = record.submitFields({
					type : record.Type.TRANSFER_ORDER,
					id : stTOid,
					values :
					{
						'custbody_sears_sales_ordernum' : stTranId,
						'externalid' : stTranId
					}
				});
				
				log.debug(stLogTitle, 'externalid &  custbody_sears_sales_ordernum= '+stTranId);
			}

			//Transform Transfer Order to Item Fulfillment
			var recIF = record.transform({
				fromType: record.Type.TRANSFER_ORDER,
				fromId: stTOid,
				toType: record.Type.ITEM_FULFILLMENT,
				isDynamic: true
			});
			
			var stIFid = recIF.save({
				enableSourcing: false,
				ignoreMandatoryFields: true
			});
			
			log.audit(stLogTitle, 'Item Fulfillment created = '+stIFid);

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
		afterSubmit : afterSubmit_vendorShipToPort
	};
});
