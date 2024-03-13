/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       15 Oct 2015     mburstein
 *
 * MB 10/15/15 - As part of "APTCM-129 - NetSuite-Nexpose License Integration Authentication Updates" we've chosen to create a new script record and file.
 * This has been a long time coming and will help us with cleanup of legacy license module scripts and terminology.
 *
 * MB: 5/17/16 - Change #1206 - APTCM-323 Nexpose license enhancements for Remediation Analytics and Agents Beta Programs
 *
 * TS: 3/15/17 - As part of the InsightVM launch, we are updating the Nexpose licensing Integration to pass an additional enhancement for InsightVM (T/F)
 *
 *This script handles the web services integration between NetSuite and the Nexpose License Server.  There are two utilities on the Nexpose License Server used by NetSuite:

 Update Admin (uadmin) - Services for managing updates, reporting and resets
 r7license - Services for creating/updating license files
 This script handles the following for Nexpose License Records:

 Nexpose License Creation (r7license)
 Nexpose License Feature Updates (r7license)
 Toggling Nexpose Product/Coverage Updates (uadmin)
 Production and Sandbox use different endpoints, which are managed using the following global Script Parameters:

 NX License Server Endpoint - Company preference
 NX License Server Endpoint (Sandbox) - Company preference
 Service requests to the Nexpose License server require authorization using Basic Auth headers.  The authorization strings are provided using the following Script Parameters

 NX Uadmin Authentication - Company Preference
 R7 License Authentication
 R7 License Authentication (Sandbox)
 **﻿Company Preference parameters, while created on the script record, are manged under Setup > Company > General Preferences > Custom Preferences.  The endpoints and Uadmin Basic Auth are used by other Nexpose License Integration scripts:

 Nexpose License Reset - Used to reset the activation of a Nexpose product key
 Nexpose Data Synching  - Pulls Update Insight data from the license server into NetSuite (mainly usage and activation statistics.
 **The NX Uadmin auth is the same for development and production.

 **The R7 License auth differs between development and production but the parameter is local as only this script uses the R7 License functions.

 Main Script Function:

 Before Submit of a Nexpose License Record a web service call is made to the R7 License server using nlapiRequestURL(endpoint, parameters, headers) where:

 Endpoint = The endpoint of the License server referenced in the script parameters
 Parameters = A JSON object containing the field:value pairs of all the pertinent data on the Nexpose License Record
 Headers = Array containing the Authorization header referenced in the script parameters
 *
 */

/**
 * Comments from original deployment @author Derek Abdine:
 *
 * COPYRIGHT (C) 2008-2009, Rapid7 LLC, Boston, MA, USA.
 * All rights reserved. This material contains unpublished, copyrighted
 * work including confidential and proprietary information of Rapid7.
 *
 * This suite script is responsible for processing new and edited
 * NetSuite records and communicating those changes with the licensing
 * server.
 *
 * To accomplish this, there are a number of set fields (used in the
 * code below) called internal IDs.  These internal IDs *MUST NOT
 * CHANGE* in the NeXpose Licensing record type definition or this
 * script will break.
 *
 * Also, there is a bit of magic dealing with the permittance logic.
 * Basically, if a request comes in, fields such as the order type (in
 * NetSuite this is called the license 'Purpose') are validated such
 * that only specific roles can use them.  For example, we use the
 * role ID 1029 (web services customer, such as secureworks) to limit
 * who can use the 'partner' (OEM partner) order type.
 *
 */

/*
 * MB: 10/14/15 - APTCM-129 - NetSuite-Nexpose License Integration Authentication Updates
 * The GES team is updating the authentication mechanism for the Nexpose Licensing Server (uadmin) to adhere to Rapid7's SSO policies.
 * In order to ensure no interruption to Licensing processes in NetSuite all integration scripts need to be updated to support Basic Authentication and hyperlink fields must be updated to the new Uadmin URLs
 * The server endpoint and auth values have been moved to script parameters.
 */
var ctx = nlapiGetContext();
var uadminAuth = '';
var endPoint = '';
var r7licAuth = '';

//If sandbox enviornment use the sandbox specific auth/endpoints to link to the Development Nexpose License Server
//--------------------- BEGIN ENVIRONMENT CHECK ---------------------

if (ctx.getEnvironment() != 'PRODUCTION'){
    endPoint = ctx.getSetting('SCRIPT','custscriptnxendpoint_sandbox');
    r7licAuth = ctx.getSetting('SCRIPT','custscriptr7nx_licauth_sandbox');
    uadminAuth = ctx.getSetting('SCRIPT','custscriptr7nx_uadminauth_sandbox');
}
else{
    endPoint = ctx.getSetting('SCRIPT','custscriptnxendpoint');
    r7licAuth = ctx.getSetting('SCRIPT','custscriptr7nx_licauth');
    uadminAuth =ctx.getSetting('SCRIPT','custscriptr7nx_uadminauth');
}
//--------------------- END ENVIRONMENT CHECK ---------------------
/**
 * This is a generic message we provide to our parnters in the
 * event of an unrecoverable failure during record creation (this
 * script execution).
 */
var defaultFailMsg =
    'Failed to create license.  Please contact Rapid7 Support';

/** The name of the NeXpose licensing record type */
var licRecName = "customrecordr7nexposelicensing";

/**
 * The function called before a submit action on the licensing form.
 *
 * @param type The type of action being performed (must be create).
 *
 * @throws nlobjError If an error occurs.
 */
function beforeSubmitLicenseToLicensingServer(type){
    // Retrieve the record that is going to be created.
    var rec = nlapiGetNewRecord();
    var oldRec = nlapiGetOldRecord() || rec;

    // Get the submitter's role.
    var role = nlapiGetRole();

    // Get the context
    var context = nlapiGetContext();


    //restricted user stuff - MUST BE FIRST
    if (type == 'create' || type == 'edit') {

        nlapiSetFieldValue('custrecordr7nxlicisblacklisted', 'F');

        var contactId = nlapiGetFieldValue('custrecordr7nxlicensecontact');
        var isBlackListed = checkBlacklisted(contactId);
        var isRestricted = checkRestricted(contactId);

        if (isBlackListed || isRestricted){
            nlapiSetFieldValue('custrecordr7nxlicisblacklisted', 'T');
        }

        var strToday = nlapiDateToString(new Date());
        var dtToday = nlapiStringToDate(strToday);

        var strcurrentExpiration = nlapiGetFieldValue('custrecordr7nxlicenseexpirationdate') || strToday;
        var dtCurrentExpiration = nlapiStringToDate(strcurrentExpiration);

        if (isBlackListed) {
            if (dtCurrentExpiration >= dtToday) {
                nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
            }
        }

        if (isRestricted) {
            if (dtCurrentExpiration >= dtToday) {
                nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
            }
            if (type == 'create') {
                throw nlapiCreateError('ERROR', 'Failed to create license.  Please contact Rapid7 Support', true);
            }
        }

    }
    //end restricted user stuff

    var doNotSendToServer = nlapiGetFieldValue('custrecordr7nxlicense_nosendserver');

    if (doNotSendToServer == 'T'){
        nlapiSetFieldValue('custrecordr7nxlicense_nosendserver', 'F');
        return;
        //exit script
    }
    var salesOrder      = nlapiGetFieldValue('custrecordr7nxlicensesalesorder');
    var parentLicense   = nlapiGetFieldValue('custrecordr7nxlicense_parentlicense');
    var pkey            = nlapiGetFieldValue('custrecordr7nxproductkey');
    //46 One-InsightVM
    //52 One-NexposeSub
    var onePriceItemFamilies = ["46", "52"];
    var itemFamily = nlapiGetFieldValue('custrecordcustrecordr7nxlicenseitemfamil')+'';
    var isOnePrice = onePriceItemFamilies.indexOf(itemFamily) > -1;
	var isFulfilAtScale = nlapiGetFieldValue('custrecord_nx_req_fulfil_at_scale') == 'T' ? true : false;
    // Make sure we were fired for a call for non-IVM only or for one-ivm consolesskipOneIVMrenew
    nlapiLogExecution('DEBUG', 'type', type)
    nlapiLogExecution('DEBUG', 'isOnePrice', isOnePrice)
    nlapiLogExecution('DEBUG', 'parentLicense', parentLicense)
    nlapiLogExecution('DEBUG', 'pkey', pkey)
    nlapiLogExecution('DEBUG', 'isFulfilAtScale', isFulfilAtScale)

    if (
        ((type == 'create' || type == 'edit') && isOnePrice == false && isFulfilAtScale == false)
        || ((type == 'create' || type == 'edit') && (isOnePrice == true || isFulfilAtScale == true) && parentLicense)
    ) {
        //For non One item - clear product key
        if (pkey.substring(0, 4) == 'PEND') {
            nlapiLogExecution('DEBUG', 'Clearing Product Key for Non-OnePrice License');
            nlapiSetFieldValue('custrecordr7nxproductkey', '');
        }
        pkey = nlapiGetFieldValue('custrecordr7nxproductkey');


        // Do NOT allow web services customers to edit records.  We want
        // them to create new records every time.
        if (role == 1029 || role == 1033) {


            if (type == 'edit') {
                throw nlapiCreateError('REQUEST_FAILED', 'OEM partner accounts cannot edit records. You must create new records for updates and specify the product key to identify the record to update.', false);
            }

        }

        doRecordNew(oldRec, rec, pkey, role);
    }
    else {

        if (context.getSessionObject('donotsync') == 'T') {
            // do nothing
        }
        else if (((type == 'edit' || type == 'create' || type == 'xedit') && salesOrder && (isOnePrice == true ||isFulfilAtScale == true))) {
            if (oldRec.getFieldValue('custrecordr7_sync_up_with_ipims') == 3 && rec.getFieldValue('custrecordr7_sync_up_with_ipims') == 3 ||
                (!oldRec.getFieldValue('custrecordr7_sync_up_with_ipims') && !rec.getFieldValue('custrecordr7_sync_up_with_ipims'))) {
                nlapiLogExecution('DEBUG', 'something change on the license, need to re-sync');
                rec.setFieldValue('custrecordr7_sync_up_with_ipims', 1);
                var hasParentRecord = rec.getFieldValue('custrecordr7nxlicense_parentlicense');
                if(type == 'edit' && !hasParentRecord) {
                    resetOnePriceFulfillmentStatus(rec.getId(), nlapiGetFieldValue('custrecordr7nxlicensesalesorder'));
                }
            } else {
                nlapiLogExecution('DEBUG', 'license is update, but no need to sync up');
            }
        }
        else if(type != 'xedit') {
            throw nlapiCreateError('FEATURE_UNAVAILABLE', 'Cannot trigger actions on anything other than create or edit', false);
        }
    }

}

function resetOnePriceFulfillmentStatus(licenseId, salesOrderId) {
    var results = nlapiSearchRecord("customrecord_onepricefulfillment",null,
       [
          ["custrecordopfnexposelicrec", "anyof", licenseId], 
          "AND", 
          ["custrecordopfsalesorder", "anyof" , salesOrderId]
       ], 
       [
          new nlobjSearchColumn("internalid")
       ]
    );
 
    if(results && results.length > 0) {
       nlapiSubmitField(results[0].getRecordType(), results[0].getId(), 'custrecordopffulfillmentstatus', 1);
    }
 }

/**
 * Establishes a new record.  The product key in the parameter list
 * is used to key the record.  In this sense, a record is functionally
 * updated on the licensing server.
 *
 * @param rec The new record to be established.
 * @param lc The product key for the record.
 */
function doRecordNew(oldRec, rec, lc, role)
{
    var fv;
    var formParams = new Array();

    // First, set the license model.  This is either node limited
    // (GENLIC) or fixed (GENFIXEDIPLIC).  The two aforementioned
    // constants are actually defined in the license generation
    // server.
    fv = getValidFieldValue(rec, 'custrecordr7nxlicensemodel');
    if (fv == '1') // Node limited.
        formParams['licenseModel'] = 'GENLIC';
    else if (fv == '2') // Fixed IP.
    {
        if (role == 1029 || role == 1033)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Not authorized to create fixed IP licenses',
                true);

        formParams['licenseModel'] = 'GENFIXEDIPLIC';
    }
    else
        throw nlapiCreateError(
            'REQUEST_FAILED',
            'Could not determine license model.',
            false);

    // If the product key is not null, set it, so we can update the
    // record on the licensing server.
    if (lc != null)
        formParams['productKey'] = lc;

    // Determine how the customer and contact name fields are populated
    // in the actual license by the role id.
    if (role == 1029 || role == 1033)
    {
        // R7 Web Services Customer (and their test account).  Their
        // customer ID and contact names are the OEM reference
        // parameter as they do not have access to the customer records
        // list OR the contacts list (those are internal to us).
        var customer = getValidFieldValue(rec,
            'custrecordr7nxoemreference');
        if (customer == null || customer == '')
            customer = getCustomerCompanyName(
                getValidFieldValue(rec,
                    'custrecordr7nxlicensecustomer'));

        formParams['customerID'] = formParams['contactName'] = customer;
    }
    else
    {
        // Regular Rapid7 user role.  Any Rapid7 user creating licenses
        // should have access to both the customer and contact records.
        // If not, NetSuite will throw an error back when it attempts to
        // execute this portion of the code.
        formParams['customerID'] =
            getCustomerCompanyName(
                getValidFieldValue(rec,
                    'custrecordr7nxlicensecustomer'));

        var contact = getCustomerContactName(
            getValidFieldValue(rec,
                'custrecordr7nxlicensecontact'));
        if (contact == null || contact == '')
            contact = formParams['customerID'];

        formParams['contactName'] = contact;
    }

    // TS: 4/28/17 - Addition of the Customer Internal ID in NetSuite
    formParams['NS_Customer_ID'] = rec.getFieldValue('custrecordr7nxlicensecustomer');

    // Get the license purpose (i.e., internal, purchased, test, etc.)
    fv = getValidFieldValue(rec, 'custrecordr7nxordertype');
    var ifv;
    try
    {
        ifv = parseInt(fv);
    }
    catch (e)
    {
        throw nlapiCreateError(
            'REQUEST_FAILED',
            'Could not parse order type',
            true);
    }

    // Depending on the order type we'll chose the corresponding value
    // the licensing server wants...
    switch (ifv)
    {
        case 1: //purchased
        case 2: // evaluation
        case 6: // evaluation - vm
        case 9: // Educational
        case 7: // community edition
        case 3: // R7internal
            // Only Rapid7 can create licenses of these types.
            if (role == 1033 || role == 1029)
                throw nlapiCreateError(
                    'REQUEST_FAILED',
                    'Invalid license purpose for your role.',
                    true);
            switch (ifv)
            {
                case 1:
                case 7: // community
                    formParams['orderType'] = 'paid';
                    break;
                case 2:
                case 6:
                case 9:
                    formParams['orderType'] = 'evaluation';
                    formParams['EVALUATION'] = '1';
                    break;
                case 3:
                    formParams['orderType'] = 'internal';
                    break;
                default:
                    // Should never happen...
                    throw nlapiCreateError(
                        'REQUEST_FAILED',
                        'Fatal error determining license purpose',
                        false);
            }
            break;
        case 4:
            // Web services customers are the only entities that can
            // create partner license types.
            if (role != 1029 && role != 3) // Web services partner account.
                throw nlapiCreateError(
                    'REQUEST_FAILED',
                    'Invalid license purpose for your role.',
                    true);
            formParams['orderType'] = 'partner';
            break;
        case 5:
            // Web services customers are the only entities that can
            // create test license types (for now).
            if (role != 1033 && role != 3) // Web services partner test account.
                throw nlapiCreateError(
                    'REQUEST_FAILED',
                    'Invalid license purpose for your role.',
                    true);
            formParams['orderType'] = 'test';
            break;
        default:
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Could not determine order type',
                true);
    }

    // Set the number of nodes (node limited license only)
    formParams['numberOfNodes'] = calculateTotalIPs(rec);

    // Set the number of nodes for the hosted engine (node limited
    // license only).

    if (rec.getFieldValue('custrecordr7nxlicenseenginepool') == 'T' && (rec.getFieldValue('custrecordr7nxlicensenumberhostedips') == '' || rec.getFieldValue('custrecordr7nxlicensenumberhostedips') == null)) {
        formParams['numberOfHostedNodes'] = '0';
    }
    else {
        formParams['numberOfHostedNodes'] = getValidFieldValue(rec, 'custrecordr7nxlicensenumberhostedips');
    }


    nlapiLogExecution('DEBUG','engine pool',rec.getFieldValue('custrecordr7nxlicenseenginepool'));
    nlapiLogExecution('DEBUG','hosted ips',rec.getFieldValue('custrecordr7nxlicensenumberhostedips'));
    nlapiLogExecution('DEBUG','formParamHostedNodes',formParams['numberOfHostedNodes']);
    nlapiLogExecution('DEBUG','totalIPs',calculateTotalIPs(rec));


    // Set the fixed IP ranges for internal scanning.
    formParams['addresses'] =
        getValidFieldValue(rec,
            'custrecordr7nxinternalfixedips');

    // Set the fixed IP ranges for hosted scanning.
    formParams['hostedAddresses'] =
        getValidFieldValue(rec,
            'custrecordr7nxhostedfixedips');

    // Set the expiration date.  Netsuite gives this to us in
    // MM/DD/YY format, but we need to send it as
    // YYYYMMDD'T'hhmmssSSS
    var dt = getValidFieldValue(rec,
        'custrecordr7nxlicenseexpirationdate');

    if (dt != null)
    {
        try
        {
            formParams['validTo'] = formatISO8601(new Date(dt));
        }
        catch (e)
        {
            nlapiLogExecution(
                'DEBUG',
                'An error occured while attempting to parse a date',
                e);

            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Could not parse date.',
                true);
        }
    }

    // Set the scan engine count.
    formParams['scanEngineCount'] =
        getValidFieldValue(rec,
            'custrecordr7nxnumberengines');

    // Enable the web scan license option.
    fv = rec.getFieldValue('custrecordr7nxwebscan');
    if (fv != null && (fv == 1 || fv == 'T'))
        formParams['WEBSCAN'] = '1';

    // Enable the cloud option
    fv = rec.getFieldValue('custrecordr7nxcloud');
    if (fv != null && (fv == 1 || fv == 'T')){
        //If numberOfHostedNodes!=null && it's !=0 throw error
        if(formParams['numberOfHostedNodes']!=null &&
            formParams['numberOfHostedNodes']!=''){
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'The cloud option is not compatible with non-zero number of Hosted Nodes',
                true);
        }
        formParams['CLOUD'] = '1';
    }

    // Enable the virtualization licensed option.
    fv = rec.getFieldValue('custrecordr7nxlicensevirtualization');
    if (fv != null && (fv == 1 || fv == 'T'))
        formParams['VIRTUALIZATION'] = '1';

    // Enable the config policy scanning licensed option.
    fv = rec.getFieldValue('custrecordr7nxpolicy');
    if (fv != null && (fv == 1 || fv == 'T'))
        formParams['POLICYSCAN'] = '1';

    // Enable the advanced policy scanning licensed option.
    fv = rec.getFieldValue('custrecordr7nxlicenseadvancedpolicyeng');
    if (fv != null && (fv == 1 || fv == 'T'))
        formParams['POLICYENGINEV2'] = '1';

    // Enable the Custom Policies if necessary.
    fv = rec.getFieldValue('custrecordr7nxlicensecustompolicies');
    if (fv != null && (fv == 1 || fv == 'T')) {

        formParams['APECUSTOMPOL'] = '1';
        if (formParams['POLICYENGINEV2'] != '1')
            throw nlapiCreateError('REQUEST_FAILED', 'The Custom Policies option requires the Advanced Policy Engine', true);
    }

    // Enable the CIS if necessary.
    fv = rec.getFieldValue('custrecordr7nxlicensecis');
    if (fv == 'T') {

        formParams['CIS'] = 'on';
        if (formParams['POLICYENGINEV2'] != '1')
            throw nlapiCreateError('REQUEST_FAILED', 'The CIS option requires the Advanced Policy Engine', true);
    }

    // Enable the DISA if necessary.
    fv = rec.getFieldValue('custrecordr7nxdisa');
    if (fv == 'T') {
        formParams['DISASTIGS'] = 'on';
    }

    // Enable the Policy Editor if necessary.
    fv = rec.getFieldValue('custrecordr7nxlicensepolicyeditor');
    if (fv != null && (fv == 1 || fv == 'T')) {

        formParams['EDITOR'] = 'on';
        if (formParams['POLICYENGINEV2'] != '1')
            throw nlapiCreateError('REQUEST_FAILED', 'The Policy Editor option requires the Advanced Policy Engine', true);
    }

    // Enable the FDCC if necessary.
    fv = rec.getFieldValue('custrecordr7nxlicensefdcc');
    if (fv != null && (fv == 1 || fv == 'T')) {

        formParams['FDCC'] = '1';
        if (formParams['POLICYENGINEV2'] != '1')
            throw nlapiCreateError('REQUEST_FAILED', 'The FDCC option requires the Advanced Policy Engine', true);
    }

    // Enable the USGCB if necessary.
    fv = rec.getFieldValue('custrecordr7nxlicenseusgcb');
    if (fv != null && (fv == 1 || fv == 'T')) {

        formParams['USGCB'] = '1';
        if (formParams['POLICYENGINEV2'] != '1')
            throw nlapiCreateError('REQUEST_FAILED', 'The USGCB option requires the Advanced Policy Engine', true);
    }

    // Enable the PCI option if necessary.
    fv = rec.getFieldValue('custrecordr7nxlicensepcitemplate');
    if (fv != null && (fv == 1 || fv == 'T'))
    {
        if (role == 1029 || role == 1033)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Not authorized to use the PCI option',
                true);

        formParams['PCI'] = '1';

        // TS 6/2017 - We no longer want to require WebScanning to have PCI Templates.
        /*
        if (formParams['WEBSCAN'] != '1')
           throw nlapiCreateError(
              'REQUEST_FAILED',
              'The PCI template requires the Web Scanning option',
              true);
        */
    }

    // Enable the Exploits option
    fv = rec.getFieldValue('custrecordr7nxmetasploit');
    if (fv != null && (fv == 1 || fv == 'T'))
    {
        if (role == 1029 || role == 1033)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Not authorized to use the EXPLOITS option',
                true);
        formParams['EXPLOITS'] = '1';
    }

    // Enable the mssp discovery option if necessary.
    fv = rec.getFieldValue('custrecordr7nxlicensediscoverylicense');
    if (fv != null && (fv == 1 || fv == 'T'))
    {
        if (role == 1029 || role == 1033)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Not authorized to use the DISCOVERY option',
                true);

        formParams['Discovery'] = '1';
    }

    // Enable the mssp discovery option if necessary.
    fv = rec.getFieldValue('custrecordr7nxmsspdiscovery');
    if (fv != null && (fv == 1 || fv == 'T'))
    {
        if (role != 1029 && role != 1033 && role != 3)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Not authorized to use the MSSPDISCOVERY option',
                true);

        formParams['MSSPDISCOVERY'] = '1';
    }

    // Enable the scada option if necessary.
    fv = rec.getFieldValue('custrecordr7nxscada');
    if (fv != null && (fv == 1 || fv == 'T'))
    {
        if (role == 1029 || role == 1033)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Not authorized to use the SCADA option',
                true);

        formParams['SCADA'] = '1';
    }

    // Enable the express license option OR the community license.
    fv = rec.getFieldValue('custrecordr7nxexpress');
    var fvc = rec.getFieldValue('custrecordr7nxcommunitylicense');

    if(formParams['CLOUD']==1){
        //IF it's a cloud license it can't be a OEM/Express/Community/Enterprise license as per
        //AV,DA emails 6/16/2010

        //Do nothing for now but this could with it's own
        //set of features down the line

        //Right now cloud cannot be combined w/ OEM as well. We need to to rethink
        //this combination down the line.

    }
    else if (fv != null && (fv == 1 || fv == 'T'))
    {
        if (role == 1029 || role == 1033)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Not authorized to use the EXPRESS option',
                true);

        formParams['EXPRESS'] = '1';
        var nodenum = formParams['numberOfNodes'];
        if (nodenum != undefined && nodenum > 2000)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Express licenses cannot have more than 2000 IPs',
                true);
    }
    else if (fvc != null && (fvc == 1 || fvc == 'T'))
    {
        if (role == 1029 || role == 1033)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Not authorized to use the COMMUNITY option',
                true);

        formParams['COMMUNITY'] = '1';
        var nodenum = formParams['numberOfNodes'];

        // WEBSCAN should not be enabled if the licence type is COMMUNITY.
        if (formParams['WEBSCAN'] == '1')
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Web Scanning is not allowed with the Community license.',
                true);

        if (nodenum != undefined && nodenum > 32)
            throw nlapiCreateError(
                'REQUEST_FAILED',
                'Community licenses cannot have more than 32 IPs',
                true);
    }
    else if (role == 1029 || role == 1033) // OEM customers
    {
        formParams['OEM'] = '1';

        // Also force-add the policyscan/webscan options for them.
        formParams['POLICYSCAN'] = '1';
        formParams['WEBSCAN'] = '1';

        // NOTE:  enterprise isn't explicitly added because it is
        // assumed if EXPRESS does not exist.
        if (formParams['MSSPDISCOVERY'] == 1) {
            var numNodes = formParams['numberOfNodes'];
            rec.setFieldValue('custrecordr7nxlicensetemplicensecount', numNodes);

            var currentDiscoveryIPs = rec.getFieldValue('custrecordr7nxlicensenumberdiscoveryips');
            if (currentDiscoveryIPs == '' || currentDiscoveryIPs == null) {
                rec.setFieldValue('custrecordr7nxlicensenumberdiscoveryips', 65536);
            }

            formParams['numberOfNodes'] = calculateTotalIPs(rec);
        }
    }
    else // (!express && !oem &&!community &&!=cloud) == enterprise
        formParams['ENTERPRISE'] = '1';


    //After June 20th, if one or both of the new options MULTITENANCY or ENGINEPOOL are selected,
    // pass the parameter "isPostAnaconda=on" (to enable post-4.12 aka post-Anaconda licenses) as well as "MULTITENANCY=on" and/or "ENGINEPOOL=on":

    if(rec.getFieldValue('custrecordr7nxlicensemultitenancy')=='T'){
        formParams['MULTITENANCY'] = 'on';
    }

    if(rec.getFieldValue('custrecordr7nxlicenseenginepool')=='T'){
        formParams['ENGINEPOOL'] = 'on';
    }

    if(rec.getFieldValue('custrecordr7nxlicensemultitenancy')=='T' || rec.getFieldValue('custrecordr7nxlicenseenginepool')=='T'){
        formParams['isPostAnaconda']='on';
    }

    //Rich Data Export
    if (rec.getFieldValue('custrecordr7nxlicensecsvrichdataexport') == 'T') {
        formParams['RICHDATAEXPORT'] = '1';
    }

    //Custom Reporting
    if (rec.getFieldValue('custrecordr7nxlicensecustomreporting') == 'T') {
        formParams['CUSTOMREPORTING'] = 'on';
    }

    //Adaptive Security
    if (rec.getFieldValue('custrecordr7nxlicenseadaptivesecurity') == 'T') {
        formParams['ADAPTIVE_SECURITY'] = 'on';
    }

    //Exposure Analytics
    if (rec.getFieldValue('custrecordr7nxlicenseexposureanalytics') == 'T') {
        formParams['EXPOSURE_ANALYTICS'] = 'on';
    }

    /*
     * MB: 5/17/16 - Change #1206 - APTCM-323 Nexpose license enhancements for Remediation Analytics and Agents Beta Programs
     */

    // Remediation Analytics
    if (rec.getFieldValue('custrecordr7nxlicenseremedanalytics') == 'T') {
        formParams['REMEDIATION_ANALYTICS'] = 'on';
        if (rec.getFieldValue('custrecordr7nxlicenseexposureanalytics') != 'T') {
            throw nlapiCreateError('REQUEST_FAILED', 'Remediation Analytics and Agents require Exposure Analytics.', true);
        }
    }

    // Agents
    if (rec.getFieldValue('custrecordr7nxlicenseagents') == 'T') {
        formParams['AGENTS'] = 'on';
        if (rec.getFieldValue('custrecordr7nxlicenseexposureanalytics') != 'T') {
            throw nlapiCreateError('REQUEST_FAILED', 'Remediation Analytics and Agents require Exposure Analytics.', true);
        }
    }

    // END Change #1206

    /*
     * TS: 3/15/17 - Addition of the InsightVM field to Nexpose licensing record type in NetSuite to pass to licensing server
     */

    //InsightVM
    if(rec.getFieldValue('custrecordr7nxlicenseinsightvm') == 'T') {
        formParams['INSIGHT_VM'] = 'on';
    }

    /*
     * TS: 4/24/17 - Addition of the Live License fields to Nexpose licensing record type in NetSuite to pass to licensing server
     */
    if(rec.getFieldValue('custrecordr7nxlicenselivelicense') == 'T') {

        // This boolean confirms that this license has the live licensing feature turned on
        formParams['LIVE_NODE'] = 'on';

        // Receive the Live License Limit
        var livelicenselimit = rec.getFieldValue('custrecordr7nxlicenselivelicenselimit');
        if (livelicenselimit == null || livelicenselimit == '') {
            livelicenselimit = 200; // If null, then set the default to 200
        }
        if (livelicenselimit < 100) {
            livelicenselimit = 100; // If <100, then set the default to 100
        }

        var assetBuffer = parseInt(livelicenselimit - 100);

        //lic server wouldn't accept unless it is a string
        assetBuffer = assetBuffer.toString();

        // This integer represents the excess % of assets that can be scanned within the product before the hard cap is met
        formParams['assetBuffer'] = assetBuffer;

    }

    //MOBILE
    if (rec.getFieldValue('custrecordr7nxlicensing_mobileoption') == 'T') {
        formParams['MOBILE'] = '1';
    }

    //Virtual Scanning
    if (rec.getFieldValue('custrecordr7nxlicensevassetscan') == 'T') {
        formParams['VIRTUALSCANNING'] = '1';
    }

    //Early Access
    if (rec.getFieldValue('custrecordr7nxlicenseearlyaccess') == 'T') {
        formParams['EARLY_ACCESS'] = '1';
    }

    //Advanced Caching
    if (rec.getFieldValue('custrecordr7nxlicenseadvcaching') == 'T') {
        formParams['ADVANCEDCACHE'] = '1';
    }

    //Centrics
    if (rec.getFieldValue('custrecordr7nxlicense_centrics') == 'T') {
        formParams['CENTRICS'] = 'on';

        if (rec.getFieldValue('custrecordr7nxlicensemultitenancy') == 'T') {
            throw nlapiCreateError('REQUEST_FAILED', 'Centrics cannot be used with multi-tenancy.', true);
        }
    }

    //Perpetual
    formParams['PERPETUAL'] = (rec.getFieldValue('custrecordr7nxlicense_isperpetual') == 'T') ? 'on' : 'off';

    var response = null;
    try
    {
        var headers = new Array();

        // Add R7 License Server Specific function
        var r7license_endpoint = endPoint + '/license/generate'
        nlapiLogExecution('DEBUG','End Point',endPoint);

        // Authorize for R7 License Server using script param value
        headers['Authorization'] = r7licAuth;
        response = nlapiRequestURL(
            r7license_endpoint,
            formParams,
            headers);
        var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
        if (nlapiGetUser() == 106223954 && true) {
            var requestErrol = '';
            requestErrol += '\nendpoint = "' + r7license_endpoint + '"\n';
            for (key in formParams) {
                requestErrol += '\n[' + key + '] = ' + formParams[key];
            }

            nlapiSendEmail(106223954, 106223954, 'Lic Request/Response', 'POST REQUEST:\n\n' + requestErrol + '\n\nRESPONSE:\n\n' + response.getBody());

        }
    }
    catch (e)
    {
        // You'll see a lot of this because we need to log this error
        // in NetSuite, but give the user some vague message that
        // just tells them that something is wrong.  This way, we
        // won't divulge any sensitive info (like the server
        // address).
        nlapiLogExecution(
            'EMERGENCY',
            'A request to license has failed',
            e);

        throw nlapiCreateError(
            'REQUEST_FAILED', defaultFailMsg, true);
    }

    // Make sure the license server didn't throw an error back to
    // us.  If it did, yell at the user.
    if (response == null || response.getCode() != 200)
    {
        var msg;
        if (response == null)
            msg = "The response is null";
        else
            msg = response.getBody();

        nlapiLogExecution(
            'DEBUG',
            'The license server is responding with non-200',
            msg);

        throw nlapiCreateError(
            'REQUEST_FAILED', nlapiEscapeXML(msg), false);
    }

    var error = response.getError();
    if (error != null)
    {
        nlapiLogExecution(
            'EMERGENCY',
            'An error occurred while attempting to submit a license',
            error);

        throw nlapiCreateError(
            'REQUEST_FAILED', defaultFailMsg, true);
    }

    // All should be OK, so parse the XML doc the server should have
    // supplied us.
    var doc = null;
    try
    {
        doc = nlapiStringToXML(response.getBody());
    }
    catch (e)
    {
        nlapiLogExecution(
            'EMERGENCY',
            'An error occurred while attempting to parse the response doc',
            e);

        throw nlapiCreateError(
            'REQUEST_FAILED', defaultFailMsg, true);
    }

    // A null doc can't possibly be good...
    if (doc == null)
        throw nlapiCreateError(
            'REQUEST_FAILED',
            'Could not understand license response',
            false);

    // Detect any errors...
    var errorMsg = nlapiSelectValue(doc, '//message');
    if (errorMsg != null)
    {
        nlapiLogExecution(
            'DEBUG',
            'An error occurred while attempting to generate a license',
            nlapiSelectValue(doc, '//stacktrace'));

        throw nlapiCreateError(
            'REQUEST_FAILED',
            errorMsg,
            true);
    }

    // Retrieve the product key, license serial number and product
    // serial number...
    var pkey = nlapiSelectValue(doc, '//productKey');
    var productSN = nlapiSelectValue(doc, '//productSN');
    var licenseID = nlapiSelectValue(doc, '//licenseID');
    var obsLicenseID = nlapiSelectValue(doc, '//obsoletedLicenseID');

    // Verify the product key.
    if (pkey == null || pkey.length < 1)
        throw nlapiCreateError(
            'REQUEST_FAILED',
            'Product key generated is invalid.',
            false);

    // Verify the product serial number.
    if (productSN == null || productSN.length < 1)
        throw nlapiCreateError(
            'REQUEST_FAILED',
            'Product serial number is invalid.',
            false);

    // Verify the license serial number.
    if (licenseID == null || licenseID.length < 1)
        throw nlapiCreateError(
            'REQUEST_FAILED',
            'License serial number is invalid.',
            false);

    // They seem OK, so let's set them on the record...
    rec.setFieldValue('custrecordr7nxlicenseserialnumber',
        licenseID);
    rec.setFieldValue('custrecordr7nxproductserialnumber',
        productSN);
    rec.setFieldValue('custrecordr7nxproductkey', pkey);
    rec.setFieldValue('custrecordr7nxlicensesync', 'F');

    //Product and Content Updates
    var productEnabled = rec.getFieldValue('custrecordr7nxlic_enableproductupdates');
    var contentEnabled = rec.getFieldValue('custrecordr7nxlic_enablecontentupdates');
    setProductContentUpdates(rec.getFieldValue('custrecordr7nxproductkey'), productEnabled, contentEnabled);

}

