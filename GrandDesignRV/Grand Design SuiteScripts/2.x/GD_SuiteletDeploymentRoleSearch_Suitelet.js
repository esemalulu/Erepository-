/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/url', 'N/runtime', 'N/query', 'N/search', 'N/ui/serverWidget'],
    /**
 * @param{record} record
 * @param{redirect} redirect
 * @param{url} url
 * @param{runtime} runtime
 * @param{query} query
 * @param{search} search
 * @param{serverWidget} serverWidget
 */
    (record, redirect, url, runtime, query, search, serverWidget) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method == "GET") {
                var form = serverWidget.createForm({title: 'Suitelet Deployment Role Search'});
                if (scriptContext.request.parameters['custpage_step'] == '1' || !scriptContext.request.parameters['custpage_step']) {
                    try{
                        stepOne(form);
                    } catch (err) {
                        log.error('Error in Step 1', err);
                    }
                } else if (scriptContext.request.parameters['custpage_step'] == '2') {
                    try {
                        stepTwo(scriptContext, form);
                    } catch (err) {
                        log.error('Error in Step 2', err);
                    }
                }
                scriptContext.response.writePage(form);
            } else {
                if (scriptContext.request.parameters['custpage_step'] == '1') {
                    redirect.toSuitelet({
                        scriptId: "customscriptgd_sdeploymentrolesearch_sui",
                        deploymentId: "customdeploygd_sdeploymentrolesearch_sui",
                        isExternal: false,
                        parameters: {
                            "custpage_step": "2",
                            "custpage_role": scriptContext.request.parameters["custpage_role"]
                        }
                    });
                } else {
                    redirect.toSuitelet({
                        scriptId: "customscriptgd_sdeploymentrolesearch_sui",
                        deploymentId: "customdeploygd_sdeploymentrolesearch_sui",
                        isExternal: false
                    });
                }
            }
        }

        /**
         * Helper function to add the step field to the form
         * 
         * @param {serverWidget.form} form
         * @param {string} step
         * @returns {string}
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

            return step;
        }

        /**
         * Generates the first page of the Suitetlet.
         * 
         * @param {serverWidget.form} form
         */
        const stepOne = (form) => {
            addStepField(form, '1');
            form.addSubmitButton({label: "Submit"});

            form.addField({
                id: 'custpage_role',
                label: 'Select a Role',
                type: serverWidget.FieldType.SELECT,
                source: 'role'
            });
        }

        /**
         * Generates the first page of the Suitetlet.
         * 
         * @param {serverWidget.form} form
         */
         const stepTwo = (scriptContext, form) => {
            addStepField(form, '2');
            form.addSubmitButton({label: "Restart"});

            form.addField({
                id: 'custpage_role',
                label: 'Select a Role',
                type: serverWidget.FieldType.SELECT,
                source: 'role'
            }).updateDisplayType({
                displayType : serverWidget.FieldDisplayType.DISABLED
            }).defaultValue = scriptContext.request.parameters["custpage_role"];

            // Create Sublist and add fields.
            var sublist = form.addSublist({
                id : 'custpage_deploymentssublist',
                label : 'Suitelet Deployments',
                type : serverWidget.SublistType.LIST
            });

            sublist.addField({
                id: 'custpage_sublist_deploymentid',
                label: 'Deployment Id',
                type: serverWidget.FieldType.TEXT
            }).updateDisplayType({
                displayType : serverWidget.FieldDisplayType.HIDDEN
            });

            sublist.addField({
                id: 'custpage_sublist_scriptid',
                label: 'Script Id',
                type: serverWidget.FieldType.TEXT
            }).updateDisplayType({
                displayType : serverWidget.FieldDisplayType.HIDDEN
            });

            sublist.addField({
                id: 'custpage_sublist_script',
                label: 'Script',
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'custpage_sublist_deployment',
                label: 'Deployment',
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'custpage_sublist_status',
                label: 'Status',
                type: serverWidget.FieldType.TEXT,
            });

            sublist.addField({
                id: 'custpage_sublist_loglevel',
                label: 'Log Level',
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'custpage_sublist_runasrole',
                label: 'Execute As Role',
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'custpage_sublist_isonline',
                label: 'Available Without Login',
                type: serverWidget.FieldType.CHECKBOX
            }).updateDisplayType({
                displayType : serverWidget.FieldDisplayType.DISABLED
            });

            // var deploymentIdConversionTable = {};
            // let searchResults = search.create({
            //     type: "scriptdeployment",
            //     filters:
            //     [
            //         ["script.scripttype","anyof","SCRIPTLET"]
            //     ],
            //     columns:
            //     [
            //         "scriptid"
            //     ]
            // }).runPaged({pageSize: 1000});

            // searchResults.pageRanges.forEach(function(pageRange) {
            //     searchResults.fetch({
            //         index : pageRange.index
            //     }).data.forEach(function(result) {
            //         let formattedValue = result.getValue({name: 'scriptid'}).toLowerCase();
            //         deploymentIdConversionTable[formattedValue] = result.id;
            //     });
            // });

            // Create Query object
            let deploymentQuery = query.create({
                type: query.Type.SUITELET_DEPLOYMENT
            });

            // Joins
            let scriptJoin = deploymentQuery.autoJoin({
                fieldId: 'script'
            });

            // Conditions
            let conditionOne = deploymentQuery.createCondition({
                fieldId: 'audslctrole',
                operator: query.Operator.INCLUDE_ANY,
                values: [scriptContext.request.parameters["custpage_role"]]
            });

            let conditionTwo = deploymentQuery.createCondition({
                fieldId: 'isdeployed',
                operator: query.Operator.IS,
                values: [true]
            })

            deploymentQuery.condition = deploymentQuery.and(conditionOne, conditionTwo);

            // Columns
            deploymentQuery.columns = [
                scriptJoin.createColumn({
                    fieldId: "id",
                    alias: "scriptid"
                }),
                scriptJoin.createColumn({
                    fieldId: "name"
                }),
                deploymentQuery.createColumn({
                    fieldId: "primarykey",
                    alias: "deploymentid"
                }),
                deploymentQuery.createColumn({
                    fieldId: "title"
                }),
                deploymentQuery.createColumn({
                    fieldId: "status",
                    context: query.FieldContext.DISPLAY
                }),
                deploymentQuery.createColumn({
                    fieldId: "loglevel",
                    context: query.FieldContext.DISPLAY
                }),
                deploymentQuery.createColumn({
                    fieldId: "runasrole",
                    context: query.FieldContext.DISPLAY
                }),
                deploymentQuery.createColumn({
                    fieldId: "isonline"
                }),
            ];

            // Get Results
            let results = deploymentQuery.runPaged({pageSize: 1000});
            var i = 0;
            results.iterator().each(function (pagedData) {
                let page = pagedData.value;
                page.data.asMappedResults().forEach(function (result) {
                    let scriptLink = url.resolveRecord({
                        recordType: record.Type.SUITELET,
                        recordId: result.scriptid,
                        isEditMode: false
                    });

                    //let internalId = deploymentIdConversionTable[result.deploymentid];
                    let deploymentLink = url.resolveRecord({
                        recordType: record.Type.SCRIPT_DEPLOYMENT,
                        recordId: result.deploymentid,
                        isEditMode: false
                    });
                    
                    let isOnline = result.isonline ? 'T' : 'F';

                    sublist.setSublistValue({
                        id: "custpage_sublist_scriptid",
                        line: i,
                        value: result.scriptid
                    });
                    sublist.setSublistValue({
                        id: "custpage_sublist_script",
                        line: i,
                        value: '<a target="_blank" href="' + scriptLink + '">' + result.name + '</a>'
                    });

                    sublist.setSublistValue({
                        id: "custpage_sublist_deploymentid",
                        line: i,
                        value: result.deploymentid
                    });
                    sublist.setSublistValue({
                        id: "custpage_sublist_deployment",
                        line: i,
                        value: '<a target="_blank" href="' + deploymentLink + '">' + result.title + '</a>'
                    });

                    sublist.setSublistValue({
                        id: "custpage_sublist_status",
                        line: i,
                        value: result.status
                    });

                    sublist.setSublistValue({
                        id: "custpage_sublist_loglevel",
                        line: i,
                        value: result.loglevel
                    });

                    sublist.setSublistValue({
                        id: "custpage_sublist_runasrole",
                        line: i,
                        value: result.runasrole
                    });

                    sublist.setSublistValue({
                        id: "custpage_sublist_isonline",
                        line: i,
                        value: isOnline
                    });

                    i++;
                    return true;
                });
                return true;
            });
        }

        return {onRequest}

    });
