/**
 * Company           Explore Consulting
 * Copyright         2016 Explore Consulting, LLC
 * Description       EC_UserEvent_CashSale
 **/

EC.onBeforeLoad = function (type, form, request) {

};

EC.onBeforeSubmit = function (type) {

};

EC.onAfterSubmit = function (type)
{
    Log.d('onAfterSubmit', 'type: ' + type);
    EC.getAssociatedLicenses(type);
};

EC.getAssociatedLicenses = function (type)
{
    EC.enableLazySearch();
    var soRecordInternalID = nlapiGetRecordId();
    if(type == 'create' || soRecordInternalID == '359284')
    {
//        var soRecordInternalID = nlapiGetRecordId();
        var soRecord = nsdal.loadObject(nlapiGetRecordType(), soRecordInternalID, ['tranid','custbody_order_type','createdfrom','custbody_contract_name'])
            .withSublist('item', ['item','custcol1','custcol_item_category','custcol_xformationitem']); // custcol1 is Associated License

        if(soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractRenewal || soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractUpsell)
        {
            // For Renewal Order
            //   For line items with Item Category License - Term, retrieve the Associated License and populate the Associated License custom line item field.
            //   createdfrom should be a quote.  Get the From Contract (custbody_swe_from_contract) on that quote.  Contract is a custom record type (customrecord_contracts)
            // For Upsells
            //   For line items with Item Category License - Term or License - Perpetual, retrieve the Associated License and populate the Associated License custom line item field.
            //   Get the Contract (custbody_contract_name) associated to the order.  Contract is a custom record type (customrecord_contracts)
            //
            // The Contract is associated to 1 or more Contract Item records.  Contract Item is a custom record type (customrecord_contract_item)
            // Find the Contract Item in which the Renew With field (custrecord_ci_renew_with) is the same item that is on the SO and Quote.
            // Get the Associated License (custrecord_afa_license2renew) and populate the Associated License field on the Sales Order Line Item (custcol1)

            var needToSaveSalesOrder = false;
            var contractInternalID;
            if(soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractRenewal)
            {
                var quoteRecord = nsdal.loadObject('estimate', soRecord.createdfrom, ['custbody_swe_from_contract']);
                contractInternalID = quoteRecord.custbody_swe_from_contract;
                Log.d('EC.getAssociatedLicenses', 'contractInternalID retrieved from quote: ' + contractInternalID);
                //soItem.custcol_item_category == EC.LicenseSettings.ItemCategory.LicensePerpetual
            }
            else if(soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractUpsell)
            {
                contractInternalID = soRecord.custbody_contract_name;
                Log.d('EC.getAssociatedLicenses', 'contractInternalID retrieved from soRecord.custbody_contract_name: ' + contractInternalID);
            }
            var contractItems = EC.createSearch('customrecord_contract_item',
                [
                    ['custrecord_ci_contract_id', 'anyof', contractInternalID]
                ],
                [['internalid'],['custrecord_ci_renew_with'],['custrecord_afa_license2renew']]
            ).nsSearchResult2obj().toArray();
            Log.d('EC.getAssociatedLicenses: contractItems', contractItems);

            if(EC.associateSalesOrderToLicenses(soRecord, contractItems))
            {
                Log.d('EC.getAssociatedLicenses', 'Before saving order');
                soRecord.save();
            }
        }
    }
};


