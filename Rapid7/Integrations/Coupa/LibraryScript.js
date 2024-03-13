/*
 * type
 * invoice - xml invoice from responce
 * documentType - vendorcredit or vendorbil
 */
var context = nlapiGetContext();
var documentType;
function createDocument(invoice, documentType)
{

    nlapiLogExecution('DEBUG', 'createDocument', invoice);
    nlapiLogExecution('DEBUG', 'documentType', documentType);
    var record;
    if (documentType === 'vendorbill')
    {
        record = createVendorBillRecord(invoice, record);

    }
    else if (documentType === 'vendorcredit')
    {
        record = nlapiCreateRecord('vendorcredit', {
            recordmode: 'dynamic'
        });
    }
    var lineleveltaxation = 'false';
    lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');

    var supplierNode = nlapiSelectNode(invoice, 'supplier');

    if (nlapiSelectValue(supplierNode, 'number'))
    {
        try {
            record.setFieldValue('entity', nlapiSelectValue(supplierNode, 'number'));
        }
        catch (e)
        {
            record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));
        }
    }
    else
    {
        // try setting supplier name instead on id
        record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));
    }
    var shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
    var handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
    var taxamount = parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
    var miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));
    var headersValues = getHeadersArray(documentType, shippingamount, handlingamount, miscamount, taxamount, lineleveltaxation);
    var headercharges;
    if (documentType === 'vendorbill')
    {
        headercharges = headersValues.headercharges;
    }
    var totalheadercharges = headersValues.totalheadercharges;
    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();
    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
    var totalArray = getTotalAmountsArray(totalheadercharges, invoiceLineNodes);
    var totalamount = totalArray.totalamount;
    var taxabletotalamount = totalArray.taxabletotalamount;
    var totalheaderamount = totalArray.totalheaderamount;
    var totalcalcamount = 0;
    if (mainLoop(documentType, invoiceLineNodes, record, totalheaderamount, taxabletotalamount, totalheadercharges, invoice, supplierNode, lineleveltaxation, totalcalcamount, headercharges))
    {
        submitRecord(record, documentType, invoice, supplierNode);
    }
}
function submitRecord(record, documentType, invoice, supplierNode)
{

    try {
        var lineTypeCount;
        var linetype;
        if (documentType === 'vendorbill')
        {
            lineTypeCount = 'custscript_customfield_header_count';
            linetype = 'custscript_custfieldheader';

            record.setFieldValue('externalid', 'Coupa-VendorBill ' + nlapiSelectValue(invoice, 'id'));
            var paymentTermNode = nlapiSelectNode(invoice, 'payment-term');
            var terms;

            if (paymentTermNode) {
                terms = getNetsuitetermid(nlapiSelectValue(paymentTermNode, 'code'));
            } else
                terms = getNetsuitetermid('Net 30');
            record.setFieldValue('terms', terms);
            // add link back to invoice in Coupa
            var coupaInvoiceLink = context.getSetting('SCRIPT', 'custscript_coupainvoice_link_field');
            if (coupaInvoiceLink) {
                record.setFieldValue(coupaInvoiceLink, context
                        .getSetting('SCRIPT', 'custscript_url')
                        + '/invoices/' + nlapiSelectValue(invoice, 'id'));
            }

            // add link back to invoiceimagescan in Coupa
            var coupaInvoiceImage = context.getSetting('SCRIPT', 'custscript_coupainvoiceimage_link_field');
            var imagescan = nlapiSelectValue(invoice, 'image-scan');
            if (coupaInvoiceImage && imagescan) {
                // first get the correct url
                imagescan = imagescan.split('/');
                var imagescanurl = context.getSetting('SCRIPT',
                        'custscript_url')
                        + '/invoice/'
                        + nlapiSelectValue(invoice, 'id')
                        + '/image_scan/' + imagescan[5];
                record.setFieldValue(coupaInvoiceImage, imagescanurl);
            }
        } else if (documentType === 'vendorcredit')
        {
            lineTypeCount = 'custscript_customfield_crdt_header_count';
            linetype = 'custscript_custfield_crdt_header';
            record.setFieldValue('externalid', 'Coupa-VendorCredit-' + nlapiSelectValue(invoice, 'id'));
        }

        record.setFieldValue('trandate', ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice, 'invoice-date')));
        var curr = getNetsuiteCurrency('currency', nlapiSelectValue(invoice, 'currency/code'));
        record.setFieldValue('currency', curr);

        var actPayableNum = context.getSetting('SCRIPT', 'custscript_actpayablenum');
        if (actPayableNum) {
            var apAccountId = getNetsuiteAccountId(actPayableNum);

            if (apAccountId != 'INVALID_ACCOUNT')
                record.setFieldValue('account', apAccountId);


        }
        var today = new Date();
        var postingPeriod = getMonthShortName(today.getMonth()) + ' '
                + today.getFullYear();
        var cutoffday = 5;
        cutoffday = context.getSetting('SCRIPT',
                'custscript_cutoffdate');
        if (today.getDate() < cutoffday) {
            var nDate = nlapiSelectValue(invoice, 'invoice-date').split('T');
            var datesplit = nDate[0].split('-');
            var Nyear = datesplit[0];
            // var Nday = datesplit[2];
            var Nmonth = datesplit[1] - 1;

            if (today.getFullYear() > Nyear) {
                if (today.getMonth() == 0)
                    postingPeriod = getMonthShortName('11') + ' '
                            + (today.getFullYear() - 1);
                else
                    postingPeriod = getMonthShortName(today.getMonth() - 1)
                            + ' ' + today.getFullYear();
            }

            if (Nmonth < today.getMonth() && Nyear == today.getFullYear())
                postingPeriod = getMonthShortName(today.getMonth() - 1) + ' '
                        + today.getFullYear();
        }
        var postingPeriodId = getAccoutingPeriodNetsuiteId('accountingperiod', postingPeriod);
        record.setFieldValue('postingperiod', postingPeriodId);
        record.setFieldValue('tranid', nlapiSelectValue(invoice, 'invoice-number'));
        record.setFieldText('approvalstatus', 'Approved');
        var headerCount = context.getSetting('SCRIPT', lineTypeCount);
        if (headerCount)
        {
            for (var y = 1; y <= headerCount; y++)
            {
                var headerFields = context.getSetting('SCRIPT', linetype + y);
                if (headerFields)
                {
                    var custfield;
                    var valuetoinsert = 'None';
                    var textOrValue;
                    if (headerFields.split(':'))
                    {
                        custfield = headerFields.split(':');

                        if (custfield[4])
                            valuetoinsert = custfield[4];
                        else
                        {

                            if (nlapiSelectValue(invoice, custfield[0]))
                                valuetoinsert = nlapiSelectValue(invoice, custfield[0]);

                            if (custfield[2] && nlapiSelectValue(invoice, custfield[0]))
                            {
                                if (custfield[2] == 'Date')
                                    valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice, custfield[0]));

                                if (custfield[2] == 'Lookup')
                                {
                                    valuetoinsert = nlapiSelectValue(invoice, custfield[0] + '/external-ref-num');
                                }

                            }
                        }

                        textOrValue = 'Text';
                        if (custfield[3])
                        {
                            textOrValue = custfield[3];
                        }
                        nlapiLogExecution('DEBUG', 'Credit Header CustomField' + ' ' + y, " custfield0 = " + custfield[0]
                                + " custfield1 = " + custfield[1]
                                + " custfield2 = " + custfield[2]
                                + " custfield3 = " + custfield[3]
                                + " valuetoinsert = " + valuetoinsert);

                        if (valuetoinsert && valuetoinsert != 'None')
                        {
                            if (textOrValue == 'Text')
                                record.setFieldText(custfield[1], valuetoinsert);
                            else
                                record.setFieldValue(custfield[1], valuetoinsert);
                        }

                    }
                }
            }
        }
       
               
        nlapiSubmitRecord(record);
        countSuccesInvoices(1);
        nlapiLogExecution('AUDIT',
                'CREATE SUCCESS',
                ' Invoice Number = '
                + nlapiSelectValue(invoice, 'invoice-number')
                + ' Supplier Name = '
                + nlapiSelectValue(supplierNode, 'name')
                );


        Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
    }
    catch (e)
    {
        errorMsg(nlapiSelectValue(invoice, 'invoice-number'), nlapiSelectValue(supplierNode, 'name'), documentType, e);
        nlapiLogExecution('ERROR',
                'Processing Error - Unable to create ' + documentType,
                ' Invoice Number = '
                + nlapiSelectValue(invoice, 'invoice-number')
                + ' Supplier Name = '
                + nlapiSelectValue(supplierNode, 'name')
                + ' Error Description = ' + e.message);
        /*
         nlapiSendEmail(
         -5,
         context.getSetting('SCRIPT',
         'custscript_emailaddr_notifications'),
         context.getSetting('SCRIPT',
         'custscript_acccountname')
         + ' Invoice Integration:Processing Error - Unable to create vendor credit',
         'Invoice Number = '
         + nlapiSelectValue(invoice, 'invoice-number')
         + ' Supplier Name = '
         + nlapiSelectValue(supplierNode, 'name')
         + ' Error Description = ' + e.message);*/
    }
  
}

