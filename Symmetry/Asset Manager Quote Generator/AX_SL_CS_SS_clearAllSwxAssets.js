/**
 * This Module is added on 9/15/2015 specific to Symmetry Asset management.
 * Change request came which asked Asset Manager to cler out SWX Asset CSV Load Stage (customrecord_ax_swxa_stage) custom record
 * before processing CSV import. 
 * Module includes following components:
 * 1. Suitelet User Interface: "SWX Delete All Assets"
 * - Allow user to manually kick off a process to delete all data in SWX Asset CSV Load Stage (customrecord_ax_swxa_stage) custom record.
 * 	 Once submitted, script will queue up SINGLE DEPLOYED unscheduled script to clear the data.
 * 	 When process is running, this page will show the user current progress.
 * 
 * 2. Client Script:
 * - Simple undeployed client script to provide client side validation for #1 UI
 * 
 * 3. Scheduled Script:
 * - There will be Single Deployment for this scheduled script. It is triggered by Suitelet and SHOULD ONLY be executable by single process.
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Sep 2015     json@audaxium.com
 *
 */
//For Testing Deletion: customrecord_axtestrec
//For Production Use: customrecord_ax_cswx_assets
//PRODUCTION
var paramCustRecId = 'customrecord_ax_cswx_assets';
var paramCustRecName = 'SWX NS-Cust Assets';

//TEST
//var paramCustRecId = 'customrecord_axtestrec';
//var paramCustRecName = 'AX-Test Record';
	
var paramDesignatedScriptDeployId = 'customdeploy_ax_ss_procswxdeleteallasset';
var paramDesignatedScriptId = 'customscript_ax_ss_procswxdeleteallasset';

/******* Suitelet UI ***********/
function swxDeleteAssetUi(req, res)
{

	//Abilit to search
	var nsform = nlapiCreateForm('SWX Asset Deletion', false);
	//add client script 
	
	nsform.addFieldGroup('custpage_grpa', 'Status (Execution against '+paramCustRecName+' Record)', null);
	
	//Add in Message Field
	var msgFld = nsform.addField('custpage_msg','inlinehtml','',null,null);
	msgFld.setLayoutType('outsideabove', null);

	msgFld.setDefaultValue(
		'<div style="color:orange; font-weight:bold;font-size: 14px">'+
		'This Action CANNOT be undone. Once you click the blue submit button, the process WILL start DELETING ALL SWX Asset Records<br/>'+
		'Deletion of SWX Asset should be done ONLY when there is new Load to process'+
		'<br/><br/>'+
		'</div>'
	);
	
	try 
	{
		if (req.getMethod() == 'POST')
		{
			//Queue it Up
			nlapiScheduleScript(paramDesignatedScriptId, paramDesignatedScriptDeployId, null);
			
			//Send it BACK to this SL
			nlapiSetRedirectURL('SUITELET', nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), 'VIEW', null);
		}
		
		//1. Grab list of current count of record to delete. paramCustRecId and ADD to count
		var delcount = 0,
			delcol = [new nlobjSearchColumn('internalid', null, 'count')],
			delrs = nlapiSearchRecord(paramCustRecId, null, null, delcol),
			currentStatus = '';
			
		if (delrs && delrs.length > 0) 
		{
			delcount = delrs[0].getValue('internalid', null, 'count');
		}
		
		var toDeleteFld = nsform.addField('custpage_delfld', 'text', '# Of Records: ', null, 'custpage_grpa');
		toDeleteFld.setDefaultValue(delcount);
		toDeleteFld.setDisplayType('inline');
		toDeleteFld.setBreakType('startcol');
		
		//2. Grab current status of Scheduled Script that actually deletes the records
		var sctflt = [new nlobjSearchFilter('scriptid','scriptdeployment','is',paramDesignatedScriptDeployId)],
			sctcol = [new nlobjSearchColumn('datecreated').setSort(true),
		              new nlobjSearchColumn('status'),
		              new nlobjSearchColumn('percentcomplete')],
			sctrs = nlapiSearchRecord('scheduledscriptinstance', null, sctflt, sctcol);
		
		if (sctrs && sctrs.length > 0)
		{
			currentStatus = sctrs[0].getValue('status');
		}
		else
		{
			//Defect: 12/9/2015 - When there are NO results, we need to default it complete so the button will show
			currentStatus = 'Complete'; 
		}
		
		var	latestStatusDateFld = nsform.addField('custpage_lateststatusdate','text','Latest Clear Date: ', null, 'custpage_grpa');
		latestStatusDateFld.setBreakType('startcol');
		latestStatusDateFld.setDisplayType('inline');
		latestStatusDateFld.setDefaultValue(
			(sctrs && sctrs.length > 0)?sctrs[0].getValue('datecreated'):' - '
		);
		
		var	latestStatusFld = nsform.addField('custpage_lateststatus', 'text', 'Latest Status: ', null, 'custpage_grpa');
		latestStatusFld.setBreakType('startcol');
		latestStatusFld.setDisplayType('inline');
		latestStatusFld.setDefaultValue(
			(sctrs && sctrs.length > 0)?sctrs[0].getValue('status'):' - '
		);
		
		var	latestStatusCompletedFld = nsform.addField('custpage_lateststatuscompleted', 'text', 'Percent Completed: ', null, 'custpage_grpa');
		latestStatusCompletedFld.setBreakType('startcol');
		latestStatusCompletedFld.setDisplayType('inline');
		latestStatusCompletedFld.setDefaultValue(
			(sctrs && sctrs.length > 0)?sctrs[0].getValue('percentcomplete'):' - '
		);
			
		//display or hide submit button
		if (parseInt(delcount) > 0 && (currentStatus == 'Complete' || currentStatus == 'Failed'))
		{
			nsform.addSubmitButton('Delete ALL SWX Assets');
		}
		
	}
	catch (displayerr)
	{
		msgFld.setDefaultValue(
			'<div style="color:red; font-weight:bold">Error occured: '+
			getErrText(displayerr)+
			'</div>'
		);
	}
	
	res.writePage(nsform);

}


