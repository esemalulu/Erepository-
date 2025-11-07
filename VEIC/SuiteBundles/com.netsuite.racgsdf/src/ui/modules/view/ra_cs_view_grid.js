/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.TreePanel', {
	id: 'ra-grid',
	extend: 'Ext4.tree.Panel',
	renderTo: Ext4.get('main_form'),
	/*
	 * Ext.tree.Panel configs
	 */
	columnLines: true,
	enableColumnMove: false,
	enableColumnHide: true,
	rootVisible: false,
	rowLines: true,
	scrollPosition: 0,
	selModel: Ext4.create('Ext4.selection.CellModel', {
		listeners: {
			select: function (me, record, row, column) {
				//TODO: empty the textbox if value is 0; is it possible to highlight the value if > 0?
			},
			deselect: function (me, record, row, column) {
				//TODO: put 0 if the textbox is left empty
			}
		}
	}),
	selType: 'cellmodel',
	viewConfig: {
		markDirty: false,
		getRowClass: function (record, index) {
			if (record.get('leaf')) {
				return 'ra-grid-leaf-row';
			} else {
				if (record.get('midLevel')) {
					return 'ra-grid-mid-row';
				} else {
					return 'ra-grid-resource-row';
				}
			}

			// return record.get('leaf') ? 'ra-grid-project-row' : 'ra-grid-resource-row';
		}
	},
	/*
	 * custom configs
	 */
	isFirstFit: true,
	/*
	 * Ext.tree.Panel methods
	 */
	initComponent: function (args) {
		this.renderCell = function (val, meta, rec) {
			var result = val;
			if (Ext4.isDate(val)) {
				result = me.renderDate(val);
			} else if (Ext4.isBoolean(val)) {
				result = me.renderBool(val);
			}
			return Ext4.util.Format.htmlEncode(result);
		};
		this.cellEditor = Ext4.create('RA.Cmp.CellEditor', {
			grid: RA.App.Grid
		});

		var mainColumns = [];

		mainColumns.push(
			Ext4.create('RA.Cmp.GridActionColumn', {
				id: 'ra-grid-axn-hdr',
				text: '<div id="ra-grid-action-container"></div>',
				hideable: false,
				lockable: false,
				width: 50,
				dataIndex: 'hover',
				clicked: false,
				menu: null,
				listeners: {
					click: function (grid, cell, rowIndex, colIndex, event, record) {
						if (this.menu) {
							this.menu.destroy();
						}

						var isTaskAllocation = (record.get('taskId') != 0);
						var toShowProjectTask = RA.App.Settings.get('showProjectTasks') == 'T';

						var actionParams = {
							record: record,
							rowIndex: rowIndex,
							colIndex: colIndex
						};

						if (record.get('name') != translatedStrings.getText('MESSAGE.EMPTYTEXT.SEARCH_RESOURCE')
							&& record.get('name') != translatedStrings.getText('SS.MESSAGE.NO_RESULTS_SEARCH')) {

							if (record.get('leaf')) {
								// prevent action menu on No Results Found
								if (record.get('cellid') == 0) return;
								// prevent action menu on Project Template
								if (record.get('status') == 'template') return;

								var menuCount = 0;
								var projectLevelMenu = [];

								// action menu to add project task

								if (toShowProjectTask) {
									projectLevelMenu.push({
										id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1) + '-' + (++menuCount),
										text: translatedStrings.getText('MENU.ADD_TASK'),
										handler: function (item, event) {
											var taskRow = item.parentMenu.actionParams.record;
											var resourceId = taskRow.get('resourceId');
											var resourceName = taskRow.get('resourceName');
											var projectId = taskRow.get('projectId');

											var okActionFn = function () {
												var newTask = RA.App.Forms.fieldEditorForm.getField().getValue();

												if (newTask) {
													var chartEvent = RA.App.Stores.chartEvent;
													var newTaskId = newTask.get('id');
													var newRowId = [resourceId, projectId, newTaskId].join(RA.App.Constant.SEPARATOR_ID);
													var resourceRow = taskRow.parentNode;
													var isExisting = resourceRow.findChild('cellid', newRowId);

													if (isExisting) {
														alert(translatedStrings.getText('MESSAGE.ERROR.DUPLICATE_PROJECT_TASK'));
														return;
													}

													var originatingResource = RA.App.Stores.chartResource.getResourceObjByRow(RA.App.Stores.chartEvent.getResourceRowId(taskRow));
													var chartResourceObj = RA.App.Stores.chartResource.getResourceObjByRow(resourceId + '');
													var projectObj = {
														raw: {
															name: originatingResource.data.details.tip.name,
															customer: originatingResource.data.customer,
															percent: originatingResource.data.details.tip.percent,
															estimate: originatingResource.data.details.tip.estimate,
															actual: originatingResource.data.details.tip.actual,
															remaining: originatingResource.data.details.tip.remaining,
															startDate: originatingResource.data.details.tip.start,
															endDate: originatingResource.data.details.tip.end,
															allocated: originatingResource.data.details.tip.allocated,
														}
													};
													var taskObj = {
														'taskId': newTaskId,
														'taskName': newTask.get('name')
													};

													RA.App.Stores.chartResource.addNewResourceProjectRow({
														resourceId: resourceId,
														projectId: projectId,
														projTaskObj: taskObj,
														resourceObj: {raw: {name: resourceName}},
														projectObj: projectObj
													});
													RA.App.Stores.gridStore.transformChartData();
													RA.App.Filters.disableFilter();
													RA.App.Forms.fieldEditorForm.hide();
												}
											};

											RA.App.Forms.fieldEditorForm.initForm({
												recordType: 'projecttask',
												formTitle: translatedStrings.getText('MENU.ADD_TASK'),
												value: null,
												text: null,
												okActionFn: okActionFn,
												properties: {projectId: projectId}
											});

										},
										disabled: isTaskAllocation || !record.get('hasTasks'),
                                        cls : (isTaskAllocation ? 'ra-tip-is-task-allocation' : (!record.get('hasTasks')) ? 'ra-tip-no-project-task' : '')
									});
								}

								// action menu to edit allocation
								projectLevelMenu.push({
									id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1) + '-' + (++menuCount),
									text: isTaskAllocation
										  ? translatedStrings.getText('MENU.EDIT_TASK')
										  : translatedStrings.getText('MENU.EDIT_PROJECT'),
									handler: function (item, event) {
										var okActionFn = null;

										if (isTaskAllocation) {
											var taskRow = item.parentMenu.actionParams.record;
											var resourceId = taskRow.get('resourceId');
											var projectId = taskRow.get('projectId');
											var oldTaskId = taskRow.get('taskId');
											var oldTaskName = taskRow.get('task');

											okActionFn = function () {
												var newTask = RA.App.Forms.fieldEditorForm.getField().getValue();

												if (newTask) {
													var chartEvent = RA.App.Stores.chartEvent;
													var newTaskId = newTask.get('id');
													var newTaskName = newTask.get('name');
													var oldRowId = [resourceId, projectId, oldTaskId].join(RA.App.Constant.SEPARATOR_ID);
													var newRowId = [resourceId, projectId, newTaskId].join(RA.App.Constant.SEPARATOR_ID);
													var resourceRow = RA.App.Grid.store.getRootNode().findChild('cellid', resourceId);
													var isExisting = resourceRow.findChild('cellid', newRowId);

													if (oldTaskId == newTaskId) {
														return;
													}

													var resourceRec = RA.App.Stores.chartResource.getById(oldRowId);
													var projectName = resourceRec.get('projectName');
													var eventRecs = chartEvent.getAllocations(resourceId, projectId, oldTaskId);
													var withOverlap = false;

													// check first if there will be overlaps
													for (var i = 0; i < eventRecs.length; i++) {
														var eventRec = eventRecs[i];
														if (chartEvent.withOverlaps(newRowId, eventRec.get('startTimestamp').getTime(), eventRec.get('endTimestamp').getTime())) {
															withOverlap = true;
															break;
														}
													}

													if (withOverlap) {
														alert(translatedStrings.getText('MESSAGE.ERROR.EDIT_PROJECT_HAS_OVERLAP'));
														return;
													}

													// update chartEvent record/s
													var pendingId = RA.App.Constant.PENDING_APPROVAL;
													var pendingText = RA.App.Stores.appStatusStore.getById(pendingId).get('name');

													for (var i = 0; i < eventRecs.length; i++) {
														var eventRec = eventRecs[i];
														eventRec.beginEdit();
														eventRec.set('ResourceId', newRowId);
														eventRec.set('approvalStatus', pendingId);
														eventRec.set('taskId', newTaskId);
														eventRec.set('tipTask', newTaskName);
														eventRec.set('tipAppStatus', pendingText);
														eventRec.endEdit();
													}
													// delete current row if already existing, otherwise uptdate chartResource record
													if (isExisting) {
														RA.App.Stores.gridStore.deleteProjectAllocations(taskRow);
													} else {
														resourceRec.beginEdit();
														resourceRec.set('Id', newRowId);
														resourceRec.set('Name', [projectName, newTaskName].join(RA.App.Constant.SEPARATOR_NAME));
														resourceRec.set('taskId', newTaskId);
														resourceRec.set('taskName', newTaskName);
														resourceRec.endEdit();
													}

													chartEvent.refreshRollUpsByResource(resourceId);
													RA.App.Stores.gridStore.transformChartData();
													RA.App.Filters.disableFilter();
													RA.App.Forms.fieldEditorForm.hide();
												}
											};
										} else {
											var projectRow = item.parentMenu.actionParams.record;
											var projectId = projectRow.get('projectId');
											var projectName = projectRow.get('name');

											okActionFn = function () {
												var newProject = RA.App.Forms.fieldEditorForm.getField().getValue();

												if (newProject) {
													var chartResource = RA.App.Stores.chartResource;
													var chartEvent = RA.App.Stores.chartEvent;
													var projectNode = chartResource.getResourceObjByRow(projectRow.get('cellid'));
													var newProjectId = newProject.get('id');
													var resourceId = projectRow.get('resourceId');
													var projectId = projectRow.get('projectId');
													var taskId = projectRow.get('taskId');
													var newRowId = [resourceId, newProjectId, taskId].join(RA.App.Constant.SEPARATOR_ID);
													var isRowExisting = chartResource.isRowExisting(newRowId);
													var noOverlapExists = true;

													if (projectId == newProjectId) {
														return;
													}

													var projAllocations = chartEvent.queryBy(function (record) {
														return (
															record.get('resourceId') == resourceId &&
															record.get('projectId') == projectId &&
															record.get('taskId') == taskId &&
															record.get('allocId') != 0
														);
													});

													if (isRowExisting) {
														// target project row exists, check overlaps
														projAllocations.each(function (element, index, len) {
															var startTime = element.get('startTimestamp').getTime();
															var endTime = element.get('endTimestamp').getTime() - 1;

															noOverlapExists = !(chartEvent.withOverlaps(newRowId, startTime, endTime));

															return noOverlapExists;
														});
													}

													if (!noOverlapExists) {
														alert(translatedStrings.getText('MESSAGE.ERROR.REASSIGN_RA_OVERLAP'));
														return;
													}

													if (isRowExisting) {
														projectNode.removeAll();
														projectNode.remove();
													} else {
														var commentModel = RA.App.Stores.projectCommentSaver.getById(newProjectId);
														// TODO: get the project name without splitting the string
														var newNameArr = newProject.data.name.split(' : ');
														var newProjectName = newNameArr[newNameArr.length - 1];

														projectNode.beginEdit();
														projectNode.set('Id', newRowId);
														projectNode.set('projectId', newProjectId);
														projectNode.set('projectName', newProject.get('name'));
														projectNode.set('Name', newProject.get('name'));
														projectNode.set('projectTitle', newProject.get('projectTitle'));
														projectNode.data.customer = newProject.raw.customer;
														projectNode.set('comment', commentModel
																				   ? commentModel.data.comment
																				   : '');
														projectNode.data.details.tip['name'] = newProjectName;
														projectNode.data.details.tip['percent'] = newProject.raw.percent;
														projectNode.data.details.tip['estimate'] = newProject.raw.estimate;
														projectNode.data.details.tip['actual'] = newProject.raw.actual;
														projectNode.data.details.tip['remaining'] = newProject.raw.remaining;
														projectNode.data.details.tip['start'] = (newProject.raw.startDate)
																								? newProject.raw.startDate
																								: "";
														projectNode.data.details.tip['end'] = (newProject.raw.endDate)
																							  ? newProject.raw.endDate
																							  : "";
														projectNode.data.details.tip['allocated'] = newProject.raw.allocated;
														projectNode.data.details.tip['projectprice'] = ''; // TODO: update the variable based on price of the new project
														projectNode.endEdit();
													}

													// update allocations to new project row.
													RA.App.Grid.reallocate(projAllocations, resourceId, newProjectId, taskId, projectNode.getRootWorkCalendar(), projectNode.raw.resourceName);

													chartEvent.refreshRollUpsByResource(resourceId);
													RA.App.Stores.gridStore.transformChartData();
													RA.App.Filters.disableFilter();
													RA.App.Forms.fieldEditorForm.hide();
												}
											};
										}

										RA.App.Forms.fieldEditorForm.initForm({
											recordType: isTaskAllocation ? 'projecttask' : 'project',
											formTitle: isTaskAllocation
													   ? translatedStrings.getText('MENU.EDIT_TASK')
													   : translatedStrings.getText('MENU.EDIT_PROJECT'),
											value: isTaskAllocation ? oldTaskId : projectId,
											text: isTaskAllocation ? oldTaskName : projectName,
											okActionFn: okActionFn,
											properties: {projectId: projectId}
										});
									}
								});

								// action menu to re-allocate allocation
								projectLevelMenu.push({
									id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1) + '-' + (++menuCount),
									text: isTaskAllocation
										  ? translatedStrings.getText('MENU.REALLOCATE_TASK')
										  : translatedStrings.getText('MENU.REALLOCATE_PROJECT'),
									handler: function (item) {
										var projectRow = item.parentMenu.actionParams.record;
										var resourceRow = projectRow.parentNode;
										var resourceId = resourceRow.get('resourceId');
										var resourceName = resourceRow.get('name');

										var okActionFn = function () {
											var newResource = RA.App.Forms.fieldEditorForm.getField().getValue();

											if (newResource) {
												var chartResource = RA.App.Stores.chartResource;
												var chartEvent = RA.App.Stores.chartEvent;
												var projectNode = chartResource.getResourceObjByRow(projectRow.get('cellid'));
												var projectId = projectRow.get('projectId');
												var taskId = projectRow.get('taskId');
												var newResourceId = newResource.get('id');
												var newRowId = [newResourceId, projectId, taskId].join(RA.App.Constant.SEPARATOR_ID);
												var noOverlapExists = true;
												var isWorkDayAllocation = true;
												var arrTimeOffConflict = [];
												var newResourceRow = null;
												var isRowExisting = chartResource.isRowExisting(newRowId);
												var hasRecurring = false;

												if (resourceId == newResourceId) { // resource not changed.
													return;
												}

												var projAllocations = chartEvent.queryBy(function (record) { // affected records
													return (
														record.get('resourceId') == resourceId &&
														record.get('projectId') == projectId &&
														record.get('taskId') == taskId &&
														record.get('allocId') != 0
													);
												});

												projAllocations.each(function (element, index, len) {
													var startTimestamp = element.get('startTimestamp');
													var startTime = startTimestamp.getTime();
													var lastDate = element.getLastDate();
													var trueEndTime = lastDate.getTime();

													if (isRowExisting && noOverlapExists) {
														noOverlapExists = !(chartEvent.withOverlaps(newRowId, startTime, trueEndTime));
													}

													if (isWorkDayAllocation) {
														isWorkDayAllocation = chartEvent.isStartEndValid(startTimestamp, lastDate, newResourceId, newResource.raw.workCalendarRecord);
													}

													if (RA.Util.WorkCalendar.isBetweenResourceTimeOff(newResourceId, startTimestamp, lastDate)) {
														var startConflict = nlapiDateToString(startTimestamp);
														var endConflict = nlapiDateToString(lastDate);
														var strEndDate = '';

														if (endConflict != startConflict) {
															strEndDate = ' to ' + endConflict;
														}
														arrTimeOffConflict.push('\u2022' + startConflict + strEndDate);
													}

													if (element.isRecurring()) {
														hasRecurring = true;
													}

													// exit if at least one allocation on nonworking day is found, or overlap exists
													if (!noOverlapExists || !isWorkDayAllocation) {
														return;
													}
												});

												if (!noOverlapExists) {
													alert(translatedStrings.getText('MESSAGE.ERROR.REALLOCATE_RA_OVERLAP'));
													return false;
												}

												if (!isWorkDayAllocation) {
													alert(translatedStrings.getText('MESSAGE.ERROR.RA_NON_WORKING_DAY'));
													return false;
												}

												if (arrTimeOffConflict.length) {
													var strConfirm = translatedStrings.getText('MESSAGE.WARNING.RA_TIMEOFF_CONFLICT') + '\n' +
																	 arrTimeOffConflict.join('\n') + '\n' +
																	 translatedStrings.getText('DO_YOU_WANT_TO_PROCEED');
													if (!confirm(strConfirm)) {
														return;
													}
												}

												if (hasRecurring) {
													if (!confirm(translatedStrings.getText('REALLOCATE_SERIES_OF_ALLOCATIONS_PROCEED'))) {
														return false;
													}
												}

												if (chartResource.isRowExisting(newResourceId)) {
													// target resource row exists, store in var.
													newResourceRow = chartResource.getResourceObjByRow(newResourceId);
												} else {
													// target resource row does not exist, update current resource row details.
													newResourceRow = chartResource.addNewResourceRow(newResource);
												}

												if (!chartResource.isRowExisting(newRowId)) {
													// target resource already exists, transfer children from prev to new.
													var copy = projectNode.copy();
													copy.beginEdit();
													copy.set('Id', newRowId);
													copy.set('resourceId', newResourceId);
													copy.set('parentId', newResourceId);
													copy.endEdit();
													newResourceRow.appendChild(copy);

													projectNode.remove();

													if (RA.App.Chart) RA.App.Chart.refreshNonWorking(true);
												}

												// update allocations to new project row.
												RA.App.Grid.reallocate(projAllocations, newResourceId, projectId, taskId, newResource.raw.workCalendarRecord, newResource.raw.name);

												chartEvent.refreshRollUpsByResource(resourceId);
												chartEvent.refreshRollUpsByResource(newResourceId);
												RA.App.Stores.gridStore.transformChartData();
												RA.App.Filters.disableFilter();
												RA.App.Forms.fieldEditorForm.hide();
											}
										};

										RA.App.Forms.fieldEditorForm.initForm({
											recordType: 'resource',
											formTitle: isTaskAllocation
													   ? translatedStrings.getText('MENU.REALLOCATE_TASK')
													   : translatedStrings.getText('MENU.REALLOCATE_PROJECT'),
											value: resourceId,
											text: resourceName,
											okActionFn: okActionFn
										});
									}
								});

								// action menu to remove allocation
								projectLevelMenu.push({
									id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1) + '-' + (++menuCount),
									text: isTaskAllocation
										  ? translatedStrings.getText('MENU.REMOVE_TASK')
										  : translatedStrings.getText('MENU.REMOVE_PROJECT'),
									handler: function (item, event) {
										var confirmationMessage = translatedStrings.getText('MESSAGE.WARNING.DELETE_ALLOCATIONS');
										var rec = item.parentMenu.actionParams.record;
										if (confirm(confirmationMessage)) {
											perfTestLogger.start(this.text);

											RA.App.Stores.gridStore.deleteProjectAllocations(rec);
											perfTestLogger.stop();
										}
									}
								});

								this.menu = Ext4.create('RA.Cmp.ContextMenu', {
									id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1),
									actionParams: actionParams,
									items: projectLevelMenu
								});
							} else {
								// prevent action menu on No Results Found
								if (record.get('cellid') == 0) return;

								this.menu = Ext4.create('RA.Cmp.ContextMenu', {
									id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1),
									actionParams: actionParams,
									items: [
										{
											id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1) + '-4',
											text: translatedStrings.getText('MENU.ADD_PROJECT'),
											handler: function (item, event) {
												var resourceRow = item.parentMenu.actionParams.record;
												var resourceId = resourceRow.get('resourceId');
												var resourceName = resourceRow.get('resourceName') || resourceRow.get('name');

												var okActionFn = function () {
													var project = RA.App.Forms.fieldEditorForm.getField().getValue();

													if (project) {
														var projectId = project.get('id');

														if (resourceRow.findChild('projectId', projectId)) {
															alert(translatedStrings.getText('MESSAGE.ERROR.DUPLICATE_PROJECT'));
															return;
														}

														RA.App.Stores.chartResource.addNewResourceProjectRow({
															resourceId: resourceId,
															projectId: projectId,
															projTaskObj: null,
															resourceObj: {raw: {name: resourceName}},
															projectObj: project
														});

														RA.App.Stores.gridStore.transformChartData();

														RA.App.Filters.disableFilter();
														RA.App.Forms.fieldEditorForm.hide();
													}
												};

												RA.App.Forms.fieldEditorForm.initForm({
													recordType: 'project',
													formTitle: translatedStrings.getText('MENU.ADD_PROJECT'),
													value: null,
													text: null,
													okActionFn: okActionFn
												});
											}
										}, {
											id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1) + '-5',
											text: translatedStrings.getText('MENU.EDIT_RESOURCE'),
											disabled: RA.App.Stores.gridStore.hasProjectTemplate(record),
											handler: function (item) {
												var resourceRow = item.parentMenu.actionParams.record;
												var resourceId = resourceRow.get('resourceId');
												var resourceName = resourceRow.get('name');

												var okActionFn = function () {
													var newResource = RA.App.Forms.fieldEditorForm.getField().getValue();

													if (newResource) {
														var chartResource = RA.App.Stores.chartResource;
														var chartEvent = RA.App.Stores.chartEvent;
														var resourceNode = chartResource.getResourceObjByRow(resourceRow.get('cellid'));
														var newResourceId = newResource.get('id');
														var newResourceRow = null;
														var noOverlapExists = true;
														var isWorkDayAllocation = true;
														var arrTimeOffConflict = [];

														if (resourceId == newResourceId) { // resource not changed.
															return;
														}

														resourceNode.eachChild(function (child) {
															var projectId = child.get('projectId');
															var taskId = child.get('taskId');
															var newRowId = [newResourceId, projectId, taskId].join(RA.App.Constant.SEPARATOR_ID);
															var allocations = chartEvent.queryBy(function (record) {
																return (
																	record.get('resourceId') == resourceId &&
																	record.get('projectId') == projectId &&
																	record.get('taskId') == taskId &&
																	record.get('allocId') != 0 // allocs from previous resource.
																);
															});

															// check that allocations will fit into the target resource's work calendar
															allocations.each(function (element, index, len) {
																var startDate = element.get('startTimestamp');
																var lastDate = element.getLastDate();

																isWorkDayAllocation = chartEvent.isStartEndValid(startDate, lastDate, newResourceId, newResource.raw.workCalendarRecord);

																if (RA.Util.WorkCalendar.isBetweenResourceTimeOff(newResourceId, startDate, lastDate)) {
																	var startConflict = nlapiDateToString(startDate);
																	var endConflict = nlapiDateToString(lastDate);
																	var strEndDate = '';

																	if (endConflict != startConflict) {
																		strEndDate = ' to ' + endConflict;
																	}
																	arrTimeOffConflict.push('\u2022' + startConflict + strEndDate);
																}


																return isWorkDayAllocation; // exit if at least one allocation encounter problem
															});

															if (!(isWorkDayAllocation && arrTimeOffConflict.length == 0)) {
																return;
															}


															// check for overlaps by project/task
															if (chartResource.isRowExisting(newRowId)) {
																allocations.each(function (element, index, len) {
																	var startTime = element.get('startTimestamp').getTime();
																	var endTime = element.get('endTimestamp').getTime() - 1;
																	var rowId = [newResourceId, element.get('projectId'), element.get('taskId')].join(RA.App.Constant.SEPARATOR_ID);

																	noOverlapExists = !(chartEvent.withOverlaps(rowId, startTime, endTime));

																	return noOverlapExists; // if false (with overlaps), exit each function.
																});

																if (!noOverlapExists) {
																	return;
																}
															}
														});

														if (!isWorkDayAllocation) {
															alert(translatedStrings.getText('MESSAGE.ERROR.RA_NON_WORKING_DAY'));
															return;
														}

														if (arrTimeOffConflict.length) {
															var strConfirm = translatedStrings.getText('MESSAGE.WARNING.RA_TIMEOFF_CONFLICT') + '\n' +
																			 arrTimeOffConflict.join('\n') + '\n' +
																			 translatedStrings.getText('DO_YOU_WANT_TO_PROCEED');
															if (!confirm(strConfirm)) {
																return;
															}
														}

														if (!noOverlapExists) {
															alert(translatedStrings.getText('MESSAGE.ERROR.REASSIGN_RA_OVERLAP'));
															return;
														}

														if (chartResource.isRowExisting(newResourceId)) {
															// target resource row exists, store in var.
															newResourceRow = chartResource.getResourceObjByRow(newResourceId);
														} else {
															// target resource row does not exist, update current resource row details.
															chartResource.updateResourceRow(resourceNode, newResourceId, newResource);
														}

														// update all allocations to new resource by project/task
														resourceNode.eachChild(function (projectNode) {
															var projectId = projectNode.get('projectId');
															var taskId = projectNode.get('taskId');
															var newRowId = [newResourceId, projectId, taskId].join(RA.App.Constant.SEPARATOR_ID);
															var allocations = chartEvent.queryBy(function (record) {
																return (
																	record.get('resourceId') == resourceId &&
																	record.get('projectId') == projectId &&
																	record.get('taskId') == taskId &&
																	record.get('allocId') != 0 // allocs from previous resource.
																);
															});

															if (newResourceRow && !chartResource.isRowExisting(newRowId)) {
																// target resource already exists, transfer children from prev to new.
																var copy = projectNode.copy();
																copy.beginEdit();
																copy.set('Id', newRowId);
																copy.set('resourceId', newResourceId);
																copy.set('parentId', newResourceId);
																copy.endEdit();
																newResourceRow.appendChild(copy);
															} else {
																// target resource does not exist, editing the current project row details.
																chartResource.updateProjectRow(projectNode, newResourceId, projectId, taskId, newResource);
															}

															RA.App.Grid.reallocate(allocations, newResourceId, projectId, taskId, projectNode.getRootWorkCalendar(), projectNode.raw.resourceName);
														});

														if (newResourceRow) {
															resourceNode.removeAll();
															resourceNode.remove();
														}

														chartEvent.refreshRollUpsByResource(newResourceId);
														RA.App.Stores.gridStore.transformChartData();
														RA.App.Filters.disableFilter();
														RA.App.Forms.fieldEditorForm.hide();
													}
												};

												RA.App.Forms.fieldEditorForm.initForm({
													recordType: 'resource',
													formTitle: translatedStrings.getText('MENU.EDIT_RESOURCE'),
													value: resourceId,
													text: resourceName,
													okActionFn: okActionFn
												});
											}
										}, {
											id: 'ra-grid-axn-hdr-menu-' + (rowIndex + 1) + '-6',
											text: translatedStrings.getText('MENU.REMOVE_ALLOCATIONS'),
											disabled: RA.App.Stores.gridStore.hasProjectTemplate(record),
											handler: function (item, event) {
												var confirmationMessage = translatedStrings.getText('MESSAGE.WARNING.DELETE_ALLOCATIONS');
												var rec = item.parentMenu.actionParams.record;
												if (confirm(confirmationMessage)) {
													perfTestLogger.start('Remove Allocations');
													RA.App.Stores.gridStore.deleteResourceAllocations(rec.get('cellid'));
													perfTestLogger.stop();
												}
											}
										}
									]
								});
							}

							if (RA.App.Filters.filter.data.viewByType == 1) {
								//todo: remove this if view mode for Grid is lifted
								this.menu.showAt(event.getXY());
							}
						}
					}
				},
				renderer: function (value, metaData, record, row, col, store, view) {
					if (value == 'row' || value == 'menu') {
						metaData.tdCls = 'ra-grid-lpane-' + (row + 1) + '-' + (col + 1) + ' ' + 'ra-action-cell-icon';
					} else {
						metaData.tdCls = 'ra-grid-lpane-' + (row + 1) + '-' + (col + 1);
					}
					return '';
				}
			})
		);

		mainColumns.push(
			Ext4.create('RA.Cmp.GridTreeColumn', {
				id: 'ra-grid-rsc-hdr',
				dataIndex: 'name',
				lockable: false,
				text: '<div id="ra-grid-search-container"></div>',
				listeners: {
					headertriggerclick: function (ct, column, e, t, eOpts) {
						var menu = ct.getMenu();
						menu.id = 'ra-grid-column-menu';
						menu.items.items[3].id = 'ra-grid-column-menu-cols';
						var columnmenu = menu.items.items[3].menu;
						columnmenu.items.items[0].cls = 'ra-grid-column-menu-cols-customer';
						columnmenu.items.items[1].cls = 'ra-grid-column-menu-cols-restype';
						columnmenu.items.items[2].cls = 'ra-grid-column-menu-cols-supervisor';
						columnmenu.items.items[3].cls = 'ra-grid-column-menu-cols-comments';
					}
				},
				onTitleElClick: function (e, t) {
					// overrides the method from Ext.grid.column.Column

					var me = this;
					var ownerHeaderCt = me.getOwnerHeaderCt();

					if (ownerHeaderCt && !ownerHeaderCt.ddLock) {
						if (me.triggerEl && (e.target === me.triggerEl.dom || t === me.triggerEl.dom || e.within(me.triggerEl))) {
							ownerHeaderCt.onHeaderTriggerClick(me, e, t);
						}
					}
				},
				setSortState: function (state, skipClear, initial) {
					// overrides the method from Ext.grid.column.Column

					var me = this;
					var ownerHeaderCt = me.getOwnerHeaderCt();
					var oldSortState = me.sortState;

					state = state || null;

					if (!me.sorting && oldSortState !== state && (me.getSortParam() != null)) {

						if (state && !initial) {
							me.sorting = true;
							me.doSort(state);
							me.sorting = false;
						}
						if (ownerHeaderCt && !me.triStateSort && !skipClear) {
							ownerHeaderCt.clearOtherSortStates(me);
						}
						me.sortState = state;

						if (me.triStateSort || state != null) {
							ownerHeaderCt.fireEvent('sortchange', ownerHeaderCt, me, state);
						}
					}
				}
			})
		);

		mainColumns.push(
			Ext4.create('RA.Cmp.GridLockedColumn', {
				id: 'ra-grid-ptask-hdr',
				dataIndex: 'task',
				text: translatedStrings.getText('DISPLAY.PROJECT_TASK'),
				hideable: false,
				lockable: false,
				menuDisabled: true
			})
		);

		mainColumns.push(
			Ext4.create('RA.Cmp.GridLockedColumn', {
				id: 'ra-grid-dtl-hdr-1',
				dataIndex: 'customer',
				text: translatedStrings.getText('DISPLAY.CUSTOMER'),
				hideable: true,
				lockable: false,
				menuDisabled: true,
				listeners: {
					show: function () {
						//perfTestLogger.start('Show Column (Customer)');
						Ext4.getCmp('ra-grid').changeSettings('show', 0);
						this.setWidth(75);
					},
					hide: function () {
						//perfTestLogger.start('Hide Column (Customer)');
						Ext4.getCmp('ra-grid').changeSettings('hide', 0);
					}
				}
			})
		);

		mainColumns.push(
			Ext4.create('RA.Cmp.GridLockedColumn', {
				id: 'ra-grid-dtl-hdr-2',
				dataIndex: 'restype',
				text: translatedStrings.getText('DISPLAY.RESOURCE_TYPE'),
				hideable: true,
				lockable: false,
				menuDisabled: true,
				listeners: {
					show: function () {
						//perfTestLogger.start('Show Column (Resource Type)');
						Ext4.getCmp('ra-grid').changeSettings('show', 1);
						this.setWidth(110);
					},
					hide: function () {
						//perfTestLogger.start('Hide Column (Resource Type)');
						Ext4.getCmp('ra-grid').changeSettings('hide', 1);
					}
				}
			}));

		mainColumns.push(
			Ext4.create('RA.Cmp.GridLockedColumn', {
				id: 'ra-grid-dtl-hdr-3',
				dataIndex: 'supervisor',
				text: translatedStrings.getText('DISPLAY.SUPERVISOR'),
				hideable: true,
				lockable: false,
				menuDisabled: true,
				listeners: {
					show: function () {
						//perfTestLogger.start('Show Column (Supervisor)');
						Ext4.getCmp('ra-grid').changeSettings('show', 2);
						this.setWidth(80);
					},
					hide: function () {
						//perfTestLogger.start('Hide Column (Supervisor)');
						Ext4.getCmp('ra-grid').changeSettings('hide', 2);
					}
				}
			}));

		mainColumns.push(
			Ext4.create('RA.Cmp.GridCommentColumn', {
				id: 'ra-grid-dtl-hdr-4',
				dataIndex: 'comments',
				text: translatedStrings.getText('DISPLAY.COMMENTS'),
				hideable: true,
				lockable: false,
				menuDisabled: true,
				listeners: {
					show: function () {
						//perfTestLogger.start('Show Column (Comments)');
						Ext4.getCmp('ra-grid').changeSettings('show', 3);
						this.setWidth(85);
					},
					hide: function () {
						//perfTestLogger.start('Hide Column (Comments)');
						Ext4.getCmp('ra-grid').changeSettings('hide', 3);
					}
				}
			}));

		for (var i = 1; i <= 14; i++) {
			mainColumns.push(
				Ext4.create('RA.Cmp.GridDateColumn', {
					id: 'ra-grid-col-hdr-' + i,
					dataIndex: 'w' + i
				}));
		}

		Ext4.applyIf(this, {
			store: RA.App.Stores.gridStore,
			plugins: [
				this.cellEditor
			],
			columns: mainColumns,
			changeSettings: function (mode, index) {
				var settings = RA.App.Settings;
				var columns = settings.get('hiddenColumns').split('/');
				settings.beginEdit();
				switch (mode) {
					case 'hide':
						columns[index] = 'T';
						settings.set('hiddenColumns', columns[0] + '/' + columns[1] + '/' + columns[2] + '/' + columns[3]);
						break;
					case 'show':
						columns[index] = 'F';
						settings.set('hiddenColumns', columns[0] + '/' + columns[1] + '/' + columns[2] + '/' + columns[3]);
						break;
				}
				settings.endEdit();
				RA.App.Stores.settingStore.sync();
			}
		});
		this.callParent(args);
	},
	listeners: {
		columnschanged: function () {
			//perfTestLogger.stop();
		},
		boxready: function (grid) {

			grid.lockedGrid.on('itemcollapse', function (gridNode) {
				var nodeId = gridNode.get('cellid');
				var resourceObj = RA.App.Stores.chartResource.getResourceObjByRow(nodeId);

				RA.App.Stores.settingStore.handleRowCollapse(nodeId);

				resourceObj.suspendEvents();
				resourceObj.collapse();
				resourceObj.resumeEvents();

				if (!RA.App.Settings.collapseAll) RA.App.Stores.settingStore.sync();
			});
			grid.lockedGrid.on('itemexpand', function (gridNode) {
				var nodeId = gridNode.get('cellid');
				var resourceObj = RA.App.Stores.chartResource.getResourceObjByRow(nodeId);

				RA.App.Stores.settingStore.handleRowExpand(nodeId);

				resourceObj.suspendEvents();
				resourceObj.expand();
				resourceObj.resumeEvents();

				if (!RA.App.Settings.expandAll) RA.App.Stores.settingStore.sync();
			});

			RA.App.clipboard = {};
			RA.App.clipboard[RA.Cmp.Store.GridAllocation.ViewPresets.DAILY] = Ext4.create('RA.Cmp.Clipboard');
			RA.App.clipboard[RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY] = Ext4.create('RA.Cmp.Clipboard');
			RA.App.clipboard[RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY] = Ext4.create('RA.Cmp.Clipboard');

			var columnHeader = Ext4.get('ra-grid-search-container');
			Ext4.create('Ext4.panel.Panel', {
				id: 'ra-gridResourceColumn',
				renderTo: columnHeader,
				height: 30,
				layout: {
					type: 'hbox',
					align: 'middle'
				},
				border: false,
				defaults: {
					margin: '0 0 0 5'
				},
				items: [
					Ext4.create('RA.Cmp.SearchResource', {
						id: 'ra-grid-resource-search',
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

			var actionColumnHeader = Ext4.get('ra-grid-action-container');
			Ext4.create('Ext4.panel.Panel', {
				id: 'ra-gridActionColumnHeader',
				renderTo: actionColumnHeader,
				height: 30,
				layout: {
					type: 'hbox',
					align: 'middle'
				},
				border: false,
				defaults: {
					margin: '0 0 0 0'
				},
				items: [
					Ext4.create('RA.Cmp.IconButton', {
						cls: 'ra-action-header-icon',
						width: 30,
						height: 30,
						handler: function (button, e) {
							var menu = Ext4.get('ra-grid-axn-hdr-menu');
							if (menu) {
								menu.destroy();
							}
							menu = Ext4.create('Ext4.menu.Menu', {
								id: 'ra-grid-axn-hdr-menu',
								margin: '0 0 10 0',
								floating: true,
								items: [
									{
										id: 'ra-grid-axn-hdr-menu-7',
										text: translatedStrings.getText('MENU.ADD_RESOURCE'),
										handler: function () {
											var okActionFn = function () {
												var resource = RA.App.Forms.fieldEditorForm.getField().getValue();

												if (resource) {
													var resourceId = resource.get('id');

													if (RA.App.Stores.gridStore.getRootNode().findChild('resourceId', resourceId)) {
														alert(translatedStrings.getText('MESSAGE.ERROR.DUPLICATE_RESOURCE'));
														return;
													}

													RA.App.Stores.chartResource.addNewResourceRow(resource);

													RA.App.Stores.gridStore.transformChartData();

													RA.App.Filters.disableFilter();
													RA.App.Forms.fieldEditorForm.hide();
												}
											};

											RA.App.Forms.fieldEditorForm.initForm({
												recordType: 'resource',
												formTitle: translatedStrings.getText('MENU.ADD_RESOURCE'),
												value: null,
												text: null,
												okActionFn: okActionFn
											});
										}
									}
								],
								listeners: {
									beforeshow: function (menu) {
										var addResourceBtn = menu.items.getAt(0);
										if (RA.App.Settings.get('includeAllResources') == 'T') {
											addResourceBtn.disable();
										} else {
											addResourceBtn.enable();
										}
									}
								}
							});

							if (RA.App.Filters.filter.data.viewByType == 1) {
								//todo: remove this if view mode for Grid is lifted
								menu.showAt(e.getXY());
							}

						}
					})
				]
			});

			grid.updateColumns();

			this.autofit();
			this.mask();

			var width = Ext4.getCmp('ra-grid-resource-search').getWidth() + 23;
			Ext4.getCmp('ra-gridResourceColumn').setWidth(width);
			Ext4.getCmp('ra-grid-rsc-hdr').setWidth(width);
			Ext4.getCmp('ra-grid-rsc-hdr').fireEvent('resize');
		},
		cellclick: function (me, td, cellIndex, record, tr, rowIndex, e, eOpts) {
			// only allow drill down when the CTRL key is pressed
			if (e.ctrlKey && record.data.leaf) {

				// cancel the editor since it is also triggered when single click
				me.editingPlugin.cancelEdit();

				// prevent drill down if preset is already daily
				if (this.getViewPreset() != RA.Cmp.Store.GridAllocation.ViewPresets.DAILY) {
					Ext4.getCmp('ra-grid').drillDown(cellIndex + 1);
				}
			}
		},
		afterrender: function () {
			var settings = RA.App.Settings;
			var columns = settings.get('hiddenColumns').split('/');
			for (var i = 0, ii = columns.length; i < ii; i++) {
				var id = 'ra-grid-dtl-hdr-' + (i + 1);
				if (columns[i] == 'T')
					Ext4.getCmp(id).hide();
			}

			// add a scroll event handler to the view and store the top position
			this.view.getEl().on('scroll', function (e, t) {
				RA.App.Grid.scrollPosition = t.scrollTop;
			});
		},
		cellcontextmenu: function (grid, td, cellIndex, record, tr, rowIndex, event, eOpts) {
			event.preventDefault();
			var pane = grid.id;

			if (record.get('leaf') && !(record.get('w' + (cellIndex + 1)).hasMultipleAlloc) && (pane.search('gridview') == 0)) {


				if (RA.App.Filters.filter.data.viewByType == 1 &&
					record.get('status') == 'template') {
					// prevent cell context menu on Project Template
					return;
				} else if (RA.App.Filters.filter.data.viewByType == 3) {
					var projectId = record.get('projectId');
					var ret = false;
					RA.App.Stores.gridStore.getRootNode().eachChild(function (proj) {
						// check on status of parent project
						var iterId = proj.getId();
						if (Number(projectId) == Number(iterId) &&
							proj.get('status') == 'template') {
							ret = true;
						}
					});
					if (ret) {
						// prevent cell context menu on Project Template
						return;
					}
				}

				var stores = RA.App.Stores;
				var chartEvent = stores.chartEvent;
				var weekNum = 'w' + (cellIndex + 1);
				var recordWx = record.get(weekNum);
				var allocRecord = chartEvent.query('allocId', recordWx.allocId).items[0];

				if (allocRecord.isRecurring()) {

					RA.App.Grid.showDisabledContextMenu(tr, cellIndex);

				} else {

					var allocTypeStore = stores.allocTypeStore;

					if (!RA.App.cellContextMenu) {

						var approvalEnabled = stores.featureStore.getById('approvalWorkFlow').get('isEnabled');

						RA.App.cellContextMenu = Ext4.create('RA.Cmp.ContextMenu', {
							items: [
								{
									id: 'ra-context-menu-cut',
									text: translatedStrings.getText('MENU.CUT'),
									handler: function (item, event) {
										perfTestLogger.start('Cut');
										var params = item.up().params;
										var record = params.record;
										var rec = params.recordWx;
										var alloc = {
											originalValue: rec,
											value: 0,
											row: params.rowIndex,
											col: params.cellIndex,
											field: params.weekNum,
											allocType: '',
											approverId: ''
										};

										RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].hours = rec.totalHours;
										RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].type = rec.allocType;
										RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].approver = rec.approverId;

										RA.App.Grid.cellEditor.editCellAllocation(null, alloc, null, true, record);
										perfTestLogger.stop();
									}
								}, {
									id: 'ra-context-menu-copy',
									text: translatedStrings.getText('MENU.COPY'),
									handler: function (item, event) {
										perfTestLogger.start('Copy');
										var params = item.up().params;
										var rec = params.recordWx;
										RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].hours = rec.totalHours;
										RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].type = rec.allocType;
										RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].approver = rec.approverId;
										perfTestLogger.stop();
									}
								}, {
									id: 'ra-context-menu-paste',
									text: translatedStrings.getText('MENU.PASTE'),
									handler: function (item, event) {
										perfTestLogger.start('Paste');
										var params = item.up().params;
										var record = params.record;
										var alloc = {
											originalValue: params.recordWx,
											value: RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].hours,
											allocType: RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].type,
											approverId: RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].approver,
											row: params.rowIndex,
											col: params.cellIndex,
											field: params.weekNum
										};
										RA.App.Grid.cellEditor.editCellAllocation(null, alloc, null, true, record);
										perfTestLogger.stop();
									}
								}, {
									xtype: 'menuseparator'
								}, {
									id: 'ra-context-menu-alloctype',
									handler: function (item, event) {
										var params = item.up().params;
										var allocRecord = params.allocRecord;
										var pendingApproval = RA.App.Constant.PENDING_APPROVAL;
										var pendingApprovalText = stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name');
										var approvalEnabled = stores.featureStore.getById('approvalWorkFlow').get('isEnabled');

										perfTestLogger.start('Edit Allocation Type to ' + params.newAllocType);

										allocRecord.beginEdit();
										if (approvalEnabled) {
											allocRecord.set('approvalStatus', pendingApproval);
											allocRecord.set('tipAppStatus', pendingApprovalText);
										}

										allocRecord.set('type', params.newAllocType);
										allocRecord.endEdit();
										perfTestLogger.stop();
									}
								}, {
									id: 'ra-context-menu-enddate',
									text: translatedStrings.getText('MENU.EDIT_END_DATE'),
									handler: function (item, event) {
										var params = item.up().params;
										var cls = params.cls.split(RA.App.Constant.SEPARATOR_ID).join('-'); // RACG DOM elements use '-', not '~' as a separator in CSS classes
										var endDateEditor = RA.App.GridEditor.endDateEditor;

										endDateEditor.reset();

										endDateEditor.allocRecord = params.allocRecord;
										endDateEditor.gridRecord = params.record;
										endDateEditor.weekNum = params.weekNum;

										endDateEditor.setValue(allocRecord.get('endTimestamp'));

										var endDateWindow = Ext4.WindowManager.get('ra-endDateWindow');
										if (!endDateWindow) {
											endDateWindow = Ext4.create("Ext4.window.Window", {
												id: 'ra-endDateWindow',
												header: false,
												width: 200,
												height: 30,
												bodyStyle: 'padding: 5px',
												closeAction: 'hide',
												resizable: false,
												items: endDateEditor
											});
										}

										var closeWin = function (e, t) {
											var el = endDateWindow.getEl();
											if (!(el.dom === t || el.contains(t))) {
												Ext4.getBody().un('click', closeWin);
												endDateWindow.close();
											}
										};
										Ext4.getBody().on('click', closeWin);

										endDateWindow.showBy(Ext4.query(cls)[0], 'tr'); // tr = top right of target.
									}
								}, {
									xtype: 'menuseparator',
									hidden: !approvalEnabled
								}, {
									id: 'ra-context-menu-approver',
									text: translatedStrings.getText('MENU.EDIT_NEXT_APPROVER'),
									hidden: !approvalEnabled, // hide if approval routing is disabled
									handler: function (item, event) {
										var params = item.up().params;
										var gridRow = params.record;
										var weekNum = params.weekNum;
										var allocation = params.allocRecord;
										var approverId = allocation ? allocation.get('nextApprover') : null;
										var approverName = allocation ? allocation.get('nextApproverName') : null;

										var okActionFn = function () {
											var approver = RA.App.Forms.fieldEditorForm.getField().getValue();

											if (approver) {
												var newApproverId = approver.get('id');

												if (newApproverId == approverId) {
													return;
												}

												var newApproverName = approver.get('name');

												allocation.beginEdit();
												allocation.set('nextApprover', newApproverId);
												allocation.set('nextApproverName', newApproverName);
												allocation.set('tipApprover', newApproverName);
												allocation.set('approvalStatus', RA.App.Constant.PENDING_APPROVAL);
												allocation.set('tipAppStatus', RA.App.Stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name'));
												allocation.endEdit();

												gridRow.get(weekNum).approverId = newApproverId;

												RA.App.Filters.disableFilter();
												RA.App.Forms.fieldEditorForm.hide();
											}
										};

										RA.App.Forms.fieldEditorForm.initForm({
											recordType: 'approver',
											formTitle: translatedStrings.getText('MENU.EDIT_NEXT_APPROVER'),
											value: approverId,
											text: approverName,
											okActionFn: okActionFn
										});
									}
								}, {
									xtype: 'menuseparator'
								}, {
									id: 'ra-context-menu-reallocate',
									text: translatedStrings.getText('MENU.REASSIGN_ALLOCATION'),
									handler: function (item) {
										var projectRow = item.up().params.record;
										var allocation = item.up().params.allocRecord;
										var resourceId = allocation.get('resourceId');
										var resourceName = allocation.get('resourceName');

										var okActionFn = function () {
											var newResource = RA.App.Forms.fieldEditorForm.getField().getValue();

											if (newResource) {
												var chartResource = RA.App.Stores.chartResource;
												var chartEvent = RA.App.Stores.chartEvent;
												var projectNode = chartResource.getResourceObjByRow(projectRow.get('cellid'));
												var resourceId = projectRow.get('resourceId');
												var projectId = projectRow.get('projectId');
												var taskId = projectRow.get('taskId');
												var newResourceId = newResource.get('id');
												var newResourceName = newResource.get('name');
												var newRowId = (RA.App.Filters.filter.data.viewByType == 3)
															   ? [projectId, newResourceId].join(RA.App.Constant.SEPARATOR_ID)
															   : [newResourceId, projectId, taskId].join(RA.App.Constant.SEPARATOR_ID);
												var noOverlapExists = true;
												var noNonWorkingStartEndDates = true;
												var arrTimeOffConflict = [];
												var newResourceRow = null;
												var workCalendarId = newResource.raw.workCal;
												var workCalendar = newResource.raw.workCalendarRecord;

												if (resourceId == newResourceId) { // resource not changed
													return true;
												}

												var projAllocations = new Ext4.util.MixedCollection();
												projAllocations.add(allocation);

												// check for overlaps
												if (chartResource.isRowExisting(newRowId)) {
													// target project row exists, check overlaps
													projAllocations.each(function (element, index, len) {
														var startTime = element.get('startTimestamp').getTime();
														var endTime = element.get('endTimestamp').getTime() - 1;

														noOverlapExists = !(chartEvent.withOverlaps(newRowId, startTime, endTime));

														return noOverlapExists;
													});
												}

												if (!noOverlapExists) {
													alert(translatedStrings.getText('MESSAGE.ERROR.REASSIGN_RA_OVERLAP'));
													return;
												}

												projAllocations.each(function (element, index, len) {
													var startDate = element.get('startTimestamp');
													var lastDate = element.getLastDate();

													noNonWorkingStartEndDates = RA.Util.WorkCalendar.isWorkDay(startDate, workCalendar) &&
																				RA.Util.WorkCalendar.isWorkDay(lastDate, workCalendar);

													if (RA.Util.WorkCalendar.isBetweenResourceTimeOff(newResourceId, startDate, lastDate)) {
														var startConflict = nlapiDateToString(startDate);
														var endConflict = nlapiDateToString(lastDate);
														var strEndDate = '';

														if (endConflict != startConflict) {
															strEndDate = ' to ' + endConflict;
														}
														arrTimeOffConflict.push('\u2022' + startConflict + strEndDate);
													}
													return noNonWorkingStartEndDates;
												});

												if (!noNonWorkingStartEndDates) {
													alert(translatedStrings.getText('MESSAGE.ERROR.RA_NON_WORKING_DAY'));
													return;
												}

												if (arrTimeOffConflict.length) {
													var strConfirm = translatedStrings.getText('MESSAGE.WARNING.RA_TIMEOFF_CONFLICT') + '\n' +
																	 arrTimeOffConflict.join('\n') + '\n' +
																	 translatedStrings.getText('DO_YOU_WANT_TO_PROCEED');
													if (!confirm(strConfirm)) {
														return;
													}
												}

												var rowId = (RA.App.Filters.filter.data.viewByType == 3)
															? projectNode.parentNode.data.Id
															: newResourceId;

												if (chartResource.isRowExisting(rowId)) {
													// target resource row exists, store in var.
													newResourceRow = chartResource.getResourceObjByRow(rowId);
												} else {
													// target resource row does not exist, update current resource row details.
													newResourceRow = chartResource.addNewResourceRow(newResource);
												}

												if (!chartResource.isRowExisting(newRowId)) {
													// target resource already exists, transfer children from prev to new.
													var copy = null;

													if (RA.App.Filters.filter.data.viewByType == 3) {
														copy = chartResource.addNewResourceRow(newResource);
														copy.beginEdit();
														copy.set('Id', newRowId);
														copy.set('resourceId', newResourceId);
														copy.set('parentId', projectId);
														copy.set('ResourceId', newRowId);
														copy.set('customerId', projectNode.data.customerId);
														copy.set('customer', projectNode.data.customer);
														copy.set('projectId', projectId);
														copy.set('resourceName', newResourceName);
														copy.set('Name', newResourceName);
														copy.endEdit();
													} else {
														copy = projectNode.copy();
														copy.beginEdit();
														copy.set('Id', newRowId);
														copy.set('resourceId', newResourceId);
														copy.set('parentId', newResourceId);
														copy.set('ResourceId', newResourceId);
														copy.endEdit();
													}

													newResourceRow.appendChild(copy);
												}

												var nameInLeftPanel = (RA.App.Filters.filter.data.viewByType == 3)
																	  ? newResourceName
																	  : projectNode.raw.resourceName;

												// update allocations to new project row.
												RA.App.Grid.reallocate(projAllocations, newResourceId, projectId, taskId, projectNode.getRootWorkCalendar(), nameInLeftPanel);

												chartEvent.refreshRollUpsByResource(resourceId);
												chartEvent.refreshRollUpsByResource(newResourceId);

												if (RA.App.Chart) {
													RA.App.Chart.refreshNonWorking();
												}

												RA.App.Stores.gridStore.transformChartData();
												RA.App.Filters.disableFilter();
												RA.App.Forms.fieldEditorForm.hide();
											}
										};

										RA.App.Forms.fieldEditorForm.initForm({
											recordType: 'resource',
											formTitle: translatedStrings.getText('MENU.REASSIGN_ALLOCATION'),
											value: resourceId,
											text: resourceName,
											okActionFn: okActionFn
										});
									}
								},
								{
									xtype: 'menuseparator'
								},
								{
									id: 'ra-context-menu-comment',
									text: translatedStrings.getText('MENU.EDIT_COMMENT'),
									handler: function (item, event) {
										var params = item.up().params;
										var cls = params.cls.split(RA.App.Constant.SEPARATOR_ID).join('-'); // RACG DOM elements use '-', not '~' as a separator in CSS classe
										var commentEditor = RA.App.GridEditor.commentEditor;
										var allocComment = params.allocRecord.get('comment');

										commentEditor.reset();

										commentEditor.allocRecord = params.allocRecord;
										commentEditor.gridRecord = params.record;
										commentEditor.weekNum = params.weekNum;

										if (allocComment != null) {
											commentEditor.setValue(allocComment);
										}

										var commentWindow = Ext4.WindowManager.get('ra-commentWindow');
										if (!commentWindow) {
											commentWindow = Ext4.create("Ext4.window.Window", {
												id: 'ra-commentWindow',
												header: false,
												width: 370,
												height: 110,
												bodyStyle: 'padding: 5px',
												closeAction: 'hide',
												resizable: false,
												items: commentEditor
											});
										}

										var closeWin = function (e, t) {
											var el = commentWindow.getEl();
											if (!(el.dom === t || el.contains(t))) {
												Ext4.getBody().un('click', closeWin);
												commentWindow.close();
											}
										};
										Ext4.getBody().on('click', closeWin);

										commentWindow.showBy(Ext4.query(cls)[0], 'tr'); // tr = top right of target.
									}
								}
							],
							listeners: {
								beforeshow: function (menu, options) {
									var params = menu.params;
									var allocRecord = params.allocRecord;
									var taskId = allocRecord ? allocRecord.get('taskId') : 0;
									var disabled = Boolean(taskId) || !params.recordWx.allocId;
									var pasteItem = menu.down('#ra-context-menu-paste');
									var editAllocItem = menu.down('#ra-context-menu-alloctype');
									var editEndDateItem = menu.down('#ra-context-menu-enddate');
									var editApproverItem = menu.down('#ra-context-menu-approver');
									var reallocateItem = menu.down('#ra-context-menu-reallocate');
									var editCommentItem = menu.down('#ra-context-menu-comment');
									var typeTranslated = RA.App.Stores.allocTypeStore.getAt(allocTypeStore.findExact('key', params.newAllocType)).get('name');

									editAllocItem.setText([translatedStrings.getText('MENU.EDIT_ALLOCATION_TYPE'), ' "', typeTranslated, '"'].join(''));
									pasteItem.setDisabled(RA.App.clipboard[RA.Cmp.Store.GridAllocation.viewPreset].hours == 0);

									editAllocItem.setDisabled(disabled);
									editEndDateItem.setDisabled(disabled);
									editApproverItem.setDisabled(disabled);
									reallocateItem.setDisabled(disabled);
									editCommentItem.setDisabled(disabled);
								}
							}
						});
					}

					var currentAllocType = (allocRecord ? allocRecord.get('type') : allocTypeStore.getById(1).get('key')); // Do not translate until core supports translation for Allocation Type!

					RA.App.cellContextMenu.params = {
						record: record,
						recordWx: recordWx,
						weekNum: weekNum,
						allocRecord: allocRecord,
						currentAllocType: currentAllocType,
						cellIndex: cellIndex,
						rowIndex: rowIndex,
						cls: ['.ra-grid-rpane', (rowIndex + 1), (cellIndex + 1)].join(RA.App.Constant.SEPARATOR_ID),
						newAllocType: (allocTypeStore.getAt(0).get('key') == currentAllocType)
									  ? allocTypeStore.getAt(1).get('key')
									  : allocTypeStore.getAt(0).get('key')
					};

					RA.App.cellContextMenu.showAt(event.getXY());
				}
			}
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
	/*
	 * Custom RAG methods
	 */
	/*
	 * fits locked and date columns into the grid's current visible width to minimize horizontal scroll
	 * mode = left/right/both to fit left only, right only, or both
	 */
	fitColumns: function (mode) {
		/*
		 * setup the following parameters (run once)
		 * 1. total width of fixed-width columns (currently, the action column is the only member of this category)
		 * 2. array reference to left pane columns (excluding fixed-width) & right pane columns
		 * 3. initial width of the left pane, which is 1/4 of the grid's width on load
		 */
		if (this.fixedColsWt == undefined) {
			this.fixedColsWt = 0;
			this.lockedCols = new Array();
			this.dateCols = new Array();
			for (var i = 0; i < this.columns.length; i++) {
				var column = this.columns[i];
				if (column.$className == 'RA.Cmp.GridActionColumn') this.fixedColsWt += column.width;
				if (column.$className == 'RA.Cmp.GridTreeColumn' || column.$className == 'RA.Cmp.GridLockedColumn') this.lockedCols.push(column);
				else if (column.$className == 'RA.Cmp.GridDateColumn') this.dateCols.push(column);
			}
			this.lockedPaneWt = Math.floor((this.getWidth() - 1) / 4);
		}
		/*
		 * fit locked columns
		 */
		if (mode == 'left' || mode == 'both') {
			var lockedColWt = Math.floor((this.lockedPaneWt - this.fixedColsWt) / this.lockedCols.length);
			for (var i = 0; i < this.lockedCols.length; i++) {
				this.lockedCols[i].setWidth(lockedColWt);
			}
		}
		/*
		 * fit date columns to remaining width
		 */
		if (mode == 'right' || mode == 'both') {
			var dateColWt = Math.floor((this.getWidth() - 1 - this.lockedPaneWt) / this.dateCols.length);
			for (var i = 0; i < this.dateCols.length; i++) {
				this.dateCols[i].setWidth(dateColWt);
			}
		}
	},
	/*
	 * fits dimension of the grid according to current browser size
	 */
	autofit: function (chartOnly) {
		//perfTestLogger.startEvent('autofit');
		/*
		 * get total visible height then offset scheduler's y-coord. offset standard margin as well.
		 */
		var totalViewHeight = Ext4.getBody().getViewSize().height - Ext4.getBody().getPadding('t'); //padding only for 14.1
		var schedulerTop = Ext4.getCmp('ra-grid').getBox().top;
		var standardMargin = 20;
		var finalHeight = totalViewHeight - schedulerTop - standardMargin;
		/*
		 * set height
		 */
		if (this.getHeight() != finalHeight) this.setHeight(finalHeight);
		if (!chartOnly) {
			/*
			 * autofit menu and filters
			 */
			Ext4.getCmp('ra-menu').doLayout();
			Ext4.getCmp('advFilterMain').doLayout();
		}
		/*
		 * fit column width
		 */
		var fit;
		if (this.isFirstFit) {
			fit = 'both';
			this.isFirstFit = false;
		} else {
			fit = 'right';
		}
		this.fitColumns(fit);
		//perfTestLogger.stopEvent('autofit');
	},
	/*
	 * shift store data 1 column to the right & update headers
	 */
	shiftNext: function () {
		// take note of the current scroll position since setRootNode() is resetting it to 0
		var scrollPosition = this.scrollPosition;

		this.store.shiftNext();
		this.updateDateColHeaders();

		// restore scroll position
		this.scrollByDeltaY(scrollPosition);
	},
	/*
	 * shift store data 1 column to the left & update headers
	 */
	shiftPrevious: function () {
		// take note of the current scroll position since setRootNode() is resetting it to 0
		var scrollPosition = this.scrollPosition;

		this.store.shiftPrevious();
		this.updateDateColHeaders();

		// restore scroll position
		this.scrollByDeltaY(scrollPosition);
	},
	/*
	 * change view preset & update headers
	 */
	switchViewPreset: function (viewPreset, startDate) {
		// take note of the current scroll position since setRootNode() is resetting it to 0
		var scrollPosition = this.scrollPosition;

		if (viewPreset) {
			this.setViewPreset(viewPreset);
		}
		if (startDate) {
			this.setStartDate(startDate);
		}
		this.store.setViewPreset(this.getViewPreset(), Ext4.Date.format(this.getNewStartDate(), 'Y/m/d'));
		this.updateDateColHeaders();

		// restore scroll position
		this.scrollByDeltaY(scrollPosition);
	},
	/*
	 * update date column headers depending on start date & view preset
	 */
	updateDateColHeaders: function () {
		var nextDate = new Date(this.getStartDate());
		var preset = this.getViewPreset();
		var idPrefix = 'ra-grid-col-hdr-';
		var dateFormat;
		var headerTpl;
		var unit;

		var longDateFormat = RA.App.Context.getPreference('longdateformat');

		switch (preset) {
			case RA.Cmp.Store.GridAllocation.ViewPresets.DAILY:
				dateFormat = RA.Util.Date.getDateFormatForDailyPreset(longDateFormat);
				headerTpl = '{0}';
				unit = Sch.util.Date.DAY;
				break;
			case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
				dateFormat = RA.Util.Date.getDateFormatForWeeklyPreset(longDateFormat);
				headerTpl = '{0}';
				unit = Sch.util.Date.WEEK;
				break;
			case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
				dateFormat = RA.Util.Date.getDateFormatForMonthlyPreset(longDateFormat);
				headerTpl = '{0}';
				unit = Sch.util.Date.MONTH;
				break;
		}
		for (var i = 1; i <= 14; i++) {
			var date = Ext4.Date.format(nextDate, dateFormat);
			Ext4.getCmp(idPrefix + i).setText(Ext4.String.format(headerTpl, date));
			nextDate = Sch.util.Date.add(nextDate, unit, 1);
		}
		/*
		 * also update the range field label
		 */
		RA.App.RangeField.update();
	},
	getNewStartDate: function () {
		switch (this.getViewPreset()) {
			case RA.Cmp.Store.GridAllocation.ViewPresets.DAILY:
				return this.getStartDate();
			case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
				return this.store.getFirstDayOfWeek(this.getStartDate());
			case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
				return new Date(this.getStartDate().getFullYear(), this.getStartDate().getMonth(), 1);
		}
	},
	getStartDate: function () {
		var startDate = RA.Cmp.Store.GridAllocation.startDate;
		return startDate ? new Date(startDate) : this.store.getFirstDayOfWeek(new Date());
	},
	setStartDate: function (startDate) {
		RA.Cmp.Store.GridAllocation.startDate = Ext4.Date.format(startDate, 'Y/m/d');
	},
	getUnit: function () {
		switch (this.getViewPreset()) {
			case RA.Cmp.Store.GridAllocation.ViewPresets.DAILY:
				return Sch.util.Date.DAY;
			case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
				return Sch.util.Date.WEEK;
			case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
				return Sch.util.Date.MONTH;
		}
	},
	getEndDate: function () {
		return Sch.util.Date.add(this.getStartDate(), this.getUnit(), 14);
	},
	getViewPreset: function () {
		return RA.Cmp.Store.GridAllocation.viewPreset || RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY;
	},
	setViewPreset: function (viewPreset) {
		RA.Cmp.Store.GridAllocation.viewPreset = viewPreset;
	},
	drillDown: function (colIdx) {
		var newPreset = null;

		// change the preset and the toggled preset link
		switch (this.getViewPreset()) {
			case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
				Ext4.getCmp('ra-chartPresetDaily').toggle();
				newPreset = RA.Cmp.Store.GridAllocation.ViewPresets.DAILY;
				break;
			case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
				Ext4.getCmp('ra-chartPresetWeekly').toggle();
				newPreset = RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY;
				break;
		}

		if (newPreset) {
			this.switchViewPreset(newPreset, this.store.dateColHeaders['w' + colIdx].start);
		}
	},
	getSearchBoxText: function () {
		var searchCmp = Ext4.getCmp('ra-grid-resource-search');
		return searchCmp ? searchCmp.getValue() : '';
	},
	setSearchBoxText: function (searchText) {
		var searchCmp = Ext4.getCmp('ra-grid-resource-search');
		if (searchCmp) searchCmp.setValue(searchText);
	},
	reallocate: function (projAllocations, newResourceId, newProjectId, newTaskId, workCalendar, resourceName) {
		var stores = RA.App.Stores;
		var newRowId = (RA.App.Filters.filter.data.viewByType == 3)
					   ? [newProjectId, newResourceId].join(RA.App.Constant.SEPARATOR_ID)
					   : [newResourceId, newProjectId, newTaskId].join(RA.App.Constant.SEPARATOR_ID);
		var pendingApproval = RA.App.Constant.PENDING_APPROVAL;
		var pendingApprovalText = stores.appStatusStore.getById(RA.App.Constant.PENDING_APPROVAL).get('name');
		var approvalEnabled = stores.featureStore.getById('approvalWorkFlow').get('isEnabled');

		// update allocation details.
		projAllocations.each(function (element, index, length) {
			var resourceId = element.get('resourceId');

			element.beginEdit();
			element.set('ResourceId', newRowId); // row
			element.set('resourceId', newResourceId);
			if (resourceId != newResourceId) {
				element.set('tipResource', resourceName);
			}
			element.set('projectId', newProjectId);
			if (approvalEnabled) {
				element.set('approvalStatus', pendingApproval);
				element.set('tipAppStatus', pendingApprovalText);
			}
			element.endEdit();

			// update allocation's percentage
			element.computePercentage(workCalendar);
			element.set('Name', (RA.App.Filters.filter.data.viewByType == 3)
								? element.get('hour')
								: element.get('percent'));
		});
	},
	showDisabledContextMenu: function (domRow, col) {
		var disabledText = translatedStrings.getText('EDIT_NOT_AVAILABLE_IN_GRID_FOR_RECURRING');

		if (!this.disabledCtxMenu) {
			this.disabledCtxMenu = Ext4.create('RA.Cmp.ContextMenu', {
				items: [
					{
						text: disabledText,
						disabled: true,
						style: {
							opacity: 1
						}
					}
				]
			});
		}

		try {
			var tmp = domRow.childNodes[col].getClientRects()[0];
			var pos = [tmp.left + (tmp.width / 2), tmp.top + (tmp.height / 2)];

			this.disabledCtxMenu.showAt(pos);
		} catch (err) {
			alert(disabledText);
		}
	},
	print: function () {
		var colHeaders = RA.App.Stores.gridStore.dateColHeaders;
		var showTasks = RA.App.Settings.get('showProjectTasks') == 'T';
		var colHdrTds = '';
		var grdDtaTrs = '';
		var html = '';

		// build column header TDs
		for (var i = 0; i < 14; i += 2) {
			colHdrTds += '<td class="header" style="width:5%">' + colHeaders['w' + (i + 1)].label + '</td>';
			colHdrTds += '<td class="header">' + colHeaders['w' + (i + 2)].label + '</td>';
		}

		// build grid data TRs
		RA.App.Stores.gridStore.getRootNode().eachChild(function (resource) {

			// build rollup TDs
			var rollupTds = '';
			for (var i = 0; i < 14; i++) {
				rollupTds += '<td class="resource">' + Number(resource.get('w' + (i + 1)).totalHours).toFixed(2) + '</td>';
			}

			// build allocation row TRs
			var allocTrs = '';
			resource.eachChild(function (project) {
				// build allocation cell values
				var allocTds = '';
				for (var i = 0; i < 14; i++) {
					allocTds += '<td>' + Number(project.get('w' + (i + 1)).totalHours).toFixed(2) + '</td>';
				}

				allocTrs += [
					'<tr>',
					'<td class="name">' + project.get('name') + ' </td>',
					'<td' + (showTasks ? '' : ' style="display:none;"') + '>' + project.get('task') + '</td>',
					'<td>' + project.get('customer') + '</td>',
					'<td> </td>',
					'<td> </td>',
					'<td>' + project.get('comments') + '</td>',
					allocTds,
					'</tr>'
				].join('');

			});

			grdDtaTrs += [
				'<tr>',
				'<td class="resource name">' + resource.get('name') + '</td>',
				'<td class="resource"' + (showTasks ? '' : ' style="display:none;"') + '> </td>',
				'<td class="resource"> </td>',
				'<td class="resource">' + resource.get('restype') + '</td>',
				'<td class="resource">' + resource.get('supervisor') + '</td>',
				'<td class="resource">' + resource.get('comments') + '</td>',
				rollupTds,
				'</tr>',
				allocTrs
			].join('');

		});

		// build print html
		html += [
			'<html>',
			'<head>',
			'<title>' + translatedStrings.getText('APP.TITLE') + '</title>',
			'<style>',
			'table, td { border: 1px solid #E5E5E5; text-align: center; border-collapse: collapse; width: 100%; font-family: "Tahoma"; padding: 10px; font-size: 15px;}',
			'.header { font-size: 11px; color: #000000; text-transform: uppercase; background-color: #EAEAEA; padding: 15px; }',
			'.resource { background-color: #F0F0F0; }',
			'.name { color: #255599; }',
			'</style>',
			'</head>',
			'<body>',
			'<table>',
			'<tr>',
			'<td class="header" style="width:10%"> </td>',
			'<td class="header" style="width:5%;' + (showTasks
													 ? ''
													 : 'display:none;') + '">' + translatedStrings.getText('DISPLAY.PROJECT_TASK') + '</td>',
			'<td class="header" style="width:5%">' + translatedStrings.getText('DISPLAY.CUSTOMER') + '</td>',
			'<td class="header" style="width:5%">' + translatedStrings.getText('DISPLAY.RESOURCE_TYPE') + '</td>',
			'<td class="header" style="width:5%">' + translatedStrings.getText('DISPLAY.SUPERVISOR') + '</td>',
			'<td class="header" style="width:5%">' + translatedStrings.getText('DISPLAY.COMMENTS') + '</td>',
			colHdrTds,
			'</tr>',
			grdDtaTrs,
			'</table>',
			'</body>',
			'</html>'
		].join('');

		var win = window.open('', translatedStrings.getText('APP.TITLE'));
		win.document.open();
		win.document.write(html);
		win.document.close();
		win.print();
	},
	addRow: function (gridRow) {
		var gridRoot = this.store.getRootNode();

		if (gridRoot.childNodes && gridRoot.childNodes.length == 1) {
			this.store.removeNoResultNode();
		}

		gridRoot.insertChild(0, gridRow);
	},
	updateColumns: function () {
		var actionColumn = Ext4.getCmp('ra-grid-axn-hdr');
		var projectTaskColumn = Ext4.getCmp('ra-grid-ptask-hdr');
		var customerColumn = Ext4.getCmp('ra-grid-dtl-hdr-1');

		switch (RA.App.Filters.filter.data.viewByType) {
			case 1:
				actionColumn.show();
				customerColumn.show();
				if (RA.App.Settings.get('showProjectTasks') == 'T') {
					projectTaskColumn.show();
				} else {
					projectTaskColumn.hide();
				}
				break;
			case 2:
				actionColumn.hide();
				projectTaskColumn.hide();
				customerColumn.hide();
				break;
			case 3:
				actionColumn.hide();
				projectTaskColumn.hide();
				customerColumn.show();
				break;
		}
	}
});