function createVendorBillRecord(invoice, record)
{
    var vendorBillFormConfig = context.getSetting('SCRIPT', 'custscript_vendorbillFormconfig');
    if (vendorBillFormConfig)
    {
        var list = vendorBillFormConfig.split(':');
        var vendorbillformhash = new Object();
        for (var i = 0; i < list.length; i++) {
            var keyvaluelist = list[i].split('-');
            vendorbillformhash[keyvaluelist[0]] = keyvaluelist[1];
        }

        nlapiLogExecution('DEBUG', 'Form id for'
                + nlapiSelectValue(invoice, 'account-type/name'),
                vendorbillformhash[nlapiSelectValue(invoice,
                        'account-type/name')]);

        if (vendorbillformhash[nlapiSelectValue(invoice, 'account-type/name')])
            record = nlapiCreateRecord('vendorbill', {
                customform: vendorbillformhash[nlapiSelectValue(invoice,
                        'account-type/name')],
                recordmode: 'dynamic'
            });
        else
            record = nlapiCreateRecord('vendorbill', {
                recordmode: 'dynamic'
            });
    }
    else
    {
        record = nlapiCreateRecord('vendorbill', {
            recordmode: 'dynamic'
        });
    }
    return record;
}

function getHeadersArray(documentType, shippingamount, handlingamount, miscamount, taxamount, lineleveltaxation)
{
    var headercharges = false;
    var totalheadercharges = 0;
    if (documentType === 'vendorbill')
    {
        totalheadercharges = shippingamount + handlingamount + miscamount;
        headercharges = (totalheadercharges > 0) ? true : headercharges;
        if (lineleveltaxation === 'false') {
            var sendTaxcode = context.getSetting('SCRIPT', 'custscript_send_taxcode')
            if (sendTaxcode && sendTaxcode === 'F') {
                totalheadercharges = totalheadercharges + taxamount;
            }
            else
            {
                totalheadercharges = totalheadercharges + taxamount;
            }
        }
    }
    else if (documentType === 'vendorcredit')
    {
        if (lineleveltaxation === 'false') {
            totalheadercharges = shippingamount + handlingamount + taxamount + miscamount;
        }
        else
        {
            totalheadercharges = shippingamount + handlingamount + miscamount;
        }
    }
    var resultArray = {
        headercharges: headercharges,
        totalheadercharges: totalheadercharges
    };
    return resultArray;
}

