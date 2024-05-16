/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/task', 'N/runtime', './WEUtils'],

function (record, search, task, runtime, WEUtils) {

    //function beforeLoad(scriptContext) {

    //}

    //function beforeSubmit(scriptContext) {

    //}

    function afterSubmit(scriptContext) {

        /** Debug Only **/
        //if (scriptContext.newRecord)
        //    log.debug('New Record DL Flag', scriptContext.newRecord.getValue({ fieldId: 'custbody_a1wms_dnloadtowms' }));
        //if (scriptContext.oldRecord)
        //    log.debug('Old Record DL Flag', scriptContext.oldRecord.getValue({ fieldId: 'custbody_a1wms_dnloadtowms' }));

        /** Weed out calls from WS user */
 /*       var a1wIntParams = null;
        var wsUser = null;

        try { a1wIntParams = record.load({ type: 'customrecord_a1wms_params', id: '1' }); }
        catch (err) { log.debug(err.message); }

        try { wsUser = a1wIntParams.getValue({ fieldId: 'custrecord_a1w_ws_user_email' }); }
        catch (err) { log.debug(err.message); }

        if (!wsUser) {
            log.debug('Script Parameter Not Defined - Exiting', 'Please Define WS User in Integration Parameters Custom Record');
            return;
        }
        if (JSON.stringify(runtime.executionContext).replace(/\W+/g, " ").trim() === 'WEBSERVICES' &&
            runtime.getCurrentUser().email === wsUser) {
            return;
        }
            */
      
        var statusField = null;
        var action = 'Download';
        var total = 0;
        var dnloadRecId = '-1';
        try{

        log.debug('scriptContext.type=' + scriptContext.type);
        log.debug('scriptContext.newRecord.type=' + scriptContext.newRecord.type);

       
              if ( (scriptContext.type == 'create' || scriptContext.type == 'copy' ) && scriptContext.newRecord.type == 'salesorder') {

                  dnloadRecId = String(scriptContext.newRecord.id);
                  var qidnum = WEUtils.submitDlqRecord('salesorder', String(dnloadRecId), action);
                  log.debug('qidnum=' + qidnum);

                  var dnloadResult = WEUtils.requestDownload(String(dnloadRecId), 'salesorder', action);
                   log.debug('dnloadRecId=' + String(dnloadRecId));
                  log.debug('dnloadResult=' + dnloadResult);


              } 
        }
         catch (err) { log.debug(err.message); }

    }

    return {
        //beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

});
