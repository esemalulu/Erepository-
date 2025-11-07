/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.LargeDataCombo.SingleSelect', {
	extend: 'RA.Cmp.FlexFieldContainer',
	layout: 'hbox',
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
		me.largeDataCombo.allowBlank = !me.isMax || me.allowBlank;
		me.largeDataName.allowBlank = !me.isMax || me.allowBlank;
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
			me.getField().on('change', me.comboOnSelect, me.getField());
		}
	},
	getTotal: function () {
		var dataCount = RA.App.Stores.dataCount.getById(this.recordType);

		if (dataCount) {
			return dataCount.get('count');
		}

		return 0;
	},
	getField: function () {
		return this.isMax ? this.largeDataCombo : this.smallDataCombo;
	},
	getStore: function () {
		return this.getField().store;
	},
	getValue: function () {
		return this.getField().getSelectedRecord();
	},
	setValue: function (recordId, recordName) { // TODO: recordName should be retrieved here using the ID! wtf men
		console.log('SETVALUE[' + recordId + '][' + recordName + ']');
		var me = this;

		// handle the type casting here; allow setValue to be used with string or int
		if (recordId) {
			recordId = Number(recordId);
		}

		var _setValue = function (id, name) {
			if (me.isMax) {
				me.largeDataCombo.bindStore(me.largeDataCombo.store);
				me.largeDataCombo.setValue(id);
				me.largeDataName.setValue(name);
			} else {
				me.smallDataCombo.setValue(id);
			}
		};

		if (recordId) {
			var record = this.getStore().getById(recordId);

			if (record) {
				_setValue(recordId, record.get('name'));
			} else {
				this.addUnloadedRecord(recordId, recordName, _setValue);
			}
		} else {
			_setValue(null, '');
		}
	},
	addUnloadedRecord: function (recordId, recordName, setValueFn) {
		var me = this;

		RA.App.Stores.listDataRecordLoader.loadRecord(me.recordType, recordId, function (records) {
			var loadedRecord = RA.App.Stores.listDataRecordLoader.getById(recordId);

			if (!loadedRecord) {
				/*
				 * this is a fail safe code only to minimize bugs caused by an incomplete list data record
				 * after all record types are properly supported by RA.App.Stores.listDataRecordLoader, this can be removed
				 */
				loadedRecord = Ext4.create('RA.Cmp.Model.DropDown', {
					id: recordId,
					name: recordName
				});
			}

			if(!me.getStore().getById(loadedRecord.get('id'))) {
                me.getStore().add(loadedRecord);
            }

			setValueFn(loadedRecord.get('id'), loadedRecord.get('name'));
		});
	},
	reset: function () {
		this.smallDataCombo.reset();
		this.largeDataCombo.reset();
		this.largeDataName.reset();
		this.largeDataCombo.store.loadData([], false);
	},
	getItems: function () {
		var me = this;

		me.smallDataCombo = Ext4.create('RA.Cmp.ComboBox.Hidden', {
			id: me.id + '-small-data-combo',
			store: me.smallDataStore,
			fieldLabel: me.fLabel,
			emptyText: me.eText
		});
		me.largeDataCombo = Ext4.create('RA.Cmp.ComboBox.Hidden', {
			id: me.id + '-large-data-combo',
			store: me.largeDataStore
		});
		me.largeDataName = Ext4.create('RA.Cmp.LargeDataTextField', {
			id: me.id + '-large-data-text',
			fieldLabel: me.fLabel,
			emptyText: me.eText
		});

		me.largeDataBtn = Ext4.create('RA.Cmp.LargeDataButton', {
			id: me.id + '-large-data-button',
			tooltip: translatedStrings.getText('TOOLTIP.LARGE_DATA.CHOOSE_' + me.recordType.toUpperCase()),
			handler: function () {
				if (me.hasOwnProperty('isSingleSelect') && me.isSingleSelect == false) {
					// TODO: remove this during multi-select large-data integration
					RA.App.Forms.largeMultiSelectForm.recordType = me.recordType;
					RA.App.Forms.largeMultiSelectForm.formId = me.formId;
					RA.App.Forms.largeMultiSelectForm.show();
				} else {
					RA.App.Forms.largeDataForm.recordType = me.recordType;
					RA.App.Forms.largeDataForm.formId = me.formId;
					RA.App.Forms.largeDataForm.isSingleSelect = true;
					RA.App.Forms.largeDataForm.show();
				}
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
	focus: function () {
		this.getField().focus();
	},
	blur: function () {
		this.getField().blur();
	}
});

Ext4.define('RA.Cmp.LargeDataCombo.SingleSelect.Resource', {
	extend: 'RA.Cmp.LargeDataCombo.SingleSelect',
	alias: 'widget.ra-ldc-ss-resource',
	recordType: 'resource',
	fLabel: translatedStrings.getText('COMBOBOX.RESOURCE'),
	eText: translatedStrings.getText('MESSAGE.EMPTYTEXT.RESOURCE'),
	smallDataStore: RA.App.Stores.resourceStore,
	largeDataStore: RA.App.Stores.allocationResourceTempStore,
	initSize: function () {
		this.callParent();

		this.searchBtn[this.isMax ? 'hide' : 'show']();
		this.searchBtn2[!this.isMax ? 'hide' : 'show']();
	},
	getItems: function () {
		var items = this.callParent();

		var me = this;

		me.searchBtn = Ext4.create('RA.Cmp.LargeDataSearchButton', {
			id: me.id + '-small-data-search',
			formId: me.formId
		});
		me.searchBtn2 = Ext4.create('RA.Cmp.LargeDataSearchButton', {
			id: me.id + '-large-data-search',
			isMax: true,
			formId: me.formId
		});

		return items.concat([
			me.searchBtn,
			me.searchBtn2
		]);
	}
});

Ext4.define('RA.Cmp.LargeDataCombo.SingleSelect.Approver', {
	extend: 'RA.Cmp.LargeDataCombo.SingleSelect',
	alias: 'widget.ra-ldc-ss-approver',
	recordType: 'approver',
	fLabel: translatedStrings.getText('COMBOBOX.NEXT_APPROVER'),
	eText: translatedStrings.getText('MESSAGE.EMPTYTEXT.NEXT_APPROVER'),
	smallDataStore: RA.App.Stores.approverStore,
	largeDataStore: RA.App.Stores.largeDataApproverTempStore,
	initComponent: function () {
		this.callParent(arguments);
		if (!this.isLargeData()) {
			this.smallDataCombo.on('select', function (me) {
				this.up('ra-ldc-ss-approver').setValue(me.getValue(), me.getDisplayValue());
			});
		}
	},
});

Ext4.define('RA.Cmp.LargeDataCombo.SingleSelect.Project', {
	extend: 'RA.Cmp.LargeDataCombo.SingleSelect',
	alias: 'widget.ra-ldc-ss-project',
	recordType: 'project',
	fLabel: translatedStrings.getText('COMBOBOX.CUSTOMER_PROJECT'),
	eText: translatedStrings.getText('MESSAGE.EMPTYTEXT.CUSTOMER_PROJECT'),
	smallDataStore: RA.App.Stores.projectFilterStore,
	largeDataStore: RA.App.Stores.allocationProjectTempStore,
});

Ext4.define('RA.Cmp.LargeDataCombo.SingleSelect.ProjectTask', {
	extend: 'RA.Cmp.LargeDataCombo.SingleSelect',
	alias: 'widget.ra-ldc-ss-project-task',
	recordType: 'projecttask',
	fLabel: translatedStrings.getText('COMBOBOX.PROJECT_TASK'),
	eText: translatedStrings.getText('MESSAGE.EMPTYTEXT.PROJECT_TASK'),
	smallDataStore: RA.App.Stores.projectTaskStore,
	largeDataStore: RA.App.Stores.allocationProjectTaskTempStore,
	getTotal: function () {
		if (this.hasOwnProperty('projectId')) {
			var countBy = RA.App.Stores.dataCount.getById('projecttask').get('countBy');

			if (countBy.hasOwnProperty(this.projectId)) {
				return countBy[this.projectId];
			}
		}

		return 0;
	},
	listeners: {
		beforeshow: function (me) {
			if (this.hasOwnProperty('projectId')) {
				if (this.isMax) {
					RA.App.Forms.largeDataForm.projectFilter = this.projectId;
				} else {
					this.smallDataCombo.getStore().getProxy().url = this.smallDataCombo.getStore().url + '&projectFilter=' + this.projectId;
				}
			}
			this.getField().getStore().load();
		},
		beforeHide: function (me) {
			//Call reset when closing the form
			this.projectId = null;

			if (this.isMax) {
				RA.App.Forms.largeDataForm.projectFilter = null;
			} else {
				//Default to original url
				this.smallDataCombo.getStore().getProxy().url = this.smallDataCombo.getStore().url;
			}
		}
	},
	// TODO: below are form-specific functions; they should not be defined on the field
	checkStartDate: function (dateFld, projectTaskObj) {
		var startDate = dateFld.getValue();
		var startTime = startDate.getTime();

		if (projectTaskObj && projectTaskObj.get('id') > 0) {
			var ptStartDate = projectTaskObj.get('startDate');
			var ptStartTime = ptStartDate.getTime();
			var startDate = ptStartDate.toLocaleDateString();
			var ptEndDate = projectTaskObj.get('endDate');
			var ptEndTime = ptEndDate.getTime();
			var endDate = ptEndDate.toLocaleDateString();
			var message = null;

			if (startTime < ptStartTime) {
				message = translatedStrings.getText('MESSAGE.WARNING.RA_START_LT_PROJECT_TASK').replace('$1', startDate).replace('$2', endDate);
			} else if (startTime > ptEndTime) {
				message = translatedStrings.getText('MESSAGE.WARNING.RA_START_GT_PROJECT_TASK').replace('$1', startDate).replace('$2', endDate);
			}

			if (message) {
				alert(message);
			}
		}
	},
	checkEndDate: function (dateFld, projectTaskObj) {
		var endDate = dateFld.getValue();
		var endTime = endDate.getTime();

		if (projectTaskObj && projectTaskObj.get('id') > 0) {
			var ptStartDate = projectTaskObj.get('startDate');
			var ptStartTime = ptStartDate.getTime();
			var startDate = ptStartDate.toLocaleDateString();
			var ptEndDate = projectTaskObj.get('endDate');
			var ptEndTime = ptEndDate.getTime();
			var endDate = ptEndDate.toLocaleDateString();
			var message = null;

			if (endTime < ptStartTime) {
				message = translatedStrings.getText('MESSAGE.WARNING.RA_END_LT_PROJECT_TASK').replace('$1', startDate).replace('$2', endDate);
			} else if (endTime > ptEndTime) {
				message = translatedStrings.getText('MESSAGE.WARNING.RA_END_GT_PROJECT_TASK').replace('$1', startDate).replace('$2', endDate);
			}

			if (message) {
				alert(message);
			}
		}
	}
});

Ext4.define('RA.Cmp.LargeDataCombo.SingleSelect.BillingClass', {
	extend: 'RA.Cmp.LargeDataCombo.SingleSelect',
	alias: 'widget.ra-ldc-ss-billingclass',
	recordType: 'billingclass',
	fLabel: translatedStrings.getText('COMBOBOX.BILLING_CLASS'),
	eText: translatedStrings.getText('MESSAGE.EMPTYTEXT.BILLINGCLASS'),
	smallDataStore: RA.App.Stores.billingClassSearch,
	largeDataStore: RA.App.Stores.largeDataBillingClassTempStore
});