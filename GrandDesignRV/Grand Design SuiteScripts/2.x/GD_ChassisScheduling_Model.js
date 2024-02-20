const appData = {
    data() {
        return { 
            currentstate: 'loading',
            // Filters
            locations: [],
            series: [],
            models: [],

            // Unit Data
            units: [],
            inventoryNumbers: [],

            // Selected by User
            selectedLocation: '',
            selectedSeries: '',
            selectedModel: '',
            selectedUnit: '',
            selectedChassisItem: '',
        }
    },
    methods: {
        // Get all the Filters and set Filter fields
        async getAndDisplayFilters() {
            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            };

            var domainUrl = window.location.origin;
            const response = await fetch(domainUrl + `/app/site/hosting/scriptlet.nl?script=customscriptgd_chassched_getfilters_stlt&deploy=customdeploygd_chassched_getfilters_stlt`, requestOptions);
            if (response.ok) {
                let responseJSON = await response.json(); // Get JSON value from the response body
                if (responseJSON != undefined) {    
                    // Set the tab and update the data
                    this.currentstate = 'filtering';
                    this.locations = responseJSON.locationRecords;
                    this.series = responseJSON.series;
                }
            }
        },

        // Get Unit Data and set the arrays appropriately
        async getUnitDataAndBuildTables() {
            // Check that the Location was set, if not throw alert. 
            if (!this.selectedLocation) {
                alert("You must select a Location.");
            }
            else {
                // Make the call to get all the data we need for the tables.
                this.currentstate = 'loading';
                const requestOptions = {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                };

                // Build the Filters string
                let filtersString = '&custpage_location=' + this.selectedLocation;

                if (this.selectedSeries != '')
                    filtersString += '&custpage_series=' + this.selectedSeries;

                if (this.selectedModel != '')
                    filtersString += '&custpage_model=' + this.selectedModel;


                var domainUrl = window.location.origin;
                const response = await fetch(domainUrl + `/app/site/hosting/scriptlet.nl?script=customscriptgd_chassched_getdata_stlt&deploy=customdeploygd_chassched_getdata_stlt${filtersString}`, requestOptions);
                if (response.ok) {
                    let responseJSON = await response.json(); // Get JSON value from the response body
                    if (responseJSON != undefined) {    
                        // Check if there's an active Processing Record
                        this.activeProcRec = responseJSON.activeProcRec;
                        if (!(this.activeProcRec)) {
                            // Set the data
                            this.currentstate = 'editing';
                            this.units = responseJSON.units;
                            this.inventoryNumbers = responseJSON.inventorynumbers;
                        }
                        else {
                            // Show a message that there's already something in progress
                            this.currentstate = 'updating';
                        }
                    }
                }
            }

            // Call functions to build the tables -- these happen here because the data isn't available when we do an async
            this.scheduledUnitsTable();
            
        },

        // ** BUILDING THE TABLES METHODS ** //
        // Functionality for the Units Table
        scheduledUnitsTable() {
            $(document).ready(() => {
                // Create the Table
                let unitTable = $('#scheduledUnitsTable').DataTable({
                    paging: false,

                    // Enables feature to select a row
                    select: { style: 'single' },
                }); 

                // When a row is selected display the Inventory Number table
                unitTable.on('select', ( e, dt, type, indexes ) => {  
                    if ( type === 'row' ) {
                        var data = unitTable.rows( indexes ).data()[0];
                        let unitId = data.DT_RowId;
                 
                        // Set the selected Unit
                        this.selectedUnit = unitId;

                        // Update the Inventory Number list to the ones that apply to that Chassis Item
                        (this.units).findIndex((obj) => {  
                            if (obj.unit_id == unitId) {
                                this.selectedChassisItem = obj.chassis_itemid;
                                this.inventoryNumberTable();
                            }
                        });
                    }
                });

                // When the user deselects a row, hide the Inventory Number table
                unitTable.on('deselect', ( e, dt, type, indexes ) => {  
                    if ( type === 'row' ) {
                        // Set the selected Unit to empty & destroy the Inventory Number Table
                        this.selectedUnit = '';
                        $('#inventoryNumberTable').DataTable().destroy();
                        $('#inventoryNumberTable').hide();
                    }
                });
            });
        },

        // Functionality for the Inventory Numbers Table
        inventoryNumberTable() {
            $(document).ready(() => {
                // Create the Table
                $('#inventoryNumberTable').DataTable({
                    // The table is hidden when there is no inventory, so show it.
                    initComplete: function() {
                        $('#inventoryNumberTable').show();
                    },
                    paging: false,
                }); 
            });
        },
       
        // ** BUTTON METHODS ** //
        // Reset button -- reload the page to reset everything
        reloadPage() {
            window.location.reload();
        },

        // Submit button -- send the data to update into NetSuite 
        async submitAllData() {

            // Check if there's an active processing record before we submit
            let activeProcRec = true;
            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            };

            // Build the Filters string
            let filtersString = '&custpage_location=' + this.selectedLocation;

            var domainUrl = window.location.origin;
            const response = await fetch(domainUrl + `/app/site/hosting/scriptlet.nl?script=customscriptgd_chassched_getdata_stlt&deploy=customdeploygd_chassched_getdata_stlt${filtersString}`, requestOptions);
            if (response.ok) {
                let responseJSON = await response.json(); // Get JSON value from the response body
                if (responseJSON != undefined) {    
                    activeProcRec = responseJSON.activeProcRec;
                }
            }

            // Throw an alert & let them know that the screen is refreshing.
            if (activeProcRec) {
                alert("Another user submitted an update. This page will refresh since data will be updated.");
                this.reloadPage();
            }
            else {
                // Set the Active Tab to updating to display a message
                this.currentstate = 'updating';

                // Get the data - any records that are dirty
                let submitObj = {};
                submitObj.unitsToUpdate = JSON.stringify(this.dirtyUnits);
                submitObj.locationId = this.selectedLocation;
              
                // Send it to the Chassis Scheduling Suitelet
                const requestOptions = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(submitObj)
                };

                var domainUrl = window.location.origin;
                const response = await fetch(domainUrl + '/app/site/hosting/scriptlet.nl?script=customscriptgd_chassissched_suitelet&deploy=customdeploygd_chassissched_suitelet', requestOptions);
                if (response.ok) {
                    let responseJSON = await response.json(); // Get JSON value from the response body
                    if (responseJSON != undefined) {    
                        let recordId = responseJSON.processingRecId;
                    }
                }
            }
        },

        // ** HELPER METHODS ** //
        // Set the list of Models on change of the selected Series
        setModelListFromSelectedSeries() {
            let selectedSeries = this.selectedSeries;
            (this.series).findIndex((obj) => {
                if (obj.id == selectedSeries)
                    this.models = obj.models;
            });
        },

        // When the Assign button is clicked, update the unit and remove from list
        assignInventoryNumber(event) {
            let selectedInventoryNumber = event.target.id;

            // Destroy and hide the Inventory Number table
            // Do this here so that datatables can readjust the number of entries
            $('#inventoryNumberTable').DataTable().destroy();
            $('#inventoryNumberTable').hide();

            // Remove the Inventory Number from being visible in the list
            let invNumIdx = this.inventoryNumbers.findIndex((obj) => {
                if (obj.inventorynumber == selectedInventoryNumber) {
                    obj.assigned = true;
                    return true;
                }
            });

            // Update the Unit to have that Chassis Inventory Number
            (this.units).findIndex((obj) => {
                if (obj.unit_id == this.selectedUnit) {
                    
                    // Check if this Unit already has a Chassis Item assigned
                    if (obj.unit_chassisinvnum != null) {
                        // Add the Inventory Number to be visible in the list
                        this.inventoryNumbers.findIndex((invObj) => {
                            if (invObj.inventorynumber == obj.unit_chassisinvnum) {
                                invObj.assigned = false;
                                return true;
                            }
                        });
                    }

                    // Assign the Inventory Number to the selected Unit
                    obj.unit_chassisinvnum = selectedInventoryNumber;
                    obj.unit_chassisinvnum_id = this.inventoryNumbers[invNumIdx].id;
                }
            });
        },

        // When the Release button is clicked, add the inventory number back to the list
        releaseInventoryNumber(event) {
            let selectedInventoryNumber = event.target.id;

            // Destroy and Hide the Inventory Number table
            // Do this here so that datatables can readjust the number of entries
            $('#inventoryNumberTable').DataTable().destroy();
            $('#inventoryNumberTable').hide();

            // Add the Inventory Number to be visible in the list
            this.inventoryNumbers.findIndex((obj) => {
                if (obj.inventorynumber == selectedInventoryNumber) {
                    obj.assigned = false;
                    return true;
                }
            });

            // Update the Unit to clear the Chassis Inventory Number
            this.units.findIndex((obj) => {
                if (obj.unit_chassisinvnum == selectedInventoryNumber) {
                    obj.unit_chassisinvnum = null;
                    obj.unit_chassisinvnum_id = null;
                }
            });
        },
    },
    computed: {
        // Filter the Inventory Numbers that are still available to select from
        filteredInventoryNumbers(){
            let inventoryNumbersList = this.inventoryNumbers.filter((number) => {
                return (number.item == this.selectedChassisItem) && (number.assigned != true);
            });
            // Don't show the Inventory Number table if there's no Number available
            if (inventoryNumbersList.length == 0) {
                $('#inventoryNumberTable').hide();
            }
            return inventoryNumbersList;
        },

        // Filter the Units that have an Inventory Number set by the user. 
        dirtyUnits() {
            let dirtyUnits = this.units.filter(function (unit) {
                let inventoryNumber = unit.unit_chassisinvnum || '';
                return inventoryNumber != '';
            });

            return dirtyUnits;
        },
    },
    mounted () {
        // Get the data for the form
        this.getAndDisplayFilters();
    }
}

const vueApp = Vue.createApp(appData);

vueApp.mount('#chassisched-app');