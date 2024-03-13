/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/runtime', 'N/search'], function (log, runtime, search) {
    function beforeSubmit(context) {
        if (!isTargetRecord(context)) {
            return;
        }
        setLeadSourceCategory(context);
    }

    //////////////////////////////////////////////////////////

    function setLeadSourceCategory(context) {
        try {
            const { newRecord } = context;
            let leadSrc = newRecord.getValue({ fieldId: 'leadsource' });
            if (leadSrc) {
                let leadSrcCategory = search.lookupFields({
                    type: 'campaign',
                    id: leadSrc,
                    columns: ['category']
                })['category'];
                log.debug('leadSrcCategory',leadSrcCategory);
                if (Array.isArray(leadSrcCategory) && leadSrcCategory.length > 0) {
                    log.debug('leadSrcCategory text', leadSrcCategory[0].text);

                    let customlist292SearchObj = search.create({
                        type: "customlist292",
                        filters:
                            [
                                ["name","is",leadSrcCategory[0].text]
                            ],
                        columns:
                            [
                                search.createColumn({name: "internalid"})
                            ]
                    });
                    // noinspection JSCheckFunctionSignatures
                    let searchResultCount = customlist292SearchObj.runPaged().count;
                    log.debug("customlist292SearchObj result count",searchResultCount);
                    customlist292SearchObj.run().each(function(result){
                        // .run().each has a limit of 4,000 results
                        let leadSrcCategoryId = result.getValue({name: "internalid"});
                        log.debug('leadSrcCategoryId', leadSrcCategoryId);
                        newRecord.setValue({
                            fieldId: 'custbodyr7transleadsourcecategory',
                            value: leadSrcCategoryId
                        });
                        return true;
                    });
                }
            }
        } catch (err) {
            log.error({ title: 'Error setting Lead Source Category', details: err });
        }
    }

    function isTargetRecord(context) {
        const { type, UserEventType } = context;
        const { CREATE, EDIT, XEDIT } = UserEventType;

        const noScripts = runtime.getCurrentSession().get({ name: 'r7noscript' }) === 'T';

        return !noScripts && [CREATE, EDIT, XEDIT].includes(type);
    }

    return {
        beforeSubmit
    };
});