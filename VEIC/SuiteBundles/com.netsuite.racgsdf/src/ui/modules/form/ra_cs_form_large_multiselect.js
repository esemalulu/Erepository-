/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

var objSelected = {
	storeRecords: [],
	rawRecords: [],
	setInit: function (arrCmp) {
		this.resetSelected();
		for (var i = 0; i < arrCmp.length; i++) {
			this.pushSort(arrCmp[i]);
		}
	},
	pushSort: function (cmpRecord) {
		var data = this.storeRecords, rawRecords = this.rawRecords;
		var id = cmpRecord.data.id;
		var name = cmpRecord.data.name.toString();

		for (var i = 0; i < data.length; i++) {
			if (name <= data[i].name.toString()) {
				break;
			}
		}
		data.splice(i, 0, {id: id, name: name});
		rawRecords.splice(i, 0, cmpRecord);
	},
	getIndexById: function (id) {
		var data = this.storeRecords, rawRecords = this.rawRecords;
		for (var i = 0; i < data.length; i++) {
			if (data[i].id == id) {
				return i;
			}
		}
		return -1;
	},
	getIdAndName: function () {
		var id = [], name = [], data = this.storeRecords;

		for (var i = 0; i < data.length; i++) {
			id.push(+data[i].id);
			name.push(data[i].name);
		}
		return {id: id, name: name};
	},
	resetSelected: function () {
		this.storeRecords = [];
		this.rawRecords = [];
	},
	removeById: function (id) {
		var index = this.getIndexById(id);
		if (index >= 0) {
			this.storeRecords.splice(index, 1);
			this.rawRecords.splice(index, 1);
		}
	}
};

var selectedStore = Ext4.create('Ext4.data.JsonStore', {
	autoLoad: true,
	clearRemovedOnLoad: true,
	data: objSelected,
	root: 'storeRecords',
	fields: ['name', 'id'],
	refresh: function () {
		this.loadData(objSelected.storeRecords, false);
	}
});

Ext4.define('RA.Cmp.LargeDataSelectResult', {
	extend: 'RA.Cmp.LargeDataMultiSelect',
	height: 300,
	width: 300,
	fieldLabel: translatedStrings.getText('MULTISELECT.CURRENTSELECTIONS'),
	labelAlign: 'top',
	labelSeparator: '',
	valueField: 'id',
	displayField: 'name',
	store: selectedStore,
	listConfig: {
		getInnerTpl: function (displayField) {
			return '<div class="ra-dd-move-icon-cls ra-dd-move-left-icon-cls">&nbsp;</div><span>{' + displayField + '}</span>';
		}
	},
	listeners: {
		click: {
			element: 'el',
			fn: function () {
				var cmpSelected = Ext4.getCmp('ra-largemultiselect-selectresult');

				var arrSel = cmpSelected.getSelected();
				if (arrSel.length > 0) {
					if (arrSel.length > 1) {
						//Undo previous selections
						var lastId = cmpSelected.getSelected()[arrSel.length - 1].data.id;
						cmpSelected.setValue(lastId);
					}

					//Get selected again
					arrSel = cmpSelected.getSelected()[0];

					objSelected.removeById(arrSel.data.id);
					Ext4.getCmp('ra-largemultiselect-selectresult').getStore().refresh();
				}
			}
		}
	}
});

Ext4.define('RA.Cmp.LargeDataLoadResult', {
	extend: 'RA.Cmp.LargeDataMultiSelect',
	height: 300,
	width: 300,
	fieldLabel: translatedStrings.getText('MULTISELECT.CLICKTOADD'),
	labelAlign: 'top',
	labelSeparator: '',
	valueField: 'id',
	displayField: 'name',
	store: RA.App.Stores.largeDataSelectedStore,
	listConfig: {
		getInnerTpl: function (displayField) {
			return '<div class="ra-dd-move-icon-cls ra-dd-move-right-icon-cls">&nbsp;</div><span>{' + displayField + '}</span>';
		}
	},
	listeners: {
		click: {
			element: 'el',
			fn: function () {
				var cmpSelected = Ext4.getCmp('ra-largemultiselect-loadresult');

				//Force single selection on Multselect Component
				var arrSel = cmpSelected.getSelected();
				if (arrSel.length > 0) {
					if (arrSel.length > 1) {
						//Undo previous selections
						var lastId = cmpSelected.getSelected()[arrSel.length - 1].data.id;
						cmpSelected.setValue(lastId);
					}

					//Get selected again
					arrSel = cmpSelected.getSelected()[0];
					if (arrSel.get('id') != -1) {
						if (objSelected.getIndexById(arrSel.data.id) < 0) { //Duplicate check
							objSelected.pushSort(arrSel);
						}
						Ext4.getCmp('ra-largemultiselect-selectresult').getStore().refresh();

						cmpSelected.setValue(); //Clear selection
					}
				}
			}
		}
	}
});

