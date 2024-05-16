/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/record', 'N/url','N/currentRecord'],
/**
 * @param{log} log
 * @param{record} record
 * @param{url} url
 */
function(log, record, url , currentRecord) {
    function pageInit(){
    
    }
    function searchOrders(){
        try {
            console.log('searchOrders');
            let thisRecord = currentRecord.get();
            let valuePage = thisRecord.getValue('custpage_gotopage_select')
            console.log(valuePage)
            document.location = url.resolveScript({
                scriptId: 'customscript_sdb_last_month_tax_item',
                deploymentId: 'customdeploy_sdb_last_month_tax_item',
                returnExternalUrl: false,
                params: {
                    custpage_gotopage_select: valuePage,
                    custpage_download_excel: 'false',
                }
            });
        } catch (error) {
            console.log('searchOrders',error)
        }
    }

    function generateExcel() {
        try {
        } catch (error) {
            console.log('GenerateExcel Error: ' + error)
        }
    }
    function downloadExcel(){
        try {
            console.log('executed')
            let thisRecord = currentRecord.get();
            let valuePage = thisRecord.getValue('custpage_gotopage_select')
            document.location = url.resolveScript({
                scriptId: 'customscript_sdb_last_month_tax_item',
                deploymentId: 'customdeploy_sdb_last_month_tax_item',
                returnExternalUrl: false,
                params: {
                    custpage_gotopage_select: valuePage,
                    custpage_download_excel: 'true',
                }
            });
        } catch (error) {
            log.error('downloadExcel Error: ' + error)
        }
    }
    return {
        pageInit:pageInit,
        searchOrders:searchOrders,
        downloadExcel:downloadExcel
    };
    
});
