/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./js/ExportPaymentDataHandler.js":
/*!****************************************!*\
  !*** ./js/ExportPaymentDataHandler.js ***!
  \****************************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ ExportPaymentDataHandler; }
/* harmony export */ });
class ExportPaymentDataHandler {
    constructor() {
        this.vendorPaymentsStore = null;
        this.dealerRefundsStore = null;
        this.scriptId = null;
        this.deploymentId = null;
    }

    createStore(methodName, type, historyId) {
        return new DevExpress.data.CustomStore({
            key: 'internalId',
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
                if(type && historyId) {
                    params.type = type;
                    params.historyId = historyId;
                }
                console.log(loadOptions);
                const promise = new Promise((resolve, reject) => {
                    netSuiteHandler.getGridData(methodName, params).then(response => {
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
    createVendorPaymentsStore() {
        this.vendorPaymentsStore = this.createStore('getVendorPayments');
    }
    createDealerRefundsStore() {
        this.dealerRefundsStore = this.createStore('getDealerRefunds');
    }
    createHistoryStore() {
        this.historyStore = this.createStore('getHistory');
    }
    createHistoryDetailsStore(type, historyId) {
        this.historyDetailsStore = this.createStore('getHistoryDetails', type, historyId);
        return this.historyDetailsStore;
    }
}

/***/ }),

/***/ "./js/ExportPaymentNetSuiteHandler.js":
/*!********************************************!*\
  !*** ./js/ExportPaymentNetSuiteHandler.js ***!
  \********************************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ ExportPaymentNetSuiteHandler; }
/* harmony export */ });
class ExportPaymentNetSuiteHandler {
    constructor(restletUrl, suiteletUrl) {
        console.log('NetSuiteHandler');
        this.name = 'NetSuite Handler';
        this.executeTaskAsync = this.executeTaskAsync.bind(this);
        this.restletUrl = restletUrl;
        this.suiteletUrl = suiteletUrl;
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
    getSuiteletUrl(method, params) {
        let url = `${this.suiteletUrl}&method=${method}`;
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
    async executeTaskAsync(method, data) {
        //await this.getHttps();
        const url = this.suiteletUrl;
        const jsonText = JSON.stringify({'method': method, 'data': data});
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.post.promise({
            url,
            headers,
            body: jsonText
        });
    }
    getNetSuiteData(method, callback, params) {
        const url = this.getUrl.call(this, method, params);
        const headers = {};
        headers['Content-Type'] = 'application/json';
        const response = this.https.get({
            url,
            headers
        });
        if (callback) {
            return callback(response.body);
        }
        return response.body;

    }

    postNetSuiteDataAsync(method, data) {
        const url = this.restletUrl;
        const jsonText = JSON.stringify({'method': method, 'data': data});
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.post.promise({
            url,
            headers,
            body: jsonText
        });
    }
    
    deleteNetsuiteDataAsync(method, params) {
        const url = this.getUrl.call(this, method, params);
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.delete.promise({
            url,
            headers
        });
    }
    
    getGridData(methodName, params) {
        return this.getNetSuiteDataAsync(methodName, params);
    }
    getExportFileInfo(isDealerRefund) {
        return this.getNetSuiteDataAsync('getExportFileInfo', {'isDealerRefund': isDealerRefund});
    }
    createPaymentFile(paymentJSON) {
        return this.executeTaskAsync('createPaymentFile', paymentJSON);
    }
    updatePaymentSearch(paymentJSON) {
        return this.postNetSuiteDataAsync('updatePaymentSearch', paymentJSON);
    }
    checkExportStatusAsync(taskId) {
        return this.getNetSuiteDataAsync('isTaskComplete', {'taskId':taskId});
    }

    processHistory(historyId) {
        return this.getNetSuiteDataAsync('processHistory', {'historyId':historyId});
    }
}

/***/ }),

/***/ "./js/ExportPaymentUI.js":
/*!*******************************!*\
  !*** ./js/ExportPaymentUI.js ***!
  \*******************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": function() { return /* binding */ ExportPaymentUI; }
/* harmony export */ });
class ExportPaymentUI {
    constructor() {
        this.tabPanel = null;
        /**
         * @type {DevExpress.ui.dxDataGrid}
         */
        this.vendorPaymentsGrid = null;
        /**
         * @type {DevExpress.ui.dxDataGrid}
         */
        this.dealerRefundsGrid = null;
        /**
         * @type {DevExpress.ui.dxDataGrid}
         */
        this.historyGrid = null;
        this.createLoadPanel();
        this.getVendorPaymentsColumns = this.getVendorPaymentsColumns.bind(this);
        this.getDealerRefundColumns = this.getDealerRefundColumns.bind(this);
        this.getHistoryColumns = this.getHistoryColumns.bind(this);
    }

