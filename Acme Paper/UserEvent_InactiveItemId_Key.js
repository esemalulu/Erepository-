/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/runtime'], function (record, runtime) {
    try {
        function beforeLoad(context) {

            var newRecord = context.newRecord;
            var scriptObj = runtime.getCurrentScript();
            var itemForInactive = scriptObj.getParameter({ name: 'custscript_sdb_for_item_inactive' });
            var CommonUrl = '/app/common/item/item.nl?id=';


            var itemCount = newRecord.getLineCount({
                sublistId: 'item',
            });

            for (var i = 0; i < itemCount; i++) {
                try {
                    var item = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i,
                    });

                    var OriginalItemId = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sdb_item_inactive',
                        line: i,
                    });


                    if (OriginalItemId && itemForInactive == item) {
                        log.debug('item', item);
                        log.debug('itemForInactive', itemForInactive);
                        var Url = CommonUrl + OriginalItemId;
                        var EtiquetaHtml = '<a href="' + Url + '"target="_blank"> inactive item id: ' + OriginalItemId + '</a>'

                        log.debug('Etiqueta', EtiquetaHtml);

                        newRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_sdb_url_inactiveitem',
                            value: EtiquetaHtml,
                            line: i,
                        });
                    }
                    checkApprover(newRecord);
                } catch (e) {
                    log.error({
                        title: e.name,
                        details: e.message
                    });
                }

            }

        }
        function checkApprover(recObj) {
            recObj = recObj;//record.load({ type: record.Type.SALES_ORDER, id: id, isDynamic: true });

            var checkApp = recObj.getValue('custbody_sdb_approved_from_btn');
            var checkRej = recObj.getValue('custbody_sdb_reject_from_button');
            log.debug('checkApp AfterSubmit', checkApp);
            log.debug('checkRej SO', checkRej);
            if (checkApp || checkApp == 'T') {
                recObj.setValue({
                    fieldId: 'orderstatus',
                    value: 'B',
                    ignoreFieldChange: true
                })
                recObj.setValue({
                    fieldId: 'custbody_so_approval_status',
                    value: 'Approved',
                    ignoreFieldChange: true
                })
                recObj.setValue({
                    fieldId: 'custbody_sdb_from_btn_approve',
                    value: true,
                    ignoreFieldChange: true
                })

            } else if (checkRej || checkRej == 'T') {
                recObj.setValue({
                    fieldId: 'orderstatus',
                    value: 'A',
                    ignoreFieldChange: true
                })
                recObj.setValue({
                    fieldId: 'custbody_so_approval_status',
                    value: 'Rejected',
                    ignoreFieldChange: true
                })
            }
        }
        function afterSubmit(scriptContext) {
           try {
                return;
                if (scriptContext.type == 'delete') return;
                var newRec = scriptContext.newRecord;
                if (newRec.type == 'salesorder') {

                    var id = newRec.id;
                    var recObj = record.load({ type: record.Type.SALES_ORDER, id: id, isDynamic: true });

                    var checkApp = recObj.getValue('custbody_sdb_approved_from_btn');
                    var checkRej = recObj.getValue('custbody_sdb_reject_from_button');
                    log.debug('checkApp AfterSubmit', checkApp);
                    log.debug('checkRej SO', checkRej);
                    if (checkApp || checkApp == 'T') {
                        recObj.setValue({
                            fieldId: 'orderstatus',
                            value: 'B',
                            ignoreFieldChange: true
                        })
                        recObj.setValue({
                            fieldId: 'custbody_so_approval_status',
                            value: 'Approved',
                            ignoreFieldChange: true
                        })
                        recObj.setValue({
                            fieldId: 'custbody_sdb_from_btn_approve',
                            value: true,
                            ignoreFieldChange: true
                        })
                      var id = recObj.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })

                    } else if (checkRej || checkRej == 'T') {
                        recObj.setValue({
                            fieldId: 'orderstatus',
                            value: 'A',
                            ignoreFieldChange: true
                        })
                        recObj.setValue({
                            fieldId: 'custbody_so_approval_status',
                            value: 'Rejected',
                            ignoreFieldChange: true
                        })
                      var id = recObj.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                    }


                }

            } catch (e) {
                log.error('Error AfterSubmit', e);
            }

        }

        return {
          //  beforeLoad: beforeLoad,
              afterSubmit: afterSubmit
        };

    } catch (e) {
        log.error({
            title: e.name,
            details: e.message
        });
    }

});




