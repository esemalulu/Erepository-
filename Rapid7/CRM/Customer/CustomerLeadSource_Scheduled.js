/**
 * @author suvarshi
 * 
 * 111823
 */
function updateCustomerLevelLeadSource(){
	
	var metering =0;
	
	var timeLimitInMinutes = 5;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	
	
	//Script Contact Campaign Response Update
	var searchResults = nlapiSearchRecord('contact',2106);
	var lastContactId = null;
	var maxResponseDate = null;
	var responseDate = null;
	
	var contactRecord, stop, maxResponseDateDate, maxResponseDateTime;
	var searchResult, responseDate, companyId, campaignId, presentContactId, lastResponseDate;
	
	for ( var i=0; searchResults!= null && i < searchResults.length; i++ ) 
	{
		if(!unitsLeft(100) || !timeLeft())
		{
			var status = nlapiScheduleScript(64);
			break;
		}
		
		searchResult = searchResults[i];
		
		responseDate =searchResult.getValue('responsedate', 'campaignresponse');
		companyId = searchResult.getValue('company');
		campaignId = searchResult.getValue('internalid', 'campaignresponse');
		presentContactId = searchResult.getValue('internalid'); 
		
		if(companyId!=null && campaignId!=null)
		{
				try{
					//Changed from nlapiSubmitField to nlapiSubmitRecord based on DZ,JQ,SB meeting on 
					//April 28,2011
					
					var customerRecord = nlapiLoadRecord('customer',companyId);
					
					customerRecord.setFieldValue('leadsource',campaignId);
					
					nlapiSubmitRecord(customerRecord);
					
				}catch(err){
					nlapiLogExecution('ERROR', 'Could not submit leadsource', 'CustomerId:'+companyId+" Leadsource:"+campaignId);
					/*
					nlapiSendEmail(2,2,'Error on Customer Level Lead Source Updation Scheduled','Checkpoint 1' + 
							"\n Company Id" + companyId +
							"\n Campaign Id" + campaignId +
							"\n Error Description"+ err.name + ' '+ err.message + err	
					);
					*/
				}
	
			nlapiLogExecution('DEBUG','Submitted the customer Record with Lead Src', campaignId);
	
			maxResponseDate=responseDate;
			stop = maxResponseDate.indexOf(' ');
			maxResponseDateDate = maxResponseDate.substring(0,stop);
			maxResponseDateTime = maxResponseDate.substring(stop+1);
		
			nlapiSubmitField('contact',presentContactId,new Array('custentityr7contactcampaignresponsedate','custentityr7contactcampaignresponsetime'),new Array(maxResponseDateDate,maxResponseDateTime));
		}
	}
}

function unitsLeft(number){
    var unitsLeft = nlapiGetContext().getRemainingUsage();
    if (unitsLeft >= number) {
        return true;
    }
    return false;
}

function wasteUnits(number){
	var beginningUsage = nlapiGetContext().getRemainingUsage();
	var remainingUsage = nlapiGetContext().getRemainingUsage();
	while (remainingUsage >= beginningUsage - number) {
		var someWastefulActivity = nlapiLookupField('customer', 130910, 'isinactive');
		remainingUsage = nlapiGetContext().getRemainingUsage();
	}
}

function timeLeft(){
	var presentTime =new Date().getTime(); 
	if(presentTime - this.startingTime > timeLimitInMilliseconds){
		return false;
	}else{
		return true;
	}
	return true;
}


