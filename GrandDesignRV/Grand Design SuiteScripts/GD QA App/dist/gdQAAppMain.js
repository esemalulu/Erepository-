/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./js/QAAppDataHandler.js":
/*!********************************!*\
  !*** ./js/QAAppDataHandler.js ***!
  \********************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ QAAppDataHandler; }
/* harmony export */ });
class QAAppDataHandler {
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
        const setTestTypesDataSource = (result) => {
            this.testTypesData = new DevExpress.data.DataSource({
                store: {
                    type: 'array',
                    key: 'typeid',
                    data: result
                },
                //group: 'categoryType'
            });
            return Promise.resolve(true);
        }
        const setDivisionsDataSource = (result) => {
            this.divisionsData = new DevExpress.data.DataSource({
                store: {
                    type: 'array',
                    key: 'id',
                    data: result
                },
                //group: 'categoryType'
            });
            return Promise.resolve(true);
        }
        return netSuiteHandler.getData('getTestTypes').then((response) => {
            let result = JSON.parse(response.body);
            return setTestTypesDataSource(result.records).then(() => {
                return setDivisionsDataSource(result.divisions);
            });
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
            if (result && result?.testLines?.length > 0) {
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
            if (result) {
                return setDataSource(result);
            }
        });
    }

    async clearDataForUnit() {
        this.testData = {};
        this.completedTestsData = null;
    }

    async saveTest(testData) {
        return netSuiteHandler.postNetSuiteDataAsync('saveTest', {test: testData});
    }

    /**
     * Uploads a file to NetSuite, using the RVS QA suitelet.
     * @param file
     * @param associatedTest
     * @returns {Promise<*>}
     */
    async uploadFile(file, associatedTest) {
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });

        return netSuiteHandler.postNetSuiteDataAsync('uploadFile',
            {
                testLineId: associatedTest.testLineId, fileName: file.name, file: await toBase64(file), fileGUID: associatedTest.fileGUID
            }, true);
    }

    async setFileOnTestLine(testLineId, fileId) {
        return netSuiteHandler.postNetSuiteDataAsync('setFileOnTestLine', {testLineId, fileId});
    }

    async deleteFile(testLineId, fileId) {
        return netSuiteHandler.deleteNetsuiteDataAsync('deleteFile', {testLineId, fileId});
    }
}


/***/ }),

/***/ "./js/QAAppNetSuiteHandler.js":
/*!************************************!*\
  !*** ./js/QAAppNetSuiteHandler.js ***!
  \************************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ QAAppNetSuiteHandler; }
/* harmony export */ });
class QAAppNetSuiteHandler {
    constructor(restletUrl, uploadUrl) {
        console.log('NetSuiteHandler');
        this.name = 'NetSuite Handler';
        this.restletUrl = restletUrl;
        this.uploadUrl = uploadUrl;
        console.log(restletUrl);
        this.https = undefined;
        const that = this;
        window.require(['N/https'], function (https) {
            that.https = https;
        })
    }
    getUrl(method, params) {
        let url = `${this.restletUrl}&method=${method}`;
        for (const key in params) {
            if (params.hasOwnProperty(key) && params[key]) {
                url += `&${key}=${params[key]}`;
            }
        }
        return url;
    }
    async getNetSuiteDataAsync(method, params) {
        console.log('getNetSuiteDataAsync');
        console.log(params);
        //await this.getHttps();
        const url = this.getUrl.call(this, method, params);
        console.log(url);
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.get.promise({
            url,
            headers
        });
    }
    
    postNetSuiteDataAsync(method, data, isUpload = false) {
        let url = this.restletUrl;
        let jsonText = JSON.stringify({'method': method, 'data': data});
        if (isUpload) {
            url = this.uploadUrl;
        }
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.post.promise({
            url,
            headers,
            body: jsonText
        });
    }
    
    deleteNetsuiteDataAsync(method, params) {
        let url = `${this.uploadUrl}&method=${method}`;
        for (const key in params) {
            if (params.hasOwnProperty(key) && params[key]) {
                url += `&${key}=${params[key]}`;
            }
        }
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.delete.promise({
            url,
            headers
        });
    }
    
    getData(methodName, params) {
        return this.getNetSuiteDataAsync(methodName, params);
    }
}

/***/ }),

/***/ "./js/QAAppUI.js":
/*!***********************!*\
  !*** ./js/QAAppUI.js ***!
  \***********************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ QAAppUI; }
/* harmony export */ });
/* harmony import */ var _core_QAUIBase__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./core/QAUIBase */ "./js/core/QAUIBase.js");


class QAAppUI extends _core_QAUIBase__WEBPACK_IMPORTED_MODULE_0__["default"] {
    constructor(eventHandler) {
        super(eventHandler);
        this.parent = eventHandler;
        this.tabPanel = null;
        /**
         * @type {DevExpress.ui.dxLoadPanel}
         */
        this.mainLoadPanel = null;
        this.testGrids = {};
        /**
         * @type {DevExpress.ui.dxToolbar}
         */
        this.toolbar = null;
        //this.createTestDataGrids = this.createTestDataGrids.bind(this);
        this._init();
    }

    _init() {
        this.createStaticElements().then(() => {
            this._instance = this;
        });
        console.log('_init');
    }

    instance() {
        return this._instance;
    }

    createHeaderForm() {
        return $('#headerForm').dxForm({
            labelMode: 'outside',
            items: this.getHeaderFormData(),
            readOnly: false,
            showColonAfterLabel: true,
            alignItemLabelsInAllGroups: false,
            labelLocation: 'left',
            minColWidth: 300,
            colCount: 2,
            formData: {},
        }).dxForm('instance');
    }

