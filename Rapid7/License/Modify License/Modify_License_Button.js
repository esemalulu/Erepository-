/*
 * @author efagone
 */

function beforeLoad(type, form){

    var userId = nlapiGetUser();
    var roleId = nlapiGetRole();

    if (type == 'view') {
        form.setScript('customscript_windowopen_cs');

        //NEXPOSE
        if (nlapiGetRecordType() == 'customrecordr7nexposelicensing') {
            //add nx client script needed for below
            form.setScript('customscriptr7modifynxlicensesuitelet_cs');

            if (userHasPermission('manage_consoles_button')
                && (nlapiGetFieldValue('custrecordr7nxlicenseconsoleselfservice') === 'F'
                    || 	nlapiGetFieldValue('custrecordr7nxlicense_nosendserver') === 'T')) {

                if (['1', //Nexpose Enterprise
                    '36', //Nexpose Enterproise Term
                    '37', //InsightVM
                    '46', //One-InsightVM
                    '52'  //One-NexposeSub
                ].indexOf(nlapiGetFieldValue('custrecordcustrecordr7nxlicenseitemfamil')) != -1 && nlapiGetFieldValue('custrecordr7nxordertype') == 1) {
                    var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7nxconsolemng_suitelet', 'customdeployr7nxconsolemng_suitelet', false);
                    suiteletURL += '&custparam_licid=' + nlapiGetRecordId();
                    form.addButton('custpage_nxentallbtn', 'Manage Consoles', 'replaceWindow(\'' + suiteletURL + '\');');
                }
            }

            if (nlapiGetFieldValue('custrecordr7nxlicensefeaturemgmntcreated') == 'T' 
                && ((nlapiGetFieldValue('custrecordr7nxlicenseconsoleselfservice') === 'F'
                || 	nlapiGetFieldValue('custrecordr7nxlicense_nosendserver') === 'T') 
                || (nlapiGetFieldValue('custrecordr7nxlicenseconsoleselfservice') === 'T'
                && nlapiGetFieldValue('custrecordr7nxlicense_parentlicense') == null))) {

                //Modify/Reset License capability
                if (userHasPermission('modify_license_button_nexpose')) {
                    if (nlapiGetFieldValue('custrecordr7nxordertype') != 7) {

                        var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7modifylicense_suitelet', 'customdeployr7modifylicense_suitelet', false);
                        var url = suiteletURL + '&custparam_licenseid=' + nlapiGetRecordId();
                        form.addButton('custpage_modifynxlicense', 'Modify/Reset License', 'replaceWindow(\'' + url + '\');');
                    }
                }

                //expire button
                if (userHasPermission('expire_license_button_nexpose')) {
                    if (nlapiStringToDate(nlapiGetFieldValue('custrecordr7nxlicenseexpirationdate')) > new Date() && nlapiGetFieldValue('custrecordr7nxordertype') != 1 && (nlapiGetFieldValue('custrecordr7nxlicensesalesorder') == '' || nlapiGetFieldValue('custrecordr7nxlicensesalesorder') == null)) {
                        form.addButton('custpage_expirebutton', 'Expire License', 'expireLicense(\'' + nlapiGetFieldValue('custrecordr7nxproductkey') + '\')');
                    }
                }

                //suspend capability
                if (userHasPermission('suspend_license_button')) {
                    if (nlapiStringToDate(nlapiGetFieldValue('custrecordr7nxlicenseexpirationdate')) > new Date()) {
                        form.addButton('custpage_suspendbutton', 'Suspend License', 'suspendLicense(\'' + nlapiGetFieldValue('custrecordr7nxproductkey') + '\')');
                    }
                    else
                    if (isSuspended(nlapiGetFieldValue('custrecordr7nxproductkey'))) {
                        form.addButton('custpage_revivebutton', 'Revive License', 'reviveLicense(\'' + nlapiGetFieldValue('custrecordr7nxproductkey') + '\')');
                    }
                }
            }
        }
        //NEXPOSE


        //METASPLOIT
        if (nlapiGetRecordType() == 'customrecordr7metasploitlicensing') {
            //add ms client script needed for below
            form.setScript('customscriptr7modifymslicensesuitelet_cs');

            if (nlapiGetFieldValue('custrecordr7mslicensefeaturemgmntcreated') == 'T') {

                //Modify/Reset License capability
                if (userHasPermission('modify_license_button_metasploit')) {
                    var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7modifymslicense_suitelet', 'customdeployr7modifymslicense_suitelet', false);
                    var url = suiteletURL + '&custparam_licenseid=' + nlapiGetRecordId();
                    form.addButton('custpage_modifymslicense', 'Modify/Reset License', 'replaceWindow(\'' + url + '\');');
                }

                //expire button
                if (userHasPermission('expire_license_button_metasploit')) {
                    if (nlapiStringToDate(nlapiGetFieldValue('custrecordr7mslicenseexpirationdate')) > new Date() && (nlapiGetFieldValue('custrecordr7mslicensesalesorder') == '' || nlapiGetFieldValue('custrecordr7mslicensesalesorder') == null)) {
                        form.addButton('custpage_expirebutton', 'Expire License', 'expireMSLicense(\'' + nlapiGetFieldValue('custrecordr7msproductkey') + '\')');
                    }
                }

                //suspend capability
                if (userHasPermission('suspend_license_button')) {
                    if (nlapiStringToDate(nlapiGetFieldValue('custrecordr7mslicenseexpirationdate')) > new Date()) {
                        form.addButton('custpage_suspendbutton', 'Suspend License', 'suspendMSLicense(\'' + nlapiGetFieldValue('custrecordr7msproductkey') + '\')');
                    }
                    else
                    if (isSuspended(nlapiGetFieldValue('custrecordr7msproductkey'))) {
                        form.addButton('custpage_revivebutton', 'Revive License', 'reviveMSLicense(\'' + nlapiGetFieldValue('custrecordr7msproductkey') + '\')');
                    }
                }
            }
        }
        //METASPLOIT


    }
}

function isSuspended(productKey){

    if (productKey != null && productKey != '') {

        var arrSearchFilters = new Array();
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
        //arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'anyof', 7);

        var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);

        if (arrSearchResults != null && arrSearchResults.length > 0) {

            return true;
        }
    }

    return false;
}