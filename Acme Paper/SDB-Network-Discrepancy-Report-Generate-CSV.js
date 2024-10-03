/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/log","N/search","N/runtime",'N/file', 'N/task'], function (log,search,runtime,file, task) {

    function getInputData(context) {
        try {
            createCsvFile();
            var customerPartner = runtime.getCurrentScript().getParameter("custscript_sdb_customer_partner");
            log.debug("customerPartner",customerPartner)
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                [
                   ["accounttype","anyof","AcctRec"], 
                   "AND", 
                   ["type","anyof","CustInvc","CustCred"], 
                   "AND", 
                   ["mainline","is","T"], 
                   "AND", 
                //    ["customermain.partner","anyof","51327"], 
                   ["customermain.partner","anyof",customerPartner],
                   "AND", 
                    ["status","anyof","CustInvc:A","CustCred:A"]
                ],
                columns:
                [
                   search.createColumn({name: "account",summary: "GROUP",label: "Account"}),
                   search.createColumn({name: "formulatext",summary: "GROUP",formula: "case when {type} = 'Invoice' then 'RI' else 'RC' end",label: "Header Code/Type"}),
                   search.createColumn({name: "tranid",summary: "GROUP",label: "Document Number"}),
                   search.createColumn({name: "trandate",summary: "GROUP",label: "Date"}),
                   search.createColumn({name: "formulatext_1",summary: "GROUP",formula: "{otherrefnum}",label: "PO #"}),
                   search.createColumn({name: "amount",summary: "MAX",label: "Original Invoice Amount"}),
                   search.createColumn({name: "formulanumeric",summary: "MAX",formula: "case when {type} = 'Invoice' then {amountremaining} else {amountremaining} * -1 end",label: "Formula (Numeric)"}),
                   //search.createColumn({name: "amountremaining",summary: "MAX",label: "Current Total Open Amount"}),
                   search.createColumn({name: "formulatext_2",summary: "MAX",formula: "{customermain.entityid}",label: "ACME Customer Number"}),
                   search.createColumn({name: "custrecord_address_shiplist_no",join: "shippingAddress",summary: "MAX",label: "Ship to  Network number"})
                ]
             });
             var searchResultCount = transactionSearchObj.runPaged().count;
             log.debug("transactionSearchObj result count",searchResultCount);
             var resultsReturn = [];
             var pagesCount = transactionSearchObj.runPaged({pageSize: 1000}).pageRanges.length;
             var start = 0; var end = 1000;
             for (let i = 0; i < pagesCount; i++) {
                var resultSet = transactionSearchObj.run();
                var results = resultSet.getRange({ start: start, end: end  });
                var pageResults = [];
                results.forEach(element => {
                    var account = element.getValue({name:'account',summary:'GROUP'});
                    var headerCodeType = element.getValue({name:'formulatext',summary:'GROUP'});
                    var tranId = element.getValue({name:'tranid',summary:'GROUP'});
                    var trandate = element.getValue({name:'trandate',summary:'GROUP'});
                    var poNumber = element.getValue({name:'formulatext_1',summary:'GROUP'});
                    var amount = element.getValue({name:'amount',summary:'MAX'});
                    //var amountRemaining = element.getValue({name:'amountremaining', summary:'MAX'});
                    var amountRemaining = element.getValue({name:'formulanumeric', summary:'MAX'});
                    var acmeCustomerNumber = element.getValue({name:'formulatext_2', summary:'MAX'});
                    var shipToNetworkNumber = element.getValue({name:'custrecord_address_shiplist_no',join:'shippingAddress',summary:'MAX'});
                    pageResults.push({account:account,headerCodeType:headerCodeType,tranId:tranId,trandate:trandate,poNumber:poNumber,amount:amount,amountRemaining:amountRemaining,acmeCustomerNumber:acmeCustomerNumber,shipToNetworkNumber:shipToNetworkNumber})
                });
                resultsReturn[i]=pageResults;
                start = end;
                end = end+1000;
             }
             return resultsReturn;
        } catch (error) {
            log.error('getInputData ERRRO',error);
        }
    }


    function map(context) {
        try {      
            var recordValue = JSON.parse(context.value);

            context.write({
                key: context.key,
                value: recordValue
            });
        } catch (error) {
            log.debug('map' , error);
        }

    }
   function reduce (context) {
        try {
            var values = context.values;
            var ordersValues = JSON.parse(values);

            var csvFile = searchFileByName();
            createCsvString(csvFile ,ordersValues)
        } catch (e) {
            log.error('Reduce Error',e)
        }
    }
 
    function createCsvFile(){
        try {
            var alreadyExistsFile = searchFileByName();
            if(alreadyExistsFile){ //If the file is already in file cabinet this funcion will reset the file
                log.audit('file reset');
                var fileObj = getCurrentFile(alreadyExistsFile);
                var currentLine = 0;
                var headerRow = '';
                fileObj.lines.iterator().each(function(line) {
                    currentLine++;
                    if (currentLine === 1) {
                        headerRow = line.value + '\n';
                    }
                    return true;
                });
                var newFile = file.create({name: fileObj.name,fileType: file.Type.CSV,folder: fileObj.folder,contents: headerRow});
                newFile.save();
            }else{//If the file not exists the file will be created
                let fileName = runtime.getCurrentScript().getParameter('custscript_sdb_file_name');
                var csvString = 'Account,Header Code/Type ,Document Number,Date,PO#,Original Invoice Amount,Current Total Open Amount,Acme Customer Number,Ship To Network Number';
                let objXlsFile = file.create({name: fileName,fileType: file.Type.CSV,contents: csvString});
                objXlsFile.folder = -15;
                var newFileId = objXlsFile.save();
                return newFileId;
            }
        } catch (error) {
            log.error('createCsvFile error',error)
        }
    }
    function searchFileByName() {
        try {
            let idFolder;
            let fileSearchObj = search.create({
                type: "file",
                filters:
                    [
                        ["folder", "anyof", "-15"],
                        "AND",
                        ["name","is",runtime.getCurrentScript().getParameter('custscript_sdb_file_name')]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });
            fileSearchObj.run().each(function (result) {
                idFolder = result.getValue('internalid');
                return false;
            });
            return idFolder;   
        } catch (error) {
            log.error("searchFileByName", error);
        }
    }
    function createCsvString(csvFile,ordersLinesToCSV) {
        try {
            var fileLoaded = getCurrentFile(csvFile);
            var newContent='\n';
            ordersLinesToCSV.forEach(invObj => {
                newContent +=
                invObj.account + ',' +
                invObj.headerCodeType + ',' +
                invObj.tranId + ',' +
                invObj.trandate + ',' +
                invObj.poNumber + ',' +
                invObj.amount + ',' +
                invObj.amountRemaining + ',' +
                invObj.acmeCustomerNumber + ',' +
                invObj.shipToNetworkNumber + '\n'
            });     
            fileLoaded.appendLine({
                value:newContent
            })
            return fileLoaded.save()
        } catch (error) {
            log.error('createCsvString error',error)
        }
    }
    function getCurrentFile(id) {
        try {
            let fileLoaded = file.load({
                id: id
            });
            return fileLoaded;   
        } catch (error) {
            log.error("getCurrentFile", error);
        }
    }

    function summarize(context){
        try {
            var arrFileName = runtime.getCurrentScript().getParameter("custscript_sdb_arr_file_name");
            var fileId = searchFileByName();
            var fileLoaded = getCurrentFile(fileId);
            fileLoaded.name = arrFileName
            var fileUpdated = fileLoaded.save();
            log.audit("fileUpdated",fileUpdated)
            let callScheduled = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: "customscript_sdb_send_net_discr_csv",
                deploymentId: "customdeploy_sdb_send_net_discr_csv",
                params: { custscript_sdb_file_name_scheduled: arrFileName }
            });
            var taskId = callScheduled.submit();
            log.debug("callScheduled taskId", taskId);
        } catch (error) {
            log.error("summarize", error);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce:reduce,
        summarize: summarize
    };
  });