var col = new Array();
col[0] = new nlobjSearchColumn('name');
col[1] = new nlobjSearchColumn('internalId');
var results = nlapiSearchRecord('customlist33', null, null, col);
	for ( var i = 0; results != null && i < result.length; i++ )
	{
		var res = results[i];
		var listValue = (res.getValue('name'));
		var listID = (res.getValue('internalId'));
		nlapiLogExecution('DEBUG', (listValue + ", " + listID));
	} 