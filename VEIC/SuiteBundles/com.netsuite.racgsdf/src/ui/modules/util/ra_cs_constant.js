/**
 * © 2015 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.App.Constant', {
	singleton: true,
	/*
	 * please sort alphabetically for easier readability
	 */
	ALLOCATE_BY_PERCENTAGE: 1,
	ALLOCATE_BY_HOUR: 2,
	ALLOCATE_TYPE_HARD: 1,
	ALLOCATION: 'Allocation',
	DAY_IN_MILLI: 86400000,
	MAX_LIST_SIZE: 4000,
	LOAD_MODE_PAGE: 'page',
	LOAD_MODE_RELOAD: 'reload',
	LOAD_MODE_SAVE: 'save',
	LOAD_MODE_SEARCH: 'search',
	MODE_CHART: 'chart',
	MODE_GRID: 'grid',
	NONE: 'None',
	PENDING_APPROVAL: 4,
	REJECTED_APPROVAL: 6,
	RESOURCE: 'Resource',
	SEPARATOR_ID: '~',
	SEPARATOR_NAME: ' : ',
	TIME_OFF_RESOURCE_ATTR: 'racg-resource-id',
	TIME_OFF_DATE_ATTR: 'racg-time-off-date',
	TIME_OFF_CONFLICT: 'racg-time-off-conflict',
	VIEW_RESOURCE: 1,
	VIEW_CUSTOMER: 2,
	VIEW_PROJECT: 3
});