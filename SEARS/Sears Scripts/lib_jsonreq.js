var REQSTATUS_SUCCESS = '3';
var REQSTATUS_FAIL = '4';
var REQSTATUS_PENDING = '1';

var LIB_JSONRequest =
{
	/**
	 *
	 * @returns
	 */
	searchPendingJSONRequest : function(searchId)
	{
		//var searchFilter = [(new nlobjSearchFilter('custrecord_jsonreq_status', null, 'anyof', REQSTATUS_PENDING))]; //pending
		var searchColumn = [(new nlobjSearchColumn('custrecord_jsonreq_content'))
		                   ,(new nlobjSearchColumn('custrecord_jsonreq_recordid'))
		                   ,(new nlobjSearchColumn('internalid')).setSort()
		                   ,(new nlobjSearchColumn('custrecord_jsonreq_recordtype')).setSort()];

		var resultsJSONRequests = Helper.searchAllRecord('customrecord_json_webrequest', searchId, null, searchColumn);
		if ( Helper.isEmpty(resultsJSONRequests))
		{
			return null; // return false
		}


		var listOrder = ['customer','salesorder','itemfulfillment','transferorder','itemreceipt'];
		var arrResults = [];

		listOrder.forEach(function(recordType){
			// get all the search
			for (var ii in resultsJSONRequests)
			{
				var searchRow = resultsJSONRequests[ii];

				var recType = null, jsonObj = {};
				try
				{
					jsonObj = JSON.parse(searchRow.getValue('custrecord_jsonreq_content'));
					recType = jsonObj.recordtype;
				}
				catch (err)
				{
					continue;
				}

				if ( recordType == recType)
				{
					arrResults.push(searchRow);
				}
			}
		});

		return arrResults;
	},

	/**
	 *
	 * @param recordData
	 * @returns {___anonymous218_219}
	 */
	createCustomer : function(recordData)
	{
		var logTitle = 'createCustomer';
		var returnObj = {};
		returnObj.custrecord_jsonreq_recordtype = 'customer';

		nlapiLogExecution('DEBUG', logTitle, '** Create Customer: ' + JSON.stringify(recordData));
		try
		{
			// first check the customer already exists
			var customerId = this.searchCustomer(recordData);
			
			nlapiLogExecution('DEBUG', logTitle, 'custoemrId: ' + customerId);
			try {
				var record = customerId ? nlapiLoadRecord('customer', customerId) : false;
				if ( !record)
				{
					record = nlapiCreateRecord('customer');
				}
				nlapiLogExecution('DEBUG', logTitle, 'record?: ' + JSON.stringify(record));
			}
			catch(custerr)
			{
				throw custerr.toString();
			}

			var objFieldMap = FIELD_MAPPING.customer;
			for (var field in recordData)
			{
				if (!objFieldMap[field] && !Helper.inArray(field, ['billingaddress','shippingaddress']) )
				{
					continue;
				}

				var fldMap = objFieldMap[field];
				var fldValue = recordData[field];

				if (objFieldMap[field])
				{
					/*Fix: update the dw customer loyalty number to the customer record (NS) only if non-empty. changes /*b*/
/*b*/				if(field !== 'custentity_loyaltycard'){
						switch(fldMap.setas)
						{
							case 'text':
								record.setFieldText(fldMap.field, fldValue);
								break;
							case 'value':
								record.setFieldValue(fldMap.field, fldValue);
								break;
						}
/*b*/				}else if(fldValue !== null && fldValue !== '' && fldValue !== undefined){
						switch(fldMap.setas)
						{
							case 'text':
								record.setFieldText(fldMap.field, fldValue);
								break;
							case 'value':
								record.setFieldValue(fldMap.field, fldValue);
								break;
						}
/*b*/				}
				}
				else if (Helper.inArray(field, ['billingaddress','shippingaddress']))
				{
					var addressData = recordData[field];
					var lineAddr = null, hasMatchingAddr = true;

					// Check if the addres already exists
					var lineAddrCount = record.getLineItemCount('addressbook');
					for (var line=1; line <= lineAddrCount; line++)
					{
						record.selectLineItem('addressbook', line);
						var subrecord = record.viewCurrentLineItemSubrecord('addressbook', 'addressbookaddress');

						lineAddr = line;
						hasMatchingAddr = true;
						for (var addrfld in addressData)
						{
							var mapField = objFieldMap[addrfld];
 							if (!mapField)
							{
								continue;
							}
 							var currMapValue = subrecord.getFieldValue( mapField.field );

 							if (addressData[addrfld] != currMapValue)
							{
 								hasMatchingAddr = false;
							}

 							if (!hasMatchingAddr)
							{
								break;
							}
						}
						if (hasMatchingAddr)
						{
							break;
						}
					}

					var subrecAddr = null;
					if (hasMatchingAddr && lineAddr)
					{
						record.selectLineItem('addressbook', lineAddr);
						subrecAddr = record.editCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
					}
					else
					{
						record.selectNewLineItem('addressbook');
						subrecAddr = record.createCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
					}



					if ( field == 'billingaddress')
					{
						record.setCurrentLineItemValue('addressbook', 'defaultbilling', 'T');
					}
					else if ( field == 'shippingaddress')
					{
						record.setCurrentLineItemValue('addressbook', 'defaultshipping', 'T');

					}


					// set the country first
					if (! Helper.isEmpty(addressData.country))
					{
						subrecAddr.setFieldValue('country', addressData.country);
					}


					for (var addrfld in addressData)
					{
						var fldMap = objFieldMap[addrfld];
						if (! objFieldMap[addrfld] || addrfld == 'country')
						{
							continue;
						}
						subrecAddr.setFieldValue(fldMap.field, addressData[addrfld] );
					}
					subrecAddr.commit();
					record.commitLineItem('addressbook');
				}
			}

			returnObj.custrecord_jsonreq_recordid = nlapiSubmitRecord(record, true, true);
			returnObj.custrecord_jsonreq_status = REQSTATUS_SUCCESS;
			returnObj.custrecord_jsonreq_messsage = '';
		}
		catch (error)
		{
			returnObj.custrecord_jsonreq_status = REQSTATUS_FAIL;
			returnObj.custrecord_jsonreq_messsage = error.toString();
		}
		finally
		{
			returnObj.custrecord_jsonreq_processed = nlapiDateToString(new Date(), 'datetimetz');
		}

		nlapiLogExecution('DEBUG', logTitle, '** Results: ' + JSON.stringify(returnObj));
		return returnObj;
	},

	/**
	 *
	 * @param recordData
	 * @returns {___anonymous951_952}
	 */
	createSalesOrder : function(recordData)
	{
		var logTitle = 'createSalesOrder';

		var returnObj = {};
		returnObj.custrecord_jsonreq_recordtype = 'salesorder';

		var objFieldMap = FIELD_MAPPING.salesorder;

		// first get the customer_data_in
		recordData.customer = this.searchCustomer(recordData);

		try
		{
			if (!recordData.customer)
			{
				throw "Missing customer info";
			}

			var record = nlapiCreateRecord('salesorder');
			record.setFieldValue('entity', recordData.customer);

			for (var field in recordData)
			{
				if (!objFieldMap[field] && !Helper.inArray(field, ['items']) )
				{
					continue;
				}
				var fldMap = objFieldMap[field];
				var fldValue = recordData[field];

				if ( field == 'trandate')
				{
					fldValue = nlapiDateToString(nlapiStringToDate(fldValue,'datetimetz'));
				}

				if (objFieldMap[field])
				{
					switch (fldMap.setas)
					{
						case 'text':
							record.setFieldText(fldMap.field, fldValue);
							break;
						case 'value':
							record.setFieldValue(fldMap.field, fldValue);
							break;
					}
				}
				else
					if (Helper.inArray(field,['items']))
					{
						var listItems = recordData.items;

						for (var i = 0,count = listItems.length; i < count; i ++)
						{
							var itemData = listItems[i];
							itemData.itemid = this.searchItem(itemData);
							if ( !itemData.itemid)
							{
								continue;
							}

							record.selectNewLineItem('item');
							record.setCurrentLineItemValue('item', 'item', itemData.itemid);
							for ( var itemfld in itemData)
							{
								var itemMap = objFieldMap[itemfld];
								var itemValue = itemData[itemfld];

								if ( !itemMap || !itemValue)
								{
									continue;
								}

								record.setCurrentLineItemValue('item', itemMap.field, itemValue);
							}
							record.commitLineItem('item');
						}
					}
			}

			record.setFieldValue('custbody_sears_sales_ordernum', recordData.salesorderid);

			returnObj.custrecord_jsonreq_recordid = nlapiSubmitRecord(record, true, true);
			returnObj.custrecord_jsonreq_status = REQSTATUS_SUCCESS;
			returnObj.custrecord_jsonreq_messsage = '';
		}
		catch (error)
		{
			returnObj.custrecord_jsonreq_status = REQSTATUS_FAIL;
			returnObj.custrecord_jsonreq_messsage = error.toString();
		}
		finally
		{
			returnObj.custrecord_jsonreq_processed = nlapiDateToString(new Date(), 'datetimetz');
		}

		return returnObj;
	},


	/**
	 *
	 * @param recordData
	 * @returns {___anonymous1700_1701}
	 */
	createItemFulfillment : function(recordData)
	{
		var logTitle = 'createItemFulfillment';

		var returnObj = {};
		returnObj.custrecord_jsonreq_recordtype = 'itemfulfillment';

		var objFieldMap = FIELD_MAPPING.itemfulfillment;

		// first get the salesorder
		recordData.salesorder_internalid = this.searchSalesOrder(recordData);

		try
		{
			if (!recordData.salesorder_internalid)
			{
				throw "Missing original sales order";
			}

			// transform
			var record = nlapiTransformRecord('salesorder', recordData.salesorder_internalid, 'itemfulfillment');

			for (var field in recordData)
			{
				if (!objFieldMap[field] && !Helper.inArray(field, ['items']) )
				{
					continue;
				}
				var fldMap = objFieldMap[field];
				var fldValue = recordData[field];

				if (objFieldMap[field])
				{
					switch (fldMap.setas)
					{
						case 'text':
							record.setFieldText(fldMap.field, fldValue);
							break;
						case 'value':
							record.setFieldValue(fldMap.field, fldValue);
							break;
					}
				}
				else if (Helper.inArray(field,['items']))
				{
					var messages = [];


					var listItems = recordData.items;
					var linePkgCtr = 1;
					for (var i = 0,count = listItems.length; i < count; i ++)
					{
						var itemData = listItems[i];

						itemData.itemid = this.searchItem(itemData);
						if ( !itemData.itemid)
						{
							continue;
						}

						var lineNo = parseFloat( record.findLineItemValue('item', 'item', itemData.itemid) || '0' );
						if (lineNo < 1)
						{
							messages.push('Unable to find line item #' + itemData.itemnumber);
							continue;
						}

						record.selectLineItem('item', lineNo);
						record.setCurrentLineItemValue('item', 'apply', 'T');
						record.setCurrentLineItemValue('item', 'quantity', itemData.quantity);
						record.setCurrentLineItemValue('item', 'custcol_sears_tracking_number', itemData.trackingnumber);
						record.commitLineItem('item');

//						if ( itemData.trackingnumber )
//						{
//							var listType = "package";
//							record.selectLineItem(listType, linePkgCtr);
//							record.setCurrentLineItemValue(listType, 'packagetrackingnumber', itemData.trackingnumber);
//							record.setCurrentLineItemValue(listType, 'packageweight', '0.01');
//							record.commitLineItem(listType);
//							linePkgCtr++;
//						}

					}
				}

			}


			returnObj.custrecord_jsonreq_recordid = nlapiSubmitRecord(record, true, true);
			returnObj.custrecord_jsonreq_status = REQSTATUS_SUCCESS;
			returnObj.custrecord_jsonreq_messsage = '';
		}
		catch (error)
		{
			returnObj.custrecord_jsonreq_status = REQSTATUS_FAIL;
			returnObj.custrecord_jsonreq_messsage = error.toString();
		}
		finally
		{
			returnObj.custrecord_jsonreq_processed = nlapiDateToString(new Date(), 'datetimetz');
		}

		return returnObj;
	},

	processTransferOrders: function (recordData)
	{


	},

	createItemReceipt: function (recordData)
	{
		var logTitle = 'createItemReceipt';

		var returnObj = {};
		returnObj.custrecord_jsonreq_recordtype = 'itemreceipt';

		var objFieldMap = FIELD_MAPPING.itemreceipt;

		// first get the salesorder
		recordData.transferorderid = this.searchTransferOrder(recordData);

		try
		{
			if (!recordData.transferorderid)
			{
				throw "Missing original sales order";
			}
			// transform
			var record = nlapiTransformRecord('transferorder', recordData.transferorderid, 'itemreceipt', {recordmode:'dynamic'});

			var listItems = recordData.items;
			var messages = [];
			var lineFields = ['itemreceive','onhand','quantity','quantityremaining','itemquantity','line','location','orderdoc','orderline'];

			var arrLinesNo = [];

			for (var i = 0,count = listItems.length; i < count; i ++)
			{
				var itemData = listItems[i];
				itemData.itemid = this.searchItem(itemData);
				if ( !itemData.itemid)
				{
					continue;
				}

				var lineNo = record.findLineItemValue('item', 'item', itemData.itemid);
				if (lineNo < 1)
				{
					messages.push('Unable to find line item #' + itemData.itemnumber);
					continue;
				}
				arrLinesNo.push(lineNo);
			}

			var lineCount = record.getLineItemCount('item');
			for (var line=1; line<=lineCount; line++)
			{

				var lineData = {};
				lineFields.map(function (lineField){
					lineData[lineField] = record.getLineItemValue('item',lineField, line);
					return true;
				});

				if (! Helper.inArray(line, arrLinesNo) )
				{
					record.selectLineItem('item', line);
					record.setCurrentLineItemValue('item', 'itemreceive', 'F');
					record.commitLineItem('item');
				}
				else
				{
					record.selectLineItem('item', line);
					record.setCurrentLineItemValue('item', 'itemreceive', 'T');
					record.setCurrentLineItemValue('item', 'quantity', lineData.quantity);
					record.setCurrentLineItemValue('item', 'itemquantity', lineData.quantity);
					record.commitLineItem('item');
				}
			}

			returnObj.custrecord_jsonreq_recordid = nlapiSubmitRecord(record, true, true);
			returnObj.custrecord_jsonreq_status = REQSTATUS_SUCCESS;
			returnObj.custrecord_jsonreq_messsage = '';
		}
		catch (error)
		{
			returnObj.custrecord_jsonreq_status = REQSTATUS_FAIL;
			returnObj.custrecord_jsonreq_messsage = error.toString();
		}
		finally
		{
			returnObj.custrecord_jsonreq_processed = nlapiDateToString(new Date(), 'datetimetz');
		}

		return returnObj;

	},


	////////////////////////////////////////////////////
	/**
	 *
	 */
	searchSalesOrder: function(orderData)
	{
		var logTitle = 'searchSalesOrder';
		nlapiLogExecution('DEBUG', logTitle, '## searchSalesOrder: ' + JSON.stringify(orderData) );

		var orderId = orderData.salesorder || orderData.salesorderid;

		var salesOrderId = null;
		if ( !Helper.isEmpty( orderId ))
		{
			salesOrderId = this.searchSalesOrderByExternalId(orderId);
		}

		nlapiLogExecution('DEBUG', logTitle, '...returns: ' + JSON.stringify(salesOrderId) );

		return salesOrderId;
	},

	searchSalesOrderByExternalId: function (externalId)
	{
		var cacheKey = ['searchSalesOrderByExternalId', externalId].join(':');

		if (this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;

			var arrSalesOrder = nlapiSearchRecord('salesorder', null, [(new nlobjSearchFilter('externalid',null,'is',externalId))]);
			if (arrSalesOrder && arrSalesOrder.length)
			{
				this.CACHE[cacheKey]= arrSalesOrder[0].getId();
			}
		}

		return this.CACHE[cacheKey];
	},


	searchTransferOrder: function(orderData)
	{
		var logTitle = 'searchTransferOrder';
		nlapiLogExecution('DEBUG', logTitle, '## searchTransferOrder: ' + JSON.stringify(orderData) );

		var transferOrderId = null;
		if ( !Helper.isEmpty( orderData.transferorder))
		{
			transferOrderId = this.searchTransferOrderByExternalId(orderData.transferorder);
		}
		else if ( !Helper.isEmpty( orderData.transferorder_jsonid))
		{
			transferOrderId = this.searchTransferOrderByJsonReqID(orderData.transferorder_jsonid);
		}

		nlapiLogExecution('DEBUG', logTitle, '...returns: ' + JSON.stringify(transferOrderId) );

		return transferOrderId;
	},

	searchTransferOrderByExternalId: function (externalId)
	{
		var cacheKey = ['searchTransferOrderByExternalId', externalId].join(':');

		if (this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;

			var arrSalesOrder = nlapiSearchRecord('transferorder', null, [(new nlobjSearchFilter('externalid',null,'is',externalId))]);
			if (arrSalesOrder && arrSalesOrder.length)
			{
				this.CACHE[cacheKey]= arrSalesOrder[0].getId();
			}
		}

		return this.CACHE[cacheKey];
	},

	/**
	 *
	 * @param jsonId
	 * @returns
	 */
	searchTransferOrderByJsonReqID: function (jsonId)
	{
		var cacheKey = ['searchCustomerByJsonReqID', jsonId].join(':');
		if ( this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;

			// get it from json //
			var jsonData = nlapiLookupField('customrecord_json_webrequest', jsonId, ['custrecord_jsonreq_recordid','custrecord_jsonreq_recordtype']);
			if (jsonData && jsonData.custrecord_jsonreq_recordtype == 'transferorder' && jsonData.custrecord_jsonreq_recordid)
			{
				this.CACHE[cacheKey] = jsonData.custrecord_jsonreq_recordid;
			}
		}

		return this.CACHE[cacheKey];
	},




	/**
	 *
	 * @param itemData
	 * @returns
	 */
	searchItem: function (itemData)
	{
		var logTitle = 'searchItem';
		nlapiLogExecution('DEBUG', logTitle, '## Search Item: ' + JSON.stringify(itemData) );

		var itemId = null;
		if ( !Helper.isEmpty( itemData.itemnumber))
		{
			itemId = this.searchItemByItemNumber(itemData.itemnumber);
		}
		else if (!Helper.isEmpty(itemData.itemname))
		{
			itemId = this.searchItemByItemName(itemData.itemname);
		}
		else if (!Helper.isEmpty(itemData.itemid)) // this is the externalid
		{
			itemId = this.searchItemByExternalId(itemData.itemid);
		}

		nlapiLogExecution('DEBUG', logTitle, '...returns: ' + JSON.stringify(itemId) );

		return itemId;
	},

	searchItemByItemNumber: function (itemNumber)
	{
		var cacheKey = ['searchItemByItemNumber', itemNumber].join(':');

		if (this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;
			var arrItemSearch = nlapiSearchRecord('item', null, [(new nlobjSearchFilter('itemid',null,'is',itemNumber))]);
			if (arrItemSearch && arrItemSearch.length)
			{
				this.CACHE[cacheKey]= arrItemSearch[0].getId();
			}
		}

		return this.CACHE[cacheKey];
	},

	/**
	 *
	 * @param itemName
	 * @returns
	 */
	searchItemByItemName: function (itemName)
	{
		var cacheKey = ['searchItemByItemName', itemName].join(':');

		if (this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;

			var arrItemSearch = nlapiSearchRecord('item', null, [(new nlobjSearchFilter('displayname',null,'is',itemName))]);
			if (arrItemSearch && arrItemSearch.length)
			{
				this.CACHE[cacheKey]= arrItemSearch[0].getId();
			}
		}

		return this.CACHE[cacheKey];
	},

	/**
	 *
	 * @param itemId
	 * @returns
	 */
	searchItemByExternalId: function (itemId)
	{
		var cacheKey = ['searchItemByExternalId', itemId].join(':');

		if (this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;

			var arrItemSearch = nlapiSearchRecord('item', null, [(new nlobjSearchFilter('externalid',null,'is',itemId))]);
			if (arrItemSearch && arrItemSearch.length)
			{
				this.CACHE[cacheKey]= arrItemSearch[0].getId();
			}
		}

		return this.CACHE[cacheKey];
	},

	/**
	 *
	 * @param itemId
	 * @returns
	 */
	searchItemByItemId: function (itemId)
	{
		var cacheKey = ['searchItemByItemId', itemId].join(':');

		if (this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;
			var itemLookup = nlapiLookupField('item',itemId,'recordtype');
			if (!Helper.isEmpty(itemLookup))
			{
				this.CACHE[cacheKey]= itemId;
			}
		}

		return this.CACHE[cacheKey];
	},


	/**
	 *
	 * @param customerData
	 * @returns
	 */
	searchCustomer : function (customerData)
	{
		var logTitle = 'searchCustomer';
		nlapiLogExecution('DEBUG', logTitle, '## Search Customer: ' + JSON.stringify(customerData) );

		var entityId = null;
		if ( !Helper.isEmpty( customerData.customer_jsonid))
		{
			entityId = this.searchCustomerByJsonReqID(customerData.customer_jsonid);
		}
		else if (!Helper.isEmpty(customerData.customerid)) // this is the externalid
		{
			entityId = this.searchCustomerByExternalId(customerData.customerid);
		}
		/*
		else if (!Helper.isEmpty(customerData.email)) // search by email
		{
			entityId = this.searchCustomerByEmail(customerData.email);
		}
		else
		{
			entityId = this.searchCustomerByInfo(customerData);
		}*/

		nlapiLogExecution('DEBUG', logTitle, '...returns: ' + JSON.stringify(entityId) );

		return entityId;
	},



	/**
	 *
	 * @param jsonId
	 * @returns
	 */
	searchCustomerByJsonReqID: function (jsonId)
	{
		var cacheKey = ['searchCustomerByJsonReqID', jsonId].join(':');
		if ( this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;

			// get it from json //
			var jsonData = nlapiLookupField('customrecord_json_webrequest', jsonId, ['custrecord_jsonreq_recordid','custrecord_jsonreq_recordtype']);
			if (jsonData && jsonData.custrecord_jsonreq_recordtype == 'customer' && jsonData.custrecord_jsonreq_recordid)
			{
				this.CACHE[cacheKey] = jsonData.custrecord_jsonreq_recordid;
			}
		}

		return this.CACHE[cacheKey];
	},

	/**
	 *
	 * @param customerId
	 * @returns
	 */
	searchCustomerByExternalId: function (customerId)
	{
		var cacheKey = ['searchCustomerByExternalId', customerId].join(':');
		if ( this.CACHE[cacheKey] == null)
		{
			this.CACHE[cacheKey] = false;
			var arrCustomerSearch = nlapiSearchRecord('customer', null, [(new nlobjSearchFilter('externalid', null, 'is', customerId))]);

			if (arrCustomerSearch && arrCustomerSearch.length)
			{
				this.CACHE[cacheKey] = arrCustomerSearch[0].getId();
			}
		}

		return this.CACHE[cacheKey];
	},

	/**
	 *
	 * @param customerData
	 * @returns
	 */
	searchCustomerByEmail: function (emailaddr)
	{
		return this.searchCustomerByInfo({'email': emailaddr});

//		var cacheKey =['searchCustomerByEmail', JSON.stringify(emailaddr)];
//
//		if ( this.CACHE[cacheKey] == null)
//		{
//			var arrFilters = [];
//			this.CACHE[cacheKey]  = false;
//
//			searchFields.forEach(function(field)
//			{
//				if (searchData[field])
//				{
//					var mapField = FIELD_MAPPING.customer[field];
//					arrFilters.push(new nlobjSearchFilter(mapField.field, null, 'is', searchData[field]));
//				}
//			});
//
//			if (arrFilters.length)
//			{
//				var arrSearchCustomer = nlapiSearchRecord('customer', null, arrFilters);
//				if (arrSearchCustomer && arrSearchCustomer.length == 1)
//				{
//					this.CACHE[cacheKey] = arrSearchCustomer.shift();
//				}
//			}
//		}
//
//		return this.CACHE[cacheKey];
	},


	/**
	 *
	 * @param customerData
	 * @returns
	 */
	searchCustomerByInfo: function (customerData)
	{
		var searchFields = ['lastname', 'firstname', 'email'];
		var searchData = {};
		searchFields.forEach(function(field)
		{
			searchData[field] = customerData[field] || null;
			return true;
		});

		var cacheKey =['searchCustomerByInfo', JSON.stringify(searchData)];

		if ( this.CACHE[cacheKey] == null)
		{
			var arrFilters = [];
			this.CACHE[cacheKey]  = false;

			searchFields.forEach(function(field)
			{
				if (searchData[field])
				{
					var mapField = FIELD_MAPPING.customer[field];
					arrFilters.push(new nlobjSearchFilter(mapField.field, null, 'is', searchData[field]));
				}
			});

			if (arrFilters.length)
			{
				var arrSearchCustomer = nlapiSearchRecord('customer', null, arrFilters);
				if (arrSearchCustomer && arrSearchCustomer.length == 1)
				{
					var firstRow = arrSearchCustomer.shift();
					if (firstRow)
					{
						this.CACHE[cacheKey] = firstRow.getId();
					}
				}
			}
		}

		return this.CACHE[cacheKey];
	},

	CACHE : {}
};

