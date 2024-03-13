/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Sep 2012     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function beforeLoad(type, form, request){

	var context = nlapiGetContext();
	var userId = nlapiGetUser();
	
	if ((type == 'edit' || type == 'view') && context.getExecutionContext() == 'userinterface' && request.getParameter('r7stick') != 'T') {
	
		var orderId = nlapiGetFieldValue('custrecordr7caroriginalsalesorder');
		var orderType = 'salesorder';
		var customerId = nlapiGetFieldValue('custrecordr7carcustomer');
		
		var existingContract = nlapiGetRecordId();
		
		var params = new Array();
		params['custparam_orderid'] = orderId;
		params['custparam_ordertype'] = orderType;
		params['custparam_customer'] = customerId;
		params['custparam_currentcontract'] = existingContract;
		if (type == 'view') {
			params['custparam_view'] = 'T';
		}
		
		nlapiSetRedirectURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false, params);
		
	}
	
}

function afterSubmit(type){

	var salesOrderId = nlapiGetFieldValue('custrecordr7caroriginalsalesorder');
	var isinactive = nlapiGetFieldValue('isinactive');
	var processContract = nlapiGetFieldValue('custrecordr7carprocesscontract');
	
	if (type == 'xedit') {
		var fields = nlapiLookupField('customrecordr7contractautomation', nlapiGetRecordId(), new Array('isinactive', 'custrecordr7caroriginalsalesorder', 'custrecordr7carprocesscontract'));
		salesOrderId = fields['custrecordr7caroriginalsalesorder'];
		isinactive = fields['isinactive'];
		processContract = fields['custrecordr7carprocesscontract'];
	}
	
	if (isinactive == 'T' || type == 'delete') {
		removeContractFromOrder(salesOrderId);
		return;
	}
	else {
	
		addContractToOrder(salesOrderId);
		
		if (processContract == 'T') {
			stampStartEndDates();	
		}
		
	}
	
	nlapiSubmitField('customrecordr7contractautomation', nlapiGetRecordId(), 'custrecordr7carprocesscontract', 'F');
}

function stampStartEndDates(){

	var contractId = nlapiGetRecordId();
	var contractFields = nlapiLookupField('customrecordr7contractautomation', contractId, new Array('custrecordr7contractautostatus', 'custrecordr7cardurationyears', 'custrecordr7carstartdate', 'custrecordr7caroriginalsalesorder'));
	var contractStatus = contractFields['custrecordr7contractautostatus'];
	
	var contractYears = contractFields['custrecordr7cardurationyears'];
	var salesOrderId = contractFields['custrecordr7caroriginalsalesorder'];
	
	var startDate = new Date();
	var orderStart;
	
	if (salesOrderId != null && salesOrderId != '') {
		orderStart = nlapiLookupField('salesorder', salesOrderId, 'startdate');
		
		if (orderStart != null && orderStart != '') {
			startDate = nlapiStringToDate(orderStart);
		}
	}
	
	var contractStart = nlapiDateToString(startDate);
	var contractEnd = nlapiDateToString(nlapiAddDays(nlapiAddDays(startDate, contractYears * 365), -1));
	
	var fields = new Array();
	fields[0] = 'custrecordr7carstartdate';
	fields[1] = 'custrecordr7carenddate';
	fields[2] = 'custrecordr7contractautostatus';
	
	var values = new Array();
	values[0] = contractStart;
	values[1] = contractEnd;
	values[2] = 5; //approved
	nlapiSubmitField('customrecordr7contractautomation', contractId, fields, values);
	
}

function addContractToOrder(salesOrderId){

	if (salesOrderId != null && salesOrderId != '') {
		var strCurrentContracts = nlapiLookupField('salesorder', salesOrderId, 'custbodyr7contractautomationrecs');
		
		var arrCurrentContracts = new Array();
		if (strCurrentContracts != null && strCurrentContracts != '') {
			arrCurrentContracts = strCurrentContracts.split(",");
		}
		
		var found = false;
		for (var i = 0; arrCurrentContracts != null && i < arrCurrentContracts.length; i++) {
			if (arrCurrentContracts[i] === nlapiGetRecordId()) {
				found = true;
				break;
			}
		}
		
		if (!found) {
			for (var i = 0; arrCurrentContracts != null && i < arrCurrentContracts.length; i++) {
				var isInactive = nlapiLookupField('customrecordr7contractautomation', arrCurrentContracts[i], 'isinactive');
				if (isInactive == 'T') {
					arrCurrentContracts.splice(i, 1);
				}
			}
			arrCurrentContracts.push(nlapiGetRecordId());
			nlapiSubmitField('salesorder', salesOrderId, 'custbodyr7contractautomationrecs', arrCurrentContracts);
		}
	}
}

function removeContractFromOrder(orderId){

	var saveRec = false;
	
	if (orderId != null && orderId != '') {
		var recOrder = nlapiLoadRecord('salesorder', orderId);
		
		var lineCount = recOrder.getLineItemCount('item');
		
		for (var i = 1; i <= lineCount; i++) {
		
			var currentContractId = recOrder.getLineItemValue('item', 'custcolr7contractrenewal', i);
			
			if (currentContractId === nlapiGetRecordId()) {
				recOrder.setLineItemValue('item', 'custcolr7contractrenewal', i, '');
				recOrder.setLineItemValue('item', 'custcolr7renewedfromlineid', i, '');
				saveRec = true;
			}
			
		}
		
		var strCurrentContracts = recOrder.getFieldValue('custbodyr7contractautomationrecs');
		var arrNewContracts = new Array();
		if (strCurrentContracts != null && strCurrentContracts != '') {
			arrNewContracts = strCurrentContracts.split(",");
		}
		
		for (var j = 0; arrNewContracts != null && j < arrNewContracts.length; j++) {
		
			if (arrNewContracts[j] == nlapiGetRecordId()) {
				saveRec = true;
				arrNewContracts.splice(j, 1);
			}
			
		}
		
		recOrder.setFieldValue('custbodyr7contractautomationrecs', arrNewContracts);
		
	}
	
	if (saveRec) {
		nlapiSubmitRecord(recOrder, true, true);
	}
	
}
