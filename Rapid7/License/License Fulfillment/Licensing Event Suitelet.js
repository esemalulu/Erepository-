/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record', 'N/redirect'],
    function (record, redirect) {
        function onRequest(context) {
            if (context.request.method === 'GET') {
                try {
                    var licRecId = context.request.parameters.licrecid;
                    var licRecAction = context.request.parameters.licrecaction;
                    log.debug({
                        title: 'licRecId / licRecAction',
                        details: JSON.stringify({
                            licRecId: licRecId,
                            licRecAction: licRecAction
                        })
                    });
                    //replay payload
                    if (licRecAction == 'replay') {
                        log.debug({
                            title: 'Replaying Licensing Event ID ' + licRecId
                        });
                        var licRec = record.load({
                            type: 'customrecordr7_licencing_event',
                            id: licRecId,
                            isDynamic: false
                        });
                        licRec.setValue({ fieldId: 'custrecordr7_response_payload', value: '' });
                        licRec.setValue({ fieldId: 'custrecordr7_exception_message', value: '' });
                        licRec.setValue({ fieldId: 'custrecordr7_licensing_event_status', value: '1' });
                        licRec.save();
                        log.debug({
                            title: 'Success Replaying License Record ID ' + licRecId
                        });
                        redirect.toRecord({
                            type: 'customrecordr7_licencing_event',
                            id: licRecId
                        });
                    }
                    //spoof payload response
                    if (licRecAction == 'spoofresponse') {
                        log.debug({
                            title: 'Spoofing response for Licensing Event ID ' + licRecId
                        });
                        var licRec = record.load({
                            type: 'customrecordr7_licencing_event',
                            id: licRecId,
                            isDynamic: false
                        });

                        function generateValue(type) {
                            if (type == 'productKey') {
                                return (Math.random() * 0xfffff * 1000000).toString(16).toUpperCase().slice(0, 4) + '-' + (Math.random() * 0xfffff * 1000000).toString(16).toUpperCase().slice(0, 4) + '+' + (Math.random() * 0xfffff * 1000000).toString(16).toUpperCase().slice(0, 4) + '-' + (Math.random() * 0xfffff * 1000000).toString(16).toUpperCase().slice(0, 4);
                            }
                            if (type == 'randomNumber') {
                                return (Math.random() * 100000000000000000).toString();
                            }
                        }

                        var responsePayload = JSON.parse(licRec.getValue({ fieldId: 'custrecordr7_request_payload' }));
                        responsePayload.subscription.status = "SUCCESS";
                        for (var i = 0; i < responsePayload.subscription.products.length; i++) {
                            var prodfam = responsePayload.subscription.products[i].productFamily;
                            if (prodfam == 'Nexpose') {
                                responsePayload.subscription.products[i].productKey = generateValue('productKey');
                                responsePayload.subscription.products[i].productSerialNumber = generateValue('randomNumber');
                            }
                            if (prodfam == 'InsightVM') {
                                responsePayload.subscription.products[i].productToken = generateValue('randomNumber');
                            }
                            if (prodfam == 'InsightIDR') {
                                responsePayload.subscription.products[i].productToken = generateValue('randomNumber');
                            }
                            if (prodfam.indexOf('Metasploit') !== -1) {
                                responsePayload.subscription.products[i].productKey = generateValue('productKey');
                            }
                        }

                        licRec.setValue({ fieldId: 'custrecordr7_response_payload', value: JSON.stringify(responsePayload) });
                        licRec.setValue({ fieldId: 'custrecordr7_exception_message', value: '' });
                        licRec.setValue({ fieldId: 'custrecordr7_licensing_event_status', value: '3' });
                        licRec.save();
                        log.debug({
                            title: 'Success Spoofing Response for Licensing Event ID ' + licRecId
                        });
                        redirect.toRecord({
                            type: 'customrecordr7_licencing_event',
                            id: licRecId
                        });
                    }
                }
                catch (e) {
                    log.error({
                        title: 'error',
                        details: JSON.stringify(e)
                    });
                }

            }
        }
        return {
            onRequest: onRequest
        };
    });