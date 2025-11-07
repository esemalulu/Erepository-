/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Column', {
	extend: 'Ext4.grid.column.Column',
	locked: true,    // locked columns are rendered on the left-most side of the grid
	editable: false, // no inline editing; edit items via pop-up form
	fixed: true      // do not allow resizing of columns ??
});

Ext4.define('RA.Cmp.GridActionColumn', {
	extend: 'Ext4.grid.column.Column',
	sortable: false,
	menuDisabled: true,
	locked: true,
	renderer: function (value, metaData, record, row, col, store, view) {
		metaData.tdCls = 'ra-grid-lpane-' + (row + 1) + '-' + (col + 1);
		return value;
	}
});

Ext4.define('RA.Cmp.GridCommentColumn', {
	extend: 'Ext4.grid.column.Column',
	sortable: false,
	menuDisabled: true,
	editor: 'textfield',
	locked: true,
	renderer: function (value, metaData, record, row, col, store, view) {
		metaData.tdCls = 'ra-grid-lpane-' + (row + 1) + '-' + (col + 1);
		return value;
	}
});

Ext4.define('RA.Cmp.GridDateColumn', {
	extend: 'Ext4.grid.column.Column',
	sortable: false,
	menuDisabled: true,
	editor: 'textfield',
	resizable: false,
	cls: 'ra-date-column',
	text: translatedStrings.getText('MASK.WORKING'),
	align: 'center',
	renderer: function (value, metaData, record, row, col, store, view) {
		/*
		 * assign automation hook as class
		 */
		metaData.tdCls = 'ra-grid-rpane-' + (row + 1) + '-' + (col + 1);
		/*
		 * build value to be rendered / returned
		 */
		var ret = '', totalHours = Number(value.totalHours);
		if (totalHours > 0) {
			ret = totalHours.toFixed(RA.App.Settings.get('limitDecimalPlaces'));
			if (value.isRollup) {
				if (totalHours > 100) {
					// highlight overbooked allocation
					metaData.tdCls += ' ra-grid-rollup-overbooked';
				}
				if (value.isPercent) {
					ret += '%'; // display rollups in percent
				}
			} else {
				if (value.hasMultipleAlloc) {
					// convert display to a link type if uneven allocation within the period
					metaData.tdCls += ' ra-grid-cell-multiple-alloc';
				} else {
					if (value.hasRecurringAlloc) {
						metaData.tdCls += ' ra-recurrence-indicator-icon';
					}
					metaData.tdCls += ' ra-grid-cell-single-alloc';
					// build cellcoords object for locating the correct chartEvent allocation when updating hover details
					metaData.tdAttr = 'cellcoords=' + JSON.stringify({
						resourceId: record.get('resourceId'),
						projectId: record.get('projectId'),
						taskId: record.get('taskId'),
						startDate: Sch.util.Date.add(RA.App.Grid.getStartDate(), RA.App.Grid.getUnit(), (col)),
						endDate: new Date(Sch.util.Date.add(RA.App.Grid.getStartDate(), RA.App.Grid.getUnit(), (col + 1)).getTime() - RA.App.Constant.DAY_IN_MILLI),
						customerId: record.get('customerId')
					});
				}
			}
		}

		// gray out non working days
		var viewPreset = RA.App.ModeManager.getActive().getViewPreset();
		if (viewPreset != RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY) {
			if (RA.App.Filters.filter.data.viewByType == 1 || record.get('leaf')) {
				var resourceId = record.get('resourceId'),
					workCalendar = record.get('workCalendar'),
					key = 'w' + (col + 1),
					date = RA.App.Stores.gridStore.dateColHeaders[key].start,
					isWorkDay = RA.Util.WorkCalendar.isWorkDay(date, workCalendar);

				if (viewPreset == RA.Cmp.Store.GridAllocation.ViewPresets.DAILY && !isWorkDay) {
					metaData.tdCls += ' non-working-days';
				}

				if (!record.get('leaf')) {
					var isTimeOff = false;

					if (viewPreset == RA.Cmp.Store.GridAllocation.ViewPresets.DAILY) {
						isTimeOff = RA.Util.WorkCalendar.isResourceTimeOff(resourceId, date);
					} else {
						for (i = 0; i < 7; i++) {
							isTimeOff = RA.Util.WorkCalendar.isResourceTimeOff(resourceId, Ext4.Date.add(date, Ext4.Date.DAY, i));

							if (isTimeOff) {
								break;
							}
						}
					}

					if (isTimeOff) {
						metaData.tdAttr += RA.App.Constant.TIME_OFF_RESOURCE_ATTR + '="' + record.get('resourceId') + '"';
						metaData.tdAttr += RA.App.Constant.TIME_OFF_DATE_ATTR + '="' + date.toString() + '"';
						metaData.tdAttr += RA.App.Constant.TIME_OFF_CONFLICT + '="' + record.data[key].getTimeOffconflict() + '"';
						metaData.tdCls += ' ra-time-off ra-grid-time-off';
					}
				}
			}
		}

		return '<span>' + ret + '</span>';
	}
});

Ext4.define('RA.Cmp.GridLockedColumn', {
	extend: 'Ext4.grid.column.Column',
	sortable: false,
	menuDisabled: false,
	locked: true,
	renderer: function (value, metaData, record, row, col, store, view) {
		metaData.tdCls = 'ra-grid-lpane-' + (row + 1) + '-' + (col + 1);
		return value;
	}
});

Ext4.define('RA.Cmp.GridTreeColumn', {
	extend: 'Ext4.tree.Column',
	sortable: true,
	menuDisabled: false,
	locked: true,
	renderer: function (value, metaData, record, row, col, store, view) {
		if (value == translatedStrings.getText('SS.MESSAGE.NO_RESULTS_VIEW')) {
			metaData.style = "padding-left:0px";
		} else {
			metaData.tdCls = 'ra-grid-lpane-' + (row + 1) + '-' + (col + 1);
		}
		return value;
	}
});