/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/runtime'], (log, record, runtime) => {
        const fields = [["custentityr7internalips","custbodyr7internalips"],
            ["custentityr7externalips", "custbodyr7externalips"],
            ["custentityr7currentwebscanner", "custbodyr7oppcurrentwebscanner"],
            ["custentityr7currentwebscannerrenewal", "custbodyr7oppcurrentwebscannerrenewal"],
            ["custentityr7currentdbscanner", "custbodyr7oppcurrentdbscanner"],
            ["custentityr7currentdbscannerrenewal", "custbodyr7oppcurrentdbscannerrenewal"],
            ["custentityr7approvedproject", "custbodyr7salesoppapprovedproject"],
            ["custentityr7custvulnerabilitymgmntprog", "custbodyr7oppvulnerabilitymgmntprog"],
            ["custentityr7currententerprisescanner", "custbodyr7oppcurrententerprisescanner"],
            ["custentityr7currententerprisescannerdate", "custbodyr7currententerprisescannerdate"],
            ["custentityr7custsubjecttopcicompliance", "custbodyr7oppsubjecttopcicompliance"],
            ["custentityr7custsubjecttofisma", "custbodyr7oppsubjecttofisma"],
            ["custentityr7custsubjecttonerc", "custbodyr7oppsubjecttonerc"],
            ["custentityr7custneed", "custbodyr7need"],
            ["custentityr7budget", "custbodyr7opportunitybudget"],
            ["custentityr7currentpenetrationtest", "custbodyr7oppcurrentpenetrationtest"],
            ["custentityr7currentpenetrationtestdate", "custbodyr7oppcurrentpenetrationrenewal"],
            ["custentityr7currentexternalscanner", "custbodyr7oppcurrentexternalscanner"],
            ["custentityr7currentexternalscannerdate", "custbodyr7currentexternalscannerdate"]];

        const afterSubmit = (context) => {
            const {type, UserEventType, newRecord} = context;
            const {executionContext, ContextType} = runtime;
            const {USER_INTERFACE} = ContextType;
            const {EDIT, DELETE, CREATE} = UserEventType;

            if(type !== DELETE && (type === CREATE || type === EDIT) && executionContext === USER_INTERFACE){
                try{
                    let oppRecord = record.load({type: newRecord.type, id: newRecord.id});
                    log.debug('Partner value Coming IN', oppRecord.getValue({fieldId: 'partner'}));

                    let customerId = oppRecord.getValue({fieldId:'entity'});
                    let probability = oppRecord.getValue({fieldId:'probability'});
                    probability = parseFloat(probability);

                    if (probability > 0 && probability < 100) {
                        let custRecord = record.load({type: record.Type.CUSTOMER, id: customerId});
                        for (let i = 0; fields != null && i < fields.length; i++) {

                            let field_id = fields[i][0];
                            let field_value = oppRecord.getValue({fieldId: fields[i][1]});

                            log.debug('field_id',field_id);
                            log.debug('field_value',field_value);

                            custRecord.setValue({fieldId: field_id, value: field_value});
                        }
                        let custId = custRecord.save({enableSourcing:true, ignoreMandatoryFields: true});
                        log.debug('custId', custId);
                    }

                }catch (err){
                    log.error('Error Occurred',err);
                }

            }

        }

        return {afterSubmit}

    });