/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.SettingsForm', {
	extend: 'RA.Cmp.Window',
	id: 'ra-settingsWindow',
	title: translatedStrings.getText('WINDOW.SETTINGS'),
	width: 600,
	listeners: {
		beforeShow: function (window, eOpts) {
			var feature = RA.App.Stores.featureStore;
			var settings = RA.App.Settings;
			var chartDensity = settings.get('chartDensity');
			var allocByFld = window.down('#settingAllocateBy');
			var dateRangeFld = window.down('#settingViewPreset');
			var showNumbersFld = window.down('#settingShowNumbers');
			var showHoversFld = window.down('#settingShowHovers');
			var showTasksFld = window.down('#settingShowProjectTasks');
			var incProjTempFld = window.down('#settingIncProjectTemplate');
			var allResourcesFld = window.down('#settingIncludeAllResources');
			var includeRejectedFld = window.down('#settingIncludeRejected');
			var settings1Fld = window.down('#settingColor1');
			var settings2Fld = window.down('#settingColor2');
			var settings3Fld = window.down('#settingColor3');
			var settings4Fld = window.down('#settingColor4');
			var settings5Fld = window.down('#settingColor5');
			var densityFld = window.down('#chartDensity' + chartDensity);
			var isGridActive = (RA.App.ModeManager.getActive() == RA.App.Grid);
			var limitDecimalPlacesFld = window.down('#settingLimitDecimalPlacesDisplay');

			// for use in cancel button
			window.formValues = {
				allocateById: settings.get('allocateById'),
				dateRange: settings.get('dateRange'),
				showNumbers: settings.get('showNumbers') == 'T',
				showHovers: settings.get('showHovers') == 'T',
				includeAllResources: settings.get('includeAllResources') == 'T',
				availabilityColor1: settings.get('availabilityColor1'),
				availabilityColor2: settings.get('availabilityColor2'),
				availabilityColor3: settings.get('availabilityColor3'),
				availabilityColor4: settings.get('availabilityColor4'),
				availabilityColor5: settings.get('availabilityColor5'),
				chartDensity: chartDensity,
				includeRejected: settings.get('includeRejected') == 'T',
				showProjectTasks: settings.get('showProjectTasks') == 'T',
				incProjectTemplate: settings.get('incProjectTemplate') == 'T',
				limitDecimalPlaces: parseInt(RA.App.Settings.get('limitDecimalPlaces'))
			};

			allocByFld.setValue(window.formValues.allocateById);
			dateRangeFld.setValue(window.formValues.dateRange);
			showNumbersFld.setValue(window.formValues.showNumbers);
			showHoversFld.setValue(window.formValues.showHovers);
			showTasksFld.setValue(window.formValues.showProjectTasks);
			incProjTempFld.setValue(window.formValues.incProjectTemplate);
			allResourcesFld.setValue(window.formValues.includeAllResources);
			settings1Fld.setValue(window.formValues.availabilityColor1);
			settings2Fld.setValue(window.formValues.availabilityColor2);
			settings3Fld.setValue(window.formValues.availabilityColor3);
			settings4Fld.setValue(window.formValues.availabilityColor4);
			settings5Fld.setValue(window.formValues.availabilityColor5);
			densityFld.setValue(true);
			limitDecimalPlacesFld.setValue(window.formValues.limitDecimalPlaces);

			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				includeRejectedFld.setValue(window.formValues.includeRejected);
			} else {
				includeRejectedFld.hide();
			}

			if (isGridActive) {
				window.down('#settingAllocateByHours').show();
				allocByFld.hide();
			} else {
				window.down('#settingAllocateByHours').hide();
				allocByFld.show();
			}

			showNumbersFld.setDisabled(isGridActive);
			settings1Fld.setDisabled(isGridActive);
			settings2Fld.setDisabled(isGridActive);
			settings3Fld.setDisabled(isGridActive);
			settings4Fld.setDisabled(isGridActive);
			settings5Fld.setDisabled(isGridActive);
			if (RA.App.Filters.filter.data.viewByType !== 1) {
				showTasksFld.setDisabled(true);
				showTasksFld.setValue(false);
				allResourcesFld.setDisabled(true);
				allResourcesFld.setValue(false);
			} else {
				showTasksFld.setDisabled(false);
				allResourcesFld.setDisabled(false);
			}
		},
		hide: function (window) {
			window.down('#settingAllocateBy').setValue(window.formValues.allocateById);
			window.down('#settingShowNumbers').setValue(window.formValues.showNumbers);
			window.down('#settingShowHovers').setValue(window.formValues.showHovers);
			window.down('#settingShowProjectTasks').setValue(window.formValues.showProjectTasks);
			window.down('#settingIncProjectTemplate').setValue(window.formValues.incProjectTemplate);
			window.down('#settingIncludeAllResources').setValue(window.formValues.includeAllResources);
			window.down('#settingColor1').setValue(window.formValues.availabilityColor1);
			window.down('#settingColor2').setValue(window.formValues.availabilityColor2);
			window.down('#settingColor3').setValue(window.formValues.availabilityColor3);
			window.down('#settingColor4').setValue(window.formValues.availabilityColor4);
			window.down('#settingColor5').setValue(window.formValues.availabilityColor5);
			window.down('#chartDensity1').setValue(false);
			window.down('#chartDensity2').setValue(false);
			window.down('#chartDensity3').setValue(false);
			window.down('#chartDensity' + window.formValues.chartDensity).setValue(true);
			window.down('#settingLimitDecimalPlacesDisplay').setValue(window.formValues.limitDecimalPlaces);
			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				window.down('#settingIncludeRejected').setValue(window.formValues.includeRejected);
			} else {
				window.down('#settingIncludeRejected').hide();
			}
		}
	},
	items: [
		Ext4.create('RA.Cmp.FormPanel', {
			id: 'ra-settingsPanel',
			layout: 'column',
			items: [
				Ext4.create('Ext4.form.FieldSet', {
					title: translatedStrings.getText('FIELDSET.APPEARANCE'),
					id: 'fsAppearance',
					border: false,
					width: 300,
					items: [
						Ext4.create('Ext4.form.Display', {
							id: 'settingAllocateByHours',
							value: translatedStrings.getText('COMBOBOX.ALLOCATE_USING') + ' ' + translatedStrings.getText('STORE.HOURS')
						}),
						Ext4.create('RA.Cmp.ComboBox', {
							id: 'settingAllocateBy',
							fieldLabel: translatedStrings.getText('COMBOBOX.ALLOCATE_USING'),
							width: 200,
							store: RA.App.Stores.allocByStore,
							listeners: {
								change: function (combobox, newValue, oldValue) {
									var settings = RA.App.Settings;
									settings.beginEdit();
									settings.set('allocateById', newValue);
									settings.endEdit();
									settings.setDirty(true);
								}
							}
						}),
						Ext4.create('RA.Cmp.ComboBox', {
							id: 'settingLimitDecimalPlacesDisplay',
							fieldLabel: translatedStrings.getText('COMBOBOX.LIMIT_DECIMAL_PLACES'),
							width: 200,
							store: RA.App.Stores.decimalPlaceStore,
							listeners: {
								change: function (combobox, newValue, oldValue) {
									var settings = RA.App.Settings;
									settings.beginEdit();
									settings.set('limitDecimalPlaces', newValue);
									settings.endEdit();
									settings.setDirty(true);
								}
							}
						}),
						Ext4.create('RA.Cmp.ComboBox', {
							id: 'settingViewPreset',
							fieldLabel: translatedStrings.getText('COMBOBOX.VIEW_PRESET'),
							width: 200,
							store: RA.App.Stores.viewPreset,
							listeners: {
								change: function (combobox, newValue, oldValue) {
									var settings = RA.App.Settings;
									settings.beginEdit();
									settings.set('dateRange', newValue);
									settings.endEdit();
									settings.setDirty(true);
								}
							}
						}),
						{
							xtype: 'ra-spacer'
						},
						Ext4.create('RA.Cmp.CheckBox', {
							id: 'settingShowNumbers',
							boxLabel: translatedStrings.getText('CHECKBOX.SHOW_NUMBERS_ON_BARS'),
							name: 'showNumbers'
						}),
						Ext4.create('RA.Cmp.CheckBox', {
							id: 'settingShowHovers',
							boxLabel: translatedStrings.getText('CHECKBOX.SHOW_DETAILS_ON_HOVER'),
							name: 'showHovers'
						}),
						Ext4.create('RA.Cmp.CheckBox', {
							id: 'settingShowProjectTasks',
							boxLabel: translatedStrings.getText('CHECKBOX.SHOW_PROJECT_TASKS'),
							name: 'showProjectTasks',
							hidden: (parseFloat(RA.App.Context.getVersion()) < 2015.2)
						}),
						Ext4.create('RA.Cmp.CheckBox', {
							id: 'settingIncludeAllResources',
							boxLabel: translatedStrings.getText('CHECKBOX.INCLUDE_RESOURCES_WO_ALLOCS'),
							name: 'includeAllResources'
						}),
						Ext4.create('RA.Cmp.CheckBox', {
							id: 'settingIncludeRejected',
							boxLabel: translatedStrings.getText('CHECKBOX.SHOW_REJECTED_ALLOCATIONS'),
							name: 'includeRejected',
							featureName: 'approvalWorkFlow'
						}),
						Ext4.create('RA.Cmp.CheckBox', {
							id: 'settingIncProjectTemplate',
							boxLabel: translatedStrings.getText('CHECKBOX.INCLUDE_PROJECT_TEMPLATE'),
							name: 'incProjectTemplate'
						})
					]
				}),
				Ext4.create('Ext4.form.FieldSet', {
					title: translatedStrings.getText('FIELDSET.ALLOCATION'),
					id: 'fsAvailability',
					border: false,
					width: 155,
					items: [
						Ext4.create('RA.Cmp.ColorField', {
							id: 'settingColor1',
							name: 'availabilityColor1',
							fieldLabel: '1-25%',
							value: '99CCFF'
						}),
						Ext4.create('RA.Cmp.FormSpacer'),
						Ext4.create('RA.Cmp.ColorField', {
							id: 'settingColor2',
							name: 'availabilityColor2',
							fieldLabel: '26-50%',
							value: 'CCFFCC'
						}),
						Ext4.create('RA.Cmp.FormSpacer'),
						Ext4.create('RA.Cmp.ColorField', {
							id: 'settingColor3',
							name: 'availabilityColor3',
							fieldLabel: '51-75%',
							value: 'FFFF99'
						}),
						Ext4.create('RA.Cmp.FormSpacer'),
						Ext4.create('RA.Cmp.ColorField', {
							id: 'settingColor4',
							name: 'availabilityColor4',
							fieldLabel: '76-100%',
							value: 'FFCC99'
						}),
						Ext4.create('RA.Cmp.FormSpacer'),
						Ext4.create('RA.Cmp.ColorField', {
							id: 'settingColor5',
							name: 'availabilityColor5',
							fieldLabel: translatedStrings.getText('COLORFIELD.OVERBOOKED'),
							value: 'FF99CC'
						})
					]
				}),
				Ext4.create('Ext4.form.FieldSet', {
					title: translatedStrings.getText('FIELDSET.CHART_DENSITY'),
					id: 'fsChartDensity',
					border: false,
					width: 426,
					items: [
						Ext4.create('RA.Cmp.ChartDensityRadio', {
							id: 'chartDensity1',
							name: 'density',
							boxLabel: translatedStrings.getText('RADIO.DENSE'),
							inputValue: 1
						}),
						Ext4.create('RA.Cmp.ChartDensityRadio', {
							id: 'chartDensity2',
							name: 'density',
							boxLabel: translatedStrings.getText('RADIO.STANDARD'),
							inputValue: 2
						}),
						Ext4.create('RA.Cmp.ChartDensityRadio', {
							id: 'chartDensity3',
							name: 'density',
							boxLabel: translatedStrings.getText('RADIO.RELAXED'),
							inputValue: 3
						})
					]
				})
			],
			dockedItems: [
				{
					xtype: 'raformmenu',
					items: [
						Ext4.create('RA.Cmp.BlueButton', {
							id: 'ra-settingsSaveBtn',
							text: translatedStrings.getText('BUTTON.SAVE'),
							handler: function () {
								perfTestLogger.start(RA.App.ModeManager.mode + ' Save Settings');
								if (RA.App.Settings.dirty) {
									RA.App.Stores.settingStore.sync({
										success: function () {
											if (RA.App.Chart) {
												RA.App.Chart.updateChartDensity(RA.App.Settings.get('chartDensity'));
												Ext4.getCmp('ra-toolbar-legend').initTypeBgMap();
												Ext4.getCmp('ra-toolbar-legend').loadLegendColors();
											}
											var formSettings = Ext4.getCmp('ra-settingsWindow');

											//Refresh project filters when Include Project Template setting is updated
											if ((RA.App.Filters.filter.data.viewByType == 1 || RA.App.Filters.filter.data.viewByType == 3) &&
												formSettings.formValues.incProjectTemplate != (RA.App.Settings.get('incProjectTemplate') == 'T')) {
												RA.App.Stores.projectAndTemplateStore.load({
													params: {'incProjectTemplate': RA.App.Settings.get('incProjectTemplate')},
													callback: function (records, operation, success) {
														reselectProjectFilter();
													}
												});
											}
											RA.App.Stores.chartResource.loadWithFilters(RA.App.Constant.LOAD_MODE_RELOAD);
											RA.App.Grid.updateColumns();
										},
										failure: function () {
											console.error('ERROR: Failed to sync settings store');
										}
									});
								}
								RA.App.Forms.settingsForm.hide();
							}
						}), Ext4.create('RA.Cmp.GrayButton', {
							id: 'ra-settingsCancelBtn',
							text: translatedStrings.getText('BUTTON.CANCEL'),
							handler: function () {
								var form = RA.App.Forms.settingsForm;
								var formValues = form.formValues;
								form.down('#settingAllocateBy').setValue(formValues.allocateById);
								form.down('#settingShowNumbers').setValue(formValues.showNumbers);
								form.down('#settingShowHovers').setValue(formValues.showHovers);
								form.down('#settingShowProjectTasks').setValue(formValues.showProjectTasks);
								form.down('#settingIncludeAllResources').setValue(formValues.includeAllResources);
								form.down('#settingColor1').setValue(formValues.availabilityColor1);
								form.down('#settingColor2').setValue(formValues.availabilityColor2);
								form.down('#settingColor3').setValue(formValues.availabilityColor3);
								form.down('#settingColor4').setValue(formValues.availabilityColor4);
								form.down('#settingColor5').setValue(formValues.availabilityColor5);
								form.down('#chartDensity1').setValue(false);
								form.down('#chartDensity2').setValue(false);
								form.down('#chartDensity3').setValue(false);
								form.down('#chartDensity' + formValues.chartDensity).setValue(true);
								if (RA.App.Stores.featureStore.isRAAWEnabled()) {
									form.down('#settingIncludeRejected').setValue(formValues.includeRejected);
								}
								form.hide();
							}
						}), Ext4.create('RA.Cmp.GrayButton', {
							id: 'ra-settingsRestoreBtn',
							text: translatedStrings.getText('BUTTON.RESTORE_DEFAULTS'),
							width: 'auto',
							handler: function () {
								var form = RA.App.Forms.settingsForm;
								form.down('#settingIncludeAllResources').setValue(false);
								form.down('#settingIncludeRejected').setValue(true);
								form.down('#chartDensity1').setValue(false);
								form.down('#chartDensity2').setValue(true);
								form.down('#chartDensity3').setValue(false);
								form.down('#settingShowProjectTasks').setValue(false);
								form.down('#settingIncProjectTemplate').setValue(false);
								form.down('#settingShowHovers').setValue(true);
								form.down('#settingLimitDecimalPlacesDisplay').setValue(4);
								/*
								 * chart specific settings
								 */
								if (RA.App.ModeManager.getActive() == RA.App.Chart) {
									form.down('#settingShowNumbers').setValue(true);
									form.down('#settingAllocateBy').setValue(RA.App.Constant.ALLOCATE_BY_HOUR);
									form.down('#settingViewPreset').setValue(2); //weekly
									form.down('#settingColor1').setValue('FDFF89');
									form.down('#settingColor2').setValue('BFE8FF');
									form.down('#settingColor3').setValue('79C6F2');
									form.down('#settingColor4').setValue('6695D5');
									form.down('#settingColor5').setValue('FF1919');
								}
							}
						})
					]
				}
			]
		})
	]
});