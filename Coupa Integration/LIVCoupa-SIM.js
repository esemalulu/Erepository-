/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/* Fuzzy */


define(
    [ 'N/email', 'N/https', 'N/search', 'N/runtime', 'N/record', 'N/error',
        'N/xml', 'N/config' ],
    function(email, https, search, runtime, record, error, xml, config) {

        /**
         * Marks the beginning of the Map/Reduce process and generates input
         * data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
        function getInputData() {
            validate();
            var scriptRef = runtime.getCurrentScript();
            var coupa_url = scriptRef
                .getParameter('custscript_coupa_sim_url');
            var api_key = scriptRef
                .getParameter('custscript_coupa_sim_apikey');
            var error_emails_to = scriptRef
                .getParameter('custscript_coupa_sim_error_to');
            var error_emails_from = scriptRef
                .getParameter('custscript_coupa_sim_error_from');
            var thisEnv = runtime.envType;
            log.debug('environment',thisEnv);
            
            var url_test_contains = [ "-dev", "-dmo", "-demo", "-qa", "-sandbox", "-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat", "coupadev.com", "coupacloud.com" ];

                if (thisEnv != 'PRODUCTION') {
                    var test_url = false;
                    for (var i = 0; i < url_test_contains.length; i++) {
                        if (coupa_url.indexOf(url_test_contains[i]) > -1) {
                            test_url = true;
                        }
                    }
                    log.debug('test_url is',test_url);
                    if (!test_url) {
                        var errMsg = 'Error - script is running in non prod environment and not using a '
                        + url_test_contains
                        + ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
                        log.debug('BadEnv Debug',errMsg);
                        var error_hash = {
                            author : error_emails_from,
                            recipients : error_emails_to.split(","),
                            subject : 'NetSuite Coupa SIM Integration Error',
                            body : errMsg
                        };
                        email.send(error_hash);
                        throw errMsg;
                    }
                }

            var headers = {
                'Accept' : 'text/xml',
                'X-COUPA-API-KEY' : api_key
            };

            var getUrl = coupa_url
                + '/api/supplier_information?status=approved&&exported=false';

            log.debug("Calling out to Coupa to retrieve SIM records",
                getUrl);

            try {
                var response = https.get({
                    url : getUrl,
                    headers : headers
                });
            } catch (e) {
                log
                    .error(
                        'Get InputData',
                        "Cannot connect to Coupa. This is most likely temporary. Check if your Coupa instance is accessible.\n\n please contact Coupa is this error happens multiple times in a row.");

                var error_body = "Cannot connect to Coupa. This is most likely temporary. Check if your Coupa instance is accessible.\n\n please contact Coupa is this error happens multiple times in a row.";

                var error_hash = {
                    author : error_emails_from,
                    recipients : error_emails_to.split(","),
                    subject : 'NetSuite Coupa SIM Integration Error',
                    body : error_body
                };
                email.send(error_hash);

                errorObj = error.create({
                    name : 'Coupa_Timeout',
                    message : 'Could not connect to Coupa',
                    notifyOff : false
                });
                throw errorObj;
            }

            if (response.code == 200) {
                // good response
                log.audit('Successfully retrieved SIM records',
                    'Successfully retrieved SIM records');
                var xmlResponse = xml.Parser.fromString({
                    text : response.body
                });
                var simNodes = xml.XPath.select({
                    node : xmlResponse,
                    xpath : 'supplier-information/supplier-information'
                });
                var documents = [];
                for (var i = 0; i < simNodes.length; i++) {
                    documents.push(xml.XPath.select({
                        node : simNodes[i],
                        xpath : 'id'
                    })[0].textContent);
                }

                return documents;
            } else if (response.code == 404) {
                log.audit('No SIM records to export', 'URL: ' + getUrl);
            } else {
                // bad response
                err = error.create({
                    name : 'COUPA_POST_ERROR',
                    message : 'Failed to Call to Coupa. Received code '
                    + response.code + ' with response: '
                    + response.body,
                    notifyOff : false
                });
                log
                    .error(
                        'Get InputData',
                        "Connected to Coupa, but did not get valid return code. Do you have the right API key? If it's 401 then you are not authorized because invalid API key. If it's 403 then API key does not have right permissions.");
                throw err;
            }

        }

        /**
         * Executes when the map entry point is triggered and applies to
         * each key/value pair.
         *
         * @param {MapSummary}
         *            context - Data collection containing the key/value
         *            pairs to process through the map stage
         * @since 2015.1
         */
        function map(context) {
            log.debug("Begin map step");
            log.debug("Coupa SIM record ID that will be processed: "
                + context.value,
                "Coupa SIM record ID that will be processed: "
                + context.value);

            var scriptRef = runtime.getCurrentScript();

            var coupa_url = scriptRef
                .getParameter('custscript_coupa_sim_url');
            var api_key = scriptRef
                .getParameter('custscript_coupa_sim_apikey');
            var default_coupa_sub = scriptRef
                .getParameter('custscript_coupa_sim_default_sub');
            var custom_coupa_sub = scriptRef
                .getParameter('custscript_coupa_sim_custom_sub');
            var vendor_custom_fields = scriptRef
                .getParameter('custscript_coupa_sim_vendor_mapping');
            var address_custom_fields = scriptRef
                .getParameter('custscript_coupa_sim_address_mapping');
            var bank_custom_fields = scriptRef
                .getParameter('custscript_coupa_sim_bank_mapping');
            var contact_custom_fields = scriptRef
                .getParameter('custscript_coupa_sim_contact_mapping');
            var error_emails_to = scriptRef
                .getParameter('custscript_coupa_sim_error_to');
            var error_emails_from = scriptRef
                .getParameter('custscript_coupa_sim_error_from');
            var vendor_include = scriptRef
                .getParameter('custscript_coupa_sim_vendor_include');
            var ns_payment_format = scriptRef
                .getParameter('custscript_coupa_sim_payment_format');
            var vendor_po_method_parameter = scriptRef
                .getParameter('custscript_coupa_po_method_parameter');
            var display_name_param = scriptRef
                .getParameter('custscript_coupa_sim_display_name');

            log.debug('before companyprefereces check');

            var companyInfo = config.load({
                type: config.Type.COMPANY_PREFERENCES
            });

            var phoneformat = companyInfo.getValue({
                fieldId: 'PHONEFORMAT'
            });
            var areaParens = false
            if (phoneformat == '123.456.7890') splitvalue = '.';
            if (phoneformat == '123 456 7890') splitvalue = ' ';
            if (phoneformat == '123-456-7890') splitvalue = '-';
            if (phoneformat == '(123) 456-7890'){
                splitvalue = '-';
                areaParens = true;
            }


            log.debug('after companyprefereces check');
            log.debug('phoneformat = ' + phoneformat + ' splitvalue = ' + splitvalue);

            var headers = {
                'Accept' : 'text/xml',
                'X-COUPA-API-KEY' : api_key
            };

            var getUrl = coupa_url + '/api/supplier_information/'
                + context.value;
            log.debug('Retrieve SIM record', getUrl);

            var response = https.get({
                url : getUrl,
                headers : headers
            });

            if (response.code == 200) {
                // good response
                log.audit('Retrieve SIM record',
                    "Successfully retrieved SIM record id "
                    + context.value);
            } else if (resonse.code == 404) {
                log.audit('Retrieve SIM record',
                    'Failure to retrieve SIM record id '
                    + context.value);
            } else {
                // bad response
                var err = error.create({
                    name : 'COUPA_POST_ERROR',
                    message : 'Failed to Call to Coupa. Received code '
                    + response.code + ' with response: '
                    + response.body
                });
                err.toString = function() {
                    return err.message;
                };
                throw err;
            }

            var xmlDocument = xml.Parser.fromString({
                text : response.body
            });

            var sim_records = xml.XPath.select({
                node : xmlDocument,
                xpath : 'supplier-information'
            });

            try {
                var ns_vendor_record;
                var c_supplier_id = getElementFromXML(sim_records[0],
                    'supplier-id');
                log.debug("Vendor Mapping",
                    'Beginning mapping for Coupa Supplier '
                    + c_supplier_id);
                var ns_vendor_id = returnNetSuiteVendorID(c_supplier_id);

                // If coupa supplier already has supplier number, the vendor
                // exists in NS. Load that vendor and update it.

                if (ns_vendor_id != null) {
                    log.debug("Vendor Mapping",
                        'UPDATE request. Coupa Supplier '
                        + c_supplier_id + ' is NS vendor '
                        + ns_vendor_id);
                    ns_vendor_record = record.load({
                        type : record.Type.VENDOR,
                        id : ns_vendor_id,
                        isDynamic : true
                    });
                } else {
                    log.debug("Vendor Mapping",
                        'CREATE request. Coupa supplier '
                        + c_supplier_id
                        + ' does not exist in NS');
                    ns_vendor_record = record.create({
                        type : record.Type.VENDOR,
                        isDynamic : true,
                    });
                }

                // base record
                var c_supp_name = getElementFromXML(sim_records[0], 'name');
                var c_supp_display_name = getElementFromXML(sim_records[0],
                    'display-name');
                var c_currency_id = getElementFromXML(sim_records[0],
                    'currency-id');
                var c_classification = getElementFromXML(sim_records[0],
                    'tax-classification');
                var c_tax_num = getElementFromXML(sim_records[0],
                    'federal-tax-num');
                var c_payment_term_code = getElementFromXMLXPath(
                    sim_records[0], 'payment-term/code');
                var c_organization_type = getElementFromXML(sim_records[0],
                    'organization-type');
                var c_website = getElementFromXML(sim_records[0], 'website');
                var c_taxcode_id = getElementFromXML(sim_records[0],
                    'tax-code-id');
                var c_po_email = getElementFromXML(sim_records[0],
                    'po-email');
                var c_po_method = getElementFromXML(sim_records[0],
                    'po-method');

                if (c_po_method == "email") {
                    c_po_method = 2;
                } else if (c_po_method == "cxml") {
                    c_po_method = 3;
                } else {
                    c_po_method = 1;
                }

                var ns_subsid = default_coupa_sub;

                try {
                    ns_subsid = getElementFromXMLXPath(sim_records[0],
                        custom_coupa_sub);
                } catch (e) {
                    log.debug("Vendor Mapping",
                        "Unable to find Subsidiary in Coupa");
                }

                var ns_payment_term_id = null;
                if (c_payment_term_code != null) {
                    var ns_payment_term_id = returnNetSuitePaymentTermID(c_payment_term_code);
                    if (ns_payment_term_id != null) {
                        log.debug("Vendor Mapping", 'Payment Term ID is: '
                            + ns_payment_term_id);
                    } else {
                        log.debug("Vendor Mapping",
                            'Payment Term ID not found in NS');
                    }
                }

                var vendorData = {
                    subsidiary : ns_subsid,
                    custentity_coupa_supplier_id : c_supplier_id,
                    // companyname: (c_supp_display_name == "") ?
                    // c_supp_name : c_supp_display_name,
                    companyname : c_supp_name,
                    taxidnum : c_tax_num,
                    url : c_website,
                    email : c_po_email,
                    terms : ns_payment_term_id

                };
                if (c_organization_type == 'Individual') {

                    try {
                        var contact_records = xml.XPath
                            .select({
                                node : sim_records[0],
                                xpath : 'supplier-information-contacts/supplier-information-contact'
                            });
                        var c_firstname = getElementFromXML(
                            contact_records[0], 'name-given');
                        var c_lastname = getElementFromXML(
                            contact_records[0], 'name-family');

                        log.debug("Vendor Mapping",
                            "Individual Supplier type: "
                            + c_organization_type
                            + ' with name: ' + c_firstname
                            + ' ' + c_lastname);
                        vendorData['isindividual'] = 'Individual';
                        vendorData['isperson'] = 'T'; // Radio Buttons are
                        // weird, and
                        // getSelectionOptions()
                        // needs to be
                        // called in debug
                        // to find the value
                        vendorData['firstname'] = c_firstname;
                        vendorData['lastname'] = c_lastname;
                    } catch (e) {
                        log
                            .error('Vendor Mapping',
                                'Error retrieving Individual Name, Individual status will not be set');
                    }
                } else {
                    log.debug("Venodr Mapping", "Oganization Type is: "
                        + c_organization_type);
                }

                try {
                    var contact_records = xml.XPath
                        .select({
                            node : sim_records[0],
                            xpath : 'supplier-information-contacts/supplier-information-contact'
                        });
                    var c_contact_workphone, c_contact_mobilephone, c_contact_faxphone = '';
                    var c = 0;
                    if  (areaParens == true) {
                        var work_country = getElementFromXMLXPath(contact_records[c],
                            'phone-work/country-code');
                        var work_number = getElementFromXMLXPath(contact_records[c],
                            'phone-work/number');
                        if (work_number!=null && work_number!=''){
                            c_contact_workphone = '('
                                + getElementFromXMLXPath(contact_records[c],
                                    'phone-work/area-code')
                                + ') '
                                + work_number.slice(0,3)
                                + splitvalue
                                + work_number.slice(3,7);
                        }
                        if (work_country != null && work_country != '') {
                            c_contact_workphone = '+'
                                + work_country
                                + ' '
                                + c_contact_workphone;
                        }

                        var mobile_country = getElementFromXMLXPath(contact_records[c],
                            'phone-mobile/country-code');

                        if (mobile_number!=null && mobile_number!=''){
                            var mobile_number = getElementFromXMLXPath(contact_records[c],
                                'phone-mobile/number');
                            c_contact_mobilephone = '('
                                + getElementFromXMLXPath(contact_records[c],
                                    'phone-mobile/area-code')
                                + ') '
                                + mobile_number.slice(0,3)
                                + splitvalue
                                + mobile_number.slice(3,7);
                        }
                        if (mobile_country != null && mobile_country != '') {
                            c_contact_mobilephone = '+'
                                + mobile_country
                                + ' '
                                + c_contact_mobilephone;
                        }

                        var fax_country = getElementFromXMLXPath(contact_records[c],
                            'phone-fax/country-code');

                        var fax_number = getElementFromXMLXPath(contact_records[c],
                            'phone-fax/number');
                        if (fax_number!= null && fax_number!=''){
                            c_contact_faxphone = '('
                                + getElementFromXMLXPath(contact_records[c],
                                    'phone-fax/area-code')
                                + ') '
                                + fax_number.slice(0,3)
                                + splitvalue
                                + fax_number.slice(3,7);
                        }
                        if (fax_country != null && fax_country != '') {
                            c_contact_faxphone = '+'
                                + fax_country
                                + ' '
                                + c_contact_faxphone;
                        }
                    } else {
                        var work_country = getElementFromXMLXPath(contact_records[c],
                            'phone-work/country-code');
                        var work_number = getElementFromXMLXPath(contact_records[c],
                            'phone-work/number');
                        if (work_number!=null && work_number!='') {
                            c_contact_workphone = getElementFromXMLXPath(contact_records[c],
                                'phone-work/area-code')
                                + splitvalue
                                + work_number.slice(0, 3)
                                + splitvalue
                                + work_number.slice(3, 7);
                        }
                        if (work_country != null && work_country != '') {
                            c_contact_workphone = '+'
                                + work_country
                                + ' '
                                + c_contact_workphone;
                        }

                        var mobile_country = getElementFromXMLXPath(contact_records[c],
                            'phone-mobile/country-code');

                        var mobile_number = getElementFromXMLXPath(contact_records[c],
                            'phone-mobile/number');
                        if (mobile_number!=null && mobile_number!=''){
                            c_contact_mobilephone = getElementFromXMLXPath(contact_records[c],
                                'phone-mobile/area-code')
                                + splitvalue
                                + mobile_number.slice(0,3)
                                + splitvalue
                                + mobile_number.slice(3,7);
                        }
                        if (mobile_country != null && mobile_country != '') {
                            c_contact_mobilephone = '+'
                                + mobile_country
                                + ' '
                                + c_contact_mobilephone;
                        }

                        var fax_country = getElementFromXMLXPath(contact_records[c],
                            'phone-fax/country-code');

                        var fax_number = getElementFromXMLXPath(contact_records[c],
                            'phone-fax/number');
                        if (fax_number!=null && fax_number!=''){
                            c_contact_faxphone = getElementFromXMLXPath(contact_records[c],
                                'phone-fax/area-code')
                                + splitvalue
                                + fax_number.slice(0,3)
                                + splitvalue
                                + fax_number.slice(3,7);
                        }
                        if (fax_country != null && fax_country != '') {
                            c_contact_faxphone = '+'
                                + fax_country
                                + ' '
                                + c_contact_faxphone;
                        }
                    }

                    vendorData['phone'] = (c_contact_workphone
                        .indexOf('undefined') == -1) ? c_contact_workphone
                        : "";
                    vendorData['mobilephone'] = (c_contact_mobilephone
                        .indexOf('undefined') == -1) ? c_contact_mobilephone
                        : "";
                    vendorData['fax'] = (c_contact_faxphone
                        .indexOf('undefined') == -1) ? c_contact_faxphone
                        : "";
                } catch (e) {
                    log
                        .error('Vendor Mapping',
                            'Error retrieving Contact Phone, no numbers will be set');
                }

                vendorData[vendor_include] = true;

                if (display_name_param == true) {
                    log.debug("Vendor Mapping",
                        "Display Name will be Company Name");
                    vendorData['companyname'] = (c_supp_display_name == "") ? c_supp_name
                        : c_supp_display_name;
                }

                if (vendor_po_method_parameter != null) {
                    vendorData[vendor_po_method_parameter] = c_po_method;
                }
                for ( var key in vendorData) {
                    if (vendorData.hasOwnProperty(key)) {
                        ns_vendor_record.setValue({
                            fieldId : key,
                            value : vendorData[key]
                        });
                    }
                }

                log.debug("Vendor Mapping",
                    "Begin custom field mapping (vendor)");
                var mappingData = getCustomFields(vendor_custom_fields,
                    sim_records[0], ns_vendor_record);
                log.debug("Vendor Mapping",
                    "Complete custom field mapping (vendor)");

                for ( var key in mappingData) {
                    if (mappingData.hasOwnProperty(key)) {
                        try {
                            ns_vendor_record.setValue({
                                fieldId : key,
                                value : mappingData[key]
                            });
                        } catch (e) {
                            log.debug('Failed to set custom field',
                                'Error setting custom field: ' + key
                                + ' with value '
                                + mappingData[key]
                                + '. Exception: ' + e);
                        }
                    }
                }

                log.debug("Vendor Mapping",
                    'About to save Vendor Record...');
                var ns_vendor_id = ns_vendor_record.save({
                    disabletriggers : true
                });
                log.audit("Vendor Mapping",
                    'Successfully created/updated NS vendor ID: '
                    + ns_vendor_id);

                var address_records = xml.XPath
                    .select({
                        node : sim_records[0],
                        xpath : 'supplier-information-addresses/supplier-information-address'
                    });

                  
                    
                log.debug("Address Mapping",
                    'Beginning address mapping Coupa Supplier '
                    + c_supplier_id + ", " + c_supp_name);
                /** SIM Addresses * */
                for (var a = 0; a < address_records.length; a++) {
                    var c_address_id = getElementFromXML(address_records[a], 'id');
                    /** logic for bank records * */
                    log.debug("Bank Record Mapping",
                        "Beginning bank mapping for Coupa Supplier "
                        + c_supp_name);
                    var address_type = getElementFromXML(
                        address_records[a], 'kind');
                    if (address_type == 'Primary') {
                        log.debug("Bank Record Mapping",
                            "This is Primary Address, so skipping bank record for address "
                            + c_address_id);
                        continue;
                    }
                    //log.debug("Address Mapping",'adress array :' + a +  address_records[a].OuterXml() );
                    log.debug("Bank Record Mapping",
                        "Beginning bank mapping for address "
                        + c_address_id);
                    var c_routing_number = getElementFromXML(
                        address_records[a], 'bank-routing-number');
                    var c_bank_acc_number = getElementFromXML(
                        address_records[a], 'bank-account-number');
                    var c_bank_acc_type = getElementFromXML(address_records[a], 'account-type-item');
                    var ns_bank_record;
                    if (scriptRef
                            .getParameter('custscript_coupa_sim_custom_bank') == null
                        || scriptRef
                            .getParameter('custscript_coupa_sim_custom_bank') == "") {

                        var ns_bank_id = returnNetSuiteBankID(c_address_id,
                            'customrecord_2663_entity_bank_details');

                        if (ns_bank_id != null) {
                            log.debug('Bank Record Mapping',
                                'UPDATE request. Coupa Address Bank '
                                + c_address_id + ' is NS bank '
                                + ns_bank_id);
                            ns_bank_record = record
                                .load({
                                    type : 'customrecord_2663_entity_bank_details',
                                    id : ns_bank_id,
                                    isDynamic : true
                                });
                        } else {
                            log.debug('Bank Record Mapping',
                                'CREATE request. Coupa address bank '
                                + c_address_id
                                + ' does not exist in NS');
                            ns_bank_record = record
                                .create({
                                    type : 'customrecord_2663_entity_bank_details',
                                    isDynamic : true
                                });
                        }

                        try {
                            var ns_payment_format_mapped = getElementFromXMLXPath(
                                sim_records[0], ns_payment_format);
                        } catch (e) {
                            log.error("Bank Record Mapping",
                                "ERROR: Cannot retrieve bank payment format ID from SIM record for "
                                + c_supp_name);
                            continue;
                        }
                        var bankData = {
                            custrecord_2663_entity_file_format : ns_payment_format_mapped,
                            custrecord_2663_parent_vendor : ns_vendor_id,
                            custrecord_2663_entity_acct_no : c_bank_acc_number,
                            custrecord_2663_entity_bank_no : c_routing_number,
                            custrecord_2663_acct_type : (c_bank_acc_type
                                .indexOf('Savings') == -1) ? 1
                                : 2,
                            // type: 'custrecordentry',
                            custrecord_2663_entity_bank_type : 1,
                            name: c_address_id,
                            externalid : "CoupaAddress_"
                                .concat(c_address_id)
                        };

                        for ( var key in bankData) {
                            if (bankData.hasOwnProperty(key)) {
                                try {
                                    ns_bank_record.setValue({
                                        fieldId : key,
                                        value : bankData[key]
                                    });
                                } catch (e) {
                                    log.debug("Bank Record Mapping",
                                        "Failed to map " + key
                                        + " with "
                                        + bankData[key]
                                        + ' error: ' + e);
                                }
                            }
                        }
                    } else {
                        // We have a value for custom bank record type
                        var bank_type = scriptRef
                            .getParameter('custscript_coupa_sim_custom_bank');

                        var ns_bank_id = returnNetSuiteBankID(c_address_id,
                            bank_type);

                        if (ns_bank_id != null) {
                            log.debug('Bank Record Mapping',
                                'UPDATE request for ' + bank_type
                                + '. Coupa Address Bank '
                                + c_address_id + ' is NS bank '
                                + ns_bank_id);
                            ns_bank_record = record.load({
                                type : bank_type,
                                id : ns_bank_id,
                                isDynamic : true
                            });
                        } else {
                            log.debug('Bank Record Mapping',
                                'CREATE request for ' + bank_type
                                + '. Coupa address bank '
                                + c_address_id
                                + ' does not exist in NS');
                            ns_bank_record = record.create({
                                type : bank_type,
                                isDynamic : true
                            });
                        }
                        if (bank_type == 'customrecord_pp_ach_account') {

                            var bankData = {
                                custrecord_pp_ach_entity : ns_vendor_id,
                                custrecord_pp_ach_account_number : c_bank_acc_number,
                                custrecord_pp_ach_routing_number : c_routing_number,
                                custrecord_pp_ach_is_primary : true, // always
                                // set
                                // the
                                // last
                                // bank
                                // record
                                // as
                                // primary
                                name : c_supp_name,
                                externalid : "CoupaAddress_"
                                    .concat(c_address_id)
                            };

                            for ( var key in bankData) {
                                if (bankData.hasOwnProperty(key)) {
                                    try {
                                        ns_bank_record.setValue({
                                            fieldId : key,
                                            value : bankData[key]
                                        });
                                    } catch (e) {
                                        log.debug("Bank Record Mapping",
                                            "Failed to map " + key
                                            + " with "
                                            + bankData[key]
                                            + ' error: ' + e);
                                    }
                                }
                            }
                        }
                    }
                    log.debug("Bank Record Mapping",
                        "Begin custom field mapping (bank)");
                    var mappingData = getCustomFields(bank_custom_fields,
                        address_records[a], ns_bank_record);
                    log.debug("Bank Record Mapping",
                        "Complete custom field mapping (bank)");
                    var bank_vendor_field = scriptRef.getParameter('custscript_coupa_sim_custom_vend');
                    if (bank_vendor_field != null && bank_vendor_field != ''){
                        mappingData[bank_vendor_field] = ns_vendor_id;
                    }

                    for ( var key in mappingData) {
                        if (mappingData.hasOwnProperty(key)) {
                            try {
                                ns_bank_record.setValue({
                                    fieldId : key,
                                    value : mappingData[key]
                                });

                            } catch (e) {
                                log.debug('Failed to set custom field',
                                    'Error setting custom field: '
                                    + key + ' with value '
                                    + mappingData[key]
                                    + '. Exception: ' + e);
                            }
                        }
                    }

                    log.debug('Bank Record Mapping',
                        'About to save Bank record...');
                    try {
                        var bank_record_id = ns_bank_record.save({
                            disabletriggers : true
                        });
                    } catch (e) {
                        log.debug('Bank Record Mapping',
                            'Failed to create/update NS bank record wiht Coupa ID '
                            + c_address_id
                            + ' for Coupa Supplier '
                            + c_supplier_id);
                        log.debug('Bank Record Mapping', 'Error: ' + e);
                        continue;
                    }
                    log.audit('Bank Record Mapping',
                        'Successfully created/updated NS bank record ID '
                        + bank_record_id
                        + ' for Coupa Supplier '
                        + c_supplier_id);

                    /** end logic for bank records * */

                } // end loop for addresses

                // reload ns_vendor_record so we can attach the contact,
                // address, and bank records to it
                ns_vendor_record = record.load({
                    type : record.Type.VENDOR,
                    id : ns_vendor_id,
                    isDynamic : true
                });
                log.debug("Address Mapping", 'FMT Vendor Update '
                    + c_supplier_id + ", " + c_supp_name);
                /** SIM Addresses * */
                for (var a = 0; a < address_records.length; a++) {
                    if (getElementFromXML(address_records[a], 'active') == "false") {
                        continue;
                    }
                    var defaultbilling = false;
                    var defaultshipping = false;
                    var address_type = getElementFromXML(
                        address_records[a], 'kind');
                    var last_updated = getElementFromXML(
                        address_records[a], 'kind');

                    if (address_type == 'Primary') {
                        ns_address_type = "primary";
                        defaultshipping = true;
                    } else if (address_type == "RTA") {
                        ns_address_type = 'RTA';
                        defaultbilling = true; // last remit to will be
                        // default remit to
                    } else {
                        continue;
                    }

                    log.debug("Address Mapping", 'Address type: '
                        + ns_address_type);

                    var c_address_name = getElementFromXML(
                        address_records[a], 'address-name');
                    var c_street_address1 = getElementFromXML(
                        address_records[a], 'street-address');
                    var c_street_address2 = getElementFromXML(
                        address_records[a], 'street-address2');
                    var c_post_code = getElementFromXML(address_records[a],
                        'postal-code');
                    var c_city = getElementFromXML(address_records[a],
                        'city');
                    var c_state = getElementFromXML(address_records[a],
                        'state-region');
					var c_country = getElementFromXMLXPath(address_records[a],'country/code');;
					
                    
                    var c_address_id = getElementFromXML(
                        address_records[a], 'id');

                    var lineNumber = ns_vendor_record
                        .findSublistLineWithValue({
                            sublistId : 'addressbook',
                            fieldId : 'label',
                            value : 'CoupaSimAddress'
                                .concat(c_address_id)
                        });

                    if (lineNumber < 0) {
                        log.debug("Address Mapping",
                            'Creating new address, could not find address '
                            + 'CoupaSimAddress'
                                .concat(c_address_id));
                        var ns_address_record = ns_vendor_record
                            .selectNewLine({
                                sublistId : 'addressbook',
                            });
                    } else {
                        log.debug("Address Mapping",
                            'Updating existing address: '
                            + 'CoupaSimAddress'
                                .concat(c_address_id));
                        var ns_address_record = ns_vendor_record
                            .selectLine({
                                sublistId : 'addressbook',
                                line : lineNumber
                            });
                    }

                    var addressData = {
                        label : 'CoupaSimAddress'.concat(c_address_id),
                        defaultshipping : defaultshipping,
                        defaultbilling : defaultbilling
                    };

                    for ( var key in addressData) {
                        if (addressData.hasOwnProperty(key)) {
                            ns_address_record.setCurrentSublistValue({
                                sublistId : 'addressbook',
                                fieldId : key,
                                value : addressData[key]
                            });
                        }
                    }

                    log.debug("Address Mapping",
                        "Created/Updated base address record");

                    var subrec = ns_address_record
                        .getCurrentSublistSubrecord({
                            sublistId : 'addressbook',
                            fieldId : 'addressbookaddress'
                        });
                        
                    var addressSubData = {
                        country : c_country,
                        addr1 : c_street_address1,
                        addr2 : c_street_address2,
                        zip : c_post_code,
                        city : c_city,
                        state : c_state,
                        addressee : c_supp_name
                    };

                    for ( var key in addressSubData) {
                        if (addressSubData.hasOwnProperty(key)) {
                            subrec.setValue({
                                fieldId : key,
                                value : addressSubData[key]
                            });
                        }
                    }

                    log.debug("Address Mapping",
                        "Begin custom field mapping (address)");
                    var mappingData = getCustomFields(
                        address_custom_fields, address_records[a],
                        subrec);
                    log.debug("Address Mapping",
                        "Complete custom field mapping (address)");

                    for ( var key in mappingData) {
                        if (mappingData.hasOwnProperty(key)) {
                            try {
                                subrec.setValue({
                                    fieldId : key,
                                    value : mappingData[key]
                                });
                            } catch (e) {
                                log.debug('Failed to set custom field',
                                    'Error setting custom field: '
                                    + key + ' with value '
                                    + mappingData[key]
                                    + '. Exception: ' + e);
                            }
                        }
                    }

                    ns_address_record.commitLine({
                        sublistId : 'addressbook'
                    });

                    log.audit("Address Mapping",
                        "Created/Updated addressbook record");

                } // end loop for addresses

                log.debug("Address Mapping",
                    'About to save Vendor Record...');
                var ns_vendor_id = ns_vendor_record.save({
                    disabletriggers : true
                });
                log.audit("Address Mapping",
                    'Successfully created/updated Address Records for NS vendor ID: '
                    + ns_vendor_id);

                var contact_records = xml.XPath
                    .select({
                        node : sim_records[0],
                        xpath : 'supplier-information-contacts/supplier-information-contact'
                    });

                /** SIM Contacts * */
                // begin contact loop
                for (var c = 0; c < contact_records.length; c++) {
                    if (c_organization_type == 'Individual') {
                        log.debug("Contacts Mapping",
                            "Skipping Contact mapping for Individual type Coupa Supplier "
                            + c_supplier_id + ", "
                            + c_supp_name);
                        continue;
                    }
                    log.debug("Contacts Mapping",
                        "Beginning Contacts mapping for Coupa Supplier "
                        + c_supplier_id + ", " + c_supp_name);
                    var ns_contact_record;

                    var c_contact_id = getElementFromXML(
                        contact_records[c], 'id');
                    var ns_contact_id = returnNetSuiteContactID(c_contact_id);

                    var c_firstname = getElementFromXML(contact_records[c],
                        'name-given');
                    var c_lastname = getElementFromXML(contact_records[c],
                        'name-family');
                    var c_contact_email = getElementFromXML(
                        contact_records[c], 'email');

                    var c_contact_workphone, c_contact_mobilephone, c_contact_faxphone = '';
                    if  (areaParens == true) {

                        var work_country = getElementFromXMLXPath(contact_records[c],
                            'phone-work/country-code');
                        if (work_number!=null && work_number!=''){
                            var work_number = getElementFromXMLXPath(contact_records[c],
                                'phone-work/number');
                            c_contact_workphone = '('
                                + getElementFromXMLXPath(contact_records[c],
                                    'phone-work/area-code')
                                + ') '
                                + work_number.slice(0,3)
                                + splitvalue
                                + work_number.slice(3,7);
                        }
                        if (work_country != null && work_country != '') {
                            c_contact_workphone = '+'
                                + work_country
                                + ' '
                                + c_contact_workphone;
                        }

                        var mobile_country = getElementFromXMLXPath(contact_records[c],
                            'phone-mobile/country-code');

                        var mobile_number = getElementFromXMLXPath(contact_records[c],
                            'phone-mobile/number');
                        if (mobile_number!=null && mobile_number!=''){
                            c_contact_mobilephone = '('
                                + getElementFromXMLXPath(contact_records[c],
                                    'phone-mobile/area-code')
                                + ') '
                                + mobile_number.slice(0,3)
                                + splitvalue
                                + mobile_number.slice(3,7);
                        }
                        if (mobile_country != null && mobile_country != '') {
                            c_contact_mobilephone = '+'
                                + mobile_country
                                + ' '
                                + c_contact_mobilephone;
                        }

                        var fax_country = getElementFromXMLXPath(contact_records[c],
                            'phone-fax/country-code');

                        var fax_number = getElementFromXMLXPath(contact_records[c],
                            'phone-fax/number');
                        if (fax_number!=null && fax_number!=''){
                            c_contact_faxphone = '('
                                + getElementFromXMLXPath(contact_records[c],
                                    'phone-fax/area-code')
                                + ') '
                                + fax_number.slice(0,3)
                                + splitvalue
                                + fax_number.slice(3,7);
                        }
                        if (fax_country != null && fax_country != '') {
                            c_contact_faxphone = '+'
                                + fax_country
                                + ' '
                                + c_contact_faxphone;
                        }
                    } else {
                        var work_country = getElementFromXMLXPath(contact_records[c],
                            'phone-work/country-code');
                        var work_number = getElementFromXMLXPath(contact_records[c],
                            'phone-work/number');
                        if (work_number!=null && work_number!=''){
                            c_contact_workphone = getElementFromXMLXPath(contact_records[c],
                                'phone-work/area-code')
                                + splitvalue
                                + work_number.slice(0,3)
                                + splitvalue
                                + work_number.slice(3,7);
                        }
                        if (work_country != null && work_country != '') {
                            c_contact_workphone = '+'
                                + work_country
                                + ' '
                                + c_contact_workphone;
                        }

                        var mobile_country = getElementFromXMLXPath(contact_records[c],
                            'phone-mobile/country-code');
                        var mobile_number = getElementFromXMLXPath(contact_records[c],
                            'phone-mobile/number');
                        if (mobile_number!=null && mobile_number!=''){
                            c_contact_mobilephone = getElementFromXMLXPath(contact_records[c],
                                'phone-mobile/area-code')
                                + splitvalue
                                + mobile_number.slice(0,3)
                                + splitvalue
                                + mobile_number.slice(3,7);
                        }
                        if (mobile_country != null && mobile_country != '') {
                            c_contact_mobilephone = '+'
                                + mobile_country
                                + ' '
                                + c_contact_mobilephone;
                        }

                        var fax_country = getElementFromXMLXPath(contact_records[c],
                            'phone-fax/country-code');
                        var fax_number = getElementFromXMLXPath(contact_records[c],
                            'phone-fax/number');
                        if (fax_number!=null && fax_number!='') {
                            c_contact_faxphone = getElementFromXMLXPath(contact_records[c],
                                'phone-fax/area-code')
                                + splitvalue
                                + fax_number.slice(0, 3)
                                + splitvalue
                                + fax_number.slice(3, 7);
                        }
                        if (fax_country != null && fax_country != '') {
                            c_contact_faxphone = '+'
                                + fax_country
                                + ' '
                                + c_contact_faxphone;
                        }
                    }
                    var logmsg =  'Phone numbers retrieved: ';
                    if( c_contact_workphone!=null && c_contact_workphone!='')
                    { logmsg= logmsg + 'work phone:' + c_contact_workphone;}
                    if( c_contact_mobilephone!=null && c_contact_mobilephone!='')
                    { logmsg= logmsg + 'mobile:' + c_contact_mobilephone; }
                    if( c_contact_mobilephone!=null && c_contact_mobilephone!='')
                    { logmsg= logmsg + 'fax:' + c_contact_faxphone; }

                    log.debug("Phone numbers", logmsg);

                    if (ns_contact_id != null) {
                        log.debug('Contacts Mapping',
                            'UPDATE request. Coupa CONTACT '
                            + c_contact_id + ' is NS contact '
                            + ns_contact_id);
                        ns_contact_record = record.load({
                            type : record.Type.CONTACT,
                            id : ns_contact_id,
                            isDynamic : true
                        });
                    } else {
                        log.debug('Contacts Mapping',
                            'CREATE request. Coupa CONTACT '
                            + c_contact_id
                            + ' does not exist in NS');
                        ns_contact_record = record.create({
                            type : record.Type.CONTACT,
                            isDynamic : true
                        });
                    }

                    var contactData = {
                        firstname : c_firstname,
                        lastname : c_lastname,
                        email : c_contact_email,
                        company : ns_vendor_id,
                        externalid : "CoupaContact_".concat(c_contact_id),
                        subsidiary : ns_subsid,
                        phone : (c_contact_workphone!=null ) ? c_contact_workphone
                            : "",
                        mobilephone : (c_contact_mobilephone!= null) ? c_contact_mobilephone
                            : "",
                        fax : (c_contact_faxphone!= null) ? c_contact_faxphone
                            : ""
                    };

                    for ( var key in contactData) {
                        if (contactData.hasOwnProperty(key)) {
                            ns_contact_record.setValue({
                                fieldId : key,
                                value : contactData[key]
                            });
                        }
                    }

                    log.debug('Contacts Mapping',
                        'Set Contact Record Fields');

                    log.debug("Contacts Mapping",
                        "Begin custom field mapping (contact)");
                    var mappingData = getCustomFields(
                        contact_custom_fields, contact_records[c],
                        ns_contact_record);
                    log.debug("Contacts Mapping",
                        "Complete custom field mapping (contact)");

                    for ( var key in mappingData) {
                        if (mappingData.hasOwnProperty(key)) {
                            try {
                                ns_contact_record.setValue({
                                    fieldId : key,
                                    value : mappingData[key]
                                });
                            } catch (e) {
                                log.debug('Failed to set custom field',
                                    'Error setting custom field: '
                                    + key + ' with value '
                                    + mappingData[key]
                                    + '. Exception: ' + e);
                            }
                        }
                    }

                    log.debug('Contacts Mapping',
                        'About to save Contact record...');
                    try {
                        var contact_record_id = ns_contact_record.save({
                            disabletriggers : true
                        });
                    } catch (e) {
                        log.debug('Failed to save contact',
                            'Error saving contact: ' + e);
                        continue;
                    }

                    log.audit('Contacts Mapping',
                        'Successfully created/updated NS contact ID '
                        + contact_record_id
                        + ' for Coupa Supplier '
                        + c_supplier_id);
                } // end of contact loop

                // Trigger the update back to Coupa
                var ns_vendor_record = record.load({
                    type : record.Type.VENDOR,
                    id : ns_vendor_id,
                    isDynamic : true
                });
                var ns_vendor_id = ns_vendor_record.save({
                    disabletriggers : true
                });

                // mark as exported
                try {
                    log.audit('Export Step', 'Exported Supplier: '
                        + c_supplier_id + ' SIM: ' + context.value);
                    var put_url = getUrl.concat("?exported=true");
                    var putResponse = https.put({
                        url : put_url,
                        headers : headers,
                        body : ''
                    });
                } catch (e) {
                    log.error('Export Step', 'Could not mark as exported: '
                        + c_supplier_id + ': ', e.message);
                }

            } catch (e) {
                log.error('Error during map step for Coupa Supplier '
                    + c_supplier_id + ': ', e.message);
                log.error('Full Message:', e);

                var error_body = "Error during map step for Coupa Supplier "
                    + c_supplier_id
                    + ': '
                    + e.message
                    + "\n"
                    + "Full Message:" + "\n" + e;

                var error_hash = {
                    author : error_emails_from,
                    recipients : error_emails_to.split(","),
                    subject : 'NetSuite Coupa SIM Integration Error',
                    body : error_body
                };
                email.send(error_hash);

            }
        }

        /**
         * Executes when the summarize entry point is triggered and applies
         * to the result set.
         *
         * @param {Summary}
         *            summary - Holds statistics regarding the execution of
         *            a map/reduce script
         * @since 2015.1
         */
        function summarize(summary) {
            log.audit('Useage/Governance consumed: ', summary.usage);
            log.audit('Number of queues: ', summary.concurrency);
            log.audit('Number of Yields: ', summary.yields);

            log.audit('Summary of Errors: ', summary.inputSummary.error);

            summary.mapSummary.errors.iterator().each(
                function(code, message) {
                    log.error('Map Error: ' + code, message);
                });

            summary.reduceSummary.errors.iterator().each(
                function(code, message) {
                    log.error('Map Error: ' + code, message);
                });
        }

        return {
            getInputData : getInputData,
            map : map,
            // reduce : reduce,
            summarize : summarize
        };

        function returnNetSuiteVendorID(coupa_supplier_id) {
            var netsuite_supplier_id;
            var allSearch = search.create(
                {
                    type : search.Type.VENDOR,
                    filters : [ [ 'custentity_coupa_supplier_id',
                        search.Operator.IS, coupa_supplier_id ] ],
                    columns : [ 'internalid' ]
                }).run().each(function(result) {
                netsuite_supplier_id = result.id;
            });
            if (netsuite_supplier_id) {
                return netsuite_supplier_id;
            } else {
                return null;
            }
        }

        function returnNetSuiteContactID(coupa_contact_id) {
            var netsuite_contact_id;
            var externalid_search = "CoupaContact_"
                .concat(coupa_contact_id);
            var allSearch = search.create(
                {
                    type : search.Type.CONTACT,
                    filters : [ [ 'externalid', search.Operator.IS,
                        externalid_search ] ],
                    columns : [ 'internalid' ]
                }).run().each(function(result) {
                netsuite_contact_id = result.id;
            });
            if (netsuite_contact_id) {
                return netsuite_contact_id;
            } else {
                return null;
            }
        }

        function returnNetSuiteBankID(coupa_address_id, bankType) {
            var netsuite_bank_id;
            var externalid_search = "CoupaAddress_"
                .concat(coupa_address_id);
            var allSearch = search.create(
                {
                    type : bankType,
                    filters : [ [ 'externalid', search.Operator.IS,
                        externalid_search ] ],
                    columns : [ 'internalid' ]
                }).run().each(function(result) {
                netsuite_bank_id = result.id;
            });
            if (netsuite_bank_id) {
                return netsuite_bank_id;
            } else {
                return null;
            }
        }

        function getCustomFields(custom_field_mappings, xml_node, ns_record) {
        	log.debug('getCustomFields', 'custom_field_mappings = '+custom_field_mappings);
            var customFieldData = {};
            if (custom_field_mappings == null) {
                return customFieldData;
            }
            
            var mapping_pairs = custom_field_mappings.split(";");
            log.debug('getCustomFields', 'mapping_pairs = '+mapping_pairs);
            for (var y = 0; y < mapping_pairs.length; y++) {
                mappings = mapping_pairs[y].split("==");
                log.debug('getCustomFields', 'mappings = '+mappings);
                // mappings[0] = coupa xml, mappings[1] = NS field
                var xml_element;
                try {
                    xml_element = getElementFromXMLXPath(xml_node,
                        mappings[0]);
                    log.debug('getCustomFields', 'xml_element = '+xml_element);
                    if (xml_element.indexOf('-') > -1
                        && xml_element.indexOf(':') > -1
                        && xml_element.indexOf('T') > -1) {
                        // Date type, need to convert
                        xml_element = ConvertCoupaDateToNetSuiteDate(xml_element);
                    }

                } catch (e) {
                    xml_element = undefined;
                }
                if (xml_element == undefined) {

                    log.debug('Custom Mapping', 'cannot find '
                        + mappings[0] + ' in xml_node');
                    log.debug('Custom Mapping',
                        'Going to map default value entered');
                    xml_element = mappings[0];
                }
                // Check to see if this is a boolean field. If it is, need
                // to convert from string to bool
                // because of SuiteScript 2.0
                if (xml_element == 'true' || xml_element == 'false') {
                    xml_element = (xml_element == 'true');
                }
                if (xml_element == '') {
                    var field = ns_record.getField({
                        fieldId : mappings[1]
                    });
                    if (field.type === 'checkbox') {
                        log.debug('Custom Mapping',
                            'We have a false checkbox field '
                            + mappings[1]);
                        xml_element = false;
                    }
                }

                customFieldData[mappings[1]] = xml_element;
                log.debug('Custom Mapping', 'Going to map \"' + xml_element
                    + "\" to " + mappings[1]);
            }
            return customFieldData;
        }

        function getElementFromXML(xml_element, tag_name) {
            var element = xml_element.getElementsByTagName({
                tagName : tag_name
            })[0];
            if (element != null) {
                return element.textContent;
            } else {
                return element;
            }
        }

        function getElementFromXMLXPath(xml_element, tag_name) {
            var element = xml.XPath.select({
                node : xml_element,
                xpath : tag_name
            })[0];
            if (element != null) {
                return element.textContent;
            } else {
                return element;
            }
        }

        function ConvertCoupaDateToNetSuiteDate(CoupaDate) {

            var nDate = CoupaDate.split('T');

            var datesplit = nDate[0].split('-');

            var Nyear = datesplit[0];

            var Nday = datesplit[2];

            var Nmonth = datesplit[1];

            var dateObject = new Date(Nyear, Nmonth - 1, Nday);
            return dateObject;
            /*
             * All of the below is nice for matching NS date format, but
             * looks like we need date obejct with 2.0
             *
             * var delimiter = '/'; if(dateformat[0] == 'Y'){ var
             * splitFormat = dateformat.split(dateformat[0]); delimiter =
             * splitFormat[4][0]; } else { var splitFormat =
             * dateformat.split(dateformat[0]); delimiter =
             * splitFormat[2][0]; } var netDate = Nmonth + delimiter + Nday +
             * delimiter + Nyear;
             *
             * if (dateformat == 'DD MONTH, YYYY') { netDate = Nday + ' ' +
             * getMonthShortName(Nmonth) + ', ' + Nyear; } return netDate;
             */

        }

        function validate() {
            var scriptRef = runtime.getCurrentScript();
            var coupa_url = scriptRef
                .getParameter('custscript_coupa_sim_url');
            var api_key = scriptRef
                .getParameter('custscript_coupa_sim_apikey');
            var default_coupa_sub = scriptRef
                .getParameter('custscript_coupa_sim_default_sub');
            var custom_coupa_sub = scriptRef
                .getParameter('custscript_coupa_sim_custom_sub');
            var vendor_custom_fields = scriptRef
                .getParameter('custscript_coupa_sim_vendor_mapping');
            errorObj = error.create({
                name : 'Missing_Param',
                message : 'Missing a Parameter',
                notifyOff : false
            });

            if (coupa_url == null || api_key == null
                || default_coupa_sub == null) {
                throw errorObj;
            }
        }

        function returnNetSuitePaymentTermID(coupa_payment_term_code) {
            var netsuite_payment_term_id;
            var allSearch = search.create(
                {
                    type : search.Type.TERM,
                    filters : [ [ 'name', search.Operator.IS,
                        coupa_payment_term_code ] ],
                    columns : [ 'internalid' ]
                }).run().each(function(result) {
                netsuite_payment_term_id = result.id;
            });
            if (netsuite_payment_term_id) {
                return netsuite_payment_term_id;
            } else {
                return null;
            }
        }
    });
