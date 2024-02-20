export default class QAAppDataHandler {
    constructor() {
        this.vendorPaymentsStore = null;
        this.dealerRefundsStore = null;
        this.scriptId = null;
        this.deploymentId = null;
        /**
         * @type {DevExpress.data.DataSource}
         */
        this.unitsData = null;
        /**
         * @type {DevExpress.data.CustomStore}
         */
        this.testTypesStore = null;
        /**
         * @type {DevExpress.data.DataSource}
         */
        this.testTypesData = null;
        /**
         * @type {DevExpress.data.DataSource}
         */
        this.locationsStore = null;
        /**
         * @type {Object}
         */
        this.testData = {};
        /**
         * @type {Object}
         */
        this.testHeader = {};
    }

    createStore(methodName) {
        console.log('createStore', methodName);
        return new DevExpress.data.CustomStore({
            key: 'internalid',
            byKey: function (key) {
                console.log('byKey', key);
                /* var d = new $.Deferred();
                 $.get("http://mydomain.com/MyDataService?id=" + key)
                     .done(function (dataItem) {
                         d.resolve(dataItem);
                     });
                 return d.promise();*/
            },
            load: function (loadOptions) {
                const d = $.Deferred();
                const params = {};
                [
                    'filter',
                    'group',
                    'groupSummary',
                    'parentIds',
                    'requireGroupCount',
                    'requireTotalCount',
                    'searchExpr',
                    'searchOperation',
                    'searchValue',
                    'select',
                    'sort',
                    'skip',
                    'take',
                    'totalSummary',
                    'userData'
                ].forEach(function (i) {
                    if (i in loadOptions && loadOptions[i]) {
                        params[i] = JSON.stringify(loadOptions[i]);
                    }
                });
                console.log(loadOptions);
                const promise = new Promise((resolve, reject) => {
                    netSuiteHandler.getData(methodName, params).then(response => {
                        const gridData = JSON.parse(response.body);
                        resolve(gridData);
                    });
                });
                promise.then((data) => {
                    console.log('data', data);
                    d.resolve({data: data.records, totalCount: data.totalCount});
                });
                return d.promise();
            }
        });
    }

    createDataSource() {
        return new DevExpress.data.DataSource({
            store: this.createStore()
        });
    }

    getUnits(params) {
        const setDataSource = (result) => {
            this.unitsData = new DevExpress.data.DataSource({
                store: {
                    type: 'array',
                    key: 'internalid',
                    data: result
                },
                //group: 'categoryType'
            });
            return new Promise(function (resolve, reject) {
                resolve(true);
            });
        }
        return netSuiteHandler.getData('getUnits', params).then((response) => {
            let result = JSON.parse(response.body);
            return setDataSource(result.records);
        });
    }

    getTestTypes() {
        const setDataSource = (result) => {
            this.testTypesData = new DevExpress.data.DataSource({
                store: {
                    type: 'array',
                    key: 'typeid',
                    data: result
                },
                //group: 'categoryType'
            });
            return new Promise(function (resolve, reject) {
                resolve(true);
            });
        }
        return netSuiteHandler.getData('getTestTypes').then((response) => {
            let result = JSON.parse(response.body);
            return setDataSource(result.records);
        });
    }
    
    async createTestTypesStore() {
        if (!this.testTypesData)
            await this.getTestTypes();
    }

    async createLocationsStore() {
        const setDataSource = (result) => {
            this.locationsStore = new DevExpress.data.DataSource({
                store: {
                    type: 'array',
                    key: 'internalid',
                    data: result
                },
            });
            return new Promise(function (resolve, reject) {
                resolve(true);
            });
        }
        return netSuiteHandler.getData('getLocations').then((response) => {
            let result = JSON.parse(response.body);
            return setDataSource(result.records);
        });
        //this.locationsStore = this.createStore('getLocations');
    }

    async createUnitsStore() {
        this.unitsStore = this.createStore('getUnits');
    }

    /**
     * Loads a test for the specified unit from NetSuite.
     * @param testType - The type of test to load.
     * @param unit - The unit to load the test for.
     * @param [testId] - The id of the test to load.
     * @returns {Promise<T>}
     */
    async getTest(testType, unit, testId) {
        const params = {testType, unit, testId};
        const setDataSource = (result) => {
            this.testData[testType] = new DevExpress.data.DataSource({
                store: {
                    type: 'array',
                    key: 'templateLineId',
                    data: result
                }
            });
            return new Promise(function (resolve, reject) {
                resolve(true);
            });
        }
        return netSuiteHandler.getData('getTest', params).then((response) => {
            let result = JSON.parse(response.body);
            console.dir(result);
            if(result && result?.testLines?.length > 0) {
                this.testHeader[testType] = result;
                return setDataSource(result.testLines);
            }
        });
    }

    /**
     * Gets the completed tests for the specified unit from NetSuite.
     * @param unit
     * @returns {Promise<T>}
     */
    async getCompletedTests(unit) {
        const params = {unit};
        const setDataSource = (result) => {
            this.completedTestsData = new DevExpress.data.DataSource({
                store: {
                    type: 'array',
                    key: 'internalid',
                    data: result
                }
            });
            return new Promise(function (resolve, reject) {
                resolve(true);
            });
        }
        return netSuiteHandler.getData('getCompletedTests', params).then((response) => {
            let result = JSON.parse(response.body);
            console.dir(result);
            if(result) {
                return setDataSource(result);
            }
        });
    }
    
    async clearDataForUnit() {
        this.testData = {};
        this.completedTestsData = null;
    }
    
    async saveTest(testData) {
        return netSuiteHandler.postNetSuiteDataAsync('saveTest', {test:testData});
    }
    
    async uploadFile(file) {
        return netSuiteHandler.postNetSuiteDataAsync('uploadFile', {file});
    }
}