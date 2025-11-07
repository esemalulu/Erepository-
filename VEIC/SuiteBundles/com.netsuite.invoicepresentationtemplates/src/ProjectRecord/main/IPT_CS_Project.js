/**
 * @preserve
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../usecase/ProjectUseCase", "../../common/constants/IPTConstants", "../../common/RecordHelper"], function (require, exports, ProjectUseCase_1, IPTConstants_1, RecordHelper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.postSourcing = exports.fieldChanged = exports.pageInit = void 0;
    ProjectUseCase_1 = __importDefault(ProjectUseCase_1);
    IPTConstants_1 = __importDefault(IPTConstants_1);
    const pageInit = (context) => {
        const useCase = new ProjectUseCase_1.default();
        if (context.mode === IPTConstants_1.default.MODE.CREATE) {
            useCase.updateIPTemplateInProject(context);
        }
        useCase.populatePreview(context);
        if (context.currentRecord.getValue(IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT) === '') {
            useCase.changePreviewButtonMode(context);
        }
        // @ts-ignore
        window.addNewIPTFunction = RecordHelper_1.RecordHelper.addNewIPTToDropDown.bind(context);
    };
    exports.pageInit = pageInit;
    const fieldChanged = async (context) => {
        const useCase = new ProjectUseCase_1.default();
        if (context.fieldId === IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT) {
            useCase.changePreviewButtonMode(context);
        }
    };
    exports.fieldChanged = fieldChanged;
    const postSourcing = async (context) => {
        const useCase = new ProjectUseCase_1.default();
        if (context.fieldId === IPTConstants_1.default.FIELDS.CUSTOMER_IN_PROJECT ||
            context.fieldId === IPTConstants_1.default.FIELDS.SUBSIDIARY) {
            await useCase.updateIPTemplateInProject(context);
        }
    };
    exports.postSourcing = postSourcing;
});
