/**
 * Module Description
 *
 * Version		Date          	Author           		Remarks
 * 1.00       	05/17/2022    	Kalyani Chintala		NS Case# 4684980
 * 1.01			09/07/2022		Kalyani Chintala		NS Case# 4775712
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function customizeGlImpact(txnRec, standardLines, customLines, book)
{
	var createdFromTxt = convNull(txnRec.getFieldText('createdfrom'));
	if(createdFromTxt.indexOf('Sales Order') != 0 && createdFromTxt.indexOf('Return Authorization') != 0)
		return;

	var cFromId = txnRec.getFieldValue('createdfrom'), cFromType = '';
	nlapiLogExecution('Debug', 'Checking', 'createdFromTxt: ' + createdFromTxt);
	if(createdFromTxt.indexOf('Sales Order') > -1)
		cFromType = 'salesorder';
	else if(createdFromTxt.indexOf('Return Authorization') > -1)
		cFromType = 'returnauthorization';

	nlapiLogExecution('Debug', 'Checking', 'CREATED FROM: ' + cFromId + ', Cfrom Type: ' + cFromType);

	var cFromRec = nlapiLoadRecord(cFromType, cFromId);
	var reClassEvntType = convNull(cFromRec.getFieldValue('custbody_acs_so_reclass_event'));
	if(reClassEvntType == '')
		return;

	var reClassAcctId = convNull(getReClassAcctId(reClassEvntType));
	if(reClassAcctId == '')
		return;

	var cogsAcctsList = getCOGSAcctsList();
	nlapiLogExecution('Debug', 'Checking', 'cogsAcctsList: ' + JSON.stringify(cogsAcctsList));

	for ( var iPos = 0 ; iPos < standardLines.count; iPos++)
	{
		var acctId = standardLines.getLine(iPos).getAccountId();
		nlapiLogExecution('Debug', 'Checking', 'acctId: ' + acctId);
		if(cogsAcctsList.indexOf(''+acctId) == -1)
			continue;
		nlapiLogExecution('Debug', 'Checking', 'Found COGS Account on line: ' + iPos + ', Acct: ' + acctId);

		var dAmt = toNumber(standardLines.getLine(iPos).getDebitAmount());
		var cAmt = toNumber(standardLines.getLine(iPos).getCreditAmount());
		nlapiLogExecution('Debug', 'Checking', 'dAmt: ' + dAmt + ', cAmt: ' + cAmt);
		if(dAmt == 0 && cAmt == 0)
			continue;

		var classId = standardLines.getLine(iPos).getClassId();
		var locationId = standardLines.getLine(iPos).getLocationId();
		var departmentId = standardLines.getLine(iPos).getDepartmentId();
		var memo = standardLines.getLine(iPos).getMemo();
		var entityId = standardLines.getLine(iPos).getEntityId();


			var isCreditLine = cAmt != 0 ? true : false;
			var amount = dAmt;
			if(isCreditLine)
				amount = cAmt;

			var newLine = customLines.addNewLine();
			newLine.setAccountId(parseInt(acctId));
			if(isCreditLine)
				newLine.setDebitAmount(amount);
			else
				newLine.setCreditAmount(amount);
			if (convNull(classId) != '')
				newLine.setClassId(parseInt(classId));
			if (convNull(locationId) != '')
				newLine.setLocationId(parseInt(locationId));
			if (convNull(departmentId) != '')
				newLine.setDepartmentId(parseInt(departmentId));
			if (convNull(memo) != '')
				newLine.setMemo(memo);
			if(convNull(entityId) != '')
				newLine.setEntityId(parseInt(entityId));

		var newLine = customLines.addNewLine();
		newLine.setAccountId(parseInt(reClassAcctId));
		if(isCreditLine)
			newLine.setCreditAmount(amount);
		else
			newLine.setDebitAmount(amount);
		if (convNull(classId) != '')
			newLine.setClassId(parseInt(classId));
		if (convNull(locationId) != '')
			newLine.setLocationId(parseInt(locationId));
		if (convNull(departmentId) != '')
			newLine.setDepartmentId(parseInt(departmentId));
		if (convNull(memo) != '')
			newLine.setMemo(memo);
		if(convNull(entityId) != '')
			newLine.setEntityId(parseInt(entityId));
	}
}

function getReClassAcctId(reClassEvntType)
{
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecord_acs_so_reclass_event', null, 'anyof', reClassEvntType));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	var cols = new Array();
	cols.push(new nlobjSearchColumn('internalid'));
	cols.push(new nlobjSearchColumn('custrecord_acs_so_reclass_glacct'));
	var results = nlapiSearchRecord('customrecord_acs_so_reclass_events', null, filters, cols);
	if(results != null && results.length > 0)
	{
		return results[0].getValue('custrecord_acs_so_reclass_glacct');
	}
	return '';
}

function getCOGSAcctsList()
{
	var results = nlapiSearchRecord(null,'customsearch_ns_acs_get_cogs_accts');
	var acctsList = new Array();
	for(var idx=0; idx < results.length; idx++)
	{
		acctsList.push(''+results[idx].id);
	}
	return acctsList;
}

function convNull(value)
{
	if(value == null || value == '' || value == undefined)
		value = '';
	return value;
}

function toNumber(value)
{
	if(value == null || value == '' || isNaN(value) || parseFloat(value) == 'NaN')
		value = 0;
	return parseFloat(value);
}

function roundNumbers(value, precision)
{
	if(precision != null && precision != '' && precision != undefined)
		return Math.round(value*Math.pow(10,precision))/Math.pow(10,precision);

	return Math.round(value*Math.pow(10,2))/Math.pow(10,2);
}
