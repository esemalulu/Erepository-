/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope public
 */
define([ './NSUtil', 'N/http', 'N/https', 'N/record', 'N/search', 'N/task',
		'N/url', './LibClearD', './LibShipDelivery' ],
/**
 * @param {http}
 *            http
 * @param {https}
 *            https
 * @param {record}
 *            record
 * @param {search}
 *            search
 * @param {task}
 *            task
 * @param {url}
 *            url
 * @param {LibClearD}
 *            LibClearD
 * @param {LibShipDelivery}
 *            LibShipDelivery
 */
function(nsutil, http, https, record, search, task, url, LibClearD,
		LibShipDelivery) {

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
					recordType : record.Type.RETURN_AUTHORIZATION,
					recordId : scriptContext.newRecord.id,
					recordObj : scriptContext.newRecord
				};

				if (LibShipDelivery.hasBigTicketItem(option)) {

					var recSo = record.load({
						type : record.Type.RETURN_AUTHORIZATION,
						id : option.recordId,
						isDynamic : false,
					});

					log.debug("***RECSO***", JSON.stringify(recSo));

					option.externalid = recSo.getValue({
						fieldId : 'tranid'
					});

					log.debug("***EXTERNAL***", option.externalid);

					var arrItems = LibShipDelivery
							.findBigTicketItems(option);
					var totalqty = 0;
					var objAddrData = null;

					objAddrData = getOrderShipAddress(option);

					arrItems.forEach(function(itemData, idx) {
						totalqty += itemData.quantity;
					});

					option.volume = totalqty;

					LibClearD.setUser('preproduser@sears', 'lksa12?');

					var date = new Date();
					var day = ("0" + date.getDate()).slice(-2);
					var month = ("0" + (date.getMonth() + 1)).slice(-2);
					var year = date.getFullYear();

					var respAvailability = LibClearD.getAvailability(
							objAddrData.postalCode, year + '-' + month
									+ '-' + day, 10, option.volume);

					var availDate = null;

					if (respAvailability) {
						log.debug("***RESP AVAILABILITIES***", JSON
								.stringify(respAvailability));
						if (respAvailability.code === 200) {
							var availabilities = JSON
									.parse(respAvailability.body);

							log.debug("***AVAILABILITIES***",
									availabilities);

							for (var a = 0; a < availabilities.length; a++) {
								if (availabilities[a].isAvailable) {
									availDate = availabilities[a].date
											.split('T')[0];
									break;
								}
							}
						}
					}

					log.debug("***AVAILDATE***", JSON
							.stringify(availDate));

					var startTime = null;
					var endTime = null;

					if (availDate) {
						option.availDate = availDate;
						var respTimeslots = getTimeslots(
								objAddrData.postalCode, availDate,
								option.volume);

						log.debug("***RESP TIMESLOTS***", JSON
								.stringify(respTimeslots));

						if (respTimeslots.code === 200) {
							respTimeslots = JSON
									.parse(respTimeslots.body);

							if (respTimeslots.length > 0) {
								startTime = respTimeslots[0].timeWindow.start
										.split('T')[1];
								endTime = respTimeslots[0].timeWindow.end
										.split('T')[1];
							}

						}
					}

					if (startTime && endTime) {
						option.startTime = availDate + 'T' + startTime
								+ 'Z';
						option.endTime = availDate + 'T' + endTime
								+ 'Z';
					}

					var order = buildImportOrderObject(option,
							objAddrData);
					log.debug("***IMPORT ORDER***", order);
					LibClearD.importOrder(order);
				}
			}
		} catch (e) {
			log.error("***BIG TICKET RETURN ERR***", e);
		} finally {
			log.audit("***STATUS***", "FINISHED");
		}
	}

	function buildImportOrderObject(option, objAddrData) {
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
			"originType" : 1,
			"originDate" : option.availDate || "",
			"destinationType" : 3,
			"originCivic" : objAddrData.doorNo || "",
			"originStreet" : objAddrData.street || "",
			"originCity" : objAddrData.city || "",
			"originProvinceID" : 3,
			"originPostalCode" : objAddrData.postalCode ? objAddrData.postalCode
					.replace(/\s+/g, '')
					: "",
			"originCustomerFirstName" : recCustomer.getValue({
				fieldId : 'firstname'
			}) || "",
			"originCustomerLastName" : recCustomer.getValue({
				fieldId : 'lastname'
			}) || "",
			"originCustomerPhoneNumber1" : option.recordObj.getValue({
				fieldId : 'custbody_phone_wms'
			}) || "",
			"destinationDate" : option.availDate || "",
			"originStartTime" : option.startTime || "",
			"originEndTime" : option.endTime || "",
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

	function getOrderShipAddress(option) {
		var arrShipdata = search.lookupFields({
			type : record.Type.RETURN_AUTHORIZATION,
			id : option.recordObj.id,
			columns : [ 'shipaddress', 'shipcity', 'shipcountry' ]
		});

		log.debug("***ARR SHIP DATA***", JSON.stringify(arrShipdata));

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
			}).replace(/\s+/g, '')
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

	function getTimeslots(stPostalCode, stDate, stVolume) {
		var stLogTitle = "***getTimeslots***";
		var objResponse = null;
		var ST_URL_CL = 'http://initium-commerce-prod.apigee.net/cleardapi';

		var stURL = url.format(ST_URL_CL
				+ '/timeslot/anonymous-availabilities', {
			date : stDate,
			postalCode : stPostalCode,
			volume : stVolume
		});

		var stMethod = "GET";
		var stToken = LibClearD.getToken();

		if (nsutil.isEmpty(stToken)) {
			throw 'Invalid Token. Please re-try again or contact your '+
					'system administrator.';
		}

		var objHeaders = {
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};

		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = http.request({
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			} else {
				objResponse = https.request({
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : '
							+ error.toString());
		}

		if (objResponse.code == 401) {
			ST_TOKEN = null;
			this.getTimeslots(stPostalCode, stDate, stServiceTime,
					stVolume, stWeight);
		}

		return objResponse;
	}

	return {
		beforeLoad : beforeLoad,
		beforeSubmit : beforeSubmit,
		afterSubmit : afterSubmit
	};

});