    getHeaderFormData() {
        return [
            {
                itemType: 'group',
                colCount: 1,
                items: [{
                    dataField: 'dealername',
                    label: {
                        template: this.labelTemplate('fa-user-tie', 'Dealer'),
                    },
                    editorOptions: {
                        readOnly: true,
                    }
                }, {
                    dataField: 'modelname',
                    label: {
                        template: this.labelTemplate('fa-gear', 'Model'),
                    },
                    editorOptions: {
                        readOnly: true,
                    }
                }, {
                    dataField: 'serialnumber',
                    label: {
                        template: this.labelTemplate('fa-hashtag', 'Serial #'),
                    },
                    editorOptions: {
                        readOnly: true,
                    }
                }]
            },
            {
                itemType: 'group',
                colCount: 1,
                items: [{
                    itemType: 'group',
                    colCount: 1,
                    items: [{
                        dataField: 'date',
                        editorType: 'dxDateBox',
                        label: {
                            template: this.labelTemplate('fa-calendar-days'),
                        },
                        editorOptions: {
                            readOnly: true,
                        }
                    },
                    {
                        itemType: 'group',
                        colCount: 2,
                        items:[
                            {
                                dataField: 'division',
                                editorType: 'dxSelectBox',
                                editorOptions: {
                                    showClearButton: false,
                                    displayExpr: 'value',
                                    valueExpr: 'id',
                                    searchEnabled: true,
                                    value: '',
                                    dataSource: dataHandler.divisionsData,
                                    onValueChanged: (e) => {
                                        this._eventsStrategy.fireEvent('onDivisionSelectionChanged', e);
                                    }
                                },
                                validationRules: [{
                                    type: 'required',
                                    message: 'Division is required',
                                }],
                                label: {
                                    template: this.labelTemplate('fa-building-user', 'Group'),
                                },
                            },{
                                dataField: 'line',
                                editorType: 'dxSelectBox',
                                editorOptions: {
                                    showClearButton: true,
                                    displayExpr: 'name',
                                    valueExpr: 'internalid',
                                    searchEnabled: true,
                                    value: '',
                                    dataSource: dataHandler.locationsStore,
                                    onValueChanged: (e) => {
                                        this._eventsStrategy.fireEvent('onLineSelectionChanged', e);
                                    }
                                },
                                validationRules: [{
                                    type: 'required',
                                    message: 'Line is required',
                                }],
                                label: {
                                    template: this.labelTemplate('fa-warehouse'),
                                },
                            },
                        ]

                    },]
                },
                    {
                        itemType: 'group',
                        colCount: 1,
                        items: [{
                            dataField: 'unit',
                            editorType: 'dxSelectBox',
                            editorOptions: {
                                showClearButton: true,
                                displayExpr: 'name',
                                valueExpr: 'internalid',
                                searchEnabled: true,
                                value: '',
                                dataSource: dataHandler.unitsData,
                                disabled: true,
                                onValueChanged: (e) => {
                                    this._eventsStrategy.fireEvent('onUnitSelectionChanged', e);
                                }
                            },
                            label: {
                                template: this.labelTemplate('fa-caravan-simple'),
                            },
                            validationRules: [{
                                type: 'required',
                                message: 'Unit is required',
                            }],
                        }/*, {
                            itemType: 'group',
                            items:
                                [{
                                    template: (e, element) => {
                                        var div = $('<div style=\'text-align: right\'>').appendTo(element);
                                        this.clearButton = $('<div style=\'margin-right: 10px\'>').dxButton({
                                            text: 'Clear',
                                            onClick: (e) => {
                                                this._eventsStrategy.fireEvent('onClearTestClicked', e);
                                            },
                                        }).dxButton('instance');
                                        this.clearButton.element().appendTo(div)
                                        this.loadTestButton = $('<div>').dxButton({
                                            text: 'Load Test',
                                            type: 'default',
                                            onClick: (e) => {
                                                this._eventsStrategy.fireEvent('onLoadTestClicked', e);
                                            },
                                        }).dxButton('instance');
                                        this.loadTestButton.element().appendTo(div);
                                    },
                                }
                                ]
                        }*/]
                    }]
            }]
    }

    labelTemplate(iconName, labelText) {
        //<i class="fa-solid fa-caravan-simple"></i>
        //<i class="fa-solid fa-warehouse"></i>
        //<i class="fa-solid fa-calendar-days"></i>
        //<i class="fa-solid fa-building-user"></i>
        return (data) => {
            if (data.dataField === 'unitVin') {
                return $(`<div><i class='fa-solid ${iconName} unitVin'></i>Unit VIN</div>`);
            }
            if (labelText)
                return $(`<div><i class='fa-solid ${iconName}'></i>${labelText}:</div>`);
            return $(`<div><i class='fa-solid ${iconName}'></i>${data.text}</div>`);
        };
    }

    createTabPanel() {
        const self = this;
        return $('#tabPanel').dxTabPanel({
            dataSource: [],
            deferRendering: false,
            //repaintChangesOnly: true,
            //selectedIndex: 0,
            height: '100%',
            onSelectionChanged: (e) => {
                console.log('onSelectionChanged')
                if (e.addedItems.length)
                    this._eventsStrategy.fireEvent('onTabSelectionChanged', [e]);
            },
            itemTitleTemplate: (itemData, itemIndex, itemElement) => {
                itemElement.append(itemData.name);
            },
            itemTemplate: (itemData, itemIndex, itemElement) => {
                const grid = this.testGrids[itemData.typeid];
                grid.element().appendTo(itemElement);
                // itemElement.append(self.createTabPanelItem(itemData.ID));
                //this.createTabPanelItem(itemData.ID, itemElement);
            },
            onContentReady: (e) => {
                // this.vendorPaymentsGrid.repaint();
            }
        });
    }

    toggleSaveButton(enable) {
        $('#saveButton').dxButton('instance').option('disabled', !enable)
    }

    isSaveButtonEnabled() {
        return !$('#saveButton').dxButton('instance').option('disabled');
    }

    createFooterToolbar() {
        return $('#toolbar').dxToolbar({
            items: [{
                locateInMenu: 'never',
                location: 'after',
                widget: 'dxButton',
                options: {
                    text: 'Clear',
                    onClick: (e) => {
                        this._eventsStrategy.fireEvent('onClearTestClicked', e);
                    },
                },
            }, {
                locateInMenu: 'never',
                location: 'after',
                widget: 'dxButton',
                options: {
                    text: 'Save',
                    type: 'default',
                    disabled: true,
                    onClick: (e) => {
                        this._eventsStrategy.fireEvent('onSaveTestClicked', e);
                    },
                    elementAttr: {
                        id: 'saveButton',
                    }
                },
            },
            ],
        });
    }