function getTotalAmountsArray(totalheadercharges, invoiceLineNodes)
{
    var totalamount = 0;
    var taxabletotalamount = 0;
    for (var x = 0; x < invoiceLineNodes.length; x++) {
        if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') !== 'true')
        {
            taxabletotalamount = parseFloat(taxabletotalamount)
                    + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
        }

        totalamount = parseFloat(totalamount)
                + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
    }

    var totalheaderamount = parseFloat(totalamount) + parseFloat(totalheadercharges);
    totalheaderamount = totalheaderamount.toFixed(3);
    var resultArray = {
        totalamount: totalamount,
        taxabletotalamount: taxabletotalamount,
        totalheaderamount: totalheaderamount
    };
    return resultArray;
}

function mainLoop(documentType, invoiceLineNodes, record, totalheaderamount, taxabletotalamount, totalheadercharges, invoice, supplierNode, lineleveltaxation, totalcalcamount, headercharges)
{
    for (var x = 0; x < invoiceLineNodes.length; x++) {
        if (x === 0) {
            if (nlapiSelectValue(invoiceLineNodes[x], 'description'))
                record.setFieldValue('memo', nlapiSelectValue(
                        invoiceLineNodes[x], 'description'));
        }
        var linetax = 0;
        var sendTaxcode;
        if (documentType === 'vendorbill')
        {
            sendTaxcode = context.getSetting('SCRIPT', 'custscript_send_taxcode');
            if (sendTaxcode === 'F') {
                linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'tax-amount'));
                if (linetax)
                    totalheaderamount = parseFloat(totalheaderamount) + parseFloat(linetax);
            }
        } else if (documentType === 'vendorcredit')
        {
            linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'tax-amount'));
            if (linetax)
                totalheaderamount = parseFloat(totalheaderamount) + parseFloat(linetax);
        }
        var invoicelineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
        if (!getAccountAllocations(documentType, record, invoiceLineNodes[x], linetax, taxabletotalamount, totalheadercharges, invoicelineamount, x, totalheaderamount, lineleveltaxation, invoice, supplierNode, lineleveltaxation, totalcalcamount, headercharges))
        {
            return false;
        }

    }
    return true;
}
function getAccountAllocations(documentType, record, invoiceLineNodes, linetax, taxabletotalamount, totalheadercharges, invoicelineamount, x, totalheaderamount, lineleveltaxation, invoice, supplierNode, lineleveltaxation, totalcalcamount, headercharges)
{
    var dynamicAccounting = context.getSetting('SCRIPT', 'custscript_dynamicaccts');
    dynamicAccounting = dynamicAccounting ? dynamicAccounting : 'F';
    var actalloc = nlapiSelectNode(invoiceLineNodes, 'account-allocations');
    var accountallocations = new Array();
    accountallocations = nlapiSelectNodes(actalloc, 'account-allocation');
    var splitaccounting = (accountallocations.length >= 1) ? true : false;
    var adjlineamount;
    if (splitaccounting)
    {
        for (var i = 0; i < accountallocations.length; i++) {
            var accountNode = nlapiSelectNode(accountallocations[i], 'account');
            var lineamount = parseFloat(nlapiSelectValue(accountallocations[i], 'amount'));
            var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount)) * totalheadercharges;
            var splitlinetax = 0.00;
            if (linetax) {
                splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount)) * linetax;
            }
            var result = getAdjlineAmount(documentType, linetax, lineamount, linecharge, splitlinetax, invoiceLineNodes, lineleveltaxation, totalheaderamount, invoicelineamount);
            adjlineamount = result.adjlineamount;
            totalheaderamount = result.totalheaderamount;
            if (x === 0 && i === 0) {
                if (!setSubsidiary(record, accountNode, invoice, supplierNode, documentType))
                {
                    return false;
                }

            }
            if (!fillExpenses(documentType, record, accountNode, dynamicAccounting, invoice, supplierNode, lineleveltaxation, invoiceLineNodes, totalcalcamount, adjlineamount, accountallocations[i], totalheaderamount, x, i))
            {
                return false;
            }
            if (documentType === 'vendorbill')
            {
                if (headercharges
                        && context.getSetting('SCRIPT',
                                'custscript_send_taxcode')
                        && (context.getSetting('SCRIPT',
                                'custscript_send_taxcode') == 'T')) {
                    SetHeaderChargesasExpenseLine(record, invoice,
                            invoiceLineNodes, linecharge.toFixed(2),
                            nlapiSelectNode(accountallocations[i], 'account'),
                            true);
                }
            }
        }
    }
    else
    {
        var lineamount = parseFloat(nlapiSelectValue(invoiceLineNodes, 'total'));
        var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount)) * totalheadercharges;
        var accountNode = nlapiSelectNode(invoiceLineNodes, 'account');
        var result = getAdjlineAmount(documentType, linetax, lineamount, linecharge, splitlinetax, invoiceLineNodes, lineleveltaxation, totalheaderamount, invoicelineamount);
        adjlineamount = result.adjlineamount;
        totalheaderamount = result.totalheaderamount;
        if (x === 0) {
            if (!setSubsidiary(record, accountNode, invoice, supplierNode, documentType))
            {
                return false;
            }
        }
        if (!fillExpenses(documentType, record, accountNode, dynamicAccounting, invoice, supplierNode, lineleveltaxation, invoiceLineNodes, totalcalcamount, adjlineamount, null, totalheaderamount, x, null))
        {
            return false;
        }
        if (documentType === 'vendorbill')
        {
            if (headercharges
                    && context.getSetting('SCRIPT',
                            'custscript_send_taxcode')
                    && (context.getSetting('SCRIPT',
                            'custscript_send_taxcode') == 'T')) {
                SetHeaderChargesasExpenseLine(record, invoice,
                        invoiceLineNodes, linecharge.toFixed(2),
                        nlapiSelectNode(accountallocations[i], 'account'),
                        false);
            }
        }
    }
    return true;
}
function getTax(record, lineleveltaxation, invoice, invoiceLineNodes)
{
    var sendTaxCode = context.getSetting('SCRIPT', 'custscript_send_taxcode');
    if (sendTaxCode) {
        if (lineleveltaxation == 'false')
        {
            var invoiceTaxCode = nlapiSelectValue(invoice, 'tax-code/code');
            if (invoiceTaxCode) {
                var taxsplit = invoiceTaxCode.split(':');
                if (taxsplit[1]) {
                    record.setCurrentLineItemValue('expense', 'taxcode', taxsplit[1]);
                } else {
                    nlapiLogExecution(
                            'ERROR',
                            'Processing Error - Invalid Header taxcode',
                            'TaxCode ='
                            + nlapiSelectValue(invoice,
                                    'tax-code/code')
                            + ' Invoice Number = '
                            + nlapiSelectValue(invoice,
                                    'invoice-number')
                            );
                }
            }
        }
        else
        {
            if (nlapiSelectValue(invoiceLineNodes, 'tax-code/code'))
            {
                var taxsplit = nlapiSelectValue(invoiceLineNodes, 'tax-code/code').split(':');
                if (taxsplit[1]) {
                    record.setCurrentLineItemValue('expense', 'taxcode', taxsplit[1]);
                } else {
                    nlapiLogExecution('ERROR',
                            'Processing Error - Invalid taxcode',
                            'TaxCode ='
                            + nlapiSelectValue(
                                    invoiceLineNodes,
                                    'tax-code/code')
                            + ' Invoice Number = '
                            + nlapiSelectValue(invoice,
                                    'invoice-number')
                            );
                }
            }
        }
    }
    return record;
}
function fillExpenses(documentType, record, accountNode, dynamicAccounting, invoice, supplierNode, lineleveltaxation, invoiceLineNodes, totalcalcamount, adjlineamount, accountallocations, totalheaderamount, x, i)
{
    try {
        record.selectNewLineItem('expense');

        if (documentType === 'vendorbill')
        {
            getTax(record, lineleveltaxation, invoice, invoiceLineNodes);
        }
        var glactseg = context.getSetting('SCRIPT', 'custscript_glactseg');
        if (glactseg) {
            var account;
            var accountnumber;
            var accountId;
            account = nlapiSelectValue(accountNode, glactseg).split(':');
            accountnumber = account[0];
            accountId = dynamicAccounting === 'T' ? getNetsuiteAccountId(account) : getNetsuiteAccountId(accountnumber);

            if (accountId != 'INVALID_ACCOUNT')
                record.setCurrentLineItemValue('expense', 'account', accountId);
            else {
                errorMsg(nlapiSelectValue(invoice, 'invoice-number'), nlapiSelectValue(supplierNode, 'name'), documentType, 'GL Account =' + accountnumber);

                return false;
            }
        }

        var deptseg = context.getSetting('SCRIPT', 'custscript_deptseg');
        if (deptseg) {
            var dept = nlapiSelectValue(accountNode, deptseg).split(':');
            dynamicAccounting === 'T' ? record.setCurrentLineItemValue('expense', 'department', dept) : record.setCurrentLineItemValue('expense', 'department', dept[1]);
        }
        var classeg = context.getSetting('SCRIPT', 'custscript_classseg');
        if (classeg) {
            var clss = nlapiSelectValue(accountNode, classeg).split(':');
            dynamicAccounting === 'T' ? record.setCurrentLineItemValue('expense', 'class', clss) : record.setCurrentLineItemValue('expense', 'class', clss[1]);
        }

        var locseg = context.getSetting('SCRIPT', 'custscript_locseg');
        var loccust = context.getSetting('SCRIPT', 'custscript_loccust');
        if (locseg) {
            var locId = nlapiSelectValue(accountNode, locseg).split(':');
            dynamicAccounting === 'T' ? record.setCurrentLineItemValue('expense', 'location', locId) : record.setCurrentLineItemValue('expense', 'location', locId[1])
        } else if (loccust) {
            var locId = getNetsuiteId('location', nlapiSelectValue(
                    invoiceLineNodes, loccust));
            if (locId != 'INVALID_NAME')
                record.setCurrentLineItemValue('expense', 'location', locId);
        }

        // check for Coupa order line
        var poheadernum = nlapiSelectValue(invoiceLineNodes, 'order-header-num');
        var polinenum = nlapiSelectValue(invoiceLineNodes, 'order-line-num');
        if (poheadernum && polinenum) {
            record.setCurrentLineItemValue('expense', 'custcol_coupaponum', poheadernum + '-' + polinenum);
        }
        record.setCurrentLineItemValue('expense', 'memo', nlapiSelectValue(invoiceLineNodes, 'description'));
        record.setCurrentLineItemValue('expense', 'isbillable', 'T');

        if (i)
        {
            if ((i === 0) && (x === 0))
            {
                if (documentType === 'vendorcredit')
                {
                    totalcalcamount = parseFloat(adjlineamount);
                }
                else if (documentType === 'vendorbill')
                {
                    if (context.getSetting('SCRIPT',
                            'custscript_send_taxcode')
                            && (context.getSetting('SCRIPT',
                                    'custscript_send_taxcode') == 'T'))
                        totalcalcamount = parseFloat(adjlineamount)
                                + parseFloat(linecharge);
                    else
                        totalcalcamount = parseFloat(adjlineamount);
                }


            }
            else
            {
                if (documentType === 'vendorcredit')
                {
                    totalcalcamount = parseFloat(totalcalcamount)
                            + parseFloat(adjlineamount);
                }
                if (documentType === 'vendorbill')
                {
                    if (context.getSetting('SCRIPT',
                            'custscript_send_taxcode')
                            && (context.getSetting('SCRIPT',
                                    'custscript_send_taxcode') == 'T'))
                        totalcalcamount = parseFloat(totalcalcamount)
                                + parseFloat(adjlineamount)
                                + parseFloat(linecharge);
                    else
                        totalcalcamount = parseFloat(totalcalcamount)
                                + parseFloat(adjlineamount);
                }
            }
            if ((x == invoiceLineNodes.length - 1) && (i == accountallocations.length - 1)) {
                var roundingerror = totalheaderamount - totalcalcamount;

                if (roundingerror) {
                    roundingerror = Math.round(parseFloat(roundingerror) * 100) / 100;
                    if (documentType === 'vendorcredit')
                    {
                        adjlineamount = parseFloat(adjlineamount) + roundingerror;
                    }
                    else if (documentType === 'vendorbill')
                    {
                        if (context.getSetting('SCRIPT',
                                'custscript_send_taxcode')
                                && (context.getSetting('SCRIPT',
                                        'custscript_send_taxcode') == 'T')) {
                            linecharge = linecharge + roundingerror;
                        } else
                            adjlineamount = parseFloat(adjlineamount) + roundingerror;
                    }
                }
            }
        }
        else
        {
            if (x === 0)
            {
                if (documentType === 'vendorcredit')
                {
                    totalcalcamount = parseFloat(adjlineamount);
                }
                else if (documentType === 'vendorbill')
                {
                    if (context.getSetting('SCRIPT',
                            'custscript_send_taxcode')
                            && (context.getSetting('SCRIPT',
                                    'custscript_send_taxcode') == 'T'))
                        totalcalcamount = parseFloat(adjlineamount)
                                + parseFloat(linecharge);
                    else
                        totalcalcamount = parseFloat(adjlineamount);
                }
            }
            else
            {
                if (documentType === 'vendorcredit')
                {
                    totalcalcamount = parseFloat(totalcalcamount)
                            + parseFloat(adjlineamount);
                }
                else if (documentType === 'vendorbill')
                {
                    if (context.getSetting('SCRIPT',
                            'custscript_send_taxcode')
                            && (context.getSetting('SCRIPT',
                                    'custscript_send_taxcode') == 'T'))
                        totalcalcamount = parseFloat(totalcalcamount)
                                + parseFloat(adjlineamount)
                                + parseFloat(linecharge);
                    else
                        totalcalcamount = parseFloat(totalcalcamount)
                                + parseFloat(adjlineamount);
                }
                totalcalcamount = totalcalcamount.toFixed(2);
            }
            if ((x === invoiceLineNodes.length - 1)) {
                var roundingerror = totalheaderamount - totalcalcamount;

                if (roundingerror) {
                    roundingerror = Math.round(parseFloat(roundingerror) * 100) / 100;
                    if (documentType === 'vendorcredit')
                    {
                        adjlineamount = parseFloat(adjlineamount) + roundingerror;
                    }
                    else if (documentType === 'vendorbill')
                    {
                        if (context.getSetting('SCRIPT',
                                'custscript_send_taxcode')
                                && (context.getSetting('SCRIPT',
                                        'custscript_send_taxcode') == 'T')) {
                            linecharge = linecharge + roundingerror;
                        } else
                            adjlineamount = parseFloat(adjlineamount)
                                    + roundingerror;
                    }
                }
            }
        }

        record.setCurrentLineItemValue('expense', 'amount', Math.abs(parseFloat(adjlineamount)));
        // check for custom fields on line level
        var lineTypeCount;
        var linetype;
        if (documentType === 'vendorbill')
        {
            lineTypeCount = 'custscript_customfield_line_count';
            linetype = 'custscript_custfieldline';
        }
        else if (documentType === 'vendorcredit')
        {
            lineTypeCount = 'custscript_customfield_crdt_line_count';
            linetype = 'custscript_custfield_crdt_line';
        }
        var crdtLineCount = context.getSetting('SCRIPT', lineTypeCount);
        for (var y = 1; crdtLineCount && y <= crdtLineCount; y++)
        {
            var crdtLine = context.getSetting('SCRIPT', linetype + y);
            if (crdtLine)
            {
                var custfield;
                var valuetoinsert = 'None';
                var textOrValue;
                custfield = context.getSetting('SCRIPT', linetype + y).split(':');
                if (custfield)
                {
                    if (custfield[4])
                    {
                        valuetoinsert = custfield[4];
                        nlapiLogExecution('DEBUG', 'Valuetoinsert = ', valuetoinsert);
                    }

                    else
                    {
                        if (nlapiSelectValue(invoiceLineNodes, custfield[0]))
                        {
                            valuetoinsert = nlapiSelectValue(invoiceLineNodes, custfield[0]);
                        }

                        nlapiLogExecution('DEBUG', 'Line Custom ' + y, 'Coupa field = ' + nlapiSelectValue(invoiceLineNodes, custfield[0])
                                + ' ValuetoInsert = ' + valuetoinsert);

                        if (custfield[2] && nlapiSelectValue(invoiceLineNodes, custfield[0]))
                        {
                            if (custfield[2] == 'Date')
                            {
                                valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoiceLineNodes, custfield[0]));
                                nlapiLogExecution('DEBUG', 'Line Custom Inside coupatype = date' + y, 'Coupa field = ' + nlapiSelectValue(invoiceLineNodes, custfield[0])
                                        + ' ValuetoInsert = ' + valuetoinsert);
                            }

                            if (custfield[2] == 'Lookup')
                            {
                                valuetoinsert = nlapiSelectValue(invoiceLineNodes, custfield[0] + '/external-ref-num');
                                nlapiLogExecution('DEBUG', 'Line Custom Inside coupatype = lookup' + y, 'Coupa field = ' + nlapiSelectValue(invoiceLineNodes, custfield[0])
                                        + ' ValuetoInsert = ' + valuetoinsert);
                            }

                        }

                    }

                    textOrValue = 'Text';
                    if (custfield[3])
                    {
                        textOrValue = custfield[3];
                    }
                    nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y, " custfield0 = " + custfield[0]
                            + " custfield1 = " + custfield[1]
                            + " custfield2 = " + custfield[2]
                            + " custfield3 = " + custfield[3]
                            + " valuetoinsert = " + valuetoinsert);

                    if (valuetoinsert != null && valuetoinsert != undefined && valuetoinsert != 'None')
                    {

                        textOrValue === 'Text' ? record.setCurrentLineItemText('expense', custfield[1], valuetoinsert) : record.setCurrentLineItemValue('expense', custfield[1], valuetoinsert);

                    }

                }
            }
        }

        record.commitLineItem('expense');
    } catch (e)
    {
        errorMsg(nlapiSelectValue(invoice, 'invoice-number'), nlapiSelectValue(supplierNode, 'name'), documentType, e);
        return false;
    }

    return true;
}

