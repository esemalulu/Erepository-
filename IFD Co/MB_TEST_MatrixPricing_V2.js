nlapiLogExecution("audit","FLOStart",new Date().getTime());
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
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       30 May 2016     WLIM
 * 1.01		    10 Jun 2016	    GRUIZ			       Removed LoadRecord call on line #107,added return value for rescheduling script
 * 1.02       14 Jun 2016     WLIM             Updated Computations to not include the fixed dollar value and to Set 2 decimal places during setting of price
 * 1.03       18 Nov 2016     CMARTINEZ        Implemented multi-queuing to optimize processing.
 * 1.04 	    21 Nov 2016	    jjacob		       Code review completed.
 * 1.05       21 Nov 2018     dlapp            Added Script chaining logic
 * 1.06       06 Dec 2018     dlapp            Removed error throwing logic and added callNextScript function
 * 1.07       09 Dec 2018     dlapp            Move callNextScript functionality to end of non-default deployment process
 * 1.08		    06 Dec 2018     mgotsch		       Updating matrix pricing calculation and making sure it runs on the last Friday (TI 138)
 * 1.09       08 Jan 2019     pries            Calculation correction in processItemsByCategory (TI 138)
 * 1.10       08 Jan 2019     pries            Add Filter Items search so inactive Items are excluded
 * 1.11		    18 Jan 2019     mgotsch		       Updating MultiQueue.delegateJobs to pass date parameter
 * 1.12       24 Jun 2019     dlapp            Optimization Updates
 * 1.13       02 Jul 2019     dlapp            Update condition to validate if price sublist on item needs to be updated or not
 * 1.14       19 Jul 2019     dlapp            Updated flBookCost scoping and created new flNewBookCost variable inside loops
 */

