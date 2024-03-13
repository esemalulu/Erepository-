/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */

// kruparelia - ESM - Added filter to saved search to exclude non-billable tasks CSS Case 3011935
//kruparelia - check for override completion date and make percent compete 100 if value is found CSS Case 3011935 

define(['SuiteScripts/SRP/2.0/lib/lodash.min', 'N/record', 'N/search', 'N/runtime', 'N/cache', 'N/format', 'N/error'], function(_, record, search, runtime, cache, format, error) {

    var runCurrentPeriod = null;
    var objAccountingPeriods = null;
    var LAST_DAY_OF_MONTH = null;
    var FIRST_DAY_OF_MONTH = null;
    var EXECUTION_PERIOD = null;
    var LAST_PERIOD_SETUP = null;

    function isRunningCurrentPeriod() {
        if (runCurrentPeriod != null) {
            return runCurrentPeriod;
        }
        var objScript = runtime.getCurrentScript();
        var runCurrentPeriodParam = objScript.getParameter({
            name: 'custscriptr7_revrecovride_calc_mr_currnt'
        });

        runCurrentPeriod = (runCurrentPeriodParam == 'true' || runCurrentPeriodParam === true) ? true : false;

        return runCurrentPeriod;
    }

    function getFirstDayOfMonth() {
        FIRST_DAY_OF_MONTH = FIRST_DAY_OF_MONTH || ((isRunningCurrentPeriod()) ? firstDayInCurrentMonth() : firstDayInLastMonth());
        return FIRST_DAY_OF_MONTH;
    }

    function getLastDayOfMonth() {
        LAST_DAY_OF_MONTH = LAST_DAY_OF_MONTH || ((isRunningCurrentPeriod()) ? lastDayInCurrentMonth() : lastDayInLastMonth());
        return LAST_DAY_OF_MONTH;
    }

    function getExecutionPeriod() {

        EXECUTION_PERIOD = EXECUTION_PERIOD || getAccountingPeriodByDate(getLastDayOfMonth());
        return EXECUTION_PERIOD;
    }

    function getAccountingPeriods() {

        if (objAccountingPeriods) {
            return objAccountingPeriods;
        }

        objAccountingPeriods = {};

        var objSearch = search.create({
            type: search.Type.ACCOUNTING_PERIOD,
            columns: [search.createColumn({
                name: 'internalid'
            }), search.createColumn({
                name: 'periodname'
            }), search.createColumn({
                name: 'startdate'
            }), search.createColumn({
                name: 'enddate',
                sort: search.Sort.ASC
            })],
            filters: [{
                name: 'isinactive',
                operator: search.Operator.IS,
                values: 'F'
            }, {
                name: 'isquarter',
                operator: search.Operator.IS,
                values: 'F'
            }, {
                name: 'isyear',
                operator: search.Operator.IS,
                values: 'F'
            }]
        });

        objSearch.run().each(function(result) {
            var id = result.getValue({
                name: 'internalid'
            });

            objAccountingPeriods[id] = {
                id: result.getValue({
                    name: 'internalid'
                }),
                name: result.getValue({
                    name: 'periodname'
                }),
                startdate_txt: result.getValue({
                    name: 'startdate'
                }),
                startdate: format.parse({
                    value: result.getValue({
                        name: 'startdate'
                    }),
                    type: format.Type.DATE
                }),
                enddate_txt: result.getValue({
                    name: 'enddate'
                }),
                enddate: format.parse({
                    value: result.getValue({
                        name: 'enddate'
                    }),
                    type: format.Type.DATE
                })
            };

            LAST_PERIOD_SETUP = objAccountingPeriods[id];
            return true;
        });

        return objAccountingPeriods;
    }

    function getAccountingPeriodById(periodId) {

        if (!objAccountingPeriods) {
            getAccountingPeriods();
        }

        return objAccountingPeriods[periodId];
    }

    function getAccountingPeriodByDate(date) {

        if (!date) {
            return null;
        }

        if (!objAccountingPeriods) {
            getAccountingPeriods();
        }

        var compareDate = getCompareIntForDate(date);

        var matchPeriod = null;
        _.forIn(objAccountingPeriods, function(objPeriod) {
            if (compareDate >= getCompareIntForDate(objPeriod.startdate) && compareDate <= getCompareIntForDate(objPeriod.enddate)) {
                matchPeriod = objPeriod;
                return false;
            }
            return true;
        });

        return matchPeriod;
    }

    function getCompareIntForDate(date) {
        return (date) ? _.parseInt(_.join([_.padStart(date.getFullYear(), 4, '0'), _.padStart((date.getMonth() + 1), 2, '0'), _.padStart(date.getDate(), 2, '0')], '')) : -1;
    }

    function handleErrorIfAny(summary) {

        var objSummary = {
            processedCount: 0,
            errorCount: 0,
            inputStage: {
                errors: []
            },
            mapStage: {
                errors: []
            },
            reduceStage: {
                errors: []
            }
        };

        summary.output.iterator().each(function(key, value) {
            objSummary.processedCount++;
            return true;
        });

        if (summary.inputSummary.error) {
            objSummary.errorCount++;
            objSummary.inputStage.errors.push(summary.inputSummary.error);
        }

        summary.mapSummary.errors.iterator().each(function(key, value) {
            objSummary.errorCount++;
            objSummary.mapStage.errors.push('id: ' + key + '\nError: ' + JSON.parse(value).message);
            return true;
        });

        summary.reduceSummary.errors.iterator().each(function(key, value) {
            objSummary.errorCount++;
            objSummary.reduceStage.errors.push('id: ' + key + '\nError: ' + JSON.parse(value).message);
            return true;
        });

        log.audit('processed', objSummary.processedCount);
        log.audit('errors', objSummary.errorCount);

        if (objSummary.inputStage.errors.length > 0) {
            log.error('getInput', objSummary.inputStage);
        }
        if (objSummary.mapStage.errors.length > 0) {
            log.error('map', objSummary.mapStage);
        }
        if (objSummary.reduceStage.errors.length > 0) {
            log.error('reduce', objSummary.reduceStage);
        }
    }

    function getTimeEntries(params) {

        params = params || {};

        if (!params.job_id) {
            return null;
        }

        var objSearch = search.create({
            type: 'timebill',
            columns: [search.createColumn({
                name: 'internalid'
            }), search.createColumn({
                name: 'date',
                sort: search.Sort.ASC
            }), search.createColumn({
                name: 'customer'
            }), search.createColumn({
                name: 'durationdecimal'
            }), search.createColumn({
                name: 'type'
            }), search.createColumn({
                name: 'casetaskevent'
            }), search.createColumn({
                name: 'nonbillabletask',
                join: 'projecttask'
            }), search.createColumn({
                name: 'employee'
            }), search.createColumn({
                name: 'isbillable'
            })],
            filters: [{
                    name: 'internalid',
                    join: 'job',
                    operator: search.Operator.IS,
                    values: params.job_id
                }, {
                    name: 'approvalstatus',
                    operator: search.Operator.ANYOF,
                    values: [3]
                }, {
                    name: 'type',
                    operator: search.Operator.IS,
                    values: 'A'
                }, {
                    name: 'date',
                    operator: search.Operator.ONORBEFORE,
                    values: format.format({
                        value: getLastDayOfMonth(),
                        type: format.Type.DATE
                    })
                }, { //kruparelia - add filter to saved search to not remove non-billable tasks in calculation - CSS Case 3011935 
                    name: 'nonbillabletask',
                    join: 'projecttask',
                    operator: search.Operator.IS,
                    values: 'F'
                } //end kruparelia
            ]
        });

        var objJobTime = {
            internalid: params.job_id,
            total_hours: 0,
            period_hours: 0,
            time_entries: []
        };

        objSearch.run().each(function(result) {

            var objTime = {
                internalid: result.getValue({
                    name: 'internalid'
                }),
                date: result.getValue({
                    name: 'date'
                }),
                job: result.getValue({
                    name: 'customer'
                }),
                durationdecimal: parseFloat(result.getValue({
                        name: 'durationdecimal'
                    }) ||
                    0),
                type: result.getValue({
                    name: 'type'
                }),
                casetaskevent: result.getValue({
                    name: 'casetaskevent'
                }),
                employee: result.getValue({
                    name: 'employee'
                }),
                isbillable: result.getValue({
                    name: 'isbillable'
                }),
                nonBillableTask: result.getValue({
                    name: 'nonbillabletask',
                    join: 'projecttask'
                })
            };

            if (!objTime.job || objTime.nonBillableTask == 'T') {
                return true;
            }

            objJobTime.total_hours = _.round(_.add(objJobTime.total_hours, objTime.durationdecimal), 2);
            objJobTime.time_entries.push(objTime);
            return true;
        });

        return objJobTime;
    }

    function lastDayInCurrentMonth() {
        var today = new Date();
        return new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0, 12));
    }

    function lastDayInLastMonth() {
        var today = new Date();
        return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 0, 12));
    }

    function firstDayInCurrentMonth() {
        var today = new Date();
        return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1, 12));
    }

    function firstDayInLastMonth() {
        var today = new Date();
        return new Date(Date.UTC(today.getFullYear(), today.getMonth() - 1, 1, 12));
    }

    function getInputData() {

        return search.create({
            type: 'job',
            filters: [
                [
                  ['custentity_r7_ff_project_id_line', 'isempty', ''],
                  'AND',
                  ['projecttask.enddate', 'onorafter', format.format({
                     value: getFirstDayOfMonth(),
                     type: format.Type.DATE
                  })]
                ],
                'OR',
                ['custentity_r7_ff_project_id_line', 'isnotempty', '']
                //['internalid',search.Operator.IS,'235217850']
            ],
            columns: [search.createColumn({
                name: 'internalid',
                summary: search.Summary.GROUP
            }), search.createColumn({
                name: 'enddate',
                join: 'projecttask',
                summary: search.Summary.MAX
            })]

        });
    }

    function map(context) {

        var result = JSON.parse(context.value);
        var resultValues = result.values;

        var jobId = _.get(resultValues, 'GROUP(internalid).value');

        if (jobId) {

            var jobMaxEndDate = _.get(resultValues, 'MAX(enddate.projecttask)');

            var objTime = getTimeEntries({
                job_id: jobId
            });

            var recJob = record.load({
                type: record.Type.JOB,
                id: jobId,
                isDynamic: true
            });

            var revRecForecastRule = recJob.getValue({
                fieldId: 'revrecforecastrule'
            });

            if (revRecForecastRule) {
                recJob.setValue({
                    fieldId: 'usepercentcompleteoverride',
                    value: false
                });
            }

            var usePercentCompleteOverride = recJob.getValue({
                fieldId: 'usepercentcompleteoverride'
            });

            recJob.setValue({
                fieldId: 'custentityr7_revrec_perc_ovride_lastrun',
                value: new Date()
            });

            var contractedWork = recJob.getValue({
                    fieldId: 'custentityr7_prj_contracted_work'
                }) ||
                recJob.getValue({
                    fieldId: 'estimatedtimeoverride'
                });

            var ffProjectId = recJob.getValue({
                fieldId: 'custentity_r7_ff_project_id_line'
            });
            log.debug('ffProjectId', ffProjectId);
        
            var contractedWorkCompleted = 0;
            if(ffProjectId){

                if(isRunningCurrentPeriod()){

                    contractedWorkCompleted = recJob.getValue({
                        fieldId: 'custentity_r7_contract_work_completed'
                    });
                    
                }else{

                    contractedWorkCompleted = recJob.getValue({
                        fieldId: 'custentity_r7_contract_work_completed_pm'
                    });
                }
                  
            }else{

                var jobBillingTypeId = recJob.getValue({
                    fieldId: 'jobbillingtype'
                });
                if (jobBillingTypeId == '3') {
                    contractedWorkCompleted = (recJob.getValue({
                        fieldId: 'custentityr7joboverridedate'
                    })) ? (contractedWork || 0) : 0;
                } else {
                    contractedWorkCompleted = Math.min(contractedWork, ((objTime) ? objTime.total_hours : 0));
                }   
            }
            log.debug('contractedWorkCompleted', contractedWorkCompleted);
            
            //kruparelia - check for override completion date and make percent compete 100 if value is found CSS Case 3011935 
            if (recJob.getValue('custentityr7joboverridedate') && parseFloat(recJob.getValue('percentcomplete')) == 100) {
                log.debug('percent 100');
                log.debug('jobId', jobId);
                var percentComplete = 100;
            } else {
                var percentComplete = (contractedWork) ? _.round((contractedWorkCompleted / contractedWork) * 100, 2) : 0;
            }
            //end kruparelia

            //remove all current and future period entries
            var overrideCount = recJob.getLineCount({
                sublistId: 'percentcompleteoverride'
            });

            for (var i = 0; i < overrideCount; i++) {

                var objPeriod = getAccountingPeriodById(recJob.getSublistValue({
                    sublistId: 'percentcompleteoverride',
                    fieldId: 'period',
                    line: i
                }));

                if (objPeriod && getCompareIntForDate(objPeriod.startdate) >= getCompareIntForDate(getFirstDayOfMonth())) {
                    recJob.removeLine({
                        sublistId: 'percentcompleteoverride',
                        line: i
                    });
                    i--;
                    overrideCount--;
                    continue;
                }

            }

            var objLastPeriod = getExecutionPeriod();
            var objEndPeriod = getAccountingPeriodByDate(format.parse({
                    value: jobMaxEndDate,
                    type: format.Type.DATE
                })) ||
                LAST_PERIOD_SETUP;

            //set percents, only if not last period (last period will get 100% plug)
            if (usePercentCompleteOverride) {

                if (objLastPeriod.id != objEndPeriod.id || percentComplete >= 100) {
                    recJob.selectNewLine({
                        sublistId: 'percentcompleteoverride'
                    });
                        recJob.setCurrentSublistValue({
                            sublistId: 'percentcompleteoverride',
                            fieldId: 'period',
                            value: objLastPeriod.id
                        });
                   
                    recJob.setCurrentSublistValue({
                        sublistId: 'percentcompleteoverride',
                        fieldId: 'percent',
                        value: (percentComplete >= 100) ? 100 : percentComplete
                    });
                    recJob.setCurrentSublistValue({
                        sublistId: 'percentcompleteoverride',
                        fieldId: 'comments',
                        value: 'Contracted work: ' + contractedWork
                    });
                    recJob.commitLine({
                        sublistId: 'percentcompleteoverride'
                    });
                }

                //SET PLUG LINE
                if (percentComplete < 100) {
                    recJob.selectNewLine({
                        sublistId: 'percentcompleteoverride'
                    });
                    recJob.setCurrentSublistValue({
                        sublistId: 'percentcompleteoverride',
                        fieldId: 'period',
                        value: objEndPeriod.id
                    });
                    recJob.setCurrentSublistValue({
                        sublistId: 'percentcompleteoverride',
                        fieldId: 'percent',
                        value: 100
                    });
                    recJob.setCurrentSublistValue({
                        sublistId: 'percentcompleteoverride',
                        fieldId: 'comments',
                        value: 'Plug line'
                    });
                    recJob.commitLine({
                        sublistId: 'percentcompleteoverride'
                    });
                }
            } else {
                recJob.selectNewLine({
                    sublistId: 'percentcompleteoverride'
                });
                recJob.setCurrentSublistValue({
                    sublistId: 'percentcompleteoverride',
                    fieldId: 'period',
                    value: objLastPeriod.id
                });
            
                recJob.setCurrentSublistValue({
                    sublistId: 'percentcompleteoverride',
                    fieldId: 'percent',
                    value: (percentComplete >= 100) ? 100 : percentComplete
                });
                recJob.setCurrentSublistValue({
                    sublistId: 'percentcompleteoverride',
                    fieldId: 'comments',
                    value: 'Contracted work: ' + contractedWork
                });
                recJob.commitLine({
                    sublistId: 'percentcompleteoverride'
                });
            }

            context.write(recJob.save({
                ignoreMandatoryFields: true,
                enableSourcing: true
            }));

        }
    }

    function summarize(summary) {

        if (!isRunningCurrentPeriod()) {
            try {

                var overrideExecuteCache = cache.getCache({
                    name: 'r7_revrec_override_exe_cache',
                    scope: cache.Scope.PRIVATE
                });

                var scriptTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscriptr7_job_revrec_perc_comp_ovr',
                    params: {
                        'custscriptr7_revrecovride_calc_mr_currnt': true
                    }
                });

                var taskId = scriptTask.submit();

                overrideExecuteCache.put({
                    key: 'task_id',
                    value: taskId,
                    ttl: 43200
                });
            } catch (e) {}
        }
        handleErrorIfAny(summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});