function setSubsidiary(record, accountNode, invoice, supplierNode, documentType)
{
    var dynamicAccounting = context.getSetting('SCRIPT', 'custscript_dynamicaccts');
    dynamicAccounting = dynamicAccounting ? dynamicAccounting : 'F';
    try {
        if (context.getSetting('SCRIPT',
                'custscript_subsseg')) {
            var subsidiaryId = nlapiSelectValue(
                    accountNode,
                    context.getSetting('SCRIPT',
                            'custscript_subsseg')).split(':');
            if (dynamicAccounting === 'T') {
                nlapiLogExecution('DEBUG',
                        'Setting subsidiary ID to', subsidiaryId);
                record.setFieldValue('subsidiary', subsidiaryId);
            } else {
                nlapiLogExecution('DEBUG',
                        'Setting subsidiary ID to', subsidiaryId[1]);
                record.setFieldValue('subsidiary', subsidiaryId[1]);
            }
        } else if (dynamicAccounting === 'T') {
            var coaNode = nlapiSelectValue(accountNode,
                    'account-type');
            var subsidiaryName = nlapiSelectValue(coaNode, 'name');
            var subsidiaryID = getNetsuiteID('subsidiary', subsidiaryName);
            nlapiLogExecution('DEBUG',
                    'Setting subsidiary ID from COA name to',
                    subsidiaryID);
            record.setFieldValue('subsidiary', subsidiaryID);
        }
    }
    catch (e)
    {
        errorMsg(nlapiSelectValue(invoice, 'invoice-number'), nlapiSelectValue(supplierNode, 'name'), documentType, e);
        return false;
    }
    return true;
}

