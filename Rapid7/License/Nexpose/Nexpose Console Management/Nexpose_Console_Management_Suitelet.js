/*
 * @author efagone
 */

var objValidFamilies = {
    '1': { //Nexpose Enterprise
        'item_family': 1,
        'valid_order_types': ['1'],
        'sku': 2865, //NXENTALL Group SKU
        'renewal_sku_history': [1369, 6319],
        'renewal_sku_content': 3299,
        'renewal_sku_name': 'RNXENTALL',
        'renewal_sku': 6319, //RNXENTALL Group SKU
        'renewal_console_sku': 6321 //RNXENTALLCONS Group SKU
    },
    '36': { //Nexpose Enterprise Term
        'item_family': 36,
        'valid_order_types': ['1'],
        'sku': 6172, //NXENTALLTERM Group SKU
        'renewal_sku_history': [2055, 6325],
        'renewal_sku_content': 3313,
        'renewal_sku_name': 'RNXENTALLTERM',
        'renewal_sku': 6325, //RNXENTALLTERM Group SKU
        'renewal_console_sku': 6323 //RNXENTALLCONS-TERM Group SKU
    },
    '37': { //InsightVM
        'item_family': 37,
        'valid_order_types': ['1'],
        'sku': 2710, //IVM
        'renewal_sku_history': [2192, 3144],
        'renewal_sku_content': '', // No content for IVM
        'renewal_sku_name': 'RIVM',
        'renewal_sku': 3144, //RIVM
        'renewal_console_sku': 3146 //RIVMCONS
    },
    '46': { //One-InsightVM
        'item_family': 46,
        'valid_order_types': ['1'],
        'sku': 7883, //IVM
        'renewal_sku_history': [2192, 3144],
        'renewal_sku_content': '', // No content for IVM
        'renewal_sku_name': 'IVM-SUB',
        'renewal_sku': 7883, //IVM-SUB
        'renewal_console_sku': 7883 //IVM-SUB
    },
    '52': { //One-NexposeSub
        'item_family': 52,
        'valid_order_types': ['1'],
        'sku': 7555, //NXP-SUB
        'renewal_sku_history': [1369, 6319],
        'renewal_sku_content': '', // No content for NXP-SUB
        'renewal_sku_name': 'NXP-SUB',
        'renewal_sku': 7555, //NXP-SUB
        'renewal_console_sku': 7555 //NXP-SUB
    },
};
var objActiveFamily = null;
function zc_nexpose_console_management_suitelet(request, response) {

    var licId = null;
    try {
        if (request.getMethod() == 'GET') {

            licId = request.getParameter('custparam_licid');

            if (licId != null && licId != '') {

                var arrLicenses = getLicenseDetails(licId);
                licId = arrLicenses[0].internalid || licId;

                if (arrLicenses == null || arrLicenses.length <= 0) {
                    throw nlapiCreateError('NULL_LICENSE', 'Something went wrong. Could not determine license.', true);
                }

                objActiveFamily = objValidFamilies[(arrLicenses[0].item_family || '').toString()];
                if (!objActiveFamily || objActiveFamily.valid_order_types.indexOf(arrLicenses[0].ordertype) == -1) {
                    throw nlapiCreateError('UNQUALIFIED', 'This license does not qualify for additional consoles.', true);
                }
                nlapiLogExecution('DEBUG', 'arrLicenses[0].item_family', arrLicenses[0].item_family);
                if (["46", "52"].indexOf(arrLicenses[0].item_family) == -1) {
                    nlapiLogExecution('DEBUG', 'checking for renewal opp. Should not happen for one-ivm or one-nxp')
                    findRenewalOppId(arrLicenses[0].productkey); // this will validate that there 1) is an opp and 2) there is only 1 opp
                }

                var form = nlapiCreateForm('License Migration Suitelet', false);
                form.setScript('customscriptr7nxconsolemng_suitelet_cs');

                form.addField('custpage_customer', 'select', 'Customer', 'customer').setDisplayType('inline');
                form.addField('custpage_masterlicid', 'select', 'Master License', 'customrecordr7nexposelicensing').setDisplayType('inline');
                form.addField('custpage_maxfmrenddate', 'date').setDisplayType('hidden');
                form.addField('custpage_masterliccontact', 'select', 'Contact', 'contact').setDisplayType('hidden');
                form.addField('custpage_masterlicproductkey', 'text').setDisplayType('hidden');
                form.addField('custpage_licenseitemfamily', 'text').setDisplayType('hidden');
                form.addField('custpage_totalips', 'integer', 'Purchased IPs').setDisplayType('inline');
                form.addField('custpage_totalhips', 'integer', 'Purchased Hosted IPs').setDisplayType('inline');



                form.getField('custpage_customer').setDefaultValue(arrLicenses[0].customer_id);
                form.getField('custpage_maxfmrenddate').setDefaultValue(arrLicenses[0].enddate);
                form.getField('custpage_totalips').setDefaultValue(arrLicenses[0].paid_ips);
                form.getField('custpage_totalhips').setDefaultValue(arrLicenses[0].paid_hosted_ips);
                form.getField('custpage_masterliccontact').setDefaultValue(arrLicenses[0].contact_id);
                form.getField('custpage_masterlicproductkey').setDefaultValue(arrLicenses[0].productkey);
                form.getField('custpage_masterlicid').setDefaultValue(licId);
                form.getField('custpage_licenseitemfamily').setDefaultValue(arrLicenses[0].item_family);


                //creating list objects
                var lineItemList = form.addSubList('custpage_licenselist', 'inlineeditor', 'Nexpose Consoles');
                lineItemList.addField('custpageliclst_ismaster', 'checkbox', 'Master').setDisplayType('disabled');
                lineItemList.addField('custpageliclst_license', 'select', 'License', 'customrecordr7nexposelicensing').setDisplayType('hidden');
                lineItemList.addField('custpageliclst_license_txt', 'text', 'License').setDisplayType('disabled');
                lineItemList.addField('custpageliclst_licensekey', 'text', 'Product Key').setDisplayType('disabled');
                lineItemList.addField('custpageliclst_numberips_orig', 'integer').setDisplayType('hidden');
                lineItemList.addField('custpageliclst_numberips', 'integer', 'Number of IPs');
                lineItemList.addField('custpageliclst_numberips_delta', 'integer', 'IP Change').setDisplayType('hidden');
                lineItemList.addField('custpageliclst_numberhips_orig', 'integer').setDisplayType('hidden');
                lineItemList.addField('custpageliclst_numberhips', 'integer', 'Number of Hosted IPs');
                lineItemList.addField('custpageliclst_numberhips_delta', 'integer', 'Hosted IP Change').setDisplayType('hidden');
                lineItemList.addField('custpageliclst_contact', 'select', 'Contact');
                lineItemList.addField('custpageliclst_renewwithparent', 'checkbox', 'Renew w/ Parent').setDisplayType('disabled');

                lineItemList.getField('custpageliclst_numberips').setMandatory(true);
                lineItemList.getField('custpageliclst_numberhips').setMandatory(true);
                lineItemList.getField('custpageliclst_contact').setMandatory(true);

                sourceContacts(arrLicenses[0].customer_id, lineItemList.getField('custpageliclst_contact'));

                for (var i = 0, j = 1; arrLicenses != null && i < arrLicenses.length; i++ , j++) {
                    var objLicense = arrLicenses[i];

                    lineItemList.setLineItemValue('custpageliclst_ismaster', j, objLicense.isparent);
                    lineItemList.setLineItemValue('custpageliclst_license', j, objLicense.internalid);
                    lineItemList.setLineItemValue('custpageliclst_license_txt', j, objLicense.name);
                    lineItemList.setLineItemValue('custpageliclst_licensekey', j, objLicense.productkey);
                    lineItemList.setLineItemValue('custpageliclst_contact', j, objLicense.contact_id);
                    lineItemList.setLineItemValue('custpageliclst_numberips_orig', j, objLicense.ips || '0');
                    lineItemList.setLineItemValue('custpageliclst_numberips', j, objLicense.ips || '0');
                    lineItemList.setLineItemValue('custpageliclst_numberips_delta', j, '0');
                    lineItemList.setLineItemValue('custpageliclst_numberhips_orig', j, objLicense.hosted_ips || '0');
                    lineItemList.setLineItemValue('custpageliclst_numberhips', j, objLicense.hosted_ips || '0');
                    lineItemList.setLineItemValue('custpageliclst_numberhips_delta', j, '0');
                    lineItemList.setLineItemValue('custpageliclst_renewwithparent', j, objLicense.renewwithparent);



                }

                form.addSubmitButton('Submit');
                response.writePage(form);
            }

        }
    }
    catch (e) {
        throw nlapiCreateError('UNEXPECTED_ERROR', e, true);
    }
    if (request.getMethod() == 'POST') {

        var itemFamily = request.getParameter('custpage_licenseitemfamily');
        var masterLicenseId = request.getParameter('custpage_masterlicid');
        var masterLicenseProductKey = request.getParameter('custpage_masterlicproductkey');
        var totalIPs = request.getParameter('custpage_totalips');
        var totalHIPs = request.getParameter('custpage_totalhips');


        objActiveFamily = objValidFamilies[itemFamily];
        if (!objActiveFamily) {
            throw nlapiCreateError('UNQUALIFIED', 'This license does not qualify for additional consoles.', true);
        }
        if (itemFamily != "46" && itemFamily != "52") {
            var renewalOppId = findRenewalOppId(masterLicenseProductKey);
        }
        var maxFMREnddate = request.getParameter('custpage_maxfmrenddate');

        var lineItemCount = request.getLineItemCount('custpage_licenselist');
        if (lineItemCount > 3) {
            //throw nlapiCreateError('CONSOLE_LIMIT', 'Too many consoles. Please contact your administrator.', true);
        }

        var arrNewConsolesToAddToOpp = [];
        for (var i = 1; i <= lineItemCount; i++) {

            var licenseId = request.getLineItemValue('custpage_licenselist', 'custpageliclst_license', i);
            var productkey = request.getLineItemValue('custpage_licenselist', 'custpageliclst_licensekey', i);
            var contactId = request.getLineItemValue('custpage_licenselist', 'custpageliclst_contact', i);
            var prevIPs = request.getLineItemValue('custpage_licenselist', 'custpageliclst_numberips_orig', i) || 0;
            var newIPs = request.getLineItemValue('custpage_licenselist', 'custpageliclst_numberips', i) || 0;
            var prevHIPs = request.getLineItemValue('custpage_licenselist', 'custpageliclst_numberhips_orig', i) || 0;
            var newHIPs = request.getLineItemValue('custpage_licenselist', 'custpageliclst_numberhips', i) || 0;

            var deltaIPs = parseInt(newIPs) - parseInt(prevIPs);
            var deltaHIPs = parseInt(newHIPs) - parseInt(prevHIPs);

            if (licenseId != null && licenseId != '') {

                createFMR(4, deltaIPs.toFixed(0), maxFMREnddate, productkey, licenseId);
                createFMR(5, deltaHIPs.toFixed(0), maxFMREnddate, productkey, licenseId);

                var recLicense = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
                var currentContact = recLicense.getFieldValue('custrecordr7nxlicensecontact');
                if (currentContact != contactId) {
                    recLicense.setFieldValue('custrecordr7nxlicensecontact', contactId);
                    nlapiSubmitRecord(recLicense);
                }

                processEverything(recLicense);

            }
            else
            if (parseInt(newIPs) > 0 || parseInt(newHIPs) > 0) { //need to create new license
                var objResult = createNewACRLicense(masterLicenseId, masterLicenseProductKey, newIPs, newHIPs, contactId);

                if (objResult.success) {
                    createFMR(4, (deltaIPs - parseInt(totalIPs)).toFixed(0), maxFMREnddate, objResult.productkey, objResult.id);
                    createFMR(5, (deltaHIPs - parseInt(totalHIPs)).toFixed(0), maxFMREnddate, objResult.productkey, objResult.id);

                    arrNewConsolesToAddToOpp.push({
                        master_productkey: masterLicenseProductKey,
                        productkey: objResult.productkey,
                        contact_id: contactId
                    });
                }
            }

        }
        if (arrNewConsolesToAddToOpp && arrNewConsolesToAddToOpp.length > 0 && (itemFamily != 46 && itemFamily != 52)) {

            var recOpp = nlapiLoadRecord('opportunity', renewalOppId, {
                recordmode: 'dynamic'
            });

            for (var i = 1; i <= recOpp.getLineItemCount('item') && arrNewConsolesToAddToOpp.length > 0; i++) {

                var item = recOpp.getLineItemValue('item', 'item', i);
                var productkey = recOpp.getLineItemValue('item', 'custcolr7itemmsproductkey', i);

                if ((objActiveFamily.renewal_sku_history.indexOf(parseInt(item)) != -1 && objActiveFamily.renewal_sku_history.indexOf((item || '').toString()) != -1)
                    || objActiveFamily.renewal_sku_content == parseInt(item)) {

                    for (var j = 0; arrNewConsolesToAddToOpp && j < arrNewConsolesToAddToOpp.length; j++) {

                        if (arrNewConsolesToAddToOpp[j].master_productkey == productkey) {
                            var index = recOpp.getLineItemCount('item');
                            index++;

                            recOpp.insertLineItem('item', index);
                            recOpp.selectLineItem('item', index);
                            recOpp.setCurrentLineItemValue('item', 'item', objActiveFamily.renewal_console_sku);
                            recOpp.setCurrentLineItemValue('item', 'price', -1);
                            recOpp.setCurrentLineItemValue('item', 'quantity', 1);
                            recOpp.setCurrentLineItemValue('item', 'rate', 0);
                            recOpp.setCurrentLineItemValue('item', 'amount', 0);
                            recOpp.setCurrentLineItemValue('item', 'custcolr7itemmsproductkey', arrNewConsolesToAddToOpp[j].productkey);
                            recOpp.setCurrentLineItemValue('item', 'custcolr7startdate', recOpp.getLineItemValue('item', 'custcolr7startdate', i));
                            recOpp.setCurrentLineItemValue('item', 'custcolr7enddate', recOpp.getLineItemValue('item', 'custcolr7enddate', i));
                            recOpp.setCurrentLineItemValue('item', 'location', recOpp.getLineItemValue('item', 'location', i));
                            recOpp.setCurrentLineItemValue('item', 'custcolr7createdfromra', recOpp.getLineItemValue('item', 'custcolr7createdfromra', i));
                            recOpp.setCurrentLineItemValue('item', 'custcolr7translinecontact', arrNewConsolesToAddToOpp[j].contact_id);
                            recOpp.commitLineItem('item');

                            var lineItemCount = recOpp.getLineItemCount('item');
                            var updateColumns = false;
                            for (var y = index; y <= lineItemCount; y++) {
                                var lineItem = recOpp.getLineItemValue('item', 'item', y);
                                var lineType = recOpp.getLineItemValue('item', 'itemtype', y);
                                if (lineType == 'Group') {
                                    updateColumns = true;
                                    continue;
                                }
                                else if (lineType == 'EndGroup') {
                                    updateColumns = false;
                                    break;
                                }

                                if (updateColumns == true) {
                                    recOpp.setLineItemValue('item', 'custcolr7itemmsproductkey', y, arrNewConsolesToAddToOpp[j].productkey);
                                    recOpp.setLineItemValue('item', 'custcolr7startdate', y, recOpp.getLineItemValue('item', 'custcolr7startdate', i));
                                    recOpp.setLineItemValue('item', 'custcolr7enddate', y, recOpp.getLineItemValue('item', 'custcolr7enddate', i));
                                    recOpp.setLineItemValue('item', 'location', y, recOpp.getLineItemValue('item', 'location', i));
                                    recOpp.setLineItemValue('item', 'custcolr7createdfromra', y, recOpp.getLineItemValue('item', 'custcolr7createdfromra', i));
                                    recOpp.setLineItemValue('item', 'custcolr7translinecontact', y, arrNewConsolesToAddToOpp[j].contact_id);
                                }
                            }
                            arrNewConsolesToAddToOpp.splice(j, 1);
                            j--;
                        }
                    }
                }
            }

            nlapiSubmitRecord(recOpp, true, true);
        }

        nlapiSetRedirectURL('RECORD', 'customrecordr7nexposelicensing', masterLicenseId, 'view');
        return;
    }

}

