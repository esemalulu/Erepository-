/**
 * @author suvarshi
 */
function updateContactLevelLeadSource(){
		
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();	
		
	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG','UnscheduledScriptDetails',context.getScriptId()+" "+ context.getDeploymentId());
	
	nlapiLogExecution('DEBUG','The unscheduled script has been chained','successfully');
	
	
	var metering =0;
	var searchResults = nlapiSearchRecord('contact',2511);
	metering += 10;
	var lastContactId = null;
	var maxResponseDate = null;
	var responseDate = null;
	
	var contactRecord, stop, maxResponseDateDate, maxResponseDateTime;
	var searchResult, responseDate, companyId, campaignId, presentContactId, lastResponseDate;
	
	for ( var i = 0; searchResults != null && i < searchResults.length && i < 17; i++ ) 
	{
		nlapiLogExecution('DEBUG','Remaining Usage',context.getRemainingUsage());
		if(context.getRemainingUsage()<=60 ||!timeLeft()){
			var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
			nlapiLogExecution('DEBUG','Status',status);
			if (status=='QUEUED'||status=='INPROGRESS'){
				nlapiLogExecution('DEBUG','Attempting to chain to unscheduled script from unscheduled','1');
				break;
			}
		}

		searchResult = searchResults[i];
		responseDate='';campaignId='';contactId='';
		
		responseDate =searchResult.getValue('responsedate', 'campaignresponse');
		campaignId = searchResult.getValue('internalid','campaignresponse');
		contactId = searchResult.getValue('internalid');
		var txt = "ResponseDate:"+responseDate+" CampaignId:"+campaignId+" ContactId:"+contactId;
		nlapiLogExecution('DEBUG','Some Variables:',txt);
		
		if(contactId.length>=1 && campaignId.length>=1 && responseDate.length>=1)
		{
			var updatedContactRecord = obtainUpdatedContactRecord(searchResult); 
			nlapiSubmitRecord(updatedContactRecord);
		}	
	}
}

function timeLeft(){
	var presentTime =new Date().getTime(); 
	if(presentTime - startingTime > timeLimitInMilliseconds){
		return false;
	}else{
		return true;
	}
	return true;
}

function obtainUpdatedContactRecord(searchResult){
	
	//Obtaining the campaignresponse details from the searchResults
	var activeStatus = searchResult.getValue('custentityr7activestatusflagcontact');
	var campaignPrimaryResponse = searchResult.getValue('custentityr7leadsourceprimarycampaignres'); 
	var campaignId = searchResult.getValue('internalid', 'campaignresponse');
	var responseDate =searchResult.getValue('responsedate', 'campaignresponse');
	
	
	//Looking up the campaign direction of the campaign	
	var campaignDirection = nlapiLookupField('campaign',campaignId,'custeventr7direction');
	
	//Obtaining the contactId
	var contactId = searchResult.getValue('internalid');
	
	var txt = "ActiveStatus:"+activeStatus+" CampaignPrimaryResponse:"+campaignPrimaryResponse+
			  " CampaignDirection:"+campaignDirection ;
	nlapiLogExecution('DEBUG', 'Some more variables', txt);
	
	//Loading the contact record
	var contactRecord = nlapiLoadRecord('contact',contactId);
	
	//What is the status of the contact
	var statusOnRecord = contactRecord.getFieldValue('custentityr7activestatusflagcontact');
	
	//contactRecord.setFieldValue('custentityr7activestatusflagcontact',statusOnRecord);
	var contactName = contactRecord.getFieldValue('entityid');
		
	//Obtaining the response date and time
	var responsesDateAndTime = responseDate.split(" ");
	
	//Parsing out the response date
	responseDate =responsesDateAndTime[0];
	
	if(activeStatus=='T' && (campaignPrimaryResponse==null || campaignPrimaryResponse=='')){
	//If the activeStatus of the contact is true
	//overwrite the primaryCampaignResponse
	//and change the primaryCampaignResponseDate
		
		contactRecord.setFieldValue('custentityr7leadsourceprimarycampaignres',campaignId);
		nlapiLogExecution('DEBUG','Set Primary Campaign Response:',campaignId);
		
		contactRecord.setFieldValue('custentityr7leadsourceprimarycampresdate',responseDate);
		nlapiLogExecution('DEBUG','Set Primary Campaign Response Date:',responseDate);
	}
	else if(activeStatus==null || activeStatus=='F'){
		//If the contact is not 'active'
		//Then if the campaignDirection is inbound set it to Active
		//And set the primaryCampaignResponse and primaryCampaignResponseDate either way
		contactRecord.setFieldValue('custentityr7leadsourceprimarycampaignres',campaignId);
		contactRecord.setFieldValue('custentityr7leadsourceprimarycampresdate',responseDate);
		if(campaignDirection==1)contactRecord.setFieldValue('custentityr7activestatusflagcontact','T');
	}
	return contactRecord;
}