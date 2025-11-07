/**
 * © 2015 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

/*
 * ExtJS Overrides here
 */
Ext4.override(Ext4.dd.DragTracker, {
	tolerance: -1
});

Ext4.override(Ext4.dd.DragTracker, {
	endDrag: function (e) {
		var me = this,
			wasActive = me.active;

		Ext4.getDoc().un({
			mousemove: me.onMouseMove,
			mouseup: me.onMouseUp,
			selectstart: me.stopSelect,
			scope: me
		});
		me.clearStart();
		me.active = false;
		if (wasActive) {
			me.onEnd(e);
			me.fireEvent('dragend', me, e);
		}


		me._constrainRegion = Ext4.EventObject.dragTracked = null;
	}
});

Ext4.override(Ext4.data.JsonStore, {
	isLoaded: false,

});

Ext4.override(Ext4.view.Table, {
	onRowSelect: function (rowIdx) {
		var me = this;

//        console.log('rowIdx = ' + rowIdx);
//        console.log('me.selectedItemCls = ' + me.selectedItemCls);
//        console.log('me.getRowStyleTableEl(rowIdx) = ' + me.getRowStyleTableEl(rowIdx));
//        console.log('me.isRowStyleFirst(rowIdx) = ' + me.isRowStyleFirst(rowIdx));
//        console.log('me.tableSelectedFirstCls = ' + me.tableSelectedFirstCls);
//        console.log('me.beforeSelectedItemCls = ' + me.beforeSelectedItemCls);

		me.addRowCls(rowIdx, me.selectedItemCls);
		if (me.isRowStyleFirst(rowIdx)) {
			if (me.getRowStyleTableEl(rowIdx)) me.getRowStyleTableEl(rowIdx).addCls(me.tableSelectedFirstCls);
		} else {
			me.addRowCls(rowIdx - 1, me.beforeSelectedItemCls);
		}
	},
	onRowDeselect: function (rowIdx) {
		var me = this;

//        console.log('onRowDeselect : rowIdx = ' + rowIdx);
//        console.log('onRowDeselect : me.selectedItemCls = ' + me.selectedItemCls);
//        console.log('onRowDeselect : me.focusedItemCls = ' + me.focusedItemCls);
//        console.log('onRowDeselect : me.getRowStyleTableEl(rowIdx) = ' + me.getRowStyleTableEl(rowIdx));
//        console.log('onRowDeselect : me.isRowStyleFirst(rowIdx) = ' + me.isRowStyleFirst(rowIdx));
//        console.log('onRowDeselect : me.beforeFocusedItemCls = ' + me.beforeFocusedItemCls);
//        console.log('onRowDeselect : me.beforeSelectedItemCls = ' + me.beforeSelectedItemCls);

		me.removeRowCls(rowIdx, [me.selectedItemCls, me.focusedItemCls]);
		if (me.isRowStyleFirst(rowIdx)) {
			if (me.getRowStyleTableEl(rowIdx)) me.getRowStyleTableEl(rowIdx).removeCls([me.tableFocusedFirstCls, me.tableSelectedFirstCls]);
		} else {
			me.removeRowCls(rowIdx - 1, [me.beforeFocusedItemCls, me.beforeSelectedItemCls]);
		}
	},
	onRowFocus: function (rowIdx, highlight, supressFocus) {
		var me = this;

//        console.log('onRowFocus : rowIdx = ' + rowIdx);
//        console.log('onRowFocus : highlight = ' + highlight);
//        console.log('onRowFocus : supressFocus = ' + supressFocus);
//        console.log('onRowFocus : me.selectedItemCls = ' + me.selectedItemCls);
//        console.log('onRowFocus : me.focusedItemCls = ' + me.focusedItemCls);
//        console.log('onRowFocus : me.getRowStyleTableEl(rowIdx) = ' + me.getRowStyleTableEl(rowIdx));
//        console.log('onRowFocus : me.isRowStyleFirst(rowIdx) = ' + me.isRowStyleFirst(rowIdx));
//        console.log('onRowFocus : me.tableFocusedFirstCls = ' + me.tableFocusedFirstCls);
//        console.log('onRowFocus : me.beforeFocusedItemCls = ' + me.beforeFocusedItemClss);

		if (highlight) {
			me.addRowCls(rowIdx, me.focusedItemCls);
			if (me.isRowStyleFirst(rowIdx)) {
				if (me.getRowStyleTableEl(rowIdx)) me.getRowStyleTableEl(rowIdx).addCls(me.tableFocusedFirstCls);
			} else {
				me.addRowCls(rowIdx - 1, me.beforeFocusedItemCls);
			}
			if (!supressFocus) {
				me.focusRow(rowIdx);
			}

		} else {
			me.removeRowCls(rowIdx, me.focusedItemCls);
			if (me.isRowStyleFirst(rowIdx)) {
				if (me.getRowStyleTableEl(rowIdx)) me.getRowStyleTableEl(rowIdx).removeCls(me.tableFocusedFirstCls);
			} else {
				me.removeRowCls(rowIdx - 1, me.beforeFocusedItemCls);
			}
		}

		if ((Ext.isIE6 || Ext.isIE7) && !me.ownerCt.rowLines) {
			me.repaintRow(rowIdx);
		}
	}
});