function createNewACRLicense(masterLicenseId, masterLicenseProductKey, newIPs, newHIPs, contactId) {

    var newRecord = nlapiCopyRecord('customrecordr7nexposelicensing', masterLicenseId);

    // Null out any necessary fields
    var fieldsToEmpty = nlapiLookupField('customrecordr7acrproducttype', 1, 'custrecordr7acrfieldidstoempty');

    if (fieldsToEmpty != null && fieldsToEmpty != '' && fieldsToEmpty != 'undefined') {
        var arrFieldsToEmpty = fieldsToEmpty.split(',');
        for (var i = 0; i < arrFieldsToEmpty.length; i++) {
            newRecord.setFieldValue(arrFieldsToEmpty[i], '');
        }
    }

    newRecord.setFieldValue('custrecordr7nxlicensefeaturemgmntcreated', 'T');
    newRecord.setFieldValue('custrecordr7nxlicense_parentlicense', masterLicenseId);
    newRecord.setFieldValue('custrecordr7nxlicensecontact', contactId);
    newRecord.setFieldValue('custrecordr7nxlicensenumberips', newIPs);
    newRecord.setFieldValue('custrecordr7nxlicensenumberhostedips', newHIPs);

    //for parent license with one-insightvm item family, create child console with insightvm item family
    if (newRecord.getFieldValue('custrecordcustrecordr7nxlicenseitemfamil') == '46') {
        newRecord.setFieldValue('custrecordcustrecordr7nxlicenseitemfamil', '37');
    }

    //for parent license with one-nexposesub item family, create child console with nexpose enterprise item family
    if (newRecord.getFieldValue('custrecordcustrecordr7nxlicenseitemfamil') == '52') {
        newRecord.setFieldValue('custrecordcustrecordr7nxlicenseitemfamil', '1');
    }

    //default free child consoles to renew with parent
    newRecord.setFieldValue('custrecordr7nxrenewwithparent', 'T');

    try {
        var id = nlapiSubmitRecord(newRecord);

        var newLicenseFields = nlapiLookupField('customrecordr7nexposelicensing', id, ['name', 'custrecordr7nxproductkey', 'custrecordr7nxlicenseexpirationdate']);

        var objNewLic = {
            id: id,
            productkey: newLicenseFields['custrecordr7nxproductkey'],
            expirationDate: newLicenseFields['custrecordr7nxlicenseexpirationdate'],
            parentId: masterLicenseId,
            parentProductKey: masterLicenseProductKey
        };

        copyCurrentAndFutureFMRs(objNewLic);

        return {
            success: true,
            error: '',
            id: objNewLic.id,
            productkey: objNewLic.productkey,
            expirationDate: objNewLic.expirationDate
        };

    }
    catch (e) {
        logError('Error createNewACRLicense - license: ' + masterLicenseId, e);
        return {
            success: false,
            error: e
        };
    }

}

