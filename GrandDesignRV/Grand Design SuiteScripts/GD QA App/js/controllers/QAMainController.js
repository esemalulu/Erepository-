import QAControllerBase from '../core/QAControllerBase';
import QAAppUI from '../QAAppUI';

export default class QAMainController extends QAControllerBase {
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
        this.suspendUnitChanging = false;
        this.onLineSelectionChanged = this.onLineSelectionChanged.bind(this);
        this.onUnitSelectionChanged = this.onUnitSelectionChanged.bind(this);
        this.onTabSelectionChanged = this.onTabSelectionChanged.bind(this);
        this.onLoadTestClicked = this.onLoadTestClicked.bind(this);
        this.onGridSaving = this.onGridSaving.bind(this);
        this.onSaveTestClicked = this.onSaveTestClicked.bind(this);
        this._init();
    }

    instance() {
        if (!this._instance)
            this._init();
        return this._instance;
    }

    _init() {
        const self = this;
        this.presenter = new QAAppUI(self);
        this.presenter.on('onLineSelectionChanged', this.onLineSelectionChanged);
        this.presenter.on('onUnitSelectionChanged', this.onUnitSelectionChanged);
        this.presenter.on('onTabSelectionChanged', this.onTabSelectionChanged);
        this.presenter.on('onLoadTestClicked', this.onLoadTestClicked);
        this.presenter.on('onGridSaving', this.onGridSaving);
        this.presenter.on('onSaveTestClicked', this.onSaveTestClicked);
        this._view = this.presenter.instance();
        this._instance = this._view;
        this.dataHandler.testTypesData.load().then(() => {
            // Create the grids to hold the test data.
            this.presenter.createTestDataGrids(this.dataHandler.testTypesData.items());
            this.presenter.tabPanel.option('dataSource', this.dataHandler.testTypesData);
            // Set the tab panel to disabled until a unit is selected.
            this.presenter.tabPanel.option('disabled', true);
            this.unitSelector = this.presenter.headerForm.getEditor('unit');
        });
    }

    show() {
        this.instance().show();
    }

    setComponentEvents() {
    }

    onLineSelectionChanged(location) {
        console.log('onLineSelectionChanged', location);
        this.selectedLine = location;
        this.dataHandler.locationsStore.store().byKey(location).then((loc) => {
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
    }

    onUnitSelectionChanged(e) {
        const unsavedChanges = Object.values(this.presenter.testGrids).some((grid) => {
            return grid.isDirty;
        });
        if (unsavedChanges || this.presenter.isSaveButtonEnabled()) {
            // Don't switch units.
            if(this.suspendUnitChanging) {
                this.suspendUnitChanging = false;
                return;
            }
            const oldValue = e.previousValue;
            const currentValue = e.value;
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
            confirmDialog.show().then((dialogResult) => {
                console.log(dialogResult.buttonText);
                if(dialogResult.buttonText === 'Yes') {
                    this.clearDataAndSelections();
                    e.component.option('value', currentValue);
                    this.onLoadTestClicked();
                } else {
                    this.suspendUnitChanging = true;
                    e.component.option('value', oldValue);
                }
            });
            /*DevExpress.ui.dialog.confirm('You have unsaved changes.<br />Are you sure you want to change units?', 'Unsaved Changes').then((result) => {
                if (result) {
                    this.clearDataAndSelections();
                    e.component.option('value', currentValue);
                } else {
                    this.suspendUnitChanging = true;
                    e.component.option('value', oldValue);
                }
            });*/
        } else {
            console.log('onUnitSelectionChanged', e.value);
            this.clearDataAndSelections();
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
        }
    }

    isTestDataLoaded() {
        return this.presenter.testGrids[this.selectedTestType].totalCount() > 0;
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
        if(!this.selectedUnit)
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
            Object.values(this.presenter.testGrids).forEach((grid) => {
                grid.option('dataSource', null);
                grid.isDirty = false;
            });
            this.presenter.tabPanel.option('disabled', true);
        });
    }

    onGridSaving(e) {
        this.presenter.toggleSaveButton(true);
    }

    onSaveTestClicked(e) {
        this.presenter.toggleSaveButton(false);
        this.presenter.mainLoadPanel.option('message', 'Saving Test...');
        this.presenter.mainLoadPanel.show().then(() => {
            this.dataHandler.saveTest(this.dataHandler.testHeader[this.selectedTestType]).then((response) => {
                const testId = response.body;
                this.presenter.mainLoadPanel.hide().then(() => {
                    this.presenter.testGrids.forEach((grid) => {
                        grid.isDirty = false;
                        grid.cancelEditData();
                    });
                    this.presenter.infoToast.option('message', `Test saved successfully. (Test ID: ${testId})`);
                    this.presenter.infoToast.show();
                });
            });
        });
    }

    echoTestInformation() {
        console.dir(this.dataHandler.testHeader);
        console.dir(this.dataHandler.testData);
        console.dir(this.dataHandler.testData[this.selectedTestType].items());
    }
}