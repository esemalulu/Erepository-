
/**
 * Scheduled Script to access "AX:LMS:Push To ExtSystem Queue" (customrecord_axlms_pushextsysqueue) custom record.
 * - Based on record type, it will attempt to sync with available APIs accordingly.
 * customrecord_lmsc (Contracts), 
 * customrecord_lmslic (Licenses) , 
 * customrecord_lmsl (Location Info),
 * customrecord_lmsp (Practice Info)
 * 
 * All Company level parameters defined on the AX:LMS:UE LMS Record Process Handler User Event Script
 * 
 * Mock Server: http://mock-server1.drfirst.com:8080/
 * 
/**
var url = 'https://pfservice201ex.qa.drfirst.com/auth/v1/authenticate';
var payload = {
"username": "ndaw::username@region2.rcopia.com",
"password": "Demo3456"
};
//application/json ONLY required when doing post
var headers = new Object();
headers['Content-Type']='application/json';

alert(JSON.stringify(headers));
var res = nlapiRequestURL(url,JSON.stringify(payload),headers,'POST');
alert(res.getBody());

//------------------
var apikey = 'audaxium_apiuser-qa::username@apikey.rcopia.com';
var apisecret = 'c8EnuNud';
var apiurl = 'https://pfservice201ex.qa.drfirst.com/';

//Set up header information
var pheaders = {
'Content-Type':'application/json',
'apiKey':apikey,
'apiSecret':apisecret
};
//When passing inID it has to be compound. AA is the region
//When Creation is trigger, user MUST provide region.
//When it's returned, it will return with REGION.DOMAIN.COM

var userShowUrl = apiurl+'user/v1/show/1013880::userId@AA.rcopia.com';
alert(userShowUrl);
//nlapiRequestURL(url, postData, headers, callback, httpMethod)
var res = nlapiRequestURL(userShowUrl , null, pheaders);
alert(res.getBody());

	//--------------------------------------------------------------
function scheduledSyncTester() {
	var url = 'https://pfservice201ex.qa.drfirst.com/auth/v1/authenticate';
	var payload = {
		'username': 'ndaw::username@region2.rcopia.com',
		'password': 'Demo3456'
			
	};
	//application/json ONLY required when doing post
	var headers = {
		'Content-Type':'application/json'	
	};

	log('debug','Payload',JSON.stringify(payload));
	var res = nlapiRequestURL(url,payload,headers,null,'POST');
	
	
	nlapiLogExecution('debug','Authenticate', res.getBody());
	
	//----------------------------------------------
	var apikey = 'audaxium_apiuser-qa::username@apikey.rcopia.com';
	var apisecret = 'c8EnuNud';
	var apiurl = 'https://pfservice201ex.qa.drfirst.com/';

	//Set up header information
	var pheaders = {
		'Content-Type':'application/json',
		'Accept':'application/json',
		'practiceId':'',
		'location':'',
		'organizationId:'',
		'apiKey':apikey,
		'apiSecret':apisecret
	};
	//When passing inID it has to be compound. AA is the region
	//When Creation is trigger, user MUST provide region.
	//When it's returned, it will return with REGION.DOMAIN.COM

	var userShowUrl = apiurl+'user/v1/show/1013880::userId@AA.rcopia.com';
	//nlapiRequestURL(url, postData, headers, callback, httpMethod)
	var resm = nlapiRequestURL(userShowUrl , null, pheaders,null,'GET');
	
	nlapiLogExecution('debug','Show user API', resm.getBody());

	
}

	
 * 
 * @param type
 */

//--------------------------------------------------------------
//Company Level Parameters
var paramErrorMainEmpId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb94_errmainempid');
var paramErrorCcEmails = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb94_errccemails');
if (paramErrorCcEmails) {
	paramErrorCcEmails = paramErrorCcEmails.split(',');
}