    createStaticElements() {
        this.responsiveBox = this.createResponsiveBox();
        this.headerForm = this.createHeaderForm();
        this.tabPanel = this.createTabPanel();
        this.tabPanel = this.tabPanel.dxTabPanel('instance');
        this.toolbar = this.createFooterToolbar();
        this.toolbar = this.toolbar.dxToolbar('instance');
        this.infoToast = $('#infoToast').dxToast({
            displayTime: 1200,
            position: {
                my: 'top left',
                at: 'top left',
                of: '#tabPanel',
                offset: '10 10'
            },
            width: 350,
        }).dxToast('instance');
        this.mainLoadPanel = this.createLoadPanel();
        return new Promise(function (resolve, reject) {
            resolve(true);
        });
    }

    createResponsiveBox() {
        return $('#responsiveBoxContainer').dxResponsiveBox({
            rows: [
                {ratio: 0.5},
                {ratio: 2},
                {ratio: 0.5}
            ],
            cols: [
                {ratio: 1}
            ],
            height: '100%',
        });
    }

    createTestDataGrids(testTypes) {
        const ids = testTypes.map((testType) => testType.typeid);
        ids.forEach((id) => {
            const grid = this._createTestDataGrid(id);
            grid.on({
                'rowClick': (e) => {
                    console.log('onRowClick', e);
                    this._eventsStrategy.fireEvent('onRowClick', e);
                }
            })
            this.testGrids[id] = grid;
        });
    }

    _createTestDataGrid(testTypeId) {
        return $(`<div id="testGrid${testTypeId}" />`).dxDataGrid({
            /*selection: {
                mode: 'multiple',
                showCheckBoxesMode: 'always'
            },*/
            loadPanel: {
                enabled: true,
                position: {
                    my: 'center',
                    at: 'center',
                    of: '#tabPanel'
                }
            },
            repaintChangesOnly: true,
            filterRow: {visible: true},
            filterPanel: {visible: false},
            headerFilter: {visible: true},
            allowColumnResizing: true,
            //columnAutoWidth: true,
            columnChooser: {enabled: false},
            // columnFixing: {enabled: true},
            noDataText: 'This test has not been loaded.',
            dataSource: [],
            height: '99%',
            elementAttr: {
                class: 'testGrid'
            },
            paging: {
                pageSize: 50,
            },
            pager: {
                showPageSizeSelector: true,
                allowedPageSizes: [25, 50, 100, 200, 300],
                showInfo: true,
                showNavigationButtons: true,
            },
            searchPanel: {
                visible: false,
                highlightCaseSensitive: true,
                searchVisibleColumnsOnly: true
            },
            allowColumnReordering: false,
            rowAlternationEnabled: true,
            showBorders: true,
            editing: {
                mode: 'cell',
                allowUpdating: true,
                allowAdding: false,
                allowDeleting: false,
            },
            selection: {
                mode: 'single',
            },
            hoverStateEnabled: true,
            onEditingStart: (e) => {
                this._eventsStrategy.fireEvent('onEditingStart', e);
            },
            onRowUpdated: (e) => {
                console.log('onRowUpdated', e);
                this._eventsStrategy.fireEvent('onRowUpdated', e);
            },
            onRowClick: (e) => {
                console.log('onRowClick', e);
                this._eventsStrategy.fireEvent('onRowClick', e);
            },
            onSelectionChanged: (e) => {
                console.log('onSelectionChanged', e);
            },
            onSaving: (e) => {
                console.log('onSaving', e);
                if (e.changes && e.changes.length) {
                    e.component.isDirty = true;
                    this._eventsStrategy.fireEvent('onGridSaving', e);
                }
            },
            onSaved: (e) => {
                //e.component.isDirty = false;
                console.log('onSaved', e);
            },
            columns: [
                /* {
                     type: 'selection',
                     width: 100
                 },*/
                {
                    dataField: 'testLineId',
                    dataType: 'number',
                    visible: false,
                    caption: 'Internal ID',
                    allowFiltering: false,
                }, {
                    dataField: 'templateLineId',
                    dataType: 'number',
                    visible: false,
                    caption: 'Template Line ID',
                    allowFiltering: false,
                },
                {
                    dataField: 'name',
                    dataType: 'string',
                    visible: true,
                    allowEditing: false,
                    calculateCellValue: function (rowData) {
                        return `[${rowData.code}] ${rowData.name}`;
                    }
                },
                {
                    dataField: 'value',
                    dataType: 'string',
                    visible: true,
                    caption: 'Pass/Fail',
                    allowFiltering: false,
                    cellTemplate(container, options) {
                        $('<div />').dxSwitch({
                            switchedOffText: 'Fail',
                            switchedOnText: 'Pass',
                            value: options.data.value,
                            readOnly: true,
                        }).appendTo(container);
                    },
                    width: 120,
                    allowEditing: false,
                },
                {
                    dataField: 'notes',
                },
                {
                    dataField: 'uploadFile',
                    dataType: 'string',
                    visible: true,
                    caption: 'Attachment',
                    allowFiltering: false,
                    cellTemplate: this.cellTemplate,
                    editCellTemplate: this.editCellTemplate.bind(this),
                    /*cellTemplate(container, options) {
                        const fileUploader = $('<div />').dxFileUploader({
                            multiple: false,
                            accept: '*',
                            value: [],
                            uploadMode: 'instantly',
                            uploadUrl: 'https://js.devexpress.com/Demos/NetCore/FileUploader/Upload',
                            onValueChanged(e) {
                                const files = e.value;
                            },
                        }).appendTo(container);
                    },*/
                },
            ],
        }).dxDataGrid('instance');
    }


