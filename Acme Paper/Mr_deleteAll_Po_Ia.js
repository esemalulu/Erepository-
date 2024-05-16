/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
*/

define(['N/search', 'N/log', 'N/runtime','N/task','N/record'],

    function (search, log, runtime,task,record) {

        function getInputData(context) {
            try {
                var Search_id = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_search_id' });
                

                    searchLoad = search.load({
                        id: Search_id,
                        type: 'transaction'
                    })

            }catch (maperr) {
                log.error('input data error: ', maperr.message );
                log.audit('Map: context.value is ', context.value);
            } 
          

          log.debug('q search',Search_id);
          return searchLoad;
        }

        function map(context) {
            try{
                var Data = JSON.parse(context.value);

                log.debug('',Data.id + '  ' + Data.recordType);

                var Record = record.delete({
                    type: Data.recordType,
                    id: Data.id,
                });
               
            }catch (maperr) {
                    log.error('map stage error: ', maperr.message + ' '+ Data.id + ' '+ Data.recordType);
                    log.audit('Map: context.value is ', context.value);
            }
            
        }
        function summarize(context){
          var flagg = runtime.getCurrentScript().getParameter({ name: 'custscript_sdr_flagg_deploy' });
            if(!flagg){
                //ejecute();
            }
        }

        function ejecute(){
            try{
            log.debug('ejecute','');
            var myTask = task.create({taskType: task.TaskType.MAP_REDUCE});
            myTask.scriptId = 'customscript_sdb_mr_delte_po_and_ia';
            myTask.deploymentId = null;
            myTask.params = {
                'custscript_sdr_flagg_deploy': 1
            };
            var myTaskId = myTask.submit();
        }catch (maperr) {
            log.error('summarize stage error: ', maperr.message);
             }
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize:summarize,
        };



    });