var paramMaxSyncRetry = nlapiGetContext().getSetting('SCRIPT','custscript_sb94_maxretry');
var paramRcopiaApiDomain = nlapiGetContext().getSetting('SCRIPT','custscript_sb94_rcopiadomain');
var paramRcopiaApiVersion = nlapiGetContext().getSetting('SCRIPT','custscript_sb94_rcopiaapiversion');
var paramRcopiaUsername = nlapiGetContext().getSetting('SCRIPT','custscript_sb94_rcopiauser');
var paramRcopiaPassword = nlapiGetContext().getSetting('SCRIPT','custscript_sb94_rcopiapass');

//Constant Values
//These values are from AX:LMS Sync Status (customlist_axlms_syncstatus) custom List
var STATUS_PENDING = '1';
var STATUS_SUCCESS = '2';
var STATUS_FAILED = '3';

//Authentication Header Value with Base64 encryption
var pheaders = {};
var apiUrlPrefix = '';

function pushSyncWithExtSystem(type) {

	//1 Before starting, make sure ALL required elements are set
	if (!paramMaxSyncRetry || !paramRcopiaApiDomain || !paramRcopiaUsername || !paramRcopiaPassword || !paramRcopiaApiVersion) {
		throw nlapiCreateError('LMSSYNC-ERR', 'Missing one or more required info. Under Setup > Company > General Preferences > Custom Preference Tab', false);
	}
	
	//Set up header information
	pheaders = {
		'Content-Type':'application/json',
		'Accept':'application/json',
		'practiceId':'',
		'location':'',
		'organizationId':'',
		'apiKey':paramRcopiaUsername,
		'apiSecret':paramRcopiaPassword
	};
	
	log('debug','pheaders', JSON.stringify(pheaders));
	
	//2. Let's get into syncing
	try {
		
		var qexpflt = [
		               ['custrecord_lmspush_status', 'anyof', STATUS_PENDING],
		               'OR',
		               [
		                ['custrecord_lmspush_status', 'anyof', STATUS_FAILED],
		                'AND',
		                ['custrecord_lmspush_retrycount', 'isnotempty',''],
		                'AND',
		                ['custrecord_lmspush_retrycount','lessthanorequalto',paramMaxSyncRetry]
		               ]
		              ];
		
		var qexpcol = [new nlobjSearchColumn('internalid').setSort(), // grab the Oldest one in. Order DOES matter since it's possible to have Last action taken against a record is delete
		               new nlobjSearchColumn('custrecord_lmspush_syncrectype'),
		               new nlobjSearchColumn('custrecord_lmspush_syncrecid'),
		               new nlobjSearchColumn('custrecord_lmspush_actiontaken'),
		               new nlobjSearchColumn('custrecord_lmspush_retrycount'),
		               new nlobjSearchColumn('custrecord_lmspush_contracteid'),
		               new nlobjSearchColumn('custrecord_lmspush_licenseeid'),
		               new nlobjSearchColumn('custrecord_lmspush_practiceeid'),
		               new nlobjSearchColumn('custrecord_lmspush_locationeid')];
		
		var sqrs = nlapiSearchRecord('customrecord_axlms_pushextsysqueue', null, qexpflt, qexpcol);
		
		//loop through each queued up result and execute logic
		for (var i=0; sqrs && i < sqrs.length; i++) {
			
			var procStatus = '';
			var procLog = '';
			var retryCnt = 0;
			if (sqrs[i].getValue('custrecord_lmspush_retrycount')) {
				retryCnt = parseInt(sqrs[i].getValue('custrecord_lmspush_retrycount'));
			}
			
			try {
				log('debug','Record Type',sqrs[i].getValue('custrecord_lmspush_syncrectype'));
				//based on record type call it's own function.
				switch (sqrs[i].getValue('custrecord_lmspush_syncrectype')) {
				case 'customrecord_lmsc':
					//Contracts record:
					syncContract(sqrs[i], sqrs[i].getValue('custrecord_lmspush_actiontaken'));
					break;

				case 'customrecord_lmsp':
					//Practice:
					syncPractice(sqrs[i], sqrs[i].getValue('custrecord_lmspush_actiontaken'));
					break;
				
				case 'customrecord_lmsl':
					//Location: 
					syncLocation(sqrs[i], sqrs[i].getValue('custrecord_lmspush_actiontaken'));
					break;
				
				case 'customrecord_lmslic':
					//License:
					syncLicense(sqrs[i], sqrs[i].getValue('custrecord_lmspush_actiontaken'));
					break;
					
				default:
					break;
				}
				
				//At this point, assume sync was successful
				procStatus = STATUS_SUCCESS;
				procLog = '';
				
			} catch (recprocerr) {
				log('error','Processing Error ', getErrText(recprocerr));
				retryCnt++;
				procStatus = STATUS_FAILED;
				procLog = getErrText(recprocerr);
			}
			
			//update this queue record
			var updfld = ['custrecord_lmspush_retrycount',
			              'custrecord_lmspush_status',
			              'custrecord_lmspush_synclog'];
			var updval = [retryCnt,
			              procStatus,
			              procLog];
			nlapiSubmitField('customrecord_axlms_pushextsysqueue', sqrs[i].getId(), updfld, updval, true);
			
		}
		
	} catch (pushsyncerr) {
		log('error','Unexpected Push Sync Error', getErrText(pushsyncerr));
	}
	
}


