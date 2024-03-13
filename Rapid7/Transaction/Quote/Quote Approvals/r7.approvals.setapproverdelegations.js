/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log','N/search'],
    (record, log, search) => {
        const afterSubmit = (context) => {

                try {
                    const {type, newRecord, UserEventType} = context;
                    const {DELETE} = UserEventType;
                    if(type === DELETE){
                                return;
                        }
                        let recordObj = record.load({
                                type: 'customrecordr7approvalrecord',
                                id: newRecord.id

                        })
                        let status = recordObj.getValue({fieldId: 'custrecordr7approvalstatus'});
                        log.debug("status",  status);

                        if(status === '1'){

                                let approver = recordObj.getValue({fieldId: 'custrecordr7approvalapprover'});
                                log.debug("approver",  approver);

                                if(approver){
                                        let customrecord_quote_approver_delegationsSearchObj = search.create({
                                                type: "customrecord_quote_approver_delegations",
                                                filters:
                                                    [
                                                            ["isinactive","is","F"],
                                                            "AND",
                                                            ["custrecord_approver","anyof",approver],
                                                            "AND",
                                                            ["custrecord_start_date_qad","onorbefore","today"],
                                                            "AND",
                                                            [["custrecord_end_date_qad","onorafter","today"],"OR",["custrecord_end_date_qad","isempty",""]]
                                                    ],
                                                columns:
                                                    [
                                                            search.createColumn({name: "internalid", label: "Internal ID"}),
                                                            search.createColumn({name: "custrecord_approver", label: "Approver"}),
                                                            search.createColumn({name: "custrecord_delegation_approver", label: "Delegation Approver"}),
                                                            search.createColumn({name: "custrecord_start_date_qad", label: "Start Date"}),
                                                            search.createColumn({name: "custrecord_end_date_qad", label: "End Date"})
                                                    ]
                                        });
                                        let searchResultCount = customrecord_quote_approver_delegationsSearchObj.runPaged().count;
                                        log.debug("customrecord_quote_approver_delegationsSearchObj result count",searchResultCount);
                                        customrecord_quote_approver_delegationsSearchObj.run().each(function(result){
                                                // .run().each has a limit of 4,000 results

                                                let delegationApprover = result.getValue({name: "custrecord_delegation_approver"});
                                                log.debug("delegationApprover",  delegationApprover);

                                                recordObj.setValue({fieldId: 'custrecordr7approvalapprover', value: delegationApprover});

                                                let approvalRecID = recordObj.save();
                                                log.debug("approvalRecID",  approvalRecID);

                                                return true;
                                        });
                                }
                        }
                }catch (e) {
                        log.error('Error afterSubmit', e);
                }
        }

        return {afterSubmit}

    });
