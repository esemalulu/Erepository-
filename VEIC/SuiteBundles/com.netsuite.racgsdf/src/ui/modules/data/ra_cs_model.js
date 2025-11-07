/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */
Ext4.define('RA.Cmp.Model.WorkCalendar', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'id',
			type: 'integer'
		}, {
			name: 'name',
			type: 'string'
		}, {
			name: 'startHour',
			type: 'string'
		}, {
			name: 'hrsPerDay',
			type: 'number'
		}, {
			name: 'workSunday',
			type: 'boolean'
		}, {
			name: 'workMonday',
			type: 'boolean'
		}, {
			name: 'workTuesday',
			type: 'boolean'
		}, {
			name: 'workWednesday',
			type: 'boolean'
		}, {
			name: 'workThursday',
			type: 'boolean'
		}, {
			name: 'workFriday',
			type: 'boolean'
		}, {
			name: 'workSaturday',
			type: 'boolean'
		}, {
			name: 'nonWork',
			type: 'auto'
		}
	]
});

Ext4.define('RA.Cmp.Model.AllocType', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'id',
			type: 'int'
		},
		{
			name: 'name',
			type: 'string'
		},
		{
			name: 'key',
			type: 'string'
		}
	]
});

// Define new column field type
Ext4.data.Types.WORKCALENDAR = {
	type: 'RA.Cmp.Model.WorkCalendar'
};

Ext4.define('RA.Cmp.Model.ChartResource', {
	extend: 'Sch.model.Resource',
	fields: [
		//{name: 'Id',            type: 'int'},  // Already defined in Sch.model.Resource
		//{name: 'Name',        type: 'string'}, // Already defined in Sch.model.Resource
		{
			name: 'resourceId',
			type: 'int'
		}, {
			name: 'nodeType',
			type: 'string'
		}, {
			name: 'resourceName',
			type: 'string'
		}, {
			name: 'projectId',
			type: 'int'
		}, {
			name: 'projectName',
			type: 'string'
		}, {
			// projectName contains full project name (Customer : [Subsidiaries :] Project), which can exceed 200 symbols
			// (limit imposed by core). The name projectName is used frequently in RACG with that semantic, so refactor
			// would be too complex. Hence, projectTitle was introduced to fix issue 599785.
			name: 'projectTitle',
			type: 'string'
		}, {
			name: 'taskId',
			type: 'int'
		}, {
			name: 'taskName',
			type: 'string'
		}, {
			name: 'comment',
			type: 'string'
		}, {
			name: 'customerId',
			type: 'int'
		}, {
			name: 'customer',
			type: 'string'
		}, {
			name: 'supervisor',
			type: 'string'
		}, {
			name: 'details',
			type: 'auto'
		}, {
			name: 'expanded',
			type: 'boolean',
			defaultValue: false
		}, {
			name: 'isDirtyForProjectHover',
			type: 'boolean',
			defaultValue: false
		}, {
			name: 'workCalendarId',
			type: 'int',
			mapping: 'workCal'
		}, {
			name: 'workCalendar',
			type: Ext4.data.Types.WORKCALENDAR
		}
	],
	getRootWorkCalendar: function () {
		var tempNode = this;
		while (!tempNode.data.workCalendar && tempNode.parentNode)
			tempNode = tempNode.parentNode;
		return tempNode.data.workCalendar;
	}
});

