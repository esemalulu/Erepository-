/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/cache', 'N/log'], function (cache, log) {
    function beforeSubmit(context) {
        clearApprovalGroupCache();
    }

    ///////////////////////////////////////

    function clearApprovalGroupCache() {
        log.debug({ title: 'Clearing Cache', details: 'Clearing approval group cache...' });

        cache.getCache({
            name: 'approval_group_cache',
            scope: cache.Scope.PUBLIC
        }).remove({
            key: 'approval_groups'
        });
    }

    return {
        beforeSubmit
    };
});