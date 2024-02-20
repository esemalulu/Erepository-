/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/file', 'N/query', 'N/search', 'N/redirect', 'SuiteScripts/SSLib/2.x/SSLib_Task', 'N/url', 'N/task'],
    /**
     * @param {query} query
     * @param {file} file
     * @param {search} search
     * @param {redirect} redirect
     * @param {serverWidget} serverWidget
     * @param{SSLib_Task} SSLib_Task
     * @param{url} url
     * @param{task} task
     */
    (serverWidget, file, query, search, redirect, SSLib_Task, url, task) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (context) => {


            //Step 1: Set up Filters and toggle
            //Post Step 1: Process Filters and Toggle and Display Results
            //Step 2: confirm and sort options 
            //Post Step 2: Send information to MR to process
            //Step 3: Confirmation page
            if (context.request.method === 'GET') {
                var form = serverWidget.createForm({title: 'Batch Print Sales or Production'});
               
                form.clientScriptModulePath = './GD_BatchPrintSalesAndProduction_CL.js';
                if (context.request.parameters['checkTaskId']) {
                    var fileInfo = null;
                    var taskId = context.request.parameters['checkTaskId'];
                    var taskStatus = task.checkStatus({
                        taskId: taskId
                    });
                    context.response.write(JSON.stringify(taskStatus));
                    return;
                }
                if (context.request.parameters['custpage_step'] == '1' || context.request.parameters['custpage_step'] == undefined)
                    getStepOne(context, form);
                else if (context.request.parameters['custpage_step'] == '2')
                    getStepTwo(context, form);
                else if (context.request.parameters['custpage_step'] == '3')
                    getStepThree(context, form);
                context.response.writePage(form);
            } else {
                if (context.request.parameters['custpage_step'] == '1' || context.request.parameters['custpage_step'] == undefined)
                    postStepOne(context, form);
                else if (context.request.parameters['custpage_step'] == '2')
                    postStepTwo(context, form);
                else if (context.request.parameters['custpage_step'] == '3')
                    postStepThree(context, form);

            }

        }


        //Helper function used to add steps for routing to the correct function.
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
        function getStepOne(context, form) {
            addStepField(form, '1');

            var salesProdGroup = form.addFieldGroup({
                id: 'custpage_salesprodgrp', label: 'Sales or Production'
            });
            var recordTypeField = form.addField({
                id: 'custpage_type',
                label: 'Choose Order Type',
                container: 'custpage_salesprodgrp',
                type: serverWidget.FieldType.SELECT,
            })
            recordTypeField.addSelectOption({value: '181', text: 'Sales'});
            recordTypeField.addSelectOption({value: '223', text: 'Production'});
            recordTypeField.isMandatory = true;


            //Field Group that will house the multiselects
            var criteriaGroup = form.addFieldGroup({
                id: 'custpage_criteriagrp', label: 'Criteria'
            });

            //Criteria used to filter
            var dealerSelect = form.addField({
                id: 'custpage_dealer', label: 'Dealer', type: serverWidget.FieldType.MULTISELECT, container: 'custpage_criteriagrp'
            });
            var seriesSelect = form.addField({
                id: 'custpage_series',
                label: 'Series',
                type: serverWidget.FieldType.MULTISELECT,
                source: 'CUSTOMRECORDRVSSERIES',
                container: 'custpage_criteriagrp'
            });
            var salesRepSelect = form.addField({
                id: 'custpage_salesrep', label: 'Sales Rep', type: serverWidget.FieldType.MULTISELECT, container: 'custpage_criteriagrp'
            });
            var dealerGroupSelect = form.addField({
                id: 'custpage_dealergrp', label: 'Dealer Group', type: serverWidget.FieldType.MULTISELECT, container: 'custpage_criteriagrp'
            });
            var reportingDealerGrpSelect = form.addField({
                id: 'custpage_reportingdealergrp',
                label: 'Reporting Dealer Group',
                type: serverWidget.FieldType.MULTISELECT,
                container: 'custpage_criteriagrp'
            });
            var soStatusSelect = form.addField({
                id: 'custpage_sostatus',
                label: 'Sales Order Status',
                type: serverWidget.FieldType.MULTISELECT,
                container: 'custpage_criteriagrp'
            });
            var locationSelect = form.addField({
                id: 'custpage_location',
                label: 'Location',
                type: serverWidget.FieldType.MULTISELECT,
                source: 'location',
                container: 'custpage_criteriagrp'
            });
            var offlineFromSelect = form.addField({
                id: 'custpage_offlinefromdate',
                label: 'Offline Date (from)',
                type: serverWidget.FieldType.DATE,
                container: 'custpage_criteriagrp'
            });
            var offlineToSelect = form.addField({
                id: 'custpage_offlinetodate',
                label: 'Offline Date (to)',
                type: serverWidget.FieldType.DATE,
                container: 'custpage_criteriagrp'
            });
            var poCheckbox = form.addField({
                id: 'custpage_pocheckbox', label: 'No PO #', type: serverWidget.FieldType.CHECKBOX, container: 'custpage_criteriagrp'
            });
            var salesNotesTxtbox = form.addField({
                id: 'custpage_salesnotes', label: 'Sales Notes', type: serverWidget.FieldType.TEXT, container: 'custpage_criteriagrp'
            });
            var prodRunSelect = form.addField({
                id: 'custpage_prodrun',
                label: 'Production Run',
                type: serverWidget.FieldType.MULTISELECT,
                source: 'CUSTOMRECORDRVSPRODUCTIONRUN',
                container: 'custpage_criteriagrp'
            });


            //Searches to fill in option for data
            search.create({
                type: search.Type.EMPLOYEE,
                filters: ['salesrep', 'is', 'T'],
                columns: ['entityid']
            }).run().getRange({start: 0, end: 999}).forEach(function (result) {
                salesRepSelect.addSelectOption({text: result.getValue('entityid'), value: result.id});
            });

            search.create({
                type: search.Type.CUSTOMER,
                filters: ['custentityrvsdealertype', 'is', '10'], // RVS Dealer
                columns: search.createColumn({name: 'companyname', sort: search.Sort.ASC})
            }).run().getRange({start: 0, end: 999}).forEach(function (result) {
                dealerSelect.addSelectOption({text: result.getValue('companyname'), value: result.id});
            });

            search.create({
                type: 'entitygroup',
                filters: ['grouptype', 'is', 'CustJob'],
                columns: ['groupname']
            }).run().getRange({start: 0, end: 999}).forEach(function (result) {
                dealerGroupSelect.addSelectOption({text: result.getValue('groupname'), value: result.id});
                reportingDealerGrpSelect.addSelectOption({text: result.getValue('groupname'), value: result.id});
            });

            /* An array of values for the Sales Order Status -
            * Because a search or query would run through all transactions, this 
            * eliminates a lot of search time as there are only 7 statuses.
            * The order of the values matches with the order of the status
            */
            var sortStatusArr = ['Billed', 'Closed', 'Partially Fulfilled', 'Pending Approval', 'Pending Billing', 'Pending Billing/Partially Fulfilled', 'Pending Fulfillment'];
            var sortStatusValArr = ['SalesOrd:G', 'SalesOrd:H', 'SalesOrd:D', 'SalesOrd:A', 'SalesOrd:F', 'SalesOrd:E', 'SalesOrd:B'];
            for (var i = 0; i < sortStatusArr.length; i++) {
                soStatusSelect.addSelectOption({text: sortStatusArr[i], value: sortStatusValArr[i]});
            }
            ;
            soStatusSelect.defaultValue = 'SalesOrd:B';

            //Field Group that will house the Sort Criteria
            var sortGroup = form.addFieldGroup({
                id: 'custpage_sortgrp', label: 'Sort'
            });
            sortGroup.isCollapsible = true;


            var sortOptions = ['', 'Dealer', 'Unit (Full VIN)', 'Sales Order #', 'Series', 'Model', 'Decor', 'PO number', 'Online Date', 'Offline Date', 'Unit Serial Number'];

            var sortOptionOne = form.addField({
                id: 'custpage_sortone',
                label: 'Sort 1',
                type: serverWidget.FieldType.SELECT,
                source: sortOptions,
                container: 'custpage_sortgrp'
            });
            for (var i = 0; i < sortOptions.length; i++) {
                sortOptionOne.addSelectOption({value: i, text: sortOptions[i]});
            }
            ;
            sortOptionOne.defaultValue = 10;

            var sortOptionTwo = form.addField({
                id: 'custpage_sorttwo',
                label: 'Sort 2',
                type: serverWidget.FieldType.SELECT,
                source: sortOptions,
                container: 'custpage_sortgrp'
            });
            for (var i = 0; i < sortOptions.length; i++) {
                sortOptionTwo.addSelectOption({value: i, text: sortOptions[i]});
            }
            ;

            var sortOptionThree = form.addField({
                id: 'custpage_sortthree',
                label: 'Sort 3',
                type: serverWidget.FieldType.SELECT,
                source: sortOptions,
                container: 'custpage_sortgrp'
            });
            for (var i = 0; i < sortOptions.length; i++) {
                sortOptionThree.addSelectOption({value: i, text: sortOptions[i]});
            }


            //Submit Button
            form.addSubmitButton('Get Orders');
        };

        /**
         * Definition of the first step for the Suitelet's POST State.
         * Retrieving user input and redirecting to next step of Suitelet
         *
         * @param {Object} context
         * @param {form} form - current form for Suitelet
         */
        function postStepOne(context, form) {
            var params = context.request.parameters;
            params['custpage_step'] = '2';
            redirect.toSuitelet({
                scriptId: 'customscriptgd_batchprintorders_suitelet',
                deploymentId: 'customdeploygd_batchprintorders_suitelet',
                parameters: params
            });
        }


        /**
         * Definition of the second step for the Suitelet's GET State.
         * Show the results of the criteria and order the user selected
         *
         * @param {Object} context
         * @param {form} form - current form for Suitelet
         */
        function getStepTwo(context, form) {
            addStepField(form, '2');

            var typeCriteria = context.request.parameters['custpage_type'];
            var dealerCriteria = context.request.parameters['custpage_dealer'].split('');
            var seriesCriteria = context.request.parameters['custpage_series'].split('');
            var salesRepCriteria = context.request.parameters['custpage_salesrep'].split('');
            var dealerGroupCriteria = context.request.parameters['custpage_dealergrp'].split('');
            var reportingDealerGrpCriteria = context.request.parameters['custpage_reportingdealergrp'].split('');
            var toDateOffline = context.request.parameters['custpage_offlinetodate'];
            var fromDateOffline = context.request.parameters['custpage_offlinefromdate'];
            var poCheckboxCriteria = context.request.parameters['custpage_pocheckbox'];
            var salesNotesCriteria = context.request.parameters['custpage_salesnotes'].split('');
            var prodRunCriteria = context.request.parameters['custpage_prodrun'].split('');
            var locationCriteria = context.request.parameters['custpage_location'].split('');
            var soStatusCriteria = context.request.parameters['custpage_sostatus'].split('')
            var sortOne = context.request.parameters['custpage_sortone'];
            var sortTwo = context.request.parameters['custpage_sorttwo'];
            var sortThree = context.request.parameters['custpage_sortthree'];


            var filters = new Array();
            // Only show the main line of SOs
            filters.push(['mainline', 'is', 'T'], 'AND');

            // // Only show SOs with a unit, series, and model
            filters.push(['custbodyrvsunit', 'noneof', '@NONE@'], 'AND');
            filters.push(['custbodyrvsseries', 'noneof', '@NONE@'], 'AND');
            filters.push(['custbodyrvsmodel', 'noneof', '@NONE@'], 'AND');

            var dealerIds = new Array();
            if (context.request.parameters['custpage_dealergrp'] != '') {
                var dealerResults = search.create({
                    type: search.Type.CUSTOMER,
                    filters: ['custentitygd_dealergroup', 'is', dealerGroupCriteria]
                }).run().getRange({start: 0, end: 999}).forEach(function (result) {
                    dealerIds.push(result.id);
                });
            }
            if (dealerIds.length > 0)
                filters.push(['entity', 'anyof', dealerIds], 'AND');
            var dealerCriteria = context.request.parameters['custpage_dealer'].split('');
            if (dealerCriteria != '') {
                filters.push(['entity', 'is', dealerCriteria], 'AND');
            }
            ;
            if (seriesCriteria != '') {
                filters.push(['custbodyrvsseries', 'anyof', seriesCriteria], 'AND');
            }
            ;
            if (salesRepCriteria != '') {
                filters.push(['salesrep', 'anyof', salesRepCriteria], 'AND');
            }
            ;
            if (soStatusCriteria != '') {
                filters.push(['status', 'anyof', soStatusCriteria], 'AND')
            }
            ;
            if (reportingDealerGrpCriteria != '') {
                filters.push(['customer.custentitygd_reportingdealergrp', 'anyof', reportingDealerGrpCriteria], 'AND');
            }
            ;
            if (prodRunCriteria != '') {
                filters.push(['custbodyrvsunitproductionrun', 'anyof', prodRunCriteria], 'AND');
            }
            ;
            if (locationCriteria != '') {
                filters.push(['location', 'anyof', locationCriteria], 'AND');
            }
            ;

            // Apply the offline date range filter
            if (fromDateOffline != '' && toDateOffline != '')
                filters.push(['custbodyrvsunit.custrecordunit_offlinedate', 'within', fromDateOffline, toDateOffline], 'AND');
            else if (fromDateOffline == '' && toDateOffline != '')
                filters.push(['custbodyrvsunit.custrecordunit_offlinedate', 'before', toDateOffline], 'AND');
            else if (fromDateOffline != '' && toDateOffline == '')
                filters.push(['custbodyrvsunit.custrecordunit_offlinedate', 'after', fromDateOffline], 'AND');
            //Apply  No PO # filter
            if (poCheckboxCriteria == 'T') {
                filters.push(['otherrefnum', 'isempty', ''], 'AND');
            }
            ;
            //Apply Sales Notes
            if (salesNotesCriteria != '') {
                filters.push(['custbodyrvsdriversheetnotes', 'contains', salesNotesCriteria]);
            }

            if (filters[filters.length - 1] == 'AND') {
                filters.pop();
            }

            var onlineDateColumn = search.createColumn({name: 'custrecordunit_onlinedate', join: 'custbodyrvsunit', sort: search.Sort.ASC});
            var offlineDateColumn = search.createColumn({
                name: 'custrecordunit_offlinedate',
                join: 'custbodyrvsunit',
                sort: search.Sort.ASC
            });
            var dealerColumn = search.createColumn({name: 'entity', sort: search.Sort.ASC});
            var salesOrderColumn = search.createColumn({name: 'tranid', sort: search.Sort.ASC});
            var decorColumn = search.createColumn({name: 'custbodyrvsdecor', sort: search.Sort.ASC});
            var unitColumn = search.createColumn({name: 'custbodyrvsunit', sort: search.Sort.ASC});
            var seriesColumn = search.createColumn({name: 'custbodyrvsseries', sort: search.Sort.ASC});
            var modelColumn = search.createColumn({name: 'custbodyrvsmodel', sort: search.Sort.ASC});
            var poColumn = search.createColumn({name: 'otherrefnum', sort: search.Sort.ASC});
            var unitSerialColumn = search.createColumn({name: 'custbodyrvsunitserialnumber', sort: search.Sort.ASC});

            var sortIndex;
            var sortElement;
            var column = [dealerColumn, unitColumn, salesOrderColumn, seriesColumn, modelColumn, decorColumn, poColumn, onlineDateColumn, offlineDateColumn, unitSerialColumn];
            if (sortThree != 0) {
                sortIndex = sortThree - 1;
                sortElement = column.splice(sortIndex, 1)[0];
                column.splice(0, 0, sortElement);
            }
            ;

            if (sortTwo != 0) {
                sortIndex = sortTwo - 1;
                sortElement = column.splice(sortIndex, 1)[0];
                column.splice(0, 0, sortElement);
            }
            ;

            if (sortOne != 0) {
                sortIndex = sortOne - 1;
                sortElement = column.splice(sortIndex, 1)[0];
                column.splice(0, 0, sortElement);
            }
            ;

            var results = search.create({
                type: search.Type.SALES_ORDER,
                filters: filters,
                columns: column
            }).run().getRange({start: 0, end: 999});

            var sublist = form.addSublist({
                id: 'custpage_subbatchprintorder',
                label: 'Batch print',
                type: serverWidget.SublistType.LIST
            });
            sublist.addMarkAllButtons();

            form.addField({id: 'custpage_results', label: 'Results: ' + results.length, type: serverWidget.FieldType.LABEL});

            var orderType = form.addField({id: 'custpage_ordertype', label: 'Type', type: serverWidget.FieldType.TEXT});
            orderType.defaultValue = typeCriteria;
            orderType.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});

            var idField = sublist.addField({id: 'custpage_subid', label: 'internal ID', type: serverWidget.FieldType.TEXT});
            idField.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});

            sublist.addField({id: 'custpage_subprint', label: 'Print', type: serverWidget.FieldType.CHECKBOX}).defaultValue = 'F';
            sublist.addField({id: 'custpage_subdealer', label: 'Dealer', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_subunit', label: 'Unit (Full VIN)', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_subsonumber', label: 'Sales Order #', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_subseries', label: 'Series', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_submodel', label: 'Model', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_subdecor', label: 'Decor', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_subponumber', label: 'PO number', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_subonlinedate', label: 'Online Date', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_subofflinedate', label: 'Offline Date', type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_subunitserialno', label: 'Unit Serial Number', type: serverWidget.FieldType.TEXT});

            for (var i = 0; i < results.length; i++) {
                sublist.setSublistValue({id: 'custpage_subid', line: i, value: results[i].id});
                sublist.setSublistValue({id: 'custpage_subdealer', line: i, value: results[i].getText('entity') || null});
                sublist.setSublistValue({id: 'custpage_subunit', line: i, value: results[i].getText('custbodyrvsunit')});
                sublist.setSublistValue({id: 'custpage_subsonumber', line: i, value: results[i].getValue('tranid')});
                sublist.setSublistValue({id: 'custpage_subseries', line: i, value: results[i].getText('custbodyrvsseries') || null});
                sublist.setSublistValue({id: 'custpage_submodel', line: i, value: results[i].getText('custbodyrvsmodel') || null});
                sublist.setSublistValue({id: 'custpage_subdecor', line: i, value: results[i].getText('custbodyrvsdecor') || null});
                sublist.setSublistValue({id: 'custpage_subponumber', line: i, value: results[i].getValue('otherrefnum') || null});
                sublist.setSublistValue({
                    id: 'custpage_subonlinedate',
                    line: i,
                    value: results[i].getValue({
                        name: 'custrecordunit_onlinedate',
                        join: 'custbodyrvsunit'
                    }) == '' ? ' ' : results[i].getValue({name: 'custrecordunit_onlinedate', join: 'custbodyrvsunit'})
                });
                sublist.setSublistValue({
                    id: 'custpage_subofflinedate',
                    line: i,
                    value: results[i].getValue({
                        name: 'custrecordunit_offlinedate',
                        join: 'custbodyrvsunit'
                    }) == '' ? ' ' : results[i].getValue({name: 'custrecordunit_offlinedate', join: 'custbodyrvsunit'})
                });
                sublist.setSublistValue({
                    id: 'custpage_subunitserialno',
                    line: i,
                    value: results[i].getValue('custbodyrvsunitserialnumber')
                });
            }
            ;

            form.addSubmitButton('Print');

            form.addButton({
                id: 'custpage_resetfilters',
                label: 'Reset Filters',
                functionName: 'redirectToScript()'
                //functionName: 'window.location = nlapiResolveURL(\'SUITELET\', \'customscriptgd_batchprintorders_suitelet\', \'customdeploygd_batchprintorders_suitelet\')'
            });

        };

        /**
         * Definition of the second step for the Suitelet's POST State.
         * Retrieving user input and redirecting to next step of Suitelet
         *
         * @param {Object} context
         * @param {form} form - current form for Suitelet
         */
        function postStepTwo(context, form) {
            var printType = context.request.parameters['custpage_ordertype'];

            var pdfName = fileNameReturn(printType);
            var pdfType = [];
            pdfType.push({type: printType});

            var ordersToPush = [];
            var orderCount = context.request.getLineCount({group: 'custpage_subbatchprintorder'});
            for (var i = 0; i < orderCount; i++) {
                if (context.request.getSublistValue({group: 'custpage_subbatchprintorder', name: 'custpage_subprint', line: i}) == 'T') {
                    ordersToPush.push({
                        salesOrderId: context.request.getSublistValue({
                            group: 'custpage_subbatchprintorder',
                            name: 'custpage_subid',
                            line: i
                        })
                    });
                }
            }
            log.debug('ordersToPush', ordersToPush);
            try {

                var batchPrintTask = SSLib_Task.startMapReduceScript('customscriptgd_batchprintorders_mr', null, {
                    custscriptgd_tranids: JSON.stringify(ordersToPush),
                    custscriptgd_ordertype: JSON.stringify(pdfType),
                    custscriptgd_filename: pdfName,
                });

            } catch (err) {
                log.error('error on mr', err);
                batchPrintTask = 'err';
            }

            var params = {};

            params['custpage_filename'] = pdfName;
            params['custpage_taskid'] = batchPrintTask;
            params['custpage_step'] = '3';
            redirect.toSuitelet({
                scriptId: 'customscriptgd_batchprintorders_suitelet',
                deploymentId: 'customdeploygd_batchprintorders_suitelet',
                parameters: params
            });

        }

        /**
         * Definition of the third step for the Suitelet's GET State.
         * Status page and download
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
            }).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            fileNameForm.defaultValue = fileName;
            
            if (taskId == 'ERROR') {
                form.addField({
                    id: 'custpage_error',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Status'
                }).defaultValue = '<span style="font-size: 16px;"> There was an error when trying to combine orders.</span>';
                return;
            }
            
            var taskField = form.addField({
                id: 'custpage_taskid',
                type: serverWidget.FieldType.TEXT,
                label: 'Task ID'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            }).defaultValue = taskId;


            // Retrieving the current status of the Map/Reduce task
            var taskStatus = task.checkStatus({
                taskId: taskId
            });
            if (taskStatus.status == 'COMPLETE') {
                color = 'green'
                //htmlMessage = '<br/><span style="font-size: 16px;">Orders Complete: <a href=' + file.load('/Batch Print/SalesOrders_20221008_572241.pdf').url + '>' + 'SalesOrders_20221008_572241.pdf' + '</a><br/>'
                htmlMessage = '<br/><span style="font-size: 16px;">Orders Complete: <a href=' + file.load('/Batch Print Sales and Production pdfs/' + fileName).url + '>' + fileName + '</a><br/>'
            }
            form.addField({
                id: 'custpage_message',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Message'
            }).defaultValue = htmlMessage;


            form.addSubmitButton({label: 'Refresh'});
        };

        /**
         * Definition of the second step for the Suitelet's POST State.
         * Retrieving user input and redirecting to next step of Suitelet
         *
         * @param {Object} context
         * @param {form} form - current form for Suitelet
         */
        function postStepThree(context, form) {
            var params = {};
            params['custpage_taskid'] = context.request.parameters['custpage_taskid'];
            params['custpage_filename'] = context.request.parameters['custpage_filename'];
            params['custpage_step'] = '3';
            redirect.toSuitelet({
                scriptId: 'customscriptgd_batchprintorders_suitelet',
                deploymentId: 'customdeploygd_batchprintorders_suitelet',
                parameters: params
            });
        }


        //Helper Functions


        //Creates and returns the file name based on date and time
        function fileNameReturn(type) {
            var fileType;
            if (type == 223) {
                fileType = 'ProductionOrders'
            } else {
                fileType = 'SalesOrders'
            }
            var dateTime = new Date();
            var yyyymmdd = dateTime.toLocaleDateString('sv').replaceAll('-', '');
            var time = dateTime.toTimeString().split(' ')[0].replaceAll(':', '').split('');
            var hhmmss = time[2] + time[3] + time[0] + time[1] + time[4] + time[5];
            return (`${fileType}_${yyyymmdd}_${hhmmss}.pdf`);
        }

        /**
         * Returns the file information for the given filename.
         * @param filename
         * @returns {{}}
         */
        function getFileInfo(filename) {
            var fileInfo = {};
            if(filename) {
                var result = search.create({
                    type: 'file',
                    filters:
                        [
                            ['name', 'is', filename],
                            'AND',
                            ['folder', 'anyof', 47890143]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'name',
                                sort: search.Sort.ASC,
                                label: 'Name'
                            }),
                            search.createColumn({name: 'url', label: 'URL'})
                        ]
                }).run().getRange({start: 0, end: 1});
                
                if (result && result.length > 0) {
                    fileInfo.fileId = result[0].id;
                    fileInfo.name = result[0].getValue({name: 'name'})
                    fileInfo.url = result[0].getValue({name: 'url'})
                }
            }
            return fileInfo;
        }

        return {onRequest}

    });
 