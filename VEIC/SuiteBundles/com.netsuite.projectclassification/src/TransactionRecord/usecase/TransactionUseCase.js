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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../../common/constants/PCConstants", "../../common/RecordHelper", "../../common/constants/EndpointsConstants", "N/record", "../utils/PC_ExpenseUtil", "../utils/PC_PurchaseOrderUtils", "N/log"], function (require, exports, PCConstants_1, RecordHelper_1, EndpointsConstants_1, record_1, PC_ExpenseUtil_1, PC_PurchaseOrderUtils_1, log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    PCConstants_1 = __importDefault(PCConstants_1);
    record_1 = __importDefault(record_1);
    PC_ExpenseUtil_1 = __importDefault(PC_ExpenseUtil_1);
    PC_PurchaseOrderUtils_1 = __importDefault(PC_PurchaseOrderUtils_1);
    log_1 = __importDefault(log_1);
    var TransactionUseCase = /** @class */ (function () {
        function TransactionUseCase() {
        }
        TransactionUseCase.prototype.setDLCOnProjectChange = function (transactionRecord, sublistId) {
            return __awaiter(this, void 0, void 0, function () {
                var isConsolidateProjectsEnabled, projectId, projectDLCValues, _a, itemId, itemDLCValues, _b, itemId, itemDLCValues, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            isConsolidateProjectsEnabled = RecordHelper_1.RecordHelper.isConsolidateProjectsEnabled();
                            projectId = this.getProjectId(isConsolidateProjectsEnabled, transactionRecord);
                            if (!projectId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getProjectDCLValues(projectId)];
                        case 1:
                            _a = _d.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = {};
                            _d.label = 3;
                        case 3:
                            projectDLCValues = _a;
                            if (!(sublistId === PCConstants_1.default.SUBLIST.ITEM)) return [3 /*break*/, 7];
                            itemId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.ITEM,
                                fieldId: PCConstants_1.default.FIELDS.ITEM
                            });
                            if (!itemId) return [3 /*break*/, 5];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getItemDCLValues(itemId)];
                        case 4:
                            _b = _d.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _b = {};
                            _d.label = 6;
                        case 6:
                            itemDLCValues = _b;
                            if (isConsolidateProjectsEnabled) {
                                this.setValueOfDLCOnSublist(transactionRecord, projectDLCValues, itemDLCValues, PCConstants_1.default.LIST.ITEM);
                            }
                            else {
                                this.setValueOfDLCFieldsOnHeader(transactionRecord, projectDLCValues, {});
                                if (itemId) {
                                    this.setValueOfDLCOnSublist(transactionRecord, projectDLCValues, itemDLCValues, PCConstants_1.default.LIST.ITEM);
                                }
                            }
                            return [3 /*break*/, 13];
                        case 7:
                            if (!(sublistId === PCConstants_1.default.LIST.EXPENSE)) return [3 /*break*/, 8];
                            if (isConsolidateProjectsEnabled) {
                                this.setValueOfDLCOnExpenseSublist(transactionRecord, projectDLCValues, {});
                            }
                            else {
                                this.setValueOfDLCFieldsOnHeader(transactionRecord, projectDLCValues, {});
                            }
                            return [3 /*break*/, 13];
                        case 8:
                            if (!(sublistId === PCConstants_1.default.SUBLIST.LINE)) return [3 /*break*/, 9];
                            this.setValueOfDLCOnLineSublist(transactionRecord, projectDLCValues);
                            return [3 /*break*/, 13];
                        case 9:
                            if (!!isConsolidateProjectsEnabled) return [3 /*break*/, 13];
                            this.setValueOfDLCFieldsOnHeader(transactionRecord, projectDLCValues, {});
                            if (!RecordHelper_1.RecordHelper.isSalesTransaction(transactionRecord.type)) return [3 /*break*/, 13];
                            itemId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.ITEM,
                                fieldId: PCConstants_1.default.FIELDS.ITEM
                            });
                            if (!itemId) return [3 /*break*/, 13];
                            if (!itemId) return [3 /*break*/, 11];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getItemDCLValues(itemId)];
                        case 10:
                            _c = _d.sent();
                            return [3 /*break*/, 12];
                        case 11:
                            _c = {};
                            _d.label = 12;
                        case 12:
                            itemDLCValues = _c;
                            this.setValueOfDLCOnSublist(transactionRecord, projectDLCValues, itemDLCValues, PCConstants_1.default.LIST.ITEM);
                            _d.label = 13;
                        case 13: return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setDLCOnSublistChange = function (transactionRecord, sublistId) {
            return __awaiter(this, void 0, void 0, function () {
                var tranType, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            tranType = transactionRecord.type;
                            _a = tranType;
                            switch (_a) {
                                case PCConstants_1.default.RECORDS.ESTIMATE: return [3 /*break*/, 1];
                                case PCConstants_1.default.RECORDS.INVOICE: return [3 /*break*/, 1];
                                case PCConstants_1.default.RECORDS.CASHSALE: return [3 /*break*/, 1];
                                case PCConstants_1.default.RECORDS.CREDITMEMO: return [3 /*break*/, 1];
                                case PCConstants_1.default.RECORDS.SALESORDER: return [3 /*break*/, 1];
                                case PCConstants_1.default.RECORDS.VENDORBILL: return [3 /*break*/, 3];
                                case PCConstants_1.default.RECORDS.CHECK: return [3 /*break*/, 3];
                                case PCConstants_1.default.RECORDS.VENDORCREDIT: return [3 /*break*/, 3];
                                case PCConstants_1.default.RECORDS.JOURNALS: return [3 /*break*/, 3];
                                case PCConstants_1.default.RECORDS.EXPENSEREPORT: return [3 /*break*/, 3];
                            }
                            return [3 /*break*/, 5];
                        case 1: return [4 /*yield*/, this.setDLCOnItemChange(transactionRecord)];
                        case 2:
                            _b.sent();
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.setDLCOnSublists(transactionRecord, sublistId)];
                        case 4:
                            _b.sent();
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setDLCOnItemChange = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var isConsolidateProjectsEnabled, itemId, itemDLCValues, _a, projectId, projectDLCValues, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            isConsolidateProjectsEnabled = RecordHelper_1.RecordHelper.isConsolidateProjectsEnabled();
                            itemId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.ITEM,
                                fieldId: PCConstants_1.default.FIELDS.ITEM
                            });
                            if (!itemId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getItemDCLValues(itemId)];
                        case 1:
                            _a = _c.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = {};
                            _c.label = 3;
                        case 3:
                            itemDLCValues = _a;
                            projectId = this.getProjectId(isConsolidateProjectsEnabled, transactionRecord);
                            if (!projectId) return [3 /*break*/, 5];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getProjectDCLValues(projectId)];
                        case 4:
                            _b = _c.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _b = {};
                            _c.label = 6;
                        case 6:
                            projectDLCValues = _b;
                            this.setValueOfDLCOnSublist(transactionRecord, projectDLCValues, itemDLCValues, PCConstants_1.default.LIST.ITEM);
                            return [2 /*return*/];
                    }
                });
            });
        };
        /* Sets D, C, L for transactions like Vendor Bill,Write Check,Bill Credit, Journal-Entry where Expense & Item sub-lists are available
         *  for defaulting D, C, L logic
         * */
        TransactionUseCase.prototype.setDLCOnSublists = function (transactionRecord, sublistId) {
            return __awaiter(this, void 0, void 0, function () {
                var entityId, itemId, entityId, entityId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(sublistId === PCConstants_1.default.SUBLIST.EXPENSE)) return [3 /*break*/, 5];
                            if (!(transactionRecord.type === PCConstants_1.default.RECORDS.EXPENSEREPORT)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.setDLCOnExpenseReportSublist(transactionRecord)];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 2:
                            entityId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.EXPENSE,
                                fieldId: PCConstants_1.default.FIELDS.CUSTOMER
                            });
                            return [4 /*yield*/, this.setDLCOnExpenseSublist(transactionRecord, entityId)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [3 /*break*/, 9];
                        case 5:
                            if (!(sublistId === PCConstants_1.default.SUBLIST.ITEM)) return [3 /*break*/, 7];
                            itemId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.ITEM,
                                fieldId: PCConstants_1.default.FIELDS.ITEM
                            });
                            entityId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.ITEM,
                                fieldId: PCConstants_1.default.FIELDS.CUSTOMER
                            });
                            return [4 /*yield*/, this.setDLCOnItemSublist(transactionRecord, entityId, itemId)];
                        case 6:
                            _a.sent();
                            return [3 /*break*/, 9];
                        case 7:
                            if (!(sublistId === PCConstants_1.default.SUBLIST.LINE)) return [3 /*break*/, 9];
                            entityId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.LINE,
                                fieldId: PCConstants_1.default.FIELDS.ENTITY
                            });
                            return [4 /*yield*/, this.setDLCOnLineSublist(transactionRecord, entityId)];
                        case 8:
                            _a.sent();
                            _a.label = 9;
                        case 9: return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setDLCOnExpenseSublist = function (transactionRecord, entityId) {
            return __awaiter(this, void 0, void 0, function () {
                var projectDLCValues, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!entityId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getDLCFromSelectedCustomerProject(entityId)];
                        case 1:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = {};
                            _b.label = 3;
                        case 3:
                            projectDLCValues = _a;
                            this.setValueOfDLCOnExpenseSublist(transactionRecord, projectDLCValues, {});
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setDLCOnLineSublist = function (transactionRecord, entityId) {
            return __awaiter(this, void 0, void 0, function () {
                var projectDLCValues, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!entityId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getDLCFromSelectedCustomerProject(entityId)];
                        case 1:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = {};
                            _b.label = 3;
                        case 3:
                            projectDLCValues = _a;
                            this.setValueOfDLCOnLineSublist(transactionRecord, projectDLCValues);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setDLCOnItemSublist = function (transactionRecord, entityId, itemId) {
            return __awaiter(this, void 0, void 0, function () {
                var itemDLCValues, _a, projectDLCValues, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itemId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getItemDCLValues(itemId)];
                        case 1:
                            _a = _c.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = {};
                            _c.label = 3;
                        case 3:
                            itemDLCValues = _a;
                            if (!entityId) return [3 /*break*/, 5];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getDLCFromSelectedCustomerProject(entityId)];
                        case 4:
                            _b = _c.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _b = {};
                            _c.label = 6;
                        case 6:
                            projectDLCValues = _b;
                            this.setValueOfDLCOnSublist(transactionRecord, projectDLCValues, itemDLCValues, PCConstants_1.default.LIST.ITEM);
                            return [2 /*return*/];
                    }
                });
            });
        };
        /* This function works for both project field change when consolidated or not and values will be set to header*/
        TransactionUseCase.prototype.setValueOfDLCFieldsOnHeader = function (transactionRecord, projectDLCValues, itemDLCValues) {
            transactionRecord.setValue({
                fieldId: PCConstants_1.default.FIELDS.CLASS,
                value: projectDLCValues[PCConstants_1.default.FIELDS.CLASS] ||
                    itemDLCValues[PCConstants_1.default.FIELDS.CLASS] ||
                    ''
            });
            transactionRecord.setValue({
                fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                value: projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                    itemDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                    ''
            });
            transactionRecord.setValue({
                fieldId: PCConstants_1.default.FIELDS.LOCATION,
                value: projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                    itemDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                    ''
            });
        };
        /*
         * For Sales transactions sublist id is 'item'
         * For Inventory Adjustment transaction sublist id is 'inventory'
         */
        TransactionUseCase.prototype.setValueOfDLCOnSublist = function (transactionRecord, projectDLCValues, itemDLCValues, sublistId) {
            var previousClassValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.CLASS
            });
            var newClassValue = projectDLCValues[PCConstants_1.default.FIELDS.CLASS] || itemDLCValues[PCConstants_1.default.FIELDS.CLASS] || '';
            if (previousClassValue !== newClassValue) {
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                    value: newClassValue
                });
            }
            var newDepartmentValue = projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                itemDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                '';
            var previousDepartmentValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
            });
            if (previousDepartmentValue !== newDepartmentValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                    value: newDepartmentValue
                });
            var newLocationValue = projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                itemDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                '';
            if (sublistId === PCConstants_1.default.SUBLIST.INVENTORY) {
                // To make it persistent with core, restricting location defaulting from Item for Inventory Adjustment's 'inventory' sublist
                newLocationValue = projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] || '';
            }
            var previousLocationValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.LOCATION
            });
            if (previousLocationValue !== newLocationValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.LOCATION,
                    value: newLocationValue
                });
        };
        TransactionUseCase.prototype.setValueOfDLCOnExpenseSublist = function (transactionRecord, projectDLCValues, employeeDCLValues) {
            var previousClassValue = transactionRecord.getCurrentSublistValue({
                sublistId: PCConstants_1.default.LIST.EXPENSE,
                fieldId: PCConstants_1.default.FIELDS.CLASS
            });
            var newClassValue = projectDLCValues[PCConstants_1.default.FIELDS.CLASS] ||
                employeeDCLValues[PCConstants_1.default.FIELDS.CLASS] ||
                '';
            if (previousClassValue !== newClassValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.EXPENSE,
                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                    value: newClassValue
                });
            var previousDepartmentValue = transactionRecord.getCurrentSublistValue({
                sublistId: PCConstants_1.default.LIST.EXPENSE,
                fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
            });
            var newDepartmentValue = projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                employeeDCLValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                '';
            if (previousDepartmentValue !== newDepartmentValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.EXPENSE,
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                    value: newDepartmentValue
                });
            var previousLocationValue = transactionRecord.getCurrentSublistValue({
                sublistId: PCConstants_1.default.LIST.EXPENSE,
                fieldId: PCConstants_1.default.FIELDS.LOCATION
            });
            var newLocationValue = projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                employeeDCLValues[PCConstants_1.default.FIELDS.LOCATION] ||
                '';
            if (previousLocationValue !== newLocationValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.EXPENSE,
                    fieldId: PCConstants_1.default.FIELDS.LOCATION,
                    value: newLocationValue
                });
        };
        TransactionUseCase.prototype.setDLCOnExpenseSublistExpenseReport = function (transactionRecord, entityId, employeeId) {
            return __awaiter(this, void 0, void 0, function () {
                var projectDLCValues, employeeDLCValues, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            projectDLCValues = {};
                            if (!entityId) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.isProjectRecord(entityId)];
                        case 1:
                            if (!_b.sent()) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getProjectDCLValues(entityId)];
                        case 2:
                            projectDLCValues = _b.sent();
                            _b.label = 3;
                        case 3:
                            if (!employeeId) return [3 /*break*/, 5];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getEmployeeDCLValues(employeeId)];
                        case 4:
                            _a = _b.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _a = {};
                            _b.label = 6;
                        case 6:
                            employeeDLCValues = _a;
                            this.setValueOfDLCOnExpenseSublist(transactionRecord, projectDLCValues, employeeDLCValues);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setValueOfDLCOnLineSublist = function (transactionRecord, projectDLCValues) {
            var previousClassValue = transactionRecord.getCurrentSublistValue({
                sublistId: PCConstants_1.default.LIST.LINE,
                fieldId: PCConstants_1.default.FIELDS.CLASS
            });
            var newClassValue = projectDLCValues[PCConstants_1.default.FIELDS.CLASS] || '';
            if (previousClassValue !== newClassValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.LINE,
                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                    value: newClassValue
                });
            var previousDepartmentValue = transactionRecord.getCurrentSublistValue({
                sublistId: PCConstants_1.default.LIST.LINE,
                fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
            });
            var newDepartmentValue = projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] || '';
            if (previousDepartmentValue !== newDepartmentValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.LINE,
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                    value: newDepartmentValue
                });
            var previousLocationValue = transactionRecord.getCurrentSublistValue({
                sublistId: PCConstants_1.default.LIST.LINE,
                fieldId: PCConstants_1.default.FIELDS.LOCATION
            });
            var newLocationValue = projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] || '';
            if (previousLocationValue !== newLocationValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.LINE,
                    fieldId: PCConstants_1.default.FIELDS.LOCATION,
                    value: newLocationValue
                });
        };
        TransactionUseCase.prototype.handleDLCOnLineSublistOnLineSwitch = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var entityId, projectDCL, lineDCLValues, classificationRecord, useCase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            entityId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.LINE,
                                fieldId: PCConstants_1.default.FIELDS.ENTITY
                            });
                            if (!entityId)
                                return [2 /*return*/];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getDLCFromSelectedCustomerProject(entityId)];
                        case 1:
                            projectDCL = _a.sent();
                            lineDCLValues = {
                                department: transactionRecord.getCurrentSublistValue({
                                    sublistId: PCConstants_1.default.LIST.LINE,
                                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
                                }),
                                class: transactionRecord.getCurrentSublistValue({
                                    sublistId: PCConstants_1.default.LIST.LINE,
                                    fieldId: PCConstants_1.default.FIELDS.CLASS
                                }),
                                location: transactionRecord.getCurrentSublistValue({
                                    sublistId: PCConstants_1.default.LIST.LINE,
                                    fieldId: PCConstants_1.default.FIELDS.LOCATION
                                })
                            };
                            if (!((!lineDCLValues.department || !lineDCLValues.class || !lineDCLValues.location) && Object.keys(projectDCL).length)) return [3 /*break*/, 3];
                            classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(transactionRecord.type);
                            if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 3];
                            useCase = new TransactionUseCase();
                            return [4 /*yield*/, useCase.setValueOfDLCOnLineSublistOnLineSwitch(transactionRecord, lineDCLValues, projectDCL)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setValueOfDLCOnLineSublistOnLineSwitch = function (transactionRecord, currentLineDCLValues, projectDLCValues) {
            var previousClassValue = currentLineDCLValues.class;
            var newClassValue = projectDLCValues[PCConstants_1.default.FIELDS.CLASS] || '';
            if (!previousClassValue && (previousClassValue != newClassValue))
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.LINE,
                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                    value: newClassValue
                });
            var previousDepartmentValue = currentLineDCLValues.department;
            var newDepartmentValue = projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] || '';
            if (!previousDepartmentValue && (previousDepartmentValue != newDepartmentValue))
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.LINE,
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                    value: newDepartmentValue
                });
            var previousLocationValue = currentLineDCLValues.location;
            var newLocationValue = projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] || '';
            if (!previousLocationValue && (previousLocationValue != newLocationValue))
                transactionRecord.setCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.LINE,
                    fieldId: PCConstants_1.default.FIELDS.LOCATION,
                    value: newLocationValue
                });
        };
        TransactionUseCase.prototype.getProjectId = function (isConsolidateProjectsEnabled, transactionRecord) {
            var projectId;
            if (isConsolidateProjectsEnabled) {
                projectId = transactionRecord.getCurrentSublistValue({
                    sublistId: PCConstants_1.default.LIST.ITEM,
                    fieldId: PCConstants_1.default.FIELDS.JOB
                });
            }
            else {
                projectId = transactionRecord.getValue(PCConstants_1.default.FIELDS.JOB);
            }
            return projectId;
        };
        TransactionUseCase.prototype.setHeaderDLCOnLineChange = function (transactionRecord, sublistId, classificationRecord) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(classificationRecord.updateHeaderEnabled === 'T')) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.setSublistDLCOnHeader(transactionRecord, sublistId)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        /* This function is for all three sublist expense,item,line sublists to get DCL from sublist project and set it on header*/
        TransactionUseCase.prototype.setSublistDLCOnHeader = function (transactionRecord, sublistId) {
            return __awaiter(this, void 0, void 0, function () {
                var projectFieldId, projectId, isProject, _a, projectDCL, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            projectFieldId = this.getProjectFieldId(transactionRecord.type);
                            if (!projectFieldId) return [3 /*break*/, 7];
                            projectId = transactionRecord.getCurrentSublistValue({
                                sublistId: sublistId,
                                fieldId: projectFieldId
                            });
                            if (!projectId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.isProjectRecord(projectId)];
                        case 1:
                            _a = _c.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = false;
                            _c.label = 3;
                        case 3:
                            isProject = _a;
                            if (!isProject) return [3 /*break*/, 5];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getProjectDCLValues(projectId)];
                        case 4:
                            _b = _c.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _b = {};
                            _c.label = 6;
                        case 6:
                            projectDCL = _b;
                            transactionRecord.setValue({
                                fieldId: PCConstants_1.default.FIELDS.CLASS,
                                value: projectDCL[PCConstants_1.default.FIELDS.CLASS] || ''
                            });
                            transactionRecord.setValue({
                                fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                                value: projectDCL[PCConstants_1.default.FIELDS.DEPARTMENT] || ''
                            });
                            transactionRecord.setValue({
                                fieldId: PCConstants_1.default.FIELDS.LOCATION,
                                value: projectDCL[PCConstants_1.default.FIELDS.LOCATION] || ''
                            });
                            _c.label = 7;
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.getDCLSegmentsFromTransaction = function (transactionRecord, sublistId) {
            var lineCount = transactionRecord.getLineCount({
                sublistId: sublistId
            });
            var dclSegments = {
                departments: new Set(),
                classes: new Set(),
                locations: new Set()
            };
            var department = transactionRecord.getValue({ fieldId: PCConstants_1.default.FIELDS.DEPARTMENT });
            var classification = transactionRecord.getValue({ fieldId: PCConstants_1.default.FIELDS.CLASS });
            var location;
            if (transactionRecord.type === PCConstants_1.default.RECORDS.INVENTORYADJUSTMENT) {
                location = transactionRecord.getValue({ fieldId: PCConstants_1.default.FIELDS.ADJLOCATION });
            }
            else {
                location = transactionRecord.getValue({ fieldId: PCConstants_1.default.FIELDS.LOCATION });
            }
            department && dclSegments.departments.add(department);
            classification && dclSegments.classes.add(classification);
            location && dclSegments.locations.add(location);
            var _getSublistValue = function (fieldId, line) {
                return transactionRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId,
                    line: line
                });
            };
            for (var line = 0; line < lineCount; line++) {
                var department_1 = _getSublistValue(PCConstants_1.default.FIELDS.DEPARTMENT, line);
                department_1 && dclSegments.departments.add(department_1);
                var classification_1 = _getSublistValue(PCConstants_1.default.FIELDS.CLASS, line);
                classification_1 && dclSegments.classes.add(classification_1);
                var location_1 = _getSublistValue(PCConstants_1.default.FIELDS.LOCATION, line);
                location_1 && dclSegments.locations.add(location_1);
            }
            return dclSegments;
        };
        TransactionUseCase.prototype.alertInactiveDCLSegments = function (_a) {
            var departments = _a[0], classes = _a[1], locations = _a[2];
            if (departments || classes || locations) {
                var translationCollection = RecordHelper_1.RecordHelper.getTranslationCollection();
                departments && this.showAlertForDepartmentInactive(translationCollection, departments);
                classes && this.showAlertForClassInactive(translationCollection, classes);
                locations && this.showAlertForLocationInactive(translationCollection, locations);
            }
        };
        TransactionUseCase.prototype.showAlertForDepartmentInactive = function (translationCollection, departmentText) {
            alert(translationCollection[PCConstants_1.default.ERROR_MESSAGE.DEPARTMENT_INACTIVE_ERROR_MESSAGE]() +
                '\n' +
                '\n' +
                departmentText);
        };
        TransactionUseCase.prototype.showAlertForClassInactive = function (translationCollection, classText) {
            alert(translationCollection[PCConstants_1.default.ERROR_MESSAGE.CLASS_INACTIVE_ERROR_MESSAGE]() +
                '\n' +
                '\n' +
                classText);
        };
        TransactionUseCase.prototype.showAlertForLocationInactive = function (translationCollection, locationText) {
            alert(translationCollection[PCConstants_1.default.ERROR_MESSAGE.LOCATION_INACTIVE_ERROR_MESSAGE]() +
                '\n' +
                '\n' +
                locationText);
        };
        TransactionUseCase.prototype.handleInactiveDCLsInEditMode = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!RecordHelper_1.RecordHelper.isSalesTransaction(transactionRecord.type)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.handleInactiveDCLsInSalesTransactions(transactionRecord)];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 12];
                        case 2:
                            if (!(RecordHelper_1.RecordHelper.isExpenseTypeTransaction(transactionRecord.type) ||
                                transactionRecord.type === PCConstants_1.default.RECORDS.PURCHASEORDER)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.handleInactiveDCLsInExpenseTransactions(transactionRecord)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 12];
                        case 4:
                            if (!(transactionRecord.type === PCConstants_1.default.RECORDS.JOURNALS)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.handleInactiveDCLsInJournalTransaction(transactionRecord)];
                        case 5:
                            _a.sent();
                            return [3 /*break*/, 12];
                        case 6:
                            if (!(transactionRecord.type === PCConstants_1.default.RECORDS.EXPENSEREPORT)) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.handleInactiveDCLsInExpenseReportTransactions(transactionRecord)];
                        case 7:
                            _a.sent();
                            return [3 /*break*/, 12];
                        case 8:
                            if (!(transactionRecord.type === PCConstants_1.default.RECORDS.INVENTORYADJUSTMENT)) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.handleInactiveDCLsInInventoryAdjustmentTransaction(transactionRecord)];
                        case 9:
                            _a.sent();
                            return [3 /*break*/, 12];
                        case 10:
                            if (!RecordHelper_1.RecordHelper.isTimeTypeTransaction(transactionRecord.type)) return [3 /*break*/, 12];
                            return [4 /*yield*/, this.handleInactiveDCLsInTimeTransaction(transactionRecord)];
                        case 11:
                            _a.sent();
                            _a.label = 12;
                        case 12: return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.handleInactiveDCLsInSalesTransactions = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var dclSegments, inactiveDCLSegments;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            dclSegments = this.getDCLSegmentsFromTransaction(transactionRecord, PCConstants_1.default.SUBLIST.ITEM);
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getInactiveDCLSegments(dclSegments)];
                        case 1:
                            inactiveDCLSegments = _a.sent();
                            this.alertInactiveDCLSegments(inactiveDCLSegments);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.handleInactiveDCLsInExpenseTransactions = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var dclItemSegments, dclExpenseSegments, dclSegments, inactiveDCLSegments;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            dclItemSegments = this.getDCLSegmentsFromTransaction(transactionRecord, PCConstants_1.default.SUBLIST.ITEM);
                            dclExpenseSegments = this.getDCLSegmentsFromTransaction(transactionRecord, PCConstants_1.default.SUBLIST.EXPENSE);
                            dclSegments = RecordHelper_1.RecordHelper.mergeDCLListObjects(dclItemSegments, dclExpenseSegments);
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getInactiveDCLSegments(dclSegments)];
                        case 1:
                            inactiveDCLSegments = _a.sent();
                            this.alertInactiveDCLSegments(inactiveDCLSegments);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.handleInactiveDCLsInJournalTransaction = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var dclSegments, inactiveDCLSegments;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            dclSegments = this.getDCLSegmentsFromTransaction(transactionRecord, PCConstants_1.default.SUBLIST.LINE);
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getInactiveDCLSegments(dclSegments)];
                        case 1:
                            inactiveDCLSegments = _a.sent();
                            this.alertInactiveDCLSegments(inactiveDCLSegments);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.handleInactiveDCLsInExpenseReportTransactions = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var dclExpenseSegments, inactiveDCLSegments;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            dclExpenseSegments = this.getDCLSegmentsFromTransaction(transactionRecord, PCConstants_1.default.SUBLIST.EXPENSE);
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getInactiveDCLSegments(dclExpenseSegments)];
                        case 1:
                            inactiveDCLSegments = _a.sent();
                            this.alertInactiveDCLSegments(inactiveDCLSegments);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.handleInactiveDCLsInInventoryAdjustmentTransaction = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var dclInventorySegments, inactiveDCLSegments;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            dclInventorySegments = this.getDCLSegmentsFromTransaction(transactionRecord, PCConstants_1.default.SUBLIST.INVENTORY);
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getInactiveDCLSegments(dclInventorySegments)];
                        case 1:
                            inactiveDCLSegments = _a.sent();
                            this.alertInactiveDCLSegments(inactiveDCLSegments);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.handleInactiveDCLsInTimeTransaction = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var dclTimeSegments, inactiveDCLSegments;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            dclTimeSegments = this.getDCLSegmentsFromTransaction(transactionRecord, PCConstants_1.default.SUBLIST.TIMEITEM);
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getInactiveDCLSegments(dclTimeSegments)];
                        case 1:
                            inactiveDCLSegments = _a.sent();
                            this.alertInactiveDCLSegments(inactiveDCLSegments);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.isValidLine = function (transactionRecord, sublistId) {
            return (transactionRecord.getCurrentSublistIndex({ sublistId: sublistId }) !==
                transactionRecord.getLineCount({ sublistId: sublistId }));
        };
        TransactionUseCase.prototype.getDLCFromProject = function (projects) {
            var request = {
                requestType: EndpointsConstants_1.Constants.RequestType.GET_DCL_SEGMENTS_FROM_PROJECT,
                projectsList: projects
            };
            return RecordHelper_1.RecordHelper.sendRequestToDataGenSuiteLetSync(request);
        };
        TransactionUseCase.prototype.getDLCFromItem = function (items) {
            var request = {
                requestType: EndpointsConstants_1.Constants.RequestType.GET_DCL_SEGMENTS_FROM_ITEM,
                itemsList: items
            };
            return RecordHelper_1.RecordHelper.sendRequestToDataGenSuiteLetSync(request);
        };
        TransactionUseCase.prototype.fetchProjectDCLs = function (projects) {
            var results = this.getDLCFromProject(projects);
            var projectMap = {};
            results.data.forEach(function (record) {
                projectMap[record.id] = {
                    department: record.department,
                    class: record.class,
                    location: record.location
                };
            });
            return projectMap;
        };
        TransactionUseCase.prototype.fetchItemDCLs = function (items) {
            var results = this.getDLCFromItem(items);
            var itemMap = {};
            results.data.forEach(function (record) {
                itemMap[record.id] = {
                    department: record.department,
                    class: record.class,
                    location: record.location
                };
            });
            return itemMap;
        };
        TransactionUseCase.prototype.updateDCLOnSalesTransaction = function (scriptContext, isUpdateHeaderEnabled) {
            var transactionRecord = record_1.default.load({
                id: scriptContext.newRecord.id,
                type: scriptContext.newRecord.type
            });
            var isConsolidateProjectsEnabled = RecordHelper_1.RecordHelper.isConsolidateProjectsEnabled();
            var isProjectAtHeader = isConsolidateProjectsEnabled === 'F';
            var _a = this.fetchProjectAndItemFromItemSublist(transactionRecord, isProjectAtHeader), projects = _a.projects, items = _a.items;
            var projectMap = projects.length ? this.fetchProjectDCLs(projects) : {};
            var itemMap = items.length ? this.fetchItemDCLs(items) : {};
            this.updateDCLFieldsOnItemSublist(transactionRecord, projectMap, itemMap, isProjectAtHeader);
            this.updateDCLFieldsOnHeader(transactionRecord, isProjectAtHeader, projectMap, isUpdateHeaderEnabled);
            transactionRecord.save();
        };
        TransactionUseCase.prototype.updateDCLOnChargeRecord = function (scriptContext) {
            var chargeRecord = scriptContext.newRecord;
            var project = chargeRecord.getValue({
                fieldId: PCConstants_1.default.FIELDS.BILL_TO
            });
            var item = chargeRecord.getValue({
                fieldId: PCConstants_1.default.FIELDS.BILLING_ITEM
            });
            var emptyDCLValues = { class: '', department: '', location: '' };
            var projectDCLValues = project ? this.fetchProjectDCLs(project)[project] : emptyDCLValues;
            var itemDCLValues = item ? this.fetchItemDCLs(item)[item] : emptyDCLValues;
            if (projectDCLValues.class || itemDCLValues.class) {
                chargeRecord.setValue({
                    value: projectDCLValues.class || itemDCLValues.class,
                    fieldId: PCConstants_1.default.FIELDS.CLASS
                });
            }
            if (projectDCLValues.department || itemDCLValues.department) {
                chargeRecord.setValue({
                    value: projectDCLValues.department || itemDCLValues.department,
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
                });
            }
            if (projectDCLValues.location || itemDCLValues.location) {
                chargeRecord.setValue({
                    value: projectDCLValues.location || itemDCLValues.location,
                    fieldId: PCConstants_1.default.FIELDS.LOCATION
                });
            }
        };
        TransactionUseCase.prototype.updateDCLOnJournalRecord = function (scriptContext) {
            if (!this.isRevRecJE(scriptContext.newRecord)) {
                var journalRecord = record_1.default.load({
                    id: scriptContext.newRecord.id,
                    type: scriptContext.newRecord.type
                });
                var projects = this.fetchProjectFromSublist(journalRecord, PCConstants_1.default.SUBLIST.LINE, PCConstants_1.default.FIELDS.ENTITY).projects;
                var projectMap = projects.length ? this.fetchProjectDCLs(projects) : {};
                this.updateDCLFieldsOnLineSublist(journalRecord, projectMap);
                journalRecord.save();
            }
        };
        TransactionUseCase.prototype.fetchProjectAndItemFromItemSublist = function (transactionRecord, isProjectAtHeader, fieldId) {
            if (fieldId === void 0) { fieldId = PCConstants_1.default.FIELDS.JOB; }
            var projects = new Set();
            var items = new Set();
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.ITEM
            });
            if (isProjectAtHeader) {
                var projectAtHeader = transactionRecord.getValue({
                    fieldId: fieldId
                });
                if (projectAtHeader)
                    projects.add(projectAtHeader);
            }
            for (var line = 0; line < lineCount; line++) {
                if (!isProjectAtHeader) {
                    var project = transactionRecord.getSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.ITEM,
                        fieldId: fieldId,
                        line: line
                    });
                    if (project)
                        projects.add(project);
                }
                var item = transactionRecord.getSublistValue({
                    sublistId: PCConstants_1.default.SUBLIST.ITEM,
                    fieldId: PCConstants_1.default.FIELDS.ITEM,
                    line: line
                });
                if (item)
                    items.add(item);
            }
            return {
                projects: Array.from(projects),
                items: Array.from(items)
            };
        };
        TransactionUseCase.prototype.fetchProjectFromSublist = function (transactionRecord, sublistId, fieldId) {
            var projects = new Set();
            var lineCount = transactionRecord.getLineCount({
                sublistId: sublistId
            });
            for (var line = 0; line < lineCount; line++) {
                var project = transactionRecord.getSublistValue({
                    fieldId: fieldId,
                    line: line,
                    sublistId: sublistId
                });
                if (project)
                    projects.add(project);
            }
            return {
                projects: Array.from(projects)
            };
        };
        TransactionUseCase.prototype.updateDCLFieldsOnLineSublist = function (journalRecord, projectMap) {
            var lineCount = journalRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.LINE
            });
            for (var line = 0; line < lineCount; line++) {
                var project = journalRecord.getSublistValue({
                    fieldId: PCConstants_1.default.FIELDS.ENTITY,
                    line: line,
                    sublistId: PCConstants_1.default.SUBLIST.LINE
                });
                var projectDCLValues = project && projectMap[project] ? projectMap[project] : {};
                if (projectDCLValues.class) {
                    journalRecord.setSublistValue({
                        value: projectDCLValues.class,
                        fieldId: PCConstants_1.default.FIELDS.CLASS,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.LINE
                    });
                }
                if (projectDCLValues.department) {
                    journalRecord.setSublistValue({
                        value: projectDCLValues.department,
                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.LINE
                    });
                }
                if (projectDCLValues.location) {
                    journalRecord.setSublistValue({
                        value: projectDCLValues.location,
                        fieldId: PCConstants_1.default.FIELDS.LOCATION,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.LINE
                    });
                }
            }
        };
        TransactionUseCase.prototype.updateDCLFieldsOnItemSublist = function (transactionRecord, projectMap, itemMap, isProjectAtHeader) {
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.ITEM
            });
            var projectAtHeader;
            if (isProjectAtHeader) {
                projectAtHeader = transactionRecord.getValue({
                    fieldId: PCConstants_1.default.FIELDS.JOB
                });
            }
            for (var line = 0; line < lineCount; line++) {
                var project = void 0;
                if (!isProjectAtHeader && RecordHelper_1.RecordHelper.isSalesTransaction(transactionRecord.type)) {
                    project = transactionRecord.getSublistValue({
                        fieldId: PCConstants_1.default.FIELDS.JOB,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.ITEM
                    });
                }
                else if (RecordHelper_1.RecordHelper.isExpenseTypeTransaction(transactionRecord.type)) {
                    project = transactionRecord.getSublistValue({
                        fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.ITEM
                    });
                }
                else {
                    project = projectAtHeader;
                }
                var item = transactionRecord.getSublistValue({
                    fieldId: PCConstants_1.default.FIELDS.ITEM,
                    line: line,
                    sublistId: PCConstants_1.default.SUBLIST.ITEM
                });
                var projectDCLValues = project && projectMap[project] ? projectMap[project] : {};
                var itemDCLValues = item ? itemMap[item] : {};
                if (projectDCLValues.class || itemDCLValues.class) {
                    transactionRecord.setSublistValue({
                        value: projectDCLValues.class || itemDCLValues.class,
                        fieldId: PCConstants_1.default.FIELDS.CLASS,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.ITEM
                    });
                }
                if (projectDCLValues.department || itemDCLValues.department) {
                    transactionRecord.setSublistValue({
                        value: projectDCLValues.department || itemDCLValues.department,
                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.ITEM
                    });
                }
                if (projectDCLValues.location || itemDCLValues.location) {
                    transactionRecord.setSublistValue({
                        value: projectDCLValues.location || itemDCLValues.location,
                        fieldId: PCConstants_1.default.FIELDS.LOCATION,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.ITEM
                    });
                }
            }
        };
        TransactionUseCase.prototype.getTransactionRecordValueFromPreference = function (transactionType) {
            var request = {
                requestType: EndpointsConstants_1.Constants.RequestType.GET_PC_PREFERENCES
            };
            var results = RecordHelper_1.RecordHelper.sendRequestToDataGenSuiteLetSync(request);
            var transactionPreferences = results.data.transactionPreferences;
            var isUpdateHeaderEnabled = results.data.customSelectUpdateHeader === 'T';
            var recordValue;
            if (transactionPreferences) {
                recordValue = transactionPreferences.find(function (d) { return d.transactionType === transactionType.toUpperCase(); });
            }
            return { isUpdateHeaderEnabled: isUpdateHeaderEnabled, recordValue: recordValue };
        };
        TransactionUseCase.prototype.updateDCLFieldsOnHeader = function (transactionRecord, isProjectAtHeader, projectDCLMap, isUpdateHeaderEnabled) {
            var projectDCLValues = { class: '', location: '', department: '' };
            if (isProjectAtHeader) {
                var project = transactionRecord.getValue({
                    fieldId: PCConstants_1.default.FIELDS.JOB
                });
                if (project) {
                    projectDCLValues = projectDCLMap[project];
                }
            }
            else if (isUpdateHeaderEnabled) {
                /** step 1: consider last sublist when transaction contains two or more subLists with dcl fields and fetch project from last sublist last line. */
                var projectAtLastLine = this.getProjectAtLastLine(transactionRecord);
                /** step 2: fetch DCL values of the selected project at last active line */
                projectDCLValues = projectAtLastLine ? projectDCLMap[projectAtLastLine] : {};
            }
            /** step 3: defaulting only active segments to the header from line **/
            var classAtHeader = transactionRecord.getValue({ fieldId: PCConstants_1.default.FIELDS.CLASS });
            var departmentAtHeader = transactionRecord.getValue({
                fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
            });
            var locationAtHeader = transactionRecord.getValue({ fieldId: PCConstants_1.default.FIELDS.LOCATION });
            if ((isProjectAtHeader || !classAtHeader) && projectDCLValues.class) {
                transactionRecord.setValue({
                    value: projectDCLValues.class,
                    fieldId: PCConstants_1.default.FIELDS.CLASS
                });
            }
            if ((isProjectAtHeader || !departmentAtHeader) && projectDCLValues.department) {
                transactionRecord.setValue({
                    value: projectDCLValues.department,
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
                });
            }
            if ((isProjectAtHeader || !locationAtHeader) && projectDCLValues.location) {
                transactionRecord.setValue({
                    value: projectDCLValues.location,
                    fieldId: PCConstants_1.default.FIELDS.LOCATION
                });
            }
        };
        TransactionUseCase.prototype.getLastSubList = function (transactionRecord) {
            var subLists = transactionRecord.getSublists();
            var lastSubList = subLists
                .filter(function (sublist) { return Object.values(PCConstants_1.default.SUBLIST).indexOf(sublist) != -1; })
                .slice(-1)[0];
            return lastSubList;
        };
        TransactionUseCase.prototype.getProjectAtLastLine = function (transactionRecord) {
            var lastSubList = this.getLastSubList(transactionRecord);
            var lineCount = transactionRecord.getLineCount({
                sublistId: lastSubList
            });
            var fieldId = PCConstants_1.default.FIELDS.CUSTOMER;
            if (RecordHelper_1.RecordHelper.isSalesTransaction(transactionRecord.type)) {
                fieldId = PCConstants_1.default.FIELDS.JOB;
            }
            return transactionRecord.getSublistValue({
                sublistId: lastSubList,
                fieldId: fieldId,
                line: lineCount - 1
            });
        };
        /*
         * Updates DLC fields at sublist and header level for Vendor Bill transaction
         * via CSV import and Webservices(SOAP/REST)
         */
        TransactionUseCase.prototype.updateDCLOnExpenseTransactionFromUE = function (record, isUpdateHeaderEnabled) {
            var expenseUtil = new PC_ExpenseUtil_1.default();
            var transactionRecord = record_1.default.load({
                id: record.id,
                type: record.type
            });
            // fetch Projects, items from sublist: EXPENSE
            var projectsAtExpenseSublist = expenseUtil.fetchProjectFromExpenseSublist(transactionRecord).projectsAtExpenseSublist;
            // fetch Projects, items from sublist: ITEM
            var _a = expenseUtil.fetchProjectAndItemFromItemSublist(transactionRecord), projectsAtItemSublist = _a.projectsAtItemSublist, itemsAtItemSublist = _a.itemsAtItemSublist;
            var projectsAtSubLists = Array.from(new Set(__spreadArray(__spreadArray([], projectsAtExpenseSublist, true), projectsAtItemSublist, true)));
            var projectMap = this.fetchProjectDCLs(projectsAtSubLists);
            var itemMapAtItemSublist = this.fetchItemDCLs(itemsAtItemSublist);
            // update DLC for sublist: EXPENSE
            expenseUtil.updateDCLFieldsOnExpenseSublist(transactionRecord, projectMap);
            // update DCL for sublist: ITEM
            this.updateDCLFieldsOnItemSublist(transactionRecord, projectMap, itemMapAtItemSublist, false);
            this.updateDCLFieldsOnHeader(transactionRecord, false, projectMap, isUpdateHeaderEnabled);
            transactionRecord.save();
        };
        /*
         * Updates DLC fields at sublist and header level for Expense Report transaction
         * via CSV import and Webservices(SOAP/REST)
         */
        TransactionUseCase.prototype.updateDCLonExpenseReportTransactionFromUE = function (record, isUpdateHeaderEnabled) {
            return __awaiter(this, void 0, void 0, function () {
                var expenseUtil, transactionRecord, _a, employee, projectsAtExpenseSublist, projectMapAtExpenseSublist, employeeDCLValues;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            expenseUtil = new PC_ExpenseUtil_1.default();
                            transactionRecord = record_1.default.load({
                                id: record.id,
                                type: record.type
                            });
                            _a = expenseUtil.fetchEmployeeProjectValuesFromExpenseReportTransaction(transactionRecord), employee = _a.employee, projectsAtExpenseSublist = _a.projectsAtExpenseSublist;
                            projectMapAtExpenseSublist = this.fetchProjectDCLs(projectsAtExpenseSublist);
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getDLCFromEmployee(employee)];
                        case 1:
                            employeeDCLValues = _b.sent();
                            expenseUtil.updateDCLFieldsOnExpenseReportSublist(transactionRecord, projectMapAtExpenseSublist, employeeDCLValues);
                            this.updateDCLFieldsOnHeader(transactionRecord, false, projectMapAtExpenseSublist, isUpdateHeaderEnabled);
                            transactionRecord.save();
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setDLCOnExpenseReportSublist = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var categoryId, customerId, employeeId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            categoryId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.EXPENSE,
                                fieldId: PCConstants_1.default.FIELDS.CATEGORY
                            });
                            customerId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.EXPENSE,
                                fieldId: PCConstants_1.default.FIELDS.CUSTOMER
                            });
                            if (!(categoryId || customerId)) return [3 /*break*/, 2];
                            employeeId = transactionRecord.getValue({
                                fieldId: PCConstants_1.default.FIELDS.ENTITY
                            });
                            return [4 /*yield*/, this.setDLCOnExpenseSublistExpenseReport(transactionRecord, customerId || '', employeeId)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        /*
         * Sets DLC values from UI mode in TimeEntry and Weekly Timesheet
         */
        TransactionUseCase.prototype.setDCLForTimeEntry = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var classificationRecord, _a, projectDLCValues, employeeDLCValues, isNonUIMode;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(transactionRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEET ||
                                transactionRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEETNEWUI)) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(PCConstants_1.default.TRANSACTION_TYPE.WEEKLYTIMESHEET)];
                        case 1:
                            classificationRecord = _b.sent();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(transactionRecord.type)];
                        case 3:
                            classificationRecord = _b.sent();
                            _b.label = 4;
                        case 4:
                            if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.fetchDLCForTimeEntry(transactionRecord)];
                        case 5:
                            _a = _b.sent(), projectDLCValues = _a.projectDLCValues, employeeDLCValues = _a.employeeDLCValues;
                            isNonUIMode = false;
                            this.setDLCFieldsOnTimeEntry(transactionRecord, projectDLCValues, employeeDLCValues, isNonUIMode);
                            _b.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        /*
         * Sets DLC fields on Time Entry & Weekly Timesheet transaction
         * In Non UI mode, if no DLC values are available in selected Employee & Customer then dont reset any DCL fields.
         * In UI, if no DCL values are available in selected Employee & Customer then reset DCL fields to empty values ''
         * In UI Mode Setting DLC values for all three transactions WeeklyTimeSheet,WeeklyTimeSheetNewUI, Time Entry
         * In Non-UI Mode Only for TimeEntry
         * */
        TransactionUseCase.prototype.setDLCFieldsOnTimeEntry = function (transactionRecord, projectDLCValues, employeeDLCValues, isNonUIMode) {
            if (isNonUIMode) {
                if ((projectDLCValues === null || projectDLCValues === void 0 ? void 0 : projectDLCValues[PCConstants_1.default.FIELDS.CLASS]) ||
                    (employeeDLCValues === null || employeeDLCValues === void 0 ? void 0 : employeeDLCValues[PCConstants_1.default.FIELDS.CLASS])) {
                    transactionRecord.setValue({
                        fieldId: PCConstants_1.default.FIELDS.CLASS,
                        value: (projectDLCValues === null || projectDLCValues === void 0 ? void 0 : projectDLCValues[PCConstants_1.default.FIELDS.CLASS]) ||
                            (employeeDLCValues === null || employeeDLCValues === void 0 ? void 0 : employeeDLCValues[PCConstants_1.default.FIELDS.CLASS])
                    });
                }
                if ((projectDLCValues === null || projectDLCValues === void 0 ? void 0 : projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT]) ||
                    (employeeDLCValues === null || employeeDLCValues === void 0 ? void 0 : employeeDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT])) {
                    transactionRecord.setValue({
                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                        value: (projectDLCValues === null || projectDLCValues === void 0 ? void 0 : projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT]) ||
                            (employeeDLCValues === null || employeeDLCValues === void 0 ? void 0 : employeeDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT])
                    });
                }
                if ((projectDLCValues === null || projectDLCValues === void 0 ? void 0 : projectDLCValues[PCConstants_1.default.FIELDS.LOCATION]) ||
                    (employeeDLCValues === null || employeeDLCValues === void 0 ? void 0 : employeeDLCValues[PCConstants_1.default.FIELDS.LOCATION])) {
                    transactionRecord.setValue({
                        fieldId: PCConstants_1.default.FIELDS.LOCATION,
                        value: (projectDLCValues === null || projectDLCValues === void 0 ? void 0 : projectDLCValues[PCConstants_1.default.FIELDS.LOCATION]) ||
                            (employeeDLCValues === null || employeeDLCValues === void 0 ? void 0 : employeeDLCValues[PCConstants_1.default.FIELDS.LOCATION])
                    });
                }
            }
            else {
                if (transactionRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEET ||
                    transactionRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEETNEWUI) {
                    var previousClassValue = transactionRecord.getCurrentSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.TIMEITEM,
                        fieldId: PCConstants_1.default.FIELDS.CLASS
                    });
                    var newClassValue = projectDLCValues[PCConstants_1.default.FIELDS.CLASS] ||
                        employeeDLCValues[PCConstants_1.default.FIELDS.CLASS] ||
                        '';
                    if (previousClassValue !== newClassValue)
                        transactionRecord.setCurrentSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.TIMEITEM,
                            fieldId: PCConstants_1.default.FIELDS.CLASS,
                            value: newClassValue
                        });
                    var previousDepartmentValue = transactionRecord.getCurrentSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.TIMEITEM,
                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
                    });
                    var newDepartmentValue = projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                        employeeDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                        '';
                    if (previousDepartmentValue !== newDepartmentValue)
                        transactionRecord.setCurrentSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.TIMEITEM,
                            fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                            value: newDepartmentValue
                        });
                    var previousLocationValue = transactionRecord.getCurrentSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.TIMEITEM,
                        fieldId: PCConstants_1.default.FIELDS.LOCATION
                    });
                    var newLocationValue = projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                        employeeDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                        '';
                    if (previousLocationValue !== newLocationValue)
                        transactionRecord.setCurrentSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.TIMEITEM,
                            fieldId: PCConstants_1.default.FIELDS.LOCATION,
                            value: newLocationValue
                        });
                }
                transactionRecord.setValue({
                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                    value: projectDLCValues[PCConstants_1.default.FIELDS.CLASS] ||
                        employeeDLCValues[PCConstants_1.default.FIELDS.CLASS] ||
                        ''
                });
                transactionRecord.setValue({
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                    value: projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                        employeeDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                        ''
                });
                transactionRecord.setValue({
                    fieldId: PCConstants_1.default.FIELDS.LOCATION,
                    value: projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                        employeeDLCValues[PCConstants_1.default.FIELDS.LOCATION] ||
                        ''
                });
            }
        };
        TransactionUseCase.prototype.fetchDLCForTimeEntry = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var projectId, projectDLCValues, _a, employeeId, employeeDLCValues, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            projectId = transactionRecord.getValue(PCConstants_1.default.FIELDS.CUSTOMER);
                            if (transactionRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEET ||
                                transactionRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEETNEWUI) {
                                projectId = transactionRecord.getCurrentSublistValue({
                                    sublistId: PCConstants_1.default.SUBLIST.TIMEITEM,
                                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER
                                });
                            }
                            projectDLCValues = {};
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.isProjectRecord(projectId)];
                        case 1:
                            if (!_c.sent()) return [3 /*break*/, 5];
                            if (!projectId) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getProjectDCLValues(projectId)];
                        case 2:
                            _a = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = {};
                            _c.label = 4;
                        case 4:
                            projectDLCValues = _a;
                            _c.label = 5;
                        case 5:
                            employeeId = transactionRecord.getValue(PCConstants_1.default.FIELDS.EMPLOYEE);
                            if (!employeeId) return [3 /*break*/, 7];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getEmployeeDCLValues(employeeId)];
                        case 6:
                            _b = _c.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            _b = {};
                            _c.label = 8;
                        case 8:
                            employeeDLCValues = _b;
                            return [2 /*return*/, {
                                    projectDLCValues: projectDLCValues,
                                    employeeDLCValues: employeeDLCValues
                                }];
                    }
                });
            });
        };
        TransactionUseCase.prototype.setDLCOnPurchaseOrder = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var classificationRecord, purchaseUtil;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type)];
                        case 1:
                            classificationRecord = _a.sent();
                            if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 3];
                            purchaseUtil = new PC_PurchaseOrderUtils_1.default(this);
                            return [4 /*yield*/, purchaseUtil.setDLCOnPurchaseOrder(context.currentRecord, context.sublistId, context.fieldId)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /*
         * Updates DCL fields on non UI mode after saving the TimeEntry record.
         */
        TransactionUseCase.prototype.updateDCLOnTimeEntryFromUE = function (scriptContext) {
            return __awaiter(this, void 0, void 0, function () {
                var timeEntryRecord, project, employee, emptyDCLValues, isProject, projectDCLValues, employeeDLCValues, _a, isNonUIMode;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            timeEntryRecord = record_1.default.load({
                                id: scriptContext.newRecord.id,
                                type: scriptContext.newRecord.type
                            });
                            project = timeEntryRecord.getValue({
                                fieldId: PCConstants_1.default.FIELDS.CUSTOMER
                            });
                            employee = timeEntryRecord.getValue({
                                fieldId: PCConstants_1.default.FIELDS.EMPLOYEE
                            });
                            emptyDCLValues = { class: '', department: '', location: '' };
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.isProjectRecord(project)];
                        case 1:
                            isProject = _b.sent();
                            projectDCLValues = isProject
                                ? this.fetchProjectDCLs(project)[project]
                                : emptyDCLValues;
                            if (!employee) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getDLCFromEmployee(employee)];
                        case 2:
                            _a = _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = emptyDCLValues;
                            _b.label = 4;
                        case 4:
                            employeeDLCValues = _a;
                            isNonUIMode = true;
                            this.setDLCFieldsOnTimeEntry(timeEntryRecord, projectDCLValues, employeeDLCValues, isNonUIMode);
                            timeEntryRecord.save();
                            return [2 /*return*/];
                    }
                });
            });
        };
        TransactionUseCase.prototype.updateDCLOnPurchaseOrderTransaction = function (scriptContext, isUpdateHeaderEnabled) {
            return __awaiter(this, void 0, void 0, function () {
                var purchaseUtil, transactionRecord;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            purchaseUtil = new PC_PurchaseOrderUtils_1.default(this);
                            transactionRecord = record_1.default.load({
                                type: scriptContext.newRecord.type,
                                id: scriptContext.newRecord.id
                            });
                            return [4 /*yield*/, purchaseUtil.updateDCLOnPurchaseOrderTransaction(transactionRecord, isUpdateHeaderEnabled)];
                        case 1:
                            _a.sent();
                            transactionRecord.save();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /*
         * Sets DLC defaulting in Inventory Adjustment transactions in UI mode
         */
        TransactionUseCase.prototype.setDCLForInventoryAdjustment = function (transactionRecord, selectedField) {
            return __awaiter(this, void 0, void 0, function () {
                var projectId, isProjectId, _a, projectDLCValues, _b, itemId, itemDLCValues, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            projectId = transactionRecord.getValue(PCConstants_1.default.FIELDS.CUSTOMER);
                            if (!projectId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.isProjectRecord(projectId)];
                        case 1:
                            _a = _d.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = false;
                            _d.label = 3;
                        case 3:
                            isProjectId = _a;
                            if (!isProjectId) return [3 /*break*/, 5];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getProjectDCLValues(projectId)];
                        case 4:
                            _b = _d.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _b = {};
                            _d.label = 6;
                        case 6:
                            projectDLCValues = _b;
                            if (selectedField === PCConstants_1.default.FIELDS.CUSTOMER) {
                                transactionRecord.setValue({
                                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                                    value: projectDLCValues[PCConstants_1.default.FIELDS.CLASS] || ''
                                });
                                transactionRecord.setValue({
                                    fieldId: PCConstants_1.default.FIELDS.ADJLOCATION,
                                    value: projectDLCValues[PCConstants_1.default.FIELDS.LOCATION] || ''
                                });
                                transactionRecord.setValue({
                                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                                    value: projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT] || ''
                                });
                            }
                            itemId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.SUBLIST.INVENTORY,
                                fieldId: PCConstants_1.default.FIELDS.ITEM
                            });
                            if (!itemId) return [3 /*break*/, 8];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getItemDCLValues(itemId)];
                        case 7:
                            _c = _d.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            _c = {};
                            _d.label = 9;
                        case 9:
                            itemDLCValues = _c;
                            this.setValueOfDLCOnSublist(transactionRecord, projectDLCValues, itemDLCValues, PCConstants_1.default.SUBLIST.INVENTORY);
                            return [2 /*return*/];
                    }
                });
            });
        };
        /*
         * Updates DLC defaulting in Inventory Adjustment transaction via non ui channels
         */
        TransactionUseCase.prototype.updateDCLOnInventoryAdjustmentTransaction = function (scriptContext) {
            return __awaiter(this, void 0, void 0, function () {
                var transactionRecord;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            transactionRecord = record_1.default.load({
                                id: scriptContext.newRecord.id,
                                type: scriptContext.newRecord.type
                            });
                            return [4 /*yield*/, this.setDLCOnInventoryAdjustmentNonUI(transactionRecord)];
                        case 1:
                            _a.sent();
                            transactionRecord.save();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /*
         * Fetch and set DLC values at header and line level in Inventory Adjustment via non UI channels
         */
        TransactionUseCase.prototype.setDLCOnInventoryAdjustmentNonUI = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var projectId, isProjectId, _a, projectDLCValues, lineCount, items, itemMap, line, item, itemDCLValues;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            projectId = transactionRecord.getValue(PCConstants_1.default.FIELDS.CUSTOMER);
                            if (!projectId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.isProjectRecord(projectId)];
                        case 1:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = false;
                            _b.label = 3;
                        case 3:
                            isProjectId = _a;
                            if (!isProjectId) return [3 /*break*/, 5];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getDLCFromProject(projectId)];
                        case 4:
                            projectDLCValues = _b.sent();
                            if (projectDLCValues[PCConstants_1.default.FIELDS.CLASS]) {
                                transactionRecord.setValue({
                                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                                    value: projectDLCValues[PCConstants_1.default.FIELDS.CLASS]
                                });
                            }
                            if (projectDLCValues[PCConstants_1.default.FIELDS.LOCATION]) {
                                transactionRecord.setValue({
                                    fieldId: PCConstants_1.default.FIELDS.ADJLOCATION,
                                    value: projectDLCValues[PCConstants_1.default.FIELDS.LOCATION]
                                });
                            }
                            if (projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT]) {
                                transactionRecord.setValue({
                                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                                    value: projectDLCValues[PCConstants_1.default.FIELDS.DEPARTMENT]
                                });
                            }
                            lineCount = transactionRecord.getLineCount({
                                sublistId: PCConstants_1.default.SUBLIST.INVENTORY
                            });
                            items = this.fetchItemFromInventorySublist(transactionRecord, lineCount);
                            itemMap = items.length ? this.fetchItemDCLs(items) : {};
                            for (line = 0; line < lineCount; line++) {
                                item = transactionRecord.getSublistValue({
                                    sublistId: PCConstants_1.default.SUBLIST.INVENTORY,
                                    fieldId: PCConstants_1.default.FIELDS.ITEM,
                                    line: line
                                });
                                itemDCLValues = item ? itemMap[item] : {};
                                if (projectDLCValues.class || itemDCLValues.class) {
                                    transactionRecord.setSublistValue({
                                        sublistId: PCConstants_1.default.SUBLIST.INVENTORY,
                                        fieldId: PCConstants_1.default.FIELDS.CLASS,
                                        line: line,
                                        value: projectDLCValues.class || itemDCLValues.class
                                    });
                                }
                                if (projectDLCValues.department || itemDCLValues.department) {
                                    transactionRecord.setSublistValue({
                                        sublistId: PCConstants_1.default.SUBLIST.INVENTORY,
                                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                                        line: line,
                                        value: projectDLCValues.department || itemDCLValues.department
                                    });
                                }
                                if (projectDLCValues.location || itemDCLValues.location) {
                                    transactionRecord.setSublistValue({
                                        sublistId: PCConstants_1.default.SUBLIST.INVENTORY,
                                        fieldId: PCConstants_1.default.FIELDS.LOCATION,
                                        line: line,
                                        value: projectDLCValues.location || itemDCLValues.location
                                    });
                                }
                            }
                            _b.label = 5;
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        /*
         * Fetches multiple line items from 'Inventory' sublist present in Inventory adjustment record
         */
        TransactionUseCase.prototype.fetchItemFromInventorySublist = function (transactionRecord, lineCount) {
            var items = new Set();
            for (var line = 0; line < lineCount; line++) {
                var item = transactionRecord.getSublistValue({
                    sublistId: PCConstants_1.default.SUBLIST.INVENTORY,
                    fieldId: PCConstants_1.default.FIELDS.ITEM,
                    line: line
                });
                if (item)
                    items.add(item);
            }
            return Array.from(items);
        };
        TransactionUseCase.prototype.getProjectFieldId = function (transactionType) {
            if (RecordHelper_1.RecordHelper.isSalesTransaction(transactionType)) {
                return PCConstants_1.default.FIELDS.JOB;
            }
            if (RecordHelper_1.RecordHelper.isExpenseTypeTransaction(transactionType)) {
                return PCConstants_1.default.FIELDS.CUSTOMER;
            }
            if ([
                PCConstants_1.default.RECORDS.EXPENSEREPORT,
                PCConstants_1.default.RECORDS.PURCHASEORDER,
                PCConstants_1.default.RECORDS.JOURNALS
            ].indexOf(transactionType) !== -1)
                return PCConstants_1.default.FIELDS.CUSTOMER;
            return '';
        };
        /*
         * Updates header and line level DCL fields on Revenue Arrangement via non ui channel
         */
        TransactionUseCase.prototype.updateDCLOnRevenueArrangementTransaction = function (scriptContext, isUpdateHeaderEnabled) {
            var revenueArrangementTransaction = scriptContext.newRecord;
            this.setHeaderAndLineDLCOnRevenueArrangement(revenueArrangementTransaction, isUpdateHeaderEnabled);
        };
        /*
         * Sets header level standard DCL fields and sublist level custom fields Project Class, Project Location, Project Department
         * fields via non ui channel in Revenue Arrangement transaction when source type is Project Revenue Rule
         */
        TransactionUseCase.prototype.setHeaderAndLineDLCOnRevenueArrangement = function (revenueArrangementTransaction, isUpdateHeaderEnabled) {
            var revenueElementsCount = revenueArrangementTransaction.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.REVENUEELEMENT
            });
            var sublistProjects = this.fetchProjectFromSublist(revenueArrangementTransaction, PCConstants_1.default.SUBLIST.REVENUEELEMENT, PCConstants_1.default.FIELDS.CUSTOMER);
            var projectMap = sublistProjects.projects.length
                ? this.fetchProjectDCLs(sublistProjects.projects)
                : {};
            var projectDLCValues = {
                class: '',
                department: '',
                location: ''
            };
            // Sets line level DCL
            for (var i = 0; i < revenueElementsCount; i++) {
                if (this.isSourceTypeProjectRevenueRule(revenueArrangementTransaction, i)) {
                    var revenueElementCustomer = revenueArrangementTransaction.getSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.REVENUEELEMENT,
                        fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                        line: i
                    });
                    projectDLCValues =
                        revenueElementCustomer && projectMap[revenueElementCustomer]
                            ? projectMap[revenueElementCustomer]
                            : {};
                    if (projectDLCValues.class)
                        revenueArrangementTransaction.setSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.REVENUEELEMENT,
                            fieldId: PCConstants_1.default.FIELDS.CLASS,
                            line: i,
                            value: projectDLCValues.class
                        });
                    if (projectDLCValues.department)
                        revenueArrangementTransaction.setSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.REVENUEELEMENT,
                            fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                            value: projectDLCValues.department,
                            line: i
                        });
                    if (projectDLCValues.location)
                        revenueArrangementTransaction.setSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.REVENUEELEMENT,
                            fieldId: PCConstants_1.default.FIELDS.LOCATION,
                            value: projectDLCValues.location,
                            line: i
                        });
                }
            }
            // sets header level DCL
            if (isUpdateHeaderEnabled &&
                this.isSourceTypeProjectRevenueRule(revenueArrangementTransaction, revenueElementsCount - 1))
                this.setHeaderDLCOnRevenueArrangement(revenueArrangementTransaction, projectDLCValues);
        };
        /*
         * Sets header level DCL field values with last line project's DLC values
         */
        TransactionUseCase.prototype.setHeaderDLCOnRevenueArrangement = function (revenueArrangementTransaction, lastSublistLineProjectDLCValues) {
            try {
                if (lastSublistLineProjectDLCValues.class)
                    revenueArrangementTransaction.setValue({
                        fieldId: PCConstants_1.default.FIELDS.CLASS,
                        value: lastSublistLineProjectDLCValues.class
                    });
                if (lastSublistLineProjectDLCValues.department)
                    revenueArrangementTransaction.setValue({
                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                        value: lastSublistLineProjectDLCValues.department
                    });
                if (lastSublistLineProjectDLCValues.location)
                    revenueArrangementTransaction.setValue({
                        fieldId: PCConstants_1.default.FIELDS.LOCATION,
                        value: lastSublistLineProjectDLCValues.location
                    });
            }
            catch (e) {
                log_1.default.error(e);
            }
        };
        /*
         * Returns true if the Revenue Arrangement source type is Project Revenue Rule
         */
        TransactionUseCase.prototype.isSourceTypeProjectRevenueRule = function (revenueArrangementTransaction, line) {
            var sourceType = revenueArrangementTransaction.getSublistValue({
                sublistId: PCConstants_1.default.SUBLIST.REVENUEELEMENT,
                fieldId: PCConstants_1.default.FIELDS.RA_SOURCETYPE,
                line: line
            });
            return sourceType === PCConstants_1.default.FIELD_VALUE.RA_SOURCETYPE_PROJECT_REVENUE_RULE;
        };
        /*
         * Returns true if the Journal is created from rev rec.
         */
        TransactionUseCase.prototype.isRevRecJE = function (JE) {
            return JE.getValue({ fieldId: PCConstants_1.default.FIELDS.IS_FROM_REV_REC }) === 'T';
        };
        return TransactionUseCase;
    }());
    exports.default = TransactionUseCase;
});
