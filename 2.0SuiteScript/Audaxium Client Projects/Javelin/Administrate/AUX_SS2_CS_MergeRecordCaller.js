/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/https', 'N/url', 'N/ui/message'],

function(https, url, message) {

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */

    var currRecord = {};

    function pageInit(scriptContext) {
        currRecord = scriptContext.currentRecord;
        var disclaimer = message.create({
            title : 'Disclaimer',
            message : 'The purpose of this page is to merge two customer records together. Before the merging process takes place it will update Administrate and dispose of the record that is to be merged with the master record. Once that is completed it will perform the merge operation inside NetSuite. Please note once this page is submitted it cannot be undone.',
            type : message.Type.INFORMATION
        });

        disclaimer.show();
    }

    function callSuitelet(val)
    {
        var params = {};
            params['custpage_custid'] = val;

        var output = url.resolveScript({
            scriptId : 'customscript_aux_sl_merge_record',
            deploymentId : 'customdeploy_aux_sl_merge_record',
            returnExternalUrl : false,
            params : params
        });

        var suitelet = 'https://system.netsuite.com' + output;
        window.location.href = suitelet;

    }

    function setMaster()
    {
        var id = currRecord.getValue({ fieldId : 'custpage_mergerec'});

        if(id)
        {
            window.isChanged = false;
            window.location = window.location + '&custpage_mergerec=' + id;
        }
        else
        {
            window.isChanged = false;
            window.location = window.location;
        }



    }

    return {
        pageInit: pageInit,
        callSuitelet : callSuitelet,
        setMaster : setMaster
    };

});
