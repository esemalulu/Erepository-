/**
 * Copyright � 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Store.ArrayStore', {
	extend: 'Ext4.data.ArrayStore',
	model: 'RA.Cmp.Model.DropDown',
	idProperty: 'id',
	root: 'data',
	listeners: {
		load: function (me) {
			console.log('[' + Ext4.util.Format.date(new Date(), 'h:i:s') + ']loaded ' + me.storeId);
		}
	}
});

Ext4.define('RA.Cmp.Store.ArraySegmentStore', {
	extend: 'RA.Cmp.Store.GenericDropDown',
	model: 'RA.Cmp.Model.CustomResourceSegment',
	idProperty: 'segment',
	root: 'data',
	listeners: {
		load: function (me) {
			console.log('[' + Ext4.util.Format.date(new Date(), 'h:i:s') + ']loaded ' + me.storeId);
		}
	}
});

Ext4.define('RA.Cmp.Store.Features', {
	extend: 'RA.Cmp.Store.GenericDropDown',
	model: 'RA.Cmp.Model.Features',
	restful: true,
	idProperty: 'name',
	featureCheck: function () {
		var text = new Array();

		var ra = this.getById('resourceAllocation').get('isEnabled');
		var cr = this.getById('customRecord').get('isEnabled');
		var cs = this.getById('clientScript').get('isEnabled');
		var ss = this.getById('serverScript').get('isEnabled');

		if (!ra) text.push(translatedStrings.getText('STORE.RESOURCE_ALLOCATIONS'));
		if (!cr) text.push(translatedStrings.getText('STORE.CUSTOM_RECORDS'));
		if (!cs) text.push(translatedStrings.getText('STORE.CLIENT_SUITESCRIPTS'));
		if (!ss) text.push(translatedStrings.getText('STORE.SERVER_SUITESCRIPTS'));

		return text;
	},
	isRAAWEnabled: function () {
		return this.getById('approvalWorkFlow') && this.getById('approvalWorkFlow').get('isEnabled');
	}
});

Ext4.define('RA.Cmp.Store.RASublist', {
	extend: 'Ext4.data.JsonStore',
	model: 'RA.Cmp.Model.RASublist',
	proxy: {
		type: 'memory'
	}
});

/*
 * Store instances
 */
