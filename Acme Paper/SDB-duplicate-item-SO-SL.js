/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

var CLIENT_SCRIPT_FILE_ID = 'SuiteScripts/SDB-build-costs-json-CS.js';

define(['N/ui/serverWidget', 'N/search', 'N/redirect', 'N/url', 'N/runtime', "N/file", "N/task"],
    function (serverWidget, search, redirect, url, runtime, file, task)
    {
        function onRequest(context)
        {

                   var request = context.request;
       var header = request.headers;
        var remoteAddress = request.clientIpAddress;
          log.debug('request', request);
          log.debug('header', header);
          log.debug('remoteAddress', remoteAddress);
            try
            {
                var form = serverWidget.createForm({
                    title: 'Duplicated BackOrdered Items in Sales Orders',
                    hideNavBar: true
                });
                form.clientScriptModulePath = "./SDB-duplicate-item-SO-CS.js";

                var executeStatus = context.request.parameters.execute;

                // If executeStatus is equal to true then we are going to execute updateResults and hide the btn
                if (executeStatus == "true" || executeStatus)
                {
                    try
                    {
                        log.debug('ejecutando map/reduce');

                        //Execute map/reduce passing parent id as a parameter
                        var taskUpdateResult = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_sdb_duplicate_item_so_mr',
                            deploymentId: 'customdeploy_sdb_duplicate_item_so_mr'
                        });

                        var taskId = taskUpdateResult.submit();

                        log.debug('taskId', taskId);
                        if (!taskId) return;

                        context.response.write(JSON.stringify(taskId));
                        return;
                    }
                    catch (error)
                    {
                        log.debug('Ereror porque ya corrio');
                        //Because task was already running we are going to change label
                        context.response.write("alreadyrunning");
                        return;
                    }
                }

                //If map/reduce still updating let the user know and not let them try again
                if (checkMRStatus(2442) <= 0)
                {
                    form.addButton({
                        id: 'update_results_btn',
                        label: 'Update results',
                        functionName: "triggerUpdateResults()"
                    });
                }

                form.addButton({
                    id: 'reload_page',
                    label: 'Reload page',
                    functionName: "reloadPage()"
                });

                var arrayItems = getArrayItems();
                if (arrayItems.length <= 0) return;

                var sublistItems = form.addSublist({
                    id: 'custpage_table',
                    type: serverWidget.SublistType.LIST,
                    label: 'Items'
                });

                sublistItems.addField({
                    id: 'column_items',
                    type: serverWidget.FieldType.TEXT,
                    label: 'ItemName'
                });

                sublistItems.addField({
                    id: 'column_sales',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Sales Order'
                });

                sublistItems.addField({
                    id: 'column_count',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Count'
                });

                var lineCount = 0;
                //Adding items to table
                for (var i = 0; i < arrayItems.length; i++)
                {
                    for (var j = 0; j < arrayItems[i].values.length; j++)
                    {
                        sublistItems.setSublistValue({
                            id: 'column_items',
                            line: lineCount,
                            value: arrayItems[i].values[j].itemName
                        });

                        sublistItems.setSublistValue({
                            id: 'column_sales',
                            line: lineCount,
                            value: arrayItems[i].values[j].salesName
                        });

                        sublistItems.setSublistValue({
                            id: 'column_count',
                            line: lineCount,
                            value: arrayItems[i].values[j].count
                        });

                        lineCount++;
                    }
                }

                context.response.writePage(form);
            }
            catch (error)
            {
                log.debug('error onRequest', error)
            }
        }

        return {
            onRequest: onRequest
        };

        function getArrayItems()
        {
            var arrayFile = file.load({
                id: 933700
            });
            if (arrayFile.size < 10485760)
            {
                var arrayItems = JSON.parse(arrayFile.getContents());
                if (arrayItems.length < 1) return;

                return arrayItems;
            }

        }//End function

        function checkMRStatus(MR_SCRIPT)
        {
            debugger;
            var mrScriptInstanceLookup = search.create({
                type: "scheduledscriptinstance",
                filters: [
                    ["percentcomplete", "lessthan", "100"],
                    "AND",
                    ["script.internalid", "anyof", MR_SCRIPT],
                ],
                columns: [
                    search.createColumn({
                        name: "status",
                        label: "Status",
                    }),
                ],
            });
            var searchResultCount = mrScriptInstanceLookup.runPaged().count || 0;
            return searchResultCount;
        }

    });