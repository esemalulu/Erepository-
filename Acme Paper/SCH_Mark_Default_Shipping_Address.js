/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 *@author Saurabh Singh
 *@description Check the following conditions and Mark address as defaul shipping.
    OminiTrack - Not Null, Ship Zone - Not Null , Network No - Not Null
 * Date: 04/08/2021
 */
    define(['N/search', 'N/record', 'N/runtime', 'N/task'], function(search, record, runtime, task) {

        const SAVED_SEARCH_ID = 'customsearch2680';
        const PAGE_SIZE = 20;
        const THERSOLD_VALUE = 500;
        function execute(context) {
            try {
                var scriptObj = runtime.getCurrentScript();
                var searchObj = search.load({ id: SAVED_SEARCH_ID });
                if(_logValidation(searchObj)){
                    var pageIndex = scriptObj.getParameter({name: 'custscript_page_index'})||0;
                    var resultCount = searchObj.runPaged().count;
                    log.debug('Total Search Result Count', resultCount);
                    var columns = searchObj.columns;
                    var colIndex = columns.length -1;
                    
                    var pagedData = searchObj.runPaged({pageSize: PAGE_SIZE});
                    var pageCount = Math.ceil(pagedData.count / PAGE_SIZE);
                    log.debug('Page Count', pageCount)
                   // var pagedData = searchObj.runPaged();
                    for(pageIndex; pageIndex < pageCount; pageIndex++){ // pageCount
                        var customerList = [];
                        var searchPage = pagedData.fetch({index: pageIndex});
                        searchPage.data.forEach(function(result){
                            // log.debug('result', result);
                             customerList.push(result.getValue(columns[colIndex]));
                             return true;
                        });
                        log.debug('customerList', customerList);
                        updateShipingAddress(customerList);
                        log.debug('Remaing Usage', scriptObj.getRemainingUsage());
                        var usageLimit = scriptObj.getRemainingUsage();
                        if(usageLimit < THERSOLD_VALUE){
                            // rechdedule the Script
                            var scheduleTask = task.create({
                                taskType: task.TaskType.SCHEDULED_SCRIPT,
                                deploymentId: 'customdeploy_mark_default_ship_addr',
                                params: {'custscript_page_index': pageIndex},
                                scriptId: 'customscript_mark_default_ship_addr',
                            });
                            var taskId = scheduleTask.submit();
                            log.debug('ReSchedule Task Id', taskId);
                        }
                    }
                    
                   /* pagedData.pageRanges.forEach(function(pageRange){
                     var searchPage = pagedData.fetch({index: pageRange.index});
                        searchPage.data.forEach(function(result){
                           // log.debug('result', result);
                            customerList.push(result.getValue(columns[colIndex]));
                            return true;
                        });
                    });
                    log.debug('customerList', customerList);
                    updateShipingAddress(customerList);
                    log.debug('Remaing Usage', scriptObj.getRemainingUsage());*/
                }
    
            } catch (error) {
                log.debug('Error', error);
            }
        }
    
        // Processing Customer Addresses....
        function updateShipingAddress( customerList){
            var count = 0;
            for(var cl=0; cl< customerList.length; cl++){ 
                var internalId = customerList[cl];
    
                if(_logValidation(internalId)){
                    var recordObj = record.load({type: record.Type.CUSTOMER, id: internalId, isDynamic: true});
                    var customerId = recordObj.getValue({fieldId: 'entityid'});
                    var customerName = recordObj.getValue({fieldId: 'altname'});
                    var addrLineCount = recordObj.getLineCount({sublistId: 'addressbook'});
                    var addressIdList = [];
                    var alreadyProcessed = false;
                    for(var alc=0; alc < addrLineCount; alc++){
                        recordObj.selectLine({sublistId: 'addressbook', line: alc});
                        var addressId =  recordObj.getCurrentSublistValue({sublistId: 'addressbook', fieldId: 'addressid'});
                        var addressSubrecord = recordObj.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress' });
                        var addressLabel = recordObj.getCurrentSublistValue({sublistId: 'addressbook', fieldId: 'label'});
                        var startLabel = addressLabel.substr(0, addressLabel.indexOf(" "))
                        if(_logValidation(addressSubrecord)){
                            var shipZone = addressSubrecord.getValue({fieldId: 'custrecord_ship_zone'});
                            var omnitracs = addressSubrecord.getValue({fieldId: 'custrecord_acc_omnitracs_location_id'});
                            var networkNo = addressSubrecord.getValue({fieldId: 'custrecord_address_shiplist_no'});
                            if(_logValidation(shipZone) &&  _logValidation(omnitracs) && _logValidation(networkNo) && startLabel == '000001'){
                                log.debug('Already Processed Details: ', 'Customer ID: '+customerId+', Customer Name: '+customerName+', Address ID: '+addressId+', Address Label: '+addressLabel+
                                            ', Ship Zone: '+shipZone+', Omni Tracs: '+omnitracs+', Network No: '+networkNo);
                                alreadyProcessed = true;
                                break;
                            }
                        }
                        recordObj.commitLine({ sublistId: 'addressbook' });
                        addressIdList.push(addressId);
                    }
                    if(!alreadyProcessed){
                    
                        addressIdList.sort().reverse();
                        var isProcessed = false;
                        var customerAddress = [];
                        for(var i=0; i< addressIdList.length; i++){
                            
                            for(var line=0; line< addrLineCount; line++){

                                recordObj.selectLine({sublistId: 'addressbook', line: line});
                                var addressId =  recordObj.getCurrentSublistValue({sublistId: 'addressbook', fieldId: 'addressid'});
                               // log.debug('addressId: '+addressId, 'addressIdList[i]: '+addressIdList[i]);
                                if(addressIdList[i] == addressId){
                                    var addressSubrecord = recordObj.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress' });
                                    var addressLabel = recordObj.getCurrentSublistValue({sublistId: 'addressbook', fieldId: 'label'});
                                    var startLabel = addressLabel.substr(0, addressLabel.indexOf(" "))
                                    if(_logValidation(addressSubrecord)){
                                    
                                        var shipZone = addressSubrecord.getValue({fieldId: 'custrecord_ship_zone'});
                                        var omnitracs = addressSubrecord.getValue({fieldId: 'custrecord_acc_omnitracs_location_id'});
                                        var networkNo = addressSubrecord.getValue({fieldId: 'custrecord_address_shiplist_no'});
        
                                        customerAddress.push({
                                            'Customer_Name': customerName,
                                            'Customer_ID': customerId,
                                            'Address_Label': addressLabel,
                                            'Ship_Zone': shipZone,
                                            'Omni_Tracs': omnitracs,
                                            'Network_No': networkNo
                                        });
                                        if(_logValidation(shipZone) &&  _logValidation(omnitracs) && startLabel == '000001'){
                                            log.debug('Processed Details: ', 'Customer ID: '+customerId+', Customer Name: '+customerName+', Address ID: '+addressId+', Address Label: '+addressLabel+
                                            ', Ship Zone: '+shipZone+', Omni Tracs: '+omnitracs+', Network No: '+networkNo);
                                            recordObj.setCurrentSublistValue({sublistId: 'addressbook', fieldId: 'defaultshipping', value: true});
                                            recordObj.commitLine({ sublistId: 'addressbook' });
                                            isProcessed = true;
                                            count++;
                                            break;
                                        }
                                    }
                                }
                            }
                            if(isProcessed){
                                break;
                            }
                        }
                        if( isProcessed == false){
                            // log.debug('customerAddress', customerAddress.length);
                             log.debug('Not Processed Details', JSON.stringify(customerAddress));
                        }
                    }
                    recordObj.save({enableSourcing: true, ignoreMandatoryFields: true});
                }
            }
            log.debug('No of record has been processed: '+count);
        }
    
        // validate the field values...
        function _logValidation(value){
            if(value != null && value != '' && value != undefined && value != 'undefined' && value != 'NaN'){
                return true
            }else{
                return false;
            }
        }
    
        return {
            execute: execute
        }
    });
    