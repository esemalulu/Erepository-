/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
 define(['N/query', 'N/record', 'N/runtime', 'N/search'],
 /**
  * @param {query} query
  * @param {record} record
  * @param {runtime} runtime
  * @param {search} search
  */
 function(query, record, runtime, search) {
    
     /**
      * 
      * Marks the beginning of the Map/Reduce process and generates input data.
      *
      * @typedef {Object} ObjectRef
      * @property {number} id - Internal ID of the record instance
      * @property {string} type - Record type id
      *
      * @return {Array|Object|Search|RecordRef} inputSummary
      * @since 2015.1
      */
     function getInputData() {
         // Model
         var modelId = runtime.getCurrentScript().getParameter({
             name: 'custscriptgd_unitappupdate_model'
         });
 
         var suiteQLString = "SELECT id FROM customrecordrvsunit WHERE"
         + " custrecordunit_status = 7"
         + " AND custrecordunit_onlinedate > CURRENT_DATE"
         + " AND custrecordunit_model = " + modelId;
 
         return query.runSuiteQL({query: suiteQLString}).asMappedResults();
     }
 
     /**
      * Executes when the map entry point is triggered and applies to each key/value pair.
      *
      * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
      * @since 2015.1
      */
     function map(context) { 
         var params = JSON.parse(context.value);
         var unitID = params.id;
         var unitApplianceSublist = 'recmachcustrecordunitappliances_unit';
    
         try { 
             // Load Unit 
             var unitRecord = record.load({
                 type: 'customrecordrvsunit',
                 id: unitID 
             })
 
             // Delete current list of Unit Appliances
             var lineCount = unitRecord.getLineCount(unitApplianceSublist);
             for (var i = lineCount; i >= 0; i--) {
                 unitRecord.removeLine({
                     sublistId: unitApplianceSublist, 
                     line: i,
                     ignoreRecalc: true
                 });
             }
             
             var modelId = runtime.getCurrentScript().getParameter({
                 name: 'custscriptgd_unitappupdate_model'
             });
             var suiteQLString = "SELECT"
             + " custrecordunitappliancetemplate_type AS type,"
             + " custrecordunitappliancetemplate_desc AS description,"
             + " custrecordunitappliancetemplate_brand AS brand,"
             + " custrecordunitappliancetemplate_modelnum AS modelnum,"
             + " custrecordunitappliancetemplate_serial AS serial,"
             + " custrecordunitappliancetemplate_vendor AS vendor,"
             + " custrecordgd_unitappliancetemplate_categ AS category"
             + " FROM CUSTOMRECORDRVSUNITAPPLIANCETEMPLATE"
             + " WHERE custrecordunitappliancetemplate_model = " + modelId
             + " ORDER BY custrecordunitappliancetemplate_type";
 
             var applianceTemplates = query.runSuiteQL({query: suiteQLString}).asMappedResults();
 
             // Add Unit Appliances to the Unit from Model
             for (var i = 0; i <= applianceTemplates.length - 1; i++) {
                 unitRecord.insertLine({sublistId: unitApplianceSublist, line: i});
                 unitRecord.setSublistValue({
                     sublistId: unitApplianceSublist, 
                     fieldId: 'custrecordunitappliances_type', 
                     line: i, 
                     value: applianceTemplates[i].type
                 });
                 unitRecord.setSublistValue({
                     sublistId: unitApplianceSublist, 
                     fieldId: 'custrecordunitappliances_desc', 
                     line: i, 
                     value: applianceTemplates[i].description
                 });
                 unitRecord.setSublistValue({
                     sublistId: unitApplianceSublist, 
                     fieldId: 'custrecordunitappliances_brandname', 
                     line: i, 
                     value: applianceTemplates[i].brand
                 });
                 unitRecord.setSublistValue({
                     sublistId: unitApplianceSublist, 
                     fieldId: 'custrecordunitappliances_modelnumber', 
                     line: i, 
                     value: applianceTemplates[i].modelnum
                 });
                 unitRecord.setSublistValue({
                     sublistId: unitApplianceSublist, 
                     fieldId: 'custrecordunitappliances_serialnumber', 
                     line: i, 
                     value: applianceTemplates[i].serial
                 });
                 unitRecord.setSublistValue({
                     sublistId: unitApplianceSublist, 
                     fieldId: 'custrecordvendor', 
                     line: i, 
                     value: applianceTemplates[i].vendor
                 });
                 unitRecord.setSublistValue({
                     sublistId: unitApplianceSublist, 
                     fieldId: 'custrecordgd_unitappliances_category', 
                     line: i, 
                     value: applianceTemplates[i].category
                 });
             }
 
             // Save the Unit Record
             unitRecord.save();
         } catch (error) {
             log.error('SS ERROR', 'Could not update Unit with ID ' + unitID + '. Error description:\r\n' + error);
         }
 
     }
 
     /**
      * Executes when the reduce entry point is triggered and applies to each group.
      *
      * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
      * @since 2015.1
      */
     function reduce(context) {
 
     }
 
 
     /**
      * Executes when the summarize entry point is triggered and applies to the result set.
      *
      * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
      * @since 2015.1
      */
     function summarize(summary) {
         var modelId = runtime.getCurrentScript().getParameter({
             name: 'custscriptgd_unitappupdate_model'
         });
         record.submitFields({
             type: 'assemblyitem',
             id: modelId,
             values: {
                 'custitemgd_unitappliancesupdated': false
             }
         });
     }
 
     return {
         getInputData: getInputData,
         map: map,
         reduce: reduce,
         summarize: summarize
     };
     
 });
 