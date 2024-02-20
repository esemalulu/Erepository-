/**
 /**
 * @NApiVersion 2.1
 * @NScriptType MassUpdateScript
 */
define(['N/record', 'N/runtime', './GD_Constants'],

(record, runtime, constants) => {
    /**
     * Defines the Mass Update trigger point.
     * @param {Object} params
     * @param {string} params.type - Record type of the record being processed
     * @param {number} params.id - ID of the record being processed
     * @since 2016.1
     */
    const each = (params) => {
        let item = record.load({type: params.type, id: params.id});

        const count = item.getLineCount({sublistId: 'binnumber'});
        const partsAndServiceLocation = runtime.getCurrentScript().getParameter({name: 'custscriptpartsandwarrantylocation'});
        let isPreferred, curLocation, preferredBin;

        // * Find the preferred bin corresponding to the location set as our Parts and Service Location
        for (let i = 0; i < count; i++) {
            isPreferred = item.getSublistValue({sublistId: 'binnumber', fieldId: 'preferredbin', line: i});
            curLocation = item.getSublistValue({sublistId: 'binnumber', fieldId: 'location', line: i});

            if (isPreferred && curLocation == partsAndServiceLocation) {
                preferredBin = item.getSublistValue({sublistId: 'binnumber', fieldId: 'binnumber', line: i});
                break;
            }
        }

        //item.setValue({fieldId: 'location', value: partsAndServiceLocation});

        // * Update the preferred Parts and Service Bin as necessary
        let oldPreferredBin = item.getValue({fieldId: 'custitemgd_pspreferredbin'});
        if (oldPreferredBin != preferredBin)
            item.setValue({fieldId: 'custitemgd_pspreferredbin', value: preferredBin});

        item.save();
    }

    return {each}
});