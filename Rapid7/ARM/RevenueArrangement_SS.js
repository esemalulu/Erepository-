/*
 * Author: Sa Ho (RSM US), Tyler Foss (RSM US)
 * Date: 6/1/2017, 10/25/2017
 * Description: When a Revenue Arrangement is created or edited, update the Revenue Elements' rule, plan, and forecast depending on products/services sold.
 * Revenue Arrangement User Events
 */

var ScriptBase;
var cu = McGladrey.CommonUtilities;

/*
 * Stores information related to the Revenue Arrangement record and Accouting Book. 
 */
var RevArrInfo = function () {
    this.AccountingBook = null,
    this.Source = null,
    this.RecordType = null,
    this.LineItemType = null,
    this.RecordId = null,
    //Contains the Source , Destination field for the Start Date
    this.StartDateMapping = {
        Source: null,
        Destination: null
    },
    //Contains the Source , Destination field for the End Date
    this.EndDateMapping = {
        Source: null,
        Destination: null
    },
    //Contains the Source , Destination field for the Forecast Start Date
    this.ForecastStartDateMapping = {
        Source: null,
        Destination: null
    },
    //Contains the Source , Destination field for the Forecast End Date
    this.ForecastEndDateMapping = {
        Source: null,
        Destination: null
    },

    this.ReferenceIdMapping = {
        Source: null,
        Destination: null
    },
    //Contains line item Source Ids (Key), maps to related record's line item unique key, holds dates values and channel/region to be set, related to Revenue Elements and Source Mapping
    this.KeyValues = []
};

/*
 * Stores individual line data (Key) with the related Source Id and Dates, related to Revenue Element, also used to store Revenue Arr. Source values
 */
var KeyValue = function() {
    this.Key = null,
    this.StartDate = null,
    this.EndDate = null,
    this.ForecastStartDate = null,
    this.ForecastEndDate  = null,
    this.Channel = null,
    this.Region = null,
    this.RefId = null,
    this.CreatePlansOn = null,
    this.RevRecRule = null,
    this.ForecastRevRecRule = null
};

var Events = {
    /*
     * Before Load
     */
    revArr_BeforeLoad: function (type, form, request) {
        ScriptBase = new McGladrey.Script.UserEvent('BeforeLoad', 'revArr_BeforeLoad', {
            Type: type,
            Form: form,
            Request: request
        });
        ScriptBase.Run([
            //insert modules here, ex: 
            //Modules.ModuleName.ProcessMethod
        ]);
    },

    /*
     * Before Submit
     */
    revArr_BeforeSubmit: function (type) {
        ScriptBase = new McGladrey.Script.UserEvent('BeforeSubmit', 'revArr_BeforeSubmit', {
            Type: type
        });
        ScriptBase.Run([
            //insert modules here, ex: 
            Modules.UpdateRevenueElement.Process,
            Modules.UpdateRevRecRule.Process
        ]);
    },

    /*
     * After Submit
     */
    revArr_AfterSubmit: function (type) {
        ScriptBase = new McGladrey.Script.UserEvent('AfterSubmit', 'revArr_AfterSubmit', {
            Type: type
        });
        ScriptBase.Run([
            //insert modules here, ex: 
            Modules.BundledServiceAutomation.Process,
            Modules.TriggerPushOfASCProcess.Process,
            Modules.SetRevenueArrSrcFields.Process
        ]);
    }
};

