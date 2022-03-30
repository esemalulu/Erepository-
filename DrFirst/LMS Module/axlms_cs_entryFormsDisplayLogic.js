
/**
 * Page Init function for controlling display for Practice Info form
 * @param type
 */
function axLmsPracInfoDisplayPageInit(type) {

	//List of fields to disalbe on Practice Info on EDIT
	//- Rcopia Owns the field values for UPDATES
	var updateDisableFlds = ['custrecord_lmsp_pcountry',
	                         'custrecord_lmsp_addr1',
	                         'custrecord_lmsp_addr2',
	                         'custrecord_lmsp_city',
	                         'custrecord_lmsp_state',
	                         'custrecord_lmsp_zip',
	                         'custrecord_lmsp_phone',
	                         'custrecord_lmsp_fax'];
	
	if (type=='edit') {
		//loop through and disable the fields if EDIT
		for (var i=0; i < updateDisableFlds.length; i++) {
			nlapiDisableField(updateDisableFlds[i], true);
		}
	}	
}

/**
 * Page Init function for controlling display for Location Info form
 * @param type
 */
function axLmsLocInfoDisplayPageInit(type) {

	//List of fields to disalbe on Location Info on EDIT
	//- Rcopia Owns the field values for UPDATES
	var updateDisableFlds = ['custrecord_lmsl_country',
	                         'custrecord_lmsl_addr1',
	                         'custrecord_lmsl_addr2',
	                         'custrecord_lmsl_city',
	                         'custrecord_lmsl_state',
	                         'custrecord_lmsl_zip',
	                         'custrecord_lmsl_phone',
	                         'custrecord_lmsl_fax'];
	
	if (type=='edit') {
		//loop through and disable the fields if EDIT
		for (var i=0; i < updateDisableFlds.length; i++) {
			nlapiDisableField(updateDisableFlds[i], true);
		}
	}
}

//--------------------------------------------------------------------
var originalLicenseStatus = '';
var lossReasonReqStatus = ['2','5','4'];
var enabledReasonReqStatus = ['1','3'];

/**
 * Page Init function for controlling display for License Info form
 * @param type
 */
function axLmsLicenseDisplayPageInit(type) {

	//Set the original value of license status
	originalLicenseStatus = nlapiGetFieldValue('custrecord_lmslc_status');
	
	//List of fields to disalbe on Liscense on EDIT
	//- Rcopia Owns the field values for UPDATES
	var updateDisableFlds = ['custrecord_lmslc_username',
	                         'custrecord_lmslc_email',
	                         'custrecord_lmslc_usersuffix',
	                         'custrecord_lmslc_firstname',
	                         'custrecord_lmslc_lastname',
	                         'custrecord_lmslc_userprefix',
	                         'custrecord_lmslc_licensetype',
	                         'custrecord_lmslc_rx1date',
	                         'custrecord_lmslc_staffurl',
	                         'custrecord_lmslc_medlicnum',
	                         'custrecord_lmslc_dea',
	                         'custrecord_lmslc_isdemo',
	                         'custrecord_lmslc_npi',
	                         'custrecord_lmslc_userastrxdate',
	                         'custrecord_lmslc_specialty',
	                         'custrecord_lmslc_muuser',
	                         'custrecord_lmslc_userenableddate',
	                         'custrecord_lmslc_useractive',
	                         'custrecord_lmslc_usercountry',
	                         'custrecord_lmslc_useraddr1',
	                         'custrecord_lmslc_useraddr2',
	                         'custrecord_lmslc_usercity',
	                         'custrecord_lmslc_userstatedd',
	                         'custrecord_lmslc_userzip',
	                         'custrecord_lmslc_userphone',
	                         'custrecord_lmslc_userfax'];
	
	if (type=='edit') {
		//loop through and disable the fields if EDIT
		for (var i=0; i < updateDisableFlds.length; i++) {
			nlapiDisableField(updateDisableFlds[i], true);
		}
	}
}

function axLmsLicenseFieldChd(type, name, linenum)
{
	if (name == 'custrecord_lmslc_status')
	{
		//if status is one of loss reason, clear out current enabled reason
		if (lossReasonReqStatus.contains(nlapiGetFieldValue(name)))
		{
			nlapiSetFieldValue('custrecord_lmslc_enablereason','');
		}
		
		//if status is one of enable reason, clear out current loss reason
		if (enabledReasonReqStatus.contains(nlapiGetFieldValue(name)))
		{
			nlapiSetFieldValue('custrecord_lmslc_lossreason','');
		}
	}
}

/**
 * License Save Record client trigger to validate any dynamic dependent fields are filled in
 */
function axLmsLicenseSaveRecord()
{
	//UC1: If original is empty and new one is set
	if (!originalLicenseStatus && nlapiGetFieldValue('custrecord_lmslc_status'))
	{
		//UC1a: new status is active and enable reason is NOT provided
		if (enabledReasonReqStatus.contains(nlapiGetFieldValue('custrecord_lmslc_status')) && 
			!nlapiGetFieldValue('custrecord_lmslc_enablereason'))
		{
			alert('You MUST provide enable reason for this license');
			return false;
		}
		
		//UC1b: new status is disable and loass reason is NOT provided
		if (enabledReasonReqStatus.contains(nlapiGetFieldValue('custrecord_lmslc_status')) && 
			!nlapiGetFieldValue('custrecord_lmslc_lossreason'))
		{
			alert('You MUST provide loss reason for this license');
			return false;
		}
	}
	
	if (originalLicenseStatus && nlapiGetFieldValue('custrecord_lmslc_status'))
	{
		//UC2: Active to Disabled - MUST check for Loss Reason
		if (enabledReasonReqStatus.contains(originalLicenseStatus) &&
			lossReasonReqStatus.contains(nlapiGetFieldValue('custrecord_lmslc_status')) &&
			!nlapiGetFieldValue('custrecord_lmslc_lossreason'))
		{
			alert('You MUST provide loss reason for this license');
			return false;
		}
		
		//UC3: Disabled to Active - MUST check for Enabled Reason
		if (lossReasonReqStatus.contains(originalLicenseStatus) &&
			enabledReasonReqStatus.contains(nlapiGetFieldValue('custrecord_lmslc_status')) &&
			!nlapiGetFieldValue('custrecord_lmslc_enablereason'))
		{
			alert('You MUST provide enable reason for this license');
			return false;
		}
	}
	
	return true;
}