Ext4.override(Ext4.picker.Date, {
	fullUpdate: function (date) {

		var me = this,
			cells = me.cells.elements,
			textNodes = me.textNodes,
			disabledCls = me.disabledCellCls,
			eDate = Ext4.Date,
			i = 0,
			extraDays = 0,
			visible = me.isVisible(),
			newDate = +eDate.clearTime(date, true),
			today = +eDate.clearTime(new Date()),
			min = me.minDate ? eDate.clearTime(me.minDate, true) : Number.NEGATIVE_INFINITY,
			max = me.maxDate ? eDate.clearTime(me.maxDate, true) : Number.POSITIVE_INFINITY,
			ddMatch = me.disabledDatesRE,
			ddText = me.disabledDatesText,
			ddays = me.disabledDays ? me.disabledDays.join('') : false,
			ddaysText = me.disabledDaysText,
			format = me.format,
			days = eDate.getDaysInMonth(date),
			firstOfMonth = eDate.getFirstDateOfMonth(date),
			startingPos = firstOfMonth.getDay() - me.startDay,
			previousMonth = eDate.add(date, eDate.MONTH, -1),
			longDayFormat = me.longDayFormat,
			prevStart,
			current,
			disableToday,
			tempDate,
			setCellClass,
			html,
			cls,
			formatValue,
			value;

		if (startingPos < 0) {
			startingPos += 7;
		}

		days += startingPos;
		prevStart = eDate.getDaysInMonth(previousMonth) - startingPos;
		current = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), prevStart, me.initHour);

		if (me.showToday) {
			tempDate = eDate.clearTime(new Date());
			disableToday = (tempDate < min || tempDate > max ||
							(ddMatch && format && ddMatch.test(eDate.dateFormat(tempDate, format))) ||
							(ddays && ddays.indexOf(tempDate.getDay()) != -1));

			if (!me.disabled) {
				me.todayBtn.setDisabled(disableToday);
				me.todayKeyListener.setDisabled(disableToday);
			}
		}

		setCellClass = function (cell, cls) {
			value = +eDate.clearTime(current, true);
			cell.title = eDate.format(current, longDayFormat);

			cell.firstChild.dateValue = value;
			if (value == today) {
				cls += ' ' + me.todayCls;
				cell.title = me.todayText;


				me.todayElSpan = Ext.DomHelper.append(cell.firstChild, {
					tag: 'span',
					cls: Ext.baseCSSPrefix + 'hide-clip'//,
					//html:me.todayText
				}, true);
			}
			if (value == newDate) {
				cls += ' ' + me.selectedCls;
				me.fireEvent('highlightitem', me, cell);
				if (visible && me.floating) {
					Ext.fly(cell.firstChild).focus(50);
				}
			}

			if (value < min) {
				cls += ' ' + disabledCls;
				cell.title = me.minText;
			} else if (value > max) {
				cls += ' ' + disabledCls;
				cell.title = me.maxText;
			} else if (ddays && ddays.indexOf(current.getDay()) !== -1) {
				cell.title = ddaysText;
				cls += ' ' + disabledCls;
			} else if (ddMatch && format) {
				formatValue = eDate.dateFormat(current, format);
				if (ddMatch.test(formatValue)) {
					cell.title = ddText.replace('%0', formatValue);
					cls += ' ' + disabledCls;
				}
			}
			cell.className = cls + ' ' + me.cellCls;
		};

		for (; i < me.numDays; ++i) {
			if (i < startingPos) {
				html = (++prevStart);
				cls = me.prevCls;
			} else if (i >= days) {
				html = (++extraDays);
				cls = me.nextCls;
			} else {
				html = i - startingPos + 1;
				cls = me.activeCls;
			}
			textNodes[i].innerHTML = html;
			current.setDate(current.getDate() + 1);
			setCellClass(cells[i], cls);
		}

		me.monthBtn.setText(eDate.format(date, me.monthYearFormat));
	}
});