function copyCurrentAndFutureFMRs(objNewLic) {

    var arrFilters = [];
    arrFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
    arrFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', objNewLic.parentProductKey);
    arrFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
    arrFilters[3] = new nlobjSearchFilter('custrecordr7licfeature_adjustment', null, 'is', 'F');
    arrFilters[4] = new nlobjSearchFilter('custrecordr7licfmfeature.name', null, 'doesnotstartwith', 'NX: Dedicated Hosted Engine');


    var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters);

    for (var i = 0; arrResults != null && i < arrResults.length; i++) {
        try {

            var newRecord = nlapiCopyRecord('customrecordr7licensefeaturemanagement', arrResults[i].getId());
            newRecord.setFieldValue('custrecordr7licfmproductkey', objNewLic.productkey);
            newRecord.setFieldValue('custrecordr7licfmlicense', objNewLic.id);
            newRecord.setFieldValue('custrecordr7licfmnexposelicense', objNewLic.id);

            //NX: Item Family check (Change One-InsightVM to InsightVM)
            if (newRecord.getFieldValue('custrecordr7licfmfeature') == '61') {
                if (newRecord.getFieldValue('custrecordr7licfmvalue') == '46') {
                    newRecord.setFieldValue('custrecordr7licfmvalue', '37')
                }
            }

            var id = nlapiSubmitRecord(newRecord);

            nlapiLogExecution('DEBUG', 'Copying FMR', 'New FMR ID: ' + id);
        }
        catch (e) {
            logError('Error copyCurrentAndFutureFMRs - license: ' + objNewLic.parentId, e);
        }
    }
}

