/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.ToolTip', {
	extend: 'Ext4.tip.ToolTip',
	target: Ext4.getBody(),
	showDelay: 1000,
	hideDelay: 0,
	dismissDelay: 0,
	autoHide: true,
	trackMouse: true,
	anchor: 'left',
	listeners: {
		beforeshow: function updateTipBody(tip) {
			if (tip.text) {
				tip.update('<div class="ra-simple-tip">' + tip.text + '</div>');
			} else {
				return false;
			}
		}
	},
	html: '<div><table><tr><td><img src="/images/help/animated_loading.gif" /></td><td>' + translatedStrings.getText('TOOLTIP.LOADING') + '</td></tr></table></div>',
	initComponent: function (args) {
		this.defaultHtml = this.html;

		this.callParent(args);

		this.on('hide', function () {
			this.update(this.defaultHtml);
		});
	},
	applyDecimalPadding: function (tipObj, arrAttribute) {
		//Pad tip object attributes with fixed decimal places according to settings
		var limitDecimalPlaces = RA.App.Settings.get('limitDecimalPlaces');
		if (limitDecimalPlaces) {
			for (var i = 0; i < arrAttribute.length; i++) {
				if (isNumber(+tipObj[arrAttribute[i]])) {
					tipObj[arrAttribute[i]] = (+tipObj[arrAttribute[i]]).toFixed(limitDecimalPlaces);
				}
			}
		}
	}
});

Ext4.define('RA.Cmp.ViewToolTip', {
	extend: 'RA.Cmp.ToolTip',
	listeners: {
		beforeshow: function updateTipBody(tip) {
			var innerHTML = tip.triggerElement.innerHTML;
			// remove hide and overflow details of fieldvalue
			innerHTML = innerHTML.replace('overflow: hidden;', '');
			innerHTML = innerHTML.replace('display: inline;', '');
			innerHTML = innerHTML.replace('white-space: nowrap;', '');
			innerHTML = innerHTML.replace('x4-form-item-label-right', 'x4-form-item-label-left');
			innerHTML = innerHTML.replace('height: 20px;', '');
			tip.update(innerHTML);
		}
	}
});

