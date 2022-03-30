/**
 * Created by scurry on 4/3/2016.
 */
EC.LicenseSettings =
{
    OrderType: {
        ContractNew: 1
        , ContractRenewal: 2
        , ContractUpsell: 3
        , ContractDownsell: 13
    },
    APIBaseURL:'http://216.50.172.18',
    AuthTokenAPIPath:'/oauth/token',
    LicenseAPIPath:'/licensing/orders',
    AuthTokenAPIClientID:'jgfVlgzKGm3cNxEZ',
    AuthTokenAPIClientSecret:'cc5c09ee702bbb520e5ebe28e43278814a88ee9e',
    LicenseIntegrationStatus: {
        Pending: 1,
        Success: 2,
        Error: 3
    },
    ItemCategory:{
        LicensePerpetual: 1,
        LicenseTerm: 2,
        MaintenanceRenewal: 4
    },
    LicenseRecordFields:[
        'custrecord_prodid','custrecord_serialnumber','custrecord_licenseissuedate','custrecord_licenseenddate'
        ,'custrecord_versionentitlementdate','custrecord_machineid','custrecord_activationcode','custrecord_licenseactivateddate','custrecord_license_activationcount'
        ,'custrecord_license_itemref','custrecord7','custrecord_ordref','custrecord_license_end_user','custrecord_licensereseller','custrecord_licensedistributor'
        ,'custrecord_fulfillmentid','custrecord_notefield'
    ] // Sandbox
    // LicenseRecordFields:[
    //     'custrecord_prodid','custrecord_serialnumber','custrecord_licenseissuedate','custrecord_lic_end_date'
    //     ,'custrecord_version_entitle_date','custrecord_machineid','custrecord_activationcode','custrecord_licenseactivateddate','custrecord_license_activationcount'
    //     ,'custrecord_license_itemref','custrecord_lic_quantity','custrecord_ordref','custrecord_license_end_user','custrecord_licensereseller','custrecord_licensedistributor'
    //     ,'custrecord_fulfillmentid','custrecord_notefield'
    // ] // Production

};
var logContext;

EC.createOrUpdateLicenses = function(licenseResponse, ifRecord, soRecord)
{
    _.forEach(licenseResponse.items, function(i)
    {
        // Find the corresponding line item on the ifRecord by Product Code
        var productCode = i.productCode;
        var logContextItem = logContext + 'productCode: ' + productCode + ': ';
        Log.d('EC.createOrUpdateLicenses', logContextItem);
        var ifLineItem = _.find(ifRecord.item, {'custcol_prodcode':productCode});
        var soLineItem = _.find(soRecord.item, {'custcol_prodcode':productCode});
        Log.d('EC.createOrUpdateLicenses', logContextItem + 'Found IF Line Item: ' + JSON.stringify(ifLineItem));
        Log.d('EC.createOrUpdateLicenses', logContextItem + 'Found SO Line Item: ' + JSON.stringify(soLineItem));


        var licenseRecord;
        if(ifLineItem.custcol1)
        {
            // There is a License associated to this line item.  Update it.
            Log.d('EC.createOrUpdateLicenses', logContextItem + 'There is an associated license: ' + ifLineItem.custcol1);
            var licenseRecord = nsdal.loadObject('customrecord_licenses', ifLineItem.custcol1, EC.LicenseSettings.LicenseRecordFields);
            Log.d('EC.createOrUpdateLicenses', logContextItem + 'After loading license record');

            if(soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractRenewal)
            {
                // if ContractRenewal, just update License End Date and Version Entitlement Date
                licenseRecord.custrecord_licenseenddate = soLineItem.custcol_swe_contract_end_date;
                licenseRecord.custrecord_versionentitlementdate = licenseRecord.custrecord_licenseenddate;
            }
            else if(soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractUpsell)
            {
                // if ContractUpsell, just update the quantity
                var newQuantity = parseInt(ifLineItem.quantity,10) + parseInt(licenseRecord.custrecord7);
                licenseRecord.custrecord7 = newQuantity;
            }

        }
        else
        {
            // There is no License associated to this line item.  Create it.
            Log.d('EC.createOrUpdateLicenses', logContextItem + 'There is not an associated license');
            licenseRecord = nsdal.createObject('customrecord_licenses', EC.LicenseSettings.LicenseRecordFields);
            licenseRecord.custrecord_prodid = ifLineItem.custcol_prodcode;
            licenseRecord.custrecord_serialnumber = i.serialNumbers.toString();

            licenseRecord.custrecord_licenseissuedate = soRecord.trandate;
            licenseRecord.custrecord_licenseenddate = soLineItem.custcol_swe_contract_end_date;
            licenseRecord.custrecord_versionentitlementdate = licenseRecord.custrecord_licenseenddate;
            licenseRecord.custrecord_fulfillmentid = ifRecord.getId();
            licenseRecord.custrecord_activationcode = i.serialNumbers.toString();
            licenseRecord.custrecord_license_itemref = ifLineItem.item;
            licenseRecord.custrecord7 = ifLineItem.quantity;
            licenseRecord.custrecord_ordref = soRecord.getId();
            licenseRecord.custrecord_license_end_user = soRecord.custbody_end_user;

            if(soRecord.entity != soRecord.custbody_end_user)
            {
                licenseRecord.custrecord_licensereseller = soRecord.entity;
            }
        }

        Log.d('EC.createOrUpdateLicenses', logContextItem + 'Before saving licenseRecord: ' + JSON.stringify(licenseRecord));
        var licenseInternalID = licenseRecord.save();
        Log.d('EC.createOrUpdateLicenses', logContextItem + 'After saving licenseRecord: ' + licenseInternalID);
        ifLineItem.custcol1 = licenseInternalID;

        ifLineItem.custcol_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Success;
        ifLineItem.custcol_licenseintegrationmessage = '';
    });
};

