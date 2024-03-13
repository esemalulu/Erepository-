/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/task', 'N/search', 'N/file'],
    function (record, log, task, search, file) {

    function beforeLoad(context) {
        const { type } = context.newRecord;
        const { RETURN_AUTHORIZATION } = record.Type;

        if (type !== RETURN_AUTHORIZATION) {
            return;
        }

        const dialogHtmlField = context.form.addField({
            id: 'custpage_jqueryui_loading_dialog',
            type: 'inlinehtml',
            label: 'Dialog HTML Field'
        });

        dialogHtmlField.defaultValue = file.load({
            id: 'SuiteScripts/loadingscreen.html'
        }).getContents();
    }

    function beforeSubmit(context) {
        const { type, UserEventType } = context;
        const { CREATE, EDIT } = UserEventType;

        if (type !== EDIT) {
            return;
        }

        try {
            updateItemLinesForNonInsightOnePackages(context);
        } catch (ex) {
            log.error({ title: 'Update Lines for non-Insight One Packages', details: ex });
        }
    }

    function afterSubmit(context) {
        const { type, oldRecord, newRecord, UserEventType } = context;
        const { CREATE, EDIT } = UserEventType;

        if (type === EDIT) {
            const orderAssociatedNew = newRecord.getValue({
                fieldId: 'custbodyr7orderassociated'
            });

            const orderAssociatedOld = oldRecord.getValue({
                fieldId: 'custbodyr7orderassociated'
            });

            const orderCurrentlyAssociated = (orderAssociatedNew !== orderAssociatedOld);
            log.debug({ title: 'orderCurrentlyAssociated', details: orderCurrentlyAssociated });

            const prj_auto_script_completed = newRecord.getValue({
                fieldId: 'custbody_r7_prj_auto_script_completed'
            });

            log.debug({ title: 'prj_auto_script_completed', details: prj_auto_script_completed });

            if (orderCurrentlyAssociated || !prj_auto_script_completed) {
                scheduleProjectAssignment(newRecord.id);
            }
        } else if (type === CREATE){
            updateItemLinesForNonInsightOnePackages(context);
        }
    }

    function isInterimPackage(packageItemId) {
        var interim = false;
        if(packageItemId) {
        var interimSearch = search.create({
          type: 'customrecord_r7_trans_package_exception',
          columns: [{ name: 'custrecord_r7_is_interim_package' }],
          filters: [
            ['custrecord_r7_interim_package_item', search.Operator.ANYOF, packageItemId],
          ]
        });
        
        interimSearch.run().each(function (result) {
            interim = result.getValue({ name: 'custrecord_r7_is_interim_package' });
          return true;
        });
        }
        return interim;
      }

    /////////////////////////////////////////////////

    /**
     * For all items in the items sublist:
     *      1. Check if item is part of a package
     *      2. If not part of a package, get the avatax code from the item and insert it into the TaxCode Mapping field
     * @param {object} context
     */
    function updateItemLinesForNonInsightOnePackages(context){
        const {newRecord} = context;
        const lineCount = newRecord.getLineCount({
            sublistId: 'item'
        })

        for (let i=0; i < lineCount; i++){
            const packageValue = newRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_r7_pck_package_level',
                line: i
            })

            const packageItem = newRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_r7_pck_package_item',
                line: i
            });
            
            const isInterimPackageFlag = isInterimPackage(packageItem);

            const itemType = newRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'itemtype',
                line: i
            })
            //disregard line items that are Group, EndGroup, Subtotal, Discount, Description
            if (['Group', 'EndGroup', 'Subtotal', 'Discount', 'Description'].indexOf(itemType) === -1 && (!packageValue || isInterimPackageFlag)) {
                const lineItem = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                })

                //then the line needs updating
                //get the Avatax tax code on the item

                let itemAvataxCode;
                if(isInterimPackageFlag){
                    itemAvataxCode = getPackageComponentTax(lineItem, packageValue);                  
                } else {
                    const deploymentType = context.newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_deployment_type',
                        line: i
                    });
                    if(deploymentType){
                        const SELF_HOSTED = '1';
                        itemAvataxCode = deploymentType == SELF_HOSTED ? 'SW052000' : 'DC010500';
                    }
                    
                    const itemLookup = search.lookupFields({
                        type: 'item',
                        id: lineItem,
                        columns: ['custitem_ava_taxcode']
                    })
                    itemAvataxCode = itemLookup['custitem_ava_taxcode'];
                }


                //update the line value
                newRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ava_taxcodemapping',
                    line: i,
                    value: itemAvataxCode
                })

                log.audit({
                    title: 'Line: ' + i,
                    details: 'Updated with a value of: ' + itemAvataxCode
                })
            }
        }
    }

    function getPackageComponentTax(itemId, packageLevel){
        let itemResults = search.create({
                type: "customrecord_r7_pck_component",
                filters: [
                    ["custrecord_r7_pcom_sku", "anyof", itemId],
                    "AND",
                    ["custrecord_r7_pcom_collection.custrecord_r7_pcol_level", "anyof", packageLevel]
                ],
                columns: ["custrecord_r7_pcom_taxcode"],
            }).run().getRange({ start: 0, end: 1 });
        return itemResults[0].getValue({name: 'custrecord_r7_pcom_taxcode'});
    }

    function scheduleProjectAssignment(salesOrderId) {
        try {
            log.debug({
                title: 'scheduleProjectAssignment method initiated',
                details: 'Scheduling Project assignment for Transaction ' + salesOrderId,
            });

            const scheduleMapReduce = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_r7_project_assignment_mr',
                deploymentId: 'customdeploy_r7_project_assignment_mr_' + String(salesOrderId).slice(-1), // split across 10 deployments - APPS-19914
                params: {
                    custscript_salesorder_id: salesOrderId,
                },
            });

            scheduleMapReduce.submit();
        } catch (error) {
            log.error({ title: 'scheduleProjectAssignment method error', details: error, });
        }
    }

    return {
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit,
        beforeSubmit: beforeSubmit
    };
});