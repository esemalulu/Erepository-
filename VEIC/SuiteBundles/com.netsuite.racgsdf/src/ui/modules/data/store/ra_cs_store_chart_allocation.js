/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Store.Allocation', {
	extend: 'Sch.data.EventStore',
	model: 'RA.Cmp.Model.ChartAllocation',
	nextId: 0,
	nextAllocId: -1,
	proxy: {
		type: 'memory',
		reader: {
			type: 'json',
			root: 'data',
			idProperty: 'allocationId'
		}
	},
	modifiedAllocations: function () {
		return RA.App.Stores.chartEvent.getModifiedRecords().filter(function (element, index, array) {
			return element.get('allocId') != 0;
		}).length + RA.App.Stores.chartEvent.getRemovedRecords().filter(function (element, index, array) {
			return element.get('allocId') != 0;
		}).length + RA.App.Stores.projectCommentSaver.getModifiedRecords().length;
	},
	listeners: {
		beforeload: function () {
			RA.Util.Benchmarking.start(RA.Util.Benchmarking.constants.LOADING_ALLOCATIONS);
		},
		load: function (store, records, success) {
			RA.Util.Benchmarking.stop(RA.Util.Benchmarking.constants.LOADING_ALLOCATIONS);

			RA.Util.Benchmarking.log(
				RA.Util.Benchmarking.constants.LOADING_ALLOCATIONS,
				'[PSA] RACG loading allocations',
				{
					RACG_allocationCount: records.length
				},
				true
			);

			if (success) {
				/*
				 * update roll ups
				 */
				store.refreshAllRollUps();
				/*
				 * sync grid data
				 */
				//perfTestLogger.startEvent('Transform Chart to Grid');
				RA.App.Stores.gridStore.transformChartData();
				//perfTestLogger.stopEvent('Transform Chart to Grid');
				RA.App.Grid.updateDateColHeaders();
				/*
				 * unmask & re enable navigation buttons
				 */
				Ext4.getCmp('ra-page-combo-box').setDisabled(false);
				Ext4.getCmp('ra-prevPage').setDisabled(false);
				Ext4.getCmp('ra-nextPage').setDisabled(false);

				// select chart mode if user last used it
				if (RA.App.Settings.get('lastUsedMode') == RA.App.Constant.MODE_CHART && RA.App.ModeManager.mode != RA.App.Constant.MODE_CHART) {
					RA.App.ModeManager.setMode(RA.App.Constant.MODE_CHART);
					Ext4.getCmp('ra-toggleChart').toggle();
				}

				RA.App.ModeManager.getActive().unmask();
				RA.App.Filters.enableFilter();
				perfTestLogger.stop();
				/*
				 * trigger any alert messages
				 */
				if (RA.App.LoadMessage) {
					alert(RA.App.LoadMessage);
					RA.App.LoadMessage = null;
				}

				if (RA.App.Settings.get('showProjectTasks') != 'T') {
					//prevent stores from being loaded
					RA.App.Stores.onDemandOnlyStores.push('projectTaskStore');
					RA.App.Stores.onDemandOnlyStores.push('largeDataRangeProjectTaskStore');
				}

				RA.App.Stores.loadRemaining();
				RA.App.Grid.expandViaSetting();

				Ext4.getCmp('ra-tip-project').setManualHide();
			} else {
				console.error('Failed to load allocation data.');
				alert(translatedStrings.getText('MESSAGE.ERROR.BACKEND_ERROR'));
			}
		},
		remove: function (store, record, index, eOpts) {
			record.set('Id', 0);
		}
	},
	getLegend: function (percentage) {
		if (percentage > 0 && percentage <= 25) return 'legend-25';
		else if (percentage > 25 && percentage <= 50) return 'legend-50';
		else if (percentage > 50 && percentage <= 75) return 'legend-75';
		else if (percentage > 75 && percentage <= 100) return 'legend-100';
		else if (percentage > 10) return 'legend-overbooked';
	},
	isRollUpOverlap: function (aStart, aEnd, bStart, bEnd) {
		return (aStart == bStart || aEnd == bEnd || (aStart < bStart && aEnd > bEnd));
	},
	isOverlap: function (aStart, aEnd, bStart, bEnd) { // true if overlap
		return !((aStart <= bStart && aEnd <= bStart) || (aStart >= bEnd && aEnd >= bEnd));
	},
	refreshAllRollUps: function () {
		var rawData = RA.App.Stores.chartResource.proxy.reader.rawData;
		var arrResources = (rawData && rawData.children) || [];
		var allIds = arrResources.map(function (param) {
			return param.Id;
		});
		var allRollUps = [];
		for (var i = 0; i < allIds.length; i++) {
			allRollUps = allRollUps.concat(this.refreshRollUpsByResource(allIds[i], true));
		}
		this.loadData(allRollUps, true);
	},
	removeEventAndRefreshUi: function (event) {
		this.remove(event);
		this.refreshRollUpsByResource(this.getHighestAncestorId(event));
		if (RA.App.Chart) {
			RA.App.Chart.refreshNonWorking(true);
		}
		RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(event.get('projectId'));
	},
	getHighestAncestorId: function (node) {
		var ancestorId = null;
		if (node.$className && (node.$className == 'RA.Cmp.Model.GridAllocation' || node.$className == 'RA.Cmp.Model.ChartAllocation')) {
			ancestorId = {
				1: node.get('resourceId'),
				2: node.get('customerId'),
				3: node.get('projectId')
			}[RA.App.Filters.filter.data.viewByType];
		} else {
			ancestorId = {
				1: node.resourceId,
				2: node.customerId,
				3: node.projectId
			}[RA.App.Filters.filter.data.viewByType];
		}

		if (!ancestorId) {
			console.log('ERROR: getHighestAncestorId: invalid ancestorId: ' + ancestorId);
		}

		return ancestorId;
	},
	refreshRollUpsByResource: function (resourceId, bulk, projectId) {
		function recurrenceParamsSetting(record, count, isDirty) {
				record.set('recurrenceCount', count);
				record.set('tipRecurrence', 'trigger convert');
				record.dirty = isDirty;
		}

		if (!resourceId) {
			console.log('ERROR: refreshRollUpsByResource: invalid resourceId: ' + resourceId);
			return;
		}

		var endPts = [];
		var rollups = [];
		var recurrs = [];
		var me = this;

		// get all event objects for this resource
		var allResourceEvents = [];
		var viewResourcesBy = RA.App.Filters.filter.data.viewByType || 1;

		var filterFieldName = {
			1: 'resourceId',
			2: 'customerId',
			3: 'projectId'
		}[viewResourcesBy];

		if (projectId) {
			allResourceEvents = me.queryBy(function (record) {
				return record.get('customerId') == resourceId && record.get('projectId') == projectId;
			}).items;
		} else {
			if (viewResourcesBy == 2) {
				var projectNode = RA.App.Stores.chartResource.getNodeById(resourceId);
				var projectNodes = projectNode ? projectNode.childNodes : null;

				for (i in projectNodes) {
					var projId = projectNodes[i].get('projectId');
					rollups = rollups.concat(this.refreshRollUpsByResource(resourceId, true, projId));
				}
			}
			allResourceEvents = me.queryBy(function (record) {
				return record.get(filterFieldName) == resourceId;
			}).items;
		}

		// segregate events; determine which are needed for 1) creating recurrences 2) creating rollups 3) deletion
		var toCreateRecurrences = [];
		var toCreateRollUps = [];
		var toRemoveFromStore = [];
		for (i in allResourceEvents) {
			var event = allResourceEvents[i];
			if (event.get('Id').indexOf('rollup') > -1 || event.isRecurrence()) {
				toRemoveFromStore.push(event);
			} else {
				if (event.isRecurring()) {
					toCreateRecurrences.push(event);
				} else {
					var isDirty = event.dirty;
					recurrenceParamsSetting(event,0, isDirty);
				}
				toCreateRollUps.push(event);
			}
		}

		// remove current recurrences and rollups
		me.remove(toRemoveFromStore);

		// create recurrences
		for (i in toCreateRecurrences) {
			var _recurrs = me.createRecurrences(toCreateRecurrences[i]);
			var count = _recurrs.length;
			var isDirty = toCreateRecurrences[i].dirty;
			recurrenceParamsSetting(toCreateRecurrences[i],count + 1, isDirty);
			for (j in _recurrs) {
				recurrenceParamsSetting(_recurrs[j],count + 1, false);
			}

			recurrs = recurrs.concat(_recurrs);
		}

		// recreate rollups
		toCreateRollUps = toCreateRollUps.concat(recurrs);

		// get all unique end points
		for (i in toCreateRollUps) {
			var alloc = toCreateRollUps[i];
			var start = alloc.get('startTimestamp').getTime();
			var end = alloc.get('endTimestamp').getTime();

			if (endPts.indexOf(start) == -1) endPts.push(start);
			if (endPts.indexOf(end) == -1) endPts.push(end);
		}

		// Sort end points; important for next process
		endPts.sort();

		// Create new roll-ups; for each end point interval, create a roll-up object, find matching events and add up to total percentage & hours
		for (var i = 0; i < endPts.length - 1; i++) {
			var total = 0;
			for (var j = 0; j < toCreateRollUps.length; j++) {
				var event = toCreateRollUps[j];
				var start = event.get('startTimestamp').getTime();
				var end = event.get('endTimestamp').getTime();
				if (me.isRollUpOverlap(start, end, endPts[i], endPts[i + 1])) {
					total += Number(event.get(viewResourcesBy == 1 ? 'percent' : 'hour'));
				}
			}
			if (total) {
				var rollup = Ext4.create('RA.Cmp.Model.ChartAllocation', {
					Id: 'rollup' + ++me.nextId,
					Name: total,
					startTimestamp: Ext4.Date.clearTime(new Date(endPts[i])),
					endTimestamp: Ext4.Date.clearTime(new Date(endPts[i + 1])),
					ResourceId: resourceId,
					allocId: 0,
					unit: 1,
					type: viewResourcesBy == 1 ? me.getLegend(total) : '',
					Draggable: false,
					Resizable: false,
					isDummy: true
				});

				rollup.set(filterFieldName, resourceId);

				if (projectId) {
					rollup.set('projectId', projectId);
					rollup.set('ResourceId', resourceId + RA.App.Constant.SEPARATOR_ID + projectId);
				}
				rollups.push(rollup);
			}
		}

		//Traverse roll-ups and merge adjacent events with equal percentages
		for (var i = 0; i < rollups.length - 1; i++) {
			var a = rollups[i];
			var b = rollups[i + 1];
			var compEndStart = a.get('endTimestamp').getTime() == b.get('startTimestamp').getTime();
			var compValue = a.get('Name') == b.get('Name');
			if (compEndStart && compValue) {
				a.set('endTimestamp', b.get('endTimestamp'));
				rollups.splice(i + 1, 1);
				i--;
			}
		}

		var allDummy = rollups.concat(recurrs);

		if (bulk) {
			var b = new Date().getTime();
			return allDummy;
		} else {
			me.add(allDummy);
		}
	},
	createRecurrences: function (record) {
		function createRecurrence(record, idIterator, startDate, lastDate) {
			var clone = JSON.parse(JSON.stringify(record.data)),
				preferenceDateFormat = RA.App.NSProps.getDateFormat();

			clone.Id = ['recurrence', clone.Id, idIterator].join(RA.App.Constant.SEPARATOR_ID);
			clone.startTimestamp = Ext4.Date.format(startDate, 'Y/m/d');
			clone.endTimestamp = Ext4.Date.format(Ext4.Date.add(lastDate, Ext4.Date.DAY, 1), 'Y/m/d');
			clone.tipStart = Ext4.Date.format(startDate, preferenceDateFormat);
			clone.tipEnd = Ext4.Date.format(lastDate, preferenceDateFormat);
			clone.isDummy = true;

			return Ext4.create('RA.Cmp.Model.ChartAllocation', clone);
		}

		var recurrs = [];
		var frequency = record.get('frequency');
		var period = record.get('period');
		var dayOfWeek = record.get('dayOfWeek');
		var dayOfWeekMask = record.get('dayOfWeekMask');
		var dayOfWeekInMonth = record.get('dayOfWeekInMonth');
		var seriesStart = record.get('seriesStartDate');
		var seriesEnd = record.get('seriesEndDate');
		var allocStart = record.get('startTimestamp');
		var allocDuration = RA.Util.CustomFunctions.getDayCountBetweenTwoDates(allocStart, record.getLastDate(), false);
		var idIterator = 0;

		switch (frequency) {
			case '':
			case 'NONE':
				break;
			case 'DAY':
				var baseAllocStart = seriesStart.getTime() > allocStart.getTime() ? seriesStart : allocStart;
				if (seriesStart.getTime() == allocStart.getTime()) {
					baseAllocStart = Ext4.Date.add(baseAllocStart, Ext4.Date.DAY, period);
				}
				while (baseAllocStart.getTime() <= seriesEnd.getTime()) {
					if (baseAllocStart.getTime() == allocStart.getTime()) {
						baseAllocStart = Ext4.Date.add(baseAllocStart, Ext4.Date.DAY, period);
						continue;
					}
					var lastDate = Ext4.Date.add(baseAllocStart, Ext4.Date.DAY, allocDuration);
					var r = createRecurrence(record, idIterator++, baseAllocStart, lastDate);
					recurrs.push(r);
					baseAllocStart = Ext4.Date.add(baseAllocStart, Ext4.Date.DAY, period);
				}
				break;
			case 'WEEK':
				var baseAllocStart = seriesStart.getTime() > allocStart.getTime() ? seriesStart : allocStart;
				var currWeekSun = Ext4.Date.subtract(baseAllocStart, Ext4.Date.DAY, Number(Ext4.Date.format(baseAllocStart, 'w')));
				var seriesEndSun = Ext4.Date.subtract(seriesEnd, Ext4.Date.DAY, Number(Ext4.Date.format(seriesEnd, 'w')));
				var recurrFlags = dayOfWeekMask.split('');

				do {
					for (day in recurrFlags) {
						var dayOfWeek = Ext4.Date.add(currWeekSun, Ext4.Date.DAY, day);

						if (dayOfWeek.getTime() < baseAllocStart.getTime()) continue;
						if (dayOfWeek.getTime() == allocStart.getTime()) continue;
						if (dayOfWeek.getTime() > seriesEnd.getTime()) break;

						if (recurrFlags[day] == 'T') {
							var lastDate = Ext4.Date.add(dayOfWeek, Ext4.Date.DAY, allocDuration);
							var r = createRecurrence(record, idIterator++, dayOfWeek, lastDate);
							recurrs.push(r);
						}
					}
					currWeekSun = Ext4.Date.add(currWeekSun, Ext4.Date.DAY, 7 * period);

				} while (currWeekSun.getTime() <= seriesEndSun.getTime());
				break;
			case 'MONTH':
				var baseAllocStart = seriesStart.getTime() > allocStart.getTime() ? seriesStart : allocStart,
					currMonth = baseAllocStart == allocStart
								? Ext4.Date.add(baseAllocStart, Ext4.Date.MONTH, period)
								: baseAllocStart,
					startDay = baseAllocStart.getDate();

				if (dayOfWeekInMonth == -1) {
					dayOfWeekInMonth = 5;
				}

				while (currMonth.getTime() <= seriesEnd.getTime()) {
					if (dayOfWeek && dayOfWeekInMonth) {
						var firstDay = (7 - (Ext4.Date.getFirstDayOfMonth(currMonth) - (dayOfWeek - 1))) % 7 + 1;

						startDay = firstDay + (dayOfWeekInMonth - 1) * 7;
						if (startDay > Ext4.Date.getDaysInMonth(currMonth)) { // adjustment for "last" (can be either 4th or 5th)
							startDay -= 7;
						}
					}

					var startDate = new Date([currMonth.getMonth() + 1, startDay, currMonth.getFullYear()].join('/'));
					var endDate = Ext4.Date.add(startDate, Ext4.Date.DAY, allocDuration);
					var recurrAlloc = createRecurrence(record, idIterator++, startDate, endDate);

					recurrs.push(recurrAlloc);

					currMonth = Ext4.Date.add(currMonth, Ext4.Date.MONTH, period);
				}
				break;
			case 'YEAR':
				var baseAllocStart = new Date(seriesStart.getTime() > allocStart.getTime() ? seriesStart : allocStart);
				if (dayOfWeek != '' && dayOfWeekInMonth != '') {
					var month = seriesStart.getMonth(),
						currentMonth = baseAllocStart.getMonth(),
						nthDayMap = [];
					baseAllocStart.setDate(1);
					while (baseAllocStart.getTime() <= seriesEnd.getTime()) {
						if (month == baseAllocStart.getMonth()
							&& dayOfWeek == baseAllocStart.getDay() + 1) {
							var nthDayArray = nthDayMap[baseAllocStart.getFullYear()] || [];
							nthDayArray.push(baseAllocStart);
							nthDayMap[baseAllocStart.getFullYear()] = nthDayArray;
						}
						if (currentMonth != baseAllocStart.getMonth()) {
							baseAllocStart = Ext4.Date.subtract(baseAllocStart, Ext4.Date.DAY, period);
							baseAllocStart.setDate(1);
							baseAllocStart = Ext4.Date.add(baseAllocStart, Ext4.Date.YEAR, period);
							currentMonth = baseAllocStart.getMonth();
						} else {
							baseAllocStart = Ext4.Date.add(baseAllocStart, Ext4.Date.DAY, period);
						}
					}
					var r = {};
					for (var yearKey in nthDayMap) {
						var yearMap = nthDayMap[yearKey];
						var dowim = dayOfWeekInMonth;
						if (dayOfWeekInMonth == -1 || dayOfWeekInMonth == 5) {
							dowim = yearMap.length;
						}
						var recurrenceStartDate = yearMap[dowim - 1];
						if (recurrenceStartDate.getTime() > allocStart.getTime()) {
							var lastDate = Ext4.Date.add(recurrenceStartDate, Ext4.Date.DAY, allocDuration);
							r = createRecurrence(record, idIterator++, recurrenceStartDate, lastDate);
							recurrs.push(r);
						}
					}
				} else {
					while (baseAllocStart.getTime() <= seriesEnd.getTime()) {
						if (baseAllocStart.getTime() == allocStart.getTime()) {
							baseAllocStart = Ext4.Date.add(baseAllocStart, Ext4.Date.DAY, period);
							continue;
						}
						var lastDate = Ext4.Date.add(baseAllocStart, Ext4.Date.DAY, allocDuration);
						var r = {};
						if (baseAllocStart.getMonth() == seriesStart.getMonth()
							&& baseAllocStart.getDate() == seriesStart.getDate()) {
							r = createRecurrence(record, idIterator++, baseAllocStart, lastDate);
							recurrs.push(r);
						}
						baseAllocStart = Ext4.Date.add(baseAllocStart, Ext4.Date.DAY, period);
					}
				}
				break;
			default:
				console.log('ERROR: Invalid frequency: ' + frequency);
				break;
		}
		return recurrs;
	},
	isStartEndValid: function (startTimestamp, lastDate, resourceId, workCalendar) {
		return RA.Util.WorkCalendar.computeWorkDays(workCalendar, startTimestamp, lastDate) > 0;
	},
	moveAllAllocations: function (prevResourceId, newResourceId, projectId, taskObj, resourceObject, arrTimeOff) {
		var taskId = taskObj.taskId || 0;
		var resourceStore = RA.App.Stores.chartResource;
		var oldRow = [prevResourceId, projectId, taskId].join(RA.App.Constant.SEPARATOR_ID);
		var newRow = [newResourceId, projectId, taskId].join(RA.App.Constant.SEPARATOR_ID);
		var indicesFrom = [];
		var indicesTo = [];
		var projectName = RA.App.Stores.chartResource.getResourceObjByRow(oldRow).get('projectName');
		var hasRecurring = false;
		var isRowExisting = resourceStore.isRowExisting(newRow);

		// Collect indices of affected nodes from both previous and new rows
		for (var i = 0; i < this.getCount(); i++) {
			var recordNode = this.getAt(i);
			var rowId = recordNode.get('ResourceId');
			if (rowId == oldRow) {
				indicesFrom.push(i);
				if (recordNode.isRecurring()) {
					hasRecurring = true;
				}
			}
			if (rowId == newRow) indicesTo.push(i);
		}

		// Check that all allocations to be moved have valid start and end dates for the target resource's work calendar
		var arrTimeOffCheck = [];
		for (var i = 0; i < indicesFrom.length; i++) {
			var eventFrom = this.getAt(indicesFrom[i]);
			var fromStart = eventFrom.get('startTimestamp');
			var lastDate = eventFrom.getLastDate();
			if (!RA.App.Stores.chartEvent.isStartEndValid(fromStart, lastDate, resourceObject.get('id'), resourceObject.raw.workCalendarRecord))
				return 'nonworking';

			arrTimeOffCheck.push({
				startDate: fromStart,
				endDate: lastDate
			});
		}

		if (arrTimeOff && arrTimeOff.length) {
			var warningMessage = this.validateTimeOffConflict({
				arrResAllocDate: arrTimeOffCheck,
				arrTimeOff: arrTimeOff
			});

			if (warningMessage.length && (!confirm(warningMessage))) {
				return;
			}
		}

		if (isRowExisting) {
			// Find overlap; if at least 1 overlap is encountered, then do not proceed with moving
			for (var i = 0; i < indicesFrom.length; i++) {
				var eventFrom = this.getAt(indicesFrom[i]);
				var fromStart = eventFrom.get('startTimestamp').getTime();
				var fromEnd = eventFrom.get('endTimestamp').getTime();
				if (this.withOverlaps(newRow, fromStart, fromEnd, null)) {
					return 'overlap';
				}
			}
		}

		if (hasRecurring) {
			if (!confirm(translatedStrings.getText('REASSIGN_SERIES_OF_ALLOCATIONS_PROCEED'))) {
				return;
			}
		}

		if (!isRowExisting) {
			var originatingResource = RA.App.Stores.chartResource.getResourceObjByRow(oldRow);
			var projectObj = {
				raw: {
					name: originatingResource.raw.details.tip.name,
					customer: originatingResource.raw.customer,
					percent: originatingResource.raw.details.tip.percent,
					estimate: originatingResource.raw.details.tip.estimate,
					actual: originatingResource.raw.details.tip.actual,
					remaining: originatingResource.raw.details.tip.remaining,
					startDate: originatingResource.raw.details.tip.start,
					endDate: originatingResource.raw.details.tip.end,
					allocated: originatingResource.raw.details.tip.allocated,
				}
			};
			resourceStore.addNewResourceProjectRow({
				resourceId: newResourceId,
				projectId: projectId,
				projTaskObj: taskObj,
				resourceObj: resourceObject,
				projectObj: projectObj
			});
		}

		// Proceed to moving nodes
		for (var i = 0; i < indicesFrom.length; i++) {
			// Update EventStore
			var event = this.getAt(indicesFrom[i]);
			event.set('ResourceId', newRow);
			event.set('resourceId', newResourceId);
			event.set('projectId', projectId);
			event.set('taskId', taskId);
			event.set('tipResource', resourceObject.raw.name);
			event.set('tipProject', projectName);
			event.set('tipTask', taskObj.taskName ? taskObj.taskName : translatedStrings.getText('DISPLAY.NONE'));
			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				event.set('approvalStatus', RA.App.Constant.PENDING_APPROVAL); // always set to Pending
				event.set('tipAppStatus', RA.App.Stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name'));
			}
			var isUnitHours = event.get('unit') == '2';
			if (isUnitHours) {
				event.computePercentage(resourceObject.raw.workCalendarRecord);
			}
		}
		// Refresh rollups for previous resource
		this.refreshRollUpsByResource(prevResourceId);
		// If new resource is different from previous, then refresh rollups for the new resource, too
		if (prevResourceId != newResourceId) {
			this.refreshRollUpsByResource(newResourceId);
		}
		Ext4.getCmp('advFilterMain').disableFilter();
		return 'success';
	},
	getResourceRowId: function (record) {
		var resourceRowId = 0,
			viewResourcesBy = RA.App.Filters.filter.data.viewByType;

		if (record.$className && (record.$className == 'RA.Cmp.Model.GridAllocation' || record.$className == 'RA.Cmp.Model.ChartAllocation')) {
			resourceRowId = {
				1: [record.get('resourceId'), record.get('projectId'), record.get('taskId')].join(RA.App.Constant.SEPARATOR_ID),
				2: [record.get('customerId'), record.get('projectId'), record.get('resourceId')].join(RA.App.Constant.SEPARATOR_ID),
				3: [record.get('projectId'), record.get('resourceId')].join(RA.App.Constant.SEPARATOR_ID)
			}[viewResourcesBy];
		} else {
			resourceRowId = {
				1: [record.newResourceId, record.newProjectId, record.newProjectTaskId].join(RA.App.Constant.SEPARATOR_ID),
				2: [record.newCustomerId, record.newProjectId, record.newResourceId].join(RA.App.Constant.SEPARATOR_ID),
				3: [record.newProjectId, record.newResourceId].join(RA.App.Constant.SEPARATOR_ID)
			}[viewResourcesBy];
		}

		return resourceRowId;
	},
	createNewAllocation: function (newAllocUiObj, resourceObject, projectObj, updateUi, arrTimeOff) {
		var allocation = null;

		try {
			var resourceStore = RA.App.Stores.chartResource;
			var eventStore = RA.App.Stores.chartEvent;
			var projectName = projectObj ? projectObj.data.name : resourceObject.data.projectName;
			var type = RA.App.Stores.allocTypeStore.getById(newAllocUiObj.newAllocType).get('key');
			var rowId = this.getResourceRowId(newAllocUiObj);

			allocation = Ext4.create('RA.Cmp.Model.ChartAllocation', {
				Id: String(++eventStore.nextId),
				ResourceId: rowId,
				Name: newAllocUiObj.newAllocateNum,
				startTimestamp: Ext4.Date.clearTime(newAllocUiObj.newStartTimestamp),
				endTimestamp: Ext4.Date.clearTime(new Date(newAllocUiObj.newLastDate.getTime() + RA.App.Constant.DAY_IN_MILLI)),
				allocId: newAllocUiObj.allocId || this.nextAllocId--,
				resourceId: newAllocUiObj.newResourceId,
				projectId: newAllocUiObj.newProjectId,
				customerId: newAllocUiObj.newCustomerId,
				taskId: newAllocUiObj.newProjectTaskId,
				taskName: newAllocUiObj.newProjectTaskName,
				hour: newAllocUiObj.newAllocateNum,
				percent: newAllocUiObj.newAllocateNum,
				unit: newAllocUiObj.newAllocBy,
				type: type,
				typeId: newAllocUiObj.newAllocType,
				comment: newAllocUiObj.newComment,

				// tooltip
				tipResource: resourceObject.get("name") || resourceObject.get('resourceName'),
				tipProject: projectName,
				tipTask: newAllocUiObj.newProjectTaskName || translatedStrings.getText('DISPLAY.NONE'),
				tipStart: Ext4.Date.format(newAllocUiObj.newStartTimestamp, RA.App.NSProps.getDateFormat()),
				tipEnd: Ext4.Date.format(newAllocUiObj.newLastDate, RA.App.NSProps.getDateFormat()),

				// for recurring allocations
				frequency: newAllocUiObj.frequency,
				period: newAllocUiObj.period,
				dayOfWeek: newAllocUiObj.dayOfWeek,
				dayOfWeekMask: newAllocUiObj.dayOfWeekMask,
				dayOfWeekInMonth: newAllocUiObj.dayOfWeekInMonth,
				seriesStartDate: newAllocUiObj.seriesStartDate,
				seriesEndDate: newAllocUiObj.seriesEndDate
			});

			var recurrs = RA.App.Stores.chartEvent.createRecurrences(allocation);
			if (arrTimeOff && arrTimeOff.length) {
				var arrResAllocDate = [];
				//Add single allocation start and end date for checking
				arrResAllocDate.push({
					startDate: newAllocUiObj.newStartTimestamp,
					endDate: newAllocUiObj.newLastDate
				});
				//Add recurring allocation start and end date for checking
				for (i in recurrs) {
					arrResAllocDate.push({
						startDate: recurrs[i].get('startTimestamp'),
						endDate: recurrs[i].getLastDate()
					});
				}

				var warningMessage = this.validateTimeOffConflict({
					arrResAllocDate: arrResAllocDate,
					arrTimeOff: arrTimeOff
				});

				if (warningMessage.length && (!confirm(warningMessage))) {
					return;
				}
			}

			if (!resourceStore.isRowExisting(rowId)) {
				//Do not create Resource Allocation for ViewBy Customer without customer Id
				if (updateUi && (RA.App.Filters.filter.data.viewByType != 2 || newAllocUiObj.newCustomerId)) {
					var newProjectTaskObj = {
						taskId: newAllocUiObj.newProjectTaskId,
						taskName: newAllocUiObj.newProjectTaskName
					};
					resourceStore.addNewAllocationRow({
						resourceId: newAllocUiObj.newResourceId,
						projectId: newAllocUiObj.newProjectId,
						projectTitle: projectObj.get('projectTitle'),
						customerId: newAllocUiObj.newCustomerId,
						projTaskObj: newProjectTaskObj,
						resourceObj: resourceObject,
						projectObj: projectObj,
						comment: newAllocUiObj.newComment
					});
				}
			} else {
				if (eventStore.withOverlaps(rowId, newAllocUiObj.newStartTimestamp.getTime(), newAllocUiObj.newEndTimestamp.getTime(), null)) {
					alert(translatedStrings.getText('MESSAGE.ERROR.RA_CHOSEN_DATE_OVERLAP'));
					return false;
				}

				// check recurrences for overlaps
				for (i in recurrs) {
					if (eventStore.withOverlaps(rowId, recurrs[i].get('startTimestamp'), recurrs[i].get('endTimestamp'))) {
						alert(translatedStrings.getText('MESSAGE.ERROR.RA_CHOSEN_DATE_OVERLAP'));
						return false;
					}
				}
			}

			if (RA.App.Stores.featureStore.isRAAWEnabled()) {
				var approverId = parseInt(newAllocUiObj.newApprover);
				var appStatus = newAllocUiObj.newAppStatus;

				allocation.set('approvalStatus', appStatus);
				allocation.set('tipAppStatus', RA.App.Stores.appStatusStore.getById(appStatus).get('name'));

				if (approverId != null && approverId != 0 && RA.App.Stores.approverStore.getById(approverId) != null) {
					allocation.set('nextApprover', approverId);
					allocation.set('tipApprover', RA.App.Stores.approverStore.getById(approverId).get('name'));
				}
			}
			if (newAllocUiObj.newAllocBy == 1) {
				allocation.computeHours(resourceObject.raw.workCalendarRecord || resourceObject.getRootWorkCalendar());
			} else {
				allocation.computePercentage(resourceObject.raw.workCalendarRecord || resourceObject.getRootWorkCalendar());
			}

			// add RA to grid.
			var addedRecord = eventStore.add(allocation);

			// set record to dirty since it is not being set by ExtJS as dirty if store is originally empty
			for (var r in addedRecord) {
				addedRecord[r].dirty = true;
			}

			resourceStore.removeNoResultsNode();

			// refresh roll up
			if (updateUi) {
				eventStore.refreshRollUpsByResource(eventStore.getHighestAncestorId(allocation));
			}
		} catch (err) {
			console.error('ERROR: createNewAllocation: ' + err);
		}

		Ext4.getCmp('advFilterMain').disableFilter();

		return allocation;
	},
	validateTimeOffConflict: function (params) {
		var arrTimeOff = params.arrTimeOff;
		var arrResAllocDate = params.arrResAllocDate;
		var arrMsg = [];

		var timeOffConficts = arrTimeOff.filter(function (record) {
			var timeOffDate = record['timeOffDate'], bConflict = false;
			for (var i = 0; i < arrResAllocDate.length; i++) {
				var startDate = arrResAllocDate[i].startDate;
				var endDate = arrResAllocDate[i].endDate;
				endDate.setHours(23, 59, 59);
				if ((startDate.getTime() <= timeOffDate.getTime() && timeOffDate.getTime() <= endDate.getTime())) {
					bConflict = true;
					break;
				}
			}
			return bConflict;
		});

		if (timeOffConficts.length) { //Time Off conflict found
			//Sum together time off to their respective requestId. Current Time off is separate into individual days.
			var objMessage = {};
			for (var i = 0; i < timeOffConficts.length; i++) {
				var requestId = timeOffConficts[i]['requestId'];
				var toStartDate = timeOffConficts[i]['startDate'];
				var toEndDate = timeOffConficts[i]['endDate'];
				var amountOfTime = timeOffConficts[i]['amountOfTime'];
				var timeUnit = timeOffConficts[i]['timeUnit'];

				if (!objMessage[requestId]) {
					objMessage[requestId] = {
						startDate: nlapiDateToString(toStartDate),
						endDate: nlapiDateToString(toEndDate),
						amountOfTime: amountOfTime,
						timeUnit: timeUnit
					};
				} else {
					objMessage[requestId].amountOfTime += amountOfTime;
				}
			}

			var conflictMsg = translatedStrings.getText('NEW_RESOURCE_ALLOCATION_CONFLICT') + ':';
			var proceedMsg = translatedStrings.getText('DO_YOU_WANT_TO_PROCEED');
			var timeOffMsg = translatedStrings.getText('TIME_OFF_REQUEST');
			var conflictingMsg = translatedStrings.getText('CONFLICTING');
			arrMsg.push(conflictMsg);
			for (var key in objMessage) {
				arrMsg.push('\u2022' + timeOffMsg + ': ' + objMessage[key]['startDate'] + ' - ' + objMessage[key]['endDate']);
				arrMsg.push(' ' + conflictingMsg + ' ' + objMessage[key]['timeUnit'] + ': ' + objMessage[key]['amountOfTime']);
			}
			arrMsg.push(proceedMsg);
		}

		return arrMsg.join('\n');
	},
	getAllocations: function (resourceId, projectId, taskId, customerId) {
		taskId = taskId || 0;
		var result = [], resourceIdString;

		switch (RA.App.Filters.filter.data.viewByType) {
			case 1:
				resourceIdString = [resourceId, projectId, taskId].join(RA.App.Constant.SEPARATOR_ID);
				break;
			case 2:
				resourceIdString = [customerId, projectId, resourceId].join(RA.App.Constant.SEPARATOR_ID);
				break;
			case 3:
				resourceIdString = [projectId, resourceId].join(RA.App.Constant.SEPARATOR_ID);
				break;
		}

		for (var i = 0; i < this.getCount(); i++) {
			var alloc = this.getAt(i);
			if (alloc.get('ResourceId') == resourceIdString) {
				result.push(alloc);
			}
		}
		return result;
	},
	withOverlaps: function (newRowId, fromStart, fromEnd, allocId) {
		// Project/Resource exists
		// check for overlap
		var indicesTo = new Array();
		// Collect indices of affected nodes from both previous and new rows
		for (var i = 0; i < this.getCount(); i++) {
			var event = this.getAt(i);
			var rowId = event.get('ResourceId');
			if (allocId != null && event.get('allocId') == allocId) {
				continue;
			}
			if (rowId == newRowId) indicesTo.push(i);
		}
		for (var j = 0; j < indicesTo.length; j++) {
			var eventTo = this.getAt(indicesTo[j]);
			var toStart = eventTo.get('startTimestamp').getTime();
			var toEnd = eventTo.get('endTimestamp').getTime();
			if (this.isOverlap(fromStart, fromEnd, toStart, toEnd)) {
				return true;
			}
		}
		return false;
	},
	areThereChanges: function () {
		if (RA.App.Stores.chartEvent.getModifiedRecords().filter(function (element, index, array) { // new and updated
			return element.get('allocId') != 0;
		}).length == 0 && RA.App.Stores.chartEvent.getRemovedRecords().filter(function (element, index, array) {
			return element.get('allocId') != 0;
		}).length == 0) {
			return false;
		}
		return true;
	}
});
