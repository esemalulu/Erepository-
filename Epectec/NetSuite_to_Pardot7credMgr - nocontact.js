/**
 * This version of NetSuite_to_Pardot script requires access credentials setup
 * on External Service Cred Manager custom record.
 * Script deployment will pass in Pardot cred record and optional default campaign ID as script parameters. 
 */
//Required
var credMgrId=''; //External Service Cred Manager ID passed in by Script Parameter
var pardotEmail='';
var pardotPassword='';
var pardotUserKey='';
//Optional
var pardotCampaignId='';

//Production
//var recTypes = new Array('contact', 'customer');
var recTypes = new Array('contact');

var pardotLoginUrl = 'https://pi.pardot.com/api/index?';
var pardotCreateUrl = 'https://pi.pardot.com/api/prospect?version=3&do=create&user_key=';
//key is generated by Pardot upon successful connection
var pardotApiKey = '';
var ctx = nlapiGetContext();

function pushToPardot(type){
	
	try {
		
		initScriptParameters();

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
					nlapiLogExecution('debug','pardot login api',pardotApiKey);
				}
				
				if (pardotApiKey) {
					nlapiLogExecution('debug', 'pushToPardot', 'api_key valid, going to iterate search results');
	
					for (var j = 0; j < searchResults.length; j++) {
						verifyMetering(500, getParam());
						var recEmail = searchResults[j].getValue('email');
						var createUrl = pardotCreateUrl;
						createUrl += pardotUserKey+'&api_key='+pardotApiKey+'&email='+recEmail;
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
						
					}// for loop on searchResult set
				} //if on pardotApiKey 
			} //if to check for size of resultset
		}//for loop on recTypes
	} catch (e) {
		//Core Elements of NetSuite to Pardot has failed. Stop the execution of Scheduled Script. 
		nlapiLogExecution('ERROR','Error occured during script execution :: '+e.toString());
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

/**
 * Initializes script parameter and gets required information External Service Cred Manager.
 */
function initScriptParameters() {
	credMgrId = ctx.getSetting('SCRIPT','custscript_escmrobupd');
	pardotCampaignId = ctx.getSetting('SCRIPT','custscript_pardot_campidrobupd');
	
	if (!credMgrId) {
		//throw NS exception. Script can not execute without Cred Manager selected.
		throw nlapiCreateError('NO_CRED_RECORD_SELECTED', 'Credentials for Pardot needs to be selected on the Script Deployment.', false);
	}
	//lookup info
	var fld = ['custrecord_aux_escm_login','custrecord_aux_escm_password','custrecord_aux_escm_access_api_key'];
	var credVals = nlapiLookupField('customrecord_aux_ext_serv_cred_mgr',credMgrId, fld);
	//check to make sure all values necessary values are returned
	pardotEmail = credVals.custrecord_aux_escm_login;
	pardotPassword = credVals.custrecord_aux_escm_password;
	pardotUserKey = credVals.custrecord_aux_escm_access_api_key;
	
	//for Pardot, All Three credential elements are required
	if (!pardotEmail || !pardotPassword || !pardotUserKey) {
		throw nlapiCreateError('MISSING_REQUIRED_CREDENTIALS', 'Pardot requires Login, Password AND UserKey Credentials. Please check tomake sure All three are provided', false);
	}
	//adds in required parameters to Pardot Login URL
	pardotLoginUrl+='email='+pardotEmail+'&password='+encodeURIComponent(pardotPassword)+'&user_key='+pardotUserKey;
}

/**
 * Builds list of parameters that should be passed in as part of script rescheduling. 
 * @returns params array
 */
function getParam() {
	var params = new Array();
	params['custscript_escm'] = credMgrId;
	params['custscript_pardot_campid'] = pardotCampaignId;
	return params;
}