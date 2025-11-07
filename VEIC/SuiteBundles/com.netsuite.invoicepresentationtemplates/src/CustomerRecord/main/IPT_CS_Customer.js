/**
 * @preserve
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../usecase/CustomerUseCase", "../../common/constants/IPTConstants", "../../common/RecordHelper"], function (require, exports, CustomerUseCase_1, IPTConstants_1, RecordHelper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.fieldChanged = exports.pageInit = void 0;
    CustomerUseCase_1 = __importDefault(CustomerUseCase_1);
    IPTConstants_1 = __importDefault(IPTConstants_1);
    const pageInit = (context) => {
        const useCase = new CustomerUseCase_1.default();
        useCase.populatePreview(context);
        if (context.currentRecord.getValue(IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT) === '') {
            useCase.changePreviewButtonMode(context);
        }
        // @ts-ignore
        window.addNewIPTFunction = RecordHelper_1.RecordHelper.addNewIPTToDropDown.bind(context);
        if (context.mode === IPTConstants_1.default.MODE.CREATE) {
            useCase.setDefaultIpt(context);
        }
    };
    exports.pageInit = pageInit;
    const fieldChanged = (context) => {
        const useCase = new CustomerUseCase_1.default();
        if (context.fieldId == IPTConstants_1.default.FIELDS.SUBSIDIARY) {
            useCase.setDefaultIpt(context);
        }
        if (context.fieldId === IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT) {
            useCase.changePreviewButtonMode(context);
        }
    };
    exports.fieldChanged = fieldChanged;
});
