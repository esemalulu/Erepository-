

var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct18_lastprocid');

//Parameter to indicate if we should ONLY process Journal Entries.
var paramJournalOnly = nlapiGetContext().getSetting('SCRIPT','custscript_sct18_journalonly');


function clearDeptOnTransaction() {
	var trxjson = {
		"VendBill":"vendorbill",
		"Check":"check",
		"Estimate":"estimate",
		"CustInvc":"invoice",
		"ItemShip":"itemfulfillment",
		"ItemRcpt":"itemreceipt",
		"Journal":"journalentry",
		"Opprtnty":"opportunity",
		"PurchOrd":"purchaseorder",
		"SalesOrd":"salesorder"
	};

	var auxFolderId = '860263';
	
	var csvHeader = '"Internal ID","Trx Type","Number","Status","Error Message"\n';
	var csvBody = '';
	
	try {
	
		//1. Define the search criteria. 
		//11/16/2014 - DUE To Transactions with NO items not showing up on the search, we are removing Journal Entry for now.
		//Journal Entry doesn't respnod to Mainline == 'T' and returns Multiple results for each line elements.
		var cflt = [new nlobjSearchFilter('department',null,'noneof',['@NONE@']),
		            new nlobjSearchFilter('trandate',null,'within',['thisyear']),
		            new nlobjSearchFilter('memorized', null, 'is', 'F'),
		            new nlobjSearchFilter('mainline', null, 'is','T')];
		
		var ccol = [new nlobjSearchColumn('internalid',null,'group').setSort(true),
		            new nlobjSearchColumn('type',null,'group'),
		            new nlobjSearchColumn('tranid',null,'group')];
		
		//Check in which mode to execute.
		if (paramJournalOnly == 'T') {
			cflt.push(new nlobjSearchFilter('type', null,'anyof','Journal'));
		} else {
			cflt.push(new nlobjSearchFilter('type', null,'noneof','Journal'));
		}
		
		if (paramLastProcId) {
			cflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var crs = nlapiSearchRecord('transaction', null, cflt, ccol);
		
		
		//2. Loop through all resulting trx and clear out Department
		for (var i=0; crs && i < crs.length; i++) {
			
			var recType = crs[i].getValue('type',null,'group');
			var recId = crs[i].getValue('internalid', null, 'group');
			var recNumber = crs[i].getValue('tranid', null, 'group');
			try {
			
				var trxrec = nlapiLoadRecord(trxjson[recType], recId);
				//set department field to null at the main level
				trxrec.setFieldValue('department','');
				
				var itemcount = trxrec.getLineItemCount('item');
				var expensecount = trxrec.getLineItemCount('expense');
				var linecount = trxrec.getLineItemCount('line');
				
				log('debug','Record Type // Record ID', recType+' // '+recId+' // Item: '+itemcount+' // Expense: '+expensecount+' // Line: '+linecount);
				
				
				//1. Go through Item list and set department null
				for (var m=1; m <= itemcount; m++) {
					trxrec.setLineItemValue('item', 'department', m, '');
				}
				
				//2. Go through Expense list and set department to null
				for (var j=1; j <= expensecount; j++) {
					trxrec.setLineItemValue('expense', 'department', j, '');
				}
				
				//3. Go through Line sublist and set department to null
				for (var k=1; k <= linecount; k++) {
					trxrec.setLineItemValue('line', 'department', k, '');
				}
				
				nlapiSubmitRecord(trxrec, false, true);
				
				csvBody += '"'+recId+'",'+
						   '"'+recType+'",'+
						   '"'+recNumber+'",'+
						   '"Success",'+
						   '""\n';
				
			} catch (recprocerr) {
				log('error','Error processing '+recType+' // '+recId, getErrText(recprocerr));
				
				csvBody +='"'+recId+'",'+
						  '"'+recType+'",'+
						  '"'+recNumber+'",'+
						  '"Failed",'+
						  '"'+getErrText(recprocerr)+'"\n';
				
			}
			
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / crs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//Reschedule logic
			if ((i+1)==1000 || ((i+1) < crs.length && nlapiGetContext().getRemainingUsage() < 2000)) {
				//reschedule
				log('debug','Getting Rescheduled at', recType+' // '+recId);
				var rparam = new Object();
				rparam['custscript_sct18_lastprocid'] = recId;
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		}
		
		// ----- Save the CSV Log File ---- 
		var fileName = 'DeptClearLog-'+(new Date()).getTime()+'.csv';
		var fileobj = nlapiCreateFile(fileName, 'CSV', csvHeader+csvBody);
		fileobj.setFolder(auxFolderId);
		nlapiSubmitFile(fileobj);
		
	} catch (procerr) {
		
		throw nlapiCreateError('DPETCLEAN-ERR', 'Script terminated due to unexpected error: '+getErrText(procerr), false);
		
	}
	
}