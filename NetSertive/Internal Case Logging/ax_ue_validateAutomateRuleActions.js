function ravaBeforeLoad(type, form, request)
{
	if (type != 'create') {
		return;
	}
	
	if (nlapiGetRecordType() != 'customrecord_adx_worklistmgr')
	{
		return;
	}
	
	if (!request)
	{
		return;
	}
	
	//10/30/2015 - Logic added to redirect the user to Create New Internal Case or Quest 
	//IF action type, task type and customer is not set, redirect it back to the Suitelet
	//ONLY execute this logic if it's Userinternface
	//pi is NS generated URL Parameter that passes in customer/prospect/lead ID user was at.

	var taskType = request.getParameter('custparam_tasktype') || '',
		actionValue = request.getParameter('custparam_actiontype') || '',
		customerValue = request.getParameter('custparam_customerid') || '';
	
	if (!customerValue)
	{
		customerValue = request.getParameter('pi') || '';
	}
	
	if (nlapiGetContext().getExecutionContext()=='userinterface')
	{
		
		log('debug','piValue',customerValue);
		
		if (!taskType && !actionValue)
		{
			nlapiSetRedirectURL(
				'SUITELET', 
				'customscript_ax_sl_createnewicwiz', 
				'customdeploy_ax_sl_createnewicwiz', 
				'VIEW',
				{
					'custparam_customerid':customerValue
				}
			);

			return;
		}
		
	}
	
	
	form.getField('custrecord_wm_tasktype').setDefaultValue(taskType);
	form.getField('custrecord_wm_action').setDefaultValue(actionValue);
	form.getField('custrecord_wm_customer').setDefaultValue(customerValue);
	form.getField('custrecord_wm_assigned').setDefaultValue(request.getParameter('custparam_assignid'));
}

function ravaBeforeSubmit(type) 
{
	//ONLY execute for customrecord_adx_worklistrules or customrecord108.
	//Before Submit duplicate check ONLY executes on CREATE for both RECORDs it's applied to
	if (type != 'create') {
		return;
	}	
	
	//THIS is controlled by Deployment but JUST in case, double check is added on the script level
	var recordType = nlapiGetRecordType();
	if (recordType == 'customrecord_adx_worklistrules' || recordType == 'customrecord108')
	{
	
		var dupflt = null;
		var dupString = '';
		if (recordType == 'customrecord_adx_worklistrules')
		{
			//ADX: Worklist Rules
			dupString = nlapiGetFieldText('custrecord_wr_tasktype') +' // '+nlapiGetFieldText('custrecord_wr_taskaction');
			dupflt = [new nlobjSearchFilter('custrecord_wr_tasktype', null, 'anyof', nlapiGetFieldValue('custrecord_wr_tasktype')),
			          new nlobjSearchFilter('custrecord_wr_taskaction', null, 'anyof', nlapiGetFieldValue('custrecord_wr_taskaction')),
			          new nlobjSearchFilter('isinactive', null, 'is','F')];
		}
		else
		{
			//customrecord108 (Action)
			dupString = nlapiGetFieldValue('name') +' // '+nlapiGetFieldText('custrecord_tasktyperef');
			dupflt = [new nlobjSearchFilter('name', null, 'is', nlapiGetFieldValue('name')),
			          new nlobjSearchFilter('custrecord_tasktyperef', null, 'anyof', nlapiGetFieldValue('custrecord_tasktyperef')),
			          new nlobjSearchFilter('isinactive', null, 'is','F')];
		}
		
		//Execute duplicate search
		if (dupflt && dupflt.length > 0) {
			
			var duprs = nlapiSearchRecord(recordType, null, dupflt, null);
			if (duprs && duprs.length > 0) 
			{
				//this is an error. Throw Error
				throw nlapiCreateError('DUPLICATE_RULE_OR_ACTION_ERROR', dupString+' This Rule or Action already exists', false);
			}			
		}
	}
}


function ravaAfterSubmit(type)
{
	//Trigger ONLY on create of new Action record
	if (type != 'create') {
		return;
	}
	//After Submit action ONLY executes against Actions (customrecord108) 
	var recordType = nlapiGetRecordType();
	if (recordType == 'customrecord108')
	{
		try 
		{
			//Since this is NEW Action being created, assume it will be new Rule
			var wrec = nlapiCreateRecord('customrecord_adx_worklistrules', {recordmode:'dynamic'});
			wrec.setFieldValue('custrecord_wr_tasktype', nlapiGetFieldValue('custrecord_tasktyperef'));
			wrec.setFieldValue('custrecord_wr_taskaction', nlapiGetRecordId());
			nlapiSubmitRecord(wrec, true, true);
		}
		catch (rulecreateerr)
		{
			log('error','Error creating new Rule for Action ID: '+nlapiGetRecordId(),getErrText(rulecreateerr));
		}
	}
}