/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.App.GridEditor', {
	singleton: true,
	initEditors: function () {
		var FORM_ID = 'grid-editor';
		Ext4.apply(this, {
			commentEditor: Ext4.create('Ext4.form.field.TextArea', {
				id: 'ra-cell-comment',
				width: 350,
				listeners: {
					blur: function (component, event, eOpts) {
						perfTestLogger.start('Edit Comment');
						var stores = RA.App.Stores,
							chartEvent = stores.chartEvent,
							allocRecord = component.allocRecord,
							gridRecord = component.gridRecord,
							pendingApproval = RA.App.Constant.PENDING_APPROVAL,
							pendingApprovalText = stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name'),
							approvalEnabled = stores.featureStore.isRAAWEnabled();

						if (allocRecord.get('comment') != component.getValue()) {
							allocRecord.beginEdit();
							if (approvalEnabled) {
								allocRecord.set('approvalStatus', pendingApproval);
								allocRecord.set('tipAppStatus', pendingApprovalText);
							}

							allocRecord.set('comment', component.getValue());
							allocRecord.endEdit();
						}
						perfTestLogger.stop();
					}
				}
			}),
			endDateEditor: Ext4.create('RA.Cmp.Date', {
				id: 'ra-cell-enddate',
				allowBlank: false,
				width: 175,
				listeners: {
					select: function (component, value, eOpts) {
						perfTestLogger.start('Edit End Date');
						var stores = RA.App.Stores;
						var chartResource = stores.chartResource;
						var chartEvent = stores.chartEvent;
						var gridStore = stores.gridStore;
						var allocRecord = component.allocRecord;
						var pendingApproval = RA.App.Constant.PENDING_APPROVAL;
						var pendingApprovalText = stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name');
						var approvalEnabled = stores.featureStore.isRAAWEnabled();
						var resourceRecord = chartResource.getResourceObjByRow(allocRecord.get('resourceId'));
						var startDate = allocRecord.get('startTimestamp');
						var startTime = startDate.getTime();
						var lastDate = Ext4.Date.clearTime(value);
						var endTimestamp = Ext4.Date.clearTime(new Date(lastDate.getTime() + RA.App.Constant.DAY_IN_MILLI));
						var endTime = endTimestamp.getTime();
						var rowId = allocRecord.get('ResourceId');
						var noOverlapExists = !(chartEvent.withOverlaps(rowId, startTime, endTime, allocRecord.get('allocId')));

						if (startDate > lastDate) {
							alert(translatedStrings.getText('MESSAGE.ERROR.RA_INVALID_DATES'));
							component.setValue(allocRecord.get('endTimestamp'));
							component.focus();
						} else if (!RA.App.Stores.chartEvent.isStartEndValid(startDate, lastDate, allocRecord.get('resourceId'), resourceRecord.getRootWorkCalendar())) {
							alert(translatedStrings.getText('MESSAGE.ERROR.RA_NON_WORKING_DAY'));
							component.setValue(allocRecord.get('endTimestamp'));
							component.focus();
						} else if (!noOverlapExists) {
							alert(translatedStrings.getText('MESSAGE.ERROR.RA_CHOSEN_DATE_OVERLAP'));
							component.setValue(allocRecord.get('endTimestamp'));
							component.focus();
						} else {
							allocRecord.beginEdit();
							if (approvalEnabled) {
								allocRecord.set('approvalStatus', pendingApproval);
								allocRecord.set('tipAppStatus', pendingApprovalText);
							}
							allocRecord.set('tipEnd', Ext4.Date.format(lastDate, RA.App.NSProps.getDateFormat()));
							allocRecord.set('endTimestamp', endTimestamp);
							allocRecord.computePercentage(resourceRecord.getRootWorkCalendar());
							allocRecord.endEdit();

							RA.App.Grid.suspendLayout = true;
							chartEvent.refreshRollUpsByResource(allocRecord.get('resourceId'));
							gridStore.transformChartData();
							RA.App.Grid.suspendLayout = false;
							RA.App.Grid.doLayout();

							var endDateWindow = Ext4.WindowManager.get('ra-endDateWindow');
							endDateWindow.close();
						}
						perfTestLogger.stop();
					}
				}
			})
		});
	}
});
