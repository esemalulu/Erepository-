/**
 * © 2015 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.MenuPanel', {
	extend: 'RA.Cmp.MainPanel',
	id: 'ra-menu',
	initComponent: function (args) {
		this.callParent(args);
	},
	items: [
		Ext4.create('RA.Cmp.BlueButton', {
			text: translatedStrings.getText('BUTTON.SAVE'),
			id: 'saveButton',
			handler: function (button, e) {
				perfTestLogger.start(RA.App.ModeManager.mode + ' Save Changes');

				//Check if any new resource allocation coincides with a timeoff
				var arrModRecords = RA.App.Stores.chartEvent.getModifiedRecords().filter(function (element, index, array) {
					return !element.get('isDummy') && element.get('allocId') != 0;
				});
				var isDaily = (RA.App.ModeManager.getActive().getViewPreset() == RA.Cmp.Store.GridAllocation.ViewPresets.DAILY);
				var timeOffHitWarning = false;
				for (var i = 0; i < arrModRecords.length; i++) {
					var resourceId = arrModRecords[i].get('resourceId');
					var startTimestamp = arrModRecords[i].get('startTimestamp');

					if (isDaily) {
						if (RA.Util.WorkCalendar.isResourceTimeOff(resourceId, startTimestamp)) {
							timeOffHitWarning = true;
							break;
						}
					} else {
						var lastDate = arrModRecords[i].getLastDate();
						if (RA.Util.WorkCalendar.isBetweenResourceTimeOff(resourceId, startTimestamp, lastDate)) {
							timeOffHitWarning = true;
							break;
						}
					}
				}
				if (timeOffHitWarning) {
					if (!confirm(translatedStrings.getText('NEW_RESOURCE_ALLOCATION_CONFLICT_CELL'))) {
						button.enable();
						return;
					}
				}

				var pendingChanges = RA.App.Stores.allocationSaver.transferModifiedRecords() || RA.App.Stores.projectCommentSaver.getModifiedRecords().length != 0;
				if ((!RA.App.Stores.chartEvent.areThereChanges() && RA.App.Stores.projectCommentSaver.getModifiedRecords().length == 0) || !pendingChanges) {
					button.enable();
					perfTestLogger.stop();
					alert(translatedStrings.getText('MESSAGE.ERROR.NO_CHANGES'));
					return;
				}
				RA.App.ModeManager.getActive().mask();

				RA.Util.Benchmarking.start(
					RA.Util.Benchmarking.constants.SAVING_CHANGES,
					{
						modAllocsCount: RA.App.Stores.allocationSaver.data.items.filter(function(item){return !item.removedFrom;}).length,
						remAllocsCount: RA.App.Stores.allocationSaver.data.items.filter(function(item){return item.removedFrom;}).length
					}
				);

				// sync projectComments first
				RA.App.Stores.projectCommentSaver.sync({
					success: function (batch) {
						//console.log('project comments saved');
						button.doSaveSuccess(button);
					},
					failure: function (batch) {
						//console.error('project comments failed saving');
						button.doSaveFailed(button);
					}
				});

				RA.App.Stores.allocationSaver.sync({
					success: function (batch) {
						const logPayload = RA.Util.Benchmarking.stopAndGetPayload(RA.Util.Benchmarking.constants.SAVING_CHANGES);

						RA.Util.Benchmarking.log(
							RA.Util.Benchmarking.constants.SAVING_CHANGES,
							'[PSA] RACG saving changes',
							{
								RACG_modifiedAllocationsCount: logPayload.modAllocsCount,
								RACG_removedAllocationsCount: logPayload.remAllocsCount
							},
							false
						);
						button.doSaveSuccess(button);
					},
					failure: function (batch) {
						RA.Util.Benchmarking.stop(RA.Util.Benchmarking.constants.SAVING_CHANGES);
						button.doSaveFailed(button);
					}
				});

				if (timeOffHitWarning) {
					RA.App.Stores.timeOff.clearTimeOffCache(); //Reset cache for timeoff conflict update
				}
			},
			listeners: {
				click: function (button, event, eOpts) {
					button.disable(); // disable button temporarily to avoid "double" saving of changes.
				}
			},
			doSaveSuccess: function (button) {
				RA.App.LoadMessage = translatedStrings.getText('MESSAGE.NOTIF.SAVE_SUCCESS');
				Ext4.getCmp('advFilterMain').enableFilter();
				button.enable();
				RA.App.Stores.chartResource.loadWithFilters(RA.App.Constant.LOAD_MODE_SAVE);
			},
			doSaveFailed: function (button) {
				button.enable();
				RA.App.ModeManager.getActive().unmask();
				perfTestLogger.stop();
				alert(translatedStrings.getText('MESSAGE.ERROR.SAVE_FAILED'));
			}
		}),
		Ext4.create('RA.Cmp.GrayButton', {
			id: 'ra-chartResetBtn',
			text: translatedStrings.getText('BUTTON.RESET'),
			handler: function () {
				perfTestLogger.start(RA.App.ModeManager.mode + ' Reset');
				RA.App.Stores.gridStore.reset();
				RA.App.Stores.chartResource.loadWithFilters(RA.App.Constant.LOAD_MODE_RELOAD);
				Ext4.getCmp('advFilterMain').enableFilter();
			}
		}),
		Ext4.create('RA.Cmp.MenuSeparator',
			{
				id: 'ra-newAllocationDiv'
			}
		),
		Ext4.create('RA.Cmp.BlueButton', {
			id: 'ra-newAllocationBtn',
			text: translatedStrings.getText('BUTTON.NEW_ALLOCATION'),
			handler: function () {
				RA.App.Forms.newAllocForm.show();
			}
		})
	]
});
