/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */

define(["N/ui/serverWidget", "N/search", "N/runtime", "N/task", "N/record", "N/ui/message"], function (serverWidget, search, runtime, task, record, message) {
    function onRequest(context) {
        try {
            // --------- Create FORM 
            var form = serverWidget.createForm({
                title: 'Upload File'
            });
            var uploadForm = form.addField({
                id: 'custpage_upload_file',
                label: 'Upload CSV File',
                type: serverWidget.FieldType.FILE,
            })
            form.addSubmitButton({
                label: 'Upload',
            });
            //--------- END Create Form
            if (context.request.method === "GET") {
                const CLIENT_FORM = 'SuiteScripts/SDB-CUE-SupercedeItem.js';
                form.clientScriptModulePath = CLIENT_FORM;
                if (!context.request.parameters.action) {
                    context.response.writePage(uploadForm);
                }
                context.response.writePage(form);

            } else {
                log.debug('context', context.request);
                //ejecuto task
                let fileObj = context.request.files?.custpage_upload_file;
                log.debug('fileObj', context.request.files);
                if (!fileObj) {
                    form.addPageInitMessage({ type: message.Type.WARNING, message: 'Warning: No file selected, please try again' });
                    context.response.writePage(form);
                    return
                }

                fileObj.folder = -15;

                if (fileObj.fileType.toString() != "CSV") {
                    form.addPageInitMessage({ type: message.Type.WARNING, message: 'Please select a valid CSV file.' });
                    context.response.writePage(form);
                    return
                }
                let fileId = fileObj.save();
                log.debug('fileId', fileId);

                let mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_sdb_cpc_import_csv_mr',
                    deploymentId: 'customdeploy_sdb_update_price_items_mr',
                    params: {
                        custscript_sdb_id_file: fileId
                    }
                });
                let mrTaskId = mrTask.submit();
                log.debug('mrTaskID', mrTaskId)
                if (mrTaskId) {
                    form.addPageInitMessage({ type: message.Type.CONFIRMATION, message: 'Prices updated correctly' });
                    form.addField({
                        id: "custpage_task_id",
                        type: serverWidget.FieldType.INLINEHTML,
                        label: "Task script",
                    }).defaultValue = getResponseMapreduce(mrTaskId);

                    context.response.writePage(form);
                }
            }
        } catch (error) {
            log.debug('error in the suitelet', error);
        }
    }
    function getResponseMapreduce(taskId) {
        let defaultHtml = `
        <style>
        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #ccc;
            border-radius: 50%;
            border-top-color: #333;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
        <script>
        // Obtener el contenedor
        var divContainerForm = document.getElementById('div__body');
            
        // Crear un nuevo elemento <p> con el texto "Processing"
        var nuevoElemento = document.createElement('p');
        var nuevoElemento_1 = document.createElement('p');
        var nuevoElementCreate = document.createElement('p');


        nuevoElemento.textContent = 'Processing...';
            

       
        divContainerForm.appendChild(nuevoElemento);
        divContainerForm.appendChild(nuevoElemento_1);
        divContainerForm.appendChild(nuevoElementCreate);

        function alternarPuntos() {
  if (nuevoElemento.textContent === 'Processing...') {
    nuevoElemento.textContent = 'Processing.';
  } else if (nuevoElemento.textContent === 'Processing.') {
    nuevoElemento.textContent = 'Processing..';
  } else {
    nuevoElemento.textContent = ' ';
  }
}
function dataResult() {
    var fields = ['custrecord_sdb_all_rows', 'custrecord_sdb_update_item_count', 'custrecord_sdb_count_item_error'];
    var fieldValues = nlapiLookupField('customrecord_sdb_update_item_price', '1', fields);

    return fieldValues;
}
var alterPoints = setInterval(alternarPuntos, 500);
        var idTask = "${taskId}"
        if (idTask) {
            console.log(idTask)
            console.log("/app/site/hosting/scriptlet.nl?script=customscript_sdb_get_status_task&deploy=customdeploy_sdb_get_status_task&idTask=" + idTask)
            var SCHInterval = setInterval(function () {
                    jQuery.get("/app/site/hosting/scriptlet.nl?script=customscript_sdb_get_status_task&deploy=customdeploy_sdb_get_status_task&idTask=" + idTask, function (data, status) {
                    data = JSON.parse(data);
                    console.log(data);                    
                     if (data.taskInformation.status == "COMPLETE" || data.taskInformation.status == "FAILD") {
                            var resImport = dataResult();
                            console.log(resImport);
                            // Crear el texto concatenando las variables y las líneas
                            var texto = 'Updated contract lines: ' + resImport.custrecord_sdb_update_item_count + ' - ' +
                            'Contract lines created: ' + resImport.custrecord_sdb_all_rows + ' - ' +
                            'Failed contract lines: ' + resImport.custrecord_sdb_count_item_error;
                            nuevoElemento.textContent = texto;
                            clearInterval(alterPoints);
                            clearInterval(SCHInterval);
                        }   
                });
            }, 5000);

            setTimeout(function () {
                clearInterval(SCHInterval);
            }, 1200000);
        }
        </script>
        `
        return defaultHtml;
    }
    return {
        onRequest: onRequest,
    };
});