function createFMR(addOnId, fieldValue, endDate, productkey, licenseId) {

    var createAddOn = false;

    var fieldType = nlapiLookupField('customrecordr7acladdoncomponents', addOnId, 'custrecordr7acladdon_fieldtype');

    if ((fieldType == 'date' || fieldType == 'integer') && (fieldValue != null && fieldValue != '' && fieldValue != 0)) {
        createAddOn = true;
    }
    else
    if (fieldType == 'checkbox' && fieldValue == 'T') {
        createAddOn = true;
    }
    else
    if (fieldType == 'select') {
        createAddOn = true;
    }

    if (fieldType == 'date') {
        fieldValue = endDate;
    }

    if (createAddOn) {
        nlapiLogExecution('DEBUG', 'Creating FMR', addOnId);
        var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
        newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
        newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
        newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
        newFMRRecord.setFieldValue('custrecordr7licfmenddate', endDate);
        newFMRRecord.setFieldValue('custrecordr7licfmproductkey', productkey);
        newFMRRecord.setFieldValue('custrecordr7licfmnexposelicense', licenseId);
        newFMRRecord.setFieldValue('custrecordr7licfmstatus', 2); // ValueId for List (2) is 'In Queue'
        newFMRRecord.setFieldValue('custrecordr7licfeature_adjustment', 'T');
        newFMRRecord.setFieldValue('custrecordr7licfmgrace', 'F');

        try {
            nlapiSubmitRecord(newFMRRecord);
        }
        catch (e) {
            logError('Could not create built-in FMR from nx console management AddOnId: ' + addOnId, e);
        }

        return true;
    }

    return false;
}

