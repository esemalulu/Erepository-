/**
 * Item Fulfillment scripts for Grand Design
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Sep 2016     Jacob Shetler
 *
 */

var FLATWORLD_BASEURL = 'https://pipeline.flatworldsc.com/api/v1/SalesOrder';
var FLATWORLD_GETURL = '/CostAndTrackingDetails/';

/**
 * After the fulfillment is created, send the information to Flat World.
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function GD_IF_AfterSubmit(type)
{
	if (type == 'create')
	{
		GD_IF_SendFlatWorldData(nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()));
	}
}

/**
 * Workflow Action to resend the Item Fulfillment information to Flat World. Triggered by a button on the Item Fulfillment.
 */
function GD_IF_ResendFlatWorldData_WA()
{
	GD_IF_SendFlatWorldData(nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()));
}

/**
 * Workflow Action to get the data from Flat World.
 * Sets this information on the Item Fulfillment if it gets anything back.
 */
function GD_IF_GetFlatWorldData()
{
	//Retrieve information from Flat World.
	var headers = {
		'apiKey': nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_flatworld_apikey'), 
    	'Accept': 'application/json'
	};
	var response = nlapiRequestURL(FLATWORLD_BASEURL + FLATWORLD_GETURL + nlapiGetFieldValue('tranid'), null, headers, 'GET');
	if (response != null)
	{
		var responseBody = JSON.parse(response.getBody());
		nlapiLogExecution('DEBUG', 'responseBody',response.getBody());
		// Try a few times in case there are any collision or record has been changed errors.
		var maxTryCount = 10;
        var curTryCount = 0;
        while(curTryCount < maxTryCount) 
        {
            try 
            {                   
                //Set information on the record
                if (responseBody.error)
                {	
					nlapiLogExecution('DEBUG','responseBody.error',responseBody.error);
					var date = new Date();
					date.setMilliseconds(date.getMilliseconds() + 2000);
					while(new Date() < date){
					}
					nlapiLogExecution('DEBUG','IN_Error','Ran after 2 second');
					response = nlapiRequestURL(FLATWORLD_BASEURL + FLATWORLD_GETURL + nlapiGetFieldValue('tranid'), null, headers, 'GET');
					if (response != null)
					{
						responseBody = JSON.parse(response.getBody());

						if(responseBody.error)
						{
							nlapiLogExecution('DEBUG','responseBody.error_2',responseBody.error);
							
							nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_recall_alert', '<span style="font-size:16px;font-weight:bold;color:red;">ERROR: Missing Tracking Info.</span>');
						}
						else
						{
							if(responseBody.data.carrierPro == null)
							{
								nlapiLogExecution('DEBUG','CarrierPro Null','Ran again after 2 second');
								response = nlapiRequestURL(FLATWORLD_BASEURL + FLATWORLD_GETURL + nlapiGetFieldValue('tranid'), null, headers, 'GET');
								responseBody = JSON.parse(response.getBody());
							}

							nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_recall_alert', '');
							var fulfillmentRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
							//Make sure the line doesn't already exist for the flat world package.
							var flatWorldPkgDesc = 'From Flat World';
							var existingLine = fulfillmentRec.findLineItemValue('package', 'packagedescr', flatWorldPkgDesc);
							if (existingLine > 0)
								fulfillmentRec.selectLineItem('package', existingLine);
							else
								fulfillmentRec.selectNewLineItem('package');

							//Set the line item values
							fulfillmentRec.setCurrentLineItemValue('package', 'packagedescr', flatWorldPkgDesc);
							fulfillmentRec.setCurrentLineItemValue('package', 'packageweight', .01);
							fulfillmentRec.setCurrentLineItemValue('package', 'packagetrackingnumber', responseBody.data.carrierPro);
							fulfillmentRec.commitLineItem('package');
							
							//Set the body fields
							fulfillmentRec.setFieldValue('shippingcost', responseBody.data.freightCost);
							fulfillmentRec.setFieldValue('custbodygd_flatworldresponse', responseBody.message);
							
							//Try to find a shipping method that matches the carrier name from FW.
							// If we can't find one, throw an error saying that the shipper doesn't exist.
							var carrierNameUpper = responseBody.data.carrierName.toUpperCase();
							var filters = [['formulatext: UPPER({itemid})', 'is', carrierNameUpper], 'OR', ['formulatext: UPPER({displayname})', 'is', carrierNameUpper]];
							var shipResults = nlapiSearchRecord('shipitem', null, filters);
							if (shipResults != null)
							{
								fulfillmentRec.setFieldText('shipcarrier', 'More');
								fulfillmentRec.setFieldValue('shipmethod', shipResults[0].getId());
							}
							else
							{
								//If we can't find it exactly, then do a contains search instead.
								filters = [['formulatext: UPPER({itemid})', 'contains', carrierNameUpper], 'OR', ['formulatext: UPPER({displayname})', 'contains', carrierNameUpper]];
								shipResults = nlapiSearchRecord('shipitem', null, filters);
								if (shipResults != null)
								{
									fulfillmentRec.setFieldText('shipcarrier', 'More');
									fulfillmentRec.setFieldValue('shipmethod', shipResults[0].getId());
								}
								else
								{
									throw 'Could not find shipping method that matches "' + responseBody.data.carrierName + '." The data from Flat World was not saved.';
								}
							}
							
							//Save
							nlapiSubmitRecord(fulfillmentRec, false, true);
						}
					}
					nlapiLogExecution('DEBUG', 'responseBody_IN_Error',response.getBody());
					
                    nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbodygd_flatworldresponse', responseBody.message);
                }
                else
                {	
					nlapiLogExecution('DEBUG', 'carrierPro: ',responseBody.data.carrierPro);	
					if(responseBody.data.carrierPro == '' || responseBody.data.carrierPro == null)
					{
						var date = new Date();
						date.setMilliseconds(date.getMilliseconds() + 2000);
						while(new Date() < date){
						}
						nlapiLogExecution('DEBUG','IN_carrierPro_Empty','Ran after 2 second');
						
						response = nlapiRequestURL(FLATWORLD_BASEURL + FLATWORLD_GETURL + nlapiGetFieldValue('tranid'), null, headers, 'GET');
						if (response != null)
						{
							responseBody = JSON.parse(response.getBody());
							if(responseBody.error)
							{
								nlapiLogExecution('DEBUG','responseBody.error_3',responseBody.error);
								
								nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_recall_alert', '<span style="font-size:16px;font-weight:bold;color:red;">ERROR: Missing Tracking Info.</span>');
							}
							else
							{
								nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_recall_alert', '');
								var fulfillmentRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
								//Make sure the line doesn't already exist for the flat world package.
								var flatWorldPkgDesc = 'From Flat World';
								var existingLine = fulfillmentRec.findLineItemValue('package', 'packagedescr', flatWorldPkgDesc);
								if (existingLine > 0)
									fulfillmentRec.selectLineItem('package', existingLine);
								else
									fulfillmentRec.selectNewLineItem('package');

								//Set the line item values
								fulfillmentRec.setCurrentLineItemValue('package', 'packagedescr', flatWorldPkgDesc);
								fulfillmentRec.setCurrentLineItemValue('package', 'packageweight', .01);
								fulfillmentRec.setCurrentLineItemValue('package', 'packagetrackingnumber', responseBody.data.carrierPro);
								fulfillmentRec.commitLineItem('package');
								
								//Set the body fields
								fulfillmentRec.setFieldValue('shippingcost', responseBody.data.freightCost);
								fulfillmentRec.setFieldValue('custbodygd_flatworldresponse', responseBody.message);
								
								//Try to find a shipping method that matches the carrier name from FW.
								// If we can't find one, throw an error saying that the shipper doesn't exist.
								var carrierNameUpper = responseBody.data.carrierName.toUpperCase();
								var filters = [['formulatext: UPPER({itemid})', 'is', carrierNameUpper], 'OR', ['formulatext: UPPER({displayname})', 'is', carrierNameUpper]];
								var shipResults = nlapiSearchRecord('shipitem', null, filters);
								if (shipResults != null)
								{
									fulfillmentRec.setFieldText('shipcarrier', 'More');
									fulfillmentRec.setFieldValue('shipmethod', shipResults[0].getId());
								}
								else
								{
									//If we can't find it exactly, then do a contains search instead.
									filters = [['formulatext: UPPER({itemid})', 'contains', carrierNameUpper], 'OR', ['formulatext: UPPER({displayname})', 'contains', carrierNameUpper]];
									shipResults = nlapiSearchRecord('shipitem', null, filters);
									if (shipResults != null)
									{
										fulfillmentRec.setFieldText('shipcarrier', 'More');
										fulfillmentRec.setFieldValue('shipmethod', shipResults[0].getId());
									}
									else
									{
										throw 'Could not find shipping method that matches "' + responseBody.data.carrierName + '." The data from Flat World was not saved.';
									}
								}
								
								//Save
								nlapiSubmitRecord(fulfillmentRec, false, true);
							}
						}
                      	nlapiLogExecution('DEBUG', 'responseBody_IN_BOL_Empty',response.getBody());
					}
					else
					{
						var fulfillmentRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
						//Make sure the line doesn't already exist for the flat world package.
						var flatWorldPkgDesc = 'From Flat World';
						var existingLine = fulfillmentRec.findLineItemValue('package', 'packagedescr', flatWorldPkgDesc);
						if (existingLine > 0)
							fulfillmentRec.selectLineItem('package', existingLine);
						else
							fulfillmentRec.selectNewLineItem('package');

						//Set the line item values
						fulfillmentRec.setCurrentLineItemValue('package', 'packagedescr', flatWorldPkgDesc);
						fulfillmentRec.setCurrentLineItemValue('package', 'packageweight', .01);
						fulfillmentRec.setCurrentLineItemValue('package', 'packagetrackingnumber', responseBody.data.carrierPro);
						fulfillmentRec.commitLineItem('package');
						
						//Set the body fields
						fulfillmentRec.setFieldValue('shippingcost', responseBody.data.freightCost);
						fulfillmentRec.setFieldValue('custbodygd_flatworldresponse', responseBody.message);
						
						//Try to find a shipping method that matches the carrier name from FW.
						// If we can't find one, throw an error saying that the shipper doesn't exist.
						var carrierNameUpper = responseBody.data.carrierName.toUpperCase();
						var filters = [['formulatext: UPPER({itemid})', 'is', carrierNameUpper], 'OR', ['formulatext: UPPER({displayname})', 'is', carrierNameUpper]];
						var shipResults = nlapiSearchRecord('shipitem', null, filters);
						if (shipResults != null)
						{
							fulfillmentRec.setFieldText('shipcarrier', 'More');
							fulfillmentRec.setFieldValue('shipmethod', shipResults[0].getId());
						}
						else
						{
							//If we can't find it exactly, then do a contains search instead.
							filters = [['formulatext: UPPER({itemid})', 'contains', carrierNameUpper], 'OR', ['formulatext: UPPER({displayname})', 'contains', carrierNameUpper]];
							shipResults = nlapiSearchRecord('shipitem', null, filters);
							if (shipResults != null)
							{
								fulfillmentRec.setFieldText('shipcarrier', 'More');
								fulfillmentRec.setFieldValue('shipmethod', shipResults[0].getId());
							}
							else
							{
								throw 'Could not find shipping method that matches "' + responseBody.data.carrierName + '." The data from Flat World was not saved.';
							}
						}
						
						//Save
						nlapiSubmitRecord(fulfillmentRec, false, true);
					}
                }
                
                break;
            }
            catch(err)
            {
                if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') 
                {
                    curTryCount++;
                    continue;
                }
                throw err;
            }
        }
	}
}

