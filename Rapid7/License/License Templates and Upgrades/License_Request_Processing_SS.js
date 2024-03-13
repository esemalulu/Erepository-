/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Feb 2013     efagone
 *
 * MB: 9/14/16 - Added beforeLoad function to display the manual screening button for Amber Road
 * 
 * @require Tools/AmberRoad/AmberRoad_Integration_Library.js
 */
function beforeLoad(type, form)
{
    var field = form.addField('custpagesendemail', 'checkbox', 'Function parameters');
    field.setDisplayType('hidden');

}

var EXCEPTIONS_LIST = [
                  'FWD',
                  'PREVIOUS_REQUEST_IS_NOT_PROCESSED',
                  'INVALID_TEMPLATE_ID',
                  'INVALID_EMAIL_ADDRESS',
                  'FREEMIUM_EMAIL',
                  'LICENSE_IS_ALREADY_ISSUED',
                  'UNEXPECTED_ERROR'
                  ];

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function beforeSubmit(type) {

    var exportClassificationFieldId = 'custrecordr7licreq_exportclassification';

    if (type == 'create' || type == 'copy') {

        var email = nlapiGetFieldValue('custrecordr7licreq_email');

        try {
            // dupe check must be first
            if (isDupeReq()) {
                throw nlapiCreateError('PREVIOUS_REQUEST_IS_NOT_PROCESSED', 'We are processing your original request. Please allow up to 15 minutes to receive your license key.');
            }

            if (nlapiGetFieldValue('custrecordr7licreq_annualrevenue') == '0') {
                nlapiSetFieldValue('custrecordr7licreq_annualrevenue', '');
            }

            nlapiSetFieldValue('custrecordr7licreq_daterequested', nlapiDateToString(new Date(), 'datetimetz'));

            var templateId = nlapiGetFieldValue('custrecordr7licreq_lictempupgraderec');

            if (templateId == null || templateId == '') {
                nlapiLogExecution('ERROR', 'INVALID_TEMPLATE_ID', templateId);
                throw nlapiCreateError('INVALID_TEMPLATE_ID', 'There was an error with your request. <a href="https://www.rapid7.com/contact/">Please contact us</a>.');
            }

            var recTemplate = nlapiLoadRecord('customrecordr7lictemplatesupgrades', templateId);

            if (recTemplate.getFieldValue('custrecordr7lictemp_req_recaptcha') == 'T') {
                var reCaptchaResponse = requestReCAPTCHA();
                if (!reCaptchaResponse.success) {
                    throw nlapiCreateError('FWD', JSON.stringify(reCaptchaResponse));
                }
            }
            if (recTemplate.getFieldValue('custrecordr7lictemp_checkvalidemail') == 'T') {
                if (!validEmailDomain(email)) {
                    nlapiLogExecution('ERROR', 'Invalid email', email);
                    throw nlapiCreateError('INVALID_EMAIL_ADDRESS', 'Invalid email address. Domain does not exist.');
                }
            }
            if (recTemplate.getFieldValue('custrecordr7lictemp_freemailchecks') == 'T') {
                if (freeEmailDomain(email)) {
                    nlapiLogExecution('ERROR', 'Invalid/free email', email);
                    throw nlapiCreateError('FREEMIUM_EMAIL', 'Business email is required.');
                }
            }

            var ipAddress = nlapiGetFieldValue('custrecordr7_licreqproc_clientipaddress');

            // set geoIP fields from maxmind
            setGeoIPFields(ipAddress);

            var ipCountry = nlapiGetFieldValue('custrecordr7licreq_ipcountrycode');
            var ipCity = nlapiGetFieldValue('custrecordr7licreq_ipcity');
            var lrp = {
                    email: email,
                    ipCountryIsoCode: ipCountry,
                    countryIsoCode: nlapiGetFieldValue('custrecordr7licreq_country'),
                    ipCity: ipCity,
                    city: nlapiGetFieldValue('custrecordr7licreq_city'),
                    typeOfUse: nlapiGetFieldValue('custrecord7licreq_typeofuse'),
                    companyName: nlapiGetFieldValue('custrecordr7licreq_companyname'),
                    checkForGraylist: (recTemplate.getFieldValue('custrecordr7lictemp_restrictgraylist') == 'T'),
                    ipAddress: ipAddress,
                    logHeaderParams: nlapiGetFieldValue('custrecordr7licreq_reqlog'),
                    referer: nlapiGetFieldValue('custrecordr7licreq_referer')
            };
            nlapiLogExecution('DEBUG', 'Validation for ' + email, 'Validation data:\ncheckForGraylist: ' + lrp.checkForGraylist + '\ntemplateId: ' + templateId);
            var validationResult = validateLrp(lrp);
            nlapiLogExecution('DEBUG', 'Validation for ' + email, 'Validation result: ' + validationResult);

            var checkValidationResults = true;

            if(checkValidationResults){
                switch (validationResult) {
                    // No country detected by IP
                    case RES_IP_COUNTRY_MISSING:
                        rejectLicense();
                        nlapiSetFieldValue(exportClassificationFieldId, REASON_IP_COUNTRY_MISSING);
                        break;
                        // Auto reject
                    case RES_AUTO_REJECT:
                        rejectLicense();
                        nlapiSetFieldValue(exportClassificationFieldId, REASON_EMBARGO);
                        break;
                        // Manual checks
                    case RES_MANUAL_CHECK_GOVERNMENT:
                        nlapiSetFieldValue('custrecordr7licreq_unprocessable', 'T');
                        nlapiSetFieldValue('custrecordr7_licreqproc_graylisted', 'T');
                        nlapiSetFieldValue(exportClassificationFieldId, REASON_GOVERNMENT);
                        break;
                    default:
                        nlapiLogExecution('ERROR', 'General error', 'Unrecognized LRP validation result: '+validationResult);
                        throw nlapiCreateError('UNEXPECTED_ERROR', 'Unrecognized LRP validation result: '+validationResult);
                        break;
                }
            }
            //final step
            if (checkExistsAlready(recTemplate.getFieldValue('custrecordr7lictemp_onetime'), recTemplate.getFieldValue('custrecordr7lictemp_onetimeresetdays'), templateId, null, email)) {
                nlapiLogExecution('ERROR', 'Email Already Used', email);
                throw nlapiCreateError('LICENSE_IS_ALREADY_ISSUED', 'Our records show that you have already received a trial license from us. <a href="https://www.rapid7.com/contact/">Contact us</a> if this is incorrect.');
            }

            if (isBlacklisted(email, ipAddress)) {
                nlapiSetFieldValue('custrecordr7_licreqproc_blacklisted', 'T');
                nlapiSetFieldValue('custrecordr7licreq_unprocessable', 'T');
            }
        }
        catch (err) {
            try {
                if (EXCEPTIONS_LIST.indexOf(err.name) > -1) {
                    throw err;
                }
                else {
                    nlapiLogExecution('ERROR', 'Something Went Wrong License Request beforeSubmit', 'Email: ' + email + '\nError: ' + err);
                    var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
                    nlapiSendEmail(adminUser, adminUser, 'Something went wrong license req beforeSubmit', 'Email: ' + email + '\nError: ' + err);
                }
            }
            catch (e) {
                if (EXCEPTIONS_LIST.indexOf(e.getCode()) > -1) {
                    throw e;
                }
                else {
                    nlapiLogExecution('ERROR', 'Something Went Wrong License Request beforeSubmit', 'Email: ' + email + '\nError: ' + e);
                    var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
                    nlapiSendEmail(adminUser, adminUser, 'Something went wrong license req beforeSubmit', 'Email: ' + email + '\nError: ' + e);
                }
            }
        }
    }

    var unprocessable = null;
    var exportClassification = null;
    if (type == 'edit' || type == 'create' || type == 'copy') {
    	unprocessable = nlapiGetFieldValue('custrecordr7licreq_unprocessable')
        var processed = nlapiGetFieldValue('custrecordr7licreq_processed');

        nlapiLogExecution('DEBUG', 'Check if record can be processed', 'unprocessable = ' + unprocessable + ' processed = ' + processed);
    	
        if (processed == 'F' && unprocessable == 'F') {
            nlapiLogExecution('DEBUG', 'Scheduling script to process this record');
            nlapiScheduleScript('customscriptr7processlicrequests_sched'); //odd - 689
            nlapiScheduleScript('customscriptr7proclicrequests_sch_even'); //even - 913
        }
    }    
    if (type == 'edit')
    {
    	unprocessable = nlapiGetFieldValue('custrecordr7licreq_unprocessable')
    	exportClassification = nlapiGetFieldValue(exportClassificationFieldId);
        var graylisted = nlapiGetFieldValue('custrecordr7_licreqproc_graylisted');
        var reviewedByLegal = nlapiGetFieldValue('custrecordr7licreq_legalreviewed');
        var dynParam = nlapiGetFieldValue('custpagesendemail');
        if (exportClassification == 7 && graylisted == 'T' && unprocessable == 'T' && reviewedByLegal == 'T' && dynParam == 'T')
        {
            var context = nlapiGetContext();
            context.setSetting('SESSION', 'sendEmail', nlapiGetRecordId() + ',' + 'TRUE');
        }
    }
    if (type != 'create' && type != 'copy')
    {
    	if(type!='xedit'){
    		exportClassification = nlapiGetFieldValue(exportClassificationFieldId);
    	}else{
    		var oldLRP = nlapiGetOldRecord();
    		exportClassification = oldLRP.getFieldValue(exportClassificationFieldId);
    	}
    }
}

