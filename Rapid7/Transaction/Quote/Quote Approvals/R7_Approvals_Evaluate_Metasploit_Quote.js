/**
 * @napiversion 2.1
 * @nscripttype workflowactionscript
 * @nmodulescope sameaccount
 */

define(['N/runtime', 'N/record', 'N/log', 'N/search'], /**
 * @param {runtime} runtime
 * @param {record} record
 * @param {log} log
 * @param {search} search
 */ function (runtime, record, log, search) {
    /**
     * @param {object} context
     * @param {record} context.newRecord - new record
     * @param {record} context.oldRecord - old record
     */
    function onAction(context) {
        let approvalNeeded = 'F'

        const ITEMS_TO_TRIGGER_APPROVAL = [
            'MSPEXP',
            'MSPEXPSUB',
            'MSPPRO',
            'MSPPRO2U',
            'MSPPRO3U',
            'MSPPRO3U-DISC',
            'MSPPRO4U',
            'MSPPRO5U',
            'MSPPRO6U',
            'MSPPRO7U',
            'MSPPRO8U',
            'MSPPRO8U',
            'MSPPRO9U',
            'MSPPRO10U',
            'MSPPROSUB',
            'MSPPROSUB2U',
            'MSPPROSUB3U',
            'MSPPROSUB4U',
            'MSPPROSUB5U',
            'MSPROEVAL',
            'MSPROEVAL180',
            'MSPROEVAL365'
        ]

        // get all item IDs (made a search for resolving prod IDs differences)
        let searchFilters = ITEMS_TO_TRIGGER_APPROVAL.reduce((acc, cur, index, arr) => {
            acc.push(['nameinternal', 'is', cur])
            if (index !== arr.length - 1) {
                acc.push('OR')
            }
            return acc
        }, [])

        itemSearchObj = search.create({
            type: 'item',
            filters: searchFilters,
            columns: [
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.ASC,
                    label: 'internal ID'
                })
            ]
        })

        const itemArrayToTriggerApproval = []
        itemSearchObj.run().each(function (result) {
            itemArrayToTriggerApproval.push(result.getValue('internalid'))
            return true
        })

        const quoteRec = context.newRecord

        const itemLines = quoteRec.getLineCount({
            sublistId: 'item'
        })
        for (let i = 0; i < itemLines; i++) {
            let itemId = quoteRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            })
            if (itemArrayToTriggerApproval.indexOf(itemId) >= 0) {
                log.debug('found necessary item', itemId)
                approvalNeeded = lookForAddress(quoteRec)
            }
        }
        return approvalNeeded
    }

    /**
     * @param {record} quoteRec
     */
    function lookForAddress(quoteRec) {
        const shipcountry = quoteRec.getValue({ fieldId: 'shipcountry' })

        if (shipcountry != 'US' && shipcountry != 'CA') {
            return 'T' // approval needed
        } else {
            return 'F' // approval not needed
        }
    }

    return {
        onAction: onAction
    }
})