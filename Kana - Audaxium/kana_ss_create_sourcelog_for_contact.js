// BEGIN SCRIPT DESCRIPTION BLOCK  =================================================================================
/*
   	Script Name: 		kana_ss_create_sourcelog_for_contact.js
	Author: 		Sagar Shah
	Date: 			07/10/2012
	Description:	Create Source log entries for 'Campaign Source'  or 'Google Analytics Source' field value change.
	================================================
   	Change ID: 		UPDATE_ALL_OPEN_OPPTY
	Author: 		Sagar Shah
	Date: 			01/04/2013
	Description:	Update the logic to update all the open opportunities for the 
	corresponding customer record and not just the opportunities of the Primary Contact
	================================================
   	Change ID: 		NEW_LOGIC_AUG2013
	Author: 		Sagar Shah
	Date: 			08/20/2013
	Description:	Update the logic such that now the Source Log creation is triggered by change in Asset Name and 
	Asset Type.
	================================================*/
// END SCRIPT DESCRIPTION BLOCK  ===================================

var adminEmail;        
var sNetsuiteEmailId = 24316; //marketing@kana.com

function trackSourceChange(type)
{
	var contactID;
	var errorText;
	var adminEmail;

	nlapiLogExecution('debug','type',type);
	
	if(type!='create' && type!='edit')
		return;

	try {

		adminEmail = nlapiGetContext().getSetting('SCRIPT', 'custscript_admin_email0712');
		
		nlapiLogExecution('debug','adminEmail',adminEmail);
		
		contactID = nlapiGetRecordId();
		
		nlapiLogExecution('debug','contactID',contactID);
		
		if(contactID==-1)
			return
			
		var contactRec = nlapiGetNewRecord();
		
		nlapiLogExecution('debug','is null check',kana_IsNull(contactRec));
		
		if(kana_IsNull(contactRec))
			return;
				
		var oldContactRec = nlapiGetOldRecord();			
		
		var autoOpptyFlag = contactRec.getFieldValue('custentity_create_auto_oppty_flag');
		var autoOppty = contactRec.getFieldValue('custentity_auto_oppty_already_created');
		
		nlapiLogExecution('debug','autoOpptyFlag', autoOpptyFlag);
		nlapiLogExecution('debug','autoOppty', autoOppty);
		
		var isAutoOpptyChecked = false;
		
		if(autoOpptyFlag=='T' && kana_IsNull(autoOppty))
			isAutoOpptyChecked = true;
		
		nlapiLogExecution('debug','isAutoOpptyChecked', isAutoOpptyChecked);
		
		var campaignSource = contactRec.getFieldValue('custentity_campaign_source');
		var utmSource = contactRec.getFieldValue('custentitypi_utm_source');
		var salesCallback = contactRec.getFieldValue('custentity_request_a_sales_callback');
		//NEW_LOGIC_AUG2013 - start
		var assetName = contactRec.getFieldValue('custentity_pardot_asset_field');
		var assetType = contactRec.getFieldText('custentity_pardot_offer_type');
		var medium = contactRec.getFieldValue('custentity_campaign_medium');
		var utmMedium = contactRec.getFieldValue('custentitypi_utm_medium');
		var campaignName = contactRec.getFieldValue('custentity_campaign_name');
		var utmCampaignName = contactRec.getFieldValue('custentitypi_utm_campaign');
		//NEW_LOGIC_AUG2013 - end
		
		var oldCampaignSource = null;
		var oldUTMSource = null;
		var oldSalesCallback = null;
		
		//NEW_LOGIC_AUG2013 - start
		var oldAssetName = null;
		var oldAssetType = null;
		var oldMedium = null;
		var oldUTMMedium = null;
		var oldCampaignName = null;
		var oldUTMCampaignName = null;
		//NEW_LOGIC_AUG2013 - end
		
		if(!kana_IsNull(oldContactRec)) {
			oldCampaignSource = oldContactRec.getFieldValue('custentity_campaign_source');
			oldUTMSource = oldContactRec.getFieldValue('custentitypi_utm_source');
			oldSalesCallback = oldContactRec.getFieldValue('custentity_request_a_sales_callback');	
			//NEW_LOGIC_AUG2013 - start
			oldAssetName = oldContactRec.getFieldValue('custentity_pardot_asset_field');
			oldAssetType = oldContactRec.getFieldText('custentity_pardot_offer_type');
			oldMedium = oldContactRec.getFieldValue('custentity_campaign_medium');
			oldUTMMedium = oldContactRec.getFieldValue('custentitypi_utm_medium');
			oldCampaignName = oldContactRec.getFieldValue('custentity_campaign_name');
			oldUTMCampaignName = oldContactRec.getFieldValue('custentitypi_utm_campaign');
			//NEW_LOGIC_AUG2013 - end
		}
		
		var isCampSourceChanged = false;
		var isUTMSourceChanged = false;
		var isSalesCallbackChecked = false;
		//NEW_LOGIC_AUG2013 - start
		var isAssetNameChanged = false;
		var isAssetTypeChanged = false;
		var isMediumChanged = false;
		var isUTMMediumChanged = false;
		var isCampaignNameChanged = false;
		var isUTMCampaignNameChanged = false;

		
		isAssetNameChanged = isValueChanged(assetName,oldAssetName)
		
		nlapiLogExecution('debug','isAssetNameChanged', isAssetNameChanged);
		
		isAssetTypeChanged = isValueChanged(assetType,oldAssetType);

		isMediumChanged = isValueChanged(medium,oldMedium);
		
		isUTMMediumChanged = isValueChanged(utmMedium,oldUTMMedium);

		isCampaignNameChanged = isValueChanged(campaignName,oldCampaignName);
		
		isUTMCampaignNameChanged = isValueChanged(utmCampaignName,oldUTMCampaignName);

		//NEW_LOGIC_AUG2013 - end
		
		isCampSourceChanged = isValueChanged(campaignSource,oldCampaignSource);
		
		isUTMSourceChanged = isValueChanged(utmSource,oldUTMSource);

		if(salesCallback != oldSalesCallback && salesCallback=='T')
			isSalesCallbackChecked = true;		
				
		//if both Campaign and GTM Source got changed but they have same value just create one Source Log entry
		if(isCampSourceChanged && isUTMSourceChanged && campaignSource==utmSource)
			isUTMSourceChanged = false;
		
		//NEW_LOGIC_AUG2013 - start
		/*
		//if non of the two Source fields have changed don't create the Source log entry
		if(!isCampSourceChanged && !isUTMSourceChanged)
			return;
				*/
		
		 //if assetName and asset type have not changed don't create the Source log entry
		if(!isAssetNameChanged && !isAssetTypeChanged)		
				return;	
				
		assetName = latestValue(isAssetNameChanged, assetName);
		
		assetType = latestValue(isAssetTypeChanged, assetType);

		medium = latestValue(isMediumChanged, medium);

		utmMedium = latestValue(isUTMMediumChanged, utmMedium);

		campaignName = latestValue(isCampaignNameChanged, campaignName);

		utmCampaignName = latestValue(isUTMCampaignNameChanged, utmCampaignName);

		campaignSource = latestValue(isCampSourceChanged, campaignSource);

		utmSource = latestValue(isUTMSourceChanged, utmSource);
		
		//NEW_LOGIC_AUG2013 - end
		
		//we do not want to create log entry without Lead/Company record since there won't be any opportunity record
		// or a way to find the stage
		var leadID = contactRec.getFieldValue('company');
		if(leadID==null || leadID =='')
			return;

		nlapiLogExecution('debug','Contact Lead ID', leadID);
		
		//sourceLogObject would serve as an Object to hold all data fields to create a Source Log record
		var sourceLogObject = {};
		sourceLogObject.contactID = contactID;
		sourceLogObject.isSalesCallbackChecked = isSalesCallbackChecked;
		sourceLogObject.assetType = assetType;
		sourceLogObject.assetName = assetName;
		sourceLogObject.industryVertical = nlapiLookupField('customer', leadID, 'custentity_industry_vertical');
		sourceLogObject.gtmTheme = contactRec.getFieldValue('custentity_pardot_gtm_theme');

		//NEW_LOGIC_AUG2013 - start
		if(isCampSourceChanged) { 
			sourceLogObject.source = campaignSource;
			sourceLogObject.medium = medium;
			sourceLogObject.campaignName = campaignName;
		}
		if(isUTMSourceChanged) { 
			sourceLogObject.source = utmSource;
			sourceLogObject.medium = utmMedium;
			sourceLogObject.campaignName = utmCampaignName;
		}
		if(!isCampSourceChanged && !isUTMSourceChanged) { //If both the source have not changed take KANA UTMs as
														//default instead of Google UTM parameters.
			sourceLogObject.source = campaignSource;
			sourceLogObject.medium = medium;
			sourceLogObject.campaignName = campaignName;			
		}
		//NEW_LOGIC_AUG2013 - end
		
		//lets find all the opportunity records for this contact to get the stage values
		var searchColumns = new Array();
		searchColumns[0] = new nlobjSearchColumn('tranid');
		searchColumns[1] = new nlobjSearchColumn('entitystatus');
		searchColumns[2] = new nlobjSearchColumn('internalid');
		
		var searchFilters = new Array();
		
		//UPDATE_ALL_OPEN_OPPTY - start
		//Marketing now needs to track all the stages
		//var opptyStatusNotAllowed = ["0 Lead - Unqualified","1 Lead - Marketing Qualified"];
		//searchFilters[0] = new nlobjSearchFilter('internalid', 'contactprimary', 'is', contactID );
		searchFilters[0] = new nlobjSearchFilter('internalid', 'customer', 'is', leadID);
		searchFilters[1] = new nlobjSearchFilter('probability', null, 'between','1','99');		
		//searchFilters[1] = new nlobjSearchFilter('entitystatus', null, 'noneof', opptyStatusNotAllowed );

		//UPDATE_ALL_OPEN_OPPTY - end

		var searchresults = nlapiSearchRecord('opportunity', null, searchFilters, searchColumns );

		nlapiLogExecution('debug','Oppo. count', ((searchresults)?searchresults.length:0));
		
		var i;
		for ( i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			var searchresult = searchresults[i];
			var oppID = searchresult.getValue('tranid');		
			var oppStatus = searchresult.getValue('entitystatus');				
			var oppInternalID = searchresult.getValue('internalid');				

			sourceLogObject.oppStatus = oppStatus;
			sourceLogObject.oppInternalID = oppInternalID;
			createSourceLog(sourceLogObject);
				
		}//end for loop
		
		//in case there are no opportunities for the contact do the following
		if(i==0) {
			//Check if the auto opportunity flag is set. If yes then set the stage to 1 Lead - Marketing Qualified
			if(isAutoOpptyChecked) {
				sourceLogObject.oppStatus = '34';//1 Lead - Marketing Qualified (34)
				createSourceLog(sourceLogObject);
			} 
			else { //get the stage name from the customer record
				sourceLogObject.oppStatus = nlapiLookupField('customer', leadID, 'entitystatus');
				createSourceLog(sourceLogObject);				
			}			
		}
		
	} catch(exception){
		// catch error if any other exception occurs
		errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE Source Log for Contact' + '\n\n' +
					'Script Name : kana_ss_create_sourcelog_for_contact.js' + '\n' +
					'Contact Internal ID : ' + contactID + '\n' +
					'Error Details: ' + exception.toString();
		nlapiSendEmail(sNetsuiteEmailId, adminEmail, 'Error Message', errorText, null, null);
		nlapiLogExecution('ERROR', 'Error creating source Log for contact : ' + contactID,errorText);
		return;
	}	
	
}