Ext4.override(Ext4.ux.form.MultiSelect, {
	dragText: '{0} ' + translatedStrings.getText('TOOLTIP.ITEMS')
});

Ext4.onReady(function () {
	Ext4.apply(Ext4.picker.Date.prototype, {
		dayNames: Ext4.Date.dayNames
	});
});

/*
 * Fix from http://www.sencha.com/forum/showthread.php?269116-Ext-4.2.1.883-Sandbox-getRowStyleTableEl
 */
Ext4.override(Ext4.view.Table, {
	getRowStyleTableEl: function (item) {
		var me = this;

		if (!item.tagName) {
			item = this.getNode(item);
		}

		return (me.isGrouping ? Ext4.fly(item) : this.el).down('table.' + Ext4.baseCSSPrefix + 'grid-table');
	}
});

Ext4.override(Ext4.selection.CellModel, {
	onViewRefresh: function (view) {
		var me = this, pos = me.getCurrentPosition(), headerCt = view.headerCt, record, columnHeader;
		if (pos && pos.view === view) {
			record = pos.record;
			columnHeader = pos.columnHeader;
			if (!columnHeader.isDescendantOf(headerCt)) {
				columnHeader = headerCt.queryById(columnHeader.id) || headerCt.down('[text="' + columnHeader.text + '"]') || headerCt.down('[dataIndex="' + columnHeader.dataIndex + '"]');
			}
			/*
			 * add checking if record is null before proceeding with this code block
			 */
			if (columnHeader && record && (view.store.indexOfId(record.getId()) !== -1)) {
				me.setCurrentPosition({
					row: record,
					column: columnHeader,
					view: view
				});
			}
		}
	}
});

/*
 * Bryntum Overrides here
 */
Ext4.override(Sch.util.ScrollManager, {
	unregister: function (el) {
		this.clearScrollInterval();

		if (this.activeEl) this.activeEl.un('mousemove', this.onMouseMove, this);
		this.activeEl = this.scrollElRegion = null;
	}
});

Ext4.override(Sch.feature.DragCreator, {
	dragTolerance: -1
});