function getLicenseDetails(licenseId) {

    if (licenseId == null || licenseId == '') {
        return null;
    }

    var parentId = nlapiLookupField('customrecordr7nexposelicensing', licenseId, 'custrecordr7nxlicense_parentlicense');

    if (parentId != null && parentId != '') {
        licenseId = parentId;
    }

    var arrFilters = [];
    arrFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', licenseId);
    arrFilters[0].setOr(true);
    arrFilters[1] = new nlobjSearchFilter('custrecordr7nxlicense_parentlicense', null, 'anyof', licenseId);


    var arrColumns = [];
    arrColumns[0] = new nlobjSearchColumn('internalid');
    arrColumns[1] = new nlobjSearchColumn('custrecordr7nxlicenseexpirationdate');
    arrColumns[2] = new nlobjSearchColumn('name');
    arrColumns[3] = new nlobjSearchColumn('custrecordr7nxproductkey');
    arrColumns[4] = new nlobjSearchColumn('custrecordr7nxordertype');
    arrColumns[5] = new nlobjSearchColumn('custrecordr7nxlicensenumberips');
    arrColumns[6] = new nlobjSearchColumn('custrecordr7nxlicensesalesorder');
    arrColumns[7] = new nlobjSearchColumn('custrecordr7nxlicense_parentlicense');
    arrColumns[8] = new nlobjSearchColumn('custrecordr7nxlicensecustomer');
    arrColumns[9] = new nlobjSearchColumn('custrecordr7nxlicensecontact');
    arrColumns[10] = new nlobjSearchColumn('isinactive', 'custrecordr7nxlicensecontact');
    arrColumns[11] = new nlobjSearchColumn('custrecordcustrecordr7nxlicenseitemfamil');
    arrColumns[12] = new nlobjSearchColumn('custrecordr7nxordertype');
    arrColumns[13] = new nlobjSearchColumn('custrecordr7nxrenewwithparent');


    var arrResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrFilters, arrColumns);

    var arrLicenses = [];
    for (var i = 0; arrResults != null && i < arrResults.length; i++) {

        arrLicenses.push({
            isparent: (arrResults[i].getValue(arrColumns[7]) == null || arrResults[i].getValue(arrColumns[7]) == '') ? 'T' : 'F',
            internalid: arrResults[i].getValue(arrColumns[0]),
            expiration: arrResults[i].getValue(arrColumns[1]),
            name: arrResults[i].getValue(arrColumns[2]),
            productkey: arrResults[i].getValue(arrColumns[3]),
            type: arrResults[i].getValue(arrColumns[4]),
            number_ips: arrResults[i].getValue(arrColumns[5]),
            salesorder_id: arrResults[i].getValue(arrColumns[6]),
            parent_id: arrResults[i].getValue(arrColumns[7]),
            customer_id: arrResults[i].getValue(arrColumns[8]),
            contact_id: (arrResults[i].getValue(arrColumns[10]) != 'T') ? arrResults[i].getValue(arrColumns[9]) : '',
            item_family: arrResults[i].getValue(arrColumns[11]),
            ordertype: arrResults[i].getValue(arrColumns[12]),
            renewwithparent: arrResults[i].getValue(arrColumns[13]),
        });

    }

    arrLicenses = addActivePaidIPs(arrLicenses);
    arrLicenses = arrLicenses.sort(myCustomSort);

    return arrLicenses;
}

