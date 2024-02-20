import QAUIBase from './core/QAUIBase';

export default class QAAppUI extends QAUIBase {
    constructor(eventHandler) {
        super(eventHandler);
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
                    }, {
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
                                this._eventsStrategy.fireEvent('onLineSelectionChanged', e.value);
                            }
                        },
                        validationRules: [{
                            type: 'required',
                            message: 'Line is required',
                        }],
                        label: {
                            template: this.labelTemplate('fa-warehouse'),
                        },
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
        return (data) => {
            if (data.dataField === 'unitVin') {
                return $(`<div><i class='fa-solid ${iconName} unitVin'></i>Unit VIN</div>`);
            }
            if (labelText)
                return $(`<div><i class='fa-solid ${iconName}'></i>${labelText}</div>`);
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
            height: '80%',
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
                mode: 'cell',
                allowUpdating: true,
                allowAdding: false,
                allowDeleting: false,
            },
            onSaving: (e) => {
                console.log('onSaving', e);
                if (e.changes && e.changes.length) {
                    if (e.changes[0].data.notes) {
                        e.changes[0].data.value = false;
                    } else {
                        e.changes[0].data.value = true;
                    }
                    e.component.isDirty = true;
                    this._eventsStrategy.fireEvent('onGridSaving', e);
                }
            },
            onSaved: (e) => {
                e.component.isDirty = false;
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
                }
            ],
        }).dxDataGrid('instance');
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