function afterSubmit(type)
{
    if (type == 'edit')
    {

        var context = nlapiGetContext();
        var settings = context.getSetting('SESSION', 'sendEmail');
        if (settings)
        {
            var arr = settings.split(',');
            var recordId = nlapiGetRecordId();
            if (recordId == arr[0] && arr[1] == 'TRUE')
            {
                var templateID = context.getSetting('SCRIPT', 'custscriptr7emailtemplate');
                var sendingEmail = new Object();
                sendingEmail.sendFrom = nlapiGetUser();
                sendingEmail.sendToName = '';
                sendingEmail.sendTo = nlapiLookupField(nlapiGetRecordType(), recordId, 'custrecordr7licreq_email');
                sendingEmail.templateId = templateID;
                sendEmail(sendingEmail);
                context.setSetting('SESSION', 'sendEmail', '');
            }
        }
    }
}

function requestReCAPTCHA() {
    try {

        var verifyURL = 'https://www.google.com/recaptcha/api/siteverify';
        verifyURL += '?secret=' + context.getSetting('SCRIPT', 'custscriptr7recaptchaverify_secret');
        verifyURL += '&response=' + nlapiGetFieldValue('custrecordr7licreq_recaptcha_response');
        verifyURL += '&remoteip=' + nlapiGetFieldValue('custrecordr7licreq_recaptcha_remoteip');

        var verifyResponse = nlapiRequestURL(verifyURL);
        var verifyBody = verifyResponse.getBody();

        if (verifyBody != null && verifyBody != '') {
            return JSON.parse(verifyBody);
        }
    }
    catch (e) {
        nlapiLogExecution('ERROR', 'Error on LRP requestReCAPTCHA', e);
    }

    // default to true to prevent any issues submitting form
    return {
        success: true
    };
}