Ext4.override(Sch.plugin.ResourceZones, {
	init: function (scheduler) {
		// unique css class to be able to identify the elements belonging to this instance
		this.uniqueCls = this.uniqueCls || ('sch-timespangroup-' + Ext4.id());

		this.scheduler = scheduler;
		scheduler.on('destroy', this.onSchedulerDestroy, this);

		scheduler.registerRenderer(this.renderer, this);

		if (Ext4.isString(this.innerTpl)) {
			this.innerTpl = new Ext4.XTemplate(this.innerTpl);
		}

		var innerTpl = this.innerTpl;

		if (!this.template) {
			this.template = new Ext4.XTemplate(
				'<tpl for=".">' +
				'<div id="' + this.uniqueCls + '-{id}" ' + RA.App.Constant.TIME_OFF_RESOURCE_ATTR + '="{ResourceId}" ' +
				RA.App.Constant.TIME_OFF_DATE_ATTR + '="{StartDate}" ' + RA.App.Constant.TIME_OFF_CONFLICT + '="{TimeOffConflict}" '
				+ 'class="' + this.cls + ' ' + this.uniqueCls + ' {Cls}" style="' + (scheduler.rtl
																					 ? 'right'
																					 : 'left') + ':{start}px;width:{width}px;top:{start}px;height:{width}px;{style}">' +
				(innerTpl ? '{[this.renderInner(values)]}' : '') +

				'</div>' +
				'</tpl>',
				{
					renderInner: function (values) {
						return innerTpl.apply(values);
					}
				}
			);
		}

		this.storeListeners = {
			load: this.fullRefresh,
			datachanged: this.fullRefresh,
			clear: this.fullRefresh,

			// Ext JS
			add: this.fullRefresh,
			remove: this.fullRefresh,
			update: this.refreshSingle,

			// Sencha Touch
			addrecords: this.fullRefresh,
			removerecords: this.fullRefresh,
			updaterecord: this.refreshSingle,

			scope: this
		};

		this.store.on(this.storeListeners);
	},
	renderZones: function (resource) {
		var store = this.store;
		var scheduler = this.scheduler;
		var viewStart = scheduler.timeAxis.getStart();
		var viewEnd = scheduler.timeAxis.getEnd();
		var data = [];
		var spanStartDate;
		var spanEndDate;
		store.each(function (record) {
			spanStartDate = record.getStartDate();
			spanEndDate = record.getEndDate();
			// Make sure resource exists in resourceStore (filtering etc)
			if (record.getResource() === resource && spanStartDate && spanEndDate &&
				// Make sure this zone is inside current view
				Sch.util.Date.intersectSpans(spanStartDate, spanEndDate, viewStart, viewEnd)) {
				var renderData = scheduler.getSchedulingView()[scheduler.getOrientation()].getEventRenderData(record);
				var start, width;
				if (scheduler.getOrientation() === 'horizontal') {
					start = scheduler.rtl ? renderData.right : renderData.left;
					width = renderData.width;
				} else {
					start = renderData.top;
					width = renderData.height;
				}
				data[data.length] = Ext4.apply({
					id: record.internalId,
					start: start,
					width: width + 1,
					StartDate: record.getStartDate().toString(),
					ResourceId: record.getResourceId(),
					Cls: record.getCls()
				}, record.data);
			}
		});
		return this.template.apply(data);
	}
});
/*
 * Override Sch.view.Horizontal.getScheduleRegion
 * Since we need to differentiate reassign & resize events, we will add an optional parameter: isResize
 * If isResize does not evaluate to false, then it means that the callee is triggered by a resize event
 */
