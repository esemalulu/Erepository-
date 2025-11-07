/**
 * @author Sergio Arce - sarce@veic.org
 * @date   09/12/24
 * Script File:	veic_master_lib.js
 * Script Name:	veic_master_lib.js
 * Script Type:	Library
 * Description:	This library will be the master Lib for Script version 2.0
 * @NApiVersion 2.0
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 09/12/24   Sergio Arce        File Creation
 * 04/08/25   Sergio Arce        Added the logic for SB2 in the nsEnvironment function
 */

define(['N/runtime', 'N/https', 'N/url', 'N/search', 'N/runtime'], function (runtime, https, url, search, runtime) {

    function isNotEmpty(value) {
        if (value != null && value != "null" && value != undefined && value != "undefined" && value != "@NONE@" && value != "" && value.length != 0)
            return true;
        return false;
    }

    function nsEnvironment() {
        var nsEnv = runtime.accountId;
        var env = ''
        if (nsEnv == '1072652_SB1') {
            env = '-sb1';
        } else if (nsEnv == '1072652_SB2') {
            env = '-sb2';
        }

        return env;
    }

    function formatDate(date) {
        var d = new Date(date);

        var year = d.getFullYear();
        var month = String(d.getMonth() + 1).padStart(2, '0');  // 0-indexed, so add 1
        var day = String(d.getDate()).padStart(2, '0');

        return month + '/' + day + '/' + year;
    }

    function isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;  // Valid JSON string
        } catch (e) {
            return false;  // Invalid JSON string
        }
    }

    function getEmployeeCenterRoleId() {
        // This function can be used to retrieve the Employee Center role ID dynamically if needed
        // For now, it returns a hardcoded value
        return 1128; // Example role ID, replace with actual logic if necessary
    }

    function getCurrentRoleCenter() {
        var roleCenter = runtime.getCurrentUser().roleCenter;
        return roleCenter;
    }

    /**
     * Uses the VEC-LookupFiels Suitelet as a proxy to lookup fields on a record
     *
     * @param {string} recordType - The record type, e.g. customer, job, vendorbill etc.
     * @param {number} recordId - The internal ID of the record
     * @param {string} fieldIds - Comma separated list of field IDs to lookup
     *
     * @returns {Object} Return an object with the field values, or an error message if something goes wrong
     */
    function lookupFieldsViaSL(recordType, recordId, fieldIds) {
        let results = {};
        try {
            const suiteletUrl = url.resolveScript({
                scriptId: 'customscript_veic_lookup_fields',
                deploymentId: 'customdeploy_veic_lookup_fields',
                params: {
                    recordId: recordId,
                    recordType: recordType,
                    fieldIds: fieldIds
                }
            });

            const response = https.get({ url: suiteletUrl });
            log.debug('lookupFields: Suitelet response:', response.body);
            results = JSON.parse(response.body);
            if (results && results.error) {
                log.error('lookupFields: Suitelet error:', results.error);
            } else {
                log.debug('lookupFields results:', results);
            }
            return results
        } catch (error) {
            log.error('lookupFields: Error calling Suitelet:', error);
            return { error: error.message };
        }
    }

    /**
     * Extends the search.lookupFields function with error handling and a fallback to a Suitelet
     *
     * @param {Object} options - Options object
     * @param {number} options.id - The internal ID of the record
     * @param {string} type - The record type. Use the search.Type enum for standard record types
     * @param {array} columns - An array of field IDs to lookup, e.g. ['entityid', 'email']
     *
     * @returns {Object} Return an object with the field values, or an error message if something goes wrong
     */
    function lookupFields(options) {
        if (!isNotEmpty(options.type) || !isNotEmpty(options.id) || !isNotEmpty(options.columns) || options.columns.length === 0) {
            return { error: 'Missing required parameters' };
        }
        
        let results = {};
        // If we are in Employee Center role, use the Suitelet to get the fields
        if(getCurrentRoleCenter() === 'EMPLOYEE') {
            log.audit('lookupFields: Using Suitelet for lookup due to Employee Center role', JSON.stringify(options));
            let fieldIds = options.columns.join(',');
            results = lookupFieldsViaSL(options.type, options.id, fieldIds);
            log.debug('lookupFields: Suitelet lookup results:', results);
            return results;
        }

        // Try to get the fields directly using search.lookupFields
        try {
            results = search.lookupFields(options);
            log.debug('lookupFields: Direct lookup results:', results);
            return results;
        } catch (e) {
            log.error('lookupFields: Direct lookup error:', e.message);
            // If direct lookup fails, fallback to using the Suitelet
            log.audit('lookupFields: Falling back to Suitelet for lookup', JSON.stringify(options));
            let fieldIds = options.columns.join(',');
            results = lookupFieldsViaSL(options.type, options.id, fieldIds);
            log.debug('lookupFields: Suitelet lookup results:', results);
            return results;
        }


    }

    return {
        isNotEmpty,
        nsEnvironment,
        formatDate,
        isValidJSON,
        getEmployeeCenterRoleId,
        lookupFields,
    }
});

