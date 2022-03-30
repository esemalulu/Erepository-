/**
 * Created by scurry on 4/1/2016.
 */
function onStart()
{
    EC.getPendingLicenses();
}

EC.getPendingLicenses = function()
{
    // Search Item Fulfillments where custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Pending
    // For each IF, retrieve the License Integration ID from the custbody_licenseintegrationid field and call EC.getLicense
    // With the responseBody, Call EC.createLicenses(responseBody, ifRecord, soRecord);
    Log.d('EC.getPendingLicenses', 'test');
    EC.enableLazySearch();

    var results = EC.createSearch('itemfulfillment'
        ,[
            ['custbody_licenseintegrationstatus', 'anyof', EC.LicenseSettings.LicenseIntegrationStatus.Pending]
            , 'and', ['mainline', 'IS', 'T']
        ]
        ,[['internalid']]
    ).nsSearchResult2obj().toArray();

    _.forEach(results, function(i)
    {
        var ifRecord = nsdal.loadObject('itemfulfillment', i.internalid, ['tranid','orderid','custbody_ec_test_lac_response','custbody_licenseintegrationstatus','custbody_licenseintegrationmessage','custbody_licenseintegrationid'])
            .withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date','quantity','custcol_licenseintegrationstatus','custcol_licenseintegrationmessage']);
        var soRecord = nsdal.loadObject('salesorder', ifRecord.orderid, ['tranid','custbody_order_type','entity','trandate','custbody_end_user'])
            .withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date']);

        logContext = 'SO: ' + soRecord.tranid + ', IF: ' + ifRecord.tranid + ': ';
        var authToken = EC.getAuthToken(EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.AuthTokenAPIPath);
        Log.d('EC.getPendingLicenses', 'authToken: ' + authToken);
        var response = EC.getLicense(ifRecord.custbody_licenseintegrationid, authToken);
        var responseCode = response.getCode();
        var responseBodyString = response.getBody();
        Log.d('EC.getPendingLicenses', logContext + 'Response Code: ' + responseCode);
        Log.d('EC.getPendingLicenses', logContext + 'Response Body: ' + responseBodyString);

        if(responseCode != '200')
        {
            ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Error;
            ifRecord.custbody_licenseintegrationmessage = 'Licensing API Response Code: ' + responseCode + ', Response Body: ' + responseBodyString;
        }
        else
        {
            ifRecord.custbody_ec_test_lac_response =  responseBodyString;
            var responseBody = JSON.parse(responseBodyString);

            if(responseBody.status == 'processed')
            {
                EC.createLicenses(responseBody, ifRecord, soRecord);
                ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Success;
                ifRecord.custbody_licenseintegrationmessage = '';
            }
            else if(responseBody.status == 'pending' || responseBody.status == 'processing')
            {
                // Flag fulfillment to be processed again by scheduled script
                ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Pending;
                ifRecord.custbody_licenseintegrationmessage = '';
            }
            else
            {
                ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Error;
                ifRecord.custbody_licenseintegrationmessage = 'The response status was: ' + responseBody.status;
            }
        }

        ifRecord.save();
    });
};
