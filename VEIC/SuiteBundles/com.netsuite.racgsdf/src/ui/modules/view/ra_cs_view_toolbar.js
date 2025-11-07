/**
 * © 2017 NetSuite Inc. User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.MainToolbar', {
	extend: 'Ext4.toolbar.Toolbar',
	id: 'ra-main-toolbar',
	renderTo: Ext4.get('main_form'),
	cls: 'ra-toolbar-main',
	height: 38,
	border: '1 1 0 1',
	defaults: {
		margin: '0 15 0 0'
	},
	items: [
		Ext4.create('RA.Cmp.ToggleExpandCollapse', {
			id: 'ra-chartExpandBtn',
			text: translatedStrings.getText('BUTTON.EXPAND_ALL').toUpperCase(),
			mode: 'expand',
			margin: '0 15 0 15'
		}),
		Ext4.create('RA.Cmp.ToggleExpandCollapse', {
			id: 'ra-chartCollapseBtn',
			text: translatedStrings.getText('BUTTON.COLLAPSE_ALL').toUpperCase(),
			mode: 'collapse'
		}),
		/*
		 * Export button
		 */
		Ext4.create('RA.Cmp.IconButton', {
			id: 'ra-allExportBtn',
			iconCls: 'icon-all-export',
			tooltip: translatedStrings.getText('BUTTON.EXPORT'),
			listeners: {
				mouseover: function (me) {
					me.getActionEl().dom.click();
				},
			},
			menu: Ext4.create('Ext4.menu.Menu', {
				id: 'ra-export-menu',
				layout: 'hbox',
				minWidth: 28,
				minHeight: 24,
				width: 90,
				defaultType: 'ra-square-icon-btn',
				defaults: {
					width: 28,
					height: 24
				},
				items: [
					{
						id: 'ra-exportPDFBtn',
						iconCls: 'icon-pdf',
						tooltip: translatedStrings.getText('BUTTON.EXPORT.PDF'),
						handler: function () {
							RA.App.Toolbar.loadExportData('PDF');
						}
					},
					{
						id: 'ra-exportCSVBtn',
						iconCls: 'icon-csv',
						tooltip: translatedStrings.getText('BUTTON.EXPORT.CSV'),
						handler: function () {
							RA.App.Toolbar.loadExportData('CSV');
						}
					},
					{
						id: 'ra-exportExcelBtn',
						iconCls: 'icon-excel',
						tooltip: translatedStrings.getText('BUTTON.EXPORT.XLS'),
						handler: function () {
							RA.App.Toolbar.loadExportData('XLS');
						}
					}
				],
				listeners: {
					mouseleave: function (me) {
						me.hide();
					}
				}
			})
		}),
		Ext4.create('RA.Cmp.SquareIconButton', {
			id: 'ra-printBtn',
			iconCls: 'icon-print',
			tooltip: translatedStrings.getText('BUTTON.PRINT'),
			handler: function () {
				if (RA.App.Grid.isVisible()) {
					RA.App.Grid.print();
				} else {
					RA.App.Chart.getSchedulingView().scrollVerticallyTo(0, false);
					setTimeout(function () {
						RA.App.Chart.print();
					}, 1000);
				}
			}
		}),
		/*
		 * Settings button
		 */
		Ext4.create('RA.Cmp.IconButton', {
			id: 'ra-chartSettingsBtn',
			iconCls: 'icon-options',
			tooltip: translatedStrings.getText('BUTTON.SETTINGS'),
			handler: function () {
				if (RA.App.Stores.chartEvent.areThereChanges()) {
					alert(translatedStrings.getText('MESSAGE.ERROR.SETTINGS_UNSAVED_CHANGES'));
					return false;
				}
				RA.App.Forms.settingsForm.show();
			}
		}),
		Ext4.create('RA.Cmp.MenuSeparator'),
		/*
		 * Date range controls and label/display
		 */
		Ext4.create('RA.Cmp.ArrowButton', {
			id: 'ra-chartPanLeft',
			iconCls: 'icon-prev',
			tooltip: translatedStrings.getText('TOOLTIP.PREVIOUS'),
			handler: function () {
				perfTestLogger.start(RA.App.ModeManager.mode + ' Pan Left');
				RA.App.ModeManager.getActive().shiftPrevious();
				perfTestLogger.stop();
			}
		}),
		RA.App.RangeField,
		Ext4.create('RA.Cmp.ArrowButton', {
			id: 'ra-chartPanRight',
			iconCls: 'icon-next',
			tooltip: translatedStrings.getText('TOOLTIP.NEXT'),
			handler: function () {
				perfTestLogger.start(RA.App.ModeManager.mode + ' Pan Right');
				RA.App.ModeManager.getActive().shiftNext();
				perfTestLogger.stop();
			}
		}),
		Ext4.create('Ext4.toolbar.Spacer', {
			height: 5,
			width: 30
		}),
		/*
		 * Chart/Grid toggling
		 */
		Ext4.create('RA.Cmp.ToggleGridChart', {
			id: 'ra-toggleGrid',
			text: translatedStrings.getText('GRID'),
			mode: RA.App.Constant.MODE_GRID,
			pressed: true
		}),
		Ext4.create('RA.Cmp.MenuSeparatorSmall'),
		Ext4.create('RA.Cmp.ToggleGridChart', {
			id: 'ra-toggleChart',
			text: translatedStrings.getText('CHART'),
			mode: RA.App.Constant.MODE_CHART
		}),
		Ext4.create('RA.Cmp.MenuSeparator', {
			padding: '0 15 0 15'
		}),
		/*
		 * View presets - Daily/Weekly/Monthly
		 */
		Ext4.create('RA.Cmp.TogglePreset', {
			id: 'ra-chartPresetDaily',
			text: translatedStrings.getText('VIEWPRESET.DAILY'),
			presetClassName: 'RA.ViewPreset.Daily'
		}),
		Ext4.create('RA.Cmp.MenuSeparatorSmall'),
		Ext4.create('RA.Cmp.TogglePreset', {
			id: 'ra-chartPresetWeekly',
			text: translatedStrings.getText('VIEWPRESET.WEEKLY'),
			presetClassName: 'RA.ViewPreset.Weekly'
		}),
		Ext4.create('RA.Cmp.MenuSeparatorSmall'),
		Ext4.create('RA.Cmp.TogglePreset', {
			id: 'ra-chartPresetMonthly',
			text: translatedStrings.getText('VIEWPRESET.MONTHLY'),
			presetClassName: 'RA.ViewPreset.Monthly'
		}),
		/*
		 * Float right from this point onwards
		 */
		Ext4.create('Ext4.toolbar.Fill'),
		/*
		 * Paging components
		 */
		Ext4.create('RA.Cmp.PagingComboBox', {
			id: 'ra-page-combo-box',
			store: RA.App.Stores.pageStore,
			value: 0,
			matchFieldWidth: false,
			maxWidth: 300,
			pickerAlign: 'tr-br',
			width: '100%'
		}),
		Ext4.create('RA.Cmp.ArrowButton', {
			id: 'ra-prevPage',
			iconCls: 'icon-prev',
			tooltip: translatedStrings.getText('TOOLTIP.PREVIOUS'),
			handler: function () {
				var combo = Ext4.getCmp('ra-page-combo-box');
				var currPage = combo.getValue();
				if (currPage == 0) {
					alert(translatedStrings.getText('MESSAGE.ERROR.ALREADY_ON_FIRST_PAGE'));
				} else {
					if (RA.App.Stores.chartEvent.areThereChanges()) {
						alert(translatedStrings.getText('MESSAGE.ERROR.UNSAVED_PENDING_CHANGES'));
						return false;
					}
					combo.select(currPage - 1);
				}
			}
		}),
		Ext4.create('RA.Cmp.ArrowButton', {
			id: 'ra-nextPage',
			iconCls: 'icon-next',
			tooltip: translatedStrings.getText('TOOLTIP.NEXT'),
			handler: function () {
				var combo = Ext4.getCmp('ra-page-combo-box');
				var currPage = combo.getValue();
				var totalPages = combo.store.getCount();
				if (currPage == totalPages - 1) {
					alert(translatedStrings.getText('MESSAGE.ERROR.ALREADY_ON_LAST_PAGE'));
				} else {
					if (RA.App.Stores.chartEvent.areThereChanges()) {
						alert(translatedStrings.getText('MESSAGE.ERROR.UNSAVED_PENDING_CHANGES'));
						return false;
					}
					combo.select(currPage + 1);
				}
			}
		}),
		Ext4.create('RA.Cmp.Display', {
			id: 'ra-total-page',
			fieldLabel: translatedStrings.getText('DISPLAY.TOTAL'),
			labelAlign: 'right',
			labelSeparator: ':',
			labelWidth: 'auto',
			height: 20,
			width: 'auto',
			value: 0
		}),
		/*
		 * Help icon and tooltip
		 */
		Ext4.create('RA.Cmp.IconButton', {
			id: 'ra-icon-info',
			iconCls: 'icon-info',
			tooltip: Ext4.create('RA.Cmp.ToolTip', {
				delegate: '.icon-info',
				anchor: 'right',
				showDelay: 0,
				trackMouse: false,
				listeners: {
					beforeshow: function updateTipBody(tip) {
						var dummyBar = Ext4.create('RA.Cmp.LegendToolbar');
						var map = dummyBar.typeBgMap;

						var infoTip = [
							'<div class="ra-simple-tip">',
							'<div>',
							'<table id="record-tooltip-legend-table">',
							'<tr>',
							'<td>',
							'<div style="background-color:' + map['legend-25'] + '"></div>',
							'<span>1 - 25%</span>',
							'</td>',
							'<td>',
							'<div style="background-color:' + map['Hard'] + '"></div>',
							'<span>' + RA.App.Stores.allocTypeStore.getById(1).get('name') + '</span>',
							'</td>',
							'<td>',
							'<div  style="background:' + map['NonWorking'] + '"></div>',
							'<span>' + translatedStrings.getText('NON_WORKING_DAY') + '</span>',
							'</td>',
							'</tr>',
							'<tr>',
							'<td>',
							'<div style="background-color:' + map['legend-50'] + '"></div>',
							'<span>26 - 50%</span>',
							'</td>',
							'<td>',
							'<div style="background:' + map['Soft'] + '"></div>',
							'<span>' + RA.App.Stores.allocTypeStore.getById(2).get('name') + '</span>',
							'</td>',
							'<td>',
							'<div style="text-decoration: underline; text-align: center">4</div>',
							'<span>' + translatedStrings.getText('MULTIPLE_ALLOCATION') + '</span>',
							'</td>',
							'</tr>',
							'<tr>',
							'<td>',
							'<div style="background-color:' + map['legend-75'] + '"></div>',
							'<span>51 - 75%</span>',
							'</td>',
							'<td></td>',
							'<td>',
							'<div style="background:' + map['Recurring'] + '"></div>',
							'<span>' + translatedStrings.getText('RECURRING_ALLOCATION') + '</span>',
							'</td>',
							'</tr>',
							'<tr>',
							'<td>',
							'<div style="background-color:' + map['legend-100'] + '"></div>',
							'<span>76 - 100%</span>',
							'</td>',
							'<td></td>',
							'<td></td>',
							'</tr>',
							'<tr>',
							'<td>',
							'<div style="background-color:' + map['legend-overbooked'] + '"></div>',
							'<span>' + translatedStrings.getText('LEGEND.OVER') + '</span>',
							'</td>',
							'<td></td>',
							'<td></td>',
							'</tr>',
							'</table>',
							'<hr /><br />',
							translatedStrings.getText('TO_LIMIT_NUMBER_OF_PROJECTS') + '<br /><br />',
							'<b>' + translatedStrings.getText('CHART') + '</b><br />',
							translatedStrings.getText('CLICK_BAR_TO_EDIT') + '<br />',
							translatedStrings.getText('DRAG_AND_DROP_BAR_TO_MOVE') + '<br /><br />',
							'<b>' + translatedStrings.getText('GRID') + '</b><br />',
							translatedStrings.getText('CLICK_CELL_TO_EDIT') + '<br />',
							translatedStrings.getText('CONTROL_CLICK_TO_DRILL_DOWN') + '<br />',
							translatedStrings.getText('RIGHT_CLICK_TO_ADJUST') + '<br />',
							'</div>',
							'</div>'
						];

						tip.update(infoTip.join(''));
					}
				}
			})
		})
	],
	loadExportData: function (format) {
		/*
		 * prepare parameters; set temporary values for limit to properly retrieve all pages
		 */
		perfTestLogger.start('Export ' + format);
		this.exportFormat = format;
		this.resourceStore = RA.App.Stores.chartResource;

		this.resourceStore.allDataParams.limit = 1000;
		var tmpStart = this.resourceStore.allDataParams.start;
		this.resourceStore.allDataParams.start = 0;
		/*
		 * load data into stores
		 */
		RA.App.Stores.expResourceStore.load({
			params: RA.App.Stores.chartResource.allDataParams
		});
		RA.App.Stores.expAllocStore.load({
			params: RA.App.Stores.chartResource.allDataParams
		});
		/*
		 * return limit to original values
		 */
		this.resourceStore.allDataParams.limit = RA.App.Stores.settingStore.getLimit();
		this.resourceStore.allDataParams.start = tmpStart;
	},
	exportFile: function () {
		/*
		 * terminate if both stores are not yet done loading
		 */
		if (!(RA.App.Stores.expResourceStore.isLoaded && RA.App.Stores.expAllocStore.isLoaded)) return;
		/*
		 * build data for export
		 */
		var data = {
			exportFormat: this.exportFormat,
			showTask: RA.App.Settings.get('showProjectTasks'),
			isApprovalEnabled: RA.App.Stores.featureStore.getById('approvalWorkFlow').get('isEnabled'),
			viewResourcesBy: RA.App.Filters.filter.data.viewByType
		};
		switch (data.viewResourcesBy) {
			case 1:
				data.rows = this.getDataRowsByResource();
				break;
			case 2:
				data.rows = this.getDataRowsByCustomer();
				break;
			case 3:
				data.rows = this.getDataRowsByProject();
				break;
		}
		/*
		 * trigger export
		 */
		this.submitHiddenForm(nlapiResolveURL('SUITELET', 'customscript_proj_racg_su_data_exporter', 'customdeploy_proj_racg_su_data_exporter'), data);
	},
	getDataRowsByResource: function () {
		var rows = [];
		var resource = RA.App.Stores.expResourceStore.getRootNode().getChildAt(0);
		while (resource) {
			var project = resource.getChildAt(0);
			while (project) {
				var events = RA.App.Stores.expAllocStore.query('ResourceId', project.get('Id'));
				rows = rows.concat(this.getDataRows(resource, events));
				project = project.nextSibling;
			}
			resource = resource.nextSibling;
		}
		return rows;
	},
	getDataRowsByCustomer: function () {
		var rows = [];
		var customer = RA.App.Stores.expResourceStore.getRootNode().getChildAt(0);
		while (customer) {
			var project = customer.getChildAt(0);
			while (project) {
				var resource = project.getChildAt(0);
				while (resource) {
					var events = RA.App.Stores.expAllocStore.query('ResourceId', resource.get('Id'));
					rows = rows.concat(this.getDataRows(resource, events));
					resource = resource.nextSibling;
				}
				project = project.nextSibling;
			}
			customer = customer.nextSibling;
		}
		return rows;
	},
	getDataRowsByProject: function () {
		var rows = [];
		var project = RA.App.Stores.expResourceStore.getRootNode().getChildAt(0);
		while (project) {
			var resource = project.getChildAt(0);
			while (resource) {
				var events = RA.App.Stores.expAllocStore.query('ResourceId', resource.get('Id'));
				rows = rows.concat(this.getDataRows(resource, events));
				resource = resource.nextSibling;
			}
			project = project.nextSibling;
		}
		return rows;
	},
	getDataRows: function (resource, events) {
		var rows = [];
		for (var i = 0; i < events.getCount(); i++) {
			var event = events.getAt(i);
			rows.push({
				name: resource.get('Name'),
				task: (event.get('tipTask') == translatedStrings.getText('DISPLAY.NONE') ? '' : event.get('tipTask')),
				customer: event.get('customer'),
				projectName: event.get('projectName'),
				startdate: Ext4.Date.format(event.get('startTimestamp'), RA.App.NSProps.getDateFormat()),
				enddate: Ext4.Date.format(event.getLastDate(), RA.App.NSProps.getDateFormat()),
				hours: event.get('hour'),
				percent: event.get('percent'),
				allocate: event.get('unitName'),
				type: event.get('type'),
				requestedby: event.get('requestedBy'),
				approvalstatus: event.get('tipAppStatus'),
				approver: event.get('tipApprover')
			});
		}
		return rows;
	},
	submitHiddenForm: function (url, params) {
		/*
		 * create hidden form for submitting
		 */
		if (!this.tempInput) {
			this.tempInput = document.createElement("input");
			this.tempInput.type = "text";
			this.tempInput.name = "params";
		}
		if (!this.tempForm) {
			this.tempForm = document.createElement("form");
			this.tempForm.method = "POST";
			this.tempForm.style.display = "none";
			this.tempForm.appendChild(this.tempInput);
			document.body.appendChild(this.tempForm);
		}
		/*
		 * setup properties then submit
		 */
		this.tempInput.value = JSON.stringify(params);
		this.tempForm.action = url;
		this.tempForm.submit();
		perfTestLogger.stop();
	}
});
/*
 * Legend toolbar
 */
