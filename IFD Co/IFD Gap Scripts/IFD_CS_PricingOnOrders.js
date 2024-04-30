/**
* Copyright (c) 1998-2018 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved
*
* This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
* You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
* you entered into with NetSuite
*
* @NApiVersion 2.x
* @NScriptType ClientScript
* @NModuleScope public
* @author Daniel Lapp dlapp@netsuite.com
*
* Description:
*
* Version       Date               Author      Remarks
* 1.0           23 Aug 2018        dlapp       Initial
* 1.1           19 Oct 2018        pries       Added NSLogging
* 1.2           16 Nov 2018        pries       Added fieldChanged, set PriceLevel logic, TI 106
* 1.3           20 Feb 2019        pries       Added two more so line fields to set, TI 170
* 1.4           14 May 2019        mgotsch     Updating the error handling for no contract/rebate, TI 194
* 1.5           15 May 2019        pries       Removing the alert from the new handling (TI 194 / 200)
* 1.6           06 Jun 2019        mgotsch     update to the setting of Applied Rebate Amount and Total Admin Fees
* 1.7           18 Jun 2019        dlapp       Restrict Admin fee from being more than rebate amount
* 1.8           25 Jun 2019        pries       Updated RebateAmount to be RebateAmount - TotalAdmin
* 1.9           12 Jul 2019        pries       Updated Rebate Amount calculation - TI 170
* 2.0           29 Jul 2019        jostap      Don't show negative applied reabte amounts or admin fees
* 2.1           13 Aug 2019        jostap      Off by 1 Javascript fix
*/
define(['N/currentRecord', 'N/runtime', './_NS_LIB_IFDPricing', './NSUtilvSS2', 'N/log'],

    function (currentRecord, runtime, library, NSUtil, NSLogging) {

        /**
        * Executed when the page completes loading or when the form is reset.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.mode - The mode in which the record is being accessed (create, copy, or edit)
        */
        function pageInit(context) {
            return true;
        }

        /**
        * Executed when a field is changed by a user or client side call.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.sublistId - Sublist name
        * @param {string} context.fieldId - Field name
        * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
        * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
        */
        function fieldChanged(context) {

            // v1.2 - added:
            try {
                if (context.fieldId !== 'custcol_ifd_price_override') return true;

                var obCurrentRec = currentRecord.get();
                var boPriceOverride;

                if (context.sublistId === 'item') {
                    boPriceOverride = obCurrentRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ifd_price_override'
                    });
                    var inCurrentLine = obCurrentRec.getCurrentSublistIndex({
                        sublistId: 'item'
                    });

                    // If Price Override is checked then set Price Level to "Custom"
                    if (boPriceOverride === true || boPriceOverride === 'T') {
                        console.log('custcol_ifd_price_override = true on line ' + inCurrentLine);
                        obCurrentRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'price',
                            value: '-1',
                            ignoreFieldChange: false
                        });
                        return true;
                    }
                }
                return true;

            } catch (error) {
                console.log(error.toString());
                return false;
            }
        }

        /**
        * Executed on transaction forms when a field that sources information from another field is modified.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.sublistId - Sublist name
        * @param {string} context.fieldId - Field name
        */
        function postSourcing(context) {
            return true;
        }

        /**
        * Executed after a sublist has been inserted, removed, or edited.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.sublistId - Sublist name
        */
        function sublistChanged(context) {
            return true;
        }

        /**
        * Executed when an existing line is selected.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.sublistId - Sublist name
        */
        function lineInit(context) {
            return true;
        }

        /**
        * Executes when a field is about to be changed by a user or client side call.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.sublistId - Sublist name
        * @param {string} context.fieldId - Field name
        * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
        * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
        *
        * @returns {boolean} Return true if field is valid
        */
        function validateField(context) {
            return true;
        }

        /**
        * Executed before a line is added to an inline editor sublist or editor sublist.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.sublistId - Sublist name
        *
        * @returns {boolean} Return true if sublist line is valid
        */
        function validateLine(context) {
            var stPriceLookupErrorMsg = runtime.getCurrentScript().getParameter({ name: 'custscript_price_look_error_msg' });
            var flRebateAmt = 0; // v1.7: Add

            try {
                var obCurrentRec = currentRecord.get();

                if (context.sublistId === 'item') {
                    var boPriceOverride = obCurrentRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ifd_price_override'
                    });
                    var inCurrentLine = obCurrentRec.getCurrentSublistIndex({
                        sublistId: 'item'
                    });

                    // If Price Override is checked then skip processing
                    if (boPriceOverride === true || boPriceOverride === 'T') {
                        console.log('custcol_ifd_price_override = true on line ' + inCurrentLine);
                        return true;
                    }

                    // Process Data
                    else {
                        var stCustomerId = obCurrentRec.getValue({ fieldId: 'entity' });
                        var obShipDate = obCurrentRec.getValue({ fieldId: 'shipdate' });
                        var stItemId = obCurrentRec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item'
                        });

                        // Call Library Function
                        var obLibraryResponse = library.getOrderLinePrice(stCustomerId, stItemId, obShipDate);

                        console.log(JSON.stringify(obLibraryResponse));
                        // If response is an error then dispaly alert and return false
                        if (!NSUtil.isEmpty(obLibraryResponse.error)) {
                            console.log(obLibraryResponse.error);
                            //v1.4 START - checking to see if error due to no Contract or Rebate
                            if (obLibraryResponse.error == 'No custom price could be found for this item') {
                                return true;
                            }
                            //v1.4 END
                            alert(stPriceLookupErrorMsg);
                            return false;
                        }

                        // If response is valid then continue processing
                        else {
                            console.log('obj', obLibraryResponse);
                            console.log('obj sellprice', obLibraryResponse.sellprice);
                            console.log('obj contract', obLibraryResponse.contract);
                            console.log('obj rebateagreement', obLibraryResponse.rebateagreement);
                            if (!NSUtil.isEmpty(obLibraryResponse.sellprice)) {
                                obCurrentRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    value: obLibraryResponse.sellprice
                                });
                            }
                            if (!NSUtil.isEmpty(obLibraryResponse.contract)) {
                                obCurrentRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_ifd_contract_name',
                                    value: obLibraryResponse.contract
                                });
                            }
                            if (!NSUtil.isEmpty(obLibraryResponse.rebateagreement)) {
                                obCurrentRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_ifd_rebate_agreement',
                                    value: obLibraryResponse.rebateagreement
                                });
                            }

                            // v1.3 - added --- v1.5 - updated -- v1.8 - updated:
                            if (obLibraryResponse.appliedrebateamount && obLibraryResponse.appliedrebateamount !== null && !isNaN(obLibraryResponse.appliedrebateamount)) { //v1.6 changing rebateamounts to appliedrebateamount
                                var rebateAmount = Number.parseFloat(obLibraryResponse.appliedrebateamount).toFixed(2); //v1.6 update from rebateamount to appliedrebateamount
                                flRebateAmt = rebateAmount; // v1.7: Add

                                if (obLibraryResponse.totaladmin !== null && !isNaN(obLibraryResponse.totaladmin)) {
                                    var totalAdmin = obLibraryResponse.totaladmin;    //v2.1

                                    // v1.9 - updated
                                    var newRebateAmount = (rebateAmount - totalAdmin < 0) ? 0 : (rebateAmount - totalAdmin);
                                    newRebateAmount = (newRebateAmount < 0) ? 0 : newRebateAmount;
                                    console.log('rebateAmount to set: ' + newRebateAmount);
                                    obCurrentRec.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_ifd_applied_rebate_amt',
                                        value: newRebateAmount
                                    });

                                    if (flRebateAmt <= totalAdmin) {
                                        totalAdmin = flRebateAmt;
                                    } // v1.7: Add
                                    console.log('totalAdmin: ' + totalAdmin);
                                    totalAdmin = (totalAdmin < 0) ? 0 : totalAdmin;

                                    obCurrentRec.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_ifd_total_admin_fees',
                                        value: totalAdmin
                                    });
                                }
                            }

                            // v1.3 - end
                            return true;
                        }
                    }
                } else { return true; }
            } catch (error) {
                console.log(error.toString());
                alert(stPriceLookupErrorMsg);
                return false
            }
        }

        /**
        * Executed when you insert a line into an edit sublist.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.sublistId - Sublist name
        *
        * @returns {boolean} Return true if sublist line is valid
        */
        function validateInsert(context) {
            return true;
        }

        /**
        * Executed when removing an existing line from an edit sublist.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @param {string} context.sublistId - Sublist name
        *
        * @returns {boolean} Return true if sublist line is valid
        */
        function validateDelete(context) {
            return true;
        }

        /**
        * Executed after the submit button is pressed but before the form is submitted.
        *
        * @param {Object} context
        * @param {Record} context.currentRecord - Current form record
        * @returns {boolean} Return true if record is valid
        */
        function saveRecord(context) {
            return true;
        }

        return {
            // pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };
    }
);