/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/currentRecord', 'N/ui/message'], function(url, currentRecord, message) {

    const FORMFIELDS = {};
    FORMFIELDS.CUSTOMER = 'custpage_customer';
    FORMFIELDS.VENDOR = 'custpage_vendor';
    FORMFIELDS.COMMODITY_CODE = 'custpage_commodity_code';
    FORMFIELDS.PAGE_ID = 'custpage_pageid';
    FORMFIELDS.DOWNLOAD = 'custpage_download';

    function fieldChanged(context) {
        try {
            var currRec = context.currentRecord;
            var customer = currRec.getValue({fieldId: FORMFIELDS.CUSTOMER});
            var vendor = currRec.getValue({fieldId: FORMFIELDS.VENDOR});
            var commodityCode = currRec.getValue({fieldId: FORMFIELDS.COMMODITY_CODE});
            var pageId = currRec.getValue({fieldId: FORMFIELDS.PAGE_ID});
            pageId = parseInt(pageId.split('_')[1]);
            if(context.fieldId == FORMFIELDS.CUSTOMER || context.fieldId == FORMFIELDS.VENDOR || context.fieldId == FORMFIELDS.COMMODITY_CODE || context.fieldId == FORMFIELDS.PAGE_ID){
                
                var linkUrl = url.resolveScript({
                    deploymentId: getParameterFromURL('deploy'),
                    scriptId: getParameterFromURL('script'),
                    params: {
                        'custpage_customer': customer,
                        'custpage_vendor': vendor,
                        'custpage_commodity_code': commodityCode,
                        'custpage_pageid': pageId
                    }
                });
               // alert(linkUrl);
                window.onbeforeunload = null;
                window.open(linkUrl, '_self');
            }
        } catch (error) {
            alert(error);
        }
    }

    function getParameterFromURL(param) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == param) {
                return decodeURIComponent(pair[1]);
            }
        }
        return (false);
    }

    function downloadCSV(){
        
        var currRec = currentRecord.get();
        var customer = currRec.getValue({fieldId: FORMFIELDS.CUSTOMER});
        var vendor = currRec.getValue({fieldId: FORMFIELDS.VENDOR});
        var commodityCode = currRec.getValue({fieldId: FORMFIELDS.COMMODITY_CODE});
        var pageId = currRec.getValue({fieldId: FORMFIELDS.PAGE_ID});
        pageId = parseInt(pageId.split('_')[1]);
        var linkUrl = url.resolveScript({
            deploymentId: getParameterFromURL('deploy'),
            scriptId: getParameterFromURL('script'),
            params: {
                'custpage_customer': customer,
                'custpage_vendor': vendor,
                'custpage_commodity_code': commodityCode,
                'custpage_pageid': pageId,
                'csv': true
            }
        });
        var msg = message.create({
            type: message.Type.INFORMATION,
            title: 'Information',
            message: 'Your File at File Cabinet > SuiteScripts > Item_Pricing_CPL_Report.',
            duration: 5000
        });
        msg.show();
        window.onbeforeunload = null;
        window.open(linkUrl, '_self');

    }

    return {
        fieldChanged: fieldChanged,
        downloadCSV: downloadCSV
    }
});