    createTabPanel() {
        const tabPanelItems = [{
            ID: 1,
            title: 'Vendor Payments',
        }, {
            ID: 2,
            title: 'Dealer Refunds'
        }, {
            ID: 3,
            title: 'Export History'
        }]
        const self = this;
        return $('#tabPanel').dxTabPanel({
            dataSource: tabPanelItems,
            deferRendering: false,
            repaintChangesOnly: true,
            selectedIndex: 0,
            height: '100%',
            onSelectionChanged: (e) => {
                if (e.addedItems.length && e.addedItems[0].ID === 1 && !this.paymentsLoaded) {
                    this.vendorPaymentsGrid.beginUpdate();
                    this.vendorPaymentsGrid.option('dataSource', dataHandler.vendorPaymentsStore);
                    this.vendorPaymentsGrid.endUpdate();
                    this.paymentsLoaded = true;
                }
                if (e.addedItems.length && e.addedItems[0].ID === 2 && !this.dealerRefundsLoaded) {
                    this.dealerRefundsGrid.beginUpdate();
                    this.dealerRefundsGrid.option('dataSource', dataHandler.dealerRefundsStore);
                    this.dealerRefundsGrid.endUpdate();
                    this.dealerRefundsLoaded = true;
                }
                if (e.addedItems.length && e.addedItems[0].ID === 3 && !this.historyLoaded) {
                    this.historyGrid.beginUpdate();
                    this.historyGrid.option('dataSource', dataHandler.historyStore);
                    this.historyGrid.endUpdate();
                    this.historyLoaded = true;
                }
            },
            itemTitleTemplate: (itemData, itemIndex, itemElement) => {
                itemElement.append(itemData.title);
            },
            itemTemplate: (itemData, itemIndex, itemElement) => {
                // itemElement.append(self.createTabPanelItem(itemData.ID));
                this.createTabPanelItem(itemData.ID, itemElement);
            },
            onContentReady: (e) => {
                this.vendorPaymentsGrid.repaint();
            }
        });
    }

    createTabPanelItem(id, itemElement) {
        switch (id) {
            case 1:
                return this.createVendorPaymentsTabPanelItem(itemElement);
            case 2:
                return this.createDealerReturnsTabPanelItem(itemElement);
            case 3:
                return this.createHistoryTabPanelItem(itemElement);
        }
    }

    createVendorPaymentsTabPanelItem(itemElement) {
        this.createVendorPaymentsGrid().element().appendTo(itemElement);
    }

    createDealerReturnsTabPanelItem(itemElement) {
        this.createDealerRefundsGrid().element().appendTo(itemElement);
    }
    createHistoryTabPanelItem(itemElement) {
        return this.createHistoryGrid().element().appendTo(itemElement)
    }
    
    getHistoryColumns(type) {
        const columns =  (type === 'Vendor Payment') ? this.getVendorPaymentsColumns() : this.getDealerRefundColumns();
        // Remove the first column which is the selection column
        columns.shift();
        return columns;
    }
    
