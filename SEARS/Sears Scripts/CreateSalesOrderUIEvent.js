/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope public
 */
define([ './LibShipDelivery', './LibClearD', 'N/record', 'N/search', 
         'N/task' ],
/**
 * @param {record}
 *            record
 * @param {search}
 *            search
 * @param {task}
 *            task
 */
function(LibShipDelivery, LibClearD, record, search, task) {

	/**
	 * Function definition to be triggered before record is loaded.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.newRecord - New record
	 * @param {string}
	 *            scriptContext.type - Trigger type
	 * @param {Form}
	 *            scriptContext.form - Current form
	 * @Since 2015.2
	 */
	function beforeLoad(scriptContext) {

	}

	/**
	 * Function definition to be triggered before record is loaded.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.newRecord - New record
	 * @param {Record}
	 *            scriptContext.oldRecord - Old record
	 * @param {string}
	 *            scriptContext.type - Trigger type
	 * @Since 2015.2
	 */
	function beforeSubmit(scriptContext) {

	}

	/**
	 * Function definition to be triggered before record is loaded.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.newRecord - New record
	 * @param {Record}
	 *            scriptContext.oldRecord - Old record
	 * @param {string}
	 *            scriptContext.type - Trigger type
	 * @Since 2015.2
	 */
	function afterSubmit(scriptContext) {
		log.audit("***STATUS***", "STARTED");
		try {
			if (scriptContext.type === scriptContext.UserEventType.CREATE) {
	
				var option = {
					recordType : record.Type.SALES_ORDER,
					recordId : scriptContext.newRecord.id,
					recordObj : scriptContext.newRecord
				};
	
				if (LibShipDelivery.hasBigTicketItem(option)) {
	
					var recSo = record.load({
						type : record.Type.SALES_ORDER,
						id : option.recordId,
						isDynamic : false,
					});
	
					log.debug("***RECSO***", JSON.stringify(recSo));
	
					option.shipDate = recSo.getValue({
						fieldId : 'shipdate'
					});
					option.externalid = recSo.getValue({
						fieldId : 'transactionnumber'
					}).replace(/[A-Za-z]{0,}/, 'SO');
	
					log.debug("***SHIPDATE***", option.shipDate);
					log.debug("***EXTERNAL***", option.externalid);
	
					var orderInfo = getOrderData(option);
	
					LibClearD.setUser('preproduser@sears', 'lksa12?');
	
					var resp = LibClearD.importOrder(orderInfo);
	
					if (resp) {
	
						var lineCount = recSo.getLineCount({
							sublistId : 'item'
						});
	
						for (var i = 0; i < lineCount; i++) {
							var sublistFieldValue = recSo.getSublistValue({
								sublistId : 'item',
								fieldId : 'custcol_bigticket',
								line : i
							});
	
							if (sublistFieldValue) {
								recSo.setSublistValue({
									sublistId : 'item',
									fieldId : 'custcolsent_to_cleard',
									line : i,
									value : true
								});
							}
						}
	
						var recordId = recSo.save({
							enableSourcing : false,
							ignoreMandatoryFields : false
						});
	
						log.debug("***REC ID***", recordId);
					}
	
				}
	
			}
		} catch (e) {
			log.error("***CREATE SALES ORDER ERR***", e);
		} finally {
			log.audit("***STATUS***", "FINISHED");
		}
	}

	function getOrderData(option) {
		var objAddrData = getOrderShipAddress(option);
		log.debug('helper.getOrderData', '## objAddrData: '
				+ JSON.stringify(objAddrData));

		var recCustomer = record.load({
			type : 'customer',
			id : option.recordObj.getValue({
				fieldId : 'entity'
			})
		});

		var date = new Date();
		date.setDate(date.getDate() + 1);

		var orderData = {
			"invoiceNumber" : option.externalid,
			"originType" : 3,
			"originDate" : option.shipDate || "",
			"destinationType" : 1,
			"destinationCivic" : objAddrData.doorNo || "",
			"destinationStreet" : objAddrData.street || "",
			"destinationCity" : objAddrData.city || "",
			"destinationProvinceID" : 3,
			"destinationPostalCode" : objAddrData.postalCode ? objAddrData.postalCode
					.replace(/\s+/g, '')
					: "",
			"destinationCustomerFirstName" : recCustomer.getValue({
				fieldId : 'firstname'
			}) || "",
			"destinationCustomerLastName" : recCustomer.getValue({
				fieldId : 'lastname'
			}) || "",
			"destinationCustomerPhoneNumber1" : option.recordObj
					.getValue({
						fieldId : 'custbody_phone_wms'
					})
					|| "",
			"destinationDate" : option.shipDate || "",
			"destinationStartTime" : option.shipDate || "",
			"destinationEndTime" : option.shipDate || "",
			"tasks" : []
		};

		var arrBigItems = LibShipDelivery.findBigTicketItems(option);

		arrBigItems.forEach(function(itemData) {

			var lineNo = itemData.line;
			var taskData = {
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
				"serviceTime" : 10,
				"serialNumber" : option.recordObj.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : lineNo
				}) || ''
			};

			orderData.tasks.push(taskData);
		});

		return {
			'order' : orderData
		};
	}
	;

	function getOrderShipAddress(option) {
		var arrShipdata = search.lookupFields({
			type : 'salesorder',
			id : option.recordObj.id,
			columns : [ 'shipaddress', 'shipcity', 'shipcountry' ]
		});

		var arrAddressLines = arrShipdata.shipaddress.split(/\n/);
		log.debug('getOrderShipAddress', '##getOrderShipAddress: '
				+ JSON.stringify([ arrShipdata, arrAddressLines ]));

		var addrData = {
			'doorNo' : arrAddressLines[1],
			'street' : arrAddressLines[2],
			'city' : arrShipdata.shipcity,
			'stateId' : option.recordObj.getValue({
				fieldId : 'shipstate'
			}),
			'country' : option.recordObj.getValue({
				fieldId : 'shipcountry'
			}),
			'postalCode' : option.recordObj.getValue({
				fieldId : 'shipzip'
			})
		};

		try {
			var mAddr = arrAddressLines[1]
					.match(/^\d+\w*\s*(?:(?:[\-\/]?\s*)?\d*(?:\s*\d+\/\s*)?\d+)?\s+/i);
			log.debug('getOrderShipAddress', '##regex values: '
					+ JSON.stringify([ mAddr ]));

			var mAddr2 = arrAddressLines[1].split(mAddr[0]);
			log.debug('getOrderShipAddress', '##regex values: '
					+ JSON.stringify([ mAddr2 ]));

			addrData.doorNo = mAddr[0].trim();
			addrData.street = mAddr2[1];

			log.debug('getOrderShipAddress', '##regex values: '
					+ JSON.stringify([ addrData ]));

		} catch (err) {
		}

		log.debug('getOrderShipAddress', '##adrrData: '
				+ JSON.stringify(addrData));

		return addrData;
	}
	;

	return {
		beforeLoad : beforeLoad,
		beforeSubmit : beforeSubmit,
		afterSubmit : afterSubmit
	};

});
