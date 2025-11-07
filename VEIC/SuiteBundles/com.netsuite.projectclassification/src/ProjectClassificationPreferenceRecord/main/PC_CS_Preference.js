/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "N/record", "../../common/RecordHelper", "../../common/constants/PCConstants"], function (require, exports, record_1, RecordHelper_1, PCConstants_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.editActionHandler = exports.cancelAndBackActionHandler = exports.fieldChanged = exports.saveRecord = exports.pageInit = void 0;
    record_1 = __importDefault(record_1);
    PCConstants_1 = __importDefault(PCConstants_1);
    var pageInit = function (context) {
        /* Trying to get hold of onselect of project charge, passing through the nodes to disable the required input type=checkbox of project charge row. */
        /*Disabled On-Select as there is no support for clientScript for project charges*/
        if (context.currentRecord.getSublist({ sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST })) {
            RecordHelper_1.RecordHelper.disableCheckboxOfTransactions(PCConstants_1.default.RECORDS.CHARGE, true);
            RecordHelper_1.RecordHelper.disableCheckboxOfTransactions(PCConstants_1.default.TRANSACTION_TYPE.WEEKLYTIMESHEET, false);
            RecordHelper_1.RecordHelper.disableCheckboxOfTransactions(PCConstants_1.default.RECORDS.REVENUEARRANGEMENT, true);
        }
    };
    exports.pageInit = pageInit;
    var saveRecord = function (context) {
        var _a;
        var lineCount = context.currentRecord.getLineCount(PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST);
        var projectClassificationPreferences = [];
        var processedByServerValue, onSelectValue, transactionValue, selectAllTransactionsValue, customSelectUpdateHeaderValue;
        var preferencesRecordId = RecordHelper_1.RecordHelper.fetchPreferences().id;
        selectAllTransactionsValue = context.currentRecord.getValue({
            fieldId: PCConstants_1.default.FIELDS.SELECT_ALL_TRANSACTIONS
        });
        customSelectUpdateHeaderValue = context.currentRecord.getValue({
            fieldId: PCConstants_1.default.FIELDS.CUSTOM_SELECT_UPDATE_HEADER_VALUE
        });
        for (var i = 0; i < lineCount; i++) {
            transactionValue = context.currentRecord.getSublistValue({
                sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                fieldId: PCConstants_1.default.FIELDS.SUBLIST_TRANS_FIELD_HIDDEN,
                line: i
            });
            processedByServerValue = context.currentRecord.getSublistValue({
                sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                fieldId: PCConstants_1.default.FIELDS.SUBLIST_PROCESSED_BY_SERVER_FIELD,
                line: i
            });
            onSelectValue = context.currentRecord.getSublistValue({
                sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                fieldId: PCConstants_1.default.FIELDS.SUBLIST_ON_SELECT_FIELD,
                line: i
            });
            projectClassificationPreferences.push((_a = {},
                _a[PCConstants_1.default.RECORDS.TRANSACTION_TYPE] = transactionValue,
                _a[PCConstants_1.default.RECORDS.PROCESSED_BY_SERVER] = processedByServerValue,
                _a[PCConstants_1.default.RECORDS.ON_SELECT] = onSelectValue,
                _a));
        }
        var projectClassificationRecord = record_1.default.load({
            type: PCConstants_1.default.RECORDS.PROJECT_CLASSIFICATION_PREFERENCES_RECORD,
            id: preferencesRecordId
        });
        projectClassificationRecord.setValue({
            fieldId: PCConstants_1.default.FIELDS.CUSTOM_RECORD_PROJECT_CLASSIFICATION_PREFERENCES,
            value: JSON.stringify(projectClassificationPreferences)
        });
        projectClassificationRecord.setValue({
            fieldId: PCConstants_1.default.FIELDS.SELECT_ALL_TRANSACTIONS_VALUE,
            value: selectAllTransactionsValue
        });
        projectClassificationRecord.setValue({
            fieldId: PCConstants_1.default.FIELDS.CUSTOM_SELECT_UPDATE_HEADER_VALUE,
            value: customSelectUpdateHeaderValue
        });
        projectClassificationRecord.save();
        setTimeout(function () {
            var viewURL = RecordHelper_1.RecordHelper.getSuiteLetURL(PCConstants_1.default.SUITELET.SUITELET_SCRIPT_ID, PCConstants_1.default.SUITELET.DEPLOYMENT_ID, {
                mode: PCConstants_1.default.MODE.VIEW
            });
            window.open(viewURL, '_self');
        });
        return true;
    };
    exports.saveRecord = saveRecord;
    var fieldChanged = function (context) {
        var lineCount = context.currentRecord.getLineCount(PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST);
        if (context.fieldId == PCConstants_1.default.FIELDS.SELECT_ALL_TRANSACTIONS) {
            var selectAllTransactionsValue = context.currentRecord.getValue({
                fieldId: PCConstants_1.default.FIELDS.SELECT_ALL_TRANSACTIONS
            });
            if (selectAllTransactionsValue === false) {
                for (var i = 0; i < lineCount; i++) {
                    context.currentRecord.selectLine({
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                        line: i
                    });
                    context.currentRecord.setCurrentSublistValue({
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                        fieldId: PCConstants_1.default.FIELDS.SUBLIST_PROCESSED_BY_SERVER_FIELD,
                        value: false
                    });
                    context.currentRecord.setCurrentSublistValue({
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                        fieldId: PCConstants_1.default.FIELDS.SUBLIST_ON_SELECT_FIELD,
                        value: false
                    });
                    context.currentRecord.commitLine({
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST
                    });
                }
            }
            if (selectAllTransactionsValue === true) {
                for (var i = 0; i < lineCount; i++) {
                    context.currentRecord.selectLine({
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                        line: i
                    });
                    var transactionType = context.currentRecord.getCurrentSublistText({
                        fieldId: PCConstants_1.default.FIELDS.SUBLIST_TRANS_FIELD_HIDDEN,
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST
                    });
                    context.currentRecord.setCurrentSublistValue({
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                        fieldId: PCConstants_1.default.FIELDS.SUBLIST_PROCESSED_BY_SERVER_FIELD,
                        value: transactionType !== PCConstants_1.default.TRANSACTION_TYPE.WEEKLYTIMESHEET.toUpperCase()
                    });
                    context.currentRecord.setCurrentSublistValue({
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST,
                        fieldId: PCConstants_1.default.FIELDS.SUBLIST_ON_SELECT_FIELD,
                        value: transactionType !== PCConstants_1.default.RECORDS.CHARGE.toUpperCase() &&
                            transactionType !== PCConstants_1.default.RECORDS.REVENUEARRANGEMENT.toUpperCase()
                    });
                    context.currentRecord.commitLine({
                        sublistId: PCConstants_1.default.FIELDS.EDIT_MODE_SUBLIST
                    });
                }
            }
        }
    };
    exports.fieldChanged = fieldChanged;
    var cancelAndBackActionHandler = function () {
        history.back();
    };
    exports.cancelAndBackActionHandler = cancelAndBackActionHandler;
    var editActionHandler = function () {
        var editURL = RecordHelper_1.RecordHelper.getSuiteLetURL(PCConstants_1.default.SUITELET.SUITELET_SCRIPT_ID, PCConstants_1.default.SUITELET.DEPLOYMENT_ID, '');
        window.open(editURL, '_self');
    };
    exports.editActionHandler = editActionHandler;
});
