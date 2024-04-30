/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 *
 * This script gets the cost associated with the applicable Landed Cost categories
 * from the Item receipts and calculate the Fixed Cost as the sum of Purchase Price
 * and the Landed Costs attributes. The Landed Cost attribute values for each item will be
 * pulled from the GL impact of the Item Receipt transaction which will be used in
 * determining the Fixed Landed Cost.
 *
 * Version    Date            Author           Remarks
 * 1.0        02 Aug 2016     Regina dela Cruz initial script
 * 1.1        27 Sep 2016     Regina dela Cruz updated date filters
 * 1.2        01 Oct 2018     Daniel Lapp      Updated Search Filter
 * 1.3        10 Oct 2018     Daniel Lapp      Add Extra Handling Cost into calculation
 * 1.4        15 Nov 2018     Daniel Lapp      Remove Last Calendar Date and replace with Last Friday of the Month logic, add Lot Numbered Inv Item code
 * 1.5        16 Nov 2018     Daniel Lapp      Add Script Chaining logic
 * 1.6        06 Dec 2018     Daniel Lapp      Moved getSetting code and added finally block to call next script
 * 1.7        08 Jan 2019     Peter Ries       Correction for TI 152 - exclude IRs created from RAs
 * 1.8        26 Sep 2019     Daniel Lapp      Update for TI 185 - Implement new Last Cost for Pricing field setting
 * 1.9        21 Oct 2019     Jon Ostap        Used current fixed landed cost for last cost for pricing field
 * 2.0        02 Dec 2019     P Ries           TI 285 - Change to lastCostForPricing value - use Rate from Item Receipt
 * 2.1        06 Dec 2019     P Ries           TI 285 - Change to same value, Catch Weights handled  different now
 * 2.2        11 Dec 2019     P Ries           TI 285 - correction
 */


var START_TIMESTAMP = new Date().getTime();
var USAGE_THRESHOLD = 200;

var context = nlapiGetContext();

