/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/record','N/redirect','N/ui/serverWidget',"N/file","N/task","N/ui/message"], function(record, redirect,serverWidget,file,task,message) {

    function createForm(){
        try {
        
            var form = serverWidget.createForm({
                title : 'CSV Partners To Remove'
            });
            var csvFileField = form.addField({
                id : 'custpage_csv_file',
                type : serverWidget.FieldType.FILE,
                label : 'CSV File with customer and partners to remove'
            });
            var submitButton = form.addSubmitButton({
                label : 'Save'
            });
            return form;

        } catch (error) {
            log.debug('createForm',error)
        }
    }
    

    function onRequest(context){
        try {
            var form = createForm();
            if(context.request.method === 'GET'){
                context.response.writePage(form);
            }else if(context.request.method === 'POST'){
                var newFile = context.request.files.custpage_csv_file;
                if(newFile){
                    newFile.folder = 39499;
                    var newFileId = newFile.save();
    
                    var mapReduceScript = task.create({
                        taskType: task.TaskType.MAP_REDUCE
                    });
                    mapReduceScript.scriptId = 'customscript_sdb_customer_remove_partn';
                    mapReduceScript.deploymentId = 'customdeploy_sdb_customer_remove_partn';
                    mapReduceScript.params = {
                        'custscript_sdb_csv_file_id' : newFileId
                    };
    
                    let asyncTaskId = mapReduceScript.submit();
                    if (asyncTaskId) {
                       form.addPageInitMessage({
                           title: 'Partners Removed',
                           message: '',
                           type: message.Type.CONFIRMATION,
                           duration: 10000
                       })
                       return context.response.writePage(form);
                    }else { 
                        form.addPageInitMessage({
                            title: 'Form submission Error',
                            message: 'The form submission has failed. Please verify the form information and try again.',
                            type: message.Type.ERROR,
                            duration: 10000
                        })
                        return context.response.writePage(form); 
                    }
                }else{
                    form.addPageInitMessage({
                        title: 'Form submission Error',
                        message: 'The form submission has failed. Please verify the form information and try again.',
                        type: message.Type.ERROR,
                        duration: 10000
                    })
                    return context.response.writePage(form); 
                }
            }
        } catch (error) {
            log.debug('onRequest',error)
        }
    }
    return{
        onRequest:onRequest
    }
});


   