Ext4.define('RA.Cmp.Model.ChartAllocation', {
	extend: 'Sch.model.Event',
	clientIdProperty: 'clientId',
	startDateField: 'startTimestamp',
	endDateField: 'endTimestamp',
	fields: [
		//{name: 'Id',            type: 'int'},                           // Already defined in Sch.model.Event
		//{name: 'Name',        type: 'string'},                          // Already defined in Sch.model.Event
		//{name: 'StartDate',    type: 'date',    dateFormat:'Y-m-d'},    // Already defined in Sch.model.Event
		//{name: 'EndDate',     type: 'date',     dateFormat:'Y-m-d'},    // Already defined in Sch.model.Event; endDate + 1, ui only
		//{name: 'ResourceId',    type: 'int'},                           // Already defined in Sch.model.Event
		{
			name: 'startTimestamp',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'endTimestamp',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'allocId',
			type: 'int'
		}, {
			name: 'clientId',
			type: 'int'
		}, {
			name: 'resourceId',
			type: 'int'
		}, {
			name: 'resourceName',
			type: 'string'
		}, {
			name: 'projectId',
			type: 'int'
		}, {
			name: 'taskId',
			type: 'int'
		}, {
			name: 'hour',
			type: 'number'
		}, {
			name: 'percent',
			type: 'number'
		}, {
			name: 'unit',
			type: 'int'
		}, {
			name: 'type',
			type: 'string'
		}, {
			name: 'typeId',
			type: 'int'
		}, {
			name: 'comment',
			type: 'string'
		}, {
			name: 'approvalStatus',
			type: 'int'
		}, {
			name: 'nextApprover',
			type: 'int'
		}, {
			name: 'nextApproverName',
			type: 'string'
		}, {
			name: 'tipResource',
			type: 'string'
		}, {
			name: 'tipProject',
			type: 'string'
		}, {
			name: 'tipTask',
			type: 'string'
		}, {
			name: 'tipStart',
			type: 'string'
		}, {
			name: 'tipEnd',
			type: 'string'
		}, {
			name: 'tipAppStatus',
			type: 'string'
		}, {
			name: 'tipApprover',
			type: 'string'
		}, {
			name: 'customerId',
			type: 'int'
		}, {
			name: 'customer',
			type: 'string'
		}, {
			name: 'projectName',
			type: 'string'
		}, {
			name: 'taskName',
			type: 'string'
		}, {
			name: 'requestedBy',
			type: 'string'
		}, {
			name: 'unitName',
			type: 'string'
		}, {
			name: 'frequency',
			type: 'string'
		}, {
			name: 'seriesStartDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'seriesEndDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'period',
			type: 'int'
		}, {
			name: 'dayOfWeek',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'dayOfWeekMask',
			type: 'string',
			defaultValue: ''
		}, {
			name: 'dayOfWeekInMonth',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'recurrenceCount',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'tipRecurrence',
			type: 'string',
			convert: function (v, rec) {
				if (rec.isRecurring()) {
					var frequency = rec.get('frequency');
					var count = rec.get('recurrenceCount');
					var frequencyString;
					if (frequency === 'WEEK' && rec.get('dayOfWeekMask') === 'FTTTTTF') {
						frequencyString = translatedStrings.getText('TEXT.REPEAT_EVERY_WEEKDAY');
					} else {
						frequencyString = translatedStrings.getText('TOOLTIP.VALUE.FREQUENCY.' + frequency);
					}
					return [
						frequencyString,
						'(' + count,
						(count > 1
						 ? translatedStrings.getText('OCCURRENCES')
						 : translatedStrings.getText('OCCURRENCE')) + ')'
					].join(' ');
				} else {
					return translatedStrings.getText('TOOLTIP.VALUE.NONE');
				}
			}
		}, {
			name: 'isDummy',
			type: 'boolean',
			defaultValue: false
		}, {
			// overrides definition in Sch.model.Event
			name: 'Resizable',
			type: 'string',
			convert: function (v, rec) {
				if (rec.isRecurring()) {
					return 'end';
				}
				return true;
			}
		}
	],
	computeTotalWorkDays: function (workCal) {
		var startDate = this.get('startTimestamp');
		var endDate = this.getLastDate();
		return RA.Util.WorkCalendar.computeWorkDays(workCal, startDate, endDate);
	},
	computePercentage: function (workCalendar) {
		var workCal = workCalendar,
			hrsPerDay = workCal.hrsPerDay,
			totalWorkDays = this.computeTotalWorkDays(workCal);
		if (totalWorkDays) {
			var workPerDay = this.get('hour') / totalWorkDays;
			this.set('percent', Math.round(workPerDay / hrsPerDay * 100 * 10000) / 10000);
		} else {
			this.set('percent', 0);
		}
	},
	computeHours: function (workCalendar) {
		var workCal = workCalendar,
			hrsPerDay = workCal.hrsPerDay,
			totalWorkDays = this.computeTotalWorkDays(workCal);
		if (totalWorkDays) {
			var totalHours = (this.get('percent') / 100) * hrsPerDay * totalWorkDays;
			this.set('hour', totalHours);
		} else {
			this.set('hour', 0);
		}
	},
	isRecurring: function () {
		return !Ext4.isEmpty(this.get('frequency')) && this.get('frequency') != 'NONE';
	},
	isRecurrence: function () {
		return this.isRecurring() && this.get('Id').indexOf('recurrence') !== -1;
	},
	getLastDate: function () {
		return Ext4.Date.add(this.get('endTimestamp'), Ext4.Date.DAY, -1);
	}
});

