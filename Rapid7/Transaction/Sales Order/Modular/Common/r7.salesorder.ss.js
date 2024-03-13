// noinspection JSCheckFunctionSignatures
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/config',
    'N/email',
    'N/log',
    'N/record',
    'N/runtime',
    'N/search',
    'N/url',
    'N/format',
    '../../../../CRM/Product Data/r7.product.data.library',
    '../../../Common/r7.check.custom.permissions',
    '../../../Common/r7.transaction.library.functions'
    ], (config, email, log, record, runtime, search, url, format, productData, customPermission, transLibrary) => {
        const beforeLoad = (context) => {
            const {newRecord, type, UserEventType, form} = context;
            const {VIEW, COPY} = UserEventType;
            let orderId = newRecord.id;
            let orderType = newRecord.type;

            if(type === VIEW){
                //OnePrice Migration Button
                if (customPermission.userHasPermission('oneprice_migration_button')) {
                    form.addButton({
                        id: 'custpage_onepricemigration',
                        label: 'Migrate To OnePrice',
                        functionName: 'migrateToOnePrice'
                    });
                }

                //Remove Contract button
                if (customPermission.userHasPermission('remowe_contract_button')) {
                    form.addButton({
                        id: 'custpage_remowe_contract',
                        label: 'Remove Contract',
                        functionName: 'removeContract'
                    });
                }

                // Renewal button - from R7_RA_SalesOrder_SS_CreateOpportunity.js
                if(newRecord.getValue({fieldId: 'custbodyr7ordervalidated'})===false&&nexposeItemsOnOrder(newRecord)&&newRecord.getValue({fieldId: 'status'})!=='Billed'&&customPermission.userHasPermission('nexpose_to_ivm_button')){
                    form.addButton({
                        id: 'custpage_nexpose_ivm',
                        label: 'Nexpose to IVM',
                        functionName: 'processNexposeItems'
                    });
                }

                // Renewal button - from R7_RA_SalesOrder_SS_CreateOpportunity.js
                if (customPermission.userHasPermission('create_renewal_button')) {
                    if (newRecord.getValue({fieldId: 'status'}) !== 'Pending Approval' && newRecord.getValue({fieldId: 'custbodyr7renewaloppcreated'}) === false && !hasPendingContracts(newRecord)) {
                        form.addButton({
                            id: 'custpage_renew',
                            label: 'Create Renewal',
                            functionName: 'redirectToRenewalSuitelet'
                        });
                    }
                }

                // Recalculate Tax button
                const { EDIT, FULL } = runtime.Permission;
                const salesOrderPermission = runtime.getCurrentUser().getPermission({ name: 'TRAN_SALESORD' })
                const canEditSalesOrder = [ EDIT, FULL ].includes(salesOrderPermission);
                const canRecalculateTax = customPermission.userHasPermission('can_recalculate_tax');

                if (canEditSalesOrder && canRecalculateTax) {
                    form.addButton({
                        id: 'custpage_recalculate_tax',
                        label: 'Recalculate Tax',
                        functionName: 'recalculateTax'
                    });
                }

                // Add Order Validation button if the order is not validated and user is in validation RBAC group
                if (newRecord.getValue({fieldId: 'custbodyr7ordervalidated'})===false && customPermission.userHasPermission('order_validation_button')) {
                    form.addButton({
                        id: 'custpage_validateorder',
                        label: 'Validate Order',
                        functionName: 'validateOrder'
                    });
                }
                else
                if (newRecord.getValue({fieldId: 'status'}) === 'Pending Approval' && customPermission.userHasPermission('order_unvalidation_button')) {
                    // If the order is validated and still Pending Approval allow for unvalidation
                    form.addButton({
                        id: 'custpage_unvalidateorder',
                        label: 'UN-Validate Order',
                        functionName: 'unValidateOrder'
                    });
                }

                // Add Item Association button
                if (newRecord.getValue({fieldId: 'custbodyr7ordervalidated'})===false && customPermission.userHasPermission('item_association_button')) {
                    let suiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7itemassociation_acr',
                        deploymentId: 'customdeployr7itemassociation_acr',
                        params: {
                            custparam_ordertype: orderType,
                            custparam_orderid: orderId
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_associateitems_acr',
                        label: 'Associate Items',
                        functionName: 'replaceWindow(\'' + suiteletURL + '\')'
                    });
                }

                // Add Contracts button
                if (customPermission.userHasPermission('contracts_button')) {
                    let contractSuiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7contractautomation_suitele',
                        deploymentId: 'customdeployr7contractautomation_suitele',
                        params: {
                            custparam_ordertype: orderType,
                            custparam_orderid: orderId
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_creationist',
                        label: 'Contracts',
                        functionName: 'popUpWindow(\'' + contractSuiteletURL + '\', \'800\',\'800\')'
                    });
                }

                // Add E81 button
                if (customPermission.userHasPermission('e81_allocation_button') && !isPendingACR(newRecord)) {
                    let customESPURL = url.resolveScript({
                        scriptId: 'customscriptr7customesp_suitlet',
                        deploymentId: 'customdeployr7customesp_suitlet',
                        params: {
                            custparam_trantype: orderType,
                            custparam_transaction: orderId
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_customesp',
                        label: 'E81 Allocation',
                        functionName: 'popUpWindow(\'' + customESPURL + '\', \'1000\',\'800\')'
                    });
                }
            }

            if (type === COPY) {
                transLibrary.zc_runCategoryPurchasedCopyRoutine(type);
            }

        }

        const beforeSubmit = (context) => {
            const {newRecord, type, UserEventType} = context;
            const {ContextType, executionContext} = runtime;
            const {USER_INTERFACE} = ContextType;
            const {CREATE, COPY, EDIT} = UserEventType;

            const oldRecord = context.oldRecord ||  newRecord;
            const session = runtime.getCurrentSession();
            if (session.get({ name: 'r7noscript' }) === 'T') {
                // noinspection UnnecessaryReturnStatementJS
                return;
            }

            //generate hash for each line
            if (type === CREATE || type === COPY) {
                let linesCount = newRecord.getLineCount({sublistId: 'item'});
                for(let i=0;i<linesCount;i++){
                    let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});
                    if (itemType !== 'EndGroup') {
                        newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_linehash', line: i, value: i + "_" + makeid(5)});
                    }
                }
            }

            if(executionContext === USER_INTERFACE){
                if (type === CREATE || type === COPY) {
                    newRecord.setValue({fieldId: 'custbodyr7ordervalidated', value: false});
                    newRecord.setValue({fieldId: 'custbodyr7orderassociated', value: false});
                }
                // If editing an unvalidated order, uncheck order associated
                if (type === EDIT && newRecord.getValue({fieldId: 'custbodyr7ordervalidated'})===false) {
                    newRecord.setValue({fieldId: 'custbodyr7orderassociated', value: false});
                }
                //uncheck 'order associated' & uncheck 'order validated' if 'delayed license start date' was changed
                if (type === EDIT) {
                    let oldStartDate = oldRecord.getValue({fieldId: 'custbodyr7delayedlicensestartdate'}) == null ? '' : oldRecord.getValue({fieldId: 'custbodyr7delayedlicensestartdate'});
                    let newStartDate = newRecord.getValue({fieldId: 'custbodyr7delayedlicensestartdate'});
                    let formattedoldStartDate = '';
                    let formattednewStartDate = '';
                    if(oldStartDate){
                        formattedoldStartDate = format.format({
                            value: oldStartDate,
                            type: format.Type.DATE
                        });
                    }
                    if(newStartDate){
                        formattednewStartDate = format.format({
                            value: newStartDate,
                            type: format.Type.DATE
                        });
                    }

                    if (formattedoldStartDate !== formattednewStartDate) {
                        newRecord.setValue({fieldId: 'custbodyr7orderassociated', value: false});
                        newRecord.setValue({fieldId: 'custbodyr7ordervalidated', value: false});
                        log.audit({title:'delayed license start date changed', details:'unchecked order associated & order validated'});
                    }
                }
            }

            if (type === CREATE){
                stampDefaultRevRecDates(newRecord);
                removeNotNeededLines(newRecord);
                updateMdrpLineDescription(newRecord);
            }

            if (type === CREATE || type === EDIT) {
                transLibrary.setTotalDiscount(newRecord);
                transLibrary.setLocations(newRecord);
                transLibrary.stampACV(newRecord);
                transLibrary.zc_stampCategoryPurchased(oldRecord, newRecord);
            }

            if (type === CREATE || type === COPY || type === EDIT) {
                //check for R7 Appliance Products years
                transLibrary.checkApplianceYears(newRecord);
                // https://issues.corp.rapid7.com/browse/APPS-10466
                // explicitly set revenue columns for web orders
                setRevenueColumnsForWebOrders(newRecord);
            }

            // Generate Unique Revenue IDs
            generateUniqueRevenueIds(newRecord);

            transLibrary.checkAndSetBESPFields(newRecord, context);
        }

    // For any MDRP item lines on invoice, add 'Digital Asset Limit' to the line description
    function updateMdrpLineDescription(newRecord) {
        var mdrpItemName = ['MDRP', 'RMDRP', 'MDRP-SUB'];
        var lineCount = newRecord.getLineCount({ sublistId: 'item' });
        log.audit('lineCount', lineCount);
        for (var i = 0; i < lineCount; i++) {
            
          
            var itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
            var itemName = search.lookupFields({
              type: search.Type.ITEM, 
              id: itemId,
              columns: ['itemid'] 
            }).itemid;
            log.audit("itemName", itemName);
            if(mdrpItemName.indexOf(itemName) != -1){
              log.audit("mdrpItemName.indexOf(itemName) != -1", mdrpItemName.indexOf(itemName) != -1);
              var mdrpDescription = "Fair Use MDRP Digital Asset Limit: ";
              var quantity = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
              var description = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
              
              if(quantity > 30000){
                mdrpDescription += "2000"
             }
             else if (quantity > 10000) {
               mdrpDescription += "1500"
             }
             else if (quantity > 2500){
               mdrpDescription += "1000"
             } 
             else {
               mdrpDescription += "500"
             }
              
              log.audit("mdrpDescription", mdrpDescription);
              if(description.indexOf("Fair Use") == -1){
                description += "\n"+ mdrpDescription;
                log.audit("description", description);
                newRecord.setSublistValue({ sublistId: 'item', fieldId: 'description', line: i, value: description });
              }
            }
        }
    }

        const afterSubmit = (context) => {
            let userId = runtime.getCurrentUser().id;
            //let roleId = runtime.getCurrentUser().role;
            log.debug('Context', context);
            const {newRecord, type, UserEventType} = context;
            const {ContextType, executionContext} = runtime;
            const {USER_INTERFACE} = ContextType;
            const {CREATE, EDIT} = UserEventType;
            let recId = newRecord.id;

            try {
                if (executionContext === USER_INTERFACE) {
                    if (type === CREATE || type === EDIT) {

                        let oppId = newRecord.getValue({fieldId: 'opportunity'});
                        log.debug('oppId',oppId);
                        productData.updateOppTotal(oppId);
                        // https://issues.corp.rapid7.com/browse/APPS-10804 deactivate CSM assignement
                        // transLibrary.assignCSM(context);
                    }
                }
            }
            catch (e) {
                // noinspection JSCheckFunctionSignatures
                let adminUser = config.load({type: config.Type.COMPANY_PREFERENCES}).getValue({fieldId: 'custscriptr7_system_info_email_sender'});
                email.send({
                    author: adminUser,
                    recipients: adminUser,
                    subject: 'PROD DATA SALESORDER ',
                    body: recId + ' for user ' + userId + ' \n' + e
                });
            }
        }

        const setRevenueColumnsForWebOrders = (newRecord) => {
            let source = newRecord.getValue({fieldId: 'source'});

            if (source !== '' || source != null) {
                for (let i = 0; i < newRecord.getLineCount({sublistId: 'item'}); i++) {
                    let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});
                    if (itemType !== 'Subtotal' && itemType !== 'Discount' && itemType !== 'Description' && itemType !== 'group' && itemType !=='EndGroup') {
                        let revenueFields = ['itemrevenuecategory', 'custitemr7bespcatbookingsfinancedept'];
                        let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                        let fieldLookUp = search.lookupFields({
                            type: search.Type.ITEM,
                            id: itemId,
                            columns: revenueFields
                        });

                        let itemrevenuecategory = Array.isArray(fieldLookUp['itemrevenuecategory'])? ((fieldLookUp['itemrevenuecategory'][0]) ? fieldLookUp['itemrevenuecategory'][0]['value'] : '') : fieldLookUp['itemrevenuecategory'];
                        let bespcatbookingsfinancedept = Array.isArray(fieldLookUp['custitemr7bespcatbookingsfinancedept'])? ((fieldLookUp['custitemr7bespcatbookingsfinancedept'][0] ) ? fieldLookUp['custitemr7bespcatbookingsfinancedept'][0]['value'] : '') : fieldLookUp['custitemr7bespcatbookingsfinancedept'];

                        newRecord.setSublistValue({sublistId: 'item',fieldId: 'custcol_r7_item_rev_category', line: i, value: itemrevenuecategory});
                        newRecord.setSublistValue({sublistId: 'item',fieldId: 'custcol_besp_revenue_category', line: i, value: bespcatbookingsfinancedept});
                    }
                }
            }
        }

        const removeNotNeededLines = (newRecord) => {
            try {
                let itemToRemoveParam = runtime.getCurrentScript().getParameter({name: 'custscript_r7_so_itemtoremove'});
                let itemsToRemove = itemToRemoveParam.split(',');

                for (let i = 0; i < newRecord.getLineCount({sublistId: 'item'}); i++) {
                    let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});

                    if (itemId == null || itemId === '') {
                        continue;
                    }

                    if (itemsToRemove.indexOf(itemId) >= 0 || itemsToRemove.indexOf(parseInt(itemId)) >= 0) {
                        newRecord.removeLine({sublistId: 'item', line: i});
                        i--;
                    }
                }
            }
            catch (e) {
                // noinspection JSCheckFunctionSignatures
                let adminUser = config.load({type: config.Type.COMPANY_PREFERENCES}).getValue({fieldId: 'custscriptr7_system_info_email_sender'});
                email.send({
                    author: adminUser,
                    recipients: adminUser,
                    subject: 'Error removeNotNeededLines',
                    body: 'Error: ' + e
                });
            }
        }

        const hasPendingContracts = (newRecord) => {

            try {
                if (newRecord.id == null) {
                    return false;
                }
                let arrSearchResults = search.create({
                    type: "customrecordr7contractautomation",
                    filters:
                        [
                            ["custrecordr7caroriginalsalesorder","is",newRecord.id],
                            "AND",
                            ["isinactive","is","F"],
                            "AND",
                            ["custrecordr7contractautostatus","anyof",[1, 5]]
                        ],
                    columns:
                        [
                        ]
                });
                // noinspection JSCheckFunctionSignatures
                let searchResultCount = arrSearchResults.runPaged().count;
                log.debug("hasPendingContracts - arrSearchResults result count",searchResultCount);
                if (searchResultCount > 0) {
                    return true;
                }
            }
            catch (e) {

            }
            return false;
        }

        const isPendingACR = (newRecord) =>{

            try {
                if (newRecord.id) {
                    let arrResults = search.load({
                        id: 'customsearchr7_ispendingacr'
                    })
                    arrResults.filters.push(
                        search.createFilter({
                            name: 'internalid',
                            operator: search.Operator.IS,
                            values: newRecord.id
                        })
                    )

                    // noinspection JSCheckFunctionSignatures
                    let searchResultCount = arrResults.runPaged().count;
                    log.debug("isPendingACR - arrResults result count",searchResultCount);
                    return (searchResultCount > 0)
                }
            }
            catch (e) {
                log.error('Problem checking isPendingACR()', 'ID: ' + newRecord.id);
            }

            return false;
        }

        const stampDefaultRevRecDates = (newRecord) =>{

            try {
                let lineItemCount = newRecord.getLineCount({sublistId: 'item'});

                for (let k = 0; k < lineItemCount; k++) {

                    let customStartDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7startdate', line: k});
                    let customEndDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7enddate', line: k});

                    let revRecStartDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'revrecstartdate', line: k});
                    let revRecEndDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'revrecenddate', line: k});

                    if (isBlank(revRecStartDate) && isBlank(revRecEndDate) && !isBlank(customStartDate) && !isBlank(customEndDate)) {
                        // noinspection JSCheckFunctionSignatures
                        let formattedcustomStartDate = format.parse({
                            value: customStartDate,
                            type: format.Type.DATE
                        });
                        newRecord.setSublistValue({sublistId: 'item', fieldId: 'revrecstartdate', line: k, value: formattedcustomStartDate});

                        // noinspection JSCheckFunctionSignatures
                        let formattedcustomEndDate = format.parse({
                            value: customEndDate,
                            type: format.Type.DATE
                        });
                        newRecord.setSublistValue({sublistId: 'item', fieldId: 'revrecenddate', line: k, value: formattedcustomEndDate});
                    }
                }
            }
            catch (e) {
                // noinspection JSCheckFunctionSignatures
                let adminUser = config.load({type: config.Type.COMPANY_PREFERENCES}).getValue({fieldId: 'custscriptr7_system_info_email_sender'});
                email.send({
                    author: adminUser,
                    recipients: adminUser,
                    subject: 'Error stamping revrec dates',
                    body: 'Error: ' + e
                });
            }
        }

         const nexposeItemsOnOrder = (newRecord) => {
            let itemsMap = [
                'RNXENTALL',
                'RNXENTALL-IDRBUNDLE',
                'RNXENTALLCONS',
                'RNXENTALLCONS-ADD',
                'RNXENTALLCONS-TERM',
                'RNXENTALLIP',
                'RNXENTALLIP-IDRBUNDLE',
                'RNXENTALLIPTERM',
                'RNXENTALLTERMRX',
                'RNXENTIP',
                'RNXEXPIP',
                'RNXEXPP1024',
                'RNXEXPP128',
                'RNXEXPP256',
                'RNXEXPP512',
                'RNXEXPPR',
                'RNXHOS',
                'RNXHOS512',
                'RNXHOS512-TERM',
                'RNXHOSD',
                'RNXHOSD-TERM',
                'RNXIDR',
                'RNXIDR-DE',
                'RNXIDRASSET',
            ];
            let nexposeItemsOnOrder = false;
            let linesCount = newRecord.getLineCount({sublistId: 'item'});
            for (let i = 0; i < linesCount; i++) {
                let itemName = newRecord.getSublistText({sublistId: 'item', fieldId: 'item', line: i});
                log.debug('looping through lines ' + i, itemName);
                if (itemsMap.indexOf(itemName) !== -1) {
                    log.debug('found nexpose item to process');
                    nexposeItemsOnOrder = true;
                    break;
                }
            }
            return nexposeItemsOnOrder;
        }

        const generateUniqueRevenueIds = (newRecord)  => {

            try {
                let lineItemCount = newRecord.getLineCount({sublistId: 'item'});
                let salesOrderName = newRecord.getValue({fieldId: 'tranid'});
                let uniqueGrouping = 1;
                let lineCache = [];
                let revenueOverrides = null;
                let matchFields = null;

                for (let lineNum = 0; lineNum < lineItemCount; lineNum++) {

                    if (!revenueOverrides) {
                        revenueOverrides = getRevenueOverrides();
                    }

                    if (!matchFields) {
                        matchFields = getRevenueOverrideMatchFields(revenueOverrides);
                    }

                    let lineInformation = new RevenueLineInformation({
                        lineNum: lineNum,
                        matchFields: matchFields
                    }, newRecord);

                    log.debug('lineInformation', JSON.stringify(lineInformation));

                    let newUniqueRevenueId = getUniqueRevenueId({
                        lineInfo : lineInformation,
                        lineCache : lineCache,
                        salesOrderName : salesOrderName,
                        uniqueGrouping : uniqueGrouping,
                        revenueOverrides : revenueOverrides
                    });

                    log.debug('newUniqueRevenueId', JSON.stringify(newUniqueRevenueId));

                    lineInformation.uniqueRevenueId = newUniqueRevenueId;
                    lineCache.push(lineInformation);


                    if (lineInformation.itemType === 'Group') {
                        log.debug('line is Group, do not set Values');
                        continue;
                    }

                    if (lineInformation.itemType === 'EndGroup') {
                        log.debug('line is EndGroup, do mot set Value, but do iterate grouping count');
                        uniqueGrouping++;
                        log.debug('uniqueGrouping Increased', uniqueGrouping);
                        continue;
                    }

                    log.debug('newUniqueRevenueId to set', newUniqueRevenueId);
                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7uniquerevenueid', line: lineNum, value: newUniqueRevenueId});

                    if (lineInformation.inGroup === 'T' || lineInformation.itemType === 'Group') {
                        log.debug('line is in Group, dont iterate grouping count');
                        continue;
                    }

                    uniqueGrouping++;
                    log.error('uniqueGrouping Increased', uniqueGrouping);
                }
            }
            catch (e) {

                log.error('Error generateUniqueRevenueIds', e);

                email.send({
                    author: 106223954,
                    recipients: 106223954,
                    subject: 'Error generating Unique Revenue ID',
                    body: 'Error: ' + e
                });
                // Employee 547036 is Rapid7 NetSuite Admin
            }
        }

        const getUniqueRevenueId = (dataIn) => {

            try {

                let uniqueRevenueId = dataIn.salesOrderName + '_' + dataIn.uniqueGrouping || '';
                dataIn.salesOrderName === 'To Be Generated' ? uniqueRevenueId = 'SO_' + dataIn.uniqueGrouping : null;

                //Find any "-" in the generated Unique Rev ID
                let underscoreIndex = uniqueRevenueId.indexOf("-");
                while (underscoreIndex !== -1) {
                    //Remove the "-"
                    uniqueRevenueId = uniqueRevenueId.replace("-", "");
                    underscoreIndex = uniqueRevenueId.indexOf("-");
                }

                if (dataIn.lineInfo.inGroup === 'T') {
                    uniqueRevenueId = dataIn.lineCache[(dataIn.lineCache.length - 1)].uniqueRevenueId;
                    log.error('getUniqueRevenueId', 'Child Item, match last Unique RevenueID: ' + uniqueRevenueId);
                    return uniqueRevenueId;
                }

                let overrideMatch = findMatchingOverride({
                    itemId: dataIn.lineInfo.itemId,
                    revenueOverrides: dataIn.revenueOverrides
                });

                log.error('overrideMatch', JSON.stringify(overrideMatch));

                if (overrideMatch) {
                    let lines = dataIn.lineCache;
                    log.error('lines', JSON.stringify(lines));
                    for (let i = 0; i < lines.length; i++) {
                        let line = lines[i];
                        log.error('lineId', JSON.stringify(line.itemId));
                        log.error('overrideMatch Items', JSON.stringify(overrideMatch.items));

                        if (overrideMatch.items.indexOf(line.itemId) > -1) {
                            let lineUniqueRevenueId = line.uniqueRevenueId;
                            log.error('lineUniqueRevenueId', lineUniqueRevenueId);
                            if (lineUniqueRevenueId) {
                                let groupField = overrideMatch.group_by_field;
                                log.error('groupField', groupField);
                                if (groupField) {
                                    let lineGroupFieldValue = line[groupField];
                                    let lineInfoGroupFieldValue = dataIn.lineInfo[groupField];
                                    log.error('lineGroupFieldValue', lineGroupFieldValue);
                                    log.error('lineInfoGroupFieldValue', lineInfoGroupFieldValue);
                                    if (lineGroupFieldValue === lineInfoGroupFieldValue) {
                                        uniqueRevenueId = lineUniqueRevenueId;
                                        log.error('uniqueRevenueId set to lineGroupFieldValue', uniqueRevenueId);
                                        break;
                                    }
                                    continue;
                                }
                                uniqueRevenueId = lineUniqueRevenueId;
                                break;
                            }
                        }
                    }
                }

                return uniqueRevenueId;
            }
            catch (e) {
                log.error('getUniqueRevenueId', e);
            }
        }

        const getRevenueOverrides = () => {

            try {
                let overrides = [];
                let arrSearchResults = search.create({
                    type: "customrecordr7revenueoverridegroups",
                    filters:
                        [
                            ['isinactive', 'is', 'F']
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid"}),
                            search.createColumn({name: "name"}),
                            search.createColumn({name: "custrecordr7_rog_items"}),
                            search.createColumn({name: "custrecordr7_rog_groupbyfield_id"}),
                        ]
                });
                // noinspection JSCheckFunctionSignatures
                let searchResultCount = arrSearchResults.runPaged().count;
                log.debug("getRevenueOverrides - arrSearchResults result count",searchResultCount);
                arrSearchResults.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    overrides.push(new RevenueOverrideGroup(result));
                    return true;
                });

                return overrides;
            }
            catch (e) {
                log.error( 'getRevenueOverrides', e);
            }
        }

        const getRevenueOverrideMatchFields = (revenueOverrideGroups) => {

            let fields = [];
            revenueOverrideGroups.forEach( function(override) {
                if (override.group_by_field) {
                    fields.push(override.group_by_field);
                }
            });

            return fields;
        }

        function RevenueOverrideGroup(result) {

            return {
                id : result.getValue({name: 'internalid'}),
                name : result.getValue({name: 'name'}),
                items : result.getValue({name: 'custrecordr7_rog_items'}).split(","),
                group_by_field : result.getValue({name: 'custrecordr7_rog_groupbyfield_id'}).toLowerCase(),
            }
        }

        const findMatchingOverride = (dataIn) => {

            let overrides = dataIn.revenueOverrides;
            let matchedOverride = null;

            for (let i = 0; i < overrides.length; i++) {
                let items = overrides[i].items;
                for (let j = 0; j < items.length; j++) {
                    if (items[j] === dataIn.itemId) {
                        matchedOverride = overrides[i];
                        break;
                    }
                }
                if (matchedOverride) {
                    break;
                }
            }

            return matchedOverride;
        }

        function RevenueLineInformation(dataIn, newRecord) {

            let lineNumber = dataIn.lineNum;

            let result = {};
            result['lineNum'] = lineNumber;
            result['itemId'] = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: lineNumber});
            result['uniqueRevenueId'] = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7uniquerevenueid', line: lineNumber});
            result['itemType'] = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: lineNumber});
            result['inGroup'] = newRecord.getSublistValue({sublistId: 'item', fieldId: 'ingroup', line: lineNumber});

            if (result['itemType'] === 'Group') {
                // Return first child line attributes for match fields since groups do not have these values
                lineNumber++
            }

            dataIn.matchFields.forEach( function(field) {
                result[field] = newRecord.getSublistValue({sublistId: 'item', fieldId: field, line: lineNumber});
            });

            return result;
        }

        const makeid = (length) => {
            let result           = '';
            let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let charactersLength = characters.length;
            for ( let i = 0; i < length; i++ ) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }

        const isBlank = (val) =>{
            return (val == null || val === '');
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