function addActivePaidIPs(arrLicenses) {

    if (arrLicenses == null || arrLicenses == '') {
        return arrLicenses;
    }

    var arrIds = [];
    for (var i = 0; i < arrLicenses.length; i++) {
        arrIds.push(arrLicenses[i].internalid);
    }

    var newSearch = nlapiLoadSearch(null, 18170);
    var columns = newSearch.getColumns();

    newSearch.addFilter(new nlobjSearchFilter('internalid', 'custrecordr7licfmnexposelicense', 'anyof', arrIds));

    var resultSet = newSearch.runSearch();

    var resultSlice = resultSet.getResults(0, 100);
    var objLicMap = {};
    for (var rs in resultSlice) {

        var id = resultSlice[rs].getValue(columns[0]);

        objLicMap[id] = {
            paid_ips: resultSlice[rs].getValue(columns[1]) || '0',
            ips: resultSlice[rs].getValue(columns[2]) || '0',
            paid_hosted_ips: resultSlice[rs].getValue(columns[3]) || '0',
            hosted_ips: resultSlice[rs].getValue(columns[4]) || '0',
            startdate: resultSlice[rs].getValue(columns[5]),
            enddate: resultSlice[rs].getValue(columns[6])
        };
    }

    for (var i = 0; i < arrLicenses.length; i++) {
        arrLicenses[i].paid_ips = (objLicMap.hasOwnProperty(arrLicenses[i].internalid)) ? objLicMap[arrLicenses[i].internalid].paid_ips : '0';
        arrLicenses[i].ips = (objLicMap.hasOwnProperty(arrLicenses[i].internalid)) ? objLicMap[arrLicenses[i].internalid].ips : '0';
        arrLicenses[i].paid_hosted_ips = (objLicMap.hasOwnProperty(arrLicenses[i].internalid)) ? objLicMap[arrLicenses[i].internalid].paid_hosted_ips : '0';
        arrLicenses[i].hosted_ips = (objLicMap.hasOwnProperty(arrLicenses[i].internalid)) ? objLicMap[arrLicenses[i].internalid].hosted_ips : '0';
        arrLicenses[i].startdate = (objLicMap.hasOwnProperty(arrLicenses[i].internalid)) ? objLicMap[arrLicenses[i].internalid].startdate : '';
        arrLicenses[i].enddate = (objLicMap.hasOwnProperty(arrLicenses[i].internalid)) ? objLicMap[arrLicenses[i].internalid].enddate : '';
    }

    return arrLicenses;
}