Ext4.define('RA.Cmp.Model.ResourceZones', {
	extend: 'Sch.model.Event',
	clientIdProperty: 'clientId',
	fields: [
		{
			name: 'TimeOffConflict',
			type: 'boolean'
		}
	]
});

Ext4.define('RA.Cmp.Model.Settings', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'internalId',
			type: 'int'
		}, {
			name: 'entityId',
			type: 'int'
		}, {
			name: 'entityType',
			type: 'int'
		},
		// user settings within settings form
		{
			name: 'allocateById',
			type: 'int'
		}, {
			name: 'allocateBy',
			type: 'string'
		}, {
			name: 'showNumbers',
			type: 'string'
		}, {
			name: 'includeAllResources',
			type: 'string'
		}, {
			name: 'availabilityColor1',
			type: 'string'
		}, {
			name: 'availabilityColor2',
			type: 'string'
		}, {
			name: 'availabilityColor3',
			type: 'string'
		}, {
			name: 'availabilityColor4',
			type: 'string'
		}, {
			name: 'availabilityColor5',
			type: 'string'
		}, {
			name: 'showHovers',
			type: 'string'
		}, {
			name: 'showProjectTasks',
			type: 'string'
		}, {
			name: 'incProjectTemplate',
			type: 'string'
		}, {
			name: 'includeShared',
			type: 'string'
		}, {
			name: 'includeRejected',
			type: 'string'
		}, {
			name: 'chartDensity',
			type: 'int'
		},
		// user settings outside of settings form
		{
			name: 'filterNameCounter',
			type: 'int'
		}, {
			name: 'selectedFilter',
            type: 'int'
		}, {
			name: 'expandFilterSummary',
			type: 'string'
		}, {
			name: 'hiddenColumns',
			type: 'string'
		}, {
			name: 'lastUsedMode',
			type: 'string',
			defaultValue: RA.App.Constant.MODE_GRID
		}, {
			name: 'limitDecimalPlaces',
			type: 'int',
			defaultValue: 4
		}, {
			name: 'dateRange',
			type: 'int',
			defaultValue: 2
		}, {
			name: 'expandedAllocations',
			type: 'auto'
		}
	]
});

Ext4.define('RA.Cmp.Model.DropDown', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'id',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'name',
			type: 'string'
		}, {
			name: 'startDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'endDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}
	]
});

Ext4.define('RA.Cmp.Model.StringDropDown', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'id',
			type: 'string',
			defaultValue: ''
		}, {
			name: 'name',
			type: 'string'
		}
	]
});

Ext4.define('RA.Cmp.Model.PageDropDown', {
	extend: 'RA.Cmp.Model.DropDown',
	fields: [
		{
			name: 'start',
			type: 'int',
		}
	]
});

Ext4.define('RA.Cmp.Model.Project', {
	extend: 'RA.Cmp.Model.DropDown',
	fields: [
		{
			name: 'id',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'name',
			type: 'string'
		}, {
			name: 'startDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'endDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'projectTitle',
			type: 'string'
		}
	]
});