function isDupeReq() {

    try {

        var arrFilters = [];
        //arrFilters[0] = new nlobjSearchFilter('custrecordr7licreq_processed', null, 'is', 'F');
        arrFilters[0] = new nlobjSearchFilter('custrecordr7licreq_unprocessable', null, 'is', 'F');
        arrFilters[1] = new nlobjSearchFilter('custrecordr7licreq_lictempupgraderec', null, 'anyof', nlapiGetFieldValue('custrecordr7licreq_lictempupgraderec'));
        arrFilters[2] = new nlobjSearchFilter('custrecordr7licreq_email', null, 'is', nlapiGetFieldValue('custrecordr7licreq_email'));
        arrFilters[3] = new nlobjSearchFilter('formulanumeric', null, 'is', 1);
        arrFilters[3].setFormula('CASE WHEN {created} < (SYSDATE - 1) THEN 1 ELSE 0 END');
        arrFilters[4] = new nlobjSearchFilter('custrecordr7lictemp_excludedupecheck', 'custrecordr7licreq_lictempupgraderec', 'is', 'F');

        var lcreated = new nlobjSearchColumn( 'created' );
        var lsysdate = new nlobjSearchColumn('formulanumeric').setFormula("SYSDATE - {created} - 15/(24*60)");
      	var columns = [lcreated, lsysdate];
        var arrResults = nlapiSearchRecord('customrecordr7licreqprocessing', null,arrFilters, columns);
        if (arrResults != null && arrResults.length > 0) {
          for(var i = 0; i<arrResults.length;i++){
            var searchresult = arrResults[ i ];
            if(searchresult.getValue(lsysdate) < (-.1252)){
              return true;
            }
          }
        }
    }
    catch (err) {
        nlapiLogExecution('DEBUG','RESULTS', 'Something Went Wrong - isDupeReq() LicReqProccessing_SS. Error: ' + err);
        var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
        nlapiSendEmail(adminUser, adminUser, 'Something Went Wrong - isDupeReq() LicReqProccessing_SS', 'Error: ' + err);
    }
    return false;
}

