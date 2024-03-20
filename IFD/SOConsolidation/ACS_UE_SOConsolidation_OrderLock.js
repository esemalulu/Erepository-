/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
*/
define([
    'N/search',
    'N/runtime',
    'N/ui/message',
    'N/error',
    'N/log',
    './thirdparty/underscore'
], function ACSUESoConsolidationOrderLock(
    nSearch,
    nRuntime,
    nMessage,
    nError,
    nLog,
    _
) {
    var buttonsToDisable = [
        'submitter',
        'resetter',
        'edit',
        'void'
    ];
    var LOCKING_FIELD_ID = 'custbody_acs_soc_order_locked';

    return {
        /**
         * IF SO is locked, Block UI Edit Buttons, show message.
         */
        beforeLoad: function beforeLoad(beforeLoadContext) {
            var eventTypes = [
                beforeLoadContext.UserEventType.EDIT,
                beforeLoadContext.UserEventType.VIEW
            ];
            var form;
            var messageObj;
            var newRecord;
            var isLocked;

            if (nRuntime.executionContext !== nRuntime.ContextType.USER_INTERFACE) {
                return;
            }

            if (eventTypes.indexOf(beforeLoadContext.type) === -1) {
                return;
            }

            form = beforeLoadContext.form;
            newRecord = beforeLoadContext.newRecord;
            isLocked = newRecord.getValue({ fieldId: LOCKING_FIELD_ID });

            if (!isLocked) {
                return;
            }

            messageObj = nMessage.create({
                type: nMessage.Type.WARNING,
                message: 'Sales order is currently locked for Consolidation Process'
            });

            buttonsToDisable.forEach(function eachBtnToDisable(id) {
                try {
                    form.removeButton({
                        id: id
                    });
                } catch (e) {
                    nLog.error('SOCons-Error hidding button', JSON.stringify(e));
                }
            });

            beforeLoadContext.form.addPageInitMessage(messageObj);
        },
        beforeSubmit: function beforeSubmit(beforeSubmitContext) {
            var eventTypes = [
                beforeSubmitContext.UserEventType.XEDIT,
                beforeSubmitContext.UserEventType.EDIT
            ];
            var allowedExecCtx = [
                nRuntime.ContextType.MAP_REDUCE,
                nRuntime.ContextType.SUITELET
            ];

            var newRecord;
            var oldRecord;
            var fields;
            var oldLockingStatus;
            var newLockingStatus;
            var user;
            var showLockingError;
            var newLockingStatusSpecified = false;

            var ctxData = {
                executionContext: nRuntime.executionContext,
                userEventType: beforeSubmitContext.type,
                envType: beforeSubmitContext.envType,
                script: nRuntime.getCurrentScript(),
                user: nRuntime.getCurrentUser(),
                recId: beforeSubmitContext && beforeSubmitContext.newRecord && beforeSubmitContext.newRecord.id
            };
            var statusData;

            log.debug('SOLock-Context', JSON.stringify(ctxData));

            if (eventTypes.indexOf(beforeSubmitContext.type) === -1) {
                return;
            }

            newRecord = beforeSubmitContext.newRecord;
            oldRecord = beforeSubmitContext.oldRecord;
            fields = _.map(
                newRecord.getFields(),
                function eachFieldId(f) {
                    return f.toLowerCase();
                }
            );

            if (beforeSubmitContext.type === beforeSubmitContext.UserEventType.EDIT) {
                oldLockingStatus = oldRecord.getValue({ fieldId: LOCKING_FIELD_ID });
                newLockingStatus = newRecord.getValue({ fieldId: LOCKING_FIELD_ID });
                newLockingStatusSpecified = true;
            } else if (fields.indexOf(LOCKING_FIELD_ID) !== -1) {
                oldLockingStatus = oldRecord.getValue({ fieldId: LOCKING_FIELD_ID });
                newLockingStatus = newRecord.getValue({ fieldId: LOCKING_FIELD_ID });
                newLockingStatusSpecified = true;
            } else {
                oldLockingStatus = nSearch.lookupFields({
                    type: newRecord.type,
                    id: newRecord.id,
                    columns: [LOCKING_FIELD_ID]
                })[LOCKING_FIELD_ID];
                newLockingStatus = oldLockingStatus;
                newLockingStatusSpecified = false;
            }

            statusData = {
                oldLockingStatus: oldLockingStatus,
                newLockingStatus: newLockingStatus,
                newLockingStatusSpecified: newLockingStatusSpecified
            };

            log.debug('SOLock-Statuses', JSON.stringify(statusData));

            if (oldLockingStatus === true) {
                user = nRuntime.getCurrentUser();

                if (user.roleId !== 'administrator') {
                    showLockingError = true;
                }

                if (newLockingStatusSpecified === false) {
                    showLockingError = true;
                }

                if (allowedExecCtx.indexOf(nRuntime.executionContext) === -1) {
                    showLockingError = true;
                }
            }

            if (showLockingError) {
                log.error('Locking Error', JSON.stringify({ ctxData: ctxData, statusData: statusData }));
                throw nError.create({
                    name: 'ERR_SO_CONSOL_LOCKED',
                    message: 'Sales order is currently locked'
                });
            }
        }
    };
});
