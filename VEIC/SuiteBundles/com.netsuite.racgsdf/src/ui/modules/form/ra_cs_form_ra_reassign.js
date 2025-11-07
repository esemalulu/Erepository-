/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.ReassignAllocForm', {
	extend: 'RA.Cmp.Window',
	title: translatedStrings.getText('WINDOW.REASSIGN_ALLOCATIONS'),
	id: 'reassign-ra',
	width: 1300,
	prevResourceId: 0,
	prevProjectId: 0,
	listeners: {
		beforeShow: function (window, eOpts) {
			var record = RA.App.Chart.selModel.selected.items[0];
			var resourceId = record.get('resourceId');
			var projectId = record.get('projectId');
			var resource = RA.App.Stores.chartResource.getResourceObjByRow(resourceId).raw;
			var projectName = record.get('projectName');
			var taskId = record.get('taskId') || 0;
			var taskName = record.get('taskName');
			var showProjectTasks = RA.App.Settings.get('showProjectTasks') == 'T';
			var resourceFld = Ext4.getCmp('reassign-ra-resource');

			this.prevResourceId = resourceId;
			this.prevProjectId = projectId;
			this.taskId = taskId;
			this.taskName = taskName;

			Ext4.getCmp('editrow-project').setValue(projectId);
			Ext4.getCmp('editrow-project-label').setValue(projectName);

			if (showProjectTasks && taskId) {
				Ext4.getCmp('editrow-project-task-label').show();
				Ext4.getCmp('editrow-project-task-label').setValue(taskName);
			} else {
				Ext4.getCmp('editrow-project-task-label').hide();
			}

			resourceFld.setValue(parseInt(resource.Id), resource.Name);

			Ext4.getCmp('editrow-project').store.on('load', function (store) {
				if (store.find('id', projectId, 0, false, false, true) < 0) {
					var projectModel = Ext4.create('RA.Cmp.Model.DropDown', {
						id: projectId,
						name: projectName
					});
					store.add(projectModel);
				}
				Ext4.getCmp('editrow-project').setValue(projectId);
			});

			var allocations = [];
			allocations = RA.App.Stores.chartEvent.getAllocations(this.prevResourceId, this.prevProjectId, taskId);

			var sublistStore = Ext4.getCmp('ra-sublist').store;
			var sublist = new Array();
			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				window.width = 750;
			} else {
				Ext4.getCmp('ra-sublist-nextApprover').hide();
				Ext4.getCmp('ra-sublist-approvalStatus').hide();
			}
			for (var i = 0; i < allocations.length; i++) {
				var alloc = Ext4.create('RA.Cmp.Model.RASublist', {
					startDate:  Ext4.Date.format(allocations[i].get('startTimestamp'), RA.App.NSProps.getDateFormat()),
					endDate: Ext4.Date.format(allocations[i].getLastDate(), RA.App.NSProps.getDateFormat()),
					allocate: parseFloat(allocations[i].get('unit') == 1
										 ? allocations[i].get('percent')
										 : allocations[i].get('hour')).toFixed(RA.App.Settings.get('limitDecimalPlaces')),
					unit: allocations[i].get('unit') == 1
						  ? translatedStrings.getText('STORE.PERCENTAGE')
						  : translatedStrings.getText('STORE.HOURS'),
					type: allocations[i].get('type'),
					comment: allocations[i].get('comment'),
					isRecurring: allocations[i].isRecurring()
				});
				if (RA.App.Stores.featureStore.isRAAWEnabled()) {
					var approver = parseInt(allocations[i].get('nextApprover'));
					var status = parseInt(allocations[i].get('approvalStatus'));
					if (approver && approver != 0 && RA.App.Stores.approverStore.getById(approver) != null) {
						alloc.set('nextApprover', RA.App.Stores.approverStore.getById(approver).get('name'));
					}
					if (status && status > 0) {
						alloc.set('approvalStatus', RA.App.Stores.appStatusStore.getById(status).get('name'));
					}
				}

				alloc.data.allocate = alloc.raw.allocate;

				sublist.push(alloc);
			}
			sublistStore.removeAll();
			sublistStore.add(sublist);
		},
		hide: function (window, eOpts) {
			RA.App.Chart.selModel.deselectAll();
			Ext4.getCmp('reassign-ra-resource').reset();
		}
	},
	items: [
		{
			xtype: 'ra-form-panel',
			id: 'ra-reassignPanel',
			items: [
				{
					xtype: 'ra-ldc-ss-resource',
					id: 'reassign-ra-resource',
					formId: 'reassign-ra',
					allowBlank: false,
					comboOnChange: function (combobox, record) {
						var resource = combobox.getSelectedRecord();
						if (resource) {
							//Load New Time off base from Resource
							RA.App.Stores.timeOffConflict.load({
								params: {resourceId: resource.get('id')},
								callback: function (records, operation, success) {
									var okButton = Ext4.getCmp('ra-reassignOkBtn');
									okButton.setDisabled(false);
									if (!success) {
										console.error('Failed to load resource time off');
									}
								}
							});
						}
					}
				}, {
					xtype: 'ra-space'
				}, {
					xtype: 'ra-combo-box',
					id: 'editrow-project',
					fieldLabel: translatedStrings.getText('COMBOBOX.CUSTOMER_PROJECT'),
					emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.CUSTOMER_PROJECT'),
					store: RA.App.Stores.projectFilterStore,
					hidden: true
				}, {
					xtype: 'ra-display',
					id: 'editrow-project-label',
					fieldLabel: translatedStrings.getText('DISPLAY.CUSTOMER_PROJECT')
				}, {
					xtype: 'ra-display',
					id: 'editrow-project-task-label',
					fieldLabel: translatedStrings.getText('DISPLAY.PROJECT_TASK'),
					hidden: true
				}, {
					xtype: 'ra-combo-box',
					id: 'editrow-appstatus',
					fieldLabel: translatedStrings.getText('COMBOBOX.APPROVAL_STATUS'),
					emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.BLANK'),
					store: RA.App.Stores.appStatusStore,
					featureName: 'approvalWorkFlow',
					hidden: true
				}, {
					xtype: 'ra-spacer',
					height: 22
				}, {
					xtype: 'gridpanel',
					id: 'ra-sublist',
					store: Ext4.create('RA.Cmp.Store.RASublist'),
					forceFit: true,
					header: false,
					columns: [
						{
							id: 'ra-sublist-startDate',
							text: translatedStrings.getText('PANEL.COLUMN.START_DATE'),
							dataIndex: 'startDate',
							menuDisabled: true
						}, {
							id: 'ra-sublist-endDate',
							text: translatedStrings.getText('PANEL.COLUMN.END_DATE'),
							dataIndex: 'endDate',
							menuDisabled: true
						}, {
							id: 'ra-sublist-allocate',
							text: translatedStrings.getText('PANEL.COLUMN.ALLOCATE'),
							dataIndex: 'allocate',
							menuDisabled: true,
							renderer: function (value, meta, record) {
								if (record.get('isRecurring')) {
									meta.tdCls += ' ra-recurrence-indicator-icon';
								}
								return value;
							}
						}, {
							id: 'ra-sublist-unit',
							text: translatedStrings.getText('PANEL.COLUMN.UNIT'),
							dataIndex: 'unit',
							menuDisabled: true
						}, {
							id: 'ra-sublist-type',
							text: translatedStrings.getText('PANEL.COLUMN.TYPE'),
							dataIndex: 'type',
							menuDisabled: true
						}, {
							id: 'ra-sublist-approvalStatus',
							text: translatedStrings.getText('PANEL.COLUMN.APPROVAL_STATUS'),
							dataIndex: 'approvalStatus',
							menuDisabled: true,
							id: 'ra-sublist-approvalStatus'
						}, {
							id: 'ra-sublist-nextApprover',
							text: translatedStrings.getText('PANEL.COLUMN.NEXT_APPROVER'),
							dataIndex: 'nextApprover',
							menuDisabled: true,
							id: 'ra-sublist-nextApprover'
						}, {
							id: 'ra-sublist-comment',
							text: translatedStrings.getText('PANEL.COLUMN.COMMENT'),
							dataIndex: 'comment',
							menuDisabled: true,
							renderer: function (value, meta, record) {
								meta.tdAttr = 'data-qtip="' + value + '"';
								return value.length < 15 ? value : value.substring(0, 12) + '...';
							}
						}
					]
				}
			],
			dockedItems: [
				{
					xtype: 'raformmenu',
					items: [
						{
							xtype: 'ra-blue-button',
							id: 'ra-reassignOkBtn',
							text: translatedStrings.getText('BUTTON.OK'),
							handler: function () {
								perfTestLogger.start('Reassign All Allocations');
								var resourceFld = Ext4.getCmp('reassign-ra-resource'),
									newResourceObj = resourceFld.getValue(),
									newResourceId = newResourceObj.get('id'),
									form = RA.App.Forms.reassignAllocForm;
								newProjectId = Ext4.getCmp('editrow-project').getValue();

								if (form.prevResourceId != newResourceId || form.prevProjectId != newProjectId) {
									var moveStatus = null;
									var projectTaskObj = {
										'taskId': form.taskId,
										'taskName': form.taskName
									};
									var count = RA.App.Stores.timeOffConflict.getCount(),
										arrTimeOff = [], objTimeOff;
									for (var i = 0; i < count; i++) {
										objTimeOff = RA.App.Stores.timeOffConflict.getAt(i);
										arrTimeOff.push({
											timeOffDate: objTimeOff.get('timeOffDate'),
											requestId: objTimeOff.get('requestId'),
											startDate: objTimeOff.get('startDate'),
											endDate: objTimeOff.get('endDate'),
											amountOfTime: +(objTimeOff.get('amountOfTime')),
											timeUnit: objTimeOff.get('timeUnit')
										});
									}
									moveStatus = RA.App.Stores.chartEvent.moveAllAllocations(form.prevResourceId, newResourceId, newProjectId, projectTaskObj, newResourceObj, arrTimeOff);

									switch (moveStatus) {
										case 'success':
											if (RA.App.Chart)
												RA.App.Chart.refreshNonWorking(true);
											form.hide();
											perfTestLogger.stop();
											break;
										case 'overlap':
											alert(translatedStrings.getText('MESSAGE.ERROR.REASSIGN_RA_OVERLAP'));
											break;
										case 'nonworking':
											alert(translatedStrings.getText('MESSAGE.ERROR.REASSIGN_RA_TARGET_CONFLICT'));
											break;
									}
								} else {
									alert(translatedStrings.getText('MESSAGE.ERROR.REASSIGN_RA_ALREADY_ASSIGNED'));
								}
							}
						}, {
							xtype: 'ra-gray-button',
							id: 'ra-reassignCancelBtn',
							text: translatedStrings.getText('BUTTON.CANCEL'),
							handler: function () {
								RA.App.Forms.reassignAllocForm.hide();
							}
						}
					]
				}
			]
		}
	]
});
