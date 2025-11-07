var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../gateway/ProjectRecordGateway", "../../common/RecordHelper", "../../app/common/Constants", "../../common/constants/IPTConstants", "N/runtime"], function (require, exports, ProjectRecordGateway_1, RecordHelper_1, Constants_1, IPTConstants_1, runtime_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ProjectRecordGateway_1 = __importDefault(ProjectRecordGateway_1);
    IPTConstants_1 = __importDefault(IPTConstants_1);
    runtime_1 = __importDefault(runtime_1);
    class ProjectUseCase {
        constructor() {
            this.gateway = new ProjectRecordGateway_1.default();
        }
        async updateIPTemplateInProject(context) {
            await this.gateway.updateIPTemplateInProject(context);
        }
        shiftIPTDropdownField(scriptContext) {
            const projectForm = scriptContext.form;
            const iptDropdownField = projectForm.getField({
                id: IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT
            });
            projectForm.insertField({
                field: iptDropdownField,
                nextfield: IPTConstants_1.default.PREVIEW.BILLING_TYPE_CONTAINER
            });
        }
        createPreviewButton(scriptContext, serverWidget) {
            let projectForm = scriptContext.form;
            // @ts-ignore
            const isNewUI = runtime_1.default.getCurrentScript().getParameter(IPTConstants_1.default.PREVIEW.PROJECT_NEW_UI);
            const financialTab = projectForm.getTab({ id: IPTConstants_1.default.PREVIEW.FINANCIAL_CONTAINER });
            const translations = RecordHelper_1.RecordHelper.getTranslation([
                Constants_1.Constants.translationKeys.IPT_PREVIEW
            ]);
            if (scriptContext.type !== scriptContext.UserEventType.VIEW && financialTab) {
                let previewCustomField = projectForm.addField({
                    id: IPTConstants_1.default.PREVIEW.IPT_PREVIEW_BUTTON,
                    label: ' ',
                    type: serverWidget.FieldType.INLINEHTML,
                    container: IPTConstants_1.default.PREVIEW.FINANCIAL_CONTAINER
                });
                projectForm.insertField({
                    field: previewCustomField,
                    nextfield: IPTConstants_1.default.PREVIEW.BILLING_TYPE_CONTAINER
                });
                if (isNewUI === 'T') {
                    previewCustomField.defaultValue = `<button enabled id=${IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID} style="margin-top: 0px;margin-left: 5px" onclick='onPreviewClick()'>
                                    ${translations.IPT_PREVIEW()}
                                </button>`;
                }
                else {
                    previewCustomField.defaultValue = `<button id=${IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID}
                                        style="margin-top: 5px;">
                                    ${translations.IPT_PREVIEW()}
                                </button>`;
                }
            }
        }
        populatePreview(context) {
            // @ts-ignore
            const isNewUI = runtime_1.default.getCurrentScript().getParameter(IPTConstants_1.default.PREVIEW.PROJECT_NEW_UI);
            const IPTSelectionCustomField = context.currentRecord.getField({
                fieldId: IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT
            });
            const previewBtn = document.getElementById(IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID);
            if (IPTSelectionCustomField.isDisplay && IPTSelectionCustomField.isVisible) {
                if (!isNewUI && previewBtn) {
                    previewBtn.onclick = RecordHelper_1.RecordHelper.generatePreview.bind(context);
                }
                else {
                    // @ts-ignore
                    window.onPreviewClick = RecordHelper_1.RecordHelper.generatePreview.bind(context);
                }
            }
            else {
                if (!isNewUI && previewBtn) {
                    previewBtn.style.display = 'none';
                }
                else {
                    context.currentRecord.setValue({
                        fieldId: IPTConstants_1.default.PREVIEW.IPT_PREVIEW_BUTTON,
                        value: ''
                    });
                }
            }
        }
        changePreviewButtonMode(context) {
            const previewBtn = document.getElementById(IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID);
            // @ts-ignore
            const isNewUI = runtime_1.default.getCurrentScript().getParameter(IPTConstants_1.default.PREVIEW.PROJECT_NEW_UI);
            if (previewBtn && !isNewUI) {
                if (context.currentRecord.getValue(IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT) === '') {
                    previewBtn.setAttribute('disabled', 'true');
                }
                else {
                    previewBtn.removeAttribute('disabled');
                }
            }
        }
    }
    exports.default = ProjectUseCase;
});
