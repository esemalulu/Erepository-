/*
 * Author: Sa Ho (RSM US)
 * Date: 6/12/2017
 * Description: When Shipping Date is populated, push the Shipping Date to the corresponding Revenue Plan
 *              , update its Start & End Dates as the Shipping Date
 *              , and remove the Hold so that revenue can now be posted.
 * Hardware Build Request Scheduled Script
 */

var ScriptBase;
var cu = McGladrey.CommonUtilities;


var Events = {
    /*
     * Main entry point
     */
    Main: function() {
        ScriptBase = new McGladrey.Script.Scheduled();

        try {

            var startBench = ScriptBase.Log.StartBenchmark(ScriptBase.EventName);

            Modules.GetParameters();
            Modules.ProcessHbrShipment();

            var a = '';

            ScriptBase.Log.EndBenchmark(ScriptBase.EventName, startBench);
        } catch (err) {
            if (err instanceof nlobjError) {
                ScriptBase.Log.ErrorObject('Unknown nlobjError', err);
            } else {
                ScriptBase.Log.Error('Unknown Error', err.message);
            }

            throw err;
        }
    }
};



var Modules = (function() {
    //Retrieves script parameters
    function GetParameters() {
        ScriptBase.GetParameters([
            'custscriptr7_hbr_rp_savedsearchid',
            'custscriptr7_hbr_rp_catpurchhardware'
        ]);
    };

    function ProcessHbrShipment() {
        ScriptBase.Log.Debug('Starting Modules.ProcessHbrShipment');

        try {
            var searchResults = GetHbrToProcess(ScriptBase.Parameters.custscriptr7_hbr_rp_savedsearchid);

            

            if (!cu.IsNullOrEmpty(searchResults) && searchResults.length > 0) {

                //kruparelia - create object with sale sorder and HBR records

                var arrSalesOrderId = [];
                for(var i = 0 ; i < searchResults.length; i++){
                    arrSalesOrderId.push(searchResults[i].getValue('custrecordr7appbuildsalesorder'))
                }

                ScriptBase.Log.Debug('sales order arr esm', JSON.stringify(arrSalesOrderId));

                var objSalesOrder = {};

                for (var i = 0; i < arrSalesOrderId.length; i++) {
                    var arrhbr = [];
                    // var arrcust = [];
                    // var arrshipDate = [];
                    // var arrhbrName = [];
                    for (var j = 0; j < searchResults.length; j++) {
                        if (arrSalesOrderId[i] == searchResults[j].getValue('custrecordr7appbuildsalesorder')) {
                
                            arrhbr.push(searchResults[j].id);
                            // arrcust.push(searchResults[j].getValue('custrecordr7appbuildcustomer'));
                            // arrshipDate.push(searchResults[j].getValue('custrecordr7appbuildshippingdate'));
                            // arrhbrName.push(searchResults[j].getValue('name'));
                        }
                    }
                    objSalesOrder[arrSalesOrderId[i]] = {
                        hbr: arrhbr//,
                        // customer: arrcust,
                        // shipDate: arrshipDate,
                        // name: arrhbrName
                    }
                }

                for(var i = 0; i < arrSalesOrderId.length; i++){
                    var salesOrderRec = nlapiLoadRecord('salesorder', arrSalesOrderId[i]);

                    var soLinksCount = salesOrderRec.getLineItemCount('links');
                    var soLinesCount = salesOrderRec.getLineItemCount('item');

                    for(var p = 0; p < objSalesOrder[arrSalesOrderId[i]].hbr.length; p++){
                        var currHbrRec = nlapiLoadRecord('customrecordr7appliancebuildrequest',objSalesOrder[arrSalesOrderId[i]].hbr[p]);
                        var hbrUpdated = false;

                        var hbrName = currHbrRec.getFieldValue('name');
                        var customerId = currHbrRec.getFieldValue('custrecordr7appbuildcustomer');
                        var salesOrderId = currHbrRec.getFieldValue('custrecordr7appbuildsalesorder');
                        var shipDate = currHbrRec.getFieldValue('custrecordr7appbuildshippingdate');

                        if (!cu.IsNullOrEmpty(customerId) && !cu.IsNullOrEmpty(salesOrderId) && !cu.IsNullOrEmpty(shipDate)) {

                        for(var j = 1; j < soLinksCount; j++){
                            var linkType = salesOrderRec.getLineItemValue('links', 'type', j);
                            var linkId = salesOrderRec.getLineItemValue('links', 'id', j);

                            ScriptBase.Log.Debug('link line # ' + j + ' linktype ' + linkType + ' linktranid ' + linkId);

                            if(linkType == 'Revenue Arrangement'){
                                ScriptBase.Log.Debug('update revenue arrangement/element.');

                                for(var k = 1; k < soLinesCount; k++){
                                    var itemId = salesOrderRec.getLineItemValue('item','item',k);
                                    var catPurchased = salesOrderRec.getLineItemValue('item', 'custcolr7_category_purchased', k);
                                    var licenseIdText = salesOrderRec.getLineItemValue('item', 'custcolr7translicenseid', k);

                                    ScriptBase.Log.Debug('item line # ' + k + ' itemId ' + itemId + ' category ' + catPurchased);

                                    if (licenseIdText == hbrName && catPurchased == ScriptBase.Parameters.custscriptr7_hbr_rp_catpurchhardware) {
                                        var revElemId = GetRevenueElementId(linkId, itemId);
                                        var revPlanId = UpdateRevenuePlan(revElemId, shipDate);

                                        if (!cu.IsNullOrEmpty(revPlanId))
                                            hbrUpdated = true;
                                    }
                                }
                            }
                        }
                    }

                        if (hbrUpdated) {
                            currHbrRec.setFieldValue('custrecordr7appbuildrevplanupdated', 'T');
    
                            var recId = nlapiSubmitRecord(currHbrRec, null, true);
                        }

                    }

                }



                // for (var i = 0; i < searchResults.length; i++) {


                //     var currHbrRec = nlapiLoadRecord('customrecordr7appliancebuildrequest', searchResults[i].id); //2 points
                //     var hbrUpdated = false;

                //     var hbrName = currHbrRec.getFieldValue('name');
                //     var customerId = currHbrRec.getFieldValue('custrecordr7appbuildcustomer');
                //     var salesOrderId = currHbrRec.getFieldValue('custrecordr7appbuildsalesorder');
                //     var shipDate = currHbrRec.getFieldValue('custrecordr7appbuildshippingdate');

                //     ScriptBase.Log.Debug('hbrname ' + hbrName + ' customerid ' + customerId + ' salesorderid ' + salesOrderId + ' shipdate ' + shipDate);

                //     if (!cu.IsNullOrEmpty(customerId) && !cu.IsNullOrEmpty(salesOrderId) && !cu.IsNullOrEmpty(shipDate)) {
                //         var salesOrderRec = nlapiLoadRecord('salesorder', salesOrderId); //10 points
                //         var soLinksCount = salesOrderRec.getLineItemCount('links');
                //         var soLinesCount = salesOrderRec.getLineItemCount('item');

                //         for (var j = 1; j <= soLinksCount; j++) {
                //             var linkType = salesOrderRec.getLineItemValue('links', 'type', j);
                //             var linkId = salesOrderRec.getLineItemValue('links', 'id', j);

                //             ScriptBase.Log.Debug('link line # ' + j + ' linktype ' + linkType + ' linktranid ' + linkId);

                //             if (linkType == 'Revenue Arrangement') {
                //                 ScriptBase.Log.Debug('update revenue arrangement/element.');

                //                 for (var k = 1; k <= soLinesCount; k++) {
                //                     var itemId = salesOrderRec.getLineItemValue('item', 'item', k);
                //                     var catPurchased = salesOrderRec.getLineItemValue('item', 'custcolr7_category_purchased', k);
                //                     var licenseIdText = salesOrderRec.getLineItemValue('item', 'custcolr7translicenseid', k);

                //                     ScriptBase.Log.Debug('item line # ' + k + ' itemId ' + itemId + ' category ' + catPurchased);

                //                     if (licenseIdText == hbrName && catPurchased == ScriptBase.Parameters.custscriptr7_hbr_rp_catpurchhardware) {
                //                         var revElemId = GetRevenueElementId(linkId, itemId);
                //                         var revPlanId = UpdateRevenuePlan(revElemId, shipDate);

                //                         if (!cu.IsNullOrEmpty(revPlanId))
                //                             hbrUpdated = true;
                //                     }
                //                 }
                //             }
                //         }
                //     }

                //     if (hbrUpdated) {
                //         currHbrRec.setFieldValue('custrecordr7appbuildrevplanupdated', 'T');

                //         var recId = nlapiSubmitRecord(currHbrRec, null, true);
                //     }
                // }
            }
        } catch (err) {
            ScriptBase.Log.Error('Error in Modules.ProcessHbrShipment', err.toString());
            throw err;
        }
    };

    function GetHbrToProcess(savedSearchId) {
        ScriptBase.Log.Debug('Starting Modules.GetSearchResults');

        try {
            ScriptBase.CheckUsage(15);

            var savedSearchObj = nlapiLoadSearch(null, savedSearchId); //5 points
            var searchResults = McGladrey.ScriptUtilities.Search.GetAllResults(savedSearchObj); //10 points

            //Build search through code (replaced by saved search):
            //var filters = new Array();
            //filters.push(new nlobjSearchFilter('custrecordr7appbuildrevplanupdated', null, 'is', 'F'));
            //filters.push(new nlobjSearchFilter('custrecordr7appbuildshippingdate', null, 'isnotempty', null));

            //var columns = new Array();
            //columns.push(new nlobjSearchColumn('name'));
            //columns.push(new nlobjSearchColumn('custrecordr7appbuildcustomer'));
            //columns.push(new nlobjSearchColumn('custrecordr7appbuildsalesorder'));
            //columns.push(new nlobjSearchColumn('custrecordr7appbuildshippingdate'));

            //var searchResults = McGladrey.ScriptUtilities.Search.GetAllResults(nlapiCreateSearch('customrecordr7appliancebuildrequest', filters, columns)); //10 points

            return searchResults;
        } catch (err) {
            ScriptBase.Log.Error('Error getting data from Saved Search ID ' + savedSearchId.toString(), err.toString());
            throw err;
        }
    };

    function GetRevenueElementId(revArrId, itemId) {
        ScriptBase.Log.Debug('Starting Modules.GetRevenueElementId');

        try {
            var revArrRec = nlapiLoadRecord('revenuearrangement', revArrId); //10 points
            var revElemId = [];

            if (!cu.IsNullOrEmpty(revArrRec)) {
                var sublistName = 'revenueelement';
                var linesCount = revArrRec.getLineItemCount(sublistName);

                for (var i = 1; i <= linesCount; i++) {
                    if (revArrRec.getLineItemValue(sublistName, 'item', i) == itemId) {
                        ScriptBase.Log.Debug('revenueelement ' + revArrRec.getLineItemValue(sublistName, 'revenueelement', i));
                        revElemId.push(revArrRec.getLineItemValue(sublistName, 'revenueelement', i));

                        //ScriptBase.Log.Debug('start date: ' + revArrRec.getLineItemValue(sublistName, 'revrecenddate', i) + ' end date: ' + (revArrRec.getLineItemValue(sublistName, 'revrecenddate', i)));

                        //revArrRec.setLineItemValue(sublistName, 'revrecstartdate', i, shipDate);
                        //revArrRec.setLineItemValue(sublistName, 'revrecenddate', i, shipDate);

                        //var revArrId = nlapiSubmitRecord(revArrRec, true); //20 points

                        //ScriptBase.Log.Debug('submited record id ' + revArrId);
                        //ScriptBase.Log.Debug('start date: ' + revArrRec.getLineItemValue(sublistName, 'revrecenddate', i) + ' end date: ' + (revArrRec.getLineItemValue(sublistName, 'revrecenddate', i)));

                        //var revElemId = revArrRec.getLineItemValue(sublistName, 'revenueelement', i);
                        //var revElemNum = revArrRec.getLineItemText(sublistName, 'revenueelement', i);
                        //ScriptBase.Log.Debug(revElemId + ' ' + revElemNum);
                        //UpdateRevenuePlan(revElemNum, itemId);
                    }
                }
            }

            return revElemId;
        } catch (err) {
            ScriptBase.Log.Error('Error updating Revenue Element(s)', err.toString());
            throw err;
        }
    };

    function UpdateRevenuePlan(revElemId, shipDate) {
        ScriptBase.Log.Debug('Starting Modules.UpdateRevenuePlan');

        try {
            var filters = new Array();
            filters.push(new nlobjSearchFilter('createdfrom', null, 'anyof', revElemId));
            filters.push(new nlobjSearchFilter('revenueplantype', null, 'is', 'ACTUAL'));
            filters.push(new nlobjSearchFilter('status', null, 'anyof', ['NOTSTARTED', 'ONHOLD']));

            var columns = new Array();
            columns.push(new nlobjSearchColumn('internalid', null, null));
            columns.push(new nlobjSearchColumn('status', null, null));
            columns.push(new nlobjSearchColumn('createdfrom', null, null));
            columns.push(new nlobjSearchColumn('revenueplantype', null, null));

            var searchResults = McGladrey.ScriptUtilities.Search.GetAllResults(nlapiCreateSearch('revenueplan', filters, columns)); //10 points

            for (var i = 0; i < searchResults.length; i++) {
                var currRec = nlapiLoadRecord('revenueplan', searchResults[i].id); //10 points
                ScriptBase.Log.Debug('hold rev rec ' + currRec.getFieldValue('holdrevenuerecognition') + ' start date ' + currRec.getFieldValue('revrecstartdate') + ' end date ' + currRec.getFieldValue('revrecenddate'));

                currRec.setFieldValue('holdrevenuerecognition', 'F');
                currRec.setFieldValue('revrecstartdate', shipDate);
                currRec.setFieldValue('revrecenddate', shipDate);

                var recId = nlapiSubmitRecord(currRec, null, true);

                ScriptBase.Log.Debug('hold rev rec ' + currRec.getFieldValue('holdrevenuerecognition') + ' start date ' + currRec.getFieldValue('revrecstartdate') + ' end date ' + currRec.getFieldValue('revrecenddate'));

                return recId;
            }
        } catch (err) {
            ScriptBase.Log.Error('Error updating Revenue Plan(s)', err.toString());
            throw err;
        }
    };

    return {
        GetParameters: GetParameters,
        ProcessHbrShipment: ProcessHbrShipment
    };
})();