    cellTemplate(container, options) {
        let imgElement = document.createElement('img');
        // TODO: Get the images from the backend
        if(options.data.qaFailedImageUrl) {
            imgElement.setAttribute("src", `${options.data.qaFailedImageUrl}`);
        }
        imgElement.setAttribute('height', '32px');
        imgElement.setAttribute('width', '32px');
        container.append(imgElement);
    }
    updateQueryStringParameter (uri, key, value) {
        var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
        var separator = uri.indexOf('?') !== -1 ? "&" : "?";
        if (uri.match(re)) {
            return uri.replace(re, '$1' + key + "=" + value + '$2');
        }
        else {
            return uri + separator + key + "=" + value;
        }
    }
    editCellTemplate(cellElement, cellInfo) {
        const self = this;
        let container = document.createElement('div');
        container.classList.add('cell-container');
        let buttonElement = document.createElement('div');
        buttonElement.classList.add('retryButton');
        let deleteButtonElement = document.createElement('div');
        deleteButtonElement.classList.add('retryButton');

        let imageElement = document.createElement('img');
        imageElement.setAttribute('height', '32px');
        imageElement.setAttribute('width', '32px');
        imageElement.classList.add('uploadedImage');
        if(cellInfo.data.qaFailedImageUrl)
            imageElement.setAttribute('src', `${cellInfo.data.qaFailedImageUrl}`);

        const showButton = (cellInfo.data.qaFailedImageUrl && cellInfo.data.qaFailedImageUrl.length > 0) || false;
        console.log('showButton', showButton);
        let fileUploaderElement = document.createElement('div');

        container.append(imageElement);
        container.append(deleteButtonElement);
        container.append(fileUploaderElement);
        container.append(buttonElement);
        cellElement.append(container);
        let retryButton = $(buttonElement).dxButton({
            text: 'Retry',
            visible: false,
            height: 32,
            onClick: function () {
                // The retry UI/API is not implemented.
                fileUploader.upload();
            }
        }).dxButton('instance');

        let deleteButton = $(deleteButtonElement).dxButton({
            text: 'Clear',
            visible: showButton,
            height: 32,
            onClick: (e) => {
                console.log('deleteButton', e);
                return self._eventsStrategy.fireEvent('onDeleteFileClicked', [cellInfo, imageElement]);
            }
        }).dxButton('instance');

        let fileUploader = $(fileUploaderElement).dxFileUploader({
            multiple: false,
            height: 40,
            accept: 'image/*',
            uploadMode: 'instantly',
             uploadFile: (file)  =>{
                // return self.parent.dataHandler.uploadFile(file)
                 return self._eventsStrategy.fireEvent('onUploadFile', [file, cellInfo]);
             },
            onValueChanged: (e) => {
                console.log('onValueChanged', e);

                /*var url = e.component.option('uploadUrl');
                url = self.updateQueryStringParameter(url, 'id', 123456132);
                console.log('url', url)
                e.component.option('uploadUrl', url);*/
                let reader = new FileReader();
                reader.onload = function (args) {
                    imageElement.setAttribute('src', args.target.result);
                }
                reader.readAsDataURL(e.value[0]); // convert to base64 string
            },
            onUploaded: (e) => {
                console.log('onUploaded file', e);
                console.log(e.request);
                return self._eventsStrategy.fireEvent('onUploaded', [cellInfo]);
                //cellInfo.setValue("images/employees/" + e.request.responseText);
                retryButton.option('visible', false);
            },
            onUploadError: (e) => {
                console.log('onUploadError');
                let xhttp = e.request;
                if (xhttp.status === 400) {
                    e.message = e.error.responseText;
                }
                if (xhttp.readyState === 4 && xhttp.status === 0) {
                    e.message = 'Connection refused';
                }
                retryButton.option('visible', true);
            }
        }).dxFileUploader('instance');

    }

    createLoadPanel() {
        /**
         * @type {DevExpress.ui.dxLoadPanel}
         */
        return $('#mainLoadPanel').dxLoadPanel({
            shadingColor: 'rgba(0,0,0,0.4)',
            position: {
                my: 'center',
                at: 'center',
                of: '#tabPanel'
            },
            visible: false,
            height: 150,
            showIndicator: true,
            showPane: true,
            shading: true,
            hideOnOutsideClick: false,
            message: 'Loading...',
        }).dxLoadPanel('instance');
    }
}


/***/ }),

/***/ "./js/controllers/QAMainController.js":
/*!********************************************!*\
  !*** ./js/controllers/QAMainController.js ***!
  \********************************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ QAMainController; }
/* harmony export */ });
/* harmony import */ var _core_QAControllerBase__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../core/QAControllerBase */ "./js/core/QAControllerBase.js");
/* harmony import */ var _QAAppUI__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../QAAppUI */ "./js/QAAppUI.js");



class QAMainController extends _core_QAControllerBase__WEBPACK_IMPORTED_MODULE_0__["default"] {
    constructor(parent, dataHandler) {
        super(parent);
        this.presenter = null;
        this.dataHandler = dataHandler;

        this.selectedLine = 0;
        this.selectedTestType = 0;
        this.selectedUnit = 0;
        this.selectedCompletedTest = 0;
        /**
         * @type {DevExpress.ui.dxSelectBox}
         */
        this.unitSelector = null;
        this.dataLoaded = false;
        this.suspendChanging = false;
        this.confirmingSwitch = false;
        /**
         * @type {QATestLine}
         */
        this.currentTest = null;
        this.onLineSelectionChanged = this.onLineSelectionChanged.bind(this);
        this.onUnitSelectionChanged = this.onUnitSelectionChanged.bind(this);
        this.onTabSelectionChanged = this.onTabSelectionChanged.bind(this);
        this.onLoadTestClicked = this.onLoadTestClicked.bind(this);
        this.onGridSaving = this.onGridSaving.bind(this);
        this.onSaveTestClicked = this.onSaveTestClicked.bind(this);
        this.onClearTestClicked = this.onClearTestClicked.bind(this);
        this.onEditingStart = this.onEditingStart.bind(this);
        this.onEditingEnd = this.onEditingEnd.bind(this);
        this.onUploaded = this.onUploaded.bind(this);
        this.onDeleteFileClicked = this.onDeleteFileClicked.bind(this);
        this.onDivisionSelectionChanged = this.onDivisionSelectionChanged.bind(this);
        this._init();
    }

    instance() {
        if (!this._instance)
            this._init();
        return this._instance;
    }

