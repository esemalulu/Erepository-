/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.NewAllocForm', {
	id: 'new-ra',
	extend: 'RA.Cmp.Window',
	title: translatedStrings.getText('WINDOW.NEW_RESOURCE_ALLOCATION'),
	width: 850,
	setSupervisor: function (record) {
		if (this.hidden || !RA.App.Stores.featureStore.isRAAWEnabled()) return;

		var supervisorId = parseInt(record.raw.supervisorId);
		var supervisor = record.raw.supervisor;
		var approverFld = Ext4.getCmp('new-ra-approver');
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
			var resources = filterRecord.get('resources') || '';
			var startDate = filterRecord.get('startDate');
			var currentDate = new Date();
			var allocateBy = (RA.App.ModeManager.mode == RA.App.Constant.MODE_CHART
							  ? RA.App.Settings.get('allocateById')
							  : RA.App.Constant.ALLOCATE_BY_HOUR);
			var approverFld = window.down('#new-ra-approver');
			var projectFld = window.down('#new-ra-project');
			var projectTaskFld = window.down('#new-ra-projecttask');
			var recurrStart = window.down('#new-ra-recurr-start');

			if (RA.Util.Dashboard.isActive()) {
                var largeDataStore = RA.App.Stores.filtersProjectTempStore;
                var smallDataStore = RA.App.Stores.projectAndTemplateStore;
                var projectName;

                if (largeDataStore.count() > 0) {
                    projectName = largeDataStore.getById(RA.Util.Dashboard.getProjectId()).get('name');
                } else {
                    projectName = smallDataStore.getById(RA.Util.Dashboard.getProjectId()).get('name');
                }
                projectFld.setValue(RA.Util.Dashboard.getProjectId(), projectName);
			}

			window.down('#new-ra-startDate').setMinValue(startDate);
			window.down('#new-ra-endDate').setMinValue(startDate);

			if (startDate && startDate > currentDate) {
				window.down('#new-ra-startDate').setValue(startDate);
				window.down('#new-ra-endDate').setValue(startDate);
			}

			if (RA.App.Settings && RA.App.Settings.get('showProjectTasks') == 'F') {
				projectTaskFld.hide();
			} else {
				projectTaskFld.show();
			}

			//if in Grid mode, always set to Allocate by Hour
			window.down('#new-ra-allocateby').setValue(allocateBy);
			window.down('#new-ra-allocateby-label').setValue(RA.App.Stores.allocByStore.getById(allocateBy).get('name'));
			window.down('#new-ra-allocatetype').setValue(1); // Hard

			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				window.down('#new-ra-appstatus').setValue(RA.App.Constant.PENDING_APPROVAL); //Pending Approval
				window.down('#new-ra-appstatus-value').setValue(RA.App.Stores.appStatusStore.getById(window.down('#new-ra-appstatus').getValue()).get('name'));
			} else {
				if (approverFld) {
					approverFld.destroy();
				}
				window.down('#new-ra-appstatus').hide();
				window.down('#new-ra-appstatus-value').hide();
			}

			/* recurrence starts here */
			recurrStart.fireEvent('blur', recurrStart, recurrStart.getValue());

			Ext4.getCmp('new-ra-monthly-dayx').setValue(RA.Util.Date.getDayOfMonth(recurrStart.getValue()));
			Ext4.getCmp('new-ra-monthly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(recurrStart.getValue()));
			Ext4.getCmp('new-ra-monthly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(recurrStart.getValue()) + 1);

			Ext4.getCmp('new-ra-yearly-month1').setValue(recurrStart.getValue().getMonth());
			Ext4.getCmp('new-ra-yearly-day').setValue(RA.Util.Date.getDayOfMonth(recurrStart.getValue()));
			Ext4.getCmp('new-ra-yearly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(recurrStart.getValue()));
			Ext4.getCmp('new-ra-yearly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(recurrStart.getValue()) + 1);
			Ext4.getCmp('new-ra-yearly-month2').setValue(recurrStart.getValue().getMonth());
		},
		hide: function (window, eOpts) {
			window.down('#new-ra-resource').reset();
			window.down('#new-ra-project').reset();
			window.down('#new-ra-projecttask').reset();
			window.down('#new-ra-startDate').reset();
			window.down('#new-ra-endDate').reset();
			window.down('#new-ra-allocate').reset();
			window.down('#new-ra-allocateby').reset();
			window.down('#new-ra-allocatetype').reset();
			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				window.down('#new-ra-approver').reset();
			}
			window.down('#new-ra-comment').reset();

			/* recurrence starts here */
			// shared
			window.down('#new-ra-recurrence').reset();
			window.down('#new-ra-recurr-start').reset();
			window.down('#new-ra-recurr-end').reset();
			// daily
			window.down('#new-ra-xdays').reset();
			window.down('#new-ra-daily-frequency').reset();
			window.down('#new-ra-every-weekday').reset();
			// weekly
			window.down('#new-ra-weekly-frequency').reset();
			window.down('#new-ra-weekly-days-panel').reset();
			// monthly
			window.down('#new-ra-monthly-radio1').reset();
			window.down('#new-ra-monthly-dayx').reset();
			window.down('#new-ra-monthly-xmonths1').reset();
			window.down('#new-ra-monthly-radio2').reset();
			window.down('#new-ra-monthly-ordinal-day').reset();
			window.down('#new-ra-monthly-day-of-week').reset();
			window.down('#new-ra-monthly-xmonths2').reset();
			// yearly
			window.down('#new-ra-yearly-radio1').reset();
			window.down('#new-ra-yearly-month1').reset();
			window.down('#new-ra-yearly-day').reset();
			window.down('#new-ra-yearly-radio2').reset();
			window.down('#new-ra-yearly-ordinal-day').reset();
			window.down('#new-ra-yearly-day-of-week').reset();
			window.down('#new-ra-yearly-month2').reset();
		}
	},
	items: [
		{
			xtype: 'ra-form-panel',
			id: 'ra-newAllocPanel',
			layout: 'column',
			padding: '20 20 10 20',
			items: [
				{
					xtype: 'ra-form-panel-column',
					columnWidth: 0.45,
					items: [
						{
							xtype: 'ra-ldc-ss-resource',
							id: 'new-ra-resource',
							formId: 'new-ra',
							allowBlank: false,
							comboOnChange: function (combobox, record) {
								var resource = combobox.getSelectedRecord();

								if (resource) {
									if (RA.App.Stores.featureStore.getById('approvalWorkFlow').get('isEnabled')) {
										var form = Ext4.getCmp('new-ra');

										form.setSupervisor(resource);
										form.resetApprovalStatus();
									}

									//Load New Time off base from Resource
									var okButton = Ext4.getCmp('ra-newAllocOkBtn');
									var revertEnabled = false;
									if (!okButton.disable) {
										revertEnabled = true;
										okButton.setDisabled(true); //Disallow ok button during load
									}
									RA.App.Stores.timeOffConflict.load({
										params: {resourceId: resource.get('id')},
										callback: function (records, operation, success) {
											var okButton = Ext4.getCmp('ra-newAllocOkBtn');
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
							id: 'new-ra-project',
							formId: 'new-ra',
                            disabled: RA.Util.Dashboard.isActive(),
							comboOnSelect: function (combobox, record) {
								var taskCombo = Ext4.getCmp('new-ra-projecttask');
								var projectId = combobox.getValue();

								taskCombo.reset();

								if (projectId) {
									taskCombo.projectId = projectId;
									taskCombo.initSize();

									var store = taskCombo.isLargeData()
												? RA.App.Stores.largeDataRangeProjectTaskStore
												: taskCombo.smallDataStore;
									store.load({
										params: {
											jobFilter: projectId
										}
									});

									taskCombo.enable();
								} else {
									taskCombo.disable();
								}
							},
							allowBlank: false
						},
						{
							xtype: 'ra-ldc-ss-project-task',
							id: 'new-ra-projecttask',
							formId: 'new-ra',
							hidden: RA.App.Settings ? (RA.App.Settings.get('showProjectTasks') == 'F') : false, // default to show
							allowBlank: true,
							disabled: true,
							deferLoading: true
						},
						{
							xtype: 'panel',
							layout: 'column',
							border: false,
							items: [
								{
									xtype: 'ra-date',
									id: 'new-ra-startDate',
									fieldLabel: translatedStrings.getText('DATE.START_DATE'),
									allowBlank: false,
									value: new Date(),
									listeners: {
										blur: function (dateField, blurEvent, eOpts) {
											var endDateFld = dateField.up().down('#new-ra-endDate');
											var endDate = endDateFld.getValue();
											var startDate = dateField.getValue();

											if (dateField.isValid() && endDateFld.isValid() && startDate > endDate) {
												endDateFld.setValue(startDate);
											}

											/*
											 * based from core behavior, these field/s should be updated regardless of recurrence type selected -- even if SINGLE is selected
											 */
											Ext4.getCmp('new-ra-recurr-start').setValue(startDate);
											Ext4.getCmp('new-ra-recurr-end').setValue(startDate);

											Ext4.getCmp('new-ra-monthly-dayx').setValue(RA.Util.Date.getDayOfMonth(startDate));
											Ext4.getCmp('new-ra-monthly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(startDate));
											Ext4.getCmp('new-ra-monthly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(startDate) + 1);

											Ext4.getCmp('new-ra-yearly-month1').setValue(startDate.getMonth());
											Ext4.getCmp('new-ra-yearly-day').setValue(RA.Util.Date.getDayOfMonth(startDate));
											Ext4.getCmp('new-ra-yearly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(startDate));
											Ext4.getCmp('new-ra-yearly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(startDate) + 1);
											Ext4.getCmp('new-ra-yearly-month2').setValue(startDate.getMonth());
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
									id: 'new-ra-endDate',
									fieldLabel: translatedStrings.getText('DATE.END_DATE'),
									value: new Date(),
									allowBlank: false,
									listeners: {
										blur: function (dateField, blurEvent, eOpts) {
											var startDateFld = dateField.up().down('#new-ra-startDate');
											var startDate = startDateFld.getValue();
											var endDate = dateField.getValue();

											if (dateField.isValid() && startDateFld.isValid() && startDate > endDate) {
												startDateFld.setValue(endDate);
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
									id: 'new-ra-allocate',
									fieldLabel: translatedStrings.getText('NUMBER.ALLOCATE'),
									allowBlank: false,
									width: 100
								}), Ext4.create('Ext4.form.field.Display', {
									cls: 'ra-form-label',
									id: 'new-ra-allocateby-label',
									margin: '23 0 0 5'
								}), Ext4.create('RA.Cmp.ComboBox', {
									id: 'new-ra-allocateby',
									emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.BLANK'),
									allowBlank: false,
									readOnly: true,
									hidden: true,
									store: RA.App.Stores.allocByStore
								})
							]
						},
						{
							xtype: 'ra-combo-box-hidden',
							id: 'new-ra-allocatetype',
							fieldLabel: translatedStrings.getText('COMBOBOX.ALLOCATION_TYPE'),
							emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.BLANK'),
							allowBlank: false,
							store: RA.App.Stores.allocTypeStore,
							hidden: false
						}
					]
				},
				{
					xtype: 'ra-col-space',
					columnWidth: 0.1,
				},
				{
					xtype: 'ra-form-panel-column',
					columnWidth: 0.45,
					items: [
						{
							xtype: 'ra-ldc-ss-approver',
							id: 'new-ra-approver',
							formId: 'new-ra',
							allowBlank: false
						},
						{
							xtype: 'ra-flex-field-container',
							layout: 'form',
							items: [
								{
									xtype: 'ra-combo-box-hidden',
									id: 'new-ra-appstatus',
									fieldLabel: translatedStrings.getText('COMBOBOX.APPROVAL_STATUS'),
									emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.BLANK'),
									store: RA.App.Stores.appStatusStore,
									featureName: 'approvalWorkFlow',
									hidden: true
								},
								{
									xtype: 'ra-display',
									id: 'new-ra-appstatus-value',
									fieldLabel: translatedStrings.getText('DISPLAY.APPROVAL_STATUS')
								}
							]
						},
						{
							xtype: 'textarea',
							id: 'new-ra-comment',
							fieldLabel: translatedStrings.getText('TEXTAREA.COMMENTS'),
							grow: true,
							width: 350,
							labelSeparator: '',
							labelAlign: 'top'
						},
						{
							xtype: 'ra-combo-box-hidden',
							id: 'new-ra-recurrence',
							fieldLabel: translatedStrings.getText('TOOLTIP.LABEL.RECURRENCE'),
							allowBlank: false,
							store: RA.App.Stores.recurrenceTypeStore,
							value: 1,
							hidden: false,
							fieldsByRecurrenceType: {
								1: [],
								2: [
									'new-ra-recurr-dates-panel',
									'new-ra-xdays-panel',
									'new-ra-every-weekday'
								],
								3: [
									'new-ra-recurr-dates-panel',
									'new-ra-xweeks-panel',
									'new-ra-weekly-days-panel'
								],
								4: [
									'new-ra-recurr-dates-panel',
									'new-ra-monthly-panel1',
									'new-ra-monthly-panel2'
								],
								5: [
									'new-ra-recurr-dates-panel',
									'new-ra-yearly-panel1',
									'new-ra-yearly-panel2'
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
										Ext4.getCmp(show[i]).show();
									}
								}
							}
						},
						{
							xtype: 'fieldcontainer',
							id: 'new-ra-recurr-dates-panel',
							layout: 'column',
							border: false,
							items: [
								{
									xtype: 'ra-date',
									id: 'new-ra-recurr-start',
									fieldLabel: translatedStrings.getText('DATE.SERIES_START_DATE'),
									value: new Date(),
									columnWidth: 0.5,
									listeners: {
										blur: function (me) {
											var value = me.getValue();

											if (!Ext4.isDate(value)) {
												// if value is invalid, set to allocation start date
												var allocStart = Ext4.getCmp('new-ra-startDate').getValue();
												me.setValue(allocStart);
												value = allocStart;
											}

											/*
											 * based from core behavior, these field/s should be updated regardless of recurrence type selected -- even if SINGLE is selected
											 */
											var endDate = Ext4.getCmp('new-ra-recurr-end');
											var weekDays = Ext4.getCmp('new-ra-weekly-days-panel');

											if (value.getTime() > endDate.getValue().getTime()) {
												endDate.suspendEvents();
												endDate.setValue(value);
												endDate.resumeEvents();
											}
											if (Object.keys(weekDays.getValue()).length < 2) {
												weekDays.setValue(JSON.parse('{"' + 'new-ra-weekly-' + Ext4.Date.format(value, 'l').toLowerCase() + '-inputEl' + '":"' + value.getDay() + '"}'));
											}

											Ext4.getCmp('new-ra-monthly-dayx').setValue(RA.Util.Date.getDayOfMonth(value));
											Ext4.getCmp('new-ra-monthly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(value));
											Ext4.getCmp('new-ra-monthly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(value) + 1);

											Ext4.getCmp('new-ra-yearly-month1').setValue(value.getMonth());
											Ext4.getCmp('new-ra-yearly-day').setValue(RA.Util.Date.getDayOfMonth(value));
											Ext4.getCmp('new-ra-yearly-ordinal-day').setValue(RA.Util.Date.getDayOfWeekInMonthsCount(value));
											Ext4.getCmp('new-ra-yearly-day-of-week').setValue(RA.Util.Date.getDayOfWeek(value) + 1);
											Ext4.getCmp('new-ra-yearly-month2').setValue(value.getMonth());
										}
									}
								},
								{
									xtype: 'ra-col-space',
									width: 20
								},
								{
									xtype: 'ra-date',
									id: 'new-ra-recurr-end',
									fieldLabel: translatedStrings.getText('DATE.END_BY'),
									value: new Date(),
									columnWidth: 0.5,
									listeners: {
										blur: function (me) {
											var value = me.getValue();
											var startDate = Ext4.getCmp('new-ra-recurr-start').getValue();

											if (!Ext4.isDate(value)) {
												// if value is invalid, set to series start date
												me.setValue(startDate);
											}

											if (startDate.getTime() > value.getTime()) {
												me.setValue(startDate);
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
							id: 'new-ra-xdays-panel',
							items: [
								{
									xtype: 'radio',
									id: 'new-ra-xdays',
									boxLabel: translatedStrings.getText('TEXT.REPEAT_EVERY'),
									name: 'new-ra-daily-repeat',
									checked: true,
									handler: function (me, selected) {
										var xdaysField = Ext4.getCmp('new-ra-daily-frequency');
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
									id: 'new-ra-daily-frequency',
									maxValue: 1000,
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
							id: 'new-ra-every-weekday',
							boxLabel: translatedStrings.getText('TEXT.REPEAT_EVERY_WEEKDAY'),
							name: 'new-ra-daily-repeat',
							hidden: true
						},
						{
							xtype: 'fieldcontainer',
							id: 'new-ra-xweeks-panel',
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
									id: 'new-ra-weekly-frequency',
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
							id: 'new-ra-weekly-days-panel',
							columns: 2,
							vertical: true,
							items: RA.Util.CustomFunctions.rotate(
								[
									{
										xtype: 'checkbox',
										id: 'new-ra-weekly-sunday',
										boxLabel: translatedStrings.getText('SUNDAY'),
										inputValue: '0'
									},
									{
										xtype: 'checkbox',
										id: 'new-ra-weekly-monday',
										boxLabel: translatedStrings.getText('MONDAY'),
										inputValue: '1'
									},
									{
										xtype: 'checkbox',
										id: 'new-ra-weekly-tuesday',
										boxLabel: translatedStrings.getText('TUESDAY'),
										inputValue: '2'
									},
									{
										xtype: 'checkbox',
										id: 'new-ra-weekly-wednesday',
										boxLabel: translatedStrings.getText('WEDNESDAY'),
										inputValue: '3'
									},
									{
										xtype: 'checkbox',
										id: 'new-ra-weekly-thursday',
										boxLabel: translatedStrings.getText('THURSDAY'),
										inputValue: '4'
									},
									{
										xtype: 'checkbox',
										id: 'new-ra-weekly-friday',
										boxLabel: translatedStrings.getText('FRIDAY'),
										inputValue: '5'
									},
									{
										xtype: 'checkbox',
										id: 'new-ra-weekly-saturday',
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
										var recurrStart = Ext4.getCmp('new-ra-recurr-start');
										var currStart = recurrStart.getValue();
										var currIndex = currStart.getDay();
										var newIndex = newValue[Object.keys(newValue)[0]];

										if (currIndex != newIndex) {
											recurrStart.setValue(Ext4.Date.add(currStart, Ext4.Date.DAY, newIndex - currIndex));
										}
									}
								}
							}
						},
						{
							xtype: 'ra-recurring-form-fieldcontainer',
							id: 'new-ra-monthly-panel1',
							items: [
								{
									xtype: 'radio',
									id: 'new-ra-monthly-radio1',
									boxLabel: translatedStrings.getText('DAY'),
									name: 'new-ra-monthly',
									checked: true,
									handler: function (me, selected) {
										var parentContainer = this.up('fieldcontainer');
										if (selected) {
											parentContainer.enableFormFields();
										} else {
											parentContainer.disableFormFields();
										}
									}
								},
								{
									xtype: 'ra-number-field',
									id: 'new-ra-monthly-dayx',
									maxValue: 28,
									width: 30,
									allowBlank: false,
									listeners: {
										blur: function () {
											var dateVal = this.getValue();
											if (dateVal != null && dateVal >= this.minValue && dateVal <= this.maxValue) {
												var seriesStartDateCmp = Ext4.getCmp('new-ra-recurr-start');
												var startDate = seriesStartDateCmp.getValue();
												startDate.setDate(dateVal);
												seriesStartDateCmp.setValue(startDate);
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
									id: 'new-ra-monthly-xmonths1',
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
							id: 'new-ra-monthly-panel2',
							items: [
								{
									xtype: 'radio',
									id: 'new-ra-monthly-radio2',
									boxLabel: translatedStrings.getText('THE'),
									name: 'new-ra-monthly',
									checked: false,
									handler: function (me, selected) {
										var parentContainer = this.up('fieldcontainer');
										if (selected) {
											parentContainer.enableFormFields();
										} else {
											parentContainer.disableFormFields();
										}
									}
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'new-ra-monthly-ordinal-day',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.ordinalDayOfMonthSuffixStore,
									value: 1,
									hidden: false,
									width: 60,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('new-ra-recurr-start');
											var startDate = seriesStartDateCmp.getValue();
											var nthDay = this.getValue();
											var dayOfWeek = Ext4.getCmp('new-ra-monthly-day-of-week').getValue();
											RA.Util.Date.setDateByNthDayOfWeek(startDate, nthDay, dayOfWeek);
											seriesStartDateCmp.setValue(startDate);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'new-ra-monthly-day-of-week',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.dayOfWeekStore,
									value: 1,
									hidden: false,
									width: 60,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('new-ra-recurr-start');
											var startDate = seriesStartDateCmp.getValue();
											var nthDay = Ext4.getCmp('new-ra-monthly-ordinal-day').getValue();
											var dayOfWeek = this.getValue();
											RA.Util.Date.setDateByNthDayOfWeek(startDate, nthDay, dayOfWeek);
											seriesStartDateCmp.setValue(startDate);
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
									id: 'new-ra-monthly-xmonths2',
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
							id: 'new-ra-yearly-panel1',
							items: [
								{
									xtype: 'radio',
									id: 'new-ra-yearly-radio1',
									name: 'new-ra-yearly',
									checked: true,
									handler: function (me, selected) {
										var parentContainer = this.up('fieldcontainer');
										if (selected) {
											parentContainer.enableFormFields();
										} else {
											parentContainer.disableFormFields();
										}
									}
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'new-ra-yearly-month1',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.monthStore,
									value: 1,
									hidden: false,
									width: 100,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('new-ra-recurr-start');
											var startDate = seriesStartDateCmp.getValue();

											//0-based index
											var month = this.getValue();
											startDate.setMonth(month);

											seriesStartDateCmp.setValue(startDate);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								},
								{
									xtype: 'ra-number-field',
									id: 'new-ra-yearly-day',
									maxValue: 28,
									width: 30,
									allowBlank: false,
									listeners: {
										blur: function (_this) {
											var dateVal = _this.getValue();
											if (dateVal != null && dateVal >= this.minValue && dateVal <= this.maxValue) {
												var seriesStartDateCmp = Ext4.getCmp('new-ra-recurr-start');
												var startDate = seriesStartDateCmp.getValue();
												startDate.setDate(dateVal);
												seriesStartDateCmp.setValue(startDate);
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
							id: 'new-ra-yearly-panel2',
							items: [
								{
									xtype: 'radio',
									id: 'new-ra-yearly-radio2',
									boxLabel: translatedStrings.getText('THE'),
									name: 'new-ra-yearly',
									checked: false,
									handler: function (me, selected) {
										var parentContainer = this.up('fieldcontainer');
										if (selected) {
											parentContainer.enableFormFields();
										} else {
											parentContainer.disableFormFields();
										}
									}
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'new-ra-yearly-ordinal-day',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.ordinalDayOfMonthSuffixStore,
									value: 1,
									hidden: false,
									width: 60,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('new-ra-recurr-start');
											var startDate = seriesStartDateCmp.getValue();
											var nthDay = this.getValue();
											var dayOfWeek = Ext4.getCmp('new-ra-yearly-day-of-week').getValue();
											RA.Util.Date.setDateByNthDayOfWeek(startDate, nthDay, dayOfWeek);
											seriesStartDateCmp.setValue(startDate);
											seriesStartDateCmp.fireEvent('blur', seriesStartDateCmp);
										}
									},
									disabled: true
								},
								{
									xtype: 'ra-combo-box-hidden',
									id: 'new-ra-yearly-day-of-week',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.dayOfWeekStore,
									value: 1,
									hidden: false,
									width: 60,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('new-ra-recurr-start');
											var startDate = seriesStartDateCmp.getValue();
											var nthDay = Ext4.getCmp('new-ra-yearly-ordinal-day').getValue();
											var dayOfWeek = this.getValue();
											RA.Util.Date.setDateByNthDayOfWeek(startDate, nthDay, dayOfWeek);
											seriesStartDateCmp.setValue(startDate);
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
									id: 'new-ra-yearly-month2',
									queryMode: 'local',
									allowBlank: false,
									store: RA.App.Stores.monthStore,
									value: 1,
									hidden: false,
									width: 100,
									emptyText: null,
									listeners: {
										select: function () {
											var seriesStartDateCmp = Ext4.getCmp('new-ra-recurr-start');
											var startDate = seriesStartDateCmp.getValue();

											//0-based index
											var month = this.getValue();
											startDate.setMonth(month);

											var nthDay = Ext4.getCmp('new-ra-yearly-ordinal-day').getValue();
											var dayOfWeek = Ext4.getCmp('new-ra-yearly-day-of-week').getValue();

											RA.Util.Date.setDateByNthDayOfWeek(startDate, nthDay, dayOfWeek);

											seriesStartDateCmp.setValue(startDate);
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
							id: 'ra-newAllocOkBtn',
							text: translatedStrings.getText('BUTTON.OK'),
							formBind: true,
							handler: function (button, event) {
								perfTestLogger.start(RA.App.ModeManager.mode + ' New Allocation');

								var form = RA.App.Forms.newAllocForm;
								var newResourceObj = form.down('#new-ra-resource').getValue();
								var newProjectObj = form.down('#new-ra-project').getValue();
								var newProjectTaskObj = form.down('#new-ra-projecttask').getValue();
								var updateUi = true;

								var newAlloc = {
									newResourceId: newResourceObj.get('id'),
									newProjectId: newProjectObj.get('id'),
									newCustomerId: newProjectObj.raw.customerId,
									newProjectTaskId: newProjectTaskObj ? newProjectTaskObj.get('id') : 0,
									newProjectTaskName: newProjectTaskObj ? newProjectTaskObj.get('name') : null,
									newStartTimestamp: form.down('#new-ra-startDate').getValue(),
									newLastDate: form.down('#new-ra-endDate').getValue(),
									newAllocateNum: form.down('#new-ra-allocate').getValue(),
									newAllocBy: form.down('#new-ra-allocateby').getValue(),
									newAllocType: form.down('#new-ra-allocatetype').getValue(),
									newComment: form.down('#new-ra-comment').getValue(),
									newRecurrence: form.down('#new-ra-recurrence').getValue(),
									newEndTimestamp: new Date(form.down('#new-ra-endDate').getValue().getTime() + RA.App.Constant.DAY_IN_MILLI)
								};

								// check startdate < end date.
								if (newAlloc.newStartTimestamp > newAlloc.newLastDate) {
									alert(translatedStrings.getText('MESSAGE.ERROR.RA_INVALID_DATES'));
									return;
								}

								// check if there are working days
								if (!RA.App.Stores.chartEvent.isStartEndValid(newAlloc.newStartTimestamp, Ext4.Date.add(newAlloc.newEndTimestamp, Ext4.Date.DAY, -1), newAlloc.newResourceId, newResourceObj.raw.workCalendarRecord)) {
									alert(translatedStrings.getText('MESSAGE.ERROR.RA_NON_WORKING_DAY'));
									return;
								}

								// check if start and end date is within project task duration
								if (newProjectTaskObj) {
									var projectTaskFld = form.down('#new-ra-projecttask');
									var startDateFld = form.down('#new-ra-startDate');
									var endDateFld = form.down('#new-ra-endDate');
									projectTaskFld.checkStartDate(startDateFld, newProjectTaskObj);
									projectTaskFld.checkEndDate(endDateFld, newProjectTaskObj);
								}

								// View by Customer only; check if project is assigned to a customer (this excludes projects w/o customers, and projects assigned to leads or prospects)
								if (RA.App.Filters.filter.data.viewByType === 2) {
									if (!newAlloc.newCustomerId) {
										if (!confirm(translatedStrings.getText('MESSAGE.WARNING.ALLOCATE_TO_PROJECT_WITHOUT_CUSTOMER'))) {
											return;
										} else {
											updateUi = false;
										}
									}
								}

								if (newAlloc.newRecurrence > 1) {
									newAlloc.seriesStartDate = form.down('#new-ra-recurr-start').getValue();
									newAlloc.seriesEndDate = form.down('#new-ra-recurr-end').getValue();
								}

								switch (newAlloc.newRecurrence) {
									case 1: // Single
										newAlloc.frequency = 'NONE';
										break;
									case 2: // Daily
										if (form.down('#new-ra-xdays').getValue()) {
											newAlloc.frequency = 'DAY';
											newAlloc.period = form.down('#new-ra-daily-frequency').getValue();
										} else {
											newAlloc.frequency = 'WEEK';
											newAlloc.period = 1;
											newAlloc.dayOfWeekMask = 'FTTTTTF';
										}
										break;
									case 3: // Weekly
										newAlloc.frequency = 'WEEK';
										newAlloc.period = form.down('#new-ra-weekly-frequency').getValue();
										newAlloc.dayOfWeekMask = [
											Ext4.getCmp('new-ra-weekly-sunday').getValue() ? 'T' : 'F',
											Ext4.getCmp('new-ra-weekly-monday').getValue() ? 'T' : 'F',
											Ext4.getCmp('new-ra-weekly-tuesday').getValue() ? 'T' : 'F',
											Ext4.getCmp('new-ra-weekly-wednesday').getValue() ? 'T' : 'F',
											Ext4.getCmp('new-ra-weekly-thursday').getValue() ? 'T' : 'F',
											Ext4.getCmp('new-ra-weekly-friday').getValue() ? 'T' : 'F',
											Ext4.getCmp('new-ra-weekly-saturday').getValue() ? 'T' : 'F'
										].join('');

										if (newAlloc.dayOfWeekMask == 'FFFFFFF') { // if no day is checked, automatically set to day of series start date
											newAlloc.dayOfWeekMask = newAlloc.dayOfWeekMask.split('');
											newAlloc.dayOfWeekMask[newAlloc.seriesStartDate.getDay()] = 'T';
											newAlloc.dayOfWeekMask = newAlloc.dayOfWeekMask.join('');
										}

										break;
									case 4: // Monthly
										newAlloc.frequency = 'MONTH';
										if (Ext4.getCmp('new-ra-monthly-radio1').getValue()) {
											newAlloc.period = Ext4.getCmp('new-ra-monthly-xmonths1').getValue();
										} else {
											newAlloc.period = Ext4.getCmp('new-ra-monthly-xmonths2').getValue();
											newAlloc.dayOfWeek = Ext4.getCmp('new-ra-monthly-day-of-week').getValue();
											newAlloc.dayOfWeekInMonth = Ext4.getCmp('new-ra-monthly-ordinal-day').getValue();
										}
										break;
									case 5: // Yearly
										newAlloc.frequency = 'YEAR';
										newAlloc.period = 1;
										if (Ext4.getCmp('new-ra-yearly-radio2').getValue()) {
											newAlloc.dayOfWeek = Ext4.getCmp('new-ra-yearly-day-of-week').getValue();
											newAlloc.dayOfWeekInMonth = Ext4.getCmp('new-ra-yearly-ordinal-day').getValue();
										}
										break;
								}

								if (RA.App.Stores.featureStore.isRAAWEnabled()) {
									var approverRecord = form.down('#new-ra-approver').getValue();
									var approverId = approverRecord.get('id');

									newAlloc.newApprover = approverId;
									newAlloc.newAppStatus = form.down('#new-ra-appstatus').getValue();
								}

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

								var success = RA.App.Stores.chartEvent.createNewAllocation(newAlloc, newResourceObj, newProjectObj, updateUi, arrTimeOff);

								if (success) {
									if (updateUi) {
										if (RA.App.ModeManager.mode == RA.App.Constant.MODE_CHART) {
											RA.App.Chart.refreshNonWorking(true);
										} else {
											RA.App.Stores.gridStore.transformChartData();
										}
										RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(newAlloc.newProjectId);
									}
									form.hide();
								}
								perfTestLogger.stop();
							}
						}),
						Ext4.create('RA.Cmp.GrayButton', {
							id: 'ra-newAllocCancelBtn',
							text: translatedStrings.getText('BUTTON.CANCEL'),
							handler: function () {
								RA.App.Forms.newAllocForm.hide();
							}
						})
					]
				}
			]
		}
	]
});