/******* Scheduled Script ******/
function swxProcessDeleteAsset(type)
{
	log('debug','type // deploy id', type+' // '+nlapiGetContext().getDeploymentId());
	
	var paramTriggerEmployee = nlapiGetContext().getSetting('SCRIPT', 'custscript_141_triggeringemp');
	if (!paramTriggerEmployee)
	{
		throw nlapiCreateError('SWX-ERROR', 
							   'Triggering Employee is Required. '+
							   'If this was triggered by the UI, it will always pass in the user. ', 
							   false);
	}
	
	//Return out of scheduled
	if (type=='scheduled')
	{
		throw nlapiCreateError('SWX-ERROR', 
							   'Process Delete Asset script does not allow scheduled version. '+
							   'This Script should ONLY be triggered by "SWX Delete All Assets UI"', 
							   false);
	}
	
	//ONLY run if the Deployment ID is customdeploy_ax_ss_procswxdeleteallasset
	
	if (nlapiGetContext().getDeploymentId() != paramDesignatedScriptDeployId)
	{
		throw nlapiCreateError('SWX-ERROR',
							   'Designated Deployment Allowed. Deployment ID '+nlapiGetContext().getDeploymentId()+
							   ' Is Not designated Deployment.',
							   false);
	}
	
	var delrs = nlapiSearchRecord(paramCustRecId, null, null, null),
		isRescheduled = false;
	for (var i=0; delrs && i < delrs.length; i+=1)
	{
		log('debug','Record ID', delrs[i].getId());
		//Delete
		nlapiDeleteRecord(paramCustRecId, delrs[i].getId());
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / delrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
					
		if ((i+1)==1000 || ((i+1) < delrs.length && nlapiGetContext().getRemainingUsage() < 100)) 
		{
			isRescheduled = true;
			
			//reschedule
			log('audit','Getting Rescheduled at', delrs[i].getId());
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), null);
			break;
		}
	}
	
	if (!isRescheduled)
	{
		//Run One more search to include left over count to user. 
		delrs = nlapiSearchRecord(paramCustRecId, null, null, null);
		
		//send out notification to the person triggered the process
		nlapiSendEmail(
			-5, 
			//paramTriggerEmployee,
			'renewals@symsolutions.com',
			'SWX Asset Deletion Completed - ['+paramCustRecName+']', 
			'Deletion process is against '+paramCustRecName+' completed. After process, there are '+(delrs?delrs.length:0)+' records left.'
		);
	}
	
	//throw nlapiCreateError('SWX-ERROR','TESTING Failed Error',true);
}