/**
  * @NModuleScope Public
 * @NApiVersion 2.x
 */
/**
 * Version      Date            Author      	Remark  
 * 1.0          27-Jan-2017     Balaraman   	To set OriginLocationId value (one among 1, 4, 7 & 37) (by default) for booking with CleadD service, without failure. Refrence: /*n*./ marked lines
 * 1.1 			01-Feb-2017		Balaraman		1) To Set Items packaging Volume information to the ClearD.     2) Version 1.0 disabled and the issue is fixed by General Preferene parameter in Netsuite. 
 * 1.2 			02-Feb-2017		Rajivegandhi	Addressee Name set as the shipping customer name for ClearD Booking.  Reference: /*c*./ marked lines
 * 1.3          03-Feb-2017     Sathiya Vedamurthi Removed the serial number parameter to clear d, refernce : *serial*
 * 1.4			16-Feb-2017		Manikandan		Validating delivery date to not to be a past date, also considering 2 day buffer in availabledates.  reference : *delDate*
 */
define(['./NSUtil', './LibClearD','N/record', 'N/search','N/format', 'N/runtime'],
/**
 * @param {Object} nsutil
 * @param {Object} LibClearD
 * @param {record} record
 * @param {search} search
 * @param {format} format
 * @param {runtime} runtime
 */
function(nsutil, LibClearD, record, search, format, runtime)
{
	var LibShipDelivery = {
			orderId: null,
			orderRecord: null,
			addressData: null
	},
	cache = {},
	helper = {};
	
	var LOG_TITLE = 'LibShipDelivery';

	var showDummy = false;

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.sendOrder = function (option)
	{
		var logTitle = [LOG_TITLE, 'sendOrder'].join('::');
		//var reqFlds = ['shipDate','timeSlot','recordId','recordType','bookId'];
		var reqFlds = ['shipDate','recordId','recordType','bookId'];
		var hasMissing = [];
		for (var i = 0,j = reqFlds.length; i < j; i ++)
		{
			var fld = reqFlds[i];
			if(nsutil.isEmpty( option[fld]))
			{
				hasMissing.push(fld);
			}
		}
		if (hasMissing.length)
		{
			log.error(logTitle, '--Missing fields: ' + hasMissing.join(', '));
			return false;
		}

		option.recordObj = helper.getOrderObj(option);
		if (! option.postalCode )
		{
			option.postalCode = option.recordObj.getValue({fieldId:'shipzip'});
		}

		var orderData = helper.getOrderData(option);

		log.debug(logTitle, 'Order Data : ' + JSON.stringify(orderData));

		log.debug("Order Details", "First Name : "+orderData.order.destinationCustomerFirstName+" | Last Name : "+orderData.order.destinationCustomerLastName+' | InvoiceNumber : ' + orderData.order.invoiceNumber+" | destinationStreet : "+orderData.order.destinationStreet+" | destinationCity : "+orderData.order.destinationCity+" | destinationPostalCode : "+orderData.order.destinationPostalCode+" | Item ID : "+orderData['order']["tasks"][0]["sku"]);


		//delDate START
		//validation for destinationDate to not be a past date
        var destinationDate = orderData.order.destinationDate;
		if(LibShipDelivery.isPastDate(destinationDate)) {
			var pastDateErrorMessage = 'Booking not attempted, delivery date in past';
			log.error(logTitle, 'Error Message :: destinationDate Validation :' + pastDateErrorMessage);
			return {success:false,message:pastDateErrorMessage};
		}
		//delDate END

		var phoneNumber = orderData.order.destinationPhoneNumber1;
		if(!phoneNumber){
			log.debug(logTitle, 'Big ticket shipping can`t be scheduled as customer phone number is missing');
			return;
		}


// /*n*/	var originLocationId = "1";
// /*n*/	var tasks = orderData['order']["tasks"];
// 		tasks.forEach(function(task){
// 			task["originLocationId"] = originLocationId;
// 		});
// /*n*/	log.debug(logTitle + "ORDER DATA WITH LOCATION ID", JSON.stringify(orderData));

/*c*/	//Fix: Set address value as customer name for ClearD Booking
		var customerId = option.recordObj.getValue({ fieldId: 'entity'});
		
		if(!nsutil.isEmpty(customerId)){
			var address = search.lookupFields({
				type: 'customer',
				id: customerId,
				columns: ['shipaddressee']
			});
			if(!nsutil.isEmpty(address)){
				address = address.shipaddressee.split(' ');
				orderData.order.destinationCustomerFirstName = (address[0] == undefined ? "" :  address[0]);
				orderData.order.destinationCustomerLastName = (address[1] == undefined ? "" :  address[1]);
				log.debug(logTitle + '::Setting Addressee', JSON.stringify(orderData));
			}else{
				log.debug(logTitle + '::Error', 'Invalid Shipping Addressee');
			}
		}

/*c*/

/*h*/	//for setting inventory items volume to clearD order data
		var tasks = orderData['order']["tasks"];

		if(!nsutil.isEmpty(tasks)){
			tasks.forEach(function(task){
				if(!nsutil.isEmpty(task['sku'])){
					var has_send_to_cleard_api = LibShipDelivery.has_send_to_cleard(option.recordObj, task['sku']);

					if(!has_send_to_cleard_api){
						var volume = LibShipDelivery.getInventoryItemVolume(task['sku']);

						if(volume){
							if(parseFloat(volume) !== 0){
								task["volume"] = volume;
								log.debug(logTitle + '::Setting volume value: ' + volume, JSON.stringify(orderData));
							}
						}
					}
				}
			});
		}
/*h*/

		var response = LibClearD.importOrder(orderData);

		log.debug(logTitle, '--option : ' + JSON.stringify(option));
		log.debug(logTitle, '--response : ' + JSON.stringify(response));

		var objChangesOrderData  = {};
		var objChangesShippingData = {};
		
		objChangesShippingData.custrecord_sears_bigitemship_request = JSON.stringify(orderData);
		objChangesShippingData.custrecord_sears_bigitemship_response = JSON.stringify(response);
		
		if(response.code == '200')
		{
			objChangesShippingData.custrecord_sears_bigitemship_status = 'BOOKED';
			objChangesOrderData.custbodyimport_order_failed = false;
			
//        	///////////////////////////////////////////////
//        	try {
//				var objBodyResp = JSON.parse(response.body);
//        		log.debug(logTitle, '## Updating the Shipping data.. ' + JSON.stringify(objBodyResp));
//        		
//        		if (objBodyResp.shippingDate)
//    			{
//					objChangesOrderData.shipdate = format.parse({value:objBodyResp.shippingDate, type:format.Type.DATE});
//    			}
//        	}catch(errClearD){
//        		log.error(logTitle, '** ERROR ** ' + errClearD.toString());
//        	}
		}
		else
		{
			log.debug("Failed Order Details", "First Name : "+orderData.order.destinationCustomerFirstName+" | Last Name : "+orderData.order.destinationCustomerLastName+' | InvoiceNumber : ' + orderData.order.invoiceNumber+" | destinationStreet : "+orderData.order.destinationStreet+" | destinationCity : "+orderData.order.destinationCity+" | destinationPostalCode : "+orderData.order.destinationPostalCode+" | Item ID : "+orderData['order']["tasks"][0]["sku"]);
			objChangesShippingData.custrecord_sears_bigitemship_status = 'FAILED';
			objChangesOrderData.custbodyimport_order_failed = true;
		}
		
		log.debug(logTitle, '## BOOKING ID CHANGES: ' + JSON.stringify([option.bookId, objChangesShippingData]) );
		
		if (option.bookId)
		{
			record.submitFields({
						type : 'customrecord_sears_bigitem_shipping',
						id : option.bookId,
						values: objChangesShippingData
					});
		}
		
		log.debug(logTitle, '## ORDER ID CHANGES: ' + JSON.stringify([option.recordId, option.recordType, objChangesOrderData]) );
//		if (option.recordId && option.recordType)
//		{
//			record.submitFields({
//						type : option.recordType,
//						id : option.recordId,
//						values: objChangesOrderData
//					});
//		}
		
		return response;
	};

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.cancelOrder = function (option)
	{
		var logTitle = [LOG_TITLE, 'cancelOrder'].join('::');

		var reqFlds = ['recordId','recordType','bookId'];
		var hasMissing = [];
		for (var i = 0,j = reqFlds.length; i < j; i ++)
		{
			var fld = reqFlds[i];
			if(nsutil.isEmpty( option[fld]))
			{
				hasMissing.push(fld);
			}
		}
		if (hasMissing.length)
		{
			log.error(logTitle, '--Missing fields: ' + hasMissing.join(', '));
			return false;
		}
		option.recordObj = helper.getOrderObj(option);

		var invoiceNumber = option.recordObj.getValue({fieldId:'externalid'});

		var response = LibClearD.cancelInvoice(invoiceNumber);

		log.error(logTitle, '--option : ' + JSON.stringify(option));
		log.error(logTitle, '--response : ' + JSON.stringify(response));

		if(response.code != '200')
		{
			record.submitFields(
			{
				type : 'customrecord_sears_bigitem_shipping',
				id : option.bookId,
				values: {
					'custrecord_sears_bigitemship_status': 'CANCELLED',
					'custrecord_sears_bigitemship_request': JSON.stringify(invoiceNumber),
					'custrecord_sears_bigitemship_response': JSON.stringify(response),
				}
			});
		}
		else
		{
			record.submitFields(
			{
				type : 'customrecord_sears_bigitem_shipping',
				id : option.bookId,
				values: {
					'custrecord_sears_bigitemship_status': 'FAILED',
					'custrecord_sears_bigitemship_request': JSON.stringify(invoiceNumber),
					'custrecord_sears_bigitemship_response': JSON.stringify(response),
				}
			});
		}


		return response;
	};
	/**
	 {
					"taskId" : 0,
					"previousTaskId" : 0,
					"successorTaskId" : 0,
					"executionStart" : "2016-09-30T20:07:30.182Z",
					"executionEnd" : "2016-09-30T20:07:30.182Z",
					"location" : {
						"locationId" : 0,
						"address" : {
							"civic" : "string",
							"unit" : "string",
							"street" : "string",
							"city" : "string",
							"zip" : "string",
							"stateId" : 0,
							"countryId" : 0
						},
						"latitude" : 0,
						"longitude" : 0,
						"commonLocationTypeId" : 0
					},
					"item" : {
						"sku" : "string",
						"skuDescription" : "string",
						"barcode" : "string",
						"originLocationId" : 0,
						"volume" : 0,
						"serialNumber" : "string"
					},
					"duration" : 0,
					"taskType" : "string",
					"taskNote" : "string"
				} 		 * 
			 */

	/**
	 * @memberOf helper
	 */
	helper.getOrderData_v12 = function (option)
	{
		var objAddrData = helper.getOrderShipAddress(option);
		log.debug('helper.getOrderData', '## objAddrData: ' + JSON.stringify(objAddrData) );

		var recCustomer = record.load({type:'customer', id: option.recordObj.getValue({fieldId:'entity'}) });
		
		var date = new Date();
		date.setDate(date.getDate() + 1);

		var orderData = {
			"invoice" : option.recordObj.getValue({fieldId : 'externalid'}) || "",
			"businesssUnitId" : LibClearD.getBusinessId(),
			"tasks" : [],
			"customer" : {
				"accountNumber" : recCustomer.id.toString(),
				"firstName" : recCustomer.getValue({fieldId:'firstname'}) || "",
				"lastName" : recCustomer.getValue({fieldId:'lastname'}) || "",
				"primaryPhone" : (recCustomer.getValue({fieldId:'phone'}) || "").replace("-",""),
				"secondaryPhone" : (recCustomer.getValue({fieldId:'altphone'}) || "").replace("-","")
			},
			"volume" : 0
		};
		
		var arrBigItems = LibShipDelivery.findBigTicketItems(option);
		arrBigItems.forEach(function(itemData){
			var lineNo = itemData.line;
			var taskData = {
				"taskId" : lineNo,
				/*
				"previousTaskId" : 0,
				"successorTaskId" : 0,
				"executionStart" : "2016-09-30T20:07:30.182Z",
				"executionEnd" : "2016-09-30T20:07:30.182Z",
				*/
				"location" : {
					//"locationId" : 0,
					"address" : {
						"civic" : "",
						"unit" :  "",
						"street" : [objAddrData.doorNo, objAddrData.street].join(' ') || "",
						"city" : objAddrData.city || "",
						"zip" : objAddrData.postalCode || "",
						"stateId" : objAddrData.stateId || "",
						"countryId" : objAddrData.country || ""
					}
					/*,
					"latitude" : 0,
					"longitude" : 0,
					"commonLocationTypeId" : 0*/
				},
				"item" : {
					"sku" : option.recordObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_externalid',line : lineNo}) || '',
					"skuDescription" : option.recordObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_searsitemname',line : lineNo}) || '',
					"barcode" : "",
					"originLocationId" : option.recordObj.getSublistValue({sublistId : 'item',fieldId : 'location',line : lineNo}) || '',
					"volume" : itemData.quantity,
					"serialNumber" : option.recordObj.getSublistValue({sublistId : 'item',fieldId : 'item',line : lineNo}) || ''
				},
				"duration" : 0,
				"taskType" : "D",
				"taskNote" : ""
			};
			orderData.tasks.push(taskData);
		});
		
		
//		// Fixes for the following date values // 
//		var arrDateFields = ['originDate','destinationDate','destinationStartTime','destinationEndTime'];
//		arrDateFields.forEach(function (dateField)
//		{
//			var dateValue = orderData[dateField];
//			if (dateValue)
//			{
//				var dateObj = format.parse({value:dateValue, type:format.Type.DATE});
//				orderData[dateField] = format.format({value:dateObj, type:format.Type.DATE});
//			}
//		});
		
		
		log.debug('helper.getOrderData', '*** ORDER DATA v1.2: ' + JSON.stringify(orderData) );
		return {'order':orderData};
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
		var mapStoreIds = {};
		var objConfig = LibClearD.getConfigValues();
		if (objConfig.stateidMap)
		{
			mapStateIds = JSON.parse(objConfig.stateidMap);
		}
		if (objConfig.storeidMap)
		{
			log.debug('helper.getOrderData', '>> Store Location list: ' + JSON.stringify(objConfig.storeidMap));
			mapStoreIds = JSON.parse(JSON.stringify(objConfig.storeidMap));
		}

		var mappedStateId = null;

		if (objAddrData.stateId)
		{
			for (var mapId in mapStateIds)
			{
				if (nsutil.inArray(objAddrData.stateId, mapStateIds[mapId] ) )
				{
					mappedStateId = mapId;
					break;
				}
			}
		}
		var destinationType = 1;
		var taskType = "D";
		var isShipToStore = option.recordObj.getValue('custbody_ship_to_store');

        if(isShipToStore){
        	destinationType = 6;
        	taskType = "CUSTOMER-PICK-UP"
        }

		var orderData =
		{
			"invoiceNumber" : option.recordObj.getValue({fieldId : 'externalid'}) || "",
			"originType" : 3,
			"originCustomerNumber": (option.recordObj.getValue({fieldId : 'custbody_phone_billing'}) || "").replace(/[^0-9]+/g, ""),
			"originPhoneNumber1": (option.recordObj.getValue({fieldId : 'custbody_phone_billing'}) || "").replace(/[^0-9]+/g, ""),
//			"originDate" : option.recordObj.getValue({fieldId : 'trandate'})  || "",
			"originDate" : option.shipDate || "",
			"destinationType" : destinationType,
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
				var dateObj = format.parse({value:dateValue, type:format.Type.DATE});
				orderData[dateField] = format.format({value:dateObj, type:format.Type.DATE});
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
		log.debug('helper.getOrderData', '*** BIg Ticket Items: ' + JSON.stringify(orderData) );
		arrBigItems.forEach(function(itemData){

			var lineNo = itemData.line;
			
			var locationId = option.recordObj.getSublistValue({sublistId:'item', fieldId:'location', line: lineNo});
			var mappedLocationId = mapLocation[locationId] ? mapLocation[locationId].id : null;
			
		    log.debug('helper.getOrderData', '*** locationId: ' + JSON.stringify(mapLocation) );

			log.debug('helper.getOrderData', '*** locationId: ' + JSON.stringify(locationId) );

			log.debug('helper.getOrderData', '*** mappedLocationId: ' + JSON.stringify(mappedLocationId) );
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
					"originLocationId": mappedLocationId/* *serial* ,
					"serialNumber" : option.recordObj.getSublistValue({
						sublistId : 'item',
						fieldId : 'item',
						line : lineNo
					}) || ''*/
				};

				if(isShipToStore){
					if(!(mapStoreIds[objAddrData.postalCode] == null || mapStoreIds[objAddrData.postalCode] == undefined)){
						taskData["destinationLocationId"] = mapStoreIds[objAddrData.postalCode] ;
                	}else{
                	   log.debug('helper.getOrderData', '>> Store Location not match with: ' + objAddrData.postalCode );

                		return ;
                	}
				}
				
			log.debug('helper.getOrderData', '*** taskData: ' + JSON.stringify(taskData) );

				orderData.tasks.push(taskData);
			}
		});
		
		log.debug('helper.getOrderData', '*** ORDER DATA: ' + JSON.stringify(orderData));
		return {'order':orderData};
	};

	/**
	 * @memberOf helper
	 */
	helper.getStartAndEndDateTime = function (option, date) 
	{
	    log.debug('getStartAndEndDateTime', [option, date]);
	    
		var arrTime = option.timeSlot.split('-');
		var hours = null;
		var minutes = null;
		var AMPM = null;
		var objDateAndTime = new Object();
		var stTime = null;
		var startDateTime = null;
		var endDateTime = null;
		for (var intIndex = 0; intIndex < arrTime.length; intIndex++) {
			stTime = arrTime[intIndex];
	        hours = Number(stTime.match(/^(\d+)/)[1]);
	        minutes = Number(stTime.match(/:(\d+)/)[1]);
	        AMPM = stTime.match(/\s(.*)$/)[1];
	        if (AMPM == "PM" && hours < 12) hours = hours + 12;
	        if (AMPM == "AM" && hours == 12) hours = hours - 12;
	        if (nsutil.isEmpty(objDateAndTime.start)) {
                startDateTime =  new Date();
                startDateTime.setDate(date.getDate() + 1);
                startDateTime.setHours(hours, minutes);
                objDateAndTime.start = startDateTime ;
	        } else {
                endDateTime =  new Date();
                endDateTime.setDate(date.getDate() + 1);
                endDateTime.setHours(hours, minutes);
                objDateAndTime.end = endDateTime;
	        }
		}
		return objDateAndTime;
	}

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.getAvailableDates_v1 = function ( option )
	{
		var logTitle = [LOG_TITLE, 'getAvailableDates'].join('::');

		log.debug(logTitle, '## options: ' + JSON.stringify(option));

		if (!option.startDate || !option.days)
		{
			log.error(logTitle, '-- startdate and days are required');
			return false;
		}

		if (! option.postalCode )
		{
			option.recordObj = helper.getOrderObj(option);
			if (! option.recordObj){
				log.error(logTitle, '-- invalid record object');
//				return false;
			}
//			else
//			{
//				option.postalCode = 'H2H1X8';//option.recordObj.getValue({fieldId:'shipzip'});//
//			}
		}
		if (! option.postalCode )
		{
			log.error(logTitle, '-- postal Code is required!');
//			return false;
		}

		if (! option.volume )
		{
			if (! option.recordObj)
			{
				log.error(logTitle, '-- invalid record object');
//				return false;
			}
			var arrItems = this.findBigTicketItems(option);
			var totalqty = 0;

			arrItems.forEach(function(itemData, idx){
				totalqty+=itemData.quantity;
			});

			option.volume = totalqty;
		}

		var response = LibClearD.getAvailability(option.postalCode, option.startDate, option.days,  option.volume );

		log.debug(logTitle, '>> response: ' + JSON.stringify(response) );


		var arrAvailableDates = [];

		if (response.code == 200)
		{
			var jsonBody = JSON.parse( response.body );

			jsonBody.forEach(function(row, idx){
				if (row.isAvailable)
				{
					var dateStr = format.parse({value: row.date, type: format.Type.DATE});
					arrAvailableDates.push(dateStr);
				}
			});
		}

		return arrAvailableDates;
	};
	
	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.getAvailableDates = function ( option )
	{
		var logTitle = [LOG_TITLE, 'getAvailableDates'].join('::');

		log.debug(logTitle, '## options: ' + JSON.stringify(option));
		
		var arrAvailableDates = [];

		if (!option.startDate || !option.days)
		{
			log.error(logTitle, '-- startdate and days are required');
			return false;
		}

		
		try {
			var objConfig = LibClearD.getConfigValues();
			var mapLocation = {}, mapStateIds = {}, mapStoreIds = {};

			if (objConfig.locationMap)
			{
				mapLocation = JSON.parse(objConfig.locationMap);
			}
			if (objConfig.stateidMap)
			{
				mapStateIds = JSON.parse(objConfig.stateidMap);
			}
			if (objConfig.storeidMap)
			{
				log.debug(logTitle, '>> Store Location list: ' + JSON.stringify(objConfig.storeidMap));
				mapStoreIds = JSON.parse(JSON.stringify(objConfig.storeidMap));
			}

			var objAddrData = helper.getOrderShipAddress(option);
			var mappedStateId = null;
			log.debug(logTitle, '>> Location from helper: ' + JSON.stringify(objAddrData) );

			if (objAddrData.stateId)
			{
				for (var mapId in mapStateIds)
				{
					if (nsutil.inArray(objAddrData.stateId, mapStateIds[mapId] ) )
					{
						mappedStateId = mapId;
						break;
					}
				}
			}
			
			var objLocation = {
				"address" : {
					"civic" : "",
					"unit" :  "",
					"street" : [objAddrData.doorNo, objAddrData.street].join(' ') || "",
					"city" : objAddrData.city || "",
					"zip" : objAddrData.postalCode || "",
					"stateId" : mappedStateId || "",
					"countryId" : objAddrData.country || "",
				}
			};
			

		   log.debug(logTitle, 'ShipToStore: ' + option.isShipToStore);
		   log.debug(logTitle, 'days: ' + option.days);
	         
			var arrBigTicktItems = JSON.parse(option.bigticket);
			var arrItemData = [];
			
			arrBigTicktItems.forEach(function(bigItemData){
				var locationId = bigItemData.location;
				var mappedLocationId = mapLocation[locationId] ? mapLocation[locationId].id : 0;
				
				var itemData =  {
					"sku" : bigItemData.externalid || bigItemData.itemid,
					"skuDescription" : "",
					"barcode" : "",
					"originLocationId" : mappedLocationId.toString(),
					"volume" : bigItemData.quantity,
					"serialNumber" : bigItemData.externalid || bigItemData.itemid
				};
                if(option.isShipToStore == "T"){

                	log.debug(logTitle, '>> customer zipcode: ' + objAddrData.postalCode);
                	log.debug(logTitle, '>> Store Location to LibClearD: ' + JSON.stringify(mapStoreIds[objAddrData.postalCode]) );

                	if(!(mapStoreIds[objAddrData.postalCode] == null || mapStoreIds[objAddrData.postalCode] == undefined)){
						itemData["destinationLocationId"] = mapStoreIds[objAddrData.postalCode] ;
                	}else{
                	   log.debug(logTitle, '>> Store Location not match with: ' + objAddrData.postalCode );

                		return ;
                	}
				}
				
				arrItemData.push(itemData);
			});
			
			log.debug(logTitle, '>> Location to LibClearD: ' + JSON.stringify(objLocation) );


			var response = LibClearD.getAvailability(arrItemData, objLocation, LibClearD.getBusinessId(), option.startDate, option.days,option.isShipToStore);
			log.debug(logTitle, '>> response: ' + JSON.stringify(response) );
	
			if (response.code == 200)
			{
				var jsonBody = JSON.parse( response.body );
	
				jsonBody.forEach(function(row, idx){
					if (row.isAvailable)
					{
						
						var dateStr = format.parse({value: row.date, type: format.Type.DATE});
						//delDate start //allowing the dates to be added in available if its not within Buffer/delay date
						if(!LibShipDelivery.isWithinBufferDate(dateStr)) {
							arrAvailableDates.push(dateStr);
						}else {
							log.debug(logTitle,'bufferDate Validation'+dateStr);
						}
						//delDate end 
					}
				});
			}
			else {
				resp_body = JSON.parse(response.body);
				log.debug(logTitle, 'Error: ' + resp_body.message);
				return {success:false,message:resp_body.message};
			}
		} catch (error) {
			log.debug(logTitle, 'Error ' + error.toString() );
		}

		return arrAvailableDates;
	};

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.getAvailableTimeslots = function ( option )
	{

		var logTitle = [LOG_TITLE, 'getAvailableTimeslots'].join('::');

		log.debug(logTitle, '## options: ' + JSON.stringify(option));

		if (!option.shipDate)
		{
			log.error(logTitle, '-- startdate and days are required');
			return false;
		}

		if (! option.postalCode )
		{
			option.recordObj = helper.getOrderObj(option);
			if (! option.recordObj){
				log.error(logTitle, '-- invalid record object');
//				return false;
			}

			option.postalCode = option.recordObj.getValue({fieldId:'shipzip'});
		}
		if (! option.postalCode )
		{
			log.error(logTitle, '-- postal Code is required!');
//			return false;
		}


		if (! option.volume )
		{
			if (! option.recordObj)
			{
				log.error(logTitle, '-- invalid record object');
				return false;
			}
			var arrItems = this.findBigTicketItems(option);
			var totalqty = 0;

			arrItems.forEach(function(itemData, idx){
				totalqty+=itemData.quantity;
			});

			option.volume = totalqty;
		}
		

		log.debug(logTitle, '## option 3: ' + JSON.stringify(option));
		
		var objAddrData = helper.getOrderShipAddress(option);
		if (!nsutil.isEmpty(objAddrData))
		{
			option.postalCode = objAddrData.postalCode;
			LibClearD.setAddress(objAddrData.doorNo, objAddrData.street, objAddrData.city, objAddrData.postalCode, objAddrData.stateId, objAddrData.country);
			log.debug(logTitle, '## objAddrData: ' + JSON.stringify(objAddrData));
		}

		log.debug(logTitle, '## getTimeslots: ' + JSON.stringify([objAddrData.postalCode, option.shipDate, '1', option.volume, '1']));
		var response = LibClearD.getTimeslots(objAddrData.postalCode, option.shipDate, '1', option.volume, '1'); 
			
		
		log.debug(logTitle, '>> response: ' + JSON.stringify(response) );

		var arrAvailableTimes = [];

		if (response.code == 200)
		{
			var jsonBody = JSON.parse( response.body );

			jsonBody.forEach(function(row, idx){

				var timeStart = row.timeWindow.start.split('T');
				var timeEnd  = row.timeWindow.end.split('T');

				var arrTimeStart = timeStart[1].split(':').map(function(val){ return val;});
				arrTimeStart.pop();
				var arrTimeEnd = timeEnd[1].split(':').map(function(val){ return val;});
				arrTimeEnd.pop();

				var timeData = {};
				if (parseFloat(arrTimeStart[0]) > 12)
				{
					arrTimeStart[0] = parseFloat(arrTimeStart[0]) - 12;
					timeData.start = arrTimeStart.join(':') + ' PM';
				}
				else
				{
					timeData.start = arrTimeStart.join(':') + ' AM';
				}

				if (parseFloat(arrTimeEnd[0]) > 12)
				{
					arrTimeEnd[0] = arrTimeEnd[0] - 12;
					timeData.end = arrTimeEnd.join(':') + ' PM';
				}
				else
				{
					timeData.end = arrTimeEnd.join(':') + ' AM';
				}

				arrAvailableTimes.push(timeData);
			});
		}

		return arrAvailableTimes;
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
	        
	        log.debug('OrderShipAddress', '##OrderShipAddress: ' + JSON.stringify([arrShipdata, arrAddressLines]));
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
	helper.getOrderVolume = function (option)
	{
		option.recordObj = helper.getOrderObj(option);
		if (! option.recordObj){
			log.error(logTitle, '-- invalid record object');
			return false;
		}

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
			else if (!nsutil.isEmpty(option.recordType) && !nsutil.isEmpty(option.recordId) )
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

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.hasBigTicketItem = function (option)
	{
		var logTitle = [LOG_TITLE, '::', 'hasBigTicketItem'];


		var recordObj = helper.getOrderObj(option);
		if (! recordObj){
			log.error(logTitle, '## invalid record object');
			return false;
		}
		var cacheKey = ['hasBigTicketItem', recordObj.id || 'new-' + (new Date()).getTime() ];
		log.debug(logTitle, '## searching for big item tickets: ' + cacheKey);
	      
		if (cache[cacheKey] == null)
		{
			var hasBigTicket = false;
			if (recordObj.type == record.Type.RETURN_AUTHORIZATION)
			{
				var bookId = recordObj.getValue({fieldId:'custbody_sears_booking_info'});
				if (!nsutil.isEmpty(bookId))
				{
					hasBigTicket = true;
				}
			}

			var lineCount = recordObj.getLineCount({sublistId: 'item'});
			for (var line=0; line<lineCount; line++)
			{
				var isBigTicket = recordObj.getSublistValue({sublistId:'item', fieldId:'custcol_bigticket', line:line});
				var isSentToApigee = recordObj.getSublistValue({sublistId:'item', fieldId:'custcol_sent_to_apigee', line:line});
				
				log.debug(logTitle, '------- big item tickets: ' + JSON.stringify([isBigTicket, isSentToApigee]) );
				
				if (isBigTicket && !isSentToApigee)
				{
					hasBigTicket = true;
					break;
				}
			}
			cache[cacheKey] = hasBigTicket;
		}
		
		log.debug(logTitle, '## searching for big item tickets: ' + JSON.stringify(cache[cacheKey]) );
		return cache[cacheKey];
	};

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.findBigTicketItems = function (option)
	{
		var recordObj = helper.getOrderObj(option);
		if (! recordObj){
			return false;
		}
		var cacheKey = 'findBigTicketItems';

		if (cache[cacheKey] == null)
		{
			if (recordObj.type == record.Type.RETURN_AUTHORIZATION)
			{
				var createdFrom = recordObj.getValue({fieldId:'createdfrom'});
				recordObj = helper.getOrderObj({recordType:'salesorder', recordId:createdFrom});
			}


			var lineCount = recordObj.getLineCount({sublistId: 'item'});

			var arrBigTicketItems = [];

			for (var line=0; line<lineCount; line++)
			{
				var isBigTicket = recordObj.getSublistValue({sublistId:'item', fieldId:'custcol_bigticket', line:line});
				if (isBigTicket)
				{
					var itemData = {};

					itemData.item = recordObj.getSublistValue({sublistId: 'item', fieldId:'item', line:line});
					itemData.quantity = recordObj.getSublistValue({sublistId: 'item', fieldId:'quantity', line:line});
					itemData.amount = recordObj.getSublistValue({sublistId: 'item', fieldId:'quantity', line:line});
					itemData.shipinfo = recordObj.getSublistValue({sublistId: 'item', fieldId:'custcol_sears_booking_info', line:line});
					itemData.line = line;

					arrBigTicketItems.push(itemData);
				}
			}

			cache[cacheKey] = arrBigTicketItems;
		}

		return cache[cacheKey];
	};

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.getOrderInfo = function (option)
	{
		var recordObj = helper.getOrderObj(option);
		if (! recordObj){
			return false;
		}
		return JSON.stringify( recordObj );
	};

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.setOrderId = function (stOrderId)
	{
		if (!stOrderId){
			return false;
		}

		// validate this record
		var recordObj = record.load({
			type : record.Type.SALES_ORDER,
			id : stOrderId
		});

		// search for big item
		var hasBigTicketItem = false;

		var lineCount = recordObj.getLineCount({sublistId: 'item'});
		for (var line=0; line < lineCount; line++)
		{
			var isBigTicket = recordObj.getSublistValue({sublistId:'item', fieldId:'custcol_bigticket', line:line});
			if (isBigTicket)
			{
				hasBigTicketItem = true;
				break;
			}
		}

		if ( hasBigTicketItem)
		{
			this.orderId = stOrderId;
			this.orderRecord = recordObj;
		}
		else
		{
			return false;
		}

		return true;
	};

	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.parseAddress = function (option)
	{
		if (!this.orderRecord && ! this.setOrderId(option))
		{
			return false;
		}


//		OBJ_ADDRESS.doorNumber = stDoorNo;
//		OBJ_ADDRESS.street = stStreet;
//		OBJ_ADDRESS.city = stCity;
//		OBJ_ADDRESS.zip = stZip;
//		OBJ_ADDRESS.idState = stState;
//		OBJ_ADDRESS.country = stCountry;


	};

	// Reserve Timeslot
	/**
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.reserveTimeslot = function (){
// get the address from shipdata
		var addressData = this.parseAddress();
		
	};

	/*
	 * Get inventory item's calculated Volume value for ClearD service
	 */
    LibShipDelivery.getInventoryItemVolume = function(sku) {
        var stLogTitle = 'getInventoryItemVolume::';
        var volume = 45.00;

        log.debug(stLogTitle, 'sku is ' + sku);
        
        if(!nsutil.isEmpty(sku)){
	        var arrFilters = [];
	        arrFilters.push(search.createFilter({name: 'isinactive', operator: 'IS', values : ['F']}));
	        arrFilters.push(search.createFilter({name: 'itemid', operator: 'IS', values : [sku]}));
	        // Set the column
	        var arrColumns = [];
	        arrColumns.push(search.createColumn({name: 'custitem_packaging_height'}));
	        arrColumns.push(search.createColumn({name: 'custitem_packaging_width'}));
	        arrColumns.push(search.createColumn({name: 'custitem_packaging_length'}));
	        // Create levy amount search
	        var objNearestLoSearch = search.create({
	        	type: 'inventoryitem',
	        	columns: arrColumns,
	        	filters: arrFilters
	        });
	        // Run search and get the last instance of levy amount
	        objNearestLoSearch.run().each(function(result) {
	        	// Compare the province
	        	var height = result.getValue('custitem_packaging_height');
	        	var width = result.getValue('custitem_packaging_width');
	        	var length = result.getValue('custitem_packaging_length');

	        	log.debug(stLogTitle + 'height, weight, length', height + ', ' + width + ', ' + length);

	        	if (!nsutil.isEmpty(height) && !nsutil.isEmpty(width) && !nsutil.isEmpty(length)) {
	        		if(height == 1 && width ==1 && length == 1){
	        			return volume;
	        		}
	        		if(height > 0 && width > 0 && length > 0 ){
	        			volume = (height/12) * (width/12) * (length/12);
	        			volume = volume.toFixed(2);
	        		}
	        	}
	        });
    	}
		log.debug('Volume', volume);
        
        return volume;
    };

   	/*
	 * Get inventory item's calculated Volume value for ClearD service
	 */
    LibShipDelivery.has_send_to_cleard = function(salesorderObj, sku) {
        var stLogTitle = 'has_send_to_cleard::';
        var result = false;

		var lineNo = salesorderObj.findSublistLineWithValue({
			sublistId: 'item', 
			fieldId: 'custcol_externalid',
			value: sku
		});
		
		if(lineNo > -1){
			result = salesorderObj.getSublistValue({sublistId : 'item',
				fieldId : 'custcolsent_to_cleard',
				line : lineNo
			});
		}

        return result;
    };


	//delDate START
	/**
	 * Evaluate if the given string date is past date
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.isWithinBufferDate = function(baseDate) 
	{
		baseDate = format.format(baseDate,'date')
		dateSep = /-/gi;
		baseDate = baseDate.replace(dateSep,'/');
		var dateToCompare = new Date(baseDate);
		var bufferDate = new Date();
		bufferDate.setDate(bufferDate.getDate()+2);
		var currentDate = format.format(bufferDate,'date');//to set time as 00:00:00
		currentDate = currentDate.replace(dateSep,'/');
		currentDate = new Date(currentDate);
		var bWithinBufferDate = false;
		if(dateToCompare<=currentDate) {
			bWithinBufferDate = true;
		}
		return bWithinBufferDate;
	};
	//delDate END

	//delDate START
	/**
	 * Evaluate if the given string date is past date
	 * @memberOf LibShipDelivery
	 */
	LibShipDelivery.isPastDate = function(baseDate) 
	{
		dateSep = /-/gi;
		baseDate = baseDate.replace(dateSep,'/');
		var dateToCompare = new Date(baseDate);
		var currentDate = format.format(new Date(),'date');//to set time as 00:00:00
		currentDate = currentDate.replace(dateSep,'/');
		currentDate = new Date(currentDate);
		var bIsPastDate = false;
		if(dateToCompare<currentDate) {
			bIsPastDate = true;
		}
		return bIsPastDate;
	}
	//delDate END

	return LibShipDelivery;
});
