/*
 * @author efagone
 */

function reduce5_suitelet(request, response){

	var oppId = null;
	
	if (request.getMethod() == 'GET') {
	
		oppId = request.getParameter('custparam_oppid');
		
		if (oppId != null && oppId != '') {
		
			var recOpp = nlapiLoadRecord('opportunity', oppId);
			
			var form = nlapiCreateForm('Opportunity Uplift Suitelet', true);
			form.setScript('customscriptaddremoveuplift_suitelet_cs');
			
			form.addField('custpage_orderid', 'select', 'Opportunity', 'transaction').setDisplayType('inline');
			form.getField('custpage_orderid').setDefaultValue(oppId);
			
			form.addField('custpage_upliftpercent', 'integer', 'Uplift Percentage');
			form.getField('custpage_upliftpercent').setMandatory(true);
			form.getField('custpage_upliftpercent').setDisplaySize(10);
			//creating list objects
			var lineItemList = form.addSubList('custpage_lineitemlist', 'list', 'Line Items');
			lineItemList.addButton('custpage_markall', 'Mark All', 'markAll()');
			lineItemList.addButton('custpage_unmarkall', 'Unmark All', 'unmarkAll()');
			
			lineItemList.addField('custpage_lineitem_itemid', 'text').setDisplayType('hidden');
			lineItemList.addField('custpage_lineitem_lineid', 'text').setDisplayType('hidden');
			var fldLineItemCheckbox = lineItemList.addField('custpage_lineitem_select', 'checkbox', 'Remove Uplift?');
			fldLineItemCheckbox.setDefaultValue('T');
			lineItemList.addField('custpage_lineitem_quantity', 'float', 'Quantity');
			lineItemList.addField('custpage_lineitem_itemtext', 'text', 'Item');
			lineItemList.addField('custpage_lineitem_description', 'textarea', 'Description');
			lineItemList.addField('custpage_lineitem_rate', 'text', 'Rate');
			lineItemList.addField('custpage_lineitem_amount', 'currency', 'Amount');
			
			var arrItems = getItemsFromOrder(recOpp);
			
			for (var i = 0, j = 1; arrItems != null && i < arrItems.length; i++, j++) {
				var listItem = arrItems[i];
				
				var description = listItem['description'];
				if (description != null && description.length > 60) {
					description = description.substr(0, 60);
				}
				
				lineItemList.setLineItemValue('custpage_lineitem_itemid', j, listItem['itemId']);
				lineItemList.setLineItemValue('custpage_lineitem_lineid', j, listItem['lineId']);
				lineItemList.setLineItemValue('custpage_lineitem_quantity', j, listItem['quantity']);
				lineItemList.setLineItemValue('custpage_lineitem_rate', j, addCommas(listItem['rate']));
				lineItemList.setLineItemValue('custpage_lineitem_amount', j, listItem['amount']);
				lineItemList.setLineItemValue('custpage_lineitem_itemtext', j, listItem['itemText']);
				lineItemList.setLineItemValue('custpage_lineitem_description', j, description);
				
			}
			
			form.addSubmitButton('Submit');
			response.writePage(form);
		}
		
	}
	
	if (request.getMethod() == 'POST') {
		var lineItemCount = request.getLineItemCount('custpage_lineitemlist');
		var oppId = request.getParameter('custpage_orderid');
		var uplift = parseFloat(request.getParameter('custpage_upliftpercent'));
		uplift = uplift/100;
		nlapiLogExecution('AUDIT', 'uplift', uplift);	

		var objLineIds = new Object;
		
		for (var i = 1; i <= lineItemCount; i++) {
			
			var lineId = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_lineid', i);
			var include = request.getLineItemValue('custpage_lineitemlist', 'custpage_lineitem_select', i);
			
			if (include == 'T') {
				objLineIds[lineId] = true;
			}
			
		}
		
		var success = makeChanges(oppId, objLineIds, uplift);
		
		if (success) {
			nlapiSetRedirectURL('RECORD', 'opportunity', oppId, false);
			//response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");
			return;
		}
	}
	
	response.writeLine('Error updating line item amounts. Contact Administrator.');
	return;
}

