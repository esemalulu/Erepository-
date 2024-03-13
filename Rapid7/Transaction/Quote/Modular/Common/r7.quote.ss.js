// noinspection DuplicatedCode

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/config',
    'N/email',
    'N/error',
    'N/log',
    'N/record',
    'N/runtime',
    'N/search',
    'N/url',
    'N/render',
    '../../../../CRM/Product Data/r7.product.data.library',
    '../../../Common/r7.check.custom.permissions',
    '../../../Common/r7.transaction.library.functions',
    '../../../../Toolbox/Grab_ACR_ProductTypes_library_2_0',
    '/SuiteScripts/Transaction/Package Transaction/Package_Transaction_Library.js'
], function (config, email, error, log, record, runtime, search, url, render, product, permissions, library, acr, packageLib) {
    function beforeLoad(context){
        const { type, form } = context;
        const { VIEW, CREATE, COPY } = context.UserEventType;
        const APPROVED = 3;

        const recQuote = context.newRecord;

        if (type === VIEW) {
            const userId = runtime.getCurrentUser().id;
            const roleId = runtime.getCurrentUser().role;

            const quoteId = recQuote.id;
            const orderValidated = recQuote.getValue({ fieldId: 'custbodyr7ordervalidated' });

            const sId = recQuote.getValue({ fieldId: 'custbodyr7sid' });
            const currentQuoteStatusId = recQuote.getValue({ fieldId: 'custbodyr7quoteorderapprovalstatus' });

            if (sId !== '' && sId != null && currentQuoteStatusId !== APPROVED) {
                const showApproveRejectButton = approvalLookupForButton(quoteId, userId);

                if (showApproveRejectButton || roleId === 3) {
                    const approvalSuiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7approvalssuitelet',
                        deploymentId: 'customdeployr7_approvalssuitelet_quote',
                        params: {
                            'custparamsid': sId,
                            'custparamuser': userId
                        }
                    });

                    form.addButton({
                        id: 'custpage_my_approvereject_button',
                        label: 'Approve/Reject',
                        functionName: 'popUpWindow(\'' +approvalSuiteletURL + '\');'
                    });
                }
            }

            if (!orderValidated) {
                // Quotes don't need to be validated.  We may not need to add this button.
                // If the quote is not validated then add the Validate Order button
                if (permissions.userHasPermission('order_validation_button_quote')) {
                    form.addButton({
                        id: 'custpage_validateorder',
                        label: 'Validate Order',
                        functionName: 'validateOrder'
                    });
                }
            }

            // If the quote is validated then add the unValidate Order button
            // MB: 5/12/15 - If quote is status = open only
            if (orderValidated) {
                if (permissions.userHasPermission('order_unvalidation_button_quote')) {
                    form.addButton({
                        id: 'custpage_unvalidateorder',
                        label: 'unValidate Order',
                        functionName: 'unValidateOrder()'
                    });
                }
            }

            // Recalculate Tax button
            const { EDIT, FULL } = runtime.Permission;
            const quotePermission = runtime.getCurrentUser().getPermission({ name: 'TRAN_ESTIMATE' })
            const canEditQuote = [ EDIT, FULL ].includes(quotePermission);
            const canRecalculateTax = permissions.userHasPermission('can_recalculate_tax');

            if (canEditQuote && canRecalculateTax) {
                form.addButton({
                    id: 'custpage_recalculate_tax',
                    label: 'Recalculate Tax',
                    functionName: 'recalculateTax'
                });
            }

            if (permissions.userHasPermission('item_association_button_quote')) {
                const suiteletURL = url.resolveScript({
                    scriptId: 'customscriptr7itemassociation_acr',
                    deploymentId: 'customdeployr7itemassociation_acr',
                    params: {
                        'custparam_ordertype': recQuote.type,
                        'custparam_orderid': recQuote.id
                    }
                })
                form.addButton({
                    id: 'custpage_associateitems_acr',
                    label: 'Associate Items',
                    functionName: 'replaceWindow(\'' +suiteletURL + '\');'
                });
            }

        const internalId = recQuote.id;
        if (internalId != null) {
            const createPdfUrl = url.resolveScript({
                scriptId: 'customscript_r7_pck_transaction_suitelet',
                deploymentId: 'customdeploy_r7_pck_transaction_suitelet',
                params: {
                    'id': internalId
                }
            });

            if (!permissions.userHasPermission('hide_print_package_quote_button')) {
                form.addButton({
                    id: 'custpage_r7_pck_transaction_suitelet',
                    label: 'Print Package Quote',
                    functionName: "popUpWindow('" + createPdfUrl + "');"
                });
            }
        }

            // const opportunityId = recQuote.getValue({ fieldId: 'opportunity' });
            // const customerId = recQuote.getValue({ fieldId: 'entity' });
            // if (opportunityId !== null && customerId !== null) {
            //     const recOpportunity = record.load({
            //         type: record.Type.OPPORTUNITY,
            //         id: opportunityId
            //     });
            //
            //     const recCustomer = record.load({
            //         type: record.Type.CUSTOMER,
            //         id: customerId
            //     });
            //
            //     const autoRenewal = recOpportunity.getValue({ fieldId: 'custbodyr7auto_renewal_opp' });
            //     const autoRenewing = recCustomer.getValue({ fieldId: 'custentityr7currentlyautorenewing' });
            //     const autoRenewalEligibility = recCustomer.getValue({ fieldId: 'custentityr7autorenewaleligibility' });
            // }
        }

        if (type === CREATE) {
            addUpliftToLines(recQuote);
            //default billing schedule upon quote creation
            if (recQuote.getValue({ fieldId: 'custbodysfbillingschedule' }) === '' || recQuote.getValue({ fieldId: 'custbodysfbillingschedule' }) === null) {
                recQuote.setValue({ fieldId: 'custbodysfbillingschedule', value: 1 });
            }
        }

        if (type === COPY) {
            recQuote.setValue({
                fieldId: 'custbodyr7quoteorderapprovalstatus',
                value: 1
            });
            recQuote.setValue({ 
                fieldId: 'custbodyr7_approved_quote_pdf', 
                value: null
             });
        }
    }

    function beforeSubmit(context){
        log.debug({ title: 'here', details: 'here' });
        const { type, newRecord: recQuote } = context;
        const { CREATE, COPY, EDIT } = context.UserEventType;
        log.debug({ title: 'recQuote', details: recQuote });

        const executionContext = runtime.executionContext;
        const userId = runtime.getCurrentUser().id;

        //clear 'custcolr7translicenseid' for all the lines in all the case
    if (type === CREATE || type === COPY || type === EDIT) {
            try {
                var lineItemCount = recQuote.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < lineItemCount; i++) {
                    var ItemName = recQuote.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    if (ItemName != 0) {
                        recQuote.setSublistValue({ sublistId: 'item', fieldId: 'custcolr7translicenseid', line: i, value: '' });
                    }
                }
            } catch (e) {
                sendAdminEmail({
                    subject: 'PROD DATA QUOTE',
                    body: recQuote.id + ' for user ' + userId + ' \n' + JSON.stringify(e, null, 2)
                });
            }

            //validate billing schedule values
            const billingScheduleId = recQuote.getValue({ fieldId: 'custbodysfbillingschedule' });
            log.debug({ title: 'billingScheduleId', details: billingScheduleId });
            log.debug({ title: 'typeof billingScheduleId', details: typeof billingScheduleId });
            if (recQuote.getValue({ fieldId: 'custbodysfbillingschedule' }) === '3' || recQuote.getValue({ fieldId: 'custbodysfbillingschedule' }) === '8') {
                throw error.create({
                    name: 'R7_VALIDATION_ERROR',
                    message: 'You have selected an invalid billing schedule for quotes. Please correct the issue before submitting the quote.',
                    notifyOff: true
                });
            }
        }

        //check for R7 Appliance Products years
        if (type === CREATE || type === COPY || type === EDIT) {
            library.checkApplianceYears(recQuote);
        }

        if (executionContext === runtime.ContextType.USER_INTERFACE) {

            if (type === CREATE || type === COPY || type === EDIT) {
                library.setLocations(recQuote);
            }

            if (type === CREATE) {
                const sId = library.getRandomString(15); //library function
                recQuote.setValue({ fieldId: 'custbodyr7sid', value: sId });
                library.setTotalDiscount(recQuote);
                setNumberOfMonths(recQuote);
            }

            if (type === CREATE || type === COPY) {
                recQuote.setValue({ fieldId: 'custbodyr7quoteorderapprovalstatus', value: 1 });
                recQuote.setValue({ fieldId: 'custbodyr7_approved_quote_pdf', value: null });
            }

            if (type === EDIT) {
                const oldRecord = context.oldRecord;

                var sId = recQuote.getValue({ fieldId: 'custbodyr7sid' });
                if (sId == null || sId === '') {
                    sId = library.getRandomString(15);
                    recQuote.setValue({ fieldId: 'custbodyr7sid', value: sId });
                }

                library.setTotalDiscount(recQuote);

                var prevNumberOfMonths = parseInt(oldRecord.getValue({ fieldId: 'custbodyr7lengthofdealmaxmonths' }));
                setNumberOfMonths(recQuote);
                var numberOfMonths = parseInt(recQuote.getValue({ fieldId: 'custbodyr7lengthofdealmaxmonths' }));

                if (!isNaN(prevNumberOfMonths) && !isNaN(numberOfMonths)) {
                    if (numberOfMonths > prevNumberOfMonths) {
                        recQuote.setValue({ fieldId: 'custbodyr7transactionmaterialchange', value: true });
                    }
                }

                if (isMaterialChange(recQuote, oldRecord)) {
                    recQuote.setValue({ fieldId: 'custbodyr7transactionmaterialchange', value: true });
                }
            }
        }

        if (type === CREATE || type === COPY) {
            //Default 'Calculate ACV' to be checked on all Quotes
            recQuote.setValue({ fieldId: 'custbodyr7_calculate_acv', value: true });
        }

        if (type === CREATE) {
            updateMdrpLineDescription(recQuote);
        }
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

    function afterSubmit(context) {
        const { COPY, CREATE, EDIT, XEDIT } = context.UserEventType;
        const { type, newRecord: recQuote, oldRecord } = context;

        const userId = runtime.getCurrentUser().id;
        const executionContext = runtime.executionContext;


        log.audit({ title: userId, details: executionContext + '/' + type });

        // If copy, update associated lineIds to new orderId_
        if (type !== COPY && type !== CREATE && type !== EDIT && type !== XEDIT) {
            return;
        }

        if (type === CREATE || type === EDIT) {
            try {
                // noinspection JSCheckFunctionSignatures
                const includeInSalesForecast = recQuote.getValue({ fieldId: 'custbodyr7includeinsalesforecast' });
                const oppId = recQuote.getValue({ fieldId: 'opportunity' });
                const sfOppNumber = recQuote.getValue({ fieldId: 'custbodyr7_sf_oppnumber' });
                

                if (oppId && includeInSalesForecast) {
                    toggleIncludeInSalesForecast(recQuote.id, oppId, null);
                }
                if(!oppId && sfOppNumber && includeInSalesForecast){
                    toggleIncludeInSalesForecast(recQuote.id, null, sfOppNumber)
                }

                product.updateOppTotal(oppId);

            }
            catch (e) {
                sendAdminEmail({
                    subject: 'PROD DATA QUOTE',
                    body: recQuote.id + ' for user ' + userId + ' \n' + JSON.stringify(e, null, 2)
                });
            }
        }


        if(type === EDIT || type === XEDIT) {
            try {
                // noinspection JSCheckFunctionSignatures
                log.audit({ title: userId, details: executionContext });
                const currentApprovalStatus = recQuote.getValue({ fieldId: 'custbodyr7quoteorderapprovalstatus' });
                const prevApprovalStatus = oldRecord.getValue({ fieldId: 'custbodyr7quoteorderapprovalstatus' });

                //3 = approved, 2 == pending approval
                if((currentApprovalStatus == 3 && prevApprovalStatus != 3) || currentApprovalStatus == 2 ) {
                    storeApprovedQuotePDF(recQuote);
                } else if(currentApprovalStatus == 4 && prevApprovalStatus != 4) { //if rejected then clear out pdf
                    record.submitFields({
                        type: recQuote.type,
                        id: recQuote.id,
                        values: {
                            'custbodyr7_approved_quote_pdf': null
                        }
                    });
                }
            }
            catch (e) {
                sendAdminEmail({
                    subject: 'PROD DATA QUOTE',
                    body: recQuote.id + ' for user ' + userId + ' \n' + JSON.stringify(e, null, 2)
                });
            }
        }

        if (type === COPY || type === CREATE) {
            try {
                const quote = record.load({
                    type: record.Type.ESTIMATE,
                    id: recQuote.id
                });

                var updatedRecord = updateItemAssociations(quote);
                if (updatedRecord) {
                    // something changed so we should submit
                    quote.save();
                }
            }
            catch (e) {
                sendAdminEmail({
                    subject: 'ERROR ON COPY QUOTE',
                    body: 'Could not update Item Associations on quoteID ' + recQuote.id + ' for user ' + userId + ' \n' + JSON.stringify(e, null, 2)
                });
            }
        }
    }

    /////////////////////////////////////////

    function storeApprovedQuotePDF(recQuote) {
        var documentId = recQuote.getText({ fieldId: 'tranid' })+'';
        var packageQuoteRec = packageLib.getPackagedRecord(recQuote.id);
        packageQuoteRec.setValue('custbodyr7quoteorderapprovalstatus', 3);
        var renderer = packageLib.renderQuote(packageQuoteRec);
        var approvedPDF = renderer.renderAsPdf();
        approvedPDF.folder = 18612; //attachements sent system folder
        approvedPDF.name = 'Quote_'+(documentId || recQuote.id)+'.pdf'
        var fileId = approvedPDF.save();

        record.submitFields({
            type: recQuote.type,
            id: recQuote.id,
            values: {
                'custbodyr7_approved_quote_pdf': fileId
            }
        });
    }

    function addUpliftToLines(recQuote) {
        try {
            var oppId = recQuote.getValue({ fieldId: 'opportunity' });
            log.debug({ title: 'oppId', details: oppId });

            if (oppId) {

                // noinspection JSCheckFunctionSignatures
                var upliftPercent = search.lookupFields({
                    type: record.Type.OPPORTUNITY,
                    id: oppId,
                    columns: 'custbodyr7upliftpercentage'
                })['custbodyr7upliftpercentage'];

                if (upliftPercent) {
                    upliftPercent = (parseFloat(upliftPercent) / 100);
                    var lineCount = recQuote.getLineCount({ sublistId: 'item' });
                    log.debug({ title: 'lineCount', details: lineCount });

                    for (var i = 0; i < lineCount; i++) {

                        var quantity = parseFloat(recQuote.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0);
                        var itemType = recQuote.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });

                        if (quantity > 0 && itemType !== 'Subtotal' && itemType !== 'Description' && itemType !== 'Discount') {

                            var packageItem = parseFloat(recQuote.getSublistValue({ sublistId: 'item', fieldId: 'custcol_r7_pck_package_item', line: i }) || 0);

                            if(packageItem != 0){
                                var amount = parseFloat(recQuote.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }) || 0);
                                if(amount > 0){
                                    var newAmount = Math.round(amount * (1 + upliftPercent));
                                    var newRate = newAmount / quantity;
                                
                                    recQuote.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: i, value: newRate });
                                    recQuote.setSublistValue({ sublistId: 'item', fieldId: 'amount', line: i, value: newAmount });
                                }
                            } else {
                                var rate = parseFloat(recQuote.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) || 0);
                                if (rate > 0) {
                                    var newRate = rate * (1 + upliftPercent);
                                    var newAmount = Math.round((quantity * newRate) * 100) / 100;
                                    recQuote.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: i, value: newRate });
                                    recQuote.setSublistValue({ sublistId: 'item', fieldId: 'amount', line: i, value: newAmount });
                                    continue;
                                }

                                var amount = parseFloat(recQuote.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }) || 0);
                                if (amount > 0) {
                                    recQuote.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'amount',
                                        line: i,
                                        value: Math.round((amount * (1 + upliftPercent)) * 100) / 100
                                    });

                                    // noinspection UnnecessaryContinueJS
                                    continue;
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (e) {
            log.debug({ title: 'Error on addUpliftToLines', details: e });

            sendAdminEmail({
                subject: 'Error on addUpliftToLines',
                body: 'Error: ' + JSON.stringify(e)
            });
        }
    }

    function approvalLookupForButton(quoteId, userId) {
        const PENDING_APPROVAL = 2;

        return search.create({
            type: 'customrecordr7approvalrecord',
            filters: [
                ['custrecordr7approvalquote', 'is', quoteId],
                'and', ['custrecordr7approvalstatus', 'is', PENDING_APPROVAL],
                'and', ['custrecordr7approvalapprover', 'is', userId]
            ]
        }).runPaged().count > 0;
    }

    function isMaterialChange(recQuote, recOldTransaction){
        const newTotal = library.formatNumber(recQuote.getValue({  fieldId: 'total' }));
        const newDiscount = library.formatNumber(recQuote.getValue({  fieldId: 'custbodyr7transactiondiscounttotal' }));
        const oldTotal = library.formatNumber(recOldTransaction.getValue({  fieldId: 'total' }));
        const oldDiscount = library.formatNumber(recOldTransaction.getValue({  fieldId: 'custbodyr7transactiondiscounttotal' }));

        if (oldTotal === 0) {
            return oldTotal !== newTotal;
        }
        if (oldDiscount === 0) {
            return oldDiscount !== newDiscount;
        }

        // noinspection JSCheckFunctionSignatures
        const changeTotal = parseFloat(newTotal - oldTotal);
        // noinspection JSCheckFunctionSignatures
        const changeDiscount = parseFloat(newDiscount - oldDiscount);

        let percentChangeTotal = (changeTotal / oldTotal) * 100;
        percentChangeTotal = Math.abs(Math.round(percentChangeTotal * 10) / 10);
        let percentChangeDiscount = (changeDiscount / oldDiscount) * 100;
        percentChangeDiscount = Math.abs(Math.round(percentChangeDiscount * 10) / 10);

        log.debug({ title: 'percentChangeTotal', details: percentChangeTotal });
        log.debug({ title: 'percentChangeDiscount', details: percentChangeDiscount });

        return percentChangeDiscount > 5 || percentChangeTotal > 5;
    }

    function toggleIncludeInSalesForecast(quoteId, oppId, sfOppNumber){

        let filterArr;
        if ((oppId == null || oppId === '') && (sfOppNumber == null || sfOppNumber === '')) {
            return;
        }
        if (oppId == null || oppId === '') {
            filterArr = ['custbodyr7_sf_oppnumber', 'is', sfOppNumber];
        }else{
            filterArr = ['opportunity', 'anyof', oppId];
        }
        if (quoteId == null || quoteId === '') {
            return;
        }

        search.create({
            type: search.Type.TRANSACTION,
            filters: [
                ['type', 'anyof', 'Estimate'],
                'and', ['mainline', 'is', 'T'],
                'and', ['custbodyr7includeinsalesforecast', 'is', 'T'],
                'and', filterArr ,
                'and', ['internalid', 'noneof', quoteId]
            ]
        }).run().each(result => {
            try {
                record.submitFields({
                    type: record.Type.ESTIMATE,
                    id: result.id,
                    values: {
                        'custbodyr7includeinsalesforecast': false
                    }
                });
            }
            catch (e) {
                log.error({ title: 'ERROR toggleIncludeInSalesForecast', details: 'quoteId: ' + quoteId + '\nERROR: ' + JSON.stringify(e) });
            }

            return true;
        });
    }

    function setNumberOfMonths(recQuote){
        const numberOfItems = recQuote.getLineCount({ sublistId: 'item' });
        let maxLineMonths = 0;

        if (numberOfItems != null) {
            for (let i = 0; i < numberOfItems; i++) {

                const itemId = recQuote.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                const quantity = recQuote.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                const unitType = recQuote.getSublistValue({ sublistId: 'item', fieldId: 'custcolr7itemqtyunit', line: i });
                let lineMonths = 0;

                if (itemId != null && itemId !== '' && quantity != null && quantity !== ''){
                    const defaultTerm = getItemProperties(itemId, 'custitemr7itemdefaultterm');
                    // noinspection JSCheckFunctionSignatures
                    lineMonths = parseFloat(convertToMonths(quantity, unitType, defaultTerm));
                }

                log.debug({ title: 'lineMonths', details: lineMonths });

                if (lineMonths > maxLineMonths) {
                    maxLineMonths = lineMonths;
                }
            }
        }

        log.debug({ title: 'maxLineMonths', details: maxLineMonths });

        const startDate = recQuote.getValue({ fieldId: 'startdate' });
        const endDate = recQuote.getValue({ fieldId: 'enddate' });

        let headerMonths = 0;
        if (startDate != null && startDate !== '' && endDate != null && endDate !== '') {
            headerMonths = datedifferencemonths(startDate, endDate);
            log.debug({ title: 'headerMonths', details: headerMonths });
        }

        let maxMonths = Math.max(maxLineMonths, headerMonths);
        maxMonths = Math.round(maxMonths * 100) / 100;

        recQuote.setValue({ fieldId: 'custbodyr7lengthofdealmaxmonths', value: maxMonths });
    }

    function convertToMonths(quantity, unitType, defaultTerm){
        // unit = 1
        // month = 2
        // year = 3
        // days = 5
        // 15-day = 6
        // Per Term = 7
        // Week = 8

        let unitValue = 0;

        if (defaultTerm == null || defaultTerm === '') {
            defaultTerm = 365;
        }

        switch (unitType) {
            case '1':
                unitValue = 0;
                break;
            case '2':
                unitValue = 1;
                break;
            case '3':
                unitValue = 12;
                break;
            case '5':
                unitValue = 12/365;
                break;
            case '6':
                unitValue = .5;
                break;
            case '7':
                unitValue = (12/365) * defaultTerm;
                quantity = 1;
                break;
            case '8':
                unitValue = 12/52;
                break;
        }

        return quantity * unitValue;
    }

    function datedifferencemonths(date1, date2){
        const months1 = date1.getMonth() + (date1.getFullYear() * 12);
        const months2 = date2.getMonth() + (date2.getFullYear() * 12);

        return Math.abs(months1 - months2);
    }

    /**
     * This function updates the LineId on Item Associations to the new Quote record Id
     * @param {Object} recQuote new Quote record ID
     */
    function updateItemAssociations(recQuote){
        let updatedRecord = false;

        const arrProductTypes = acr.grabAllProductTypes(false);
        const lineItemCount = recQuote.getLineCount({ sublistId: 'item' });

        for (let i = 0; i < lineItemCount; i++) {
            // Use ACR in conjunction with arrProductTypes to get activationKey using dynamic Item Option Id
            var itemId = recQuote.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            var itemType = recQuote.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
            var acrId = getItemProperties(itemId, 'custitemr7itemacrproducttype');

            if (itemType !== 'Subtotal' && itemType !== 'Discount' && itemType !== 'Description') {
                if (acrId != null && acrId !== '') {
                    var itemOptionId = arrProductTypes[acrId]['optionid'];
                    var activationKey = recQuote.getSublistValue({ sublistId: 'item', fieldId: itemOptionId, line: i });
                    if (activationKey != null && activationKey !== '') {
                        var oldRecQuoteId = activationKey.substring(4, activationKey.indexOf("_"));
                        var newAK = activationKey.replace(oldRecQuoteId, recQuote.id);
                        //nlapiLogExecution('DEBUG','oldRecQuoteId',oldRecQuoteId);
                        //nlapiLogExecution('DEBUG','newAK',newAK);

                        if (activationKey.substr(0, 4) === 'PEND') {
                            recQuote.setSublistValue({ sublistId: 'item', fieldId: itemOptionId, line: i, value: newAK });
                            updatedRecord = true;
                        }
                    }
                }
            }
        }

        return updatedRecord;
    }

    function getItemProperties(recId, fieldId) {

        if (recId == null || recId === '' || fieldId == null || fieldId === '') {
            return null;
        }

        const objItemProps = {};

        if (objItemProps.hasOwnProperty(recId)) {
            if (objItemProps[recId] == null) {
                return null;
            }
            return objItemProps[recId][fieldId];
        }

        // noinspection JSCheckFunctionSignatures
        objItemProps[recId] = search.lookupFields({
            type: 'item',
            id: recId,
            columns: [
                'isinactive',
                'custitemr7itemdefaultterm',
                'custitemr7itemacrproducttype'
            ]
        });

        if (objItemProps[recId] == null) {
            return null;
        }

        return objItemProps[recId][fieldId];
    }

    function sendAdminEmail({ subject, body }) {
        var adminUser = config.load({ type: config.Type.COMPANY_PREFERENCES })
            .getValue({ fieldId: 'custscriptr7_system_info_email_sender' });

        // noinspection JSCheckFunctionSignatures
        email.send({
            author: adminUser,
            recipients: adminUser,
            subject,
            body
        });
    }

    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit
    };
});
