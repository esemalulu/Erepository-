/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Jan 2016     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

var DEF_PASSWORD = 'Trimech1',
	MTSUBID = '2',
	TMECHSUBID = '1',
	MtTmLocMap = {
		'13':'32',
		'14':'33',
		'15':'34',
		'16':'35',
		'17':'36', //AR-Sherwood (TM)
		'18':'37', //FL-Fort Lauderdale (TM)
		'19':'38', //FL-Orlando (TM)
		'20':'39', //FL-Tampa Bay (TM)
		'21':'5',
		'22':'6',
		'23':'40', //SC-Charleston (TM)
		'24':'30', //SC-Greenville (TM)
		'25':'41', //TN-Knoxville (TM)
		'26':'42', //TN-Nashville (TM)
		'27':'1'
	};

function cloneEmployees(type) 
{
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb278_lastprocid'),
		//CLONE - Goes through and clones them
		//RELATIONSHIP - Goes through and rebuilds organization relationship 
		paramMode = nlapiGetContext().getSetting('SCRIPT','custscript_sb278_mode'),
		curProcEmpId = '';
	
	if (paramMode == 'RELATIONSHIP')
	{
		var relflt = [new nlobjSearchFilter('custentity_ax_wasmoderntech', null, 'is','T'),
		              new nlobjSearchFilter('subsidiary', null, 'anyof', TMECHSUBID),
		              new nlobjSearchFilter('custentity_ax_moderntechempref', null, 'noneof','@NONE@')],
		    relcol = [new nlobjSearchColumn('internalid').setSort(true)],
		    relrs = null;
		
		if (paramLastProcId)
		{
			relflt.push([new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)]);
		}
		
		try
		{
			//Look for those records with Trimech Subsidiary AND was cloned from ModernTech employee
			relrs = nlapiSearchRecord('employee', null, relflt, relcol);
			
			for (var i=0; relrs && i < relrs.length; i+=1)
			{
				curProcEmpId = relrs[i].getValue('internalid');
				
				//First load the record and focus on following four fields that references employee fields.
				//- supervisor
				//- approver
				//- purchaseorderapprover
				//- timeapprover
				var emprec = nlapiLoadRecord('employee',curProcEmpId),
					updateRec = false;
				
				//supervisor
				if (emprec.getFieldValue('supervisor'))
				{
					var superText = emprec.getFieldText('supervisor');
					//Check to see if we need to change to Trimech version
					if (superText.indexOf('-MT') > -1)
					{
						superText = superText.replace('ZZ-', '');
						superText = superText.split('-')[0];
						log('debug','Supervisor Text', superText);
						emprec.setFieldText('supervisor',superText);
						updateRec = true;
					}
				}
				
				//approver
				if (emprec.getFieldValue('approver'))
				{
					var approverText = emprec.getFieldText('approver');
					//Check to see if we need to change to Trimech version
					if (approverText.indexOf('-MT') > -1)
					{
						approverText = approverText.replace('ZZ-', '');
						approverText = approverText.split('-')[0];
						log('debug','approver Text', approverText);
						emprec.setFieldText('approver',approverText);
						updateRec = true;
					}
				}
				
				//purchaseorderapprover
				if (emprec.getFieldValue('purchaseorderapprover'))
				{
					var papproverText = emprec.getFieldText('purchaseorderapprover');
					//Check to see if we need to change to Trimech version
					
					if (papproverText.indexOf('-MT') > -1)
					{
						papproverText = papproverText.replace('ZZ-', '');
						papproverText = papproverText.split('-')[0];
						log('debug','purchaseorderapprover Text', papproverText);
						emprec.setFieldText('purchaseorderapprover',papproverText);
						updateRec = true;
					}
				}
				
				//timeapprover
				if (emprec.getFieldValue('timeapprover'))
				{
					var tapproverText = emprec.getFieldText('timeapprover');
					//Check to see if we need to change to Trimech version
					if (tapproverText.indexOf('-MT') > -1)
					{
						tapproverText = tapproverText.replace('ZZ-', '');
						tapproverText = tapproverText.split('-')[0];
						log('debug','timeapprover Text', tapproverText);
						emprec.setFieldText('timeapprover',tapproverText);
						updateRec = true;
					}
				}
				
				//Continue to save the record 
				if (updateRec)
				{
					nlapiSubmitRecord(emprec, true, true);
					log('debug','Employee '+curProcEmpId, 'Relationship updated');
				}
				else
				{
					log('debug','Employee '+curProcEmpId, 'NO Need to update Relationship');
				}
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / relrs.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				//reschedule if gov is running low or legnth is 1000
				if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 1000)) 
				{
					var rparam = {
						'custscript_sb278_lastprocid':curProcEmpId,
						'custscript_sb278_mode':paramMode
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					
					log('audit','Relationship Rescheduled',JSON.stringify(rparam));
				}
				
			}
		}
		catch(emprelerr)
		{
			log('error','Error occured during relationship rebuild.','Error while processing Employee ID '+curProcEmpId+' // '+getErrText(emprelerr));
			throw nlapiCreateError('EMPLOYEE_RELATIONSHIP_ERR', 'Error while processing Employee ID '+curProcEmpId+' // '+getErrText(emprelerr), false);
		}
	}
	else if (paramMode == 'CLONE')
	{
		//Look for those record with ModernTech Subsidiary that has not be cloned yet
		var empflt = [new nlobjSearchFilter('subsidiary', null, 'anyof', MTSUBID),
		              new nlobjSearchFilter('custentity_ax_clonedalready', null, 'is','F'),
		              new nlobjSearchFilter('isinactive', null, 'is', 'F')],
			empcol = [new nlobjSearchColumn('internalid').setSort(true)],
			emprs = null;
		if (paramLastProcId)
		{
			empflt.push([new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)]);
		}
		
		try
		{
			emprs = nlapiSearchRecord('employee', null, empflt, empcol);
			
			for (var i=0; emprs && i < emprs.length; i+=1)
			{
				curProcEmpId = emprs[i].getValue('internalid');
				
				var emprec = nlapiLoadRecord('employee', curProcEmpId),
					newGiveAccess = 'T',
					newEntityId = emprec.getFieldValue('entityid'),
					empDept = emprec.getFieldValue('department'),
					empLoc = emprec.getFieldValue('location'),
					newLocToUse = '';
				
				if (empLoc)
				{
					newLocToUse = MtTmLocMap[empLoc];
				}
				
				//ONLY grant access if MT version had access
				if (emprec.getFieldValue('giveaccess') != 'T')
				{
					newGiveAccess = 'F';
				}
				emprec.setFieldValue('entityid','ZZ-'+emprec.getFieldValue('entityid')+'-MT');
				emprec.setFieldValue('giveaccess','F');
				
				var newemprec = nlapiCopyRecord('employee', curProcEmpId);
				newemprec.setFieldValue('entityid',newEntityId);
				newemprec.setFieldValue('giveaccess',newGiveAccess);
				newemprec.setFieldValue('subsidiary',TMECHSUBID);
				newemprec.setFieldValue('password',DEF_PASSWORD);
				newemprec.setFieldValue('password2',DEF_PASSWORD);
				newemprec.setFieldValue('requirepwdchange','T');
				newemprec.setFieldValue('custentity_ax_wasmoderntech','T');
				newemprec.setFieldValue('custentity_ax_moderntechempref', curProcEmpId);
				newemprec.setFieldValue('department', empDept);
				newemprec.setFieldValue('location',newLocToUse);
				
				nlapiSubmitRecord(emprec, true, true);
				
				nlapiSubmitRecord(newemprec, true, true);
				
				//Update completion flag
				nlapiSubmitField('employee',curProcEmpId,'custentity_ax_clonedalready','T');
				
				log('debug','copying','Emp ID: '+curProcEmpId+' // Location map '+empLoc+' to "'+newLocToUse);
				
				//break;
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / emprs.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				//reschedule if gov is running low or legnth is 1000
				if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 1000)) 
				{
					var rparam = {
						'custscript_sb278_lastprocid':curProcEmpId,
						'custscript_sb278_mode':paramMode
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					
					log('audit','Rescheduled',JSON.stringify(rparam));
				}
				
			}
		}
		catch(empcloneerr)
		{
			log('error','Error occured during cloning.','Error while processing Employee ID '+curProcEmpId+' // '+getErrText(empcloneerr));
			throw nlapiCreateError('EMPLOYEE_CLONE_ERR', 'Error while processing Employee ID '+curProcEmpId+' // '+getErrText(empcloneerr), false);
		}
	}
	
	
}