var Modules = {
    
    /*
     * Updates the Revenue Recognition Rule for Revenue Element line items with Cash Sale or Invoice sources
     */
    UpdateRevRecRule: (function (){
        //Private
        var func = 'UpdateRevRecRule';

        /*
         * Main processing method.
         */
        function process() {
            var acctBook = nlapiGetFieldValue('accountingbook');
            if (!ScriptBase.CU.IsNullOrEmpty(acctBook)) {
                try {
                    updateRevRecRule(acctBook);
                }
                catch (err) {
                    if (err instanceof nlobjError || err.getCode()) ScriptBase.Log.ErrorObject('Unknown Error Occurred During Module: ' + func, err);
                    else ScriptBase.Log.Error('Unknown Error Occurred During Module: ' + func, err.message);
                    throw err;
                }
            }
            else {
                ScriptBase.Log.Debug('ERROR', 'Accouting Book is empty');
            }
        };

        /*
         * Loops through Revenue Element line items, Determines which Source/Destination Fields to grab from the Source record, sets fields on Revenue Element, saves/submits
         */
        function updateRevRecRule(acctBook) {
            var info = new RevArrInfo();
            info.AccountingBook = acctBook;

            var count = nlapiGetLineItemCount('revenueelement');
            if (!ScriptBase.CU.IsNullOrEmpty(count) && count >= 1) {
                //Grab Source record, lookup record type & id, set line item type, lookup Source/Dest. fields
                info.Source = nlapiGetLineItemValue('revenueelement', 'source', 1);
                info.RecordType = getRecordType(info.Source);
                info.LineItemType = getLineItemType(info.RecordType);
                info.RecordId = getRecordId(info.Source, info.RecordType);

                //Update the Revenue Recognition Rule on the RA based on the Cash Sale/Invoice/Credit Memo record fields
                if (!ScriptBase.CU.IsNullOrEmpty(info.RecordType) && !ScriptBase.CU.IsNullOrEmpty(info.RecordId) && (info.RecordType == 'cashsale' || info.RecordType == 'invoice' || info.RecordType == 'creditmemo' || info.RecordType == 'returnauthorization')) {
                    var rec = nlapiLoadRecord(info.RecordType, info.RecordId);
                    var recastTrans = rec.getFieldValue('custbody_r7_recast_tran');
                    var targetBook = rec.getFieldValue('custbody_r7_target_book');

                    //Set Revenue Recognition Rule fields to One Time Event, setting Create Plans On too
                    if (recastTrans == 'T' && targetBook == 1 && info.AccountingBook != 1 || recastTrans == 'T' && targetBook == 2 && info.AccountingBook != 2) {
                        for (var i = 1; i <= count; i++) {
                            nlapiSelectLineItem('revenueelement', i);
                            nlapiSetCurrentLineItemValue('revenueelement', 'revenuerecognitionrule', 6);
                            nlapiSetCurrentLineItemValue('revenueelement', 'revrecforecastrule', 6);
                            nlapiSetCurrentLineItemValue('revenueelement', 'createrevenueplanson', -1);
                            nlapiCommitLineItem('revenueelement');
                        }
                    }
                    else {
                        ScriptBase.Log.Error('No Update', 'RA: ' + nlapiGetRecordId() + ', Target Book: ' + targetBook + ', Recast Trans: ' + recastTrans);
                    }
                }
                else {
                    ScriptBase.Log.Error('No Update to RA: ' + nlapiGetRecordId(), JSON.stringify(info));
                }
            }
        }

        /*
         * Returns the record id given the Source and record type
         */    
        function getRecordId(source, recordType) {
            if (!ScriptBase.CU.IsNullOrEmpty(source) && !ScriptBase.CU.IsNullOrEmpty(recordType)) {
                var temp = source.split('#');
                var tranid = temp[1];

                var results = [];
                var filters = [];
                var columns = [];

                filters.push(new nlobjSearchFilter('tranid', null, 'is', tranid));
                columns.push(new nlobjSearchColumn('internalid'));

                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch(recordType, filters, columns));

                return results[0].getValue('internalid');
            }
            else {
                return '';
            }
        }

        /*
         * Returns the line item type based on the record type
         */    
        function getLineItemType(recordType) {
            if (recordType == 'invoice' || recordType == 'cashsale' || recordType == 'creditmemo' || recordType == 'returnauthorization') {
                return 'item';
            }
            else {
                return '';
            }
        };

        /*
         * Returns the record type of the Source (line item), cannot directly get the record type or id
         */
        function getRecordType(source) {
            var temp = source.split(' ');
            var type = temp[0];

            if (type == 'Invoice') {
                return 'invoice';
            }
            else if (type == 'Cash') {
                return 'cashsale';
            }
            else if (type == 'Credit') {
                return 'creditmemo';
            }
            else if (type == 'Return') {
                return 'returnauthorization';
            }
            else {
                return '';
            }
        };

        //Public
        return {
            Process: function () {

                //logic to determine if module should continue
                var continueProcessing = false;
                 continueProcessing = true;

                if (continueProcessing) {
                    ScriptBase.Log.Audit('Module Execution Starting', func);
                    try {
                        var startBench = ScriptBase.Log.StartBenchmark(func, ScriptBase.Client);
                        process();
                        ScriptBase.Log.EndBenchmark(func, startBench, ScriptBase.Client);
                    }
                    catch (err) {
                        if (err instanceof nlobjError) {
                            ScriptBase.Log.ErrorObject('Unknown nlobjError during module: ' + func, err);
                        }
                        else {
                            ScriptBase.Log.Error('Unknown Error Occurred during module: ' + func, err.message);
                        }

                        throw err;
                    }
                }
                else {
                    ScriptBase.Log.Audit('Module Execution Cancelled', func);
                }
            }
        };
    })(),



    /*
     * Grabs fields from the Revenue Arrangement Source line item (Revenue Element) record then sets/updates these fields on the Rev. Arr.
     * Total Usage: 
     */
    SetRevenueArrSrcFields: (function () {
        //Private
        var func = 'SetRevenueArrSrcFields';

        /*
         * Main processing method.
         */
        function process() {
            var id = nlapiGetRecordId();
            var type = nlapiGetRecordType();
            var record = nlapiLoadRecord(type, id);
            if (!ScriptBase.CU.IsNullOrEmpty(record)) {
                try {
                    setRevArrSourceFields(record);
                }
                catch (err) {
                    if (err instanceof nlobjError || err.getCode()) ScriptBase.Log.ErrorObject('Unknown Error Occurred During Module: ' + func, err);
                    else ScriptBase.Log.Error('Unknown Error Occurred During Module: ' + func, err.message);
                    throw err;
                }
            }
            else {
                ScriptBase.Log.Debug('ERROR', 'Accouting Book is empty');
            }
        };

        /*
         * Grabs the Channel/Region/Reference Id fields from the Source line item record then sets/updates these fields on the Rev. Arr. 
         */
        function setRevArrSourceFields(record) {
            var count = record.getLineItemCount('revenueelement');
            var updated = false;
            if (!ScriptBase.CU.IsNullOrEmpty(count) && count >= 1) {      
                for (var i = 1; i <= count; i++) {
                    //Grab Source record, find the matching Rev. Arr. Source record, grab information, set fields on the Revenue Element
                    var source = record.getLineItemValue('revenueelement', 'source', i);
                    var foundRevArrSource = searchForRevArrSourceById(source);
                    if (foundRevArrSource) {
                        updated = true;
                        if (!ScriptBase.CU.IsNullOrEmpty(foundRevArrSource.Channel)) {
                            record.selectLineItem('revenueelement', i);
                            record.setCurrentLineItemValue('revenueelement', 'custcol_r7_besp_category', foundRevArrSource.Channel);
                            record.commitLineItem('revenueelement');
                        }
                        if (!ScriptBase.CU.IsNullOrEmpty(foundRevArrSource.Region)) {
                            record.selectLineItem('revenueelement', i);
                            record.setCurrentLineItemValue('revenueelement', 'custcol_r7_shipping_country', foundRevArrSource.Region);
                            record.commitLineItem('revenueelement');
                        }
                        if (!ScriptBase.CU.IsNullOrEmpty(foundRevArrSource.RefId) && foundRevArrSource.RefId.length <= 20) {
                            record.selectLineItem('revenueelement', i);
                            record.setCurrentLineItemValue('revenueelement', 'referenceid', foundRevArrSource.RefId);
                            record.commitLineItem('revenueelement');
                        }
                        if (!ScriptBase.CU.IsNullOrEmpty(foundRevArrSource.CreatePlansOn)) {
                            record.selectLineItem('revenueelement', i);
                            record.setCurrentLineItemValue('revenueelement', 'createrevenueplanson', foundRevArrSource.CreatePlansOn);
                            record.commitLineItem('revenueelement');
                        }
                        if (!ScriptBase.CU.IsNullOrEmpty(foundRevArrSource.RevRecRule)) {
                            record.selectLineItem('revenueelement', i);
                            record.setCurrentLineItemValue('revenueelement', 'revenuerecognitionrule', foundRevArrSource.RevRecRule);
                            record.commitLineItem('revenueelement');
                        }
                        if (!ScriptBase.CU.IsNullOrEmpty(foundRevArrSource.ForecastRevRecRule)) {
                            record.selectLineItem('revenueelement', i);
                            record.setCurrentLineItemValue('revenueelement', 'revrecforecastrule', foundRevArrSource.ForecastRevRecRule);
                            record.commitLineItem('revenueelement');
                        }
                        if (!ScriptBase.CU.IsNullOrEmpty(foundRevArrSource.ForecastStartDate)) {
                            record.selectLineItem('revenueelement', i);
                            record.setCurrentLineItemValue('revenueelement', 'forecaststartdate', foundRevArrSource.ForecastStartDate);
                            record.commitLineItem('revenueelement');
                        }
                        if (!ScriptBase.CU.IsNullOrEmpty(foundRevArrSource.ForecastEndDate)) {
                            record.selectLineItem('revenueelement', i);
                            record.setCurrentLineItemValue('revenueelement', 'forecastenddate', foundRevArrSource.ForecastEndDate);
                            record.commitLineItem('revenueelement');
                        }
                    }
                    else {
                        ScriptBase.Log.Debug('DEBUG', 'No Revenue Arrangement Source found for: ' + source + ' (Line: ' + i + ')');
                    }
                }
                
                //Submit record if it was updated
                if (updated) {
                    var id = nlapiSubmitRecord(record);
                }
                else {
                    ScriptBase.Log.Error('ERROR', 'No Revenue Arrangement Source found; No Update made to RA: ' + record.getId());
                }
            }
        };

        /*
         * Given the Source from the Revenue Element line item, search for the related Revenue Arrangement Source Record
         * Returns KeyValue object if RAS is found, false otherwise
         */
        function searchForRevArrSourceById(source) {
            //Check to make sure the source is an Id
            if (isNaN(source)) {
                return false;
            }
            if (!ScriptBase.CU.IsNullOrEmpty(source)) {
                var results = [];
                var filters = [];
                var columns = [];
            
                filters.push(new nlobjSearchFilter('internalid', null, 'is', source));
                columns.push(new nlobjSearchColumn('custrecord_ras_channel'));
                columns.push(new nlobjSearchColumn('custrecord_ras_region'));
                columns.push(new nlobjSearchColumn('custrecord_ras_reference_id'));
                columns.push(new nlobjSearchColumn('custrecord_r7_custom_create_plans_on'));
                columns.push(new nlobjSearchColumn('custrecord_r7_rev_rec_rule'));
                columns.push(new nlobjSearchColumn('custrecord_r7_forecast_rule'));
                columns.push(new nlobjSearchColumn('custrecord_r7_forecast_start'));
                columns.push(new nlobjSearchColumn('custrecord_r7_forecast_end'));
                columns.push(new nlobjSearchColumn('custrecord_ras_unique_grouping_override'));

                //Return Sales Order Id with matching Order #
                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('customrecord_revenue_arrangement_source', filters, columns));

                if (!ScriptBase.CU.IsNullOrEmpty(results) && results.length == 1) {
                    var ras = new KeyValue();
                    ras.Channel = results[0].getValue('custrecord_ras_channel');
                    ras.Region = results[0].getValue('custrecord_ras_region');
                    ras.RefId = results[0].getValue('custrecord_ras_unique_grouping_override');
                    ras.CreatePlansOn = results[0].getValue('custrecord_r7_custom_create_plans_on');
                    ras.RevRecRule = results[0].getValue('custrecord_r7_rev_rec_rule');
                    ras.ForecastRevRecRule = results[0].getValue('custrecord_r7_forecast_rule');
                    ras.ForecastStartDate = results[0].getValue('custrecord_r7_forecast_start');
                    ras.ForecastEndDate = results[0].getValue('custrecord_r7_forecast_end');
                    return ras;
                }
                else {
                    ScriptBase.Log.Error('ERROR', 'Invalid result set, length: ' + results.length);
                    return false;
                }
            }
            else {
                return false;
            }
        };

        //Public
        return {
            Process: function () {

                //logic to determine if module should continue
                var continueProcessing = false;
                if (ScriptBase.Arguments.Type == 'create' || ScriptBase.Arguments.Type == 'edit') {
                    continueProcessing = true;
                }

                if (continueProcessing) {
                    ScriptBase.Log.Audit('Module Execution Starting', func);
                    try {
                        var startBench = ScriptBase.Log.StartBenchmark(func, ScriptBase.Client);
                        process();
                        ScriptBase.Log.EndBenchmark(func, startBench, ScriptBase.Client);
                    }
                    catch (err) {
                        if (err instanceof nlobjError) {
                            ScriptBase.Log.ErrorObject('Unknown nlobjError during module: ' + func, err);
                        }
                        else {
                            ScriptBase.Log.Error('Unknown Error Occurred during module: ' + func, err.message);
                        }

                        throw err;
                    }
                }
                else {
                    ScriptBase.Log.Audit('Module Execution Cancelled', func);
                }
            }
        };
    })(),

    /*
     * Based on the Accounting Book (Primary, 605, or 606): loops through the Revenue Element line items, loads the Source record, grabs related Source/Destination fields (based on the Revenue Arrangement Sourc Mapping List), sets Revenue Element line item fields accordingly. 
     * Total Usage: 
     */
    UpdateRevenueElement: (function () {
        //Private
        var func = 'UpdateRevenueElement';

        /*
         * Main processing method.
         */
        function process() {
            var acctBook = nlapiGetFieldValue('accountingbook');
            if (!ScriptBase.CU.IsNullOrEmpty(acctBook)) {
                try {
                    updateRevenueElement(acctBook);
                }
                catch (err) {
                    if (err instanceof nlobjError || err.getCode()) ScriptBase.Log.ErrorObject('Unknown Error Occurred During Module: ' + func, err);
                    else ScriptBase.Log.Error('Unknown Error Occurred During Module: ' + func, err.message);
                    throw err;
                }
            }
            else {
                ScriptBase.Log.Debug('ERROR', 'Accouting Book is empty');
            }
        };

        /*
         * Loops through Revenue Element line items, Determines which Source/Destination Fields to grab from the Source record, sets fields on Revenue Element, saves/submits
         */
        function updateRevenueElement(acctBook) {
            var info = new RevArrInfo();
            info.AccountingBook = acctBook;
            
            var count = nlapiGetLineItemCount('revenueelement');
            if (!ScriptBase.CU.IsNullOrEmpty(count) && count >= 1) {
                //Grab Source record, lookup record type & id, set line item type, lookup Source/Dest. fields
                info.Source = nlapiGetLineItemValue('revenueelement', 'source', 1);
                info.RecordType = getRecordType(info.Source);
                info.LineItemType = getLineItemType(info.RecordType);
                info.RecordId = getRecordId(info.Source, info.RecordType);

                //Get mapping related info
                getStartDateMapping(info);
                getEndDateMapping(info);
                getForecastStartDateMapping(info);
                getForecastEndDateMapping(info);
                getReferenceIdMapping(info);

                //Grab and set Source Ids for each Revenue Element line item, key value pair, dates to be set later                
                for (var i = 1; i <= count; i++) {
                    var sourceId = nlapiGetLineItemValue('revenueelement', 'sourceid', i);
                    var keyObj = new KeyValue();
                    keyObj.Key = sourceId;
                    info.KeyValues.push(keyObj);
                }

                //If all necesesary info was found, grab & store Accounting Book related Date values
                if (!ScriptBase.CU.IsNullOrEmpty(info.RecordId) && !ScriptBase.CU.IsNullOrEmpty(info.RecordType) && !ScriptBase.CU.IsNullOrEmpty(info.LineItemType)) {
                    var rec = nlapiLoadRecord(info.RecordType, info.RecordId);
                    var recLineCount = rec.getLineItemCount(info.LineItemType);
                        
                    //Find matching key value from the Rev. Arr. on the Source record line item, set the Start/End values
                    info.KeyValues.forEach(function (value) {
                        for (var i = 1; i <= recLineCount; i++) {
                            var currLineKey = rec.getLineItemValue(info.LineItemType, 'lineuniquekey', i);
                            if (currLineKey == value.Key) {
                                value.StartDate = rec.getLineItemValue(info.LineItemType, info.StartDateMapping.Source, i);
                                value.EndDate = rec.getLineItemValue(info.LineItemType, info.EndDateMapping.Source, i);
                                value.ForecastStartDate = rec.getLineItemValue(info.LineItemType, info.ForecastStartDateMapping.Source, i);
                                value.ForecastEndDate = rec.getLineItemValue(info.LineItemType, info.ForecastEndDateMapping.Source, i);
                                value.RefId = rec.getLineItemValue(info.LineItemType, info.ReferenceIdMapping.Source, i);
                                break;
                            }    
                        }
                    });
                        
                    //Find matching key value on Rev. Arr. and set updated Date values from Source record on Revenue Element
                    info.KeyValues.forEach(function (value) {
                        for (var i = 1; i <= count; i++) {
                            var currSourceId = nlapiGetLineItemValue('revenueelement', 'sourceid', i);
                            if (currSourceId == value.Key) {
                                //Set date values
                                if (!ScriptBase.CU.IsNullOrEmpty(value.StartDate)) {
                                    nlapiSelectLineItem('revenueelement', i);
                                    nlapiSetCurrentLineItemValue('revenueelement', info.StartDateMapping.Destination, value.StartDate);
                                    nlapiCommitLineItem('revenueelement');
                                }
                                if (!ScriptBase.CU.IsNullOrEmpty(value.EndDate)) {
                                    nlapiSelectLineItem('revenueelement', i);
                                    nlapiSetCurrentLineItemValue('revenueelement', info.EndDateMapping.Destination, value.EndDate);
                                    nlapiCommitLineItem('revenueelement');
                                }
                                if (!ScriptBase.CU.IsNullOrEmpty(value.ForecastStartDate)) {
                                    nlapiSelectLineItem('revenueelement', i);
                                    nlapiSetCurrentLineItemValue('revenueelement', info.ForecastStartDateMapping.Destination, value.ForecastStartDate);
                                    nlapiCommitLineItem('revenueelement');
                                }
                                if (!ScriptBase.CU.IsNullOrEmpty(value.ForecastEndDate)) {
                                    nlapiSelectLineItem('revenueelement', i);
                                    nlapiSetCurrentLineItemValue('revenueelement', info.ForecastEndDateMapping.Destination, value.ForecastEndDate);
                                    nlapiCommitLineItem('revenueelement');
                                }
                                if (!ScriptBase.CU.IsNullOrEmpty(value.RefId)) {
                                    nlapiSelectLineItem('revenueelement', i);
                                    nlapiSetCurrentLineItemValue('revenueelement', info.ReferenceIdMapping.Destination, value.RefId);
                                    nlapiCommitLineItem('revenueelement');
                                }
                                break;
                            }
                        }
                    });
                }
                else {
                    ScriptBase.Log.Error('No Update to RA: ' + nlapiGetRecordId(), JSON.stringify(info));
                }
            }
        };
           
        /*
         * Get & Set the End Date Source and Destination fields, based on record type and accounting book
         * @param info : Revenue Arrangement object
         */
        function getEndDateMapping(info) {
            //Default for Rev. Arr. record
            info.EndDateMapping.Destination = 'revrecenddate';

            var results = [];
            var filters = [];
            var columns = [];
            var runSearch = true;

            //End Date filter
            filters.push(new nlobjSearchFilter('custrecord_ra_destination_id', null, 'is', 'revrecenddate'));

            //Record filter
            if (info.RecordType == 'salesorder') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 31));
            }
            else if (info.RecordType == 'invoice') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 7));
            }
            else if (info.RecordType == 'creditmemo') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 10));
            }
            else if (info.RecordType == 'cashsale') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 5));
            }
            else if (info.RecordType == 'returnauthorization') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 33));
            }
            else {
                runSearch = false;
            }

            //Accounting Book filter
            if (info.AccountingBook == 1) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 1));
            }
            else if (info.AccountingBook == 2) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 2));
            }
            else if (info.AccountingBook == 3) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 3));
            }
            else {
                runSearch = false;
            }

            //Search and set Source Mapping
            columns.push(new nlobjSearchColumn('custrecord_ra_source_field_id'));

            if (runSearch) {
                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('customrecord_revenue_arrangement_source_', filters, columns));
                if (!ScriptBase.CU.IsNullOrEmpty(results) && results.length >= 1) {
                    info.EndDateMapping.Source = results[0].getValue('custrecord_ra_source_field_id');
                }
            }

        };

        /*
         * Search for Start Date Source field, based on record type and accounting book
         * @param info : Revenue Arrangement object
         */
        function getStartDateMapping(info) {
            //Default Start Date Destination for Rev. Arr. record
            info.StartDateMapping.Destination = 'revrecstartdate';

            var results = [];
            var filters = [];
            var columns = [];
            var runSearch = true;

            //Start Date filter
            filters.push(new nlobjSearchFilter('custrecord_ra_destination_id', null, 'is', 'revrecstartdate'));

            //Record filter
            if (info.RecordType == 'salesorder') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 31));
            }
            else if (info.RecordType == 'invoice') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 7));
            }
            else if (info.RecordType == 'creditmemo') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 10));
            }
            else if (info.RecordType == 'cashsale') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 5));
            }
            else if (info.RecordType == 'returnauthorization') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 33));
            }
            else {
                runSearch = false;
            }

            //Accounting Book filter
            if (info.AccountingBook == 1) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 1));
            }
            else if (info.AccountingBook == 2) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 2));
            }
            else if (info.AccountingBook == 3) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 3));
            }
            else {
                runSearch = false;
            }

            //Search and set Source Mapping
            columns.push(new nlobjSearchColumn('custrecord_ra_source_field_id'));

            if (runSearch) {
                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('customrecord_revenue_arrangement_source_', filters, columns));
                if (!ScriptBase.CU.IsNullOrEmpty(results) && results.length >= 1) {
                    info.StartDateMapping.Source = results[0].getValue('custrecord_ra_source_field_id');
                }
            }

        };

        /*
         * Search for Forecast Start Date Source Fields, based on record type and accounting book
         * @param info : Revenue Arrangement object
         */
        function getForecastStartDateMapping(info) {
            //Default Forecast Start Date Destination for Rev. Arr. record
            info.ForecastStartDateMapping.Destination = 'forecaststartdate';

            var results = [];
            var filters = [];
            var columns = [];
            var runSearch = true;

            //Start Date filter
            filters.push(new nlobjSearchFilter('custrecord_ra_destination_id', null, 'is', 'forecaststartdate'));

            //Record filter
            if (info.RecordType == 'salesorder') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 31));
            }
            else if (info.RecordType == 'invoice') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 7));
            }
            else if (info.RecordType == 'creditmemo') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 10));
            }
            else if (info.RecordType == 'cashsale') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 5));
            }
            else if (info.RecordType == 'returnauthorization') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 33));
            }
            else {
                runSearch = false;
            }

            //Accounting Book filter
            if (info.AccountingBook == 1) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 1));
            }
            else if (info.AccountingBook == 2) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 2));
            }
            else if (info.AccountingBook == 3) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 3));
            }
            else {
                runSearch = false;
            }

            //Search and set Source Mapping
            columns.push(new nlobjSearchColumn('custrecord_ra_source_field_id'));

            if (runSearch) {
                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('customrecord_revenue_arrangement_source_', filters, columns));
                if (!ScriptBase.CU.IsNullOrEmpty(results) && results.length >= 1) {
                    info.ForecastStartDateMapping.Source = results[0].getValue('custrecord_ra_source_field_id');
                }
            }

        };

        /*
         * Search for Forecast Start Date Source Fields, based on record type and accounting book
         * @param info : Revenue Arrangement object
         */
        function getForecastEndDateMapping(info) {
            //Default Forecast Start Date Destination for Rev. Arr. record
            info.ForecastEndDateMapping.Destination = 'forecastenddate';

            var results = [];
            var filters = [];
            var columns = [];
            var runSearch = true;

            //Start Date filter
            filters.push(new nlobjSearchFilter('custrecord_ra_destination_id', null, 'is', 'forecastenddate'));

            //Record filter
            if (info.RecordType == 'salesorder') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 31));
            }
            else if (info.RecordType == 'invoice') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 7));
            }
            else if (info.RecordType == 'creditmemo') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 10));
            }
            else if (info.RecordType == 'cashsale') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 5));
            }
            else if (info.RecordType == 'returnauthorization') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 33));
            }
            else {
                runSearch = false;
            }

            //Accounting Book filter
            if (info.AccountingBook == 1) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 1));
            }
            else if (info.AccountingBook == 2) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 2));
            }
            else if (info.AccountingBook == 3) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 3));
            }
            else {
                runSearch = false;
            }

            //Search and set Source Mapping
            columns.push(new nlobjSearchColumn('custrecord_ra_source_field_id'));

            if (runSearch) {
                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('customrecord_revenue_arrangement_source_', filters, columns));
                if (!ScriptBase.CU.IsNullOrEmpty(results) && results.length >= 1) {
                    info.ForecastEndDateMapping.Source = results[0].getValue('custrecord_ra_source_field_id');
                }
                
            }
            
        };
        
        /*
         * Search for Reference Id Fields, based on record type and accounting book
         * @param info : Revenue Arrangement object
         */
        function getReferenceIdMapping(info) {
            //Default  Reference Id Destination for Rev. Arr. record
            info.ReferenceIdMapping.Destination = 'referenceid';

            var results = [];
            var filters = [];
            var columns = [];
            var runSearch = true;

            //Destination filter
            filters.push(new nlobjSearchFilter('custrecord_ra_destination_id', null, 'is', 'referenceid'));

            //Record filter
            if (info.RecordType == 'salesorder') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 31));
            }
            else if (info.RecordType == 'invoice') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 7));
            }
            else if (info.RecordType == 'creditmemo') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 10));
            }
            else if (info.RecordType == 'cashsale') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 5));
            }
            else if (info.RecordType == 'returnauthorization') {
                filters.push(new nlobjSearchFilter('custrecord_ra_source_transaction_type', null, 'is', 33));
            }
            else {
                runSearch = false;
            }

            //Accounting Book filter
            if (info.AccountingBook == 1) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 1));
            }
            else if (info.AccountingBook == 2) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 2));
            }
            else if (info.AccountingBook == 3) {
                filters.push(new nlobjSearchFilter('custrecord_accountingbook', null, 'is', 3));
            }
            else {
                runSearch = false;
            }

            //Search and set Source Mapping
            columns.push(new nlobjSearchColumn('custrecord_ra_source_field_id'));

            if (runSearch) {
                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('customrecord_revenue_arrangement_source_', filters, columns));
                if (!ScriptBase.CU.IsNullOrEmpty(results) && results.length >= 1) {
                    info.ReferenceIdMapping.Source = results[0].getValue('custrecord_ra_source_field_id');
                }
            }

        };

        /*
         * Returns the record id given the Source and record type
         */
        function getRecordId(source, recordType) {
            if (!ScriptBase.CU.IsNullOrEmpty(source) && !ScriptBase.CU.IsNullOrEmpty(recordType)) {
                var temp = source.split('#');
                var tranid = temp[1];

                var results = [];
                var filters = [];
                var columns = [];

                filters.push(new nlobjSearchFilter('tranid', null, 'is', tranid));
                columns.push(new nlobjSearchColumn('internalid'));

                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch(recordType, filters, columns));

                return results[0].getValue('internalid');
            }
            else {
                return '';
            }
        }

        /*
         * Returns the line item type based on the record type
         */    
        function getLineItemType(recordType) {
            if (recordType == 'salesorder' || recordType == 'invoice' || recordType == 'creditmemo' || recordType == 'cashsale' || recordType == 'returnauthorization') {
                return 'item';
            }
            else {
                return '';
            }
        };

        /*
         * Returns the record type of the Source (line item), cannot directly get the record type or id
         */
        function getRecordType(source) {
            var temp = source.split(' ');
            var type = temp[0];

            if (type == 'Sales') {
                return 'salesorder';
            }
            else if (type == 'Invoice') {
                return 'invoice';
            }
            else if (type == 'Credit') {
                return 'creditmemo';
            }
            else if (type == 'Cash') {
                return 'cashsale';
            }
            else if (type == 'Return') {
                return 'returnauthorization';
            }
            else {
                return '';
            }
        };

        /*
         * Given the Source from the Revenue Element line item, search for the related Cash Sale Id
         */
        function searchForCashSaleByTrandId(source) {
            if (!ScriptBase.CU.IsNullOrEmpty(source)) {
                var temp = source.split('#');
                var tranid = temp[1];

                var results = [];
                var filters = [];
                var columns = [];

                filters.push(new nlobjSearchFilter('tranid', null, 'is', tranid));
                columns.push(new nlobjSearchColumn('internalid'));

                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('cashsale', filters, columns));

                return results[0].getValue('internalid');
            }
            else {
                return '';
            }
        }

        /*
         * Given the Source from the Revenue Element line item, search for the related Credit Memo Id
         */
        function searchForCreditMemoByTranId(source) {
            if (!ScriptBase.CU.IsNullOrEmpty(source)) {
                var temp = source.split('#');
                var tranid = temp[1];

                var results = [];
                var filters = [];
                var columns = [];

                filters.push(new nlobjSearchFilter('tranid', null, 'is', tranid));
                columns.push(new nlobjSearchColumn('internalid'));

                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('creditmemo', filters, columns));

                return results[0].getValue('internalid');
            }
            else {
                return '';
            }
        };

        /*
         * Given the Source from the Revenue Element line item, search for the related Invoice Id
         */
        function searchForInvoiceByTranId(source) {
            if (!ScriptBase.CU.IsNullOrEmpty(source)) {
                var temp = source.split('#');
                var tranid = temp[1];

                var results = [];
                var filters = [];
                var columns = [];

                filters.push(new nlobjSearchFilter('tranid', null, 'is', tranid));
                columns.push(new nlobjSearchColumn('internalid'));

                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('invoice', filters, columns));

                return results[0].getValue('internalid');
            }
            else {
                return '';
            }
        };

        /*
         * Given the Source from the Revenue Element line item, search for the related Sales Order Id
         */
        function searchForSalesOrderByTranId(source) {
            if (!ScriptBase.CU.IsNullOrEmpty(source)) {
                var temp = source.split('#');
                var tranid = temp[1];

                //Search for related Sales Order Id using the Order # (tranid)
                var results = [];
                var filters = [];
                var columns = [];

                filters.push(new nlobjSearchFilter('tranid', null, 'is', tranid));
                columns.push(new nlobjSearchColumn('internalid'));

                //Return Sales Order Id with matching Order #
                results = McGladrey.ScriptUtilities.Search.GetAllResults(new nlapiCreateSearch('salesorder', filters, columns));

                return results[0].getValue('internalid');
            }
            else {
                return '';
            }
        };

        //Public
        return {
            Process: function () {

                //logic to determine if module should continue
                var continueProcessing = false;
                if (ScriptBase.Arguments.Type == 'create' || ScriptBase.Arguments.Type == 'edit') {
                    continueProcessing = true;
                }

                if (continueProcessing) {
                    ScriptBase.Log.Audit('Module Execution Starting', func);
                    try {
                        var startBench = ScriptBase.Log.StartBenchmark(func, ScriptBase.Client);
                        process();
                        ScriptBase.Log.EndBenchmark(func, startBench, ScriptBase.Client);
                    }
                    catch (err) {
                        if (err instanceof nlobjError) {
                            ScriptBase.Log.ErrorObject('Unknown nlobjError during module: ' + func, err);
                        }
                        else {
                            ScriptBase.Log.Error('Unknown Error Occurred during module: ' + func, err.message);
                        }

                        throw err;
                    }
                }
                else {
                    ScriptBase.Log.Audit('Module Execution Cancelled', func);
                }
            }
        };
    })(),

    /*
     * @author Sa Ho
     * @param null
     * @return null
     * @description On a Revenue Arrangement, if (1) Related Accounting Book has "Bundled Service Automation" checked,
     *              and (2) Revenue Elements contain at least one Service Item and one Software Item
     *              are true, update the Revenue Revenue Arrangement and Revenue Element(s).
     * @since 6/9/2017
     * Usage: 20 points
     */
    BundledServiceAutomation: (function () {
        var func = 'BundledServiceAutomation';

        function Process() {
            GetParameters();

            var rec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()); //10 points

            if (!cu.IsNullOrEmpty(rec)) {
                var acctBookId = rec.getFieldValue('accountingbook');

                if (!cu.IsNullOrEmpty(acctBookId)) {
                    var acctBookRec = nlapiLoadRecord('accountingbook', acctBookId); //10 points

                    //Continue processing if the Accounting Book has "Bundled Service Automation" checkbox marked
                    if (acctBookRec.getFieldValue('custrecord_bundled_service_automation') == 'T') {
                        var sublistName = 'revenueelement';
                        var linesCount = rec.getLineItemCount(sublistName);

                        var hasServiceItem = false;
                        var hasSoftwareItem = false;
                        var lineAltRevInfo = [];

                        var searchResults = GetItemData();

                        if (!cu.IsNullOrEmpty(searchResults)) {
                            for (var j = 0; j < searchResults.length; j++) {
                                var currResult = searchResults[j];

                                var itemData = {
                                    'Line': currResult.getValue('line'),
                                    'Category': currResult.getValue('custitem_r7_bundled_category', 'item'),
                                    'RevRecPlan': currResult.getValue('custitem_alt_create_plans_on', 'item'),
                                    'RevRecRule': currResult.getValue('custitem_alt_revenue_rule', 'item'),
                                    'RevRecForecast': currResult.getValue('custitem_alt_revenue_forecast_rule', 'item')
                                };

                                lineAltRevInfo.splice(currResult.getValue('line'), 0, itemData);

                                if (currResult.getValue('custitem_r7_bundled_category', 'item') == ScriptBase.Parameters.custscriptr7_ra_bsa_itemcatservice && !hasServiceItem)
                                    hasServiceItem = true;

                                if (currResult.getValue('custitem_r7_bundled_category', 'item') == ScriptBase.Parameters.custscriptr7_ra_bsa_itemcatsoftware && !hasSoftwareItem)
                                    hasSoftwareItem = true;
                            }
                        }

                        //Update Revenue Arrangement and Revenue Element
                        if (hasServiceItem && hasSoftwareItem) {
                            UpdateRevenueElement(linesCount, sublistName, lineAltRevInfo, rec);
                        }
                    }

                    else { ScriptBase.Log.Audit('Accounting Book Check', 'Bundled Service Automation disabled (not checked). No further processing.'); }
                }
            }
        };

        /*
         * @author Sa Ho
         * @param null
         * @return null
         * @description Get script parameters' values for use in the script.
         * @since 6/9/2017
         */
        function GetParameters() {
            ScriptBase.GetParameters([
                'custscriptr7_ra_bsa_itemcatservice',
                'custscriptr7_ra_bsa_itemcatsoftware'
            ]);
        };

        /*
         * @author Sa Ho
         * @param null
         * @return null
         * @description Create a search to get Item(s) data.
         * @since 6/9/2017
         * Usage: 10 points
         */
        function GetItemData() {
            var filters = [];
            filters.push(new nlobjSearchFilter('internalid', null, 'anyof', nlapiGetRecordId()));

            var columns = [];
            columns.push(new nlobjSearchColumn('line'));
            columns.push(new nlobjSearchColumn('internalid', 'item'));
            columns.push(new nlobjSearchColumn('itemid', 'item'));
            columns.push(new nlobjSearchColumn('custitem_r7_bundled_category', 'item'));
            columns.push(new nlobjSearchColumn('custitem_alt_create_plans_on', 'item'));
            columns.push(new nlobjSearchColumn('custitem_alt_revenue_rule', 'item'));
            columns.push(new nlobjSearchColumn('custitem_alt_revenue_forecast_rule', 'item'));

            return McGladrey.ScriptUtilities.Search.GetAllResults(nlapiCreateSearch(nlapiGetRecordType(), filters, columns)); //10 points
        };

        /*
         * @author Sa Ho
         * @param linesCount (total number of lines/Revenue Elements),
         *        sublistName (Revenue Element sublist),
         *        lineAltRevInfo (Item data, including the alt rev rec data), 
         *        rec (the Revenue Arrangement record)
         * @return null
         * @description Update Revenue Element where (1) "Revenue Plan Status" is NOTSTARTED
         *              and (2) where the Item has a "Bundled Category" of Service
         *              are true with the Alternate Rev Rec plan, rule, and forecast.
         *              Check the "Non-Standard Service" checkbox on the Revenue Arrangement.
         * @since 6/9/2017
         * Usage: 20 points
         */
        function UpdateRevenueElement(linesCount, sublistName, lineAltRevInfo, rec) {
            for (var k = 1; k <= linesCount; k++) {
                if (rec.getLineItemValue(sublistName, 'revenueplanstatus', k) == 'NOTSTARTED' && lineAltRevInfo[k].Category == ScriptBase.Parameters.custscriptr7_ra_bsa_itemcatservice) {
                    //Set Rev Rec fields to alternate values for Service items
                    rec.setLineItemValue(sublistName, 'createrevenueplanson', k, lineAltRevInfo[k].RevRecPlan);
                    rec.setLineItemValue(sublistName, 'revenuerecognitionrule', k, lineAltRevInfo[k].RevRecRule);
                    rec.setLineItemValue(sublistName, 'revrecforecastrule', k, lineAltRevInfo[k].RevRecForecast);

                    //Mark "Non-Standard Service" checkbox
                    rec.setFieldValue('custbodyr7_nonstandardservice', 'T');
                }
            }

            var id = nlapiSubmitRecord(rec, true); //20 points
        };

        /* @public */
        return {
            Process: function () {
                var continueProcessing = true;

                if (ScriptBase.Arguments.Type == 'delete')
                    continueProcessing = false;

                if (continueProcessing) {
                    ScriptBase.Log.Audit('Module Execution Starting', func);

                    try {
                        var startBench = ScriptBase.Log.StartBenchmark(func);
                        Process();
                        ScriptBase.Log.EndBenchmark(func, startBench);
                    }

                    catch (err) {
                        if (err instanceof nlobjError || err.getCode()) ScriptBase.Log.ErrorObject('Unknown Error Occurred During Module: ' + func, err);
                        else ScriptBase.Log.Error('Unknown Error Occurred During Module: ' + func, err.message);
                        throw err;
                    }
                }

                else {
                    ScriptBase.Log.Audit('Module Execution Cancelled', func);
                }
            }
        };
    })(),

    /*
    * Set cust field custbody_bill_address_list_hold to hold billaddresslist value for search
    */
    TriggerPushOfASCProcess: (function () {
        //Private
        var func = 'TriggerPushOfASCProcess';

        /*
         * Main processing method.
         */
        function process() {
            try {
                var params = [];
                params['custscript_asc_pullover_arr_id'] = nlapiGetRecordId();

                //ScriptBase.Log.Debug('params', JSON.stringify(params));
                nlapiScheduleScript('customscript_r7_sched_asc_605_pullover', null, params);
            }
            catch (err) {
                if (err instanceof nlobjError || err.getCode()) ScriptBase.Log.ErrorObject('Unknown Error Occurred During Module: ' + func, err);
                else ScriptBase.Log.Error('Unknown Error Occurred During Module: ' + func, err.message);
                throw err;
            }
        };

        //Public
        return {
            Process: function () {
                var continueProcessing = true;

                if (continueProcessing) {
                    ScriptBase.Log.Audit('Module Execution Starting', func);
                    try {
                        var startBench = ScriptBase.Log.StartBenchmark(func, ScriptBase.Client);
                        process();
                        ScriptBase.Log.EndBenchmark(func, startBench, ScriptBase.Client);
                    }
                    catch (err) {
                        if (err instanceof nlobjError) {
                            ScriptBase.Log.ErrorObject('Unknown nlobjError during module: ' + func, err);
                        }
                        else {
                            ScriptBase.Log.Error('Unknown Error Occurred during module: ' + func, err.message);
                        }

                        throw err;
                    }
                }
                else {
                    ScriptBase.Log.Audit('Module Execution Cancelled ', func);
                }
            }
        };
    })()
};