function freeEmailDomain(email) {
    if (email == null || email == '')
        return false;
    if (email.indexOf('@') == -1)
        return false;
    var domain = email.substr(email.indexOf('@', 0) + 1);
    nlapiLogExecution('DEBUG', 'Domain Parsed', domain);
    var searchFilters = [new nlobjSearchFilter('name', null, 'is', domain), new nlobjSearchFilter('name', null, 'is', domain)];
    var searchResults = nlapiSearchRecord('customrecordr7domainnames', null, searchFilters);
    if (searchResults != null && searchResults.length >= 1) {
        return true;
    }
    else {
        return false;
    }
    return false;
}

function isBlacklisted(email, ipAddress) {

    try {

        if (email == null || email == '') {
            return false;
        }

        var domain = email.substr(email.indexOf('@', 0));

        var arrFilters = [];
        arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
        arrFilters[1] = new nlobjSearchFilter('custrecordr7domainemailblacklistemail', null, 'is', email);
        arrFilters[1].setLeftParens(1);
        arrFilters[1].setOr(true);
        arrFilters[2] = new nlobjSearchFilter('formulatext', null, 'is', domain);
        arrFilters[2].setLeftParens(1);
        arrFilters[2].setFormula("SUBSTR({custrecordr7domainemailblacklistemail}, INSTR({custrecordr7domainemailblacklistemail}, '@'))");
        arrFilters[3] = new nlobjSearchFilter('custrecordr7domainemailblacklistdomain', null, 'is', 'T');
        arrFilters[3].setRightParens(1);

        if (ipAddress != null && ipAddress != '') {
            arrFilters[3].setOr(true);
            arrFilters[4] = new nlobjSearchFilter('custrecordr7domainemailblacklistipaddres', null, 'is', ipAddress);
            arrFilters[4].setRightParens(1);
        }
        else {
            arrFilters[3].setRightParens(2);
        }

        var arrColumns = [];
        arrColumns[0] = new nlobjSearchColumn('internalid');
        arrColumns[1] = new nlobjSearchColumn('custrecordr7domainemailblacklistemail');
        arrColumns[2] = new nlobjSearchColumn('custrecordr7domainemailblacklistdomain');

        var arrResults = nlapiSearchRecord('customrecordr7domainemailblacklist', null, arrFilters, arrColumns);

        if (arrResults != null && arrResults.length >= 1) {
            return true;
        }

    }
    catch (e) {
        var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
        nlapiSendEmail(adminUser, adminUser, 'Error on LRP isBlacklisted', 'Error: ' + e);
        nlapiLogExecution('ERROR', 'Error on LRP isBlacklisted', e);
        return false;
    }
    return false;
}

function validEmailDomain(email) {

    if (email == null || email == '') {
        return false;
    }

    try {
        var requestURL = 'https://updates.metasploit.com/services/validate_email?contactEmail=' + email;
        var response = nlapiRequestURL(requestURL);

        var resp = response.getBody();

        if (resp == null) {
            nlapiLogExecution('ERROR', 'NULL Response for HD Webservice', 'Yup');
            var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, adminUser, 'NULL response from HD validEmailDomain server', 'Look into this.. maybe defaut to true in this case');
            return false;
        }

        var xml = nlapiStringToXML(resp);
        var result = nlapiSelectNode(xml, '//result');
        var valid = nlapiSelectValue(result, '@valid');
        var reason = nlapiSelectValue(result, '@reason');

        if (valid == 'false' && reason != 'Invalid response') { //treating invalid response as valid per HD: 'We may need to treat 'Invalid response' as valid as  a workaround' 3/28/2012
            return false;
        }
        else {
            return true;
        }
    }
    catch (err) {
        nlapiLogExecution('ERROR', 'Bad Response for HD Webservice', 'Yup');
        return true;
    }
}

function checkExistsAlready(oneTimeUseValue, resetDays, templateId, activationKey, email) {

    if (oneTimeUseValue != null && oneTimeUseValue != '') {
        if (templateId != null && templateId != '' && ((activationKey != '' && activationKey != null) || (email != '' && email != null))) {

            var arrFilters = [];
            arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7lictemptracking_temprec', null, 'is', templateId);
            if (resetDays != null && resetDays != '') {
                arrFilters[arrFilters.length] = new nlobjSearchFilter('created', null, 'before', 'daysago' + resetDays);
            }

            if (activationKey != null && activationKey != '' && (oneTimeUseValue == 1 || oneTimeUseValue == 3)) {
                arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7lictemptracking_productkey', null, 'is', activationKey);
            }
            if (email != null && email != '' && (oneTimeUseValue == 2 || oneTimeUseValue == 3)) {
                arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7lictemptracking_email', null, 'is', email);
            }

            var arrResults = nlapiSearchRecord('customrecordr7lictemptracking', null, arrFilters);

            if (arrResults != null) {
                return true;
            }
        }
    }
    return false;
}

