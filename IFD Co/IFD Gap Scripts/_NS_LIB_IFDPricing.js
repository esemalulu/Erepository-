/**
 * Copyright (c) 1998-2018 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved
 *
 * This software is the confidential and proprietary information of NetSuite, Inc.  ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
 * you entered into with NetSuite
 */

/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 *
 * Script Description
 * Library file for common IFD Pricing tasks
 *
 * Version Date Author Remarks
 * 1.0 8/9/2018 JMO Initial Version
 * 2.0 10/29/2018 JMO Use rebates even if no contract.  Use item prices even if no price level.
 * 2.1 12/04/2018 PRI TI 142 - Once set, don't change sell price for Fixed Price Contracts
 * 2.20 01/04/2019 MPG TI 146 - update to admin fee logic
 * 2.21 01/04/2019 MPG TI 148 - change in getPriceForItem & contract refresh interval
 * 2.22 01/04/2019 MPG TI 123 - change in getPriceForItem & contract refresh interval
 * 2.23 01/18/2019 MPG TI 164 - change in getPriceForItem to properly return when there are no contracts
 * 2.24 01/18/2019 MPG TI 165 - change in getPriceForItem to fix rounding error
 * 2.25 02/04/2019 MPG TI 171 - change in getPriceForItem to account for CW items
 * 2.26 03/06/2019 MPG TI 137 - change in getPriceForItem to get the fixed price and rebate percentage
 * 2.27 03/21/2019 PAR TI 184 - change in getPriceForitem to subtract the Guaranteed Amt from the Total Admin amt
 * 2.28 05/14/2019 MPG TI 194 - update in getPriceForItem to process differently for getPriceEnquiry and getOrderLinePrice
 * 2.29 06/06/2019 MPG TI 170 - update to the calculations for Applied Rebate Amount and Total Admin Fees
 * 2.30 08/01/2019 JMO TI 246 - update to fall back to native pricing when no contracts/rebates - in all use cases
 * 2.31 08/26/2019 DJL TI 185 - Update Last Purchase Price function to get value from new Last Cost for Pricing field
 * 2.32 10/31/2019 PRI TI 185 - Same update, but including Catch Weights items instead of getting Purchase Price
 * 2.33 06/15/2022 Kalyani, NS Case# 4528739
 */