Ext4.override(Sch.view.Horizontal, {
	getScheduleRegion: function (resourceRecord, eventRecord, isResize) {
		var getRegionFn = Ext4.Element.prototype.getRegion ? 'getRegion' : 'getPageBox';
		var view = this.view;
		var region = resourceRecord ? Ext4.fly(view.getRowNode(resourceRecord))[getRegionFn]() : view.getTableRegion();
		var taStart = view.timeAxis.getStart();
		var taEnd = view.timeAxis.getEnd();
		var dateConstraints = view.getDateConstraints(resourceRecord, eventRecord, isResize) || {
			start: taStart,
			end: taEnd
		};
		var startX = this.translateToPageCoordinate(view.getXFromDate(dateConstraints.start));
		var endX = this.translateToPageCoordinate(view.getXFromDate(dateConstraints.end));
		var top = region.top + view.barMargin;
		var bottom = region.bottom - view.barMargin - view.eventBorderWidth;

		return new Ext4.util.Region(top, Math.max(startX, endX), bottom, Math.min(startX, endX));
	}
});
/*
 * Override Sch.view.SchedulerGridView.getScheduleRegion
 * Added optional parameter isResize to pass to Sch.view.Horizontal.getScheduleRegion
 */
Ext4.override(Sch.view.SchedulerGridView, {
	getScheduleRegion: function (resourceRecord, eventRecord, isResize) {
		return this[this.orientation].getScheduleRegion(resourceRecord, eventRecord, isResize);
	}
});
/*
 * Override Sch.feature.ResizeZone.createResizer
 * Passed isResize=true to specify that this process belongs to a resize event
 */
Ext4.override(Sch.feature.ResizeZone, {
	createResizer: function (el, eventRecord, handlePos) {
		var s = this.schedulerView;
		var resourceRecord = s.resolveResource(el);
		var increment = s.getSnapPixelAmount();
		var constrainRegion = s.getScheduleRegion(resourceRecord, eventRecord, true);
		var dateConstraints = s.getDateConstraints(resourceRecord, eventRecord, true);
		var height = el.getHeight;
		var isStart = (s.rtl && handlePos[0] === 'e') || (!s.rtl && handlePos[0] === 'w') || handlePos[0] === 'n';
		var resizerCfg = {
			target: el,
			isStart: isStart,
			dateConstraints: dateConstraints,
			resourceRecord: resourceRecord,
			eventRecord: eventRecord,
			handles: handlePos[0],
			minHeight: height,
			constrainTo: constrainRegion,

			listeners: {
				resizedrag: this.partialResize,
				resize: this.afterResize,
				scope: this
			}
		};

		// HACK, make it unique to prevent Ext JS from getting the wrong one if multiple events with same Id exist.
		// Remove this when scheduler has assignment store awareness
		var prevId = el.id;
		var newId = '_' + prevId;

		el.id = el.dom.id = newId;

		// duplicate the cache entry for this element, so Ext4.get(newId) or Ext4.get(el) will reference the same entry
		Ext4.cache[newId] = Ext4.cache[prevId];
		// EOF HACK

		// Apply orientation specific configs
		if (s.getOrientation() === 'vertical') {
			if (increment > 0) {
				var w = el.getWidth();

				Ext4.apply(resizerCfg, {
					minHeight: increment,
					// To avoid SHIFT causing a ratio preserve
					minWidth: w,
					maxWidth: w,
					heightIncrement: increment
				});
			}
		} else {
			if (increment > 0) {

				Ext4.apply(resizerCfg, {
					minWidth: increment,
					// To avoid SHIFT causing a ratio preserve
					maxHeight: height,
					widthIncrement: increment
				});
			}
		}

		var resizer = Ext4.create('Ext4.resizer.Resizer', resizerCfg);

		if (resizer.resizeTracker && Ext4.isWebKit) {
			// Ignore resizing action if dragging outside the scheduler
			// Fixes WebKit issue https://www.assembla.com/spaces/bryntum/tickets/994#/activity/ticket:
			var old = resizer.resizeTracker.updateDimensions;

			resizer.resizeTracker.updateDimensions = function (e) {
				if (e.getTarget('.sch-timelineview')) {
					old.apply(this, arguments);
				}
			};
		}
		// Make sure the resizing event is on top of other events
		el.setStyle('z-index', parseInt(el.getStyle('z-index'), 10) + 1);
		return resizer;
	}
});
/*
 * Override Sch.data.TimeAxis.getAdjustedDates
 * Initial value of end will now be based on the updated start value.
 * Default implementation adjusts both start and end simultaneously, causing an erroneous increment to end (by 1 tick).
 */
