/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 * @NAMDConfig
 * @NScriptType ClientScript
 * Rapid 7
 * License/License Fulfillment/Fulfillment Center/FulfillmentCenter_LicenseEvent_client.js
 * @module
 * @description
 */
define(['N/currentRecord', 'N/search'], (currentRecord, search) => {
    let req_editor = null;
    /**
     * @function pageInit
     * @description description
     *
     * @public
     * @param  {Object} context description
     */
    function pageInit(context) {
        const thisForm = currentRecord.get();
        // create the editor
        const req_container = document.getElementById("jsoneditorrequest");
        const req_options = {};
        req_editor = new JSONEditor(req_container, req_options);
        const resp_container = document.getElementById("jsoneditorresponse");
        const resp_options = {
            mode: 'view'
        };
        const resp_editor = new JSONEditor(resp_container, resp_options);
        // get licensing event & payload
        const eventId = thisForm.getValue('eventidfield');
        const eventJSON = search.lookupFields({
            type: 'customrecordr7_licencing_event',
            id: eventId,
            columns: [
                'custrecordr7_response_payload',
                'custrecordr7_request_payload'
            ]
        });
        try {
            // set json
            const responseJSON = eventJSON.custrecordr7_response_payload;
            const requestJSON = eventJSON.custrecordr7_request_payload;
            req_editor.set(JSON.parse(requestJSON));
            resp_editor.set(JSON.parse(responseJSON));
            req_editor.expandAll();
            resp_editor.expandAll();

            //updateErrorInfo(responseJSON, thisForm);
        } catch(e) {
            alert(e.message);
        }
    }

    function updateErrorInfo(responsePayload, thisForm) {
        let parsedResponse = JSON.parse(responsePayload);
        if (parsedResponse.subscription.status == 'FAILURE') {
            let errorText = parsedResponse.subscription.errorInformation.errorDescription;
            thisForm.setValue('errortext', errorText);
            thisForm.setValue('errordescription', errorText);
            //errorTextField.defaultValue = errorText;
        }
    }

    /**
     * @function saveRecord
     * @description description
     *
     * @public
     * @param  {Object} context description
     * @return {Boolean} description
     */
    function saveRecord(context) {
        try {
            //get json from editor
            const requestJson = req_editor.get()
            context.currentRecord.setValue('jsonpayloadfield', JSON.stringify(requestJson));
            debugger;
            return true;
        } catch (e) {
            alert(e.message);
        }
    }

    return /** @alias module: */ {
        pageInit: pageInit,
        saveRecord: saveRecord
    };
});