Ext4.define('RA.Cmp.SearchBarContainer', {
	extend: 'RA.Cmp.FlexFieldContainer',
	layout: 'hbox',
	items: [
		Ext4.create('Ext4.form.field.Text', {
			id: 'ra-largemultiselect-searchtext',
			fieldLabel: '',
			flex: 4.15
		}),
		Ext4.create('RA.Cmp.HSpace', {flex: 0.25}),
		Ext4.create('RA.Cmp.GrayButton', {
			id: 'ra-largemultiselect-searchbutton',
			text: translatedStrings.getText('TEXT.SEARCH'),
			flex: 2.50,
			handler: function () {
				var form = RA.App.Forms.largeMultiSelectForm;
				var searchText = Ext4.getCmp('ra-largemultiselect-searchtext').getValue();
				if (searchText == '') {
					var rangeCombo = Ext4.getCmp('ra-largemultiselect-range');
					if (rangeCombo.store.getCount() > 1) {
						Ext4.getCmp('ra-largemultiselect-range-space').show();
						Ext4.getCmp('ra-largemultiselect-range').show();
					}
					Ext4.getCmp('ra-largemultiselect-range').fireEvent('select');
				} else if (searchText != '') {
					Ext4.getCmp('ra-largemultiselect-range-space').hide();
					Ext4.getCmp('ra-largemultiselect-range').hide();

					var url = form.getURL(form.recordType);
					var jobCombo = Ext4.getCmp(form.formId.toLowerCase() + '-project');
					var jobFilter = null;

					if (jobCombo && jobCombo.getValue() && form.recordType != 'project') {
						var jobComboValue = jobCombo.getValue();

						if (Array.isArray(jobComboValue)) {
							jobFilter = jobComboValue.join(',');
						} else if (typeof jobComboValue === 'object') {
							jobFilter = jobComboValue.get('id');
						} else {
							jobFilter = jobComboValue || null;
						}
					}

					var params = {
						nameStartsWith: searchText,
						jobFilter: jobFilter
					};
					RA.App.Forms.largeMultiSelectForm.loadItemSelectorContent(url, params);
				}
			}
		})
	]
});

Ext4.define('RA.Cmp.ItemComboBox', {
	extend: 'RA.Cmp.ComboBox',
	fieldLabel: '',
	listeners: {
		select: function (combo, record, eOpts) {
			var form = RA.App.Forms.largeMultiSelectForm;
			var range = this.getSelectedRecord();
			if (range) {
				var startIndex = range.get('startIndex');
				var endIndex = range.get('endIndex');
				var url = form.getURL(form.recordType);
				var jobCombo = Ext4.getCmp(form.formId.toLowerCase() + '-project');
				var jobFilter = null;
				if (jobCombo && jobCombo.getValue() && form.recordType != 'project') {
					var jobComboValue = jobCombo.getValue();

					if (Array.isArray(jobComboValue)) {
						jobFilter = jobComboValue.join(',');
					} else if (typeof jobComboValue === 'object') {
						jobFilter = jobComboValue.get('id');
					} else {
						jobFilter = jobComboValue || null;
					}
				}

				RA.App.Forms.largeMultiSelectForm.loadItemSelectorContent(url, {
					startIndex: startIndex,
					endIndex: endIndex,
					jobFilter: jobFilter
				});
			}
		}
	}
});

