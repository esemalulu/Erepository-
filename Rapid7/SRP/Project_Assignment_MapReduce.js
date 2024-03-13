/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/record', 'N/search', 'N/log', 'N/runtime', '/SuiteScripts/integration_secrets_2.js'], function (
    record,
    search,
    log,
    runtime,
    IntegrationSecrets
) {
    function getInputData() {
        try {
            const salesOrderId = runtime.getCurrentScript().getParameter({ name: 'custscript_salesorder_id' });
            log.debug({ title: 'enter getInputData stage', details: `salesOrder id is: ${salesOrderId}` });
            const salesOrderLinesToProcessSearch = search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ['internalid', search.Operator.ANYOF, salesOrderId],
                    'AND',
                    ['mainline', search.Operator.IS, 'F'],
                    'AND',
                    ['cogs', search.Operator.IS, 'F'],
                    'AND',
                    ['taxline', search.Operator.IS, 'F'],
                    'AND',
                    ['shipping', search.Operator.IS, 'F'],
                    'AND',
                    ['item.custitemr7createpsoengagement', search.Operator.IS, 'T'],
                    'AND',
                    ['job.entityid', search.Operator.ISEMPTY, ''],
                ],
                columns: [
                    // body fields
                    'internalid',
                    'type',
                    // 'salesrep',
                    'number',
                    'createdfrom',
                    'opportunity',
                    'trandate',
                    'status',
                    'terms',
                    'totalamount',
                    'taxtotal',
                    'subsidiary',
                    'currency',
                    'custbody_r7_pre_approved_expenses',
                    'custbody_r7_use_of_subcontractors',
                    'custbodysfbillingschedule',
                    search.createColumn({
                        name: 'internalid',
                        join: 'customerMain',
                    }),
                    search.createColumn({
                        name: 'companyname',
                        join: 'customerMain',
                    }),
                    search.createColumn({
                        name: 'entityid',
                        join: 'customerMain',
                    }),
                    search.createColumn({
                        name: 'custentity_r7_services_specialist',
                        join: 'customerMain',
                    }),
                    search.createColumn({
                        name: 'custentityr7accountmanager',
                        join: 'customerMain',
                    }),
                    // line item fields
                    'line',
                    'item',
                    'quantity',
                    'rate',
                    'amount',
                    'memo',
                    'memo',
                    search.createColumn({
                        name: 'internalid',
                        join: 'job',
                    }),
                    search.createColumn({
                        name: 'entityid',
                        join: 'job',
                    }),
                    search.createColumn({
                        name: 'custitemr7defaultsrptemplates',
                        join: 'item',
                    }),
                    'custcol_r7_ff_project_id',
                    'custcol_r7_pck_package_level'
                ],
            });

            return salesOrderLinesToProcessSearch;
        } catch (e) {
            log.error({ title: 'error occured on getInputData stage', details: e });
        }
    }

    function map(context) {
        if (!context.isRestarted) {
            try {
                const searchResults = JSON.parse(context.value);
                searchResults.get = resultGetter;

                // proceed only if there in ONLY ONE appropriate project template for now:
                let appropriateProjectTemplates = getAppropriateProjectTemplates(searchResults);
                if (appropriateProjectTemplates.length > 1) {
                    log.error({
                        title: 'more than 1 appropriate template for item',
                        details: 'out of scope for auto Project assignment for now, skipping this line.',
                    });
                    return;
                } else {
                    // main processing closure
                    const newProjectName = `${searchResults.get('number')}: ${searchResults.get('item', true)} (line ${searchResults.get(
                        'line'
                    )})`;
                    // https://issues.corp.rapid7.com/browse/APPS-9973
                    const specialTermsFieldValue = getSpecialTerms(searchResults);

                    const requestObject = {
                        restletFunction: 'mergeProjectToTemplate',
                        projectTemplate: appropriateProjectTemplates[0],
                        newProjectInfo: {
                            name: newProjectName,
                            customer: searchResults.get('internalid.customerMain'),
                            fields: {
                                custentityr7salesorder: searchResults.get('internalid'),
                                custentityr7itemnum: searchResults.get('item'),
                                custentityr7itemdisplayname: searchResults.get('memo'),
                                custentityr7accountmanager: searchResults.get('custentityr7accountmanager.customerMain'),
                                // custentityr7categorybookingssalesdept: '',
                                custentityr7opppage: searchResults.get('opportunity'),
                                subsidiary: searchResults.get('subsidiary'),
                                custentity_r7_services_specialist: searchResults.get('custentity_r7_services_specialist'),
                                custentityr7specialcontractterms: specialTermsFieldValue,
                                custentityr7type: 1, // Customer Paid Project type - APPS-19914
                                custentity_r7_ff_project_id_line:searchResults.get('custcol_r7_ff_project_id'),
                                custentity_r7_package_level_line:searchResults.get('custcol_r7_pck_package_level', true),
                            },
                        },
                    };

                    const responseBody = IntegrationSecrets.callInternalRestlet(requestObject);

                    //submit currency to new project after to trigger exchange rate recalculation
                    record.submitFields({
                        type: record.Type.JOB,
                        id: responseBody.result.projectId,
                        values: {
                            currency: searchResults.get('currency'),
                        },
                    });

                    // write project info for further reducing upon sales order
                    context.write({
                        key: searchResults.get('internalid'),
                        value: {
                            line: searchResults.get('line'),
                            projectId: responseBody.result.projectId,
                        },
                    });
                }
            } catch (e) {
                log.error({ title: 'error occured on map stage', details: e });
            }
        }
    }

    function reduce(context) {
        try {
            submitProjectsToSalesOrderLines(context);
            submitProjectsRelation(context);
        } catch (e) {
            log.error({ title: 'error occured on reduce stage', details: e });
        }
    }

    function summarize(context) {
        try {
            log.audit({
                title: 'summary',
                details: JSON.stringify(context),
            });
        } catch (e) {
            log.error({ title: 'error occured on summarize stage', details: e });
        }
    }

    function submitProjectsRelation(context) {
        context.values.forEach((item) => {
            const itemObj = JSON.parse(item);
            // compose array of related projects
            const relatedProjectsArray = context.values.reduce((acc, filteredItem) => {
                const filteredItemObj = JSON.parse(filteredItem);
                if (filteredItemObj.projectId !== itemObj.projectId) {
                    acc.push(filteredItemObj.projectId)
                }
                return acc;
            }, [])
            // submit related projects information 
            record.submitFields({
                type: record.Type.JOB,
                id: itemObj.projectId,
                values: {
                    custentityr7relatedprojects: relatedProjectsArray,
                },
            });
        });
    }

    function submitProjectsToSalesOrderLines(context) {
        let recordHasChanged = false;
        let retryCount = 0;

        do {
            try {
                const salesOrderRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: context.key,
                    isDynamic: true,
                });
                context.values.forEach((item) => {
                    const itemObj = JSON.parse(item);
                    const lineNumber = salesOrderRec.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'line',
                        value: itemObj.line
                    });
                    salesOrderRec.selectLine({
                        sublistId: 'item',
                        // ss 2.0 sublists are 0 based
                        line: lineNumber,
                    });
                    salesOrderRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'job',
                        value: itemObj.projectId,
                    });
                    salesOrderRec.commitLine({
                        sublistId: 'item',
                    });
                });
                salesOrderRec.setValue({fieldId: 'custbody_r7_prj_auto_script_completed', value: true});
                salesOrderRec.save();
            } catch (ex) {
                recordHasChanged = ex.name === 'RCRD_HAS_BEEN_CHANGED';

                if (recordHasChanged) {
                    log.error({
                        title: 'Error updating SO',
                        details: `Attempt ${++retryCount}: The sales order was changed while trying to set the project on line items.  Retrying...`
                    });
                }

                // Rethrow if this is not the error we're looking for or the retryCount has been exceeded
                if (!recordHasChanged || retryCount >= 5) {
                    deleteOrphanedProjects(context);
                    throw ex;
                }
            }
        } while (recordHasChanged && retryCount < 5)
    }

    function getAppropriateProjectTemplates(searchResults) {
        let tempArr = [];
        let templateIDs = searchResults.get('custitemr7defaultsrptemplates.item').split(",");
        templateIDs.forEach((templateId) => {
            const templateSubsidiary = search.lookupFields({
                type: search.Type.PROJECT_TEMPLATE,
                id: templateId,
                columns: ['subsidiary'],
            })['subsidiary'][0]['value'];
            const salesOrderSubsidiary = searchResults.get('subsidiary');
            if (Number(templateSubsidiary) === Number(salesOrderSubsidiary)) {
                tempArr.push(templateId);
            }
        });
        return tempArr;
    }

    function getSpecialTerms(searchResults) {
        let fieldValue = '';
        if (searchResults.get('custbodysfbillingschedule') !== null) {
            fieldValue += `${searchResults.get('custbodysfbillingschedule', true)}\n`;
        }
        if (searchResults.get('custbody_r7_pre_approved_expenses')) {
            fieldValue += 'Expenses must be preapproved by Customer.\n';
        }
        if (searchResults.get('custbody_r7_use_of_subcontractors')) {
            fieldValue += 'No subcontractors will be engaged by Rapid7 on this services engagement without approval by Customer.\n';
        }
        return fieldValue;
    }

    function resultGetter(field, getText = false) {
        const value = this.values[field];
        if (typeof value === 'object' && !Array.isArray(value)) {
            return getText ? value['text'] : value['value'];
        } else {
            if (value === 'T') {
                return true;
            } else if (value === 'F') {
                return false;
            }
            return value === '' ? null : value;
        }
    }

    function deleteOrphanedProjects(context) {
        log.debug({ title: 'Delete orphaned projects', details: 'Attempting to delete orphaned projects' });

        context.values.forEach(itemJson => {
            const item = JSON.parse(itemJson);

            try {
                record.delete({
                    type: record.Type.JOB,
                    id: item.projectId
                });
                log.debug({ title: 'Delete orphaned projects', details: `Deleted orphaned project: ${item.projectId}`});
            } catch(ex) {
                log.error({ title: 'Error deleting orphaned project', details: ex });
            }
        })
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize,
    };
});
