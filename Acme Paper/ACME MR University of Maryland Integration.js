/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/**
 * Script Type          : Map/ Reduce Script
 * Script Name        : ACME MR University of Maryland Integration
 * Version                 : 2.0
 * Description          : This script will retrieve the FoodPro Orders file from the University of Maryland SFTP server and create Sales Orders in NetSuite. 
 */

define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/format', 'N/email', 'N/encode', 'N/file', 'N/task', 'N/sftp', 'N/error'],

    function (search, record, log, runtime, format, email, encode, file, task, sftp, error) {
        var SFTPPort = 22;
        var UoM_SO_Shipping_Country_ScriptField = 'custscript_uom_so_shipping_country';
        var UoM_SalesOrder_PO_No_ScriptField = 'custscript_uom_integ_so_po_no_val';
        var UoM_SalesOrder_Warehouse_ScriptField = 'custscript_uom_integration_so_warehouse';
        var UoM_Customer_ScriptField = 'custscript_uom_so_customer';
        var UoM_AckEmail_Reci_ScriptField = 'custscript_uom_ack_email_recipients';
        var UoM_SFTPInteg_Username_ScriptField = 'custscript_uom_sftpintegration_username';
        var UoM_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_uom_sftpintegration_pwd_guid';
        var UoM_SFTPInteg_URL_ScriptField = 'custscript_uom_sftpintegration_sftp_url';
        var UoM_SFTPInteg_Hostkey_ScriptField = 'custscript_uom_sftpintegration_host_key';
        var UoM_SFTPInteg_SFTPDir_ScriptField = 'custscript_uom_sftpintegration_sftp_dir';
        var CSVFileHeaders = ['Order Internal ID', 'Customer', 'Order Date', 'Order No', 'Order Ship Date', 'Order Shiplist Number', 'Total Amount', 'Ship Addresse', 'Ship Attention', 'Ship Address 1', 'Ship Address 2', 'Ship City', 'Ship State', 'Ship Country', 'Ship Zip'];
        var ACME_Holidays_Custom_RecordID = 'customrecord_acme_official_holidays';
        var SOPendingFulfillmentStatus = 'B';
        var UoM_Entered_By = 'custscript_uom_entered_by';
        var UoM_InactiveItem = 'custscript_sdb_inactive_item';
        var CompletedFolder = "custscript_sdb_completed_folder"

        //var UoMFileNamePrefix = 'UMOrders';
        var UoMFileNamePrefix = 'UMDOrders';

        function getInputData(context) {
            try {
                log.audit('****** ACME MR University of Maryland Integration Script Begin ******', '****** ACME MR University of Maryland Integration Script Begin ******');
                var arrReturn = [];
                var folder = 771;
                var arrFiles = getFiles(folder);

                log.audit('arrFiles', arrFiles);

                if (arrFiles && arrFiles.length == 0) {
                    log.audit('No University of Maryland Order File found');
                    return null;
                }
                for (var i = 0; i < arrFiles.length; i++) {
                    var uomFileObj = file.load({ id: arrFiles[i] });
                    if (uomFileObj) {
                        var uomFileContents = uomFileObj.getContents();
                        //log.debug('uomFileContents : ', uomFileContents);
                        var orderLines = uomFileContents.trim().split('\r\n');
                        //log.debug('orderLines--> : ', orderLines.length);
                        orderLines = addIdfiles(orderLines, arrFiles[i]);
                        if (orderLines) {
                            arrReturn = arrReturn.concat(orderLines);
                        }
                    }
                }
            } catch (getInputDataErr) {
                log.error('getInputData error: ', getInputDataErr.message);
            }

            return arrReturn;
        }

        function map(context) {
           // log.debug('Map: context.value is ', context.value);
            if (context.value != '' && context.value != null && context.value != undefined) {
                try {
                    var fileData = JSON.parse(context.value);
                    //log.debug('Map: fileData ', fileData);
                    var inactiveItem = runtime.getCurrentScript().getParameter({ name: UoM_InactiveItem });
                    var curOrderData = fileData.split(',');
                    //log.debug('curOrderData : ', curOrderData);
                    var curlocationNo = curOrderData[0];
                    var curorderDate = curOrderData[1];
                    var curProductNo = curOrderData[2];
                    var curProductQty = curOrderData[3];
                    var curSplitPackIndicator = curOrderData[4];
                    var fileid = curOrderData[5];
                    //log.debug('curlocationNo is ' + curlocationNo + ' curorderDate is ' + curorderDate, ' curProductNo is ' + curProductNo + ' curProductQty is ' + curProductQty + ' curSplitPackIndicator is ' + curSplitPackIndicator);
                    var curCustID = '';
                    var curItemID = '';
                    if (curorderDate) {
                        var curorderDateObj = new Date(parseInt(curorderDate.substr(0, 4), 10), parseInt(curorderDate.substr(4, 2), 10) - 1, parseInt(curorderDate.substr(6, 2), 10));
                        var curorderDateString = format.format({
                            value: curorderDateObj,
                            type: format.Type.DATE
                        });
                        //log.debug('curorderDateObj is ' + curorderDateObj, ' curorderDateString is ' + curorderDateString);
                    }
                    if (curProductNo) {
                        var itemRecType = 'item';
                        var itemRecFilters = ['name', 'is', curProductNo];

                        var itemRecColumn = ['internalid', "isinactive"];
                        var itemIDSearchResult = returnSearchResults(itemRecType, itemRecFilters, itemRecColumn);
                        //  log.debug('itemIDSearchResult : ', itemIDSearchResult);
                        var IdOriginalItem = '';
                        if (itemIDSearchResult) {
                            if (itemIDSearchResult.length > 0) {
                                var IsInactive = itemIDSearchResult[0].getValue({ name: 'isinactive' });
                                //   log.debug('ItemIsInactive', IsInactive);
                                if (IsInactive === true || IsInactive == "true") {
                                    curItemID = inactiveItem;
                                    IdOriginalItem = itemIDSearchResult[0].getValue({ name: 'internalid' });
                                    log.debug('IdOriginalItem', IdOriginalItem);
                                    log.debug('curItemID : ', curItemID);
                                } else {
                                    curItemID = itemIDSearchResult[0].getValue({ name: 'internalid' });
                                }
                            }
                        }
                    }
                    var uofm_CustomerID = runtime.getCurrentScript().getParameter({ name: UoM_Customer_ScriptField });
                    //log.debug('uofm_CustomerID is  : ', uofm_CustomerID);
                    //log.debug('curlocationNo is  : ', curlocationNo);
                    if (curlocationNo && uofm_CustomerID) {
                        var curlocationNoVal = parseInt(curlocationNo, 10);
                        //  log.debug('curlocationNo is ' + curlocationNo, ' curlocationNoVal is ' + curlocationNoVal);
                        var shiplistSearchType = 'customer';
                        var shiplistSearchFilters = [
                            ["internalid", "anyof", uofm_CustomerID.toString()],
                            "AND",
                            ["address.custrecord_address_shiplist_no", "is", curlocationNoVal.toString()]
                        ];
                        var shiplistSearchColumns = [
                            search.createColumn({
                                name: 'addressinternalid',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'custrecord_address_shiplist_no',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'addressee',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'attention',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'address1',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'address2',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'address3',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'city',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'state',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'country',
                                join: 'Address'
                            }),
                            search.createColumn({
                                name: 'zipcode',
                                join: 'Address'
                            })];

                        var shiplistSearchResult = returnSearchResults(shiplistSearchType, shiplistSearchFilters, shiplistSearchColumns);
                        //log.debug('shiplistSearchResult : ', shiplistSearchResult);
                        if (shiplistSearchResult) {
                            if (shiplistSearchResult.length > 0 && uofm_CustomerID && curorderDateString && curItemID) {
                                var orderData = { 'locationdetails': shiplistSearchResult, 'customerid': uofm_CustomerID, 'orderdate': curorderDateString, 'itemid': curItemID, 'itemqty': curProductQty, 'splitpackindicator': curSplitPackIndicator, 'fileId': fileid, 'isinactive': IsInactive, 'OriginalItemId': IdOriginalItem };
                                log.audit("orderData", orderData)
                                context.write({
                                    key: curlocationNo,
                                    value: orderData
                                });  //Key-Value pair
                            }
                        }
                    }
                } catch (maperr) {
                    log.error('map stage error: ', maperr.message);
                    log.audit('Map: context.value is ', context.value);
                }
            }
        }

        function reduce(context) {
            //  log.debug('REDUCE: Context values', context.values);
            var currentLocationNo = context.key;
            //   log.audit('currentLocationNo is ', currentLocationNo);
            if (context.values.length > 0) {
                try {
                    var umd_SO_Data = {};
                    var orderDetails = new Array();
                    var currentOrderDetails = JSON.parse(context.values[0]);
                    //   log.debug('currentOrderDetails is ', currentOrderDetails);
                    var itemFlag = 'F';
                    var currentLocDetails = currentOrderDetails['locationdetails'];
                    var currentCustomerId = currentOrderDetails['customerid'];
                    var currentOrderDate = new Date();//currentOrderDetails['orderdate'];
                    var currentOrderSplitPack = currentOrderDetails['splitpackindicator'];

                    //  log.debug('currentLocDetails is ' + currentLocDetails + ' currentCustomerId is ' + currentCustomerId, 'currentOrderDate is ' + currentOrderDate + ' currentOrderSplitPack is ' + currentOrderSplitPack);

                    var currentUofMShiplistNo = currentLocDetails[0].values['Address.custrecord_address_shiplist_no'];
                    var currentAddressInternalID = currentLocDetails[0].values['Address.addressinternalid'];
                    var currentOrderShiplistName = currentLocDetails[0].values['Address.addressee'];
                    var currentOrderShipInstr = currentLocDetails[0].values['Address.attention'];
                    var currentOrderShipAddr1 = currentLocDetails[0].values['Address.address1'];
                    var currentOrderShipAddr2 = currentLocDetails[0].values['Address.address2'];
                    var currentOrderShipCity = currentLocDetails[0].values['Address.city'];
                    var currentOrderShipState = currentLocDetails[0].values['Address.state'][0].value;
                    var currentOrderShipCountry = currentLocDetails[0].values['Address.country'][0].value;
                    var currentOrderShipZip = currentLocDetails[0].values['Address.zipcode'];
                    //   log.debug('Order currentUofMShiplistNo is ' + currentUofMShiplistNo + ' currentAddressInternalID is ' + currentAddressInternalID + ' currentOrderShipInstr  is ' + currentOrderShipInstr, 'currentOrderShipAddr1  is ' + currentOrderShipAddr1 + ' currentOrderShipAddr2  is ' + currentOrderShipAddr2 + ' currentOrderShipCity  is ' + currentOrderShipCity);
                    umd_SO_Data['shiplistno'] = currentUofMShiplistNo.toString();
                    umd_SO_Data['shiplistname'] = currentOrderShiplistName;
                    umd_SO_Data['shiplistinstr'] = currentOrderShipInstr;
                    umd_SO_Data['shiplistaddr1'] = currentOrderShipAddr1;
                    umd_SO_Data['shiplistaddr2'] = currentOrderShipAddr2;
                    umd_SO_Data['shiplistcity'] = currentOrderShipCity;
                    umd_SO_Data['shipliststate'] = currentOrderShipState;
                    umd_SO_Data['shiplistcountry'] = currentOrderShipCountry;
                    umd_SO_Data['shiplistzip'] = currentOrderShipZip;
                    var currentSalesOrderRecObj = record.create({
                        type: 'salesorder', isDynamic: true
                    });

                    log.debug('currentCustomerId', currentCustomerId);
                    if (currentCustomerId != '' && currentCustomerId != null && currentCustomerId != undefined) {
                        var CustomerWareHouse = search.lookupFields({
                            type: search.Type.CUSTOMER,
                            id: currentCustomerId,
                            columns: ['custentity_warehouse']
                        });
                        log.debug('CustomerWareHouse', CustomerWareHouse);
                        currentSalesOrderRecObj.setValue('entity', currentCustomerId);
                        currentSalesOrderRecObj.setValue('custbody_warehouse_roadnet', CustomerWareHouse.custentity_warehouse[0].value);
                        var salesorder_PONo = runtime.getCurrentScript().getParameter({ name: UoM_SalesOrder_PO_No_ScriptField });
                        var salesorder_Warehouse = runtime.getCurrentScript().getParameter({ name: UoM_SalesOrder_Warehouse_ScriptField });
                        var entered_by = runtime.getCurrentScript().getParameter({ name: UoM_Entered_By });
                        //    log.debug('salesorder_PONo is ' + salesorder_PONo, 'salesorder_Warehouse is ' + salesorder_Warehouse);
                        currentSalesOrderRecObj.setValue('custbody_aps_entered_by', entered_by);
                        if (salesorder_PONo) {
                            currentSalesOrderRecObj.setValue('otherrefnum', salesorder_PONo);
                        }

                        if (salesorder_Warehouse) {
                            currentSalesOrderRecObj.setValue('location', salesorder_Warehouse);
                        }

                        // Set the shipping address
                        if (currentAddressInternalID) {
                            currentSalesOrderRecObj.setValue('shipaddresslist', currentAddressInternalID);
                        }

                        umd_SO_Data['orderdate'] = currentOrderDate;
                        //currentSalesOrderRecObj.setValue('trandate', new Date(currentOrderDate));
                        currentSalesOrderRecObj.setValue('trandate', currentOrderDate);
                        var shipDate = currentOrderDate//new Date(currentOrderDate);
                        shipDate.setDate(shipDate.getDate() + 1);
                        // currentSalesOrderRecObj.setValue('startdate', shipDate);
                        currentSalesOrderRecObj.setValue('orderstatus', SOPendingFulfillmentStatus);
                        if (currentUofMShiplistNo) {
                            currentSalesOrderRecObj.setValue('custbody_address_shiplist_number', currentUofMShiplistNo.toString());
                        }
                        var shipDateObj = returnShipDate(currentOrderDate);
                        shipDateObj.setDate(shipDateObj.getDate()-1);
                        log.debug('shipDateObj is ', shipDateObj);
                        currentSalesOrderRecObj.setValue('startdate', shipDateObj);// Set Ship date  "startdate" 
                        currentSalesOrderRecObj.setValue('shipdate', shipDateObj); // Set Ship date "shipdate"
                        currentSalesOrderRecObj.setValue('custbody_a1wms_dnloadtowms', true); //Set DOWNLOAD TO WAREHOUSE EDGE
                        umd_SO_Data['shipdate'] = currentSalesOrderRecObj.getValue('shipdate');
                        var arrFiles = [];
                        for (var i = 0; i < context.values.length; i++) {
                            var curOrderDetails = JSON.parse(context.values[i]);
                            var curItemID = curOrderDetails['itemid'];
                            var curItemQty = curOrderDetails['itemqty'];
                            var fileId = curOrderDetails['fileId']
                            var IsInactive = curOrderDetails['isinactive'];
                            var OriginalItemId = curOrderDetails['OriginalItemId'];

                            if (fileId) arrFiles.push(fileId);
                            if (fileId && arrFiles.indexOf(fileId) == -1) arrFiles.push(fileId);

                            if (parseInt(curItemQty) == 0) curItemQty = 1;
                            if (curItemID && curItemQty) {
                                currentSalesOrderRecObj.selectNewLine({ sublistId: 'item' });
                                currentSalesOrderRecObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: curItemID
                                });
                                currentSalesOrderRecObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: curItemQty
                                });
                                currentSalesOrderRecObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'istaxable',
                                    value: false
                                });
                                //In case the item is inactive, set OriginalItemId
                                if (IsInactive) {
                                    currentSalesOrderRecObj.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_sdb_item_inactive',
                                        value: OriginalItemId
                                    });
                                }
                                currentSalesOrderRecObj.commitLine({ sublistId: 'item' });
                                itemFlag = 'T';
                            }
                        }

                        // Save our new sales order
                        // log.debug('currentSalesOrderRecObj is ', currentSalesOrderRecObj);
                        if (itemFlag == 'T') {
                            log.audit('Setting values ', itemFlag);
                            currentSalesOrderRecObj.setValue('memo', 'Created from file (UofMD Order)');
                            currentSalesOrderRecObj.setValue('custbody_sdb_from_uofmd_file', true);
                            var newSalesOrderId = currentSalesOrderRecObj.save({ enableSourcing: true, ignoreMandatoryFields: true });
                            log.audit('newSalesOrderId is ', newSalesOrderId);
                            //log.audit('arrFiles is ', arrFiles);
                            if (newSalesOrderId && arrFiles.length) {
                                arrFiles.forEach(function (fileId) {
                                    var id = record.attach({
                                        record: {
                                            type: "file",
                                            id: fileId
                                        },
                                        to: {
                                            type: "salesorder",
                                            id: newSalesOrderId
                                        }
                                    });
                                });
                            }
                            umd_SO_Data['sointid'] = newSalesOrderId;
                            umd_SO_Data['filesCompleted'] = arrFiles;

                            context.write({
                                key: newSalesOrderId,
                                value: umd_SO_Data
                            });
                        }
                    }
                    log.debug('umd_SO_Data is ', umd_SO_Data);
                } catch (reduceErr) {
                    log.error('Reduce stage error: ', reduceErr.message);
                }
            }
        }

        function summarize(summary) {
            try {
                handleErrorIfAny(summary);
                var csvFileLineData = '';
                var arrfiles = [];
                var folderID = runtime.getCurrentScript().getParameter({ name: CompletedFolder });

                summary.output.iterator().each(function (key, value) {
                    //log.debug('key is ' + key, 'value is ' + value);
                    if (value) {
                        var parsedValue = JSON.parse(value);
                        var curSOIntId = parsedValue['sointid'];
                        arrfiles = parsedValue['filesCompleted'];
                        if (!isEmpty(curSOIntId)) {
                            var soTranObj = record.load({ type: 'salesorder', id: curSOIntId });
                            var curSOTranNo = soTranObj.getValue('tranid');
                            var curSOCustomer = soTranObj.getText('entity');
                            var curSOTotalAmount = soTranObj.getValue('total');
                            var curSOShipDate = soTranObj.getValue('shipdate');
                            var curSOShipDateString = format.format({
                                value: curSOShipDate,
                                type: format.Type.DATE
                            });
                            var curSOTranDate = parsedValue['orderdate'];
                            //var curSOShipDate = parsedValue['shipdate'];
                            var curSOShiplistNo = parsedValue['shiplistno'];
                            var curSOShiplistName = parsedValue['shiplistname'];
                            var curSOShiplistInstr = parsedValue['shiplistinstr'];
                            var curSOShiplistAddr1 = parsedValue['shiplistaddr1'];
                            var curSOShiplistAddr2 = parsedValue['shiplistaddr2'];
                            var curSOShiplistCity = parsedValue['shiplistcity'];
                            var curSOShiplistState = parsedValue['shipliststate'];
                            var curSOShiplistCounty = parsedValue['shiplistcountry'];
                            var curSOShiplistZip = parsedValue['shiplistzip'];
                            //    log.debug('curSOIntId is ' + curSOIntId, 'curSOTranNo is ' + curSOTranNo);
                            csvFileLineData += curSOIntId + ',' + curSOCustomer + ',' + curSOTranDate + ',' + curSOTranNo + ',' + curSOShipDateString + ',' + curSOShiplistNo + ',' + curSOTotalAmount + ',' + curSOShiplistName + ',' + curSOShiplistInstr + ',' + curSOShiplistAddr1 + ',' + curSOShiplistAddr2 + ',' + curSOShiplistCity + ',' + curSOShiplistState + ',' + curSOShiplistCounty + ',' + curSOShiplistZip + '\n';
                        }
                    }
                    return true;
                });
                log.debug('folderID :', folderID);
                log.debug('arrfiles :', arrfiles);
                if (arrfiles.length) removeToCompleted(arrfiles, folderID);
                if (csvFileLineData) {
                    var csvHeaders = CSVFileHeaders[0] + ',' + CSVFileHeaders[1] + ',' + CSVFileHeaders[2] + ',' + CSVFileHeaders[3] + ',' + CSVFileHeaders[4] + ',' + CSVFileHeaders[5] + ',' + CSVFileHeaders[6] + ',' + CSVFileHeaders[7] + ',' + CSVFileHeaders[8] + ',' + CSVFileHeaders[9] + ',' + CSVFileHeaders[10] + ',' + CSVFileHeaders[11] + ',' + CSVFileHeaders[12] + ',' + CSVFileHeaders[13] + ',' + CSVFileHeaders[14] + '\n';
                    var csvFileContent = '';
                    csvFileContent += csvHeaders;
                    csvFileContent += csvFileLineData;
                    var curDateTimeObj = new Date();
                    var curDateTimeString = format.format({
                        value: curDateTimeObj,
                        type: format.Type.DATETIME
                    });

                    var csvFileObj = file.create({
                        name: 'UMD Orders list for_' + curDateTimeString + '.csv',
                        fileType: file.Type.CSV,
                        contents: csvFileContent
                    });
                    var emailstatusDetails = 'Please find the related transaction details attached in this email.';
                    uom_DailyOrders_sendAckEmail('successful', emailstatusDetails, csvFileObj);
                }
                log.audit('****** ACME MR University of Maryland Integration Script End ******', '****** ACME MR University of Maryland Integration Script End ******');
            } catch (summarizeErr) {
                log.error('Summarize stage error: ', summarizeErr.message);
            }
        }

        //AUXLIAR FUNCTION
        function handleErrorIfAny(summary) {
            var inputSummary = summary.inputSummary;
            var mapSummary = summary.mapSummary;
            if (inputSummary.error) {
                var e = error.create({
                    name: 'INPUT_STAGE_FAILED',
                    message: inputSummary.error
                });
                //log.debug({ details: 'Error code: ' + e.name + '\n' + 'Error msg: ' + e.message });
            }
            handleErrorInStage('map', mapSummary);
        }

        /**
        * Add  files ids in the row the file data
        */
        function addIdfiles(orderLines, fileId) {
            try {
                if (!orderLines || orderLines.length == 0) return [];
                for (var x = 0; x < orderLines.length; x++) {
                    orderLines[x] += ',' + fileId;
                }

            } catch (e) {
                log.error('ERROR', addIdfiles)
            }
            return orderLines
        }

        /**
         * Remove the files in the Folder with those already processed in the Sales order 
         */
        function removeToCompleted(arrFiels, folderID) {
            try {
                for (var x = 0; x < arrFiels.length; x++) {
                    var loadedFile = file.load({
                        id: arrFiels[x]
                    });
                    loadedFile.folder = folderID;
                    var loadedFileId = loadedFile.save();
                    log.audit("Completed file:", loadedFileId)
                }
            } catch (error) {
                log.error('removeToCompleted', error)
            }
        }

        /**
        * Compare the files in the Folder with those already processed in the Sales order 
        */
        function getFiles(folder) {
            try {
                var folderSearchObj = search.create({
                    type: "folder",
                    filters:
                        [
                            ["internalid", "anyof", folder]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "name",
                                join: "file",
                                label: "Name"
                            }),
                            search.createColumn({
                                name: "internalid",
                                join: "file",
                                label: "Internal ID"
                            }),
                            search.createColumn({
                                name: "created",
                                join: "file",
                                sort: search.Sort.ASC,
                                label: "Date Created"
                            })
                        ]
                });
                var searchResultCount = folderSearchObj.runPaged().count;
                //log.debug("folderSearchObj result count", searchResultCount);
                var files = [];
                folderSearchObj.run().each(function (result) {
                    if (result.getValue({ name: "internalid", join: "file" }) != "") files.push(result.getValue({ name: "internalid", join: "file" }));
                    return true;
                });
                log.debug("files", files);
                if (files.length == 0) return files;
                var soFiles = getFilesInSO(files);
                var filesToProcess = [];
                for (var x = 0; x < files.length; x++) {
                    if (soFiles && soFiles.indexOf(files[x]) == -1) filesToProcess.push(files[x])
                }
                log.debug("filesToProcess", filesToProcess);
                return filesToProcess

            } catch (e) {
                log.error({ details: 'Error getFiles: ' + e.name + '\n' + 'Error msg: ' + e.message });
            }
        }

        /**
         * Get files from sales order
         */
        function getFilesInSO(arr) {
            try {
                var arrFiles = [];

                var transactionSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["mainline", "is", "T"],
                            "AND",
                            ["custbody_sdb_from_uofmd_file", "is", "T"],
                            "AND",
                            ["file.internalid", "anyof", arr]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "name",
                                join: "file",
                                label: "Name"
                            }),
                            search.createColumn({
                                name: "internalid",
                                join: "file",
                                label: "Internal ID"
                            }),
                            search.createColumn({ name: "shipaddress", label: "Shipping Address" })
                        ]
                });
                var searchResultCount = transactionSearchObj.runPaged().count;
                //  log.debug("transactionSearchObj result count", searchResultCount);
                transactionSearchObj.run().each(function (result) {
                    if (arrFiles.indexOf(result.getValue({ name: "internalid", join: "file" })) == -1) arrFiles.push(result.getValue({ name: "internalid", join: "file" }));
                    return true;
                });
                // log.debug("getFilesInSO arrFiles", arrFiles);
                return arrFiles
            } catch (e) {
                log.error({ details: 'Error getFilesInSO: ' + e.name + '\n' + 'Error msg: ' + e.message });
            }
        }

        //Error handling method
        function handleErrorInStage(stage, summary) {
            var errorMsg = [];
            summary.errors.iterator().each(function (key, value) {
                var msg = 'error ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
                errorMsg.push(msg);
                return true;
            });
            if (errorMsg.length > 0) {
                var e = error.create({
                    name: stage,
                    message: JSON.stringify(errorMsg)
                });
                //   log.debug({ title: stage, details: 'Error code: ' + e.name + '\n' + 'Error msg: ' + e.message });
            }
        }

        function returnSearchResults(searchType, curFilters, curColumns) {
            try {
                //log.audit('searchType', searchType);
                //log.audit('curFilters', curFilters);
                //log.audit('curColumns', curColumns);
                var currentSearch = search.create({
                    type: searchType,
                    filters: curFilters,
                    columns: curColumns,
                });
                var resultSet = currentSearch.run();

                var searchResult = new Array();
                var rangeId = 0;
                do {
                    var resultSlice = resultSet.getRange(rangeId, rangeId + 1000);
                    if (resultSlice != null && resultSlice != '') {
                        searchResult = searchResult.concat(resultSlice);
                        rangeId += resultSlice.length;
                    }
                }
                while ((resultSlice != null) ? resultSlice.length >= 1000 : tempCondition < 0);
                //log.emergency('searchResult is>>>', searchResult);
                return searchResult;
            } catch (returnSearchResultsErr) {
                log.error('Error Occurred In ACME MR University of Maryland Integration script: returnSearchResults Function is ', returnSearchResultsErr);
            }
        }

        /**
         * Validate if the current parameter value is not empty
         */
        function isEmpty(curValue) {
            if (curValue == '' || curValue == null || curValue == undefined) {
                return true;
            }
            else {
                // log.debug('curValue is ', curValue);
                if (curValue instanceof String) {
                    // log.debug('curValue inside string if is ', curValue);
                    if (curValue == '') {
                        return true;
                    }
                }
                else if (curValue instanceof Array) {
                    // log.debug('curValue inside Array if is ', curValue);
                    if (curValue.length == 0) {
                        return true;
                    }
                }
                return false;
            }
        }

      //
         function returnShipDate(orderdate) {
            try {
                var orderdateObj = new Date(orderdate);
                var nextDateObj = new Date(orderdateObj);
                //nextDateObj.setDate(orderdateObj.getDate() + 1);
                log.audit({
                    title: 'orderdateObj',
                    details: orderdateObj
                })
                log.audit({
                    title: 'nextDateObj',
                    details: nextDateObj
                })
                log.audit({
                    title: 'nextDateObj.getDay()',
                    details: nextDateObj.getDay()
                })
                var notShipDay = 'T';
                do {
                    if (nextDateObj.getDay() != 6 && nextDateObj.getDay() != 0) {
                        var nextDateString = format.format({ value: nextDateObj, type: format.Type.DATE })
                        var acmeHolidaysSearchFilter = [
                            search.createFilter({
                                name: 'custrecord_aoh_holiday_date',
                                join: null,
                                operator: 'on',
                                values: nextDateString
                            })
                        ];
                        var acmeHolidaysSearchColumn = [
                            'custrecord_aoh_holiday_name',
                            'custrecord_aoh_holiday_date'
                        ];

                        var acmeHolidaysSearch = search.create({
                            type: ACME_Holidays_Custom_RecordID,
                            filters: acmeHolidaysSearchFilter,
                            columns: acmeHolidaysSearchColumn,
                        });

                        var acmeHolidaysSearchResults = acmeHolidaysSearch.run().getRange(0, 1);
                        if (acmeHolidaysSearchResults.length > 0) {
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                            notShipDay = 'T';
                        }
                        else {
                            notShipDay = 'F';
                        }
                    }
                    else {
                        nextDateObj.setDate(nextDateObj.getDate() + 1);
                        notShipDay = 'T';
                    }
                }
                while (notShipDay == 'T');
                nextDateObj.setDate(nextDateObj.getDate() - 1);
                log.debug({
                    title: 'nextDateObj--',
                    details: nextDateObj
                })
                return nextDateObj
            } catch (returnShipDateErr) {
                log.error('Error Occurred In ACME MR University of Maryland Integration script: returnShipDate Function is ', returnShipDateErr);
            }
        }

        function generateSFTPFileName() {
            try {
                var todayDateObj = new Date();
                var todayDateString = todayDateObj.toISOString().slice(0, 10).replace(/-/g, "");
                //  log.debug('todayDateString is ', todayDateString);

                if (todayDateString) {
                    return UoMFileNamePrefix + todayDateString;
                }
                else {
                    return null;
                }
            } catch (generateSFTPFileNameErr) {
                log.error('Error Occurred In ACME MR University of Maryland Integration script: generateSFTPFileName Function is ', generateSFTPFileNameErr);

            }
        }

        function sftpConnectionDownload() {
            try {
                var uom_UserName = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_Username_ScriptField });
                //log.debug('UoM User Name is ', uom_UserName);
                var uom_PwdGUID = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_Pwd_GUID_ScriptField });
                // log.debug('UoM Password GUID is ', uom_PwdGUID);
                var uom_SFTPurl = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_URL_ScriptField });
                // log.debug('UoM SFTP Url is ', uom_SFTPurl);
                var uom_Hostkey = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_Hostkey_ScriptField });
                // log.debug('UoM Host Key is ', uom_Hostkey);
                var uom_SFTPDirectory = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_SFTPDir_ScriptField });
                // log.debug('UoM SFTP Directory is ', uom_SFTPDirectory);
                var uom_SFTPconnection = sftp.createConnection({
                    username: uom_UserName,
                    passwordGuid: uom_PwdGUID,
                    url: uom_SFTPurl,
                    hostKey: uom_Hostkey,
                    port: SFTPPort,
                    directory: uom_SFTPDirectory
                });

                var list = uom_SFTPconnection.list({
                    path: uom_SFTPDirectory
                });
                //  log.debug('list : ', list);
                return;
                var fileName = 'UMDOrders20210312';
                if (uom_SFTPconnection) {
                    if (uom_SFTPDirectory && fileName) {
                        var downloadedFile = uom_SFTPconnection.download({
                            filename: fileName + '.txt'
                        });

                        //   log.debug('DEBUG', 'Downloaded file : ' + downloadedFile.name);
                        return downloadedFile;
                    }
                    else {
                        return null;
                    }
                }//connection
            } catch (sftpConnectionDownloadErr) {
                log.error('Error Occurred In ACME MR University of Maryland Integration script: sftpConnectionDownload Function is ', sftpConnectionDownloadErr);
            }
        }

        function uom_DailyOrders_sendAckEmail(status, statusDetails, attachmentfileObj) {
            try {
                var curDateTimeObj = new Date();
                var curDateTimeString = format.format({
                    value: curDateTimeObj,
                    type: format.Type.DATETIME
                });
                var emailRecipients = runtime.getCurrentScript().getParameter({ name: UoM_AckEmail_Reci_ScriptField });
                var emailSender = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_sender' }) || 96988;//-5
                var emailSubject = 'University of Maryland Integration: Daily Order creation ' + status + ' for ' + curDateTimeString;
                var emailBody = 'Hi Team,<br/><p>The University of Maryland Integration for Daily Order creation status is given below:<br/>';
                emailBody += statusDetails;
                emailBody += '</p><br/><br/>Thank you';
                if (emailRecipients) {
                    if (attachmentfileObj) {
                        email.send({
                            author: emailSender,
                            recipients: emailRecipients,
                            subject: emailSubject,
                            body: emailBody,
                            attachments: [attachmentfileObj]
                        });
                        log.audit('Ack email sent with attachments.');
                    }
                    else {
                        email.send({
                            author: emailSender,
                            recipients: emailRecipients,
                            subject: emailSubject,
                            body: emailBody
                        });
                        log.audit('Ack email sent without attachments.');
                    }
                }
            } catch (uom_DailyOrders_sendAckEmailErr) {
                log.error('Error Occurred In ACME MR University of Maryland Integration script: uom_DailyOrders_sendAckEmail Function is ', uom_DailyOrders_sendAckEmailErr);
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };

    });