var START_TIMESTAMP = new Date().getTime();
var USAGE_THRESHOLD = 1000;
var STEP = '';
var stMatrixRecord = 'customrecord_customer_item_pricing';
var arCatPricLev = []; // v1.12: Add
var boBuildCatsPL = false; // v1.12: Add

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled_matrixPricing(type) {

  var stLoggerTitle = 'scheduled_matrixPricing';
  var boMaster;
  var objContext = nlapiGetContext(); // v1.06
  var boCallNextScript = objContext.getSetting('SCRIPT', 'custscript_mp_call_next_script'); // v1.05
  var stNextScriptID = objContext.getSetting('SCRIPT', 'custscript_mp_next_script_id'); // v1.05
  nlapiLogExecution('DEBUG', 'Next Script Parameters', 'Call Next Script: ' + boCallNextScript + ' | Next Script ID: ' + stNextScriptID); // v1.05

  try {
    nlapiLogExecution('DEBUG', stLoggerTitle, '- SCHEDULED SCRIPT START =>' + Date());

    STEP = '.Initialization';
    var stDateToday = objContext.getSetting('SCRIPT', 'custscript_date_today');
    var dtDateToday = new Date();
    var dtTempDate = new Date(dtDateToday.getFullYear(), dtDateToday.getMonth() + 1, 0); // get last day of month

    var stSTATUS_NEW = objContext.getSetting('SCRIPT', 'custscript_status_new');
    var stSTATUS_ERROR = objContext.getSetting('SCRIPT', 'custscript_status_error');
    var stSTATUS_PROCESSED = objContext.getSetting('SCRIPT', 'custscript_status_processed');
    var stINTERVAL_EVERY_FRI = objContext.getSetting('SCRIPT', 'custscript_interval_every_fri');
    var stINTERVAL_LAST_DAY = objContext.getSetting('SCRIPT', 'custscript_interval_last_day');
    var stINTERVAL_ON_DEMAND = objContext.getSetting('SCRIPT', 'custscript_interval_on_demand');

    //11/18/2016 | cmartinez : New script parameters for multi-queue
    var stRecordsToProcess = objContext.getSetting('SCRIPT', 'custscript_ifd_matrix_records');
    var stTotalQueues = objContext.getSetting('SCRIPT', 'custscript_ifd_matrix_totalqueues');
    var stDefaultDeployment = objContext.getSetting('SCRIPT', 'custscript_ifd_matrix_dfltdeploy');

    boMaster = stRecordsToProcess ? false : true;

    //Validate Parameters
    if (Eval.isEmpty(stSTATUS_NEW) || Eval.isEmpty(stSTATUS_ERROR) || Eval.isEmpty(stSTATUS_PROCESSED)) {
      nlapiLogExecution('ERROR', stLoggerTitle + STEP, ' Missing Script Parameter : Contract Status');
      // throw nlapiCreateError('ERROR MISSING PARAMETER', 'Missing Script Parameter : Contract Status, please check script deployment record');
      callNextScript(boCallNextScript, boMaster, stNextScriptID); // v1.06
      return; // v1.06
    }
    if (Eval.isEmpty(stINTERVAL_EVERY_FRI) || Eval.isEmpty(stINTERVAL_LAST_DAY) || Eval.isEmpty(stINTERVAL_ON_DEMAND)) {
      nlapiLogExecution('ERROR', stLoggerTitle + STEP, ' Missing Script Parameter : Contract Cost Type Refresh Int');
      // throw nlapiCreateError('ERROR MISSING PARAMETER', 'Missing Script Parameter : Contract Cost Type Refresh Int, please check script deployment record');
      callNextScript(boCallNextScript, boMaster, stNextScriptID); // v1.06
      return; // v1.06
    }

    if (Eval.isEmpty(stTotalQueues) || Eval.isEmpty(stDefaultDeployment)) {
      nlapiLogExecution('ERROR', stLoggerTitle + STEP, ' Missing Script Parameter : Total Queues and/or Default Deployment');
      // throw nlapiCreateError('ERROR MISSING PARAMETER', 'Missing Script Parameter : Total Queues and/or Default Deployment, please check script deployment record');
      callNextScript(boCallNextScript, boMaster, stNextScriptID); // v1.06
      return; // v1.06
    }

    //Initialization for 'Date' to be obtained from script parameter. If none, use today
    if (Eval.isEmpty(stDateToday)) {
      nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Using Date today from system time : ' + dtDateToday);
    }
    else {
      nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Using Date From Script Parameter : ' + stDateToday);
      dtDateToday = nlapiStringToDate(stDateToday);
    }
    var intFriday = 5; /* JS Native constants. 5 = Friday 6 = Saturday, 0 = Sunday */
    var intSaturday = 6;
    var intSunday = 0;
    //v1.08 START
    var intMonday = 1;
    var intTuesday = 2;
    var intWednesday = 3;
    var intThursday = 4;
    //v1.08 END

    //11/18/2016 | cmartinez: Initialize multi-queuing
    nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Records to process: ' + stRecordsToProcess);
    // Call the multiqueue function and determine if this deployment is the master record
    MultiQueue.IS_MASTER = stRecordsToProcess ? false : true;
    MultiQueue.DEFAULT_DEPLOYMENT_ID = stDefaultDeployment;

    if (MultiQueue.IS_MASTER) {
      MultiQueue.TOTAL_QUEUES = stTotalQueues ? Parse.forceInt(stTotalQueues) : 0;

      // Spread out the processing to multiple queues
      nlapiLogExecution('DEBUG', stLoggerTitle, 'Processing Multi-Queue');
      MultiQueue.delegateJobs(stDateToday, stSTATUS_NEW, stSTATUS_PROCESSED, stINTERVAL_EVERY_FRI, dtDateToday, stINTERVAL_LAST_DAY); //v1.11 add todays date param to all of the scripts // v1.12: Add stSTATUS_NEW, stSTATUS_PROCESSED, dtDateToday and stINTERVAL_LAST_DAY Parameters

    }

    else {
      if (NSUtil.isEmpty(stRecordsToProcess)) return;

      //loop through the list of custom record (Customer-Item Matrix Pricing)
      var arrMatrixPrices = stRecordsToProcess.split(',');

      if (!NSUtil.isEmpty(arrMatrixPrices)) {
        var nmArrMatrixLength = arrMatrixPrices.length;
        nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Obtained: ' + nmArrMatrixLength + ' results');

        STEP = '.ResultsLoop';
        for (var intCtr = 0; intCtr < nmArrMatrixLength; intCtr++) {
          var stMatrixId = '';
          try {
            STEP = '.ProcessingResult';

            stMatrixId = arrMatrixPrices[intCtr];

            if (NSUtil.isEmpty(stMatrixId)) continue;

            var arrMatrixPricingColumns = [];
            arrMatrixPricingColumns.push('custrecord_prod_prc_grp');
            arrMatrixPricingColumns.push('custrecord_prce_level_type');
            arrMatrixPricingColumns.push('custrecord_markup_percent');
            arrMatrixPricingColumns.push('custrecord_markup_dollar');
            arrMatrixPricingColumns.push('custrecord_matrix_status');
            arrMatrixPricingColumns.push('custrecord_refresh_interval');

            //11/18/2016 | cmartinez: Lookup Matrix pricing values
            var objMatrixPricing = nlapiLookupField('customrecord_customer_item_pricing', stMatrixId, arrMatrixPricingColumns);


            //Matrix Record Initialization
            var stMatrixRefresh = objMatrixPricing['custrecord_refresh_interval'];
            var stMatrixStatus = objMatrixPricing['custrecord_matrix_status'];
            var stMatrixProdCategory = objMatrixPricing['custrecord_prod_prc_grp'];
            var stMatrixPriceLevel = objMatrixPricing['custrecord_prce_level_type'];
            var stMatrixPriceLevelTxt = objMatrixPricing['custrecord_prce_level_type'];
            var flMatrixMarkupPercent = Parse.forceFloat(objMatrixPricing['custrecord_markup_percent']);
            var flMatrixMarkupDollar = Parse.forceFloat(objMatrixPricing['custrecord_markup_dollar']);

            //Optimization - We Skip records marked with Error, since it should be handled manually
            nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' MatrixRecord : ' + intCtr + ' id : ' + stMatrixId + ' status : ' + stMatrixStatus);
            if (stMatrixStatus == stSTATUS_ERROR) {
              nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Error Status found, skipping.');
              continue;
            }

            //For 'New' or 'On Demand' we process it immediately
            if ((stMatrixStatus == stSTATUS_NEW) || (stMatrixRefresh == stINTERVAL_ON_DEMAND)) {
              nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' New Status found, processing.');
              buildCatsandLevelsArray(stMatrixId, stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar); // v1.12: Add
              // processItemsByCategory(stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar, stMatrixRecord, stMatrixId, stSTATUS_ERROR, stSTATUS_PROCESSED); // v1.12: Remove

              //Update the custom Matrix record
              STEP = 'SubmitCustomMatrixRecord: ' + stMatrixId;

              nlapiSubmitField(stMatrixRecord, stMatrixId, ['custrecord_matrix_status'], [stSTATUS_PROCESSED]);
              nlapiLogExecution('AUDIT', stLoggerTitle + STEP, 'Matrix Record Updated from "NEW" -> "Processed" ID: ' + stMatrixId);
            }

            //If 'Processed' we only reprocess based on the 'refresh interval' (If it matches today's date)
            else if (stMatrixStatus == stSTATUS_PROCESSED) {
              nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Processed Status found, reprocessing based on refresh interval.');

              //Get the refresh interval
              STEP = '.DetermineRefreshInterval';

              if (stMatrixRefresh == stINTERVAL_EVERY_FRI) {
                STEP = '.DetermineIfFridayToday';

                nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today: ' + dtDateToday + ' | Refresh Interval: Every Friday(' + stMatrixRefresh + ').');

                if (dtDateToday.getDay() == intFriday) {
                  nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today matches Refresh interval, Processing Record.');
                  buildCatsandLevelsArray(stMatrixId, stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar); // v1.12: Add
                  // processItemsByCategory(stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar, stMatrixRecord, stMatrixId, stSTATUS_ERROR, stSTATUS_PROCESSED); // v1.12: Remove
                }
              }
              else if (stMatrixRefresh == stINTERVAL_LAST_DAY) {
                STEP = '.DetermineIfLastDayOfMonth';

                nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today: ' + dtDateToday + ' | Refresh Interval: Last Business Day(' + stMatrixRefresh + ').');

                var intLastDay = dtTempDate.getDay();
                var intSubtractDays = 0;

                if (intLastDay == intSaturday) {
                  intSubtractDays = -1;
                }
                else if (intLastDay == intSunday) {
                  intSubtractDays = -2;
                }
                //v1.08 START Updating to run on last Friday of month
                else if (intLastDay == intMonday) {
                  intSubtractDays = -3;
                }
                else if (intLastDay == intTuesday) {
                  intSubtractDays = -4;
                }
                else if (intLastDay == intWednesday) {
                  intSubtractDays = -5;
                }
                else if (intLastDay == intThursday) {
                  intSubtractDays = -6;
                }
                //v1.08 END

                dtTempDate = nlapiAddDays(dtTempDate, intSubtractDays);

                nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today : ' + dtDateToday.getTime() + 'Last Day is : ' + dtTempDate.getTime());

                if (dtDateToday.getTime() == dtTempDate.getTime()) {
                  nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today matches Refresh interval, Processing Record.');
                  buildCatsandLevelsArray(stMatrixId, stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar); // v1.12: Add
                  // processItemsByCategory(stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar, stMatrixRecord, stMatrixId, stSTATUS_ERROR, stSTATUS_PROCESSED); // v1.12: Remove
                }
              }
            }
          }
          catch (error) {
            //If we encounter an error, we will log it in the custom record
            nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
            nlapiLogExecution('ERROR', 'Unexpected Error', 'Error during arrMatrixPrices loop');
            nlapiLogExecution('ERROR', 'Unexpected Error', 'stMatrixRecord = ' + stMatrixRecord + ' | stMatrixId = ' + stMatrixId + ' | stSTATUS_ERROR = ' + stSTATUS_ERROR);

            if (!NSUtil.isEmpty(stMatrixId)) {
              nlapiSubmitField(stMatrixRecord, stMatrixId, 'custrecord_matrix_status', stSTATUS_ERROR);
              nlapiLogExecution('DEBUG', 'Submitted Record', STEP + ' : ' + ' Updated status of matrix record to Error. ID : ' + stMatrixId);

              try {
                nlapiSubmitField(stMatrixRecord, stMatrixId, 'custrecord_matrix_error_description', error.toString());
                nlapiLogExecution('DEBUG', 'Submitted Record', STEP + ' : ' + 'Updated error details of matrix record.');
              }
              catch (error) {
                nlapiLogExecution('DEBUG', 'Unexpected Error', STEP + ' : ' + 'Error when updating error details. Error = ' + error.toString());
              }
            }
          }

          //Check For Governance and Reschedule
          try {
            START_TIMESTAMP = NSUtils.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP); //gruiz 6/10
          }
          catch (error) {
            nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to reschedule script (1). Error = ' + error.toString());
          }
        }

        if (boBuildCatsPL) {
          // Use array of data then execute processItemsByCategory function
          // processItemsByCategory(stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar, stMatrixRecord, stMatrixId, stSTATUS_ERROR, stSTATUS_PROCESSED); // v1.12: Add
          processItemsByCategory(arCatPricLev, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar, stMatrixRecord, stMatrixId, stSTATUS_ERROR, stSTATUS_PROCESSED); // v1.12: Add
        }
      }

      // v1.07: START
      // Check if there are other deployments running, if not, call next Script\
      var stCurrentScriptDeplID = objContext.getDeploymentId();
      var stCurrentScriptID = objContext.getScriptId();
      var boScriptRunning = isOtherScriptRunning(stCurrentScriptID, stCurrentScriptDeplID);
      nlapiLogExecution('DEBUG', 'Deployment ' + stCurrentScriptDeplID, 'Timestamp: ' + new Date());

      if (!boScriptRunning) {
        callNextScript(boCallNextScript, stNextScriptID);
      }
      // v1.07: FINISH
    }
  }
  catch (error) {
    nlapiLogExecution('ERROR', 'Unexpected Error', '(Main function) Unable to ' + STEP + ': ' + error.toString());
    // throw nlapiCreateError('99999', error.toString()); // v1.06
  }

  STEP = '.ExitScript';
  nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '- SCHEDULED SCRIPT END =>' + Date());
}

