/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.FiltersPanel', {
	extend: 'RA.Cmp.MainPanel',
	id: 'advFilterMain',
	minWidth: 100,
	layout: 'auto',
	items: [
		Ext4.create('RA.Cmp.Panel', {
			id: 'ra-view-controls-row',
            hidden: RA.Util.Dashboard.isActive(),
			items: [
				Ext4.create('RA.Cmp.ComboBox', {
					id: 'savedFilters',
					fieldLabel: translatedStrings.getText('COMBOBOX.FILTER'),
					emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.VIEW'),
					labelAlign: 'left',
					shrinkWrap: true,
					store: RA.App.Stores.savedFilters,
					lastSelectedFilter: null,
					width: 250,
					value: 0,
					labelWidth: RA.Util.TextMetrics.getMetrics('14px').getSize(translatedStrings.getText('COMBOBOX.FILTER')).width + 10,
					tpl: Ext4.create('Ext4.XTemplate',
						'<tpl for=".">',
						'<div class="x4-boundlist-item ra-filter-default-{isDefault}">{name}</div>',
						'</tpl>'
					),
					saveSelectedFilter: function () {
						var settings = RA.App.Settings;
						var filterId = this.getSelectedRecord().get('id');

						if (settings.get('selectedFilter') != filterId) {
							settings.beginEdit();
							settings.set('selectedFilter', filterId);
							settings.set('expandedAllocations', '');
							settings.endEdit();

							RA.App.Stores.settingStore.sync({
								success: function () {
									RA.App.Filters.applySelectedFilter();
									RA.App.Grid.updateColumns();
								},
								failure: function () {
									console.log('ERROR: Failed to sync selected filter');
								}
							});
						} else {
							RA.App.Filters.applySelectedFilter();
						}
					},
					logFilterChange: function (newId, newName, newType) {
						var newFilter = {
							id: newId,
							name: newName,
							type: newType
						};
						if (this.lastSelectedFilter === null) {
							RA.Util.CustomFunctions.logIntoElasticSearch(
								'[PSA] RACG initial filter type is "' + newFilter.name + '"',
								{
									RACG_user: RA.App.Context.context.name,
									RACG_email: RA.App.Context.context.email,
									RACG_company: RA.App.Context.context.company,
									RACG_initial_filter_type: newFilter.name
								}
							);
						} else {
							if (newFilter.type !== this.lastSelectedFilter.type) {
								var filterArr = RA.App.Stores.savedFilters.data.map;
								var oldFilterTypeName = filterArr[this.lastSelectedFilter.type].data.name;
								var newFilterTypeName = filterArr[newFilter.type].data.name;
								RA.Util.CustomFunctions.logIntoElasticSearch(
									'[PSA] RACG filter type base changed from "' + oldFilterTypeName + '" to "' + newFilterTypeName + '"',
									{
										RACG_user: RA.App.Context.context.name,
										RACG_email: RA.App.Context.context.email,
										RACG_company: RA.App.Context.context.company,
										RACG_old_filter_type_base: oldFilterTypeName,
										RACG_new_filter_type_base: newFilterTypeName
									}
								);
							}
							if (newFilter.id !== this.lastSelectedFilter.id) {
								RA.Util.CustomFunctions.logIntoElasticSearch(
									'[PSA] RACG filter type changed from "' + this.lastSelectedFilter.name + '" to "' + newFilter.name + '"',
									{
										RACG_user: RA.App.Context.context.name,
										RACG_email: RA.App.Context.context.email,
										RACG_company: RA.App.Context.context.company,
										RACG_old_filter_type: this.lastSelectedFilter.name,
										RACG_new_filter_type: newFilter.name
									}
								);
							}
						}
						this.lastSelectedFilter = newFilter;
					},
					listeners: {
						beforerender: function (combo) {
							//combo.getStore().getById(0).set('name', translatedStrings.getText('STORE.DEFAULT')); //'- Default -'
						},
						change: function (combobox) {
							combobox.saveSelectedFilter();
							Ext4.getCmp('btnEditFilter').updateButtonText();
							this.logFilterChange(combobox.lastSelection[0].data.id, combobox.lastSelection[0].data.name, combobox.lastSelection[0].data.viewByType);
						},
						show: function (combobox) {
							var store = combobox.getStore();
							var filterId = RA.App.Settings.get('selectedFilter');

							store.clearFilter(true);
							store.setDefaultFilterNames();

							if (store.findRecord('id', filterId)) {
								combobox.setValue(filterId);
							} else {
								combobox.setValue(RA.App.Stores.savedFilters.getDefaultAllocationFilter());
							}
						}
					}
				}),
				Ext4.create('RA.Cmp.GrayButton', {
					text: translatedStrings.getText('BUTTON.CUSTOMIZE'),
					id: 'btnEditFilter',
                    hidden: RA.Util.Dashboard.isActive(),
					updateButtonText: function () {
						var filterId = Ext4.getCmp('savedFilters').getValue();

						if (RA.App.Stores.savedFilters.getAllDefaultFilter().indexOf(filterId) >= 0) {
							this.setText(translatedStrings.getText('BUTTON.CUSTOMIZE'));
						} else {
							var filterRecord = Ext4.getCmp('savedFilters').getSelectedRecord();

							if (filterRecord.get('shared') && filterRecord.get('owner') != nlapiGetContext().user) {
								this.setText(translatedStrings.getText('BUTTON.FILTER_DETAILS'));
							} else {
								this.setText(translatedStrings.getText('BUTTON.EDIT_FILTER'));
							}
						}
					},
					handler: function () {
						RA.App.Forms.viewForm.openWindow();
					}
				})
			]
		}),
		Ext4.create('Ext4.panel.Panel', {
			border: true,
			id: 'advfilter-summary',
			margin: 0,
			items: [
				Ext4.create('Ext4.panel.Panel', {
					border: false,
					id: 'advfilter-filterHeader',
					layout: {
						type: 'hbox',
						align: 'middle'
					},
					height: 26,
					defaults: {
						margin: '0 18 0 0'
					},
					items: [
						Ext4.create('RA.Cmp.ToggleFilter', {
							id: 'racview-filter-link'
						})
					]
				}), Ext4.create('Ext4.panel.Panel', {
					border: false,
					id: 'advfilter-filterBody',
					hideMode: 'display',
					layout: 'column',
					style: {
						'background-color': 'white'
					},
					defaults: {
						margin: '5 20 5 15',
					},
					items: []
				})
			]
		})
	],
	fieldIdMap: {
		name: {
			xtype: 'ra-filter-resource',
			id: 'filter-resource'
		},
		department: {
			xtype: 'ra-filter-department',
			id: 'filter-department'
		},
		classification: {
			xtype: 'ra-filter-class',
			id: 'filter-class'
		},
		location: {
			xtype: 'ra-filter-location',
			id: 'filter-location'
		},
		billingclass: {
			xtype: 'ra-filter-billingclass',
			id: 'filter-billingclass'
		},
		subsidiary: {
			xtype: 'ra-filter-subsidiary',
			id: 'filter-subsidiary'
		},
		isperson: {
			xtype: 'ra-multiselect',
			id: 'filter-vendor-type',
			fieldLabel: translatedStrings.getText('COMBOBOX.VENDOR_TYPE'),
			store: RA.App.Stores.vendorType,
			queryMode: 'local'
		},
		vendorcategory: {
			xtype: 'ra-multiselect',
			id: 'filter-vendor-category',
			fieldLabel: translatedStrings.getText('COMBOBOX.VENDOR_CATEGORY'),
			store: RA.App.Stores.vendorCategory
		},
		type: {
			xtype: 'ra-filter-combo-box',
			id: 'filter-resource-type',
			fieldLabel: translatedStrings.getText('COMBOBOX.RESOURCE_TYPE'),
			store: RA.App.Stores.filterResourceType
		},
		project: {
			xtype: 'ra-filter-project',
			id: 'filter-project',
            hidden: RA.Util.Dashboard.isActive(),
		},
		customer: {
			xtype: 'ra-filter-customer',
			id: 'filter-customer',
		},
		projecttask: {
			xtype: 'ra-filter-projecttask',
			id: 'filter-projecttask',
		},
		allocationlevel: {
			xtype: 'ra-multiselect',
			id: 'filter-allocation-level',
			fieldLabel: translatedStrings.getText('COMBOBOX.ALLOCATION_LEVEL'),
			store: RA.App.Stores.filterAllocLevel,
			queryMode: 'local'
		},
		allocationtype: {
			xtype: 'ra-multiselect',
			id: 'filter-allocation-type',
			fieldLabel: translatedStrings.getText('COMBOBOX.ALLOCATION_TYPE'),
			store: RA.App.Stores.allocTypeStore,
			queryMode: 'local'
		},
		approvalstatus: {
			xtype: 'ra-multiselect',
			id: 'filter-approval-status',
			fieldLabel: translatedStrings.getText('COMBOBOX.APPROVAL_STATUS'),
			store: RA.App.Stores.appStatusStore,
			queryMode: 'local'
		},
		startdate: {
			xtype: 'datefield',
			id: 'filter-start-date',
			startDay: '' + RA.Util.CustomFunctions.getWeekStart(),
			fieldLabel: translatedStrings.getText('DATE.START_DATE'),
			labelAlign: 'top',
			labelSeparator: '',
			format: convertNSDateFormat(),
			listeners: {
				change: function () {
					var nsDateFormat = convertNSDateFormat();
					if (this.value === null) {
						alert(translatedStrings.getText('MESSAGE.EMPTYTEXT.DATE'));
						this.setValue(Ext4.Date.format(new Date(), nsDateFormat));
					} else if (!Ext4.Date.format(this.value, nsDateFormat)) {
						alert(translatedStrings.getText('MESSAGE.ERROR.DATE') + ' (' + nsDateFormat + ')');
						this.setValue(Ext4.Date.format(new Date(), nsDateFormat));
					}

					RA.App.Filters.saveFilterValuesTask.delay(1000);
				}
			}
		}
	},
	applySelectedFilter: function () {
		this.filter = Ext4.getCmp('savedFilters').getSelectedRecord();

		this.initFilterFields();
		this.loadFilterValues();
	},
	initFilterFields: function () {
		this.resetFilterFields();
		this.suspendedFields = [];
		var segtypes = RA.App.Stores.resourceSegmentTypes.data.items;
		for (var i = 0; i < segtypes.length; i++) {
			this.fieldIdMap[segtypes[i].data.id] = {
				xtype: 'ra-multiselect',
				id: 'filter-' + segtypes[i].data.id,
				fieldLabel: segtypes[i].data.name,
				store: RA.App.Stores.singleSegmentValues[segtypes[i].data.id]
			};
		}

		for (var i = 1; i <= 8; i++) {
			var field = this.filter.get('field' + i);
			var record = this.filter.get('record' + i);

			if (field && field != '' && this.isFieldEnabled(record, field)) {
				this.filterFields.push(field);
				Ext4.getCmp('advfilter-filterBody').add(this.fieldIdMap[field]);
			}
		}

		Ext4.getCmp('advfilter-filterBody').doLayout();
		Ext4.getCmp('advFilterMain').disableFilter();
	},
	isFieldEnabled: function (record, field) {
		if (record === RA.App.Constant.RESOURCE && RA.App.Stores.filterResourceFields.getById(field)) {
			return true;
		} else if (record === RA.App.Constant.ALLOCATION && RA.App.Stores.filterAllocationFields.getById(field)) {
			return true;
		} else {
			return false;
		}
	},
	resetFilterFields: function () {
		this.filterFields = [];
		Ext4.getCmp('advfilter-filterBody').removeAll();
	},
	clearFilterFields: function () {
		/*
		 * for automation only
		 */

		for (i in this.fieldIdMap) {
			var field = Ext4.getCmp(this.fieldIdMap[i].id);

			if (field) {
				field.suspendEvents();
				field.setValue(null);
				field.resumeEvents();
			}
		}
	},
	loadFilterValues: function () {
		var filterId = this.filter.get('id');
		var owner = this.filter.get('owner');
		var isDefault = this.filter.get('isDefault');

		var filterValuesIndex = RA.App.Stores.filterValues.findBy(function (filterValues) {
			return filterValues.get('filterId') == filterId && filterValues.get('owner') == (isDefault
																							 ? nlapiGetContext().user
																							 : owner);
		});

		this.filterValuesRecord = RA.App.Stores.filterValues.getAt(filterValuesIndex);

		if (this.filterValuesRecord) {
			var filterValuesJson = this.filterValuesRecord.get('filterValuesJson');

			if (filterValuesJson['startdate'] === '') {
				filterValuesJson['startdate'] = Ext4.Date.format(new Date(), 'Y/m/d');
			}

			this.setFilterFields(filterValuesJson, false);
			this.removeDisabledFilterValues(filterValuesJson);
		} else {
			this.filterValuesRecord = this.createNewFilterValuesRecord(filterId);
			RA.App.Stores.filterValues.add(this.filterValuesRecord);
			this.setFilterFields(this.filterValuesRecord.data.filterValuesJson, false);
		}

		// set default values to default filters only
		if (isDefault) {
			this.setDefaultFilterValues();
		}

		this.applyFilterValues();
	},
	setFilterFields: function (filterValuesJson, isDefault) {
		for (var i in this.filterFields) {
			var field = this.filterFields[i];
			var fieldValue = filterValuesJson[field];
			var fieldCmp = Ext4.getCmp(this.fieldIdMap[field].id);

            if (RA.Util.Dashboard.isActive() && field === 'project') {
                fieldValue = RA.Util.Dashboard.getProjectId();
            }
			// if isDefault, set values only if there is no currently selected value
			if (!isDefault || (fieldCmp && !fieldCmp.getValue())) {
				if (field === 'startdate') {
					fieldValue = (fieldValue) ? Ext4.Date.parse(fieldValue, 'Y/m/d') : new Date();
				}

				if (fieldValue) {
					fieldCmp.suspendEvents();
					fieldCmp.setValue(fieldValue);
					if (isDefault) {
						fieldCmp.resumeEvents();
					} else {
						this.suspendedFields.push(fieldCmp);
					}

					if (isDefault) {
						this.filterValuesRecord.beginEdit();
						this.filterValuesRecord.get('filterValuesJson')[field] = fieldValue;
						this.filterValuesRecord.endEdit();
					}
				}
			}
		}
	},
	setDefaultFilterValues: function () {
		var fieldValueMap = {
			startdate: Ext4.Date.format(new Date(), 'Y/m/d'),
			customer: [],
			project: [],
			name: []
		};

		this.setFilterFields(fieldValueMap, true);
	},
	removeDisabledFilterValues: function (filterValuesJson) {
		var filterValues = filterValuesJson;
		for (var filterValue in filterValues) {
			if (this.filterFields.indexOf(filterValue) === -1) {
				delete filterValues[filterValue];
			}
		}
		this.filterValuesRecord.beginEdit();
		this.filterValuesRecord.set('filterValuesJson', filterValues);
		this.filterValuesRecord.endEdit();
		this.filterValuesRecord.setDirty();
		RA.App.Stores.filterValues.sync();
	},
	createNewFilterValuesRecord: function (filterId) {
		var filterValuesJson = {};

		for (var i in this.filterFields) {
			filterValuesJson[this.filterFields[i]] = (this.filterFields[i] === 'startdate') ? Ext4.Date.format(new Date(), 'Y/m/d') : null;
		}

		return Ext4.create('RA.Cmp.Model.FilterValues', {
			internalId: -1,
			filterId: filterId,
			filterValuesJson: filterValuesJson,
			owner: nlapiGetContext().user
		});
	},
	autoSaveFilter: true,
	saveFilterValuesTask: new Ext4.util.DelayedTask(function () {
		if (RA.App.Filters.autoSaveFilter) {
			RA.App.Filters.saveFilterValues();
		}
	}),
	applySelectedToJson: function () {
		var filterValuesJson = this.filterValuesRecord.get('filterValuesJson');

		for (i in this.filterFields) {
			var fieldValue = Ext4.getCmp(this.fieldIdMap[this.filterFields[i]].id).getValue();

			// special case for date field; convert to string first
			if (this.filterFields[i] == 'startdate') {
				fieldValue = Ext4.Date.format(fieldValue, 'Y/m/d');
			}

			filterValuesJson[this.filterFields[i]] = fieldValue;
		}

		this.filterValuesRecord.beginEdit();
		this.filterValuesRecord.set('filterValuesJson', filterValuesJson);
		this.filterValuesRecord.endEdit();
		this.filterValuesRecord.setDirty();
	},
	saveFilterValues: function () {
		var that = this;
		var oldFilterValues = JSON.stringify(this.filterValuesRecord.get('filterValuesJson'));

		RA.App.PerfTestLogger.start('Update Filters');
		this.disableFilter();

		this.applySelectedToJson();

		RA.App.Stores.filterValues.sync({
			success: function (batch) {
				var recordId = batch.proxy.getReader().jsonData.recordId;

				RA.App.Filters.filterValuesRecord.set('internalId', recordId);
				RA.App.Filters.applyFilterValues();

				RA.Util.CustomFunctions.logIntoElasticSearch(
					'[PSA] RACG filters have been changed',
					{
						RACG_user: RA.App.Context.context.name,
						RACG_email: RA.App.Context.context.email,
						RACG_company: RA.App.Context.context.company,
						RACG_old_filter_data: oldFilterValues,
						RACG_new_filter_data: JSON.stringify(that.filterValuesRecord.get('filterValuesJson'))
					}
				);
			},
			failure: function () {
				alert(translatedStrings.getText('MESSAGE.ERROR.UNABLE_TO_SAVE_FILTERS'));
			}
		});
	},
	applyFilterValues: function () {
		RA.App.Stores.chartResource.loadWithFilters(RA.App.Constant.LOAD_MODE_RELOAD, this.filterValuesRecord.get('filterValuesJson'));
	},
	enableFilter: function () {
		Ext4.getCmp('savedFilters').enable();
		Ext4.getCmp('btnEditFilter').enable();

		if (!this.filter.get('shared') || this.filter.get('owner') == nlapiGetContext().user) {
			for (i in this.filterFields) {
                var id = this.fieldIdMap[this.filterFields[i]].id;
                Ext4.getCmp(id).enable();
			}
		}

		for (i in this.suspendedFields) {
			this.suspendedFields[i].resumeEvents();
		}
	},
	disableFilter: function () {
		Ext4.getCmp('savedFilters').disable();
		Ext4.getCmp('btnEditFilter').disable();

		for (i in this.filterFields) {
			Ext4.getCmp(this.fieldIdMap[this.filterFields[i]].id).disable();
		}
	}
});