function sched_calculateFLC() {
  var stLoggerTitle = 'sched_calculateFLC';
  var boCallNextScript = context.getSetting('SCRIPT', 'custscript_flc_call_next_script'); // v1.5
  var stNextScriptID = context.getSetting('SCRIPT', 'custscript_flc_next_script_id'); // v1.5
  var stNextScriptDeploymentIntID = context.getSetting('SCRIPT', 'custscript_flc_next_script_depl_int_id'); // v1.5
  var stNextScriptDeploymentID = context.getSetting('SCRIPT', 'custscript_flc_next_script_deployment'); // v1.5

  try {
    nlapiLogExecution('DEBUG', stLoggerTitle, '-------------- Start --------------');

    var stIRSearch = context.getSetting('SCRIPT', 'custscript_flc_ir_search');
    var stProcessDate = context.getSetting('SCRIPT', 'custscript_flc_process_date');

    var dtProcessDateFrom; // v1.4

    if (NSUtil.isEmpty(stIRSearch)) {
      nlapiLogExecution('DEBUG', stLoggerTitle, 'Exit. Missing script parameter value.');
      return;
    }

    stProcessDate = (NSUtil.isEmpty(stProcessDate)) ? nlapiDateToString(new Date()) : stProcessDate;
    nlapiLogExecution('DEBUG', stLoggerTitle, 'stProcessDate = ' + stProcessDate);

    var stTranDate = stProcessDate;
    var dtTranDate = nlapiStringToDate(stTranDate);
    nlapiLogExecution('DEBUG', stLoggerTitle, 'dtTranDate: ' + dtTranDate);

    // var dtLastBusinessDay = getLastBusinessDayOfMonth(dtTranDate);
    // var stLastBusinessDay = nlapiDateToString(dtLastBusinessDay);

    var obLastFriday = getLastFridayOfMonth(dtTranDate); // v1.4
    var stLastFriday = nlapiDateToString(obLastFriday); // v1.4
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Last Friday of Current Month: ' + stLastFriday);

    var bIsLastDayOfWeek = (dtTranDate.getDay() == 5) ? true : false;
    // var bIsLastDayOfMonth = (stTranDate == stLastBusinessDay) ? true : false; // v1.4
    var boIsLastFridayOfMonth = (stTranDate == stLastFriday) ? true : false;

    nlapiLogExecution('DEBUG', stLoggerTitle, 'stTranDate = ' + stTranDate
        + ', bIsLastDayOfWeek = ' + bIsLastDayOfWeek
        + ', boIsLastFridayOfMonth = ' + boIsLastFridayOfMonth
        // + ', bIsLastDayOfMonth = ' + bIsLastDayOfMonth
        // + ', stLastBusinessDay = ' + stLastBusinessDay
    );

    // if (!bIsLastDayOfWeek && !bIsLastDayOfMonth) { // v1.4
    if (!bIsLastDayOfWeek && !boIsLastFridayOfMonth) { // v1.4
      nlapiLogExecution('DEBUG', stLoggerTitle, 'Exit. Process Date is not Last Day of Week or Month');
      return;
    }

    if (bIsLastDayOfWeek || boIsLastFridayOfMonth) { // v1.4
      // Set Date to previous day (excludes transactions created on Friday)
      var obProcessDate = nlapiStringToDate(stProcessDate);
      obProcessDate = new Date(obProcessDate.setDate(obProcessDate.getDate() - 1));
      stProcessDate = nlapiDateToString(obProcessDate);
      dtTranDate = dtTranDate.setDate(dtTranDate.getDate() - 1);
      dtTranDate = new Date(dtTranDate);
      dtProcessDateFrom = nlapiAddDays(dtTranDate, -59);
    }

    if (!dtProcessDateFrom) { // v1.4
      nlapiLogExecution('ERROR', stLoggerTitle, 'stProcessDate is not set');
      return;
    }

    // v1.4: START: Comment Out
    // if (bIsLastDayOfWeek) {
    //   var dtProcessDateFrom = nlapiAddDays(dtTranDate, -59); // v1.2: Changed days from -6 to -59
    // }
    // // if (bIsLastDayOfMonth) { // v1.4
    // if (boIsLastFridayOfMonth) { // v1.4
    //   // var dtProcessDateFrom = nlapiStringToDate(stTranDate); // v1.2
    //   // dtProcessDateFrom.setDate(1); // v1.2
    //   dtProcessDateFrom = nlapiAddDays(dtTranDate, -59); // v1.2
    // }
    // v1.4: FINISH: Comment Out

    var stProcessDateFrom = nlapiDateToString(dtProcessDateFrom);
    var stProcessDateTo = stProcessDate;

    nlapiLogExecution('DEBUG', stLoggerTitle, 'stProcessDateFrom = ' + stProcessDateFrom
        + ', stProcessDateTo = ' + stProcessDateTo);

    var filters = [new nlobjSearchFilter('trandate', null, 'within', stProcessDateFrom, stProcessDateTo)];

    var arrResult = NSUtil.search('itemreceipt', stIRSearch, filters, null);

    if (!NSUtil.isEmpty(arrResult)) {
      nlapiLogExecution('DEBUG', stLoggerTitle, 'arrResult.length = ' + arrResult.length);

      var stPrevItemId = '';

      for (var i = 0; i < arrResult.length; i++) {
        try {
          nlapiLogExecution('DEBUG', 'Iteration Time Stamp', new Date().getTime());
          //Check if there are still remaining resources for execution
          START_TIMESTAMP = NSUtil.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);

          // v1.7 - added
          var objPO = null;
          var stCreatedFrom = arrResult[i].getValue('createdfrom', null,'GROUP');
          nlapiLogExecution('DEBUG', stLoggerTitle, 'IR CreatedFrom is ' + stCreatedFrom);
          try {
            objPO = nlapiLoadRecord('purchaseorder', stCreatedFrom);       // + 10 usage units
          } catch( error ) {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'IR ' + stCreatedFrom + ' was not created from a PO. Skipping this search result.');
            continue;
          }
          objPO = null;
          // v1.7 - end

          var stItemId = arrResult[i].getValue('item', null, 'GROUP');
          var stItemReceiptId = arrResult[i].getValue('internalid', null, 'GROUP');
          var stItemType = NSUtil.toItemInternalId(arrResult[i].getValue('type', 'item', 'GROUP'));
          var boIsLot = arrResult[i].getValue('islotitem', 'item', 'GROUP'); // v1.4
          if (stItemType === 'inventoryitem' && (boIsLot === true || boIsLot == 'T')) { // v1.4
            stItemType = 'lotnumberedinventoryitem';
          }

          nlapiLogExecution('DEBUG', stLoggerTitle, '[' + i + '] stPrevItemId = ' + stPrevItemId
              + ', boIsLot = ' + boIsLot
              + ', stItemId = ' + stItemId
              + ', stItemType = ' + stItemType
              + ', stItemReceiptId = ' + stItemReceiptId);
          if (stPrevItemId == stItemId) {
            continue; //skip line if the item has already been updated before
          }
          //		                    nlapiLoadSearch('transaction', 'customsearch_ifd_frozen_landed_cost');
          var flPurchasePrice = NSUtil.forceFloat(arrResult[i].getValue('rate', null, 'MAX')); // rate
          // v2.1 - added:
          var flpricePriceUM = NSUtil.forceFloat(arrResult[i].getValue('custcol_jf_cw_price_um', null, 'MAX')); // "Price/Price UM"
          var flTotalLandedCost = NSUtil.forceFloat(arrResult[i].getValue('formulacurrency', null, 'SUM'));
          var flQuantity = NSUtil.forceFloat(arrResult[i].getValue('quantity', null, 'SUM'));
          var inExtraHC1 = NSUtil.forceFloat(arrResult[i].getValue('custitem_extra_handling_cost', 'item', 'MAX')); // v1.3
          var inExtraHC2 = NSUtil.forceFloat(arrResult[i].getValue('custitem_extra_handling_cost_2', 'item', 'MAX')); // v1.3
          var columns = arrResult[i].getAllColumns();
          var columnLen = columns.length;
          var flCurrentFLC;
          var lastCostForPricing = 0.00; // v1.8: Add

          // loop through all columns and pull UI labels, formulas, and functions that have
          // been specified for columns

          for (j = 0; j <= columnLen; j++) {
            var column = columns[j];
            // nlapiLogExecution('debug', 'column', column); // v1.4
          }


          //Calculate Fixed Landed Cost

          //pbarrios changes
          var catchWeightCheckbox = arrResult[i].getValue('custitem_jf_cw_catch_weight_item', 'item', 'GROUP');
          var averageWeight = arrResult[i].getValue('weight', 'item', 'MIN');
          var catchWeight = arrResult[i].getValue('custcol_jf_cw_catch_weight', null, 'SUM');
          // var catchWeight = "100"; // HARDCODED VALUE, ASK FC TO OBTAIN FROM SAVED SEARCH
          nlapiLogExecution('debug', 'catchWeightCheckbox = ' + catchWeightCheckbox);
          nlapiLogExecution('debug', 'catchWeight = ' + catchWeight);
          nlapiLogExecution('debug', 'averageWeight = ' + averageWeight);

          // v1.8: Start
          var itemLookup = nlapiLookupField('item', stItemId, ['cost', 'lastpurchaseprice']),
              itemCost,
              itemLPP;

          if (itemLookup) {
            itemCost = itemLookup.cost;
            itemLPP = itemLookup.lastpurchaseprice;
          } else {
            nlapiLogExecution('ERROR', 'Item Lookup ERROR', 'Item Lookup for Cost and LPP has failed');
          }
          // v1.8: Finish

          // v1.3: START
          if (catchWeightCheckbox == 'T') {
            // v2.0  - updated
            lastCostForPricing = flpricePriceUM;             // must get before the rate var is changed

            if (NSUtil.isEmpty(catchWeight)) {
              // Rate {rate} / Average Weight {item.weight}
              flPurchasePrice = parseFloat(flPurchasePrice / averageWeight);
              // Each Landed Cost Attribute {search formula} / Average Weight {item.weight}
              flTotalLandedCost = flTotalLandedCost / averageWeight;
              // (Rate {rate} / Average Weight {item.weight}) + (Each Landed Cost Attribute {search formula} / Average Weight {item.weight} / Quantity {quantity}) + Extra Handling Cost #1 {item.custitem_extra_handling_cost} + Extra Handling Cost #2 {item.custitem_extra_handling_cost_2}
              flCurrentFLC = parseFloat(flPurchasePrice + (flTotalLandedCost / flQuantity) + inExtraHC1 + inExtraHC2);
            } else {
              // Rate {rate} * Quantity {quantity}) / Catch Weight {custcol_jf_cw_catch_weight}
              flPurchasePrice = parseFloat((flPurchasePrice * flQuantity) / catchWeight);
              // Each Landed Cost Attribute {search formula} / Catch Weight {custcol_jf_cw_catch_weight}
              flTotalLandedCost = flTotalLandedCost / catchWeight;
              // (Rate {rate} * Quantity {quantity}) / Catch Weight {custcol_jf_cw_catch_weight}) + (Each Landed Cost Attribute {search formula} / Catch Weight {custcol_jf_cw_catch_weight}) + Extra Handling Cost #1 {item.custitem_extra_handling_cost} + Extra Handling Cost #2 {item.custitem_extra_handling_cost_2}
              flCurrentFLC = parseFloat(flPurchasePrice + flTotalLandedCost + inExtraHC1 + inExtraHC2);
            }
          } else {
            // v2.1  - updated
            lastCostForPricing = flPurchasePrice; 
            // Rate {rate} + (Each Landed Cost Attribute {search formula}) / Quantity {quantity}) + Extra Handling Cost #1 {item.custitem_extra_handling_cost} + Extra Handling Cost #2 {item.custitem_extra_handling_cost_2}
            flCurrentFLC = parseFloat(flPurchasePrice + (flTotalLandedCost / flQuantity) + inExtraHC1 + inExtraHC2);
          }

          flCurrentFLC = nlapiFormatCurrency(flCurrentFLC);
          // v1.3: FINISH

          //pbarrios changes


          nlapiLogExecution('DEBUG', stLoggerTitle, '[' + i + '] Processing stItemId = ' + stItemId
              + ', stItemType = ' + stItemType // v1.4
              + ', flPurchasePrice = ' + flPurchasePrice
              + ', flQuantity = ' + flQuantity
              + ', flTotalLandedCost = ' + flTotalLandedCost
              + ', flCurrentFLC = ' + flCurrentFLC
              + ', lastCostForPricing = ' + lastCostForPricing);
          var arrFieldsToUpdate = [];
          var arrValues = [];

          if (lastCostForPricing) {
            lastCostForPricing = lastCostForPricing ? parseFloat(lastCostForPricing) : 0;
            arrFieldsToUpdate.push('custitem_ifd_lastcost_forpricing');
            arrValues.push(lastCostForPricing);
          } // v1.8: Add

          arrFieldsToUpdate.push('custitem_frozen_landed_cost');
          arrValues.push(flCurrentFLC);

          if (bIsLastDayOfWeek) {
            arrFieldsToUpdate.push('custitem_flc_weekly');
            arrValues.push(flCurrentFLC);

            arrFieldsToUpdate.push('custitem_item_rec_weekly');
            arrValues.push(stItemReceiptId);
          }

          // if (bIsLastDayOfMonth) { // v1.4
          if (boIsLastFridayOfMonth) { // v1.4
            arrFieldsToUpdate.push('custitem_flc_monthly');
            arrValues.push(flCurrentFLC);

            arrFieldsToUpdate.push('custitem_item_rec_monthly');
            arrValues.push(stItemReceiptId);
          }

          nlapiSubmitField(stItemType, stItemId, arrFieldsToUpdate, arrValues);
          nlapiLogExecution('DEBUG', stLoggerTitle, 'Updated Item Id = ' + stItemId + ', arrFieldsToUpdate = ' + arrFieldsToUpdate + ', arrValues = ' + arrValues);

          stPrevItemId = stItemId;
        }
        catch (error) {
          var stError = (error.getDetails != undefined) ? error.getCode() + ': ' + error.getDetails() : error.toString();
          nlapiLogExecution('ERROR', stLoggerTitle, '[' + i + '] Error for stItemId = ' + stItemId + ', Reason = ' + stError);
        }
      }
    }

    nlapiLogExecution('DEBUG', stLoggerTitle, '-------------- End --------------');
  }
  catch (error) {
    if (error.getDetails != undefined) {
      nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
      // throw error; // v1.6
    }
    else {
      nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
      // throw nlapiCreateError('99999', error.toString()); // v1.6
    }
  } finally { // v1.6
    // v1.5: START
    if (boCallNextScript === true || boCallNextScript === 'T') {
      var LOG_TITLE = 'Execute Chain Script';
      var otherScriptRunningBool = isOtherScriptRunning(stNextScriptDeploymentIntID);
      nlapiLogExecution('DEBUG', LOG_TITLE, 'isOtherScriptRunning: ' + otherScriptRunningBool);
      if (otherScriptRunningBool === false) {
        var schedStatus = nlapiScheduleScript(stNextScriptID, stNextScriptDeploymentID);
        nlapiLogExecution('AUDIT', LOG_TITLE, 'Script:' + stNextScriptID + ' Deployment ' + stNextScriptDeploymentID + '=' + schedStatus);
        if (schedStatus == 'QUEUED') {
          nlapiLogExecution('AUDIT', LOG_TITLE, 'Queued ' + stNextScriptDeploymentID);
        } else {
          nlapiLogExecution('ERROR', LOG_TITLE, 'Error scheduling script id:' + stNextScriptID + ' deployment id:' + stNextScriptDeploymentID + ' into queue.');
        }
      }
    }
    // v1.5: FINISH
  }
}

