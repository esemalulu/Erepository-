/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
 define(["N/search", "N/record", "N/log"], function (search, record, log)
 {
 
     function getInputData()
     {
         try
         {
            var invoiceSearchObj = search.create({
                type: "invoice",
                filters:
                [
                    ["type","anyof","CustInvc"], 
                    "AND", 
                    ["custcol_acc_lineid","isempty",""], 
                    "AND", 
                    ["mainline","is","T"] 
                ],
                columns:
                [
                   search.createColumn({
                      name: "internalid",
                      summary: "GROUP",
                      label: "Internal ID"
                   }),
                   search.createColumn({
                      name: "custcol_acc_lineid",
                      summary: "SUM",
                      label: "Line ID"
                   })
                ]
             });
             var searchResultCount = invoiceSearchObj.runPaged().count;
             log.debug("invoiceSearchObj result count",searchResultCount);
             return invoiceSearchObj;
 
         }
         catch (error)
         {
             log.error('error', error);
         }
 
     }
 
     function map(context)
     {
         try
         {
             var idSaleOrder = JSON.parse(context.value);
             var idInv = idSaleOrder.values["GROUP(internalid)"].value;
            //  log.debug('idItem', JSON.parse(context.value));
 
             var salesRecord = record.load({
                 type: 'invoice',
                 id: idInv,
             });
            var idSave = salesRecord.save({
                 ignoreMandatoryFields: true
             });
log.debug('idSave',idSave)
 
         }
         catch (error)
         {
             log.error('error', error);
         }
 
     }
 
     function reduce(context)
     {
 
     }
 
     function summarize(summary)
     {
 
     }
 
     return {
         getInputData: getInputData,
         map: map,
         reduce: reduce,
         summarize: summarize
     }
 });
 