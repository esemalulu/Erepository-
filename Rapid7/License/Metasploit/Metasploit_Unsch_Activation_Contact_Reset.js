var searchRecord = 'customrecordr7metasploitlicensingreset';
var unprocessedField = 'custrecordr7msresetunprocessed';

var searchColumns = new Array(
	new nlobjSearchColumn('custrecordr7msresetnewcontact'),
	new nlobjSearchColumn('custrecordr7msresetnewexpirationdate'),
	new nlobjSearchColumn('custrecordr7msresetmetasploitlicense')
	);

function reset(){
	
	var results = getRecordsToReset();
	
	for (var i=0;results.searchResults!=null && i<results.searchResults.length;i++){
		
		var id = null;
		
		try {
			//Process all records
			id = processRecord(
			results.searchResults[i].getId(), 
			results.searchResults[i].getValue(results.searchColumns[0]), 
			results.searchResults[i].getValue(results.searchColumns[1]), 
			results.searchResults[i].getValue(results.searchColumns[2])
			);
			
		}catch(err){
			nlapiLogExecution('ERROR','Could not process record',err);
		}
		
		//If processing was successful check off checkbox
		if(id!=null){
			nlapiSubmitField('customrecordr7metasploitlicensingreset',
			results.searchResults[i].getId(),
			'custrecordr7msresetunprocessed',
			'F'
			);	
		}
	}
}

//Process an individual record
function processRecord(id,newContact,newExpirationDate,licenseRecord){
	
	var id = null;
	if(licenseRecord!=null && licenseRecord!=''){
		//Loading the metasploit record
		var msLicenseRecord = nlapiLoadRecord('customrecordr7metasploitlicensing',licenseRecord);
		
		//Setting new contact
		if(newContact!=null && newContact!=''){
			msLicenseRecord.setFieldValue('custrecordr7mslicensecontact', newContact);
		}
		
		if(newExpirationDate!=null && newExpirationDate!=''){
			msLicenseRecord.setFieldValue('custrecordr7mslicenseexpirationdate', newExpirationDate);
		}
		
		//Reset activation count
		msLicenseRecord.setFieldValue('custrecordr7msresetactivationcount', 'T');
		
		
		//Expiration Date Logic goes here
		//Submitting Record
		var id = nlapiSubmitRecord(msLicenseRecord);	
	}
	return id;
}


//Get results to process
function getRecordsToReset(){

	var searchFilters = new Array();
	searchFilters[searchFilters.length]=
	new nlobjSearchFilter(unprocessedField,null,'is','T');
	
	var searchResults = nlapiSearchRecord(searchRecord,null,searchFilters, searchColumns);
	
	var returnResults = {};
	returnResults.searchColumns = searchColumns;
	returnResults.searchResults = searchResults;
	
	return returnResults;
}
