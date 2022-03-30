/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Feb 2016     Fan Lu
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet(request, response){
	var config = [{
		col: 'custcol_es_bayview',
		tosubsidiary: '12',
		transferlocation: '40'
	},{
		col: 'custcol_es_yorkville',
		tosubsidiary: '12',
		transferlocation: '39'
	},{
		col: 'custcol_oakville',
		tosubsidiary: '12',
		transferlocation: '41'
	},{
		col: 'custcol_avenue',
		tosubsidiary: '12',
		transferlocation: '34'
	},{
		col: 'custcol_es_sherway',
		tosubsidiary: '12',
		transferlocation: '42'
	},{
		col: 'custcol_yonge_st',
		tosubsidiary: '12',
		transferlocation: '43'
	},{
		col: 'custcol_es_commissary',
		tosubsidiary: '13',
		transferlocation: '47'
	}];
	var pId = request.getParameter('esId');
	var purchaseOrder = nlapiLoadRecord('purchaseorder', pId);
	var count = purchaseOrder.getLineItemCount('item');
	var createdRecords = [];
	var firstType;
	
	var invantoryItems = (function(id){
		var output = null;
		var results = nlapiSearchRecord('purchaseorder', null, 
				[['mainline', 'is', 'F'], 'and',
				 ['internalid', 'anyof', id], 'and',
				 ['item.type', 'anyof', 'InvtPart']],
				 [new nlobjSearchColumn('item')]);
		for (var i = 0; results && i < results.length; i += 1) {
			if (!output) {
				output = {};
			}
			output[results[i].getValue('item')] = true;
		}
		return output;
	})(pId);


	for (var i = 0; invantoryItems && i < config.length; i += 1) {
		var sum = 0;
		for (var l = 1; l <= count; l += 1) {
			if (invantoryItems[purchaseOrder.getLineItemValue('item', 'item', l)]) {
				sum += parseFloat(purchaseOrder.getLineItemValue('item', config[i].col, l) || 0) || 0;
			}
		}
		if (sum > 0) {
			var transactionType = (config[i]['tosubsidiary'] == purchaseOrder.getFieldValue('subsidiary'))?'transferorder':'intercompanytransferorder';
			
			var transferRecord = nlapiCreateRecord(transactionType, {recordmode: 'dynamic'});
			transferRecord.setFieldValue('subsidiary', purchaseOrder.getFieldValue('subsidiary'));
			transferRecord.setFieldValue('location', purchaseOrder.getFieldValue('location'));
			if (transactionType == 'intercompanytransferorder') {
				transferRecord.setFieldValue('tosubsidiary', config[i]['tosubsidiary']);
			}
			transferRecord.setFieldValue('transferlocation', config[i]['transferlocation']);
			transferRecord.setFieldValue('custbody_es_created_from', pId);
			transferRecord.setFieldValue('memo', 'Created from ' + pId);
			for (var l = 1; l <= count; l += 1) {
				if (invantoryItems[purchaseOrder.getLineItemValue('item', 'item', l)]) {
					var value = parseFloat(purchaseOrder.getLineItemValue('item', config[i].col, l) || 0) || 0;
					var units = purchaseOrder.getLineItemValue('item', 'units', l);
					if (value > 0) {
						transferRecord.selectNewLineItem('item');
						transferRecord.setCurrentLineItemValue('item', 'item', purchaseOrder.getLineItemValue('item', 'item', l));
						transferRecord.setCurrentLineItemValue('item', 'quantity', value);
						transferRecord.setCurrentLineItemValue('item', 'units', units);
						transferRecord.setCurrentLineItemValue('item', 'rate', purchaseOrder.getLineItemValue('item', 'rate', l));
						transferRecord.commitLineItem('item');
					}
				}
			}
			var tId = nlapiSubmitRecord(transferRecord, false, true);
			if (!firstType) {
				firstType = transactionType;
			}
			createdRecords.push(tId);
			nlapiLogExecution('AUDIT', 'Create Transfer Order', tId);
			//FulFillment
			var fulfillmentRecord = nlapiTransformRecord(transactionType, tId, 'itemfulfillment');
			var fId = nlapiSubmitRecord(fulfillmentRecord, false, true);
			createdRecords.push(fId);
			nlapiLogExecution('AUDIT', 'Create Itemfulfillment', fId);
		}
	}
	if (createdRecords.length == 1) {
		response.sendRedirect('RECORD', firstType, createdRecords[0]);
	} else if (createdRecords.length > 1) {
		var form = nlapiCreateForm('Created Record', false);
		for (var i = 0; i < createdRecords.length; i += 1) {
			var field = form.addField('custpage_' + i, 'select', '', 'transaction');
			field.setDisplayType('inline');
			field.setDefaultValue(createdRecords[i]);
		}
		response.writePage(form);
	} else {
		response.writeLine('No record is created.');
	}
}
