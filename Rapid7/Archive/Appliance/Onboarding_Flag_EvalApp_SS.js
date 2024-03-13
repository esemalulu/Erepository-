/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Feb 2013     mburstein
 * 
 *	MB: 11/6/14 - Fixed bug that occurs when the customer is null
 */
function beforeLoad(type){
	if (type == 'edit' || type == 'view') {
		var recType = nlapiGetRecordType();
		nlapiLogExecution('DEBUG', 'recType', recType);
		if (recType == 'customrecordr7onboarding' || recType == 'customrecordr7appliancebuildrequest') {
			// Set fields to use for Account Management Onboarding record
			if(recType =='customrecordr7onboarding'){
				var customerField = 'custrecordr7onboardingcustomer';
				var tableField = 'custrecordr7onboardingevalappliances';
			}
			// Set fields to use for HBR records
			else if(recType =='customrecordr7appliancebuildrequest'){
				var customerField = 'custrecordr7appbuildcustomer';
				var tableField = 'custrecordr7appbuildevalappliances';
			}
			var customerId = nlapiGetFieldValue(customerField);
			
			// MB: 11/6/14 - Fixed bug that occurs when the customer is null
			if(customerId != null && customerId != ''){
				
				var filters = new Array();
				filters[filters.length] = new nlobjSearchFilter('custrecordr7appliancecustomer', null, 'is', customerId);
				filters[filters.length] = new nlobjSearchFilter('custrecordr7appliancestatus', null, 'anyof', new Array(6, 19)); //6 Evaluation or Pending Return
				
				var columns = new Array();
				columns[0] = new nlobjSearchColumn('internalid');
				columns[1] = new nlobjSearchColumn('name');
				columns[2] = new nlobjSearchColumn('custrecordr7appliancenehardwaretype');
				columns[3] = new nlobjSearchColumn('custrecordr7appliancestatus');
				
				var results = nlapiSearchRecord('customrecordr7appliance', null, filters, columns);
				
				var evalAppliancesTable = '';
				var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
				if (results != null && results != '') {
				
					// Build HTML for eval appliance table
					evalAppliancesTable += '<html><body><style type="text/css">';
					evalAppliancesTable += '#applianceTable { background-color: #f5f5f5; padding: 5px; border-radius: 5px; -moz-border-radius: 5px; -webkit-border-radius: 5px; border: 1px solid #red;}';
					evalAppliancesTable += '#applianceTable td, #applianceTable th { padding: 1px 5px;}';
					evalAppliancesTable += '#applianceTable thead { font: normal 15px Helvetica Neue,Helvetica,sans-serif; text-shadow: 0 1px 0 white; color: #999;}';
					evalAppliancesTable += '#applianceTable th {text-align: left; border-bottom: 1px solid red;}';
					evalAppliancesTable += '#applianceTable td {font-size: 14px;}';
					evalAppliancesTable += 'td.applianceTableHover:hover {background-color: #3EA99F;}';
					evalAppliancesTable += '</style>';
					evalAppliancesTable += '</style>';
					evalAppliancesTable += '<table id="applianceTable" width="400px"><tr>';
					evalAppliancesTable += '<thead><tr>';
					evalAppliancesTable += '<th style="font-size:14px">Appliance</th>';
					evalAppliancesTable += '<th style="font-size:14px">Type</th>';
					evalAppliancesTable += '<th style="font-size:14px">Status</th>';
					evalAppliancesTable += '</tr></th>';
					
					for (var i = 0; i < results.length; i++) {
						var result = results[i];
						var id = result.getValue(columns[0]);
						var appId = result.getValue(columns[1]);
						var hardwareTypeText = result.getText(columns[2]);
						var statusText = result.getText(columns[3]);
						nlapiLogExecution('DEBUG', 'id', id);
						nlapiLogExecution('DEBUG', 'appId', appId);
						nlapiLogExecution('DEBUG', 'hardwareTypeText', hardwareTypeText);
						nlapiLogExecution('DEBUG', 'statusText', statusText);
						
						evalAppliancesTable += '<tr>';
						evalAppliancesTable += '<td class="applianceTableHover" width="30%" font-size:12px;"><a href="'+toURL+'/app/common/custom/custrecordentry.nl?id=' + id + '&rectype=61">' + appId + '</a></td>';
						evalAppliancesTable += '<td width="40%" font-size:12px"">' + hardwareTypeText + '</td>';
						evalAppliancesTable += '<td width="30%" font-size:12px;">' + statusText + '</td>';
						evalAppliancesTable += '</tr>';
					}
					evalAppliancesTable += '</table></body></html>';
				}
			
				// Set Eval Appliances field value to eval appliance table
				nlapiSetFieldValue(tableField, evalAppliancesTable);
			}
			else {
				nlapiSetFieldValue(tableField, '<p style="color:red;">ALERT: No Customer Selected!</p>');
			}
		}
	}
}