/**
 * Sends Item Fulfillment information from the current record to Flat World
 * 
 * @param {nlobjRecord} newRec
 */
function GD_IF_SendFlatWorldData(newRec)
{
	//Build the object that we will use to send to Flat World.
	var flatworldObj = {
        keyField: newRec.getFieldValue('tranid'),
		shipToName: newRec.getFieldValue('shipcompany'),
		shipToAddress: newRec.getFieldValue('shipaddr1'),
		shipToAddress2: newRec.getFieldValue('shipaddr2'),
		shipToCity: newRec.getFieldValue('shipcity'),
		shipToState: newRec.getFieldValue('shipstate'),
		shipToZip: newRec.getFieldValue('shipzip'),
		shipToCountry: newRec.getFieldValue('shipcountry'),
		shipToContactName: newRec.getFieldValue('shipattention'),
		shipToPhoneNumber: newRec.getFieldValue('shipphone'),
	};
	
	//Do the search on the sales order to get its information.
	var customerPONum = nlapiLookupField('transaction', newRec.getFieldValue('createdfrom'), 'otherrefnum');
	if (customerPONum != null)
	{
		flatworldObj.customerPO = customerPONum;
	}
	var soTextFields = nlapiLookupField('transaction', newRec.getFieldValue('createdfrom'), ['terms', 'shipmethod'], true);
	if (soTextFields != null)
	{
		flatworldObj.freightTerms = soTextFields.shipmethod;
		flatworldObj.creditTerms = soTextFields.terms;
	}
	
	//Do the search on the items to get their information that we need.
	var selectedItemArr = [];
	for (var i = 1; i <= newRec.getLineItemCount('item'); i++)
	{
		if(newRec.getLineItemValue('item', 'quantity', i) > 0)
			selectedItemArr.push(newRec.getLineItemValue('item', 'item', i));
	}
	var itemResults = nlapiSearchRecord('item', null, new nlobjSearchFilter('internalid', null, 'anyof', selectedItemArr), [new nlobjSearchColumn('itemid'),
	                                                                                                                        new nlobjSearchColumn('displayname'),
	                                                                                                                        new nlobjSearchColumn('countryofmanufacture'),
	                                                                                                                        new nlobjSearchColumn('custitemgd_tariffcode'),
	                                                                                                                        new nlobjSearchColumn('price')]);
	var itemArr = [];
	if (itemResults != null)
	{
		for (var i = 1; i <= newRec.getLineItemCount('item'); i++)
		{
			//Don't process if the quantity is 0
			if (newRec.getLineItemValue('item', 'quantity', i) == 0) continue;
			
			//Find the search that matches the current item's id.
			var curItemId = newRec.getLineItemValue('item', 'item', i);
			var searchResult = null;
			for (var j = 0; j < itemResults.length; j++)
			{
				if (itemResults[j].getId() == curItemId)
				{
					searchResult = itemResults[j];
					break;
				}
			}
			if (searchResult == null) continue;
			
			//Set the manufactured country to US by default.
			var madeInCountry = ConvertNSFieldToString(searchResult.getValue('countryofmanufacture')); 
			if (madeInCountry.length == 0) madeInCountry = 'US';
			
			itemArr.push({
				itemNumber: searchResult.getValue('itemid'),
				description: searchResult.getValue('displayname'),
				madeIn: madeInCountry,
				tarriffCode: searchResult.getValue('custitemgd_tariffcode'),
				quantityOfUnits: newRec.getLineItemValue('item', 'quantity', i),
				unitsOfMeasure: newRec.getLineItemValue('item', 'unitsdisplay', i),
				unitPrice: searchResult.getValue('price')
			});
		}
	}
	
	flatworldObj.items = itemArr;
	
	//Send the information to Flat World
	var headers = {
		'apiKey': nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_flatworld_apikey'), 
    	'Content-Type': 'application/json',
    	'Accept': 'application/json'
	};
	var response = nlapiRequestURL(FLATWORLD_BASEURL, JSON.stringify(flatworldObj), headers, 'POST');
	if (response != null)
	{
		nlapiSubmitField(newRec.getRecordType(), newRec.getId(), 'custbodygd_flatworldresponse', JSON.stringify(flatworldObj) + response.getBody());
	}
}