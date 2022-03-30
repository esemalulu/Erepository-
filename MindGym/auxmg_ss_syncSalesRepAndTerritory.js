/**
 * Dec. 1st 2015 Note:
 * - This scheduled script replaces functionalities handled by series of mass updates that syncs up sales rep to territory on
 *   client account. Saved search is used to identify those that needs to be updated. 
 *   Candidates will have Sales Reps full name at the end of Territory text value.
 *   Saved search identifies those client account that does NOT have sales rep name at the end of territory
 *   
 *   
 *   Purpose of the Script
 *   ---------------------
 *   - Check to make sure L/P/C has Territory
 *   - Remove previous existing sales reps
 *   - Get sales rep value from Territory
 *   - Assign new sales rep value to match Territory
 *   
 *   - Sales Rep should match Territory Sales Rep Value
 *   
 *   Territory Formatting
 *   --------------------
 *   [COUNTRY] - [LOCATION] - [SALES REP]
 */

function syncSalesRepAndTerritory(type) 
{
	var paramSavedSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb405_ssid'),
		paramSalesRoleId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb405_salesroleid'),
		paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb405_lastid'),
		paramPrimaryNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb405_primary'),
		paramCcNotifer = nlapiGetContext().getSetting('SCRIPT','custscript_sb405_ccnotifers');
	
	//Split up and turn the Cc Notifier email addresses into an array
	if (paramCcNotifer)
	{
		paramCcNotifer = paramCcNotifer.split(',');
	}
	
	if (!paramSavedSearchId)
	{
		throw nlapiCreateError('STSYNC_ERR', 'Missing Saved Search ID', false);
	}
	
	var flt = null;
	if (paramLastProcId)
	{
		flt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
	}
	
	var crs = nlapiSearchRecord(null, paramSavedSearchId, flt, null);
	
	var csvHeader = '"Status","Details","Client Account ID","Client Account Name","Territory Name","Old Sales Rep","New Sales Rep"\n',
		csvBody = '',
		successCnt = 0,
		errorCnt = 0;
	
	
	//loop through each and requeue
	for (var i=0; crs && i < crs.length; i += 1) 
	{
		try
		{
			var crec = nlapiLoadRecord(crs[i].getRecordType(), crs[i].getId(), {recordmode:'dynamic'}),
				terrText = crec.getFieldText('territory'),
				arTerrText = terrText.split(' - '),
				terrSalesRepText = arTerrText[arTerrText.length-1],
				srjson = {};
			
			
			log('debug','Territory Text/Terr Sales Rep', terrText+' // '+terrSalesRepText);
			
			
			//Loop through all sales team
			//1. look for existing employee already on the list and create back up JSON. We need to add them back in
			var srline = crec.getLineItemCount('salesteam'),
				//Ticket 4702 - Dec. 9 2015 Need to check for inactive employees on the list
				lineEmployees = [],
				empStatusJson = {};
			for (var l=srline; l >= 1; l-=1)
			{
				var lineEmpId = crec.getLineItemValue('salesteam','employee',l),
					lineEmpText = crec.getLineItemText('salesteam','employee',l),
					lineEmpRole = crec.getLineItemValue('salesteam','salesrole',l);
				
				log('debug','line value',lineEmpId+' // '+lineEmpText+' // '+lineEmpRole);
				
				lineEmployees.push(lineEmpId);
				
				srjson[lineEmpText]={
					'employee':lineEmpId,
					'salesrole':lineEmpRole
				};
				
				//Remove the line after backing up
				crec.removeLineItem('salesteam', l, false);
			}
			
			//1a. Ticket 4702 Dec. 9 2015 - Search for active status of all employees
			if (lineEmployees.length > 0)
			{
				var eflt = [new nlobjSearchFilter('internalid', null, 'anyof', lineEmployees)];
				var ecol = [new nlobjSearchColumn('internalid'),
				            new nlobjSearchColumn('isinactive')];
				var ers = nlapiSearchRecord('employee', null, eflt, ecol);
				//Assume there are result
				for (var e=0; e < ers.length; e+=1)
				{
					empStatusJson[ers[e].getValue('internalid')] = ( (ers[e].getValue('isinactive')=='T')?'T':'F' );
				}
			}
			
			log('debug','line count',crec.getLineItemCount('salesteam')+' // empStatusJson: '+JSON.stringify(empStatusJson));
			
			//2. Add Matching Employee
			crec.selectNewLineItem('salesteam');
			crec.setCurrentLineItemText('salesteam', 'employee', terrSalesRepText);
			crec.setCurrentLineItemValue('salesteam','isprimary','T');
			crec.setCurrentLineItemValue('salesteam','contribution','100%');
			log('debug','new line contribution',crec.getCurrentLineItemValue('salesteam','contribution'));
			log('debug','new line salesrole',crec.getCurrentLineItemText('salesteam','salesrole'));
			log('debug','new sales rep', terrSalesRepText);
			
			if (!crec.getCurrentLineItemValue('salesteam','salesrole'))
			{
				log('debug','new line was empty','Setting default role');
				crec.setCurrentLineItemValue('salesteam','salesrole',paramSalesRoleId);
			}
			crec.commitLineItem('salesteam', false);
			
			//3. Loop through and add the original back in
			for (var sr in srjson)
			{
				if (terrSalesRepText == sr)
				{
					continue;
				}
				
				//Ticket 4702 - If employee is inactive, skip
				if (empStatusJson[srjson[sr].employee] == 'T')
				{
					log('debug',sr+' is marked as Inactive','SKIP This Employee ID '+srjson[sr].employee);
					continue;
				}
				
				crec.selectNewLineItem('salesteam');
				crec.setCurrentLineItemValue('salesteam', 'employee', srjson[sr].employee);
				crec.setCurrentLineItemValue('salesteam','isprimary','F');
				crec.setCurrentLineItemValue('salesteam','contribution','0%');
				if (!crec.getCurrentLineItemValue('salesteam','salesrole'))
				{
					log('debug','existing sales rep new line was empty','Setting default role');
					crec.setCurrentLineItemValue('salesteam','salesrole',paramSalesRoleId);
				}
				crec.commitLineItem('salesteam', false);
			}
		}
		catch(err)
		{
			csvBody += '"Error",'+
			   '"'+getErrText(err)+'",'+
			   '"'+crec.getId()+'",'+
			   '"'+crec.getFieldValue('entityid')+' '+crec.getFieldValue('companyname')+'",'+
			   '"'+terrText+'",'+
			   '"'+crec.getFieldText('salesrep')+'",'+
			   '"'+terrSalesRepText+'"\n';
		}
		try
		{
			nlapiSubmitRecord(crec, true, true);
			
			//Once it's updated on the customer record, grab the new ID of sales rep
			var newSalesRepId = nlapiLookupField('customer', crs[i].getId(), 'salesrep', false);
			
			//TIcket 8237 - Client request to go through ALL Contacts where parent is THIS CUSTOMER
			//				Make sure sales rep being set here matches "Contact/Assigned To" field value.
			//				IF the user is already assigned and the assigned Sales Rep is BDA department, YOU SKIP IT
			//					- ONLY Change when the assigned rep is different AND department is NOT BDA
			var ctflt = [new nlobjSearchFilter('internalid','parent','anyof',crs[i].getId()),
			             new nlobjSearchFilter('isinactive', null, 'is','F')],
				ctcol = [new nlobjSearchColumn('internalid'),
				         new nlobjSearchColumn('custentity_assigned_to'),
				         new nlobjSearchColumn('department','custentity_assigned_to'),
				         //3/20/2016 - Add in MQL Accept test
				         new nlobjSearchColumn('custentity_con_mqlaccept')],
				ctrs = nlapiSearchRecord('contact', null, ctflt, ctcol);
			
			for (var ct=0; ctrs && ct < ctrs.length; ct+=1)
			{
				var ctAssignedTo = ctrs[ct].getValue('custentity_assigned_to'),
					ctAssignedDept = ctrs[ct].getValue('department','custentity_assigned_to'),
					isPartOfUn = false, 
					isMqlAcceptNo = false;
				
				//3/20/2016 - Ticket 8237 - Issue with other rules identified by Krishna
				//1. If the territory has  - UN - value in it, do not update
				if (terrText.indexOf('- UN -') > -1)
				{
					isPartOfUn = true;
				}
				
				//2. Check to see if THIS contact has Value of No on MQL Accept
				if (ctrs[ct].getText('custentity_con_mqlaccept') && ctrs[ct].getText('custentity_con_mqlaccept') == 'No')
				{
					isMqlAcceptNo = true;
				}
				
				//BDA department ID is 25
				//3/20/2016 - Added request to check to make sure the contact does NOT have value of No for Accept MQL And isn't part of - UN - territory
				if ( (!ctAssignedTo || (ctAssignedTo != newSalesRepId && (ctAssignedDept !='25')) ) && !isPartOfUn && !isMqlAcceptNo)
				{
					nlapiSubmitField('contact', ctrs[ct].getValue('internalid'), 'custentity_assigned_to', newSalesRepId, true);
				}
			}
			
			successCnt += 1;
			
			csvBody += '"Success",'+
					   '"",'+
					   '"'+crec.getId()+'",'+
					   '"'+crec.getFieldValue('entityid')+' '+crec.getFieldValue('companyname')+'",'+
					   '"'+terrText+'",'+
					   '"'+crs[i].getText('salesrep')+'",'+
					   '"'+terrSalesRepText+'"\n';
			
		}
		catch (upderr)
		{
			
			errorCnt +=1;
			
			csvBody += '"Error",'+
					   '"'+getErrText(upderr)+'",'+
					   '"'+crec.getId()+'",'+
					   '"'+crec.getFieldValue('entityid')+' '+crec.getFieldValue('companyname')+'",'+
					   '"'+terrText+'",'+
					   '"'+crec.getFieldText('salesrep')+'",'+
					   '"'+terrSalesRepText+'"\n';
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / crs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
				
		if ((i+1)==1000 || ((i+1) < crs.length && nlapiGetContext().getRemainingUsage() < 1000)) 
		{
			//reschedule
			nlapiLogExecution('debug','Getting Rescheduled at', crs[i].getId());
			var rparam = {
				'custscript_sb405_lastid':crs[i].getId()
			};
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(),rparam);
			break;
		}
	}
	
	//Generate Log Email
	if (csvBody)
	{
		var logFile = nlapiCreateFile('processLog.csv', 'CSV', csvHeader+csvBody);
		
		var sbj = 'Syncing Sales Rep & Territory Ran on '+nlapiDateToString(new Date());
		var msg = 'Please see attached Log for Sales Rep/Territory Sync. <br/><br/>'+
				  '# Of Success: '+successCnt+'<br/>'+
				  '# Of Error: '+errorCnt;
		
		nlapiSendEmail(-5, paramPrimaryNotifier, sbj, msg, paramCcNotifer, null, null, logFile);	
	}
}