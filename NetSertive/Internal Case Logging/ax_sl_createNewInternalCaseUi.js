
function createNewInternalCaseUi(req, res)
{
	//Request variables
	var paramTaskType = req.getParameter('custpage_tasktype');
	var paramTaskAction = req.getParameter('custpage_taskaction');
	//URL parameter that may come from SL reload or redirected from create new page
	var reqCustomerId = req.getParameter('custparam_customerid');
	
	if (req.getMethod() == 'POST')
	{
		//redirect with params to create new page
		var paramEntryFormId = req.getParameter('custpage_entryformid');
		var paramAssignToId = req.getParameter('custpage_assignid');
		var paramCustomerId = req.getParameter('custpage_customerid');

		var rparam = {
			'cf':paramEntryFormId,
			'custparam_assignid':paramAssignToId,
			'custparam_customerid':paramCustomerId,
			'custparam_tasktype':paramTaskType,
			'custparam_actiontype':paramTaskAction
		};
		
		nlapiSetRedirectURL('RECORD', 'customrecord_adx_worklistmgr', null, true, rparam);
		
	}
	
	/**
	 * JSON Object built after task type is selected to include form ID and Desc
	 */
	var byActionJson = {};
	
	var nsform = nlapiCreateForm('Create New Quest', false);
	nsform.setScript('customscript_ax_cs_createnewicwizhelper');
	nsform.addFieldGroup('custpage_grpa', 'Case Options', null);
	
	//1. Search and grab list of ALL available List_Task Types (customlist104)
	//	 and build the list. This is to make sure User don't get option to Add New.
	var lttflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
	var lttcol = [new nlobjSearchColumn('internalid'),
	              new nlobjSearchColumn('name').setSort()];
	var lttrs = nlapiSearchRecord('customlist104', null, lttflt, lttcol);
	
	var taskTypeFld = nsform.addField('custpage_tasktype', 'select', 'Task Type', null, 'custpage_grpa');
	taskTypeFld.setBreakType('startcol');
	taskTypeFld.setMandatory(true);
	taskTypeFld.addSelectOption('', '', true);
	for (var tt=0; lttrs && tt < lttrs.length; tt += 1)
	{
		taskTypeFld.addSelectOption(lttrs[tt].getValue('internalid'), lttrs[tt].getValue('name'), false);
	}
	taskTypeFld.setDefaultValue(paramTaskType);
	
	//2. add in blank drop down list for action type
	var actionTypeFld = nsform.addField('custpage_taskaction', 'select', 'Action Type', null, 'custpage_grpa');
	actionTypeFld.setMandatory(true);
	actionTypeFld.addSelectOption('', '', true);
	//ONLY execute search and add to list if task type is selected.
	//Search is done against ADX: Worklist Rules custom record
	if (paramTaskType) {
		var latflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		              new nlobjSearchFilter('custrecord_wr_tasktype', null, 'anyof', paramTaskType)];
		var latcol = [new nlobjSearchColumn('custrecord_wr_taskaction'),
		              new nlobjSearchColumn('internalid'),
		              new nlobjSearchColumn('custrecord_wr_resultform'),
		              new nlobjSearchColumn('custrecord_wr_desc')];
		var latrs = nlapiSearchRecord('customrecord_adx_worklistrules', null, latflt, latcol);
		
		for (var lt=0; latrs && lt < latrs.length; lt += 1)
		{
			actionTypeFld.addSelectOption(latrs[lt].getValue('custrecord_wr_taskaction'), latrs[lt].getText('custrecord_wr_taskaction'), false);
			//Build up byActionJson
			byActionJson[latrs[lt].getValue('custrecord_wr_taskaction')]={
				'formid':latrs[lt].getValue('custrecord_wr_resultform'),
				'desc':(latrs[lt].getValue('custrecord_wr_desc')?latrs[lt].getValue('custrecord_wr_desc'):'N/A')
			};
		}
		actionTypeFld.setDefaultValue(paramTaskAction);
	}
	
	//Set hidden InlineHTML field
	var jsonfld = nsform.addField('custpage_jsfld','inlinehtml','',null,null);
	jsonfld.setDefaultValue('<script language="JavaScript">var ajson = '+JSON.stringify(byActionJson)+';</script>');
	
	//Add Submit Button
	nsform.addSubmitButton('Create New Quest');
	
	//----- Column B will contain disabled drop down list of entry form (-167) 
	var entryFormList = nsform.addField('custpage_entryformid', 'select', 'Entry Form', '-167', 'custpage_grpa');
	entryFormList.setBreakType('startcol');
	entryFormList.setDisplayType('disabled');
	entryFormList.setMandatory(true);
	
	var ruleDescFld = nsform.addField('custpage_ruledesc','textarea','Rule Description',null,'custpage_grpa');
	ruleDescFld.setDisplayType('inline');
	
	
	//------ Column C will be reset options
	var customerFld = nsform.addField('custpage_customerid','select','Customer','-2','custpage_grpa');
	customerFld.setBreakType('startcol');
	customerFld.setDefaultValue(reqCustomerId);
	
	nsform.addField('custpage_assignid','select','Assign To','-4','custpage_grpa');
	
	res.writePage(nsform);
}

/************************ Client Script ****************************/


function createCaseWizFieldChange(type, name, linenum) {

	var wizurl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_createnewicwiz', 'customdeploy_ax_sl_createnewicwiz', 'VIEW');
	
	//When configuration drop down changes, refresh the page passing in necessary values
	if (name == 'custpage_tasktype') {
		
		window.ischanged = false;
		window.location = wizurl + 
						  '&custpage_tasktype='+nlapiGetFieldValue('custpage_tasktype')+
						  '&custparam_customerid='+nlapiGetFieldValue('custpage_customerid');
	}
	
	//If field changed is action, auto set related fields
	if (name == 'custpage_taskaction')
	{
		if (nlapiGetFieldValue(name))
		{
			nlapiSetFieldValue('custpage_entryformid',ajson[nlapiGetFieldValue(name)].formid);
			nlapiSetFieldValue('custpage_ruledesc',ajson[nlapiGetFieldValue(name)].desc);
		}
		else
		{
			nlapiSetFieldValue('custpage_entryformid','');
			nlapiSetFieldValue('custpage_ruledesc','');
		}
	}
	
}