    getVendorPaymentsColumns() {
        return [{
            type: 'selection',
                width: 100
        },
        {
            dataField: 'internalId',
                dataType: 'number',
            visible: false,
            caption: 'Internal ID',
            allowFiltering: false,
        },
        {
            dataField: 'vendorName',
                dataType: 'string',
            visible: true,
            cellTemplate:  (container, options) => {
            $('<a>' + options.value + '</a>')
                .attr('href', `${window.location.origin}/app/common/entity/vendor.nl?id=${options.data.vendor}`)
                .attr('target', '_blank')
                .appendTo(container);
            }
        },
        {
            dataField: 'tranId',
                dataType: 'string',
            visible: true,
            caption: 'Document #',
            allowFiltering: false,
            cellTemplate:  (container, options) => {
            //https://3598857-sb2.app.netsuite.com/app/accounting/transactions/vendpymt.nl?id=14573696&whence=
            $('<a>' + options.value + '</a>')
                .attr('href', `${window.location.origin}/app/accounting/transactions/vendpymt.nl?id=${options.data.internalId}`)
                .attr('target', '_blank')
                .appendTo(container);
            }
        },
        {
            dataField: 'tranDate',
                dataType: 'date',
            allowFiltering: true,
            visible: true
        },
        {
            dataField: 'grossAmount',
                visible: true,
            caption: 'Amount (Gross)',
            allowFiltering: false,
            dataType: 'number',
            format: {
            type: 'currency',
                precision: 2
            },
        },
        {
            dataField: 'netAmount',
                visible: true,
            caption: 'Amount (Net)',
            allowFiltering: false,
            dataType: 'number',
            format: {
            type: 'currency',
                precision: 2
            },
        }];
    }
    createVendorPaymentsGrid() {
        this.vendorPaymentsGrid = $('<div/>').dxDataGrid({
            /*            remoteOperations: {
                            paging: true,
                            filtering: true,
                        },*/
            //deferRendering: false,
            selection: {
                mode: 'multiple',
                showCheckBoxesMode: 'always'
            },
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
            noDataText: 'There were no vendor payments found.',
            dataSource: dataHandler.vendorPaymentsStore,
            height: '99%',
            elementAttr: {
                id: 'claimsGrid'
            },
            onSelectionChanged: (e) => {
                //e.component.refresh(true)
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
                mode: 'row',
            },
            columns: this.getVendorPaymentsColumns(),
            toolbar: {
                items: [
                    {
                        location: 'before',
                        widget: 'dxButton',
                        options: {
                            text: 'Create Payment File',
                            width: 180,
                            onClick: (e) => {
                                const paymentIds = exportUI.vendorPaymentsGrid.getSelectedRowKeys();
                                if (!paymentIds.length) {
                                    DevExpress.ui.notify({
                                        message: 'Please select at least one payment to create a payment file.',
                                        width: 350,
                                        height: 80,
                                        shading: true,
                                        position: {
                                            my: 'center',
                                            at: 'center',
                                            of: '#tabPanel'
                                        },
                                    }, 'error', 2000);
                                    //   paymentsUI.createPaymentFile(paymentIds);
                                    return;
                                }
                                mainApp.createPaymentFile(paymentIds, false);
                            },
                            elementAttr: {
                                id: 'showPaidButton'
                            },
                            type: 'default'
                        },
                    }
                ],
            },
           /* summary: {
                totalItems: [{
                    name: 'SelectedRowCount',
                    summaryType: 'custom',
                    showInColumn: 'vendorName',
                }],
                calculateCustomSummary: function (options) {
                    if (options.name === "SelectedRowCount"){
                        if (options.summaryProcess === "finalize") {
                            const total = options.component.getSelectedRowKeys().length
                            options.totalValue = `Selected: ${total}`;
                        }
                    }
                }
            }*/
        }).dxDataGrid('instance');
        
        return this.vendorPaymentsGrid;
    }

    createDealerRefundsGrid() {
        this.dealerRefundsGrid = $('<div/>').dxDataGrid({
            /*            remoteOperations: {
                            paging: true,
                            filtering: true,
                        },*/
            //deferRendering: false,
            selection: {
                mode: 'multiple',
                showCheckBoxesMode: 'always'
            },
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
            noDataText: 'There were no dealer refunds found.',
            dataSource: dataHandler.dealerRefundsStore,
            height: '99%',
            elementAttr: {
                id: 'dealerRefundsGrid'
            },
            onSelectionChanged: (e) => {
                //e.component.refresh(true)
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
                mode: 'row',
            },
            columns: this.getDealerRefundColumns(),
            toolbar: {
                items: [
                    {
                        location: 'before',
                        widget: 'dxButton',
                        options: {
                            text: 'Create Refund File',
                            width: 180,
                            onClick: (e) => {
                                const paymentIds = exportUI.dealerRefundsGrid.getSelectedRowKeys();
                                if (!paymentIds.length) {
                                    DevExpress.ui.notify({
                                        message: 'Please select at least one refund to create a payment file.',
                                        width: 350,
                                        height: 80,
                                        shading: true,
                                        position: {
                                            my: 'center',
                                            at: 'center',
                                            of: '#tabPanel'
                                        },
                                    }, 'error', 2000);
                                    //   paymentsUI.createPaymentFile(paymentIds);
                                    return;
                                }
                                mainApp.createPaymentFile(paymentIds, true);
                            },
                            elementAttr: {
                                id: 'createDealerRefundFileButton'
                            },
                            type: 'default'
                        },
                    }
                ],
            },
            /* summary: {
                 totalItems: [{
                     name: 'SelectedRowCount',
                     summaryType: 'custom',
                     showInColumn: 'vendorName',
                 }],
                 calculateCustomSummary: function (options) {
                     if (options.name === "SelectedRowCount"){
                         if (options.summaryProcess === "finalize") {
                             const total = options.component.getSelectedRowKeys().length
                             options.totalValue = `Selected: ${total}`;
                         }
                     }
                 }
             }*/
        }).dxDataGrid('instance');
        return this.dealerRefundsGrid;
    }

