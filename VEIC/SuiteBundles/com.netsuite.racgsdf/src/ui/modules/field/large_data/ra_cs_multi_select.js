/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.LargeDataCombo.MultiSelect', {
	extend: 'RA.Cmp.FlexFieldContainer',
	layout: 'hbox',
	parentType: 'FilterPanel', //Used in ra_cs_form_large_multiselect
	initComponent: function (args) {
		this.callParent(args);
		this.add(this.getItems());
		this.initSize();
	},
	isLargeData: function () {
		return this.isMax;
	},
	initSize: function () {
		var me = this;

		me.isMax = me.getTotal() >= Number(RA.App.Context.getPreference('MAXDROPDOWNSIZE'));
		/*
		 * small data
		 */
		me.smallDataCombo.allowBlank = me.isMax || me.allowBlank;
		me.smallDataCombo[me.isMax ? 'disable' : 'enable']();
		me.smallDataCombo[me.isMax ? 'hide' : 'show']();

		/*
		 * large data
		 */
		me.largeDataName[!me.isMax ? 'disable' : 'enable']();
		me.largeDataName[!me.isMax ? 'hide' : 'show']();
		me.largeDataBtn[!me.isMax ? 'disable' : 'enable']();
		me.largeDataBtn[!me.isMax ? 'hide' : 'show']();

		/*
		 * events
		 */
		if (me.comboOnChange) {
			me.getField().on('change', me.comboOnChange, me.getField());
		}
		if (me.comboOnBlur) {
			me.getField().on('blur', me.comboOnBlur, me.getField());
		}
		if (me.comboOnSelect) {
			me.getField().on(me.isMax ? 'change' : 'select', me.comboOnSelect, me.getField());
		}
	},
	getTotal: function () {
		var dataCount = RA.App.Stores.dataCount.getById(this.recordType);

		if (dataCount) {
			if (this.recordType == 'projecttask') {
				return this.countProjectTask(dataCount);
			} else {
				return dataCount.get('count');
			}
		}

		return 0;
	},
	countProjectTask: function (dataCount) {
		var obj = dataCount.get('countBy');
		var total = 0;
		for (var key in obj) {
			total += (+obj[key]);
		}
		return total;
	},
	enable: function () {
		this.getField().enable();
		this.callParent(arguments);
	},
	disable: function () {
		this.getField().disable();
		this.callParent(arguments);
	},
	getField: function () {
		return this.isMax ? this.largeDataCombo : this.smallDataCombo;
	},
	getStore: function () {
		return this.getField().store;
	},
	getValue: function () {
		return this.getField().getValue();
	},
	setValue: function (recordId, recordName) {
		var me = this,
			arrId = [].concat(recordId || []),
			arrName = [].concat(recordName || []);

		// handle the type casting here; allow setValue to be used with string or int
		arrId = arrId.map(function (recordId) {
			return recordId && Number(recordId);
		});

		var _setValue = function (id, name) {
			if (me.isMax) {
				me.largeDataCombo.bindStore(me.largeDataCombo.store);
				me.largeDataCombo.setValue(id);
				me.largeDataName.setValue(name.toString());
			} else {
				me.smallDataCombo.setValue(id);
			}
		};

		if (arrId.length) {
			var record = null, arrRecName = [], bComplete = true;
			for (var i = 0; i < arrId.length; i++) {
				record = this.getStore().getById(arrId[i]);
				if (record) {
					arrRecName.push(record.get('name'));
				} else {
					bComplete = false;
					break;
				}
			}

			if (bComplete) {
				_setValue(arrId, arrRecName);
			} else {
				this.addUnloadedRecord(arrId, arrName, _setValue);
			}
		} else {
			_setValue(null, '');
		}
	},
	addUnloadedRecord: function (arrId, arrName, setValueFn) {
		var me = this;

		RA.App.Stores.listDataRecordLoader.loadRecord(me.recordType, arrId.join(','), function (records) {
			var loadedRecord = null;
			for (var i = 0; i < arrId.length; i++) {
				loadedRecord = RA.App.Stores.listDataRecordLoader.getById(arrId[i]);
				if (!loadedRecord) {
					/* this is a fail safe code only to minimize bugs caused by an incomplete list data record
					 * after all record types are properly supported by RA.App.Stores.listDataRecordLoader, this can be removed
					 */
					loadedRecord = Ext4.create('RA.Cmp.Model.DropDown', {
						id: arrId[i],
						name: arrName && arrName[i]
					});
				} else if (!(arrName && arrName[i])) {
					arrName.push(loadedRecord.get('name'));
				}

				me.getStore().add(loadedRecord);
			}

			setValueFn(arrId, arrName);
		});
	},
	reset: function () {
		this.smallDataCombo.reset();
		// this.largeDataCombo.reset();
		this.largeDataName.reset();
		// this.largeDataCombo.store.loadData([], false);
	},
	getItems: function () {
		var me = this;
		me.smallDataCombo = Ext4.create('RA.Cmp.MultiSelect', {
			id: me.id + '-small-data-combo',
			store: me.smallDataStore,
			fieldLabel: me.fLabel,
			emptyText: me.eText
		});
		me.largeDataCombo = Ext4.create('RA.Cmp.ComboBox.Hidden', {
			id: me.id + '-large-data-combo',
			store: me.largeDataStore,
			multiSelect: true,
			listeners: {
				change: function () {
					RA.App.Filters.saveFilterValuesTask.delay(1000);
				}
			}
		});
		me.largeDataName = Ext4.create('RA.Cmp.LargeDataTextField', {
			id: me.id + '-large-data-text',
			fieldLabel: me.fLabel,
			emptyText: me.eText,
			allowBlank: true
		});
		me.largeDataBtn = Ext4.create('RA.Cmp.LargeDataButton', {
			id: me.id + '-large-data-button',
			handler: function () {
				RA.App.Forms.largeMultiSelectForm.recordType = me.recordType;
				RA.App.Forms.largeMultiSelectForm.formId = me.formId;


				//Get raw data of each selected dropdown
				var id = me.largeDataCombo.getValue();
				var arrId = [].concat(id || []);
				arrId = arrId.filter(function (n) {
					return (n && n);
				}); //remove 0 value in filter

				var arrCmp = [];
				for (var i = 0; i < arrId.length; i++) {
					arrCmp.push(me.largeDataCombo.findRecordByValue(arrId[i]));
				}

				objSelected.setInit(arrCmp);
				Ext4.getCmp('ra-largemultiselect-selectresult').getStore().refresh();
				RA.App.Forms.largeMultiSelectForm.show();
			}
		});

		return [
			me.smallDataCombo,
			me.largeDataCombo,
			me.largeDataName,
			me.largeDataBtn
		];
	},
	isValid: function () {
		return this.getField().isValid();
	},
	listeners: {
		beforerender: function () {
			this.initSize();
		},
	},
	focus: function () {
		this.getField().focus();
	},
	blur: function () {
		this.getField().blur();
	},
	suspendEvents: function () {
		this.getField().suspendEvents();
	},
	resumeEvents: function () {
		this.getField().resumeEvents();
	}
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.Resource', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-resource',
	recordType: 'resource',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.RESOURCE'),
	smallDataStore: RA.App.Stores.resourceStore,
	largeDataStore: RA.App.Stores.filtersResourceTempStore
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.Class', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-class',
	recordType: 'class',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.CLASS'),
	smallDataStore: RA.App.Stores.filterClass,
	largeDataStore: RA.App.Stores.filterClass,
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.Department', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-department',
	recordType: 'department',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.DEPARTMENT'),
	smallDataStore: RA.App.Stores.filterDept,
	largeDataStore: RA.App.Stores.filterDept,
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.Location', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-location',
	recordType: 'location',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.LOCATION'),
	smallDataStore: RA.App.Stores.filterLocation,
	largeDataStore: RA.App.Stores.filterLocation,
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.Subsidiary', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-subsidiary',
	recordType: 'subsidiary',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.SUBSIDIARY'),
	smallDataStore: RA.App.Stores.subsidiary,
	largeDataStore: RA.App.Stores.subsidiary,
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.BillingClass', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-billingclass',
	recordType: 'billingclass',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.BILLING_CLASS'),
	smallDataStore: RA.App.Stores.billingClass,
	largeDataStore: RA.App.Stores.billingClass,
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.Project', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-project',
	recordType: 'project',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.CUSTOMER_PROJECT'),
	smallDataStore: RA.App.Stores.projectAndTemplateStore,
	largeDataStore: RA.App.Stores.filtersProjectTempStore,
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.Customer', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-customer',
	recordType: 'customer',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.CUSTOMER'),
	smallDataStore: RA.App.Stores.customerStore,
	largeDataStore: RA.App.Stores.largeDataCustomerTempStore,
});

Ext4.define('RA.Cmp.LargeDataCombo.Filter.ProjectTask', {
	extend: 'RA.Cmp.LargeDataCombo.MultiSelect',
	alias: 'widget.ra-filter-projecttask',
	recordType: 'projecttask',
	formId: 'filter',
	fLabel: translatedStrings.getText('COMBOBOX.PROJECT_TASK'),
	smallDataStore: RA.App.Stores.projectTaskStore,
	largeDataStore: RA.App.Stores.filtersProjectTaskTempStore,
});