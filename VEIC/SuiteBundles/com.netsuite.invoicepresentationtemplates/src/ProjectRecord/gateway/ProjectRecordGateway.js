var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../../common/constants/IPTConstants", "../../common/util/IPTCommonUtil"], function (require, exports, IPTConstants_1, IPTCommonUtil_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    IPTConstants_1 = __importDefault(IPTConstants_1);
    IPTCommonUtil_1 = __importDefault(IPTCommonUtil_1);
    class ProjectRecordGateway {
        async updateIPTemplateInProject(context) {
            const project = context.currentRecord;
            let template, subsidiary;
            const IPTSelectionCustomField = project.getField({
                fieldId: IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT
            });
            const customer = project.getValue(IPTConstants_1.default.FIELDS.CUSTOMER_IN_PROJECT);
            subsidiary = parseInt(project.getValue(IPTConstants_1.default.FIELDS.SUBSIDIARY));
            if (customer) {
                const results = await IPTCommonUtil_1.default.getIPTAndSubsidiaryAtCustomerRecord(customer);
                if (results && results[IPTConstants_1.default.FIELDS.SUBSIDIARY] === subsidiary) {
                    template = results[IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT];
                }
                else {
                    template = '';
                }
            }
            if (subsidiary) {
                template = await IPTCommonUtil_1.default.getDefaultIpt(subsidiary);
                if (template)
                    if (!IPTCommonUtil_1.default.isSelectedIPTDeleted(template)) {
                        template = parseInt(template);
                    }
            }
            if (!subsidiary || !template)
                template = '';
            if (IPTSelectionCustomField.isDisplay && IPTSelectionCustomField.isVisible) {
                project.setValue({
                    fieldId: IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT,
                    value: template
                });
            }
        }
    }
    exports.default = ProjectRecordGateway;
});
