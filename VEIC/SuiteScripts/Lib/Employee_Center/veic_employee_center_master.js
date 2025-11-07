/**
 * @author Sergio Arce - sarce@veic.org
 * @date   07/23/25
 * Script File:	veic_employee_center_master.js
 * Script Name:	veic_employee_center_master.js
 * Script Type:	Library
 * Description:	This library will be the master Lib for the Employee Center
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 07/23/25   Sergio Arce        File Creation
 */

define(['N/url', 'N/https', 'SuiteScripts/Lib/veic_master_lib.js'], function (url, https, lib) {
    function executeSLMaster(classT, projectId){
        console.log('executeSLMaster: '+classT);
        if(!lib.isNotEmpty(classT)){
            const suiteletUrl = url.resolveScript({
            scriptId: 'customscript_veic_employee_center_logic',
            deploymentId: 'customdeploy_veic_employee_center_logic',
            params: { custscript_sl_job_id: projectId },
            });
            let projectArray = [];
            https.get.promise({ url: suiteletUrl })
            .then(function(response) {
                const data = JSON.parse(response.body);
                if (data.error) {
                console.error('Suitelet error:', data.error);
                } else {
                    console.log('classId External:', data.classId);
                    console.log('className External:', data.className);
                    projectArray.push(data.classId,data.className);
                }
            })
            .catch(function(err) {
                console.error('HTTPS GET error:', err.message);
            });

            return projectArray;
        }
    }
    
    return {
        executeSLMaster: executeSLMaster
    }
});