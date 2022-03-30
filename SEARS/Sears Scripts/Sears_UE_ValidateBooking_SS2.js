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
 * Module Description
 * 
 */
/**
 * Module Description
 *
 * Version 	Date 			Author 			Remarks
 * 1.00     07 July 2016 	bfeliciano	   	initial
 * 1.10 	27 Dec 2016 	Balaraman		ClearD Booking Error Message Column Field. Ref: /*b*./  and /*c*./ marked lines
 * 1.20 	19 Jan 2017 	Balaraman		Checking for "custbody_so_ready_for_postprocessing" flag,  * Big ticket item id "custbody_sears_booking_info". Ref: line num 74 to 83 lines
 * 1.30 	14 Feb 2017 	Rajivegandhi	ClearD Booking Error message at body field. Booking Failures counter body field. Ref: /*M180*./ marked lines
 * 1.40		17 Feb 2017		Rajivegandhi	Sent to ClearD Timestamp field added & data captured. Ref: /*t*./ marked lines
 * 1.50		17 Feb 2017		Remees 			Save Store id in SO form. Ref: /*t*./ marked lines
 */
/**
 * 
 * @NApiVersion 2.x
 * @NScriptType usereventscript
 */
define([ './NSUtil', './LibShipDelivery', 'N/record', 'N/url', 'N/search',
		'N/format', './LibClearD' ],

/**
 * @param {Object}
 *            NSUtil
 * @param {Object}
 *            LibClearD
 * @param {record}
 *            record
 * @param {url}
 *            url
 * @param {search}
 *            search
 */
function(NSUtil, LibShipDelivery, record, url, search, nformat, LibClearD) {
	var EntryPoint = {}, helper = {}, cache = {};
	var LibShipDelivery_Custom = {};
	var _LOGTITLE = 'ValidateBookingUE';

	/**
	 * @param {Object}
	 *            scriptContext
	 * @param {record.Record}
	 *            scriptContext.newRecord new record
	 * @param {String}
	 *            scriptContext.type trigger type
	 * @param {form}
	 *            scriptContext.form current form
	 * @memberOf userEvent
	 */
	EntryPoint.afterSubmit = function(scriptContext) {
		var logTitle = _LOGTITLE + '::afterSubmit';
		var doSaveTheOrder = false;
		
		if(scriptContext.newRecord.id == "" || scriptContext.newRecord.id == null || scriptContext.newRecord.id == undefined){
        	log.debug(logTitle, '## Invalid Record Id: ' + scriptContext.newRecord.id);

        	return;
        }
        log.debug('customLog');
        log.debug(record.Type.SALES_ORDER);
        log.debug('recordContext',scriptContext);
        log.debug(scriptContext.newRecord.id);

        var recSalesOrder = record.load({
            type : record.Type.SALES_ORDER,
            id : scriptContext.newRecord.id
        });

        

        var bigTicketItemId = recSalesOrder.getValue('custbody_sears_booking_info');
        log.debug(logTitle, '## bigTicketItemId: ' + bigTicketItemId);

        if(bigTicketItemId == "" || bigTicketItemId == null || bigTicketItemId == undefined){
        	log.debug(logTitle, '## Invalid bigTicketItemId: ' + bigTicketItemId);

        	return;
        }

        var isSoReadyForPostProcess = recSalesOrder.getValue('custbody_so_ready_for_postprocessing');

	        if(!isSoReadyForPostProcess){
	        	log.debug(logTitle, '## Error: SO is not ready for post processing');

	        	return;
	        }

		var recordObj = record.load({type:'customrecord_sears_bigitem_shipping', id:bigTicketItemId}); 
        log.debug('recordObj',recordObj);
		
		var bookStatus = recordObj.getValue('custrecord_sears_bigitemship_status');
		log.debug(logTitle, '*** START ***'
				+ [ scriptContext.type, recordObj.id, bookStatus ]);

		var bookData = {};
		
//		var doSaveTheOrder = false; moved to top

		bookData.shipDate = recordObj.getValue('custrecord_sears_bigitemship_shipdate');
		bookData.timeSlot = recordObj.getValue('custrecord_sears_bigitemship_timeslot');
		bookData.recordId = recordObj.getValue('custrecord_sears_bigitemship_orderid');

		// log.debug('recordid', bookData.recordId);
		bookData.recordType = recordObj.getValue('custrecord_sears_bigitemship_ordertype');
		bookData.bookId = recordObj.id;

		log.debug(logTitle, '>> Booking Data: ' + JSON.stringify(bookData));
		
		if (bookStatus == 'RESERVED' && bookData.recordId) {
			
			bookData.recordObj = recSalesOrder;
			
			var statusRef = recSalesOrder.getValue({fieldId:'orderstatus'});
			log.debug(logTitle, '>> order status: ' + statusRef );

			if(scriptContext.type=="create"){
				var option = helper.goclone(bookData);
				option.recordObj = helper.getOrderObj(option);
				log.debug(logTitle + '::option.recordObj', JSON.stringify(option.recordObj)); /************/
				if (! option.postalCode ){
					option.postalCode = option.recordObj.getValue({fieldId:'shipzip'});
				}
				
			}			


			if (statusRef == 'A') // PENDING APPROVAL
			{
				var isWebOrder = recSalesOrder.getValue({fieldId:'custbody_sears_createdfrom_dware'});
				if(!isWebOrder){ //skip only when the order is not web orderstatus
					log.debug(logTitle, '** SKIP BOOKING, ORder is not yet approved.');
					return;
				}
			}
			
			var externalId = recSalesOrder.getValue({fieldId:'externalid'});
			if (! externalId) return;

			// ** SEND THE ORDER *** //
			var resp = LibShipDelivery.sendOrder(bookData);
			log.debug(logTitle, '## response: ' + JSON.stringify(resp));

			// validate //
/*b*/		if (resp.success !== undefined && resp.success == false) {
				/*set booking error status on the column custcol_cleard_booking_error*/
/*				var option = helper.goclone(bookData);

				option.recordObj = helper.getOrderObj(option);
				
				if (! option.postalCode )
				{
					option.postalCode = option.recordObj.getValue({fieldId:'shipzip'});
				}

				var orderData = helper.getOrderData(option);

				if(orderData){
					for(task in orderData.order.tasks){
						var lineNo = recSalesOrder.findSublistLineWithValue({
														sublistId: 'item', 
														fieldId: 'custcol_externalid',
														value: orderData.order.tasks[task].sku
									});
						//log.debug("X::line number", lineNo);
						
						if(lineNo > -1){
							recSalesOrder.setSublistValue({
								sublistId : 'item',
								fieldId : 'custcol_cleard_booking_error',
								line : lineNo,
								value: resp.message
							});
						}
					}
/*b*./			}*/


/*M180*/		recSalesOrder.setValue({
					fieldId: 'custbody_cleard_booking_error',
					value: resp.message
				});

				
				
				var bookingFailures = recSalesOrder.getValue({fieldId: 'custbody_booking_failures'});
				if(bookingFailures !== '' && bookingFailures !== null){
					bookingFailures = parseInt(bookingFailures) + 1;
				}else{
					bookingFailures = 1;
				}

				recSalesOrder.setValue({
					fieldId: 'custbody_booking_failures',
					value: bookingFailures
				});
				
				doSaveTheOrder = true;
/*M180*/		log.debug(logTitle + "::setBookingErrorMessage::", resp.success + ' saved with booking error message');

				log.debug(logTitle, '---- unset the import order');
				recSalesOrder.setValue({
					fieldId : 'custbodyimport_order_failed',
					value : true
				});
			} else if (resp.code == 200 && !NSUtil.isEmpty(resp)) {
				
				var objBodyResp = JSON.parse(resp.body);
				log.debug(logTitle, '## Updating the Shipping data.. ' + JSON.stringify(objBodyResp));
/*r*/			
				log.debug(logTitle, '## destinationLocationId.. ' + objBodyResp.itemInfos[0].item.destinationLocationId);
				if (objBodyResp.itemInfos[0].item.destinationLocationId !== undefined){
					recSalesOrder.setValue({
						fieldId: 'custbody_store_location_id',
						value: objBodyResp.itemInfos[0].item.destinationLocationId
					});
				}
				
/*r*/
				if (objBodyResp.itemInfos && objBodyResp.itemInfos.length)
				{
					objBodyResp.itemInfos.forEach(function(itemResponse){
						
						var itemNumber = itemResponse.item.sku;
						var lineNo = recSalesOrder.findSublistLineWithValue({
										sublistId: 'item', 
										fieldId: 'custcol_externalid',
										value: itemNumber});
						log.debug(logTitle, '.... item number:   ' + JSON.stringify([itemResponse, itemNumber, lineNo]));
						if ( lineNo > -1)
						{
							var dateShipping = nformat.parse({value : itemResponse.shippingDate, type : nformat.Type.DATE });
							log.debug(logTitle, '.... !fond! dateShipping:   ' + JSON.stringify([itemResponse.shippingDate, dateShipping]));
							
							if (dateShipping)
							{
								recSalesOrder.setSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_ship_date',
									value : dateShipping,
									line : lineNo
								});
								
								recSalesOrder.setSublistValue({
									sublistId : 'item',
									fieldId : 'custcolsent_to_cleard',
									value : true,
									line : lineNo
								});
								
								recSalesOrder.setValue({
									fieldId : 'custbodyimport_order_failed',
									value : false
								});

/*c*/							recSalesOrder.setSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_cleard_tracking_number',
									line : lineNo,
									value: objBodyResp.importTrackingNumber
/*c*/							});

/*t*/							recSalesOrder.setSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_sent_to_cleard_timestamp',
									line : lineNo,
									value: helper.getTimeStamp()
/*t*/							});
								
								doSaveTheOrder = true;
							}
						}
					});
				}
			}
			
			if  (doSaveTheOrder)
			{
				try{
					var result = recSalesOrder.save({
						enableSourcing : false,
						ignoreMandatoryFields : true,
						disableTriggers:true
					});
				}catch(error){
					log.debug(logTitle, '---- save error: ' + error);
				}

				log.debug(logTitle, '---- saved the SO: ' + result);
			}
			else
			{
				log.debug(logTitle, '---- no update to the SO: ');
			}

		} else if (bookStatus == 'PENDING-CANCEL') {
			var resp = LibShipDelivery.cancelOrder(bookData);
		}else if (bookStatus != 'RESERVED' || bookData.recordId==null ) {
			log.debug(logTitle, '---- Booking status not reserved or  Booking ID not available '+" bookStatus : "+bookStatus+" recordId : "+bookData.recordId);
		}
	};

	/**
	 * @memberOf helper
	 */
	helper.getOrderData = function (option)
	{
		var objAddrData = helper.getOrderShipAddress(option);
		log.debug('helper.getOrderData', '## objAddrData: ' + JSON.stringify(objAddrData) );

		var recCustomer = record.load({type:'customer', id: option.recordObj.getValue({fieldId:'entity'}) });

//		var shipData = option.shipDate.split('T');
		
		var date = new Date();
		date.setDate(date.getDate() + 1);
//		//var objStartEndDate = helper.getStartAndEndDateTime(option, date);
//		log.debug('helper.getOrderData', '## objStartEndDate: ' + JSON.stringify(objStartEndDate) );
		
		var mapStateIds = {};
		var objConfig = LibClearD.getConfigValues();
		if (objConfig.stateidMap)
		{
			mapStateIds = JSON.parse(objConfig.stateidMap);
		}

		var mappedStateId = null;

		if (objAddrData.stateId)
		{
			for (var mapId in mapStateIds)
			{
				if (NSUtil.inArray(objAddrData.stateId, mapStateIds[mapId] ) )
				{
					mappedStateId = mapId;
					break;
				}
			}
		}

		var orderData =
		{
			"invoiceNumber" : option.recordObj.getValue({fieldId : 'externalid'}) || "",
			"originType" : 3,
			"originCustomerNumber": (option.recordObj.getValue({fieldId : 'custbody_phone_billing'}) || "").replace("-",""),
			"originPhoneNumber1": (option.recordObj.getValue({fieldId : 'custbody_phone_billing'}) || "").replace("-",""),
//			"originDate" : option.recordObj.getValue({fieldId : 'trandate'})  || "",
			"originDate" : option.shipDate || "",
			"destinationType" : 1,
			"destinationCivic" : "", // objAddrData.doorNo || "",
			"destinationStreet" : [objAddrData.doorNo, objAddrData.street].join(' ') || "",
			"destinationCity" : objAddrData.city || "",
			"destinationProvinceID" : mappedStateId,
			"destinationPostalCode" : objAddrData.postalCode || "",
			"destinationCustomerFirstName" : recCustomer.getValue({fieldId:'firstname'}) || "",
			"destinationCustomerLastName" : recCustomer.getValue({fieldId:'lastname'}) || "",
//			"destinationCustomerPhoneNumber1": option.recordObj.getValue({fieldId : 'custbody_phone_wms'}) || "",
			"destinationCustomerNumber": (option.recordObj.getValue({fieldId : 'custbody_phone_shipping'}) || "").replace(/[^0-9]+/g, ""),
			"destinationPhoneNumber1": (option.recordObj.getValue({fieldId : 'custbody_phone_shipping'}) || "").replace(/[^0-9]+/g, ""),
			"destinationDate" : option.shipDate || "",
			"destinationStartTime" : option.shipDate || "",//"09:00:00",
			"destinationEndTime" : option.shipDate || "",//"11:00:00",			
			"destinationIsCallAllowed" : true,
			"tasks" : []
		};
            
		
		// Fixes for the following date values // 
		var arrDateFields = ['originDate','destinationDate','destinationStartTime','destinationEndTime'];
		arrDateFields.forEach(function (dateField)
		{
			var dateValue = orderData[dateField];
			if (dateValue)
			{
				var dateObj = nformat.parse({value:dateValue, type:nformat.Type.DATE});
				orderData[dateField] = nformat.format({value:dateObj, type:nformat.Type.DATE});
			}
		});
		
		//lets get the mapping
		var objConfig = LibClearD.getConfigValues();
		var mapLocation = {};
		if (objConfig.locationMap)
		{
			mapLocation = JSON.parse(objConfig.locationMap);
		}
		
		var arrBigItems = LibShipDelivery.findBigTicketItems(option);
		arrBigItems.forEach(function(itemData){

			var lineNo = itemData.line;
			
			var locationId = option.recordObj.getSublistValue({sublistId:'item', fieldId:'location', line: lineNo});
			var mappedLocationId = mapLocation[locationId] ? mapLocation[locationId].id : null;
			
			if (mappedLocationId)
			{
				var taskData =
				{
					"taskType" : "D",
					"sku" : option.recordObj.getSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_externalid',
						line : lineNo
					}) || '',
					"skuDescription" : option.recordObj.getSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_searsitemname',
						line : lineNo
					}) || '',
					"quantity" : itemData.quantity,
					"volume" : itemData.quantity,
					"serviceTime" :600,
					"originLocationId": mappedLocationId,
					"serialNumber" : option.recordObj.getSublistValue({
						sublistId : 'item',
						fieldId : 'item',
						line : lineNo
					}) || ''
				};
				
				orderData.tasks.push(taskData);
			}
		});
		
		log.debug('helper.getOrderData', '*** ORDER DATA: ' + JSON.stringify(orderData) );
		return {'order':orderData};
	};

	/**
	 * @memberOf helper
	 */
	helper.getOrderShipAddress = function (option)
	{
		var addrData = {};
		
		if (option.recordObj)
		{
		    var arrShipdata = search.lookupFields({
                type: 'salesorder',
                id: option.recordObj.id,
                columns: ['shipaddress', 'shipcity', 'shipcountry']
            });
		    var arrAddressLines  = arrShipdata.shipaddress.split(/\n/);
		    
	        addrData = {
                'doorNo':    arrAddressLines[1],                                          
                'street':    arrAddressLines[2],
                'city'  :    arrShipdata.shipcity,
                'stateId':   option.recordObj.getValue({fieldId:'shipstate'}),
                'country':   option.recordObj.getValue({fieldId:'shipcountry'}),
                'postalCodeOriginal':option.recordObj.getValue({fieldId:'shipzip'})
            };
	        
	        log.debug('getOrderShipAddress', '##getOrderShipAddress: ' + JSON.stringify([arrShipdata, arrAddressLines]));
		}
		else
		{
	        addrData = {
	                'doorNo':    option.shipaddr1,                                          
	                'street':    option.shipaddr1,
	                'city'  :    option.shipcity,
	                'stateId':   option.shipstate,
	                'country':   option.shipcountry,
	                'postalCodeOriginal':option.postalCode
	            };
		}
		
		log.debug('getOrderShipAddress', '##getOrderShipAddress: ' + JSON.stringify([addrData]));
        
        if (addrData.postalCodeOriginal)
    	{
        	addrData.postalCode =  addrData.postalCodeOriginal.split(/\s+?/ig).join('');
    	}
        
	    
	    try {
	        var mAddr = addrData.doorNo.match(/^\d+\w*\s*(?:(?:[\-\/]?\s*)?\d*(?:\s*\d+\/\s*)?\d+)?\s+/i);
	        log.debug('getOrderShipAddress', '##regex values: ' + JSON.stringify([mAddr]));
	        
	        var mAddr2 = addrData.doorNo.split(mAddr[0]);
	        log.debug('getOrderShipAddress', '##regex values: ' + JSON.stringify([mAddr2]));
	        
	        addrData.doorNo = mAddr[0].trim();
	        addrData.street = mAddr2[1];
	        
	        log.debug('getOrderShipAddress', '##regex values: ' + JSON.stringify([addrData]));
	    }
	    catch (err){}
	    log.debug('getOrderShipAddress', '##adrrData: ' + JSON.stringify(addrData));
	    
	    for (var addrfld in addrData)
    	{
	    	var addrValue = addrData[addrfld];
	    	addrValue.replace(/[\r\n]/ig, '');
    	
    	}
	    
	    return addrData;
	};

	/**
	 * @memberOf helper
	 */
	helper.getOrderObj = function (option)
	{
		var recordObj = null;
		try
		{
			if (option.recordObj)
			{
				recordObj = option.recordObj;
			}
			else if (!NSUtil.isEmpty(option.recordType) && !NSUtil.isEmpty(option.recordId) )
			{
				recordObj = record.load({type: option.recordType, id: option.recordId});
			}
		}
		catch (error)
		{
			// todo: handle error messages
		}

		return recordObj;
	};

	/* Get current timestamp for cleard booking. suitescript v2.0*/
	helper.getClearDTimeStamp = function(){
		var timeStamp = new Date();
		timeStamp = nformat.parse({
			value : timeStamp,
			type : nformat.Type.DATE
		});
log.debug('timeStamp::', timeStamp);
		return timeStamp;
	}

	/*get current timestamp in iso formate. normal methode*/
	helper.getTimeStamp = function(){
		var d = new Date();
  		return d.toISOString();
	}

	/*copy object values but not referencing the source object*/
	helper.goclone = function (source) {
	    if (Object.prototype.toString.call(source) === '[object Array]') {
	        var clone = [];
	        for (var i=0; i<source.length; i++) {
	            clone[i] = helper.goclone(source[i]);
	        }
	        return clone;
	    } else if (typeof(source)=="object") {
	        var clone = {};
	        for (var prop in source) {
	            if (source.hasOwnProperty(prop)) {
	                clone[prop] = helper.goclone(source[prop]);
	            }
	        }
	        return clone;
	    } else {
	        return source;
	    }
	}

    /**
     * 
     */
    function getNearestAvailableLocation(stProvince) {
        var stLogTitle = 'getNearestAvailableLocation';
        log.debug(stLogTitle, '>> Entry Log <<');
        log.debug(stLogTitle, 'Province : ' + stProvince);
        // Hold the location data
        var objLocationData = null;
        var arrFilters = [];
        arrFilters.push(search.createFilter({name: 'isinactive', operator: 'IS', values : ['F']}));
        // Set the column
        var arrColumns = [];
        arrColumns.push(search.createColumn({name: 'custrecord_avail_loc_mapping_big_ticket'}));
        arrColumns.push(search.createColumn({name: 'custrecord_avail_loc_mapping_small_tcket'}));
        arrColumns.push(search.createColumn({name: 'custrecord_avail_loc_mapping_province'}));
        // Create levy amount search
        var objNearestLoSearch = search.create({
        	type: 'customrecord_nearest_avail_loc_mapping',
        	columns: arrColumns,
        	filters: arrFilters
        });
        // Run search and get the last instance of levy amount
        objNearestLoSearch.run().each(function(result) {
        	// Compare the province
        	if (result.getText('custrecord_avail_loc_mapping_province') == stProvince) {
            	// Get levy amount
            	objLocationData = result;
        	}
        	return true;
        });
        log.debug(stLogTitle, 'Return : ' + JSON.stringify(objLocationData));
        log.debug(stLogTitle, '>> Exit Log <<');
        return objLocationData;
    }
    
	return EntryPoint;
});