/**
 * Retrieves a valid filed value whose name is {@code fieldName} from
 * the record {@code record}.
 *
 * @param record The record which contains the value.
 * @param fieldName The name of the field containing the value.
 *
 * @return The value of the field, never {@code null}.
 */
function getValidFieldValue(record, fieldName)
{
    var tmp = record.getFieldValue(fieldName);
    if (tmp == null)
        tmp = "";
    return tmp;
}

/**
 * Retrieves the company name value from a customer record ID.
 *
 * @param recID The customer record ID.
 *
 * @return The value of the field, never {@code null}.
 */
function getCustomerCompanyName(recID)
{
    var rec = nlapiLoadRecord('customer', recID);
    return getValidFieldValue(rec, 'companyname');
}

/**
 * Retrieves the company name value from a customer record ID.
 *
 * @param recID The customer record ID.
 *
 * @return The value of the field, never {@code null}.
 */
function getCustomerContactName(recID)
{
    if (recID == null || recID == '')
        return '';

    var rec = nlapiLoadRecord('contact', recID);
    return getValidFieldValue(rec, 'entityid');
}

/**
 * Formats the provided number to the specified precision.
 *
 * @param n The number to format.
 * @param precision The precision.
 *
 * @return The formatted number string.
 */
function formatNumber(n, precision)
{
    var s = '' + n;
    for (var i = s.length; i < precision; i++)
    {
        s = '0' + s;
    }
    return s;
}

