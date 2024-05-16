/**
 *@NApiVersion 2.1
 *@NScriptType mapreducescript
 */
 define(['N/search', 'N/record', 'N/log', 'N/runtime', "N/https"],
 function (search, record, log, runtime, https) {
     return {
         getInputData: function (context) {
             try {
                 try {
                     var mySearch = search.create({
                         type: "salesorder",
                         filters:
                         [
                            ["type","anyof","SalesOrd"], 
                            "AND", 
                            ["mainline","is","T"]
                         ],
                         columns:
                         [
                            search.createColumn({name: "internalid", label: "Internal ID"})
                         ]
                      });
                 } catch (e) {
                     log.debug({
                         title: 'Error in getInputData',
                         details: e
                     })
                 }
             } catch (e) {
                 log.debug({ title: 'error getInputData ', details: JSON.stringify(e) });
             }
             return mySearch;
         },
         map: function (context) {
             context.write({
                 key: context.key,
                 value: context.value
             });
         },
         reduce: function (context) {
             try {
                 var objSO = JSON.parse(context.values[0]);

                 var rcd = record.load({
                     type: record.Type.SALES_ORDER,
                     id:  objSO.id,
                     isDynamic: true,
                 })
                 var shipToSelect = rcd.getValue('shipaddresslist');
                 if (shipToSelect && shipToSelect!=-2) return;
                 rcd.setValue({
                     fieldId: 'custbody_sdb_is_ship_to_select_custom',
                     value: true,
                 })
                 var isShipToSelectCustom = rcd.getValue('custbody_sdb_is_ship_to_select_custom');

                 var id = rcd.save({
                     ignoreMandatoryFields: true
                 })
               log.debug("id saved: ", id)

             } catch (e) {
                 log.error({
                     title: 'ERROR reduce',
                     details: 'ERROR ' + JSON.stringify(e)
                 })
             }
         },
         summarize: function (context) {
             try {
                 context.output.iterator().each(function (key, value) {
                     return true;
                 });
             } catch (e) {
                 log.error({
                     title: 'summarize',
                     details: 'ERROR ' + JSON.stringify(e)
                 })
             }
         }
     }
 });
