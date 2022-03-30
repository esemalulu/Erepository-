/**
 * Company           Explore Consulting
 * Copyright         2015 Explore Consulting, LLC
 * Description
 **/


function onStart(request, response) {
    //EC.enableLazySearch();
    //processXFormationFulfillmentTest();s
    //findCustomerByCustomTagTest();
    //findLicenseOrderByActivationKeyTest();
    //getLicenseOrderTemplateTest();
    //var authToken = EC.getAuthToken(EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.AuthTokenAPIPath);
    //Log.d('EC.callLicenseAPI', authToken);
    //searchContactsTest();
    //processResponseTest();
    //getLicenseTest();
    //EC.getPendingLicenses();
    //submitLicenseRequestTest();
    //updateIFRecord();
    EC.associateContractItemsWithLicenses(['427503']);
}

function updateIFRecord() {
    var ifRecord = nsdal.loadObject('itemfulfillment', 359180, ['tranid','orderid','custbody_ec_test_lac_response','custbody_licenseintegrationstatus','custbody_licenseintegrationmessage','custbody_licenseintegrationid'])
        .withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date','quantity','custcol_licenseintegrationstatus','custcol_licenseintegrationmessage','custcol_xformationitem','custcol_item_category','custcol1']);

    ifRecord.item[0].custcol_item_category = EC.LicenseSettings.ItemCategory.MaintenanceRenewal;
    ifRecord.save();

}

function submitLicenseRequestTest()
{
    var ifRecord = nsdal.loadObject('itemfulfillment', 359180, ['tranid','orderid','custbody_ec_test_lac_response','custbody_licenseintegrationstatus','custbody_licenseintegrationmessage','custbody_licenseintegrationid'])
        .withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date','quantity','custcol_licenseintegrationstatus','custcol_licenseintegrationmessage','custcol_xformationitem','custcol_item_category','custcol1']);
    ifRecord.item[0].custcol_item_category = EC.LicenseSettings.ItemCategory.LicensePerpetual;
    ifRecord.item[0].custcol_swe_contract_end_date = moment('5/31/2017');

    var soRecord = nsdal.loadObject('salesorder', ifRecord.orderid, ['tranid','custbody_order_type','entity','trandate','custbody_end_user'])
        .withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date']);
    var customerRecord = nsdal.loadObject('customer', soRecord.entity, ['entityid','isperson','companyname','firstname','middlename','lastname','phone'])
        .withSublist('addressbook', ['defaultbilling','defaultshipping','addr1','addr2','city','state','zip','country']);



//    EC.submitLicenseRequest = function(url, authToken, ifRecord, customerRecord, soRecord)
    //var authToken = EC.getAuthToken(EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.AuthTokenAPIPath);
    //var url = EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.LicenseAPIPath;
    logContext = 'SO: ' + soRecord.tranid + ', IF: ' + ifRecord.tranid + ': ';
    Log.d('submitLicenseRequestTest: ifRecord', ifRecord);

    var response = EC.submitLicenseRequest('url', 'authToken', ifRecord, customerRecord, soRecord);
}

function getLicenseTest()
{
    var authToken = EC.getAuthToken(EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.AuthTokenAPIPath);
    Log.d('getLicenseTest', 'authToken: ' + authToken);
    var response = EC.getLicense('B7itjPH0dIBeK6nA', authToken);
    Log.d('getLicenseTest', 'response body: ' + response.getBody());

}
function processResponseTest()
{
    var ifRecord = nsdal.loadObject('itemfulfillment', '359103',['orderid','custbody_ec_test_lac_response'])
        .withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date','quantity']);
    var soRecord = nsdal.loadObject('salesorder', ifRecord.orderid, ['custbody_order_type','entity','trandate','custbody_end_user'])
        .withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date']);

    EC.createLicenses(JSON.parse(ifRecord.custbody_ec_test_lac_response), ifRecord, soRecord)

}
function searchContactsTest()
{
    EC.enableLazySearch();
    var results = EC.searchCustomerContacts('17671');
    if(results) Log.d('test', results.length);
    Log.d('EC.searchCustomerContacts', 'results: ' + JSON.stringify(results));

     var filters = [];
     filters.push(new nlobjSearchFilter('company', null, 'anyof', 'dhfjhdjhf'));
     filters.push(new nlobjSearchFilter('company', null, 'noneof', '@NONE@'));
     var results = nlapiSearchRecord('contact', null, filters, null);
}

function processXFormationFulfillmentTest()
{
    var ifRecord = nsdal.loadObject('itemfulfillment', '351370', ['orderid','custbody_tricerat_skipfulfill','tranid'])
        .withSublist('item', []);
    var soRecord = nsdal.loadObject('salesorder', ifRecord.orderid, ['custbody_tricerat_skipfulfill']);

    EC.processXFormationFulfillment(ifRecord, soRecord);
}

function findCustomerByCustomTagTest()
{
    var logContext = 'findCustomerByCustomTagTest';

    var getCustomerResponse = EC.XFormation.findCustomerByCustomTag('netsuite_id', '123', 0);
    var code = getCustomerResponse.getCode();
    var body = getCustomerResponse.getBody();
    Log.d(logContext, 'code: ' + code + ', body: ' + body);

    var resultArray = EC.XFormation.getResponseNode(body, 'result_array');
    if(resultArray)
    {
        var hasChildNodes = resultArray.hasChildNodes();
        Log.d(logContext, 'hasChildNodes: ' + hasChildNodes);
        var xFormationCustomerID = EC.XFormation.getResponseNodeValue(body, 'result_array/item[1]/id');
        Log.d(logContext, 'xFormationCustomerID: ' + xFormationCustomerID);
        if(hasChildNodes)
        {
        }
    }
    else
    {
        Log.d(logContext, 'result_array node not found');
    }
}

function findLicenseOrderByActivationKeyTest()
{
    var logContext = 'findLicenseOrderByActivationKeyTest';

    var findLicenseOrderResponse = EC.XFormation.findLicenseOrderByActivationKey('NS39A-MXAKP-IXYW7-NSF02', 0);
    var code = findLicenseOrderResponse.getCode();
    var body = findLicenseOrderResponse.getBody();
    Log.d(logContext, 'code: ' + code + ', body: ' + body);
}

function getLicenseOrderTemplateTest()
{
    var logContext = 'getLicenseOrderTemplateTest';

    var response = EC.XFormation.getLicenseOrderTemplate(1901)
    var code = response.getCode();
    var body = response.getBody();
    Log.d(logContext, 'code: ' + code + ', body: ' + body);

    var bodyJSON = EC.xmlToJson(EC.XFormation.getLicenseOrderTemplateResponse, body);
    Log.d('login', 'bodyJSON: ' + JSON.stringify(bodyJSON));
}