// v1.07: Add isOtherScriptRunning Function
function isOtherScriptRunning(stCurrentScriptID, stScriptDeploymentID) {
  var arFilters = [];
  arFilters.push(new nlobjSearchFilter('status', null, 'anyof', 'PROCESSING'));
  arFilters.push(new nlobjSearchFilter('scriptid', 'script', 'is', stCurrentScriptID));
  arFilters.push(new nlobjSearchFilter('scriptid', 'scriptdeployment', 'isnot', stScriptDeploymentID));
  var arColumns = [];
  arColumns.push(new nlobjSearchColumn('status'));

  var searchResults = nlapiSearchRecord('scheduledscriptinstance', null, arFilters, arColumns);
  nlapiLogExecution('DEBUG', 'isOtherScriptRunning', 'Search Results: ' + searchResults);

  if (NSUtil.isEmpty(searchResults)) {
    return false;
  } else {
    return true;
  }
}

function callNextScript(boCallNextScript, stNextScriptID) { // v1.06: Added function
  // v1.05: START
  if (boCallNextScript === true || boCallNextScript == 'T') {
    var stSLURL = nlapiResolveURL('SUITELET', stNextScriptID, '1', 'external');
    nlapiLogExecution('DEBUG', 'Backend Suitelet URL', stSLURL);

    nlapiRequestURL(stSLURL);
  }
  return;
  // v1.05: FINISH
}

/**
 *
 * Helper method to search for all items in a certain category and update their Pricing Matrix
 * @param {String} stMatrixProdCategory - Category to search items in
 * @param {String} stMatrixPriceLevel - Defines the price level to set the computed value in
 * @param {String} flMatrixMarkupPercent - Markup percent
 * @param {String} flMatrixMarkupDollar  - Fixed Markup
 * @returns {Void}
 *
 */
