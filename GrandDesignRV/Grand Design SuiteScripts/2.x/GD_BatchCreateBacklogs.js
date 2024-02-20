/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/runtime', 'N/ui/serverWidget', 'N/query', 'N/format', 'N/url', 'N/redirect','N/task', 'N/https', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {serverWidget} serverWidget
 * @param {query} query
 * @param {format} format
 * @param {url} url
 * @param {redirect} redirect
 * @param {task} task
 * @param {https} https
 */
function(record, runtime, serverWidget, query, format, url, redirect, task, https, SSLib_Task) {
   /**
    *  Creates a Suitelet for batch creating work orders
    *
    * @param {Object} context
    * @param {ServerRequest} context.request - Encapsulation of the incoming request
    * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
    * @Since 2015.2
    */

        function onRequest(context){
           if(context.request.method == 'GET'){
               var form = serverWidget.createForm('Batch Create Backlogs 2.0'); 
               form.addTab('custpage_tabcreatebacklogs', 'Create Backlogs');

               var processing = context.request.parameters.custparam_currentlyprocessing
               if(processing == "T") //only kicks off after M/R has been triggered, displays to the user how far along the BCB record's processing is
               {

                   var batchBacklogCreateRecordId = context.request.parameters.custparam_batchcreatebacklogid
                   var batchCreateBacklogRecord = record.load({type:'customrecordrvsbatchbacklogcreate', id: batchBacklogCreateRecordId});
                   var locationId = context.request.parameters.custparam_locationid;

                   var infoField = form.addField({
                       id: 'custpage_info',
                       label: '&nbsp;',  
                       type: 'text', 
                       source: null,
                       container: 'custpage_fieldgroup'});
                   infoField.updateDisplayType({
                       displayType : serverWidget.FieldDisplayType.INLINE
                   });
                   if(batchCreateBacklogRecord.getValue('custrecordbatchbacklogcreate_percentcomp') == 100){
                       infoField.defaultValue = "The backlogs have finished processing."
                   }
                   else{
                       infoField.defaultValue = 'The backlogs for location ' + batchCreateBacklogRecord.getText('custrecordbatchbacklogcreate_location') + " is currently processing. It is currently " + batchCreateBacklogRecord.getValue('custrecordbatchbacklogcreate_percentcomp') + " percent complete.";
                   }
                   var endField = form.addField({
                       id: 'custpage_end',
                       label:'the end?',  
                       type: 'checkbox', 
                       source: null,
                       container: null});
                       endField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.HIDDEN
                       });
                       endField.defaultValue = 'T';
                   var idField = form.addField({
                       id: 'custpage_backlogid',
                       label:'the id?',  
                       type: 'integer', 
                       source: null,
                       container: null});
                       idField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.HIDDEN
                       });
                       idField.defaultValue = batchBacklogCreateRecordId;    
                   
                   form.addSubmitButton('Refresh');

               }
               else{   //initializes first step of suitelet with form to create filters

                   var fg = form.addFieldGroup({
                       id: 'custpage_fgfilters', 
                       label: 'Filters'});

                   var locationId = context.request.parameters.custparam_locationid;
                   var seriesId = context.request.parameters.custparam_seriesid;
                   var modelId = context.request.parameters.custparam_modelid;
                   
                   var locationField = form.addField({
                       id:'custpage_location',
                       label:'Location', 
                       type:'select', 
                       source: 'location', 
                       container:'custpage_fgfilters'});
                   locationField.isMandatory = true;
                   var seriesField = form.addField({
                       id:'custpage_series',
                       label: 'Series', 
                       type: 'select', 
                       source:'customrecordrvsseries', 
                       container:'custpage_fgfilters'});
                   var modelField = form.addField({
                       id:'custpage_model',
                       label: 'Model',  
                       type: 'MULTISELECT', 
                       container:'custpage_fgfilters'});
                   modelField.addSelectOption({
                       value: '',
                       text: '', 
                       selected: true});

                   var modelQuery = "SELECT id, itemid FROM item WHERE custitemrvsdiscontinuedmodel = 'F' AND isinactive = 'F' AND custitemrvsitemtype = 4 ORDER BY itemid ASC" ;
                   var modelResults = query.runSuiteQL({
                       query: modelQuery
                   });
                   if (modelResults.results[0].values[0] != null)
                   {
                       for (var i=0; i<modelResults.results.length; i++)
                       {
                           modelField.addSelectOption({
                               value: modelResults.results[i].values[0], 
                               text: modelResults.results[i].values[1],
                               selected: false});
                       }
                   }
                   if (locationId == null || locationId == "") //if suitelet is in first step, this will trigger
                   {

                       // use this variable to know if we are in "pre-load" meaning we want them to choose their filters
                       // this just tells us where we are at when they submit the form
                       var preLoadField = form.addField({
                           id: 'custpage_preload',
                           label:'Preload?',  
                           type: 'checkbox', 
                           source: null,
                           container: null});
                           preLoadField.updateDisplayType({
                               displayType : serverWidget.FieldDisplayType.HIDDEN
                           });
                           preLoadField.defaultValue = 'T';
                       
                       form.addSubmitButton('Get Backlogs'); //with the exception of fewer conditionals to get here, the code remains the same up until this point
                   }
                   else{ 
                       form.clientScriptModulePath = "./GD_BatchCreateBacklogs_Client.js"; 
                          
                           //if suitelet is in second step, this will trigger and preload will be null
                       locationField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });
                       seriesField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });
                       modelField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });

                       //Create a selected units field to keep track of selected units
                       selectedUnitsField = form.addField({
                           id:'custpage_selectedmodels',
                           label:'Selected Models', 
                           container:'custpage_fgfilters',
                           type:  serverWidget.FieldType.INLINEHTML});
                       selectedUnitsField.defaultValue = 
                       '<table style="border: 2px solid black; width: 220px;overflow-y: scroll; display: block; height: 150px;"><thead><th style="background-color: white; font-weight: bold; font-size: 1.5em; text-align: center; font-color:black;">Added Models</th></thead><tbody></tbody></table>';

                       //now query to find the sales orders that fit the filters we set
                       var orderQuery = "SELECT DISTINCT trandate, transaction.id, BUILTIN.DF(tranid) as tranids, BUILTIN.DF(transaction.entity), transaction.memo, BUILTIN.DF(custbodyrvsunit), custrecordunit_backlog, custrecordunit_status, BUILTIN.DF(custbodyrvsseries), BUILTIN.DF(custbodyrvsmodel), BUILTIN.DF(location), custbodyrvsretailsoldname, transaction.entity, custbodyrvsunit, transaction.foreigntotal FROM ((transaction INNER JOIN customrecordrvsunit ON transaction.custbodyrvsunit = customrecordrvsunit.id) INNER JOIN transactionLine ON transaction.id = transactionLine.transaction) WHERE type = 'SalesOrd' AND custbodyrvsordertype = 2 AND (custrecordunit_shippingstatus = 1 OR custrecordunit_shippingstatus IS NULL) AND custrecordunit_backlog IS NULL AND custbodyrvsunit IS NOT NULL AND (status = 'SalesOrd:B' OR status = 'SalesOrd:D' OR status = 'SalesOrd:E' OR status = 'SalesOrd:F') AND isinactive = 'F' AND custrecordvinwascalculated = 'F' AND location = " + locationId;
                       locationField.defaultValue = locationId;
                       if(seriesId != 'NONE')
                       {
                           orderQuery = orderQuery + " AND custbodyrvsseries = " + seriesId;
                           seriesField.defaultValue = seriesId;
                       }
                       if(modelId != 'NONE')
                       {

                           var delimiter = /\u0005/
                           modelId = modelId.split(delimiter)
                           modelField.defaultValue = modelId;
                           if(modelId.length == 1)
                           {   
                               orderQuery = orderQuery + " AND custbodyrvsmodel = " + modelId[0];
                           }
                           else{
                               orderQuery = orderQuery + " AND custbodyrvsmodel IN (" + modelId[0];
                               for(i = 1 ; i < modelId.length ; i++){
                                   orderQuery = orderQuery + ", " + modelId[i];
                               }
                               orderQuery = orderQuery + ")";
                           }
                       }
                       orderQuery = orderQuery + " ORDER BY trandate, tranids";
                       var ordersBacklogResults = query.runSuiteQL({
                           query: orderQuery
                       });

                       //create columns for query results
                       var sublist = form.addSublist({
                           id: 'custpage_sublistcreatebacklogs', 
                           type: 'list', 
                           label: 'Create Backlogs', 
                           tab: 'custpage_tabcreatebacklogs'});
                       

                           var buttonsHTML = form.addField({
                               id: 'custpagess_htmlsbuttons',
                               label: 'Buttons',
                               type: serverWidget.FieldType.INLINEHTML,
                           })
                   
                           // Inline HTML detailing the button style functionality (changing on hover, button press)
                           var functionHTML = "<script>" +
                           "function hoverStyle(object) { object.style.backgroundColor = \"#e5e5e5\"; object.style.boxShadow = \"none\"}" +
                           "function downStyle(object) { object.style.backgroundColor = \"#b2b2b2\"; object.style.boxShadow = \"0 0 2px 2px #59a0f6\"; }" +
                           "function upStyle(object) { object.style.backgroundColor = \"#e5e5e5\"; object.style.boxShadow = \"none\"}" +
                           "function outStyle(object) { object.style.backgroundColor = \"#f2f2f2\"; object.style.boxShadow = \"none\"}" +
                           "</script>";
                   
                           var buttonHTML = "<button type=\"button\" style = \" border-radius: 3px; border: #b2b2b2 1px solid;" +
                           "background-color: #f2f2f2;" +
                           "color: #222222 !important;" +
                           "display: inline-block;" +
                           "text-align: center;" +
                           "padding: 5px 0px;" +
                           "font-weight: 600;" +
                           "font-size: 8pt;" +
                           "width: 125px;" +
                           "margin: 10px auto 10px 5px;" +
                           "\" + onMouseOver = \"hoverStyle(this)\" onMouseOut = \"outStyle(this)\" " +
                           "onMouseDown=\"downStyle(this)\" onMouseUp = \"upStyle(this)\"";
                   
                           //Inline HTML buttons for marking and unmarking all exclude/select checkboxes
                           var selectAll = buttonHTML + " onClick=\"markAll('custpage_subcreatebacklog')\" > Select All";
                           var unselectAll = buttonHTML + " onClick=\"unmarkAll('custpage_subcreatebacklog')\" > Unselect All";
                   
                           buttonsHTML.defaultValue =  functionHTML + selectAll + unselectAll;

                       sublist.addField({
                           id:'custpage_subcreatebacklog', 
                           type:'checkbox', 
                           label:'Create Backlog'
                       });
                       var orderNumField = sublist.addField({
                           id: 'custpage_subordernumber', 
                           type: 'text', 
                           label: 'Order Number'
                       });
                       orderNumField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });			
                       
                       var dateField = sublist.addField({
                           id:'custpage_subdate',
                           type: 'text',
                           label: 'Date'
                       });
                       dateField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });			
                       
                       var dealerField = sublist.addField({
                           id:'custpage_subdealer',
                           type: 'text',
                           label: 'Dealer'
                       });
                       dealerField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });			
                       
                       var retailNameField = sublist.addField({
                           id:'custpage_subretailname', 
                           type: 'text', 
                           label: 'Order Retail Name'
                       });
                       retailNameField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });			
                       
                       var unitField = sublist.addField({
                           id:'custpage_subunit',
                           type:'text', 
                           label:'Unit'
                       });
                       unitField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });				
                       
                       var seriesField = sublist.addField({id:'custpage_subseries', type:'text', label:'Series'});
                       seriesField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });			
                       
                       var modelField = sublist.addField({id:'custpage_submodel', type:'text', label:'Model'});
                       modelField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });				
                       
                       var amountField = sublist.addField({id:'custpage_subamount', type: 'currency', label:'Amount'});
                       amountField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });			
                       
                       var locationField = sublist.addField({id:'custpage_sublocation', type:'text', label:'Location'});
                       locationField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.INLINE
                       });			
                       
                       var dealerRefundIdField = sublist.addField({id:'custpage_orderid', type:'text', label:'XYZ'});
                       dealerRefundIdField.updateDisplayType({
                           displayType : serverWidget.FieldDisplayType.HIDDEN
                       });



                       if(ordersBacklogResults != null)    //populate the query results into the form
                       {
                           for(var i = 0 ; i < ordersBacklogResults.results.length ; i++)
                           {
                               var date = ordersBacklogResults.results[i].values[0];
                               var orderInternalId = ordersBacklogResults.results[i].values[1];
                               var number = ordersBacklogResults.results[i].values[2];
                               var dealerId = ordersBacklogResults.results[i].values[12];
                               var dealerName = ordersBacklogResults.results[i].values[3];;
                               var retailSoldName = ordersBacklogResults.results[i].values[11];
                               var unitId = ordersBacklogResults.results[i].values[13];
                               var unitName = ordersBacklogResults.results[i].values[5];
                               var seriesName = ordersBacklogResults.results[i].values[8];
                               var modelName = ordersBacklogResults.results[i].values[9];
                               var amount = ordersBacklogResults.results[i].values[14];
                               var location = ordersBacklogResults.results[i].values[10];

                               var dealerURL = url.resolveRecord({
                                   recordType: 'customer',
                                   recordId: dealerId,
                                   isEditMode: false
                               })
                               var orderURL = url.resolveRecord({
                                   recordType: 'salesorder',
                                   recordId: orderInternalId,
                                   isEditMode: false
                               })
                               var unitURL = url.resolveRecord({
                                   recordType: 'customrecordrvsunit',
                                   recordId: unitId,
                                   isEditMode: false
                               })

                               sublist.setSublistValue({
                                   id: 'custpage_subdate',
                                   line: i,
                                   value: date
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_subordernumber',
                                   line: i,
                                   value: '<a target="_blank" href="' + orderURL + '">' + number + '</a>'
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_subdealer',
                                   line: i,
                                   value: '<a target="_blank" href="' + dealerURL + '">' + dealerName + '</a>'
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_subretailname',
                                   line: i,
                                   value: retailSoldName
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_subunit',
                                   line: i,
                                   value: '<a target="_blank" href="' + unitURL +  '">' + unitName + '</a>'
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_submodel',
                                   line: i,
                                   value: modelName
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_subseries',
                                   line: i,
                                   value: seriesName
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_sublocation',
                                   line: i,
                                   value: location
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_orderid',
                                   line: i,
                                   value: orderInternalId
                               })
                               sublist.setSublistValue({
                                   id: 'custpage_subamount',
                                   line: i,
                                   value: amount
                               })
                           }
                       }
                       form.addSubmitButton('Create Backlogs');
                   }   
               }
               context.response.writePage({
                   pageObject: form
               });
           }
           else{
               var preLoad = context.request.parameters.custpage_preload;
               var end = context.request.parameters.custpage_end;
               if(end == 'T'){ //just returns it back to the suitelet but will update the displayed %complete
                   var batchBacklogCreateRecordId = context.request.parameters.custpage_backlogid
                   var params = new Array();
                   params['custparam_currentlyprocessing'] = "T";
                   params['custparam_batchcreatebacklogid'] = batchBacklogCreateRecordId;
                   redirect.toSuitelet({
                       scriptId:'customscriptgd_batchcreatebacklogsuite_2', 
                       deploymentId: 'customdeploygd_batchcreatebacklogsuite_2', 
                       isExternal: null, 
                       parameters: params});
               }
               else if (preLoad == 'T')
               {

                   var params = new Array();
                   
                   var locationId = context.request.parameters.custpage_location;
                   params['custparam_locationid'] = 'NONE';
                   if (locationId != '') //flag
                   {
                       params['custparam_locationid'] = locationId;
                   }
                   
                   var seriesId = context.request.parameters.custpage_series;
                   params['custparam_seriesid'] = 'NONE';
                   if (seriesId != '')
                   {
                       params['custparam_seriesid'] = seriesId;
                   }
                   
                   var modelId = context.request.parameters.custpage_model;
                   //params['custparam_modelid'] = new Array()//'NONE';
                   params['custparam_modelid'] = 'NONE';
                   if (modelId != '')
                   {
                       params['custparam_modelid'] = modelId;
                   }
                   //params['custparam_modelid'] = JSON.stringify(params['custparam_modelid']);
                   redirect.toSuitelet({ //pass back selected filters to suitelet and use them to filter in the query
                       scriptId:'customscriptgd_batchcreatebacklogsuite_2', 
                       deploymentId: 'customdeploygd_batchcreatebacklogsuite_2', 
                       isExternal: null, 
                       parameters: params});
               }
               else{
                   log.debug('Line 458');
                   var locationId = context.request.parameters.custpage_location
                   //query to find the BCB record corresponding to selected location
                   var bcbQuery = "SELECT id FROM customrecordrvsbatchbacklogcreate WHERE custrecordbatchbacklogcreate_location = " + locationId;
                   log.debug('BCB Query: ', bcbQuery);
                   var bcbResults = query.runSuiteQL({
                       query: bcbQuery
                   })
                   if(bcbResults.results.length > 0){
                       var batchBacklogCreateRecordId = bcbResults.results[0].values[0];
                   }
                   if(batchBacklogCreateRecordId != null)
                   {
                       var batchCreateBacklogRecord = record.load({type:'customrecordrvsbatchbacklogcreate', id: batchBacklogCreateRecordId});
                       var batchCreateBacklogStatusId = batchCreateBacklogRecord.getValue('custrecordbatchbacklogcreate_status');
                   }
                   //if no record for that location exists, create a new record with that location and save it
                   else{
                       var batchCreateBacklogRecord = record.create({
                           type:'customrecordrvsbatchbacklogcreate', 
                           isDynamic: true
                       });
                       batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_location', value: locationId});
                       batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_status', value: 1});
                       batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_percentcomp', value: 0});
                       batchCreateBacklogRecord.setValue({fieldId: 'name', value: locationId});
                       batchCreateBacklogRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
                       var batchCreateBacklogStatusId = batchCreateBacklogRecord.getValue('custrecordbatchbacklogcreate_status');
                       var batchBacklogCreateRecordId = batchCreateBacklogRecord.getValue('id');
                   }

                   log.debug('Backlog Status ID: ', batchCreateBacklogStatusId);
                   if (batchCreateBacklogStatusId == 1){// check if BCB record is processing, if not, load it and have it process
                       var lineCount = context.request.getLineCount('custpage_sublistcreatebacklogs');
                       var orderIds = [];
                       // loop through and set the order Ids array
                       for (var i=0; i<lineCount; i++)
                       {
                           if (context.request.getSublistValue({group: 'custpage_sublistcreatebacklogs', name: 'custpage_subcreatebacklog', line: i}) == 'T'){
                               var orderId = context.request.getSublistValue({group: 'custpage_sublistcreatebacklogs', name: 'custpage_orderid', line:i});
                               orderId = parseInt(orderId);
                               orderIds.push(orderId)
                           }
                       }
                       if(orderIds.length > 0)
                       {
                           log.debug('Line 503: ');
                           batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_salesorders', value: orderIds});
                           batchCreateBacklogRecord.setValue({fieldId:'custrecordbatchbacklogcreate_percentcomp', value: 0});
                           batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_date', value: format.parse({value: new Date(), type: 'datetimetz'})});
                           batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_status', value: 2});
                           batchCreateBacklogRecord.save();
                           
                       }

                       var params = {};
                       params['custscript_batchcreatebacklogid'] = batchBacklogCreateRecordId;
                       log.debug('final check', typeof(params['custscript_batchcreatebacklogid']));
                       SSLib_Task.startMapReduceScript('customscriptgd_batchcreatebacklogs_mr', null, params);
                   }
                   var params = {};
                   params['custparam_batchcreatebacklogid'] = batchBacklogCreateRecordId;
                   params['custparam_currentlyprocessing'] = "T";
                   //pass through the fact that the record is processing and the BCB record id to show the status page
                   redirect.toSuitelet({
                       scriptId:'customscriptgd_batchcreatebacklogsuite_2', 
                       deploymentId: 'customdeploygd_batchcreatebacklogsuite_2', 
                       isExternal: null, 
                       parameters: params
                   });
               }
           }
       }
       return{
           onRequest : onRequest        
       }
});