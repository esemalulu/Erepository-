/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define([],
    
    () => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            
            const processPartSublist = (nsRec, sublist) => {
                const lineCount = nsRec.getLineCount(sublist);
                const partInfo = [];
                for (let i = 0; i < lineCount; i++) {
                    partInfo.push({
                        'custrecordpcnparts_newpart': nsRec.getSublistValue(sublist, 'custrecordpcnparts_newpart', i),
                        'custrecordpcnparts_prevpart': nsRec.getSublistValue(sublist, 'custrecordpcnparts_prevpart', i),
                    })
                }
                log.debug('partInfo', partInfo);
                return JSON.stringify(partInfo);
            }
            const processUnitSublist = (nsRec, sublist) => {
                const lineCount = nsRec.getLineCount(sublist);
                const unitInfo = [];
                for (let i = 0; i < lineCount; i++) {
                    unitInfo.push({
                        'custrecordpcnunits_unit': nsRec.getSublistValue(sublist, 'custrecordpcnunits_unit', i),
                    })
                }
                log.debug('unitInfo', unitInfo);
                return JSON.stringify(unitInfo);
            }
            let result, partLineCount, unitLineCount = 0;
            try {
                // Check for part line changes
                const PARTS_SUBLIST = 'recmachcustrecordpcnparts_pcn';
                const UNIT_SUBLIST = 'recmachcustrecordpcnunits_pcn';
                const oldPartInfo = processPartSublist(scriptContext.oldRecord, PARTS_SUBLIST);
                const newPartInfo = processPartSublist(scriptContext.newRecord, PARTS_SUBLIST);
                if (oldPartInfo !== newPartInfo)
                    return 1;

                // Check for unit line changes
                const oldUnitInfo = processUnitSublist(scriptContext.oldRecord, UNIT_SUBLIST);
                const newUnitInfo = processUnitSublist(scriptContext.newRecord, UNIT_SUBLIST);
                if (oldUnitInfo !== newUnitInfo)
                    return 1;
            } catch (e) {
                log.error('ERROR', e);
            }
            return 0;
        }

        return {onAction};
    });
