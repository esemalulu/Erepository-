/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 */
define(['../lib/lodash.min', 'N/search', 'N/runtime', 'N/task', 'N/url', 'N/redirect', 'N/cache', 'N/ui/serverWidget'], function(_, search, runtime, task, url, redirect, cache, serverWidget){

    function getLastRunDate(){
    
        var result = search.create({
            type: search.Type.JOB,
            columns: [search.createColumn({
                name: 'custentityr7_revrec_perc_ovride_lastrun',
                summary: search.Summary.MAX
            })],
            filters: [search.createFilter({
                name: 'custentityr7_revrec_perc_ovride_lastrun',
                operator: search.Operator.ISNOTEMPTY
            })]
        }).run().getRange({
            start: 0,
            end: 1
        })[0];
        
        if (result) {
            return result.getValue({
                name: 'custentityr7_revrec_perc_ovride_lastrun',
                summary: search.Summary.MAX
            });
        }
        
        return null;
    }
    
    function onRequest(context){
    
        var DEFAULT_STATUS = 'NOT RUNNING';
        
        var objResponse = {
            success: true,
            msg: null
        };
        
        var overrideExecuteCache = cache.getCache({
            name: 'r7_revrec_override_exe_cache',
            scope: cache.Scope.PRIVATE
        });
        
        var response = overrideExecuteCache.get({
            key: 'response'
        });
        overrideExecuteCache.remove({
            key: 'response'
        });
        var taskId = overrideExecuteCache.get({
            key: 'task_id'
        });
        var taskStatus = (taskId) ? task.checkStatus(taskId) : null;
        var status = (taskStatus) ? taskStatus.status : null;
        if (!status || status == 'COMPLETE') {
            status = DEFAULT_STATUS;
        }
        
        if (context.request.method == 'POST') {
        
            if (status != DEFAULT_STATUS) {
                objResponse.success = false;
                objResponse.msg = 'Script is already running.';
            }
            else {
            
                var executionType = context.request.parameters.execution_type;
                
                var scriptTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscriptr7_job_revrec_perc_comp_ovr',
                    params: {
                        'custscriptr7_revrecovride_calc_mr_currnt': (executionType == '1') ? true : false
                    }
                });
                
                try {
                    var taskId = scriptTask.submit();
                    
                    overrideExecuteCache.put({
                        key: 'task_id',
                        value: taskId,
                        ttl: 43200
                    });
                    
                    objResponse.success = true;
                    objResponse.msg = 'Successfully started calculation.';
                } 
                catch (e) {
                    objResponse.success = false;
                    objResponse.msg = 'Could not start calculation. This is most likely due to the script already processing.';
                    log.audit({
                        title: 'Could not start calculation.',
                        details: e
                    });
                }
            }
            
            overrideExecuteCache.put({
                key: 'response',
                value: objResponse,
                ttl: 18000
            });
            
            var scriptObj = runtime.getCurrentScript();
            redirect.toSuitelet({
                scriptId: scriptObj.id,
                deploymentId: scriptObj.deploymentId
            });
            return;
        }
        
        var form = serverWidget.createForm({
            title: 'Project Revenue Recognition Override Calulation'
        });
        form.clientScriptModulePath = './r7_revrec_complete_override_calc_execute_suitelet_cs.js';
        
        //EXECUTION TYPE
        form.addField({
            id: 'execution_type',
            type: serverWidget.FieldType.SELECT,
            label: 'Execution Type'
        });
        
        form.getField({
            id: 'execution_type'
        }).addSelectOption({
            value: '1',
            text: 'Current Month To Date',
            isSelected: true
        });
        
        form.getField({
            id: 'execution_type'
        }).addSelectOption({
            value: '2',
            text: 'Prior Month'
        });
        
        form.getField({
            id: 'execution_type'
        }).updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.NORMAL
        });
        form.getField({
            id: 'execution_type'
        }).updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTCOL
        });
        
        //LAST RUN DATE FIELD
        form.addField({
            id: 'lastrundate',
            type: serverWidget.FieldType.TEXT,
            label: 'Last Run Date'
        });
        
        form.getField({
            id: 'lastrundate'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });
        
        var lastRunDate = getLastRunDate();
        if (lastRunDate) {
            form.getField({
                id: 'lastrundate'
            }).defaultValue = lastRunDate;
        }
        
        //STATUS FIELD
        form.addField({
            id: 'status',
            type: serverWidget.FieldType.TEXT,
            label: 'Script Status'
        });
        form.getField({
            id: 'status'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });
        
        form.getField({
            id: 'status'
        }).defaultValue = _.startCase(_.toLower(status));
        ;
        
        //MESSAGE/RESPONSE FIELD
        form.addField({
            id: 'response',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Response'
        });
        
        form.getField({
            id: 'response'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });
        
        form.getField({
            id: 'response'
        }).defaultValue = response;
        
        
        form.addSubmitButton({
            label: 'Run Calculation'
        });
        
        context.response.writePage(form);
        return;
        
    }
    return {
        onRequest: onRequest
    };
    
    
});