    _init() {
        const self = this;
        this.presenter = new _QAAppUI__WEBPACK_IMPORTED_MODULE_1__["default"](self);
        this.presenter.on({
            'onLineSelectionChanged': this.onLineSelectionChanged,
            'onUnitSelectionChanged': this.onUnitSelectionChanged,
            'onTabSelectionChanged': this.onTabSelectionChanged,
            'onLoadTestClicked': this.onLoadTestClicked,
            'onGridSaving': this.onGridSaving,
            'onSaveTestClicked': this.onSaveTestClicked,
            'onClearTestClicked': this.onClearTestClicked,
            'onUploadFile': this.onUploadFile,
            'onEditingStart': this.onEditingStart,
            'onEditingEnd': this.onEditingEnd,
            'onUploaded': this.onUploaded,
            'onDeleteFileClicked': this.onDeleteFileClicked,
            'onDivisionSelectionChanged': this.onDivisionSelectionChanged,
        });
        this._view = this.presenter.instance();
        this._instance = this._view;
        this.dataHandler.divisionsData.load().then(() => {
            this.divisionId = this.getCookie('divisionId');
            if (!this.divisionId) {
                this.divisionId = this.dataHandler.divisionsData.items()[0].id;
                this.setCookie('divisionId', this.divisionId, 365);
            }
            this.divisionSelector = this.presenter.headerForm.getEditor('division');
            this.divisionSelector.option('value', Number(this.divisionId));
            this.dataHandler.testTypesData.filter(['division_id', '=', this.divisionId]);
            this.dataHandler.testTypesData.load().then((data) => {
                // Create the grids to hold the test data.
                this.presenter.createTestDataGrids(data);
                this.presenter.tabPanel.option('dataSource', this.dataHandler.testTypesData);
                // Set the tab panel to disabled until a unit is selected.
                this.presenter.tabPanel.option('disabled', true);
                this.unitSelector = this.presenter.headerForm.getEditor('unit');
                this.lineSelector = this.presenter.headerForm.getEditor('line');
                this.locationId = this.getCookie('locationId');
                if (this.locationId) {
                    this.lineSelector.option('value', Number(this.locationId));
                }
            });
        });
    }

    setCookie(cname, cvalue, exdays) {
        const d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        let expires = 'expires=' + d.toUTCString();
        document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
    }

    getCookie(cname) {
        let name = cname + '=';
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return '';
    }

    show() {
        this.instance().show();
    }

    setComponentEvents() {
    }

    onClearTestClicked(e) {
        this.unitSelector.option('value', null);
        this.lineSelector.option('value', null);
        this.clearDataAndSelections();
        this.clearFormDataAndDisableTabs();
    }

    clearFormDataAndDisableTabs() {
        const updateData = {
            dealername: '',
            modelname: '',
            serialnumber: '',
        }
        this.presenter.headerForm.updateData(updateData);
        this.presenter.tabPanel.option('disabled', true);
    }

    onDivisionSelectionChanged(e) {
        console.log('onDivisionSelectionChanged', e);
        if (this.suspendChanging) {
            this.suspendChanging = false;
            return;
        }
        this.presenter.tabPanel.option('dataSource', null);
        this.dataHandler.testTypesData.filter(['division_id', '=', e.value]);
        this.dataHandler.testTypesData.load().then((data) => {
            this.presenter.createTestDataGrids(data);
            this.presenter.tabPanel.option('dataSource', this.dataHandler.testTypesData);
            this.presenter.tabPanel.option('disabled', !(this.selectedUnit !== 0));
            this.setCookie('divisionId', e.value, 365);
        });
    }
    onLineSelectionChanged(e) {
        if (this.suspendChanging) {
            this.suspendChanging = false;
            return;
        }
        const location = e.value;
        console.log('onLineSelectionChanged', location);
        this.selectedLine = location;
        this.shouldSwitchUnits().then(shouldSwitch => {
            if (shouldSwitch) {
                this.clearDataAndSelections();
                this.clearFormDataAndDisableTabs();
                this.dataHandler.locationsStore.store().byKey(location).then((loc) => {
                    console.log('Loading units.');
                    this.presenter.mainLoadPanel.option('message', `Loading units for line ${loc.name}...`);
                    this.presenter.mainLoadPanel.show().then(() => {
                        this.dataHandler.getUnits({'location': location}).then((loaded) => {
                            if (loaded) {
                                /*this.presenter.headerForm.getEditor('unit').option('disabled', false);
                                this.presenter.headerForm.getEditor('unit').option('dataSource', this.dataHandler.unitsData);*/
                                this.dataHandler.unitsData.load().then(() => {
                                    this.unitSelector.option({
                                        'dataSource': this.dataHandler.unitsData,
                                        'disabled': false
                                    });
                                });
                            }
                            this.presenter.mainLoadPanel.hide();
                        });
                    });
                });
                this.shouldEnableButton();
                this.setCookie('locationId', location, 365);
            } else {
                this.suspendChanging = true;
                e.component.option('value', e.previousValue);
            }
        });
    }

    onUnitSelectionChanged(e) {
        console.log('onUnitSelectionChanged', e.value);
        // Don't switch units.
        if (this.suspendChanging) {
            this.suspendChanging = false;
            return;
        }
        const oldValue = e.previousValue;
        const currentValue = e.value;
        // if(this.saveRequired()) {
        this.shouldSwitchUnits().then(shouldSwitch => {
            if (shouldSwitch) {
                this.clearDataAndSelections();
                e.component.option('value', currentValue);
                this.selectedUnit = e.value;
                if (!e.value) {
                    this.presenter.tabPanel.option('disabled', true);
                    return;
                }
                this.dataHandler.unitsData.store().byKey(e.value).then((unit) => {
                    const updateData = {
                        dealername: unit.dealername,
                        modelname: unit.modelname,
                        serialnumber: unit.serialnumber,
                    }
                    this.presenter.headerForm.updateData(updateData);
                });
                this.presenter.mainLoadPanel.option('message', 'Getting completed test information for unit...');
                this.presenter.mainLoadPanel.show().then(() => {
                    this.dataHandler.getCompletedTests(e.value).then((loaded) => {
                        if (loaded) {
                            this.dataHandler.completedTestsData.load();
                            this.presenter.tabPanel.option('disabled', false);
                            console.log('onUnitSelectionChanged', this.dataHandler.completedTestsData.items());
                        }
                        this.presenter.mainLoadPanel.hide();
                        this.onLoadTestClicked();
                    });
                });
                this.shouldEnableButton();
            } else {
                this.suspendChanging = true;
                e.component.option('value', oldValue);
            }
        });
        // } else {
        /*console.log('onUnitSelectionChanged', e.value);
        */
        //}
    }

