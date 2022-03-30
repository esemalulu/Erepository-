/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/currentRecord", "N/log", "N/record", "N/search", "N/redirect", "N/task"],

    function(currentRecord, log, record, search, redirect, task) {


        function beforeLoad(context) {
            // log.debug('beforeLoad Triggered');
            // context.newRecord;
            // context.type;
            // context.form;
            return;
        }

        function afterSubmit(ctx) {
            // log.debug('afterSubmit Triggered');
            // context.newRecord;
            // context.oldRecord;
            // context.type;

            onAction(ctx);
          binderEditNonGL(ctx);

            return;
        }

        function beforeSubmit(ctx) {
            // log.debug('beforeSubmit Triggered');
            // context.newRecord;
            // context.oldRecord;
            // context.type;


            return;
        }




        function onAction(ctx){



            //Load the current policy record
            var nRecord          = ctx.newRecord;

            var binderEdit = nRecord.getValue({
                fieldId: 'custrecord_binder_edit'
            });
            var softDelete = nRecord.getValue({
                fieldId: 'custrecord_soft_delete'
            });
            var complete = nRecord.getValue({
                fieldId: 'custrecord_binder_soft_complete'
            });
            //log.audit({title: 'binderEdit ID', details: nRecord.getValue({fieldId: 'binderEdit'})});
            //log.audit({title: 'softDelete ID', details: nRecord.getValue({fieldId: 'softDelete'})});
            if((binderEdit || softDelete) && !complete) {

                try {

                    log.audit({title: 'name ID', details: nRecord.getValue({fieldId: 'name'})});

                    var policyRec = record.load({
                        type: 'customrecord_coalition_policy',
                        id: nRecord.id
                    });


                    //Pull the necessary values from the current policy record.
                    var tranDescription = policyRec.getValue({
                        fieldId: 'custrecord_tran_description'
                    });
                    var externalId = policyRec.getValue({
                        fieldId: 'externalid'
                    });
                    var name = policyRec.getValue({
                        fieldId: 'name'
                    });
                    var isReversing = policyRec.getValue({
                        fieldId: 'custrecord_reversing_policy'
                    });

                    //Check if the external ID has "-BE" in it already. If so, do not process.
                    var doNotProcess = checkExternalId(externalId, isReversing);
                    log.audit({title: 'doNotProcess', details: doNotProcess});

                } catch (e) {

                }

                if (((softDelete == true && tranDescription != 7) || binderEdit == true) && !doNotProcess) {

                    try {
                        var mirrorExternalId = '';
                        var newExternalId = '';
                        var isSoftDelete = softDelete == true ? true : false;
                        var newPolicyRec = record.copy({
                            type: 'customrecord_coalition_policy',
                            id: policyRec.id,
                            isDynamic: true,
                            defaultValues: {}
                        });


                        var externalId = policyRec.getValue({
                            fieldId: 'externalid'
                        });

                        //if Soft Delete, set the transaction description field
                        if (isSoftDelete) {
                            newPolicyRec.setValue({
                                fieldId: 'custrecord_tran_description',
                                value: 7
                            });
                          policyRec.setValue({
                                fieldId: 'custrecord_binder_soft_complete',
                                value: true
                            });
                        } else {
                            newPolicyRec.setValue({
                                fieldId: 'custrecord_binder_edit',
                                value: true
                            });
                        }

                        newPolicyRec.setValue({
                            fieldId: 'custrecord_je_so_lines_processed',
                            value: false
                        });
                        newPolicyRec.setValue({
                            fieldId: 'custrecord_journal_entry_created',
                            value: false
                        });
                        newPolicyRec.setValue({
                            fieldId: 'custrecord_sales_order_created',
                            value: false
                        });
                        newPolicyRec.setValue({
                            fieldId: 'custrecord_reversing_policy',
                            value: true
                        });

                        newPolicyRec.setValue({
                            fieldId: 'name',
                            value: policyRec.getValue({fieldId: 'name'})
                        });

                        newPolicyRec.setValue({
                            fieldId: 'custrecord_binder_soft_complete',
                            value: true
                        });


                        //if Soft Delete, set the external ID of the mirror record to external + D
                        if (isSoftDelete) {
                            newPolicyRec.setValue({
                                fieldId: 'externalid',
                                value: externalId + 'D'
                            });

                            //if Binder Edit, determine the updated external ID of the original record and the mirror record.
                        } else {
                            var lastBinderId = policyRec.getValue({
                                fieldId: 'custrecord_last_binder_edit_id'
                            });

                            if (isEmpty(lastBinderId)) {
                                mirrorExternalId = externalId + '-BE1'
                                newExternalId = externalId + '-BE0'
                            } else {
                                if (lastBinderId.indexOf("-BE0") > -1) {
                                    mirrorExternalId = externalId + '-BE3'
                                    newExternalId = externalId + '-BE2'
                                }
                                if (lastBinderId.indexOf("-BE2") - 1) {
                                    mirrorExternalId = externalId + '-BE5'
                                    newExternalId = externalId + '-BE4'
                                }
                                if (lastBinderId.indexOf("-BE4") - 1) {
                                    mirrorExternalId = externalId + '-BE7'
                                    newExternalId = externalId + '-BE6'
                                }
                                if (lastBinderId.indexOf("-BE6") - 1) {
                                    mirrorExternalId = externalId + '-BE9'
                                    newExternalId = externalId + '-BE8'
                                }
                                if (lastBinderId.indexOf("-BE8") - 1) {
                                    mirrorExternalId = externalId + '-BE11'
                                    newExternalId = externalId + '-BE10'
                                }

                            }

                            log.audit({
                                title: 'mirrorExternalId',
                                details: mirrorExternalId
                            });
                            log.audit({
                                title: 'newExternalId',
                                details: newExternalId
                            });

                            newPolicyRec.setValue({
                                fieldId: 'externalid',
                                value: mirrorExternalId
                            });
                            policyRec.setValue({
                                fieldId: 'externalid',
                                value: newExternalId
                            });

                            policyRec.setValue({
                                fieldId: 'custrecord_last_binder_edit_id',
                                value: newExternalId
                            });
                            policyRec.setValue({
                                fieldId: 'custrecord_original_external_id',
                                value: externalId
                            });
                            policyRec.setValue({
                                fieldId: 'custrecord_binder_soft_complete',
                                value: true
                            });


                        }

                        log.audit({
                            title: 'reverseFields',
                            details: ''
                        });
                        newPolicyRec = reverseFields(newPolicyRec);


                        log.audit({
                            title: 'Save New Policy',
                            details: ''
                        });

                        var newRecId = newPolicyRec.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

                        log.audit({
                            title: 'Reload Policy',
                            details: ''
                        });
                        //Re-save the record to initiate the workflow
                        /*                       var rePolicyRec = record.load({
                                                   type: 'customrecord_coalition_policy',
                                                   id: newRecId,
                                                   isDynamic: true
                                               });

                                               log.audit({
                                                   title: 'Resave policy',
                                                   details: ''
                                               });
                                               rePolicyRec.save({
                                                   enableSourcing: true,
                                                   ignoreMandatoryFields: true
                                               });
                       */
                        log.audit({
                            title: 'Save original Policy',
                            details: ''
                        });

                        policyRec.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });


                        //Initiate a scheduled script to load and save the mirror records to initiate the workflows.
                        var scriptTask = task.create({taskType: task.TaskType.MAP_REDUCE});
                        scriptTask.scriptId = 809;// SB =>687, PROD =>809
                        scriptTask.deploymentId = 'customdeploy_policy_trigger_mr';
                        var scriptTaskId = scriptTask.submit();


                    } catch (e) {
                        log.error({title: 'failed to create', details: JSON.stringify(e)});
                    }

                    if (binderEdit == true) {
                        //if binder edit
                        try {

                            var dupPolicyRec = record.copy({
                                type: 'customrecord_coalition_policy',
                                id: policyRec.id,
                                isDynamic: true,
                                defaultValues: {}
                            });

                            log.audit({
                                title: 'Set Dup Record Field',
                                details: ''
                            });

                            dupPolicyRec.setValue({
                                fieldId: 'externalid',
                                value: externalId
                            });
                            dupPolicyRec.setValue({
                                fieldId: 'custrecord_je_so_lines_processed',
                                value: true
                            });
                            dupPolicyRec.setValue({
                                fieldId: 'custrecord_binder_edit',
                                value: false
                            });
                            dupPolicyRec.setValue({
                                fieldId: 'custrecord_original_policy',
                                value: policyRec.id
                            });
                            dupPolicyRec.setValue({
                                fieldId: 'name',
                                value: name
                            });
                            dupPolicyRec.setValue({
                                fieldId: 'custrecord_nsts_invoice_id',
                                value: ''
                            });
                            dupPolicyRec.setValue({
                                fieldId: 'custrecord_journal_entry_created',
                                value: false
                            });
                            dupPolicyRec.setValue({
                                fieldId: 'custrecord_sales_order_created',
                                value: false
                            });


                            dupPolicyRec.setValue({
                                fieldId: 'custrecord_binder_edit_notification',
                                value: '**THIS IS A BINDER EDIT**'
                            });

                            var dupPolicyRecId = dupPolicyRec.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            });

                            log.audit({
                                title: 'Return dup Rec ID',
                                details: dupPolicyRecId
                            });

                            redirect.toRecord({
                                type: 'customrecord_coalition_policy',
                                id: dupPolicyRecId,
                                isEditMode: true
                            });


                        } catch (e) {
                            log.error({title: 'failed to create duplicate policy', details: JSON.stringify(e)});
                        }
                    }


                }
            }

            return null;
        }



        function binderEditNonGL(ctx){

            //Load the current policy record
            var nRecord          = ctx.newRecord;

            ///////New field to be added in PROD/////////////
            var binderEditNGL = nRecord.getValue({
                fieldId: 'custrecord_binder_edit_non_gl'
            });
            ////////////////////////////////////////////////
            var complete = nRecord.getValue({
                fieldId: 'custrecord_binder_soft_complete'
            });
            var softDelete = nRecord.getValue({
                fieldId: 'custrecord_soft_delete'
            });

            if(binderEditNGL && !complete && !softDelete) {

                try {

                    log.audit({title: 'name ID', details: nRecord.getValue({fieldId: 'name'})});

                    var policyRec = record.load({
                        type: 'customrecord_coalition_policy',
                        id: nRecord.id
                    });


                    //Pull the necessary values from the current policy record.
                    var tranDescription = policyRec.getValue({
                        fieldId: 'custrecord_tran_description'
                    });
                    var externalId = policyRec.getValue({
                        fieldId: 'externalid'
                    });
                    var name = policyRec.getValue({
                        fieldId: 'name'
                    });
                    var isReversing = policyRec.getValue({
                        fieldId: 'custrecord_reversing_policy'
                    });

                    //Check if the external ID has "-BE" in it already. If so, do not process.
                    var doNotProcess = checkExternalId(externalId, isReversing);
                    log.audit({title: 'doNotProcess', details: doNotProcess});

                } catch (e) {

                }

                if (binderEditNGL == true && !doNotProcess) {

                    try {
                        var mirrorExternalId = '';
                        var newExternalId = '';

                        var newPolicyRec = record.copy({
                            type: 'customrecord_coalition_policy',
                            id: policyRec.id,
                            isDynamic: true,
                            defaultValues: {}
                        });


                        var externalId = policyRec.getValue({
                            fieldId: 'externalid'
                        });

                        newPolicyRec.setValue({
                            fieldId: 'custrecord_binder_edit_non_gl',
                            value: true
                        });

                        newPolicyRec.setValue({
                            fieldId: 'custrecord_je_so_lines_processed',
                            value: true
                        });
                        newPolicyRec.setValue({
                            fieldId: 'custrecord_journal_entry_created',
                            value: true
                        });
                        newPolicyRec.setValue({
                            fieldId: 'custrecord_sales_order_created',
                            value: true
                        });
                        newPolicyRec.setValue({
                            fieldId: 'custrecord_reversing_policy',
                            value: true
                        });
                      newPolicyRec.setValue({
                            fieldId: 'custrecord_credit_memo',
                            value: newPolicyRec.getValue('custrecord_credit_memo') ? false : true
                        });

                        newPolicyRec.setValue({
                            fieldId: 'name',
                            value: policyRec.getValue({fieldId: 'name'})
                        });

                        newPolicyRec.setValue({
                            fieldId: 'custrecord_binder_soft_complete',
                            value: true
                        });


                        //if Soft Delete, set the external ID of the mirror record to external + D

                        var lastBinderId = policyRec.getValue({
                            fieldId: 'custrecord_last_binder_edit_id'
                        });

                        if (isEmpty(lastBinderId)) {
                            mirrorExternalId = externalId + '-BE1'
                            newExternalId = externalId + '-BE0'
                        } else {
                            if (lastBinderId.indexOf("-BE0") > -1) {
                                mirrorExternalId = externalId + '-BE3'
                                newExternalId = externalId + '-BE2'
                            }
                            if (lastBinderId.indexOf("-BE2") - 1) {
                                mirrorExternalId = externalId + '-BE5'
                                newExternalId = externalId + '-BE4'
                            }
                            if (lastBinderId.indexOf("-BE4") - 1) {
                                mirrorExternalId = externalId + '-BE7'
                                newExternalId = externalId + '-BE6'
                            }
                            if (lastBinderId.indexOf("-BE6") - 1) {
                                mirrorExternalId = externalId + '-BE9'
                                newExternalId = externalId + '-BE8'
                            }
                            if (lastBinderId.indexOf("-BE8") - 1) {
                                mirrorExternalId = externalId + '-BE11'
                                newExternalId = externalId + '-BE10'
                            }

                        }

                        log.audit({
                            title: 'mirrorExternalId',
                            details: mirrorExternalId
                        });
                        log.audit({
                            title: 'newExternalId',
                            details: newExternalId
                        });

                        newPolicyRec.setValue({
                            fieldId: 'externalid',
                            value: mirrorExternalId
                        });
                        policyRec.setValue({
                            fieldId: 'externalid',
                            value: newExternalId
                        });

                        policyRec.setValue({
                            fieldId: 'custrecord_last_binder_edit_id',
                            value: newExternalId
                        });
                        policyRec.setValue({
                            fieldId: 'custrecord_original_external_id',
                            value: externalId
                        });
                        policyRec.setValue({
                            fieldId: 'custrecord_binder_soft_complete',
                            value: true
                        });


                        log.audit({
                            title: 'reverseFields',
                            details: ''
                        });
                        newPolicyRec = reverseFields(newPolicyRec);


                        log.audit({
                            title: 'Save New Policy',
                            details: ''
                        });

                        var newRecId = newPolicyRec.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

                        log.audit({
                            title: 'Reload Policy',
                            details: ''
                        });

                        log.audit({
                            title: 'Save original Policy',
                            details: ''
                        });

                        policyRec.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

/*
                        //Initiate a scheduled script to load and save the mirror records to initiate the workflows.
                        var scriptTask = task.create({taskType: task.TaskType.MAP_REDUCE});
                        scriptTask.scriptId = 809;// SB =>687, PROD =>809
                        scriptTask.deploymentId = 'customdeploy_policy_trigger_mr';
                        var scriptTaskId = scriptTask.submit();
*/

                    } catch (e) {
                        log.error({title: 'failed to create', details: JSON.stringify(e)});
                    }

                    try {

                        var dupPolicyRec = record.copy({
                            type: 'customrecord_coalition_policy',
                            id: policyRec.id,
                            isDynamic: true,
                            defaultValues: {}
                        });

                        log.audit({
                            title: 'Set Dup Record Field',
                            details: ''
                        });

                        dupPolicyRec.setValue({
                            fieldId: 'externalid',
                            value: externalId
                        });
                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_je_so_lines_processed',
                            value: true
                        });

                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_journal_entry_created',
                            value: true
                        });
                      dupPolicyRec.setValue({
                            fieldId: 'custrecord_credit_memo',
                            value: false
                        });

                        ///////////NEW FIELDS THAT NEED TO BE ADDED IN PROD///////////////
                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_original_sales_order',
                            value: policyRec.getValue({fieldId: 'custrecord_ns_sales_order'})
                        });
                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_original_invoice',
                            value: policyRec.getValue({fieldId: 'custrecord_nsts_invoice_id'})
                        });
                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_original_journal_entry',
                            value: policyRec.getValue({fieldId: 'custrecord_coal_je_id_kp'})
                        });
                        ////////////////////////////////////////////////////////////////

                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_binder_edit_non_gl',
                            value: true
                        });
                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_original_policy',
                            value: policyRec.id
                        });
                        dupPolicyRec.setValue({
                            fieldId: 'name',
                            value: name
                        });
                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_nsts_invoice_id',
                            value: ''
                        });
                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_journal_entry_created',
                            value: true
                        });
                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_sales_order_created',
                            value: true
                        });

                        dupPolicyRec.setValue({
                            fieldId: 'custrecord_binder_edit_notification',
                            value: '**THIS IS A NON GL BINDER EDIT**'
                        });

                        var dupPolicyRecId = dupPolicyRec.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

                        log.audit({
                            title: 'Return dup Rec ID',
                            details: dupPolicyRecId
                        });

                        redirect.toRecord({
                            type: 'customrecord_coalition_policy',
                            id: dupPolicyRecId,
                            isEditMode: true
                        });


                    } catch (e) {
                        log.error({title: 'failed to create duplicate policy', details: JSON.stringify(e)});
                    }



                }
            }

            return null;
        }







        function reverseFields(newPolicyRec){
            newPolicyRec.setValue({
                fieldId: 'custrecord_agg_total_limit',
                value: newPolicyRec.getValue({fieldId: 'custrecord_agg_total_limit'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_factor_schedule_rating_mod',
                value: newPolicyRec.getValue({fieldId: 'custrecord_factor_schedule_rating_mod'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_premium_net',
                value: newPolicyRec.getValue({fieldId: 'custrecord_premium_net'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sir',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sir'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_asset_restoration',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_asset_restoration'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_bipd_first_party',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_bipd_first_party'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_bipd_third_party',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_bipd_third_party'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_biz_interruption',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_biz_interruption'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_breach_response',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_breach_response'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_breach_response_cost',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_breach_response_cost'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_computer_replacement',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_computer_replacement'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_court_attendance',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_court_attendance'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_criminal_reward',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_criminal_reward'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_crisis_management',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_crisis_management'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_ftl',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_ftl'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_funds_transfer',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_funds_transfer'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_invoice_manipulation',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_invoice_manipulation'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_media_liability',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_media_liability'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_network',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_network'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_pci',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_pci'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_phishing',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_phishing'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_pollution',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_pollution'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_regulatory_defense',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_regulatory_defense'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_reputation',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_reputation'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_reputational_harm',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_reputational_harm'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_service_fraud',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_service_fraud'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_systems_integrity',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_systems_integrity'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_sublimit_tech_eo',
                value: newPolicyRec.getValue({fieldId: 'custrecord_sublimit_tech_eo'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_surcharge_fee_admin',
                value: newPolicyRec.getValue({fieldId: 'custrecord_surcharge_fee_admin'}) * -1
            });
            newPolicyRec.setValue({
                fieldId: 'custrecord_total_premium_bound',
                value: newPolicyRec.getValue({fieldId: 'custrecord_total_premium_bound'}) * -1
            });



            return newPolicyRec;
        }


        function checkExternalId(externalId, isReversing){


            if((externalId.indexOf('-BE') > -1) || isReversing){
                return true;
            }
            else{
                return false;
            }

        }

        function isEmpty(param) {
            if (param === '' || param === null || param === undefined || param.length <= 0 || param ==='null') {
                return true;
            }
            return false;
        }


        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit,
            beforeSubmit: beforeSubmit
        }
})