define(
  ['./NSUtilvSS2', 'N/search', 'N/format', 'N/record', 'N/url'],

  function (NSUtil, search, format, record, url) {

    var libPrices = {};

    //Public function used by Suitelet to calculate a Price Enquiry
    libPrices.getPriceEnquiry = function (intCustomerId, intItemId) {
      var objPriceEnquiry = {};
      //Load Library Parameter Custom Record and extract appropriate values
      var objParamSearch = search.load({
        id: 'customsearch_ns_pricing_libdependencies'
      });
      var arrParamResult = objParamSearch.run().getRange({ start: 0, end: 1 });

      var stMissingCustomer = arrParamResult[0].getValue('custrecord_ns_lib_missingcustomer');
      var stMissingItem = arrParamResult[0].getValue('custrecord_ns_lib_missingitem');

      //Return error if parameter missing
      if (NSUtil.isEmpty(intCustomerId)) {
        objPriceEnquiry.error = stMissingCustomer;
        return objPriceEnquiry;
      }
      if (NSUtil.isEmpty(intItemId)) {
        objPriceEnquiry.error = stMissingItem;
        return objPriceEnquiry;
      }

      //Object with Item Details called from private function
      var getItemDetails = privatePrices.getItemDetails(intItemId);

      //If error, return now
      if (!NSUtil.isEmpty(getItemDetails.error)) {
        return getItemDetails.error;
      }

      //Get Current System Date and format appropriately
      var objDate = new Date();
      var stCurrentMonth = (objDate.getMonth()) + 1;
      var stCurrentDay = objDate.getDate();
      var stCurrentYear = objDate.getFullYear();
      var stCurrentDate = stCurrentMonth + '/' + stCurrentDay + '/' + stCurrentYear;
      // log.debug('stCurrentDate', stCurrentDate);

      //Object with Item Pricing called from private function
      var getPriceForItem = privatePrices.getPriceForItem(intCustomerId, intItemId, stCurrentDate, 'PriceEnquiry')

      //If error, return now
      if (!NSUtil.isEmpty(getPriceForItem.error)) {
        return getPriceForItem.error;
      }
      else {
        //If no error, return all fields from private functions
        objPriceEnquiry =
        {
          asofdate: stCurrentDate,
          sellprice: getPriceForItem.sellprice,
          description: getItemDetails.description,
          category: getItemDetails.category,
          subcategory: getItemDetails.subcategory,
          lastpurchase: getItemDetails.lastpurchase,
          lastCostForPricing: getItemDetails.lastCostForPricing, //v2.31: Add
          landedweek: getItemDetails.landedweek,
          landedmonth: getItemDetails.landedmonth,
          contract: getPriceForItem.contract,
          costrefresh: getPriceForItem.costrefresh,
          markupdollar: getPriceForItem.markupdollar,
          markuppercent: getPriceForItem.markuppercent,
          rebateagreement: getPriceForItem.rebateagreement,
          rebatedetail: getPriceForItem.rebatedetail,
          rebateamount: getPriceForItem.rebateamount,
          appliedrebateamount: getPriceForItem.appliedrebateamount, //v2.29
          guaranteed: getPriceForItem.guaranteed,
          deliveredguaranteed: getPriceForItem.deliveredguaranteed,
          admindollar: getPriceForItem.admindollar,
          adminpercent: getPriceForItem.adminpercent,
          totaladmin: getPriceForItem.totaladmin,
          refresh: getPriceForItem.refresh,
          fixedprice: getPriceForItem.fixedprice, 
          rebatepercent: getPriceForItem.rebatepercent,
          brand: getItemDetails.brand,
          preferredvendor: getItemDetails.preferredvendor,
          packsize: getItemDetails.packsize,
          catchweight : getItemDetails.catchweight,
          //NS ACS Case 5162875 - begin
          upccode : getItemDetails.upccode,
          mpn : getItemDetails.mpn,
          unitsPerPack : getItemDetails.unitsPerPack,
          portionSize : getItemDetails.portionSize,
          portionType : getItemDetails.portionType,
          servSizeUnits : getItemDetails.servSizeUnits,
          servingUOM : getItemDetails.servingUOM,
          manufacturer : getItemDetails.manufacturer,
          preparedYield : getItemDetails.preparedYield,
          buyer : getItemDetails.buyer,
          mfrShelfLife : getItemDetails.mfrShelfLife,
          suggestedSub : getItemDetails.suggestedSub,
          suggestedSubItemName: getItemDetails.suggestedSubItemName,
          addntlSuggestedSub : getItemDetails.addntlSuggestedSub,
          itemImage : getItemDetails.itemImage,
          itemAttributes : getItemDetails.itemAttributes,
          recordType: getItemDetails.recordType,
          suggestedSubItemURL: getItemDetails.suggestedSubItemURL,
          addntlSuggestedSubItemURLs: getItemDetails.addntlSuggestedSubItemURLs,
          itemImageURL: getItemDetails.itemImageURL,
          marketCost: getItemDetails.marketCost    
          //NS ACS Case 5162875 - end

        }
        return objPriceEnquiry;
      }

    }

    //Public function called to get price for a specific line item
    libPrices.getOrderLinePrice = function (intCustomerId, intItemId, stShipDate) {
      var objGetOrderLinePrice = {};
      //Load Library Parameter Custom Record and extract appropriate values
      var objParamSearch = search.load({
        id: 'customsearch_ns_pricing_libdependencies'
      });
      var arrParamResult = objParamSearch.run().getRange({ start: 0, end: 1 });

      var stMissingCustomer = arrParamResult[0].getValue('custrecord_ns_lib_missingcustomer');
      var stMissingItem = arrParamResult[0].getValue('custrecord_ns_lib_missingitem');
      var stMissingShip = arrParamResult[0].getValue('custrecord_ns_lib_missingship');

      //Return error if parameter missing
      if (NSUtil.isEmpty(intCustomerId)) {
        objGetOrderLinePrice.error = stMissingCustomer;
        return objGetOrderLinePrice;
      }
      if (NSUtil.isEmpty(intItemId)) {
        objGetOrderLinePrice.error = stMissingItem;
        return objGetOrderLinePrice;
      }
      if (NSUtil.isEmpty(stShipDate)) {
        objGetOrderLinePrice.error = stMissingShip;
        return objGetOrderLinePrice;
      }

      //Object with Item Pricing called from private function
      objGetOrderLinePrice = privatePrices.getPriceForItem(intCustomerId, intItemId, stShipDate, 'OrderLine');

      return objGetOrderLinePrice;

    };






    var privatePrices = {};

    //Private function to obtain Item Details
    privatePrices.getItemDetails = function (intItemId) {

      //Load Library Parameter Custom Record and extract appropriate values
      var objParamSearch = search.load({
        id: 'customsearch_ns_pricing_libdependencies'
      });
      var arrParamResult = objParamSearch.run().getRange({ start: 0, end: 1 });
      var stMissingItem = arrParamResult[0].getValue('custrecord_ns_lib_missingitem');
      var stInvalidItem = arrParamResult[0].getValue('custrecord_ns_lib_invaliditem');
      var intItemSearch = arrParamResult[0].getValue('custrecord_ns_lib_itemdetails');

      //Object to be returned
      var objItemDetails = {};

      //Error if item parameter missing
      if (NSUtil.isEmpty(intItemId)) {
        objItemDetails.error = stMissingItem;
        return objItemDetails;
      }

      //Push Item Id to Search for detail extraction
      var objItemFilter = search.createFilter({
        name: 'internalid',
        operator: search.Operator.IS,
        values: intItemId
      });
      var objItemSearch = search.load({
        id: intItemSearch
      });
      var arrItemFilters = objItemSearch.filters;
      arrItemFilters.push(objItemFilter);
      var arrItems = NSUtil.search('item', intItemSearch, arrItemFilters, null);

      //Error if item parameter invalid
      if (NSUtil.isEmpty(arrItems)) {
        objItemDetails.error = stInvalidItem;
        return objItemDetails;
      }

      //Return Item Details
      objItemDetails.id = arrItems[0].getValue('internalid');
      objItemDetails.description = arrItems[0].getValue('displayname');
      objItemDetails.category = arrItems[0].getText('class');
      objItemDetails.lastpurchase = arrItems[0].getValue('lastpurchaseprice');
      objItemDetails.lastCostForPricing = arrItems[0].getValue('custitem_ifd_lastcost_forpricing');
      objItemDetails.landedweek = arrItems[0].getValue('custitem_flc_weekly');
      objItemDetails.landedmonth = arrItems[0].getValue('custitem_flc_monthly');
      objItemDetails.packsize = arrItems[0].getValue('custitem_ifd_field_packsize');
      objItemDetails.catchweight = arrItems[0].getValue('custitem_jf_cw_catch_weight_item');
      objItemDetails.brand = arrItems[0].getValue('custitem_ifd_brand');
      objItemDetails.preferredvendor = arrItems[0].getValue({ join: 'preferredVendor', name: 'altname' });

      //NS ACS Case 5162875 - begin

      var scheme = 'https://';
      var host = url.resolveDomain({
        hostType: url.HostType.APPLICATION
      });

      objItemDetails.upccode = arrItems[0].getValue({ name: 'upccode' });
      objItemDetails.mpn = arrItems[0].getValue({ name: 'mpn' });
      objItemDetails.unitsPerPack = arrItems[0].getValue({ name: 'custitem_ifd_unitsperpack' });
      objItemDetails.portionSize = arrItems[0].getValue({ name: 'custitem_ifd_portionsize' });
      objItemDetails.portionType = arrItems[0].getText({ name: 'custitem_ifd_portiontype' });
      objItemDetails.servSizeUnits = arrItems[0].getValue({ name: 'custitem_ifd_servsizeunits' });
      objItemDetails.servingUOM = arrItems[0].getText({ name: 'custitem_ifd_servinguom' });
      objItemDetails.manufacturer = arrItems[0].getValue({ name: 'manufacturer' });
      objItemDetails.preparedYield = arrItems[0].getValue({ name: 'custitem_ifd_preparedyield' });
      objItemDetails.buyer = arrItems[0].getText({ name: 'custitem_ifd_buyer' });
      objItemDetails.mfrShelfLife = arrItems[0].getValue({ name: 'custitem_ifd_mfr_shelf_life' });
      objItemDetails.suggestedSub = arrItems[0].getValue({ name: 'custitem_ifd_suggested_sub' });
      objItemDetails.suggestedSubItemName = arrItems[0].getText({ name: 'custitem_ifd_suggested_sub' });
      if (!NSUtil.isEmpty(arrItems[0].getValue({ join: 'CUSTITEM_IFD_SUGGESTED_SUB', name: 'displayname' })))
        objItemDetails.suggestedSubItemName = objItemDetails.suggestedSubItemName + ' ' + arrItems[0].getValue({ join: 'CUSTITEM_IFD_SUGGESTED_SUB', name: 'displayname' });

      objItemDetails.addntlSuggestedSub = arrItems[0].getValue({ name: 'custitem_ifd_addtl_sug_subs' });
      objItemDetails.itemImage = arrItems[0].getValue({ name: 'custitem_ifd_item_image' });
      objItemDetails.itemAttributes = arrItems[0].getText({ name: 'custitem_ifd_item_attributes' });
      objItemDetails.recordType = arrItems[0].recordType;

      objItemDetails.suggestedSubItemURL = ''
      if (!NSUtil.isEmpty(objItemDetails.suggestedSub)) {
        var srchObj = search.lookupFields({type: 'item', id: objItemDetails.suggestedSub, columns: ['itemid', 'displayname']});
        var itemName = srchObj.itemid + ' ' + srchObj.displayname;
        objItemDetails.suggestedSubItemURL = scheme + host + url.resolveRecord({recordType: objItemDetails.recordType, recordId: objItemDetails.suggestedSub, isEditMode: false})
        objItemDetails.suggestedSubItemURL =  '<A HREF="' + objItemDetails.suggestedSubItemURL + '">' + itemName + '</A>';
      }

      objItemDetails.addntlSuggestedSubItemURLs = '';
      if (!NSUtil.isEmpty(objItemDetails.addntlSuggestedSub)) {
        var arrAddntlSuggestedSub = (objItemDetails.addntlSuggestedSub).split(',');
        for(idx=0; idx < arrAddntlSuggestedSub.length; idx++)
        {
          var srchObj = search.lookupFields({type: 'item', id: arrAddntlSuggestedSub[idx], columns: ['itemid', 'displayname']});
          var itemName = srchObj.itemid + ' ' + srchObj.displayname;
          log.debug('Checking', 'arrAddntlSuggestedSub[idx] ' + arrAddntlSuggestedSub[idx]);
          if (objItemDetails.addntlSuggestedSubItemURLs == '') {
            objItemDetails.addntlSuggestedSubItemURLs = scheme + host + url.resolveRecord({recordType: objItemDetails.recordType, recordId: arrAddntlSuggestedSub[idx], isEditMode: false});
            log.debug('Checking', '***281 objItemDetails.addntlSuggestedSubItemURLs ' + objItemDetails.addntlSuggestedSubItemURLs);
            objItemDetails.addntlSuggestedSubItemURLs =  '<A HREF="' + objItemDetails.addntlSuggestedSubItemURLs + '">' + itemName + '</A>';
          }
          else {
            objItemDetails.addntlSuggestedSubItemURLs +=  '<br>';
            var addntlSuggestedSubItemURL = scheme + host + url.resolveRecord({recordType: objItemDetails.recordType, recordId: arrAddntlSuggestedSub[idx], isEditMode: false})
            addntlSuggestedSubItemURL =  '<A HREF="' + addntlSuggestedSubItemURL + '">' + itemName + '</A>';
            objItemDetails.addntlSuggestedSubItemURLs += addntlSuggestedSubItemURL;
            log.debug('Checking', '***288 objItemDetails.addntlSuggestedSubItemURLs ' + objItemDetails.addntlSuggestedSubItemURLs);
          }
        }
      }

      objItemDetails.itemImageURL = ''
      if (!NSUtil.isEmpty(objItemDetails.itemImage)) {
        var srchObj = search.lookupFields({type: 'file', id: objItemDetails.itemImage, columns: ['url']});
        var itemImageURL = srchObj.url;
        objItemDetails.itemImageURL =  '<img src="' + itemImageURL + '"' + '</img>';
      }
      objItemDetails.marketCost = arrItems[0].getValue({ name: 'custitem_item_market_cost' });
      log.debug('Checking', 'objItemDetails ' + JSON.stringify(objItemDetails) );
      //NS ACS Case 5162875 - end
      return objItemDetails;
    };


    //Private function to obtain Item Pricing details
    privatePrices.getPriceForItem = function (intCustomerId, intItemId, stShipDate, stCallContext) //v2.28 add stCallContext
    {

      //Load Library Parameter Custom Record and extract appropriate values
      var objParamSearch = search.load({
        id: 'customsearch_ns_pricing_libdependencies'
      });
      var arrParamResult = objParamSearch.run().getRange({ start: 0, end: 1 });

      var stMissingCustomer = arrParamResult[0].getValue('custrecord_ns_lib_missingcustomer');
      var stMissingItem = arrParamResult[0].getValue('custrecord_ns_lib_missingitem');
      var stMissingShip = arrParamResult[0].getValue('custrecord_ns_lib_missingship');
      var stMissingPurchase = arrParamResult[0].getValue('custrecord_ns_lib_missingpurchase');
      var stMissingRebate = arrParamResult[0].getValue('custrecord_ns_lib_missingrebates');
      var stMissingPrice = arrParamResult[0].getValue('custrecord_ns_lib_missingprice');
      var intFixedContract = arrParamResult[0].getValue('custrecord_ns_lib_fixedcontract');
      var intClassSearch = arrParamResult[0].getValue('custrecord_ns_lib_classsearch');
      var intContractSearch = arrParamResult[0].getValue('custrecord_ns_lib_contractsearch');
      var intRebateSearch = arrParamResult[0].getValue('custrecord_ns_lib_rebatesearch');
      var intAgreementDetailsSearch = arrParamResult[0].getValue('custrecord_ns_lib_agreementdetailsearch'); //2.21 (TI148) added search for agreement details subrecord

      var flLandedCost;

      var objPriceForItem = {};
      try {
        //Return error if missing parameters
        if (NSUtil.isEmpty(intCustomerId)) {
          objPriceForItem.error = stMissingCustomer;
          return objPriceForItem;
        }
        if (NSUtil.isEmpty(intItemId)) {
          objPriceForItem.error = stMissingItem;
          return objPriceForItem;
        }
        if (NSUtil.isEmpty(stShipDate)) {
          objPriceForItem.error = stMissingShip;
          return objPriceForItem;
        }

        //Parse and format ship date
        stShipDate = format.parse({
          value: stShipDate,
          type: format.Type.DATE
        });
        stShipDate = format.format({
          value: stShipDate,
          type: format.Type.DATE
        });
        stShipDate = stShipDate.toString();

        //Obtain Customer Category/Chain
        var arrCustomerFields = search.lookupFields({
          type: search.Type.CUSTOMER,
          id: intCustomerId,
          columns: ['category', 'custentityifd_chain_name']
        });
        // log.debug('arrCustomerFields', arrCustomerFields);

        //Look up Customer Category
        var intCustomerCategory = arrCustomerFields.category;
        if (!NSUtil.isEmpty(intCustomerCategory)) {
          intCustomerCategory = intCustomerCategory[0].value;
          // log.debug('intCustomerCategory', intCustomerCategory);
        }
        else {
          intCustomerCategory = 0;
        }

        //Look up Customer Chain
        var intCustomerChain = arrCustomerFields.custentityifd_chain_name;
        if (!NSUtil.isEmpty(intCustomerChain)) {
          intCustomerChain = intCustomerChain[0].value;
          // log.debug('intCustomerChain', intCustomerChain);
        }
        else {
          intCustomerChain = 0;
        }

        //Obtain Item Class and use Parent Class as search filter //v2.25 adding search for catchweightitem onto search
        var arrItemFields = search.lookupFields({
          type: search.Type.ITEM,
          id: intItemId,
//          columns: ['class', 'custitem_jf_cw_catch_weight_item', 'isdropshipitem']
          columns: ['class', 'custitem_jf_cw_catch_weight_item', 'isdropshipitem', 'custitem_ifd_contract_category']    //ACS Case  - 5700945
        });

        //log.debug('arrItemFields',arrItemFields);
//ACS Case  - 5700945 - commented below lines
  /*
        var stItemClass = arrItemFields.class;
        var intClassId = 0;
        if (!NSUtil.isEmpty(stItemClass)) {
          stItemClass = stItemClass[0].text;
          var arrItemClass = stItemClass.split(' :');
          // log.debug('arrItemClass', stItemClass);
          stItemClass = arrItemClass[0];
          // log.debug('stItemClass', stItemClass);
          var objClassSearch = search.load({ id: intClassSearch });
          var objClassFilter = search.createFilter({
            name: 'name',
            operator: search.Operator.IS,
            values: stItemClass
          });
          var arrClassResults = NSUtil.search('class', intClassSearch, [objClassFilter], null);

          if (!NSUtil.isEmpty(arrClassResults)) {
            intClassId = arrClassResults[0].getValue('internalid');
          }
        }
*/
        //ACS Case  - 5700945
        var contractCategory = '';
        var objContractCategory = arrItemFields.custitem_ifd_contract_category;
        if (!NSUtil.isEmpty(objContractCategory)) {
          contractCategory = objContractCategory[0].value;
        }
        //ACS Case  - 5700945 - end
        log.debug('Checking', 'intContractSearch : ' + intContractSearch);
        log.debug('Checking', 'contractCategory : ' + contractCategory);
        log.debug('Checking', 'stShipDate : ' + stShipDate);
        log.debug('Checking', 'intCustomerId : ' + intCustomerId);
        log.debug('Checking', 'intCustomerChain : ' + intCustomerChain);
        log.debug('Checking', 'intCustomerCategory : ' + intCustomerCategory);
        log.debug('Checking', 'intItemId : ' + intItemId);

        //Load contract search and push customer/item filters extracted above
        var objContractSearch = search.load({ id: intContractSearch });
        var arrContractFilters = [];
        arrContractFilters.push(['isinactive', 'is', 'F']);
        arrContractFilters.push('AND');
        arrContractFilters.push(['custrecord_contract_start_date', 'onorbefore', stShipDate]);
        arrContractFilters.push('AND');
        arrContractFilters.push(['custrecord_contract_end_date', 'onorafter', stShipDate]);
        arrContractFilters.push('AND');
        arrContractFilters.push([['custrecord_contract_customer', 'anyof', intCustomerId], 'OR',
        ['custrecord_contract_customerchain', 'anyof', intCustomerChain], 'OR',
        ['custrecord_contract_customercategory', 'anyof', intCustomerCategory]]);
        arrContractFilters.push('AND');
//ACS Case  - 5700945 - commented below lines
/*
        arrContractFilters.push([['custrecord_ifd_contract_item', 'anyof', intItemId], 'OR',
        ['custrecord_contract_itemcategory', 'anyof', intClassId]]);
*/
//ACS Case  - 5700945 - below code added
        if (contractCategory) {
          arrContractFilters.push([['custrecord_ifd_contract_item', 'anyof', intItemId], 'OR',
            ['custrecord_ifd_item_contract_cat', 'anyof', contractCategory]]);
        }
        else {
          arrContractFilters.push(['custrecord_ifd_contract_item', 'anyof', intItemId]);
        }

        log.debug('arrContractFilters',arrContractFilters);
        objContractSearch.filterExpression = arrContractFilters;
        var arrContractResults = objContractSearch.run().getRange({
          start: 0,
          end: 1
        });
        // log.debug('arrContractResults',arrContractResults);

        if (NSUtil.isEmpty(arrContractResults)) {
          objPriceForItem.markupdollar = 0;
          objPriceForItem.markuppercent = 0;
          //v2.22 START - (TI123) If no contract found, look for price level on customer (shifting up this code from where it previously existed after the rebate search loaded)
          // log.debug('No Contracts');
          //If no contract results, use NetSuite standard pricing
          var flStandardPrice = privatePrices.getPriceLevel(intCustomerId, intItemId);
          // log.debug('flStandardPrice',flStandardPrice);
          if (!NSUtil.isEmpty(flStandardPrice)) {
            objPriceForItem.sellprice = flStandardPrice;
            //log.debug('a','objPriceForItem.sellprice: '+ objPriceForItem.sellprice); //v2.24
          }
          else {
            //Return error if purchase price missing
            objPriceForItem.error = stMissingPurchase;
            return objPriceForItem;
          }

          objPriceForItem.contract = null;
          objPriceForItem.costrefresh = null;
          objPriceForItem.rebateagreement = null;
          objPriceForItem.rebatedetail = null;
          objPriceForItem.rebateamount = null;
          objPriceForItem.appliedrebateamount = 0.00; //v2.29
          objPriceForItem.guaranteed = null;
          objPriceForItem.deliveredguaranteed = null;
          objPriceForItem.admindollar = null;
          objPriceForItem.adminpercent = null;
          objPriceForItem.totaladmin = null;
          objPriceForItem.refresh = null;
          objPriceForItem.fixedprice = null; //v2.26
          objPriceForItem.rebatepercent = null; //v2.26

          //v2.22 END
        }

        //v2.0
        var intContractType;
        if (!NSUtil.isEmpty(arrContractResults)) {
          //If contract exists but is "Fixed Price" use value from contract record
          intContractType = arrContractResults[0].getValue('custrecord_contract_price_type');
          // log.debug('intContractType',intContractType);
        } else { //v2.23 START - adding in return of price from price level if no contract exists
          //v2.28 START add condition to check if it's on the order line, and if so, allow native NS to determine price
          if (stCallContext == 'OrderLine') {
            objPriceForItem.error = 'No custom price could be found for this item';
            return objPriceForItem;
          } else {
            return objPriceForItem;
          }
        } //v2.23 END
        if (intContractType === intFixedContract) {
          objPriceForItem.sellprice = arrContractResults[0].getValue('custrecord_contract_fixed_price');
          objPriceForItem.fixedprice = arrContractResults[0].getValue('custrecord_contract_fixed_price'); //v2.26
          //log.debug('b','objPriceForItem.sellprice: '+ objPriceForItem.sellprice); //v2.24
        }
        else {
          //Load Rebate Agreement Search and push required filters
          // log.debug('stShipDate',stShipDate);
          var objRebateSearch = search.load({ id: intRebateSearch });
          var arrRebateFilters = objRebateSearch.filters;
          var objStartFilter = search.createFilter({name: 'custrecord_nsts_rm_agreement_start_date', operator: search.Operator.ONORBEFORE, values: stShipDate});
          arrRebateFilters.push(objStartFilter);
          var objEndFilter = search.createFilter({name: 'custrecord_nsts_rm_agreement_end_date', operator: search.Operator.ONORAFTER, values: stShipDate});
          arrRebateFilters.push(objEndFilter);
          var objCustomerFilter = search.createFilter({name: 'custrecord_nsts_rm_eligible_customer', join: 'custrecord_nsts_rm_rebate_agreement', operator: search.Operator.ANYOF, values: intCustomerId});
          arrRebateFilters.push(objCustomerFilter);
          var objItemFilter = search.createFilter({name: 'custrecord_nsts_rm_eligible_item', join: 'custrecord_nsts_rm_rebate_agreement', operator: search.Operator.ANYOF, values: intItemId});
          arrRebateFilters.push(objItemFilter);
          // log.debug('arrRebateFilters',arrRebateFilters);
          var arrRebateResults = NSUtil.search('customrecord_nsts_rm_rebate_agreement', intRebateSearch, arrRebateFilters, null);
          // log.debug('arrRebateResults', JSON.stringify(arrRebateResults));
          //v2.22 Shifted up logic for if Contracts and Rebates both empty to just when contracts empty because if contract empty, going straight to Price Level
          if (!NSUtil.isEmpty(arrRebateResults)) {
            // log.debug('Rebate Results');
            //If rebate results, obtain pricing related values
            var flRebateAmount = arrRebateResults[0].getValue({name: 'custrecord_nsts_rm_rebate_amount', join: 'custrecord_nsts_rm_rebate_agreement'});
            // log.debug('flRebateAmount', flRebateAmount);
            //2.21 START (TI148) updating flAdminDollar & flFormattedAdminPercent to be pulled from the Agreement Detail record rather than the Rebate Agreement
            // var flAdminDollar = NSUtil.forceFloat(arrRebateResults[0].getValue('custrecord_ifd_contract_adminfeedollar'));
            // log.debug('flAdminDollar', flAdminDollar);
            // var flFormattedAdminPercent =arrRebateResults[0].getValue('custrecord_ifd_contract_adminfeepercent');
            // log.debug('flFormattedAdminPercent', flFormattedAdminPercent);
            //log.debug('searchcheck','intAgreementDetailsSearch:'+intAgreementDetailsSearch);
            var objAgreementDetailsSearch = search.load({ id: intAgreementDetailsSearch });
            var arrAgreementDetailsFilters = objAgreementDetailsSearch.filters;
            var objCustomerFilter = search.createFilter({name: 'custrecord_nsts_rm_eligible_customer', operator: search.Operator.ANYOF, values: intCustomerId});
            arrAgreementDetailsFilters.push(objCustomerFilter);
            var objItemFilter = search.createFilter({name: 'custrecord_nsts_rm_eligible_item', operator: search.Operator.ANYOF, values: intItemId});
            arrAgreementDetailsFilters.push(objItemFilter);
            var objAgreementFilter = search.createFilter({name: 'custrecord_nsts_rm_rebate_agreement', operator: search.Operator.ANYOF, values: arrRebateResults[0].getValue('internalid')});
            arrAgreementDetailsFilters.push(objAgreementFilter);

            var arrAgreementDetailsResults = NSUtil.search('customrecord_nsts_rm_agreement_detail', intAgreementDetailsSearch, arrAgreementDetailsFilters, null);
            if (!NSUtil.isEmpty(arrAgreementDetailsResults))
            {
              var flAdminDollar = NSUtil.forceFloat(arrAgreementDetailsResults[0].getValue('custrecord_contract_admin_fee_dollar'));
              // log.debug('flAdminDollar', flAdminDollar);
              var flFormattedAdminPercent = arrAgreementDetailsResults[0].getValue('custrecord_ifd_contractadminfeepercent');
              // log.debug('flFormattedAdminPercent', flFormattedAdminPercent);
            }
            else
            {
              log.debug('No Agreement Details Found. Setting Admin Fees to 0');
              var flAdminDollar = 0;
              var flFormattedAdminPercent = 0;
            }
            // 2.21 (TI148) END

            var flAdminPercent = NSUtil.forceFloat(flFormattedAdminPercent);
            flAdminPercent = flAdminPercent / 100;
            // var flAdminPercent = NSUtil.forceFloat(flFormattedAdminPercent/100);
            // log.debug('flAdminPercent', flAdminPercent);
            var flRebatePercent = NSUtil.forceFloat(arrRebateResults[0].getValue({name: 'custrecord_nsts_rm_rebate_percent', join: 'custrecord_nsts_rm_rebate_agreement'}));
            objPriceForItem.rebatepercent = flRebatePercent; //v2.26
            flRebatePercent = flRebatePercent / 100;
            // log.debug('flRebatePercent', flRebatePercent);
            var flGuaranteedAmount = arrRebateResults[0].getValue({name: 'custrecord_ifd_guaranteedamt', join: 'custrecord_nsts_rm_rebate_agreement'});
            // log.debug('flGuaranteedAmount', flGuaranteedAmount);
            var flDeliveredGuaranteedAmount = arrRebateResults[0].getValue({name: 'custrecord_ifd_delivered_guaranteedamt', join: 'custrecord_nsts_rm_rebate_agreement'});
            // log.debug('flDeliveredGuaranteedAmount', flDeliveredGuaranteedAmount);

            if (flRebateAmount > 0)
            {
              //Set Rebate Amount as starting sell price if greater than 0
              // log.debug('Rebate Amount > 0');
              objPriceForItem.sellprice = NSUtil.forceFloat(flRebateAmount);
              //log.debug('c','objPriceForItem.sellprice: '+ objPriceForItem.sellprice + ' | flRebateAmount: '+flRebateAmount+ ' | flAdminPercent: '+flAdminPercent+ ' | flAdminDollar: '+flAdminDollar); //v2.24
              // log.debug('Sell Price', objPriceForItem.sellprice);
              objPriceForItem.totaladmin = NSUtil.forceFloat((flRebateAmount * flAdminPercent) + flAdminDollar);
            }
            else if (flRebatePercent > 0)
            {
              //If rebate amount not set but rebate percent is set, use last purchase price for calcuation
              // log.debug('Rebate Amount !> 0, but Rebate Percent > 0');

              //v2.25 Check if it is a cw item and if so, use purchase price, else use last purchase price
              if (arrItemFields.custitem_jf_cw_catch_weight_item || arrItemFields.isdropshipitem) {
                //Private function to calculate last purchase price
                // var flLastPurchasePrice = privatePrices.getPurchasePrice(intItemId);     // v2.32: Remove
              } else {
                //Private function to calculate last purchase price
                // var flLastPurchasePrice = privatePrices.getLastPurchasePrice(intItemId); // v2.31: Remove
                var flLastPurchasePrice = privatePrices.getLastCostForPricing(intItemId); // v2.31: Add
              }
              //v2.25 END
              //log.debug('flLastPurchasePrice', flLastPurchasePrice);
              if (!NSUtil.isEmpty(flLastPurchasePrice)) {
                //Set total admin amount and sell price
                objPriceForItem.totaladmin = NSUtil.forceFloat((flLastPurchasePrice * flRebatePercent * flAdminPercent) + flAdminDollar);
                objPriceForItem.sellprice = NSUtil.forceFloat(flLastPurchasePrice * (flRebatePercent));
                //log.debug('d','objPriceForItem.sellprice: '+ objPriceForItem.sellprice+ ' | flRebatePercent: '+ flRebatePercent); //v2.24
              }
              else {
                //Return error if purchase price missing
                objPriceForItem.error = stMissingPurchase;
                return objPriceForItem;
              }
            }
            else if (flGuaranteedAmount > 0)
            {
              //If rebate amount and rebate percent are not set, use guaranteed amount for calcuation
              // log.debug('Rebate Amount && Rebate Percent !> 0 but Guaranteed Amount > 0');

              //v2.25 START - Check if it is a cw item and if so, use purchase price, else use last purchase price
              if (arrItemFields.custitem_jf_cw_catch_weight_item || arrItemFields.isdropshipitem) {
                //Private function to calculate last purchase price
                // var flLastPurchasePrice = privatePrices.getPurchasePrice(intItemId);   // v2.32: Remove
                var flLastPurchasePrice = privatePrices.getLastCostForPricing(intItemId); // v2.32: Add
              } else {
                //Private function to calculate last purchase price
                // var flLastPurchasePrice = privatePrices.getLastPurchasePrice(intItemId); //v2.31: Remove
                var flLastPurchasePrice = privatePrices.getLastCostForPricing(intItemId); // v2.31: Add
              }
              //v2.25 END

              //log.debug('flLastPurchasePrice', flLastPurchasePrice);
              if (!NSUtil.isEmpty(flLastPurchasePrice)) {
                //Set total admin and sell price
                // v2.27 - updated:
                objPriceForItem.totaladmin = NSUtil.forceFloat((((flLastPurchasePrice - flGuaranteedAmount) * flAdminPercent) + flAdminDollar));
                objPriceForItem.sellprice = NSUtil.forceFloat(flLastPurchasePrice - flGuaranteedAmount);
                //log.debug('e','objPriceForItem.sellprice: '+ objPriceForItem.sellprice); //v2.24
                // log.debug('GuarAmt>0: ', 'Sell Price: '+objPriceForItem.sellprice+', Total Admin: '+objPriceForItem.totaladmin);
              }
              else {
                //Return error if purchase price missing
                objPriceForItem.error = stMissingPurchase;
                return objPriceForItem;
              }
            }
            else if(flDeliveredGuaranteedAmount > 0)
            {
              //((FLC Weekly-Delivered Guaranteed Amount $) * Admin Fee %) + Admin Fee $
              //FLC Weekly – Delivered Guaranteed Amount $
              var flFLCWeeklyCost = null;
              if (arrItemFields.custitem_jf_cw_catch_weight_item || arrItemFields.isdropshipitem) {
                //Private function to calculate Item Defined Cost (FLC Weekly)
                flFLCWeeklyCost = privatePrices.getItemDefinedCostFLCWeekly(intItemId);
              } else {
                //Private function to calculate Item Defined Cost (FLC Weekly)
                flFLCWeeklyCost = privatePrices.getItemDefinedCostFLCWeekly(intItemId);
              }

              if(!NSUtil.isEmpty(flFLCWeeklyCost))
              {
                objPriceForItem.totaladmin = NSUtil.forceFloat(((flFLCWeeklyCost-flDeliveredGuaranteedAmount) * flAdminPercent) + flAdminDollar);
                objPriceForItem.sellprice = NSUtil.forceFloat(flFLCWeeklyCost - flDeliveredGuaranteedAmount);
              }
            }
            else {
              //Return error if rebate exists but pricing information not sufficient
              objPriceForItem.error = stMissingRebate;
              return objPriceForItem;
            }
            // log.debug('Total Admin', objPriceForItem.totaladmin);
            // log.debug('Sell Price', objPriceForItem.sellprice);
            var flAppliedRebateAmt = objPriceForItem.sellprice; //v2.29 adding to be set as the applied rebate amount
            if ((objPriceForItem.sellprice) <= (objPriceForItem.totaladmin)) //2.20  TI 146 asked for the rebate amount to be applied to be zero when the Admin Fee is equal to or greater, rather than just greater
            {
              //Set sell price to 0 for now if less than total admin
              // log.debug('Sell Price < Total Admin');
              objPriceForItem.sellprice = 0;
              //log.debug('f','objPriceForItem.sellprice: '+ objPriceForItem.sellprice); //v2.24
            }
            else {
              // log.debug('Sell Price > Total Admin');
              //Sell Price - Total Admin = Sell Price if Sell Price > Total Admin
              objPriceForItem.sellprice = NSUtil.forceFloat((objPriceForItem.sellprice) - (objPriceForItem.totaladmin));
              //log.debug('g','objPriceForItem.sellprice: '+ objPriceForItem.sellprice); //v2.24
              // log.debug('Sell Price', objPriceForItem.sellprice);
            }

            //Set contract details from Contract Search
            if (!NSUtil.isEmpty(arrContractResults)) {
              // log.debug('Contracts and Rebates Exist');
              objPriceForItem.contract = arrContractResults[0].getValue('name');
              objPriceForItem.costrefresh = arrContractResults[0].getText('custrecord_cost_tpe_refresh_interval');
              objPriceForItem.markupdollar = NSUtil.forceFloat(arrContractResults[0].getValue('custrecord_contract_markup_dollar'));
              objPriceForItem.markuppercent = arrContractResults[0].getValue('custrecord_contract_markup_percent');
              objPriceForItem.fixedprice = arrContractResults[0].getValue('custrecord_contract_fixed_price'); //v2.26
              //v2.22 START - (TI123) Using cost refresh interval from Contract rather than Rebate
              // log.debug('objPriceForItem_markupPercent',objPriceForItem.markuppercent);
              var flMarkupPercent = NSUtil.forceFloat(objPriceForItem.markuppercent / 100);
              // log.debug('flMarkupPercent',flMarkupPercent);
              var arrItemFields = search.lookupFields({type: search.Type.ITEM, id: intItemId,
                columns: ['custitem_flc_weekly', 'custitem_flc_monthly']
              });
              // log.debug('arrItemFields',arrItemFields);


              //Obtain appropriate landed cost value based on refresh type

              if (objPriceForItem.costrefresh === 'Weekly') {
                // log.debug('Refresh is Weekly');
                flLandedCost = arrItemFields.custitem_flc_weekly;
              }
              else {
                // log.debug('Refresh is not weekly');
                flLandedCost = arrItemFields.custitem_flc_monthly;
              }

              // v2.1 - added if v2.22 commented out as same setting is happening below in proper context
              // if (intContractType !== intFixedContract) {
              //     objPriceForItem.sellprice = NSUtil.forceFloat(NSUtil.roundDecimalAmount((flLandedCost-0)*((1)+(flMarkupPercent))+(objPriceForItem.markupdollar),2));
              // }
              //v2.22 END
            }
            else {
              objPriceForItem.contract = null;
              objPriceForItem.costrefresh = null;
            }
            // log.debug('flMarkupPercent(search)', objPriceForItem.markuppercent);
            var flMarkupPercent = NSUtil.forceFloat(objPriceForItem.markuppercent);
            flMarkupPercent = flMarkupPercent / 100;
            // log.debug('flMarkupPercent', flMarkupPercent);

            //Set rebate details from Rebate SEarch
            objPriceForItem.rebateagreement = arrRebateResults[0].getValue('name');
            objPriceForItem.rebatedetail = arrRebateResults[0].getValue({name: 'id', join: 'custrecord_nsts_rm_rebate_agreement'});
            objPriceForItem.rebateamount = flRebateAmount;
            objPriceForItem.appliedrebateamount = flAppliedRebateAmt; //v2.29
            objPriceForItem.guaranteed = flGuaranteedAmount;
            objPriceForItem.deliveredguaranteed = flDeliveredGuaranteedAmount;
            objPriceForItem.admindollar = flAdminDollar;
            objPriceForItem.adminpercent = flFormattedAdminPercent;
            //v2.22 START Commenting out getting refresh interval and related information from Rebate
            // objPriceForItem.refresh = arrRebateResults[0].getText('custrecord_ifd_contract_refreshinterval');

            // var arrItemFields = search.lookupFields({
            //   type: search.Type.ITEM,
            //   id: intItemId,
            //   columns: ['custitem_flc_weekly', 'custitem_flc_monthly']
            // });
            // // log.debug('arrItemFields',arrItemFields);

            // //Obtain appropriate landed cost value based on refresh type
            // /*TODO
            //   change
            // */
            // if(objPriceForItem.refresh === 'Weekly')
            // {
            //   // log.debug('Refresh is Weekly');
            //   flLandedCost = arrItemFields.custitem_flc_weekly;
            // }
            // else
            // {
            //   // log.debug('Refresh is not weekly');
            //   flLandedCost = arrItemFields.custitem_flc_monthly;
            // }
            // // log.debug('flLandedCost', flLandedCost);

            // //Set sell price to 0 if greater than landed cost otherwise perform calculation
            // if((flLandedCost) < (objPriceForItem.sellprice))
            // {
            //   // log.debug('Landed Cost < Sell Price');
            //   objPriceForItem.sellprice = 0;
            // }
            //v2.22 END
            // else
            // {
            // log.debug('Landed Cost > Sell Price');
            objPriceForItem.sellprice =
              NSUtil.forceFloat(NSUtil.roundDecimalAmount((flLandedCost - (objPriceForItem.sellprice)) * ((1) + ((flMarkupPercent))) + (objPriceForItem.markupdollar), 2));
            //log.debug('checkster','flLandedCost: '+flLandedCost+' | objPriceForItem.sellprice: '+ objPriceForItem.sellprice+ ' | flMarkupPercent: '+flMarkupPercent+' | objPriceForItem.markupdollar: '+objPriceForItem.markupdollar); //v2.24
            // objPriceForItem.sellprice =
            // NSUtil.forceFloat((flLandedCost - (objPriceForItem.sellprice)) *((1)+((flMarkupPercent))) +(objPriceForItem.markupdollar));
            // log.debug('Sell Price', objPriceForItem.sellprice);
            // }


          }
          //2.28 START
          else {
            if (NSUtil.isEmpty(arrContractResults) && stCallContext == 'OrderLine') {
              objPriceForItem.error = 'No custom price could be found for this item';
              return objPriceForItem;
            }
            //2.28 END
          }
          //Round sell price and return all values set above
          // objPriceForItem.sellprice = NSUtil.roundDecimalAmount(objPriceForItem.sellprice, 2);
          // log.debug('objPriceForItem',JSON.stringify(objPriceForItem));
          // return objPriceForItem;
        }

        //Return scenario where a contract exists but rebates do not
        //v2.0    
        if (!NSUtil.isEmpty(arrContractResults) && NSUtil.isEmpty(arrRebateResults)) {

          // log.debug('Contracts Exist but not rebates');
          objPriceForItem.contract = arrContractResults[0].getValue('name');
          objPriceForItem.costrefresh = arrContractResults[0].getText('custrecord_cost_tpe_refresh_interval');
          objPriceForItem.markupdollar = NSUtil.forceFloat(arrContractResults[0].getValue('custrecord_contract_markup_dollar'));
          objPriceForItem.markuppercent = NSUtil.forceFloat(arrContractResults[0].getValue('custrecord_contract_markup_percent'));
          objPriceForItem.fixedprice = arrContractResults[0].getValue('custrecord_contract_fixed_price'); //v2.26
          // log.debug('objPriceForItem_markupPercent',objPriceForItem.markuppercent);
          var flMarkupPercent = NSUtil.forceFloat(objPriceForItem.markuppercent / 100);
          // log.debug('flMarkupPercent',flMarkupPercent);
          var arrItemFields = search.lookupFields({
            type: search.Type.ITEM,
            id: intItemId,
            columns: ['custitem_flc_weekly', 'custitem_flc_monthly']
          });
          // log.debug('arrItemFields',arrItemFields);


          //Obtain appropriate landed cost value based on refresh type

          if (objPriceForItem.costrefresh === 'Weekly') {
            // log.debug('Refresh is Weekly');
            flLandedCost = arrItemFields.custitem_flc_weekly;
          }
          else {
            // log.debug('Refresh is not weekly');
            flLandedCost = arrItemFields.custitem_flc_monthly;
          }

          // v2.1 - added if
          if (intContractType !== intFixedContract) {
            objPriceForItem.sellprice = NSUtil.forceFloat(NSUtil.roundDecimalAmount((flLandedCost - 0) * ((1) + (flMarkupPercent)) + (objPriceForItem.markupdollar), 2));
            // log.debug('checkster2','flLandedCost: '+flLandedCost+' | flMarkupPercent: '+flMarkupPercent+' | objPriceForItem.markupdollar: '+objPriceForItem.markupdollar); //v2.24
            // objPriceForItem.sellprice = NSUtil.forceFloat((flLandedCost-0)*((1)+(flMarkupPercent))+(objPriceForItem.markupdollar)); //v2.24
          }
        }
        else {

        }

        return objPriceForItem;
      }
      catch (e) {
        //Catch and return any unhandled errors
        objPriceForItem.error = e;
        return objPriceForItem;
      }
    };

    //Private function to return price level for customer+item combination
    privatePrices.getPriceLevel = function (intCustomerId, intItemId) {

      // 2.30 updated - start
      var loadedCustomer = record.load({
        type: record.Type.CUSTOMER,
        id: intCustomerId
      });

      var itemPricingLineCount = loadedCustomer.getLineCount('itempricing');

      var flSellPrice = 0;

      for (var i = 0; i < itemPricingLineCount; i++) {
        var itemID = loadedCustomer.getSublistValue({
          sublistId: 'itempricing',
          fieldId: 'item',
          line: i
        });

        if (itemID === intItemId) {
          flSellPrice = loadedCustomer.getSublistValue({
            sublistId: 'itempricing',
            fieldId: 'price',
            line: i
          });
          break;
        }
      }
      // 2.30 updated - end

      if (!flSellPrice) {
        //Load Library Parameter Custom Record and extract appropriate values
        var objParamSearch = search.load({
          id: 'customsearch_ns_pricing_libdependencies'
        });
        var arrParamResult = objParamSearch.run().getRange({ start: 0, end: 1 });
        // log.debug('private_getPriceLevel_arrParamResult',arrParamResult);
        var intPriceSearch = arrParamResult[0].getValue('custrecord_ns_lib_pricesearch');
        // log.debug('private_getPriceLevel_intPriceSearch',intPriceSearch);
        //v2.0

        var objPriceLevelSearch = search.load({ id: intPriceSearch });
        var arrPriceLevelFilters = objPriceLevelSearch.filters;
        var objPriceLevelFilter = search.createFilter({
          name: 'customer',
          join: 'pricing',
          operator: search.Operator.ANYOF,
          values: intCustomerId
        });
        arrPriceLevelFilters.push(objPriceLevelFilter);

        //Add item as filter to search
        var objItemFilter = search.createFilter({
          name: 'internalid',
          operator: search.Operator.ANYOF,
          values: intItemId
        });
        arrPriceLevelFilters.push(objItemFilter);
        var arrPriceLevelResults = NSUtil.search('item', intPriceSearch, arrPriceLevelFilters, null);
        // log.debug('arrPriceLevelResults',arrPriceLevelResults);
        if (!NSUtil.isEmpty(arrPriceLevelResults)) {
          flSellPrice = arrPriceLevelResults[0].getValue({
            name: 'unitprice',
            join: 'pricing'
          });
        }
      }

      //Return price level
      return flSellPrice;
    };

    //Private function to obtain last purchase price of an item
    privatePrices.getLastPurchasePrice = function (intItemId) {
      var arrItemFields = search.lookupFields({
        type: search.Type.ITEM,
        id: intItemId,
        columns: ['lastpurchaseprice']
      });
      log.debug('flLastPurchasePrice_getLastPurchasePrice', flLastPurchasePrice);
      return flLastPurchasePrice;
    };

    //Private function to obtain last purchase price of an item
    privatePrices.getLastCostForPricing = function (intItemId) {
      var arrItemFields = search.lookupFields({
        type: search.Type.ITEM,
        id: intItemId,
        // columns: ['lastpurchaseprice']
        columns: ['custitem_ifd_lastcost_forpricing'] // v2.31: Add
      });
      var flLastCostForPricing = arrItemFields.custitem_ifd_lastcost_forpricing;
      // log.debug('flLastCostForPricing_getLastPurchasePrice',flLastCostForPricing);
      return flLastCostForPricing;
    }; // v 2.31: Add

    //v2.25 Private function to obtain purchase price of an item (used for CW items)
    privatePrices.getPurchasePrice = function (intItemId) {
      var arrItemFields = search.lookupFields({
        type: search.Type.ITEM,
        id: intItemId,
        columns: ['cost']
      });
      var flPurchasePrice = arrItemFields.cost;
      // log.debug('flPurchasePrice_getPurchasePrice',flPurchasePrice);
      return flPurchasePrice;
    };

    privatePrices.getItemDefinedCostFLCWeekly = function (intItemId){
      //
      var arrItemFields = search.lookupFields({
        type: search.Type.ITEM,
        id: intItemId,
        columns: ['custitem_flc_weekly'] // v2.31: Add
      });
      var flIFDCostFLCWeekly = arrItemFields.custitem_flc_weekly;
      // log.debug('flIFDCostFLCWeekly_getItemDefinedCostFLCWeekly',flIFDCostFLCWeekly);
      return flIFDCostFLCWeekly;
    }

    return libPrices;

  });
