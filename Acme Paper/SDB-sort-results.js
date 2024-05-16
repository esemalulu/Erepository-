/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/url"], function (url) {
    var itemLineCount;
    function pageInit(ctx) {
        try {
            var currentRecord = ctx.currentRecord
            window.onbeforeunload=function(){
                return
            }
            var sortButton = document.getElementById('custpage_sort')
            console.log(sortButton)
            if (sortButton) sortButton.addEventListener('click',()=>{sortSublist(currentRecord)})
        } catch (error) {
            console.log('pageInit ERROR: ' + error)   
        }
     }
    

       function sortSublist(currentRecord){
        try {
            var selectedSort = currentRecord.getValue('custpage_sort_select')
            
            var buyerSort = currentRecord.getValue('custpage_buyers')

            let suiteletURL = url.resolveScript({
                scriptId: 'customscript_sdb_sales_order_with_specia',
                deploymentId: 'customdeploy_sdb_sales_order_with_specia',
                returnExternalUrl: false,
                params:{
                    custom_param_sortOption:selectedSort,
                    custpage_buyers: buyerSort
                },
            })
            window.open(suiteletURL,"_self")
        } catch (error) {
            console.log("sortSublist Error" + error)
        }
    }


    return {
        pageInit,
    };
});