/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(["N/log", "N/record", "N/url", "N/ui/dialog", "N/https", "N/search", "N/runtime"],

    function (log, record, url, dialog, https, search, runtime)
    {

        function pageInit() { }

        function printPDF(parameters)
        {
            try
            {
                var params = JSON.parse(parameters);
                console.debug("🚀 ~ params:", params);

                var options = {
                    title: 'Email options',
                    message: 'Select functionality to continue.',
                    buttons: [
                        { label: 'Send email to contacts filtered by transaction type', value: 1 },
                        { label: 'Send email to contacts same Ship point as PO', value: 2 },
                        { label: 'Send email to contacts for multiple ship points and contacts', value: 3 },
                        { label: 'Cancel', value: 0 }
                    ]
                };

                function success(result) 
                {
                    if(result == 0) return;

                    try
                    {
                        const userEmail = runtime.getCurrentUser()?.email || "";

                        record.submitFields({
                            type: 'purchaseorder',
                            id: params?.recordId,
                            values: {
                                custbody_return_confirmation_by_email:userEmail
                            }
                        });

                    } catch (error)
                    {
                        log.error("Error saving return confirmation by email", error);
                    }
                    if (result == 1) multipleContactsTypeOrders(params?.recordId);
                    if (result == 2) multipleContactsShipPointSamePO(params?.recordId);
                    if (result == 3) multipleContactsShipPoint(params?.vendorId, params?.recordId);
                }

                function failure(reason)
                {
                    console.log('Failure: ' + reason);
                }

                dialog.create(options).then(success).catch(failure);

            }
            catch (error)
            {
                log.error('error', error);
            }

        }

        // Option for value 1
        function multipleContactsTypeOrders(recordId)
        {

            const suiteLetUrl = url.resolveScript({
                deploymentId: 'customdeploy_sdb_send_emails_po_ven_cont',
                scriptId: 'customscript_send_emails_cont_po_type',
                params: { recordId: recordId }
            });
            if (!suiteLetUrl) return;
            console.debug("🚀 ~ suiteLetUrl:", suiteLetUrl)

            https.get({ url: suiteLetUrl });
        }

        // Option for value 2
        function multipleContactsShipPointSamePO(recordId)
        {
            if (!recordId) return;
            const suiteLetUrl = url.resolveScript({
                deploymentId: 'customdeploy_sdb_send_emails_po_ven_cont',
                scriptId: 'customscript_sdb_send_emails_po_ven_cont',
                params: { transactionRecordId: recordId }
            });
            if (!suiteLetUrl) return;
            console.debug("🚀 ~ suiteLetUrl:", suiteLetUrl)

            const response = https.get({ url: suiteLetUrl });
            console.debug("🚀 ~ response:", response)
            if (!response?.body) return;

            // Show contacts that have been emailed
            const contactsEmailed = JSON.parse(response.body);
            if (!contactsEmailed || contactsEmailed?.length < 1) return;

            let message = `Emailed contacts: \n`;

            contactsEmailed.forEach((contactEmail) =>
            {
                message += String(contactEmail) + "\n";
            });

            var options = {
                title: 'Contacts emailed',
                message: message,
            };

            dialog.create(options).then(() =>
            {
                log.debug("Script finished correctly");

            }).catch((e) =>
            {
                log.error("error", e);
            })
        }

        // Option for value 3
        function multipleContactsShipPoint(vendorId, transactionId)
        {
            // Get all ship points
            const suiteLetUrl = url.resolveScript({
                deploymentId: 'customdeploy_sdb_send_email_multi_cont_s',
                scriptId: 'customscript_sdb_send_email_multi_cont_s',
                params: {
                    vendorId: vendorId,
                    transactionId: transactionId
                }
            });
            if (!suiteLetUrl) return;

            window.open(suiteLetUrl, 'CustomPopup', 'width=800,height=600');
        }

        return {
            pageInit,
            printPDF
        };
    });