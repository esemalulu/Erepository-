/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define([], function () {

    function pageInit(context) {

        try {
            debugger;
            console.log('test client script')

        } catch (err) {
            log.debug("Error pageInit", err);
        }
    }

    return {
       
        pageInit: pageInit,
    };
});