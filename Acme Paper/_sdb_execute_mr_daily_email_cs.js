/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/log',"N/url","N/https",'N/ui/dialog'],
function(log,url,https,dialog) {

    function executeMapReduce(){
        try {
            let suitelet = url.resolveScript({
                scriptId: 'customscript_sdb_send_daily_email',
                deploymentId: 'customdeploy_sdb_send_daily_email',
                returnExternalUrl: true,
            })
            var response = https.post({
                url: suitelet
            });

            dialog.alert({
                title: 'Emails Sent',
                message:'Emails Sent Successfully'
            });
            
        } catch (error) {
            log.error('executeMapReduce',executeMapReduce);
        }
    }

   function pageInit(context) {
    
   }


    return {
        executeMapReduce: executeMapReduce,
        pageInit:pageInit
    };
    
});
