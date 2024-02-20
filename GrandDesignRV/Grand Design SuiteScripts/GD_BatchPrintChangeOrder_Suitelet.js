/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
 define(['N/query', 'N/ui/serverWidget', 'N/redirect', 'SuiteScripts/SSLib/2.x/SSLib_Task', 'N/url', 'N/task', 'N/file'],
 /**
  * @param {query} query
  * @param {serverWidget} serverWidget
  * @param {redirect} redirect
  * @param {SSLib_Task} SSLib_Task
  * @param {url} url
  * @param {task} task
  * @param {file} file
  */
     function (query, serverWidget, redirect, SSLib_Task, url, task, file) {
 
         /**
           * Defines the Suitelet script trigger point.
           * @param {Object} scriptContext
           * @param {ServerRequest} scriptContext.request - Incoming request
           * @param {ServerResponse} scriptContext.response - Suitelet response
           * @since 2015.2
           */
         function onRequest (context){
             if (context.request.method === 'GET') {
                 var form = serverWidget.createForm({title: 'Batch Print Change Orders'});
 
                 if (context.request.parameters['custpage_step'] == '1' || context.request.parameters['custpage_step'] == undefined)
                     getStepOne(context, form);
                 else if (context.request.parameters['custpage_step'] == '2')
                     getStepTwo(context, form);
                 else if (context.request.parameters['custpage_step'] == '3')
                     getStepThree(context, form);
                 context.response.writePage(form);
             }
             else{
                 log.debug('post', context.request.parameters['custpage_step'])
                 if (context.request.parameters['custpage_step'] == '1' || context.request.parameters['custpage_step'] == undefined)
                     postStepOne(context, form);
                 else if (context.request.parameters['custpage_step'] == '2')
                     postStepTwo(context, form);
                 else if (context.request.parameters['custpage_step'] == '3')
                     postStepThree(context, form);
             }
         }
         function addStepField(form, step) {
             var stepField = form.addField({
                 id: 'custpage_step',
                 type: serverWidget.FieldType.TEXT,
                 label: 'Step'
             }).updateDisplayType({
                 displayType: serverWidget.FieldDisplayType.HIDDEN
             });
     
             stepField.defaultValue = step;
     
             return step;
         }
 
         /**
           * Definition of the first step for the Suitelet's GET State.
           * Creating page for user input of filters
           *
           * @param {Object} context
           * @param {form} form - current form for Suitelet
           */
         function getStepOne(context, form){
             addStepField(form, '1')
             var fg = form.addFieldGroup({
                 id: 'custpage_fgfilters', 
                 label: 'Filters'
             }).isSingleColumn = true;
 
             var fromDateField = form.addField({
                 id:'custpage_fromdate',
                 label:'From', 
                 type:'DATE',
                 container:'custpage_fgfilters'
             })
             fromDateField.isMandatory = true;
             var toDateField = form.addField({
                 id:'custpage_todate',
                 label:'To', 
                 type:'DATE',
                 container:'custpage_fgfilters'
             })
             toDateField.isMandatory = true;
             var locationField = form.addField({
                 id:'custpage_location',
                 label:'Location', 
                 type:'select', 
                 source: 'location', 
                 container:'custpage_fgfilters'});
             locationField.isMandatory = true;
 
             form.addSubmitButton('Get Change Orders');
         }
         function postStepOne(context, form){
             var params = context.request.parameters;
             params['custpage_step'] = '2';
             redirect.toSuitelet({
                 scriptId: 'customscriptgd_batchprintchangeordersuit',
                 deploymentId: 'customdeploygd_batchprintchangeordersuit',
                 parameters: params
             });
         }
         function getStepTwo(context, form){
             addStepField(form, '2')
             var fg = form.addFieldGroup({
                 id: 'custpage_fgfilters', 
                 label: 'Filters'
             }).isSingleColumn = true;
             var fromDateField = form.addField({
                 id:'custpage_fromdate',
                 label:'From', 
                 type:'DATE',
                 container:'custpage_fgfilters'
             })
             var fromDate = context.request.parameters['custpage_fromdate']
             fromDateField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             fromDateField.defaultValue = fromDate
             var toDateField = form.addField({
                 id:'custpage_todate',
                 label:'To', 
                 type:'DATE',
                 container:'custpage_fgfilters'
             })
             var toDate = context.request.parameters['custpage_todate']
             toDateField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             toDateField.defaultValue = toDate
             var locationField = form.addField({
                 id:'custpage_location',
                 label:'Location', 
                 type:'select', 
                 source: 'location', 
                 container:'custpage_fgfilters'});
 
             var locationId = context.request.parameters['custpage_location']
             locationField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             locationField.defaultValue = locationId;
             
             var changeOrderQuery = `SELECT customrecordrvschangeorder.name as 'Change Order #', custrecordchangeorder_newdealer, custrecordchangeorder_olddealer, custrecordchangeorder_order, customrecordrvsunit.name, custrecordchangeorder_completeddate, CUSTOMRECORDRVSUNIT.custrecordunit_dealer, customer.companyname, CUSTOMRECORDRVSUNIT.custrecordunit_serialnumber, transaction.tranId
                 FROM (customrecordrvschangeorder INNER JOIN CUSTOMRECORDRVSUNIT ON CUSTOMRECORDRVSCHANGEORDER.custrecordchangeorder_unit = CUSTOMRECORDRVSUNIT.id) 
                 JOIN customer ON CUSTOMRECORDRVSUNIT.custrecordunit_dealer = customer.id
                 JOIN transaction ON CUSTOMRECORDRVSCHANGEORDER.custrecordchangeorder_order = transaction.id`
             changeOrderQuery += " WHERE custrecordchangeorder_completeddate IS NOT NULL AND custrecordchangeorder_date >= '";
             changeOrderQuery += fromDate;
             changeOrderQuery += "' AND custrecordchangeorder_date <= '"
             changeOrderQuery += toDate;
             changeOrderQuery += "' AND custrecordunit_location = "
             changeOrderQuery += locationId
             changeOrderQuery += " ORDER BY customrecordrvsunit.name asc"
             //log.debug('generated query', changeOrderQuery)
             var changeOrderResults = query.runSuiteQL({
                 query:changeOrderQuery
             })
             var sublist = form.addSublist({
                 id: 'custpage_sublistprintco', 
                 type: 'list', 
                 label: 'Print Change Orders', 
                 tab: 'custpage_tabprintco'
             })
             sublist.addMarkAllButtons()
             sublist.addField({
                 id:'custpage_subprintco', 
                 type:'checkbox', 
                 label:'Print Change Order'
             });
             var dealerField = sublist.addField({
                 id: 'custpage_subdealer',
                 type: 'text',
                 label: 'Dealer'
             });
             dealerField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             var serialField = sublist.addField({
                 id: 'custpage_subser',
                 type: 'text',
                 label: 'Serial Number'
             });
             serialField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             var vinField = sublist.addField({
                 id: 'custpage_subvin',
                 type: 'text',
                 label: 'VIN'
             });
             vinField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             var salesOrderField = sublist.addField({
                 id: 'custpage_subso',
                 type: 'text',
                 label: 'Sales Order'
             });
             salesOrderField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             var changeOrderField = sublist.addField({
                 id: 'custpage_subco',
                 type: 'text',
                 label: 'Change Order'
             });
             changeOrderField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             var completionField = sublist.addField({
                 id: 'custpage_subcompletion',
                 type: 'text',
                 label: 'Completion Date'
             });
             completionField.updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.INLINE
             });
             if(changeOrderResults != null){
                 for(var i = 0 ; i < changeOrderResults.results.length ; i++){
                     var changeOrder = changeOrderResults.results[i].values[0]
                     var oldDealer = changeOrderResults.results[i].values[1]
                     var newDealer = changeOrderResults.results[i].values[2]
                     var salesOrder = changeOrderResults.results[i].values[3]
                     var vin = changeOrderResults.results[i].values[4]
                     var completionDate = changeOrderResults.results[i].values[5]
                     var dealer = changeOrderResults.results[i].values[6]
                     var dealerName = changeOrderResults.results[i].values[7]
                     var serialNumber = changeOrderResults.results[i].values[8]
                     var transId = changeOrderResults.results[i].values[9]
 
                     var dealerURL = url.resolveRecord({
                         recordType: 'customer',
                         recordId: dealer,
                         isEditMode: false
                     })
                     dealerURL = '<a target="_blank" href="' + dealerURL + '">' + dealerName + '</a>'
 
                     var salesOrderURL = url.resolveRecord({
                         recordType: 'salesorder',
                         recordId: salesOrder,
                         isEditMode: false
                     })
                     salesOrderURL = '<a target="_blank" href="' + salesOrderURL + '">' + transId + '</a>'
 
                     var changeOrderURL = url.resolveRecord({
                         recordType: 'customrecordrvschangeorder',
                         recordId: changeOrder,
                         isEditMode: false
                     })
                     changeOrderURL = changeOrder
                     
                     try{
                         sublist.setSublistValue({
                             id: 'custpage_subdealer',
                             line: i,
                             value: dealerURL
                         })
                     }
 
                     
                     catch(err){log.debug('err', err)}
                     sublist.setSublistValue({
                         id: 'custpage_subser',
                         line: i,
                         value: serialNumber
                     })
                     sublist.setSublistValue({
                         id: 'custpage_subvin',
                         line: i,
                         value: vin
                     })
                     sublist.setSublistValue({
                         id: 'custpage_subso',
                         line: i,
                         value: salesOrderURL
                     })
                     sublist.setSublistValue({
                         id: 'custpage_subco',
                         line: i,
                         value: changeOrderURL
                     })
                     sublist.setSublistValue({
                         id: 'custpage_subcompletion',
                         line: i,
                         value: completionDate
                     })
                 }
             }
             form.addSubmitButton('Print Change Orders')
         }
         
         /**
          * Definition of the second step for the Suitelet's POST State.
          * Retrieving user input and redirecting to next step of Suitelet
          *
          * @param {Object} context
          * @param {form} form - current form for Suitelet
          */
         
         function postStepTwo(context, form) {
             var pdfName = "changeorders";
             var dateTime = new Date();
             var yyyymmdd = dateTime.toLocaleDateString('sv').replaceAll('-', '');
             var time = dateTime.toTimeString().split(' ')[0].replaceAll(':','').split('');
             var hhmmss = time[2]+time[3]+time[0]+time[1]+time[4]+time[5];
             pdfName = pdfName + '_' + yyyymmdd + '_' + hhmmss + '.pdf'
             log.debug('pdfname', pdfName);
 
             var ordersToPrint = [];
             var orderCount = context.request.getLineCount({group: 'custpage_sublistprintco'})
             for(var i = 0 ; i < orderCount ; i++){
                 if(context.request.getSublistValue({group: 'custpage_sublistprintco', name: 'custpage_subprintco', line: i}) == 'T'){
                     ordersToPrint.push(context.request.getSublistValue({group: 'custpage_sublistprintco', name: 'custpage_subco', line: i}))
                 }
             }
 
             log.debug('postStepTwo', ordersToPrint);
 
             var params = {};
 
             var task = SSLib_Task.startMapReduceScript('customscriptgd_batchprintchangeorder_mr', null, {
                 custscriptgd_changeorderids: JSON.stringify(ordersToPrint),
                 custscriptgd_pdfname: pdfName
             });
             params['custpage_taskid'] = task;
             params['custpage_filename'] = pdfName;
             params['custpage_step'] = '3';
             redirect.toSuitelet({
                 scriptId: 'customscriptgd_batchprintchangeordersuit',
                 deploymentId: 'customdeploygd_batchprintchangeordersuit',
                 parameters: params
             });
         }
 
         
         /**
          * Definition of the second step for the Suitelet's POST State.
          * Retrieving user input and redirecting to next step of Suitelet
          *
          * @param {Object} context
          * @param {form} form - current form for Suitelet
          */
 
         function getStepThree(context, form) {
             addStepField(form, '3');
 
             var fileName = context.request.parameters['custpage_filename'];
             var taskId = context.request.parameters['custpage_taskid'];
             var color = 'black';
             var htmlMessage = '<br/><span style="font-size: 16px;">Orders Processing...<br/>';
             var fileNameForm = form.addField({
                 id: 'custpage_filename',
                 type: serverWidget.FieldType.TEXT,
                 label: 'Filename'
             }).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})  ;      
             fileNameForm.defaultValue = fileName;
 
             if (taskId == 'ERROR') {
                 form.addField({
                     id: 'custpage_error',
                     type: serverWidget.FieldType.INLINEHTML,
                     label: 'Status'
                 }).defaultValue = '<span style="font-size: 16px;"> There was an error when trying to combine orders.</span>';
                 return;
             };
 
             var taskField = form.addField({
                 id : 'custpage_taskid',
                 type : serverWidget.FieldType.TEXT,
                 label : 'Task ID'
             }).updateDisplayType({
                 displayType : serverWidget.FieldDisplayType.HIDDEN
             }).defaultValue = taskId;
 
             // Retrieving the current status of the Map/Reduce task
             var taskStatus = task.checkStatus({
                 taskId : taskId
             });
             if (taskStatus.status == 'COMPLETE'){
                 color = 'green'
                 
                 //htmlMessage = '<br/><span style="font-size: 16px;">Orders Complete: <a href=' + file.load('/Batch Print/SalesOrders_20221008_572241.pdf').url + '>' + 'SalesOrders_20221008_572241.pdf' + '</a><br/>'
                 htmlMessage = '<br/><span style="font-size: 16px;">Orders Complete: <a href=' + file.load('/Change Order Printouts/' + fileName).url + '>' + fileName + '</a><br/>'
             }
 
             form.addField({
                 id: 'custpage_message',
                 type: serverWidget.FieldType.INLINEHTML,
                 label: 'Message'
             }).defaultValue = htmlMessage;
 
             form.addSubmitButton({label: 'Refresh'});
 
         }
         function postStepThree(context, form){
             var params = {};
             params["custpage_taskid"] = context.request.parameters["custpage_taskid"];
             params['custpage_filename'] = context.request.parameters['custpage_filename'];
             params['custpage_step'] = '3';
             redirect.toSuitelet({
                 scriptId: 'customscriptgd_batchprintchangeordersuit',
                 deploymentId: 'customdeploygd_batchprintchangeordersuit',
                 parameters: params
             });
         }
     return{
         onRequest : onRequest        
     }
     }
 
 )