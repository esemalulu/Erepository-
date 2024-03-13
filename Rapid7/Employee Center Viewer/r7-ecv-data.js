/**
 *  @NAPIVersion 2.0
 *  @NModuleScope Public
 */
define([
    'N/log',
    'N/record',
    'N/runtime',
    'N/search'
], function (log, record, runtime, search) {
    function getGlobalSearchResults(keywords) {
        const configRecord = getConfigurationRecord();
        // noinspection JSCheckFunctionSignatures
        const globalTypes = JSON.parse(configRecord.getValue({ fieldId: 'custrecord_r7_ecvc_global_search_types' }));

        return search.global({ keywords })
            .map(result => ({
                recordId: result.id,
                recordType: result.recordType,
                name: result.getValue({ name: 'name' }),
                type: result.getValue({ name: 'type' }),
                info1: result.getValue({ name: 'info1' }),
                info2: result.getValue({ name: 'info2' })
            }))
            .filter(result => {
                return globalTypes.includes(result.recordType);
            });
    }

    /**
     * @typedef {Object} fieldLayout
     * @property {Array} fieldGroups
     * @property {Array} sublists
     * @property {Object} maps
     * @property {Object} defaults
     */

    /**
     * Gets the form layout for the given record from the configuration record
     *
     * @param {string} configType - 'entity' or 'transaction'
     * @param recordType - the entity or transaction type like 'customer' or 'salesorder'
     * @returns fieldLayout
     */
    function getFormLayout(configType, recordType) {
        const configRecord = getConfigurationRecord();

        const fieldId = `custrecord_r7_ecvc_${configType}_config`;
        // noinspection JSCheckFunctionSignatures
        const config = JSON.parse(configRecord.getValue({ fieldId }));

        return config[recordType] || config['default'];
    }

    function getConfigRecordIds() {
        const userId = runtime.getCurrentUser().id;
        const departmentId = search.lookupFields({
            type: 'employee',
            id: userId,
            columns: ['department']
        })['department'][0]['value'] || 0;

        const results = search.create({
            type: 'customrecord_r7_ecvc',
            filters: [
                ['isinactive', 'is', 'F'],
                'and', [
                    ['custrecord_r7_ecvc_employee', 'anyof', userId],
                    'or', ['custrecord_r7_ecvc_department', 'anyof', departmentId],
                    'or', ['custrecord_r7_ecvc_is_default', 'is', 'T']
                ],
            ],
            columns: [
                { name: 'custrecord_r7_ecvc_employee', sort: search.Sort.ASC },
                { name: 'custrecord_r7_ecvc_department', sort: search.Sort.ASC }
            ]
        }).run().getRange({ start: 0, end: 1000 });

        return (results || []).map(result => result.id);
    }

    function getConfigurationRecord() {
        const configIds = getConfigRecordIds();

        if (configIds.length === 0) {
            throw "No configuration record found for this user."
        }

        return record.load({ type: 'customrecord_r7_ecvc', id: configIds[0] });
    }

    return {
        getGlobalSearchResults,
        getFormLayout
    };
});