Ext4.define('RA.Cmp.LegendToolbar', {
	id: 'ra-toolbar-legend',
	extend: 'Ext4.toolbar.Toolbar',
	cls: 'ra-toolbar-legend',
	height: 48,
	hidden: true,
	layout: {
		align: 'bottom'
	},
	defaults: {
		margin: 0
	},
	initComponent: function (args) {
		this.callParent(args);
		this.initTypeBgMap();
	},
	initTypeBgMap: function () {
		var settings = RA.App.Settings;
		if (!this.typeBgMap) this.typeBgMap = {};
		this.typeBgMap['legend-25'] = '#' + settings.get('availabilityColor1');
		this.typeBgMap['legend-50'] = '#' + settings.get('availabilityColor2');
		this.typeBgMap['legend-75'] = '#' + settings.get('availabilityColor3');
		this.typeBgMap['legend-100'] = '#' + settings.get('availabilityColor4');
		this.typeBgMap['legend-overbooked'] = '#' + settings.get('availabilityColor5');
		this.typeBgMap['Hard'] = '#E6E6E6';
		this.typeBgMap['Soft'] = '#FFFFFF url(' + cssSoftURL + ')'; // from main suitelet
		this.typeBgMap['NonWorking'] = '#FFFFFF url(' + cssNonWorkingURL + ')'; // from main suitelet
		this.typeBgMap['Recurring'] = '#FFFFFF 0/19px url(' + cssRecurringURL + ') no-repeat'; // from main suitelet
	},
	loadLegendColors: function () {
		Ext4.getCmp('ra-legend-25').el.setStyle('background-color', this.typeBgMap['legend-25']);
		Ext4.getCmp('ra-legend-50').el.setStyle('background-color', this.typeBgMap['legend-50']);
		Ext4.getCmp('ra-legend-75').el.setStyle('background-color', this.typeBgMap['legend-75']);
		Ext4.getCmp('ra-legend-100').el.setStyle('background-color', this.typeBgMap['legend-100']);
		Ext4.getCmp('ra-legend-overbooked').el.setStyle('background-color', this.typeBgMap['legend-overbooked']);
		Ext4.getCmp('ra-legend-hard').el.setStyle('background-color', this.typeBgMap['Hard']);
		Ext4.getCmp('ra-legend-soft').el.setStyle('background', this.typeBgMap['Soft']);
	},
	listeners: {
		boxready: function () {
			this.loadLegendColors();
		}
	},
	items: [
		Ext4.create('Ext4.toolbar.Fill'),
		Ext4.create('Ext4.panel.Panel', {
			cls: 'ra-legend-fieldset',
			height: 38,
			layout: {
				type: 'hbox',
				align: 'middle'
			},
			defaults: {
				margin: '0 15 0 0'
			},
			items: [
				Ext4.create('RA.Cmp.Legend', {
					id: 'ra-legend-25',
					margin: '0 15 0 15'
				}),
				Ext4.create('RA.Cmp.LegendLabel', {
					text: '1-25%'
				}),
				Ext4.create('RA.Cmp.Legend', {
					id: 'ra-legend-50'
				}),
				Ext4.create('RA.Cmp.LegendLabel', {
					text: '26-50%'
				}),
				Ext4.create('RA.Cmp.Legend', {
					id: 'ra-legend-75'
				}),
				Ext4.create('RA.Cmp.LegendLabel', {
					text: '51-75%'
				}),
				Ext4.create('RA.Cmp.Legend', {
					id: 'ra-legend-100'
				}),
				Ext4.create('RA.Cmp.LegendLabel', {
					text: '76-100%'
				}),
				Ext4.create('RA.Cmp.Legend', {
					id: 'ra-legend-overbooked'
				}),
				Ext4.create('RA.Cmp.LegendLabel', {
					text: translatedStrings.getText('LEGEND.OVER')
				}),
				Ext4.create('RA.Cmp.MenuSeparatorSmall'),
				Ext4.create('RA.Cmp.Legend', {
					id: 'ra-legend-hard'
				}),
				Ext4.create('RA.Cmp.LegendLabel', {
					text: 'Hard' // Do not translate until core supports translation for Allocation Type!
				}),
				Ext4.create('RA.Cmp.Legend', {
					id: 'ra-legend-soft'
				}),
				Ext4.create('RA.Cmp.LegendLabel', {
					text: 'Soft' // Do not translate until core supports translation for Allocation Type!
				}),
				Ext4.create('RA.Cmp.MenuSeparatorSmall'),
				Ext4.create('RA.Cmp.Legend', {
					id: 'ra-legend-non-working',
					cls: 'non-working-days'
				}),
				Ext4.create('RA.Cmp.LegendLabel', {
					text: translatedStrings.getText('LEGEND.NON_WORKING')
				})
			]
		})
	]
});