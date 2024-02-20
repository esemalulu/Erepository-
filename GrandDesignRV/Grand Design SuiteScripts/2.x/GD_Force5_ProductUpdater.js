/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
 define(['N/log', 'N/query', 'N/record', 'N/runtime', 'N/format'],
 /**
  * @param{log} log
  * @param{query} query
  * @param{record} record
  */
 (log, query, record, runtime, format) => {
     /**
      * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
      * @param {Object} inputContext
      * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
      *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
      * @param {Object} inputContext.ObjectRef - Object that references the input data
      * @typedef {Object} ObjectRef
      * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
      * @property {string} ObjectRef.type - Type of the record instance that contains the input data
      * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
      * @since 2015.2
      */

     const getInputData = (inputContext) => {
         try {
             log.audit(`runtime.getCurrentScript()`, JSON.stringify(runtime.getCurrentScript()));
             var data = [];
             let myQuery
             // Model
             var modelId = runtime.getCurrentScript().getParameter({
                 name: 'custscriptgd_f5_model'
             });
             // API Was called
             const APISENT = runtime.getCurrentScript().getParameter({
                 name: 'custscriptgd_f5_apisent'
             });
             if (APISENT) {
                 data = JSON.parse(APISENT);
             } else {
                 if (modelId) {
                     log.audit(`modelId`, modelId);
                     myQuery = `Select "id" from ITEM where id = ${modelId}`
                 } else {
                     myQuery = `Select "id" from ITEM where custitemgd_updatetobackoffice = 'T' AND isinactive = 'F'`
                 }
                 log.audit(`myQuery`, myQuery);
                 var myQuerySuiteQLResult = query.runSuiteQLPaged({
                     query: myQuery,
                     pageSize: 1000
                 }).iterator();
                 // Fetch results using an iterator
                 myQuerySuiteQLResult.each(function (pagedData) {
                     data = data.concat(pagedData.value.data.asMappedResults());
                     return true;
                 });
             }
             return data;
         } catch (inputErrror) {
             log.error(`Get Input Data Error`, inputErrror);
         }
     }

     /**
      * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
      * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
      * context.
      * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
      *     is provided automatically based on the results of the getInputData stage.
      * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
      *     function on the current key-value pair
      * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
      *     pair
      * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
      *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
      * @param {string} mapContext.key - Key to be processed during the map stage
      * @param {string} mapContext.value - Value to be processed during the map stage
      * @since 2015.2
      */

     const map = (mapContext) => {
         try {
             var mapData = JSON.parse(mapContext.value);
             // API Was called
             var apiSent = runtime.getCurrentScript().getParameter({
                 name: 'custscriptgd_f5_apisent'
             });
             let myRecordID = mapData.id || '';
             if (apiSent) {
                 clearPendingStatus(mapData);
             } else {
                 log.audit(`Model ID`, myRecordID);
                 if (myRecordID) {
                     //get the main body of data
                     let mainDataSuiteQL = `SELECT ( item.id )                                AS "Internal_ID",
       ( item.itemid )                            AS "Name",
       ( item.displayname )                       AS "Display_Name",
       ( item.description )                       AS "Description",
       ( item.custitemrvsmsomodel )               AS "MSO_Model",
       ( item.custitemrvsmodelseries )            AS "Series",
       ( item.custitemrvsmodeltype )              AS "Model_Type",
       ( pricelevel.discountpct )                 AS "Markup_Discount",
       ( item.custitemrvs_modelline )             AS "RVS_Model_Line",
       ( item.custitemgd_subseries )              AS "GD_Sub_Series",
       ( item.custitemrvs_msrplevel )             AS "MSRP_Level",
       ( item.custitemrvsmodelyear )              AS "Year",
       ( item.custitemrvsmodelsquarefeet )        AS "Square_Feet",
       ( item.custitemrvsmodelgvwrlbs )           AS "GVWR_LBS",
       ( item.custitemrvsmodeluvwlbs )            AS "UVW_Lbs",
       ( item.custitemrvs_uvwminweight )          AS "RVS_UVW_Minimum_Weight",
       ( item.custitemrvs_uvwmaxweight )          AS "RVS_UVW_Maximum_Weight",
       ( item.custitemrvsmodelhitchweight )       AS "Hitch_Weight",
       ( item.custitemrvs_hitchminweight )        AS "RVS_Hitch_Minimum_Weight",
       ( item.custitemrvs_hitchmaxweight )        AS "RVS_Hitch_Maximum_Weight",
       ( item.custitemrvsmodelaxleweight )        AS "Axle_Weight",
       ( item.custitemrvsmodelgawrallaxles )      AS "GAWR_All_Axles",
       ( item.custitemrvsmodelgawrsingleaxle )    AS "GAWR_Single_Axle",
       ( item.custitemrvsmodelaxleconfiguration ) AS "Axle_Configuration",
       ( item.custitemrvsmodelgrossncc )          AS "Gross_NCC",
       ( item.custitemrvsmodelnetncc )            AS "Net_NCC",
       ( item.custitemrvsmodelextlength )         AS "Ext_Length",
       ( item.custitemrvsextlengthdecimal )       AS "Ext_Length_Decimal",
       ( item.custitemrvslengthincludinghitch )   AS "Length_Including_Hitch",
       ( item.custitemrvsextlengthexclhitch )     AS "Length_Excluding_Hitch",
       ( item.custitemrvs_lengthfromkingpin )     AS "Length_from_Kingpin",
       ( item.custitemrvsmodelextheight )         AS "Ext_Height",
       ( item.custitemrvsmodelextwidth )          AS "Ext_Width",
       ( item.custitemrvsmodelwaterheater )       AS "Water_Heater",
       ( item.custitemrvsmodelfreshwater )        AS "Fresh_Water",
       ( item.custitemrvsmodelgraywater )         AS "Gray_Water",
       ( item.custitemrvsmodelwaste )             AS "Waste",
       ( item.custitemrvsmodellpgascapacitylbs )  AS "LP_Gas_Capacity_Lbs",
       ( item.custitemrvsmodelfurnace )           AS "Furnace",
       ( item.custitemrvsmodeltiresize )          AS "Tire_Size",
       ( item.custitemrvsmodelawningsize )        AS "Awning_Size",
       ( item.custitemrvstiresstd )               AS "Tires_Std",
       ( item.custitemrvstirepsistd )             AS "Tire_PSI_Std",
       ( item.custitemrvstirerimstd )             AS "Tire_Rim_Std",
       ( item.custitemrvstiresoptional )          AS "Tires_Optional",
       ( item.custitemrvstirepsioptional )        AS "Tire_PSI_Optional",
       ( item.custitemrvsrimsizeoptional )        AS "Rim_Size_Optional",
       ( item.id )                                AS "pricelvl",
       ( item.id )                                AS "Options"
FROM   item,
       pricelevel
WHERE  item.custitemrvs_msrplevel = pricelevel.id
       AND item.id = '${myRecordID}'
       AND item.isinactive = 'F'`;

                     var mainDataSuiteQLResults = query.runSuiteQL({
                         query: mainDataSuiteQL,
                     }).asMappedResults();

                     //get list of all MSRP price levels
                     priceListQuery = "SELECT DISTINCT name FROM pricelevel WHERE isinactive = 'F'"
                     priceListResults = query.runSuiteQL({
                         query: priceListQuery
                     })//.asMappedResults()

                     //Gets the Options Data and adds it to the Main Results Object
                     var optionsAry = new Array;
                     var optionsSuiteQL = `SELECT (customrecordrvsmodeloption.custrecordmodeloption_model) AS "Model", BUILTIN.DF(customrecordrvsmodeloption.custrecordmodeloption_option) AS "Option", (item.description) AS "Option Description", (customrecordrvsmodeloption.custrecordmodeloption_quantity) AS "Quantity", (customrecordrvsmodeloption.custrecordmodeloption_mandatory) AS "Is Mandatory", (customrecordrvsmodeloption.custrecordmodeloption_standard) AS "Is Standard", (item.custitemgd_byooptionsgroupfield) AS "GD BYO Options Group", (SELECT itemPrice.discountdisplay FROM itemPrice WHERE item.id = itemPrice.item AND itemPrice.pricelevelname = 'MSRP') AS "MSRP", (SELECT itemPrice.price FROM itemPrice WHERE item.id = itemPrice.item AND itemPrice.pricelevelname = 'MSRP') AS "Option Price",`
                     for(var i = 0 ; i < priceListResults.results.length ; i++) {
                         if(priceListResults.results[i].values[0].includes('MSRP ')){
                             optionsSuiteQL += ` (SELECT itemPrice.pricelevelname FROM itemPrice WHERE item.id = itemPrice.item AND itemPrice.pricelevelname = '` 
                             optionsSuiteQL += priceListResults.results[i].values[0] 
                             optionsSuiteQL += `') AS "`
                             optionsSuiteQL += priceListResults.results[i].values[0]
                             optionsSuiteQL += ` name",`

                             optionsSuiteQL += ` (SELECT itemPrice.price FROM itemPrice WHERE item.id = itemPrice.item AND itemPrice.pricelevelname = '` 
                             optionsSuiteQL += priceListResults.results[i].values[0] 
                             optionsSuiteQL += `') AS "`
                             optionsSuiteQL += priceListResults.results[i].values[0]
                             optionsSuiteQL += ` price"`
                             if(i != priceListResults.results.length - 1){
                                 optionsSuiteQL += ','
                             }
                         }
                         //var y = `(SELECT itemPrice.id FROM itemPrice WHERE item.id = itemPrice.item AND itemPrice.pricelevelname = '` + priceListResults.results[i].values[3] + `') AS "` + priceListResults.results[i].values[3] ` id")`
                     }
                     optionsSuiteQL += `FROM customrecordrvsmodeloption, item WHERE customrecordrvsmodeloption.custrecordmodeloption_model = ${myRecordID} AND customrecordrvsmodeloption.isinactive = 'F' AND customrecordrvsmodeloption.custrecordmodeloption_option = item.id`;
                     var optionsSuiteQLResults = query.runSuiteQL({
                         query: optionsSuiteQL,
                     }).asMappedResults();
                     for (let j = 0; j < optionsSuiteQLResults.length; j++) {
                         var currentResult = optionsSuiteQLResults[j];
                         optionsAry = optionsAry.concat(currentResult);
                     }
                     try{
                         mainDataSuiteQLResults[0].options = optionsAry;
                     }
                     catch(err)
                     {
                         log.debug('error', err)
                     }
                     optionsAry = [];

                     //Gets the Price Level Data and adds it to the Main Results Object
                     var priceLvlAry = new Array;
                     var priceLvlSuiteQL = `SELECT pricing.item, pricing.pricelevel, pricing.unitprice FROM item, pricing WHERE item.isinactive = 'F' AND item.id = pricing.item AND item.id = '${myRecordID}'`;
                     var priceLvlSuiteQLResults = query.runSuiteQL({
                         query: priceLvlSuiteQL,
                     }).asMappedResults();
                     for (let j = 0; j < priceLvlSuiteQLResults.length; j++) {
                         var currentResult = priceLvlSuiteQLResults[j];
                         priceLvlAry = priceLvlAry.concat(currentResult);
                     }
                     mainDataSuiteQLResults[0].pricelvl = priceLvlAry;
                     priceLvlAry = [];

                     let apiJSON = outputJSON(JSON.stringify(mainDataSuiteQLResults[0]));

                     if (apiJSON) {
                         // Sets the Data on the Queue Record
                         try {
                             myQueueRecord = record.create({
                                 type: 'customrecordgd_f5_product_queue',
                                 isDynamic: true,
                             });
                             myQueueRecord.setText({ //vin
                                 fieldId: 'custrecordgd_f5_product_queue_modelid',
                                 text: myRecordID,
                                 ignoreFieldChange: true
                             });
                             var today = new Date();
                             today = format.format({
                                 value: today,
                                 type: format.Type.DATETIMETZ
                             });
                             myQueueRecord.setText({ //ship date
                                 fieldId: 'custrecordgd_f5_product_queue_updatedate',
                                 text: today,
                                 ignoreFieldChange: true
                             });
                             myQueueRecord.setText({
                                 fieldId: 'custrecordgd_f5_product_queue_data',
                                 text: JSON.stringify(apiJSON),
                                 ignoreFieldChange: true
                             });
                             myQueueRecord.setValue({
                                 fieldId: 'custrecordgd_f5_product_queue_pending',
                                 value: true,
                                 ignoreFieldChange: true
                             });
                             myQueueRecord.save({
                                 enableSourcing: false,
                                 ignoreMandatoryFields: true
                             });

                             //unchecks the update to backoffice field on the model
                             let myRecord = record.load({
                                 type: record.Type.ASSEMBLY_ITEM,
                                 id: myRecordID,
                                 isDynamic: true,
                             });
                             myRecord.setValue({
                                 fieldId: 'custitemgd_updatetobackoffice',
                                 value: false,
                                 ignoreFieldChange: true
                             });
                             myRecord.save({
                                 enableSourcing: false,
                                 ignoreMandatoryFields: true
                             });
                         } catch (e) {
                             log.error('Update/Save Records Error: ', e);
                         }
                     }
                 }
             }
         } catch (mapError) {
             log.error(`Map Error`, mapError);
         }
     }

     /**
      * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
      * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
      * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
      *     provided automatically based on the results of the map stage.
      * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
      *     reduce function on the current group
      * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
      * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
      *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
      * @param {string} reduceContext.key - Key to be processed during the reduce stage
      * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
      *     for processing
      * @since 2015.2
      */
     const reduce = (reduceContext) => {

     }


     /**
      * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
      * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
      * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
      * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
      *     script
      * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
      * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
      *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
      * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
      * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
      * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
      *     script
      * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
      * @param {Object} summaryContext.inputSummary - Statistics about the input stage
      * @param {Object} summaryContext.mapSummary - Statistics about the map stage
      * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
      * @since 2015.2
      */
     const summarize = (summaryContext) => {
         // Log details about script execution
         log.audit('Usage units consumed', summaryContext.usage);
         log.audit('Concurrency', summaryContext.concurrency);
         log.audit('Number of yields', summaryContext.yields);
     }

     const outputJSON = (data) => {
         try {
             var productJSON;
             try {
                 data = JSON.parse(data);
             } catch (e) {
                 log.error(`JSON.parse Error`, e);
                 log.error('OutputJSON Error Data', data);
             }

             //create JSON data
             productJSON = {
                 ID: data.internal_id || "",
                 "Model Name": data.name || "",
                 "Display Name/Code": data.display_name || "",
                 Description: data.description || "",
                 "MSO Model": data.mso_model || "",
                 Series: data.series || "",
                 "Model Type": data.model_type || "",
                 MSRP: `${(data.markup_discount*100)}%` || "",
                 "Model Line": data.rvs_model_line || "",
                 "GD Sub-Series": data.gd_sub_series || "",
                 "MSRP Text": data.msrp_level || "",
                 "Unit Specifications": [{
                     //(All fields)
                     Year: data.year || "",
                     "Square Feet": data.square_feet || "",
                     "GVWR (Lbs)": data.gvwr_lbs || "",
                     "UVW (Lbs)": data.uvw_lbs || "",
                     "UVW Minimum Weight": data.rvs_uvw_minimum_weight || "",
                     "UVW Maximum Weight": data.rvs_uvw_maximum_weight || "",
                     "Hitch Weight": data.hitch_weight || "",
                     "Hitch Maximum Weight": data.rvs_hitch_minimum_weight || "",
                     "Hitch Minimum Weight": data.rvs_hitch_maximum_weight || "",
                     "Axle Weight": data.axle_weight || "",
                     "GAWR - All Axles": data.gawr_all_axles || "",
                     "GAWR - Single Axle": data.gawr_single_axle || "",
                     "Axle Configuration": data.axle_configuration || "",
                     "Gross NCC": data.gross_ncc || "",
                     "Net NCC": data.net_ncc || "",
                     "Ext. Length": data.ext_length || "",
                     "Ext. Length Decimal": data.ext_length_decimal || "",
                     "VIN Lengt": data.length_including_hitch || "",
                     "Length Excluding Hitch": data.length_excluding_hitch || "",
                     "Length from Kingpin": data.length_from_kingpin || "",
                     "Ext. Height (in.)": data.ext_height || "",
                     "Ext. Width (in.)": data.ext_width || "",
                     "Water Heater (gal.)": data.water_heater || "",
                     "Fresh Water": data.fresh_water || "",
                     "Gray Water": data.gray_water || "",
                     Waste: data.waste || "",
                     "LP Gas Capacity (Lbs)": data.lp_gas_capacity_lbs || "",
                     Furnace: data.furnace || "",
                     "Tire Size": data.tire_size || "",
                     "Awning Size (ft.)": data.awning_size || "",
                     "Tires Std.": data.tires_std || "",
                     "Tire PSI Std.": data.tire_psi_std || "",
                     "Tire Rim Std.": data.tire_rim_std || "",
                     "Tires Optional": data.tires_optional || "",
                     "Tire PSI - Optional": data.tire_psi_optional || "",
                     "Rim Size - Optional": data.rim_size_optional || "",
                 }, ],
                 "Pricing data": data.pricelvl || "",
                 Options: data.options || "",
             };

         } catch (outputJSONError) {
             log.error('OutputJSON Error', outputJSONError);
         }
         return productJSON;
     }

     const clearPendingStatus = (myRecordID) => {
         try {
             myQueueRecord = record.load({
                 type: 'customrecordgd_f5_product_queue',
                 id: myRecordID,
                 isDynamic: true,
             });
             myQueueRecord.setValue({
                 fieldId: 'custrecordgd_f5_product_queue_pending',
                 value: false,
                 ignoreFieldChange: true
             });
             myQueueRecord.save({
                 enableSourcing: false,
                 ignoreMandatoryFields: true
             });
         } catch (e) {
             log.error('API Sent Records Error: ', e);
         }
         return true;
     }

     return {
         getInputData,
         map,
         //reduce,
         summarize
     }



 });