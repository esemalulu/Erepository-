/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/file', 'N/http', 'N/record', 'N/redirect', 'N/render', 'N/search', 'N/task', 'N/ui', 'N/url', 'N/ui/serverWidget', '/SuiteBundles/Bundle 135254/SSLib_Task.js'],
/**
 * @param {error} error
 * @param {file} file
 * @param {http} http
 * @param {record} record
 * @param {redirect} redirect
 * @param {render} render
 * @param {search} search
 * @param {task} task
 * @param {ui} ui
 * @param {url} url
 * @param {serverWidget} serverWidget
 * @param {common} common
 */
function(error, file, http, record, redirect, render, search, task, ui, url, serverWidget, libTask) {
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context)
    {
        if (context.request.method == 'GET')
        {
            // Step 1: Selecting filters
            // Step 2: Selecting Sales Orders
            // Step 3: Processing

            var form = serverWidget.createForm({ title : 'Batch Print MSRP' });

            if (context.request.parameters['custpage_step'] == '1' || context.request.parameters['custpage_step'] == undefined)
            {
                stepOne(context, form);

                form.addSubmitButton('Get Orders');
            }
            else if (context.request.parameters['custpage_step'] == '2')
            {
                stepTwo(context, form);

                form.addSubmitButton('Print');

                form.addButton({
                    id: 'custpage_resetfilters',
                    label: 'Reset Filters',
                    functionName: "window.location = nlapiResolveURL('SUITELET', 'customscriptgd_batchprintmsrp_suitelet', 'customdeploygd_batchprintmsrp_suitelet')"
                });
            }
            else if (context.request.parameters['custpage_step'] == '3')
            {
                stepThree(context, form);

                form.addButton({
                    id: 'custpage_resetfilters',
                    label: 'Start Over',
                    functionName: "window.location = nlapiResolveURL('SUITELET', 'customscriptgd_batchprintmsrp_suitelet', 'customdeploygd_batchprintmsrp_suitelet')"
                });

                form.addSubmitButton('Refresh');
            }
            context.response.writePage(form);
        }
        else
        {
            if (context.request.parameters['custpage_step'] == '1' || context.request.parameters['custpage_step'] == undefined)
            {
                // Add parameters for the filters
                var params = context.request.parameters;

                // Proceed to step 2
                params['custpage_step'] = '2';

                redirect.toSuitelet({
                    scriptId: 'customscriptgd_batchprintmsrp_suitelet',
                    deploymentId: 'customdeploygd_batchprintmsrp_suitelet',
                    parameters: params
                });
            }
            else if (context.request.parameters['custpage_step'] == '2')
            {
                // Get SOs selected to print
                var salesOrdersToPrint = new Array();
                for (var lineNumber = 0; true; lineNumber++)
                {
                    var salesOrderId = context.request.getSublistValue({
                        group: 'custpage_subbatchprintmsrp',
                        name: 'custpage_subid',
                        line: lineNumber
                    });
                    if (salesOrderId == '' || salesOrderId == undefined || salesOrderId == null)
                        break;
                    var shouldPrint = context.request.getSublistValue({
                        group: 'custpage_subbatchprintmsrp',
                        name: 'custpage_subprint',
                        line: lineNumber
                    });

                    if (shouldPrint == 'T')
                        salesOrdersToPrint.push(salesOrderId);
                }

                var params = {};
                try
                {
                    var filename = 'MSRP - Batch ' + new Date().toLocaleString().replace(new RegExp('/', 'g'), '-') + '.pdf';
                    // Call 1.0 Scheduled Script for PDF generation and go to step 3.
                    var batchPrintTask = libTask.scheduleScript('customscriptgd_batchprintmsrp_scheduled', null, { custscriptsalesorderids: salesOrdersToPrint, custscriptfilename: filename });

                    params['custpage_batchprinttask'] = batchPrintTask;
                    params['custpage_filename'] = filename;
                    params['custpage_step'] = '3';
                }
                catch (error)
                {
                    params['custpage_step'] = '2';
                    throw error;
                }

                redirect.toSuitelet({
                    scriptId: 'customscriptgd_batchprintmsrp_suitelet',
                    deploymentId: 'customdeploygd_batchprintmsrp_suitelet',
                    parameters: params
                });
            }
            else if (context.request.parameters['custpage_step'] == '3')
            {
                // Simply refresh
                var params = {};
                params['custpage_batchprinttask'] = context.request.parameters['custpage_batchprinttask'];
                params['custpage_filename'] = context.request.parameters['custpage_filename'];
                params['custpage_step'] = '3';
                redirect.toSuitelet({
                    scriptId: 'customscriptgd_batchprintmsrp_suitelet',
                    deploymentId: 'customdeploygd_batchprintmsrp_suitelet',
                    parameters: params
                });
            }
        }
    }

    return {
        onRequest: onRequest
    };

    function addStepField(form, step)
    {
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

    function stepOne(context, form)
    {
        addStepField(form, '1');

        var fg = form.addFieldGroup({ id: 'custpage_fgfilters', label: 'Filters'});
        fg.isSingleColumn = true;

        var dealerGroup = form.addField({
            id: 'custpage_dealergroup',
            type: serverWidget.FieldType.SELECT,
            label: 'Dealer Group',
            container: 'custpage_fgfilters'
        });
        var dealer = form.addField({
            id: 'custpage_dealer',
            type: serverWidget.FieldType.SELECT,
            label: 'Dealer',
            container: 'custpage_fgfilters'
        });
        var salesRep = form.addField({
            id: 'custpage_salesrep',
            type: serverWidget.FieldType.MULTISELECT,
            label: 'Sales Rep',
            container: 'custpage_fgfilters'
        });
        var series = form.addField({
            id: 'custpage_series',
            type: serverWidget.FieldType.MULTISELECT,
            label: 'Series',
            container: 'custpage_fgfilters'
        });
        var model = form.addField({
            id: 'custpage_model',
            type: serverWidget.FieldType.MULTISELECT,
            label: 'Model',
            container: 'custpage_fgfilters'
        });
        var fromShipDate = form.addField({
            id: 'custpage_fromshipdate',
            type: serverWidget.FieldType.DATE,
            label: 'From (Unit Ship Date)',
            container: 'custpage_fgfilters'
        }).defaultValue;// = new Date();
        var toShipDate = form.addField({
            id: 'custpage_toshipdate',
            type: serverWidget.FieldType.DATE,
            label: 'To (Unit Ship Date)',
            container: 'custpage_fgfilters'
        }).defaultValue;// = new Date();
        var fromOnlineDate = form.addField({
            id: 'custpage_fromdateonline',
            type: serverWidget.FieldType.DATE,
            label: 'From (Unit Online Date)',
            container: 'custpage_fgfilters'
        }).defaultValue;// = new Date();
        var toOnlineDate = form.addField({
            id: 'custpage_todateonline',
            type: serverWidget.FieldType.DATE,
            label: 'To (Unit Online Date)',
            container: 'custpage_fgfilters'
        }).defaultValue;// = new Date();
        var fromOfflineDate = form.addField({
            id: 'custpage_fromdateoffline',
            type: serverWidget.FieldType.DATE,
            label: 'From (Unit Scheduled Offline Date)',
            container: 'custpage_fgfilters'
        }).defaultValue;// = new Date();
        var fromOfflineDate = form.addField({
            id: 'custpage_todateoffline',
            type: serverWidget.FieldType.DATE,
            label: 'To (Unit Scheduled Offline Date)',
            container: 'custpage_fgfilters'
        }).defaultValue;// = new Date();
        var excludeRegistered = form.addField({
            id: 'custpage_excluderegistered',
            type: serverWidget.FieldType.CHECKBOX,
            label: 'Exclude Registered Units',
            container: 'custpage_fgfilters'
        });
        var onlyBackloggedUnits = form.addField({
            id: 'custpage_excludeinvoiced',
            type: serverWidget.FieldType.CHECKBOX,
            label: 'Only Include Backlogged Units',
            container: 'custpage_fgfilters'
        });

        // Search for Dealer Groups and add the options.
        dealerGroup.addSelectOption({ text: '', value: '' });
        search.create({
            type: 'entitygroup',
            filters: ['grouptype', 'is', 'CustJob'],
            columns: ['groupname']
        }).run().getRange({ start: 0, end: 999}).forEach(function(result) {
            dealerGroup.addSelectOption({ text: result.getValue('groupname'), value: result.id });
        });

        // Search for Dealers and add the options.
        dealer.addSelectOption({ text: '', value: '' });
        search.create({
            type: search.Type.CUSTOMER,
            filters: ['custentityrvsdealertype', 'is', '10'], // RVS Dealer
            columns: search.createColumn({ name: 'companyname', sort: search.Sort.ASC })
        }).run().getRange({ start: 0, end: 999}).forEach(function(result) {
            dealer.addSelectOption({ text: result.getValue('companyname'), value: result.id });
        });

        // Search for Sales Reps and add the options.
        search.create({
            type: search.Type.EMPLOYEE,
            filters: ['salesrep', 'is', 'T'],
            columns: ['entityid']
        }).run().getRange({ start: 0, end: 999}).forEach(function(result) {
            salesRep.addSelectOption({ text: result.getValue('entityid'), value: result.id });
        });

        // Search for Series and add the options.
        search.create({
            type: 'customrecordrvsseries',
            filters: ['isinactive', 'is', 'F'],
            columns: ['name']
        }).run().getRange({ start: 0, end: 999}).forEach(function(result) {
            series.addSelectOption({ text: result.getValue('name'), value: result.id });
        });

        search.create({
            type: search.Type.ASSEMBLY_ITEM,
            filters: [['isinactive', 'is', 'F'], 'AND', ['custitemrvsitemtype', 'is', '4']], // Model
            columns: ['name']
        }).run().getRange({ start: 0, end: 999}).forEach(function(result) {
            model.addSelectOption({ text: result.getValue('name'), value: result.id });
        });
    }

    function stepTwo(context, form)
    {
        addStepField(form, '2');

        var dealerGroup = context.request.parameters['custpage_dealergroup'];
        log.debug('dealerGroup', dealerGroup);
        var dealer = context.request.parameters['custpage_dealer'];
        var salesRep = context.request.parameters['custpage_salesrep'].split('');
        var series = context.request.parameters['custpage_series'].split('');
        var model = context.request.parameters['custpage_model'].split('');
        var fromDate = context.request.parameters['custpage_fromshipdate'];
        var toDate = context.request.parameters['custpage_toshipdate'];
        var fromDateOnline = context.request.parameters['custpage_fromdateonline'];
        var toDateOnline = context.request.parameters['custpage_todateonline'];
        var fromDateOffline = context.request.parameters['custpage_fromdateoffline'];
        var toDateOffline = context.request.parameters['custpage_todateoffline'];
        var excludeRegistered = context.request.parameters['custpage_excluderegistered'];
        var excludeInvoiced = context.request.parameters['custpage_excludeinvoiced'];
        var salesOrderFilters = new Array();
        // Only show the main line of SOs
        salesOrderFilters.push(['mainline', 'is', 'T'], 'AND');
        // Only show SOs which aren't closed
        salesOrderFilters.push(['status', 'noneof', 'SalesOrd:C', 'SalesOrd:H'], 'AND');
        // Only show SOs with a unit, series, and model
        salesOrderFilters.push(['custbodyrvsunit', 'noneof', '@NONE@'], 'AND');
        salesOrderFilters.push(['custbodyrvsseries', 'noneof', '@NONE@'], 'AND');
        salesOrderFilters.push(['custbodyrvsmodel', 'noneof', '@NONE@'], 'AND');
        // Only show SOs which have an empty Retail Sold Date
        salesOrderFilters.push(['custbodyrvsunit.custrecordunit_retailpurchaseddate', 'isempty', ''], 'AND');

        // Apply any filters that were selected in step 1.

        // Apply the ship date range filter
        if (fromDate != '' && toDate != '')
            salesOrderFilters.push(['custbodyrvsunit.custrecordunit_shipdate', 'within', fromDate, toDate], 'AND');
        else if (fromDate == '' && toDate != '')
        	salesOrderFilters.push(['custbodyrvsunit.custrecordunit_shipdate', 'before', toDate], 'AND');
        else if (fromDate != '' && toDate == '')
        	salesOrderFilters.push(['custbodyrvsunit.custrecordunit_shipdate', 'after', fromDate], 'AND');

        // Apply the online date range filter
        if (fromDateOnline != '' && toDateOnline != '')
            salesOrderFilters.push(['custbodyrvsunit.custrecordunit_onlinedate', 'within', fromDateOnline, toDateOnline], 'AND');
        else if (fromDateOnline == '' && toDateOnline != '')
            salesOrderFilters.push(['custbodyrvsunit.custrecordunit_onlinedate', 'before', toDateOnline], 'AND');
        else if (fromDateOnline != '' && toDateOnline == '')
            salesOrderFilters.push(['custbodyrvsunit.custrecordunit_onlinedate', 'after', fromDateOnline], 'AND');

        // Apply the offline date range filter
        if (fromDateOffline != '' && toDateOffline != '')
            salesOrderFilters.push(['custbodyrvsunit.custrecordunit_offlinedate', 'within', fromDateOffline, toDateOffline], 'AND');
        else if (fromDateOffline == '' && toDateOffline != '')
            salesOrderFilters.push(['custbodyrvsunit.custrecordunit_offlinedate', 'before', toDateOffline], 'AND');
        else if (fromDateOffline != '' && toDateOffline == '')
            salesOrderFilters.push(['custbodyrvsunit.custrecordunit_offlinedate', 'after', fromDateOffline], 'AND');

        // Ignore SOs with inactive models
        // Commented out for HD-9617
        // salesOrderFilters.push(['custbodyrvsmodel.isinactive', 'is', 'F'], 'AND');

        var dealerIds = new Array();
        if (context.request.parameters['custpage_dealergroup'] != '')
        {
            var dealerResults = search.create({
                type: search.Type.CUSTOMER,
                filters: ['custentitygd_dealergroup', 'is', dealerGroup]
            }).run().getRange({ start: 0, end: 999}).forEach(function(result) {
                dealerIds.push(result.id);
            });
        }
        if (dealer != '')
            dealerIds.push(dealer);
        if (dealerIds.length > 0)
            salesOrderFilters.push(['entity', 'anyof', dealerIds], 'AND');
        if (salesRep != '')
            salesOrderFilters.push(['salesrep', 'anyof', salesRep], 'AND');
        if (series != '')
            salesOrderFilters.push(['custbodyrvsseries', 'anyof', series], 'AND');
        if (model != '')
            salesOrderFilters.push(['custbodyrvsmodel', 'anyof', model], 'AND');
        if (excludeRegistered == 'T')
            salesOrderFilters.push(['custbodyrvsunit.custrecordunit_receiveddate', 'isempty', ''], 'AND');
        if (excludeInvoiced == 'T')
            salesOrderFilters.push(["custbodyrvsunit.custrecordunit_backlog","anyof","@NONE@"], 'AND');

        // Get rid of any dangling operators
        if (salesOrderFilters[salesOrderFilters.length - 1] == 'AND')
            salesOrderFilters.pop();
        log.debug('salesOrderFilters', salesOrderFilters);
        var registrationDateColumn = search.createColumn({name: 'custrecordunit_receiveddate', join: 'custbodyrvsunit'});
        var shipDateColumn = search.createColumn({name: 'custrecordunit_shipdate', join: 'custbodyrvsunit'});
        var onlineDateColumn = search.createColumn({name: 'custrecordunit_onlinedate', join: 'custbodyrvsunit'});
        var offlineDateColumn = search.createColumn({name: 'custrecordunit_offlinedate', join: 'custbodyrvsunit'});
        var salesOrderResults = search.create({
            type: search.Type.SALES_ORDER,
            filters: salesOrderFilters,
            columns: [
                'tranid',
                shipDateColumn,
                onlineDateColumn,
                offlineDateColumn,
                registrationDateColumn,
                'entity',
                'salesrep',
                'status',
                'custbodyrvsunit',
                'custbodyrvsseries',
                'custbodyrvsmodel'
            ]
        }).run().getRange({ start: 0, end: 999});

        form.addField({
            id: 'custpage_results',
            label: 'Results: ' + salesOrderResults.length,
            type: serverWidget.FieldType.LABEL
        });

        var sublist = form.addSublist({
            id: 'custpage_subbatchprintmsrp',
            label: 'Batch Print MSRP',
            type: serverWidget.SublistType.LIST
        });
        sublist.addMarkAllButtons();

        var idField = sublist.addField({
            id: 'custpage_subid',
            label: 'Internal ID',
            type: serverWidget.FieldType.TEXT
        });
        idField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        var printField = sublist.addField({
            id: 'custpage_subprint',
            label: 'Print',
            type: serverWidget.FieldType.CHECKBOX
        });
        printField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.ENTRY
        });
        sublist.addField({
            id: 'custpage_subordernumber',
            label: 'Order Number',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_subshipdate',
            label: 'Unit Ship Date',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_subonlinedate',
            label: 'Unit Online Date',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_subofflinedate',
            label: 'Unit Offline Date',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_subregistrationdate',
            label: 'Warranty Registration Received Date',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_subdealer',
            label: 'Dealer',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_subsalesrep',
            label: 'Sales Rep',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_substatus',
            label: 'Status',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_subunit',
            label: 'Unit',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_subseries',
            label: 'Series',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_submodel',
            label: 'Model',
            type: serverWidget.FieldType.TEXT
        });

        for (var i = 0; i < salesOrderResults.length; i++)
        {
            sublist.setSublistValue({
                id: 'custpage_subid',
                line: i,
                value: salesOrderResults[i].id
            });

            sublist.setSublistValue({
                id: 'custpage_subprint',
                line: i,
                value: 'T'
            });
            sublist.setSublistValue({
                id: 'custpage_subordernumber',
                line: i,
                value: salesOrderResults[i].getValue('tranid')
            });
            sublist.setSublistValue({
                id: 'custpage_subshipdate',
                line: i,
                value: salesOrderResults[i].getValue({name: 'custrecordunit_shipdate', join: 'custbodyrvsunit'}) == '' ? ' ' : salesOrderResults[i].getValue({name: 'custrecordunit_shipdate', join: 'custbodyrvsunit'})
            });
            sublist.setSublistValue({
                id: 'custpage_subonlinedate',
                line: i,
                value: salesOrderResults[i].getValue({name: 'custrecordunit_onlinedate', join: 'custbodyrvsunit'}) == '' ? ' ' : salesOrderResults[i].getValue({name: 'custrecordunit_onlinedate', join: 'custbodyrvsunit'})
            });
            sublist.setSublistValue({
                id: 'custpage_subofflinedate',
                line: i,
                value: salesOrderResults[i].getValue({name: 'custrecordunit_offlinedate', join: 'custbodyrvsunit'}) == '' ? ' ' : salesOrderResults[i].getValue({name: 'custrecordunit_offlinedate', join: 'custbodyrvsunit'})
            });
            sublist.setSublistValue({
                id: 'custpage_subregistrationdate',
                line: i,
                value: salesOrderResults[i].getValue({ name: 'custrecordunit_receiveddate', join: 'custbodyrvsunit' }) == '' ? ' ' : salesOrderResults[i].getValue({ name: 'custrecordunit_receiveddate', join: 'custbodyrvsunit' })
            });
            sublist.setSublistValue({
                id: 'custpage_subdealer',
                line: i,
                value: salesOrderResults[i].getText('entity')
            });
            sublist.setSublistValue({
                id: 'custpage_subsalesrep',
                line: i,
                value: salesOrderResults[i].getText('salesrep') == '' ? ' ' : salesOrderResults[i].getText('salesrep')
            });
            sublist.setSublistValue({
                id: 'custpage_substatus',
                line: i,
                value: salesOrderResults[i].getText('status')
            });
            sublist.setSublistValue({
                id: 'custpage_subunit',
                line: i,
                value: salesOrderResults[i].getText('custbodyrvsunit')
            });
            sublist.setSublistValue({
                id: 'custpage_subseries',
                line: i,
                value: salesOrderResults[i].getText('custbodyrvsseries')
            });
            sublist.setSublistValue({
                id: 'custpage_submodel',
                line: i,
                value: salesOrderResults[i].getText('custbodyrvsmodel')
            });
        }
    }

    function stepThree(context, form)
    {
        addStepField(form, '3');

        var batchPrintTask = context.request.parameters['custpage_batchprinttask'];
        var filename = context.request.parameters['custpage_filename'];

        form.addField({
            id: 'custpage_batchprinttask',
            type: serverWidget.FieldType.TEXT,
            label: 'Batch Print Task'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        }).defaultValue = batchPrintTask;
        form.addField({
            id: 'custpage_filename',
            type: serverWidget.FieldType.TEXT,
            label: 'Filename'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        }).defaultValue = filename;

        var processing = form.addField({
            id: 'custpage_processing',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Processing'
        });

        var batchPrintTaskStatus = task.checkStatus(batchPrintTask).status;
        processing.defaultValue = "<p style='font-size:14px'></br>The batch print is " +
        batchPrintTaskStatus.toLowerCase() + '.</br></br>';

        try {
        // Show instructions on how to get to the File Cabinet once complete.
        if (batchPrintTaskStatus == 'COMPLETE')
            processing.defaultValue += '<a href=' + file.load('/MSRP PDFs/' + filename).url + '>' + filename + '</a>'
        } catch (error) {
        	processing.defaultValue = "<p style='font-size:14px'></br>This appears to be taking a while. " +
        	"The batch could still be running, or it could have failed. " +
        	"You're welcome to keep refreshing and, if it finishes, the link to the file will be here.</br></br>" +
        	"For future reference, we recommend batches of 250 or less MSRPs to prevent issues."
        }

        processing.defaultValue += '</p>'
    }
});