/**
 * Plugin Implementation for Dealer After
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 85 2018     Jeffrey Bajit
 *
 */

var HAUL_AND_TOW_CHARGE_COLUMN_INDEX = 3;
var LOWBOY_CHARGE_COLUMN_INDEX = 4;

//var percentage = 0;

/**
 * Default implement of the Dealer After Submit plug-in.  This plug-in is set dealer children association, also, set item pricing and create dealer warranty  
 * @param type
 */
function DealerAfterSubmitImplement(type){
    // only run this from the context of the user interface
    if (nlapiGetContext().getExecutionContext() == 'userinterface'){
        if(type != 'delete'){
            //If dealer is saved, we need to set its association with the 
            //parent(i.e, set hidden custom field 'Dealer Children' multiselect)
            SetDealerChildrenAssociation(); 
            
            GD_SetDealerItemPricing(nlapiGetRecordId(), true, 1);
            
            var isDealerTypeCredit = nlapiGetFieldValue('custentityrvsdealertype') == DEALERTYPE_CREDIT ? 'T' : 'F';
            nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custentityrvscreditdealer', isDealerTypeCredit);
            
            CreateWarrantyDealer();
        } else{
            //If Dealer is deleted, we need to make sure to remove its association with the parent
            RemoveDealerChildrenAssociation();
        }
    }
    // This will run for all context.
    if (type == 'create' || type == 'edit'){
        var usagePointz = nlapiGetContext().getRemainingUsage();
        // load dealer record.
        var dealerRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
        var contactsCount = dealerRecord.getLineItemCount('contactroles');
        var dealerListArray = [];
        var textDealerList = '';
        var contactRecord = null;
        var index = -1;
        var dealerId = dealerRecord.getId();
        
        var contactsHasLoginAccessArray = new Array();
        var contactsNoLoginAccessArray = new Array();
        // get a list of contacts separated whether the contact has access to the portal or not.
        for (var i = 1; i <= contactsCount; i++){
            if (dealerRecord.getLineItemValue('contactroles', 'giveaccess', i) == 'T'){
                contactsHasLoginAccessArray.push(dealerRecord.getLineItemValue('contactroles', 'contact', i));
            } else{
                contactsNoLoginAccessArray.push(dealerRecord.getLineItemValue('contactroles', 'contact', i));
            }
        }

        var contactsHasLoginAccessNotSetOnContactResults = [];
        var contactsNoLoginAccessSetOnContactResults = [];
        // find contacts that has access to the portal with the current dealer and check if the dealer is on the contact field 'custentitygd_portalaccessdealer'.
        var filters = new Array();
        var columns = new Array();
        if (contactsHasLoginAccessArray.length > 0){
            filters[filters.length] = new nlobjSearchFilter('internalid', null, 'anyof', contactsHasLoginAccessArray);
            filters[filters.length] = new nlobjSearchFilter('custentitygd_portalaccessdealer', null, 'noneof', dealerId);
            
            columns[columns.length] = new nlobjSearchColumn('custentitygd_portalaccessdealer');
            //if the current dealer is not yet set on the contact the contact will be part of the search result.
            contactsHasLoginAccessNotSetOnContactResults = nlapiSearchRecord('contact', null, filters, columns) || []; // This costs 10 governance units per call.
        }
    
        filters = new Array();
        columns = new Array();
        if (contactsNoLoginAccessArray.length > 0){
            filters[filters.length] = new nlobjSearchFilter('internalid', null, 'anyof', contactsNoLoginAccessArray);
            filters[filters.length] = new nlobjSearchFilter('custentitygd_portalaccessdealer', null, 'anyof', dealerId);
            
            columns[columns.length] = new nlobjSearchColumn('custentitygd_portalaccessdealer');
            
            // if the current dealer is on the contact field 'custentitygd_portalaccessdealer' even thought the contact does not have access to the portal with the current dealer,
            // the contact will be part of the search results.
            contactsNoLoginAccessSetOnContactResults = nlapiSearchRecord('contact', null, filters, columns) || []; // This costs 10 governance units per call.
        }

        // Go through the search result and set the dealer on the contact record.
        for (var i = 0; i < contactsHasLoginAccessNotSetOnContactResults.length; i++){
            textDealerList = contactsHasLoginAccessNotSetOnContactResults[i].getValue('custentitygd_portalaccessdealer') || '';
            dealerListArray = textDealerList != '' ? textDealerList.split(',') : [];
            dealerListArray.push(dealerId);
            nlapiSubmitField('contact', contactsHasLoginAccessNotSetOnContactResults[i].getId(), 'custentitygd_portalaccessdealer', dealerListArray, true); // This call costs 5 units per call.
        }
        
        // Go through the search result and remove the dealer on the contact record.
        for (var i = 0; i < contactsNoLoginAccessSetOnContactResults.length; i++){
            textDealerList = contactsNoLoginAccessSetOnContactResults[i].getValue('custentitygd_portalaccessdealer') || '';
            dealerListArray = new Array();
            dealerListArray = textDealerList != '' ? textDealerList.split(',') : [];

            if (dealerListArray.length > 0){  // check if there is even anything to remove.
                index = dealerListArray.indexOf(dealerId);
                if (index != -1) {
                    dealerListArray.splice(index, 1);
                    nlapiSubmitField('contact', contactsNoLoginAccessSetOnContactResults[i].getId(), 'custentitygd_portalaccessdealer', dealerListArray, true); // This costs 5 units per call.
                }
            }
        }
        // NOTE: The two for loops above could reach the governance limit of 1000 for after submit if each contact on the current dealer needs to be set/unset on the contacts,
        //      if the number of contacts reach about 190s or more contacts to be updated, this in unlikely to happen but it is possible.
    }
}

