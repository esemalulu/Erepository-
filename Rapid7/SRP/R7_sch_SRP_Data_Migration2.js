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
	var context = nlapiGetContext();
		var compSearch2 = nlapiSearchRecord('customrecordr7psocomponent', 'customsearch_pso_comp_search_srp');
		for(var z in compSearch2){
			try{
			if(context.getRemainingUsage() < '1000')
				{nlapiScheduleScript('customscript_srp_data_migration');
				return;}
			var compId = compSearch2[z].getValue('internalid');
			var name = compSearch2[z].getValue('altname');
			var time = compSearch2[z].getValue('custrecordr7psocompduration');
			var startDate = compSearch2[z].getValue('custrecordr7psocompstartdate');
			var endDate = compSearch2[z].getValue('custrecordr7psocompdatedelivered');
			var compStatus = compSearch2[z].getValue('custrecordr7psocompstatus');
			var engName = nlapiLookupField('customrecordr7psoengagement', compSearch2[z].getValue('custrecordr7psocompengagement'), 'name');
			var taskResource = '';
			var compResource = compSearch2[z].getValue('custrecordr7psocompresource');
			if(compResource != '' && compResource != null)
			{taskResource = nlapiLookupField('customrecordr7psoresources', compResource,'custrecordr7psoresourceemployee');
			if(taskResource == '' || taskResource == null)
				{taskResource = nlapiLookupField('customrecordr7psoresources', compResource,'custrecordr7psoresourcevendor');}
			}
			var projSearch = nlapiSearchRecord('job', null, new nlobjSearchFilter('entityid', null, 'contains', engName), new nlobjSearchColumn('internalid'));
			for(var a in projSearch){
				var projId = projSearch[a].getValue('internalid');
			
			
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
			nlapiSubmitField('customrecordr7psocomponent', compId, 'custrecord_migrated_to_project_task', 'T');

} catch(e)
{nlapiLogExecution('ERROR', 'SRP Migration', 'Engagement ' + compId + ' failed becuase ' + e);}
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