    saveRequired() {
        const unsavedChanges = Object.values(this.presenter.testGrids).some((grid) => {
            console.log('saveRequired', grid.isDirty);
            return grid.isDirty;
        });
        return unsavedChanges;// || this.presenter.isSaveButtonEnabled();
    }

    async shouldSwitchUnits() {
        if (this.saveRequired()) {
            this.confirmingSwitch = true;
            const confirmDialog = DevExpress.ui.dialog.custom({
                title: 'Unsaved Changes',
                messageHtml: 'You have unsaved changes.<br />Are you sure you want to change units?',
                position: {
                    my: 'top center',
                    at: 'top cennter',
                    of: '#tabPanel',
                    offset: '10 10'
                },
                buttons: [{
                    text: 'Yes',
                    onClick: function (e) {
                        return {buttonText: e.component.option('text')}
                    }
                },
                    {
                        text: 'No',
                        onClick: function (e) {
                            return {buttonText: e.component.option('text')}
                        }
                    },
                ]
            });
            //const shouldSwitch = true;
            return confirmDialog.show().then((dialogResult) => {
                console.log(dialogResult.buttonText);
                this.confirmedSwitch = dialogResult.buttonText === 'Yes';
                return dialogResult.buttonText === 'Yes';
            });
        }
        this.confirmingSwitch = false;
        return new Promise((resolve, reject) => {
            console.log('shouldSwitchUnits', 'RETURNING TRUE');
            resolve(true);
        });
    }

    isTestDataLoaded() {
        return this.presenter.testGrids[this.selectedTestType]?.totalCount() > 0;
    }

    onTabSelectionChanged(e) {
        this.selectedTestType = e.addedItems[0].typeid;
        console.log('onTabSelectionChanged', this.selectedTestType);
        this.getSelectedCompletedTestId();
        this.shouldEnableButton();
        // Check if we need to load the test data for this test type.
        if (!this.isTestDataLoaded()) {
            this.onLoadTestClicked();
        }
    }

    getSelectedCompletedTestId() {
        const completedTests = this.dataHandler.completedTestsData?.items();
        if (completedTests && completedTests.length > 0) {
            // Find the completed test id for the selected test type.
            const temp = completedTests.find((test) => {
                return Number(test.testType) === this.selectedTestType;
            });
            if (temp)
                this.selectedCompletedTest = temp.internalid;
            else
                this.selectedCompletedTest = 0;
        }
    }

    shouldEnableButton() {
        if (!this.selectedTestType)
            this.selectedTestType = this.presenter.tabPanel.option('selectedItem').typeid;
        let enable = this.selectedLine && this.selectedUnit && this.selectedTestType;
        if (enable)
            enable = !this.isTestDataLoaded();
        //this.presenter.headerForm.getEditor('loadTest').option('disabled', !enable);
        //this.presenter.loadTestButton.option('disabled', !enable);
    }

    hideLoadTestButton() {
        //this.presenter.headerForm.getEditor('loadTest').option('disabled', true);
        //this.presenter.loadTestButton.option('disabled', true);
    }

    showLoadTestButton() {
        //this.presenter.headerForm.getEditor('loadTest').option('disabled', false);
        //this.presenter.loadTestButton.option('disabled', false);
    }

    onLoadTestClicked(e) {
        console.log('onLoadTestClicked', e);
        if (!this.selectedUnit)
            return;
        this.getSelectedCompletedTestId();
        this.presenter.mainLoadPanel.option('message', 'Loading Test...');
        this.presenter.mainLoadPanel.show().then(() => {
            this.hideLoadTestButton();
            this.dataHandler.getTest(this.selectedTestType, this.selectedUnit, this.selectedCompletedTest).then((loaded) => {
                if (loaded) {
                    //this.presenter.tabPanel.option('dataSource', this.dataHandler.testData);
                    this.presenter.testGrids[this.selectedTestType].option('dataSource', this.dataHandler.testData[this.selectedTestType]);
                    this.dataHandler.testData[this.selectedTestType].load();
                    this.dataLoaded = true;

                    const updateData = {
                        date: this.dataHandler.testHeader[this.selectedTestType].date,
                    }
                    this.presenter.headerForm.updateData(updateData);

                }
                this.presenter.mainLoadPanel.hide().then(loaded => {

                });
            });
        });
    }

    clearDataAndSelections() {
        this.selectedUnit = null;
        this.selectedTestType = null;
        this.dataHandler.clearDataForUnit().then(() => {
            console.log('clearDataAndSelections', 'RESETTING GRIDS')
            Object.values(this.presenter.testGrids).forEach((grid) => {
                grid.option('dataSource', null);
                grid.isDirty = false;
            });
            this.presenter.tabPanel.option('disabled', true);
        });
    }

    onGridSaving(e) {
        console.log('onGridSaving', e);
        const grid = e.component;
        if (e.changes[0].data.notes || e.changes[0].data.uploadFile) {
            e.changes[0].data.value = false;
        } else {
            e.changes[0].data.value = true;
        }
        e.component.isDirty = true;
        const testGrid = this.presenter.testGrids[this.selectedTestType];
        testGrid.isDirty = true;
        this.presenter.toggleSaveButton(true);
    }

    onSaveTestClicked(e) {
        this.presenter.toggleSaveButton(false);
        this.presenter.mainLoadPanel.option('message', 'Saving Test...');
        this.presenter.mainLoadPanel.show().then(() => {
            this.dataHandler.saveTest(this.dataHandler.testHeader[this.selectedTestType]).then((response) => {
                const testId = response.body;
                this.presenter.mainLoadPanel.hide().then(() => {
                    Object.values(this.presenter.testGrids).forEach((grid) => {
                        grid.isDirty = false;
                        grid.cancelEditData();
                    });
                    this.presenter.infoToast.option('message', `Test saved successfully. (Test ID: ${testId})`);
                    this.presenter.infoToast.show();
                });
            });
        });
    }

