
function alertUs(){
	
	nlapiLogExecution('DEBUG','---------------------','--------');
	
	var today = new Date();
	var day = today.getDay();
	var time = today.getHours();
	
	nlapiLogExecution("DEBUG", 'Today is Day', day);
	nlapiLogExecution("DEBUG", 'This hour is', time);
	
	if ( day!=6 && day!=0 && time > 8 && time < 18 ){
		
		var searchResults = nlapiSearchRecord('customrecordphonestatistics',2305);
		
		if(searchResults==null || searchResults.length<1){
			
			nlapiLogExecution('DEBUG','No Calls Received Today','Apparently');
					
			txt = "Netsuite Alert for Phone System" +
				  "\n\n " +
				  "\nToday is a week day. Haven't received any calls today." +
				  "\n\n"+
				  "\nNetsuite.";
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser,adminUser,'Netsuite PhoneSystem Alert', txt,'derek_zanga@rapid7.com');	
			
		}
		else{
			if(searchResults[0]!=null){
				
			var dateOfCall = searchResults[0].getValue('custrecordr7phonedateofcall',null,'group');
			var timeOfCall = searchResults[0].getValue('custrecordr7phonetimeofcall',null,'max');
			nlapiLogExecution('DEBUG','Date of Call', dateOfCall);
			nlapiLogExecution('DEBUG','Time of Call', timeOfCall);
			
			var lastCall = nlapiStringToDate(timeOfCall);
			var lastCallString = nlapiDateToString(lastCall);
			nlapiLogExecution('DEBUG','lastCallString', lastCallString);
			
			var oneHour = 1000*60*60;
			var difference = parseInt((today.getTime() + (3*oneHour) - lastCall.getTime())/oneHour);
			nlapiLogExecution('DEBUG','Difference in Hours', difference);		
			
			if(difference > 1){
				
				txt = "Netsuite Alert for Phone System" +
				  "\n\n " +
				  "\nToday is a week day : " + dateOfCall + 
				  "\nLast Call received today was at: " + timeOfCall +  
				  "\nHaven't received any calls for the past " + difference + " hours." +
				  "\n\n"+
				  "\nNetsuite.";
				
				nlapiSendEmail(2,'netsuite_admin@rapid7.com','Netsuite PhoneSystem Alert', txt);
				nlapiSendEmail(2,'netsuite_admin@rapid7.com','Netsuite PhoneSystem Alert', txt);
				nlapiLogExecution('DEBUG','Sent email', txt);
			}
			
			}
		}
	}
	nlapiLogExecution('DEBUG','---------------------','--------');
}