function makeChanges(oppId, objLineIds, uplift){

	try {
		
		var recOrder = nlapiLoadRecord('opportunity', oppId, {recordmode: 'dynamic'});
			
		lineItemCount = recOrder.getLineItemCount('item');
		
		for (var k = 1; k <= lineItemCount; k++) {
		
			var lineId = recOrder.getLineItemValue('item', 'id', k);
			
			if (objLineIds.hasOwnProperty(lineId)) {
			
				var itemType = recOrder.getLineItemValue('item', 'itemtype', k);
				var coTerm = formatAmount(recOrder.getLineItemValue('item', 'custcolr7opamountrenewalcotermline', k));
				var multiYr = formatAmount(recOrder.getLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', k));
				
				var quantity = formatAmount(recOrder.getLineItemValue('item', 'quantity', k));
				var rate = formatAmount(recOrder.getLineItemValue('item', 'rate', k));
				
				if (rate == 0) {
					continue;
				}
				var newRate = (uplift > 0) ? Math.round(((rate * (1 + uplift))) * 100) / 100 : Math.round(((rate / (1 - uplift))) * 100) / 100;
				var newAmount = Math.round((quantity * newRate) * 100) / 100;
				
				if (itemType == 'Discount' && recOrder.getLineItemValue('item', 'rate', k).indexOf('%') != -1) {
					//nothing
				}
				else {
				
					recOrder.setLineItemValue('item', 'rate', k, newRate);
					recOrder.setLineItemValue('item', 'amount', k, newAmount);
					
					var baseAmount = formatAmount(recOrder.getLineItemValue('item', 'custcolr7opamountrenewalbaseline', k));
					var newBaseAmount = (uplift > 0) ? (baseAmount * (1 + uplift)) : (baseAmount / (1 - uplift));
					
					if (coTerm == 0 && multiYr == 0) {
						newBaseAmount = newAmount;
					}
					recOrder.setLineItemValue('item', 'custcolr7opamountrenewalbaseline', k, Math.round(newBaseAmount * 100) / 100);
					
				}
			}
		}
		
		recOrder.setFieldValue('custbodyr7upliftpercentage', uplift*100);
		
		nlapiSubmitRecord(recOrder);
		
		return true;
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, nlapiGetUser(), 'Error on reducing 5%', 'OppId: ' + oppId + '\n\nError: ' + e);
		nlapiLogExecution('ERROR', 'Error on reducing 5%', 'OppId: ' + oppId + '\n\nError: ' + e);
		return false;
	}
}

function formatAmount(amount){

	if (amount != null && amount != '') {
		return parseFloat(amount);	
	}
	
	return 0;
}

function addCommas(nStr){
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function getItemsFromOrder(recOrder){

	if (recOrder != null) {
		var lineItems = new Array();
		
		var lineItemCount = recOrder.getLineItemCount('item');
		
		for (var i = 1; i <= lineItemCount; i++) {
			var lineItem = new Array();
			
			var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
			if (itemType != 'Subtotal' && itemType != 'Description') {
			
				lineItem['itemId'] = recOrder.getLineItemValue('item', 'item', i);
				lineItem['itemText'] = recOrder.getLineItemText('item', 'item', i);
				lineItem['quantity'] = recOrder.getLineItemValue('item', 'quantity', i);
				lineItem['rate'] = recOrder.getLineItemValue('item', 'rate', i);
				lineItem['amount'] = recOrder.getLineItemValue('item', 'amount', i);
				lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
				lineItem['description'] = recOrder.getLineItemValue('item', 'description', i);
				lineItems[lineItems.length] = lineItem;
			}
		}
		
		return lineItems;
	}
	return null;
}