/**
 * Returns an ISO 8601 format date string for a provided date object.
 *
 * @param date The date.
 */
function formatISO8601(dt)
{
    var yr = formatNumber(dt.getUTCFullYear(), 4);
    var mo = formatNumber(dt.getUTCMonth() + 1, 2);
    var dt = formatNumber(dt.getUTCDate(), 2);

    return yr + mo + dt + 'T235959999';
}

/**
 * Returns an ISO 8601 format date string for a provided date object.
 *
 * @param None.
 *
 * @return Total number of IPs.
 */

function calculateTotalIPs(rec){

    var numberIPs = rec.getFieldValue('custrecordr7nxlicensenumberips');
    var numberDiscIPs = rec.getFieldValue('custrecordr7nxlicensenumberdiscoveryips');
    var numberCIEndpoints = rec.getFieldValue('custrecordr7nxlicense_ciendpoints');
    var islivelicense = rec.getFieldValue('custrecordr7nxlicenselivelicense');

    if (numberIPs == '' || numberIPs == null) {
        numberIPs = 0;
    }
    if (numberDiscIPs == '' || numberDiscIPs == null) {
        numberDiscIPs = 0;
    }
    if (numberCIEndpoints == '' || numberCIEndpoints == null) {
        numberCIEndpoints = 0;
    }

    // TS: 4/24/17 - If the license is a live license, the Discovery IPs should not be included in this total IP count
    if (islivelicense == 'T') {
        numberDiscIPs = 0;
    }

    var numberTotalIPs = parseInt(numberIPs) + parseInt(numberDiscIPs) + parseInt(numberCIEndpoints);
    nlapiLogExecution('DEBUG', 'numberTotalIPs', numberTotalIPs);
    nlapiLogExecution('DEBUG', 'numberTotalIPs - string', numberTotalIPs.toString());

    //lic server wouldn't accept unless it is a string
    numberTotalIPs = numberTotalIPs.toString();

    return numberTotalIPs;
}

