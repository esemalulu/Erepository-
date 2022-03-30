/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */

define(['N/record', 'N/log'],function(record, log) {
    function onAction(ctx){

        log.audit({
            title: 'ctx',
            details: JSON.stringify(ctx)
        });

        var policyRec       = ctx.newRecord;
        var softDelete = policyRec.getValue({
            fieldId: 'custrecord_soft_delete'
        });
        var tranDescription = policyRec.getValue({
            fieldId: 'custrecord_tran_description'
        });

        log.audit({
            title: 'softDelete',
            details: softDelete
        });



        if(softDelete == true && tranDescription != 7) {
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
                fieldId: 'custrecord_tran_description',
                value: 7
            });

            newPolicyRec.setValue({
                fieldId: 'custrecord_je_so_lines_processed',
                value: false
            });

            newPolicyRec.setValue({
                fieldId: 'name',
                value: policyRec.getValue({fieldId: 'name'})
            });

            newPolicyRec.setValue({
                fieldId: 'externalid',
                value: externalId + 'D'
            });
            newPolicyRec = reverseFields(newPolicyRec);


            var newRecId = newPolicyRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.audit({
                title: 'newRecId',
                details: newRecId
            });

            return newRecId;
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


    return {
        onAction: onAction
    };
})