EC.searchCustomerContacts = function(customerInternalID)
{
    var retVal = null;

    retVal = EC.createSearch('contact'
        ,[
            ['company', 'anyof', customerInternalID]
        ]
        ,[['entityid'],['email']]
    ).nsSearchResult2obj().toArray().map(function (r){return {name:r.entityid, email:r.email}});

    return retVal;
};

EC.buildLicenseRequestBody = function(url, authToken, ifRecord, customerRecord, soRecord)
{
    var retVal = {};
    retVal.status = EC.LicenseSettings.LicenseIntegrationStatus.Success;
    retVal.message = '';
    retVal.body = {};

    var customer = {};
    var items = [];

    var billingAddress = _.find(customerRecord.addressbook, 'defaultbilling');

    customer.name = customerRecord.entityid;
    customer.phone = customerRecord.phone;
    customer.street = billingAddress.addr1;
    customer.city = billingAddress.city;
    customer.state = billingAddress.state;
    customer.postalCode = billingAddress.zip;
    customer.country = billingAddress.country;
    customer.netsuiteId = customerRecord.getId();
    customer.contacts = EC.searchCustomerContacts(customerRecord.getId());
    retVal.body.customer = customer;

    _.forEach(ifRecord.item, function (ifItem)
    {
        // find the associated line item on soRecord.  Some of the custom fields to the Sales Order record type are not deployed to the Item Fulfillment record type
        //var legacyItem = !ifItem.custcol_xformationitem;
        var soItem = _.find(soRecord.item, {item:ifItem.item});
        if(!soItem)
        {
            retVal.status = EC.LicenseSettings.LicenseIntegrationStatus.Error;
            retVal.message = 'Item Fulfillment line item not found on Sales Order';
            return false; // break out of forEach
        }

        Log.d('EC.buildLicenseRequestBody', logContext + 'soItem.custcol_item_category: ' + soItem.custcol_item_category);
        var itemJSON = EC.getAPIItemJSON(soRecord.custbody_order_type, ifItem, soItem);
        if(itemJSON)
        {
            if(itemJSON.status == EC.LicenseSettings.LicenseIntegrationStatus.Error)
            {
                retVal.status = itemJSON.status;
                retVal.message = itemJSON.message;
                return false; // break out of forEach
            }
            items.push(itemJSON);
        }
    });
    retVal.body.items = items;

    return retVal;    
};

