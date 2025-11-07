var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../../common/constants/EndpointsConstants", "../../common/constants/PCConstants", "../../common/RecordHelper", "../gateway/ProjectRecordGateway"], function (require, exports, EndpointsConstants_1, PCConstants_1, RecordHelper_1, ProjectRecordGateway_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    PCConstants_1 = __importDefault(PCConstants_1);
    ProjectRecordGateway_1 = __importDefault(ProjectRecordGateway_1);
    var ProjectUseCase = /** @class */ (function () {
        function ProjectUseCase() {
            this.gateway = new ProjectRecordGateway_1.default();
        }
        ProjectUseCase.prototype.clearValueOfFields = function (context) {
            this.gateway.clearValueOfFields(context);
        };
        ProjectUseCase.prototype.setSelectOptionsForDepartmentField = function (context, departmentValue, field) {
            return __awaiter(this, void 0, void 0, function () {
                var project, subsidiary, request, departmentRecordOptions, isSelectedDeptInactive, _a, request_1, results, i;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            project = context.newRecord;
                            subsidiary = project.getValue({
                                fieldId: PCConstants_1.default.FIELDS.SUBSIDIARY
                            }).trim();
                            if (!subsidiary) return [3 /*break*/, 6];
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_DEPARTMENT_RECORDS,
                                subsidiary: subsidiary
                            };
                            return [4 /*yield*/, this.getFieldOptionsFromSubsidiary(request)];
                        case 1:
                            departmentRecordOptions = _b.sent();
                            if (RecordHelper_1.RecordHelper.isNewUI() === 'F' && !departmentValue) {
                                field.addSelectOption({
                                    value: '',
                                    text: '',
                                    isSelected: true
                                });
                            }
                            _a = departmentValue;
                            if (!_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.checkForInactiveValue(PCConstants_1.default.RECORDS.DEPARTMENT, departmentValue)];
                        case 2:
                            _a = (_b.sent());
                            _b.label = 3;
                        case 3:
                            isSelectedDeptInactive = _a;
                            if (!(departmentValue && isSelectedDeptInactive === 'T')) return [3 /*break*/, 5];
                            request_1 = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_DCL_NAMES,
                                project: project.id
                            };
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.sendRequestToDataGenSuiteLet(request_1)];
                        case 4:
                            results = _b.sent();
                            field.addSelectOption({
                                value: departmentValue,
                                text: results.data[0][PCConstants_1.default.FIELDS.DEPARTMENT],
                                isSelected: true
                            });
                            _b.label = 5;
                        case 5:
                            for (i in departmentRecordOptions) {
                                if (departmentValue && departmentRecordOptions[i].id == departmentValue) {
                                    field.addSelectOption({
                                        value: departmentRecordOptions[i].id,
                                        text: departmentRecordOptions[i].name,
                                        isSelected: true
                                    });
                                }
                                else {
                                    field.addSelectOption({
                                        value: departmentRecordOptions[i].id,
                                        text: departmentRecordOptions[i].name,
                                        isSelected: false
                                    });
                                }
                            }
                            _b.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        ProjectUseCase.prototype.setSelectOptionsForClassField = function (context, classValue, field) {
            return __awaiter(this, void 0, void 0, function () {
                var project, subsidiary, request, classRecordOptions, isSelectedClassInactive, _a, request_2, results, i;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            project = context.newRecord;
                            subsidiary = project.getValue({
                                fieldId: PCConstants_1.default.FIELDS.SUBSIDIARY
                            }).trim();
                            if (!subsidiary) return [3 /*break*/, 6];
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_CLASSIFICATION_RECORDS,
                                subsidiary: subsidiary
                            };
                            return [4 /*yield*/, this.getFieldOptionsFromSubsidiary(request)];
                        case 1:
                            classRecordOptions = _b.sent();
                            if (RecordHelper_1.RecordHelper.isNewUI() === 'F' && !classValue) {
                                field.addSelectOption({
                                    value: '',
                                    text: '',
                                    isSelected: true
                                });
                            }
                            _a = classValue;
                            if (!_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.checkForInactiveValue(PCConstants_1.default.RECORDS.CLASS, classValue)];
                        case 2:
                            _a = (_b.sent());
                            _b.label = 3;
                        case 3:
                            isSelectedClassInactive = _a;
                            if (!(classValue && isSelectedClassInactive === 'T')) return [3 /*break*/, 5];
                            request_2 = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_DCL_NAMES,
                                project: project.id
                            };
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.sendRequestToDataGenSuiteLet(request_2)];
                        case 4:
                            results = _b.sent();
                            field.addSelectOption({
                                value: classValue,
                                text: results.data[0][PCConstants_1.default.FIELDS.CLASS],
                                isSelected: true
                            });
                            _b.label = 5;
                        case 5:
                            for (i in classRecordOptions) {
                                if (classValue && classRecordOptions[i].id == classValue) {
                                    field.addSelectOption({
                                        value: classRecordOptions[i].id,
                                        text: classRecordOptions[i].name,
                                        isSelected: true
                                    });
                                }
                                else {
                                    field.addSelectOption({
                                        value: classRecordOptions[i].id,
                                        text: classRecordOptions[i].name
                                    });
                                }
                            }
                            _b.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        ProjectUseCase.prototype.setSelectOptionsForLocationField = function (context, locationValue, field) {
            return __awaiter(this, void 0, void 0, function () {
                var project, subsidiary, request, locationRecordOptions, isSelectedLocationInactive, _a, request_3, results, i;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            project = context.newRecord;
                            subsidiary = project.getValue({
                                fieldId: PCConstants_1.default.FIELDS.SUBSIDIARY
                            }).trim();
                            if (!subsidiary) return [3 /*break*/, 6];
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_LOCATION_RECORDS,
                                subsidiary: subsidiary
                            };
                            return [4 /*yield*/, this.getFieldOptionsFromSubsidiary(request)];
                        case 1:
                            locationRecordOptions = _b.sent();
                            if (RecordHelper_1.RecordHelper.isNewUI() === 'F' && !locationValue) {
                                field.addSelectOption({
                                    value: '',
                                    text: '',
                                    isSelected: true
                                });
                            }
                            _a = locationValue;
                            if (!_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.checkForInactiveValue(PCConstants_1.default.RECORDS.LOCATION, locationValue)];
                        case 2:
                            _a = (_b.sent());
                            _b.label = 3;
                        case 3:
                            isSelectedLocationInactive = _a;
                            if (!(locationValue && isSelectedLocationInactive === 'T')) return [3 /*break*/, 5];
                            request_3 = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_DCL_NAMES,
                                project: project.id
                            };
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.sendRequestToDataGenSuiteLet(request_3)];
                        case 4:
                            results = _b.sent();
                            field.addSelectOption({
                                value: locationValue,
                                text: results.data[0][PCConstants_1.default.FIELDS.LOCATION],
                                isSelected: true
                            });
                            _b.label = 5;
                        case 5:
                            for (i in locationRecordOptions) {
                                if (locationValue && locationRecordOptions[i].id == locationValue) {
                                    field.addSelectOption({
                                        value: locationRecordOptions[i].id,
                                        text: locationRecordOptions[i].name,
                                        isSelected: true
                                    });
                                }
                                else {
                                    field.addSelectOption({
                                        value: locationRecordOptions[i].id,
                                        text: locationRecordOptions[i].name
                                    });
                                }
                            }
                            _b.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        ProjectUseCase.prototype.setSelectOptionsForDepartmentFieldForFieldChange = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var project, subsidiary, deptDropdownField, request, departmentRecordOptions, i;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            project = context.currentRecord;
                            subsidiary = project.getValue({
                                fieldId: PCConstants_1.default.FIELDS.SUBSIDIARY
                            }).trim();
                            deptDropdownField = project.getField({
                                fieldId: PCConstants_1.default.FIELDS.CUSTPAGE_PC_DEPARTMENT
                            });
                            deptDropdownField.removeSelectOption({ value: null });
                            if (!RecordHelper_1.RecordHelper.isNewUI()) {
                                deptDropdownField.insertSelectOption({
                                    value: '',
                                    text: ''
                                });
                            }
                            if (!subsidiary) return [3 /*break*/, 2];
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_DEPARTMENT_RECORDS,
                                subsidiary: subsidiary
                            };
                            return [4 /*yield*/, this.getFieldOptionsFromSubsidiary(request)];
                        case 1:
                            departmentRecordOptions = _a.sent();
                            deptDropdownField.removeSelectOption({ value: null });
                            if (!RecordHelper_1.RecordHelper.isNewUI()) {
                                deptDropdownField.insertSelectOption({
                                    value: '',
                                    text: ''
                                });
                            }
                            for (i in departmentRecordOptions) {
                                deptDropdownField.insertSelectOption({
                                    value: departmentRecordOptions[i].id,
                                    text: departmentRecordOptions[i].name
                                });
                            }
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        ProjectUseCase.prototype.setSelectOptionsForClassFieldForFieldChange = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var project, subsidiary, classField, request, classRecordOptions, i;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            project = context.currentRecord;
                            subsidiary = project.getValue({
                                fieldId: PCConstants_1.default.FIELDS.SUBSIDIARY
                            }).trim();
                            classField = project.getField({
                                fieldId: PCConstants_1.default.FIELDS.CUSTPAGE_PC_CLASS
                            });
                            classField.removeSelectOption({ value: null });
                            if (!RecordHelper_1.RecordHelper.isNewUI()) {
                                classField.insertSelectOption({
                                    value: '',
                                    text: ''
                                });
                            }
                            if (!subsidiary) return [3 /*break*/, 2];
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_CLASSIFICATION_RECORDS,
                                subsidiary: subsidiary
                            };
                            return [4 /*yield*/, this.getFieldOptionsFromSubsidiary(request)];
                        case 1:
                            classRecordOptions = _a.sent();
                            classField.removeSelectOption({ value: null });
                            if (!RecordHelper_1.RecordHelper.isNewUI()) {
                                classField.insertSelectOption({
                                    value: '',
                                    text: ''
                                });
                            }
                            for (i in classRecordOptions) {
                                classField.insertSelectOption({
                                    value: classRecordOptions[i].id,
                                    text: classRecordOptions[i].name
                                });
                            }
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        ProjectUseCase.prototype.setSelectOptionsForLocationFieldForFieldChange = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var project, subsidiary, locationField, request, locationRecordOptions, i;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            project = context.currentRecord;
                            subsidiary = project.getValue({
                                fieldId: PCConstants_1.default.FIELDS.SUBSIDIARY
                            }).trim();
                            locationField = project.getField({
                                fieldId: PCConstants_1.default.FIELDS.CUSTPAGE_PC_LOCATION
                            });
                            locationField.removeSelectOption({ value: null });
                            if (!RecordHelper_1.RecordHelper.isNewUI()) {
                                locationField.insertSelectOption({
                                    value: '',
                                    text: ''
                                });
                            }
                            if (!subsidiary) return [3 /*break*/, 2];
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_LOCATION_RECORDS,
                                subsidiary: subsidiary
                            };
                            return [4 /*yield*/, this.getFieldOptionsFromSubsidiary(request)];
                        case 1:
                            locationRecordOptions = _a.sent();
                            locationField.removeSelectOption({ value: null });
                            if (!RecordHelper_1.RecordHelper.isNewUI()) {
                                locationField.insertSelectOption({
                                    value: '',
                                    text: ''
                                });
                            }
                            for (i in locationRecordOptions) {
                                locationField.insertSelectOption({
                                    value: locationRecordOptions[i].id,
                                    text: locationRecordOptions[i].name
                                });
                            }
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        ProjectUseCase.prototype.getFieldOptionsFromSubsidiary = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, RecordHelper_1.RecordHelper.sendRequestToDataGenSuiteLet(request)];
                        case 1:
                            results = _a.sent();
                            return [2 /*return*/, results.data ? results.data : []];
                    }
                });
            });
        };
        ProjectUseCase.prototype.removeInactiveFromDropDown = function (field, value) {
            if (RecordHelper_1.RecordHelper.isNewUI()) {
                field.removeSelectOption({
                    value: value
                });
            }
        };
        ProjectUseCase.prototype.setFieldValue = function (currentRecord, fieldId, fieldValue) {
            try {
                currentRecord.setValue({ fieldId: fieldId, value: fieldValue });
            }
            catch (err) {
                /*   console.warn(err);
                log.error(Constants.ERROR_MESSAGE.ERROR, err);*/
            }
        };
        return ProjectUseCase;
    }());
    exports.default = ProjectUseCase;
});