///////////////////////////////////////////////////////////
var FIELD_MAPPING = {};
FIELD_MAPPING['customer'] =	
{
		'customerid' : {
            'field' : 'externalid',
            'setas' : 'value',
            'type' : 'text'
        },
        'firstname' : {
            'field' : 'firstname',
            'setas' : 'value',
            'type' : 'text'
        },
        'lastname' : {
            'field' : 'lastname',
            'setas' : 'value',
            'type' : 'text'
        },
        'email' : {
            'field' : 'email',
            'setas' : 'value',
            'type' : 'text'
        },
        'phone' : {
            'field' : 'phone',
            'setas' : 'value',
            'type' : 'text'
        },
        'addrphone' : {
            'field' : 'addrphone',
            'setas' : 'value',
            'type' : 'text'
        },
        'companyname' : {
            'field' : 'companyname',
            'setas' : 'value',
            'type' : 'text'
        },
        'addr1' : {
            'field' : 'addr1',
            'setas' : 'value',
            'type' : 'text'
        },
        'addr2' : {
            'field' : 'addr2',
            'setas' : 'value',
            'type' : 'text'
        },
        'addr3' : {
            'field' : 'addr3',
            'setas' : 'value',
            'type' : 'text'
        },
        'attention' : {
            'field' : 'attention',
            'setas' : 'value',
            'type' : 'text'
        },
        'addressee' : {
            'field' : 'addressee',
            'setas' : 'value',
            'type' : 'text'
        },
        'city' : {
            'field' : 'city',
            'setas' : 'value',
            'type' : 'text'
        },
        'country' : {
            'field' : 'country',
            'setas' : 'text',
            'type' : 'text'
        },
        'state' : {
            'field' : 'state',
            'setas' : 'value',
            'type' : 'text'
        },
        'zip' : {
            'field' : 'zip',
            'setas' : 'value',
            'type' : 'text'
        },
        'custentity_loyaltycard' : {
            'field' : 'custentity_loyaltycard',
            'setas' : 'value',
            'type' : 'text'
        },
        'custentity_cvv' : {
            'field' : 'custentity_cvv',
            'setas' : 'value',
            'type' : 'text'
        },
        'language' : {
            'field' : 'language',
            'setas' : 'value',
            'type' : 'text'
        }
};

