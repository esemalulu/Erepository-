var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
define(["require", "exports", "N/url", "./constants/PCConstants", "N/https", "N/runtime", "N/translation", "./constants/EndpointsConstants", "N/log"], function (require, exports, url_1, PCConstants_1, https_1, runtime_1, translation, EndpointsConstants_1, log_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RecordHelper = void 0;
    url_1 = __importDefault(url_1);
    PCConstants_1 = __importDefault(PCConstants_1);
    https_1 = __importDefault(https_1);
    runtime_1 = __importDefault(runtime_1);
    translation = __importStar(translation);
    log_1 = __importDefault(log_1);
    var RecordHelper = /** @class */ (function () {
        function RecordHelper() {
        }
        RecordHelper.sendRequestToDataGenSuiteLet = function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var headers, responsePromise, results;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            headers = (_a = {},
                                _a[EndpointsConstants_1.Constants.Request.Header.CONTENT_TYPE] = EndpointsConstants_1.Constants.Request.Header.MIME_JSON,
                                _a);
                            return [4 /*yield*/, https_1.default.requestSuitelet.promise({
                                    scriptId: PCConstants_1.default.DATA_GEN_SUITELET.DATA_GEN_SL_SCRIPT_ID,
                                    deploymentId: PCConstants_1.default.DATA_GEN_SUITELET.DATA_GEN_SL_DEPLOYMENT_ID,
                                    headers: headers,
                                    body: JSON.stringify(request)
                                })];
                        case 1:
                            responsePromise = _b.sent();
                            results = JSON.parse(responsePromise.body);
                            if (results.status === PCConstants_1.default.STATUS.ERROR) {
                                log_1.default.error(PCConstants_1.default.STATUS.ERROR, results.message);
                            }
                            return [2 /*return*/, results];
                    }
                });
            });
        };
        RecordHelper.sendRequestToDataGenSuiteLetSync = function (request) {
            var _a;
            var headers = (_a = {},
                _a[EndpointsConstants_1.Constants.Request.Header.CONTENT_TYPE] = EndpointsConstants_1.Constants.Request.Header.MIME_JSON,
                _a);
            var responsePromise = https_1.default.requestSuitelet({
                scriptId: PCConstants_1.default.DATA_GEN_SUITELET.DATA_GEN_SL_SCRIPT_ID,
                deploymentId: PCConstants_1.default.DATA_GEN_SUITELET.DATA_GEN_SL_DEPLOYMENT_ID,
                headers: headers,
                body: JSON.stringify(request)
            });
            var results = JSON.parse(responsePromise.body);
            if (results.status === PCConstants_1.default.STATUS.ERROR) {
                log_1.default.error(PCConstants_1.default.ERROR_MESSAGE.ERROR_MESSAGE_WHILE_FETCHING_DATA, results.message);
            }
            return results;
        };
        RecordHelper.isNewUI = function () {
            // @ts-ignore
            return runtime_1.default.getCurrentScript().getParameter(PCConstants_1.default.RUNTIME.PROJECT_NEW_UI);
        };
        RecordHelper.getTranslationKeys = function () {
            var tcObject = __assign({}, PCConstants_1.default.PROJECT_CLASSIFICATION_TRANSLATION_KEYS);
            var keys = [];
            var iterateObject = function (obj) {
                for (var key in obj) {
                    if (typeof obj[key] === 'string') {
                        keys.push(obj[key]);
                    }
                    else {
                        iterateObject(obj[key]);
                    }
                }
            };
            iterateObject(tcObject);
            return keys;
        };
        RecordHelper.getTranslationCollection = function () {
            var translationCollection = translation.load({
                collections: [
                    {
                        alias: 'collection',
                        keys: RecordHelper.getTranslationKeys(),
                        collection: PCConstants_1.default.TRANSLATION_COLLECTION.CUSTCOLLECTION_PC_COLLECTION
                    }
                ]
            });
            //@ts-ignore
            return translationCollection.collection;
        };
        RecordHelper.getSuiteLetURL = function (scriptId, deploymentId, parameters) {
            return url_1.default.resolveScript({
                scriptId: scriptId,
                deploymentId: deploymentId,
                params: parameters
            });
        };
        RecordHelper.getDLCFromProject = function (projectId) {
            return __awaiter(this, void 0, void 0, function () {
                var request, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_DCL_SEGMENTS_FROM_PROJECT,
                                projectsList: projectId
                            };
                            return [4 /*yield*/, RecordHelper.sendRequestToDataGenSuiteLet(request)];
                        case 1:
                            results = _a.sent();
                            return [2 /*return*/, results.data ? results.data[0] : {}];
                    }
                });
            });
        };
        RecordHelper.getDLCFromItem = function (itemId) {
            return __awaiter(this, void 0, void 0, function () {
                var request, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_DCL_SEGMENTS_FROM_ITEM,
                                itemsList: itemId
                            };
                            return [4 /*yield*/, RecordHelper.sendRequestToDataGenSuiteLet(request)];
                        case 1:
                            results = _a.sent();
                            /* ResultSet is undefined when an existing NetSuite item (with Id as negative value) is retrieved via SuiteQL query.
                             * Such items(with negative ids) are neither displayed under Item dataset nor in Item list view.
                             * But, these are displayed under items dropdown of transaction records, therefore, user is still able to select them.
                             * To handle exception in this case, returning an empty object {} if result is undefined.
                             */
                            return [2 /*return*/, results.data && results.data.length ? results.data[0] : {}];
                    }
                });
            });
        };
        RecordHelper.getDLCFromEmployee = function (employeeId, subsidiary) {
            return __awaiter(this, void 0, void 0, function () {
                var request, employeeDLCValues, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_DCL_SEGMENTS_FROM_EMPLOYEE,
                                employee: employeeId,
                                subsidiary: subsidiary
                            };
                            employeeDLCValues = {};
                            if (!employeeId) return [3 /*break*/, 2];
                            return [4 /*yield*/, RecordHelper.sendRequestToDataGenSuiteLet(request)];
                        case 1:
                            results = _a.sent();
                            employeeDLCValues = results.data ? results.data[0] : {};
                            _a.label = 2;
                        case 2: return [2 /*return*/, employeeDLCValues];
                    }
                });
            });
        };
        RecordHelper.getDLCFromSelectedCustomerProject = function (entityId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, RecordHelper.isProjectRecord(entityId)];
                        case 1:
                            if (!_a.sent()) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.getProjectDCLValues(entityId)];
                        case 2: return [2 /*return*/, _a.sent()];
                        case 3: return [2 /*return*/, {}];
                    }
                });
            });
        };
        RecordHelper.isProjectRecord = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var request, results, isProject;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.projectsMap[id]) return [3 /*break*/, 1];
                            return [2 /*return*/, true];
                        case 1:
                            if (!this.customersMap[id]) return [3 /*break*/, 2];
                            return [2 /*return*/, false];
                        case 2:
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.IS_PROJECT_RECORD,
                                recordId: id
                            };
                            return [4 /*yield*/, RecordHelper.sendRequestToDataGenSuiteLet(request)];
                        case 3:
                            results = _a.sent();
                            isProject = results.data ? results.data.isProjectRecord : false;
                            if (isProject) {
                                this.projectsMap[id] = true;
                            }
                            else {
                                this.customersMap[id] = true;
                            }
                            return [2 /*return*/, isProject];
                    }
                });
            });
        };
        RecordHelper.getTransactionRecordValueFromPreference = function (transactionType) {
            if (!RecordHelper.PCPreferenceTransactionMap[transactionType]) {
                var transactionValues = RecordHelper.getProjectClassificationPreferences([
                    PCConstants_1.default.FIELDS.CUSTOM_RECORD_PROJECT_CLASSIFICATION_PREFERENCES,
                    PCConstants_1.default.FIELDS.CUSTOM_SELECT_UPDATE_HEADER_VALUE
                ]);
                var recordValue = void 0;
                if (transactionValues) {
                    recordValue = transactionValues.projectClassificationPreferences.find(function (d) { return d.transactionType === transactionType.toUpperCase(); });
                    if (recordValue) {
                        recordValue.updateHeaderEnabled =
                            transactionValues.customSelectUpdateHeaderValue;
                    }
                }
                RecordHelper.PCPreferenceTransactionMap[transactionType] = recordValue;
            }
            return RecordHelper.PCPreferenceTransactionMap[transactionType];
        };
        RecordHelper.isConsolidateProjectsEnabled = function () {
            // @ts-ignore
            return runtime_1.default.getCurrentScript().getParameter(PCConstants_1.default.RUNTIME.CONSOLINVOICES);
        };
        RecordHelper.isAllowExpensesOnPurchaseOrderEnabled = function () {
            // @ts-ignore
            return runtime_1.default.getCurrentScript().getParameter(PCConstants_1.default.RUNTIME.ALLOW_EXPENSE_ON_PURCHASE);
        };
        RecordHelper.getProjectClassificationPreferences = function (selectColumns) {
            var request = {
                requestType: EndpointsConstants_1.Constants.RequestType.GET_SELECTED_COLUMNS_FROM_PC_PREFERENCE,
                selectedColumns: selectColumns
            };
            var results = RecordHelper.sendRequestToDataGenSuiteLetSync(request);
            var preferenceResults = results.data ? results.data[0] : {};
            var projectClassificationPreferences;
            if (preferenceResults[PCConstants_1.default.FIELDS.CUSTOM_RECORD_PROJECT_CLASSIFICATION_PREFERENCES]) {
                projectClassificationPreferences = JSON.parse((preferenceResults[PCConstants_1.default.FIELDS.CUSTOM_RECORD_PROJECT_CLASSIFICATION_PREFERENCES]));
            }
            else {
                projectClassificationPreferences = '';
            }
            var selectAllTransactionsValue = preferenceResults[PCConstants_1.default.FIELDS.SELECT_ALL_TRANSACTIONS_VALUE] || '';
            var customSelectUpdateHeaderValue = preferenceResults[PCConstants_1.default.FIELDS.CUSTOM_SELECT_UPDATE_HEADER_VALUE] || '';
            return {
                selectAllTransactionsValue: selectAllTransactionsValue,
                customSelectUpdateHeaderValue: customSelectUpdateHeaderValue,
                projectClassificationPreferences: projectClassificationPreferences
            };
        };
        RecordHelper.checkForInactiveValue = function (recordName, recordId) {
            return __awaiter(this, void 0, void 0, function () {
                var request, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!recordId) {
                                return [2 /*return*/, ''];
                            }
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.IS_RECORD_INACTIVE,
                                recordName: recordName,
                                recordId: recordId
                            };
                            return [4 /*yield*/, RecordHelper.sendRequestToDataGenSuiteLet(request)];
                        case 1:
                            results = _a.sent();
                            return [2 /*return*/, results.data ? results.data.isInactive : false];
                    }
                });
            });
        };
        RecordHelper.fetchInactiveSegmentsFromList = function (recordName, segmentsList) {
            return __awaiter(this, void 0, void 0, function () {
                var request, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!segmentsList.length) {
                                return [2 /*return*/, ''];
                            }
                            request = {
                                requestType: EndpointsConstants_1.Constants.RequestType.GET_INACTIVE_RECORDS,
                                recordName: recordName,
                                segmentList: segmentsList
                            };
                            return [4 /*yield*/, RecordHelper.sendRequestToDataGenSuiteLet(request)];
                        case 1:
                            results = _a.sent();
                            return [2 /*return*/, results.data.map(function (element) { return element.name; }).join('\n')];
                    }
                });
            });
        };
        RecordHelper.getInactiveDCLSegments = function (dclSegments) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                RecordHelper.fetchInactiveSegmentsFromList(PCConstants_1.default.RECORDS.DEPARTMENT, Array.from(dclSegments.departments)),
                                RecordHelper.fetchInactiveSegmentsFromList(PCConstants_1.default.RECORDS.CLASS, Array.from(dclSegments.classes)),
                                RecordHelper.fetchInactiveSegmentsFromList(PCConstants_1.default.RECORDS.LOCATION, Array.from(dclSegments.locations))
                            ])];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            });
        };
        RecordHelper.isSalesTransaction = function (transactionType) {
            return PCConstants_1.default.RECORDS.SALES_TRANSACTIONS.includes(transactionType.toString());
        };
        RecordHelper.isExpenseTypeTransaction = function (transactionType) {
            return PCConstants_1.default.RECORDS.EXPENSE_TRANSACTIONS.includes(transactionType.toString());
        };
        RecordHelper.isTimeTypeTransaction = function (transactionType) {
            return PCConstants_1.default.RECORDS.TIME_TRANSACTIONS.includes(transactionType.toString());
        };
        RecordHelper.mergeDCLListObjects = function (object1, object2) {
            var union = function (obj1, obj2) {
                return new Set(__spreadArray(__spreadArray([], Array.from(obj1), true), Array.from(obj2), true));
            };
            return {
                departments: union(object1.departments, object2.departments),
                classes: union(object1.classes, object2.classes),
                locations: union(object1.locations, object2.locations)
            };
        };
        RecordHelper.hasProjectValue = function (transactionRecord) {
            var projectValue = transactionRecord.getValue({
                fieldId: PCConstants_1.default.FIELDS.JOB
            });
            return projectValue ? true : false;
        };
        RecordHelper.isCustomerOrCategorySelected = function (transactionRecord) {
            var customerId = transactionRecord.getCurrentSublistValue({
                sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                fieldId: PCConstants_1.default.FIELDS.CUSTOMER
            });
            var categoryId = transactionRecord.getCurrentSublistValue({
                sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                fieldId: PCConstants_1.default.FIELDS.CATEGORY
            });
            if (customerId || categoryId) {
                return true;
            }
            return false;
        };
        RecordHelper.isTimeBillTransaction = function (context) {
            return (context.mode === PCConstants_1.default.MODE.CREATE &&
                context.currentRecord.type === PCConstants_1.default.RECORDS.TIMEBILL &&
                context.currentRecord.getValue({ fieldId: PCConstants_1.default.FIELDS.CUSTOMER }));
        };
        RecordHelper.fetchPreferences = function () {
            var request = {
                requestType: EndpointsConstants_1.Constants.RequestType.GET_PC_PREFERENCES
            };
            var results = RecordHelper.sendRequestToDataGenSuiteLetSync(request);
            return results.data ? results.data : '';
        };
        RecordHelper.mergeNewTransactionsWithExistingPreferences = function (newTransactions, existingPreferences) {
            var oldPreferencesMap = {};
            existingPreferences.forEach(function (transaction) {
                oldPreferencesMap[transaction.transactionType] = transaction;
            });
            var results = [];
            newTransactions.forEach(function (transaction) {
                if (oldPreferencesMap[transaction.transactionType]) {
                    results.push(oldPreferencesMap[transaction.transactionType]);
                }
                else {
                    results.push(transaction);
                }
            });
            return results;
        };
        RecordHelper.disableCheckboxOfTransactions = function (transaction, disableUICheckbox) {
            var transactionLine = document.querySelector("input[value=".concat(transaction.toUpperCase(), "]"))
                .parentElement.parentElement;
            disableUICheckbox
                ? // @ts-ignore
                    (transactionLine.children[2].firstChild.firstChild.disabled = true)
                : // @ts-ignore
                    (transactionLine.children[3].firstChild.firstChild.disabled = true);
        };
        RecordHelper.getProjectDCLValues = function (projectId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!!RecordHelper.projectDCLValuesMap[projectId]) return [3 /*break*/, 2];
                            _a = RecordHelper.projectDCLValuesMap;
                            _b = projectId;
                            return [4 /*yield*/, RecordHelper.getDLCFromProject(projectId)];
                        case 1:
                            _a[_b] = _c.sent();
                            _c.label = 2;
                        case 2: return [2 /*return*/, RecordHelper.projectDCLValuesMap[projectId]];
                    }
                });
            });
        };
        RecordHelper.getItemDCLValues = function (itemId) {
            if (!RecordHelper.itemDCLValuesMap[itemId]) {
                RecordHelper.itemDCLValuesMap[itemId] = RecordHelper.getDLCFromItem(itemId);
            }
            return RecordHelper.itemDCLValuesMap[itemId];
        };
        RecordHelper.getEmployeeDCLValues = function (employeeId, subsidiary) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!!RecordHelper.employeeDCLValuesMap[employeeId]) return [3 /*break*/, 2];
                            _a = RecordHelper.employeeDCLValuesMap;
                            _b = employeeId;
                            return [4 /*yield*/, RecordHelper.getDLCFromEmployee(employeeId, subsidiary)];
                        case 1:
                            _a[_b] = _c.sent();
                            _c.label = 2;
                        case 2: return [2 /*return*/, RecordHelper.employeeDCLValuesMap[employeeId]];
                    }
                });
            });
        };
        RecordHelper.validateDCLValuesFromUser = function (DCLUserValues, subsidiaryId) {
            var DCLValues = {
                requestType: EndpointsConstants_1.Constants.RequestType.GET_SUBSIDIARIES_FROM_DCL_RECORD,
                departmentValue: DCLUserValues.departmentValue,
                classValue: DCLUserValues.classValue,
                locationValue: DCLUserValues.locationValue
            };
            var isInValidValueSelected = {
                isDepartmentInValid: false,
                isLocationInValid: false,
                isClassInValid: false
            };
            if (DCLUserValues.classValue ||
                DCLUserValues.locationValue ||
                DCLUserValues.departmentValue) {
                var result = RecordHelper.sendRequestToDataGenSuiteLetSync(DCLValues);
                if (DCLUserValues.departmentValue) {
                    isInValidValueSelected.isDepartmentInValid = !result[PCConstants_1.default.FIELDS.DEPARTMENT_SUBSIDIARY].includes(subsidiaryId);
                }
                if (DCLUserValues.classValue) {
                    isInValidValueSelected.isClassInValid = !result[PCConstants_1.default.FIELDS.CLASS_SUBSIDIARY].includes(subsidiaryId);
                }
                if (DCLUserValues.locationValue) {
                    isInValidValueSelected.isLocationInValid = !result[PCConstants_1.default.FIELDS.LOCATION_SUBSIDIARY].includes(subsidiaryId);
                }
            }
            return isInValidValueSelected;
        };
        //static variables to use for caching
        RecordHelper.endPoints = {};
        RecordHelper.PCPreferenceTransactionMap = {};
        RecordHelper.projectDCLValuesMap = {};
        RecordHelper.itemDCLValuesMap = {};
        RecordHelper.employeeDCLValuesMap = {};
        RecordHelper.projectsMap = {};
        RecordHelper.customersMap = {};
        return RecordHelper;
    }());
    exports.RecordHelper = RecordHelper;
});