Ext4.define('RA.Cmp.LargeMultiSelectForm', {
	extend: 'RA.Cmp.Window',
	id: 'racg-large-multiselect-form',
	width: 680,
	height: 500,
	type: null,
	windowType: null,
	isSelected: false,
	resetSelections: function () {
		RA.App.Stores.largeDataSelectedStore.loadData([], false);

		Ext4.getCmp('ra-largemultiselect-loadresult').bindStore(RA.App.Stores.largeDataSelectedStore);
		Ext4.getCmp('ra-largemultiselect-loadresult').setValue(0);
		Ext4.getCmp('ra-largemultiselect-range').setValue(0);

		objSelected.resetSelected();

		var cmpStore = Ext4.getCmp('ra-largemultiselect-selectresult').getStore();
		cmpStore.loadData(objSelected.storeRecords, false);
	},
	setFieldVisibility: function () {
		var me = this;
		var rangeCombo = Ext4.getCmp('ra-largemultiselect-range');
		var rangeSpace = Ext4.getCmp('ra-largemultiselect-range-space');
		var okBtn = Ext4.getCmp('ra-largemultiselect-ok').hide();
		var cancelBtn = Ext4.getCmp('ra-largemultiselect-cancel').hide();

		if (rangeCombo.store.getCount() == 1) {
			rangeCombo.hide();
			rangeSpace.hide();
		} else {
			rangeCombo.show();
			rangeSpace.show();
		}

		okBtn.show();
		cancelBtn.show();
	},
	listeners: {
		beforeShow: function (me, eOpts) {
			me.getStoreAndTitle(me.recordType);
			me.setFieldVisibility();
			var form = RA.App.Forms.largeMultiSelectForm;
			var component = form.getComponent();
			var prevValue = component.getValue();
			if (!(prevValue && prevValue.length)) {
				me.resetSelections();
			}
			Ext4.getCmp('ra-largemultiselect-searchtext').reset();
			Ext4.getCmp('ra-largemultiselect-range').setValue(0);
			Ext4.getCmp('ra-largemultiselect-range').fireEvent('select');
		}
	},
	items: [
		Ext4.create('Ext4.form.Panel', {
			id: 'ra-largemultiselect-panel',
			layout: 'form',
			border: false,
			padding: '10 20 20 20',
			items: [
				Ext4.create('RA.Cmp.ItemComboBox', {id: 'ra-largemultiselect-range'}),
				Ext4.create('RA.Cmp.Space', {id: 'ra-largemultiselect-range-space'}),
				Ext4.create('RA.Cmp.SearchBarContainer', {id: 'ra-largemultiselect-search'}),
				Ext4.create('RA.Cmp.Space'),
				Ext4.create('RA.Cmp.Panel', {
					id: 'ra-largemultiselect-selectpanel',
					height: '100%',
					width: '100%',
					layout: 'hbox',
					items: [
						Ext4.create('RA.Cmp.LargeDataLoadResult', {id: 'ra-largemultiselect-loadresult'}),
						Ext4.create('RA.Cmp.LargeDataSelectResult', {id: 'ra-largemultiselect-selectresult'}),
					]
				})
			],
			dockedItems: [
				{ //for multiple select
					xtype: 'toolbar',
					dock: 'top',
					ui: 'footer',
					padding: '0 0 10 0',
					items: [
						Ext4.create('RA.Cmp.BlueButton', {
							id: 'ra-largemultiselect-ok',
							text: translatedStrings.getText('BUTTON.OK'),
							hidden: true,
							handler: function () {
								var form = RA.App.Forms.largeMultiSelectForm;
								var tempStore = form.getTempStore();
								var component = form.getComponent();

								var objIdName = objSelected.getIdAndName();
								tempStore.loadData(objSelected.rawRecords, false);
								if (component.parentType == 'FilterPanel') {
									component.setValue(objIdName.id, objIdName.name);
								} else {
									component.setValue(tempStore, objIdName.id, objIdName.name);
								}

								RA.App.Forms.largeMultiSelectForm.hide();
							}
						}),
						Ext4.create('RA.Cmp.GrayButton', {
							id: 'ra-largemultiselect-cancel',
							text: translatedStrings.getText('BUTTON.CANCEL'),
							hidden: true,
							handler: function () {
								RA.App.Forms.largeMultiSelectForm.hide();
							}
						})
					]
				}
			]
		})
	],
	getTempStore: function () {
		var tempStore = null;
		switch (this.recordType) {
			case 'resource':
				tempStore = RA.App.Stores.filtersResourceTempStore;
				break;
			case 'project':
				tempStore = RA.App.Stores.filtersProjectTempStore;
				break;
			case 'customer':
				tempStore = RA.App.Stores.largeDataCustomerTempStore;
				break;
			case 'projecttask':
				tempStore = RA.App.Stores.filtersProjectTaskTempStore;
				break;
			case 'approver':
				tempStore = RA.App.Stores.largeDataApproverTempStore;
				break;
			default:
				tempStore = RA.App.Stores.largeDataLocalTempStore;
				break;
		}
		return tempStore;
	},
	loadItemSelectorContent: function (url, params) {
		var itemSelectorStore = RA.App.Stores.largeDataSelectedStore;
		perfTestLogger.start('Load multiselect content');
		itemSelectorStore.loadData([], false);
		Ext4.getCmp('ra-largemultiselect-loadresult').bindStore(itemSelectorStore);

		itemSelectorStore.getProxy().url = url;
		itemSelectorStore.load({
			scope: this,
			params: params,
			callback: function (records, operation, success) {
				if (success) {
					if (records && !records.length) {
						itemSelectorStore.add(Ext4.create('RA.Cmp.Model.DropDown', {
							id: -1,
							name: translatedStrings.getText('MESSAGE.EMPTYTEXT.NO_MATCHING_RECORDS')
						}));
						this.addCls('ra-large-data-search-no-match');
					} else {
						this.removeCls('ra-large-data-search-no-match');
					}
				}
			}
		});
	},
	getStoreAndTitle: function (type) {
		var title;
		switch (type) {
			case 'resource':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeResourceStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_RESOURCE');
				break;
			case 'project':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeProjectStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_PROJECT');
				break;
			case 'projecttask':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeProjectTaskStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_PROJECT_TASK');
				break;
			case 'approver':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeApproverStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_APPROVER');
				break;
			case 'class':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeClassStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_CLASS');
				break;
			case 'department':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeDepartmentStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_DEPARTMENT');
				break;
			case 'subsidiary':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeSubsidiaryStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_SUBSIDIARY');
				break;
			case 'location':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeLocationStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_LOCATION');
				break;
			case 'billingclass':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeBillingClassStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_BILLING_CLASS');
				break;
			case 'customer':
				Ext4.getCmp('ra-largemultiselect-range').bindStore(RA.App.Stores.largeDataRangeCustomerStore);
				title = translatedStrings.getText('WINDOW.CHOOSE_CUSTOMER');
				break;
		}
		this.setTitle(title);
	},
	getURL: function (type) {
		var url = '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&removeAll=T';
		switch (type) {
			case 'resource':
				url = url + '&searchType=projectresource&showAllResources=T&showInactives=F';
				break;
			case 'project':
				url = url + '&searchType=job';
				if ((RA.App.Filters.filter.data.viewByType == 1 || RA.App.Filters.filter.data.viewByType == 3) &&
					(RA.App.Forms.largeMultiSelectForm.formId == 'filter')) {
					//Only apply to filter dropdown and viewByType
					url = url + '&incProjectTemplate=' + (RA.App.Settings.get('incProjectTemplate') || 'F');
				}
				break;
			case 'projecttask':
				url = url + '&searchType=projecttask';
				break;
			case 'approver':
				url = url + '&searchType=employee';
				break;
			case 'class':
				url = url + '&searchType=classification';
				break;
			case 'department':
				url = url + '&searchType=department';
				break;
			case 'location':
				url = url + '&searchType=location';
				break;
			case 'billingclass':
				url = url + '&searchType=billingclass';
				break;
			case 'subsidiary':
				url = url + '&searchType=subsidiary';
				break;
			case 'customer':
				url = url + '&searchType=customer';
				break;
		}
		return url;
	},
	getComponent: function () {
		return Ext4.getCmp([this.formId.toLowerCase(), this.recordType].join('-'));
	},
	getValue: function () {
		var objIdName = objSelected.getIdAndName();
		return objIdName.id;
	}
});