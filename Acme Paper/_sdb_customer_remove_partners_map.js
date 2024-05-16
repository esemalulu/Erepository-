/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/log","N/record","N/search","N/file","N/runtime"], function (log,record,search,file,runtime) {
    function getInputData(context) {
        try {
            var scriptObj = runtime.getCurrentScript();
            var csvFileId = scriptObj.getParameter({ name: 'custscript_sdb_csv_file_id' });
            var csvFile = file.load({
                id: csvFileId
            });
    
            var xmlFileContent = csvFile.getContents().replace('﻿','');
            var lines = xmlFileContent.replace(/[\r]/g, '').split("\n");
            var headers = lines[0].split(",");
            log.debug('headers.length', headers.length);
            var result = []
            for (var i = 1; i < lines.length; i++) {
                var obj = {};
                var currentline = lines[i].split(",");
                for (var j = 0; j < headers.length; j++) {
                    if (currentline[j] && typeof currentline[j] == "string") currentline[j] = currentline[j].replace(/["']/g, "");
                    obj[headers[j].replace(/[" "]/g, "").replace('/', '')] = currentline[j]//escape(currentline[j]); 
                }
                result.push(obj);
            }
            log.debug("result", result);
            return result;
        } catch (e) {
            log.error("error in reading lines of csv", JSON.stringify(e));
        }
    }


    function map(context) {
        try {      
            var recordValue = JSON.parse(context.value);
            var customerId = recordValue.InternalID;           
            context.write({
                key: customerId,
                value: context.value
            });
           
        } catch (error) {
            log.debug('map' , error);
        }

    }
   function reduce (context) {
        try {
            var values = context.values;

            var customerId = JSON.parse(values[0]).InternalID;
            log.debug('Customer ID Proccessed: ' , customerId)
            var customer = record.load({
                type: record.Type.CUSTOMER,
                id: customerId,
                isDynamic: true,
            });
            
            for (let i = 0; i < values.length; i++) {
                var obj = JSON.parse(values[i]);

                var partnerLine = customer.findSublistLineWithValue({
                    sublistId: 'partners',
                    fieldId: 'partner',
                    value: obj.PartnerID
                });
                if(partnerLine>=0){
                    customer.selectLine({
                        sublistId: 'partners',
                        line: partnerLine
                    });
                
                    customer.removeLine({
                        sublistId: 'partners',
                        line: partnerLine,
                        ignoreRecalc: true
                    });    
                }
            }
            customer.save({
                ignoreMandatoryFields: true
            });


        } catch (e) {
            log.error({
                title: 'ERROR reduce',
                details: 'ERROR ' + e
            })
        }
    }
 
  
    return {
        getInputData: getInputData,
        map: map,
        reduce:reduce
    };
  });
  
  
  