Ext4.override(Sch.data.TimeAxis, {
	getAdjustedDates: function (start, end) {
		start = start || this.getStart();
		if (this.autoAdjust) {
			start = this.floorDate(start, false);
		}
		end = end || Sch.util.Date.add(start, this.mainUnit, this.defaultSpan);
		if (this.autoAdjust) {
			end = this.ceilDate(end, false);
		}
		return {
			start: start,
			end: end
		};
	}
});

Ext4.override(Ext4.data.proxy.Ajax, {timeout: 360000}); // default is 30seconds

/*
 * For Issue 286631 : [RAC] Translation > New/Edit Allocation > Resource Search > "The value cannot be negative" error message is not translated
 *
 * The string 'The value cannot be negative' is not translated by default in the Ext translations...
 * Should be manually overridden.
 *
 */
//Ext4.override(Ext4.form.field.Number, {
//    negativeText : translatedStrings.getText('MESSAGE.ERROR.NEGATIVE_NUMBER')
//});

Ext4.override(Sch.view.model.TimeAxis, {
	/*
	 * Override to minimize length of horizontal scroll
	 */
	calculateTickWidth: function (proposedWidth) {
		var forceFit = this.forceFit;
		var timeAxis = this.timeAxis;
		var width = 0, timelineUnit = timeAxis.getUnit(), ratio = Number.MAX_VALUE, DATE = Sch.util.Date;
		if (this.snapToIncrement) {
			var resolution = timeAxis.getResolution();
			ratio = DATE.getUnitToBaseUnitRatio(timelineUnit, resolution.unit) * resolution.increment;
		} else {
			var measuringUnit = DATE.getMeasuringUnit(timelineUnit);
			ratio = Math.min(ratio, DATE.getUnitToBaseUnitRatio(timelineUnit, measuringUnit));
		}
		var availableWidth = this.getAvailableWidth() - timeAxis.getVisibleTickTimeSpan();// offset right border of each column
		var fittingWidth = Math[forceFit ? 'floor' : 'round'](availableWidth / timeAxis.getVisibleTickTimeSpan());
		if (!this.suppressFit) {
			width = (forceFit || proposedWidth < fittingWidth) ? fittingWidth : proposedWidth;
			if (ratio > 0 && (!forceFit || ratio < 1)) {
				width = Math.round(Math.max(1, Math[forceFit ? 'floor' : 'round'](ratio * width)) / ratio);
			}
		} else {
			width = proposedWidth;
		}
		return width;
	}
});

Ext4.override(Sch.panel.SchedulerTree, {
	shiftNext: function () {
		this.movement = 'right';
		this.callParent();
	},
	shiftPrevious: function () {
		this.movement = 'left';
		this.callParent();
	}
});

Ext4.override(Ext4.grid.locking.Lockable, {
	onLockedViewScroll: function () {
	}
});