Ext4.define('RA.Cmp.Model.ProjectTask', {
	extend: 'RA.Cmp.Model.DropDown',
	fields: [
		{
			name: 'startDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		},
		{
			name: 'endDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}
	]
});

Ext4.define('RA.Cmp.Model.NewFilter', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'id',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'name',
			type: 'string'
		}, {
			name: 'filterName',
			type: 'string'
		}, {
			name: 'owner',
			type: 'int'
		}, {
			name: 'ownerName',
			type: 'string'
		}, {
			name: 'inactive',
			type: 'boolean'
		}, {
			name: 'shared',
			type: 'boolean'
		}, {
			name: 'record1',
			type: 'string'
		}, {
			name: 'field1',
			type: 'string'
		}, {
			name: 'record2',
			type: 'string'
		}, {
			name: 'field2',
			type: 'string'
		}, {
			name: 'record3',
			type: 'string'
		}, {
			name: 'field3',
			type: 'string'
		}, {
			name: 'record4',
			type: 'string'
		}, {
			name: 'field4',
			type: 'string'
		}, {
			name: 'record5',
			type: 'string'
		}, {
			name: 'field5',
			type: 'string'
		}, {
			name: 'record6',
			type: 'string'
		}, {
			name: 'field6',
			type: 'string'
		}, {
			name: 'record7',
			type: 'string'
		}, {
			name: 'field7',
			type: 'string'
		}, {
			name: 'record8',
			type: 'string'
		}, {
			name: 'field8',
			type: 'string'
		}, {
			name: 'isDelete',
			type: 'boolean'
		}, {
			name: 'isDefault',
			type: 'boolean'
		}, {
			name: 'viewByType',
			type: 'int'
		}
	]
});

Ext4.define('RA.Cmp.Model.SavedFilter', {
	extend: 'RA.Cmp.Model.DropDown',
	fields: [
		{
			name: 'owner',
			type: 'int'
		}, {
			name: 'filterName',
			type: 'string'
		}, {
			name: 'inactive',
			type: 'boolean'
		}, {
			name: 'shared',
			type: 'boolean'
		}, {
			name: 'includeAll',
			type: 'boolean'
		}, {
			name: 'resourceType',
			type: 'int',
			defaultValue: 1
		}, {
			name: 'startDate',
			type: 'date',
			dateFormat: 'Y/m/d',
			defaultValue: null
		}, // m/d/Y = 02/04/2000 month/date with leading zero, n/j/Y = 1/9/2020 - month/day no leading zero
		{
			name: 'resources',
			type: 'string'
		}, {
			name: 'resourceNames',
			type: 'string'
		}, {
			name: 'vendorType',
			type: 'string'
		}, {
			name: 'vendorTypeNames',
			type: 'string'
		}, {
			name: 'vendorCategories',
			type: 'string'
		}, {
			name: 'vendCategoryNames',
			type: 'string'
		}, {
			name: 'subsidiaries',
			type: 'string'
		}, {
			name: 'subsidiaryNames',
			type: 'string'
		}, {
			name: 'depts',
			type: 'string'
		}, {
			name: 'deptNames',
			type: 'string'
		}, {
			name: 'classes',
			type: 'string'
		}, {
			name: 'classNames',
			type: 'string'
		}, {
			name: 'locs',
			type: 'string'
		}, {
			name: 'locNames',
			type: 'string'
		}, {
			name: 'billingClass',
			type: 'string'
		}, {
			name: 'billClassNames',
			type: 'string'
		}, {
			name: 'clientId',
			type: 'int'
		}, {
			name: 'isDelete',
			type: 'boolean'
		}, {
			name: 'subsidiariesChild',
			type: 'boolean',
			defaultValue: false
		}, {
			name: 'deptsChild',
			type: 'boolean',
			defaultValue: false
		}, {
			name: 'classesChild',
			type: 'boolean',
			defaultValue: false
		}, {
			name: 'locsChild',
			type: 'boolean',
			defaultValue: false
		}

	],

	clientIdProperty: 'clientId'
});