// function processItemsByCategory(stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar, stMatrixRecord, stMatrixId, stSTATUS_ERROR, stSTATUS_PROCESSED) { // v1.12: Remove
function processItemsByCategory(arCatPricLev, stMatrixRecord, stSTATUS_ERROR, stSTATUS_PROCESSED) {
  try {
    // Loop through Item Categories and build array for Search
    var arItemCats = []; // v1.12: Add
    var arMatrixIds = []; // v1.12: Add
    for (var icIdx = 0; icIdx < arCatPricLev.length; icIdx++) { // v1.12: Add
      var obCatPriceLvl = arCatPricLev[icIdx];
      arItemCats.push(obCatPriceLvl.cat);
      arMatrixIds.push(obCatPriceLvl.matrixId);
    }

    var stLoggerTitle = 'processItemsByCategory';
    var arrItemsWithErr = [];
    // v1.12: Moved Markup Percent calculation from here

    //loop in custom record where status is new
    var arrItemFilters = [];
    var arrItemCols = [];

    nlapiLogExecution('DEBUG', 'Item Category Array', arItemCats);

    arrItemCols.push(new nlobjSearchColumn('internalid'));
    arrItemCols.push(new nlobjSearchColumn('type'));
    arrItemCols.push(new nlobjSearchColumn('pricinggroup')); // v1.12: Add
    arrItemFilters.push(new nlobjSearchFilter('pricinggroup', null, 'anyof', arItemCats)); // v1.12: Updated stMatrixProdCategory to arItemCats
    //cmartinez - excluded Description items
    arrItemFilters.push(new nlobjSearchFilter('type', null, 'noneof', ['Description']));
    arrItemFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));               // v1.10 - added

    //Search for items with the 'sub-category' matching the one defined in the custom record, then update their pricing
    var arrItems = NSUtils.search('item', null, arrItemFilters, arrItemCols);  //removing since pricing group will be used

    nlapiLogExecution('DEBUG', 'Item Search Results Count', arrItems.length);

    STEP = '.ProcessItem';
    if (!NSUtil.isEmpty(arrItems)) {
      var nmArrItems = arrItems.length;
      //cmartinez 3/14/2017
      var arrItemsNotUpdated = [];

      nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' # of Items retrieved : ' + nmArrItems + ' with subcategories : ' + arItemCats); // v1.12: Updated stMatrixProdCategory to arItemCats
      //Loop through items for product category
      var stItemId = '';
      var stItemType = '';
      var stItemClass = ''; // v1.12: Add
      var flBookCost = 0.00;
      var intLineNum = 0;
      for (var intItemIdx = 0; intItemIdx < nmArrItems; intItemIdx++) {
        try {
          var boValidLine = false; // v1.12: Add
          //Load item
          var objItemRes = arrItems[intItemIdx];

          if (NSUtil.isEmpty(objItemRes)) continue;

          stItemId = objItemRes.getValue('internalid');
          stItemType = objItemRes.getValue('type');
          stItemClass = objItemRes.getValue('pricinggroup'); // v1.12: Add

          if (NSUtil.isEmpty(stItemId)) continue;

          nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Item index : ' + intItemIdx + ' id : ' + stItemId);

          stItemRecType = NSUtils.toItemInternalId(stItemType);

          var recItem = nlapiLoadRecord(stItemRecType, stItemId);

          //Initialize variables
          var flMarketCost = Parse.forceFloat(recItem.getFieldValue('custitem_item_market_cost'));
          var flBurdenPct = Parse.forceFloat(recItem.getFieldValue('custitem_item_burden_percent'));
          var flExtraCost = Parse.forceFloat(recItem.getFieldValue('custitem_extra_handling_cost'));
          var flExtraCost2 = Parse.forceFloat(recItem.getFieldValue('custitem_extra_handling_cost_2'));

          //Log items that lack the Market Cost/Burden percent in an array, the error will be thrown after all items are processed
          if (Eval.isEmpty(flMarketCost) || Eval.isEmpty(flBurdenPct)) {
            arrItemsWithErr.push(stItemId);
            continue;
          }

          //compute for book cost
          flBurdenPct = flBurdenPct / 100;
          //v1.08 START updating flBookCost Calculation to: ((Market Cost* Burden Percentage) + Extra Handling Cost 1 + Extra Handling Cost 2) =Book Cost
          //v1.09 - Correction
          flNewValue = flMarketCost + (flMarketCost * flBurdenPct);
          flBookCost = flNewValue + flExtraCost + flExtraCost2;
          // flBookCost = flMarketCost + flExtraCost + flExtraCost2;
          // flBookCost = flBookCost + (flBookCost * flBurdenPct);
          //v1.08 END
          nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Book Cost : ' + flBookCost + ' Market Cost : ' + flMarketCost + ' Burden % : ' + flBurdenPct);

          // v1.12: START
          // Get Information from arCatPricLev
          for (var cplIdx = 0; cplIdx < arCatPricLev.length; cplIdx++) {
            var obCatPricLev = arCatPricLev[cplIdx];

            if (obCatPricLev.cat == stItemClass) {
              arMatrixPriceLevel = obCatPricLev.priceLevel;
              nlapiLogExecution('DEBUG', 'Price Level Array', JSON.stringify(arMatrixPriceLevel));

              // For each Price Level found in the Item Category Array of Objects, calculate and set the field
              for (var mplIdx = 0; mplIdx < arMatrixPriceLevel.length; mplIdx++) {
                var flNewBookCost = 0; // v1.14
                nlapiLogExecution('DEBUG', 'Price Level Data Object', JSON.stringify(arMatrixPriceLevel[mplIdx]));

                stMatrixPriceLevel = arMatrixPriceLevel[mplIdx].id;
                flMatrixMarkupPercent = parseFloat(arMatrixPriceLevel[mplIdx].perc);
                flMatrixMarkupDollar = parseFloat(arMatrixPriceLevel[mplIdx].doll);

                nlapiLogExecution('DEBUG', 'Price Level Data', 'id: ' + stMatrixPriceLevel + ' | perc: ' + flMatrixMarkupPercent + ' | doll: ' + flMatrixMarkupDollar);

                //Compute factoring in Onsell%
                flMatrixMarkupPercent = flMatrixMarkupPercent / 100;
                flMatrixMarkupPercent = 1 - flMatrixMarkupPercent;

                flNewBookCost = flBookCost / flMatrixMarkupPercent;
                nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Book Cost : ' + flNewBookCost + ' Markup % : ' + flMatrixMarkupPercent + ' Markup $' + flMatrixMarkupDollar);

                //Round off 2 Decimal Places
                flNewBookCost = (Math.round(flNewBookCost * 100) / 100).toFixed(2);
                nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Book Cost After Rounding off : ' + flNewBookCost);

                //Search for the corresponding Line Item in the Item Record Price Sublist and update the price_1_ column
                intLineNum = Parse.forceInt(recItem.findLineItemValue('price', 'pricelevel', stMatrixPriceLevel));
                nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Price Level match Found in line: ' + intLineNum);

                // v1.13: Add logic to check if price level needs to be updated or not
                var inExistingPrice = nlapiGetLineItemValue('price', 'price_1_', intLineNum);

                if (intLineNum > 0 && inExistingPrice != flNewBookCost) { // v1.13: Add existing price comparison condition
                  boValidLine = true;
                  nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Setting item price level for LINE = ' + intLineNum + ' | BOOK COST = ' + flNewBookCost);
                  recItem.setLineItemValue('price', 'price_1_', intLineNum, flNewBookCost);
                }
              }
            }
          }
          // v1.12: FINISH

          if (boValidLine) { // v1.12: Add
            var stItemSubmittedID = nlapiSubmitRecord(recItem, false, true);
            nlapiLogExecution('AUDIT', 'Submitted Record', STEP + ' : ' + ' Item Price Level updated. Item ID = ' + stItemSubmittedID + ' | Price = ' + flNewBookCost);
          }
        }
        catch (error) {
          //cmartinez 3/14/2017
          if (!NSUtil.isEmpty(stItemId) && !NSUtil.isEmpty(stItemType)) arrItemsNotUpdated.push({ itemId: stItemId, itemType: stItemType, class: stItemClass }); // v1.12: Add Item Class

          //If we encounter an error, we will log it in the custom record
          var stErrorMessage = 'Last item processed = ' + stItemId
            + ' | Prod Category = ' + stMatrixProdCategory
            + ' | Deployment Id = ' + nlapiGetContext().getDeploymentId()
            + ' | stItemType = ' + stItemType
            + ' | stMatrixRecord = ' + stMatrixRecord
            + ' | arMatrixIds = ' + arMatrixIds // v1.12: Updated stMatrixId to arMatrixIds
            + ' | stSTATUS_ERROR = ' + stSTATUS_ERROR
            + ' | Error = ' + error.toString();

          nlapiLogExecution('ERROR', 'Unexpected Error', 'Error Message = ' + stErrorMessage + ' | Unable to ' + STEP + ': ' + error.toString());

          // if (!NSUtil.isEmpty(stMatrixId)) { // v1.12: remove
          if (arMatrixIds.length === 0) { // v1.12: Add
            for (var matIdx = 0; matIdx < arMatrixIds.length; matIdx++) { // v1.12: Add
              stMatrixId = arMatrixIds[matIdx];
              nlapiLogExecution('DEBUG', 'Submitting Record', 'Will update matrix status.');
              nlapiSubmitField(stMatrixRecord, stMatrixId, 'custrecord_matrix_status', stSTATUS_ERROR);
              nlapiLogExecution('DEBUG', 'Submitted Record', ' Updated status of matrix record to Error. ID : ' + stMatrixId);

              try {
                nlapiSubmitField(stMatrixRecord, stMatrixId, 'custrecord_matrix_error_description', stErrorMessage);
                nlapiLogExecution('DEBUG', 'Submitted Record', 'Updated error details of matrix record.');
              }
              catch (error) {
                nlapiLogExecution('DEBUG', 'Unexpected Error', 'Error when updating error details. Error = ' + error.toString());
              }
            }
          }
        }

        //Check For Governance and Reschedule
        try {
          START_TIMESTAMP = NSUtils.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);
        }
        catch (error) {
          nlapiLogExecution('ERROR', 'Unexpected Error', '(2) Unable to reschedule script. Error = ' + error.toString());
        }
      }

      var arrErroredItems = [];
      //cmartinez 3/14/2017 attempt reprocess
      if (arrItemsNotUpdated.length > 0) {
        nlapiLogExecution('DEBUG', stLoggerTitle, 'REPROCESSING ITEMS DUE TO SUBMIT RECORD ERROR. ITEMS = ' + arrItemsNotUpdated.join(','));

        var intRetries = 3;//Set allowed number of retries
        arrErroredItems = arrItemsNotUpdated;//Initialize errored items

        while (arrErroredItems.length > 0 && intRetries > 0)//If there are errored items and number of retries is above zero, do reprocess
        {
          intRetries--;//decrement retry counter

          var arrToProcess = arrErroredItems;//Set to process as errored items
          var intToProcess = arrToProcess.length;
          arrErroredItems = [];//Reset errored items. if all items have been processed, while condition should prevent continued reprocess

          for (var intItemCtr = 0; intItemCtr < intToProcess; intItemCtr++) {
            try {
              var boValidLine = false; // v1.12: Add

              //Load item
              stItemId = arrToProcess[intItemCtr].itemId;
              stItemType = arrToProcess[intItemCtr].itemType;
              stItemClass = arrToProcess[intItemCtr].stItemClass; // v1.12: Add

              nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Item index : ' + intItemCtr + ' id : ' + stItemId);

              if (NSUtil.isEmpty(stItemId) || NSUtil.isEmpty(stItemType)) continue;

              var stItemRecType = NSUtils.toItemInternalId(stItemType);
              var recItem = nlapiLoadRecord(stItemRecType, stItemId);

              //Initialize variables
              var flMarketCost = Parse.forceFloat(recItem.getFieldValue('custitem_item_market_cost'));
              var flBurdenPct = Parse.forceFloat(recItem.getFieldValue('custitem_item_burden_percent'));
              var flExtraCost = Parse.forceFloat(recItem.getFieldValue('custitem_extra_handling_cost'));
              var flExtraCost2 = Parse.forceFloat(recItem.getFieldValue('custitem_extra_handling_cost_2'));

              //Log items that lack the Market Cost/Burden percent in an array, the error will be thrown after all items are processed
              if (Eval.isEmpty(flMarketCost) || Eval.isEmpty(flBurdenPct)) {
                arrItemsWithErr.push(stItemId);
                continue;
              }

              //compute for book cost
              flBurdenPct = flBurdenPct / 100;
              flBookCost = flMarketCost + flExtraCost + flExtraCost2;
              flBookCost = flBookCost + (flBookCost * flBurdenPct);
              nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Book Cost : ' + flBookCost + ' Market Cost : ' + flMarketCost + ' Burden % : ' + flBurdenPct);

              // v1.12: START
              // Get Information from arCatPricLev
              for (var cplIdx = 0; cplIdx < arCatPricLev.length; cplIdx++) {
                var obCatPricLev = arCatPricLev[cplIdx];

                if (obCatPricLev.cat == stItemClass) {
                  arMatrixPriceLevel = obCatPricLev.priceLevel;

                  // For each Price Level found in the Item Category Array of Objects, calculate and set the field
                  for (var mplIdx = 0; mplIdx < arMatrixPriceLevel.length; mplIdx++) {
                    var flNewBookCost = 0; // v1.14

                    stMatrixPriceLevel = arMatrixPriceLevel[mplIdx].id;
                    flMatrixMarkupPercent = parseFloat(arMatrixPriceLevel[mplIdx].perc);
                    flMatrixMarkupDollar = parseFloat(arMatrixPriceLevel[mplIdx].doll);

                    //Compute factoring in Onsell%
                    flMatrixMarkupPercent = flMatrixMarkupPercent / 100;
                    flMatrixMarkupPercent = 1 - flMatrixMarkupPercent;

                    flNewBookCost = flBookCost / flMatrixMarkupPercent;
                    nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Book Cost : ' + flNewBookCost + ' Markup % : ' + flMatrixMarkupPercent + ' Markup $' + flMatrixMarkupDollar);

                    //Round off 2 Decimal Places
                    flNewBookCost = (Math.round(flNewBookCost * 100) / 100).toFixed(2);
                    nlapiLogExecution('DEBUG', stLoggerTitle + STEP, ' Book Cost After Rounding off : ' + flNewBookCost);

                    //Search for the corresponding Line Item in the Item Record Price Sublist and update the price_1_ column
                    intLineNum = Parse.forceInt(recItem.findLineItemValue('price', 'pricelevel', stMatrixPriceLevel));
                    nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Price Level match Found in line: ' + intLineNum);

                    // v1.13: Add logic to check if price level needs to be updated or not
                    var inExistingPrice = nlapiGetLineItemValue('price', 'price_1_', intLineNum);

                    if (intLineNum > 0 && inExistingPrice != flNewBookCost) { // v1.13: Add existing price comparison condition) {
                      boValidLine = true;
                      nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Setting item price level for LINE = ' + intLineNum + ' | BOOK COST = ' + flNewBookCost);
                      recItem.setLineItemValue('price', 'price_1_', intLineNum, flNewBookCost);
                    }
                  }
                }
              }
              // v1.12: FINISH

              if (boValidLine) { // v1.12: Add
                var stItemSubmittedID = nlapiSubmitRecord(recItem, false, true);
                nlapiLogExecution('AUDIT', 'Submitted Record', STEP + ' : ' + ' Item Price Level updated : ' + stItemSubmittedID + ' price : ' + flNewBookCost);
              }
            }
            catch (error) {
              if (!NSUtil.isEmpty(stItemId) && !NSUtil.isEmpty(stItemType)) arrErroredItems.push({ itemId: stItemId, itemType: stItemType });//in case of errors, push to list of errored items

              //If we encounter an error, we will log it in the custom record
              var stErrorMessage = '(Error during reprocess) Last item processed = ' + stItemId
                + ' | Prod Category = ' + stMatrixProdCategory
                + ' | Deployment Id = ' + nlapiGetContext().getDeploymentId()
                + ' | stItemType = ' + stItemType
                + ' | stMatrixRecord = ' + stMatrixRecord
                + ' | arMatrixIds = ' + arMatrixIds // v1.12: Updated stMatrixId to arMatrixIds
                + ' | stSTATUS_ERROR = ' + stSTATUS_ERROR
                + ' | Error = ' + error.toString();

              nlapiLogExecution('ERROR', 'Unexpected Error', 'Error Message = ' + stErrorMessage + ' | Unable to ' + STEP + ': ' + error.toString());

              if (arMatrixIds.length === 0) { // v1.12: Add
                for (var matIdx = 0; matIdx < arMatrixIds.length; matIdx++) { // v1.12: Add
                  stMatrixId = arMatrixIds[matIdx];
                  nlapiLogExecution('DEBUG', 'Submitting Record', 'Will update matrix status.');
                  nlapiSubmitField(stMatrixRecord, stMatrixId, 'custrecord_matrix_status', stSTATUS_ERROR);
                  nlapiLogExecution('DEBUG', 'Submitted Record', ' Updated status of matrix record to Error. ID : ' + stMatrixId);

                  try {
                    nlapiSubmitField(stMatrixRecord, stMatrixId, 'custrecord_matrix_error_description', stErrorMessage);
                    nlapiLogExecution('DEBUG', 'Submitted Record', 'Updated error details of matrix record.');
                  }
                  catch (error) {
                    nlapiLogExecution('DEBUG', 'Unexpected Error', 'Error when updating error details. Error = ' + error.toString());
                  }
                }
              }
            }
            //Check For Governance and Reschedule
            try {
              START_TIMESTAMP = NSUtils.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);
            }
            catch (error) {
              nlapiLogExecution('ERROR', 'Unexpected Error', '(3) Unable to reschedule script. Error = ' + error.toString());
            }
          }
        }

        //If errors occured but reprocess is successful
        if (arrItemsNotUpdated.length > 0 && arrErroredItems.length == 0) {
          if (arMatrixIds.length === 0) { // v1.12: Add
            for (var matIdx = 0; matIdx < arMatrixIds.length; matIdx++) { // v1.12: Add
              stMatrixId = arMatrixIds[matIdx];
              try {
                nlapiSubmitField(stMatrixRecord, stMatrixId, 'custrecord_matrix_status', stSTATUS_PROCESSED);
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Reprocess SUCCESSFUL after error during processing of these items = ' + arrItemsNotUpdated.join(','));
              }
              catch (error) {
                nlapiLogExecution('ERROR', stLoggerTitle, error.toString());
              }
            }
          }
        }
      }

      if (arrItemsWithErr.length > 0) {
        throw nlapiCreateError('99999', 'Incomplete Data. Market Cost or Burden % is empty, please check items : ' + arrItemsWithErr.join(','));
      }
    }

  }
  catch (error) {
    nlapiLogExecution('ERROR', 'Unexpected Error', '(processItemsByCategory) Unable to ' + STEP + ': ' + error.toString());
    if (error.getDetails != undefined) {
      throw error;
    }
    else {
      throw error;
    }
  }
}

