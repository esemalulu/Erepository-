var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../../common/constants/PCConstants", "../../common/RecordHelper"], function (require, exports, PCConstants_1, RecordHelper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    PCConstants_1 = __importDefault(PCConstants_1);
    var ProjectRecordGateway = /** @class */ (function () {
        function ProjectRecordGateway() {
        }
        ProjectRecordGateway.prototype.clearValueOfFields = function (context) {
            var deptDropdownField = context.currentRecord.getField({
                fieldId: PCConstants_1.default.FIELDS.CUSTPAGE_PC_DEPARTMENT
            });
            deptDropdownField.removeSelectOption({ value: null });
            var classDropdownField = context.currentRecord.getField({
                fieldId: PCConstants_1.default.FIELDS.CUSTPAGE_PC_CLASS
            });
            classDropdownField.removeSelectOption({ value: null });
            var locationDropdownField = context.currentRecord.getField({
                fieldId: PCConstants_1.default.FIELDS.CUSTPAGE_PC_LOCATION
            });
            locationDropdownField.removeSelectOption({ value: null });
            if (!RecordHelper_1.RecordHelper.isNewUI()) {
                deptDropdownField.insertSelectOption({ value: '', text: '' });
                classDropdownField.insertSelectOption({ value: '', text: '' });
                locationDropdownField.insertSelectOption({ value: '', text: '' });
            }
        };
        return ProjectRecordGateway;
    }());
    exports.default = ProjectRecordGateway;
});
