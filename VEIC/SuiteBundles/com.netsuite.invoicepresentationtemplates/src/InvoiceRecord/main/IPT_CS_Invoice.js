/**
 * @preserve
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../usecase/InvoiceUseCase", "../../common/constants/IPTConstants", "../../common/RecordHelper"], function (require, exports, InvoiceUseCase_1, IPTConstants_1, RecordHelper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.postSourcing = exports.fieldChanged = exports.pageInit = void 0;
    InvoiceUseCase_1 = __importDefault(InvoiceUseCase_1);
    IPTConstants_1 = __importDefault(IPTConstants_1);
    const pageInit = (context) => {
        const useCase = new InvoiceUseCase_1.default();
        if (context.mode === IPTConstants_1.default.MODE.CREATE) {
            useCase.setIPTBasedOnProject(context);
        }
        useCase.populatePreview(context);
        if (context.currentRecord.getValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE) === '') {
            useCase.changePreviewButtonMode(context);
        }
        // @ts-ignore
        window.addNewIPTFunction = RecordHelper_1.RecordHelper.addNewIPTToDropDown.bind(context);
    };
    exports.pageInit = pageInit;
    const fieldChanged = (context) => {
        const useCase = new InvoiceUseCase_1.default();
        if (context.fieldId === IPTConstants_1.default.FIELDS.PROJECT) {
            useCase.setIPTBasedOnProject(context);
        }
        if (context.fieldId === IPTConstants_1.default.FIELDS.CUSTOMER) {
            useCase.setIptBasedOnCustomer(context);
        }
        if (context.fieldId === IPTConstants_1.default.FIELDS.IPT_AT_INVOICE) {
            useCase.changePreviewButtonMode(context);
        }
    };
    exports.fieldChanged = fieldChanged;
    const postSourcing = async (context) => {
        const useCase = new InvoiceUseCase_1.default();
        if (context.fieldId === IPTConstants_1.default.FIELDS.SUBSIDIARY) {
            useCase.setIPTBasedOnProject(context);
        }
    };
    exports.postSourcing = postSourcing;
});