function splitAndTrim(stValue) {
  if (!stValue) return null;

  return stValue.toLowerCase().replace(/\s+/g, '').split(',');
}

/**
 * 11/18/2016 | cmartinez: added multiqueue functions.
 */
var MultiQueue = {};

MultiQueue.TOTAL_QUEUES = 0;
MultiQueue.IS_MASTER = false;
MultiQueue.USAGE_THRESHOLD = 500;

/**
 * Distribute jobs to queues
 */
MultiQueue.delegateJobs = function (stDateToday, stNewStatus, stProcStatus, stFridInt, obDateToday, stLastInt) //1.11 adding stDateToday param // v1.12: Add: stNewStatus, stProcStatus, stFridInt and obDateToday Parameters
{
  var logTitle = 'MultiQueue.delegateJobs';
  var inLastDay = new Date(obDateToday.getFullYear(), obDateToday.getMonth() + 1, 0); // v1.12: Add
  var arrMatrixPricing = [];
  var params = {};

  //	var arrTempFils = [];

  var arrFilters = []; // v1.12: Add
  arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F')); // v1.12: Add

  var arrCols = [];
  arrCols.push(new nlobjSearchColumn('custrecord_prod_prc_grp').setSort(false));
  arrCols.push(new nlobjSearchColumn('custrecord_refresh_interval')); // v1.12: Add
  arrCols.push(new nlobjSearchColumn('custrecord_matrix_status')); // v1.12: Add
  // Perform search for matrix pricing records

  var results = NSUtils.search('customrecord_customer_item_pricing', null, arrFilters, arrCols); // v1.12: Updated filters parameter to arrFilters

  nlapiLogExecution('DEBUG', 'Search Result Count', results.length);
  if ((!results || (results.length == 0))) {
    return false;
  } else { // v1.12: Add Else Statement
    nlapiLogExecution('debug', logTitle, 'results=' + (results ? results.length : 0));

    var arrBucket = [];
    var intMatrixPricing = results.length;
    var stProdCategory = '';
    // Get total transactions
    for (var i = 0; i <= intMatrixPricing; i++) {
      var stCurrentProductCategory = '';

      //Get current product category of matrix record being processed
      if (i < intMatrixPricing) {
        stPricingId = results[i].getId();
        stCurrentProductCategory = results[i].getValue('custrecord_prod_prc_grp');
      }

      //If bucket is not empty and product category has changed/is end of list, add bucket to array to create grouping.
      if (!Eval.isEmpty(arrBucket) && (stCurrentProductCategory != stProdCategory || i == intMatrixPricing)) {
        arrMatrixPricing.push(arrBucket);
        //Reset bucket of internal ids to accommodate current category
        arrBucket = [];
      }

      //set previous category as current category
      stProdCategory = stCurrentProductCategory;

      //Add matrix pricing record id to product category bucket
      if (i < intMatrixPricing && !Eval.isEmpty(stPricingId)) {
        var stStatus = results[i].getValue('custrecord_matrix_status'); // v1.12: Add
        var stRefInt = results[i].getValue('custrecord_refresh_interval'); // v1.12: Add


        if (stStatus == stNewStatus) { // v1.12: Add
          arrBucket.push(stPricingId);
          // nlapiLogExecution('DEBUG', 'Pricing Record ' + stPricingId, 'Status is New');
        } else if (stStatus == stProcStatus && stRefInt == stFridInt && obDateToday.getDay() == 5) { // v1.12: Add
          arrBucket.push(stPricingId);
          // nlapiLogExecution('DEBUG', 'Pricing Record ' + stPricingId, 'Status is Processed and today is Friday');
        } else if (stStatus == stProcStatus && stRefInt == stLastInt && obDateToday.getDay() == inLastDay) { // v1.12: Add
          arrBucket.push(stPricingId);
          // nlapiLogExecution('DEBUG', 'Pricing Record ' + stPricingId, 'Status is Processed and today is the Last day of the Month');
        }
        // nlapiLogExecution('DEBUG', 'Bucket Array Length', arrBucket.length);

        // if (arrBucket.length === 0) { // v1.12: Add
        //   nlapiLogExecution('DEBUG', 'Exit', 'Bucket Array is empty');
        //   return;
        // }
        // arrBucket.push(stPricingId); // v1.12: Remove
      }
    }
    nlapiLogExecution('debug', logTitle, 'Groups = ' + arrMatrixPricing.length);


    // Compute total records to delegate per available queue
    var intTotalJobsPerQueue = Math.ceil(arrMatrixPricing.length / MultiQueue.TOTAL_QUEUES);

    nlapiLogExecution('debug', logTitle, 'Matrix Pricing Category Count: ' + arrMatrixPricing.length + ' | intTotalJobsPerQueue=' + intTotalJobsPerQueue
      + ' | MultiQueue.TOTAL_QUEUES=' + MultiQueue.TOTAL_QUEUES);

    // Distribute jobs
    try {

      // // Sort customer ids
      // arrUniqueContracts.sort(function(a, b)
      // {
      // return a - b;
      // });

      // Jobs to delegate for each queue
      var transactionsToQueue = arrMatrixPricing.splice(0, intTotalJobsPerQueue);

      while (transactionsToQueue.length > 0) {
        params['custscript_ifd_matrix_records'] = transactionsToQueue.join(',');
        params['custscript_date_today'] = stDateToday; //v1.11 adding parameter for date

        var stStatus = '';

        do {
          // Schedule script and set the current deployment
          stStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), null, params);
          nlapiLogExecution('debug', logTitle, 'Delegation: Matrix Pricing records to Queue: ' + transactionsToQueue.length
            + ' | schedule script status = ' + stStatus);

          // Create new deployment
          if (stStatus != 'QUEUED') {
            var stDeploymentId = MultiQueue.createDeployment();
            nlapiLogExecution('DEBUG', 'New Deployment ID: ' + stDeploymentId);
          }
        } while (stStatus != 'QUEUED');

        // Pick up next jobs to queue
        transactionsToQueue = arrMatrixPricing.splice(0, intTotalJobsPerQueue);
      }

      return true;
    } catch (e) {
      var stError = (e.getDetails != undefined) ? (e.getCode() + ': ' + e.getDetails()) : e.toString();
      nlapiLogExecution('debug', logTitle, 'Job delegation failed: ' + stError);
      throw e;
    }
  }
};