Ext4.override(Ext4.grid.plugin.BufferedRenderer, {
	onRangeFetched: function (range, start, end, fromLockingPartner) {
		var me = this,
			view = me.view,
			oldStart,
			rows = view.all,
			removeCount,
			increment = 0,
			calculatedTop = start * me.rowHeight,
			top,
			lockingPartner = me.lockingPartner;

		if (view.isDestroyed) {
			return;
		}

		if (!range) {
			range = me.store.getRange(start, end);

			if (!range) {
				return;
			}
		}

		if (start > rows.endIndex || end < rows.startIndex) {
			rows.clear(true);
			top = calculatedTop;
		}

		if (!rows.getCount()) {
			view.doAdd(range, start);
		} else if (end > rows.endIndex) {
			removeCount = Math.max(start - rows.startIndex, 0);

			if (me.variableRowHeight) {
				increment = rows.item(rows.startIndex + removeCount, true).offsetTop;
			}
			rows.scroll(Ext4.Array.slice(range, rows.endIndex + 1 - start), 1, removeCount, start, end);
			view.el.dom.scrollTop = me.scrollTop;

			if (me.variableRowHeight) {
				top = me.bodyTop + increment;
			} else {
				top = calculatedTop;
			}
		} else {
			removeCount = Math.max(rows.endIndex - end, 0);
			oldStart = rows.startIndex;
			rows.scroll(Ext4.Array.slice(range, 0, rows.startIndex - start), -1, removeCount, start, end);
			view.el.dom.scrollTop = me.scrollTop;

			if (me.variableRowHeight) {
				top = me.bodyTop - rows.item(oldStart, true).offsetTop;
			} else {
				top = calculatedTop;
			}
		}

		me.position = me.scrollTop;

		if (view.positionBody) {
			me.setBodyTop(top, calculatedTop);
		}

		if (lockingPartner && !lockingPartner.disabled && !fromLockingPartner) {
			lockingPartner.onRangeFetched(range, start, end, true);
			if (lockingPartner.scrollTop !== me.scrollTop) {
				lockingPartner.view.el.dom.scrollTop = me.scrollTop;
			}
		}
	}
});
/*
* Ext localization for RACG 2.0
 */
Ext4.onReady(function() {
	if (Ext4.Date) {
		Ext4.Date.monthNames = [
			translatedStrings.getText('MONTH.JANUARY'),
			translatedStrings.getText('MONTH.FEBRUARY'),
			translatedStrings.getText('MONTH.MARCH'),
			translatedStrings.getText('MONTH.APRIL'),
			translatedStrings.getText('MONTH.MAY'),
			translatedStrings.getText('MONTH.JUNE'),
			translatedStrings.getText('MONTH.JULY'),
			translatedStrings.getText('MONTH.AUGUST'),
			translatedStrings.getText('MONTH.SEPTEMBER'),
			translatedStrings.getText('MONTH.OCTOBER'),
			translatedStrings.getText('MONTH.NOVEMBER'),
			translatedStrings.getText('MONTH.DECEMBER'),
		];

		Ext4.Date.dayNames = [
			translatedStrings.getText('SUNDAY'),
			translatedStrings.getText('MONDAY'),
			translatedStrings.getText('TUESDAY'),
			translatedStrings.getText('WEDNESDAY'),
			translatedStrings.getText('THURSDAY'),
			translatedStrings.getText('FRIDAY'),
			translatedStrings.getText('SATURDAY'),
		];
	}

	Ext4.define('Ext4.locale.' + extLanguage + '.picker.Date', {
		override: 'Ext4.picker.Date',
		todayText: translatedStrings.getText('TODAY'),
		disabledDaysText: '',
		disabledDatesText: '',
		monthNames: Ext4.Date.monthNames,
		dayNames: Ext4.Date.dayNames,
		nextText: translatedStrings.getText('NEXT_MONTH'),
		prevText: translatedStrings.getText('PREV_MONTH'),
		todayTip: translatedStrings.getText('TODAY_TIP'),
		format: 'm/d/y',
		startDay: 0
	});

	Ext4.define('Ext4.locale.' + extLanguage + '.picker.Month', {
		override: 'Ext4.picker.Month',
		okText: '&#160;' + translatedStrings.getText('BUTTON.OK') + '&#160;',
		cancelText: '' + translatedStrings.getText('BUTTON.CANCEL')
	});

	Ext4.define('Ext4.locale.' + extLanguage + '.grid.header.Container', {
		override: "Ext4.grid.header.Container",
		sortAscText: translatedStrings.getText('MENU.SORT_ASC'),
		sortDescText: translatedStrings.getText('MENU.SORT_DESC'),
		columnsText: translatedStrings.getText('MENU.COLUMNS')
	});
});