/**
 * Sets the specified dealer item pricing. 
 * This method assumes that dealer record already exists in netsuite.
 * (i.e, if this is a new dealer, the record doesn't exist in netsuite yet. 
 * Therefore; we need to make sure that we call this method on after submit)
 * 
 * Returns whether or not the dealer was submitted.
 */
function GD_SetDealerItemPricing(dealerId, shouldStartMapRedScript, dealersCount)
{   
    if(trim(dealerId) != '')
    {
        var dealerRecord = nlapiLoadRecord('customer', dealerId);
        
        if(dealerRecord != null)
        {
            var itemPriceSublist = 'itempricing';
            var itemPriceSublistCount = dealerRecord.getLineItemCount(itemPriceSublist);
            
            //Search for dealer record with the mileage calculations.
            //There should be either one or zero record since we are searching for dealer internal id
            //and the search itself filters based on whether or not miles field is set on the dealer record.
            var columns = new Array();
            columns.push(new nlobjSearchColumn('internalid').setLabel('Internal ID').setSort());
            columns.push(new nlobjSearchColumn('entityid').setLabel('ID'));
            columns.push(new nlobjSearchColumn('salesrep').setLabel('Sales Rep'));
            columns.push(new nlobjSearchColumn('shippingitem').setLabel('Shipping Item'));
            columns.push(new nlobjSearchColumn('shipcity').setLabel('Shipping City'));
            columns.push(new nlobjSearchColumn('shipstate').setLabel('Shipping State/Province'));
            columns.push(new nlobjSearchColumn('shipzip').setLabel('Shipping Zip'));
            columns.push(new nlobjSearchColumn('shipcountry').setLabel('Shipping Country'));
            columns.push(new nlobjSearchColumn('custentityrvsmiles').setLabel('Miles'));
            columns.push(new nlobjSearchColumn('formulacurrency')
                                .setFormula("CASE  WHEN{country}='Canada'  THEN     ({custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt})    ELSE    ({custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt}) END")
                                .setLabel('Base Freight'));
            columns.push(new nlobjSearchColumn('custentityrvstollsandpermits').setLabel('Tolls & Permits'));
            columns.push(new nlobjSearchColumn('custentityrvswash').setLabel('Wash'));
            columns.push(new nlobjSearchColumn('formulacurrency')
                                .setFormula("{custentityrvstollsandpermits}+{custentityrvswash}+CASE  WHEN{country}='Canada'  THEN     {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt}    ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END")
                                .setLabel('Total Base Freight'));
            columns.push(new nlobjSearchColumn('formulacurrency')
                                .setFormula("{custentityrvstollsandpermits}+{custentityrvswash}+CASE  WHEN{country}='Canada'  THEN     {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt}    ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END")
                                .setLabel('Net Base Freight'));
            columns.push(new nlobjSearchColumn('formulacurrency')
                                .setFormula("CASE  WHEN{country}='Canada'  THEN  {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch} ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch} END")
                                .setLabel('Fuel Surcharge'));
            columns.push(new nlobjSearchColumn('formulacurrency')
                                .setFormula("{custentityrvstollsandpermits}+{custentityrvswash}+CASE  WHEN{country}='Canada'  THEN     {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt}    ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END+CASE  WHEN{country}='Canada'  THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch}              ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch}END")
                                .setLabel('Total Freight Charge'));
            columns.push(new nlobjSearchColumn('formulacurrency')
                                .setFormula("{custentityrvstollsandpermits}+{custentityrvswash}+CASE  WHEN{country}='Canada'  THEN     {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt}    ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END+CASE  WHEN{country}='Canada'  THEN  {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch}              ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch}END")
                                .setLabel('MSRP'));
            columns.push(new nlobjSearchColumn('formulatext')
                                .setFormula("{custentityrvstollsandpermits}+{custentityrvswash}+CASE  WHEN{country}='Canada'  THEN     {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt}    ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END || ';' || CASE  WHEN{country}='Canada'  THEN  {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch}              ELSE    {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch} END || ';' ||CASE  WHEN{country}='Canada'  THEN      {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_cancdl}    ELSE     {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domcdl} END || ';' ||CASE  WHEN{country}='Canada'  THEN      {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canhaulntow}    ELSE     {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domhaulntow} END || ';' || CASE WHEN {country}='Canada' THEN {custentityrvstollsandpermits} + {custentityrvswash}+{custentityrvsmiles} * {custentitygd_freightcalculations.custrecordgd_freightcalcperc_canlowboy} ELSE {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles} * {custentitygd_freightcalculations.custrecordgd_freightcalcperc_domlowboy} END")
                                .setLabel('This field must be the last column in this search'));
            
            var filters = new Array();
            filters.push(new nlobjSearchFilter('custentityrvsdealertype', null, 'anyof', DEALER_TYPE_RVSDEALER)); //need to set contants.js as library for this plugin implement
            filters.push(new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'));
            filters.push(new nlobjSearchFilter('isdefaultshipping', null, 'is', 'T'));
            filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
            filters.push(new nlobjSearchFilter('internalid', null, 'is', dealerId));
            
            var custResults = nlapiSearchRecord('customer', null, filters, columns);
            
            var hasFreightLine = false; //Indicates whether or not freight surcharge line was added or modified
            var hasFuelLine = false;  //Indicates whether or not fuel surcharge line was added or modified
            var needToSubmitDealer = false; //Indicates whether or not dealer record needs to be submitted (i.e, dealer has been modified)
            var freightCharge = 0;
            var fuelCharge = 0; 
            var cdlCharge = 0;
            var haulAndTowCharge = 0;
            var lowboyCharge = 0;
        
            if(custResults != null && custResults.length > 0)
            {
                var freightFuelSemiColonSeperatedValue = custResults[0].getValue('formulatext'); //This is the last field on the search performed above
                var freightFuelArray = freightFuelSemiColonSeperatedValue.split(';');
                
                if(freightFuelArray != null) {
                    if(freightFuelArray.length > FREIGHT_CHARGE_COLUMN_INDEX)
                        freightCharge = parseFloat(freightFuelArray[FREIGHT_CHARGE_COLUMN_INDEX]);
                    if(freightFuelArray.length > FUEL_CHARGE_COLUMN_INDEX)
                        fuelCharge = parseFloat(freightFuelArray[FUEL_CHARGE_COLUMN_INDEX]);
                    if (freightFuelArray.length > CDL_CHARGE_COLUMN_INDEX)
                        cdlCharge = parseFloat(freightFuelArray[CDL_CHARGE_COLUMN_INDEX]);
                    if (freightFuelArray.length > HAUL_AND_TOW_CHARGE_COLUMN_INDEX)
                        haulAndTowCharge = parseFloat(freightFuelArray[HAUL_AND_TOW_CHARGE_COLUMN_INDEX] || 0);
                    if (freightFuelArray.length > LOWBOY_CHARGE_COLUMN_INDEX)
                        lowboyCharge = parseFloat(freightFuelArray[LOWBOY_CHARGE_COLUMN_INDEX] || 0);
                }
                
                if(isNaN(freightCharge))
                    freightCharge = 0;
                if(isNaN(fuelCharge))
                    fuelCharge = 0;
                if(isNaN(cdlCharge))
                    cdlCharge = 0;
                
                //Round up freight and fuel surcharge to the nearest dollar.
                //Example, if the amount is $100.01, we want it to be $101.00
                freightCharge = GetNearestDollar(freightCharge);
                fuelCharge = GetNearestDollar(fuelCharge);
                cdlCharge = GetNearestDollar(cdlCharge);
                haulAndTowCharge = GetNearestDollar(haulAndTowCharge);
                lowboyCharge = GetNearestDollar(lowboyCharge);

                //set the cdl charge if it doesn't match what's already there
                if (dealerRecord.getFieldValue('custentityrvs_cdlfreightcharge') != cdlCharge) {
                    dealerRecord.setFieldValue('custentityrvs_cdlfreightcharge', cdlCharge);
                    needToSubmitDealer = true;
                }
                
                //set the haul and tow charge if it doesn't match what's already there
                if (dealerRecord.getFieldValue('custentitygd_haulandtowfreightcharge') != haulAndTowCharge) {
                    dealerRecord.setFieldValue('custentitygd_haulandtowfreightcharge', haulAndTowCharge);
                    needToSubmitDealer = true;
                }
                
                //set the lowboy charge if it doesn't match what's already there
                if (dealerRecord.getFieldValue('custentitygd_lowboyfreightcharge') != lowboyCharge) {
                    dealerRecord.setFieldValue('custentitygd_lowboyfreightcharge', lowboyCharge);
                    needToSubmitDealer = true;
                }
                
                //This dealer has Item Pricing lines
                if(itemPriceSublistCount > 0) {
                    for(var i = 1; i <= itemPriceSublistCount; i++) {
                        //Set freight charge total
                        if(dealerRecord.getLineItemValue(itemPriceSublist, 'item', i) == FREIGHT_CHARGE_ITEM_ID) {
                            dealerRecord.setLineItemValue(itemPriceSublist, 'price', i, freightCharge);
                            hasFreightLine = true;
                        }               
                        //Set fuel charge total
                        if(dealerRecord.getLineItemValue(itemPriceSublist, 'item', i) == FUEL_CHARGE_ITEM_ID) {
                            dealerRecord.setLineItemValue(itemPriceSublist, 'price', i, fuelCharge);
                            hasFuelLine = true;
                        }   
                    }           
                    //In case there are other items in the item pricing that are not freight or fuel charge,
                    //or if there is one but not the other, we need to make sure that we add them
                    if(!hasFreightLine) {
                        AddDealerItemPricingLine(dealerRecord, FREIGHT_CHARGE_ITEM_ID, freightCharge);
                        hasFreightLine = true;
                    }
                        
                    if(!hasFuelLine) {
                        AddDealerItemPricingLine(dealerRecord, FUEL_CHARGE_ITEM_ID, fuelCharge);
                        hasFuelLine = true;
                    }
                    
                    if(hasFreightLine || hasFuelLine)   
                        needToSubmitDealer = true;
                }
                //This dealer has no item Pricing lines, add fuel and freight charge lines
                else {
                    AddDealerItemPricingLine(dealerRecord, FREIGHT_CHARGE_ITEM_ID, freightCharge);
                    AddDealerItemPricingLine(dealerRecord, FUEL_CHARGE_ITEM_ID, fuelCharge);
                    needToSubmitDealer = true;
                }               
            } else {
                //Could not find this dealer's search record.
                //This will happen if Miles field is not set on the dealer since the search above filters by Miles.
                
                //Set the cdl charge to 0 if it doesn't exist.
                if (ConvertNSFieldToString(dealerRecord.getFieldValue('custentityrvs_cdlfreightcharge')).length == 0) {
                    dealerRecord.setFieldValue('custentityrvs_cdlfreightcharge', 0);
                    needToSubmitDealer = true;
                }
                
                //In this case if there are no item pricing lines, we add the 2 lines with 0 price
                if(itemPriceSublistCount == 0) {
                    AddDealerItemPricingLine(dealerRecord, FREIGHT_CHARGE_ITEM_ID, 0);
                    AddDealerItemPricingLine(dealerRecord, FUEL_CHARGE_ITEM_ID, 0); 
                    needToSubmitDealer = true;
                }
                //If there are lines, make sure that they are freight and fuel surcharge lines
                else {
                    //This should almost never happen. But in case item pricing has other items other than
                    //freight and fuel surcharge, than we need to make sure that we add freight and fuel lines
                    //Loop through the lines, and check if their exist freight and fuel surcharge lines
                    for(var i = 1; i <= itemPriceSublistCount; i++) {
                        if(dealerRecord.getLineItemValue(itemPriceSublist, 'item', i) == FREIGHT_CHARGE_ITEM_ID) {
                            hasFreightLine = true;
                            
                            //Make sure that freight charge is rounded up.
                            freightCharge = parseFloat(dealerRecord.getLineItemValue(itemPriceSublist, 'price', i));
                            if(freightCharge != 0 && freightCharge != GetNearestDollar(freightCharge)) {
                                dealerRecord.setLineItemValue(itemPriceSublist, 'price', i, GetNearestDollar(freightCharge));
                                needToSubmitDealer = true;
                            }
                        }
                            
                        if(dealerRecord.getLineItemValue(itemPriceSublist, 'item', i) == FUEL_CHARGE_ITEM_ID) {
                            hasFuelLine = true;
    
                            //Make sure that fuel charge is rounded up.
                            fuelCharge = parseFloat(dealerRecord.getLineItemValue(itemPriceSublist, 'price', i));
                            if(fuelCharge != 0 && fuelCharge != GetNearestDollar(fuelCharge)) {
                                dealerRecord.setLineItemValue(itemPriceSublist, 'price', i, GetNearestDollar(fuelCharge));
                                needToSubmitDealer = true;
                            }                       
                        }
//                      percentage += percentage + (1.0 / dealersCount / itemPriceSublistCount);
//                      nlapiGetContext().setPercentComplete((100 * percentage).toFixed(2));
                    }
                                    
                    if(!hasFreightLine) //If there is no freight surcharge line, then add it
                        AddDealerItemPricingLine(dealerRecord, FREIGHT_CHARGE_ITEM_ID, 0);
                        
                    if(!hasFuelLine) //If there is no fuel surcharge line, then add it
                        AddDealerItemPricingLine(dealerRecord, FUEL_CHARGE_ITEM_ID, 0);
                    
                    //If one or both of the lines are not in the list, then the record must have been changed from above
                    //so, submit the record with the new information.
                    if(!hasFreightLine || !hasFuelLine)
                        needToSubmitDealer = true;
                }
            }
            
            //Dealer record was changed, so save the changes and update the open sales orders.
            if(needToSubmitDealer)
            {
                nlapiSubmitRecord(dealerRecord, false, true);
                
                if (shouldStartMapRedScript)
                {
                    //Start the map reduce script to update Sales Orders fuel and freight surcharge.
                    //This method will update only sales orders whose freight or fuel surcharge 
                    //or both are different from the specified dealer's freight or fuel surcharge.
                    var params = {}; 
                    params['custscriptgd_updatefreightfuel_dealers'] = JSON.stringify([parseInt(dealerId)]);
                    
                    var url = nlapiResolveURL('SUITELET', 'customscriptgd_startmapreduce_suite', 'customdeploygd_startmapreduce_suite', true) //Get the external url. deployment must be available without login.
                    nlapiRequestURL(url + '&custparam_scriptid=customscriptgd_updateslsordfrflcharge&custparam_scriptdeploymentid=&custparam_parameters=' + JSON.stringify(params) + '&custparam_priority=3&custparam_concurrency=5&custparam_yeildaftermins=5');
                }
                return true;
            }
        }           
    }
    return false;
}