MultiQueue.CURRENT_QUEUE = 1;

/**
 * Dynamic creation of script deployment
 */
MultiQueue.createDeployment = function () {
  var stLogTitle = 'MultiQueue.createDeployment';
  var intCountQueue = MultiQueue.TOTAL_QUEUES;

  nlapiLogExecution('debug', stLogTitle, 'MultiQueue.CURRENT_QUEUE = ' + MultiQueue.CURRENT_QUEUE);

  var newDeployment = nlapiCopyRecord('scriptdeployment', MultiQueue.DEFAULT_DEPLOYMENT_ID);
  newDeployment.setFieldValue('isdeployed', 'T');
  newDeployment.setFieldValue('status', 'NOTSCHEDULED');

  if (Parse.forceInt(intCountQueue) > 1) {
    newDeployment.setFieldValue('queueid', MultiQueue.CURRENT_QUEUE.toString());
  }

  try {
    var stNewDeploymentId = nlapiSubmitRecord(newDeployment);
    nlapiLogExecution('AUDIT', stLogTitle, 'stNewDeploymentId=' + stNewDeploymentId);
  } catch (e) {
    var stError = (e.getDetails != undefined) ? (e.getCode() + ': ' + e.getDetails()) : e.toString();
    nlapiLogExecution('debug', stLogTitle, 'New deployment failed: ' + stError);
    return null;
  }

  MultiQueue.CURRENT_QUEUE++;
  nlapiLogExecution('debug', stLogTitle, 'stNewDeploymentId = ' + stNewDeploymentId + ', MultiQueue.CURRENT_QUEUE = ' + MultiQueue.CURRENT_QUEUE);

  return stNewDeploymentId;

};

