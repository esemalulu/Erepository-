/*
 * @author efagone
 */


function zc_opportunity_migrate_nxentall_suitelet(request, response){

	var tranId = request.getParameter('custparam_tranid');
	var tranType = request.getParameter('custparam_trantype');
	
	try {
		nlapiLogExecution('AUDIT', 'Beginning upgrade process');
		upgradeOpportunity(tranId);
		
		return response.writeLine(JSON.stringify({
			success: true,
			error: null
		}));
	} 
	catch (e) {
		if (e.code) {
			return response.writeLine(JSON.stringify({
				success: false,
				error: 'Code: ' + e.code + '\nDetails: ' + e.details
			}));
		}
		else {
			return response.writeLine(JSON.stringify({
				success: false,
				error: e
			}));
		}
		
	}
	
}

function upgradeOpportunity(oppId){

	var recTran = nlapiLoadRecord('opportunity', oppId, {recordmode: 'dynamic'});
	var projectedTotal_original = recTran.getFieldValue('projectedtotal');
	
	var arrProductKeys = [];
	var lineItemCount = recTran.getLineItemCount('item');
	for (var i = 1; i <= lineItemCount; i++) {
	
		var pk = recTran.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
		if (pk != null && pk != '') {
			arrProductKeys.push(pk);
		}
	}
	arrProductKeys = unique(arrProductKeys);
	
	var arrGroups = getAdditionalOppDetails(oppId, arrProductKeys);
	
	for (var i = 0; arrGroups != null && i < arrGroups.length; i++) {
	
		var objGroup = arrGroups[i];
		var arrLinesToSmoosh = objGroup.arr_line_ids;

		var newTerm = days_between(nlapiStringToDate(objGroup.acl_start), nlapiStringToDate(objGroup.acl_end));
		
		for (var k = 0; arrLinesToSmoosh != null && k < arrLinesToSmoosh.length; k++) {
		
			var lineCount = recTran.getLineItemCount('item');
			for (var j = 1; j <= lineCount; j++) {
				var lineid = recTran.getLineItemValue('item', 'line', j);
				
				if (lineid == arrLinesToSmoosh[k]) {
					var amount = recTran.getLineItemValue('item', 'amount', j) || 0;
					var startdate = recTran.getLineItemValue('item', 'custcolr7startdate', j);
					var enddate = recTran.getLineItemValue('item', 'custcolr7enddate', j);
					
					if (startdate == null || startdate == '' || enddate == null || enddate == '') {
						throw nlapiCreateError('MISSING_DATE_SRCH', 'Transaction not eligible for upgrade. Please contact Administrator.');
					}
					
					var lineTerm = days_between(nlapiStringToDate(startdate), nlapiStringToDate(enddate));
					
					var dailyAmount = parseFloat(amount) / lineTerm;
					objGroup.runningtotal += dailyAmount * newTerm;
					nlapiLogExecution('AUDIT', 'calculating line', 'lineid: ' + lineid + '\nlineTerm:' + lineTerm + '\nnewTerm: ' + newTerm + '\namount: ' + amount + '\ndailyAmount: ' + dailyAmount);
					if (objGroup.insert_to_linenum == null || objGroup.insert_to_linenum == objGroup.acl_line) {
						objGroup.insert_to_linenum = j;
					}
					
					if (lineid == objGroup.acl_line) {
						objGroup.location = recTran.getLineItemValue('item', 'location', j);
						objGroup.createdfrom = recTran.getLineItemValue('item', 'custcolr7createdfromra', j);
						objGroup.createdfrom_line = recTran.getLineItemValue('item', 'custcolr7createdfromra_lineid', j);
						objGroup.contact = recTran.getLineItemValue('item', 'custcolr7translinecontact', j);
					}
				}
			}
		}
		
		nlapiLogExecution('AUDIT', 'objGroup.insert_to_linenum', objGroup.insert_to_linenum);
		nlapiLogExecution('AUDIT', 'objGroup.new_qty', objGroup.new_qty);
		nlapiLogExecution('AUDIT', 'objGroup.runningtotal', objGroup.runningtotal);
		// RNXENTALL: 1369
		recTran.insertLineItem('item', objGroup.insert_to_linenum);
		recTran.selectLineItem('item', objGroup.insert_to_linenum);
		recTran.setCurrentLineItemValue('item', 'item', 1369);
		recTran.setCurrentLineItemValue('item', 'price', -1);
		recTran.setCurrentLineItemValue('item', 'quantity', objGroup.new_qty);
		recTran.setCurrentLineItemValue('item', 'rate', Math.round((objGroup.runningtotal / parseFloat(objGroup.new_qty)) * 1000000) / 1000000);
		recTran.setCurrentLineItemValue('item', 'amount', Math.round(objGroup.runningtotal * 100) / 100);
		recTran.setCurrentLineItemValue('item', 'custcolr7itemmsproductkey', objGroup.productkey);
		recTran.setCurrentLineItemValue('item', 'custcolr7startdate', objGroup.acl_start);
		recTran.setCurrentLineItemValue('item', 'custcolr7enddate', objGroup.acl_end);
		recTran.setCurrentLineItemValue('item', 'location', objGroup.location);
		recTran.setCurrentLineItemValue('item', 'custcolr7createdfromra', objGroup.createdfrom);
		recTran.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', objGroup.createdfrom_line);
		recTran.setCurrentLineItemValue('item', 'custcolr7translinecontact', objGroup.contact);
		recTran.commitLineItem('item');
		
		for (var k = 0; arrLinesToSmoosh != null && k < arrLinesToSmoosh.length; k++) {
		
			for (var j = 1; j <= recTran.getLineItemCount('item'); j++) {
				var lineid = recTran.getLineItemValue('item', 'line', j);
				
				if (lineid == arrLinesToSmoosh[k]) {
					recTran.removeLineItem('item', j);
					j--;
				}
			}
		}
	}
	
	var projectedTotal_new = recTran.getFieldValue('projectedtotal');
	
	if (projectedTotal_new != projectedTotal_original) {
		nlapiLogExecution('AUDIT', 'projectedTotal_new', projectedTotal_new);
		nlapiLogExecution('AUDIT', 'projectedTotal_original', projectedTotal_original);
		throw nlapiCreateError('TOTAL_MODIFIED', 'Transaction not eligible for upgrade. Please contact Administrator.');
	}
	nlapiLogExecution('AUDIT', 'SUBMITTING OPP', 'NOW');
	nlapiSubmitRecord(recTran, true, true);
}

