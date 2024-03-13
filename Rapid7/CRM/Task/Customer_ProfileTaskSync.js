var fields = new Array(
new Array("custentityr7custpoprocess","custbodyr7poprocess"),
new Array("custentityr7internalips","custbodyr7internalips"),
new Array("custentityr7externalips","custbodyr7externalips"),
new Array("custentityr7currentwebscanner","custbodyr7oppcurrentwebscanner"),
new Array("custentityr7currentwebscannerrenewal","custbodyr7oppcurrentwebscannerrenewal"),
new Array("custentityr7currentdbscanner","custbodyr7oppcurrentdbscanner"),
new Array("custentityr7currentdbscannerrenewal","custbodyr7oppcurrentdbscannerrenewal"),
new Array("custentityr7approvedproject","custbodyr7salesoppapprovedproject"),
new Array("custentityr7custvulnerabilitymgmntprog","custbodyr7oppvulnerabilitymgmntprog"),
new Array("custentityr7currententerprisescanner","custbodyr7oppcurrententerprisescanner"),
new Array("custentityr7currententerprisescannerdate","custbodyr7currententerprisescannerdate"),
new Array("custentityr7custsubjecttopcicompliance","custbodyr7oppsubjecttopcicompliance"),
new Array("custentityr7custsubjecttofisma","custbodyr7oppsubjecttofisma"),
new Array("custentityr7custsubjecttonerc","custbodyr7oppsubjecttonerc"),
new Array("custentityr7custneed","custbodyr7need"),
new Array("custentityr7budget","custbodyr7opportunitybudget"),
new Array("custentityr7currentpenetrationtest","custbodyr7oppcurrentpenetrationtest"),
new Array("custentityr7currentpenetrationtestdate","custbodyr7oppcurrentpenetrationrenewal"),
new Array("custentityr7currentexternalscanner","custbodyr7oppcurrentexternalscanner"),
new Array("custentityr7currentexternalscannerdate","custbodyr7currentexternalscannerdate")
);
	
function afterSubmit(type){
	
	var execContext = nlapiGetContext().getExecutionContext();
	
	nlapiLogExecution('DEBUG','Type & ExecContext',type +" "+execContext);
	
	if (type != 'delete' && (type == 'create' || type == 'edit') && execContext=='userinterface') {
		
		var newRecord = nlapiGetNewRecord();
		var fieldsChanged = newRecord.getAllFields();
		var fieldsChangedText="";
		for(var k=0;fieldsChanged!=null && k<fieldsChanged.length;k++){
			fieldsChangedText += fieldsChanged[k]+",";
		}
		nlapiLogExecution('DEBUG','Fields Changed',fieldsChangedText);
		
		var custRecord = nlapiLoadRecord('customer', nlapiGetRecordId());	
		var openOpportunities = findOpenOpportunities(nlapiGetRecordId());
	
		for(var j=0;openOpportunities!=null && j<openOpportunities.length;j++){
			
			//if nlapiGetNewRecord
			
			var startCost = nlapiGetContext().getRemainingUsage();
			
			var opportunityId = openOpportunities[j];
			//nlapiLogExecution('DEBUG','OpportunityId',opportunityId);
			
			var allStandardFields = new Array();
			var allStandardValues = new Array();
			var allSelectFields = new Array();
			var allSelectFieldValues = new Array();
			for (var i = 0; fields != null && i < fields.length; i++) {
				var fieldType = custRecord.getField(fields[i][0]).getType();
				//nlapiLogExecution('DEBUG', fields[i][0], fieldType);
				nlapiLogExecution('DEBUG','Value returned for field in newRecord'+fields[i],newRecord.getFieldValue(fields[i]));
				try {
					if (fieldType == 'multiselect') {
						var values = custRecord.getFieldValues(fields[i][0]);
						//nlapiLogExecution('DEBUG', 'Values', values);
						nlapiSubmitField("opportunity", opportunityId, fields[i][1], values);
					}
					else 
						if (fieldType == 'select') {
							//nlapiLogExecution('DEBUG', 'Value', custRecord.getFieldValue(fields[i][0]));
							allSelectFields[allSelectFields.length]=fields[i][1];
							allSelectFieldValues[allSelectFieldValues.length] = custRecord.getFieldValue(fields[i][0]);
							//nlapiSubmitField('opportunity', opportunityId, fields[i][1], custRecord.getFieldValue(fields[i][0]));
						}
						else {
							//nlapiLogExecution('DEBUG', 'Value', custRecord.getFieldValue(fields[i][0]));
							allStandardFields[allStandardFields.length] = fields[i][1];
							allStandardValues[allStandardValues.length] = custRecord.getFieldValue(fields[i][0]);
						}
				} 
				catch (e) {
					nlapiLogExecution('ERROR', e.name, e.message);
				}
			}
			//nlapiLogExecution('DEBUG', 'All Standard Fields', allStandardFields);
			//nlapiLogExecution('DEBUG', 'All Standard Values', allStandardValues);
			nlapiSubmitField('opportunity', opportunityId, allStandardFields, allStandardValues);
			try {
				nlapiSubmitField('opportunity', opportunityId, allSelectFields, allSelectFieldValues);
			}catch(err){
				if(err instanceof nlobjError){
				var errorDetails = err.getCode() + " \n" + err.getDetails() + " \n" + err.getId() + " \n" ;
					for(var i=0;i<allSelectFields.length;i++){
						errorDetails += allSelectFields[i]+":"+allSelectFieldValues[i]+", "; 
					}
					throw nlapiCreateError("101",errorDetails);	
				}				
			}
			var endCost = nlapiGetContext().getRemainingUsage();
			//nlapiLogExecution('DEBUG','Cost To Process An Opp',startCost-endCost);
		}
	}
}

function findOpenOpportunities(customerId){
	var searchFilters = new Array(
	new nlobjSearchFilter("probability",null,"greaterthan",0),
	new nlobjSearchFilter("probability",null,"lessthan",100),
	new nlobjSearchFilter("entity",null,"is",customerId)
	);
	var searchResults = nlapiSearchRecord('opportunity',null,searchFilters);
	var allOpenOpportunities = new Array();
	for(var i=0;searchResults!=null && i<searchResults.length;i++){
		allOpenOpportunities[allOpenOpportunities.length]=searchResults[i].getId();
	}
	return allOpenOpportunities;
}

