/*
 var errorredTimebillRecords = new Array();
 var errorredExpenserptRecords = new Array();
 var msg = '';
 var errorsFound = false;
 */

var filters, columns;
filters = columns = null;

var context = null;
var scriptDeploymentID = null;

function doUpdate(invRecord, recId, recordType) {

    var invoiceId = invRecord.getId();

    if (recordType == 'expensereport') {
        var expRecord = nlapiLoadRecord(recordType, recId);
        if (expRecord) {
            for (var j = 1; j <= expRecord.getLineItemCount('expense'); j++) {
                expRecord.setLineItemValue('expense', 'custcol_added_to_invoice', j, invoiceId);
            }
            nlapiSubmitRecord(expRecord, true, true);
        }
    }

    if (recordType == 'timebill') {
        nlapiSubmitField(recordType, recId, 'custcol_added_to_invoice', invoiceId); // associate timebill record with invoice
    }
}

/*
 function saveInvErrors(recordType) {

 var i = 0;

 if (recordType == 'timebill') {
 if (errorredTimebillRecords.length > 0) {
 errorsFound = true;
 msg += "\n\nTIME ENTRY UPDATE ERRORS - Internal Ids\n";
 for (i = 0; i < errorredTimebillRecords.length; i++)
 msg += errorredTimebillRecords[i] + ', ';
 }
 }

 if (recordType == 'expensereport') {
 if (errorredExpenserptRecords.length > 0) {
 errorsFound = true;
 msg += "\n\nEXPENSE ENTRY UPDATE ERRORS - Internal Ids\n";
 for (i = 0; i < errorredExpenserptRecords.length; i++)
 msg += errorredExpenserptRecords[i] + ', ';
 }
 }
 }
 */

