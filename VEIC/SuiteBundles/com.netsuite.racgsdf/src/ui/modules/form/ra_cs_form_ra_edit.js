/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.EditAllocForm', {
	extend: 'RA.Cmp.Window',
	title: translatedStrings.getText('WINDOW.EDIT_RESOURCE_ALLOCATION'),
	id: 'edit-ra',
	width: 850,
	setSupervisor: function (record) {
		if (this.hidden || !RA.App.Stores.featureStore.isRAAWEnabled()) return;

		var supervisorId = parseInt(record.raw.supervisorId);
		var supervisor = record.raw.supervisor;
		var approverFld = Ext4.getCmp('edit-ra-approver');
		var currentStore = approverFld.getStore();

		if (currentStore && !currentStore.query('id', supervisorId).getCount()) {
			var approverModel = Ext4.create('RA.Cmp.Model.DropDown', {
				id: supervisorId,
				name: supervisor
			});
			currentStore.add(approverModel);
		}

		approverFld.setValue(supervisorId, supervisor);
	},
	resetApprovalStatus: function () {
		if (RA.App.Stores.featureStore.isRAAWEnabled()) {
			Ext4.getCmp('edit-ra-appstatus-value').setValue(RA.App.Stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name'));
			Ext4.getCmp('edit-ra-appstatus').setValue(RA.App.Constant.PENDING_APPROVAL);
		}
	},
	listeners: {
		beforeShow: function (window, eOpts) {
			var savedFilterCombo = Ext4.getCmp('savedFilters');
			var filterRecord = savedFilterCombo.getSelectedRecord();
			var filterStartDate = filterRecord.get('startTimestamp');
			var record = RA.App.Chart.selectedEvent;
			var recordIds = record.get('Id').split(RA.App.Constant.SEPARATOR_ID);

			// if record is a recurrence, redirect to the original allocation record
			if (recordIds[0] == 'recurrence') {
				record = RA.App.Stores.chartEvent.getById(recordIds[1]);
				RA.App.Chart.selectedEvent = record;
			}

			var resourceId = record.get('resourceId');
			var projectId = record.get('projectId');
			var projectTaskId = record.get('taskId');
			var startTimestamp = record.get('startTimestamp');
			var lastDate = record.getLastDate();
			var comment = record.get('comment');
			var allocateBy = RA.App.Settings.get('allocateById');
			var allocateByLabel = RA.App.Stores.allocByStore.getById(RA.App.Settings.get('allocateById')).get('name');
			var allocateType = record.get('typeId');
			var allocate = allocateByLabel === RA.App.Stores.allocByStore.findRecord('id', 2).get('name')
						   ? record.get('hour')
						   : record.get('percent');
			var resourceFld = window.down('#edit-ra-resource');
			var projectFld = window.down('#edit-ra-project');
			var projectTaskFld = window.down('#edit-ra-projecttask');
			var approverFld = window.down('#edit-ra-approver');
			var project = null;
			var resource = null;

			switch (RA.App.Filters.filter.data.viewByType) {
				case 1:
					project = RA.App.Stores.chartResource.getResourceObjByRow(record.get('ResourceId')).raw;
					resource = RA.App.Stores.chartResource.getResourceObjByRow(record.get('resourceId')).raw;
					break;
				case 2:
					project = RA.App.Stores.chartResource.getResourceObjByRow(record.get('customerId') + RA.App.Constant.SEPARATOR_ID + record.get('projectId')).raw;
					resource = RA.App.Stores.chartResource.getResourceObjByRow(record.get('ResourceId')).raw;
					break;
				case 3:
					project = RA.App.Stores.chartResource.getResourceObjByRow(record.get('projectId')).raw;
					resource = RA.App.Stores.chartResource.getResourceObjByRow(record.get('ResourceId')).raw;
					break;
			}

			resourceFld.setValue(parseInt(resourceId), resource.Name);
			projectFld.setValue(parseInt(projectId), project.projectName);

			if (RA.App.Settings && RA.App.Settings.get('showProjectTasks') == 'F' || RA.App.Filters.filter.data.viewByType !== 1) {
				projectTaskFld.hide();
			} else {
				projectTaskFld.show();
			}

			window.down('#edit-ra-startDate').setMinValue(filterStartDate);
			window.down('#edit-ra-endDate').setMinValue(filterStartDate);
			window.down('#edit-ra-startDate').setValue(startTimestamp);
			window.down('#edit-ra-endDate').setValue(lastDate);
			window.down('#edit-ra-allocate').setValue(allocate);
			window.down('#edit-ra-allocateby').setValue(allocateBy);
			window.down('#edit-ra-allocateby-label').setText(allocateByLabel);
			window.down('#edit-ra-allocatetype').setValue(allocateType);
			window.down('#edit-ra-comment').setValue(comment);

			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				var acurrentStore = approverFld.getStore();

				if (record.get('nextApprover') != -1 && acurrentStore.find('id', record.get('nextApprover'), 0, false, false, true) < 0) {
					var approverModel = Ext4.create('RA.Cmp.Model.DropDown', {
						id: record.get('nextApprover'),
						name: record.get('tipApprover')
					});

					acurrentStore.add(approverModel);
				}

				approverFld.setValue(parseInt(record.get('nextApprover')), record.get('tipApprover'));

				window.down('#edit-ra-appstatus-value').setValue(RA.App.Stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name'));
			} else {
				window.down('#edit-ra-appstatus-value').hide();
				if (approverFld) {
					approverFld.destroy();
				}
			}

			// recurrence fields
			var rRecurrFld = window.down('#edit-ra-recurrence');
			var rStartFld = window.down('#edit-ra-recurr-start');
			var rEndFld = window.down('#edit-ra-recurr-end');

			// recurrence values
			var rRecurrVal = record.get('frequency');
			var rStartVal = record.get('seriesStartDate');
			var rEndVal = record.get('seriesEndDate');
			var rPeriodVal = record.get('period');
			var rDoWVal = record.get('dayOfWeek');
			var rDoWMaskVal = record.get('dayOfWeekMask');
			var rDoWiMVal = record.get('dayOfWeekInMonth');

			// shared across all recurrence types
			rStartFld.setValue(rStartVal ? rStartVal : startTimestamp);
			rEndFld.setValue(rEndVal ? rEndVal : startTimestamp);

			// trigger blur events of series start & end to set proper values of other recurrence fields
			rStartFld.fireEvent('blur', rStartFld);
			rEndFld.fireEvent('blur', rEndFld);

			// specific per recurrence type
			switch (rRecurrVal) {
				case '':
				case 'NONE':
					break;
				case 'DAY':
					rRecurrFld.setValue(2);
					window.down('#edit-ra-xdays').setValue(true);
					window.down('#edit-ra-daily-frequency').setValue(rPeriodVal);
					break;
				case 'WEEK':
					if (rPeriodVal == 1 && rDoWMaskVal == 'FTTTTTF') {
						rRecurrFld.setValue(2); // this is considered daily, every weekday
						window.down('#edit-ra-every-weekday').setValue(true);
					} else {
						rRecurrFld.setValue(3);
						window.down('#edit-ra-weekly-frequency').setValue(rPeriodVal);

						// TODO: Should use the 'first day of week' preference
						var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
						for (i in days) {
							window.down('#edit-ra-weekly-' + days[i]).setValue(rDoWMaskVal[i] == 'T');
						}
					}
					break;
				case 'MONTH':
					rRecurrFld.setValue(4);
					if (!rDoWVal) {
						window.down('#edit-ra-monthly-radio1').setValue(true);
						window.down('#edit-ra-monthly-dayx').setValue(rStartVal.getDate());
						window.down('#edit-ra-monthly-xmonths1').setValue(rPeriodVal);
						window.down('#edit-ra-monthly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(rStartVal));
						window.down('#edit-ra-monthly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(rStartVal) + 1);
						window.down('#edit-ra-monthly-xmonths2').setValue(rPeriodVal);
					} else {
						window.down('#edit-ra-monthly-radio2').setValue(true);
						window.down('#edit-ra-monthly-ordinal-day').setValue(rDoWiMVal == -1 ? 5 : rDoWiMVal);
						window.down('#edit-ra-monthly-day-of-week').setValue(rDoWVal);
						window.down('#edit-ra-monthly-xmonths1').setValue(rPeriodVal);
						window.down('#edit-ra-monthly-xmonths2').setValue(rPeriodVal);
					}
					break;
				case 'YEAR':
					rRecurrFld.setValue(5);
					Ext4.getCmp('edit-ra-yearly-month1').setValue(rStartVal.getMonth());
					Ext4.getCmp('edit-ra-yearly-day').setValue(RA.Util.Date.getDayOfMonth(rStartVal));
					//1st option
					if (!rDoWVal) {
						window.down('#edit-ra-yearly-radio1').setValue(true);
						window.down('#edit-ra-yearly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(rStartVal));
						window.down('#edit-ra-yearly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(rStartVal) + 1);
						window.down('#edit-ra-yearly-month2').setValue(rStartVal.getMonth());
					} else {
						window.down('#edit-ra-yearly-radio2').setValue(true);
						window.down('#edit-ra-yearly-ordinal-day').setValue(rDoWiMVal == -1 ? 5 : rDoWiMVal);
						window.down('#edit-ra-yearly-day-of-week').setValue(rDoWVal);
						window.down('#edit-ra-yearly-month2').setValue(rStartVal.getMonth());
					}
					break;
			}

		},
		hide: function (window, eOpts) {
			window.down('#edit-ra-resource').reset();
			window.down('#edit-ra-project').reset();
			window.down('#edit-ra-projecttask').reset();
			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				window.down('#edit-ra-approver').reset();
			}

			/* recurrence starts here */
			// shared
			window.down('#edit-ra-recurrence').reset();
			window.down('#edit-ra-recurr-start').reset();
			window.down('#edit-ra-recurr-end').reset();
			// daily
			window.down('#edit-ra-xdays').reset();
			window.down('#edit-ra-daily-frequency').reset();
			window.down('#edit-ra-every-weekday').reset();
			// weekly
			window.down('#edit-ra-weekly-frequency').reset();
			window.down('#edit-ra-weekly-days-panel').reset();
			// monthly
			window.down('#edit-ra-monthly-radio1').reset();
			window.down('#edit-ra-monthly-dayx').reset();
			window.down('#edit-ra-monthly-xmonths1').reset();
			window.down('#edit-ra-monthly-radio2').reset();
			window.down('#edit-ra-monthly-ordinal-day').reset();
			window.down('#edit-ra-monthly-day-of-week').reset();
			window.down('#edit-ra-monthly-xmonths2').reset();
			// yearly
			window.down('#edit-ra-yearly-radio1').reset();
			window.down('#edit-ra-yearly-month1').reset();
			window.down('#edit-ra-yearly-day').reset();
			window.down('#edit-ra-yearly-radio2').reset();
			window.down('#edit-ra-yearly-ordinal-day').reset();
			window.down('#edit-ra-yearly-day-of-week').reset();
			window.down('#edit-ra-yearly-month2').reset();
		}
	},
	items: [
		{
			xtype: 'ra-form-panel',
			id: 'ra-editAllocPanel',
			layout: 'column',
			padding: '20 20 10 20',
			items: [
				{
					xtype: 'ra-form-panel-column',
					columnWidth: 0.5,
					items: [
						{
							xtype: 'ra-ldc-ss-resource',
							id: 'edit-ra-resource',
							formId: 'edit-ra',
							allowBlank: false,
							comboOnChange: function (combobox, record) {
								var resource = combobox.getSelectedRecord();

								if (resource) {
									if (RA.App.Stores.featureStore.getById('approvalWorkFlow').get('isEnabled')) {
										var form = Ext4.getCmp('edit-ra');
										form.resetApprovalStatus();
									}

									//Load New Time off base from Resource
									var okButton = Ext4.getCmp('ra-editAllocOkBtn');
									var revertEnabled = false;
									if (!okButton.disable) {
										revertEnabled = true;
										okButton.setDisabled(true); //Disallow ok button during load
									}
									RA.App.Stores.timeOffConflict.load({
										params: {resourceId: resource.get('id')},
										callback: function (records, operation, success) {
											var okButton = Ext4.getCmp('ra-editAllocOkBtn');
											if (revertEnabled) {
												okButton.setDisabled(false);
											}
											if (!success) {
												console.error('Failed to load resource time off');
											}
										}
									});
								}
							}
						},
						{
							xtype: 'ra-ldc-ss-project',
							id: 'edit-ra-project',
							formId: 'edit-ra',
							disabled: RA.Util.Dashboard.isActive(),
							comboOnSelect: function (combobox, record) { // to be passed to combobox
								var taskCombo = Ext4.getCmp('edit-ra-projecttask');
								var projectId = combobox.getValue();

								taskCombo.reset();

								if (projectId) {
									taskCombo.projectId = projectId;
									taskCombo.initSize();

									var store = taskCombo.isLargeData()
												? RA.App.Stores.largeDataRangeProjectTaskStore
												: taskCombo.smallDataStore;
									var selectedEvent = RA.App.Chart.selectedEvent;
									store.load({
										params: {
											jobFilter: projectId
										}
									});

									if (projectId === selectedEvent.get('projectId')) {
										taskCombo.setValue(selectedEvent.get('taskId'));
									}
									taskCombo.enable();
								} else {
									taskCombo.disable();
								}
							},
							allowBlank: false
						},
						{
							xtype: 'ra-ldc-ss-project-task',
							id: 'edit-ra-projecttask',
							formId: 'edit-ra',
							hidden: RA.App.Settings ? (RA.App.Settings.get('showProjectTasks') == 'F') : false, // default to show
							allowBlank: true
						},
						{
							xtype: 'panel',
							layout: 'column',
							border: false,
							items: [
								{
									xtype: 'ra-date',
									id: 'edit-ra-startDate',
									fieldLabel: translatedStrings.getText('DATE.START_DATE'),
									allowBlank: false,
									width: 350,
									listeners: {
										blur: function (dateField, blurEvent, eOpts) {
											Ext4.getCmp('edit-ra').resetApprovalStatus();

											var endDateField = dateField.up().down('#edit-ra-endDate');
											var startTimestamp = dateField.getValue();
											var lastDate = endDateField.getValue();

											if (dateField.isValid() && endDateField.isValid() && startTimestamp > lastDate) {
												endDateField.setValue(startTimestamp);
											}
										}
									},
									columnWidth: 0.5
								},
								{
									xtype: 'ra-col-space',
									width: 20
								},
								{
									xtype: 'ra-date',
									id: 'edit-ra-endDate',
									fieldLabel: translatedStrings.getText('DATE.END_DATE'),
									allowBlank: false,
									width: 350,
									listeners: {
										blur: function (dateField, blurEvent, eOpts) {
											Ext4.getCmp('edit-ra').resetApprovalStatus();

											var startDateField = dateField.up().down('#edit-ra-startDate');
											var startTimestamp = startDateField.getValue();
											var lastDate = dateField.getValue();

											if (dateField.isValid() && startDateField.isValid() && lastDate && startTimestamp > lastDate) {
												startDateField.setValue(lastDate);
											}
										}
									},
									columnWidth: 0.5
								}
							]
						},
						{
							xtype: 'ra-flex-field-container',
							layout: 'hbox',
							items: [
								Ext4.create('RA.Cmp.Number', {
									id: 'edit-ra-allocate',
									fieldLabel: translatedStrings.getText('NUMBER.ALLOCATE'),
									allowBlank: false,
									listeners: {
										change: function (component, newValue, oldValue) {
											Ext4.getCmp('edit-ra').resetApprovalStatus();
										}
									}
								}),
								Ext4.create('Ext4.form.Label', {
									cls: 'ra-form-label',
									id: 'edit-ra-allocateby-label',
									margin: '20 0 0 0',
								}),
								Ext4.create('RA.Cmp.ComboBox', {
									id: 'edit-ra-allocateby',
									emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.BLANK'),
									flex: 1,
									allowBlank: false,
									readOnly: true,
									hidden: true,
									store: RA.App.Stores.allocByStore,
									listeners: {
										change: function (component, newValue, oldValue) {
											Ext4.getCmp('edit-ra').resetApprovalStatus();
										}
									}
								})
							]
						},
						{
							xtype: 'ra-combo-box-hidden',
							id: 'edit-ra-allocatetype',
							fieldLabel: translatedStrings.getText('COMBOBOX.ALLOCATION_TYPE'),
							width: 350,
							emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.BLANK'),
							allowBlank: false,
							store: RA.App.Stores.allocTypeStore,
							hidden: false,
							listeners: {
								change: function (component, newValue, oldValue) {
									Ext4.getCmp('edit-ra').resetApprovalStatus();
								}
							}
						}
					]
				},
				{
					xtype: 'ra-col-space',
					width: 80
				},
				{
					xtype: 'ra-form-panel-column',
					columnWidth: 0.5,
					items: [
						{
							xtype: 'ra-ldc-ss-approver',
							id: 'edit-ra-approver',
							formId: 'edit-ra',
							allowBlank: false
						},
						{
							xtype: 'ra-flex-field-container',
							layout: 'form',
							items: [
								{
									xtype: 'ra-combo-box-hidden',
									id: 'edit-ra-appstatus',
									fieldLabel: translatedStrings.getText('COMBOBOX.APPROVAL_STATUS'),
									emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.BLANK'),
									store: RA.App.Stores.appStatusStore,
									featureName: 'approvalWorkFlow',
									hidden: true
								},
								{
									xtype: 'ra-display',
									id: 'edit-ra-appstatus-value',
									fieldLabel: translatedStrings.getText('DISPLAY.APPROVAL_STATUS')
								}
							]
						},
						{
							xtype: 'textarea',
							id: 'edit-ra-comment',
							fieldLabel: translatedStrings.getText('TEXTAREA.COMMENTS'),
							labelSeparator: '',
							labelAlign: 'top',
							width: 350,
							grow: true,
							listeners: {
								change: function (component, newValue, oldValue) {
									Ext4.getCmp('edit-ra').resetApprovalStatus();
								}
							}
						},
						{
							xtype: 'ra-combo-box-hidden',
							id: 'edit-ra-recurrence',
							fieldLabel: translatedStrings.getText('TOOLTIP.LABEL.RECURRENCE'),
							allowBlank: false,
							store: RA.App.Stores.recurrenceTypeStore,
							value: 1,
							hidden: false,
							fieldsByRecurrenceType: {
								1: [],
								2: [
									'edit-ra-recurr-dates-panel',
									'edit-ra-xdays-panel',
									'edit-ra-every-weekday'
								],
								3: [
									'edit-ra-recurr-dates-panel',
									'edit-ra-xweeks-panel',
									'edit-ra-weekly-days-panel'
								],
								4: [
									'edit-ra-recurr-dates-panel',
									'edit-ra-monthly-panel1',
									'edit-ra-monthly-panel2'
								],
								5: [
									'edit-ra-recurr-dates-panel',
									'edit-ra-yearly-panel1',
									'edit-ra-yearly-panel2'
								]
							},
							listeners: {
								change: function (me, newValue, oldValue) {
									var show = me.fieldsByRecurrenceType[newValue];
									var hide = me.fieldsByRecurrenceType[oldValue];

									for (i in hide) {
										Ext4.getCmp(hide[i]).hide();
									}
									for (i in show) {
										var cmp = Ext4.getCmp(show[i]);
										if (cmp.rendered) {
											cmp.show();
										} else {
											cmp.on('afterrender', function () {
												this.show();
											});
										}
									}
								}
							}
						},
						{
							xtype: 'fieldcontainer',
							id: 'edit-ra-recurr-dates-panel',
							layout: 'column',
							border: false,
							items: [
								{
									xtype: 'ra-date',
									id: 'edit-ra-recurr-start',
									fieldLabel: translatedStrings.getText('DATE.SERIES_START_DATE'),
									value: new Date(),
									columnWidth: 0.5,
									listeners: {
										blur: function (me) {
											var value = me.getValue();

											if (!Ext4.isDate(value)) {
												// if value is invalid, set to allocation start date
												var allocStart = Ext4.getCmp('edit-ra-startDate').getValue();
												me.setValue(allocStart);
												value = allocStart;
											}

											/*
											 * based from core behavior, these field/s should be updated regardless of recurrence type selected -- even if SINGLE is selected
											 */
											var lastDate = Ext4.getCmp('edit-ra-recurr-end');
											var weekDays = Ext4.getCmp('edit-ra-weekly-days-panel');

											if (value.getTime() > lastDate.getValue().getTime()) {
												lastDate.suspendEvents();
												lastDate.setValue(value);
												lastDate.resumeEvents();
											}
											if (Object.keys(weekDays.getValue()).length < 2) {
												weekDays.suspendEvents();
												weekDays.setValue(JSON.parse('{"' + 'edit-ra-weekly-' + Ext4.Date.format(value, 'l').toLowerCase() + '-inputEl' + '":"' + value.getDay() + '"}'));
												weekDays.resumeEvents();
											}

											Ext4.getCmp('edit-ra-monthly-dayx').setValue(RA.Util.Date.getDayOfMonth(value));
											Ext4.getCmp('edit-ra-monthly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(value));
											Ext4.getCmp('edit-ra-monthly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(value) + 1);

											Ext4.getCmp('edit-ra-yearly-month1').setValue(value.getMonth());
											Ext4.getCmp('edit-ra-yearly-day').setValue(RA.Util.Date.getDayOfMonth(value));
											Ext4.getCmp('edit-ra-yearly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(value));
											Ext4.getCmp('edit-ra-yearly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(value) + 1);
											Ext4.getCmp('edit-ra-yearly-month2').setValue(value.getMonth());
										}
									}
								},
								{
									xtype: 'ra-col-space',
									width: 20
								},
								{
									xtype: 'ra-date',
									id: 'edit-ra-recurr-end',
									fieldLabel: translatedStrings.getText('DATE.END_BY'),
									value: new Date(),
									columnWidth: 0.5,
									listeners: {
										blur: function (me) {
											var value = me.getValue();
											var startTimestamp = Ext4.getCmp('edit-ra-recurr-start').getValue();

											if (!Ext4.isDate(value)) {
												// if value is invalid, set to series start date
												me.setValue(startTimestamp);
											}

											if (startTimestamp.getTime() > value.getTime()) {
												me.setValue(startTimestamp);
												alert(translatedStrings.getText('ERROR_END_DATE_EARLIER_THAN_START_DATE'));
											}
										}
									}
								}
							],
							hidden: true
						},
						{
							xtype: 'ra-recurring-form-fieldcontainer',
							id: 'edit-ra-xdays-panel',
							items: [
								{
									xtype: 'radio',
									id: 'edit-ra-xdays',
									boxLabel: translatedStrings.getText('TEXT.REPEAT_EVERY'),
									name: 'edit-ra-daily-repeat',
									checked: true,
									handler: function (me, selected) {
										var xdaysField = Ext4.getCmp('edit-ra-daily-frequency');
										if (selected) {
											xdaysField.enable();
											xdaysField.validate();
										} else {
											xdaysField.disable();
										}
									}
								},
								{
									xtype: 'ra-number-field',
									id: 'edit-ra-daily-frequency',
									width: 50,
									value: 1,
									disabled: true
								},
								{
									xtype: 'text',
									text: translatedStrings.getText('TEXT.DAY(S)')
								}
							]
						},
						{
							xtype: 'radio',
							id: 'edit-ra-every-weekday',
							boxLabel: translatedStrings.getText('TEXT.REPEAT_EVERY_WEEKDAY'),
							name: 'edit-ra-daily-repeat',
							hidden: true
						},
						{
							xtype: 'fieldcontainer',
							id: 'edit-ra-xweeks-panel',
							layout: 'hbox',
							border: false,
							defaults: {
								margin: '0 5 0 0'
							},
							items: [
								{
									xtype: 'text',
									text: translatedStrings.getText('TEXT.REPEAT_EVERY')
								},
								{
									xtype: 'ra-number-field',
									id: 'edit-ra-weekly-frequency',
									maxValue: 1000,
									width: 50,
									value: 1
								},
								{
									xtype: 'text',
									text: translatedStrings.getText('TEXT.WEEK(S)')
								}
							],
							hidden: true
						},
						{
							xtype: 'checkboxgroup',
							id: 'edit-ra-weekly-days-panel',
							columns: 2,
							vertical: true,
							items: RA.Util.CustomFunctions.rotate(
								[
									{
										xtype: 'checkbox',
										id: 'edit-ra-weekly-sunday',
										boxLabel: translatedStrings.getText('SUNDAY'),
										inputValue: '0'
									},
									{
										xtype: 'checkbox',
										id: 'edit-ra-weekly-monday',
										boxLabel: translatedStrings.getText('MONDAY'),
										inputValue: '1'
									},
									{
										xtype: 'checkbox',
										id: 'edit-ra-weekly-tuesday',
										boxLabel: translatedStrings.getText('TUESDAY'),
										inputValue: '2'
									},
									{
										xtype: 'checkbox',
										id: 'edit-ra-weekly-wednesday',
										boxLabel: translatedStrings.getText('WEDNESDAY'),
										inputValue: '3'
									},
									{
										xtype: 'checkbox',
										id: 'edit-ra-weekly-thursday',
										boxLabel: translatedStrings.getText('THURSDAY'),
										inputValue: '4'
									},
									{
										xtype: 'checkbox',
										id: 'edit-ra-weekly-friday',
										boxLabel: translatedStrings.getText('FRIDAY'),
										inputValue: '5'
									},
									{
										xtype: 'checkbox',
										id: 'edit-ra-weekly-saturday',
										boxLabel: translatedStrings.getText('SATURDAY'),
										inputValue: '6'
									}
								],
								RA.Util.CustomFunctions.getWeekStart()
							),
							hidden: true,
							listeners: {
								change: function (me, newValue, oldValue) {
									if (Object.keys(newValue).length == 1) {
										var recurrStart = Ext4.getCmp('edit-ra-recurr-start');
										var currStart = recurrStart.getValue();
										var currIndex = currStart.getDay();
										var newIndex = newValue[Object.keys(newValue)[0]];

										if (currIndex != newIndex) {
											recurrStart.setValue(Ext4.Date.add(currStart, Ext4.Date.DAY, newIndex - currIndex));
											recurrStart.fireEvent('blur', recurrStart);
										}
									}
								}
							}
						},
						{
							xtype: 'ra-recurring-form-fieldcontainer',
							id: 'edit-ra-monthly-panel1',
							items: [
								{
									xtype: 'radio',
									id: 'edit-ra-monthly-radio1',
									boxLabel: translatedStrings.getText('DAY'),
									name: 'edit-ra-monthly',
									checked: true,
									handler: function (me, selected) {
										var parentContainer = this.up('fieldcontainer');
										if (parentContainer.isVisible()) {
											if (selected) {
												parentContainer.enableFormFields();
											} else {
												parentContainer.disableFormFields();
											}
										}
									}
								},
								{
									xtype: 'ra-number-field',
									id: 'edit-ra-monthly-dayx',
									maxValue: 28,
									width: 30,
									allowBlank: false,
									listeners: {
										blur: function () {
											var dateVal = this.getValue();
											if (dateVal != null && dateVal >= this.minValue && dateVal <= this.maxValue) {
												var seriesStartDateCmp = Ext4.getCmp('edit-ra-recurr-start');
												var startTimestamp = seriesStartDateCmp.getValue();
												startTimestamp.setDate(dateVal);
												seriesStartDateCmp.setValue(startTimestamp);
												seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
											}
										}
									},
									disabled: true
								},
								{
									xtype: 'text',
									text: translatedStrings.getText('OF_EVERY')
								},
								{
									xtype: 'ra-number-field',
									id: 'edit-ra-monthly-xmonths1',
									maxValue: 1000,
									width: 50,
									value: 1,
									disabled: true
								},
								{
									xtype: 'text',
									text: translatedStrings.getText('MONTH(S)')
								}
							]
						},
						{
							xtype: 'ra-recurring-form-fieldcontainer',
							id: 'edit-ra-monthly-panel2',
							items: [
								{
									xtype: 'radio',
									id: 'edit-ra-monthly-radio2',
									boxLabel: translatedStrings.getText('THE'),
									name: 'edit-ra-monthly',
									checked: false,
									handler: function (me, selected) {
										var parentContainer = this.up('fieldcontainer');
										if (parentContainer.isVisible()) {
											if (selected) {
												parentContainer.enableFormFields();
											} else {
												parentContainer.disableFormFields();
											}
										}
									}
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'edit-ra-monthly-ordinal-day',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.ordinalDayOfMonthSuffixStore,
									value: 1,
									hidden: false,
									width: 60,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('edit-ra-recurr-start');
											var startTimestamp = seriesStartDateCmp.getValue();
											var nthDay = this.getValue();
											var dayOfWeek = Ext4.getCmp('edit-ra-monthly-day-of-week').getValue();
											RA.Util.Date.setDateByNthDayOfWeek(startTimestamp, nthDay, dayOfWeek);
											seriesStartDateCmp.setValue(startTimestamp);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'edit-ra-monthly-day-of-week',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.dayOfWeekStore,
									value: 1,
									hidden: false,
									width: 60,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('edit-ra-recurr-start');
											var startTimestamp = seriesStartDateCmp.getValue();
											var nthDay = Ext4.getCmp('edit-ra-monthly-ordinal-day').getValue();
											var dayOfWeek = this.getValue();
											RA.Util.Date.setDateByNthDayOfWeek(startTimestamp, nthDay, dayOfWeek);
											seriesStartDateCmp.setValue(startTimestamp);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								},
								{
									xtype: 'text',
									text: translatedStrings.getText('OF_EVERY')
								},
								{
									xtype: 'ra-number-field',
									id: 'edit-ra-monthly-xmonths2',
									maxValue: 1000,
									width: 50,
									value: 1,
									disabled: true
								},
								{
									xtype: 'text',
									text: translatedStrings.getText('MONTH(S)')
								}
							]
						},
						{
							xtype: 'ra-recurring-form-fieldcontainer',
							id: 'edit-ra-yearly-panel1',
							items: [
								{
									xtype: 'radio',
									id: 'edit-ra-yearly-radio1',
									name: 'edit-ra-yearly',
									checked: true,
									handler: function (me, selected) {
										var parentContainer = this.up('fieldcontainer');
										if (parentContainer.isVisible()) {
											if (selected) {
												parentContainer.enableFormFields();
											} else {
												parentContainer.disableFormFields();
											}
										}
									}
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'edit-ra-yearly-month1',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.monthStore,
									value: 1,
									hidden: false,
									width: 100,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('edit-ra-recurr-start');
											var startTimestamp = seriesStartDateCmp.getValue();

											//0-based index
											var month = this.getValue();
											startTimestamp.setMonth(month);

											seriesStartDateCmp.setValue(startTimestamp);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								},
								{
									xtype: 'ra-number-field',
									id: 'edit-ra-yearly-day',
									maxValue: 28,
									value: 1,
									width: 30,
									allowBlank: false,
									listeners: {
										blur: function (_this) {
											var dateVal = _this.getValue();
											if (dateVal != null && dateVal >= this.minValue && dateVal <= this.maxValue) {
												var seriesStartDateCmp = Ext4.getCmp('edit-ra-recurr-start');
												var startTimestamp = seriesStartDateCmp.getValue();
												startTimestamp.setDate(dateVal);
												seriesStartDateCmp.setValue(startTimestamp);
												seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
											}
										}
									},
									disabled: true
								}
							]
						},
						{
							xtype: 'ra-recurring-form-fieldcontainer',
							id: 'edit-ra-yearly-panel2',
							items: [
								{
									xtype: 'radio',
									id: 'edit-ra-yearly-radio2',
									boxLabel: translatedStrings.getText('THE'),
									name: 'edit-ra-yearly',
									checked: false,
									handler: function (me, selected) {
										var parentContainer = this.up('fieldcontainer');
										if (parentContainer.isVisible()) {
											if (selected) {
												parentContainer.enableFormFields();
											} else {
												parentContainer.disableFormFields();
											}
										}
									}
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'edit-ra-yearly-ordinal-day',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.ordinalDayOfMonthSuffixStore,
									value: 1,
									hidden: false,
									width: 60,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('edit-ra-recurr-start');
											var startTimestamp = seriesStartDateCmp.getValue();
											var nthDay = this.getValue();
											var dayOfWeek = Ext4.getCmp('edit-ra-yearly-day-of-week').getValue();
											RA.Util.Date.setDateByNthDayOfWeek(startTimestamp, nthDay, dayOfWeek);
											seriesStartDateCmp.setValue(startTimestamp);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'edit-ra-yearly-day-of-week',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.dayOfWeekStore,
									value: 1,
									hidden: false,
									width: 60,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('edit-ra-recurr-start');
											var startTimestamp = seriesStartDateCmp.getValue();
											var nthDay = Ext4.getCmp('edit-ra-yearly-ordinal-day').getValue();
											var dayOfWeek = this.getValue();
											RA.Util.Date.setDateByNthDayOfWeek(startTimestamp, nthDay, dayOfWeek);
											seriesStartDateCmp.setValue(startTimestamp);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								},
								{
									xtype: 'text',
									text: translatedStrings.getText('OF')
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'edit-ra-yearly-month2',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.monthStore,
									value: 1,
									hidden: false,
									width: 100,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('edit-ra-recurr-start');
											var startTimestamp = seriesStartDateCmp.getValue();

											//0-based index
											var month = this.getValue();
											startTimestamp.setMonth(month);

											var nthDay = Ext4.getCmp('edit-ra-yearly-ordinal-day').getValue();
											var dayOfWeek = Ext4.getCmp('edit-ra-yearly-day-of-week').getValue();

											RA.Util.Date.setDateByNthDayOfWeek(startTimestamp, nthDay, dayOfWeek);

											seriesStartDateCmp.setValue(startTimestamp);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								}
							]
						}
					]
				}
			],
			dockedItems: [
				{
					xtype: 'raformmenu',
					items: [
						Ext4.create('RA.Cmp.BlueButton', {
							id: 'ra-editAllocOkBtn',
							text: translatedStrings.getText('BUTTON.OK'),
							formBind: true,
							handler: function () {
								perfTestLogger.start('Edit Allocation');

								var event = RA.App.Chart.selectedEvent;
								var form = RA.App.Forms.editAllocForm;
								var resourceStore = RA.App.Stores.chartResource;
								var eventStore = RA.App.Stores.chartEvent;
								var oldEventAncestorId = eventStore.getHighestAncestorId(event);
								var startDateFld = form.down('#edit-ra-startDate');
								var startTimestamp = Ext4.Date.clearTime(startDateFld.getValue());
								var endDateFld = form.down('#edit-ra-endDate');
								var lastDate = Ext4.Date.clearTime(endDateFld.getValue());
								var endTimestamp = Ext4.Date.clearTime(new Date(lastDate.getTime() + RA.App.Constant.DAY_IN_MILLI));
								var resourceFld = form.down('#edit-ra-resource');
								var projectFld = form.down('#edit-ra-project');
								var projectTaskFld = form.down('#edit-ra-projecttask');
								var allocateBy = form.down('#edit-ra-allocateby').getValue();
								var allocate = form.down('#edit-ra-allocate').getValue();
								var allocateType = form.down('#edit-ra-allocatetype').getValue();
								var comment = form.down('#edit-ra-comment').getValue();
								var resourceRecord = resourceFld.getValue();
								var newResourceId = resourceRecord.get('id');
								var oldProjectId = event.get('projectId');
								var oldAllocationPercent = event.get('percent');
								var oldAllocationHour = event.get('hour');
								var isAllocationDifferent = false;
								var pcurrentStore = projectFld.getStore();
								var projectRecord = projectFld.getValue();
								var newProjectId = projectRecord.get('id');
								var customerId = projectRecord.raw.customerId;
								var taskRecord = projectTaskFld.getValue();
								var newProjectTaskId = taskRecord ? taskRecord.get('id') : 0;
								var newTaskName = taskRecord ? taskRecord.get('name') : null;
								var projectData = pcurrentStore.data.get(newProjectId).raw;
								var type = RA.App.Stores.allocTypeStore.getById(allocateType).get('key');
								var rowId = RA.App.Stores.chartEvent.getResourceRowId(event);
								var newRowId = RA.App.Stores.chartEvent.getResourceRowId({
									newCustomerId: customerId,
									newProjectId: newProjectId,
									newResourceId: newResourceId,
									newProjectTaskId: newProjectTaskId
								});
								var recurrence = form.down('#edit-ra-recurrence').getValue();
								var allocId = event.get('allocId');

								// prep temp object for checking recurrence overlaps
								var tmp = {
									allocId: allocId,
									frequency: '',
									period: 0,
									dayOfWeek: 0,
									dayOfWeekMask: '',
									dayOfWeekInMonth: 0,
									seriesStartDate: form.down('#edit-ra-recurr-start').getValue(),
									seriesEndDate: form.down('#edit-ra-recurr-end').getValue(),
									startTimestamp: startTimestamp,
									endTimestamp: Ext4.Date.add(lastDate, Ext4.Date.DAY, 1)
								};
								switch (recurrence) {
									case 1: // Single
										tmp.frequency = 'NONE';
										break;
									case 2: // Daily
										if (form.down('#edit-ra-xdays').getValue()) {
											tmp.frequency = 'DAY';
											tmp.period = form.down('#edit-ra-daily-frequency').getValue();
										} else {
											tmp.frequency = 'WEEK';
											tmp.period = 1;
											tmp.dayOfWeekMask = 'FTTTTTF';
										}
										break;
									case 3: // Weekly
										tmp.frequency = 'WEEK';
										tmp.period = form.down('#edit-ra-weekly-frequency').getValue();
										tmp.dayOfWeekMask = [
											Ext4.getCmp('edit-ra-weekly-sunday').getValue() ? 'T' : 'F',
											Ext4.getCmp('edit-ra-weekly-monday').getValue() ? 'T' : 'F',
											Ext4.getCmp('edit-ra-weekly-tuesday').getValue() ? 'T' : 'F',
											Ext4.getCmp('edit-ra-weekly-wednesday').getValue() ? 'T' : 'F',
											Ext4.getCmp('edit-ra-weekly-thursday').getValue() ? 'T' : 'F',
											Ext4.getCmp('edit-ra-weekly-friday').getValue() ? 'T' : 'F',
											Ext4.getCmp('edit-ra-weekly-saturday').getValue() ? 'T' : 'F'
										].join('');

										if (tmp.dayOfWeekMask == 'FFFFFFF') { // if no day is checked, automatically set to day of series start date
											tmp.dayOfWeekMask[tmp.seriesStartDate.getDay()] = 'T';
										}

										break;
									case 4: // Monthly
										tmp.frequency = 'MONTH';
										if (Ext4.getCmp('edit-ra-monthly-radio1').getValue()) {
											tmp.period = Ext4.getCmp('edit-ra-monthly-xmonths1').getValue();
										} else {
											tmp.period = Ext4.getCmp('edit-ra-monthly-xmonths2').getValue();
											tmp.dayOfWeek = Ext4.getCmp('edit-ra-monthly-day-of-week').getValue();
											tmp.dayOfWeekInMonth = Ext4.getCmp('edit-ra-monthly-ordinal-day').getValue();
										}
										break;
									case 5: // Yearly
										tmp.frequency = 'YEAR';
										tmp.period = 1;
										if (Ext4.getCmp('edit-ra-yearly-radio2').getValue()) {
											tmp.dayOfWeek = Ext4.getCmp('edit-ra-yearly-day-of-week').getValue();
											tmp.dayOfWeekInMonth = Ext4.getCmp('edit-ra-yearly-ordinal-day').getValue();
										}
										break;
								}

								if (startTimestamp > lastDate) {
									alert(translatedStrings.getText('MESSAGE.ERROR.RA_INVALID_DATES'));
									return;
								}

								if (!RA.App.Stores.chartEvent.isStartEndValid(startTimestamp, lastDate, newResourceId, resourceRecord.raw.workCalendarRecord)) {
									alert(translatedStrings.getText('MESSAGE.ERROR.RA_NON_WORKING_DAY'));
									return;
								}

								var tmpEvent = Ext4.create('RA.Cmp.Model.ChartAllocation', tmp);
								var recurrs = RA.App.Stores.chartEvent.createRecurrences(tmpEvent);

								//TIME OFF CHECK
								var count = RA.App.Stores.timeOffConflict.getCount();
								var arrTimeOff = [], objTimeOff;
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
								if (arrTimeOff && arrTimeOff.length) {
									var arrResAllocDate = [];
									//Check against single allocation start and end date
									arrResAllocDate.push({
										startDate: startTimestamp,
										endDate: lastDate
									});
									//Check against recurring allocation start and end date
									for (i in recurrs) {
										arrResAllocDate.push({
											startDate: recurrs[i].get('startTimestamp'),
											endDate: recurrs[i].getLastDate()
										});
									}

									var warningMessage = RA.App.Stores.chartEvent.validateTimeOffConflict({
										arrResAllocDate: arrResAllocDate,
										arrTimeOff: arrTimeOff
									});

									if (warningMessage.length && (!confirm(warningMessage))) {
										return;
									}
								}
								//TIME OFF CHECK END

								if (!resourceStore.isRowExisting(newRowId)) {
									var newProjectTaskObj = {
										'taskId': newProjectTaskId,
										'taskName': newTaskName
									};
									resourceStore.addNewAllocationRow({
										resourceId: newResourceId,
										projectId: newProjectId,
										customerId: customerId,
										projTaskObj: newProjectTaskObj,
										resourceObj: resourceRecord,
										projectObj: projectRecord
									});
								} else {
									if (eventStore.withOverlaps(newRowId, startTimestamp, endTimestamp, allocId)) {
										alert(translatedStrings.getText('MESSAGE.ERROR.RA_CHOSEN_DATE_OVERLAP'));
										return;
									}

									// check recurrences for overlaps
									for (i in recurrs) {
										if (eventStore.withOverlaps(newRowId, recurrs[i].get('startTimestamp'), recurrs[i].get('endTimestamp'), allocId)) {
											alert(translatedStrings.getText('MESSAGE.ERROR.RA_CHOSEN_DATE_OVERLAP'));
											return;
										}
									}

								}

								// check if start and end date is within project task duration
								if (taskRecord) {
									projectTaskFld.checkStartDate(startDateFld, taskRecord);
									projectTaskFld.checkEndDate(endDateFld, taskRecord);
								}

								event.set('ResourceId', newRowId);
								event.set('customerId', customerId);
								event.set('projectId', newProjectId);
								event.set('taskId', newProjectTaskId);
								event.set('startTimestamp', startTimestamp);
								event.set('endTimestamp', endTimestamp);
								event.set('resourceId', newResourceId);
								event.set('unit', allocateBy);
								event.set('Name', allocate);
								event.set('type', type);
								event.set('typeId', allocateType);
								event.set('comment', comment);
								event.set('tipResource', resourceRecord.raw.name);
								event.set('tipProject', projectData.name);
								event.set('tipStart', Ext4.Date.format(startTimestamp, RA.App.NSProps.getDateFormat()));
								event.set('tipEnd', Ext4.Date.format(lastDate, RA.App.NSProps.getDateFormat()));

								if (allocateBy == 1) {
									event.set('percent', allocate);
									if (oldAllocationPercent !== allocate) {
										isAllocationDifferent = true;
									}
									event.computeHours(resourceRecord.raw.workCalendarRecord);
								} else {
									event.set('hour', allocate);
									if (oldAllocationHour !== allocate) {
										isAllocationDifferent = true;
									}
									event.computePercentage(resourceRecord.raw.workCalendarRecord);
								}

								if (recurrence > 1) {
									event.set('seriesStartDate', tmp.seriesStartDate);
									event.set('seriesEndDate', tmp.seriesEndDate);
								}

								// set all fields for recurring allocations
								event.set('frequency', tmp.frequency);
								event.set('period', tmp.period);
								event.set('dayOfWeek', tmp.dayOfWeek);
								event.set('dayOfWeekMask', tmp.dayOfWeekMask);
								event.set('dayOfWeekInMonth', tmp.dayOfWeekInMonth);

								if (RA.App.Stores.featureStore.isRAAWEnabled()) {
									var approverFld = form.down('#edit-ra-approver');
									var approverObj = approverFld.getValue();
									var approver = approverObj.get('id');
									var approverName = approverObj.get('name');
									var appstatus = RA.App.Constant.PENDING_APPROVAL;

									event.set('approvalStatus', appstatus); // always set to Pending
									event.set('tipAppStatus', RA.App.Stores.appStatusStore.getById(appstatus).get('name'));

									if (approver != null && approver != 0) {
										event.set('nextApprover', approver);
										event.set('tipApprover', approverName);
									}
								}
								eventStore.refreshRollUpsByResource(eventStore.getHighestAncestorId(event));
								if (rowId != newRowId) eventStore.refreshRollUpsByResource(oldEventAncestorId);
								if (RA.App.Chart) RA.App.Chart.refreshNonWorking(true);
								if (isAllocationDifferent) {
									RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(newProjectId);
								}
								if (oldProjectId !== newProjectId) {
									RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(newProjectId);
									RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(oldProjectId);
								}
								form.hide();
								Ext4.getCmp('advFilterMain').disableFilter();
								perfTestLogger.stop();
							}
						}),
						Ext4.create('RA.Cmp.GrayButton', {
							id: 'ra-editAllocCancelBtn',
							text: translatedStrings.getText('BUTTON.CANCEL'),
							handler: function () {
								RA.App.Forms.editAllocForm.hide();
							}
						}),
						Ext4.create('RA.Cmp.GrayButton', {
							id: 'ra-editAllocDeleteBtn',
							text: translatedStrings.getText('BUTTON.DELETE'),
							handler: function () {
								if (confirm(translatedStrings.getText('MESSAGE.WARNING.DELETE_THIS_ALLOCATION'))) {
									perfTestLogger.start('Delete Allocation');
									RA.App.Stores.chartEvent.removeEventAndRefreshUi(RA.App.Chart.selectedEvent);
									RA.App.Forms.editAllocForm.hide();
									Ext4.getCmp('advFilterMain').disableFilter();
									perfTestLogger.stop();
								}
							}
						})
					]
				}
			]
		}
	]
});