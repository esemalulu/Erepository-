//Script meant to be executed in DEBUGGER mode to 

//1. search for list of ALL Actions (customrecord108)
var lastProc = '';

var aflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];

if (lastProc) {
	aflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', lastProc));
}

var acol = [new nlobjSearchColumn('internalid').setSort(true),
            new nlobjSearchColumn('name'),
            new nlobjSearchColumn('custrecord_tasktyperef')];
var ars = nlapiSearchRecord('customrecord108', null, aflt, acol);

for (var a=0; ars && a < ars.length; a++) 
{
	var actionid = ars[a].getValue('internalid');
	var taskid = ars[a].getValue('custrecord_tasktyperef');
	
	//Just in case, make sure it's not already in ADX: Worklist Rules (customrecord_adx_worklistrules)
	var wflt = [new nlobjSearchFilter('custrecord_wr_tasktype', null, 'anyof', taskid),
	            new nlobjSearchFilter('custrecord_wr_taskaction', null, 'anyof', actionid)];
	var wcol = [new nlobjSearchColumn('internalid')];
	var wrs = nlapiSearchRecord('customrecord_adx_worklistrules', null, wflt, wcol);
	
	if (!wrs) 
	{
		alert(actionid+' Processing with task id '+taskid+' // '+ars[a].getValue('name'));
		
		var wrec = nlapiCreateRecord('customrecord_adx_worklistrules', {recordmode:'dynamic'});
		wrec.setFieldValue('custrecord_wr_tasktype', taskid);
		wrec.setFieldValue('custrecord_wr_taskaction', actionid);
		var wrecid = nlapiSubmitRecord(wrec, true, true);		
	} 
	else 
	{
		alert(actionid+' Exists with task id '+taskid+' // '+ars[a].getValue('name'));
	} 
	
}