/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.ViewForm', {
	id: 'ra-viewWindow',
	extend: 'RA.Cmp.Window',
	width: 600,
	openWindow: function () {
		this.isAllocDefault = (Ext4.getCmp('savedFilters').getValue() === RA.App.Stores.savedFilters.getDefaultAllocationFilter());
		this.isCustomerDefault = (Ext4.getCmp('savedFilters').getValue() === RA.App.Stores.savedFilters.getDefaultCustomerFilter());
		this.isProjectDefault = (Ext4.getCmp('savedFilters').getValue() === RA.App.Stores.savedFilters.getDefaultProjectFilter());
		this.isAdd = this.isAllocDefault || this.isCustomerDefault || this.isProjectDefault;

		this.show();
	},
	prefix: translatedStrings.getText('WINDOW.NEW_FILTER_DEFAULT_NAME'),
	listeners: {
		beforeShow: function (window, eOpts) {
			var me = this;

			me.setTitle(translatedStrings.getText([
				'WINDOW.CUSTOMIZE_RESOURCE_FILTER',
				'WINDOW.CUSTOMIZE_CUSTOMER_FILTER',
				'WINDOW.CUSTOMIZE_PROJECT_FILTER'
			][RA.App.Filters.filter.data.viewByType - 1]));

			var savedFilterCombo = Ext4.getCmp('savedFilters');
			var readOnlyFields = [
				'advfilter-filtername', 'advfilter-sharefilter', 'advfilter-record1', 'advfilter-field1',
				'advfilter-record2', 'advfilter-field2', 'advfilter-record3', 'advfilter-field3',
				'advfilter-record4', 'advfilter-field4', 'advfilter-record5', 'advfilter-field5',
				'advfilter-record6', 'advfilter-field6', 'advfilter-record7', 'advfilter-field7',
				'advfilter-record8', 'advfilter-field8'
			];

			Ext4.getCmp('advfilter-save').show();
			Ext4.getCmp('advfilter-sharefilter').setBoxLabel(translatedStrings.getText('CHECKBOX.SHARE_THIS_FILTER'));

			for (var int = 0; int < readOnlyFields.length; int++) {
				Ext4.getCmp(readOnlyFields[int]).setReadOnly(false);
			}

			if (me.isAdd) {
				this.setDefaultFilters();
			} else {
				var filter = savedFilterCombo.getSelectedRecord();
				var filterName = filter.get('filterName');
				var isShared = filter.get('shared');

				Ext4.getCmp('advfilter-filtername').setValue(filterName);
				Ext4.getCmp('advfilter-sharefilter').setValue(isShared);

				for (int = 1; int <= 8; int++) {
					var record = filter.get('record' + int);

					if (record) {
						var field = filter.get('field' + int);
						if (RA.App.Stores.filterResourceFields.getById(field) || RA.App.Stores.filterAllocationFields.getById(field)) {
							Ext4.getCmp('advfilter-record' + int).setValue(record);
							Ext4.getCmp('advfilter-field' + int).setValue(field);
						}
					}
				}

				if (filter.get('owner').toString() === nlapiGetContext().getUser()) {
					Ext4.getCmp('advfilter-delete').show();
				} else {
					Ext4.getCmp('advfilter-save').hide();
					Ext4.getCmp('advfilter-delete').hide();
					Ext4.getCmp('advfilter-sharefilter').setBoxLabel(translatedStrings.getText('CHECKBOX.SHARED_FILTER'));

					for (var int = 0; int < readOnlyFields.length; int++) {
						Ext4.getCmp(readOnlyFields[int]).setReadOnly(true);
					}
				}
			}
			this.disableDefaultFilters();
		},
		hide: function (window, eOpts) {
			Ext4.getCmp('advfilter-filtername').reset();
			Ext4.getCmp('advfilter-sharefilter').reset();
			Ext4.getCmp('advfilter-record1').reset();
			Ext4.getCmp('advfilter-field1').reset();
			Ext4.getCmp('advfilter-field1').setDisabled(true);
			Ext4.getCmp('advfilter-record2').reset();
			Ext4.getCmp('advfilter-field2').reset();
			Ext4.getCmp('advfilter-field2').setDisabled(true);
			Ext4.getCmp('advfilter-record3').reset();
			Ext4.getCmp('advfilter-field3').reset();
			Ext4.getCmp('advfilter-field3').setDisabled(true);
			Ext4.getCmp('advfilter-record4').reset();
			Ext4.getCmp('advfilter-field4').reset();
			Ext4.getCmp('advfilter-field4').setDisabled(true);
			Ext4.getCmp('advfilter-record5').reset();
			Ext4.getCmp('advfilter-field5').reset();
			Ext4.getCmp('advfilter-field5').setDisabled(true);
			Ext4.getCmp('advfilter-record6').reset();
			Ext4.getCmp('advfilter-field6').reset();
			Ext4.getCmp('advfilter-field6').setDisabled(true);
			Ext4.getCmp('advfilter-record7').reset();
			Ext4.getCmp('advfilter-field7').reset();
			Ext4.getCmp('advfilter-field7').setDisabled(true);
			Ext4.getCmp('advfilter-record8').reset();
			Ext4.getCmp('advfilter-field8').reset();
			Ext4.getCmp('advfilter-field8').setDisabled(true);
			Ext4.getCmp('advfilter-filtername').setReadOnly(false);
			Ext4.getCmp('advfilter-sharefilter').setReadOnly(false);
			Ext4.getCmp('advfilter-record1').setReadOnly(false);
			Ext4.getCmp('advfilter-field1').setReadOnly(false);
			Ext4.getCmp('advfilter-record2').setReadOnly(false);
			Ext4.getCmp('advfilter-field2').setReadOnly(false);
			Ext4.getCmp('advfilter-record3').setReadOnly(false);
			Ext4.getCmp('advfilter-field3').setReadOnly(false);
			Ext4.getCmp('advfilter-record4').setReadOnly(false);
			Ext4.getCmp('advfilter-field4').setReadOnly(false);
			Ext4.getCmp('advfilter-record5').setReadOnly(false);
			Ext4.getCmp('advfilter-field5').setReadOnly(false);
			Ext4.getCmp('advfilter-record6').setReadOnly(false);
			Ext4.getCmp('advfilter-field6').setReadOnly(false);
			Ext4.getCmp('advfilter-record7').setReadOnly(false);
			Ext4.getCmp('advfilter-field7').setReadOnly(false);
			Ext4.getCmp('advfilter-record8').setReadOnly(false);
			Ext4.getCmp('advfilter-field8').setReadOnly(false);
			Ext4.getCmp('advfilter-owner').hide();
		}
	},
	items: [
		Ext4.create('RA.Cmp.FormPanel', {
			id: 'ra-viewWindowPanel',
			items: [
				Ext4.create('RA.Cmp.Text', {
					id: 'advfilter-filtername',
					fieldLabel: translatedStrings.getText('TEXT.FILTER_NAME'),
					allowBlank: false
				}),
				Ext4.create('RA.Cmp.Space'),
				Ext4.create('RA.Cmp.CheckBox', {
					id: 'advfilter-sharefilter',
					boxLabel: translatedStrings.getText('CHECKBOX.SHARE_THIS_FILTER')
				}),
				Ext4.create('RA.Cmp.Space'),
				Ext4.create('RA.Cmp.Display', {
					id: 'advfilter-owner',
					fieldLabel: translatedStrings.getText('DISPLAY.OWNER'),
					allowBlank: true,
					hidden: true
				}),
				Ext4.create('RA.Cmp.Space'),
				Ext4.create('Ext4.form.FieldSet', {
					title: translatedStrings.getText('FIELDSET.AVAILABLE_FILTERS'),
					layout: 'anchor',
					border: false,
					padding: 0,
					items: [
						Ext4.create('RA.Cmp.Space'),
						Ext4.create('Ext4.container.Container', {
							id: 'advfilter-filtertable',
							setCombobox: function (newValue, index) {
								var comboId = 'advfilter-field' + index;
								Ext4.getCmp(comboId).reset();
								if (newValue === RA.App.Constant.NONE) {
									Ext4.getCmp(comboId).setDisabled(true);
								} else if (newValue === RA.App.Constant.RESOURCE) {
									Ext4.getCmp(comboId).setDisabled(false);
									Ext4.getCmp(comboId).bindStore(RA.App.Stores.filterResourceFields);
								} else if (newValue === RA.App.Constant.ALLOCATION) {
									Ext4.getCmp(comboId).setDisabled(false);
									Ext4.getCmp(comboId).bindStore(RA.App.Stores.filterAllocationFields);
								}
							},
							layout: {
								type: 'table',
								columns: 2,
								tableAttrs: {
									style: {
										width: '100%'
									}
								}
							},
							items: [
								{
									title: translatedStrings.getText('PANEL.COLUMN.RECORD'),
									id: 'advfilter-filtertable-headerrecord',
									cls: 'racg-filter-popup-header'
								}, {
									title: translatedStrings.getText('PANEL.COLUMN.FIELD_NAME'),
									id: 'advfilter-filtertable-headerfield',
									cls: 'racg-filter-popup-header'
								}, (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-record1',
									width: '100%',
									store: RA.App.Stores.filterRecordStore,
									valueField: 'id',
									listeners: {
										change: function (combobox, newValue, oldValue) {
											Ext4.getCmp('advfilter-filtertable').setCombobox(newValue, 1);
										}
									}
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-field1',
									width: '100%',
									disabled: true,
									valueField: 'id'
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-record2',
									width: '100%',
									store: RA.App.Stores.filterRecordStore,
									valueField: 'id',
									listeners: {
										change: function (combobox, newValue, oldValue) {
											Ext4.getCmp('advfilter-filtertable').setCombobox(newValue, 2);
										}
									}
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-field2',
									width: '100%',
									disabled: true,
									valueField: 'id'
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-record3',
									width: '100%',
									store: RA.App.Stores.filterRecordStore,
									valueField: 'id',
									listeners: {
										change: function (combobox, newValue, oldValue) {
											Ext4.getCmp('advfilter-filtertable').setCombobox(newValue, 3);
										}
									}
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-field3',
									width: '100%',
									disabled: true,
									valueField: 'id'
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-record4',
									width: '100%',
									store: RA.App.Stores.filterRecordStore,
									valueField: 'id',
									listeners: {
										change: function (combobox, newValue, oldValue) {
											Ext4.getCmp('advfilter-filtertable').setCombobox(newValue, 4);
										}
									}
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-field4',
									width: '100%',
									disabled: true,
									valueField: 'id'
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-record5',
									width: '100%',
									store: RA.App.Stores.filterRecordStore,
									valueField: 'id',
									listeners: {
										change: function (combobox, newValue, oldValue) {
											Ext4.getCmp('advfilter-filtertable').setCombobox(newValue, 5);
										}
									}
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-field5',
									width: '100%',
									disabled: true,
									valueField: 'id'
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-record6',
									width: '100%',
									store: RA.App.Stores.filterRecordStore,
									valueField: 'id',
									listeners: {
										change: function (combobox, newValue, oldValue) {
											Ext4.getCmp('advfilter-filtertable').setCombobox(newValue, 6);
										}
									}
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-field6',
									width: '100%',
									disabled: true,
									valueField: 'id'
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-record7',
									width: '100%',
									store: RA.App.Stores.filterRecordStore,
									valueField: 'id',
									listeners: {
										change: function (combobox, newValue, oldValue) {
											Ext4.getCmp('advfilter-filtertable').setCombobox(newValue, 7);
										}
									}
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-field7',
									width: '100%',
									disabled: true,
									valueField: 'id'
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-record8',
									width: '100%',
									store: RA.App.Stores.filterRecordStore,
									valueField: 'id',
									listeners: {
										change: function (combobox, newValue, oldValue) {
											Ext4.getCmp('advfilter-filtertable').setCombobox(newValue, 8);
										}
									}
								})), (Ext4.create('RA.Cmp.ComboBox', {
									id: 'advfilter-field8',
									width: '100%',
									disabled: true,
									valueField: 'id'
								}))
							]
						})
					]
				})
			],
			dockedItems: [
				{
					xtype: 'raformmenu',
					items: [
						Ext4.create('RA.Cmp.BlueButton', {
							text: translatedStrings.getText('BUTTON.SAVE'),
							id: 'advfilter-save',
							formBind: true,
							handler: function () {
								perfTestLogger.start('Save View');
								var savedFilterCombo = Ext4.getCmp('savedFilters');
								var savedFilterStore = savedFilterCombo.getStore();
								var form = RA.App.Forms.viewForm;
								var filterRecord = null;

								var shared = Ext4.getCmp('advfilter-sharefilter').getValue();
								var filterName = Ext4.getCmp('advfilter-filtername').getValue();
								if (savedFilterStore.isNameSameAsDefault(filterName, form.isAdd)) {
									alert(translatedStrings.getText('MESSAGE.ERROR.DEFAULT_NOT_ALLOWED'));
									return;
								}
								if (savedFilterStore.isNameExists(filterName, form.isAdd, savedFilterCombo.getValue())) {
									alert(translatedStrings.getText('MESSAGE.ERROR.DUPLICATE_NAME'));
									return;
								}
								var dataObject = {};
								dataObject.record1 = Ext4.getCmp('advfilter-record1').getValue();
								dataObject.field1 = Ext4.getCmp('advfilter-field1').getValue();
								dataObject.record2 = Ext4.getCmp('advfilter-record2').getValue();
								dataObject.field2 = Ext4.getCmp('advfilter-field2').getValue();
								dataObject.record3 = Ext4.getCmp('advfilter-record3').getValue();
								dataObject.field3 = Ext4.getCmp('advfilter-field3').getValue();
								dataObject.record4 = Ext4.getCmp('advfilter-record4').getValue();
								dataObject.field4 = Ext4.getCmp('advfilter-field4').getValue();
								dataObject.record5 = Ext4.getCmp('advfilter-record5').getValue();
								dataObject.field5 = Ext4.getCmp('advfilter-field5').getValue();
								dataObject.record6 = Ext4.getCmp('advfilter-record6').getValue();
								dataObject.field6 = Ext4.getCmp('advfilter-field6').getValue();
								dataObject.record7 = Ext4.getCmp('advfilter-record7').getValue();
								dataObject.field7 = Ext4.getCmp('advfilter-field7').getValue();
								dataObject.record8 = Ext4.getCmp('advfilter-record8').getValue();
								dataObject.field8 = Ext4.getCmp('advfilter-field8').getValue();
								if (savedFilterStore.hasNoneRecord(dataObject) || savedFilterStore.hasNoSelection(dataObject)) {
									alert(translatedStrings.getText('MESSAGE.ERROR.NO_SELECTED_FILTER_FIELDS'));
									return;
								}
								if (savedFilterStore.hasBlankField(dataObject)) {
									alert(translatedStrings.getText('MESSAGE.ERROR.BLANK_FILTER_FIELD'));
									return;
								}
								if (savedFilterStore.hasDuplicateFilterFields(dataObject)) {
									alert(translatedStrings.getText('MESSAGE.ERROR.DUPLICATE_FILTER_FIELD'));
									return;
								}
								if (form.isAdd) {
									filterRecord = Ext4.create('RA.Cmp.Model.NewFilter');
								} else {
									filterRecord = savedFilterCombo.getSelectedRecord();
									filterRecord.beginEdit();
								}
								filterRecord.set('name', filterName);
								filterRecord.set('filterName', filterName);
								filterRecord.set('shared', shared);
								filterRecord.set('owner', nlapiGetContext().user);
								filterRecord.set('record1', dataObject.record1);
								filterRecord.set('field1', dataObject.field1);
								filterRecord.set('record2', dataObject.record2);
								filterRecord.set('field2', dataObject.field2);
								filterRecord.set('record3', dataObject.record3);
								filterRecord.set('field3', dataObject.field3);
								filterRecord.set('record4', dataObject.record4);
								filterRecord.set('field4', dataObject.field4);
								filterRecord.set('record5', dataObject.record5);
								filterRecord.set('field5', dataObject.field5);
								filterRecord.set('record6', dataObject.record6);
								filterRecord.set('field6', dataObject.field6);
								filterRecord.set('record7', dataObject.record7);
								filterRecord.set('field7', dataObject.field7);
								filterRecord.set('record8', dataObject.record8);
								filterRecord.set('field8', dataObject.field8);
								filterRecord.set('viewByType', RA.App.Filters.filter.data.viewByType);

								if (!form.isAdd) {
									filterRecord.endEdit();
								} else {
									savedFilterStore.add(filterRecord);
								}

								//check if used the counter
								if (filterName == form.prefix + ' ' + RA.App.Settings.get('filterNameCounter')) {
									var settingRecord = RA.App.Settings;
									settingRecord.beginEdit();
									settingRecord.set('filterNameCounter', settingRecord.get('filterNameCounter') + 1);
									settingRecord.endEdit();
									settingRecord.setDirty(true);
									RA.App.Stores.settingStore.sync();
								}
								savedFilterStore.sync({
									success: function (batch) {
										var savedFilterCombo = Ext4.getCmp('savedFilters');

										savedFilterCombo.store.load({
											callback: function () {
												savedFilterCombo.setValue(filterRecord.get('id'));

												if (!form.isAdd) {
													RA.App.Filters.applySelectedFilter();
												}
											}
										});
									},
									failure: function () {
										if (RA.App.Forms.viewForm.isAdd) {
											savedFilterStore.remove(filterRecord);
										} else {
											filterRecord.reject();
										}
									}
								});
								form.hide();
							}
						}), Ext4.create('RA.Cmp.GrayButton', {
							id: 'advFilter-cancel',
							text: translatedStrings.getText('BUTTON.CANCEL'),
							handler: function () {
								RA.App.Forms.viewForm.hide();
							}
						}), Ext4.create('RA.Cmp.GrayButton', {
							id: 'advfilter-delete',
							text: translatedStrings.getText('BUTTON.DELETE'),
							handler: function () {
								if (confirm(translatedStrings.getText('MESSAGE.WARNING.DELETE_THIS_FILTER'))) {
									perfTestLogger.start('Delete View');
									var savedFilterCombo = Ext4.getCmp('savedFilters');
									var savedFilterStore = savedFilterCombo.getStore();
									var filterRecord = savedFilterCombo.getSelectedRecord();
									var filterValuesStore = RA.App.Stores.filterValues;
									var filterValuesOfSelectedFilter = filterValuesStore.query('filterId', filterRecord.getId());
									filterValuesOfSelectedFilter.each(function (item, index, len) {
										item.beginEdit();
										item.set('isDelete', true);
										item.endEdit();
										filterValuesStore.sync();
										filterValuesStore.remove(item);
									});
									filterRecord.beginEdit();
									filterRecord.set('isDelete', true);
									filterRecord.endEdit();
									savedFilterStore.sync();
									savedFilterStore.remove(filterRecord);
									switch (RA.App.Filters.filter.data.viewByType) {
										default:
										case 1:
											savedFilterCombo.select(savedFilterStore.getDefaultAllocationFilter());
											break;
										case 2:
											savedFilterCombo.select(savedFilterStore.getDefaultCustomerFilter());
											break;
										case 3:
											savedFilterCombo.select(savedFilterStore.getDefaultProjectFilter());
											break;
									}

									RA.App.Forms.viewForm.hide();
								}
							}
						})
					]
				}
			]
		})
	],
	setDefaultFilters: function () {
		var me = this;

		Ext4.getCmp('advfilter-filtername').setValue(me.prefix + ' ' + RA.App.Settings.data.filterNameCounter);
		Ext4.getCmp('advfilter-delete').hide();
		if (me.isAllocDefault) {
			Ext4.getCmp('advfilter-record1').setValue(RA.App.Constant.RESOURCE);
			Ext4.getCmp('advfilter-field1').setValue('name');
			Ext4.getCmp('advfilter-record2').setValue(RA.App.Constant.RESOURCE);
			Ext4.getCmp('advfilter-field2').setValue('type');
			Ext4.getCmp('advfilter-record3').setValue(RA.App.Constant.ALLOCATION);
			Ext4.getCmp('advfilter-field3').setValue('allocationtype');
			Ext4.getCmp('advfilter-record4').setValue(RA.App.Constant.ALLOCATION);
			Ext4.getCmp('advfilter-field4').setValue('allocationlevel');
			Ext4.getCmp('advfilter-record5').setValue(RA.App.Constant.ALLOCATION);
			Ext4.getCmp('advfilter-field5').setValue('startdate');
		} else if (me.isCustomerDefault) {
			Ext4.getCmp('advfilter-record1').setValue(RA.App.Constant.ALLOCATION);
			Ext4.getCmp('advfilter-field1').setValue('customer');
			Ext4.getCmp('advfilter-record2').setValue(RA.App.Constant.ALLOCATION);
			Ext4.getCmp('advfilter-field2').setValue('project');
			Ext4.getCmp('advfilter-record3').setValue(RA.App.Constant.RESOURCE);
			Ext4.getCmp('advfilter-field3').setValue('name');
			Ext4.getCmp('advfilter-record4').setValue(RA.App.Constant.ALLOCATION);
			Ext4.getCmp('advfilter-field4').setValue('startdate');
		} else if (me.isProjectDefault) {
			Ext4.getCmp('advfilter-record1').setValue(RA.App.Constant.ALLOCATION);
			Ext4.getCmp('advfilter-field1').setValue('project');
			Ext4.getCmp('advfilter-record2').setValue(RA.App.Constant.RESOURCE);
			Ext4.getCmp('advfilter-field2').setValue('name');
			Ext4.getCmp('advfilter-record3').setValue(RA.App.Constant.ALLOCATION);
			Ext4.getCmp('advfilter-field3').setValue('startdate');
		}
	},
	disableDefaultFilters: function () {
		var me = this;

		if (me.isCustomerDefault) {
			Ext4.getCmp('advfilter-record1').setReadOnly(true);
			Ext4.getCmp('advfilter-field1').setReadOnly(true);
			Ext4.getCmp('advfilter-record2').setReadOnly(true);
			Ext4.getCmp('advfilter-field2').setReadOnly(true);
			Ext4.getCmp('advfilter-record3').setReadOnly(true);
			Ext4.getCmp('advfilter-field3').setReadOnly(true);
		} else if (me.isProjectDefault) {
			Ext4.getCmp('advfilter-record1').setReadOnly(true);
			Ext4.getCmp('advfilter-field1').setReadOnly(true);
			Ext4.getCmp('advfilter-record2').setReadOnly(true);
			Ext4.getCmp('advfilter-field2').setReadOnly(true);
		}
	}
});