function findAndUpdate(recordType, invRecord, project) {

    var invRecordId = invRecord.getId();

    var orderId = invRecord.getFieldValue('createdfrom');

    nlapiLogExecution('DEBUG', 'findAndUpdate() - Inputs > recordType, invRecordId, orderId, project', recordType + ', ' + invRecordId + ', ' + orderId + ', ' + project);

    if (orderId) {

        /*
         // find and tag as errors, all time and expense records where custcol_added_to_sales_order = orderid and custcol_added_to_invoice is not empty
         filters = new Array();
         filters.push(new nlobjSearchFilter('custcol_added_to_sales_order', null, 'is', orderId));
         filters.push(new nlobjSearchFilter('custcol_added_to_invoice', null, 'noneof', '@NONE@'));
         var r1 = nlapiSearchRecord(recordType, null, filters);
         if (r1 && r1.length > 0) {
         nlapiLogExecution('DEBUG', 'recordType:# of errors found', recordType + ':' + r1.length);
         for (var i1 = 0; i1 < r1.length; i1++) {
         var id1 = r1[i1].getId();
         if (recordType == 'timebill')
         errorredTimebillRecords.push(id1);
         if (recordType == 'expensereport')
         errorredExpenserptRecords.push(id1);
         }
         }

         saveInvErrors(invRecord, recordType);

         if (errorsFound) {
         if (errorredTimebillRecords.length > 0)
         msg = msg + '\n\nFAILED TO UPDATE INVOICED TIME ENTRIES for PROJECT iid #' + project + "\n\nerrorredTimebillRecords: " + JSON.stringify(errorredTimebillRecords);

         throw msg;
         }

         nlapiLogExecution('DEBUG', 'findAndUpdate() - No Errors Found, OK to Continue...');
         */

        // find and update all time and expense records where custcol_added_to_sales_order = orderid and custcol_added_to_invoice is empty
        filters = new Array();
        filters.push(new nlobjSearchFilter('custcol_added_to_sales_order', null, 'is', orderId));
        //filters.push(new nlobjSearchFilter('custcol_invoiced', null, 'isempty'));
        filters.push(new nlobjSearchFilter('custcol_added_to_invoice', null, 'is', '@NONE@')); // field is empty
        var r2 = nlapiSearchRecord(recordType, null, filters);
        if (r2 && r2.length > 0) {
            do {
                nlapiLogExecution('DEBUG', 'recordType: # of entries to update', recordType + ':' + r2.length);
                for (var i2 = 0; i2 < r2.length; i2++) {

                    var id2 = r2[i2].getId();

                    nlapiLogExecution('DEBUG', 'Updating ' + recordType + ' #' + i2);

                    doUpdate(invRecord, id2, recordType);

                    // check governance usage, reschedule script if needed
                    var apiUsage = parseInt(context.getRemainingUsage());
                    if (apiUsage <= 100 && (i + 1) < r.length) {
                        nlapiLogExecution('DEBUG', 'Governance Limit Reached...Rescheduling Script');
                        var status = nlapiScheduleScript(context.getScriptId(), scriptDeploymentID);
                        if (status == 'QUEUED')
                            return;
                        else
                            throw 'Failed to Schedule Script - Deployment Id: ' + scriptDeploymentID;
                    }

                }
                r2 = nlapiSearchRecord(recordType, null, filters);
            } while (r2 && r2.length > 0);
        }

        // calculate invoiced time dollar amount for timebill records. Update the associated projects with this dollar amount.
        if (recordType == 'timebill') {
            var invoicedTime = parseFloat(0);
            for (i = 1; i <= invRecord.getLineItemCount('item'); i++) {

                var itemType = invRecord.getLineItemValue('item', 'itemtype', i);
                var item = invRecord.getLineItemValue('item', 'item', i);
                var invLineAmt = parseFloat(invRecord.getLineItemValue('item', 'amount', i));
                var invLineDesc = invRecord.getLineItemValue('item', 'custcol_billing_desc', i);

                if (isNaN(invLineAmt)) invLineAmt = parseFloat(0);

                nlapiLogExecution('DEBUG', 'itemid:itemType:ItemDesc:line #' + i + ' amount', item + ':' + itemType + ':' +
                    invLineDesc + ':' + invLineAmt);

                // aggregate invoiced amounts for all timebill records (serviceitem line items) on invoice
                if (itemType == 'Service' && item != expenseItem && invLineDesc != 'Out of Pocket Expenses')
                    invoicedTime = parseFloat(invoicedTime) + parseFloat(invLineAmt);
            }

            if (invoicedTime > 0) {

                nlapiLogExecution('DEBUG', 'Updating project ' + project + ', adding invoicedTime', invoicedTime);
                var oldInvoicedTime = parseFloat(nlapiLookupField('job', project, 'custentity_invoiced_time'));
                if (isNaN(oldInvoicedTime)) oldInvoicedTime = parseFloat(0);
                nlapiLogExecution('DEBUG', 'Updating project ' + project + ', current total invoicedTime', oldInvoicedTime);
                invoicedTime = parseFloat(invoicedTime) + parseFloat(oldInvoicedTime);
                invoicedTime = invoicedTime.toFixed(2);
                nlapiSubmitField('job', project, 'custentity_invoiced_time', invoicedTime); // save invoiced time dollar amount to project associated with timebill
                nlapiLogExecution('DEBUG', 'Updated project ' + project + ', new invoicedTime', invoicedTime);
            }
        }
    }
}