function createSourceLog(sourceLogObject) 
{	
	nlapiLogExecution('debug','createSourceLog Called',JSON.stringify(sourceLogObject));
	//do not create source log if the status value is not captured
	if(kana_IsNull(sourceLogObject.oppStatus))
		return;
	
	var recSourceLog = nlapiCreateRecord('customrecord_kana_source_log');
	recSourceLog.setFieldValue('custrecord_contact',sourceLogObject.contactID);
	
//	if(sourceLogObject.assetType=='NA')
	//	sourceLogObject.assetType='27'; //internal value for 'NA'
	recSourceLog.setFieldValue('custrecord_asset_type',sourceLogObject.assetType);
	
	recSourceLog.setFieldValue('custrecord_asset_name',sourceLogObject.assetName);
	recSourceLog.setFieldValue('custrecord_industry_vertical',sourceLogObject.industryVertical);
	recSourceLog.setFieldValue('custrecord_gtm_theme',sourceLogObject.gtmTheme);
	
	//change some old historic stage values into latest ones.
	switch(sourceLogObject.oppStatus) {
		case '7' : //Lead Qualified
			sourceLogObject.oppStatus=6; //Live Lead
			break;
		case '19' : //1 Awareness & Investigation
		case '8' : //1 Suspect
		case '20' : //1.1 Suspect Enterprise
		case '21' : //1.2 Contact
		case '22' : //1.3 Active Suspect
		case '24' : //2.5 Hand-Off to Sales
			sourceLogObject.oppStatus=23; //2 Interest
			break;
		case '9' : //2 Qualified
		case '10' : //3 Competing
		case '25' : //3 Education
			sourceLogObject.oppStatus=26; //3 Qualified Opportunity
			break;
		case '11' : //4 Selected
			sourceLogObject.oppStatus=27; //4 Solution
			break;
		case '28' : //6 Evaluation
			sourceLogObject.oppStatus=29; //5 Proof of Concept
			break;
		case '14' : //Lost Prospect
		case '16' : //Lost Customer
		case '18' : //6 Closed - Coterm
		case '32' : //7 Closed - No Decision
		case '33' : //0 Unqualified
			sourceLogObject.oppStatus=17; //7 Closed - Lost
			break;
		case '12' : //5 Committed
		case '13' : //6 Closed Won
			sourceLogObject.oppStatus=31; //7 Closed - Won			
	}
	
	recSourceLog.setFieldValue('custrecord_stage',sourceLogObject.oppStatus);

	//NEW_LOGIC_AUG2013 - start
	recSourceLog.setFieldValue('custrecord_kana_medium',sourceLogObject.medium);
	recSourceLog.setFieldValue('custrecord_kana_source',sourceLogObject.source);
	recSourceLog.setFieldValue('custrecord_kana_campaign',sourceLogObject.campaignName);
	//NEW_LOGIC_AUG2013 - end
		
	if(sourceLogObject.isSalesCallbackChecked)
		recSourceLog.setFieldValue('custrecord_request_a_sales_callback','T');
				
	if(!kana_IsNull(sourceLogObject.oppInternalID))
		recSourceLog.setFieldValue('custrecord_oppty_reference',sourceLogObject.oppInternalID);

	nlapiSubmitRecord(recSourceLog, true, false);//create Source Log Entry
	
	nlapiLogExecution('debug','After Log Create left over usage',nlapiGetContext().getRemainingUsage());
}

//NEW_LOGIC_AUG2013 - start
function latestValue(isValueChanged, currVal) 
{	
	if(kana_IsNull(currVal))	
		return 'NA';	
	
	if(!isValueChanged)	//if value is not changed, put the prefix 'I-' 
		return 'I-'+currVal;
	else
		return currVal;
}

function isValueChanged(newValue,oldValue) 
{
	if(kana_IsNull(newValue) && kana_IsNull(oldValue))
		return false;
	
	if(newValue != oldValue)
		return true;
	else
		return false;
}
//NEW_LOGIC_AUG2013 - end