Ext4.define('RA.Cmp.ProjectToolTip', {
	extend: 'RA.Cmp.ToolTip',
	listeners: {
		beforeshow: function updateTipBody(tip) {
			if (RA.App.Settings.get('showHovers') === 'F') {
				return false;
			}
			var nodeId = tip.triggerElement.parentNode.parentNode.parentNode.getAttribute('data-recordid');
			var nodeObj = RA.App.Stores.chartResource.getResourceObjByRow(nodeId);
			var nodeType = nodeObj.get('nodeType');
			var type = nodeObj.get('type') || (nodeObj.raw && nodeObj.raw.type) || '';
			var status = nodeObj.raw && nodeObj.raw.status;
			var tipObj = nodeObj.get('details') && nodeObj.get('details').tip;

			if (type === translatedStrings.getText('STORE.EMPLOYEE')) {
				type = 'employee';
			} else if (type === translatedStrings.getText('STORE.VENDOR')) {
				type = 'vendor';
			} else if (type === translatedStrings.getText('STORE.GENERIC_RESOURCE')) {
				type = 'genericresource';
			}

			if (nodeType === 'project') {
				var percent = parseFloat(tipObj.percent).toFixed(RA.App.Settings.get('limitDecimalPlaces'));
				tipObj.percent = percent + '%';
				tipObj.config = [];
				if (nodeObj.get('isDirtyForProjectHover')) {
					tipObj.config.push({dirty: 1});
				} else {
					tipObj.config.push({dirty: 0});
				}
				var dispView = translatedStrings.getText('TOOLTIP.VIEW');


				if (status == 'template') {
					var url = nlapiResolveURL('RECORD', 'projecttemplate', nodeObj.get('projectId'));
					tipObj.projecttemplateurl = '<a target="_blank" href="' + url + '">' + dispView + '</a>';
					tip.update(RA.App.Templates.projectTemplateHoverTpl().apply(tipObj).replace(/[']/g, "&#146;"));
				} else {
					var url = nlapiResolveURL('RECORD', 'job', nodeObj.get('projectId'));
					tipObj.projecturl = '<a target="_blank" href="' + url + '">' + dispView + '</a>';
					tip.update(RA.App.Templates.projectHoverTpl().apply(tipObj).replace(/[']/g, "&#146;"));
				}
			} else if (nodeType === 'customer') {
				RA.App.Cache.customer.loadRecord(nodeId, function (record) {
					tip.update(RA.App.Templates.customerHoverTpl().apply(record[0].data).replace(/[']/g, "&#146;"));
				});
			} else if (nodeType === 'resource') {
				this.applyDecimalPadding(tipObj, ['emp_laborcost', 'vend_laborcost', 'genrsrc_laborcost', 'genrsrc_price', 'emp_billingrate']);
				if (type.toLowerCase() == 'employee') {
					//Set the skill url
					try {
						var url = nlapiResolveURL('SUITELET', 'customscript_rss_sl_resource_form', 'customdeploy_rss_sl_resource_form');
						var urlWithParam = [
							url,
							'custpage_resourceid=' + nodeObj.get('resourceId'),
							'custpage_type=Employee'
						].join('&');
						var dispView = translatedStrings.getText('TOOLTIP.VIEW');
						tipObj.skillurl = '<a target="_blank" href="' + urlWithParam + '">' + dispView + '</a>';
					} catch (e) {
						//RSS bundle not installed
						tipObj.skillurl = null;
					}
					if (!nlapiGetContext().getFeature('billingclasses')) {
						tipObj.emp_billingclass = null;
					}
					if (RA.App.Filters.filter.data.viewByType == 1) {
						tipObj.showbillingrate = false;
					} else {
						tipObj.showbillingrate = true;
					}
					tip.update(RA.App.Templates.employeeHoverTpl().apply(tipObj).replace(/[']/g, "&#146;"));
				} else if (type.toLowerCase() == 'vendor') {
					if (tipObj.vend_is1099eligible) {
						tipObj.vend_is1099eligible_text = translatedStrings.getText('TOOLTIP.YES');
					} else {
						tipObj.vend_is1099eligible_text = translatedStrings.getText('TOOLTIP.NO');
					}
					tip.update(RA.App.Templates.vendorHoverTpl().apply(tipObj).replace(/[']/g, "&#146;"));
				} else if (type.toLowerCase() == 'genericresource' || type.toLowerCase() == 'genericrsrc') {
					var url = nlapiResolveURL('RECORD', 'genericresource', nodeObj.get('resourceId'));
					tipObj.genericresourceurl = '<a target="_blank" href="' + url + '">' + translatedStrings.getText('TOOLTIP.VIEW') + '</a>';
					tip.update(RA.App.Templates.genericResourceHoverTpl().apply(tipObj).replace(/[']/g, "&#146;"));
				}
			} else {
				tip.update(tip.triggerElement.innerHTML);
			}
		},
		afterRender: function () {
			var me = this;
			me.getEl().on({
				mouseenter: function () {
					me.isFocus = true;
				},
				mouseleave: function () {
					me.isFocus = false;
					me.hide();
				},
				scope: me
			});
		}
	}
});

Ext4.define('RA.Cmp.GridCellToolTip', {
	extend: 'RA.Cmp.ToolTip',
	listeners: {
		beforeshow: function updateTipBody(tip) {
			if (RA.App.Settings.get('showHovers') != 'T') {
				return false;
			}

			/*
			 * get row & column details of the trigger element
			 */
			var cellCoords = JSON.parse(tip.triggerElement.getAttribute('cellcoords'));
			/*
			 * locate all allocations on this row
			 */
			var allocs = RA.App.Stores.chartEvent.getAllocations(cellCoords.resourceId, cellCoords.projectId, cellCoords.taskId, cellCoords.customerId);
			/*
			 * find the allocation that overlaps with the triggerElement's column
			 * since hover only shows up on 'single' allocations, there is always only 1 matching allocation
			 */
			for (var i in allocs) {
				if (Sch.util.Date.intersectSpans(allocs[i].get('startTimestamp'), allocs[i].get('endTimestamp'), new Date(cellCoords.startDate), new Date(cellCoords.endDate))) {
					break;
				}
			}
			/*
			 * retrieve all tool tip information from the matching allocation
			 */
			var alloc = allocs[i];
			var tipObj = {};
			tipObj.tipResource = alloc.get('tipResource');
			tipObj.tipProject = alloc.get('tipProject');
			tipObj.tipTask = alloc.get('tipTask');
			tipObj.tipStart = alloc.get('tipStart');
			tipObj.tipEnd = alloc.get('tipEnd');
			tipObj.Name = parseFloat(alloc.get('hour')).toFixed(RA.App.Settings.get('limitDecimalPlaces')); // always get hours
			tipObj.type = alloc.get('type');
			tipObj.tipAppStatus = alloc.get('tipAppStatus');
			tipObj.tipApprover = alloc.get('tipApprover');
			tipObj.comment = alloc.get('comment');
			tipObj.tipRecurrence = alloc.get('tipRecurrence');
			/*
			 * update the tooltip
			 */
			tip.update(RA.App.Templates.allocationHoverTpl().apply(tipObj).replace(/[']/g, "&#146;"));
		}
	}
});

Ext4.define('RA.Cmp.GridTimeOff', {
	extend: 'RA.Cmp.ToolTip',
	listeners: {
		beforeshow: function updateTipBody(tip) {
			var resourceId = Number(tip.triggerElement.getAttribute(RA.App.Constant.TIME_OFF_RESOURCE_ATTR)),
				timeOffStart = new Date(tip.triggerElement.getAttribute(RA.App.Constant.TIME_OFF_DATE_ATTR)),
				timeOffEnd = Ext4.Date.clone(timeOffStart),
				timeOffConflict = tip.triggerElement.getAttribute(RA.App.Constant.TIME_OFF_CONFLICT) == 'true';

			if (RA.App.ModeManager.getActive().getViewPreset() == RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY) {
				timeOffEnd = Ext4.Date.add(timeOffStart, Ext4.Date.DAY, 6);
			}

			var totalHours = 0;
			var arrTimeOffDate = RA.App.Stores.timeOff.queryBy(function (record) {
				return record.get('employeeId') == resourceId &&
					   record.get('timeOffDate') >= timeOffStart &&
					   record.get('timeOffDate') <= timeOffEnd;
			}).items.map(function (timeOff) {
				totalHours += timeOff.get('amountOfTime');
				return Ext4.Date.format(timeOff.get('timeOffDate'), convertNSDateFormat());
			});

			var timeOffData = {
				tipTimeOffDate: arrTimeOffDate.join('<br>'),
				tipConflict: timeOffConflict,
				tipTimeOffHour: totalHours
			};

			tip.update(RA.App.Templates.timeoffHoverTpl().apply(timeOffData));
		}
	}
});

Ext4.define('RA.Cmp.SimpleToolTip', {
	extend: 'RA.Cmp.ToolTip',
	listeners: {
		beforeshow: function updateTipBody(tip) {
			tip.update('<div class="ra-simple-tip">' + (tip.triggerElement.innerText || tip.triggerElement.textContent) + '</div>');
		}
	}
});


/*
 * shared tooltips
 */
Ext4.create('RA.Cmp.ViewToolTip', {
	delegate: '.ra-field-filter-summary',
	id: 'ra-tip-view'
});

Ext4.create('RA.Cmp.ProjectToolTip', {
	delegate: '.x4-tree-node-text',
	id: 'ra-tip-project',
	setManualHide: function () {
		//Disable autohide of tooltip. In use when tooltip has view links
		var me = this;
		var hideAfter = 200; // in milliseconds
		me.mouseOffset = [-20, -10];
		me.trackMouse = false;
		me.autoHide = false;

		var hideTooltipTimer = null;
		var elements = Ext4.dom.Query.select('.x4-tree-node-text');
		for (var i = 0; i < elements.length; i++) {
			elements[i].addEventListener('mouseenter', function (event) {
				clearTimeout(hideTooltipTimer);
			});

			elements[i].addEventListener('mouseout', function (event) {
				hideTooltipTimer = setTimeout(function () {
					if (!Ext4.getCmp('ra-tip-project').isFocus) {
						Ext4.getCmp('ra-tip-project').hide();
					}
				}, hideAfter);
			});
		}
	}
});

/*
 * grid-specific tooltips
 */
Ext4.create('RA.Cmp.GridCellToolTip', {
	delegate: '.ra-grid-cell-single-alloc',
	id: 'ra-tip-alloc-grid'
});
Ext4.create('RA.Cmp.GridTimeOff', {
	delegate: '.ra-time-off',
	id: 'ra-tip-timeoff'
});

Ext4.create('RA.Cmp.SimpleToolTip', {
	delegate: '.ra-date-column',
	id: 'ra-tip-column-header-grid'
});
Ext4.create('RA.Cmp.ToolTip', {
	delegate: '.ra-tip-is-task-allocation',
	id: 'ra-tip-is-task-allocation',
	text: translatedStrings.getText('MESSAGE.DISABLED.IS_TASK_ALLOCATION')
});
Ext4.create('RA.Cmp.ToolTip', {
	delegate: '.ra-tip-no-project-task',
	id: 'ra-tip-no-project-task',
	text: translatedStrings.getText('MESSAGE.DISABLED.NO_PROJECT_TASK')
});

/*
 * chart-specific tooltips
 */
Ext4.create('RA.Cmp.SimpleToolTip', {
	delegate: '.sch-simple-timeheader',
	id: 'ra-tip-column-header-chart'
});