function sourceContacts(customerId, fld) {

    fld.addSelectOption('', '');

    var arrFilters = [];
    arrFilters[0] = new nlobjSearchFilter('company', null, 'is', customerId);
    arrFilters[1] = new nlobjSearchFilter('email', null, 'isnotempty');
    arrFilters[2] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

    var arrColumns = [];
    arrColumns[0] = new nlobjSearchColumn('entityid');
    arrColumns[1] = new nlobjSearchColumn('email');

    var arrResults = nlapiSearchRecord('contact', null, arrFilters, arrColumns);

    for (var i = 0; arrResults != null && i < arrResults.length; i++) {

        var searchResult = arrResults[i];
        var contactId = searchResult.getId();
        var contactName = searchResult.getValue(arrColumns[0]);

        fld.addSelectOption(contactId, contactName);

    }

}

function findRenewalOppId(productkey) {

    if (objActiveFamily.renewal_sku_content != '') {
        var filterExpression = [
            ["type","anyof","Opprtnty"], 
            "AND", 
            ["expectedclosedate","onorafter","today"], 
            "AND", 
            ["custcolr7itemmsproductkey","is",productkey], 
            "AND",
            ["item","anyof",objActiveFamily.renewal_sku_content],
            "AND", 
            [[["probability","greaterthan","0"],"AND",["probability","lessthan","100"]],"OR",["entitystatus","anyof","109"]]
         ];
    } else {
        var filterExpression = [
            ["type","anyof","Opprtnty"], 
            "AND", 
            ["expectedclosedate","onorafter","today"], 
            "AND", 
            ["custcolr7itemmsproductkey","is",productkey], 
            "AND", 
            [[["probability","greaterthan","0"],"AND",["probability","lessthan","100"]],"OR",["entitystatus","anyof","109"]]
         ];
    }

    var arrColumns = [];
    arrColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
    arrColumns[1] = new nlobjSearchColumn('expectedclosedate', null, 'max').setSort(true);

    var arrResults = nlapiSearchRecord('transaction', null, filterExpression, arrColumns);

    if (!arrResults || arrResults.length < 1) {
        throw nlapiCreateError('MISSING_OPPORTUNITY', 'Unable to find renewal opportunity containing ' + objActiveFamily.renewal_sku_name + '.', true);
    }

    if (arrResults.length > 1) {
        throw nlapiCreateError('MULTIPLE_OPPS', 'Multiple open opportunities were discovered with ' + objActiveFamily.renewal_sku_name + '. Please contact your administrator.', true);
    }

    return arrResults[0].getValue(arrColumns[0]);

}

function logError(name, error) {
    nlapiLogExecution('ERROR', name, error);
    nlapiSendEmail(55011, 55011, name, 'Error: ' + error);
}

function myCustomSort(a, b) {
    var licA = a.isparent;
    var licB = b.isparent;

    if (licA > licB) //sort string ascending
        return -1;
    if (licA < licB)
        return 1;
    return 0; //default return value (no sorting)
}