function onStart(request, response) {

    nlapiLogExecution('DEBUG', 'START');

    var r, i, x, recId;

    context = nlapiGetContext();

    scriptDeploymentID = context.getDeploymentId();

    var updateType = context.getSetting('SCRIPT', 'custscript_updatetype');

    if (updateType == 2) // SALES ORDER UPDATE
    {
        filters = new Array();
        filters.push(new nlobjSearchFilter('custrecord_processed', null, 'is', 'F'));
        filters.push(new nlobjSearchFilter('custrecord_updatetype', null, 'is', updateType));
        columns = new Array();
        columns.push(new nlobjSearchColumn('custrecord_items'));
        columns.push(new nlobjSearchColumn('custrecord_project'));
        columns.push(new nlobjSearchColumn('custrecord_tranid'));
        r = nlapiSearchRecord('customrecord_timeexpenserecstoupdt', null, filters, columns);

        if (r && r.length > 0) {

            for (x = 0; x < r.length; x++) {

                recId = r[x].getId();
                var orderId = r[x].getValue('custrecord_tranid');
                var projectId = r[x].getValue('custrecord_project');

                var itemsData = JSON.parse(r[x].getValue('custrecord_items'));

                nlapiLogExecution('DEBUG', 'Updating impacted time and expense entries, project Id', projectId);

                for (i = 0; i < itemsData.length; i++) {

                    if (!itemsData[i].NSUpdated) {

                        var id = parseInt(itemsData[i].id);
                        if (itemsData[i].type == 'Time') {
                            nlapiSubmitField('timebill', id, 'custcol_added_to_sales_order', orderId);
                            if (itemsData[i].isNoCharge)
                                nlapiSubmitField('timebill', id, 'custcol_marked_no_charge', 'T');
                            if (itemsData[i].isNoShow)
                                nlapiSubmitField('timebill', id, 'custcol_marked_no_show', 'T');
                        }

                        if (itemsData[i].type == 'Expense') {
                            var expRecord = nlapiLoadRecord('expensereport', id);
                            if (expRecord) {
                                for (var j = 1; j <= expRecord.getLineItemCount('expense'); j++) {
                                    var currLine = expRecord.getLineItemValue('expense', 'line', j);
                                    if (currLine == itemsData[i].expenseLine)
                                        expRecord.setLineItemValue('expense', 'custcol_added_to_sales_order', j, orderId);
                                    if (itemsData[i].isNoCharge)
                                        expRecord.setLineItemValue('expense', 'custcol_marked_no_charge', j, 'T');
                                    if (itemsData[i].isNoShow)
                                        expRecord.setLineItemValue('expense', 'custcol_marked_no_show', j, 'T');
                                }
                                nlapiSubmitRecord(expRecord, true, true);
                            }
                        }

                        itemsData[i].NSUpdated = true;
                    }

                    // check governance usage, reschedule script if needed
                    var apiUsage = parseInt(context.getRemainingUsage());
                    //nlapiLogExecution('DEBUG','API Remaining Usage', apiUsage);
                    if (apiUsage <= 100 && (x + 1) < r.length) {
                        // save Q record
                        nlapiSubmitField('customrecord_timeexpenserecstoupdt', recId, 'custrecord_items', JSON.stringify(itemsData));
                        var status = nlapiScheduleScript(context.getScriptId(), scriptDeploymentID);
                        if (status != 'QUEUED')
                            throw 'Failed to Schedule Script: - Deployment Id: ' + scriptDeploymentID;
                    }
                }

                // save Q record with q entry processed
                nlapiSubmitField('customrecord_timeexpenserecstoupdt', recId, 'custrecord_items', JSON.stringify(itemsData));
                nlapiSubmitField('customrecord_timeexpenserecstoupdt', recId, 'custrecord_processed', 'T');

                // update billing status on project
                nlapiSubmitField('job', projectId, 'custentity_billinginprogress', 'F');

                nlapiLogExecution('DEBUG', 'Total time & expense entries that were updated', itemsData.length);
            }
        }
    }

    if (updateType == 1) // INVOICE UPDATE
    {
        var invRecordId = null;

        filters = new Array();
        filters.push(new nlobjSearchFilter('custrecord_processed', null, 'is', 'F'));
        filters.push(new nlobjSearchFilter('custrecord_updatetype', null, 'is', updateType));
        columns = new Array();
        columns.push(new nlobjSearchColumn('custrecord_project'));
        columns.push(new nlobjSearchColumn('custrecord_tranid'));
        r = nlapiSearchRecord('customrecord_timeexpenserecstoupdt', null, filters, columns);

        if (r && r.length > 0) {

            nlapiLogExecution('DEBUG', 'Total Records Found', r.length);

            for (x = 0; x < r.length; x++) {

                try {

                    recId = r[x].getId();

                    var invRecord = nlapiLoadRecord('invoice', r[x].getValue('custrecord_tranid'));

                    invRecordId = invRecord.getId();

                    // find time and expense reports to update

                    findAndUpdate('timebill', invRecord, r[x].getValue('custrecord_project'));

                    findAndUpdate('expensereport', invRecord);

                    nlapiSubmitField('customrecord_timeexpenserecstoupdt', recId, 'custrecord_processed', 'T');
                }
                catch (e) {
                    nlapiDeleteRecord('invoice', invRecordId);
                    throw e;
                }
            }
        }
    }

    nlapiLogExecution('DEBUG', 'STOP');
}