FIELD_MAPPING['salesorder'] =
{
	'salesorderid' :
	{
		'field' : 'externalid', // customer i
		'setas' : 'value',
		'type' : 'text'
	},
	'locationid' :
	{
		'field' : 'location',
		'setas' : 'value',
		'type' : 'text'
	},
	'location' :
	{
		'field' : 'location',
		'setas' : 'text',
		'type' : 'text'
	},

	'trandate' :
	{
		'field' : 'trandate',
		'setas' : 'value',
		'type' : 'date'
	},
	'department' :
	{
		'field' : 'department',
		'setas' : 'text',
		'type' : 'text'
	},
	'shipdate' :
	{
		'field' : 'shipdate',
		'setas' : 'value',
		'type' : 'date'
	},
	'shipcarrier' :
	{
		'field' : 'shipcarrier',
		'setas' : 'text',
		'type' : 'text'
	},
	'paymentmethod' :
	{
		'field' : 'paymentmethod',
		'setas' : 'text',
		'type' : 'text'
	},
	'memo' :
	{
		'field' : 'memo',
		'setas' : 'value',
		'type' : 'text'
	},
	'quantity' :
	{
		'field' : 'quantity',
		'setas' : 'value',
		'type' : 'integer'
	},
	'amount' :
	{
		'field' : 'amount',
		'setas' : 'value',
		'type' : 'currency'
	},
	'rate' :
	{
		'field' : 'rate',
		'setas' : 'value',
		'type' : 'currency'
	},
	'price' :
	{
		'field' : 'rate',
		'setas' : 'value',
		'type' : 'currency'
	},
	'taxcode' :
	{
		'field' : 'taxcode',
		'setas' : 'text',
		'type' : 'text'
	},
	'description' :
	{
		'field' : 'description',
		'setas' : 'text',
		'type' : 'text'
	}
};

