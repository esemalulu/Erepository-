var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../../common/constants/IPTConstants", "../../common/util/IPTCommonUtil", "../../common/RecordHelper", "../../app/common/Constants"], function (require, exports, IPTConstants_1, IPTCommonUtil_1, RecordHelper_1, Constants_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    IPTConstants_1 = __importDefault(IPTConstants_1);
    IPTCommonUtil_1 = __importDefault(IPTCommonUtil_1);
    class CustomerUseCase {
        constructor() {
            this.setDefaultIpt = async (context) => {
                let customerForm = context.currentRecord;
                const selectedSubsidiary = customerForm.getValue(IPTConstants_1.default.FIELDS.SUBSIDIARY).toString();
                let defaultIpt = '';
                if (selectedSubsidiary) {
                    defaultIpt = IPTCommonUtil_1.default.getDefaultIpt(selectedSubsidiary);
                }
                setTimeout(() => {
                    customerForm.setValue({
                        fieldId: IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT,
                        value: defaultIpt
                    });
                }, 200);
            };
        }
        shiftIPTDropdownField(scriptContext) {
            const customerForm = scriptContext.form;
            const iptDropdownField = customerForm.getField({
                id: IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT
            });
            customerForm.insertField({
                field: iptDropdownField,
                nextfield: IPTConstants_1.default.PREVIEW.BILLING_SCHEDULE_CONTAINER
            });
        }
        createPreviewButton(scriptContext, serverWidget) {
            let customerForm = scriptContext.form;
            const translations = RecordHelper_1.RecordHelper.getTranslation([
                Constants_1.Constants.translationKeys.IPT_PREVIEW
            ]);
            const financialTab = customerForm.getTab({ id: IPTConstants_1.default.PREVIEW.FINANCIAL_CONTAINER });
            if (scriptContext.type !== scriptContext.UserEventType.VIEW && financialTab) {
                let previewCustomField = customerForm.addField({
                    id: IPTConstants_1.default.PREVIEW.IPT_PREVIEW_BUTTON,
                    label: ' ',
                    type: serverWidget.FieldType.INLINEHTML,
                    container: IPTConstants_1.default.PREVIEW.FINANCIAL_CONTAINER
                });
                previewCustomField.defaultValue = `<button id=${IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID}
                                        style="margin-top: 5px;">
                                    ${translations.IPT_PREVIEW()}
                                </button>`;
                customerForm.insertField({
                    field: previewCustomField,
                    nextfield: IPTConstants_1.default.PREVIEW.BILLING_SCHEDULE_CONTAINER
                });
            }
        }
        populatePreview(context) {
            // document.getElementById to be removed later
            const previewBtn = document.getElementById(IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID);
            const IPTSelectionCustomField = context.currentRecord.getField({
                fieldId: IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT
            });
            if (IPTSelectionCustomField.isDisplay && IPTSelectionCustomField.isVisible) {
                if (previewBtn) {
                    document
                        .getElementById(IPTConstants_1.default.PREVIEW.IPT_DROPDOWN_LABEL_ID_CUSTOMER_AND_PROJECT)
                        .parentElement.parentElement.appendChild(previewBtn);
                    previewBtn.onclick = RecordHelper_1.RecordHelper.generatePreview.bind(context);
                }
            }
            else {
                if (previewBtn) {
                    previewBtn.style.display = 'none';
                }
            }
        }
        changePreviewButtonMode(context) {
            const previewBtn = document.getElementById(IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID);
            if (previewBtn) {
                if (context.currentRecord.getValue(IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT) === '') {
                    previewBtn.setAttribute('disabled', 'true');
                }
                else {
                    previewBtn.removeAttribute('disabled');
                }
            }
        }
    }
    exports.default = CustomerUseCase;
});