    getDealerRefundColumns() {
        return [
            {
                type: 'selection',
                width: 100
            },
            {
                dataField: 'internalId',
                dataType: 'number',
                visible: false,
                caption: 'Internal ID',
                allowFiltering: false,
            },
            {
                dataField: 'dealerName',
                dataType: 'string',
                visible: true,
                cellTemplate: function (container, options) {
                    $('<a>' + options.value + '</a>')
                        .attr('href', `${window.location.origin}/app/common/entity/custjob.nl?id=${options.data.dealer}`)
                        .attr('target', '_blank')
                        .appendTo(container);
                }
            },
            {
                dataField: 'tranId',
                dataType: 'string',
                visible: true,
                caption: 'Document #',
                allowFiltering: false,
                cellTemplate: function (container, options) {
                    //https://3598857-sb2.app.netsuite.com/app/accounting/transactions/vendpymt.nl?id=14573696&whence=
                    $('<a>' + options.value + '</a>')
                        .attr('href', `${window.location.origin}/app/accounting/transactions/custrfnd.nl?id=${options.data.internalId}`)
                        .attr('target', '_blank')
                        .appendTo(container);
                }
            },
            {
                dataField: 'tranDate',
                dataType: 'date',
                allowFiltering: true,
                visible: true
            },
            {
                dataField: 'grossAmount',
                visible: true,
                caption: 'Amount (Gross)',
                allowFiltering: false,
                dataType: 'number',
                format: {
                    type: 'currency',
                    precision: 2
                },
            },
            {
                dataField: 'netAmount',
                visible: true,
                caption: 'Amount (Net)',
                allowFiltering: false,
                dataType: 'number',
                format: {
                    type: 'currency',
                    precision: 2
                },
            },
        ];
    }

    createHistoryGrid() {
        this.historyGrid = $('<div/>').dxDataGrid({
            /*            remoteOperations: {
                            paging: true,
                            filtering: true,
                        },*/
            //deferRendering: false,
            selection: {
                mode: 'single',
                showCheckBoxesMode: 'always'
            },
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
            noDataText: 'There was no history found.',
            dataSource: dataHandler.historyStore,
            height: '99%',
            elementAttr: {
                id: 'historyGrid'
            },
            onSelectionChanged: (e) => {
                //e.component.refresh(true)
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
                mode: 'row',
            },
            columns: [
                {
                    type: 'selection',
                    width: 100
                },
                {
                    dataField: 'internalId',
                    dataType: 'number',
                    visible: false,
                    caption: 'Internal ID',
                    allowFiltering: false,
                },
                {
                    dataField: 'type',
                    dataType: 'string',
                    visible: true,
                },
                {
                    dataField: 'recordCount',
                    dataType: 'number',
                    visible: true,
                },
                {
                    dataField: 'recordIds',
                    dataType: 'object',
                    visible: false,
                },
                {
                    dataField: 'isRestored',
                    dataType: 'boolean',
                    visible: true,
                    caption: 'Restored?',
                    allowFiltering: false,
                },
                {
                    dataField: 'dateRestored',
                    dataType: 'datetime',
                    allowFiltering: true,
                    visible: true
                },
                {
                    dataField: 'restoredBy',
                    visible: true,
                    allowFiltering: true,
                    dataType: 'string'
                },
                {
                    dataField: 'dateCreated',
                    dataType: 'datetime',
                    allowFiltering: true,
                    visible: true
                },
                {
                    dataField: 'dateModified',
                    dataType: 'datetime',
                    allowFiltering: true,
                    visible: true
                },
            ],
            onEditorPreparing: function(e) {
                if(e.parentType === "dataRow" && e.command === "select") {
                    e.editorOptions.value = false;
                }
            },
            masterDetail: {
                enabled: true,
                template: (container, options) => {
                    $('<div>')
                        .addClass('master-detail-caption')
                        .text(`${options.data.type} Records:`)
                        .appendTo(container);
                    //console.dir(options.data);

                    $('<div>')
                        .dxDataGrid({
                            columnAutoWidth: true,
                            showBorders: true,
                            columns: this.getHistoryColumns(options.data.type),
                            dataSource: dataHandler.createHistoryDetailsStore(options.data.type, options.data.internalId),
                        }).appendTo(container);
                },
            },
            toolbar: {
                items: [
                    {
                        location: 'before',
                        widget: 'dxButton',
                        options: {
                            text: 'Re-run Export',
                            width: 180,
                            onClick: (e) => {
                                const historyId = exportUI.historyGrid.getSelectedRowKeys();
                                const historyData = exportUI.historyGrid.getSelectedRowsData();
                                if (!historyId.length) {
                                    DevExpress.ui.notify({
                                        message: 'Please select one historical record to create a payment file.',
                                        width: 350,
                                        height: 80,
                                        shading: true,
                                        position: {
                                            my: 'center',
                                            at: 'center',
                                            of: '#tabPanel'
                                        },
                                    }, 'error', 2000);
                                    //   paymentsUI.createPaymentFile(paymentIds);
                                    return;
                                }
                                mainApp.createHistoricalPaymentFile(historyId, historyData[0].type);
                            },
                            elementAttr: {
                                id: 'restoreHistoryButton'
                            },
                            type: 'default'
                        },
                    },
                    {
                        location: 'after',
                        widget: 'dxButton',
                        options: {
                            icon: 'refresh',
                            onClick: () => {
                                this.historyGrid.refresh();
                            }
                        }
                    }
                ],
            },
        }).dxDataGrid('instance');
        return this.historyGrid;
    }
    createStaticElements() {
        this.tabPanel = this.createTabPanel();
        this.tabPanel = this.tabPanel.dxTabPanel('instance');
        return new Promise(function (resolve, reject) {
            resolve(true);
        });
    }

