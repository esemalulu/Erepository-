/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Feb 2016     sfiorentino
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	psoSearch = nlapiSearchRecord('customrecordr7psoengagement', 'customsearch_srp_migration');
	for(var x in psoSearch){
		var context = nlapiGetContext();
		var usage = context.getRemainingUsage();
		nlapiLogExecution('DEBUG', 'scheduled', usage);
		if(usage < '600'){
			nlapiScheduleScript('customscript_srp_data_migration', 'customdeploy_srp_data_migra_unsch');
			nlapiLogExecution('DEBUG', 'scheduled', 'Rescheduling Script');
			return;
		}
		try{
		var engId = psoSearch[x].getValue('internalid');
		var so = psoSearch[x].getValue('custrecordr7psoengsalesorder');
		var customer = psoSearch[x].getValue('custrecordr7psoengcustomer');
		var customerTxt = psoSearch[x].getText('custrecordr7psoengcustomer');
		var status = psoSearch[x].getValue('custrecordr7psoengstatus');
		var item = psoSearch[x].getValue('custrecordr7psoengitemnumber');
        if(item != '' && item != null)
        {var itemInactive = nlapiLookupField('item', item, 'isinactive');
       	if(itemInactive == 'T')
        		            {item = '';}}
		var projMan = psoSearch[x].getValue('custrecordr7psoengprojectmanager');
        if(projMan != '' && projMan != null)
        {var projManInactive = nlapiLookupField('employee', projMan, 'isinactive');
       	if(projManInactive == 'T')
        		            {projMan = '';}}
		var resource = psoSearch[x].getValue('custrecordr7psoengresourceprimary');
        if(resource != '' && resource != null)
        {var resourceInactive = nlapiLookupField('customrecordr7psoresources', resource, 'isinactive');
       	if(resourceInactive == 'T')
        		            {resource = '';}}
		var salesRep = psoSearch[x].getValue('custrecordr7psoengsalesrep');
		var accountMan = psoSearch[x].getValue('custrecordr7psoengacctmgr');
        if(accountMan != '' && accountMan != null)
        {var accountManInactive = nlapiLookupField('employee', accountMan, 'isinactive');
        var isAccountMan = nlapiLookupField('employee', accountMan, 'custentityr7isaccountmanager');
       	if(accountManInactive == 'T' || isAccountMan == 'F')
        		            {accountMan = '';}}
		var unschValue = psoSearch[x].getValue('custrecordr7psoengunscheduledvalue');
		var totValue = psoSearch[x].getValue('custrecordr7psoengtotalvalue');
		var delValue = psoSearch[x].getValue('custrecordr7psoengdeliveredvalue');
		var dateIntroCall = psoSearch[x].getValue('custrecordr7psoengdateofintrocall');
		var dateIntroEmail = psoSearch[x].getValue('custrecordr7psoengdateofintroemail');
		var dateKickCall = psoSearch[x].getValue('custrecordr7psoengdateofkickoffcall');
		var totalDays = 0;
		var compSearch = nlapiSearchRecord('customrecordr7psocomponent', null, new nlobjSearchFilter('custrecordr7psocompengagement', null, 'anyof', engId), new nlobjSearchColumn('custrecordr7psocompduration'));
		for(var y in compSearch){
			var duration = compSearch[y].getValue('custrecordr7psocompduration');
			totalDays += (duration*1);
		}
		var hours = totalDays * 8;
		
		var projRec = nlapiCreateRecord('job')
		projRec.setFieldValue('custentity_r7_pso_engagnement_id', engId);
		projRec.setFieldValue('companyname', customerTxt + ': ENG' + engId);
		projRec.setFieldValue('parent', customer);
		projRec.setFieldValue('subsidiary', '1');
		var newStatus = convertStatus(status);
		projRec.setFieldValue('entitystatus', newStatus);
		projRec.setFieldValue('custentityr7projectmanager', projMan);
		projRec.setFieldValue('custentityr7technicallead', resource);
		projRec.setFieldValue('custentityr7salesorder', so);
		projRec.setFieldValue('custentityr7itemnum', item);
		projRec.setFieldValue('custentityr7acctexecutive', salesRep);
		projRec.setFieldValue('custentityr7accountmanager', accountMan);
		projRec.setFieldValue('custentityr7_prj_contracted_work', hours);
		projRec.setFieldValue('custentityr7dateofintroemail', dateIntroEmail);
		projRec.setFieldValue('custentityr7dateofintrocall', dateIntroCall);
		projRec.setFieldValue('custentityr7dateofkickoffcall', dateKickCall);
		projRec.setFieldValue('custentityr7jobvsoeallocation', totValue);

		var projId = nlapiSubmitRecord(projRec);
		nlapiSubmitField('customrecordr7psoengagement', engId, 'custrecord_migrated_to_project', 'T');
		
		var compSearch2 = nlapiSearchRecord('customrecordr7psocomponent', 'customsearch_pso_component_srp_migration', new nlobjSearchFilter('custrecordr7psocompengagement', null, 'anyof', engId));
		for(var z in compSearch){
			var compId = compSearch2[z].getValue('internalid');
			var name = compSearch2[z].getValue('altname');
			var time = compSearch2[z].getValue('custrecordr7psocompduration');
			var startDate = compSearch2[z].getValue('custrecordr7psocompstartdate');
			var endDate = compSearch2[z].getValue('custrecordr7psocompdatedelivered');
			var compStatus = compSearch2[z].getValue('custrecordr7psocompstatus');
			var compResource = compSearch2[z].getValue('custrecordr7psocompresource');
			if(compResource != '' && compResource != null)
			{var taskResource = nlapiLookupField('customrecordr7psoresources', compResource,'custrecordr7psoresourceemployee');
			if(taskResource == '' || taskResource == null)
				{taskResource = nlapiLookupField('customrecordr7psoresources', compResource,'custrecordr7psoresourcevendor');}
			}
			
			var taskRec = nlapiCreateRecord('projecttask');
			taskRec.setFieldValue('company', projId);
			taskRec.setFieldValue('title', name);
			taskRec.setFieldValue('estimatedwork', (time*8));
			taskRec.setFieldValue('ismilestone', 'F');
			if (startDate == '' || startDate == null)
				{taskRec.setFieldValue('constrainttype', 'ASAP');}
			else
			{taskRec.setFieldValue('constrainttype', 'FIXEDSTART');
			taskRec.setFieldValue('startdate', startDate);}
			var newCompStatus = convertCompStatus(compStatus);
			taskRec.setFieldValue('status', newCompStatus);
			
			nlapiSubmitRecord(taskRec);
			nlapiSubmitField('customrecordr7psocomponent', compId, 'custrecord_migrated_to_project_task', 'T');
			
			if(taskResource != null && taskResource != ''){
			var resourceRec = nlapiCreateRecord('resourceallocation');
			resourceRec.setFieldValue('allocationresource', taskResource);
			if ((startDate != '' && startDate != null) && (endDate != '' && endDate != null))
			{resourceRec.setFieldValue('startdate', startDate);
			resourceRec.setFieldValue('enddate', endDate);}
			resourceRec.setFieldValue('project', projId);
			resourceRec.setFieldValue('allocationamount', (time*8));
			var resourceId = nlapiSubmitRecord(resourceRec);
			nlapiLogExecution('DEBUG', 'Resource Allocation', resourceId);}
			
	}

} catch(e)
{nlapiLogExecution('ERROR', 'SRP Migration', 'Engagement ' + engId + ' failed becuase ' + e);}
}// end of x in PSOSearch
}// end of function

function convertStatus(status){
	if(status == 1){status = 4; return status}
	if(status == 2){status = 77; return status}
	if(status == 3){status = 74; return status}
	if(status == 4){status = 2; return status}
	if(status == 5){status = 75; return status}
	if(status == 6){status = 1; return status}
	if(status == 8){status = 76; return status}
}

function convertCompStatus(compStatus)
{
	if(compStatus == 1){compStatus = 'NOTSTART'; return compStatus}
	if(compStatus == 2){compStatus = 'PROGRESS'; return compStatus}
	if(compStatus == 3){compStatus = 'COMPLETE'; return compStatus}
	if(compStatus == 4){compStatus = 'NOTSTART'; return compStatus}
	}