function getAdjlineAmount(documentType, linetax, lineamount, linecharge, splitlinetax, invoiceLineNodes, lineleveltaxation, totalheaderamount, invoicelineamount)
{
    var adjlineamount;
    if (documentType === 'vendorcredit')
    {
        if (linetax)
        {
            adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(splitlinetax);
        }
        else
        {
            // customization for nontaxable
            if (nlapiSelectValue(invoiceLineNodes, 'nontaxable') === 'true')
                adjlineamount = parseFloat(lineamount);
            else
                adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
        }
    }
    else if (documentType === 'vendorbill')
    {
        adjlineamount = parseFloat(lineamount);
        if (lineleveltaxation !== 'false')
        {
            nlapiLogExecution('DEBUG', 'if sendtaxcode set to false',
                    'lineamount = ' + adjlineamount);
            if (linetax) {
                splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                        * linetax;
                adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(splitlinetax);
            } else {
                // customization for nontaxable
                if (nlapiSelectValue(invoiceLineNodes, 'nontaxable') == 'true')
                    adjlineamount = parseFloat(lineamount);
                else
                    adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
            }
        }
        else if (nlapiSelectValue(invoiceLineNodes, 'tax-amount'))
        {
            linetax = parseFloat(nlapiSelectValue(invoiceLineNodes, 'tax-amount'));
            if (linetax) {

                splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount)) * linetax;
                totalheaderamount = parseFloat(totalheaderamount) + parseFloat(splitlinetax);
                adjlineamount = parseFloat(lineamount) + parseFloat(splitlinetax);
            }
        }

    }
    var resultArray = {
        totalheaderamount: totalheaderamount,
        adjlineamount: adjlineamount.toFixed(2)
    };
    return resultArray;
}
function SetHeaderChargesasExpenseLine(record, invoice, invoiceline,
        linecharge, splitaccountNode, isSplit) {
    var accountNode;

    if (isSplit)
        accountNode = splitaccountNode;
    else
        accountNode = nlapiSelectNode(invoiceline, 'account');

    record.selectNewLineItem('expense');

    if (context.getSetting('SCRIPT', 'custscript_glactseg')) {
        var account;
        var accountnumber;
        var accountId;
        // var act;
        account = nlapiSelectValue(accountNode,
                context.getSetting('SCRIPT', 'custscript_glactseg'))
                .split(':');
        // act = account[0].split(' ');
        accountnumber = account[0];
        if (dynamicAccounting == 'T') {
            accountId = account;
        } else {
            accountId = getNetsuiteAccountId(accountnumber);
        }
        if (accountId != 'INVALID_ACCOUNT')
            record.setCurrentLineItemValue('expense', 'account', accountId);
        else {
            nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account',
                    'GL Account =' + accountnumber + ' Invoice Number = '
                    + nlapiSelectValue(invoice, 'invoice-number')
                    + ' Supplier Name = '
                    + nlapiSelectValue(invoice, 'supplier/name'));
            nlapiSendEmail(
                    -5,
                    context.getSetting('SCRIPT',
                            'custscript_emailaddr_notifications'),
                    context.getSetting('SCRIPT',
                            'custscript_acccountname')
                    + ' Invoice Integration:Processing Error - Invalid GL account',
                    'GL Account =' + accountnumber + ' Invoice Number = '
                    + nlapiSelectValue(invoice, 'invoice-number')
                    + ' Supplier Name = '
                    + nlapiSelectValue(invoice, 'supplier/name'));
            return;
        }
    }

    if (context.getSetting('SCRIPT', 'custscript_deptseg')) {
        var dept = nlapiSelectValue(accountNode,
                context.getSetting('SCRIPT', 'custscript_deptseg'))
                .split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'department', dept);
        } else {
            record.setCurrentLineItemValue('expense', 'department', dept[1]);
        }
    }

    if (context.getSetting('SCRIPT', 'custscript_classseg')) {
        var clss = nlapiSelectValue(accountNode,
                context.getSetting('SCRIPT', 'custscript_classseg'))
                .split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'class', clss);
        } else {
            record.setCurrentLineItemValue('expense', 'class', clss[1]);
        }
    }

    if (context.getSetting('SCRIPT', 'custscript_locseg')) {
        var locId = nlapiSelectValue(accountNode,
                context.getSetting('SCRIPT', 'custscript_locseg'))
                .split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'location', locId);
        } else {
            record.setCurrentLineItemValue('expense', 'location', locId[1]);
        }
    }

    else if (context.getSetting('SCRIPT', 'custscript_loccust')) {
        var locId = getNetsuiteId('location', nlapiSelectValue(invoiceline,
                context.getSetting('SCRIPT', 'custscript_loccust')));
        if (locId != 'INVALID_NAME')
            record.setCurrentLineItemValue('expense', 'location', locId);
    }

    /* check for Coupa order line */
    if (nlapiSelectValue(invoiceline, 'order-header-num')
            && nlapiSelectValue(invoiceline, 'order-line-num')) {
        var poheadernum = nlapiSelectValue(invoiceline, 'order-header-num');
        var polinenum = nlapiSelectValue(invoiceline, 'order-line-num');
        record.setCurrentLineItemValue('expense', 'custcol_coupaponum',
                poheadernum + '-' + polinenum);
    }

    record.setCurrentLineItemValue('expense', 'amount', parseFloat(linecharge));

    if (isSplit)
        record.setCurrentLineItemValue('expense', 'memo',
                'Header Charges for Split line: '
                + nlapiSelectValue(invoiceline, 'description'));
    else
        record.setCurrentLineItemValue('expense', 'memo',
                'Header Charges for line: '
                + nlapiSelectValue(invoiceline, 'description'));

    record.setCurrentLineItemValue('expense', 'isbillable', 'T');

    // check for custom fields on line level
    if (context.getSetting('SCRIPT',
            'custscript_customfield_line_count')) {
        for (var y = 1; y <= context.getSetting('SCRIPT',
                'custscript_customfield_line_count'); y++) {
            if (context.getSetting('SCRIPT',
                    'custscript_custfieldline' + y)) {
                var custfield;
                var valuetoinsert = null;
                var textOrValue;
                if (context.getSetting('SCRIPT',
                        'custscript_custfieldline' + y).split(':')) {
                    custfield = context.getSetting('SCRIPT',
                            'custscript_custfieldline' + y).split(':');

                    if (custfield[4]) {
                        valuetoinsert = custfield[4];
                        nlapiLogExecution('DEBUG', 'Valuetoinsert = ',
                                valuetoinsert);
                    }

                    else {

                        if (nlapiSelectValue(invoiceline, custfield[0]))
                            valuetoinsert = nlapiSelectValue(invoiceline,
                                    custfield[0]);

                        nlapiLogExecution('DEBUG', 'Line Custom ' + y,
                                'Coupa field = '
                                + nlapiSelectValue(invoiceline,
                                        custfield[0])
                                + ' ValuetoInsert = ' + valuetoinsert);

                        if (custfield[2]
                                && nlapiSelectValue(invoiceline, custfield[0])) {
                            if (custfield[2] == 'Date') {
                                valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                        invoiceline, custfield[0]));
                                nlapiLogExecution('DEBUG',
                                        'Line Custom Inside coupatype = date'
                                        + y, 'Coupa field = '
                                        + nlapiSelectValue(invoiceline,
                                                custfield[0])
                                        + ' ValuetoInsert = '
                                        + valuetoinsert);
                            }

                            if (custfield[2] == 'Lookup') {

                                valuetoinsert = nlapiSelectValue(invoiceline,
                                        custfield[0] + '/external-ref-num');
                                nlapiLogExecution('DEBUG',
                                        'Line Custom Inside coupatype = lookup'
                                        + y, 'Coupa field = '
                                        + nlapiSelectValue(invoiceline,
                                                custfield[0])
                                        + ' ValuetoInsert = '
                                        + valuetoinsert);
                            }

                        }

                    }

                    textOrValue = 'Text';
                    if (custfield[3]) {
                        textOrValue = custfield[3];
                    }

                    nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y,
                            " custfield0 = " + custfield[0] + " custfield1 = "
                            + custfield[1] + " custfield2 = "
                            + custfield[2] + " custfield3 = "
                            + custfield[3] + " valuetoinsert = "
                            + valuetoinsert);

                    if (valuetoinsert != null && valuetoinsert != undefined
                            && valuetoinsert != 'None') {

                        if (textOrValue == 'Text')
                            record.setCurrentLineItemText('expense',
                                    custfield[1], valuetoinsert);
                        else
                            record.setCurrentLineItemValue('expense',
                                    custfield[1], valuetoinsert);
                    }
                }
            }
        }
    }
    record.commitLineItem('expense');
}

function errorMsg(invoiceNumber, supplier, documentType, error)
{
    var type;
    if(documentType === 'vendorbill')
    {
        type = 'Vendor Bill';
    }
    else if(documentType === 'vendorcredit')
    {
        type = 'Vendor Credit';
    }
    failedInvoices++; 
    var report = 'Processing Error - Unable to create ' + type + '; Invoice number = '+ invoiceNumber + '; Supplier name = ' + supplier + '; Error = '+ error;
    nlapiLogExecution('Error', 'Error', report);
    message = '\n\r' + message + '\n\r' + report;
}
