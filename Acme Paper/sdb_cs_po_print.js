/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/currentRecord", "N/runtime", "N/search", "N/email", "N/https", "N/record"], function (
    currentRecord,
    runtime,
    search,
    email,
    https,
    record
)
{
    function pageInit(ctx) { }
    function sendPOemail()
    {
        try
        {
            let myRecord = currentRecord.get();
            const stSuiteletLinkParam = runtime.getCurrentScript().getParameter({
                name: "custscript_suiteletlink1",
            });

            const record_id = myRecord.id;
            const fieldLookUp = search.lookupFields({
                type: search.Type.PURCHASE_ORDER,
                id: record_id,
                columns: ["tranid", "custbody_cust_primary_email", "entity", "custbody_acc_buyer"],
            });

            let author = runtime.getCurrentUser()?.id || "";
            console.log("author", author);

            const po_number = fieldLookUp.tranid;
            let vendor_email;
            //First we try to get the first contact of the vendor, to get the email
            let loadedRecord = record.load({
                type: record.Type.VENDOR,
                id: fieldLookUp.entity[0].value,
                isDynamic: true,
            });
            if (loadedRecord.getSublist({ sublistId: 'contactroles' }))
            {
                vendor_email = loadedRecord.getSublistValue({
                    sublistId: "contactroles",
                    fieldId: "email",
                    line: 0,
                });
            }
            console.log(vendor_email);
            if (!vendor_email) vendor_email = fieldLookUp.custbody_cust_primary_email;//If we dont have any, we use this fields

            if (vendor_email)
            {
                const suiteletURL = `${stSuiteletLinkParam}&record_id=${record_id}&po_number=${po_number}&email=${vendor_email}&author=${author}`;
                let response = https.get({
                    url: suiteletURL,
                });
            } else
            {
                vendor_email = search.lookupFields({
                    type: search.Type.VENDOR,
                    id: parseInt(fieldLookUp.entity[0].value),
                    columns: ["email"],
                });

                if (vendor_email.email)
                {
                    const suiteletURL = `${stSuiteletLinkParam}&record_id=${record_id}&po_number=${fieldLookUp.tranid}&email=${vendor_email.email}&author=${author}`;
                    let response = https.get({
                        url: suiteletURL,
                    });
                }
            }
        } catch (e)
        {
            console.log("error in send email", e);
        }
    }
    function printCustomPDF()
    {
        let myRecord = currentRecord.get();
        const stSuiteletLinkParam = runtime.getCurrentScript().getParameter({
            name: "custscript_suiteletlink1",
        });
        const record_id = myRecord.id;
        const fieldLookUp = search.lookupFields({
            type: search.Type.PURCHASE_ORDER,
            id: record_id,
            columns: ["tranid"],
        });
        const suiteletURL = `${stSuiteletLinkParam}&record_id=${record_id}&po_number=${fieldLookUp.tranid}`;

        window.open(suiteletURL);
    }
    return {
        sendPOemail: sendPOemail,
        pageInit: pageInit,
        printCustomPDF: printCustomPDF,
    };
});