EC.getAPIItemJSON = function (orderType, ifLineItem, soLineItem) {
    var retVal = null;
    var legacyItem = !ifLineItem.custcol_xformationitem;

    if(orderType == EC.LicenseSettings.OrderType.ContractNew)
    {
        if(soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicensePerpetual || soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicenseTerm)
        {
            retVal = {productCode:ifLineItem.custcol_prodcode, quantity:parseInt(ifLineItem.quantity,10)}
        }
    }
    else if(orderType == EC.LicenseSettings.OrderType.ContractUpsell)
    {
        if(legacyItem)
        {
            if(soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicensePerpetual || soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicenseTerm)
            {
                // Behave like ContractNew
                retVal = {productCode:ifLineItem.custcol_prodcode, quantity:parseInt(ifLineItem.quantity,10)}
            }
        }
        else
        {
            if(soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicensePerpetual || soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicenseTerm || soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.MaintenanceRenewal)
            {
                if(ifLineItem.custcol1) // Associated License field is populated
                {
                    // If Associated License is populated, behave like regular upsell
                    var licenseRecord = nsdal.loadObject('customrecord_licenses', ifLineItem.custcol1, ['custrecord_serialnumber','custrecord7']);
                    Log.d('EC.getAPIItemJSON: ' + logContext, licenseRecord);
                    var newQuantity = parseInt(ifLineItem.quantity,10) + parseInt(licenseRecord.custrecord7);
                    Log.d('EC.getAPIItemJSON: ' + logContext, 'ifLineItem.quantity: ' + parseInt(ifLineItem.quantity,10) + ', newQuantity: ' + newQuantity);
                    retVal = {
                        productCode:ifLineItem.custcol_prodcode
                        , quantity:newQuantity
                        , serialNumbers:licenseRecord.custrecord_serialnumber
                    };

                }
                else
                {
                    // else, behave like ContractNew
                    retVal = {productCode:ifLineItem.custcol_prodcode, quantity:parseInt(ifLineItem.quantity,10)}
                }
            }
        }
    }
    else if(orderType == EC.LicenseSettings.OrderType.ContractRenewal)
    {
        if(legacyItem)
        {
            // Do not include item in API call
        }
        else
        {
            if(soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicensePerpetual || soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicenseTerm || soLineItem.custcol_item_category == EC.LicenseSettings.ItemCategory.MaintenanceRenewal)
            {
                if(ifLineItem.custcol1) // Associated License field is populated
                {
                    var licenseRecord = nsdal.loadObject('customrecord_licenses', ifLineItem.custcol1, ['custrecord_serialnumber','custrecord7']);
                    retVal = {
                        productCode:ifLineItem.custcol_prodcode
                        , quantity:parseInt(ifLineItem.quantity,10)
                        , serialNumbers:licenseRecord.custrecord_serialnumber
                        , expirationDate:soLineItem.custcol_swe_contract_end_date.toDate()
                    };
                }
                else
                {
                    // Error Situation.
                    retVal = {status:EC.LicenseSettings.LicenseIntegrationStatus.Error, message:'An X-Formation item on a Contract Renewal order must have an Associated License'};
                }
            }
        }
    }

    return retVal;
};


EC.submitLicenseRequest = function(url, authToken, body)
{
    var retVal = null;

    var headers = {'Content-Type':'application/json', 'Authorization':'Bearer ' + authToken};

    Log.d('EC.submitLicenseRequest', logContext + 'url: ' + url);
    Log.d('EC.submitLicenseRequest', logContext + 'headers: ' + JSON.stringify(headers));
    Log.d('EC.submitLicenseRequest', logContext + 'body: ' + JSON.stringify(body));

    retVal = nlapiRequestURL(url, JSON.stringify(body), headers);

    return retVal;
};

EC.getLicense = function (id, authToken)
{
    var retVal = null;
    var headers = {'Content-Type':'application/json', 'Authorization':'Bearer ' + authToken};

    retVal = nlapiRequestURL(EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.LicenseAPIPath + '/' + id, null, headers);

    return retVal;
};


EC.getAuthToken = function(url)
{
    var retVal = null;

    var headers = {'Content-Type':'application/x-www-form-urlencoded'};

    var body = {};
    body.grant_type = 'client_credentials';
    body.client_id = EC.LicenseSettings.AuthTokenAPIClientID;
    body.client_secret = EC.LicenseSettings.AuthTokenAPIClientSecret;

    var authTokenResponse = nlapiRequestURL(url, body, headers);
    var authTokenResponseBodyString = authTokenResponse.getBody();
    Log.d('EC.getAuthToken', 'authTokenResponseBodyString: ' + authTokenResponseBodyString);
    var authTokenResponseBody = JSON.parse(authTokenResponse.getBody());

    if (authTokenResponseBody)
    {
        retVal = authTokenResponseBody.access_token;
    }

    return retVal;
};

/**
 * Associates a Sales Order record to License records by populating the Associated License line item custom field
 * @param soRecord: A Sales Order nsdal object
 * @param contractItems: An array of JSON objects that look like: [internalid,custrecord_ci_renew_with,custrecord_afa_license2renew},
 *                       which represent Contract Item custom records
 * @returns {boolean}: If the Associated License field was populated on any of the line items, will return true, indicating that the Sales Order needs to be saved.
 */
