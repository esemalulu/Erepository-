/**
 * Copyright (c) 1998-2018 Oracle-NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * Store software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * * Version    Date            Author           		Remarks
 *   1.00       1 Apr 2020		Mahesh Babu        	Initial Version
 *
 **/

/**
 * WMSTS_ECB_Lib_Exec_Log.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */


define(['N/search', 'N/query', 'N/log', 'N/runtime', 'N/error', 'N/record', 'N/format', 'N/render',
    'N/email', './WMSTS_ECB_Lib_Exec_Log.js'],

    function (NS_Search, query, log, NS_Runtime, error, NS_Record, NS_format, NS_Render, NS_EMail, ECB_log) {
        var stLogTitle = "Beforesubmit_BFCPickDataProcess";
        /**
         * 
         * @param {string} so - Intenal id of sales order
         * @param {string} line -sales order line number
         * @param {string} Item  - internal id of fthe item
         * @returns {object} returns BFC record count for the given SO
         */
        function ChkDuplicateData(so, line, Item) {
            try {
                var duplicatequeryResobj = {};
                var bfcPickData = 'so. = ' + so + '<br>';
                bfcPickData = bfcPickData + 'line. = ' + line + '<br>';
                bfcPickData = bfcPickData + 'Item. = ' + Item + '<br>';

                log.debug(stLogTitle, "ChkDuplicateData Parameters : " + bfcPickData);
                ECB_log.ScriptLogs({
                    name: 'ChkDuplicateData Parameters',
                    value: bfcPickData
                });

                const Bincolumns = ["COUNT(custrecord_bfcpickdata_ordno)"]

                const mapResultsToColumns = (result) => {

                    let resultObj = {}
                    for (columnIndex in Bincolumns) {
                        resultObj[Bincolumns[columnIndex]] = result.values[columnIndex]
                    }
                    return resultObj
                }



                const duplicatequery = query.runSuiteQL({
                    query: `
                    SELECT ${Bincolumns} FROM
                    customrecord_wmsts_bfcpickdata  WHERE custrecord_bfcpickdata_ordno = ${so}
                    AND custrecord_bfcpickdata_lineno =  ${line} 
                    AND custrecord_bfcpickdata_item =  ${Item}
            `,
                })

                const duplicatequeryResults = duplicatequery.results.map(result => mapResultsToColumns(result))

                duplicatequeryResobj.result = duplicatequeryResults;

                ECB_log.ScriptLogs({
                    name: 'End',
                    value: 'End of ChkDuplicateData Function'
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Success'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(duplicatequeryResobj)],
                    ProcessResults: {},
                    KeyWords: so
                });

            } catch (e) {
                log.debug("exception in ChkDuplicateData ", e);

                ECB_log.ScriptLogs({
                    name: 'exception in ChkDuplicateData',
                    value: e
                });
                ECB_log.SetStatus({
                    statusCode: 'Request Failed'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(duplicatequeryResobj)],
                    ProcessResults: {},
                    KeyWords: so
                });
                return {
                    error: e.message,
                    message: ECB_log.Store()
                }
            }
            log.debug(stLogTitle, "duplicatequeryResults : " + JSON.stringify(duplicatequeryResobj));
            ECB_log.ScriptLogs({
                name: 'duplicatequeryResults :',
                value: JSON.stringify(duplicatequeryResobj)
            });
            return duplicatequeryResobj;
        }
        /**
         * 
         * @param {string} ordno  - Internal id of the SO
         * @param {string} lineno - SO line number
         * @param {string} item  - Internal id of the item
         * @param {string} whLocation 
         * @returns {boolean} returns TRUE if it is a valid transaction
         */
        function chkValidTransaction(ordno, lineno, item, whLocation) {

            try {

                var bfcPickData = 'ordno. = ' + ordno + '<br>';
                bfcPickData = bfcPickData + 'lineno. = ' + lineno + '<br>';
                bfcPickData = bfcPickData + 'item. = ' + item + '<br>';
                bfcPickData = bfcPickData + 'whLocation. = ' + whLocation + '<br>';

                log.debug(stLogTitle, "chkValidTransaction Parameters : " + bfcPickData);
                ECB_log.ScriptLogs({
                    name: 'chkValidTransaction Parameters',
                    value: bfcPickData
                });

                var validtran = 'F';
                var Binfilters = [];
                Binfilters.push(NS_Search.createFilter({ name: 'mainline', operator: NS_Search.Operator.IS, values: false }));
                Binfilters.push(NS_Search.createFilter({ name: 'internalid', operator: NS_Search.Operator.ANYOF, values: ordno }));
                Binfilters.push(NS_Search.createFilter({ name: 'item', operator: NS_Search.Operator.ANYOF, values: item }));
                Binfilters.push(NS_Search.createFilter({ name: 'location', operator: NS_Search.Operator.ANYOF, values: whLocation }));
                Binfilters.push(NS_Search.createFilter({ name: 'line', operator: NS_Search.Operator.EQUALTO, values: lineno }));

                var Bincolumns = [];

                var searchrecord = NS_Search.create({
                    type: 'salesorder',
                    filters: Binfilters,
                    column: Bincolumns
                }).run().getRange({ start: 0, end: 1000 });

                log.debug(stLogTitle, "chkValidTransaction searchrecord : " + searchrecord);
                if (searchrecord != null && searchrecord != "") {
                    log.debug(stLogTitle, "searchrecord : " + searchrecord.length);
                    validtran = 'T';
                }

                ECB_log.ScriptLogs({
                    name: 'End',
                    value: 'End of chkValidTransaction Function'
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Success'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(searchrecord)],
                    ProcessResults: {validtran : validtran},
                    KeyWords: ordno
                });

            } catch (e) {
                log.debug("exception in chkValidTransaction",e);
                ECB_log.ScriptLogs({
                    name: 'exception in chkValidTransaction',
                    value: e
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Failed'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(searchrecord)],
                    ProcessResults: {validtran : validtran},
                    KeyWords: ordno
                });

                return {
                    error: e.message,
                    message: ECB_log.Store()
                }
            }
            return validtran;
        }

        function getpreferbin(ordno, getItemInternalId, whLocation) {
            try {
                var bfcPickData = 'getItemInternalId. = ' + getItemInternalId + '<br>';
                bfcPickData = bfcPickData + 'whLocation. = ' + whLocation + '<br>';

                log.debug(stLogTitle, "getpreferbin Parameters : " + bfcPickData);
                ECB_log.ScriptLogs({
                    name: 'getpreferbin Parameters',
                    value: bfcPickData
                });

                var getPreferBin = '';
                var itemresults = NS_Search.create({
                    type: "item",
                    filters:
                        [
                            ["internalid", "anyof", getItemInternalId],
                            "AND",
                            ["location", "anyof", ['@NONE@', whLocation]]
                        ],
                    columns:
                        [
                            NS_Search.createColumn({
                                name: "preferredbin",
                                sort: NS_Search.Sort.ASC,
                                label: "Preferred Bin"
                            }),
                            NS_Search.createColumn({
                                name: "location",
                                join: "binNumber",
                                label: "Location"
                            }),
                            NS_Search.createColumn({
                                name: "type",
                                join: "memberItem",
                                label: "Type"
                            }),
                            NS_Search.createColumn({ name: "binnumber", label: "Bin Number" })
                        ]
                }).run().getRange({ start: 0, end: 1000 });


                if (itemresults != null && itemresults != '') {
                    for (var d = 0; d < itemresults.length; d++) {
                        if (itemresults[d].getValue('preferredbin') == true && itemresults[d].getValue({ name: "location", join: "binNumber" }) == whLocation) {
                            getPreferBin = itemresults[d].getValue('binnumber');
                        }
                    }
                }

                ECB_log.ScriptLogs({
                    name: 'End',
                    value: 'End of getpreferbin Function'
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Success'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(itemresults)],
                    ProcessResults: {getPreferBin : getPreferBin},
                    KeyWords: ordno
                });

            }
            catch (ex) {
                log.debug(stLogTitle, "exception in  getpreferbin  : " + ex);
               
                ECB_log.ScriptLogs({
                    name: 'exception in getpreferbin',
                    value: ex
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Failed'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(itemresults)],
                    ProcessResults: {getPreferBin : getPreferBin},
                    KeyWords: ordno
                });

                return {
                    error: e.message,
                    message: ECB_log.Store()
                }
            }
            return getPreferBin;
        }

        function getsocommitedqty(ordno, lineno, item) {
            try {
                var bfcPickData = 'item. = ' + item + '<br>';
                bfcPickData = bfcPickData + 'ordno. = ' + ordno + '<br>';
                bfcPickData = bfcPickData + 'lineno. = ' + lineno + '<br>';

                log.debug(stLogTitle, "getsocommitedqty Parameters : " + bfcPickData);
                ECB_log.ScriptLogs({
                    name: 'getsocommitedqty Parameters',
                    value: bfcPickData
                });

                var Committedqty = '';
                var salesordobj = NS_Search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["type", "anyof", "SalesOrd"],
                            "AND",
                            ["internalid", "anyof", ordno],
                            "AND",
                            ["item", "anyof", item],
                            "AND",
                            ["line", "EQUALTO", lineno]
                        ],
                    columns:
                        [
                            NS_Search.createColumn({ name: "quantitycommitted", label: "Quantity Committed" })

                        ]
                }).run().getRange({ start: 0, end: 1 });
              
                if (salesordobj != null && salesordobj != '') {
                    for (var d = 0; d < salesordobj.length; d++) {

                        Committedqty = salesordobj[d].getValue('quantitycommitted');

                    }
                }
                log.debug("Committedqty ", Committedqty);

                ECB_log.ScriptLogs({
                    name: 'End',
                    value: 'End of getsocommitedqty Function'
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Success'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(salesordobj)],
                    ProcessResults: {Committedqty : Committedqty},
                    KeyWords: ordno
                });

            }
            catch (ex) {
                log.debug(stLogTitle, "exception in  getsocommitedqty  : " + ex);
               
                ECB_log.ScriptLogs({
                    name: 'exception in getsocommitedqty',
                    value: ex
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Failed'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(salesordobj)],
                    ProcessResults: {Committedqty : Committedqty},
                    KeyWords: ordno
                });

                return {
                    error: e.message,
                    message: ECB_log.Store()
                }
            }
            return Committedqty;
        }

        /**
         * 
         * @param {string} Binnumber - bin number text
         * @param {string} whLocation - location internal id
         * @returns {string} internal id of the Binnumber
         */
        function GetValidBinInternalId(ordno ,Binnumber, whLocation) {

            try {

                var bfcPickData = 'Binnumber. = ' + Binnumber + '<br>';
                bfcPickData = bfcPickData + 'whLocation. = ' + whLocation + '<br>';

                log.debug(stLogTitle, "GetValidBinInternalId Parameters : " + bfcPickData);
                ECB_log.ScriptLogs({
                    name: 'GetValidBinInternalId Parameters',
                    value: bfcPickData
                });

                var Binfilters = []; var bininternalId = '';
                Binfilters.push(NS_Search.createFilter({ name: 'binnumber', operator: NS_Search.Operator.IS, values: Binnumber }));
                Binfilters.push(NS_Search.createFilter({ name: 'inactive', operator: NS_Search.Operator.IS, values: false }));
                Binfilters.push(NS_Search.createFilter({ name: 'location', operator: NS_Search.Operator.ANYOF, values: whLocation }));

                var Bincolumns = [];
                Bincolumns.push(NS_Search.createColumn('custrecord_wmsse_bin_loc_type'));

                var searchrecord = NS_Search.create({
                    type: 'Bin',
                    filters: Binfilters,
                    column: Bincolumns
                }).run().getRange({ start: 0, end: 1000 });

                if (searchrecord != null && searchrecord != "") {
                    var vLocationType = searchrecord[0].getText({
                        name: 'custrecord_wmsse_bin_loc_type'
                    });
                    if (vLocationType != 'WIP')
                        bininternalId = searchrecord[0].id;
                }
                Binfilters = null;
                searchrecord = null;
                Bincolumns = null;
                log.debug(stLogTitle, 'bininternalId LEN:' + bininternalId);

                
                ECB_log.ScriptLogs({
                    name: 'End',
                    value: 'End of GetValidBinInternalId Function'
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Success'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(searchrecord)],
                    ProcessResults: {bininternalId : bininternalId},
                    KeyWords: ordno
                });

            } catch (e) {
                log.debug("exception in GetValidBinInternalId",e);
                ECB_log.ScriptLogs({
                    name: 'exception in GetValidBinInternalId',
                    value: e
                });
                ECB_log.SetStatus({
                    statusCode: 'Request Failed'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(searchrecord)],
                    ProcessResults: {bininternalId : bininternalId},
                    KeyWords: ordno
                });
                return {
                    error: e.message,
                    message: ECB_log.Store()
                }
            }
            return bininternalId;
        }
        /**
         * 
         * @param {string} itemNo - internal id of the item
         * @param {string} location - internal id of the location
         * @returns {string} Returnd item type
         */
        function GetItemType(ordno,itemNo, location) {

            try {

                var bfcPickData = 'itemNo. = ' + itemNo + '<br>';
                bfcPickData = bfcPickData + 'location. = ' + location + '<br>';

                log.debug(stLogTitle, "GetItemType Parameters : " + bfcPickData);
                ECB_log.ScriptLogs({
                    name: 'GetItemType Parameters',
                    value: bfcPickData
                });

                var itemfilters = []; var type = "";
                itemfilters.push(NS_Search.createFilter({ name: 'internalid', operator: NS_Search.Operator.ANYOF, values: itemNo }));

                var itemcolumns = [];

                var searchRec = NS_Search.create({ type: 'item', filters: itemfilters, columns: itemcolumns });

                var searchres = searchRec.run().getRange({
                    start: 0, end: 1
                });
                if (searchres.length > 0) {
                    type = searchres[0].recordType;
                }
                log.debug(stLogTitle, 'itemType LEN:' + type);

                ECB_log.ScriptLogs({
                    name: 'End',
                    value: 'End of GetItemType Function'
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Success'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(searchRec)],
                    ProcessResults: {type : type},
                    KeyWords: ordno
                });

            } catch (e) {
                log.debug("exception in GetItemType",e);

                ECB_log.ScriptLogs({
                    name: 'exception in GetItemType',
                    value: e
                });
                ECB_log.SetStatus({
                    statusCode: 'Request Failed'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(searchRec)],
                    ProcessResults: {type : type},
                    KeyWords: ordno
                });
                return {
                    error: e.message,
                    message: ECB_log.Store()
                }
            }
            return type;
        }
        /**
         * 
         * @param {string} isnull (Default value is F)
         * @param {string} externalid 
         * @param {string} whse 
         * @param {string} ordno 
         * @param {string} lineno 
         * @param {string} item 
         * @param {string} pickbin 
         * @param {string} expeqty 
         * @param {string} actqty 
         * @param {string} route 
         * @param {string} stop 
         * @param {string} catchwght 
         * @returns{string} return isnull flag with missing required filed information
         */


        function checkForNullValueInParameters(isnull, externalid, whse, ordno, lineno, item, pickbin, expeqty, actqty, route, stop, catchwght) {

            try {

                var bfcPickData = 'isnull. = ' + isnull + '<br>';
                bfcPickData = bfcPickData + 'externalid. = ' + externalid + '<br>';
                bfcPickData = bfcPickData + 'whse. = ' + whse + '<br>';
                bfcPickData = bfcPickData + 'ordno. = ' + ordno + '<br>';
                bfcPickData = bfcPickData + 'item. = ' + item + '<br>';
                bfcPickData = bfcPickData + 'pickbin. = ' + pickbin + '<br>';
                bfcPickData = bfcPickData + 'expeqty. = ' + expeqty + '<br>';
                bfcPickData = bfcPickData + 'actqty. = ' + actqty + '<br>';
                bfcPickData = bfcPickData + 'route. = ' + route + '<br>';
                bfcPickData = bfcPickData + 'stop. = ' + stop + '<br>';
                bfcPickData = bfcPickData + 'catchwght. = ' + catchwght + '<br>';

                log.debug(stLogTitle, "checkForNullValue Parameters : " + bfcPickData);
                ECB_log.ScriptLogs({
                    name: 'checkForNullValue Parameters',
                    value: bfcPickData
                });


                var validations = [];
                var errmsg = [];
                if (externalid == null || externalid == '') {
                    isnull = 'T';
                    errmsg.push('EXTERNAL ID');
                }
                if (whse == null || whse == '') {
                    isnull = 'T';
                    errmsg.push('LOCATION');
                }
                if (ordno == null || ordno == '') {
                    isnull = 'T';
                    errmsg.push('SALES ORDER #');
                }
                if (lineno == null || lineno == '') {
                    isnull = 'T';
                    errmsg.push('SALES ORDER LINE #');
                }
                if (item == null || item == '') {
                    isnull = 'T';
                    errmsg.push('ITEM');
                }
                if (pickbin == null || pickbin == '') {
                    isnull = 'T';
                    errmsg.push('PICK BIN');
                }
                if (expeqty == null || expeqty == '') {
                    isnull = 'T';
                    errmsg.push('EXPECTED PICK QTY');
                }
                if(parseInt(actqty) == 0)
                {
                    log.debug("if into null actqty :" + actqty);
                }
                else if (actqty == null || actqty == '') {
                    log.debug("else into null actqty :" + actqty);
                    isnull = 'T';
                    errmsg.push('ACTUAL PICK QTY');
                }
                if (route == null || route == '') {
                    isnull = 'T';
                    errmsg.push('ROUTE');
                }
                if (stop == null || stop == '') {
                    isnull = 'T';
                    errmsg.push('STOP');
                }
                /*if (catchwght == null || catchwght == '' || parseFloat(catchwght) == 0) {
                    isnull = 'T';
                    errmsg.push('CATCH WEIGHT');
                }*/

                ECB_log.ScriptLogs({
                    name: 'End',
                    value: 'End of checkForNullValueInParameters Function'
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Success'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(bfcPickData)],
                    ProcessResults: {isnull : isnull,errmsg : errmsg},
                    KeyWords: ordno
                });

            } catch (e) {
                log.debug("exception in checkForNullValueInParameters",e);
                ECB_log.ScriptLogs({
                    name: 'exception in checkForNullValueInParameters',
                    value: e
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Failed'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(bfcPickData)],
                    ProcessResults: {isnull : isnull,errmsg : errmsg},
                    KeyWords: ordno
                });
                return {
                    error: e.message,
                    message: ECB_log.Store()
                }
            }
            return isnull + ":" + errmsg;
        }

        // Store function returns true if the stValue is empty
        function IsEmpty(stValue) {
            if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
                return true;
            }
            return false;
        }
        /**
         * 
         * @param {string} itemid : Item intenal id
         * @param {string} Binnumber : bin internalid
         * @returns { object} returns object which contains item,bin,SUM(onhand) and SUM(onhandavail)
         */
        function getinvdetails(ordno,itemid, Binnumber) {
            try {

                var invdetailsqueryresobj = {};
                var bfcPickData = 'itemid. = ' + itemid + '<br>';
                bfcPickData = bfcPickData + 'Binnumber. = ' + Binnumber + '<br>';

                log.debug(stLogTitle, "getinvdetails Parameters : " + bfcPickData);
                ECB_log.ScriptLogs({
                    name: 'getinvdetails Parameters',
                    value: bfcPickData
                });


                if (itemid != null && itemid != '' && Binnumber != null && Binnumber != '') {
                    const Bincolumns = [
                        "item",
                        "bin",
                        "SUM(onhand)",
                        "SUM(onhandavail)"
                    ]

                    const mapResultsToColumns = (result) => {

                        let resultObj = {}
                        for (columnIndex in Bincolumns) {
                            resultObj[Bincolumns[columnIndex]] = result.values[columnIndex]
                        }

                        return resultObj
                    }



                    const invdetailsquery = query.runSuiteQL({
                        query: `SELECT ${Bincolumns} FROM itemBinQuantity  WHERE item = ${itemid} AND bin = ${Binnumber}
                       GROUP BY item,bin ORDER BY item,bin`,
                    })

                    const invdetailsqueryresults = invdetailsquery.results.map(result => mapResultsToColumns(result))

                    invdetailsqueryresobj.result = invdetailsqueryresults;
                }
                else {
                    invdetailsqueryresobj.result = [{ "item": itemid, "bin": Binnumber, "SUM(onhand)": 0, "SUM(onhandavail)": 0 }]
                }


                ECB_log.ScriptLogs({
                    name: 'End',
                    value: 'End of getinvdetails Function'
                });

                ECB_log.SetStatus({
                    statusCode: 'Request Success'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(invdetailsqueryresobj)],
                    ProcessResults: {},
                    KeyWords: ordno
                });

            } catch (e) {
                log.debug("exception in getinvdetails",e);
                ECB_log.ScriptLogs({
                    name: 'exception in getinvdetails',
                    value: e
                });
                ECB_log.SetStatus({
                    statusCode: 'Request Failed'
                });

                ECB_log.ECBLogEnd({
                    ProcessValidationDetails: [JSON.stringify(invdetailsqueryresobj)],
                    ProcessResults: {},
                    KeyWords: ordno
                });
                return {
                    error: e.message,
                    message: ECB_log.Store()
                }
            }

            log.debug(stLogTitle, "invdetailsqueryresobj : " + JSON.stringify(invdetailsqueryresobj));
          
            return invdetailsqueryresobj;

        }


        return {
            ChkDuplicateData: ChkDuplicateData,
            chkValidTransaction: chkValidTransaction,
            getinvdetails: getinvdetails,
            GetValidBinInternalId: GetValidBinInternalId,
            GetItemType: GetItemType,
            checkForNullValueInParameters: checkForNullValueInParameters,
            getpreferbin: getpreferbin,
            getsocommitedqty : getsocommitedqty

        };

    }
);