/**
 * Yield script
 */
MultiQueue.yieldScript = function () {
  var stLogTitle = 'MultiQueue.yieldScript';

  var intRemainingUsage = nlapiGetContext().getRemainingUsage();
  nlapiLogExecution('DEBUG', stLogTitle, 'intRemainingUsage=' + intRemainingUsage + ' | USAGE_THRESHOLD=' + MultiQueue.USAGE_THRESHOLD);

  if (intRemainingUsage < MultiQueue.USAGE_THRESHOLD) {
    var objYield = nlapiYieldScript();

    if (objYield.status == 'FAILURE') {
      nlapiLogExecution('DEBUG', stLogTitle, 'Unable to Yield. Status=' + objYield.status + ' | Information=' + objYield.information
        + ' | Reason=' + objYield.reason);
    }
    else {
      nlapiLogExecution('DEBUG', stLogTitle, 'Yield successful');
    }
  }
};

var NSUtil = {};

/**
 *
 * Version 1:
 * @author memeremilla
 * Details: Initial version
 *
 * Version 2:
 * @author bfeliciano
 * Details: Revised shorthand version.
 *
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 *
 */
NSUtil.isEmpty = function (stValue) {
  return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function (v) {
    for (var k in v)
      return false;
    return true;
  })(stValue)));
};

