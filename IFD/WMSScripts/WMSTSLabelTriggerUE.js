nlapiLogExecution("audit","FLOStart",new Date().getTime());
//require(['N/record'], function(record) {
function WMSTSLabelTrigger(type)
{
	var ctx = nlapiGetContext();
	var exeCtx = ctx.getExecutionContext();
	var curruser = ctx.getUser();
	var customForm = nlapiGetFieldValue('customform');
	var role = nlapiGetRole();
	
	var message = 'type = ' + type + '<br>';
	message = message + 'execution context = ' + exeCtx + '<br>';
	message = message + 'custom form = ' + customForm + '<br>';
	message = message + 'role = ' + role;
	message = message + 'User = ' + curruser;
	nlapiLogExecution('DEBUG', 'output', message);


	nlapiLogExecution('DEBUG', 'Into WMSTSLabelTriggerScript with Type', 'Into WMSTSLabelTriggerScript with type ='+type);
	
	if (type == 'create')
	{
		var otid = nlapiGetRecordId();
		nlapiLogExecution('DEBUG', 'WMS Open Task id', otid);

		var otfields = ['custrecord_wmsse_tasktype', 'custrecord_wmsse_wms_location']
		var otcolumns = nlapiLookupField('customrecord_wmsse_trn_opentask', otid, otfields);
        var ottask = otcolumns.custrecord_wmsse_tasktype; 
		var whLocation = otcolumns.custrecord_wmsse_wms_location;
 
        nlapiLogExecution('DEBUG', 'WMS Open Task id Values', 'WMS Open Task id='+otid+';whLocation='+whLocation);

        if (ottask == '2')
		{
            nlapiLogExecution('DEBUG', 'Calling Label generation function for WMS Open Task id', 'Calling Label generation function for WMS Open Task id='+otid);
			nlapiLogExecution('DEBUG', 'RCVLabelFormat','Validating system rule for "Custom Label : Receiving Label Format"');
			var sysruleFilters1 = new Array();
			sysruleFilters1.push(new nlobjSearchFilter('name', null, 'is', 'Custom Label : Receiving Label Format'));
			if(whLocation !=null && whLocation!='' && whLocation!='null')
				sysruleFilters1.push(new nlobjSearchFilter('custrecord_wmssesite', null, 'anyof', ['@NONE@',whLocation]));
			sysruleFilters1.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
			var sysruleColumns1 = new Array();
			sysruleColumns1[0] = new nlobjSearchColumn('custrecord_wmsserulevalue');
			sysruleColumns1[1] = new nlobjSearchColumn('custrecord_wmssesite').setSort();
			var systemRulesSearchresults1 = nlapiSearchRecord('customrecord_wmsse_sysrules', null, sysruleFilters1, sysruleColumns1);
			if(systemRulesSearchresults1 !=null && systemRulesSearchresults1 !='')
			{
				var RCVLabelFormat=systemRulesSearchresults1[0].getValue('custrecord_wmsserulevalue');
			}
			nlapiLogExecution('DEBUG', 'RCVLabelFormat',RCVLabelFormat);
			nlapiLogExecution('DEBUG', 'RCVLabelFormat','Validating system rule for "Custom Label : Receiving Label JSON File ID"');
			var sysruleFilters2 = new Array();
			sysruleFilters2.push(new nlobjSearchFilter('name', null, 'is', 'Custom Label : Receiving Label JSON File ID'));
			if(whLocation !=null && whLocation!='' && whLocation!='null')
				sysruleFilters2.push(new nlobjSearchFilter('custrecord_wmssesite', null, 'anyof', ['@NONE@',whLocation]));
			sysruleFilters2.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
			var sysruleColumns2 = new Array();
			sysruleColumns2[0] = new nlobjSearchColumn('custrecord_wmsserulevalue');
			sysruleColumns2[1] = new nlobjSearchColumn('custrecord_wmssesite').setSort();
			var systemRulesSearchresults2 = nlapiSearchRecord('customrecord_wmsse_sysrules', null, sysruleFilters2, sysruleColumns2);
			if(systemRulesSearchresults2 !=null && systemRulesSearchresults2 !='')
			{
				var RCVLabelJSONID=parseFloat(systemRulesSearchresults2[0].getValue('custrecord_wmsserulevalue'));
			}
			nlapiLogExecution('DEBUG', 'RCVLabelJSONID',RCVLabelJSONID);
				
			if(RCVLabelFormat=='BartenderFormat')
			{
				nlapiLogExecution('DEBUG', 'Executing BartenderFormat label','Executing BartenderFormat label');
				var lbldone = WMSTSExternalLabelCreation({OTids : otid, JSONfileid : RCVLabelJSONID, uid : curruser});
				nlapiLogExecution('DEBUG', 'Executed BartenderFormat label','Executed BartenderFormat label with return code = '+lbldone);
			}	
            else if(RCVLabelFormat=='ZebraFormat')
			{
				nlapiLogExecution('DEBUG', 'Executing ZebraFormat label','Executing ZebraFormat label');
			}	
	   }	 
    }
	nlapiLogExecution('DEBUG', 'Out of WMSTSLabelTriggerScript with Type', 'Out of WMSTSLabelTriggerScript with type ='+type);
}
//});