function setGeoIPFields(ipAddress) {

    nlapiSetFieldValue('custrecordr7licreq_ipcountrycode', '');
    nlapiSetFieldValue('custrecordr7licreq_ipcountry', '');
    nlapiSetFieldValue('custrecordr7licreq_ipcity', '');
    nlapiSetFieldValue('custrecordr7licreq_ipusertype', '');
    nlapiSetFieldValue('custrecordr7licreq_iporgname', '');

    var objGeoIP = get_GeoIP(ipAddress);

    if (!objGeoIP) {
        return;
    }

    if (objGeoIP.hasOwnProperty('country')) {
        nlapiSetFieldValue('custrecordr7licreq_ipcountrycode', objGeoIP.country.iso_code);

        if (objGeoIP.country.hasOwnProperty('names')) {
            nlapiSetFieldValue('custrecordr7licreq_ipcountry', objGeoIP.country.names.en);
        }
    }

    if (objGeoIP.hasOwnProperty('city') && objGeoIP.city.hasOwnProperty('names')) {
        nlapiSetFieldValue('custrecordr7licreq_ipcity', objGeoIP.city.names.en);
    }

    if (objGeoIP.hasOwnProperty('traits')) {
        nlapiSetFieldValue('custrecordr7licreq_ipusertype', objGeoIP.traits.user_type);
        nlapiSetFieldValue('custrecordr7licreq_iporgname', objGeoIP.traits.organization);
    }

    return;
}

/**
 * Set all the necessary flags for LRP to be approved. 
 */
function approveLicense() {
    nlapiSetFieldValue('custrecordr7licreq_processed', 'F');
    nlapiSetFieldValue('custrecordr7licreq_unprocessable', 'F');
    nlapiSetFieldValue('custrecordr7_licreqproc_blacklisted', 'F');
    nlapiSetFieldValue('custrecordr7_licreqproc_graylisted', 'F');
}

/**
 * Set all the necessary flags for LRP to be rejected. 
 */
function rejectLicense() {
    nlapiLogExecution('DEBUG', 'rejectLicense', 'rejectLicense');
    nlapiSetFieldValue('custrecordr7licreq_unprocessable', 'T');
    nlapiSetFieldValue('custrecordr7_licreqproc_graylisted', 'T');
    nlapiSetFieldValue('custrecordr7licreq_legalreviewed', 'T');
}

/**
 *  This function will perform call to Amber Road integration library for screening
 * @returns status of screening
 */
function screenInAmberRoad(){
	var companyName = nlapiGetFieldValue('custrecordr7licreq_companyname'); 
	var contactName = nlapiGetFieldValue('custrecordr7licreq_firstname') +' '+ nlapiGetFieldValue('custrecordr7licreq_lastname');
	var secondaryContactName = '';
	var address1 = nlapiGetFieldValue('custrecordr7licreq_streetaddress');
	var address2 = '';
	var address3 = '';
	var city = nlapiGetFieldValue('custrecordr7licreq_city');
	var stateCode = nlapiGetFieldValue('custrecordr7licreq_state');
	var stateName = '';
	var postalCode = nlapiGetFieldValue('custrecordr7licreq_zip');
	var countryCode = nlapiGetFieldValue('custrecordr7licreq_ipcountrycode') ;
	var countryName = nlapiGetFieldValue('custrecordr7licreq_ipcountry');
	var screeningResult;
	try{
		var recId = nlapiGetRecordId();
		// When there is new record
		if(!recId){
			recId = new Date().getTime();
		}
		var objAR = new amberRoadObject('customrecordr7licreqprocessing',recId,companyName,contactName,secondaryContactName,address1,address2,address3,city,stateCode,stateName,postalCode,countryCode,countryName);
		screeningResult = objAR.screenCompany();
	} 
	catch (e) {
        nlapiLogExecution('ERROR', 'LRP_SS - Call to AmberRoad', 'Exception: '+ e);
		screeningResult = null;
	}
	return screeningResult;
}
