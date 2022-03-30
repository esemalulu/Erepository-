/**
* @NApiVersion 2.x
* @NScriptType ScheduledScript
* @NModuleScope SameAccount
*/
define(['N/record', 'N/search', 'N/runtime', 'N/task'],

    function(record, search, runtime, task)
    {
        function execute(scriptContext)
        {
            var rsIndex = 0, rsMax = 1000;
            var sf = [
                        ["isinactive","is","F"],
                        "AND",
                        ["custrecord_pi_queue_sync_status","anyof","3"],
                        "AND",
                        ["created","after","ninetydaysago"]
                    ];

            var sc = [
                        search.createColumn({"name":"internalid","label":"Internal ID","type":"select","sortdir":"NONE"}),
                        search.createColumn({"name":"custrecord_pi_queue_recid","label":"Record ID","type":"text","sortdir":"NONE"}),
                        search.createColumn({"name":"custrecord_pi_queue_rectype","label":"Record Type","type":"select","sortdir":"NONE"})
                    ];

            var queueSearch = search.create({ type : 'customrecord_pi_queue', filters : sf, columns : sc});
            top:
            do
            {
                var queueRS     = queueSearch.run().getRange({ start : rsIndex, end : rsIndex + rsMax });
                if(queueRS)
                {
                    for(var i = 0; i < queueRS.length; i+=1)
                    {
                        var queueRecordID   = queueRS[i].getValue({ name : 'internalid'});
                        var recId           = record.delete({ type : 'customrecord_pi_queue', id : queueRecordID});
                        var remainingUsage  = runtime.getCurrentScript().getRemainingUsage();
                        if(recId)
                        {
                            log.debug('QUEUE RECORD DELETED', 'QUEUE RECORD ID' + recId);
                            var percentage = (i * 100) / queueRS.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);

                            if(remainingUsage < 1000)
                            {
                                var reschedule = task.create({
                                    taskType : task.TaskType.SCHEDULED_SCRIPT
                                });

                                reschedule.scriptId = runtime.getCurrentScript().id;
                                reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                reschedule.submit();
                                break top;
                            }
                        }
                    }
                    rsIndex = rsIndex + rsMax;
                }
            } while (queueRS.length > 0);
        }



    return {
        execute: execute
    };

});
