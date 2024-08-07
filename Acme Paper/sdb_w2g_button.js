/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
*/
define(['N/record', 'N/runtime', 'N/log', 'N/https', 'N/search', "N/ui/message"],
    function (record, runtime, log, https, search, message) {
        function beforeLoad(context) {
            try {
                executePageInit(context);

                var rec = context.newRecord;
                var form = context.form;

                if (context.type != context.UserEventType.VIEW) return;

                var suiteletLinkParam = runtime.getCurrentScript().getParameter({
                    name: 'custscript_ware2go_suitelet'
                });
                var suiteletURL = '\"' + suiteletLinkParam + "&orderId=" + rec.id + '\"';
                var location = rec.getValue('location')
                if (location == 132 || location == 131 || location == 130)
                    form.addButton({
                        id: 'custpage_w2g',
                        label: 'Send to W2G',
                        functionName: 'window.open(' + suiteletURL + ')'
                    });
            } catch (error) {
                log.error('error', error)
            }
        }

        function executePageInit(context) {
            try {
                var poId = context
                var userObj = runtime.getCurrentUser();
                //if (userObj.id != 84957) return; // Santiago
                var poId = context.newRecord.id;

                if (context.newRecord.type != "purchaseorder" || !poId) return;
                var isHighJumpProcess = getIsHighJumpProcess(poId);
                var isDropShip = context.newRecord.getValue('custbody_dropship_order');
                log.debug('isHighJumpProcess', isHighJumpProcess)
                if (isHighJumpProcess && !isDropShip) showAlert(context);
            } catch (e) {
                log.error('ERROR: executePageInit', e);
            }
        }

        function getIsHighJumpProcess(poId) {
            try {
                var customrecord_a1wms_dnloadqueueSearchObj = search.create({
                    type: "customrecord_a1wms_dnloadqueue",
                    filters:
                        [
                            ["custrecord_a1w_dlq_trans", "anyof", poId]
                        ],
                    columns:
                        []
                });
                var searchResultCount = customrecord_a1wms_dnloadqueueSearchObj.runPaged().count;

                return searchResultCount >= 1;
            } catch (e) {
                log.error('ERROR: getIsHighJumpProcess', e);
            }
        }

        function showAlert(context) {
            try {
                context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'This order is being processed by HIGH JUMP. <a href="">refresh</a>', duration: 1000000 });
                var script = '<script>'
                //   script += 'setInterval(function(){'
                //   script += 'var saveBtn = document.querySelectorAll(".pgBntY.pgBntB");'
                //   script += 'if (saveBtn) saveBtn.forEach(function (el) {'
                //   script += 'el.style.pointerEvents = "none";'
                //   script += '});'
                //   script += 'var editBtn = document.querySelectorAll(".rndbuttoninpt.bntBgT[value="Edit"]");'
                //   script += 'if (editBtn) editBtn.forEach(function (el) {'
                //   script += 'if(el) el.parentElement.parentElement.parentElement.parentElement.style.display = "none";'
                //   script += '});'
                //   script += '}, 1000)'
                script += '</script>'
                var field = context.form.addField({
                    id: "custpage_hide_save_btn",
                    label: "Hide Save BTN",
                    type: 'inlinehtml'
                });
                field.defaultValue = script;

            } catch (e) {
                log.error('ERROR: showAlert', e);
            }
        }

        function beforeSubmit(context) {
            try {
                var recType = context.newRecord.getValue('type');
                if (recType == "purchord") {
                    var employee = runtime.getCurrentUser()?.id || "";
                    var currentBuyer = context.newRecord.getValue('custbody_acc_buyer');
                    log.debug("INFO: ", { recType, employee, currentBuyer });
                    if (!currentBuyer && employee && employee != -4) context.newRecord.setValue('custbody_acc_buyer', employee);
                }

            } catch (error) {
                log.error('error', error)
            }

        }

        function afterSubmit(context) {
            try {
                const W2GLOCATIONS = [
                    "132",  //W2G NV
                    "131",  //W2G PA
                    "130"   //W2G TX
                ];

                var newRecord = context.newRecord;
                var wasSent = newRecord.getValue("custbody_sent_to_w2g");
                if (wasSent) return;
                if (newRecord.type == record.Type.SALES_ORDER) {
                    var location = newRecord.getValue({
                        fieldId: 'location'
                    });

                    if (W2GLOCATIONS.includes(location)) {
                        var suiteletURL = "https://5774630.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5477&deploy=1&compid=5774630&ns-at=AAEJ7tMQY78XDaPQ6LHkv1-uQcQB7qRiArkmR1SUO5J8_K4H1nk&orderId=" + newRecord.id;

                        var response = https.get({
                            url: suiteletURL
                        });

                        log.debug('BODY: ', response.body);
                        log.debug('Ware 2 Go response', { suiteletURL, orderId: newRecord.id, resCode: response.code });
                        if (response.code == 200) {
                            record.submitFields({
                                type: record.Type.SALES_ORDER,
                                id: newRecord.id,
                                values: { "custbody_sent_to_w2g": true }
                            });
                        }
                    }
                }
            } catch (error) {
                log.error('error', error);
            }
        }
        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit,
            beforeSubmit: beforeSubmit
        }
    }
); 