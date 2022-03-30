/**
 * This field is optional. If you wish to have new prospects created with certain campaign by default, please specify Pardot Campaign ID.
 * How to get Pardot Campaign ID:
 * - Login to Pardot and click Marketing  > Campaign and click on the campaign you wish to set as default. When the campaign detail page loads,
 * notice last part of the URL. That is the ID of the campaign.
 */
//Required
var pardotEmail='';
var pardotPassword='';
var pardotUserKey='';
//Optional
var pardotCampaignId='';

//Production
var recTypes = new Array('contact', 'customer');

var pardotLoginUrl = 'https://pi.pardot.com/api/index?email='+pardotEmail+'&password='+encodeURIComponent(pardotPassword)+'&user_key='+pardotUserKey;
var pardotCreateUrl = 'https://pi.pardot.com/api/prospect?version=3&do=create&user_key='+pardotUserKey;
//key is generated by Pardot upon successful connection
var pardotApiKey = '';
var ctx = nlapiGetContext();

function pushToPardot(type){
	var filter = new Array();
	filter.push(new nlobjSearchFilter('CUSTENTITYPI_URL', null, 'is', 'http://queued'));
	filter.push(new nlobjSearchFilter('email',null,'isnotempty'));
	
	var column = new nlobjSearchColumn('email');
	
	for (var i = 0; i < recTypes.length; i++) {
		var searchResults = nlapiSearchRecord(recTypes[i], null, filter, column);
		if (searchResults && searchResults.length > 0) {
			if (!pardotApiKey) {
				nlapiLogExecution('debug', 'pushToPardot', 'No api_key, attempting to get one');
				var response = nlapiRequestURL(pardotLoginUrl, null, null );
				var responseXML = nlapiStringToXML( response.getBody() );
				pardotApiKey = nlapiSelectValue( responseXML, '//api_key' );
			}
			
			if (pardotApiKey) {
				nlapiLogExecution('debug', 'pushToPardot', 'api_key valid, going to iterate search results');

				for (var j = 0; j < searchResults.length; j++) {
					verifyMetering(500, null);
					var recEmail = searchResults[j].getValue('email');
					var createUrl = pardotCreateUrl;
					createUrl += '&api_key='+pardotApiKey+'&email='+recEmail;
					if (pardotCampaignId) {
						//pass in default pardot campaign id if set by user
						createUrl +='&campaign_id='+pardotCampaignId;
					}
					
					nlapiLogExecution('debug', 'pushToPardot', 'URL: ' + createUrl);
					var createRes = nlapiRequestURL(createUrl, null, null );
					var createXml = nlapiStringToXML(createRes.getBody());
					var updTypeRecord = false;
					//check to see create prospect in Pardot was successful
					if (nlapiSelectValue(createXml, '//@stat') == 'ok') {
						//only update Pardot URL if pardot creation was successful
						nlapiLogExecution('DEBUG','Pardot Create','Successfully created '+recEmail);
						updTypeRecord = true;
					} else {
						//if error, check to see if prospect already exists. If prospect already exists, update the record.
						//code 9 indicates existing prospect email
						if (nlapiSelectValue(createXml, '//@code') == '9') {
							nlapiLogExecution('DEBUG','WARNING: Prospect Exists',recEmail+' already exists in Pardot: '+nlapiSelectValue(createXml, '//err'));
							updTypeRecord = true;
						} else {
							nlapiLogExecution('ERROR','Create Prospect Failed',recEmail+' Failed to be created: '+nlapiSelectValue(createXml, '//@code')+' :: '+nlapiSelectValue(createXml, '//err'));
							updTypeRecord = false;
						}
					}
					
					if (updTypeRecord) {
						try {
							nlapiSubmitField(recTypes[i],searchResults[j].getId(), 'custentitypi_url', 'http://processing');
							nlapiLogExecution('DEBUG','Updating Pardot URL','Successfully updated Pardot Url for '+recEmail+' of '+recTypes[i]);
						} catch (e) {
							nlapiLogExecution('ERROR','Error updating field for '+recEmail+' of '+recTypes[i]+'('+searchResults[j].getId()+') :: '+e.toString());
						}
					}
				}
			}
		}
	}
}	

function verifyMetering(maxUnits, params){
	nlapiLogExecution('debug', 'verifyMetering', 'Attempting to verify the metering');
    if (isNaN(parseInt(maxUnits, 10))) {
        maxUnits = 50;
    }
    if (ctx.getExecutionContext() == 'scheduled' && ctx.getRemainingUsage() <= maxUnits) {
        nlapiLogExecution('audit', 'verifyMetering()', 'Metering low, scheduling another execution');
        nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
        throw nlapiCreateError('METERING_LOW_ERR_CODE', 'Usage metering low, another execution has been scheduled', true);
    }
}