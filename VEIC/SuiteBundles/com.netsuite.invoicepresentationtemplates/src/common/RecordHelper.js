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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "N/query", "./constants/IPTConstants", "N/translation", "N/https", "../app/common/Constants", "N/suiteAppInfo", "N/currentRecord", "N/log", "N/runtime"], function (require, exports, query_1, IPTConstants_1, translation, https_1, Constants_1, suiteAppInfo_1, N_currentRecord, log_1, runtime_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RecordHelper = void 0;
    query_1 = __importDefault(query_1);
    IPTConstants_1 = __importDefault(IPTConstants_1);
    translation = __importStar(translation);
    https_1 = __importDefault(https_1);
    suiteAppInfo_1 = __importDefault(suiteAppInfo_1);
    N_currentRecord = __importStar(N_currentRecord);
    log_1 = __importDefault(log_1);
    runtime_1 = __importDefault(runtime_1);
    class RecordHelper {
        static fetchRecords(queryString) {
            const iptSet = query_1.default.runSuiteQL({
                query: queryString
            });
            let recordData;
            if (iptSet.asMappedResults().length) {
                recordData = iptSet.asMappedResults();
            }
            return recordData;
        }
        static convertToFTLInput(iptConfiguration) {
            return iptConfiguration.map((row) => {
                const newRow = {};
                newRow.id = 0;
                newRow.expenseType = {
                    id: 0,
                    name: row.chargeType,
                    key: row.chargeType
                };
                newRow.primaryGrouping = {
                    name: row.primaryGroupBy,
                    key: row.primaryGroupBy
                };
                newRow.secondaryGrouping = {
                    name: row.secondaryGroupBy,
                    key: row.secondaryGroupBy
                };
                row.columns.forEach((column, idx) => {
                    newRow[`column${idx + 1}`] = {
                        name: column,
                        key: column
                    };
                });
                return newRow;
            });
        }
        static getIPTPreferencesRecord() {
            let iptPreferencesQuery = `select ${IPTConstants_1.default.PREFERENCES.IPT_PREFERNCES_FIELD} from ${IPTConstants_1.default.RECORDS.IPT_PREFERENCE_RECORD}`;
            const resultSet = query_1.default.runSuiteQL({
                query: iptPreferencesQuery
            });
            let results = resultSet.asMappedResults();
            return results.length ? results[0] : null;
        }
        static async getIPTPreferencesRecordAsync() {
            let iptPreferencesQuery = `select ${IPTConstants_1.default.PREFERENCES.IPT_PREFERNCES_FIELD} from ${IPTConstants_1.default.RECORDS.IPT_PREFERENCE_RECORD}`;
            const resultSet = await query_1.default.runSuiteQL.promise({
                query: iptPreferencesQuery
            });
            let results = resultSet.asMappedResults();
            return results.length ? results[0] : null;
        }
        static getIPTPreferencesRecordSync() {
            let iptPreferencesQuery = `select ${IPTConstants_1.default.PREFERENCES.IPT_PREFERNCES_FIELD} from ${IPTConstants_1.default.RECORDS.IPT_PREFERENCE_RECORD}`;
            const resultSet = query_1.default.runSuiteQL({
                query: iptPreferencesQuery
            });
            let results = resultSet.asMappedResults();
            return results.length ? results[0] : null;
        }
        static async fetchPreviewBaseTemplateIdWithSubsidiary(subsidiaryId) {
            var _a, _b;
            const preferencesData = await RecordHelper.getIPTPreferencesRecordAsync();
            const prefData = preferencesData === null || preferencesData === void 0 ? void 0 : preferencesData.custrecord_ipt_preferences;
            if (prefData) {
                const ipt_preferences = JSON.parse(prefData.toString()).ipt_preferences;
                if (ipt_preferences) {
                    const parentSubsidiaryId = await RecordHelper.fetchParentSubsidiary();
                    let parentSubsidiaryBaseTemplate, activeTemplates = [];
                    parentSubsidiaryBaseTemplate =
                        (_a = ipt_preferences[parentSubsidiaryId]) === null || _a === void 0 ? void 0 : _a[IPTConstants_1.default.PREFERENCES.COLUMN_NAME.BASE_TEMPLATE][IPTConstants_1.default.PREFERENCES.COLUMN_NAME.ID];
                    if (parentSubsidiaryBaseTemplate) {
                        activeTemplates = await this.fetchActiveAdvancedPDFTemplates([
                            parentSubsidiaryBaseTemplate
                        ]);
                    }
                    if (subsidiaryId === parentSubsidiaryId) {
                        if (parentSubsidiaryBaseTemplate &&
                            activeTemplates.indexOf(parentSubsidiaryBaseTemplate) > -1) {
                            return parentSubsidiaryBaseTemplate;
                        }
                    }
                    else {
                        const subsidiaryBaseTemplate = (_b = ipt_preferences[subsidiaryId]) === null || _b === void 0 ? void 0 : _b[IPTConstants_1.default.PREFERENCES.COLUMN_NAME.BASE_TEMPLATE][IPTConstants_1.default.PREFERENCES.COLUMN_NAME.ID];
                        if (subsidiaryBaseTemplate) {
                            activeTemplates = activeTemplates.concat(await this.fetchActiveAdvancedPDFTemplates([subsidiaryBaseTemplate]));
                            if (activeTemplates.indexOf(subsidiaryBaseTemplate) > -1) {
                                return subsidiaryBaseTemplate;
                            }
                            else if (activeTemplates.indexOf(parentSubsidiaryBaseTemplate) > -1) {
                                return parentSubsidiaryBaseTemplate;
                            }
                        }
                        else {
                            if (parentSubsidiaryBaseTemplate &&
                                activeTemplates.indexOf(parentSubsidiaryBaseTemplate) > -1) {
                                return parentSubsidiaryBaseTemplate;
                            }
                        }
                    }
                }
            }
            return '';
        }
        static getTranslation(keys) {
            const translationRec = translation.load({
                collections: [
                    {
                        alias: 'collection',
                        keys: keys,
                        collection: 'custcollection_ipt_collection'
                    }
                ]
            });
            // @ts-ignore
            return translationRec.collection;
        }
        static getLoaderHtml() {
            return `<html>
            <head>
                <style>
                    .ipt_loader {
                      border: 4px solid #f3f3f3;
                      border-radius: 50%;
                      border-top: 4px solid #000000;
                      width: 40px;
                      height: 40px;
                      -webkit-animation: ipt_spin 1s linear infinite;
                      animation: ipt_spin 1s linear infinite;
                    }
                    @-webkit-keyframes ipt_spin {
                      0% { -webkit-transform: rotate(0deg); }
                      100% { -webkit-transform: rotate(360deg); }
                    }
                    @keyframes ipt_spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .ipt_parent {
                        height: 100%;
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                </style>
            </head>
            <body>
                <div class='ipt_parent'>
                    <div class='ipt_loader'></div>
                </div>
            </body>
        </html>`;
        }
        static generatePreview() {
            let context = this;
            let previewGenerated = false;
            let subsidiaryInfo = {};
            let currencyInfo = {
                [IPTConstants_1.default.FIELDS.CURRENCY_DISPLAY_SYMBOL]: 'USD'
            };
            const translations = RecordHelper.getTranslation([
                Constants_1.Constants.translationKeys.IPT_PREVIEW_TITLE,
                Constants_1.Constants.translationKeys.ERROR_MESSAGES.EMPTY_IPT_PREVIEW_ALERT_MESSAGE
            ]);
            const currentRecord = context.currentRecord;
            const subsidiary = currentRecord.getValue(IPTConstants_1.default.FIELDS.SUBSIDIARY);
            const IPTTemplateOnRecord = RecordHelper.checkIPTRecord(currentRecord, translations);
            const currencyId = currentRecord.getValue(IPTConstants_1.default.FIELDS.CURRENCY);
            const previewContent = RecordHelper.getLoaderHtml();
            const winUrl = URL.createObjectURL(new Blob([previewContent], { type: 'text/html' }));
            let previewWindow = window.open(winUrl, IPTConstants_1.default.PREVIEW.PREVIEW_POPUP, 'top=300,left=300,width=800,height=600,titlebar=1');
            const isAlfInstalled = subsidiary ? RecordHelper.isALFBundleInstalled() : false;
            setTimeout(async () => {
                if (subsidiary) {
                    subsidiaryInfo = await RecordHelper.fetchSubsidiaryInfo(subsidiary, isAlfInstalled);
                }
                const promises = [];
                if (subsidiaryInfo) {
                    promises.push(RecordHelper.fetchPreviewBaseTemplateIdWithSubsidiary(subsidiaryInfo['id']));
                    if (currencyId) {
                        promises.push(RecordHelper.fetchCurrencyInfo(currencyId));
                    }
                    else
                        promises.push(null);
                }
                else {
                    promises.push(null);
                    promises.push(null);
                }
                if (IPTTemplateOnRecord) {
                    promises.push(RecordHelper.fetchIPTConfiguration(IPTTemplateOnRecord));
                }
                else {
                    promises.push(null);
                }
                let [baseTempId, currencySymbol, IPTConfiguration] = await Promise.all(promises);
                currencyInfo[IPTConstants_1.default.FIELDS.CURRENCY_DISPLAY_SYMBOL] = currencySymbol;
                IPTConfiguration = RecordHelper.convertToFTLInput(IPTConfiguration);
                const requestBody = {
                    rows: IPTConfiguration,
                    subsidiary: subsidiaryInfo,
                    baseTemplateId: baseTempId,
                    currency: currencyInfo[IPTConstants_1.default.FIELDS.CURRENCY_DISPLAY_SYMBOL]
                };
                /**
                 * Implementation to Previewing actual invoice charges if the record is existing Invoice and opened in edit mode for preview.
                 * **/
                if (currentRecord.type === IPTConstants_1.default.RECORDS.INVOICE && currentRecord.id) {
                    requestBody['invoiceId'] = currentRecord.id;
                    requestBody['iptTemplateId'] = IPTTemplateOnRecord;
                    requestBody['invoiceCurrency'] = (currentRecord.getValue(IPTConstants_1.default.FIELDS.CURRENCY_SYMBOL));
                    requestBody['transactionId'] = currentRecord.getValue(IPTConstants_1.default.FIELDS.TRANSACTION_ID);
                    requestBody['transactionDate'] = currentRecord.getText(IPTConstants_1.default.FIELDS.TRANSACTION_DATE);
                    requestBody['taxRate'] = currentRecord.getValue(IPTConstants_1.default.FIELDS.TAX_RATE);
                }
                RecordHelper.openPreviewWindow(requestBody, previewWindow, translations.IPT_PREVIEW_TITLE());
            });
            return previewGenerated;
        }
        static checkIPTRecord(currentRecord, translations) {
            const IPTTemplateOnRecord = currentRecord.type === IPTConstants_1.default.RECORDS.INVOICE
                ? currentRecord.getValue(IPTConstants_1.default.FIELDS.IPT_AT_INVOICE)
                : currentRecord.getValue(IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT);
            if (currentRecord.type === IPTConstants_1.default.RECORDS.PROJECT && !IPTTemplateOnRecord) {
                alert(translations.EMPTY_IPT_PREVIEW_ALERT_MESSAGE());
                return;
            }
            return IPTTemplateOnRecord;
        }
        static async fetchCurrencyInfo(currencyId) {
            const request = {
                requestType: IPTConstants_1.default.RequestType.FETCHCURRENCYINFO,
                currencyId: currencyId
            };
            let results = await RecordHelper.sendRequest(request);
            return results.length ? results[0][IPTConstants_1.default.FIELDS.CURRENCY_DISPLAY_SYMBOL] : '$';
        }
        static async fetchSubsidiaryInfo(subsidiaryId, isAlfInstalled) {
            const request = {
                requestType: IPTConstants_1.default.RequestType.FETCHSUBSIDIARYINFO,
                subsidiaryId: subsidiaryId,
                isAlfInstalled: isAlfInstalled
            };
            let results = await RecordHelper.sendRequest(request);
            return results.length ? results[0] : {};
        }
        static async fetchIPTConfiguration(templateId) {
            const request = {
                requestType: IPTConstants_1.default.RequestType.FETCHIPTCONFIGURATION,
                templateId: templateId
            };
            let results = await RecordHelper.sendRequest(request);
            return results.length ? JSON.parse(results[0][IPTConstants_1.default.FIELDS.IPT_CONFIG]) : {};
        }
        static async fetchParentSubsidiary() {
            const request = {
                requestType: IPTConstants_1.default.RequestType.FETCHPARENTSUBSIDIARY
            };
            let results = await RecordHelper.sendRequest(request);
            return results.length !== 0 ? results[0].id : '';
        }
        /** Using Async runSuiteQL to fetch parent subsidiary **/
        static fetchParentSubsidiaryUsingSync() {
            const resultSet = query_1.default.runSuiteQL({
                query: `select
                       ${IPTConstants_1.default.FIELDS.IPT_ID}
                    from
                       ${IPTConstants_1.default.FIELDS.SUBSIDIARY}
                    where
                       ${IPTConstants_1.default.FIELDS.PARENT} is NULL
                    AND
                       ${IPTConstants_1.default.FIELDS.IS_INACTIVE} = 'F'`
            });
            let results = resultSet.asMappedResults();
            return results.length !== 0 ? results[0].id : '';
        }
        /** Using Async runSuiteQL to fetch parent subsidiary **/
        static async fetchActiveAdvancedPDFTemplates(templatesList) {
            let activeTemplates = [];
            if (templatesList.length) {
                const printTemplateId = templatesList.join(',');
                const request = {
                    requestType: IPTConstants_1.default.RequestType.FETCHACTIVEADVANCEDPDFTEMPLATES,
                    printTemplateId: printTemplateId
                };
                activeTemplates = await RecordHelper.sendRequest(request);
                activeTemplates = activeTemplates.map((templates) => {
                    return templates.id;
                });
            }
            return activeTemplates;
        }
        static openPreviewWindow(requestBody, previewWindow, previewTitle) {
            const headers = {
                'Content-Type': 'application/json'
            };
            https_1.default.requestSuitelet
                .promise({
                scriptId: IPTConstants_1.default.PREVIEW.SL_SCRIPT_ID,
                deploymentId: IPTConstants_1.default.PREVIEW.SL_DEPLOYMENT_ID,
                headers: headers,
                body: JSON.stringify(requestBody)
            })
                .then((response) => {
                previewWindow.document.body.innerHTML = response.body;
                previewWindow.document.title = previewTitle;
            });
        }
        static isALFBundleInstalled() {
            return suiteAppInfo_1.default.isBundleInstalled({
                bundleId: IPTConstants_1.default.PREVIEW.ALF_BUNDLE_ID
            });
        }
        static addNewIPTToDropDown(name, id) {
            const rec = N_currentRecord.get();
            const context = this;
            const field = rec.getField({
                fieldId: context.currentRecord.type === IPTConstants_1.default.RECORDS.INVOICE
                    ? IPTConstants_1.default.FIELDS.IPT_AT_INVOICE
                    : IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT
            });
            if (!field.isPopup) {
                // condition for checking the general preference setting
                try {
                    field.insertSelectOption({
                        value: id,
                        text: name,
                        isSelected: false
                    });
                }
                catch (e) {
                    log_1.default.error('Error adding IPT to dropdown', e);
                }
            }
            rec.setValue({
                fieldId: context.currentRecord.type === IPTConstants_1.default.RECORDS.INVOICE
                    ? IPTConstants_1.default.FIELDS.IPT_AT_INVOICE
                    : IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT,
                value: id
            });
        }
        static checkSubsidiaryAccess(ipt_id) {
            var _a, _b;
            let subsidiaryList = this.FetchSubsidiariesFromRoleConfig(runtime_1.default.getCurrentUser().role, runtime_1.default.getCurrentUser().id);
            let iptSubsidiary = (_b = (_a = RecordHelper.getSubsidiaryFromIPT(ipt_id)[0]) === null || _a === void 0 ? void 0 : _a.id) === null || _b === void 0 ? void 0 : _b.toString().split(',');
            if (iptSubsidiary) {
                const sublist = Object.values(subsidiaryList).map(({ id }) => id.toString());
                let subsidiaryAccessNotAvailable = false;
                for (let id of iptSubsidiary) {
                    if (!sublist.includes(id.trim())) {
                        subsidiaryAccessNotAvailable = true;
                        break;
                    }
                }
                return subsidiaryAccessNotAvailable;
            }
        }
        static FetchSubsidiariesFromRoleConfig(role, id) {
            let subsidiaries;
            const request = {
                requestType: IPTConstants_1.default.RequestType.GETSUBSIDIARIESFROMROLE,
                role: role
            };
            const requestForUserSubsidiary = {
                requestType: IPTConstants_1.default.RequestType.GETUSERSUBSIDIARY,
                id: id
            };
            const requestForAllSubsidiaries = {
                requestType: IPTConstants_1.default.RequestType.FETCHALLSUBSIDIARIES
            };
            const result = this.sendRequestSync(request);
            if (result[0].subsidiaryoption === IPTConstants_1.default.SUBSIDIARYLIST.OWN) {
                subsidiaries = this.sendRequestSync(requestForUserSubsidiary);
            }
            else if (result[0].subsidiaryoption === IPTConstants_1.default.SUBSIDIARYLIST.ALL) {
                subsidiaries = this.getSubsidiariesFromManager();
            }
            else if (result[0].subsidiaryoption === IPTConstants_1.default.SUBSIDIARYLIST.ALLACTIVE) {
                subsidiaries = this.sendRequestSync(requestForAllSubsidiaries);
            }
            else if (result[0].subsidiaryrestriction !== null) {
                const listOfSubsidiarySelected = result[0].subsidiaryrestriction;
                const requestSubsidiaryList = {
                    requestType: IPTConstants_1.default.RequestType.FETCHSUBSIDIARYFROMLIST,
                    list: listOfSubsidiarySelected.replace(/['"]+/g, '')
                };
                subsidiaries = this.sendRequestSync(requestSubsidiaryList);
            }
            return subsidiaries;
        }
        static getActiveSubsidiaries() {
            const request = {
                requestType: IPTConstants_1.default.RequestType.GETACTIVESUBSIDIARIES
            };
            const activeSubsidiaryList = this.sendRequestSync(request);
            const subsidiaryListFromManager = this.getSubsidiariesFromManager();
            const searchFrom = new Set();
            activeSubsidiaryList.forEach((item) => searchFrom.add(item.id));
            return subsidiaryListFromManager.filter((item) => searchFrom.has(item.id));
        }
        static getSubsidiaryFromIPT(id) {
            const subsidiarySet = query_1.default.runSuiteQL({
                query: `select custrecord_ipt_subsidiary as id from CUSTOMRECORD_IPT_TEMPLATE where id = ${id}`
            });
            return subsidiarySet.asMappedResults();
        }
        static getSubsidiariesFromManager() {
            const subsidiarySet = query_1.default.runSuiteQL({
                query: `select BUILTIN.DF(subsidiary) as name,id from SubsidiarySettings`
            });
            return subsidiarySet.asMappedResults();
        }
        static fetchIPTIncludeReceipt(templateId) {
            const resultSet = query_1.default.runSuiteQL({
                query: `select 
                        ${IPTConstants_1.default.FIELDS.IPT_INCLUDE_RECEIPT}
                    from 
                        ${IPTConstants_1.default.RECORDS.IPT_RECORD} 
                    where 
                        id = ${templateId}`
            });
            const results = resultSet.asMappedResults();
            // @ts-ignore
            return results.length ? results[0][IPTConstants_1.default.FIELDS.IPT_INCLUDE_RECEIPT] : 'F';
        }
        static async sendRequest(request) {
            let headers = {};
            headers['Content-Type'] = 'application/json';
            let responsePromise = await https_1.default.requestSuitelet.promise({
                scriptId: Constants_1.Constants.custRoleSuitelet.CUSTROLE_SL_SCRIPT_ID,
                deploymentId: Constants_1.Constants.custRoleSuitelet.CUSTROLE_SL_DEPLOYMENT_ID,
                headers: headers,
                body: JSON.stringify(request)
            });
            return JSON.parse(responsePromise.body);
        }
        static sendRequestSync(request) {
            let headers = {};
            headers['Content-Type'] = 'application/json';
            let responsePromise = https_1.default.requestSuitelet({
                scriptId: Constants_1.Constants.custRoleSuitelet.CUSTROLE_SL_SCRIPT_ID,
                deploymentId: Constants_1.Constants.custRoleSuitelet.CUSTROLE_SL_DEPLOYMENT_ID,
                headers: headers,
                body: JSON.stringify(request)
            });
            return JSON.parse(responsePromise.body);
        }
        static async setInternalSubsidiaries(id) {
            const request = {
                requestType: IPTConstants_1.default.RequestType.SETINTERNALSUBSIDIARY,
                iptId: id
            };
            await RecordHelper.sendRequest(request);
        }
    }
    exports.RecordHelper = RecordHelper;
});
