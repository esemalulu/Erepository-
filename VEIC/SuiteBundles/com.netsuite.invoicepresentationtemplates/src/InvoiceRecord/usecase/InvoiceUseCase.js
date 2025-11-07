var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../../common/constants/IPTConstants", "../gateway/InvoiceGateway", "../../common/RecordHelper", "../../app/common/Constants", "../../common/util/IPTCommonUtil"], function (require, exports, IPTConstants_1, InvoiceGateway_1, RecordHelper_1, Constants_1, IPTCommonUtil_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    IPTConstants_1 = __importDefault(IPTConstants_1);
    InvoiceGateway_1 = __importDefault(InvoiceGateway_1);
    IPTCommonUtil_1 = __importDefault(IPTCommonUtil_1);
    class InvoiceUseCase {
        constructor() {
            this.gateway = new InvoiceGateway_1.default();
            this.deduceIptTemplate = async (context) => {
                const invoice = context.newRecord;
                const project = invoice.getValue(IPTConstants_1.default.FIELDS.PROJECT);
                const customer = invoice.getValue(IPTConstants_1.default.FIELDS.CUSTOMER);
                const subsidiary = parseInt(invoice.getValue(IPTConstants_1.default.FIELDS.SUBSIDIARY));
                if (project) {
                    let results = await this.gateway.getIptAndSubsidiaryAtProjectRecord(project);
                    if (results[IPTConstants_1.default.FIELDS.SUBSIDIARY] === subsidiary) {
                        return results[IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT];
                    }
                }
                if (customer) {
                    let results = await IPTCommonUtil_1.default.getIPTAndSubsidiaryAtCustomerRecord(customer);
                    if (results[IPTConstants_1.default.FIELDS.SUBSIDIARY] === subsidiary) {
                        return results[IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT];
                    }
                }
                if (subsidiary) {
                    return IPTCommonUtil_1.default.getDefaultIpt(subsidiary);
                }
                return '';
            };
            this.setDefaultIpt = async (context, isCustomerSetToEmpty) => {
                const invoiceForm = context.currentRecord;
                const subsidiary = invoiceForm.getValue(IPTConstants_1.default.FIELDS.SUBSIDIARY);
                if ('mode' in context &&
                    context.mode === IPTConstants_1.default.MODE.CREATE &&
                    isCustomerSetToEmpty &&
                    subsidiary) {
                    let iptRecordId = await IPTCommonUtil_1.default.getDefaultIpt(subsidiary);
                    if (iptRecordId) {
                        invoiceForm.setValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE, iptRecordId);
                    }
                }
                else {
                    invoiceForm.setValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE, '');
                }
            };
            this.setIptBasedOnCustomer = async (context) => {
                const invoiceForm = context.currentRecord;
                const customerId = invoiceForm.getValue({ fieldId: IPTConstants_1.default.FIELDS.CUSTOMER });
                const invoiceSubsidiary = parseInt(invoiceForm.getValue(IPTConstants_1.default.FIELDS.SUBSIDIARY));
                if (customerId) {
                    const results = await IPTCommonUtil_1.default.getIPTAndSubsidiaryAtCustomerRecord(customerId);
                    const iptRecordId = results[IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT];
                    const customerSubsidiary = results[IPTConstants_1.default.FIELDS.SUBSIDIARY];
                    if (!iptRecordId || customerSubsidiary !== invoiceSubsidiary) {
                        let defaultSubsidiary = await IPTCommonUtil_1.default.getDefaultIpt(invoiceSubsidiary);
                        if (defaultSubsidiary) {
                            invoiceForm.setValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE, defaultSubsidiary);
                        }
                        else {
                            invoiceForm.setValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE, '');
                        }
                    }
                    else {
                        invoiceForm.setValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE, iptRecordId);
                    }
                }
                else {
                    this.setDefaultIpt(context, false);
                }
            };
            this.setIPTBasedOnProject = async (context) => {
                const invoiceForm = context.currentRecord;
                const projectId = invoiceForm.getValue({ fieldId: IPTConstants_1.default.FIELDS.PROJECT });
                const invoiceSubsidiary = parseInt(invoiceForm.getValue({ fieldId: IPTConstants_1.default.FIELDS.SUBSIDIARY }));
                if (projectId) {
                    const results = await this.gateway.getIptAndSubsidiaryAtProjectRecord(projectId);
                    const projectSubsidiary = results[IPTConstants_1.default.FIELDS.SUBSIDIARY];
                    const iptRecordId = results[IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT];
                    if (!iptRecordId || projectSubsidiary !== invoiceSubsidiary) {
                        this.setIptBasedOnCustomer(context);
                    }
                    else {
                        invoiceForm.setValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE, iptRecordId);
                    }
                }
                else {
                    this.setIptBasedOnCustomer(context);
                }
            };
        }
        isExecutedViaUserInterface() {
            return this.gateway.isExecutedViaUserInterface();
        }
        async updateIptAtInvoice(scriptContext) {
            const invoice = scriptContext.newRecord;
            let iptRecordId = invoice.getValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE);
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                if (!iptRecordId) {
                    iptRecordId = await this.deduceIptTemplate(scriptContext);
                    invoice.setValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE, iptRecordId);
                }
            }
        }
        shiftIPTDropdownField(scriptContext) {
            const invoiceForm = scriptContext.form;
            const iptDropdownField = invoiceForm.getField({
                id: IPTConstants_1.default.FIELDS.IPT_AT_INVOICE
            });
            const fieldContainer = scriptContext.type !== scriptContext.UserEventType.VIEW
                ? IPTConstants_1.default.PREVIEW.BILL_TO_SELECT_LIST_CONTAINER
                : IPTConstants_1.default.PREVIEW.BILL_TO_SELECT_CONTAINER;
            invoiceForm.insertField({
                field: iptDropdownField,
                nextfield: fieldContainer
            });
        }
        createPreviewButton(scriptContext, serverWidget) {
            const translations = RecordHelper_1.RecordHelper.getTranslation([
                Constants_1.Constants.translationKeys.IPT_PREVIEW
            ]);
            let invoiceForm = scriptContext.form;
            const billingTab = invoiceForm.getTab({ id: IPTConstants_1.default.PREVIEW.BILLING_CONTAINER });
            if (scriptContext.type !== scriptContext.UserEventType.VIEW && billingTab) {
                let previewCustomField = invoiceForm.addField({
                    id: IPTConstants_1.default.PREVIEW.IPT_PREVIEW_BUTTON,
                    label: ' ',
                    type: serverWidget.FieldType.INLINEHTML,
                    container: IPTConstants_1.default.PREVIEW.BILLING_CONTAINER
                });
                previewCustomField.defaultValue = `<button id=${IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID}
                                        style="margin-top: 5px;">
                                    ${translations.IPT_PREVIEW()}
                                </button>`;
                invoiceForm.insertField({
                    field: previewCustomField,
                    nextfield: IPTConstants_1.default.PREVIEW.BILL_TO_SELECT_LIST_CONTAINER
                });
            }
        }
        populatePreview(context) {
            const IPTSelectionCustomField = context.currentRecord.getField({
                fieldId: IPTConstants_1.default.FIELDS.IPT_AT_INVOICE
            });
            const previewBtn = document.getElementById(IPTConstants_1.default.PREVIEW.PREVIEW_BTN_ID);
            if (IPTSelectionCustomField.isDisplay && IPTSelectionCustomField.isVisible) {
                if (previewBtn) {
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
                if (context.currentRecord.getValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE) === '') {
                    previewBtn.setAttribute('disabled', 'true');
                }
                else {
                    previewBtn.removeAttribute('disabled');
                }
            }
        }
    }
    exports.default = InvoiceUseCase;
});