Ext4.define('RA.Cmp.Model.FilterRecord', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'id',
			type: 'string',
			defaultValue: ''
		}, {
			name: 'name',
			type: 'string'
		}
	]
});

Ext4.define('RA.Cmp.Model.Skills', {
	extend: 'RA.Cmp.Model.DropDown'
});

Ext4.define('RA.Cmp.Model.Features', {
	extend: 'Ext4.data.Model',
	idProperty: 'name',
	fields: [
		{
			name: 'name',
			type: 'string'
		}, {
			name: 'isEnabled',
			type: 'boolean',
			defaultValue: false
		}
	]
});

Ext4.define('RA.Cmp.Model.RASublist', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'startDate',
			type: 'string'
		}, {
			name: 'endDate',
			type: 'string'
		}, {
			name: 'allocate',
			type: 'int'
		}, {
			name: 'unit',
			type: 'string'
		}, {
			name: 'type',
			type: 'string'
		}, {
			name: 'approvalStatus',
			type: 'string'
		}, {
			name: 'nextApprover',
			type: 'string'
		}, {
			name: 'comment',
			type: 'string'
		}, {
			name: 'isRecurring',
			type: 'boolean'
		}
	]
});

Ext4.define('RA.Cmp.Model.WeekendLine', {

	extend: 'Ext4.data.Model',

	fields: [
		{
			name: 'Date',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'Text',
			type: 'string'
		}, {
			name: 'Cls',
			type: 'string'
		}
	]

});

Ext4.define('RA.Cmp.Model.ProjectComment', {
	extend: 'Ext4.data.Model',
	idProperty: 'projectId',
	fields: [
		{
			name: 'projectId',
			type: 'number'
		}, {
			name: 'comment',
			type: 'string'
		}
	]
});

// Internal Model of the RA Grid date columns
Ext4.define('RA.Cmp.Model.GridAllocationPeriod', {
	config: {
		resourceId: 0,
		totalHours: 0,
		hasMultipleAlloc: false,
		hasRecurringAlloc: false,
		isPercent: false,
		isRollup: false,
		appStatus: RA.App.Constant.PENDING_APPROVAL,
		approverId: 0,
		allocType: 1,
		allocId: 0,
		approvedTimeOff: false,
		timeOffconflict: false,
		comments: []
	},
	constructor: function (config) {
		this.initConfig(config);
	}
});

// Define new column field type
Ext4.data.Types.GRIDALLOCPERIOD = {
	type: 'RA.Cmp.Model.GridAllocationPeriod'
};

Ext4.define('RA.Cmp.Model.GridAllocation', {
	extend: 'Ext4.data.Model',
	idProperty: 'cellid',  // temporary
	fields: [
		{
			name: 'cellid',
			type: 'string'
		}, {
			name: 'name',
			type: 'string'
		}, {
			name: 'leaf',
			type: 'boolean'
		}, {
			name: 'username',
			type: 'string'
		}, {
			name: 'task',
			type: 'string'
		}, {
			name: 'customer',
			type: 'string'
		}, {
			name: 'restype',
			type: 'string'
		}, {
			name: 'supervisor',
			type: 'string'
		}, {
			name: 'comments',
			mapping: 'comments',
			type: 'string'
		}, {
			name: 'status',
			mapping: 'status',
			type: 'string'
		}, {
			name: 'w1',
			mapping: 'w1',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w2',
			mapping: 'w2',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w3',
			mapping: 'w3',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w4',
			mapping: 'w4',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w5',
			mapping: 'w5',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w6',
			mapping: 'w6',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w7',
			mapping: 'w7',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w8',
			mapping: 'w8',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w9',
			mapping: 'w9',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w10',
			mapping: 'w10',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w11',
			mapping: 'w11',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w12',
			mapping: 'w12',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w13',
			mapping: 'w13',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'w14',
			mapping: 'w14',
			type: Ext4.data.Types.GRIDALLOCPERIOD
		}, {
			name: 'resourceId',
			type: 'string'
		}, {
			name: 'workCalendarId',
			type: 'int'
		}, {
			name: 'projectId',
			type: 'string'
		}, {
			name: 'customerId',
			type: 'string'
		}, {
			name: 'taskId',
			type: 'string'
		}, {
			name: 'midLevel',
			type: 'boolean'
		}, {
			name: 'hover',
			type: 'string'
		}, {
			name: 'workCalendar',
			type: Ext4.data.Types.WORKCALENDAR
		}, {
			name: 'hasTasks',
			type: 'boolean'
		}
	],
});

