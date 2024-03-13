// noinspection JSFileReferences
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/file', 'N/config', 'N/email', 'N/log', 'N/record', 'N/runtime', 'N/search', 'N/url', 'N/format' , '/SuiteScripts/Transaction/Common/r7.check.custom.permissions.js'],
    (serverWidget,file, config, email, log, record, runtime, search, url,format, customPermission) => {

        const beforeLoad = (context) => {
            //let roleId = runtime.getCurrentUser().role;
            const {newRecord, type, UserEventType, form} = context;
            const {ContextType, executionContext} = runtime;
            const {USER_INTERFACE} = ContextType;
            const {VIEW, EDIT} = UserEventType;
            let oppId = newRecord.id;
            if(executionContext === USER_INTERFACE && type === VIEW){
                preRunDataCheck(newRecord);
            }
            if(type === VIEW){
                let entityId = newRecord.getValue({fieldId: 'entity'});

                // create license button
                if (customPermission.userHasPermission('create_license_button')) {
                    let suiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7createlicensefromtemplate',
                        deploymentId: 'customdeployr7createlicensefromtemplate',
                        params: {
                            custparam_customer: entityId,
                            custparam_opportunity: oppId
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_create_evallicense',
                        label: 'Create License',
                        functionName: 'popUpWindow(\'' + suiteletURL + '\', \'500\',\'500\')'
                    });
                }

                // upgrade to rnxentall button
                if (customPermission.userHasPermission('upgrade_nxentall_button')) {
                    form.addButton({
                        id: 'custpage_upgradenxentall',
                        label: 'Upgrade to RNXENTALL',
                        functionName: 'r7_upgradeOpportunity'
                    });
                }

                // migrate to rivm button
                if (customPermission.userHasPermission('upgrade_ivm_button')) {
                    form.addButton({
                        id: 'custpage_upgradeivm',
                        label: 'Migrate to RIVM',
                        functionName: 'upgradeOppToIVM'
                    });
                }

                // transfer records button
                if (customPermission.userHasPermission('transfer_quote_task_button')) {
                    let transferSuiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7transferquotestasksfromopp',
                        deploymentId: 'customdeployr7transferrecordsfromopp',
                        params: {
                            custparam_currentopp: oppId
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_transferquotestasks',
                        label: 'Transfer Quotes/Tasks',
                        functionName: 'popUpWindow(\'' + transferSuiteletURL + '\', \'550\',\'400\')'
                    });
                }

                //Add Uplift Button
                if (customPermission.userHasPermission('add_uplift_button')) {
                    let addUpliftSuiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7remove5percent_suitelet',
                        deploymentId: 'customdeployr7remove5percent_suitelet',
                        params: {
                            custparam_oppid: oppId
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_remove5up',
                        label: 'Add Uplift',
                        functionName: 'replaceWindow(\'' + addUpliftSuiteletURL + '\')'
                    });
                }

                // Create Event Button
                if (customPermission.userHasPermission('create_event_button')) {
                    let eventSuiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7livemeetinglanding_suitele',
                        deploymentId: 'customdeployr7livemeetinglanding_suitele',
                        params: {
                            custparam_opportunity: oppId
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_createapievent',
                        label: 'Create Event',
                        functionName: 'replaceWindow(\'' + eventSuiteletURL + '\')'
                    });
                }

                // Rapid Quote
                if (customPermission.userHasPermission('rapid_quote_button')) {
                    let createQuoteSuiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7rapidquote_suitelet',
                        deploymentId: 'customdeployr7rapidquote_suitelet',
                        params: {
                            custparam_oppid: oppId,
                            custparam_refresh : 'T'
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_createquote',
                        label: 'Rapid Quote',
                        functionName: 'popUpWindow(\'' + createQuoteSuiteletURL + '\')'
                    });
                }

                // Renewal Automation Button
                if (customPermission.userHasPermission('renewal_automation_button')) {
                    if (!hasAnyContracts(newRecord)) {
                        form.addButton({
                            id: 'custpage_cotermthisopp',
                            label: 'Renewal Automation',
                            functionName: "redirectToRenewalSuitelet('opp')"
                        });
                    }
                }
            }

            if(type === VIEW || type === EDIT){
                try{
                    let salesTab = form.getTab({ id: 'custom17'});
                    if (salesTab != null) {
                        form.addSubtab({id: 'custpage_tabproddatahtml', label: 'Products/Services', tab: 'custom17'});
                        let pdrGrp = form.addFieldGroup({id: 'pdrstuff', label: 'PDR', tab: 'custpage_tabproddatahtml'});
                        pdrGrp.isBorderHidden = true;
                        pdrGrp.isSingleColumn = true;
                        let primaryquoteField = form.addField({id: 'custpage_proddataprimaryquote', type: serverWidget.FieldType.SELECT, label: 'Primary Quote', source: 'transaction', container: 'pdrstuff'});
                        // noinspection JSCheckFunctionSignatures
                        primaryquoteField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
                        primaryquoteField.defaultValue = getPrimaryQuote(newRecord);

                        let objFile = file.load({id: 1616672});
                        let prodDataHTML = objFile.getContents();
                        let proddataField = form.addField({id: 'custpage_proddatahtml', type: serverWidget.FieldType.INLINEHTML, label: 'test', container: 'pdrstuff'});
                        proddataField.defaultValue = prodDataHTML;
                        // noinspection JSCheckFunctionSignatures
                        primaryquoteField.updateLayoutType({layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE});
                        let modifyProdDatav2URL = url.resolveScript({
                            scriptId: 'customscriptr7productdata_suitelet_dt',
                            deploymentId: 'customdeployr7productdata_suitelet_dt',
                            params: {
                                custparam_oppid: oppId
                            },
                            returnExternalUrl: false
                        });
                        form.addButton({
                            id: 'custpage_modifyproducts',
                            label: 'Modify Products/Services',
                            functionName: 'popUpWindow(\'' + modifyProdDatav2URL + '\', \'1000\',\'600\')'
                        })
                    }

                }catch (e){
                    // noinspection JSCheckFunctionSignatures
                    let adminUser = config.load({type: config.Type.COMPANY_PREFERENCES}).getValue({fieldId: 'custscriptr7_system_info_email_sender'});
                    email.send({
                        author: adminUser,
                        recipients: adminUser,
                        subject: 'Error beforeLoad PDR',
                        body: 'ID: ' + oppId  + '\nError: ' + e
                    });
                }
            }

            if (type === VIEW && customPermission.userHasPermission('migrate_to_international_sub_button')) {
                // Migrate to Int Sub https://issues.corp.rapid7.com/browse/APPS-10709
                let R7_INT_SUBSIDIARY = '10';
                let OPPORTUNITY_CLOSED_MIGRATED = '101'
                let subsidiary = newRecord.getValue({
                    fieldId: 'subsidiary'
                })
                let status = newRecord.getValue({
                    fieldId: 'entitystatus'
                })
                if (subsidiary !== R7_INT_SUBSIDIARY && status !== OPPORTUNITY_CLOSED_MIGRATED) {
                    form.addButton({
                        id: 'custpage_migrate_opp',
                        label: 'Migrate to Int Sub',
                        functionName: 'migrateToIntSub'
                    })
                }
            }

            if(type === EDIT){
                const currentRole = runtime.getCurrentUser().role;
                log.debug('currentRole', currentRole);
                const rolesRestricted = [1022, 1027];
                const currentOppForm = newRecord.getValue({fieldId: 'customform'});
                log.debug('currentOppForm', currentOppForm);
                if (currentOppForm === '142' && rolesRestricted.includes(currentRole)) {
                    let csmField = form.getField({id: 'salesrep'});
                    // noinspection JSCheckFunctionSignatures
                    csmField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE})
                }
            }
        }

        const beforeSubmit = (context) => {
            const {UserEventType, newRecord, type} = context;
            const {CREATE, EDIT, XEDIT} = UserEventType;
            let oppId = newRecord.id;
            const oldRecord = context.oldRecord ||  newRecord;
            // noinspection JSCheckFunctionSignatures
            let adminUser = config.load({type: config.Type.COMPANY_PREFERENCES}).getValue({fieldId: 'custscriptr7_system_info_email_sender'});
            if(type === EDIT || type === CREATE){
                try {
                    setLocations(newRecord);
                    stampRenewalAmounts(newRecord);
                    // LARR
                    checkAndPopulateLARR(newRecord);
                }
                catch (err) {
                    log.error('Problem stamping renewal amounts Opp beforeSubmit', err);
                    email.send({
                        author: adminUser,
                        recipients: adminUser,
                        subject: 'Problem stamping renewal amounts Opp beforeSubmit',
                        body: 'OppID: ' + oppId  + '\n\nError: ' + err
                    });
                }

                try {
                    let dateAdjusted = newRecord.getValue({fieldId:'custbodyr7oppexpectedclosedateamadjust'});
                    let dateExpectedClose = newRecord.getValue({fieldId:'expectedclosedate'});

                    if (dateAdjusted == null || dateAdjusted === '') {
                        newRecord.setValue({fieldId:'custbodyr7oppexpectedclosedateamadjust', value: dateExpectedClose})
                    }

                }
                catch (err) {
                    log.error('Problem stamping expected close - am adjusted', err);
                    email.send({
                        author: adminUser,
                        recipients: adminUser,
                        subject: 'Problem stamping expected close - am adjusted',
                        body: 'OppID: ' + oppId  + '\n\nError: ' + err
                    });
                }

                try {
                    pullACV_CreatedFromRA(newRecord);
                }
                catch (err) {
                    log.error('Problem stamping acv amounts Opp beforeSubmit', err);
                    email.send({
                        author: adminUser,
                        recipients: adminUser,
                        subject: '\'Problem stamping acv amounts Opp beforeSubmit',
                        body: 'OppID: ' + oppId  + '\n\nError: ' + err
                    });
                }

                // Calculate Renewal ACV Total field
                try {
                    calculateRenewalACVTotal(newRecord);
                }
                catch (err) {
                    log.error('Problem calculating renewal ACV total Opp beforeSubmit', err);
                    email.send({
                        author: adminUser,
                        recipients: adminUser,
                        subject: 'Problem calculating renewal ACV total Opp beforeSubmit',
                        body: 'OppID: ' + oppId  + '\n\nError: ' + err
                    });
                }
            }

            const newCSM = newRecord.getValue({fieldId: 'salesrep'});
            if(type === XEDIT && newCSM){
                const fieldLookUp = search.lookupFields({
                    type: record.Type.OPPORTUNITY,
                    id: oppId,
                    columns: ['title']
                });
                const title = fieldLookUp['title'];
                log.debug('title', title);
                const currentRole = runtime.getCurrentUser().role;
                log.debug('currentRole', currentRole);
                const rolesRestricted = [1022, 1027];
                const oldCSM = oldRecord.getValue({fieldId: 'salesrep'});

                if (title.includes('Renewal') && rolesRestricted.includes(currentRole) && oldCSM !== newCSM) {
                     throw 'Your user class is restricted from changing this value. Please reach out to the operations team for assistance.';
                }
            }
        }

        const afterSubmit = (context) => {
            /* For changes in the opportunity status
             * this function timestamps the new opportunity status
             */
            try {
                setPLSOnOpportunityCreate(context);
                //updateOppTotal(context.newRecord.id);
            }
            catch (e) {
                // noinspection JSCheckFunctionSignatures
                let adminUser = config.load({type: config.Type.COMPANY_PREFERENCES}).getValue({fieldId: 'custscriptr7_system_info_email_sender'});
                email.send({
                    author: adminUser,
                    recipients: adminUser,
                    subject: 'Error OpportunitySS afterSubmit',
                    body: 'Error: ' + e
                });
            }
        }

        const calculateRenewalACVTotal = (newRecord) => {
            try {
                //To avoid resetting renewalACVTotal to 0

                let renewalACVTotal;
                //renewalACVTotal = newRecord.getValue({fieldId: 'custbodyr7renewalacvtotal'});

                let lineCount = newRecord.getLineCount({sublistId: 'item'});
                let calculateRenewalACVTotal = 0;
                for (let i = 0; i < lineCount; i++) {
                    let acvamount = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7acvamount', line: i});
                    log.debug( 'renewalACVTotal - loop', acvamount);
                    calculateRenewalACVTotal += formatAmount(acvamount);
                }
                renewalACVTotal = calculateRenewalACVTotal;
                log.debug('renewalACVTotal', renewalACVTotal);
                newRecord.setValue({fieldId: 'custbodyr7renewalacvtotal', value: renewalACVTotal});
            }
            catch (err) {
                log.error('Error calculating renewal ACV total', err);
            }
        }

        const getPrimaryQuote = (newRecord) => {
            try {
                let oppId = newRecord.id;
                if (oppId == null || oppId === '') {
                    return null;
                }

                let arrResults = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["mainline", "is", "T"],
                            "AND",
                            ["type", "anyof", "Estimate"],
                            "AND",
                            ["custbodyr7includeinsalesforecast", "is", "T"],
                            "AND",
                            ["opportunity", "anyof", oppId]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid"}),
                        ]
                });
                // noinspection JSCheckFunctionSignatures
                let searchResultCount = arrResults.runPaged().count;
                log.debug("getPrimaryQuote arrResults count",searchResultCount);
                let quoteId;
                arrResults.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    quoteId =  result.getValue({name: "internalid"});
                    return true;
                });
                return quoteId;
            }
            catch (e) {
                log.error('ERROR getPrimaryQuote', e);
            }

            return null;
        }

        // LARR
        // go through all createdFromRA sales orders, summarize and assign LARR value to Opp.
        const checkAndPopulateLARR = (newRecord) => {
            let larrOnOpp = parseFloat(newRecord.getValue({fieldId: 'custbodyr7renewaltotalamount'}));
            if (isNaN(larrOnOpp) || larrOnOpp === 0) {
                let salesOrderArr = [];
                for (let i = 0; i < newRecord.getLineCount({sublistId:'item'}); i++) {
                    let soId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', line: i});
                    if (soId !== "" && soId != null) {
                        if (salesOrderArr.indexOf(soId) === -1) {
                            salesOrderArr.push(soId)
                        }
                    }
                }
                let larrSumFromAllSO = 0;
                salesOrderArr.forEach(function (salesOrderId) {
                    let recSO = record.load({type: record.Type.SALES_ORDER, id: salesOrderId});
                    let soLineItemCount = recSO.getLineCount({sublistId:'item'});
                    let solistPriceARR = 0;

                    for (let i = 0; i < soLineItemCount; i++) {
                        let itemId = recSO.getSublistValue({sublistId:'item', fieldId:'item',line: i});
                        let itemType = recSO.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});
                        if (itemType === 'Group' || itemType === 'EndGroup' || itemType === 'Discount' || itemType === 'Subtotal' || itemType === 'Description') {
                            continue;
                        }
                        // LARR of item only exists if it is renewable
                        let fieldLookUp = search.lookupFields({
                            type: search.Type.ITEM,
                            id: itemId,
                            columns: ['custitemr7itemrenewalsku']
                        });
                        let itemRenewable = Array.isArray(fieldLookUp['custitemr7itemrenewalsku'])? fieldLookUp['custitemr7itemrenewalsku'][0]['value'] : fieldLookUp['custitemr7itemrenewalsku'];
                        if (itemRenewable !== '' && itemRenewable != null) {
                            let listArrAmount = parseFloat(recSO.getSublistValue({sublistId:'item', fieldId:'amount',line: i}));
                            if (!isNaN(listArrAmount) && listArrAmount > 0) {

                                // 1	 --   Unit
                                // 2	 --   Month
                                // 3	 --   Year
                                // 5	 --   Days
                                // 6	 --   15 Day
                                // 7	 --   Per Term
                                // 8	 --   Week
                                // 9	 --   Workflow

                                let UNIT = '1';
                                // let MONTH = '2';
                                let YEAR = '3';
                                let PER_TERM = '7';
                                let WORKFLOW = '9';

                                let itemUnit = recSO.getSublistValue({sublistId:'item', fieldId:'custcolr7itemqtyunit',line: i});
                                let itemQuantity = Number(recSO.getSublistValue({sublistId:'item', fieldId:'quantity',line: i}));//
                                if (itemQuantity >= 1) {
                                    switch (itemUnit) {
                                        // case MONTH:
                                        //     // annualize by multiplying the total amount by 12 (months) and dividing by number of months on the item
                                        //     listArrAmount = listArrAmount / itemQuantity * 12 // 12 - months in year
                                        //     solistPriceARR += listArrAmount;
                                        //     break;

                                        case YEAR:
                                            // annualize by dividing the total amount by number of years
                                            listArrAmount = listArrAmount / itemQuantity;
                                            solistPriceARR += listArrAmount;
                                            break;

                                        case UNIT:
                                        case PER_TERM:
                                        case WORKFLOW:
                                            // annualize by calculating the term in days, dividing the term by 365 (days in year) and then dividing the amount by this ratio

                                            // noinspection JSCheckFunctionSignatures
                                            let startDate = format.parse({
                                                value: recSO.getSublistValue({sublistId: 'item', fieldId: 'custcolr7startdate', line: i}),
                                                type: format.Type.DATE
                                            });
                                            // noinspection JSCheckFunctionSignatures
                                            let endDate = format.parse({
                                                value: recSO.getSublistValue({sublistId: 'item', fieldId: 'custcolr7enddate', line: i}),
                                                type: format.Type.DATE
                                            });
                                            let term = days_between(startDate, endDate) + 1; //include end of term day
                                            let ratio = term / 365; // days in year
                                            listArrAmount = listArrAmount / ratio;
                                            solistPriceARR += listArrAmount;
                                            break;

                                        default:
                                            break;

                                    }
                                }
                            }
                        }
                    }
                    larrSumFromAllSO += solistPriceARR;
                })
                newRecord.setValue({fieldId: 'custbodyr7renewaltotalamount', value: larrSumFromAllSO});
                log.debug('new LARR value set', Number(newRecord.getValue({fieldId: 'custbodyr7renewaltotalamount'})));

            }
        }

        const stampRenewalAmounts = (newRecord) => {
            let actualHeaderAmountBase = 0;
            let actualHeaderAmountCoTerm = 0;
            let actualHeaderAmountMultiYr = 0;

            let lineItemCount = newRecord.getLineCount({sublistId: 'item'});

            for (let k = 0; k < lineItemCount; k++) {

                let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: k});
                // let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: k});

                if (itemType === 'Group' || itemType === 'group' || itemType === 'EndGroup') {
                    continue;
                }

                let lineLocation = newRecord.getSublistValue({sublistId: 'item', fieldId: 'location', line: k});
                let currentLineAmountBase = 0;
                let actualLineAmountCoTerm = 0;
                let actualLineAmountMultiYr = 0;

                // let PARTNER_DISCOUNT = -6;
                // let DISCOUNT = 51
                // if (itemType != 'Subtotal' && itemId != PARTNER_DISCOUNT && itemId != DISCOUNT) {
                if (itemType !== 'Subtotal') {

                    let amount = formatAmount(newRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: k}));
                    let negativeAmount = (amount < 0);
                    currentLineAmountBase = formatAmount(newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7opamountrenewalbaseline', line: k}));

                    if (currentLineAmountBase == null || currentLineAmountBase === '' || currentLineAmountBase === 0) {
                        currentLineAmountBase = amount;
                        newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7opamountrenewalbaseline', line: k, value: currentLineAmountBase});
                    }

                    let createdFromRA = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', line: k});

                    if (createdFromRA != null && createdFromRA !== '') {
                        let difference = amount - currentLineAmountBase;
                        if (negativeAmount) {
                            if (difference > 0) {
                                actualLineAmountCoTerm = difference;
                                actualLineAmountMultiYr = 0;
                            }
                            else {
                                actualLineAmountCoTerm = 0;
                                actualLineAmountMultiYr = difference;
                            }
                        }
                        else {
                            if (difference > 0) {
                                actualLineAmountCoTerm = 0;
                                actualLineAmountMultiYr = difference;
                            }
                            else {
                                actualLineAmountCoTerm = difference;
                                actualLineAmountMultiYr = 0;
                            }
                        }
                    }
                    else {
                        newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7opamountrenewalbaseline', line: k, value: 0});
                        currentLineAmountBase = 0;
                    }
                }

                newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7opamountrenewalcotermline', line: k, value: actualLineAmountCoTerm});
                newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7opamountrenewalmultiyearline', line: k, value: actualLineAmountMultiYr});

                if (lineLocation == null || lineLocation === '') {
                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'location', line: k, value: newRecord.getValue({fieldId: 'location'})});
                }

                actualHeaderAmountBase += currentLineAmountBase;
                actualHeaderAmountCoTerm += actualLineAmountCoTerm;
                actualHeaderAmountMultiYr += actualLineAmountMultiYr;

            }

            newRecord.setValue({fieldId: 'custbodyr7amountrenewalcoterm', value: actualHeaderAmountCoTerm});
            newRecord.setValue({fieldId: 'custbodyr7amountrenewalmultiyr', value: actualHeaderAmountMultiYr});
        }

        const days_between = (date1, date2) => {
            if (date1 == null || date1 === '' || date2 == null || date2 === '') {
                return '';
            }
            // The number of milliseconds in one day
            let ONE_DAY = 1000 * 60 * 60 * 24;

            // Convert both dates to milliseconds
            let date1_ms = date1.getTime();
            let date2_ms = date2.getTime();

            // Calculate the difference in milliseconds
            let difference_ms = (date1_ms - date2_ms) * -1;

            // Convert back to days and return
            return Math.round(difference_ms / ONE_DAY);
        }

        const formatAmount = (amount) => {
            if (amount != null && amount !== '') {
                return Math.round(parseFloat(amount) * 100) / 100;
            }
            return 0;
        }

        /*const updateOppTotal = (oppId) => {
            let newProjTotal = 0;

            if (oppId != null && oppId !== '') {

                let arrSearchResults = search.create({
                    type: "customrecordr7competitiveproductdata",
                    filters:
                        [
                            ["isinactive", "is", "F"],
                            "AND",
                            ["custrecordr7competproddataopportunity", "anyof", oppId],
                            "AND",
                            ["custrecordr7competproddataopportunity.probability", "lessthan", "100"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "custrecordr7competproddataopportunity",
                                summary: "GROUP"
                            }),
                            search.createColumn({
                                name: "formulacurrency",
                                summary: "SUM",
                                formula: "CASE WHEN {custrecordr7competproddataconclusion.id} = ANY(2, 3) THEN 0 ELSE {custrecordr7competproddataprojtotal} END"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "MAX",
                                formula: "{custrecordr7competproddataopportunity.department.id}"
                            }),
                            search.createColumn({
                                name: "custbodyr7opprenewalautomationcreated",
                                join: "CUSTRECORDR7COMPETPRODDATAOPPORTUNITY",
                                summary: "MAX"
                            })
                        ]
                });
                // noinspection JSCheckFunctionSignatures
                let searchResultCount = arrSearchResults.runPaged().count;
                log.debug("updateOppTotal arrSearchResults  count",searchResultCount);
                arrSearchResults.run().each(function(result){
                    // .run().each has a limit of 4,000 results

                    newProjTotal = result.getValue({
                        name: "formulacurrency",
                        summary: "SUM",
                        formula: "CASE WHEN {custrecordr7competproddataconclusion.id} = ANY(2, 3) THEN 0 ELSE {custrecordr7competproddataprojtotal} END"
                    });
                    let oppDept = parseFloat(result.getValue({
                        name: "formulanumeric",
                        summary: "MAX",
                        formula: "{custrecordr7competproddataopportunity.department.id}"
                    }));
                    let raCreatedOpp = result.getValue({
                        name: "custbodyr7opprenewalautomationcreated",
                        join: "CUSTRECORDR7COMPETPRODDATAOPPORTUNITY",
                        summary: "MAX"
                    });
                    log.debug('oppDept', oppDept);
                    if (oppDept === 10 || raCreatedOpp === true) { //account management
                        return;
                    }
                    record.submitFields({
                        type: record.Type.OPPORTUNITY,
                        id: oppId,
                        values: {
                            'projectedtotal': newProjTotal
                        }
                    });
                    return true;
                });

            }
        }*/

        const setPLSOnOpportunityCreate = (context) => {
            let campaignCategory;
            const {UserEventType, type, newRecord} = context;
            const {CREATE} = UserEventType;
            if(type === CREATE){
                let customerId = newRecord.getValue({fieldId: 'entity'});

                let fieldLookUpCustomer = search.lookupFields({
                    type: record.Type.CUSTOMER,
                    id: customerId,
                    columns: ['stage','custentityr7leadsourceprim', 'custentityr7activestatus']
                });
                let primaryLeadSrc = Array.isArray(fieldLookUpCustomer['custentityr7leadsourceprim'])? fieldLookUpCustomer['custentityr7leadsourceprim'][0]['value'] : fieldLookUpCustomer['custentityr7leadsourceprim'];
                let stage = Array.isArray(fieldLookUpCustomer['stage'])? fieldLookUpCustomer['stage'][0]['value'] : fieldLookUpCustomer['stage'];
                let activeStatus = Array.isArray(fieldLookUpCustomer['custentityr7activestatus'])? fieldLookUpCustomer['custentityr7activestatus'][0]['value'] : fieldLookUpCustomer['custentityr7activestatus'];

                log.debug('Primary Lead Src obtained from customer record', primaryLeadSrc);

                let oppLeadSrc = newRecord.getValue({fieldId: 'leadsource'});

                if (oppLeadSrc != null && oppLeadSrc !== '') {
                    let fieldLookUp = search.lookupFields({
                        type: record.Type.CAMPAIGN,
                        id: oppLeadSrc,
                        columns: ['category']
                    });
                    campaignCategory = Array.isArray(fieldLookUp['category'])? fieldLookUp['category'][0]['value'] : fieldLookUp['category'];
                    if (campaignCategory != null) {
                        campaignCategory = parseInt(campaignCategory);
                    }
                }
                log.debug('CampaignCategory', campaignCategory);

                if (stage === 'CUSTOMER' && campaignCategory === 11) {

                }
                else {
                    //Commented this section to make leadsource field editable (check change #1483)
                    /*if (primaryLeadSrc != null && primaryLeadSrc !== '' && activeStatus === true) { //If the primaryLeadSrc is not of type renewal overwrite it
                        record.submitFields({
                            type: newRecord.type,
                            id: newRecord.id,
                            values: {
                                'leadsource': primaryLeadSrc
                            }
                        });
                        log.debug( newRecord.type + " " + newRecord.id + ' Setting the PLS BABOOM', 'Successfully');
                    }
                    else*/
                    if (activeStatus === false) {
                        record.submitFields({
                            type: newRecord.type,
                            id: newRecord.id,
                            values: {
                                'leadsource': 16854
                            }
                        });
                        record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: customerId,
                            values: {
                                'custentityr7activestatus': true
                            }
                        });

                    }
                }
            }
        }

        const hasAnyContracts = (newRecord) => {
            try {
                if (newRecord.id == null) {
                    return false;
                }

                let arrSearchResults = search.create({
                    type: "estimate",
                    filters:
                        [
                            ["internalid", "is", newRecord.id],
                            "AND",
                            ["mainline", "anyof", "T"],
                            "AND",
                            ["custbodyr7contractautomationrecs", "noneof", "@NONE@"],
                            "AND",
                            ["custbodyr7contractautomationrecs.isinactive", "is", "F"],
                            "AND",
                            ["custbodyr7contractautomationrecs.custrecordr7contractautostatus", "noneof", 3]
                        ],
                    columns: []
                });
                // noinspection JSCheckFunctionSignatures
                let searchResultCount = arrSearchResults.runPaged().count;
                log.debug("hasAnyContracts arrSearchResults count",searchResultCount);

                if (searchResultCount > 0) {
                    return true;
                }
            }
            catch (e) {

            }
            return false;
        }

        // *******************************************BEGIN ACV OPP STUFF  TEMP***************************************
        const pullACV_CreatedFromRA = (newRecord) => {
            try {
                /*********************************
                 *  ADDED BY BSD  - REFER TO AHA TICKET APTCM-307
                 *  Alexandr Kuznetsov
                 *********************************/
                let calculateACV = newRecord.getValue({fieldId: 'custbodyr7_calculate_acv'});
                log.debug('pullACV_CreatedFromRA', calculateACV);
                if (calculateACV !== true) {
                    return;
                }
                /*********************************
                 *  END OF ADDITION
                 *********************************/
                let processbeginTime = new Date();

                // first just get list of all items so i can search their details
                // also get list of orders needed to be looked up
                let arrItemIds = [];
                let arrCreatedFromIds = [];

                let lineCount = newRecord.getLineCount({sublistId: 'item'});
                for (let i = 0; i < lineCount; i++) {

                    let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                    let itemType =newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});
                    let createdFromLineId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra_lineid', line: i});

                    if (itemId != null && itemId !== '') {
                        if (itemType !== 'Subtotal' && itemType !== 'Discount' && itemType !== 'Description' && itemType !== 'Group' && itemType !== 'group' && itemType !== 'EndGroup') {
                            arrItemIds[arrItemIds.length] = itemId;
                        }
                    }
                    if (createdFromLineId != null && createdFromLineId !== '' && createdFromLineId.indexOf('_') > 0) {
                        let so_id;
                        so_id = createdFromLineId.substr(0, createdFromLineId.indexOf('_'));
                        //let so_line = createdFromLineId.substr(createdFromLineId.indexOf('_') + 1);
                        arrCreatedFromIds[arrCreatedFromIds.length] = so_id;
                    }
                }
                arrItemIds = unique(arrItemIds);
                arrCreatedFromIds = unique(arrCreatedFromIds);

                let objItemDetails = grabItemDetailMap(arrItemIds);
                let objOrderDetails = grabCreatedFromMap(arrCreatedFromIds);

                log.debug('running acv', 'starting process');

                let objOppACVGroups = {};
                lineCount = newRecord.getLineCount({sublistId: 'item'});
                for (let i = 0; i < lineCount; i++) {

                    let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                    let itemType =newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});

                    if (itemId != null && itemId !== '') {
                        if (itemType !== 'Subtotal' && itemType !== 'Discount' && itemType !== 'Description' && itemType !== 'Group' && itemType !== 'group' && itemType !== 'EndGroup') {

                            if (objItemDetails[itemId].allocate_acv !== true) {
                                //item shouldnt have acv
                                continue;
                            }
                            let createdFromLineId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra_lineid', line: i});
                            if (createdFromLineId == null || createdFromLineId === '' || createdFromLineId.indexOf('_') <= 0) {
                                //exclude from total calc
                                continue;
                            }

                            let so_id = createdFromLineId.substr(0, createdFromLineId.indexOf('_'));

                            let productKey = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7itemmsproductkey', line: i});
                            let managedServiceId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7managedserviceid', line: i});
                            let registrationId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7registrationid', line: i});
                            let psoEngId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7psoengagement', line: i});
                            let bookingCategory = objItemDetails[itemId].bookingcategory;
                            let categoryPurchased = objItemDetails[itemId].categorypurchased;

                            let groupText = productKey || managedServiceId || registrationId || psoEngId || bookingCategory;
                            groupText += ':' + so_id + ':' + categoryPurchased;
                            let objGroup = new ACVGroup();
                            if (objOppACVGroups.hasOwnProperty(groupText)) {
                                objGroup = objOppACVGroups[groupText];
                            }

                            let startDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7startdate', line: i});
                            let endDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7enddate', line: i});
                            let amount = newRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i});

                            let formattedStartDate;
                            if(startDate){
                                // noinspection JSCheckFunctionSignatures
                                formattedStartDate = format.parse({
                                    value: startDate,
                                    type: format.Type.DATE
                                });
                            }
                            let formattedEndDate;
                            if(endDate){
                                // noinspection JSCheckFunctionSignatures
                                formattedEndDate = format.parse({
                                    value: endDate,
                                    type: format.Type.DATE
                                });
                            }
                            let formattedMinStartDate;
                            if(objGroup.minstart){
                                // noinspection JSCheckFunctionSignatures
                                formattedMinStartDate = format.parse({
                                    value: objGroup.minstart,
                                    type: format.Type.DATE
                                });
                            }
                            let formattedMaxEndDate;
                            if(objGroup.maxend){
                                // noinspection JSCheckFunctionSignatures
                                formattedMaxEndDate = format.parse({
                                    value: objGroup.maxend,
                                    type: format.Type.DATE
                                });
                            }

                            if (objGroup.minstart == null || (startDate != null && startDate !== '' && formattedStartDate < formattedMinStartDate)) {
                                objGroup.minstart = startDate;
                            }
                            if (objGroup.maxend == null || (endDate != null && endDate !== '' && formattedEndDate > formattedMaxEndDate)) {
                                objGroup.maxend = endDate;
                            }

                            if (amount != null && amount !== '') {
                                objGroup.totalamount += parseFloat(amount);
                            }
                            objGroup.linecount++;

                            objOppACVGroups[groupText] = objGroup;
                        }
                    }
                }

                //let exchangeRate = parseFloat(newRecord.getValue({fieldId: 'exchangerate'}));

                //due to using Group Skus we need to track the line ID at the parent SKU
                let createdFromLineIdGroup = null;
                //now actually run calculations
                lineCount = newRecord.getLineCount({sublistId: 'item'});
                for (let i = 0; i < lineCount; i++) {

                    let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                    let itemType =newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});
                    if (itemId != null && itemId !== '') {

                        if (itemType === 'Group') {
                            createdFromLineIdGroup = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra_lineid', line: i});
                        }
                        else if (itemType === 'EndGroup') {

                            createdFromLineIdGroup = null;
                        }

                        if (itemType !== 'Subtotal' && itemType !== 'Discount' && itemType !== 'Description' && itemType !== 'group' && itemType !== 'Group' && itemType !== 'EndGroup') {

                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvstartdate', line: i, value: ''});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvenddate', line: i, value: ''});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvamount', line: i, value: 0});

                            if (objItemDetails[itemId].allocate_acv !== true) {
                                //item shouldnt have acv
                                continue;
                            }

                            let createdFromLineId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra_lineid', line: i});

                            if (createdFromLineId == null || createdFromLineId === '' || createdFromLineId.indexOf('_') <= 0) {
                                // noinspection JSIncompatibleTypesComparison
                                if (createdFromLineIdGroup == null || createdFromLineIdGroup === '' || createdFromLineIdGroup.indexOf('_') <= 0) {
                                    //missing a link
                                    continue;
                                }
                                else
                                    createdFromLineId = createdFromLineIdGroup
                            }

                            let so_id = createdFromLineId.substr(0, createdFromLineId.indexOf('_'));

                            if (!objOrderDetails.hasOwnProperty(so_id)) {
                                // not found in map
                                continue;
                            }
                            let arrOrderLines = objOrderDetails[so_id];

                            let objSOGroup = null;

                            for (let j = 0; arrOrderLines != null && j < arrOrderLines.length; j++) {

                                let objCurrentGroup = arrOrderLines[j];
                                let arrIncludedLineIds = objCurrentGroup.so_lineids;

                                if (arrIncludedLineIds != null && arrIncludedLineIds.indexOf(createdFromLineId) >= 0) {
                                    objSOGroup = objCurrentGroup;
                                    break;
                                }
                            }

                            if (objSOGroup == null) {
                                // group not found on sales order
                                newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvstartdate', line: i, value: ''});
                                newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvenddate', line: i, value: ''});
                                newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvamount', line: i, value: 0});
                                continue;
                            }

                            let productKey = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7itemmsproductkey', line: i});
                            let managedServiceId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7managedserviceid', line: i});
                            let registrationId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7registrationid', line: i});
                            let psoEngId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7psoengagement', line: i});
                            let bookingCategory = objItemDetails[itemId].bookingcategory;
                            let categoryPurchased = objItemDetails[itemId].categorypurchased;

                            let groupText = productKey || managedServiceId || registrationId || psoEngId || bookingCategory;
                            groupText += ':' + so_id + ':' + categoryPurchased;

                            let objOppGroup = new ACVGroup();
                            if (objOppACVGroups.hasOwnProperty(groupText)) {
                                objOppGroup = objOppACVGroups[groupText];
                            }

                            let amount = newRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i}) || 0;
                            if(objOppGroup.linecount === 0 && objOppGroup.totalamount === 0){
                                continue;
                            }
                            let percentOfTotal;
                            if (objOppGroup.totalamount != null && objOppGroup.totalamount !== '' || objOppGroup.totalamount !== 0) {
                                percentOfTotal = parseFloat(amount) / objOppGroup.totalamount;
                            }else{
                                percentOfTotal = 1 / objOppGroup.linecount;
                            }

                            let formattedSOACVStartDate;
                            if(objSOGroup.so_acvstart){
                                // noinspection JSCheckFunctionSignatures
                                formattedSOACVStartDate = format.parse({
                                    value: objSOGroup.so_acvstart,
                                    type: format.Type.DATE
                                });
                            }

                            let formattedSOACVEndDate;
                            if(objSOGroup.so_acvend){
                                // noinspection JSCheckFunctionSignatures
                                formattedSOACVEndDate = format.parse({
                                    value: objSOGroup.so_acvend,
                                    type: format.Type.DATE
                                });
                            }
                            let acvAmount = (Math.round((objSOGroup.so_acv * percentOfTotal) * 100) / 100) || 0;
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvstartdate', line: i, value: formattedSOACVStartDate});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvenddate', line: i, value: formattedSOACVEndDate});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvamount', line: i, value: acvAmount});

                            newRecord.setValue({fieldId: 'custbodyr7oppacvprocessed_temp', value: true});
                        }
                    }
                }

                log.debug('Time (in seconds) To Process ACV Lines', (new Date().getTime() - processbeginTime.getTime()) / 1000);
            }
            catch (err) {
                log.error('Error calculating ACV Lines', err);
            }

        }

        function ACVGroup() {
            this.linecount = 0;
            this.minstart = null;
            this.maxend = null;
            this.totalamount = 0;
            this.acv = 0;
        }

        const grabCreatedFromMap = (arrOrderIds) => {
            let objOrderDetailMap = {};

            // noinspection JSCheckFunctionSignatures
            if (arrOrderIds != null && arrOrderIds !== '' && arrOrderIds.length > 0) {
                let arrResults = search.load({id: '17788'});
                arrResults.filters.push(
                    search.createFilter({
                        name: 'internalid',
                        operator: search.Operator.ANYOF,
                        values: arrOrderIds
                    })
                );
                // noinspection JSCheckFunctionSignatures
                let searchResultCount = arrResults.runPaged().count;
                log.debug("grabCreatedFromMap arrResults count",searchResultCount);

                let arrColumns = arrResults.columns;
                arrResults.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    let objGroup = {};

                    objGroup.so_id = result.getValue(arrColumns[0]);
                    objGroup.so_lineids = result.getValue(arrColumns[2]).split(',');
                    objGroup.so_group = result.getValue(arrColumns[3]);
                    let amountSOE = result.getValue(arrColumns[4]);
                    objGroup.so_acvstart = result.getValue(arrColumns[5]);
                    objGroup.so_acvend = result.getValue(arrColumns[6]);
                    let amount605 = result.getValue(arrColumns[8]);

                    objGroup.so_acv = 0;
                    if (amount605 != null && amount605 !== '' && amount605 !== 0) {
                        objGroup.so_acv = parseFloat(amount605);
                    }
                    else if (amountSOE != null && amountSOE !== '') {
                        objGroup.so_acv = parseFloat(amountSOE);
                    }
                    log.debug('objGroup.so_acv ', objGroup.so_acv);

                    let arrOrderLines = [];
                    if (objOrderDetailMap.hasOwnProperty(objGroup.so_id)) {
                        arrOrderLines = objOrderDetailMap[objGroup.so_id];
                    }
                    arrOrderLines.push(objGroup);
                    objOrderDetailMap[objGroup.so_id] = arrOrderLines;

                    return true;
                });
            }

            return objOrderDetailMap;
        }

        const grabItemDetailMap = (arrItems) => {
            let objItemDetailMap = {};
            if (arrItems != null && arrItems !== '' && arrItems.length > 0) {
                let arrResults = search.create({
                    type: "item",
                    filters:
                        [
                            ["internalid","anyof",arrItems],
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid"}),
                            search.createColumn({name: "custitemr7acvallocation"}),
                            search.createColumn({name: "custitemr7categorybookingssalesdept"}),
                            search.createColumn({name: "custitemr7categorypurchaseditem"})
                        ]
                });
                // noinspection JSCheckFunctionSignatures
                let searchResultCount = arrResults.runPaged().count;
                log.debug("grabItemDetailMap arrResults count",searchResultCount);
                arrResults.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    let objItem = {};
                    objItem.id = result.getValue({name: "internalid"});
                    objItem.allocate_acv = result.getValue({name: "custitemr7acvallocation"});
                    objItem.bookingcategory = result.getText({name: "custitemr7categorybookingssalesdept"});
                    objItem.categorypurchased = result.getValue({name: "custitemr7categorypurchaseditem"});

                    objItemDetailMap[objItem.id] = objItem;
                    return true;
                });
            }

            return objItemDetailMap;
        }

        const unique = (a) => {
            a.sort();
            for (let i = 1; i < a.length;) {
                if (a[i - 1] === a[i]) {
                    a.splice(i, 1);
                }
                else {
                    i++;
                }
            }
            return a;
        }

        // ***************************************************END ACV OPP STUFF***********************************************************
        /*
         * @author Sa Ho (RSM)
         * @param oppId (Opportunity ID) int
         * @return null
         * @description For each Opportunity record created, get column data from the originating Sales Order record.
         * @since 8/23/2017
         * Usage:
         */
        const preRunDataCheck = (newRecord) => {
            // noinspection JSUnresolvedFunction
            try {
                log.debug('preRunDataCheck function, Opportunity ID: ' + newRecord.id);
                let oppRec = record.load({type: newRecord.type, id: newRecord.id, isDynamic: true});
                let oppItemsCount = oppRec.getLineCount({sublistId: 'item'});
                let hasUpdate = false;

                //Get Originating Sales Order info to copy over the rest of the columns
                let itemGroupList = [];
                let itemGroupCount = 0;

                if (oppItemsCount > 0) {
                    for (let i = 0; i < oppItemsCount; i++) {
                        log.debug('Item Line #: ' + i + ', ItemId ' + oppRec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}) + ' itemType ' + oppRec.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i}));

                        //Item Group Header
                        if (oppRec.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i}) === 'Group') {
                            let createdFromRALineId = oppRec.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra_lineid', line:i});

                            if (createdFromRALineId != null && createdFromRALineId !== '') {
                                itemGroupList.push({
                                    'HeaderLine': i,
                                    'FooterLine': null,
                                    'CreatedFromRA': oppRec.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', line: i}),
                                    'CreatedFromRALineId': oppRec.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra_lineid', line: i})
                                });
                            }

                            else {
                                itemGroupList.push({
                                    'HeaderLine': i,
                                    'FooterLine': null,
                                    'CreatedFromRA': oppRec.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', line: (i + 1)}),
                                    'CreatedFromRALineId': oppRec.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra_lineid', line: (i + 1)}),
                                });
                            }
                        }

                        //Item Group Footer
                        else if (oppRec.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i}) === 'EndGroup') {
                            itemGroupList[itemGroupCount].FooterLine = i;
                            itemGroupCount++;
                        }
                    }
                }

                //init sales order collection
                let soCollection = [];
                soCollection.getById = function (soId) {
                    for (let i = 0; i < this.length; i++) {
                        if (this[i].id === soId) {
                            return this[i].soRec;
                        }
                    }
                }

                //If there are item groups...
                if (itemGroupCount > 0) {
                    log.debug('itemGroupCount (total) ' + itemGroupCount);
                    for (let j = 0; j < itemGroupCount; j++) {
                        log.debug('itemGroupCount loop is at ' + j);
                        let currGroupHdr = itemGroupList[j].HeaderLine;
                        let currGroupFtr = itemGroupList[j].FooterLine;
                        let origSoId = itemGroupList[j].CreatedFromRA;
                        let origSoLine = itemGroupList[j].CreatedFromRALineId;

                        if (origSoLine != null && origSoLine !== '') {
                            origSoLine = parseInt(origSoLine.substring(origSoLine.indexOf('_') + 1));

                            if (origSoLine !== 'NaN') {
                                //Find original Sales Order Item Group
                                log.debug('getting original Sales Order details, Sales Order ID: ' + origSoId + ' Line ' + origSoLine);

                                let soRec = soCollection.getById(origSoId);
                                if (soRec === undefined) {
                                    soRec = record.load({type: record.Type.SALES_ORDER, id: origSoId, isDynamic: true});
                                    soCollection.push({
                                        id: origSoId,
                                        soRec: soRec
                                    });
                                    log.debug('Sales Order ID added to collection: ' + origSoId);
                                }

                                log.debug('Remaining Usage: ' + runtime.getCurrentScript().getRemainingUsage());

                                let soItemsCount = soRec.getLineCount({sublistId: 'item'});

                                let soGroupHdrLine = null;
                                let soGroupFtrLine = null;
                                let soItemGroupData = null;

                                if (soItemsCount > 0) {
                                    // Scenario: a group item on SO becomes a group item on Opportunity
                                    if (soRec.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: origSoLine}) === 'Group') {
                                        soGroupHdrLine = origSoLine;

                                        for (let k = origSoLine; k <= soItemsCount; k++) {
                                            log.debug('Item Line #: ' + k + ', ItemId ' + soRec.getSublistValue({sublistId: 'item', fieldId: 'item', line: k}) + ' itemType ' + soRec.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: k}));

                                            if (soRec.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: k}) === 'EndGroup') {
                                                soGroupFtrLine = k;
                                                break;
                                            }
                                        }

                                        //Get information from original SO's Item Group pricing line
                                        // noinspection JSIncompatibleTypesComparison
                                        if (soGroupHdrLine != null && soGroupHdrLine !== '' && soGroupFtrLine != null && soGroupFtrLine !== '') {
                                            for (let m = soGroupHdrLine + 1; m < soGroupFtrLine; m++) {
                                                let itemId = soRec.getSublistValue({sublistId: 'item', fieldId: 'item', line: m});
                                                let fieldLookUp = search.lookupFields({
                                                    type: search.Type.ITEM,
                                                    id: itemId,
                                                    columns: ['custitem_arm_upgrade_pricing_line']
                                                });
                                                let armPricingLine = Array.isArray(fieldLookUp['custitem_arm_upgrade_pricing_line'])? fieldLookUp['custitem_arm_upgrade_pricing_line'][0]['value'] : fieldLookUp['custitem_arm_upgrade_pricing_line'];
                                                if (armPricingLine === true) {
                                                    soItemGroupData = {
                                                        'LicenseIdText': soRec.getSublistValue({sublistId: 'item', fieldId: 'custcolr7translicenseid', line: m})
                                                    };

                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    //Scenario: a single item on SO becomes an expanded group on Opportunity
                                    else {
                                        soItemGroupData = {
                                            'LicenseIdText': soRec.getSublistValue({sublistId: 'item', fieldId: 'custcolr7translicenseid', line: origSoLine})
                                        };
                                    }
                                }

                                //Update Opportunity's Item Group
                                for (let n = currGroupHdr; n < currGroupFtr; n++) {
                                    //Update Item Group Header and Lines with originating Sales Order Data
                                    // noinspection JSIncompatibleTypesComparison
                                    if (soItemGroupData != null && soItemGroupData !== '') {
                                        log.debug('item ' + oppRec.getSublistValue({sublistId: 'item', fieldId: 'item', line:n}));

                                        /*let itemId = soRec.getSublistValue({sublistId: 'item', fieldId: 'item', line: n});
                                        let fieldLookUp = search.lookupFields({
                                            type: search.Type.ITEM,
                                            id: itemId,
                                            columns: ['custitem_arm_upgrade_pricing_line']
                                        });
                                        let isPricingLine = Array.isArray(fieldLookUp['custitem_arm_upgrade_pricing_line'])? fieldLookUp['custitem_arm_upgrade_pricing_line'][0]['value'] : fieldLookUp['custitem_arm_upgrade_pricing_line'];*/

                                        // noinspection JSUnresolvedFunction
                                        oppRec.selectLine({sublistId: 'item', line: n});
                                        oppRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7translicenseid', value: soItemGroupData.LicenseIdText})

                                        hasUpdate = true;
                                    }

                                    if (hasUpdate)
                                        oppRec.commitLine({sublistId: 'item'});
                                }
                            }
                        }
                    }
                }

                if (hasUpdate) {
                    oppRec.save({enableSourcing: false, ignoreMandatoryFields: true});
                    //location.reload();
                }
            }

            catch (e) {
                log.error(e);
            }
        }

        const setLocations = (newRecord) => {

            let curSubsidiary = parseInt(newRecord.getValue({fieldId: 'subsidiary'}));
            let headerLocation = newRecord.getValue({fieldId: 'location'});
            if(!headerLocation){
                switch (curSubsidiary) {
                    case 10://Rapid7 International
                        newRecord.setValue({fieldId: 'location', value: 29}); //UKS London
                        break;
                    case 13://Rapid7 Ireland Limited
                        newRecord.setValue({fieldId: 'location', value: 66}); //GLS - Galway IRE
                        break;
                    case 22: //Rapid7 DivvyCloud
                        newRecord.setValue({fieldId: 'location', value: 73}); //VA - Arlington (Divvy)
                        break;
                    case 24: //IntSights Cyber Intelligence Ltd (Israel)
                        newRecord.setValue({fieldId: 'location', value: 81}); //IL-Tel Aviv (IntSights)
                        break;
                    default:
                        newRecord.setValue({fieldId: 'location', value: 1}); //MA Boston
                }
            }

            headerLocation = newRecord.getValue({fieldId: 'location'});
            for (let i = 0; i < newRecord.getLineCount({sublistId: 'item'}); i++) {

                let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});

                if (itemType === 'Group' || itemType === 'group' || itemType === 'EndGroup'){
                    continue;
                }
                newRecord.setSublistValue({sublistId: 'item', fieldId: 'location', line: i, value: headerLocation});
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });