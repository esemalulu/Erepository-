/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Scheduler', {
	id: 'ra-chart',
	extend: 'Sch.panel.SchedulerTree',
	hidden: true,
	initComponent: function (args) {
		/*
		 * Bryntum config
		 */
		this.tooltipTpl = RA.App.Templates.allocationHoverTpl();
		this.resourceStore = RA.App.Stores.chartResource;
		this.eventStore = RA.App.Stores.chartEvent;
		this.enableDragCreation = false;
		this.renderTo = Ext4.get('main_form');
		this.snapToIncrement = false;
		this.allowOverlap = false;
		this.weekStartDay = RA.Util.CustomFunctions.getWeekStart();
		this.loadMask = false;
		this.height = 628;
		this.minHeight = 174;
		this.minWidth = 1155;
		this.chartDensity = this.getChartDensity();
		this.rowHeight = this.getDensityHeight(this.chartDensity);
		this.doneFirstLoad = false;
		this.startDate = new Date();
		this.tbar = [];
		this.bbar = Ext4.create('RA.Cmp.LegendToolbar');
		this.typeBgMap = this.bbar.typeBgMap;
		/*
		 * View Preset
		 */
		this.viewPreset = 'RA.ViewPreset.' + ['Daily', 'Weekly', 'Monthly'][RA.App.Settings.get('dateRange') - 1];
		/*
		 * Actual initialization
		 */
		this.callParent(args);
		/*
		 * Post-processing
		 */
		window.onbeforeunload = function () {
			if (RA.App.Stores.chartEvent.areThereChanges()) {
				return translatedStrings.getText('MESSAGE.ERROR.UNSAVED_PENDING_CHANGES');
			}
		};
		/* Temporary storage for an allocation node's current ids at the start of drag and drop action
		 * See eventdragstart listener
		 */
		this.tempAncestorId = null;
		this.tempProjectId = null;
	},
	columns: [
		Ext4.create('Ext4.tree.Column', {
			text: '<div id="ra-expand-collapse-container"></div>',//'Resource Projects',
			sortable: false,
			dataIndex: 'Name',
			id: 'resourceColumn',
			listeners: {
				click: function (view, el, row, col, event, record) {
					switch (RA.App.Filters.filter.data.viewByType) {
						case 1:
							if (record.get('nodeType') == 'project') {
								if (record.raw.status == 'template') return; // do not allow to reassign if project is template.
								RA.App.Forms.reassignAllocForm.show();
							}
							break;
						case 2:
						case 3: //do nothing
							break;
					}
				}
			}
		})
	],
	resourceZones: Ext4.create('Sch.data.EventStore'),
	plugins: [
		'bufferedrenderer',
		Ext4.create('Sch.plugin.Lines', {
			showTip: false,
			store: Ext4.create('Ext4.data.Store', {
				model: 'RA.Cmp.Model.WeekendLine',
				id: 'ra-lines-store',
				data: [
					{
						Date: '1987/06/29',
						Cls: 'important'
					}
				]
			})
		}),
		Ext4.create('Sch.plugin.Printable', {
			autoPrintAndClose: true,
			fakeBackgroundColor: false,

			printRenderer: function (event, resource, templateData, row) {
				// Exact copy of the eventRenderer... except with '!important' in the templateData.style
				var globalSettings = RA.App.Settings;
				var showNumbers = globalSettings.get('showNumbers');
				var allocateBy = event.get('unit');
				var approvalStatus = event.get('approvalStatus');
				var eventClasses = [];
				var type = event.get('type');

				if (approvalStatus) {
					switch (approvalStatus) {
						case 4:
							eventClasses.push('ra-pending-approval');
							break;
						case 6:
							eventClasses.push('ra-rejected');
							break;
					}
				}
				if (event.get('allocId') != 0) {
					eventClasses.push(event.get('type'));
					eventClasses.push('event-tooltip');
				}
				templateData.cls = eventClasses.join(' ');
				templateData.style = Ext4.String.format('width: {0}px !important; background: {1};', templateData.width, RA.App.Chart.typeBgMap[event.get('type')]);
				if (showNumbers == 'T') {
					var x = parseFloat(event.get('Name'));
					if (allocateBy == 1) return x > 0 ? x + '%' : '';
					var textHour = translatedStrings.getText('BAR.UNIT.HOUR');
					var textHours = translatedStrings.getText('BAR.UNIT.HOURS');
					if (allocateBy == 2) return x > 0 ? x + ' ' + (x > 1 ? textHours : textHour) : '';
				}
				return '';
			},
			beforePrint: function (sched) {
				var v = sched.getSchedulingView();
				this.oldRenderer = v.eventRenderer;
				v.eventRenderer = this.printRenderer;
			},
			afterPrint: function (sched) {
				sched.getSchedulingView().eventRenderer = this.oldRenderer;
			}
		})
	],
	eventRenderer: function (event, resource, templateData) {
		var showNumbers = RA.App.Settings.get('showNumbers');
		var allocateBy = RA.App.Settings.get('allocateById');
		var approvalStatus = event.get('approvalStatus');
		var eventClasses = [];
		var type = event.get('type');

		if (event.isRecurring()) {
			templateData.iconCls = 'ra-recurrence-indicator-icon';
		}
		if (approvalStatus) {
			switch (approvalStatus) {
				case 4:
					eventClasses.push('ra-pending-approval');
					break;
				case 6:
					eventClasses.push('ra-rejected');
					break;
			}
		}
		if (event.get('allocId') != 0) {//TODO: add isRollUp to event model and use it instead of this
			eventClasses.push(event.get('type'));
			eventClasses.push('event-tooltip');
		}
		templateData.cls = eventClasses.join(' ');
		templateData.style = Ext4.String.format('width: {0}px; background: {1};', templateData.width, RA.App.Chart.typeBgMap[type]);
		if (showNumbers == 'T') {
			var textHour = translatedStrings.getText('BAR.UNIT.HOUR');
			var textHours = translatedStrings.getText('BAR.UNIT.HOURS');
			var limitDecimalPlace = RA.App.Settings.get('limitDecimalPlaces');
			var id = event.get('Id').toString();
			var name = parseFloat(event.get('Name')).toFixed(limitDecimalPlace);

			if (id.substring(0, 6) == 'rollup') {
				var postfix = RA.App.Filters.filter.data.viewByType == 1 ? '%' : (' ' + (name > 1
																						 ? textHours
																						 : textHour));

				return name > 0 ? name + postfix : '';
			}

			if (allocateBy == 1) {
				var percent = parseFloat(event.get('percent')).toFixed(limitDecimalPlace);
				return percent > 0 ? percent + '%' : '';
			}

			if (allocateBy == 2) {
				var hour = parseFloat(event.get('hour')).toFixed(limitDecimalPlace);
				return hour > 0 ? hour + ' ' + (hour > 1 ? textHours : textHour) : '';
			}
		}
		return '';
	},
	updateChartDensity: function (density) {
		this.chartDensity = density;
		this.rowHeight = this.getDensityHeight(density);
		this.getSchedulingView().setRowHeight(this.rowHeight);
	},
	getChartDensity: function () {
		if (this.chartDensity == undefined) this.chartDensity = RA.App.Settings.get('chartDensity');
		return this.chartDensity;
	},
	getDensityHeight: function (density) {
		var densityHeightMap = {
			1: 29,
			2: 35,
			3: 41
		};
		return densityHeightMap[density];
	},
	viewConfig: {
		getRowClass: function (resource) {
			return 'ra-density-' + RA.App.Chart.getChartDensity() + (resource.get('expandable')
																	 ? '-resource ra-resource-row'
																	 : '');
		},
		loadMask: false
	},
	dndValidatorFn: function (dragRecords, projectRecord, date, duration, e) {
		var resourceId = projectRecord.get('resourceId');
		var endTimestamp = new Date(date.getTime() + duration);
		var lastDate = Ext4.Date.add(endTimestamp, Ext4.Date.DAY, -1);

		if (projectRecord.get('projectId') == 0) {
			return false;
		}

		if (!RA.App.Stores.chartEvent.isStartEndValid(date, lastDate, resourceId, projectRecord.getRootWorkCalendar())) {
			return false;
		}

		if (projectRecord.raw.status == 'template' || dragRecords[0].raw.isDummy) {
			return false;
		}

		if (RA.Util.WorkCalendar.isBetweenResourceTimeOff(resourceId, date, lastDate)) {
			return false;
		}

		return true;
	},
	resizeValidatorFn: function (projectRecord, eventRecord, startTimestamp, endTimestamp, e) {
		var store = RA.App.Stores.chartEvent;
		var resourceId = projectRecord.get('resourceId');
		var lastDate = Ext4.Date.add(endTimestamp, Ext4.Date.DAY, -1);

		if (!store.isStartEndValid(startTimestamp, lastDate, resourceId, projectRecord.getRootWorkCalendar())) {
			return false;
		}

		if (RA.Util.WorkCalendar.isBetweenResourceTimeOff(resourceId, startTimestamp, lastDate)) {
			return false;
		}

		var recurrs = store.queryBy(function (r) {
			return r != eventRecord && r.data.allocId == eventRecord.data.allocId;
		});
		if (recurrs.items.length) {
			var diff = RA.Util.CustomFunctions.getDayCountBetweenTwoDates(eventRecord.data.endTimestamp, endTimestamp, false);

			for (i in recurrs.items) {
				var r = recurrs.items[i];

				if (store.withOverlaps(r.data.ResourceId, r.data.startTimestamp, Ext4.Date.add(r.data.endTimestamp, Ext4.Date.DAY, diff), r.data.allocId)) {
					return false;
				}
			}
		}

		return true;
	},
	tipCfg: {
		showDelay: 2000,
		autoHide: true,
		hideDelay: 0,
		delegate: '.event-tooltip',
		trackMouse: true,
		dismissDelay: 0,
		id: 'ra-tip-alloc-chart'
	},
	listeners: {
		boxready: function (me) {
			/*
			 * remove default masks bound to resource & event stores
			 * TODO: try to do this via config. at the moment, there is no documented config support from Bryntum.
			 */
			me.lockedGrid.getView().loadMask.bindStore(null);
			me.getSchedulingView().loadMask.bindStore(null);

			me.lockedGrid.on('itemcollapse', function (node) {
				RA.App.Stores.settingStore.handleRowCollapse(node.get('Id'));

				if (!RA.App.Settings.collapseAll) RA.App.Stores.settingStore.sync();
			});
			me.lockedGrid.on('itemexpand', function (node) {
				RA.App.Stores.settingStore.handleRowExpand(node.get('Id'));

				if (!RA.App.Settings.expandAll) RA.App.Stores.settingStore.sync();
			});
			/*
			 *
			 */
			var columnHeader = Ext4.get('ra-expand-collapse-container');
			Ext4.create('Ext4.panel.Panel', {
				id: 'ra-chartResourceColumn',
				renderTo: columnHeader,
				height: 36,
				layout: {
					type: 'hbox',
					align: 'middle'
				},
				border: false,
				defaults: {
					margin: '0 0 0 15'
				},
				items: [
					Ext4.create('RA.Cmp.SearchResource', {
						id: 'ra-resource-search',
						emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.SEARCH_RESOURCE'),
						listeners: {
							specialkey: function (field, e) {
								if (e.getKey() == e.ENTER) {
									field.triggerEl.elements[0].dom.click();
								}
							}
						}
					})
				]
			});
			var width = Ext4.getCmp('ra-resource-search').getWidth() + 30;
			Ext4.getCmp('ra-chartResourceColumn').setWidth(width);
			Ext4.getCmp('resourceColumn').setWidth(width);
			Ext4.getCmp('resourceColumn').fireEvent('resize');
		},
		eventdragstart: function (scheduler, records, eOpts) {
			this.tempAncestorId = this.eventStore.getHighestAncestorId(records[0]);
			this.tempProjectId = this.resourceStore.getResourceObjByRow(records[0].get('ResourceId')).get('projectId');
		},
		eventdrop: function (view, records, isCopy, eOpts) {
			perfTestLogger.start('Drag Allocation');
			var record = records[0];
			var newResourceRowId = record.get('ResourceId');
			var newResourceRowObj = this.resourceStore.getResourceObjByRow(newResourceRowId);
			var newCustomerId = newResourceRowObj.get('customerId');
			var newProjectId = newResourceRowObj.get('projectId');
			var newResourceId = newResourceRowObj.get('resourceId');
			var startTimestamp = record.get('startTimestamp');
			var lastDate = record.getLastDate();
			var resourceData = newResourceRowObj.raw;

			record.set('customerId', newCustomerId);
			record.set('projectId', newProjectId);
			record.set('resourceId', newResourceId);
			record.set('taskId', newResourceRowObj.get('taskId'));
			record.set('tipResource', resourceData.resourceName);
			record.set('tipProject', resourceData.projectName);
			record.set('tipStart', Ext4.Date.format(startTimestamp, RA.App.NSProps.getDateFormat()));
			record.set('tipEnd', Ext4.Date.format(lastDate, RA.App.NSProps.getDateFormat()));

			if (record.modified.resourceId && record.data.resourceId !== record.modified.resourceId) {
				record.set('nextApprover', resourceData.supervisorId);
				record.set('tipApprover', resourceData.supervisor);
			}

			if (record.get('unit') === 2) {
				record.computePercentage(newResourceRowObj.getRootWorkCalendar());
			} else {
				record.computeHours(newResourceRowObj.getRootWorkCalendar());
			}

			if (RA.App.Stores.featureStore.getById('approvalWorkFlow').get('isEnabled')) {
				record.set('approvalStatus', RA.App.Constant.PENDING_APPROVAL); // always set to Pending
				record.set('tipAppStatus', RA.App.Stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name'));
			}

			var highestAncestorId = this.eventStore.getHighestAncestorId(record);
			this.eventStore.refreshRollUpsByResource(highestAncestorId);
			if (highestAncestorId != this.tempAncestorId) {
				this.eventStore.refreshRollUpsByResource(this.tempAncestorId);
			}
			RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(newProjectId);
			if (this.tempProjectId !== newProjectId) {
				RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(this.tempProjectId);
			}
			RA.App.Chart.getSchedulingView().refresh();

			Ext4.getCmp('advFilterMain').disableFilter();
			perfTestLogger.stop();
		},
		eventresizeend: function (view, record, eOpts) {
			perfTestLogger.start('Resize Allocation');
			var newResourceRowId = record.get('ResourceId');
			var newResourceRowObj = this.resourceStore.getResourceObjByRow(newResourceRowId);
			var lastDate;
			if (record.isRecurrence()) {
				var elapsedTimeInMillis = (record.get('endTimestamp').getTime() - RA.App.Constant.DAY_IN_MILLI) - record.getLastDate().getTime();
				var mainRecurringAllocId = record.get('Id');
				record = RA.App.Stores.chartEvent.getById(mainRecurringAllocId + '');
				lastDate = Ext4.Date.add(record.getLastDate(), Ext4.Date.MILLI, elapsedTimeInMillis);
				record.set('endTimestamp', Ext4.Date.add(record.get('endTimestamp'), Ext4.Date.MILLI, elapsedTimeInMillis));
			} else {
				var startTimestamp = record.get('startTimestamp');
				lastDate = record.getLastDate();
				record.set('tipStart', Ext4.Date.format(startTimestamp, RA.App.NSProps.getDateFormat()));
			}

			record.set('tipEnd', Ext4.Date.format(lastDate, RA.App.NSProps.getDateFormat()));

			if (record.get('unit') == 2) {
				record.computePercentage(newResourceRowObj.getRootWorkCalendar());
			} else {
				record.computeHours(newResourceRowObj.getRootWorkCalendar());
			}
			if (RA.App.Stores.featureStore.getById('approvalWorkFlow').get('isEnabled')) {
				record.set('approvalStatus', RA.App.Constant.PENDING_APPROVAL); // always set to Pending
				record.set('tipAppStatus', RA.App.Stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name'));
			}
			this.eventStore.refreshRollUpsByResource(record.get('resourceId'));
			RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(record.get('projectId'));
			Ext4.getCmp('advFilterMain').disableFilter();
			perfTestLogger.stop();
		},
		eventclick: function (view, record, event, eOpts) {
			if (record.raw.status == 'template') {
				return false; // do not allow to edit if project is template.
			}
			if (record && record.get('allocId') != 0) {
				this.selectedEvent = record;
				RA.App.Forms.editAllocForm.show();
			}
		},
		beforetooltipshow: function (scheduler, eventRecord) {
			if (Ext4.isNumeric(parseFloat(eventRecord.data.Name))) {
				var hasPercentageSymbol = /%/.test(eventRecord.data.Name);
				var suffix = hasPercentageSymbol ? '%' : '';
				var limitDecimalPlaces = RA.App.Settings.get('limitDecimalPlaces');
				eventRecord.data.Name = parseFloat(eventRecord.data.Name).toFixed(limitDecimalPlaces) + suffix;
			}
			return (RA.App.Settings.get('showHovers') == 'T');
		},
		viewchange: function (scheduler, eOpts) {
			RA.App.RangeField.update();
			this.refreshNonWorking();
		}
	},
	// Refresh resourceZones / re-render non-working days
	refreshNonWorking: function () {
		this.resourceZones.removeAll();
		Ext4.StoreManager.get('ra-lines-store').removeAll();

		if (this.viewPreset == RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY) {
			return;
		}

		var datesInView = this.getDatesInCurrentView();

		this.refreshWeekendLines(datesInView);

		var nonWorkingCells = this['refreshNonWorking' + {
			1: 'Resource',
			2: 'Customer',
			3: 'Project'
		}[RA.App.Filters.filter.data.viewByType] + 'View'](datesInView);

		this.resourceZones.loadData(nonWorkingCells);
	},
	getDatesInCurrentView: function () {
		var dates = [];
		var start = this.getStart();
		var end = this.getEnd();

		for (var date = start; date < end; date = Ext4.Date.add(date, Ext4.Date.DAY, 1)) {
			dates.push(date);
		}

		return dates;
	},
	refreshWeekendLines: function (datesInView) {
		var weekendLines = [];
		var weekStart = RA.Util.CustomFunctions.getWeekStart();

		for (var i = 0; i < datesInView.length; i++) {
			if (datesInView[i].getDay() == weekStart) {
				weekendLines.push(Ext4.create('RA.Cmp.Model.WeekendLine', {
					Date: Ext4.Date.clone(datesInView[i]),
					Cls: 'important'
				}));
			}
		}

		Ext4.StoreManager.get('ra-lines-store').loadData(weekendLines);
	},
	refreshNonWorkingResourceView: function (datesInView) {
		var resourceNodes = this.resourceStore.getRootNode().childNodes;
		var nonWorkingCells = [];
		var tempId = this.resourceZones.getCount();

		for (i in resourceNodes) {
			var resourceNode = resourceNodes[i];
			var resourceId = resourceNode.get('resourceId');
			var workCalendar = resourceNode.get('workCalendar');
			var projectNodes = this.resourceStore.getRowsByResourceId(resourceId);

			if (!workCalendar) {
				console.log('Work Calendar not found for node:');
				console.log(resourceNode);
			}

			for (j = 0; j < datesInView.length; j++) {
				var date = datesInView[j];
				var start = Ext4.Date.clone(date);
				var end = Ext4.Date.add(start, Ext4.Date.DAY, 1);

				// for time-offs
				if (RA.Util.WorkCalendar.isResourceTimeOff(resourceNode.get('resourceId'), date)) {
					var isWeeklyView = (this.viewPreset == RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY);
					if (isWeeklyView) {
						start = Ext4.Date.add(start, Ext4.Date.DAY, -date.getDay());
						end = Ext4.Date.add(start, Ext4.Date.DAY, 7);
						j += 6 - date.getDay();
					}

					//Determine if timeoff conflict
					var foundConflict = false;
					var arrAlloc = RA.App.Stores.chartEvent.getEventsInTimeSpan(start, end, true);
					arrAlloc.each(function (element, index) {
						var childResId = element.get('resourceId');
						var id = element.getId() || ''; //To identify that alloc is not rollup

						if (!foundConflict && id.indexOf('rollup') < 0 && childResId == resourceId) {
							if (isWeeklyView) {
								var childStart = element.get('startTimestamp');
								var childEnd = element.getLastDate();
								if (RA.Util.WorkCalendar.isBetweenResourceTimeOff(resourceId, childStart, childEnd)) {
									foundConflict = true;
								}
							} else {
								foundConflict = true;
							}
						}
					});

					nonWorkingCells.push(Ext4.create('RA.Cmp.Model.ResourceZones', {
						Id: ++tempId,
						StartDate: start,
						EndDate: end,
						ResourceId: resourceId,
						TimeOffConflict: foundConflict,
						Cls: 'ra-time-off ra-chart-time-off'
					}));
				}

				// for non-working days
				if (!RA.Util.WorkCalendar.isWorkDay(date, workCalendar)) {
					for (k in projectNodes) {
						nonWorkingCells.push(Ext4.create('RA.Cmp.Model.ResourceZones', {
							Id: ++tempId,
							StartDate: start,
							EndDate: end,
							TimeOffConflict: false,
							ResourceId: projectNodes[k]
						}));
					}
				}
			}
		}

		return nonWorkingCells;
	},
	refreshNonWorkingCustomerView: function (datesInView) {
		var customerNodes = this.resourceStore.getRootNode().childNodes;
		var nonWorkingCells = [];
		var tempId = this.resourceZones.getCount();

		for (i in customerNodes) {
			var customerNode = customerNodes[i];
			var projectNodes = customerNode.childNodes;

			for (j in projectNodes) {
				var projectNode = projectNodes[j];
				var resourceNodes = projectNode.childNodes;

				for (k in resourceNodes) {
					var resourceNode = resourceNodes[k];
					var workCalendar = resourceNode.get('workCalendar');

					if (!workCalendar) {
						console.log('Work Calendar not found for node:');
						console.log(resourceNode);
					}

					for (l in datesInView) {
						var date = datesInView[l];

						if (!RA.Util.WorkCalendar.isWorkDay(date, workCalendar) || RA.Util.WorkCalendar.isResourceTimeOff(resourceNode.get('resourceId'), date)) {
							var nonWorkStart = Ext4.Date.clone(date);
							var nonWorkEnd = Ext4.Date.add(nonWorkStart, Ext4.Date.DAY, 1);

							nonWorkingCells.push(Ext4.create('Sch.model.Event', {
								Id: ++tempId,
								StartDate: nonWorkStart,
								EndDate: nonWorkEnd,
								ResourceId: resourceNode.get('Id')
							}));
						}
					}
				}
			}
		}

		return nonWorkingCells;
	},
	refreshNonWorkingProjectView: function (datesInView) {
		var projectsNodes = this.resourceStore.getRootNode().childNodes;
		var nonWorkingCells = [];
		var tempId = this.resourceZones.getCount();

		for (i in projectsNodes) {
			var projectNode = projectsNodes[i];
			var resourceNodes = projectNode.childNodes;

			for (j in resourceNodes) {
				var resourceNode = resourceNodes[j];
				var workCalendar = resourceNode.get('workCalendar');

				if (!workCalendar) {
					console.log('Work Calendar not found for node:' + resourceNode);
				}

				for (k in datesInView) {
					var date = datesInView[k];

					if (!RA.Util.WorkCalendar.isWorkDay(date, workCalendar) || RA.Util.WorkCalendar.isResourceTimeOff(resourceNode.get('resourceId'), date)) {
						var nonWorkStart = Ext4.Date.clone(date);
						var nonWorkEnd = Ext4.Date.add(nonWorkStart, Ext4.Date.DAY, 1);

						nonWorkingCells.push(Ext4.create('Sch.model.Event', {
							Id: ++tempId,
							StartDate: nonWorkStart,
							EndDate: nonWorkEnd,
							ResourceId: resourceNode.get('Id')
						}));
					}
				}
			}
		}

		return nonWorkingCells;
	},
	autofit: function (chartOnly) {
		/*
		 * get total visible height then offset scheduler's y-coord. offset standard margin as well.
		 */
		var totalViewHeight = Ext4.getBody().getViewSize().height - Ext4.getBody().getPadding('t'); //padding only for 14.1
		var schedulerTop = Ext4.getCmp('ra-chart').getBox().top;
		var standardMargin = 20;
		var finalHeight = totalViewHeight - schedulerTop - standardMargin;
		if (this.getHeight() != finalHeight) this.setHeight(finalHeight);
		if (!chartOnly) {
			/*
			 * autofit menu and filters
			 */
			Ext4.getCmp('ra-menu').doLayout();
			Ext4.getCmp('advFilterMain').doLayout();
			/*
			 * retrigger preset computations
			 */
		}
	},
	expandViaSetting: function () {
		RA.App.Settings.expandAll = true;

		var expandChild = function recursion(child) {
			if (RA.App.Stores.settingStore.getExpandedAllocations().indexOf(child.getId()) >= 0) {
				child.expand();
				if (child.get('expandable') == true) {
					child.eachChild(recursion);
				}
			}
		};
		this.getRootNode().eachChild(expandChild);
		RA.App.Settings.expandAll = null;
	},
	expandAll: function () {
		RA.App.Settings.expandAll = true;

		var expandChild = function recursion(child) {
			if (child.hasChildNodes()) {
				child.expand();
				if (child.get('expandable') == true) {
					child.eachChild(recursion);
				}
			}
		};
		this.getRootNode().eachChild(expandChild);

		RA.App.Settings.expandAll = null;
		RA.App.Stores.settingStore.sync();
	},
	collapseAll: function () {
		RA.App.Settings.collapseAll = true;

		var expandChild = function recursion(child) {
			if (child.hasChildNodes()) {
				child.collapse();
				if (child.get('expandable') == true) {
					child.eachChild(recursion);
				}
			}
		};
		this.getRootNode().eachChild(expandChild);

		RA.App.Settings.collapseAll = null;
		RA.App.Stores.settingStore.sync();
	},
	mask: function () {
		this.el.mask(translatedStrings.getText('MASK.WORKING'));
	},
	unmask: function () {
		this.el.unmask();
	},
	getExportValue: function (string) {
		if (string) return string;
		else return ' ';
	},
	getViewPreset: function () {
		return this.viewPreset;
	},
	getSearchBoxText: function () {
		var searchCmp = Ext4.getCmp('ra-resource-search');
		return searchCmp ? searchCmp.getValue() : '';
	},
	setSearchBoxText: function (searchText) {
		var searchCmp = Ext4.getCmp('ra-resource-search');
		if (searchCmp) searchCmp.setValue(searchText);
	}
});