// v1.5: START
function isOtherScriptRunning(stScriptDeploymentID) {
  var arFilters = [];
  arFilters.push(new nlobjSearchFilter('status', null, 'anyof', 'PROCESSING'));
  arFilters.push(new nlobjSearchFilter('scriptid', 'scriptdeployment', 'is', stScriptDeploymentID));
  var arColumns = [];
  arColumns.push(new nlobjSearchColumn('status'));

  var searchResults =  nlapiSearchRecord('scheduledscriptinstance', null, arFilters, arColumns);
  nlapiLogExecution('DEBUG', 'isOtherScriptRunning', 'Search Results: ' + searchResults);

  if (NSUtil.isEmpty(searchResults)) {
    return false;
  } else {
    return true;
  }
}
// v1.5: FINISH

// function calculateFrozenLandedCost(flPurchasePrice, flTotalLandedCost, flQuantity) {

// }

// v1.4: Commenting out
// function getLastBusinessDayOfMonth(date)
// {
//     var offset = 0;
//     var dtLastBusinessDay = null;

//     var year = date.getFullYear();
//     var month = date.getMonth() + 1;

//     if (12 === month)
//     {
//         month = 0;
//         year++;
//     }

//     do
//     {
//         dtLastBusinessDay = new Date(year, month, offset);