function setProductContentUpdates(productKey, productEnabled, coverageEnabled){

    /*
     *
     * DIRECTIONS (From Eric Reiners 4/30/15)
     * The following service requests to the Update Administrator will allow Rapid7 to grant or restrict access for coverage or product updates for a given license and console:

     * To grant access to both product and coverage
     * https://produpdates002.osdc.bos.rapid7.com:9669/uadmin/command?op=setLicensedStreams&productKey=FQB9-3Y13-TTSP-238H&streamId=300&streamId=17592186044906&streamId=299067162755565&streamId=17592186044909&streamId=299067162755562&streamId=300

     * To grant access to only product updates for a given console:
     * https://produpdates002.osdc.bos.rapid7.com:9669/uadmin/command?op=setLicensedStreams&productKey=FQB9-3Y13-TTSP-238H&streamId=17592186044906&streamId=299067162755565&streamId=17592186044909&streamId=299067162755562

     * To grant access to only coverage updates for a given console:
     * https://produpdates002.osdc.bos.rapid7.com:9669/uadmin/command?op=setLicensedStreams&productKey=FQB9-3Y13-TTSP-238H&streamId=300

     * To restrict access to all updates for a given console:
     * https://produpdates002.osdc.bos.rapid7.com:9669/uadmin/command?op=setLicensedStreams&productKey=FQB9-3Y13-TTSP-238H
     *
     */
    var endpointForQueries = endPoint + '/uadmin' + '/command?op=setLicensedStreams&productKey=' + productKey;

    if (coverageEnabled == 'T') {
        endpointForQueries += '&streamId=300';
    }

    if (productEnabled == 'T') {
        endpointForQueries += '&streamId=17592186044906&streamId=299067162755565&streamId=17592186044909&streamId=299067162755562';
    }

    var queryResponse = null;
    try
    {
        var authHeaders = [];
        // Authorize for Uadmin using script parameter
        authHeaders['Authorization'] = uadminAuth;
        nlapiLogExecution('DEBUG', 'Auth', uadminAuth);
        queryResponse = nlapiRequestURL(endpointForQueries, null, authHeaders);
    }
    catch (e) {
        // You'll see a lot of this because we need to log this error
        // in NetSuite, but give the user some vague message that
        // just tells them that something is wrong.  This way, we
        // won't divulge any sensitive info (like the server
        // address).
        nlapiLogExecution('EMERGENCY', 'A request to enable/disable updates has failed', e);

        throw nlapiCreateError('REQUEST_FAILED', defaultFailMsg, true);
    }

    // Make sure the license server didn't throw an error back to
    // us.  If it did, yell at the user.
    if (queryResponse == null || queryResponse.getCode() != 200) {
        var msg = (queryResponse == null) ? 'The response is null' : queryResponse.getBody();

        nlapiLogExecution('DEBUG', 'The license server is responding with non-200', msg);

        throw nlapiCreateError('REQUEST_FAILED', nlapiEscapeXML(msg), false);
    }

    var error = queryResponse.getError();
    if (error != null) {
        nlapiLogExecution('EMERGENCY', 'An error occurred while attempting to submit a license', error);

        throw nlapiCreateError('REQUEST_FAILED', defaultFailMsg, true);
    }

    //Get Body of Response
    var body = queryResponse.getBody();
    if (body.indexOf('Licensed streams have been updated.') == -1) {
        nlapiLogExecution('ERROR', 'An error occurred while attempting to update stream', body);
        var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
        nlapiSendEmail(adminUser, adminUser, 'ERROR: updating license streams', productKey + ' could not be updated.\n\n' + body);
        throw nlapiCreateError('REQUEST_FAILED', defaultFailMsg, true);
    }

    return body;
}