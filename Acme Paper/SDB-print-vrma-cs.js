/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/currentRecord", "N/runtime", "N/search", "N/email", "N/https", "N/record",'N/url'], function (
    currentRecord,
    runtime,
    search,
    email,
    https,
    record,
    url
)
{
    function pageInit(ctx) { }


    function printCustomPDF()
    {
        try {
        let myRecord = currentRecord.get();
        var vra_id = myRecord.id;

        let suitelet = url.resolveScript({
            scriptId: 'customscript_sdb_print_vra',
            deploymentId: 'customdeploy_sdb_print_vra',
            returnExternalUrl: false,
            params:{
                custom_param_vra_id : vra_id,
                custom_param_option : 'print',
            }
        })

        var response = https.get({
            url: suitelet
        });

        window.open(suitelet);
    } catch (error) {
        console.log('printCustomPDF ERROR' + error)
    }
    }

    function sendEmail()
    {
        try
        {
            let myRecord = currentRecord.get();
            const record_id = myRecord.id;

            const vra_fieldlookup = search.lookupFields({
                type: search.Type.VENDOR_RETURN_AUTHORIZATION,
                id: record_id,
                columns: ["entity", "custbody_cust_primary_email"],
            });
         
            let vendor_email;
            const vendor_fieldlookup = search.lookupFields({
                type: search.Type.VENDOR,
                id: vra_fieldlookup.entity[0].value,
                columns: ["email"],
            });
            vendor_email = vendor_fieldlookup.email
            if (!vendor_email) vendor_email = vra_fieldlookup.custbody_cust_primary_email;
            if (vendor_email)
            {
                let suitelet = url.resolveScript({
                    scriptId: 'customscript_sdb_print_vra',
                    deploymentId: 'customdeploy_sdb_print_vra',
                    returnExternalUrl: false,
                    params:{
                        custom_param_vra_id : record_id,
                        custom_param_vendor_email : vendor_email,
                        custom_param_option : 'email',
                    }
                })
                var response = https.get({
                    url: suitelet
                });
                if(response.body == '404')alert('ERROR: THE RECORD IS LOCKED')
                if(response.body == '200')alert('Email Sent Successfully')
            }else{
                alert("Error: The vendor doesn't has a contact email")
            }
        } catch (e)
        {
            console.log("error in send email", e);
        }
    }

    return {
        sendEmail: sendEmail,
        pageInit: pageInit,
        printCustomPDF: printCustomPDF,
    };
});
