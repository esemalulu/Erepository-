/**
 * @preserve
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
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
define(["require", "exports", "../../common/constants/PCConstants", "../usecase/TransactionUseCase", "../../common/RecordHelper"], function (require, exports, PCConstants_1, TransactionUseCase_1, RecordHelper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.lineInit = exports.postSourcing = exports.fieldChanged = exports.pageInit = void 0;
    PCConstants_1 = __importDefault(PCConstants_1);
    TransactionUseCase_1 = __importDefault(TransactionUseCase_1);
    var pageInit = function (context) { return __awaiter(void 0, void 0, void 0, function () {
        var useCase, classificationRecord, useCase, useCase;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(context.mode === PCConstants_1.default.MODE.EDIT)) return [3 /*break*/, 2];
                    useCase = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase.handleInactiveDCLsInEditMode(context.currentRecord)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    if (!(context.mode === PCConstants_1.default.MODE.CREATE &&
                        RecordHelper_1.RecordHelper.hasProjectValue(context.currentRecord))) return [3 /*break*/, 4];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 4];
                    useCase = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase.setDLCOnProjectChange(context.currentRecord, '')];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    if (!(RecordHelper_1.RecordHelper.isTimeBillTransaction(context) ||
                        context.currentRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEET ||
                        context.currentRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEETNEWUI)) return [3 /*break*/, 6];
                    useCase = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase.setDCLForTimeEntry(context.currentRecord)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    }); };
    exports.pageInit = pageInit;
    var fieldChanged = function (context) { return __awaiter(void 0, void 0, void 0, function () {
        var isOutSourcingForm, useCase, classificationRecord, classificationRecord, classificationRecord, classificationRecord, useCase_1, projectFieldId, classificationRecord;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    isOutSourcingForm = context.currentRecord.getValue({
                        fieldId: PCConstants_1.default.FIELDS.IS_OUTSOURCE_FORM
                    });
                    useCase = new TransactionUseCase_1.default();
                    if (!((context.fieldId === PCConstants_1.default.FIELDS.CUSTOMER ||
                        context.fieldId === PCConstants_1.default.FIELDS.TIMEITEM) &&
                        (context.currentRecord.type === PCConstants_1.default.RECORDS.TIMEBILL ||
                            context.currentRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEET ||
                            context.currentRecord.type === PCConstants_1.default.RECORDS.WEEKLYTIMESHEETNEWUI))) return [3 /*break*/, 2];
                    return [4 /*yield*/, useCase.setDCLForTimeEntry(context.currentRecord)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 16];
                case 2:
                    if (!(isOutSourcingForm === 'T' &&
                        context.currentRecord.type === PCConstants_1.default.RECORDS.PURCHASEORDER)) return [3 /*break*/, 3];
                    return [2 /*return*/];
                case 3:
                    if (!(context.currentRecord.type === PCConstants_1.default.RECORDS.PURCHASEORDER &&
                        [PCConstants_1.default.FIELDS.CUSTOMER, PCConstants_1.default.FIELDS.ITEM, PCConstants_1.default.FIELDS.EMPLOYEE].includes(context.fieldId))) return [3 /*break*/, 5];
                    return [4 /*yield*/, useCase.setDLCOnPurchaseOrder(context)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 16];
                case 5:
                    if (!(context.fieldId === PCConstants_1.default.FIELDS.JOB)) return [3 /*break*/, 8];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 7];
                    return [4 /*yield*/, useCase.setDLCOnProjectChange(context.currentRecord, context.sublistId)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [3 /*break*/, 16];
                case 8:
                    if (!(context.fieldId === PCConstants_1.default.FIELDS.CUSTOMER &&
                        context.currentRecord.type === PCConstants_1.default.RECORDS.INVENTORYADJUSTMENT)) return [3 /*break*/, 11];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 10];
                    return [4 /*yield*/, useCase.setDCLForInventoryAdjustment(context.currentRecord, context.fieldId)];
                case 9:
                    _a.sent();
                    _a.label = 10;
                case 10: return [3 /*break*/, 16];
                case 11:
                    if (!(context.fieldId === PCConstants_1.default.FIELDS.CUSTOMER ||
                        (context.fieldId === PCConstants_1.default.FIELDS.ITEM &&
                            !RecordHelper_1.RecordHelper.isSalesTransaction(context.currentRecord.type) &&
                            !RecordHelper_1.RecordHelper.isTimeTypeTransaction(context.currentRecord.type)))) return [3 /*break*/, 14];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 13];
                    return [4 /*yield*/, useCase.setDLCOnSublists(context.currentRecord, context.sublistId)];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13: return [3 /*break*/, 16];
                case 14:
                    if (!(PCConstants_1.default.RECORDS.ENTITY === context.fieldId &&
                        context.currentRecord.type === PCConstants_1.default.RECORDS.JOURNALS)) return [3 /*break*/, 16];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 16];
                    useCase_1 = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase_1.setDLCOnSublists(context.currentRecord, context.sublistId)];
                case 15:
                    _a.sent();
                    _a.label = 16;
                case 16:
                    projectFieldId = useCase.getProjectFieldId(context.currentRecord.type);
                    if (!(projectFieldId && context.fieldId === projectFieldId && context.sublistId)) return [3 /*break*/, 18];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 18];
                    return [4 /*yield*/, useCase.setHeaderDLCOnLineChange(context.currentRecord, context.sublistId, classificationRecord)];
                case 17:
                    _a.sent();
                    _a.label = 18;
                case 18: return [2 /*return*/];
            }
        });
    }); };
    exports.fieldChanged = fieldChanged;
    var postSourcing = function (context) { return __awaiter(void 0, void 0, void 0, function () {
        var classificationRecord, useCase, useCase, classificationRecord, useCase, classificationRecord, useCase;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(PCConstants_1.default.FIELDS.ITEM === context.fieldId &&
                        context.currentRecord.type !== PCConstants_1.default.RECORDS.INVENTORYADJUSTMENT)) return [3 /*break*/, 3];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 2];
                    useCase = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase.setDLCOnSublistChange(context.currentRecord, context.sublistId)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [3 /*break*/, 10];
                case 3:
                    if (!(PCConstants_1.default.RECORDS.ENTITY === context.fieldId &&
                        context.currentRecord.type === PCConstants_1.default.RECORDS.JOURNALS)) return [3 /*break*/, 5];
                    useCase = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase.handleDLCOnLineSublistOnLineSwitch(context.currentRecord)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 5:
                    if (!(context.fieldId === PCConstants_1.default.FIELDS.CATEGORY &&
                        context.currentRecord.type === PCConstants_1.default.RECORDS.EXPENSEREPORT)) return [3 /*break*/, 8];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 7];
                    useCase = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase.setDLCOnSublists(context.currentRecord, context.sublistId)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [3 /*break*/, 10];
                case 8:
                    if (!(context.fieldId === PCConstants_1.default.FIELDS.ITEM &&
                        context.currentRecord.type === PCConstants_1.default.RECORDS.INVENTORYADJUSTMENT)) return [3 /*break*/, 10];
                    classificationRecord = RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type);
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 10];
                    useCase = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase.setDCLForInventoryAdjustment(context.currentRecord, context.fieldId)];
                case 9:
                    _a.sent();
                    _a.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    }); };
    exports.postSourcing = postSourcing;
    var lineInit = function (context) { return __awaiter(void 0, void 0, void 0, function () {
        var classificationRecord, useCase;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!TransactionUseCase_1.default.isValidLine(context.currentRecord, context.sublistId)) return [3 /*break*/, 3];
                    if (!(context.currentRecord.type === PCConstants_1.default.RECORDS.JOURNALS ||
                        RecordHelper_1.RecordHelper.isExpenseTypeTransaction(context.currentRecord.type) ||
                        RecordHelper_1.RecordHelper.isConsolidateProjectsEnabled() ||
                        context.currentRecord.type === PCConstants_1.default.RECORDS.EXPENSEREPORT ||
                        context.currentRecord.type === PCConstants_1.default.RECORDS.PURCHASEORDER)) return [3 /*break*/, 3];
                    return [4 /*yield*/, RecordHelper_1.RecordHelper.getTransactionRecordValueFromPreference(context.currentRecord.type)];
                case 1:
                    classificationRecord = _a.sent();
                    if (!(classificationRecord === null || classificationRecord === void 0 ? void 0 : classificationRecord.onSelect)) return [3 /*break*/, 3];
                    useCase = new TransactionUseCase_1.default();
                    return [4 /*yield*/, useCase.setHeaderDLCOnLineChange(context.currentRecord, context.sublistId, classificationRecord)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); };
    exports.lineInit = lineInit;
});
