/*
 * @author efagone
 */

function setParentJobField(){

	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'context', context.getExecutionContext());
	
	if (context.getExecutionContext() == 'workflow') {

		var parentJobId = context.getSetting('SCRIPT', 'custscriptr7psoparentjobtoset');
		var dateSentTraining = context.getSetting('SCRIPT', 'custscriptr7psojobdatesurveysenttraining');
		var dateSentAuditAss = context.getSetting('SCRIPT', 'custscriptr7psojobdatesurveysentauditass');
		var dateSentWebinar = context.getSetting('SCRIPT', 'custscriptr7psojobdatesurveysentwebinar');
		
		var fields = new Array();
		var values = new Array();
		
		if (dateSentTraining != null && dateSentTraining != ''){
			fields[fields.length] = 'custrecordr7psojobdatesurveysenttraining';
			values[values.length] = dateSentTraining;
		}
		
		if (dateSentAuditAss != null && dateSentAuditAss != ''){
			fields[fields.length] = 'custrecordr7psojobdatesurveysentauditass';
			values[values.length] = dateSentAuditAss;
		}
		
		if (dateSentWebinar != null && dateSentWebinar != ''){
			fields[fields.length] = 'custrecordr7psojobdatesurveysentwebinar';
			values[values.length] = dateSentWebinar;
		}
		
		nlapiSubmitField('customrecordr7psoparentjob', parentJobId, fields, values);
		
	}
		
}