function buildCatsandLevelsArray(stMatrixId, stMatrixProdCategory, stMatrixPriceLevel, flMatrixMarkupPercent, flMatrixMarkupDollar) { // v1.12
  boBuildCatsPL = true;
  var boCategoryExists = false;
  var boMatrixIdExists = false;
  var boPriceLevelExists = false;
  var obParamData = {};
  obParamData.matrixId = [stMatrixId];
  obParamData.cat = stMatrixProdCategory;
  obParamData.priceLevel = [{
    id: stMatrixPriceLevel,
    perc: flMatrixMarkupPercent,
    doll: flMatrixMarkupDollar
  }];
  var obArrData = {};
  obArrData.matrixId = [];
  obArrData.cat = stMatrixProdCategory

  // nlapiLogExecution('DEBUG', 'buildCatsandLevelsArray: parameters', JSON.stringify(obParamData));

  // Build Array grouped by Item Categories
  if (arCatPricLev.length === 0) {
    arCatPricLev.push(obParamData);
  } else {
    for (var idx = 0; idx < arCatPricLev.length; idx++) {
      if (stMatrixProdCategory == arCatPricLev[idx].cat) {
        // Category matches
        boCategoryExists = true;
        // Check Matrix ID
        for (var mIdx = 0; mIdx < arCatPricLev[idx].matrixId.length; mIdx++) {
          if (arCatPricLev[idx].matrixId[mIdx] == stMatrixId) {
            // Matrix ID matches
            boMatrixIdExists == true;
          }
        }
        if (!boMatrixIdExists) {
          arCatPricLev[idx].matrixId.push(stMatrixId);
        }

        // Check Price Level ID
        for (var pIdx = 0; pIdx < arCatPricLev[idx].priceLevel.length; pIdx++) {
          if (arCatPricLev[idx].priceLevel[pIdx].id == stMatrixPriceLevel) {
            // Price Level matches
            boPriceLevelExists = true;
          }
        }
        if (!boPriceLevelExists) {
          arCatPricLev[idx].priceLevel.push(obParamData.priceLevel[0]);
        }
      }
    }
    if (!boCategoryExists) {
      arCatPricLev.push(obParamData);
    }
  }
  nlapiLogExecution('DEBUG', 'buildCatsandLevelsArray', JSON.stringify(arCatPricLev));
}