    async onUploadFile(e, cellInfo) {
        console.log('onUploadFile', e);
        console.log('this.currentTest', this.currentTest);
        this.presenter.mainLoadPanel.option('message', 'Uploading File...');
        this.presenter.mainLoadPanel.show().then(() => {
            if (!this.currentTest.testLineId) {
                this.currentTest.fileGUID = crypto.randomUUID();
            }
            this.dataHandler.uploadFile(e, this.currentTest).then((response) => {
                console.log('onUploadFile', response.body);
                const fileInfo = JSON.parse(response.body);
                if (fileInfo.url) {
                    this.currentTest.qaFailedImageId = fileInfo.id;
                    this.currentTest.qaFailedImageUrl = fileInfo.url;
                    this.currentTest.value = false;
                    cellInfo.setValue(fileInfo.url);
                    cellInfo.component.repaintRows([cellInfo.rowIndex]);
                    cellInfo.component.saveEditData();
                    return this.presenter.mainLoadPanel.hide().then(() => {
                        this.presenter.infoToast.option('message', `File uploaded successfully.`);
                        this.presenter.infoToast.show();
                    });
                } else {
                    return this.presenter.mainLoadPanel.hide().then(() => {
                        this.presenter.infoToast.option('message', `Error uploading file.`);
                        this.presenter.infoToast.show();
                    });
                }
            });
        });
    }

    onUploaded(cellInfo) {
        console.log('onUploaded', cellInfo);
        /* cellInfo.setValue(cellInfo.data.qaFailedImageUrl);
         cellInfo.component.saveEditData();*/
    }

    onEditingStart(e) {
        console.log('onEditingStart', e);
        this.currentTest = e.data;
    }

    onEditingEnd(e) {
        console.log('onEditingEnd', e);
        //this.currentTest = e.data;
    }

    echoTestInformation() {
        console.dir(this.dataHandler.testHeader);
        console.dir(this.dataHandler.testData);
        console.dir(this.dataHandler.testData[this.selectedTestType].items());
    }

    onDeleteFileClicked(cellInfo, imageElement) {
        console.log('onDeleteFileClicked', cellInfo);
        this.presenter.mainLoadPanel.option('message', 'Deleting file...');
        this.presenter.mainLoadPanel.show().then(() => {
            return this.dataHandler.deleteFile(cellInfo.data.testLineId, cellInfo.data.qaFailedImageId).then((response) => {
                console.log('onDeleteFileClicked', response.body);
                if (response.body === 'true') {
                    imageElement.setAttribute('src', '');
                    cellInfo.setValue('');
                    this.currentTest.qaFailedImageId = 0;
                    this.currentTest.qaFailedImageUrl = '';
                    if (!cellInfo.data.notes) {
                        this.currentTest.value = true;
                        cellInfo.data.value = true;
                    }
                    // Repaint the row of the active grid
                    cellInfo.component.repaintRows([cellInfo.rowIndex]);
                    cellInfo.component.saveEditData().then(() => {
                        this.presenter.mainLoadPanel.hide().then(() => {
                            this.presenter.infoToast.option('message', `File deleted successfully.`);
                            this.presenter.infoToast.show();
                        });
                    });
                } else {
                    this.presenter.mainLoadPanel.hide().then(() => {
                        this.presenter.infoToast.option('message', `The was a problem deleting the file.`);
                        this.presenter.infoToast.show();
                    });
                }
            });
        });
    }
}


/***/ }),

/***/ "./js/core/QACallbacks.js":
/*!********************************!*\
  !*** ./js/core/QACallbacks.js ***!
  \********************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "QACallbacks": function() { return /* binding */ QACallbacks; }
/* harmony export */ });
class QACallback {
    constructor(options) {
        this._options = options || {};
        this._list = [];
        this._queue = [];
        this._firing = false;
        this._fired = false;
        this._firingIndexes = [];
    }

    _fireCore(context, args) {
        const firingIndexes = this._firingIndexes;
        const list = this._list;
        const stopOnFalse = this._options.stopOnFalse;
        const step = firingIndexes.length;

        for(firingIndexes[step] = 0; firingIndexes[step] < list.length; firingIndexes[step]++) {
            const result = list[firingIndexes[step]].apply(context, args);

            if(result === false && stopOnFalse) {
                break;
            }
        }

        firingIndexes.pop();
    }

    add(fn) {
        if(typeof fn === 'function' && (!this._options.unique || !this.has(fn))) {
            this._list.push(fn);
        }
        return this;
    }

    remove(fn) {
        const list = this._list;
        const firingIndexes = this._firingIndexes;
        const index = list.indexOf(fn);

        if(index > -1) {
            list.splice(index, 1);

            if(this._firing && firingIndexes.length) {
                for(let step = 0; step < firingIndexes.length; step++) {
                    if(index <= firingIndexes[step]) {
                        firingIndexes[step]--;
                    }
                }
            }
        }

        return this;
    }

    has(fn) {
        const list = this._list;

        return fn ? list.includes(fn) : !!list.length;
    }

    empty(fn) {
        this._list = [];

        return this;
    }

    fireWith(context, args) {
        const queue = this._queue;

        args = args || [];
        args = args.slice ? args.slice() : args;

        if(this._options.syncStrategy) {
            this._firing = true;
            this._fireCore(context, args);
        } else {
            queue.push([context, args]);
            if(this._firing) {
                return;
            }

            this._firing = true;

            while(queue.length) {
                const memory = queue.shift();

                this._fireCore(memory[0], memory[1]);
            }
        }

        this._firing = false;
        this._fired = true;

        return this;
    }

    fire(...args) {
        this.fireWith(this, args);
    }

    fired() {
        return this._fired;
    }
}

const QACallbacks = options => new QACallback(options);

/***/ }),

/***/ "./js/core/QAControllerBase.js":
/*!*************************************!*\
  !*** ./js/core/QAControllerBase.js ***!
  \*************************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ QAControllerBase; }
/* harmony export */ });
/* harmony import */ var _core_QAEventStrategy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../core/QAEventStrategy */ "./js/core/QAEventStrategy.js");


class QAControllerBase {
    constructor(parent) {
        this._view = null;
        this._model = null;
        this._instance = null;
        // The eventsStrategy fires events FROM this component.
        this._eventsStrategy = new _core_QAEventStrategy__WEBPACK_IMPORTED_MODULE_0__["default"](qaApp, {
            syncStrategy: true
        });
        this.parent;
        if (parent) {
            this.parent = parent;
            parent.controllers.push(this);
        }
    }