function syncLocation(row, actiontype) {

	var LocationExternalId = row.getValue('custrecord_lmspush_locationeid');
	log('debug','LocationExternalId', LocationExternalId);
	
	
}

function syncPractice(row, actiontype) {

	var practiceExternalId = row.getValue('custrecord_lmspush_practiceeid');
	log('debug','licenseExternalId', practiceExternalId);
	
	
}


/**
 * Sync up License NS record with Rcopia User.
 * Create: 
 * 	1. /user/{paramRcopiaApiVersion}
 *  2. /user-affiliation/{paramRcopiaApiVersion}
 *  3. Save license key as Name on License record
 *  4. /practice/{paramRcopiaApiVersion}/adduser/{userID}
 *  5. /location/{paramRcopiaApiVersion}/adduser/{userID}
 * 
 * Update:
 * 	- TODO: Need to verify logics
 * 
 * @param row
 */
function syncLicense(row, actiontype) {

	var licenseExternalId = row.getValue('custrecord_lmspush_licenseeid');
	log('debug','licenseExternalId', licenseExternalId);
	
	
}

/**
 * Sync up Contract NS record with Rcopia Organization.
 * Organization API:
 * 	/organization/{paramRcopiaApiVersion}/
 *
 * @param row
 */
function syncContract(row, actiontype) {
	
	//set API URL
	apiUrlPrefix = paramRcopiaApiDomain+'organization/'+paramRcopiaApiVersion;
	
	var contractExternalId = row.getValue('custrecord_lmspush_contracteid');
	log('debug','contractExternalId', contractExternalId);
	
	if (actiontype === 'delete') 
	{
		/**
		//Make sure we have contractExternId from NS record to Delete
		if (!contractExternalId) {
			//throw error
			throw nlapiCreateError('LMSSYNC-ERR', 'External ID of Contract is Missing', true);
		}
		
		//IF Contract is deleted, call delete api
		var apiDeleteUrl = apiUrlPrefix+'/delete?organizationId='+contractExternalId;
		var deleteOrgRes = nlapiRequestURL(apiDeleteUrl, null, pheaders, null, null);
		
		log('debug','deleteOrgRes Body', deleteOrgRes.getCode()+' :: '+deleteOrgRes.getBody());
		
		if (parseInt(deleteOrgRes.getCode()) >= 400) {
			//Treat this as an error
			throw nlapiCreateError('LMSSYNC-ERR','Error deleting OrganizationId '+contractExternalId+' // '+deleteOrgRes.getBody());
		}
		*/
	} 
	else 
	{
		//Load the latest record 
		var crec = nlapiLoadRecord(row.getValue('custrecord_lmspush_syncrectype'), row.getValue('custrecord_lmspush_syncrecid'));
		
		if (actiontype == 'create') {
			var createOrgUrl = apiUrlPrefix+'/save';
			//------------ Contract / Organization CREATE-----------------
			//Attempt to create Organization
			//1. Build POST Pay Load
			var createOrgPayLoad = {
					"availableRegions":[crec.getFieldText("custrecord_lmsct_accessregion")],
					"name":crec.getFieldValue("name"),
					"contractEndDate":(crec.getFieldValue("custrecord_lmsct_endate")?lmsUtcFormatDate(nlapiStringToDate(crec.getFieldValue("custrecord_lmsct_endate"))):""),
					"contractStartDate":(crec.getFieldValue("custrecord_lmsct_startdate")?lmsUtcFormatDate(nlapiStringToDate(crec.getFieldValue("custrecord_lmsct_startdate"))):""),
					"contractManager":(crec.getFieldValue("custrecord_lmsct_ctmanager")?crec.getFieldValue("custrecord_lmsct_ctmanager"):''),
					"contractType":crec.getFieldText("custrecord_lmsct_type"),
					"username":{
						"domain":crec.getFieldText("custrecord_lmsct_accessregion")+".rcopia.com",
						"simpleId":crec.getFieldValue("custrecord_lmsct_username"),
						"type":"organizationUsername"
					},
					"contactName":{
						"firstName":crec.getFieldValue("custrecord_lmsct_contactfname"),
					    "lastName": crec.getFieldValue("custrecord_lmsct_contactlname")
					}
			};
			
			log('debug','About to trigger requests','About to Trigger API to: '+createOrgUrl);
			
			//Build Create URL using save
			var createOrgRes = nlapiRequestURL(createOrgUrl, JSON.parse(JSON.stringify(createOrgPayLoad)), pheaders,null,'POST');
			
			log('debug','Result createOrgRes Body', createOrgRes.getCode()+' :: '+createOrgRes.getBody());
			
			if (parseInt(createOrgRes.getCode()) >= 400) {
				//Treat this as an error
				throw nlapiCreateError('LMSSYNC-ERR','Error creating Organization: '+JSON.stringify(createOrgPayLoad)+' // '+createOrgRes.getBody());
			} else {
				//If successful, it will return JSON Object with domain,simpleId,type
				var createOrgJson = JSON.parse(createOrgRes.getBody());
				//grab simpleId and set it on the contract record.
				crec.setFieldValue('externalid',createOrgJson.simpleId);
				crec.setFieldValue('custrecord_lmsct_externalid', createOrgJson.simpleId);
				//Update the record and return
				nlapiSubmitRecord(crec, true, true);
			}
			
		} else {
			/**
			//------------ Contract / Organization UPDATE-----------------
			//1. Build POST Pay Load with organizationId
			var updateOrgPayLoad = {
				'name':crec.getFieldValue('name'),
				'contractEndDate':crec.getFieldValue('custrecord_lmsct_endate'),
				'contractManager':crec.getFieldValue('custrecord_lmsct_ctmanager'),
				'contractType':crec.getFieldText('custrecord_lmsct_type'),
				'username':{
					'simpleId':crec.getFieldValue('custrecord_lmsct_username')
				},
				'organizationId':{
					'simpleId':contractExternalId
				}
			};
			//Build Update URL using /update
			var updateOrgUrl = apiUrlPrefix + '/update';
			var updateOrgRes = nlapiRequestURL(updateOrgUrl, JSON.stringify(updateOrgPayLoad), pheaders);
			
			log('debug','updateOrgRes Body', JSON.stringify(updateOrgPayLoad)+' // '+updateOrgRes.getCode()+' :: '+updateOrgRes.getBody());
			*/	
		}
	}
}
