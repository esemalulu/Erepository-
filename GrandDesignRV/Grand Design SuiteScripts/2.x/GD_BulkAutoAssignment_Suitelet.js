/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
 define(['N/query', 'N/record', 'N/redirect', 'N/runtime', 'N/task', 'N/ui/serverWidget', 'N/url', './GD_Common', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
 /**
* @param{query} query
* @param{record} record
* @param{redirect} redirect
* @param{runtime} runtime
* @param{task} task
* @param{serverWidget} serverWidget
* @param{url} url
* @param{GD_Common} GD_Common
* @param{SSLib_Task} SSLib_Task
*/
 (query, record, redirect, runtime, task, serverWidget, url, GD_Common, SSLib_Task) => {
     /**
      * Defines the Suitelet script trigger point.
      * @param {Object} scriptContext
      * @param {ServerRequest} scriptContext.request - Incoming request
      * @param {ServerResponse} scriptContext.response - Suitelet response
      * @since 2015.2
      */
     const onRequest = (scriptContext) => {
         if (scriptContext.request.method == "GET") {
             var form = serverWidget.createForm({title: 'Bulk Auto-Assignment'});
             if (scriptContext.request.parameters['custpage_step'] == '1' || !scriptContext.request.parameters['custpage_step']) {
                 try {
                     form.clientScriptModulePath = './GD_BulkAutoAssignment_Client.js';
                     stepOne(form);
                 } catch (err) {
                     log.error('error in step 1', err);
                 }
             } else if (scriptContext.request.parameters['custpage_step'] == '2') {
                 try {
                     form.clientScriptModulePath = './GD_BulkAutoAssignment_Client.js';
                     var procRecId = scriptContext.request.parameters['custpage_procrecid'];
                     stepTwo(form, procRecId);
                 } catch (err) {
                     log.error('error in step 2', err);
                 }
             } else if (scriptContext.request.parameters['custpage_step'] == '3') {
                 try {
                     stepThree(form, scriptContext);
                 } catch (err) {
                     log.error('error in step 3', err);
                 }
             }
             scriptContext.response.writePage(form);
         } else {
             if (scriptContext.request.parameters['custpage_step'] == '1') {
                 if (scriptContext.request.parameters['custpage_reverse'] != 'T'){
                     let procRec = record.create({
                         type: 'customrecordgd_bulkautoassignmentprocrec',
                         isDynamic: true
                     });
                     if (scriptContext.request.parameters["custpage_type"] == 0) {
                         procRec.setValue({fieldId: 'custrecordgd_baaprocessor_recordtype', value: 'customrecordrvsclaim'});
                         procRec.setValue({fieldId: 'custrecordgd_baaprocessor_claimstatuses', value: scriptContext.request.parameters["custpage_claimstatuses"]});
                     } else {
                         procRec.setValue({fieldId: 'custrecordgd_baaprocessor_recordtype', value: 'customrecordrvspreauthorization'});
                         procRec.setValue({fieldId: 'custrecordgd_baaprocessor_preauthstatus', value: scriptContext.request.parameters["custpage_preauthstatuses"]});
                     }
                     procRec.setValue({fieldId: 'custrecordgd_baaprocessor_startdate', value: new Date(scriptContext.request.parameters["custpage_date"])});
                     let nameDate = new Date();
                     nameDate.setMonth(nameDate.getMonth() + 1);
                     nameDate = nameDate.getDate() + '/' + (nameDate.getMonth()) + '/' + nameDate.getFullYear() + ' '
                  +  nameDate.getHours() + ':' + nameDate.getMinutes() + ':' + nameDate.getSeconds() + ':'
                     + nameDate.getMilliseconds();
                     procRec.setValue({fieldId: 'name', value: runtime.getCurrentUser().name + ': ' + nameDate});
                     let procRecId = procRec.save();

                     redirect.toSuitelet({
                         scriptId: "customscriptgd_bulkautoassignment_suite",
                         deploymentId: "customdeploygd_bulkautoassignment_suite",
                         isExternal: false,
                         parameters: {
                             "custpage_step": "2",
                             "custpage_procrecid": procRecId
                         }
                     });
                 } else {
                     var procRecId = scriptContext.request.parameters['custpage_listreversed'];
                     record.submitFields({
                         type:'customrecordgd_bulkautoassignmentprocrec',
                         id:procRecId,
                         values:{
                             'custrecordgd_baaprocessor_reverse':true
                         }
                     });
                     let mapReduceParams = {
                         'custscriptgd_baa_procrecid': procRecId
                     };
                     var taskId = '';

                     try {
                         taskId = SSLib_Task.startMapReduceScript('customscriptgd_bulkautoassignment_mr', null, mapReduceParams, '2', '5', '60');
                     } catch (err) {
                         log.error('Error attempting to start Map/Reduce', err);
                         taskId = 'ERROR';
                     }
                     redirect.toSuitelet({
                         scriptId: "customscriptgd_bulkautoassignment_suite",
                         deploymentId: "customdeploygd_bulkautoassignment_suite",
                         isExternal: false,
                         parameters: {
                             "custpage_step": "3",
                             "custpage_procrecid": procRecId,
                             "custpage_taskid": taskId
                         }
                     });
                 }
             } else if (scriptContext.request.parameters['custpage_step'] == '2') {
                 var employeeIds = [];
                 for (let i = 0; i < scriptContext.request.getLineCount('custpage_employeesublist'); i++) {
                     var selected = scriptContext.request.getSublistValue({
                         group : 'custpage_employeesublist',
                         name : 'custpage_sublist_select',
                         line : i
                     }) == 'T';

                     if (selected) {
                         let selectedId = scriptContext.request.getSublistValue({
                             group : 'custpage_employeesublist',
                             name : 'custpage_sublist_id',
                             line : i
                         });
                         employeeIds.push(selectedId);
                     }
                 }

                 procRecId = scriptContext.request.parameters['custpage_procrecid'];
                 record.submitFields({
                     type: 'customrecordgd_bulkautoassignmentprocrec',
                     id: procRecId,
                     values: {
                         'custrecordgd_baaprocessor_employees': employeeIds,
                         'custrecordgd_baaprocessor_quantity': scriptContext.request.parameters['custpage_quantitytoassign'],
                         'custrecordgd_baaprocessor_startingindex':scriptContext.request.parameters['custpage_startingindex']
                     }
                 });

                 let mapReduceParams = {
                     'custscriptgd_baa_procrecid': procRecId
                 };
                 var taskId = '';

                 try {
                     taskId = SSLib_Task.startMapReduceScript('customscriptgd_bulkautoassignment_mr', null, mapReduceParams, '2', '5', '60');
                 } catch (err) {
                     log.error('Error attempting to start Map/Reduce', err);
                     taskId = 'ERROR';
                 }

                 redirect.toSuitelet({
                     scriptId: "customscriptgd_bulkautoassignment_suite",
                     deploymentId: "customdeploygd_bulkautoassignment_suite",
                     isExternal: false,
                     parameters: {
                         "custpage_step": "3",
                         "custpage_procrecid": procRecId,
                         "custpage_taskid": taskId
                     }
                 });
             } else {
                 redirect.toSuitelet({
                     scriptId: "customscriptgd_bulkautoassignment_suite",
                     deploymentId: "customdeploygd_bulkautoassignment_suite",
                     isExternal: false,
                     parameters: {
                         "custpage_step": "3",
                         "custpage_procrecid": scriptContext.request.parameters["custpage_procrecid"],
                         "custpage_taskid": scriptContext.request.parameters["custpage_taskid"]
                     }
                 });
             }
         }
     }

     /**
      * Helper function to add the step field to the form
      *
      * @param {serverWidget.form} form
      * @param {string} step
      */
     const addStepField = (form, step) => {
         let stepField = form.addField({
             id : 'custpage_step',
             type : serverWidget.FieldType.TEXT,
             label : 'Step'
         }).updateDisplayType({
             displayType : serverWidget.FieldDisplayType.HIDDEN
         });

         stepField.defaultValue = step;
     }

     /**
      * Helper function to add the Processing Record Id field to the form
      *
      * @param {serverWidget.form} form
      * @param {string} procRecId
      */
     const addProcRecIdField = (form, procRecId) => {
         let procRecIdField = form.addField({
             id : 'custpage_procrecid',
             type : serverWidget.FieldType.TEXT,
             label : 'Processing Record Id'
         }).updateDisplayType({
             displayType : serverWidget.FieldDisplayType.HIDDEN
         });

         procRecIdField.defaultValue = procRecId;
     }

     /**
      * Generates the first page of the Suitetlet.
      *
      * @param {serverWidget.form} form
      */
     const stepOne = (form) => {
         addStepField(form, '1');
         form.addSubmitButton({label: "Get Records"});

         let dateField = form.addField({
             id: 'custpage_date',
             label: 'Date',
             type: serverWidget.FieldType.DATETIMETZ,
         });
         dateField.isMandatory = true;
         dateField.defaultValue = new Date();

         let recordTypeField = form.addField({
             id: 'custpage_type',
             label: 'Record Type',
             type: serverWidget.FieldType.SELECT
         });
         recordTypeField.addSelectOption({value: '0', text: 'Claims'});
         recordTypeField.addSelectOption({value: '1', text: 'Pre-Authorizations'});
         recordTypeField.isMandatory = true;

         form.addField({
             id: 'custpage_claimstatuses',
             label: 'Select Claim Status Filter',
             type: serverWidget.FieldType.MULTISELECT,
             source: 'customlistrvsclaimstatus'
         }).defaultValue = ['8']; // Select Submitted status by default
         form.addField({
             id: 'custpage_preauthstatuses',
             label: 'Select Pre Auth Status Filter',
             type: serverWidget.FieldType.MULTISELECT,
             source: 'customlistrvspreauthbodystatuses'
         }).defaultValue = ['1']; // Select Open status by default

         form.addField({
             id: 'custpage_reverse',
             label: 'Reverse Process',
             type: serverWidget.FieldType.CHECKBOX
         });
         form.addField({
             id: 'custpage_listreversed',
             label: 'Run to be Reversed',
             type: serverWidget.FieldType.SELECT,
             source: 'customrecordgd_bulkautoassignmentprocrec'
         });
     }

     /**
      * Generates the Second page of the Suitetlet.
      *
      * @param {serverWidget.form} form
      * @param {string} procRecId
      */
     const stepTwo = (form, procRecId) => {
         addStepField(form, '2');
         addProcRecIdField(form, procRecId);

         let fields = [
             "custrecordgd_baaprocessor_recordtype",
             "TO_CHAR(custrecordgd_baaprocessor_startdate, 'MM/DD/YYYY HH:MM:SS AM') AS datetime",
             "custrecordgd_baaprocessor_claimstatuses",
             "custrecordgd_baaprocessor_preauthstatus"
         ];
         let procRecFields = GD_Common.queryLookupFields('customrecordgd_bulkautoassignmentprocrec', procRecId, fields);
         var dateTime = procRecFields['datetime'];
         var recordType = procRecFields['custrecordgd_baaprocessor_recordtype'];
         var claimStatuses = procRecFields['custrecordgd_baaprocessor_claimstatuses'];
         var preAuthStatuses = procRecFields['custrecordgd_baaprocessor_preauthstatus'];

         var totalRecordsField = form.addField({
             id: 'custpage_totalrecords',
             label: 'Total Unassigned Record Count',
             type: serverWidget.FieldType.INTEGER
         }).updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

         var quantityToAssignField = form.addField({
             id: 'custpage_quantitytoassign',
             label: 'Quantity to Assign',
             type: serverWidget.FieldType.INTEGER
         });

         var startingIndexField = form.addField({
             id: 'custpage_startingindex',
             label: 'Starting Index',
             type: serverWidget.FieldType.INTEGER
         }).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});


         var thirdConditionField = '';

         if (recordType == 'customrecordrvsclaim') {
             form.title = form.title + ': Assign Claims';
             form.addSubmitButton({label: "Assign Claims"});

             claimStatuses = claimStatuses.split(', ');

             let totalClaims = getRecordCount(recordType, 'custrecordgd_claim_assignedto', 'created', 'custrecordclaim_status', dateTime, claimStatuses);

             totalRecordsField.label = 'Total Unassigned Claim Count';
             totalRecordsField.defaultValue = totalClaims;

             quantityToAssignField.defaultValue = totalClaims;

             thirdConditionField = 'custentitygd_claimprocessor';
         } else if (recordType == 'customrecordrvspreauthorization') {
             form.title = form.title + ': Assign Pre-Authorizations';
             form.addSubmitButton({label: "Assign Pre-Auths"});

             preAuthStatuses = preAuthStatuses.split(', ');

             let totalPreAuths = getRecordCount(recordType, 'custrecordgd_preauth_assignedto', 'created', 'custrecordpreauth_status', dateTime, preAuthStatuses);

             totalRecordsField.label = 'Total Unassigned Pre-Auth Count';
             totalRecordsField.defaultValue = totalPreAuths;

             quantityToAssignField.defaultValue = totalPreAuths;

             thirdConditionField = 'custentitygd_preauthprocessor';
         }

         // Create Sublist and add fields.
         var sublist = form.addSublist({
             id : 'custpage_employeesublist',
             label : 'Eligible Employees',
             type : serverWidget.SublistType.LIST
         });

         sublist.addField({
             id: 'custpage_sublist_deploymentid',
             label: 'Deployment Id',
             type: serverWidget.FieldType.TEXT
         });

         sublist.addMarkAllButtons();

         sublist.addField({
             id : 'custpage_sublist_select',
             label : 'Select',
             type : serverWidget.FieldType.CHECKBOX
         }).updateDisplayType({
             displayType : serverWidget.FieldDisplayType.ENTRY
         });

         sublist.addField({
             id : 'custpage_sublist_id',
             label : 'Internal ID',
             type : serverWidget.FieldType.TEXT
         }).updateDisplayType({
             displayType : serverWidget.FieldDisplayType.HIDDEN
         });

         sublist.addField({
             id : 'custpage_sublist_name',
             label : 'Name',
             type : serverWidget.FieldType.TEXT
         });

         sublist.addField({
             id : 'custpage_sublist_title',
             label : 'Job Title',
             type : serverWidget.FieldType.TEXT
         });

         sublist.addField({
             id : 'custpage_sublist_email',
             label : 'Email',
             type : serverWidget.FieldType.TEXT
         });

         // Create Employee Query
         let employeeQuery = query.create({
             type: query.Type.EMPLOYEE
         });

         // let conditionOne = employeeQuery.createCondition({
         //     fieldId: 'giveaccess',
         //     operator: query.Operator.IS,
         //     values: [true]
         // });

         let conditionTwo = employeeQuery.createCondition({
             fieldId: 'isinactive',
             operator: query.Operator.IS,
             values: [false]
         });

         let conditionThree = employeeQuery.createCondition({
             fieldId: thirdConditionField,
             operator: query.Operator.IS,
             values: [true]
         });

         employeeQuery.condition = employeeQuery.and(/*conditionOne, */conditionTwo, conditionThree);

         employeeQuery.columns = [
             employeeQuery.createColumn({
                 fieldId: 'id'
             }),
             employeeQuery.createColumn({
                 fieldId: 'firstname'
             }),
             employeeQuery.createColumn({
                 fieldId: 'lastname'
             }),
             employeeQuery.createColumn({
                 fieldId: 'title'
             }),
             employeeQuery.createColumn({
                 fieldId: 'email'
             }),
         ];

         let results = employeeQuery.runPaged({pageSize: 1000});
         var i = 0;
         results.iterator().each(function (pagedData) {
             let page = pagedData.value;
             page.data.asMappedResults().forEach(function (result) {
                 sublist.setSublistValue({
                     id: 'custpage_sublist_select',
                     line: i,
                     value: 'F'
                 });
                 sublist.setSublistValue({
                     id: 'custpage_sublist_id',
                     line: i,
                     value: result.id
                 });
                 sublist.setSublistValue({
                     id: 'custpage_sublist_name',
                     line: i,
                     value: result.firstname + ' ' + result.lastname
                 });
                 sublist.setSublistValue({
                     id: 'custpage_sublist_title',
                     line: i,
                     value: result.title
                 });
                 sublist.setSublistValue({
                     id: 'custpage_sublist_email',
                     line: i,
                     value: result.email
                 });
                 i++;
                 return true;
             });
             return true;
         });
     }

     /**
      * Generates the Second page of the Suitetlet.
      *
      * @param {serverWidget.form} form
      * @param {scriptContext} context
      */
     const stepThree = (form, context) => {
         let procRecId = context.request.parameters['custpage_procrecid'];
         let taskId = context.request.parameters['custpage_taskid'];
         addStepField(form, '3');
         addProcRecIdField(form, procRecId);

         if (taskId == 'ERROR') {
             form.addField({
                 id: 'custpage_error',
                 type: serverWidget.FieldType.INLINEHTML,
                 label: 'Status'
             }).defaultValue = '<span style="font-size: 16px;"> There was an error launching the Map/Reduce.</span>';
             return;
         }

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

         var color = 'black';
         if (taskStatus.status == 'PENDING') {color = 'purple';}
         else if (taskStatus.status == 'PROCESSING') {color = 'blue';}
         else if (taskStatus.status == 'COMPLETE') {color = 'green';}

         var statusMessage = '<span style="font-size: 16px; color:'+ color + '">Status: <b>' + taskStatus.status +'</b></span>';

         var htmlMessage = '<br/><span style="font-size: 16px;">The Bulk Auto Assign Map/Reduce has been initiated.<br/>' + statusMessage;

         form.addField({
             id: 'custpage_message',
             type: serverWidget.FieldType.INLINEHTML,
             label: 'Message'
         }).defaultValue = htmlMessage;

         if(taskStatus.status=='COMPLETE'){
             displayProcessedRecords(form,procRecId);
         }

         form.addSubmitButton({label: 'Refresh'});
     }
     /**
      *
      * @param {serverWidget.form} form
      * @param {string} recId
      */
     function displayProcessedRecords(form, recId){
         let fields = [
             "custrecordgd_baaprocessor_records"
         ];

         let procRecFields = GD_Common.queryLookupFields('customrecordgd_bulkautoassignmentprocrec', recId, fields);
         let records = JSON.parse(procRecFields.custrecordgd_baaprocessor_records);
         var sublist = form.addSublist({
             id : 'custpage_recordsublist',
             label : 'Processed Records',
             type : serverWidget.SublistType.LIST
         });

         sublist.addField({
             id : 'custpage_sublist_id',
             label : 'Record Id',
             type : serverWidget.FieldType.TEXT
         });
         sublist.addField({
             id : 'custpage_sublist_name',
             label : 'Record Name',
             type : serverWidget.FieldType.TEXT
         });
         sublist.addField({
             id : 'custpage_sublist_created',
             label : 'Created Date',
             type : serverWidget.FieldType.TEXT
         });
         sublist.addField({
             id : 'custpage_sublist_employee',
             label : 'Employee',
             type : serverWidget.FieldType.TEXT
         });

         for (let i = 0; i < records.length;i++){
             sublist.setSublistValue({
                 id: 'custpage_sublist_id',
                 line: i,
                 value: records[i].recordId
             });
             sublist.setSublistValue({
                 id: 'custpage_sublist_name',
                 line: i,
                 value: records[i].name
             });
             sublist.setSublistValue({
                 id: 'custpage_sublist_created',
                 line: i,
                 value: records[i].createdDate
             });
             sublist.setSublistValue({
                 id: 'custpage_sublist_employee',
                 line: i,
                 value: records[i].employeeId.entityid
             });
         }
     }

     /**
      * Gets the total number Claims or Pre-Auths that are unassigned and were created before the given date/time
      *
      * @param {string} recordType
      * @param {string} assignedToFieldId
      * @param {string} submitDateFieldId
      * @param {string} statusFieldId
      * @param {Date} dateTime
      * @param {Array} statuses
      * @returns {number} Total number of records meeting the conditions.
      */
     const getRecordCount = (recordType, assignedToFieldId, submitDateFieldId, statusFieldId, dateTime, statuses) => {
         // Create Query Object
         let recordQuery = query.create({
             type: recordType
         });

         // Conditions
         let conditionOne = recordQuery.createCondition({
             fieldId: assignedToFieldId,
             operator: query.Operator.EMPTY
         });

         let conditionTwo = recordQuery.createCondition({
             fieldId: submitDateFieldId,
             operator: query.Operator.ON_OR_BEFORE,
             values: dateTime
         });

         let conditionThree = recordQuery.createCondition({
             fieldId: statusFieldId,
             operator: query.Operator.ANY_OF,
             values: statuses
         })

         recordQuery.condition = recordQuery.and(conditionOne, conditionTwo, conditionThree);

         recordQuery.columns = [
             recordQuery.createColumn({
                 fieldId: "id",
                 aggregate: query.Aggregate.COUNT_DISTINCT
             })
         ];

         let results = recordQuery.run();
         return (results.results[0].values[0]);
     }

     return {onRequest}

 });