function getAdditionalOppDetails(oppId, arrProductKeys){

	var arrFilters = [];
	arrFilters[0] = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
	arrFilters[0].setFormula("CASE WHEN {custcolr7itemmsproductkey} = ANY('" + arrProductKeys.join("', '") + "') THEN 1 ELSE 0 END");
	arrFilters[0].setLeftParens(1);
	arrFilters[0].setOr(true);
	arrFilters[1] = new nlobjSearchFilter('internalid', null, 'anyof', oppId);
	arrFilters[1].setRightParens(1);
	
	var arrResults = nlapiSearchRecord('transaction', 17088, arrFilters);

	if (arrResults == null || arrResults.length < 1) {
		throw nlapiCreateError('INELIGIBLE_NONE', 'Transaction not eligible for upgrade. Please contact Administrator.');
	}
	
	var arrGroups = [];
	
	for (var i = 0; arrResults != null && i < arrResults.length; i++) {
		var columns = arrResults[i].getAllColumns();
		
		if (arrResults[i].getValue(columns[0]) != oppId){
			//product key is over multiple opps
			throw nlapiCreateError('INELIGIBLE_MULTI', 'Transaction not eligible for upgrade. Please contact Administrator.');
		}
		
		var acl_start = arrResults[i].getValue(columns[8]);
		var acl_end = arrResults[i].getValue(columns[9]);
		
		if (acl_start == null || acl_start == '' || acl_end == null || acl_end == ''){
			throw nlapiCreateError('MISSING_DATE_SRCH', 'Transaction not eligible for upgrade. Please contact Administrator.');
		}
		
		arrGroups.push({
			id: arrResults[i].getValue(columns[0]),
			new_qty: arrResults[i].getValue(columns[1]),
			number_of_lines: arrResults[i].getValue(columns[3]),
			arr_line_ids: txtToArray(arrResults[i].getValue(columns[4])),
			acl_line: arrResults[i].getValue(columns[5]),
			productkey: arrResults[i].getValue(columns[6]),
			acl_start: acl_start,
			acl_end: acl_end,
			runningtotal: 0,
			insert_to_linenum: null,
			createdfrom: null,
			createdfrom_line: null,
			contact: null,
			location: null
		});
	}
	
	return arrGroups;
}

function logError(name, error){
	nlapiLogExecution('ERROR', name, error);
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser, adminUser, name, 'Error: ' + error);
}

function txtToArray(val){

	if (val == null || val == '') {
		return [];
	}
	
	return val.split(',');
}

function myCustomSort(a, b){
	var licA = a.isparent;
	var licB = b.isparent;
	
	if (licA > licB) //sort string ascending
		return -1;
	if (licA < licB) 
		return 1;
	return 0; //default return value (no sorting)
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function isBlank(value){
	return (value == null || value == '' || value == 'null') ? true : false;
}

function days_between(date1, date2) {
	
	if (isBlank(date1) || isBlank(date2)){
		return null;
	}
	
	// The number of milliseconds in one day
	var ONE_DAY = 1000 * 60 * 60 * 24;

	// Convert both dates to milliseconds
	var date1_ms = date1.getTime();
	var date2_ms = date2.getTime();

	// Calculate the difference in milliseconds
	var difference_ms = (date1_ms - date2_ms) * -1;
	
	var days = Math.round(difference_ms / ONE_DAY);
	
	// Convert back to days and return
	return (days == 364) ? days + 1 : days; //add extra day for leap years

}