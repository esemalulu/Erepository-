/**
 * Mass updates for case 8608.
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Sep 2017     Jacob Shetler
 *
 */

/**
 * Fixes the MSO address, shipping method, and incorrect freight charge on unit orders.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_Case8608_MU(recType, recId)
{
	var soRec = nlapiLoadRecord(recType, recId);
	
	//Fix the MSO Address
	var dealerId = soRec.getFieldValue('entity');
	var dealerRecord = nlapiLoadRecord('customer', dealerId);
    var useMSO = dealerRecord.getFieldValue('custentityusemsoaddress');
    // If dealer has the UseMSOAddress checkbox checked, then pull from there
    if(useMSO == 'T')
    {
    	soRec.setFieldValue('custbodymsoaddress', ConvertNSFieldToString(dealerRecord.getFieldValue('custentitymsoaddress')));
    	soRec.setFieldValue('custbodymsoaddress2', ConvertNSFieldToString(dealerRecord.getFieldValue('custentitymsoaddress2')));
    	soRec.setFieldValue('custbodymsocity', ConvertNSFieldToString(dealerRecord.getFieldValue('custentitymsocity')));
    	soRec.setFieldValue('custbodymsocountry', ConvertNSFieldToString(dealerRecord.getFieldValue('custentitymsocountry')));
    	soRec.setFieldValue('custbodymsostate', ConvertNSFieldToString(dealerRecord.getFieldValue('custentitymsostate')));
    	soRec.setFieldValue('custbodymsozipcode', ConvertNSFieldToString(dealerRecord.getFieldValue('custentitymsozipcode')));
    }
    else // UseMSO is not checked so pull the mso address from the ship to address
    {
    	// Have to use a search to get the long names for state and country.
	  	// otherwise it is the abbreviation and you can't set our custom fields with that.
	  	var filters = new Array(); 
	  	filters[0] = new nlobjSearchFilter('internalid', null, 'anyof', dealerId);
	  	filters[1] = new nlobjSearchFilter('isdefaultshipping', null, 'is', 'T');
	  	var columns = new Array(); 
	  	columns[0] = new nlobjSearchColumn('address1');
	  	columns[1] = new nlobjSearchColumn('address2');
	  	columns[2] = new nlobjSearchColumn('address3');
	  	columns[3] = new nlobjSearchColumn('city');
	  	columns[4] = new nlobjSearchColumn('statedisplayname');
	  	columns[5] = new nlobjSearchColumn('country');
	  	columns[6] = new nlobjSearchColumn('zipcode');
	  	columns[7] = new nlobjSearchColumn('addressee');
	  	columns[8] = new nlobjSearchColumn('attention');
	  	columns[9] = new nlobjSearchColumn('addressphone');
	  	columns[10] = new nlobjSearchColumn('internalid');
	  	columns[11] = new nlobjSearchColumn('address');
	  	var results = nlapiSearchRecord('customer', null, filters, columns); 
	  	if (results != null) 
	  	{
	  		soRec.setFieldValue('custbodymsoaddress', ConvertNSFieldToString(results[0].getValue('address1')));
	  		soRec.setFieldValue('custbodymsoaddress2', ConvertNSFieldToString(results[0].getValue('address2')));
	  		soRec.setFieldValue('custbodymsocity', ConvertNSFieldToString(results[0].getValue('city')) );
	  		//Use setFieldText for Country/ST because these are custom fields and the ID's don't match up with the addressbook ID's
	  		//So we pull the display names and use those to set our custom fields
	  		soRec.setFieldText('custbodymsocountry', ConvertNSFieldToString(results[0].getText('country')));
	  		soRec.setFieldText('custbodymsostate', ConvertNSFieldToString(results[0].getText('statedisplayname')));
	  		soRec.setFieldValue('custbodymsozipcode', ConvertNSFieldToString(results[0].getValue('zipcode')));
	  	}
    }
    
    //Set the correct Shipping Method.
    var dealerShipMethod = dealerRecord.getFieldValue('custentityrvs_dealer_unitshippingmethod');
    if(dealerShipMethod != null && dealerShipMethod != '')
    {
    	soRec.setFieldValue('shipmethod', dealerShipMethod);
    }
    
    //Remove the freight charge line item.
    var freightItem = GetFreightItem();
	for (var i = 1; i <= soRec.getLineItemCount('item'); i++)
	{
		if (soRec.getLineItemValue('item', 'item', i) == freightItem)
		{
			soRec.removeLineItem('item', i);
			break;
		}
	}
	
	//Add the DPU fee if applicable.
	if (ConvertNSFieldToString(soRec.getFieldValue('shipmethod')) == 6 && dealerRecord.getFieldValue('custentitygd_exemptfromdpufee') != 'T')
	{
		var dpuItem = ConvertNSFieldToString(nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_dpustoragefeeitem'));
		var dpuIndex = -1;
		for (var i = 1; i <= soRec.getLineItemCount('item'); i++)
		{
			if (soRec.getLineItemValue('item', 'item', i) == dpuItem)
			{
				dpuIndex = i;
				break;
			}
		}
		if (dpuIndex < 1)
		{
			//Add the charge
			soRec.selectNewLineItem('item');
			soRec.setCurrentLineItemValue('item', 'quantity', '1');
			//soRec.setCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', dpuItem);
			soRec.setCurrentLineItemValue('item', 'item', dpuItem);
			soRec.commitLineItem('item');
		}
	}
	
	//Save the record
	nlapiSubmitRecord(soRec, true);
}