FIELD_MAPPING['itemfulfillment'] =
{
	'itemfulfillmentid' :
	{
		'field' : 'externalid',
		'setas' : 'value',
		'type' : 'text'
	},
	'trandate' :
	{
		'field' : 'trandate',
		'setas' : 'value',
		'type' : 'date'
	},
	'quantitycommitted' :
	{
		'field' : 'quantitycommitted',
		'setas' : 'value',
		'type' : 'integer'
	},
	'memo' :
	{
		'field' : 'memo',
		'setas' : 'value',
		'type' : 'text'
	},
	'trackingnumber':
	{
		'field' : 'custbody_sears_tracking_num',
		'setas' : 'value',
		'type' : 'text'
	}
};

FIELD_MAPPING['itemreceipt'] =
{
	'itemfulfillmentid' :
	{
		'field' : 'externalid',
		'setas' : 'value',
		'type' : 'text'
	},
	'trandate' :
	{
		'field' : 'trandate',
		'setas' : 'value',
		'type' : 'date'
	},
//	'quantitycommitted' :
//	{
//		'field' : 'quantitycommitted',
//		'setas' : 'value',
//		'type' : 'integer'
//	},
	'memo' :
	{
		'field' : 'memo',
		'setas' : 'value',
		'type' : 'text'
	},
//	'trackingnum':
//	{
//		'field' : 'custbody_sears_tracking_num',
//		'setas' : 'value',
//		'type' : 'text'
//	},
};