EC.associateSalesOrderToLicenses = function(soRecord, contractItems)
{
    var needToSaveSalesOrder = false;

    _.forEach(soRecord.item, function (i)
    {
        var legacyItem = !i.custcol_xformationitem;
        var performAssociatedLicenseLookup = false;
        Log.d('EC.associateSalesOrderToLicenses', 'legacyItem: ' + legacyItem);


        if(!legacyItem)
        {
            Log.d('EC.associateSalesOrderToLicenses', 'custcol_item_category: ' + i.custcol_item_category);
            if(i.custcol_item_category == EC.LicenseSettings.ItemCategory.LicenseTerm || i.custcol_item_category == EC.LicenseSettings.ItemCategory.LicensePerpetual || i.custcol_item_category == EC.LicenseSettings.ItemCategory.MaintenanceRenewal)
            {
                performAssociatedLicenseLookup = true;
            }
            // if(soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractRenewal && i.custcol_item_category == EC.LicenseSettings.ItemCategory.LicenseTerm)
            // {
            //     performAssociatedLicenseLookup = true;
            // }
            // else if(soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractUpsell && (i.custcol_item_category == EC.LicenseSettings.ItemCategory.LicenseTerm || i.custcol_item_category == EC.LicenseSettings.ItemCategory.LicensePerpetual))
            // {
            //     performAssociatedLicenseLookup = true;
            // }
        }

        if(performAssociatedLicenseLookup)
        {
            Log.d('EC.associateSalesOrderToLicenses', 'Performing associated license lookup');

            var contractItem = _.find(contractItems, {custrecord_ci_renew_with: i.item});
            Log.d('EC.associateSalesOrderToLicenses: contractItem', contractItem);
            if(contractItem)
            {
                Log.d('EC.associateSalesOrderToLicenses', 'contractItem.custrecord_afa_license2renew: ' + contractItem.custrecord_afa_license2renew);
                if(contractItem.custrecord_afa_license2renew)
                {
                    i.custcol1 = contractItem.custrecord_afa_license2renew;
                    needToSaveSalesOrder = true;
                }
            }
        }
    });

    return needToSaveSalesOrder;
};

EC.associateContractItemsWithLicenses = function (contractItemInternalIDs)
{
    var maxNumberToProcess = 10;
    Log.d('EC.associateContractItemsWithLicenses', 'start');
    
    EC.enableLazySearch();

    if(!contractItemInternalIDs)
    {
        // 10 units
        var contractItemInternalIDs = EC.loadSearch('customrecord_contract_item', 'customsearch_contract_items_need_license')
            .nsSearchResult2obj()
            .take(maxNumberToProcess)
            .map('internalid')
            .toArray();
    }
    Log.d('EC.associateContractItemsWithLicenses.  contractItemInternalIDs:', contractItemInternalIDs);

    var counter = 0;
    _.forEach(contractItemInternalIDs, function (contractItemInternalID)
    {
        counter++;
        // Load the Contract Item record

        // 2 units
        var contractItemRecord = nsdal.loadObject('customrecord_contract_item', contractItemInternalID, ['custrecord_ci_item','custrecord_ci_original_transaction','custrecord_ci_original_so_lineno','custrecord_afa_license2renew']);
        Log.d('EC.associateContractItemsWithLicenses.  contractItemRecord:', contractItemRecord);

        // Search for the licenses related to the Contract Item Original Transaction and where Item Reference equals the Contract Item item
        // 10 units
        var license = EC.createSearch('customrecord_licenses',
            [
                ['custrecord_ordref', 'anyof', contractItemRecord.custrecord_ci_original_transaction]
                , 'and', ['custrecord_license_itemref', 'anyof', contractItemRecord.custrecord_ci_item]
            ],
            [['internalid']]
        ).nsSearchResult2obj().first();
        Log.d('EC.associateContractItemsWithLicenses.  license:', license);

        if(license)
        {
            Log.d('EC.associateContractItemsWithLicenses', 'Before Save');
            contractItemRecord.custrecord_afa_license2renew = license.internalid;
            // 4 units
            contractItemRecord.save();
            Log.d('EC.associateContractItemsWithLicenses', 'After Save');
        }
        else
        {
            Log.d('EC.associateContractItemsWithLicenses', 'License not found');
        }
    });

    if(counter == maxNumberToProcess)
    {
        // Reschedule script
    }



    
};