Ext4.define('RA.Cmp.Model.LargeDataDropdownRange', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'id',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'startIndex',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'endIndex',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'name',
			type: 'string'
		}
	]
});

Ext4.define('RA.Cmp.Model.CustomResourceSegment', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'segment',
			type: 'string'
		}, {
			name: 'segmentDisplay',
			type: 'string'
		},
		{
			name: 'segmentValue',
			type: 'string'
		}, {
			name: 'segmentValueDisplay',
			type: 'string'
		}
	]
});

Ext4.define('RA.Cmp.Model.CustomResourceSegmentValue', {
	extend: 'Ext4.data.Model',
	fields: [
		{
			name: 'id',
			type: 'string'
		}, {
			name: 'name',
			type: 'string'
		}
	]
});

Ext4.define('RA.Cmp.Model.TestModel', {
	extend: 'Ext4.data.Model',
	idProperty: 'name',
	fields: [
		{
			name: 'name',
			type: 'string'
		}, {
			name: 'value',
			type: 'number',
			defaultValue: false
		}
	]
});

Ext4.define('RA.Cmp.Model.FilterValues', {
	extend: 'Ext4.data.Model',
	idProperty: 'filterId',
	fields: [
		{
			name: 'internalId',
			type: 'integer'
		}, {
			name: 'filterId',
			type: 'integer'
		}, {
			name: 'filterValuesJson',
			type: 'auto'
		}, {
			name: 'isDelete',
			type: 'boolean'
		}, {
			name: 'owner',
			type: 'integer'
		}
	]
});

Ext4.define('RA.Cmp.Model.DataCount', {
	extend: 'Ext4.data.Model',
	idProperty: 'recordType',
	fields: [
		{
			name: 'recordType',
			type: 'string'
		}, {
			name: 'count',
			type: 'integer'
		}, {
			name: 'countBy',
			type: 'auto'
		}
	]
});

Ext4.define('RA.Cmp.Model.Customer', {
	extend: 'Ext4.data.Model',
	idProperty: 'internalId',
	fields: [
		{
			name: 'internalId',
			type: 'integer'
		}, {
			name: 'customerId',
			type: 'string'
		}, {
			name: 'companyName',
			type: 'string'
		}, {
			name: 'category',
			type: 'string'
		}, {
			name: 'primarySubsidiary',
			type: 'string'
		}, {
			name: 'primaryContact',
			type: 'string'
		}, {
			name: 'city',
			type: 'string'
		}, {
			name: 'state',
			type: 'string'
		}, {
			name: 'country',
			type: 'string'
		}, {
			name: 'url',
			type: 'string',
		}
	]
});

Ext4.define('RA.Cmp.Model.ApprovedTimeOff', {
	extend: 'Ext4.data.Model',
	idProperty: 'internalId',
	fields: [
		{
			name: 'requestId',
			type: 'integer'
		}, {
			name: 'internalId',
			type: 'integer'
		}, {
			name: 'employeeId',
			type: 'integer'
		}, {
			name: 'timeOffType',
			type: 'string'
		}, {
			name: 'amountOfTime',
			type: 'integer'
		}, {
			name: 'timeUnit',
			type: 'string',
			convert: function (v) {
				return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
			}
		}, {
			name: 'timeOffDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'startDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}, {
			name: 'endDate',
			type: 'date',
			dateFormat: 'Y/m/d'
		}
	]
});