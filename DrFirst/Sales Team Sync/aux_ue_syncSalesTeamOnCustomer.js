//salesteam 
//employee 
//employee_display 
//salesrole 

var paramTpmRoleId = nlapiGetContext().getSetting('SCRIPT', 'custscript_tmproleid');
var paramChanMgrId = nlapiGetContext().getSetting('SCRIPT', 'custscript_chanmgrid');
var paramActMgrId = nlapiGetContext().getSetting('SCRIPT', 'custscript_actmgrid');
//6/26/2014 mod request
var paramDesigSuprId = nlapiGetContext().getSetting('SCRIPT','custscript_desupreprid');

function salesTeamSyncBeforeSubmit(type) {
	if (type == 'edit' || type == 'create') {
		
		//7/31/2014 - Modify to NOT Trigger the process if it's Web Services
		if (nlapiGetContext().getExecutionContext() == 'webservices') {
			log('debug','Execution context NOT User Interface','Execution Context is Web Services');
			return;
		}
		
		try {
			
			var tpmEmployees = new Array();
			var actEmployees = new Array();
			var chanEmployees = new Array();
			//6/26/2014
			var desigSupEmployees = new Array();
			
			var salesTeamCount = nlapiGetLineItemCount('salesteam');
			if (salesTeamCount > 0) {
				//6/27/2014 - Correction:
				//Loop through twice to build list of employees and their active/inactive status
				var employeeIds = new Array();
				var inactiveEmployees = {};
				for (var j=1; j <= salesTeamCount; j++) {					
					employeeIds.push(nlapiGetLineItemValue('salesteam','employee',j));
				}
				
				//do a search against employee record to grab inactive field value 
				if (employeeIds.length > 0) {
					var empflt = [new nlobjSearchFilter('internalid', null, 'anyof', employeeIds),
					              new nlobjSearchFilter('isinactive', null, 'is','T')];
					var empcol = [new nlobjSearchColumn('internalid')];
					var emprs = nlapiSearchRecord('employee', null, empflt, empcol);
					//loop through list of all inactive employees
					for (var e=0; emprs && e < emprs.length; e++) {
						log('debug','inactive employee id', emprs[e].getValue('internalid'));
						inactiveEmployees[emprs[e].getValue('internalid')] = emprs[e].getValue('internalid');
					}
				}
				
				for (var i=1; i <= salesTeamCount; i++) {
					var lineRoleId = nlapiGetLineItemValue('salesteam', 'salesrole', i);
					var lineEmployeeId = nlapiGetLineItemValue('salesteam','employee',i);
					
					//make sure employee is not inactive
					if (!inactiveEmployees[lineEmployeeId]) {
						if (lineRoleId == paramTpmRoleId) {
							tpmEmployees.push(lineEmployeeId);
						} else if (lineRoleId == paramChanMgrId) {
							chanEmployees.push(lineEmployeeId);
						} else if (lineRoleId == paramActMgrId) {
							actEmployees.push(lineEmployeeId);
						} else if (lineRoleId == paramDesigSuprId) {
							desigSupEmployees.push(lineEmployeeId);
						}
					}
				}
			}
			
			//Run Update on the field.
			//custentity_support_rep
			nlapiSetFieldValues('custentity_support_rep', desigSupEmployees, true, true);
			
			//custentity_tpm
			//if (tpmEmployees.length > 0) {
			log('debug','Size to TPM',tpmEmployees.length);
				nlapiSetFieldValues('custentity_tpm', tpmEmployees, true, true);
			//}
			//custentity_channel_manager
			//if (chanEmployees.length > 0) {
			log('debug','Size to Channel Manager', chanEmployees.length);
				nlapiSetFieldValues('custentity_channel_manager', chanEmployees, true, true);
			//}
			
			//custentity_account_manager
			//if (actEmployees.length > 0) {
			log('debug','Size of Account Manager', actEmployees.length);
				nlapiSetFieldValues('custentity_account_manager', actEmployees, true, true);
			//}
			
			
		} catch (syncerr) {
			log('error','Error syncing','Error syncing sales role employees: '+getErrText(syncerr));
			nlapiSendEmail(-5, nlapiGetContext().getUser(), 'Error Syncing Sales Role', 
						   'Error syncing sales role employemployee ees on '+type+': '+getErrText(syncerr)+' // Record Type: '+nlapiGetRecordType()+' // Record ID: '+nlapiGetRecordId(), 
						   null, 
						   null, 
						   null, 
						   null);
		}
		
	}
}