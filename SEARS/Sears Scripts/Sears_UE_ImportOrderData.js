/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). custrecord_sears_bigitemship_orderidYou shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 */
/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       20 Aug 2016     mjpascual        initial
 */

/**
 *
 * @NApiVersion 2.x
 * @NScriptType usereventscript
 */
define(['./NSUtil','./LibShipDelivery', 'N/record', 'N/url','N/search', 'N/format'],

/**
 * @param {Object} NSUtil
 * @param {Object} LibClearD
 * @param {record} record
 * @param {url} url
 * @param {search} search
 */
function(NSUtil, LibShipDelivery, record,url, search, nformat)
{
	var ImportOrderData = {}, helper = {}, cache = {};

	var _LOGTITLE = 'ImportOrderData';
	var _SUCCESS = 200;

	/**
	 *  @param {Object} scriptContext
	 *  @param {record.Record} scriptContext.newRecord new record
	 *  @param {String} scriptContext.type trigger type
	 *  @param {form} scriptContext.form current form
	 *  @memberOf userEvent
	 */
	ImportOrderData.afterSubmit = function (scriptContext)
	{
		var logTitle = _LOGTITLE + '::afterSubmit';
		var recordObj = scriptContext.newRecord;
		var recordId = recordObj.id;
		
		var stBigItemId = recordObj.getValue('custbody_sears_booking_info');
		
		var logTitle = _LOGTITLE + '::stBigItemId ='+stBigItemId;
		
		var recBigItem = '';
		try{
			var recBigItem = record.load({
				type : 'customrecord_sears_bigitem_shipping',
				id : stBigItemId
			});
		} 
		catch(e)
		{
			log.debug(logTitle, 'No big item custom record found.' );
			return;
		}
		
		if(!NSUtil.isEmpty(recBigItem))
		{	
			log.debug(logTitle, '*** START ***' +  [scriptContext.type, recordId]);

			var bookData = {};

			bookData.shipDate = recBigItem.getValue('custrecord_sears_bigitemship_shipdate');
			bookData.timeSlot = recBigItem.getValue('custrecord_sears_bigitemship_timeslot');
			bookData.recordId = recBigItem.getValue('custrecord_sears_bigitemship_orderid');

			bookData.recordType = recBigItem.getValue('custrecord_sears_bigitemship_ordertype');
			bookData.bookId = stBigItemId;

			log.debug(logTitle, '>> Booking Data: ' + JSON.stringify(bookData) );

			// ** SEND THE ORDER *** //
			var resp = LibShipDelivery.sendOrder(bookData);
			log.debug(logTitle, '## response: ' + JSON.stringify(resp) );

			// reviewed by Nikhil on Aug13, 2016 as schedule shipping is throwing an error in premium, this code mostly added by Alex and team, need for them to remove or edit it from here		    
			if (bookData.recordId )
			{
				// validate // 
				if (!resp)
				{
					log.error(logTitle, 'No response found' );
				}
				else
				{
				
					if(resp.code == _SUCCESS && !NSUtil.isEmpty(resp.body))
					{
		            	try {
							var objBodyResp = JSON.parse(resp.body);
		            		log.debug(logTitle, '## Updating the Shipping data.. ' + JSON.stringify(objBodyResp));
		            		
		            		if (objBodyResp.shippingDate)
	            			{
		            			var dateObj = nformat.parse({value:objBodyResp.shippingDate, type:nformat.Type.DATE});
								var stDate = nformat.format({value : dateObj,type : nformat.Type.DATE});
								
								log.debug(logTitle, '... stDate: '+ stDate );
								
								//Set ShipDate
								var recObj = record.submitFields({
									type : 'salesorder',
									id : recordId,
									values :
									{
										'shipdate' : stDate
									}
								});
								
								log.debug(logTitle, '---- saved the SO: ' + recordId);
	            			}
							
		            	}catch(errClearD){
		            		log.error(logTitle, '** ERROR ** ' + errClearD.toString());
		            	}
					}
				}
			}
		}
	};

    return ImportOrderData;
});
