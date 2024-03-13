/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/error', 'N/log', 'N/runtime', 'N/search'],
    (error, log, runtime, search) => {
        const beforeLoad = (scriptContext) => {
            try{
                const scriptRef = runtime.getCurrentScript();
                const envType = runtime.envType;
                let coupaURL;
                log.debug('envType',envType);
                if(envType == 'PRODUCTION'){
                    coupaURL = scriptRef.getParameter("custscript_coupa_url_prod");
                }else{
                    coupaURL = scriptRef.getParameter("custscript_coupa_url_sb");
                }
                log.debug('coupaURL',coupaURL);

                const recType = scriptContext.newRecord.type;
                log.debug('recType',recType);

                const coupaInvoiceLinkField = scriptContext.form.addField({
                    id: 'custpage_coupa_invoice_link',
                    type: 'inlinehtml',
                    label: 'Coupa Invoice Link'
                });
                const externalid = scriptContext.newRecord.getValue({
                    fieldId: 'externalid',
                })
                log.debug('externalid',externalid);
                let coupaId;
                let coupaURLText;
                if(externalid){
                    if(recType == "vendorbill"){
                        coupaId = (externalid.split("Coupa-VendorBill "))[1];
                        coupaURLText = "COUPA INVOICE";
                    }else{
                        coupaId = (externalid.split("Coupa-VendorCredit-"))[1];
                        coupaURLText = "COUPA CREDIT NOTE";
                    }
                    if(coupaId){
                        log.debug('coupaId',coupaId);
                        coupaURL = coupaURL + '/invoices/' + coupaId;
                        log.debug('coupaURL',coupaURL);
                        coupaInvoiceLinkField.defaultValue = '<div style="font-size:15px"><b>'+coupaURLText+': <a href="'+coupaURL+'" target="_blank">'+coupaId+'</a></b></div>';  
                    }   
                }

            }catch (ex){
                log.error('beforeLoad', ex)
            }

        }
        return {beforeLoad}

    });