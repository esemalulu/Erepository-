/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url', 'N/ui/message'],

    (currentRecord, url, message, task, search) => {

        function pageInit(context) { return true;}

        var calculateAdjustedRate = (recordObjectId, invoiceId) => {

            // Show progress message
            var progressMessage = message.create({
                title: 'Processing',
                message: 'The Adjusted Calculation Rate for project id:'+recordObjectId+' is running. Please wait and refresh in few minutes...',
                type: message.Type.INFORMATION
            });
            progressMessage.show();

            // let isMapReduceExecuting = isExecuting('customscript_cp_adjusted_rate_automation','customdeploy_cp_adjusted_rate_automation');
            //
            // if(!isMapReduceExecuting){
            //     // Create a map/reduce task and pass the projectId as a parameter to the script
            //     let mrTask = task.create({
            //         taskType: task.TaskType.MAP_REDUCE,
            //         scriptId: 'customscript_cp_adjusted_rate_automation',
            //         deploymentId: 'customdeploy_cp_adjusted_rate_automation',
            //         params: {
            //             custscript_projectid_param: projectId  // Pass the project ID as a script parameter
            //         }
            //     });
            //
            //     let taskId = mrTask.submit();  // Submit the task and get task ID
            // }else{
            //     log.debug('MAP_REDUCE EXECUTION STATUS','All execution instances are running, try again later')
            // }

            var recordUrl = url.resolveScript({
                scriptId: 'customscript_cp_ajusted_rate_calc_su',
                deploymentId: 'customdeploy_cp_ajusted_rate_calc_su',
                params: {
                    projectid: recordObjectId,
                    invoiceId: invoiceId
                }
            });
            window.open(recordUrl,'_self');
        }


        return {
            pageInit:pageInit,
            calculateAdjustedRate: calculateAdjustedRate
        };
    });

// /**
//  * @NApiVersion 2.x
//  * @NScriptType ClientScript
//  */
// define(['N/url', 'N/currentRecord', 'N/ui/message'], function(url, currentRecord, message) {
//
//     function pageInit(context) {
//         addButton();
//         // var rec = context.currentRecord.type;
//         // log.debug('pageInit','Record Type:'+rec)
//         // if (pageInit === 'job') {  // Ensure we're on a project record (job type)
//         //     addButton();
//         // }
//     }
//
//     function addButton() {
//         log.debug('addButton','Got Here: addButton')
//         var button = document.createElement('button');
//         button.innerHTML = 'Run Map/Reduce';
//         button.onclick = function() {
//             runMapReduce();
//         };
//         document.querySelector('#btn_secondarymultibutton_submitter').parentElement.appendChild(button);
//     }
//
//     function runMapReduce() {
//         var rec = currentRecord.get();  // Get the current record
//
//         // Get the project internal ID (or other parameters as needed)
//         var projectId = rec.id;
//
//         // Show progress message
//         var progressMessage = message.create({
//             title: 'Processing',
//             message: 'The Map/Reduce script is running. Please wait...',
//             type: message.Type.INFORMATION
//         });
//         progressMessage.show();
//
//         // Construct the URL for the Suitelet and pass the project ID as a parameter
//         var suiteletUrl = url.resolveScript({
//             scriptId: 'customscript_cp_ajusted_rate_calc_su',
//             deploymentId: 'customdeploy_cp_ajusted_rate_calc_su',
//             params: {
//                 projectid: projectId
//             }
//         });
//
//         window.location.href = suiteletUrl;  // Trigger the Suitelet
//     }
//
//     return {
//         pageInit: pageInit
//     };
// });