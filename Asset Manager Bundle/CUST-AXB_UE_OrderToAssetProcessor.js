/**
 * They type of user event script should be specific to NetSuite accounts.
 * This FILE is specific to SW Demo account (1191834)
 */

//List of processed item IDs
var itemClassToProcess = ['21','22','23','25','26','27','28','29'];


/**
 * After Submit Function Trigger
 * @param type
 */
function assetLicSoAfterSubmit(type) {

	//May want to add in additional  && type!='edit'
	if (type!='approve')
	{
		log('debug',type+' is not supported','Unsupported action to trigger Creation of Asset/License Record');
		return;
	}
	
	//Loop through and make sure there are list of answers
	var soItemsToProcess = [];
	for (var soi=1; soi <= nlapiGetLineItemCount('item'); soi += 1)
	{
		if (itemClassToProcess.contains(nlapiGetLineItemValue('item','class',soi)))
		{
			if (!soItemsToProcess.contains(nlapiGetLineItemValue('item','item',soi)))
			{
				soItemsToProcess.push(nlapiGetLineItemValue('item','item',soi));
			}
		}
	}
	
	if (soItemsToProcess.length <= 0) 
	{
		log('debug','No Asset/License Items Found','No Asset/License Items Found');
		return;
	}
	
	//For DEMO, make sure we don't create duplicate just incase.
	var aflt = [new nlobjSearchFilter('custrecord_ar_salesorder', null, 'anyof', nlapiGetRecordId())];
	var acol = [new nlobjSearchColumn('internalid'),
	            new nlobjSearchColumn('custrecord_ar_item')];
	var ars = nlapiSearchRecord('customrecord_asset_record', null, aflt, acol);
	
	var existJson = {};
	for (var e=0; ars && e < ars.length; e++) {
		existJson[ars[e].getValue('custrecord_ar_item')] = ars[e].getValue('custrecord_ar_item');
	}
	
	//Build JSON object of Line Items to build
	var newRec = nlapiGetNewRecord();
	var lineCount = newRec.getLineItemCount('item');
	
	for (var i=1; i <= lineCount; i++) {
		var itemclass = nlapiGetLineItemValue('item', 'class', i);
		var itemid = nlapiGetLineItemValue('item', 'item', i);
		var itemtext = nlapiGetLineItemText('item','item',i);
		var serialnumber = nlapiGetLineItemValue('item', 'custcol_ax_serialnumber', i);
		var assetStatus = '1'; //renewed active
		var entEndDate = nlapiGetFieldValue('enddate');
		var soid = nlapiGetRecordId();
		var custid = nlapiGetFieldValue('entity');
		
		if (!existJson[itemid] && itemClassToProcess.contains(itemclass)) {
			try {
				var clrec = nlapiCreateRecord('customrecord_asset_record', {recordmode:'dynamic'});
				clrec.setFieldValue('custrecord_ar_salesorder', soid);
				clrec.setFieldValue('custrecord_ar_customer', custid);
				clrec.setFieldValue('custrecord1392', itemtext);
				clrec.setFieldValue('custrecord_ar_item', itemid);
				clrec.setFieldValue('custrecord_ar_enddate', entEndDate);
				clrec.setFieldValue('custrecordar_status', assetStatus);
				clrec.setFieldValue('custrecord_ar_serial', serialnumber);
				nlapiSubmitRecord(clrec, true, true);
				
			} catch (err) {
				log('error','Error creating asset record', getErrText(err));
			}
		}
	}
}