/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/task', 'N/ui/message', 'SuiteScripts/Lib/veic_master_lib.js', 'SuiteScripts/Lib/veic_tools_lib.js'], 
    (serverWidget, task, message, lib, libvt) => {

    function onRequest(context) {
        
        if (context.request.method === 'GET') {
            let typeVG = context.request.parameters.type;
            if(lib.isNotEmpty(typeVG)){
                //Here we are getting the information from the Script
                let dataScriptG = findByType(libvt, typeVG);
                let form = serverWidget.createForm({
                        title: 'Script Processor'
                });

                // Build the form
                if(lib.isNotEmpty(dataScriptG)){
                    let titleG = dataScriptG.title;

                    form.title = titleG+' Processor';

                    form.addField({
                        id: 'custpage_type',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Script Type'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = typeVG;

                    // Add submit button
                    form.addSubmitButton({
                        label: 'Run '+titleG
                    });

                }else{
                    form.addPageInitMessage({
                        type: message.Type.ERROR,
                        title: 'Error',
                        message: 'The type '+typeVG+" is invalid, please contact your VEIC Administratior.",
                        duration: 60000
                    });
                }

                context.response.writePage(form);
            }

        } else if (context.request.method === 'POST') {
            let typeVP = context.request.parameters.custpage_type;
            let dataScriptP = findByType(libvt, typeVP);

            let scriptIdP = dataScriptP.scriptId;
            let deploymentIdP = dataScriptP.deploymentId;
            let titleP = dataScriptP.title;
            try {
                // Trigger the Map/Reduce
                let mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: scriptIdP,
                    deploymentId: deploymentIdP
                });

                let taskId = mrTask.submit();

                // Confirmation form
                let form = serverWidget.createForm({
                    title: titleP+' Processor'
                });

                form.addPageLink({
                    type: serverWidget.FormPageLinkType.CROSSLINK,
                    title: 'Check Map/Reduce Status',
                    url: '/app/common/scripting/mapreducescriptstatus.nl?daterange=TODAY'
                });

                form.addField({
                    id: 'custpage_info',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                }).defaultValue = `<div style="color:green; font-weight:bold;">
                    Map/Reduce ${titleP} started successfully!<br/>Task ID: ${taskId}
                </div>`;

                form.addButton({
                    id: 'custpage_back',
                    label: 'Back',
                    functionName: 'history.back'
                });

                context.response.writePage(form);

            } catch (e) {
                let form = serverWidget.createForm({
                    title: titleP+' Processor'
                });

                form.addField({
                    id: 'custpage_error',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                }).defaultValue = `<div style="color:red; font-weight:bold;">
                    Error starting Map/Reduce ${titleP}: ${e.message}
                </div>`;

                context.response.writePage(form);
            }
        }
    }

    function findByType(data, type) {
        for (var i = 0; i < data.length; i++) {
            if (data[i].type === type.toString()) {
            return {
                scriptId: data[i].scriptId,
                deploymentId: data[i].deploymentId,
                title: data[i].title
            };
            }
        }
        return null;
    }

    return { onRequest };
});