//         offset--;
//     }
//     while (0 === dtLastBusinessDay.getDay() || 6 === dtLastBusinessDay.getDay());

//     return dtLastBusinessDay;
// }

function getLastFridayOfMonth(date) { // v1.4
  nlapiLogExecution('DEBUG', 'getLastFridayOfMonth', 'Date: ' + date);
  var offset = 0;
  var dtLastFriday = null;

  var year = date.getFullYear();
  var month = date.getMonth() + 1;

  if (12 === month) {
    month = 0;
    year++;
  }

  do {
    dtLastFriday = new Date(year, month, offset);
    offset--;
  } while (dtLastFriday.getDay() !== 5);

  return dtLastFriday;
}

var NSUtil =
    {
      isEmpty: function (stValue) {
        if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
            || (stValue == null) || (stValue == undefined)) {
          return true;
        }
        else {
          if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
          {
            if (stValue.length == 0) {
              return true;
            }
          }
          else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
          {
            for (var stKey in stValue) {
              return false;
            }
            return true;
          }

          return false;
        }
      },

      inArray: function (stValue, arrValue) {
        var bIsValueFound = false;

        for (var i = 0; i < arrValue.length; i++) {
          if (stValue == arrValue[i]) {
            bIsValueFound = true;
            break;
          }
        }

        return bIsValueFound;
      },

      forceFloat: function (stValue) {
        var flValue = parseFloat(stValue);

        if (isNaN(flValue) || (stValue == Infinity)) {
          return 0.00;
        }

        return flValue;
      },

      forceInt: function (stValue) {
        var intValue = parseInt(stValue);

        if (isNaN(intValue) || (stValue == Infinity)) {
          return 0;
        }

        return intValue;
      },


      /**
       * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
       * @param {String} stRecordType - record type of the item
       * @returns {String} stRecordTypeInLowerCase - record type internal id
       */
      toItemInternalId: function (stRecordType) {
        if ((stRecordType === '') //Strict checking for this part to properly evaluate integer value.
            || (stRecordType == null) || (stRecordType == undefined)) {
          throw nlapiCreateError('10003', 'Item record type should not be empty.');
        }

        var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();

        switch (stRecordTypeInLowerCase) {
          case 'invtpart':
            return 'inventoryitem';
          case 'description':
            return 'descriptionitem';
          case 'assembly':
            return 'assemblyitem';
          case 'discount':
            return 'discountitem';
          case 'group':
            return 'itemgroup';
          case 'markup':
            return 'markupitem';
          case 'noninvtpart':
            return 'noninventoryitem';
          case 'othcharge':
            return 'otherchargeitem';
          case 'payment':
            return 'paymentitem';
          case 'service':
            return 'serviceitem';
          case 'subtotal':
            return 'subtotalitem';
          case 'giftcert':
            return 'giftcertificateitem';
          case 'dwnlditem':
            return 'downloaditem';
          case 'kit':
            return 'kititem';
          default:
            return stRecordTypeInLowerCase;
        }
      },

      /**
       * Get all of the results from the search even if the results are more than 1000.
       * @param {String} stRecordType - the record type where the search will be executed.
       * @param {String} stSearchId - the search id of the saved search that will be used.
       * @param {nlobjSearchFilter[]} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
       * @param {nlobjSearchColumn[]} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
       * @returns {nlobjSearchResult[]} - an array of nlobjSearchResult objects
       * @author memeremilla - initial version
       * @author gmanarang - used concat when combining the search result
       */
      search: function (stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
        if (stRecordType == null && stSearchId == null) {
          throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
        }

        var arrReturnSearchResults = new Array();
        var objSavedSearch;

        if (stSearchId != null) {
          objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

          // add search filter if one is passed
          if (arrSearchFilter != null) {
            objSavedSearch.addFilters(arrSearchFilter);
          }

          // add search column if one is passed
          if (arrSearchColumn != null) {
            objSavedSearch.addColumns(arrSearchColumn);
          }
        }
        else {
          objSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
        }

        var objResultset = objSavedSearch.runSearch();
        var intSearchIndex = 0;
        var arrResultSlice = null;
        do {
          if ((nlapiGetContext().getExecutionContext() === 'scheduled')) {
            try {
              this.rescheduleScript(1000);
            }
            catch (e) {
            }
          }

          arrResultSlice = objResultset.getResults(intSearchIndex, intSearchIndex + 1000);
          if (arrResultSlice == null) {
            break;
          }

          arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
          intSearchIndex = arrReturnSearchResults.length;
        }

        while (arrResultSlice.length >= 1000);

        return arrReturnSearchResults;
      },

      /**
       * A call to this API places a scheduled script into the NetSuite scheduling queue.
       *
       * @param {String}
       *            stScheduledScriptId - String or number. The script internalId or custom scriptId{String}.
       * @param {String}
       *            stDeployId [optional] - String or number. The deployment internal ID or script ID. If empty, the first "free" deployment will be used.
       *            Free means that the script's deployment status appears as Not Scheduled or Completed.
       *            If there are multiple "free" scripts, the NetSuite scheduler will take the first free script that appears in the scheduling queue.
       * @param {Object}
       *            objParams [optional] - Object of name/values used in this schedule script instance - used to override the script parameters values for this execution.
       * @returns {String} - status
       * @author memeremilla
       */
      scheduleScript: function (stScheduledScriptId, stDeployId, objParams) {

        var stLoggerTitle = 'scheduleScript';

        if (stScheduledScriptId == null) {
          throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'scheduleScript: Missing a required argument "stScheduledScriptId".');
        }

        // Deployment name character limit
        var intCharLimit = 28;

        // Invoke script
        var stStatus = nlapiScheduleScript(stScheduledScriptId, stDeployId, objParams);
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Scheduled Script Status : ' + stStatus);

        var stDeployInternalId = null;
        var stBaseName = null;
        if (stStatus != 'QUEUED') {
          var arrFilter = new Array();
          arrFilter =
              [
                [
                  'script.scriptid', 'is', stScheduledScriptId
                ], 'OR',
                [
                  [
                    'formulatext:{script.id}', 'is', stScheduledScriptId
                  ]
                ]
              ];

          var arrColumn = new Array();
          arrColumn.push(new nlobjSearchColumn('internalid', 'script'));
          arrColumn.push(new nlobjSearchColumn('scriptid', 'script'));
          arrColumn.push(new nlobjSearchColumn('script'));
          arrColumn.push(new nlobjSearchColumn('scriptid'));
          arrColumn.push(new nlobjSearchColumn('internalid').setSort(false));

          var arrResults = nlapiSearchRecord('scriptdeployment', null, arrFilter, arrColumn);

          if ((arrResults != null) && (arrResults.length > 0)) {
            stDeployInternalId = arrResults[0].getId();
            stBaseName = arrResults[0].getValue('scriptid', 'script');
          }
        }

        if ((stDeployInternalId == null) || (stDeployInternalId == '')) {
          return stStatus;
        }

        stBaseName = stBaseName.toUpperCase().split('CUSTOMSCRIPT')[1];

        // If not queued, create deployment
        while (stStatus != 'QUEUED') {
          // Copy deployment
          var recDeployment = nlapiCopyRecord('scriptdeployment', stDeployInternalId);

          var stOrder = recDeployment.getFieldValue('title').split(' ').pop();
          var stNewDeploymentId = stBaseName + stOrder;
          var intExcess = stNewDeploymentId.length - intCharLimit;

          stNewDeploymentId = (intExcess > 0) ? (stBaseName.substring(0, (intCharLimit - intExcess)) + stOrder) : stNewDeploymentId;

          recDeployment.setFieldValue('isdeployed', 'T');
          recDeployment.setFieldValue('status', 'NOTSCHEDULED');
          recDeployment.setFieldValue('scriptid', stNewDeploymentId);

          var intCountQueue = nlapiGetContext().getQueueCount();
          if (intCountQueue > 1) {
            var stQueue = Math.floor(Math.random() * intCountQueue).toString();
            stQueue = (stQueue == '0') ? '1' : stQueue;

            recDeployment.setFieldValue('queueid', stQueue);
          }

          // Save deployment
          var stRecID = nlapiSubmitRecord(recDeployment);
          nlapiLogExecution('AUDIT', stLoggerTitle, 'Script Deployment Record has been created.' + ' | ' + 'ID: ' + stRecID + ' | ' + 'Record Type: ' + recDeployment.getRecordType());

          // Invoke deployment
          stStatus = nlapiScheduleScript(stScheduledScriptId, null, objParams);
          nlapiLogExecution('DEBUG', stLoggerTitle, 'Scheduled Script Status : ' + stStatus);

        }

        return stStatus;
      },

      /**
       * Pauses the scheduled script either if the remaining usage is less than
       * the specified governance threshold usage amount or the allowed time is
       * @param {Number} intGovernanceThreshold - The value of the governance threshold  usage units before the script will be rescheduled.
       * @param {Number} intStartTime - The time when the scheduled script started
       * @param {Number} intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
       * @param {Number} flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
       * @returns {Number} - intCurrentTime
       * @author memeremilla
       */
      rescheduleScript: function (intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime) {
        if (intGovernanceThreshold == null && intStartTime == null) {
          throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'rescheduleScript: Missing a required argument. Either intGovernanceThreshold or intStartTime should be provided.');
        }

        var stLoggerTitle = 'rescheduleScript';
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
            {
              'Remaining usage': nlapiGetContext().getRemainingUsage()
            }));

        if (intMaxTime == null) {
          intMaxTime = 3600000;
        }

        var intRemainingUsage = nlapiGetContext().getRemainingUsage();
        var intRequiredTime = 900000; // 25% of max time
        if ((flPercentOfAllowedTime)) {
          var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
          intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
        }

        // check if there is still enough usage units
        if ((intGovernanceThreshold)) {
          nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

          if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10))) {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                  'Remaining usage': nlapiGetContext().getRemainingUsage()
                }));
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

            var objYield = null;
            try {
              objYield = nlapiYieldScript();
            }
            catch (e) {
              if (e.getDetails != undefined) {
                throw e;
              }
              else {
                if (e.toString().indexOf('NLServerSideScriptException') <= -1) {
                  throw e;
                }
                else {
                  objYield =
                      {
                        'Status': 'FAILURE',
                        'Reason': e.toString(),
                      };
                }
              }
            }

            if (objYield.status == 'FAILURE') {
              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                  {
                    'Status': objYield.status,
                    'Information': objYield.information,
                    'Reason': objYield.reason
                  }));
            }
            else {
              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                  {
                    'After resume with': intRemainingUsage,
                    'Remaining vs governance threshold': intGovernanceThreshold
                  }));
            }
          }
        }

        if ((intStartTime != null && intStartTime != 0)) {
          // get current time
          var intCurrentTime = new Date().getTime();

          // check if elapsed time is near the arbitrary value
          nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

          var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
          nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

          if (intElapsedTime < intRequiredTime) {
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

            // check if we are not reaching the max processing time which is 3600000 secondsvar objYield = null;
            try {
              objYield = nlapiYieldScript();
            }
            catch (e) {
              if (e.getDetails != undefined) {
                throw e;
              }
              else {
                if (e.toString().indexOf('NLServerSideScriptException') <= -1) {
                  throw e;
                }
                else {
                  objYield =
                      {
                        'Status': 'FAILURE',
                        'Reason': e.toString(),
                      };
                }
              }
            }

            if (objYield.status == 'FAILURE') {
              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                  {
                    'Status': objYield.status,
                    'Information': objYield.information,
                    'Reason': objYield.reason
                  }));
            }
            else {
              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                  {
                    'After resume with': intRemainingUsage,
                    'Remaining vs governance threshold': intGovernanceThreshold
                  }));

              // return new start time
              intStartTime = new Date().getTime();
            }
          }
        }

        return intStartTime;
      },

      /**
       * Checks governance then calls yield
       * @param   {Integer} intGovernanceThreshold     *
       * @returns {Void}
       * @author memeremilla
       */
      checkGovernance: function (intGovernanceThreshold) {
        if (intGovernanceThreshold == null) {
          throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'checkGovernance: Missing a required argument "intGovernanceThreshold".');
        }

        var objContext = nlapiGetContext();

        if (objContext.getRemainingUsage() < intGovernanceThreshold) {
          var objState = nlapiYieldScript();
          if (objState.status == 'FAILURE') {
            nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + objState.reason + " / Size = " + objState.size);
            throw "Failed to yield script";
          }
          else if (objState.status == 'RESUME') {
            nlapiLogExecution("AUDIT", "Resuming script because of " + objState.reason + ".  Size = " + objState.size);
          }
        }
      }
    };

function printColumnNames(customsearch_id) {


  var search = nlapiLoadSearch(null, customsearch_id);
  var columns = search.getColumns();

  for (var i = 0; i < columns.length; i++) {

    var columnName = columns[i].getName();
    var columnLabel = columns[i].getLabel();
    var columnJoin = columns[i].getJoin();

    nlapiLogExecution('DEBUG', 'Columns: ', columnName + ' ' + columnLabel + ' ' + columnJoin);

  }
  return;
}