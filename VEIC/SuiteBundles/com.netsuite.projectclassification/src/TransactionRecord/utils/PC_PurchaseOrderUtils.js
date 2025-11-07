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
define(["require", "exports", "../../common/constants/PCConstants", "../../common/RecordHelper"], function (require, exports, PCConstants_1, RecordHelper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    PCConstants_1 = __importDefault(PCConstants_1);
    var PC_PurchaseOrderUtil = /** @class */ (function () {
        function PC_PurchaseOrderUtil(transactionUseCase) {
            this.transactionUseCase = transactionUseCase;
        }
        PC_PurchaseOrderUtil.prototype.getEmployeeDCL = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var employeeId, subsidiary, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            employeeId = transactionRecord.getValue({
                                fieldId: PCConstants_1.default.FIELDS.EMPLOYEE
                            });
                            subsidiary = transactionRecord.getValue({
                                fieldId: PCConstants_1.default.FIELDS.SUBSIDIARY
                            });
                            if (!employeeId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getEmployeeDCLValues(employeeId, subsidiary)];
                        case 1:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = {};
                            _b.label = 3;
                        case 3: return [2 /*return*/, _a];
                    }
                });
            });
        };
        PC_PurchaseOrderUtil.prototype.getItemDCL = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var itemId, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            itemId = transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.ITEM,
                                fieldId: PCConstants_1.default.FIELDS.ITEM
                            });
                            if (!itemId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getItemDCLValues(itemId)];
                        case 1:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = {};
                            _b.label = 3;
                        case 3: return [2 /*return*/, _a];
                    }
                });
            });
        };
        PC_PurchaseOrderUtil.prototype.getProjectDCL = function (transactionRecord, sublistId) {
            return __awaiter(this, void 0, void 0, function () {
                var entityId, projectDLCValues;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            entityId = transactionRecord.getCurrentSublistValue({
                                sublistId: sublistId,
                                fieldId: PCConstants_1.default.FIELDS.CUSTOMER
                            });
                            projectDLCValues = {};
                            if (!entityId) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.isProjectRecord(entityId)];
                        case 1:
                            if (!_a.sent()) return [3 /*break*/, 3];
                            return [4 /*yield*/, RecordHelper_1.RecordHelper.getProjectDCLValues(entityId)];
                        case 2:
                            projectDLCValues = _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/, projectDLCValues];
                    }
                });
            });
        };
        PC_PurchaseOrderUtil.prototype.setDCLOnExpenseSublist = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var projectDCL;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getProjectDCL(transactionRecord, PCConstants_1.default.SUBLIST.EXPENSE)];
                        case 1:
                            projectDCL = _a.sent();
                            this.setLineLevelDCLExpense(transactionRecord, PCConstants_1.default.SUBLIST.EXPENSE, projectDCL);
                            return [2 /*return*/];
                    }
                });
            });
        };
        PC_PurchaseOrderUtil.prototype.setDCLOnItemSublist = function (transactionRecord) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, itemDCL, employeeDCL, projectDCL;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.getItemDCL(transactionRecord),
                                this.getEmployeeDCL(transactionRecord),
                                this.getProjectDCL(transactionRecord, PCConstants_1.default.SUBLIST.ITEM)
                            ])];
                        case 1:
                            _a = _b.sent(), itemDCL = _a[0], employeeDCL = _a[1], projectDCL = _a[2];
                            this.setLineLevelDCLItem(transactionRecord, PCConstants_1.default.SUBLIST.ITEM, projectDCL, employeeDCL, itemDCL);
                            return [2 /*return*/];
                    }
                });
            });
        };
        PC_PurchaseOrderUtil.prototype.setDLCOnPurchaseOrder = function (transactionRecord, sublistId, fieldId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(sublistId === PCConstants_1.default.SUBLIST.EXPENSE)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.setDCLOnExpenseSublist(transactionRecord)];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 2:
                            if (!(sublistId === PCConstants_1.default.SUBLIST.ITEM)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.setDCLOnItemSublist(transactionRecord)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 4:
                            if (!(!sublistId && fieldId === PCConstants_1.default.FIELDS.EMPLOYEE)) return [3 /*break*/, 6];
                            if (!transactionRecord.getCurrentSublistValue({
                                sublistId: PCConstants_1.default.LIST.ITEM,
                                fieldId: PCConstants_1.default.FIELDS.CUSTOMER
                            })) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.setDCLOnItemSublist(transactionRecord)];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        PC_PurchaseOrderUtil.prototype.setLineLevelDCLItem = function (transactionRecord, sublistId, projectDCL, employeeDCL, itemDCL) {
            var previousClassValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.CLASS
            });
            var newClassValue = projectDCL[PCConstants_1.default.FIELDS.CLASS] || itemDCL[PCConstants_1.default.FIELDS.CLASS] || '';
            if (previousClassValue !== newClassValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                    value: newClassValue
                });
            var previousDepartmentValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
            });
            var newDepartmentValue = projectDCL[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                employeeDCL[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                itemDCL[PCConstants_1.default.FIELDS.DEPARTMENT] ||
                '';
            if (previousDepartmentValue !== newDepartmentValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                    value: newDepartmentValue
                });
            var previousLocationValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.LOCATION
            });
            var newLocationValue = projectDCL[PCConstants_1.default.FIELDS.LOCATION] || itemDCL[PCConstants_1.default.FIELDS.LOCATION] || '';
            if (previousLocationValue !== newLocationValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.LOCATION,
                    value: newLocationValue
                });
        };
        PC_PurchaseOrderUtil.prototype.setLineLevelDCLExpense = function (transactionRecord, sublistId, projectDCL) {
            var previousClassValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.CLASS
            });
            var newClassValue = projectDCL[PCConstants_1.default.FIELDS.CLASS] || '';
            if (previousClassValue !== newClassValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.CLASS,
                    value: newClassValue
                });
            var previousDepartmentValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.DEPARTMENT
            });
            var newDepartmentValue = projectDCL[PCConstants_1.default.FIELDS.DEPARTMENT] || '';
            if (previousDepartmentValue !== newDepartmentValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                    value: newDepartmentValue
                });
            var previousLocationValue = transactionRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: PCConstants_1.default.FIELDS.LOCATION
            });
            var newLocationValue = projectDCL[PCConstants_1.default.FIELDS.LOCATION] || '';
            if (previousLocationValue !== newLocationValue)
                transactionRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: PCConstants_1.default.FIELDS.LOCATION,
                    value: newLocationValue
                });
        };
        PC_PurchaseOrderUtil.prototype.updateDCLOnPurchaseOrderTransaction = function (transactionRecord, isUpdateHeaderEnabled) {
            return __awaiter(this, void 0, void 0, function () {
                var employeeDCLValues, _a, projects, items, allowExpensesOnPurchaseOrder, projectsAtExpenseSublist, projectMap, itemMap;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getEmployeeDCL(transactionRecord)];
                        case 1:
                            employeeDCLValues = _b.sent();
                            _a = this.transactionUseCase.fetchProjectAndItemFromItemSublist(transactionRecord, false, PCConstants_1.default.FIELDS.CUSTOMER), projects = _a.projects, items = _a.items;
                            allowExpensesOnPurchaseOrder = RecordHelper_1.RecordHelper.isAllowExpensesOnPurchaseOrderEnabled();
                            if (allowExpensesOnPurchaseOrder) {
                                projectsAtExpenseSublist = this.fetchProjectFromExpenseSublist(transactionRecord).projectsAtExpenseSublist;
                                projects = projects.concat(projectsAtExpenseSublist);
                                projects = Array.from(new Set(projects));
                            }
                            projectMap = projects.length
                                ? this.transactionUseCase.fetchProjectDCLs(projects)
                                : {};
                            itemMap = items.length ? this.transactionUseCase.fetchItemDCLs(items) : {};
                            this.updateDCLFieldsOnItemSublist(transactionRecord, {
                                projectMap: projectMap,
                                itemMap: itemMap,
                                employeeDCLValues: employeeDCLValues
                            });
                            if (allowExpensesOnPurchaseOrder) {
                                this.updateDCLFieldsOnExpenseSublist(transactionRecord, projectMap);
                            }
                            this.transactionUseCase.updateDCLFieldsOnHeader(transactionRecord, false, projectMap, isUpdateHeaderEnabled);
                            return [2 /*return*/];
                    }
                });
            });
        };
        PC_PurchaseOrderUtil.prototype.fetchProjectFromExpenseSublist = function (transactionRecord) {
            var projects = new Set();
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.EXPENSE
            });
            for (var line = 0; line < lineCount; line++) {
                var project = transactionRecord.getSublistValue({
                    sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                    line: line
                });
                if (project)
                    projects.add(project);
            }
            return { projectsAtExpenseSublist: Array.from(projects) };
        };
        PC_PurchaseOrderUtil.prototype.updateDCLFieldsOnItemSublist = function (transactionRecord, _a) {
            var projectMap = _a.projectMap, itemMap = _a.itemMap, employeeDCLValues = _a.employeeDCLValues;
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.ITEM
            });
            for (var line = 0; line < lineCount; line++) {
                var item = transactionRecord.getSublistValue({
                    sublistId: PCConstants_1.default.SUBLIST.ITEM,
                    fieldId: PCConstants_1.default.FIELDS.ITEM,
                    line: line
                });
                var project = transactionRecord.getSublistValue({
                    sublistId: PCConstants_1.default.SUBLIST.ITEM,
                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                    line: line
                });
                var projectDCLValues = project && projectMap[project] ? projectMap[project] : {};
                var itemDCLValues = item ? itemMap[item] : {};
                if (projectDCLValues.class || itemDCLValues.class) {
                    transactionRecord.setSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.ITEM,
                        fieldId: PCConstants_1.default.FIELDS.CLASS,
                        line: line,
                        value: projectDCLValues.class || itemDCLValues.class
                    });
                }
                if (projectDCLValues.department ||
                    employeeDCLValues.department ||
                    itemDCLValues.department) {
                    transactionRecord.setSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.ITEM,
                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                        line: line,
                        value: projectDCLValues.department ||
                            employeeDCLValues.department ||
                            itemDCLValues.department
                    });
                }
                if (projectDCLValues.location || itemDCLValues.location) {
                    transactionRecord.setSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.ITEM,
                        fieldId: PCConstants_1.default.FIELDS.LOCATION,
                        line: line,
                        value: projectDCLValues.location || itemDCLValues.location
                    });
                }
            }
        };
        PC_PurchaseOrderUtil.prototype.updateDCLFieldsOnExpenseSublist = function (transactionRecord, projectMap) {
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.ITEM
            });
            for (var line = 0; line < lineCount; line++) {
                var project = transactionRecord.getSublistValue({
                    sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                    line: line
                });
                var projectDCLValues = project && projectMap[project] ? projectMap[project] : {};
                if (projectDCLValues.class) {
                    transactionRecord.setSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                        fieldId: PCConstants_1.default.FIELDS.CLASS,
                        line: line,
                        value: projectDCLValues.class
                    });
                }
                if (projectDCLValues.department) {
                    transactionRecord.setSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                        line: line,
                        value: projectDCLValues.department
                    });
                }
                if (projectDCLValues.location) {
                    transactionRecord.setSublistValue({
                        sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                        fieldId: PCConstants_1.default.FIELDS.LOCATION,
                        line: line,
                        value: projectDCLValues.location
                    });
                }
            }
        };
        return PC_PurchaseOrderUtil;
    }());
    exports.default = PC_PurchaseOrderUtil;
});
