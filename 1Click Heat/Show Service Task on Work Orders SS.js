/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function execute() {
        try {
            const TASK_FIELD_MAP = {
                '786': 'custrecord_compatible_for_new_thermostat',       // Freeform ("Yes"/"No")
                '789': 'custrecord_existing_thermostat',                 // List/Record
                '793': 'custrecord_thermostat_serial_number',            // Freeform
                '794': 'custrecord_pek_wiring_needed',                   // Freeform ("Yes"/"No")
                '795': 'custrecord_fast_stat_needed',                    // Freeform ("Yes"/"No")
                '797': 'custrecord_compatible_4_new_thermostats',        // Freeform ("Yes"/"No")
                '798': 'custrecord_number_of_mysas_being_install',       // List/Record
                '802': 'custrecord_mysa_1_serial_number',                // Freeform
                '806': 'custrecord_mysa_2_serial_number',                // Freeform
                '810': 'custrecord_mysa_3_serial_number',                // Freeform
                '814': 'custrecord_mysa_4_serial_number',                // Freeform
                '818': 'custrecord_mysa_5_serial_number'                 // Freeform
            };

            const SENT_TO_WO_FIELD = 'custrecord_value_sent_to_wo';

            const taskSearch = search.create({
                type: 'customrecord_cmms_service_order_srvctask',
                filters: [
                    ['custrecord_cmms_cso_srvctsk_task', 'anyof', Object.keys(TASK_FIELD_MAP)],
                    'AND',
                    ['custrecord_cmms_cso_srvctsk_entry', 'isnotempty', ''],
                    'AND',
                    [SENT_TO_WO_FIELD, 'is', 'F']
                ],
                columns: [
                    'internalid',
                    'custrecord_cmms_cso_srvctsk_serviceorder',
                    'custrecord_cmms_cso_srvctsk_task',
                    'custrecord_cmms_cso_srvctsk_entry',
                    'custrecord_cmms_cso_srvctsk_entry_value'
                ]
            });

            const paged = taskSearch.runPaged({ pageSize: 1000 });

            paged.pageRanges.forEach(function (pageRange) {
                const page = paged.fetch({ index: pageRange.index });

                page.data.forEach(function (res) {
                    const taskRecId = res.getValue('internalid');
                    const soId = res.getValue('custrecord_cmms_cso_srvctsk_serviceorder');
                    const taskId = res.getValue('custrecord_cmms_cso_srvctsk_task');
                    const entryText = res.getValue('custrecord_cmms_cso_srvctsk_entry');
                    const entryValue = res.getValue('custrecord_cmms_cso_srvctsk_entry_value');
                    const fieldToUpdate = TASK_FIELD_MAP[taskId];

                    if (!soId || !fieldToUpdate) return;

                    let valueToSet = null;

                    if (['789', '798'].includes(taskId)) {
                        if (entryValue) valueToSet = entryValue;
                        else return;
                    }
                    else {
                        if (entryText) valueToSet = entryText;
                        else return;
                    }

                    try {
                        const soRec = record.load({
                            type: 'customrecord_cmms_equipment_service',
                            id: soId
                        });

                        const currentValue = soRec.getValue({ fieldId: fieldToUpdate });

                        if (!currentValue) {
                            record.submitFields({
                                type: 'customrecord_cmms_equipment_service',
                                id: soId,
                                values: { [fieldToUpdate]: valueToSet },
                                options: { enableSourcing: false, ignoreMandatoryFields: true }
                            });

                            record.submitFields({
                                type: 'customrecord_cmms_service_order_srvctask',
                                id: taskRecId,
                                values: { [SENT_TO_WO_FIELD]: true },
                                options: { enableSourcing: false, ignoreMandatoryFields: true }
                            });

                            log.debug('WO updated', `WO ${soId} → ${fieldToUpdate} = "${valueToSet}", Task ${taskRecId} marked as sent`);
                        } else {
                            log.debug('WO skipped', `WO ${soId} already has value "${currentValue}", no update performed`);
                        }

                    } catch (e) {
                        log.error('Update failed', `WO ${soId}: ${e.message}`);
                    }
                });
            });

        } catch (e) {
            log.error('Script failed', e);
        }
    }

    return { execute };
});