    createLoadPanel() {
        /**
         * @type {DevExpress.ui.dxLoadPanel}
         */
        this.mainLoadPanel = $('#mainLoadPanel').dxLoadPanel({
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
            message: 'Exporting...',
        }).dxLoadPanel('instance');
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
/*!*********************************!*\
  !*** ./js/ExportPaymentMain.js ***!
  \*********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _ExportPaymentNetSuiteHandler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ExportPaymentNetSuiteHandler */ "./js/ExportPaymentNetSuiteHandler.js");
/* harmony import */ var _ExportPaymentUI__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ExportPaymentUI */ "./js/ExportPaymentUI.js");
/* harmony import */ var _ExportPaymentDataHandler__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ExportPaymentDataHandler */ "./js/ExportPaymentDataHandler.js");




let netSuiteHandler, dataHandler, exportUI;
class ExportPaymentMain {
    constructor(props) {
        this.restletUrl = $('#restleturl').val();
        this.suiteletUrl = $('#suiteleturl').val();
        this.exportCount = 1;
        this.checkExportStatus = this.checkExportStatus.bind(this);
        this.exportStatus = undefined;
    }
    loadModules() {
        console.log('loadModules');
        // ruleManager = new RuleManager();
        netSuiteHandler = new _ExportPaymentNetSuiteHandler__WEBPACK_IMPORTED_MODULE_0__["default"](this.restletUrl, this.suiteletUrl);
        window.netSuiteHandler = netSuiteHandler;
        dataHandler = new _ExportPaymentDataHandler__WEBPACK_IMPORTED_MODULE_2__["default"]();
        window.dataHandler = dataHandler;
        // start the process.
        return new Promise( (resolve, reject) => {
            setTimeout( () => {
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
            dataHandler.createVendorPaymentsStore();
            exportUI = new _ExportPaymentUI__WEBPACK_IMPORTED_MODULE_1__["default"]();
            window.exportUI = exportUI;
            return exportUI.createStaticElements();
        }).then(result => {
            dataHandler.createDealerRefundsStore();
            dataHandler.createHistoryStore();
        });
    }

    /**
     * Create the payment file.
     * Update the payment search with the payment ids.
     * Execute the map/reduce script to create the payment file.
     * @param paymentIds
     * @param isDealerRefund
     */
    createPaymentFile(paymentIds, isDealerRefund = false) {
        if(paymentIds.length) {
            const postJSON = {
                paymentIds: paymentIds,
                isDealerRefund: isDealerRefund
            }
            exportUI.mainLoadPanel.option('message', `Processing your search request ${paymentIds.length} payment ids...`);
            this.updateSearchAndCreatePaymentFile(postJSON, isDealerRefund);
        }
    }

    updateSearchAndCreatePaymentFile(postJSON, isDealerRefund) {
        const historyId = postJSON.historyId;
        exportUI.mainLoadPanel.show().then(() => {
            netSuiteHandler.updatePaymentSearch(postJSON).then((response) => {
                console.log(response);
                return new Promise((resolve, reject) => {
                    resolve(JSON.parse(response.body));
                });
            }).then((response) => {
                if (response.result === 'success') {
                    netSuiteHandler.createPaymentFile({
                        isDealerRefund: isDealerRefund
                    }).then((response) => {
                        console.log(response);
                        const taskInfo = JSON.parse(response.body);
                        if (taskInfo.taskId)
                            this.checkExportStatus(taskInfo.taskId, isDealerRefund, historyId);
                    })
                }
            });
        });
    }

    createHistoricalPaymentFile(historyId, type) {
        if(historyId.length) {
            const isDealerRefund = type === 'Dealer Refund';
            const postJSON = {
                historyId: historyId[0]
            }
            exportUI.mainLoadPanel.option('message', `Processing your historical payment file...`);
            this.updateSearchAndCreatePaymentFile(postJSON, isDealerRefund);
        }
    }
    
    updateMainLoadPanelMessage(taskId, isDealerRefund, historyId) {
        if(this.exportCount % 10 === 0) {
            exportUI.mainLoadPanel.option('message', `Checking export status...`);
            this.checkExportStatus(taskId, isDealerRefund, historyId);
            return;
        }
        this.exportCount++;
        console.log('updateMainLoadPanelMessage', this.exportCount);
        exportUI.mainLoadPanel.option('message', `Waiting to check export status... (${this.exportCount})`);
        setTimeout(() => {
            this.updateMainLoadPanelMessage(taskId, isDealerRefund, historyId);
        }, 1000);
    }
    
    checkExportStatus(taskId, isDealerRefund, historyId) {
        const self = this;
        if (taskId) {
           // exportUI.mainLoadPanel.option('message', `Checking export status... (${self.exportCount})`);
            exportUI.mainLoadPanel.show().then(() => {
                setTimeout(() => {
                    /*if (self.exportCount > 300) {
                        self.exportCount = 1;
                        return;
                    }*/
                    
                    if(self.exportCount % 10 !== 0) {
                        self.updateMainLoadPanelMessage(taskId, isDealerRefund, historyId);
                        return;
                    }
                    exportUI.mainLoadPanel.option('message', `Checking export status...`);
                    netSuiteHandler.checkExportStatusAsync(taskId).then((result) => {
                        exportUI.mainLoadPanel.option('message', `Checking export status...`);
                        self.exportCount++;
                        console.dir(result);
                        self.exportStatus = JSON.parse(result.body);
                        if (self.exportStatus && self.exportStatus.isCompleted) {
                            console.log('checkExportStatusAsync', self.exportStatus);
                            self.exportCount = 0;
                            exportUI.mainLoadPanel.option('message', 'Your export request has been completed.');
                            setTimeout(() => {
                                exportUI.mainLoadPanel.hide();
                                self.exportStatus = undefined;
                                self.getExportFile(isDealerRefund).then(() => {
                                    if (historyId) {
                                        self.processHistory(historyId);
                                    } 
                                });
                            }, 1250);
                        } else {
                            //exportUI.mainLoadPanel.option('message', `Checking export status... ${self.exportStatus.status}: ${self.exportStatus.stage} (${self.exportCount})`);
                            self.updateMainLoadPanelMessage(taskId, isDealerRefund, historyId);
                        }
                    });
                }, 10000);
            });
        }
    }
    
    getExportFile(isDealerRefund) {
        return netSuiteHandler.getExportFileInfo(isDealerRefund).then((result) => {
            const fileInfo = JSON.parse(result.body);
            console.log('fileInfo', fileInfo);
            if (fileInfo.fileId) {
                window.open(`${window.location.origin}${fileInfo.fileUrl}`, '_blank');
                isDealerRefund ? exportUI.dealerRefundsGrid.refresh() : exportUI.vendorPaymentsGrid.refresh();
            }
        });
    }
    
    processHistory(historyId) {
        netSuiteHandler.processHistory(historyId).then((result) => {
            const response = JSON.parse(result.body);
            console.log('processHistory', response);
            if (response.result === 'success') {
                dataHandler.createHistoryStore();
            }
        });
    }
}
window.exportPayments = ExportPaymentMain;
}();
/******/ })()
;