RA.App.Stores = {
	requiredStores: [
		'featureStore',
		'savedFilters',
		'filterValues',
		'settingStore',
		'resourceStore',
		'filterDept',
		'filterClass',
		'filterLocation',
		'billingClass',
		'subsidiary',
		'vendorCategory',
		'projectFilterStore',
		'projectAndTemplateStore',
		'projectTaskStore',
		'filterResourceFields',
		'filterAllocationFields',
		'customerStore',
		'dataCount',
		'resourceSegments',
		'resourceSegmentTypes',
		'billingClassSearch'
	],
	onDemandOnlyStores: [
		'chartResource',
		'chartEvent',
		'allocationSaver',
		'projectCommentSaver',
		'pageStore',
		'expResourceStore',
		'expAllocStore',
		'gridStore',
		'listDataRecordLoader',
		'timeOff',
		'timeOffConflict'
	],
	loadRequiredStores: function () {
		for (i in this.requiredStores) {
			this[this.requiredStores[i]].load();
		}
	},
	isRequiredLoaded: function () {
		var waitingArr = [];

		for (i in this.requiredStores) {
			var store = this.requiredStores[i];

			if (!this[store].isDoneLoading) {
				waitingArr.push(store);
			}
		}

		for (i in this.singleSegmentValues) {
			var store = this.singleSegmentValues[i];

			if (!store.isDoneLoading) {
				waitingArr.push(store);
			}
		}

		console.log('waiting for [' + waitingArr.length + '] stores to load...');

		return waitingArr.length == 0;
	},
	loadRemaining: function () {
		if (this.loadRemainingTriggerOnce) return;

		this.loadRemainingTriggerOnce = true;

		for (store in RA.App.Stores) {
			if (this.onDemandOnlyStores.indexOf(store) > -1) continue;

			var _store = RA.App.Stores[store];

			// use lastOptions for checking if store has already started loading (not necessarily completed loading)
			if (_store.url && !_store.lastOptions) {
				try {
					if (_store.load) {
						_store.load();
					}
				} catch (err) {
					// do nothing
				}
			}
		}
	},
	getStoreDataCounts: function() {
		var counts = {};
		for (var i in this.requiredStores) {
			var store = this.requiredStores[i];

			counts['RACG_store_data_count_' + store] = this[store].getTotalCount();
		}
		return counts;
	},
	featureStore: Ext4.create('RA.Cmp.Store.Features', {
		id: 'featureStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_features&deploy=customdeploy_proj_racg_su_features'
	}),
	savedFilters: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'savedFiltersStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_filter&deploy=customdeploy_proj_racg_su_filter',
		model: 'RA.Cmp.Model.NewFilter',
		sorters: [
			{
				property: 'viewByType',
				direction: 'ASC'
			},
			{
				property: 'name',
				direction: 'ASC'
			}
		],
		setDefaultFilterNames: function () {
			this.defaultFilterNames = [
				this.findRecord('viewByType', '1').get('name'),
				this.findRecord('viewByType', '2').get('name'),
				this.findRecord('viewByType', '3').get('name')
			];
		},
		isNameSameAsDefault: function (name, isAdd) {
			if (isAdd && this.defaultFilterNames.indexOf(name) > -1) {
				return true;
			}
			return false;
		},
		isNameExists: function (name, isAdd, selectedId) {
			var record = this.findRecord('filterName', name, 0, false, false, true);
			if (record && record.get('owner') == nlapiGetContext().user) {
				if (isAdd) {
					// name exists!
					return true;
				}
				if (record.get('id') != selectedId) {
					return true;
				}
			}
			return false;
		},
		hasDuplicateFilterFields: function (dataObject) {
			var arrCombo = [];
			var noneString = RA.App.Constant.NONE;

			if (dataObject.record1 && dataObject.record1 !== noneString) {
				arrCombo.push(dataObject.record1.toString().concat(dataObject.field1.toString()));
			}
			if (dataObject.record2 && dataObject.record2 !== noneString) {
				arrCombo.push(dataObject.record2.toString().concat(dataObject.field2.toString()));
			}
			if (dataObject.record3 && dataObject.record3 !== noneString) {
				arrCombo.push(dataObject.record3.toString().concat(dataObject.field3.toString()));
			}
			if (dataObject.record4 && dataObject.record4 !== noneString) {
				arrCombo.push(dataObject.record4.toString().concat(dataObject.field4.toString()));
			}
			if (dataObject.record5 && dataObject.record5 !== noneString) {
				arrCombo.push(dataObject.record5.toString().concat(dataObject.field5.toString()));
			}
			if (dataObject.record6 && dataObject.record6 !== noneString) {
				arrCombo.push(dataObject.record6.toString().concat(dataObject.field6.toString()));
			}
			if (dataObject.record7 && dataObject.record7 !== noneString) {
				arrCombo.push(dataObject.record7.toString().concat(dataObject.field7.toString()));
			}
			if (dataObject.record8 && dataObject.record8 !== noneString) {
				arrCombo.push(dataObject.record8.toString().concat(dataObject.field8.toString()));
			}

			var arrCheck = {};

			for (var x = 0; x < arrCombo.length; x++) {
				var fieldCombo = arrCombo[x];
				if (arrCheck[fieldCombo]) {
					return true;
				} else {
					arrCheck[fieldCombo] = true;
				}
			}
			return false;
		},
		hasNoneRecord: function (dataObject) {
			var arrValidRecord = [];
			var arrNoneRecord = [];
			var noneString = translatedStrings.getText('DISPLAY.NONE');
			var recordIndices = ['record1', 'record2', 'record3', 'record4', 'record5', 'record6', 'record7', 'record8'];
			for (var int = 0; int < recordIndices.length; int++) {
				var record = dataObject[recordIndices[int]];
				if (record) {
					if (record != noneString) {
						arrValidRecord.push(record);
					} else if (record === noneString) {
						arrNoneRecord.push(record);
					}
				}
			}
			if (arrValidRecord.length) {
				return false;
			} else if (arrNoneRecord.length) {
				return true;
			}
		},
		hasNoSelection: function (dataObject) {
			if (!dataObject.record1 && !dataObject.record2 && !dataObject.record3 && !dataObject.record4 &&
				!dataObject.record5 && !dataObject.record6 && !dataObject.record7 && !dataObject.record8) {
				return true;
			}
			return false;
		},
		hasBlankField: function (dataObject) {
			var noneString = RA.App.Constant.NONE;
			for (var int = 1; int <= 8; int++) {
				if (dataObject['record' + int] && dataObject['record' + int] !== noneString && !dataObject['field' + int]) {
					return true;
				}
			}
			return false;
		},
		getAllDefaultFilter: function () {
			var arrId = [];
			arrId.push(this.getDefaultAllocationFilter());
			arrId.push(this.getDefaultCustomerFilter());
			arrId.push(this.getDefaultProjectFilter());

			return arrId;
		},
		getDefaultAllocationFilter: function () {
			var record = RA.App.Stores.savedFilters.queryBy(function (record, id) {
				return (record.get('viewByType') == '1' && record.get('isDefault') == true);
			}).getAt(0);
			return record ? record.get('id') : null;
		},
		getDefaultCustomerFilter: function () {
			var record = RA.App.Stores.savedFilters.queryBy(function (record, id) {
				return (record.get('viewByType') == '2' && record.get('isDefault') == true);
			}).getAt(0);
			return record ? record.get('id') : null;
		},
		getDefaultProjectFilter: function () {
			var record = RA.App.Stores.savedFilters.queryBy(function (record, id) {
				return (record.get('viewByType') == '3' && record.get('isDefault') == true);
			}).getAt(0);
			return record ? record.get('id') : null;
		}
	}),
	resourceStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'resourceStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=projectresource&removeAll=T',
		fields: [
			{
				name: 'id',
				type: 'int'
			}, {
				name: 'name',
				type: 'string'
			}, {
				name: 'type',
				type: 'string'
			}
		]
	}),
	filterResourceType: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'filterResourceType',
		url: '',
		data: [
			{
				'id': 0,
				'name': translatedStrings.getText('STORE.-ALL-')
			}, {
				'id': 1,
				'name': translatedStrings.getText('STORE.EMPLOYEE')
			}, {
				'id': 2,
				'name': translatedStrings.getText('STORE.VENDOR')
			}, {
				'id': 3,
				'name': translatedStrings.getText('STORE.GENERIC_RESOURCE')
			}
		]
	}),
	projectFilterStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'projectStore',
		model: 'RA.Cmp.Model.Project',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=job&removeAll=T'
	}),
	projectAndTemplateStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'projectAndTemplateStore',
		model: 'RA.Cmp.Model.Project',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=job&removeAll=T',
	}),
	customerStore: Ext4.create('RA.Cmp.Store.DropDown',   {
		id: 'customerStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=customer&removeAll=T'
	}),
	projectTaskStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'projectTaskStore',
		model: 'RA.Cmp.Model.ProjectTask',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=projecttask&removeAll=T'
	}),
	filterRecordStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'filterRecordStore',
		model: 'RA.Cmp.Model.FilterRecord',
		data: [
			{
				'id': RA.App.Constant.NONE,
				'name': translatedStrings.getText('DISPLAY.NONE'),
			},
			{
				'id': RA.App.Constant.RESOURCE,
				'name': translatedStrings.getText('COMBOBOX.RESOURCE')
			},
			{
				'id': RA.App.Constant.ALLOCATION,
				'name': translatedStrings.getText('FIELDSET.ALLOCATION')
			},
		]
	}),
	filterResourceFields: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'filterResourceFields',
		model: 'RA.Cmp.Model.StringDropDown',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=filterResource&removeAll=T'
	}),
	filterAllocationFields: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'filterAllocationFields',
		model: 'RA.Cmp.Model.StringDropDown',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=filterAllocation&removeAll=T'
	}),
	allocByStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'allocByStore',
		data: [
			{
				'id': 1,
				'name': translatedStrings.getText('STORE.PERCENTAGE')
			}, {
				'id': 2,
				'name': translatedStrings.getText('STORE.HOURS')
			}
		]
	}),
	filterAllocLevel: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'filterAllocLevel',
		data: [
			{
				'id': 2,
				'name': '1-25%'
			}, {
				'id': 3,
				'name': '26-50%'
			}, {
				'id': 4,
				'name': '51-75%'
			}, {
				'id': 5,
				'name': '76-100%'
			}, {
				'id': 6,
				'name': translatedStrings.getText('LEGEND.OVER')
			}
		]
	}),
	allocTypeStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'allocTypeStore',
		model: 'RA.Cmp.Model.AllocType',
		data: [
			{
				id: 1,
				name: translatedStrings.getText('LEGEND.HARD'),
				key: 'Hard'
			},
			{
				id: 2,
				name: translatedStrings.getText('LEGEND.SOFT'),
				key: 'Soft'
			}
		]
	}),
	recurrenceTypeStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'recurrenceType',
		data: [
			{
				'id': 1,
				'name': translatedStrings.getText('STORE.SINGLE')
			}, {
				'id': 2,
				'name': translatedStrings.getText('STORE.DAILY')
			}, {
				'id': 3,
				'name': translatedStrings.getText('STORE.WEEKLY')
			}, {
				'id': 4,
				'name': translatedStrings.getText('STORE.MONTHLY')
			}, {
				'id': 5,
				'name': translatedStrings.getText('STORE.YEARLY')
			}
		]
	}),
	decimalPlaceStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'settingsDecimalPlaceStore',
		data: [
			{
				'id': 0,
				'name': 0
			}, {
				'id': 1,
				'name': 1
			}, {
				'id': 2,
				'name': 2
			}, {
				'id': 3,
				'name': 3
			}, {
				'id': 4,
				'name': 4
			}
		]
	}),
	viewPreset: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'settingsViewPresetStore',
		data: [
			{
				'id': 1,
				'name': translatedStrings.getText('STORE.DAILY')
			}, {
				'id': 2,
				'name': translatedStrings.getText('STORE.WEEKLY')
			}, {
				'id': 3,
				'name': translatedStrings.getText('STORE.MONTHLY')
			}
		]
	}),
	viewResourcesBy: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'settingsViewResourcesByStore',
		data: [
			{id: 1, name: translatedStrings.getText('COMBOBOX.RESOURCE')},
			{id: 2, name: translatedStrings.getText('COMBOBOX.CUSTOMER')},
			{id: 3, name: translatedStrings.getText('COMBOBOX.PROJECT')}
		]
	}),
	filterLocation: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'filterLocation',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=location&removeAll=T'
	}),
	filterClass: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'filterClass',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=classification&removeAll=T'
	}),
	filterDept: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'filterDept',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=department&removeAll=T'
	}),
	approverStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'approverStore',
		sorters: [
			{
				sorterFn: function (o1, o2) {
					var name1 = o1.data.name || '';
					var name2 = o2.data.name || '';
					return (name1.localeCompare(name2, undefined, {numeric: true}));
				}
			}
		],
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=employee&removeAll=T'
	}),
	billingClass: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'billingClassStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=billingclass&removeAll=T'
	}),
	billingClassSearch: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'billingClassStore2',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=billingclass',
		filterContents: function (billingClass) {
			var me = this,
				billingClasses = billingClass ? billingClass.split(',') : '';

			me.clearFilter();

			if (billingClasses.length > 0 && billingClasses[0] != '') {
				me.filterBy(function (record, id) {
					if (isNaN(id)) {
						return true;
					}
					for (var i = 0; i < billingClasses.length; i++) {
						if (id == billingClasses[i]) {
							return true;
						}
					}
					return false;
				});
			} else {
				me.clearFilter();
			}
		}
	}),
	subsidiary: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'subsidiaryStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=subsidiary&removeAll=T'
	}),
	vendorCategory: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'vendCategoryStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=vendorcategory&removeAll=T'
	}),
	vendorType: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'vendTypeStore',
		data: [
			{
				'id': 0,
				'name': translatedStrings.getText('STORE.COMPANY')
			}, {
				'id': 1,
				'name': translatedStrings.getText('STORE.INDIVIDUAL')
			}
		]
	}),
	appStatusStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'approvalStatus',
		data: [
			{
				'id': 4,
				'name': translatedStrings.getText('STORE.PENDING_APPROVAL')
			}, {
				'id': 5,
				'name': translatedStrings.getText('STORE.APPROVED')
			}, {
				'id': 6,
				'name': translatedStrings.getText('STORE.REJECTED')
			}
		]
	}),
	settingStore: Ext4.create('RA.Cmp.Store.Settings', {
		id: 'settingStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_settings&deploy=customdeploy_proj_racg_su_settings&isDashboard='+(RA.Util.Dashboard.isActive() ? 'T' : 'F'),
		root: 'settings'
	}),
	chartResource: Ext4.create('RA.Cmp.Store.Resource', {
		id: 'chartResource',
		model: 'RA.Cmp.Model.ChartResource',
		folderSort: true,
		proxy: {
			type: 'rest',
			url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_resource&deploy=customdeploy_proj_racg_su_resource',
			reader: {
				type: 'json'
			},
			appendId: false
		}
	}),
	filtersResourceTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'filtersResourceTempStore',
	}),
	allocationResourceTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'allocationResourceTempStore',
	}),
	resourceCount: Ext4.create('RA.Cmp.Store.ResourceCount', {
		id: 'resourceCount',
		proxy: {
			type: 'rest',
			url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_ra_count&deploy=customdeploy_proj_racg_su_ra_count',
			reader: {
				type: 'json'
			}
		}
	}),
	chartEvent: Ext4.create('RA.Cmp.Store.Allocation', {
		id: 'chartEvents',
		model: 'RA.Cmp.Model.ChartAllocation',
		proxy: {
			type: 'rest',
			url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_allocation&deploy=customdeploy_proj_racg_su_allocation',
			reader: {
				type: 'json',
				root: 'data'
			}
		}
	}),
	allocationSaver: Ext4.create('RA.Cmp.Store.Allocation', {
		id: 'allocationSaver',
		model: 'RA.Cmp.Model.ChartAllocation',
		proxy: {
			type: 'rest',
			url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_alloc_saver&deploy=customdeploy_proj_racg_su_alloc_saver&isResource=F',
			reader: {
				type: 'json',
				root: 'data'
			},
			appendId: false
		},
		transferModifiedRecords: function () {
			var me = this,
				store = RA.App.Stores.chartEvent,
				updated = store.getModifiedRecords().filter(function (element, index, array) {
					return !element.get('isDummy') && element.get('allocId') != 0;
				}),
				deleted = store.getRemovedRecords().filter(function (element, index, array) {
					return !element.get('isDummy') && element.get('allocId') > 0;
				});

			//assigned negative internalid to avoid conflict with updated records
			for (var x in deleted) {
				deleted[x].internalId = -1 - x;
			}
			//modify unit according to current mode; if grid, always set to 2 (Hours); if chart, set according to settings
			var saveUnit = RA.App.ModeManager.mode == 'grid' ? 2 : RA.App.Settings.data.allocateById;
			for (var x in updated) {
				updated[x].data.unit = saveUnit;
			}
			if ((updated.length > 0) || (deleted.length > 0)) {
				me.loadData(deleted, false);
				me.loadData(updated, true);
				return true; //there are pending changes
			} else {
				return false; //there are no pending changes
			}
		}
	}),
	projectCommentSaver: Ext4.create('Ext4.data.JsonStore', {
		id: 'projectCommentSaver',
		model: 'RA.Cmp.Model.ProjectComment',
		proxy: {
			type: 'ajax',
			url: nlapiResolveURL('SUITELET', 'customscript_proj_racg_su_proj_comment', 'customdeploy_proj_racg_su_proj_comment'),
			reader: {
				type: 'json',
				root: 'data',
			},
			appendId: false
		},
	}),
	pageStore: Ext4.create('RA.Cmp.Store.PageDropDown', {
		id: 'pageStore',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_page_store&deploy=customdeploy_proj_racg_su_page_store&isResource=T&isPaging=T&start=0',
		listeners: {
			beforeload: function (store, operation, eOpts) {
				operation.params = RA.Util.CustomFunctions.mergeObjects(operation.params, RA.App.Stores.chartResource.getParams());
				operation.params.includeRejected = RA.App.Settings.get('includeRejected') || 'F';
				operation.params.showAllResources = RA.App.Settings.get('includeAllResources') || 'F';
			},
			load: function (store, records) {
				var combo = Ext4.getCmp('ra-page-combo-box');
				if (combo && combo.getValue() == null) {
					combo.setValue(0);
					combo.setWidth(RA.Util.TextMetrics.getMetrics('14px').getSize(combo.getRawValue()).width + 55);
				}
			}
		}
	}),
	largeDataRangeResourceStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeResourceStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=projectresource&removeAll=T&showInactives=F&range=T'
	}),
	largeDataRangeProjectTaskStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeProjectTaskStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=projecttask&removeAll=T&showInactives=F&range=T'
	}),
	largeDataRangeProjectStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeProjectStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=job&removeAll=T&range=T'
	}),
	largeDataRangeApproverStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeApproverStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=employee&removeAll=T&range=T'
	}),
	largeDataRangeClassStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeClassStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=classification&removeAll=T&showInactives=F&range=T'
	}),
	largeDataRangeDepartmentStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeDepartmentStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=department&removeAll=T&showInactives=F&range=T'
	}),
	largeDataRangeLocationStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeLocationStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=location&removeAll=T&showInactives=F&range=T'
	}),
	largeDataRangeSubsidiaryStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeSubsidiaryStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=subsidiary&removeAll=T&showInactives=F&range=T'
	}),
	largeDataRangeBillingClassStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeBillingClassStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=billingclass&removeAll=T&showInactives=F&range=T'
	}),
	largeDataRangeCustomerStore: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'largeDataRangeCustomerStore',
		model: 'RA.Cmp.Model.LargeDataDropdownRange',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=customer&removeAll=T&showInactives=F&range=T'
	}),

	largeDataSelectedStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'largeDataSelectedStore',
		root: 'data',
		proxy: {
			type: 'ajax',
			reader: {
				type: 'json',
				root: 'data'
			}
		}
	}),
	largeDataLocalTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'largeDataLocalTempStore'
	}),
	filtersProjectTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'filtersProjectTempStore',
	}),
	allocationProjectTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'allocationProjectTempStore',
	}),
	filtersProjectTaskTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'filtersProjectTaskTempStore',
	}),
	allocationProjectTaskTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'allocationProjectTaskTempStore',
	}),
	largeDataCustomerTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'largeDataCustomerTempStore',
		listeners: {
			add: function (me) {
				console.log('[' + Ext4.util.Format.date(new Date(), 'h:i:s') + ']loaded ' + me.storeId);
			}
		}
	}),
	 largeDataApproverTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'largeDataApproverTempStore'
	}),
	largeDataBillingClassTempStore: Ext4.create('RA.Cmp.Store.ArrayStore', {
		storeId: 'largeDataBillingClassTempStore',
	}),
	expResourceStore: Ext4.create('RA.Cmp.Store.ExportResource'),
	expAllocStore: Ext4.create('RA.Cmp.Store.ExportAllocations'),
	gridStore: Ext4.create('RA.Cmp.Store.GridAllocation', {
		id: 'gridStore'
	}),
	ordinalDayOfMonthSuffixStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'ordinalDayOfMonthSuffixStore',
		data: [
			{
				'id': 1,
				'name': translatedStrings.getText('1ST')
			}, {
				'id': 2,
				'name': translatedStrings.getText('2ND')
			}, {
				'id': 3,
				'name': translatedStrings.getText('3RD')
			}, {
				'id': 4,
				'name': translatedStrings.getText('4TH')
			}, {
				'id': 5,
				'name': translatedStrings.getText('LAST')
			}
		]
	}),
	dayOfWeekStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'dayOfWeekStore',
		data: RA.Util.CustomFunctions.rotate(
			[
				{
					'id': 1,
					'name': translatedStrings.getText('SUN')
				}, {
					'id': 2,
					'name': translatedStrings.getText('MON')
				}, {
					'id': 3,
					'name': translatedStrings.getText('TUE')
				}, {
					'id': 4,
					'name': translatedStrings.getText('WED')
				}, {
					'id': 5,
					'name': translatedStrings.getText('THU')
				}, {
					'id': 6,
					'name': translatedStrings.getText('FRI')
				}, {
					'id': 7,
					'name': translatedStrings.getText('SAT')
				}
			],
			RA.Util.CustomFunctions.getWeekStart()
		)
	}),
	monthStore: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'monthStore',
		data: [
			{
				'id': 0,
				'name': translatedStrings.getText('MONTH.JANUARY')
			}, {
				'id': 1,
				'name': translatedStrings.getText('MONTH.FEBRUARY')
			}, {
				'id': 2,
				'name': translatedStrings.getText('MONTH.MARCH')
			}, {
				'id': 3,
				'name': translatedStrings.getText('MONTH.APRIL')
			}, {
				'id': 4,
				'name': translatedStrings.getText('MONTH.MAY')
			}, {
				'id': 5,
				'name': translatedStrings.getText('MONTH.JUNE')
			}, {
				'id': 6,
				'name': translatedStrings.getText('MONTH.JULY')
			}, {
				'id': 7,
				'name': translatedStrings.getText('MONTH.AUGUST')
			}, {
				'id': 8,
				'name': translatedStrings.getText('MONTH.SEPTEMBER')
			}, {
				'id': 9,
				'name': translatedStrings.getText('MONTH.OCTOBER')
			}, {
				'id': 10,
				'name': translatedStrings.getText('MONTH.NOVEMBER')
			}, {
				'id': 11,
				'name': translatedStrings.getText('MONTH.DECEMBER')
			}
		]
	}),
	filterValues: Ext4.create('RA.Cmp.Store.GenericDropDown', {
		id: 'filterValues',
		model: 'RA.Cmp.Model.FilterValues',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_filter_values&deploy=customdeploy_proj_racg_su_filter_values',
		root: 'filterValues',
		listeners: {
			beforeLoad: function() {
				this.getProxy().extraParams = {
					isDashboard: RA.Util.Dashboard.isActive()
				};
			}
		}
	}),
	dataCount: Ext4.create('RA.Cmp.Store.DataCount', {
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_data_count&deploy=customdeploy_proj_racg_su_data_count'
	}),
	resourceSegments: Ext4.create('RA.Cmp.Store.ArraySegmentStore', {
		id: 'resourceSegments',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=resourceSegment&removeAll=T'
	}),
	singleSegmentValues: {},
	resourceSegmentTypes: Ext4.create('RA.Cmp.Store.ArraySegmentStore', {
		id: 'resourceSegmentTypes',
		model: 'RA.Cmp.Model.CustomResourceSegmentValue',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=resourceSegmentTypes&removeAll=T',
		listeners: {
			load: function (me) {
				console.log('[' + Ext4.util.Format.date(new Date(), 'h:i:s') + '] loaded ' + me.storeId);
				var segs = me.data.items;
				for (var i = 0; i < segs.length; i++) {
					var segmentid = segs[i].data.id;
					RA.App.Stores.singleSegmentValues[segmentid] = Ext4.create('RA.Cmp.Store.ArraySegmentStore', {
						id: segmentid,
						model: 'RA.Cmp.Model.CustomResourceSegmentValue',
						url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&searchType=resourceSegmentValues&removeAll=T&segment=' + segmentid,
						listeners: {
							load: function (me) {
								console.log('[' + Ext4.util.Format.date(new Date(), 'h:i:s') + '] loaded ' + me.storeId);
							}
						}
					});
					RA.App.Stores.singleSegmentValues[segmentid].load();
				}
			}
		}
	}),


	/*
	 * TODO: move this to a new file once all data types are supported...
	 */
	listDataRecordLoader: Ext4.create('RA.Cmp.Store.DropDown', {
		id: 'listDataRecordLoader',
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data',
		loadRecord: function (recordType, internalId, callback) {
			var params = null;

			switch (recordType) {
				case 'resource':
					params = {
						searchType: 'projectresource',
						resourcesFilter: internalId
					};
					break;
				case 'project':
					params = {
						searchType: 'job',
						jobFilter: internalId
					};
					break;
				case 'projecttask':
					params = {
						searchType: 'projecttask',
						taskFilter: internalId
					};
					break;
				case 'approver':
					params = {
						searchType: 'employee',
						resourcesFilter: internalId
					};
					break;
				case 'customer':
					params = {
						searchType: 'customer',
						customerFilter: internalId,
						resourcesFilter: internalId,
					};
					break;
			}

			this.load({
				params: params,
				callback: callback
			});
		}
	}),
	timeOff: Ext4.create('RA.Cmp.Store.TimeOff', {
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_time_off_reqs&deploy=customdeploy_proj_racg_su_time_off_reqs'
	}),
	timeOffConflict: Ext4.create('RA.Cmp.Store.TimeOff', {
		url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_time_off_reqs&deploy=customdeploy_proj_racg_su_time_off_reqs'
	})
};