    on(eventName, eventHandler) {
        this._eventsStrategy.on(eventName, eventHandler);
        return this;
    }

    off(eventName, eventHandler) {
        this._eventsStrategy.off(eventName, eventHandler);
        return this;
    }
}

/***/ }),

/***/ "./js/core/QAEventStrategy.js":
/*!************************************!*\
  !*** ./js/core/QAEventStrategy.js ***!
  \************************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ QAEventsStrategy; }
/* harmony export */ });
/* harmony import */ var _QACallbacks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./QACallbacks */ "./js/core/QACallbacks.js");

class QAEventsStrategy {
    constructor(owner, options = {}) {
        this._events = {};
        this._owner = owner;
        this._options = options;
    }
    isPlainObject = (object) => {
        if(!object || Object.prototype.toString.call(object) !== '[object Object]') {
            return false;
        }
        const proto = Object.getPrototypeOf(object);
        const ctor = Object.hasOwnProperty.call(proto, 'constructor') && proto.constructor;

        return typeof ctor === 'function'
            && Object.toString.call(ctor) === Object.toString.call(Object);
    };
    static isFunction = (object) => {
        return typeof object === 'function';
    };
    static create(owner, strategy) {
        if(strategy) {
            return QAEventsStrategy.isFunction(strategy) ? strategy(owner) : strategy;
        } else {
            return new QAEventsStrategy(owner);
        }
    }

    hasEvent(eventName) {
        const callbacks = this._events[eventName];
        return callbacks ? callbacks.has() : false;
    }

    fireEvent(eventName, eventArgs) {
        if(!Array.isArray(eventArgs))
            eventArgs = [eventArgs];
        const callbacks = this._events[eventName];
        if(callbacks) {
            callbacks.fireWith(this._owner, eventArgs);
        }
        return this._owner;
    }
    each = (values, callback) => {
        if(!values) return;

        if('length' in values) {
            for(let i = 0; i < values.length; i++) {
                if(callback.call(values[i], i, values[i]) === false) {
                    break;
                }
            }
        } else {
            for(const key in values) {
                if(callback.call(values[key], key, values[key]) === false) {
                    break;
                }
            }
        }

        return values;
    };
    on(eventName, eventHandler) {
        if(this.isPlainObject(eventName)) {
           this.each(eventName, (e, h) => {
                this.on(e, h);
            });
        } else {
            let callbacks = this._events[eventName];

            if(!callbacks) {
                callbacks = (0,_QACallbacks__WEBPACK_IMPORTED_MODULE_0__.QACallbacks)({
                    syncStrategy: this._options.syncStrategy
                });
                this._events[eventName] = callbacks;
            }

            const addFn = callbacks.originalAdd || callbacks.add;
            addFn.call(callbacks, eventHandler);
        }
    }

    off(eventName, eventHandler) {
        const callbacks = this._events[eventName];
        if(callbacks) {
            if(QSEventsStrategy.isFunction(eventHandler)) {
                callbacks.remove(eventHandler);
            } else {
                callbacks.empty();
            }
        }
    }

    dispose() {
        this.each(this._events, (eventName, event) => {
            event.empty();
        });
    }
}

/***/ }),

/***/ "./js/core/QAUIBase.js":
/*!*****************************!*\
  !*** ./js/core/QAUIBase.js ***!
  \*****************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ QAUIBase; }
/* harmony export */ });
/* harmony import */ var _QAEventStrategy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./QAEventStrategy */ "./js/core/QAEventStrategy.js");

class QAUIBase {
    constructor(eventHandler, options = {}) {
        this.eventHandler = eventHandler;
        //this._eventsStrategy = QSEventsStrategy.create(this, options.eventsStrategy);
        this._eventsStrategy = new _QAEventStrategy__WEBPACK_IMPORTED_MODULE_0__["default"](eventHandler, {
            syncStrategy: true
        });
    }
    
    on(eventName, eventHandler) {
        this._eventsStrategy.on(eventName, eventHandler);
        return this;
    }
    
    off(eventName, eventHandler) {
        this._eventsStrategy.off(eventName, eventHandler);
        return this;
    }
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
!function() {
/*!*************************!*\
  !*** ./js/QAAppMain.js ***!
  \*************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _QAAppNetSuiteHandler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./QAAppNetSuiteHandler */ "./js/QAAppNetSuiteHandler.js");
/* harmony import */ var _QAAppDataHandler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./QAAppDataHandler */ "./js/QAAppDataHandler.js");
/* harmony import */ var _QAAppUI__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./QAAppUI */ "./js/QAAppUI.js");
/* harmony import */ var _controllers_QAMainController__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./controllers/QAMainController */ "./js/controllers/QAMainController.js");





let netSuiteHandler, dataHandler, qaAppController;

class QAAppMain {
    constructor(props) {
        this.restletUrl = $('#restleturl').val();
        window.restletUrl = this.restletUrl;
        this.uploadUrl = $('#uploadUrl').val();
        window.uploadUrl = this.uploadUrl;
        this.controllers = [];
    }

    loadModules() {
        console.log('loadModules');
        netSuiteHandler = new _QAAppNetSuiteHandler__WEBPACK_IMPORTED_MODULE_0__["default"](this.restletUrl, this.uploadUrl);
        window.netSuiteHandler = netSuiteHandler;
        dataHandler = new _QAAppDataHandler__WEBPACK_IMPORTED_MODULE_1__["default"]();
        window.dataHandler = dataHandler;
        // start the process.
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    restletUrl: this.restletUrl
                });
            }, 50);
        });
    }

    initalize() {
        console.log('loading');
        const mainPromise = this.loadModules();
        mainPromise.then(function (response) {
            return response;
        }).then(result => {
            return dataHandler.createTestTypesStore();
        }).then(result => {
            return dataHandler.createLocationsStore();
        }).then(r => {
            qaAppController = new _controllers_QAMainController__WEBPACK_IMPORTED_MODULE_3__["default"](this, dataHandler);
            window.qaAppController = qaAppController;
            //return qaAppController.createStaticElements();
        });
    }
}

window.qaApp = QAAppMain;
}();
/******/ })()
;