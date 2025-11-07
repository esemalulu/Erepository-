/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.LargeDataForm', {
	extend: 'RA.Cmp.Window',
	id: 'racg-large-data-form',
	width: 500,
	items: [
		{
			xtype: 'form',
			id: 'ra-largedata-panel',
			layout: 'form',
			border: false,
			padding: 20,
			items: [
				{
					xtype: 'ra-combo-box',
					id: 'ra-largedata-range',
					fieldLabel: '',
					store: RA.App.Stores.largeDataRangeStore,
					listeners: {
						select: function (combo, record, eOpts) {
							var form = RA.App.Forms.largeDataForm;
							var range = this.getSelectedRecord();

							if (range) {
								var startIndex = range.get('startIndex');
								var endIndex = range.get('endIndex');
								var jobFilter = null;

								if (form.recordType == 'projecttask') {
									if (form.projectFilter) {
										jobFilter = form.projectFilter;
									} else {
										var jobCombo = Ext4.getCmp(form.formId + '-project');
										jobFilter = (jobCombo && jobCombo.getValue()) ? (jobCombo.isLargeData()
																						 ? jobCombo.getValue().get('id')
																						 : jobCombo.getValue()) : null;
									}
								}

								form.loadItemSelectorContent({
									startIndex: startIndex,
									endIndex: endIndex,
									jobFilter: jobFilter
								});
							}
						}
					}
				}, {
					xtype: 'ra-space',
					id: 'ra-largedata-range-space'
				}, {
					xtype: 'ra-flex-field-container',
					id: 'ra-largedata-search',
					layout: 'hbox',
					items: [
						{
							xtype: 'textfield',
							id: 'ra-largedata-searchtext',
							fieldLabel: '',
							flex: 4.15
						}, {
							xtype: 'ra-hspace',
							flex: 0.25
						}, {
							xtype: 'ra-gray-button',
							id: 'ra-largedata-searchbutton',
							text: translatedStrings.getText('TEXT.SEARCH'),
							flex: 2.50,
							handler: function () {
								var form = RA.App.Forms.largeDataForm;
								var searchText = Ext4.getCmp('ra-largedata-searchtext').getValue().trim();

								if (searchText == '') {
									form.setFieldVisibility();
									Ext4.getCmp('ra-largedata-range').fireEvent('select');
								} else {
									Ext4.getCmp('ra-largedata-range-space').hide();
									Ext4.getCmp('ra-largedata-range').hide();

									var jobFilter = null;

									if (form.recordType == 'projecttask') {
										if (form.projectFilter) {
											jobFilter = form.projectFilter;
										} else {
											var jobCombo = Ext4.getCmp(form.formId + '-project');
											jobFilter = (jobCombo && jobCombo.getValue())
														? (jobCombo.isLargeData()
														   ? jobCombo.getValue().get('id')
														   : jobCombo.getValue())
														: null;
										}
									}

									form.loadItemSelectorContent({
										nameStartsWith: searchText,
										jobFilter: jobFilter
									});
								}
							}
						}
					]
				}, {
					xtype: 'ra-space'
				}, {
					xtype: 'ra-multi-select-field',
					id: 'ra-largedata-multiselect',
					height: 250,
					displayField: 'name',
					valueField: 'id',
					store: RA.App.Stores.largeDataSelectedStore,
					buffer: 10,
					listeners: {
						change: function () {
							var selected = this.getSelected();
							var form = RA.App.Forms.largeDataForm;

							if (selected.length == 1) {
								var record = selected[0];

								if (record.get('id') != -1) {
									form.getCallerField().setValue(record.get('id'), record.get('name'));
									form.hide();
								}
							} else {
								form.getCallerField().setValue('', '');
								form.hide();
							}
						}
					}
				}
			]
		}
	],
	listeners: {
		beforeShow: function (me) {
			me.setStoreAndTitle();
			me.setFieldVisibility();
			me.resetSelections();
		}
	},
	setStoreAndTitle: function () {
		var title = null;
		switch (this.recordType) {
			case 'resource':
				Ext4.getCmp('ra-largedata-range').bindStore(RA.App.Stores.largeDataRangeResourceStore);
				title = translatedStrings.getText('MESSAGE.EMPTYTEXT.RESOURCE');
				break;
			case 'project':
				Ext4.getCmp('ra-largedata-range').bindStore(RA.App.Stores.largeDataRangeProjectStore);
				title = translatedStrings.getText('MESSAGE.EMPTYTEXT.CUSTOMER_PROJECT');
				break;
			case 'projecttask':
				Ext4.getCmp('ra-largedata-range').bindStore(RA.App.Stores.largeDataRangeProjectTaskStore);
				title = translatedStrings.getText('MESSAGE.EMPTYTEXT.PROJECT_TASK');
				break;
			case 'approver':
				Ext4.getCmp('ra-largedata-range').bindStore(RA.App.Stores.largeDataRangeApproverStore);
				title = translatedStrings.getText('MESSAGE.EMPTYTEXT.NEXT_APPROVER');
				break;
			case 'billingclass':
				Ext4.getCmp('ra-largedata-range').bindStore(RA.App.Stores.largeDataRangeBillingClassStore);
				title = translatedStrings.getText('MESSAGE.EMPTYTEXT.BILLINGCLASS');
				break;
		}
		this.setTitle(title);
	},
	setFieldVisibility: function () {
		var me = this;
		var rangeCombo = Ext4.getCmp('ra-largedata-range');
		var rangeSpace = Ext4.getCmp('ra-largedata-range-space');

		if (rangeCombo.store.getCount() == 1) {
			rangeCombo.hide();
			rangeSpace.hide();
		} else {
			rangeCombo.show();
			rangeSpace.show();
		}
	},
	resetSelections: function () {
		var searchText = Ext4.getCmp('ra-largedata-searchtext');
		var selectField = Ext4.getCmp('ra-largedata-multiselect');

		searchText.suspendEvents();
		searchText.reset();
		searchText.resumeEvents();

		selectField.suspendEvents();
		selectField.reset();
		selectField.resumeEvents();

		RA.App.Stores.largeDataSelectedStore.removeAll();

		Ext4.getCmp('ra-largedata-range').setValue(0);
		Ext4.getCmp('ra-largedata-range').fireEvent('select');
	},
	loadItemSelectorContent: function (params) {
		var store = RA.App.Stores.largeDataSelectedStore;

		Ext4.apply(store.getProxy(), {
			url: this.getURL()
		});

		store.suspendEvents();
		store.load({
			scope: this,
			params: params,
			callback: function (records, operation, success) {
				if (success) {
					var callerValue = this.getCallerField().getValue();

					if (callerValue) {
						var selectField = Ext4.getCmp('ra-largedata-multiselect');

						selectField.suspendEvents();
						selectField.setValue(callerValue.get('id'));
						selectField.resumeEvents();
					}

					if (records && !records.length) {
						store.add(Ext4.create('RA.Cmp.Model.DropDown', {
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
		store.resumeEvents();
	},
	getURL: function () {
		var url = '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&removeAll=T';
		switch (this.recordType) {
			case 'resource':
				url = url + '&searchType=projectresource&showAllResources=T&showInactives=F';
				break;
			case 'project':
				url = url + '&searchType=job';
				break;
			case 'projecttask':
				url = url + '&searchType=projecttask';
				break;
			case 'approver':
				url = url + '&searchType=employee';
				break;
			case 'billingclass':
				url = url + '&searchType=billingclass';
				break;
		}
		return url;
	},
	getTempStore: function () {
		var tempStore = null;
		switch (this.recordType) {
			case 'resource':
				tempStore = RA.App.Stores.filtersResourceTempStore;
				break;
			case 'project':
				tempStore = RA.App.Stores.filtersProjectTempStore;
				break;
			case 'projecttask':
				tempStore = RA.App.Stores.filtersProjectTaskTempStore;
				break;
			case 'approver':
				tempStore = RA.App.Stores.largeDataApproverTempStore;
				break;
			case 'billingclass':
				tempStore = RA.App.Stores.largeDataBillingClassTempStore;
				break;
		}
		return tempStore;
	},
	getCallerField: function () {
		return Ext4.getCmp([this.formId.toLowerCase(), this.recordType].join('-'));
	}
});