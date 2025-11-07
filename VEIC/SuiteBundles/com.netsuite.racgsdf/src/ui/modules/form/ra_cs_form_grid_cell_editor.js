/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.CellEditor', {
	extend: 'Ext4.grid.plugin.CellEditing',
	pluginId: 'cellplugin',
	clicksToEdit: 1,

	listeners: {
		beforeedit: function (editor, event) {
			var isEditable = true;

			if (event.field === 'comments') {
				if (
					(RA.App.Filters.filter.data.viewByType == 1 && !event.record.get('leaf')) ||
					(RA.App.Filters.filter.data.viewByType == 2 && event.record.get('depth') !== 2) ||
					(RA.App.Filters.filter.data.viewByType == 3 && event.record.get('leaf'))
				) {
					isEditable = false;
				}
			} else {
				// model here is a RA.Cmp.Model.GridAllocationPeriod type
				// temporarily change the value from object to totalHours. to be reverted back on edit event handler
				if (event.record.get('leaf')) {
					event.value = event.value.totalHours;
				}

				/*
				 * Disable edit for leaf nodes or if no results
				 */
				if (!event.record.get('leaf') || event.record.get('name') == translatedStrings.getText('SS.MESSAGE.NO_RESULTS_VIEW')) {
					isEditable = false;
				} else {
					var workCalendar = event.record.get('workCalendar');
					var date = RA.App.Stores.gridStore.dateColHeaders[event.field].start;

					if (RA.App.ModeManager.getActive().getViewPreset() == RA.Cmp.Store.GridAllocation.ViewPresets.DAILY &&
						(!RA.Util.WorkCalendar.isWorkDay(date, workCalendar))) {
						isEditable = false;
					} else if (RA.App.Filters.filter.data.viewByType == 1 &&
							   event.record.get('status') == 'template') {
						// prevent cell editing on Project Template (Suitescript does not assign resource alloc with template)
						isEditable = false;
					} else {
						if (RA.App.Filters.filter.data.viewByType == 3) {
							var projectId = event.record.get('projectId');
							RA.App.Stores.gridStore.getRootNode().eachChild(function (proj) {
								// check on status of parent project
								var iterId = proj.getId();
								if (Number(projectId) == Number(iterId) &&
									proj.get('status') == 'template') {
									isEditable = false;
								}
							});
						}

						// disable inline edit for recurring alloc (for now)
						if (event.record.get(event.field).hasRecurringAlloc) {
							isEditable = false;
							RA.App.Grid.showDisabledContextMenu(event.row, event.colIdx);
						}
					}
				}
			}

			return isEditable;
		},
		edit: function (editor, event, eventOpts) {
			perfTestLogger.start('Edit Cell');

			if (event.field == 'comments') {
				editor.editCellProjectComment(editor, event, eventOpts);
			} else {
				editor.editCellAllocation(editor, event, eventOpts);
			}

			// Prevent grid from resetting focus to top
			var currPosition = editor.grid.getSelectionModel().getCurrentPosition();
			editor.grid.getView().focusCell(currPosition);

			perfTestLogger.stop();
		}
	},

	editCellAllocation: function (editor, event, eventOpts, byCtxMenu, record) {
		var oldValue = Number(event.originalValue.getTotalHours()) || 0;
		var newValue = Number(event.value) || 0;
		var rec = record || event.record;

		/*
		 * check if an update was made
		 * for now, consider all edit triggered by context menu as an update
		 */
		if (oldValue == newValue && !byCtxMenu) {
			/*
			 * no change; simply restore the originalValue (RA.Cmp.Model.GridAllocationPeriod)
			 */
			rec.set(event.field, event.originalValue);
		} else {
			/*
			 * source values according to trigger of edit:
			 * a) context menu
			 * b) cell editing
			 */
			var col;
			var allocType = 1; // TODO: default is 'hard' for now
			var approverId = 0; // TODO: default is '' for now
			if (byCtxMenu) {
				col = event.col;
				allocType = event.allocType ? event.allocType : allocType;
				approverId = event.approverId ? event.approverId : approverId;
			} else {
				col = editor.context.colIdx;
				allocType = event.originalValue.allocType ? event.originalValue.allocType : allocType;
				if (event.originalValue.approverId) {
					approverId = event.originalValue.approverId;
				} else {
					var resource = RA.App.Stores.approverStore.getById(event.originalValue.resourceId);
					if (resource) {
						approverId = resource.raw.supervisorId ? resource.raw.supervisorId : approverId;
					}
				}
			}
			/*
			 * reconstruction RA.Cmp.Model.GridAllocationPeriod with updated values
			 */

			var newAllocPeriod = Ext4.create('RA.Cmp.Model.GridAllocationPeriod', JSON.parse(JSON.stringify(event.originalValue)));
			newAllocPeriod.hasMultipleAlloc = false; // always false if updated since cell will be merged into single allocation
			newAllocPeriod.totalHours = newValue;
			newAllocPeriod.appStatus = RA.App.Constant.PENDING_APPROVAL;
			newAllocPeriod.allocType = allocType;
			newAllocPeriod.approverId = approverId;
			newAllocPeriod.allocId = RA.App.Stores.chartEvent.nextAllocId--; // same as chartEvent.createNewAllocation; decrement once every time this variable is used

			rec.set(event.field, newAllocPeriod);
			/*
			 * reflect the changes on chartEvent
			 */
			var updatedAllocation = RA.App.Grid.store.updateAllocation(rec, col, newValue);

			RA.App.Stores.chartResource.setIsDirtyOfProjectHoverOfAllocation(rec.get('projectId'));

			/*
			 * update grid & chart roll-ups
			 */
			var highestAncestorId = RA.App.Stores.chartEvent.getHighestAncestorId(rec);
			if (updatedAllocation) {
				RA.App.Stores.chartEvent.refreshRollUpsByResource(highestAncestorId);
			} else {
				RA.App.Stores.chartEvent.removeEventAndRefreshUi(rec);
			}
			RA.App.Grid.store.refreshGridNodeFromChart(highestAncestorId);
		}
	},

	editCellProjectComment: function (editor, event, eventOpts) {
		var filterType = RA.App.Filters.filter.data.viewByType;
        var newComments = event.value.trim();

		var getProjectIdFromNode = function (node, filterType) {
			var projectId = null;
			if (filterType === 1) {
				projectId = node.get('projectId');
			} else if (filterType === 2) {
				projectId = node.get('projectId')
							? node.get('projectId')
							: node.get('cellid').split(RA.App.Constant.SEPARATOR_ID)[1];
			} else if (filterType === 3) {
				projectId = node.get('cellid');
			}
			return projectId;
		};

		/*
		 * recursive helper function, sets comment on a correct node in hierarchy based on the filter type
		 */
		var setProjectComment = function (rootNode, commentFieldName, comment, projectId, filterType, lastNode) {
			var lastNode = lastNode || false;
			var resProjectId = null;
			rootNode.eachChild(function (res) {
				if (filterType === 3 || lastNode) {
					resProjectId = getProjectIdFromNode(res, filterType);
					if (Number(resProjectId) === Number(projectId)) {
						res.beginEdit();
						res.set(commentFieldName, comment);
						res.endEdit();
						res.setDirty();
					}
				} else if (filterType === 1 || filterType === 2) {
					setProjectComment(res, commentFieldName, comment, projectId, filterType, true);
				}

			});
		};

		var projectId = getProjectIdFromNode(event.record, filterType);

		if (projectId) {
            // update projectCommentSaver
            var addedRecord = RA.App.Stores.projectCommentSaver.add(Ext4.create('RA.Cmp.Model.ProjectComment', {
                projectId: Number(projectId),
                comment: newComments
            }));

            // mark record as dirty, used during actual saving of record
            for (var r in addedRecord) {
                addedRecord[r].dirty = true;
            }

			// update all model whose projects are the same as the modified model
			this.suspendLayout = true;

			setProjectComment(RA.App.Stores.chartResource.getRootNode(), 'comment', newComments, projectId, filterType);
			setProjectComment(RA.App.Stores.gridStore.getRootNode(), 'comments', newComments, projectId, filterType);

			RA.App.Filters.disableFilter();

			this.suspendLayout = false;
		}
	}
});
