/**
 * © 2018 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Store.GridAllocation', {
    extend: 'Ext4.data.TreeStore',
    model: 'RA.Cmp.Model.GridAllocation',
    proxy: {
        type: 'memory',
        reader: 'json',
    },
    dateColHeaders: {},
    listeners: {
        // restore scroll position after calling setRootNode()
        rootchange: function (store) {
            if (RA.App.Grid) {
                RA.App.Grid.scrollByDeltaY(RA.App.Grid.scrollPosition);
            }
        },
    },

    statics: {
        ViewPresets: {
            DAILY: 'RA.ViewPreset.Daily',
            WEEKLY: 'RA.ViewPreset.Weekly',
            MONTHLY: 'RA.ViewPreset.Monthly'
        },
        viewPreset: null, // values from ViewPresets
        startDate: null, // date string format 'YYYY/mm/dd'
        farthestModifiedAllocStartTimestamp: null, // Date instance
        farthestModifiedAllocEndTimestamp: null, // Date instance
        eventsInView: null, // a smaller subset of the chartEvent for performance improvement

        /*
         *  Calculates the roll up for a given cell
         *  @resourceId {String} Resource ID
         *  @param {Date} start Start date
         *  @param {Date} end End date
         *  @static
         */
        getRollupValue: function (resourceRow, column) {
            var totalHours = 0;
            var isPercent = RA.App.Filters.filter.data.viewByType == 1;
            var children = resourceRow.childNodes;

            timeOffconflict = false;

            for (i in children) {
                var _column = children[i].data['w' + column];
                totalHours += _column.totalHours;
                if (!timeOffconflict && _column.timeOffconflict) { //Search if any children have a conflict
                    timeOffconflict = true;
                }
            }

            if (isPercent) {
                if (totalHours) {
                    var workCalendar = resourceRow.get('workCalendar');
                    var hrsPerDay = workCalendar.hrsPerDay;
                    var start = RA.App.Stores.gridStore.dateColHeaders['w' + column].start;
                    var end = Ext4.Date.add(RA.App.Stores.gridStore.dateColHeaders['w' + column].end, Ext4.Date.DAY, -1);
                    var workDays = RA.Util.WorkCalendar.computeWorkDays(workCalendar, start, end);

                    if (!workDays) {
                        switch (RA.Cmp.Store.GridAllocation.viewPreset) {
                            case RA.Cmp.Store.GridAllocation.ViewPresets.DAILY:
                                workDays = 1;
                                break;
                            case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
                                workDays = 7;
                                break;
                            case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
                                workDays = Ext4.Date.getDaysInMonth(start);
                                break;
                        }
                    }
                    totalHours = ((totalHours / (hrsPerDay * workDays)) * 100).toFixed(RA.App.Settings.get('limitDecimalPlaces')); // sample output: 100 which means 100%
                }
            }

            return Ext4.create('RA.Cmp.Model.GridAllocationPeriod', {
                totalHours: totalHours,
                isPercent: isPercent,
                isRollup: true,
                timeOffconflict: timeOffconflict
            });
        },

        /*
         *  Calculates the number of hours to display in the grid cell
         *  @resourceId {String} Resource ID
         *  @projectId {String} Project ID
         *  @projectId {String} Task ID
         *  @param {Date} start Start date
         *  @param {Date} end End date
         *  @param {RA.Cmp.Model.WorkCalendar} workCalendar work calendar of the resource
         *  @static
         */
        getGridValue: function (resourceId, projectId, taskId, startTimestamp, endTimestamp, workCalendar) {
            var type = null;
            var approverId = null;
            var appStatus = null;
            var timeOffconflict = false;

            // find all chart allocations where its data range intersects with the given start and end date
            var queryRet = RA.Cmp.Store.GridAllocation.eventsInView.filterBy(function (record, key) {
                return record.get('resourceId') == resourceId &&
                    record.get('projectId') == projectId &&
                    record.get('taskId') == taskId &&
                    Sch.util.Date.intersectSpans(
                        new Date(record.get("startTimestamp")), new Date(record.get("endTimestamp")),
                        startTimestamp, endTimestamp);
            });

            var totalHours = 0;
            var hasMultipleAlloc = (queryRet && queryRet.length > 1);
            var allocId = 0; // queryRet && queryRet.length == 1 ? 0 : queryRet.data.items[0].get('Id');

            var hasRecurringAlloc = false;
            if (queryRet) {
                queryRet.each(function (r) {
                    if (r.isRecurring()) {
                        hasRecurringAlloc = true;
                        return false;
                    }
                });
            }

            if (!hasMultipleAlloc && queryRet.length == 1) {
                queryRet.each(function (record) {
                    allocId = record.get('allocId');
                });
            }

            // adding allocation comments
            var allocComments = [];
            queryRet.each(function (record) {
                allocComments.push(record.get('comment'));
            });

            var approvedTimeOff = RA.Util.WorkCalendar.isBetweenResourceTimeOff(resourceId, startTimestamp, endTimestamp);
            var isWeeklyView = (this.viewPreset == RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY);
            queryRet.each(function (record) {
                type = record.get('typeId') || record.raw.typeId;
                approverId = record.get('nextApprover');
                appStatus = record.get('approvalStatus');

                var allocStartTimestamp = new Date(record.get('startTimestamp'));
                var allocEndTimestamp = new Date(record.get('endTimestamp'));
                var allocLastDate = new Date(record.getLastDate());
                var allocNumWorkingDays = RA.Util.WorkCalendar.computeWorkDays(workCalendar, allocStartTimestamp, allocLastDate);
                var allocDurationInDays = RA.Util.CustomFunctions.getDayCountBetweenTwoDates(allocStartTimestamp, allocLastDate, true);
                var allocHour = Number(record.get('hour'));
                var allocHourPerDay = allocHour / (allocNumWorkingDays ? allocNumWorkingDays : allocDurationInDays);
                var adjustedAllocStartTimestamp = null;
                var adjustedAllocEndTimestamp = null;
                var adjustedAllocLastDate = null;

                // check if allocSpan is contained in the week span. if not, allocSpan has dates outside the current month
                if (Sch.util.Date.timeSpanContains(startTimestamp, endTimestamp, allocStartTimestamp, allocEndTimestamp)) {
                    totalHours += allocHour;
                } else {
                    adjustedAllocStartTimestamp = (allocStartTimestamp < startTimestamp)
                        ? startTimestamp
                        : allocStartTimestamp;
                    adjustedAllocEndTimestamp = (allocEndTimestamp > endTimestamp) ? endTimestamp : allocEndTimestamp;
                    adjustedAllocLastDate = Sch.util.Date.add(adjustedAllocEndTimestamp, Sch.util.Date.DAY, -1);

                    var numWorkingDays = RA.Util.WorkCalendar.computeWorkDays(workCalendar, adjustedAllocStartTimestamp, adjustedAllocLastDate);
                    if (!numWorkingDays && !allocNumWorkingDays) {
                        numWorkingDays = RA.Util.CustomFunctions.getDayCountBetweenTwoDates(adjustedAllocStartTimestamp, adjustedAllocLastDate, true);
                    }

                    totalHours += allocHourPerDay * numWorkingDays;
                }

                if (!timeOffconflict && (allocHourPerDay > 0 && approvedTimeOff)) {
                    //update flag if any conflict found
                    if (isWeeklyView) {
                        //Individually check if an allocation under a week has conflict
                        if (RA.Util.WorkCalendar.isBetweenResourceTimeOff(resourceId, allocStartTimestamp, allocLastDate)) {
                            timeOffconflict = true;
                        }
                    } else {
                        timeOffconflict = true;
                    }
                }
            });

            return Ext4.create('RA.Cmp.Model.GridAllocationPeriod', {
                resourceId: resourceId,
                hasMultipleAlloc: hasMultipleAlloc,
                hasRecurringAlloc: hasRecurringAlloc,
                totalHours: totalHours,
                allocType: hasMultipleAlloc ? '' : type,
                approverId: hasMultipleAlloc ? '' : approverId,
                appStatus: hasMultipleAlloc ? '' : appStatus,
                allocId: allocId,
                approvedTimeOff: approvedTimeOff,
                timeOffconflict: timeOffconflict,
                comments: allocComments
            });
        },
    },

    /*
     * Get all chart allocations where its date range intersects with the given resource, project, start date and end date.
     * The allocations must have same 'hours per day' value too.
     * @param {String} resourceId The resource record internal ID
     * @param {String} projectId The project record internal ID
     * @param {Date} startDate The date where to start searching from
     * @param {Date} endDate The date where to end searching
     * @param {String} direction Position of cell to check: 'left', 'right'
     * @param {RA.Cmp.Model.WorkCalendar} workCalendar work calendar of the resource
     */
    getNeighborCellAllocations: function (resourceId, projectId, taskId, startDate, endDate, direction, workCalendar, hoursPerDay) {
        var ret = [];

        // filter updated records only
        var queryRet = RA.App.Stores.chartEvent.getModifiedRecords().filter(function (element, index, array) {
            return element.get('resourceId') == resourceId &&
                element.get('projectId') == projectId &&
                element.get('taskId') == taskId &&
                Sch.util.Date.intersectSpans(
                    new Date(element.get("startTimestamp")), new Date(element.get("endTimestamp")),
                    startDate, endDate) &&
                element.get('allocId') != 0;
        });

        // determine which allocIds are consecutive of the start/end date given the direction
        if (queryRet && queryRet.length > 0) {
            switch (direction) {
                case 'left':
                    // sort allocation last date in descending order
                    queryRet.sort(function (a, b) {
                        return b.getLastDate() - a.getLastDate();
                    });
                    var referenceDate = endDate; // use endDate instead of startDate
                    for (var i = 0; i < queryRet.length; i++) {
                        var alloc = this.getConsecutiveAllocation(referenceDate, 'left', queryRet.slice(i, queryRet.length), workCalendar, hoursPerDay);
                        if (alloc) {
                            ret.push(alloc);
                            referenceDate = queryRet[i].get('startTimestamp');
                        } else {
                            break;
                        }
                    }

                    break;
                case 'right':
                    // sort allocation last date in ascending order
                    queryRet.sort(function (a, b) {
                        return a.getLastDate() - b.getLastDate();
                    });
                    var referenceDate = startDate; // use startDate
                    for (var i = 0; i < queryRet.length; i++) {
                        var alloc = this.getConsecutiveAllocation(referenceDate, 'right', queryRet.slice(i, queryRet.length), workCalendar, hoursPerDay);
                        if (alloc) {
                            ret.push(alloc);
                            referenceDate = queryRet[i].getLastDate();
                        } else {
                            break;
                        }
                    }

                    break;
            }
        }

        return ret;
    },

    /*
     * Get the next allocation record based on the given date and having the same 'hours per day' value of a resource on a project
     * @param {Date} date Reference date on where to start checking from
     * @param {String} direction Position of cell to check. Possible values: 'left', 'right'
     * @param {Array} allocArr Array of RA.Cmp.Model.ChartAllocation that will be looked into
     * @param {RA.Cmp.Model.WorkCalendar} workCalendar work calendar of the resource
     */
    getConsecutiveAllocation: function (date, direction, allocArr, workCalendar, hoursPerDay) {
        var ret = null;

        switch (direction) {
            case 'left':

                // sort allocation last date in descending order
                allocArr.sort(function (a, b) {
                    return b.getLastDate() - a.getLastDate();
                });
                var nearestAlloc = allocArr[0];

                // difference between business days must be 0 or 1
                var bizDays = RA.Util.WorkCalendar.computeWorkDays(workCalendar, nearestAlloc.get('endTimestamp'), date);
                if (bizDays == 1 || bizDays == 0) {
                    ret = nearestAlloc;
                }

                break;
            case 'right':

                // sort allocation last date in ascending order
                allocArr.sort(function (a, b) {
                    return a.getLastDate() - b.getLastDate();
                });
                var nearestAlloc = allocArr[0];

                // difference between business days must be 0 or 1
                var bizDays = RA.Util.WorkCalendar.computeWorkDays(workCalendar, date, nearestAlloc.get('startTimestamp'));
                if (bizDays == 1 || bizDays == 0) {
                    ret = nearestAlloc;
                }

                break;
        }

        // only consider allocations with same 'hours per day' computation
        if (ret) {
            var resourceId = ret.get('resourceId');
            var allocStart = new Date(ret.get('startTimestamp'));
            var allocEnd = new Date(ret.getLastDate());
            var allocNumWorkingDays = RA.Util.WorkCalendar.computeWorkDays(workCalendar, allocStart, allocEnd);
            var allocHour = Number(ret.get('hour'));
            if (allocHour / allocNumWorkingDays != hoursPerDay) {
                ret = null;
            }
        }

        return ret;
    },

    /*
     * Handles deletion of record in Chart's Event store. Calls the necessary functions in UI after deleting from store
     * @param {RA.Cmp.Model.ChartAllocation} record The allocation to delete
     */
    deleteChartAllocation: function (record) {
        var store = RA.App.Stores.chartEvent;

        store.remove(record);
        store.refreshRollUpsByResource(store.getHighestAncestorId(record));
    },

    /*
     * Updates the newly created allocation based on the information of neighbor cells. Deletes the neighbor cells afterwards.
     * @param {RA.Cmp.Model.ChartAllocation} newAlloc Newly generated RA.Cmp.Model.ChartAllocation
     * @param {Array} neighborAlloc Array of RA.Cmp.Model.ChartAllocation
     * @param {String} direction Position of neighbor to new alloc: 'left', 'right'
     */
    mergeAllocations: function (newAlloc, neighborAlloc, direction) {
        // TODO ? copy next approver ID to the new Alloc? or New Alloc from grid should be blank since not yet set via edit in cell action menu.
        var finalComment = '';
        switch (direction) {
            case 'left':

                // sort allocation last date of neighbors in ascending order
                neighborAlloc.sort(function (a, b) {
                    return a.getLastDate() - b.getLastDate();
                });
                var farthestAlloc = neighborAlloc[0];

                // update start date of new alloc
                newAlloc.newStartTimestamp = farthestAlloc.get('startTimestamp');

                for (var neighborAllocMember of neighborAlloc) {
                    var comment = neighborAllocMember.get('comment');
                    if (comment) {
                        finalComment += '|' + comment;
                    }
                }
                newAlloc.newComment += finalComment;

                break;

            case 'right':

                // sort allocation last date of neighbors in descending order
                neighborAlloc.sort(function (a, b) {
                    return b.getLastDate() - a.getLastDate();
                });
                var farthestAlloc = neighborAlloc[0];

                // update end date of new alloc
                newAlloc.newLastDate = farthestAlloc.getLastDate();

                for (var neighborAllocMember of neighborAlloc) {
                    var comment = neighborAllocMember.get('comment');
                    if (comment) {
                        finalComment += comment + '|';
                    }
                }
                newAlloc.newComment = finalComment + newAlloc.newComment;

                break;
        }

        // delete all neighbors while getting the total hours
        var totalHours = 0;
        for (var i = 0; i < neighborAlloc.length; i++) {
            totalHours += Number(neighborAlloc[i].get('hour'));
            this.deleteChartAllocation(neighborAlloc[i]);
        }

        newAlloc.newAllocateNum += totalHours;

        return newAlloc;
    },

    /*
     * Adjusts the start and end date to fall on a working day
     * @param {RA.Cmp.Model.WorkCalendar} workCalendar work calendar of the resource
     * @param {Date} startDate The startTimestamp that will be adjusted (incremented)
     * @param {Date} endDate The endTimestamp that will be adjusted (decremented)
     */
    adjustToWorkingDay: function (workCalendar, startTimestamp, endTimestamp) {
        if (!startTimestamp || !endTimestamp) return null;
        var ret = {};

        // find the first working day from the start date
        for (var i = 0; i < 31; i++) {
            var dateIter = Sch.util.Date.add(startTimestamp, Sch.util.Date.DAY, i);
            if (RA.Util.WorkCalendar.isWorkDay(dateIter, workCalendar)) {
                ret.startTimestamp = dateIter;
                break;
            }
        }

        // find the first previous working day from the end date
        for (var i = 0; i < 31; i++) {
            var dateIter = Sch.util.Date.add(endTimestamp, Sch.util.Date.DAY, -i);
            if (RA.Util.WorkCalendar.isWorkDay(dateIter, workCalendar)) {
                ret.lastDate = dateIter;
                break;
            }
        }

        return ret;
    },

    /*
     * Computes the new allocated hours of a splitted cell
     * @param {RA.Cmp.Model.ChartAllocation} allocRec The allocation record to be splitted
     * @param {Date} newStartTimestamp The splitted allocation's startTimestamp
     * @param {Date} newLastDate The splitted allocation's endTimestamp (not just last date)
     * @param {RA.Cmp.Model.WorkCalendar} workCalendar work calendar of the resource
     */
    calculateSplitHours: function (allocRec, newStartTimestamp, newLastDate, workCalendar) {
        var allocStart = new Date(allocRec.get('startTimestamp'));
        var allocLastDate = new Date(allocRec.getLastDate());
        var allocNumWorkingDays = RA.Util.WorkCalendar.computeWorkDays(workCalendar, allocStart, allocLastDate);
        var allocHour = Number(allocRec.get('hour'));
        var allocHourPerDay = allocHour / allocNumWorkingDays;
        var newAllocNumWorkingDays = RA.Util.WorkCalendar.computeWorkDays(workCalendar, newStartTimestamp, newLastDate);

        return allocHourPerDay * newAllocNumWorkingDays;
    },

    /*
     * Creates the left and right allocations (if applicable) when an existing allocation is found in the cell
     * @param {String} resourceId The resource record internal ID
     * @param {String} projectId The project record internal ID
     * @param {Date} startDate The allocation's startTimestamp
     * @param {Date} endDate The allocation's endTimestamp (not just last date)
     * @param {Number} newValue The hour value for the new allocation
     */
    splitAllocation: function (gridRecord, startDate, endDate, newValue, column) {
        var ret = false;
        var affectedAllocs = [];
        var col = column + 1;
        var weekNum = 'w' + col;
        var resourceId = gridRecord.get('resourceId');
        var projectId = gridRecord.get('projectId');
        var customerId = gridRecord.get('customerId');
        var projectTaskId = gridRecord.get('taskId');
        var allocType = gridRecord.get(weekNum).allocType;
        var allocId = gridRecord.get(weekNum).allocId;
        var workCalendar = gridRecord.get('workCalendar');

        // filter allocations that intersect with the time range
        var queryRet = RA.App.Stores.chartEvent.queryBy(function (element) {
            return (
                element.get('resourceId') == resourceId &&
                element.get('projectId') == projectId &&
                element.get('taskId') == projectTaskId &&
                Sch.util.Date.intersectSpans(new Date(element.get("startTimestamp")), new Date(element.get("endTimestamp")), startDate, endDate) &&
                element.get('allocId') != 0
            );
        });

        queryRet.each(function (record) {
            affectedAllocs.push(record);
        });

        // get the first and last allocation then delete all found allocations
        var minStartDate = null;
        var maxEndDate = null;
        var firstAlloc = null;
        var lastAlloc = null;
        var allComments = new Set();

        for (var i = 0; i < affectedAllocs.length; i++) {
            var startTimestampIter = affectedAllocs[i].get('startTimestamp');
            var lastDateIter = affectedAllocs[i].getLastDate();

            minStartDate = minStartDate == null
                ? startTimestampIter
                : Sch.util.Date.min(startTimestampIter, minStartDate);
            maxEndDate = maxEndDate == null ? lastDateIter : Sch.util.Date.max(lastDateIter, maxEndDate);

            if (minStartDate === startTimestampIter) {
                firstAlloc = affectedAllocs[i];
            }

            if (maxEndDate === lastDateIter) {
                lastAlloc = affectedAllocs[i];
            }

            var comments = affectedAllocs[i].get('comment');
            if (comments) {
                for (var comment of comments.split('|')) {
                    allComments.add(comment);
                }
            }

            this.deleteChartAllocation(affectedAllocs[i]);
        }

        // check if minStartDate & maxEndDate is within startDate & endDate
        if (minStartDate && maxEndDate) {

            // check if there's a need to split the allocation
            var noSplit = Sch.util.Date.timeSpanContains(startDate, Sch.util.Date.add(endDate, Sch.util.Date.DAY, -1),
                minStartDate, maxEndDate);
            if (!noSplit) {
                var resourceModel = RA.App.Stores.chartResource.getResourceObjByRow(RA.App.Stores.chartEvent.getResourceRowId(gridRecord));
                var approverId = resourceModel.raw.supervisorId || null;
                var newCommentValue = Array.from(allComments).filter((comment) => comment !== '').join('|');

                // create the left allocation if needed
                if (firstAlloc.get('startTimestamp') <= Sch.util.Date.add(startDate, Sch.util.Date.DAY, -1)) {
                    var adjustedDates = this.adjustToWorkingDay(workCalendar, firstAlloc.get('startTimestamp'), Sch.util.Date.add(startDate, Sch.util.Date.DAY, -1));
                    var leftAlloc = {
                        newResourceId: resourceId,
                        newProjectId: projectId,
                        newCustomerId: customerId,
                        newProjectTaskId: projectTaskId,
                        newStartTimestamp: adjustedDates.startTimestamp,
                        newLastDate: adjustedDates.lastDate,
                        newAllocateNum: this.calculateSplitHours(firstAlloc, adjustedDates.startTimestamp, adjustedDates.lastDate, workCalendar),
                        newAllocBy: 2, // always in hours
                        newComment: newCommentValue,
                        newApprover: approverId,
                        newAllocType: allocType,
                        newAppStatus: RA.App.Constant.PENDING_APPROVAL,
                        newEndTimestamp: Sch.util.Date.add(adjustedDates.lastDate, Sch.util.Date.DAY, 1),
                        allocId: allocId
                    };

                    var success = RA.App.Stores.chartEvent.createNewAllocation(leftAlloc, resourceModel);
                    if (success) {
                        RA.Util.Logger.log('success createLeftAllocation');
                    } else {
                        RA.Util.Logger.log('fail createLeftAllocation');
                    }
                }

                // create the right allocation if needed
                if (Sch.util.Date.add(endDate, Sch.util.Date.DAY, 0) <= lastAlloc.getLastDate()) {
                    adjustedDates = this.adjustToWorkingDay(workCalendar, endDate, lastAlloc.getLastDate());
                    var rightAlloc = {
                        newResourceId: resourceId,
                        newProjectId: projectId,
                        newCustomerId: customerId,
                        newProjectTaskId: projectTaskId,
                        newStartTimestamp: adjustedDates.startTimestamp,
                        newLastDate: adjustedDates.lastDate,
                        newAllocateNum: this.calculateSplitHours(lastAlloc, adjustedDates.startTimestamp, adjustedDates.lastDate, workCalendar),
                        newAllocBy: 2, // always in hours
                        newComment: newCommentValue,
                        newApprover: approverId,
                        newAllocType: allocType,
                        newAppStatus: RA.App.Constant.PENDING_APPROVAL,
                        newEndTimestamp: Sch.util.Date.add(adjustedDates.lastDate, Sch.util.Date.DAY, 1),
                        allocId: allocId
                    };

                    var success = RA.App.Stores.chartEvent.createNewAllocation(rightAlloc, resourceModel);
                    if (success) {
                        RA.Util.Logger.log('success createRightAllocation');
                    } else {
                        RA.Util.Logger.log('fail adjustedDates.startDate');
                    }
                }

                ret = true;
            }
        }

        return ret;
    },

    /*
     * Updates the chartEvent store by adding new allocation, deleting, merging or splitting existing allocations
     * @param {String} gridRecord data for the edited grid row
     * @param {Number} column Column index of the cell being updated
     * @param {Number} newValue The new value for the allocation
    */
    updateAllocation: function (gridRecord, column, newValue) {
        if (column == null || column == undefined) return; // didn't use if(column){...} since value can be 0

        var col = column + 1;
        var weekNum = 'w' + col;
        var startTimestamp = this.dateColHeaders[weekNum].start;
        var endTimestamp = this.dateColHeaders[weekNum].end;
        var resourceId = gridRecord.get('resourceId');
        var projectId = gridRecord.get('projectId');
        var customerId = gridRecord.get('customerId');
        var projectTaskId = gridRecord.get('taskId');
        var projectTaskName = gridRecord.get('task');
        var allocType = gridRecord.get(weekNum).allocType || 1;
        var resourceModel = RA.App.Stores.chartResource.getResourceObjByRow(RA.App.Stores.chartEvent.getResourceRowId(gridRecord));
        var approverId = gridRecord.get(weekNum).approverId || resourceModel.raw.supervisorId || null;
        var allocId = gridRecord.get(weekNum).allocId;
        var workCalendar = gridRecord.get('workCalendar');

        // either saves one comment or more if there is more than one allocation in the column (and therefore more comments)
        var allComments = gridRecord.get(weekNum).comments.join('|');

        RA.Util.Logger.log('resourceId: ' + resourceId + ', projectId: ' + projectId + ', projectTaskId: ' + projectTaskId + ', startDate: ' + startTimestamp + ', endDate: ' + endTimestamp);

        // take note if there's a need to update the farthest modified dates
        RA.Cmp.Store.GridAllocation.farthestModifiedAllocStartTimestamp =
            !RA.Cmp.Store.GridAllocation.farthestModifiedAllocStartTimestamp ? startTimestamp :
                Sch.util.Date.min(RA.Cmp.Store.GridAllocation.farthestModifiedAllocStartTimestamp, startTimestamp);
        RA.Cmp.Store.GridAllocation.farthestModifiedAllocEndTimestamp =
            !RA.Cmp.Store.GridAllocation.farthestModifiedAllocEndTimestamp ? endTimestamp :
                Sch.util.Date.max(RA.Cmp.Store.GridAllocation.farthestModifiedAllocEndTimestamp, endTimestamp);

        // before creating the target allocation, first do an allocation splitting on existing cell
        this.splitAllocation(gridRecord, startTimestamp, endTimestamp, newValue, column);

        // check if there are new or updated neighbor allocIds
        var leftCellStartTimestamp = '';
        var leftCellEndTimestamp = '';
        var rightCellStartTimestamp = '';
        var rightCellEndTimestamp = '';
        var newStartTimestamp = '';
        var newEndTimestamp = '';

        switch (RA.Cmp.Store.GridAllocation.viewPreset) {
            case RA.Cmp.Store.GridAllocation.ViewPresets.DAILY:
                leftCellStartTimestamp = Sch.util.Date.add(startTimestamp, Sch.util.Date.DAY, -1);
                leftCellEndTimestamp = Sch.util.Date.add(endTimestamp, Sch.util.Date.DAY, -1);
                rightCellStartTimestamp = Sch.util.Date.add(startTimestamp, Sch.util.Date.DAY, 1);
                rightCellEndTimestamp = Sch.util.Date.add(endTimestamp, Sch.util.Date.DAY, 1);

                newStartTimestamp = startTimestamp;
                newEndTimestamp = startTimestamp;
                break;
            case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
                leftCellStartTimestamp = Sch.util.Date.add(startTimestamp, Sch.util.Date.DAY, -7);
                leftCellEndTimestamp = Sch.util.Date.add(endTimestamp, Sch.util.Date.DAY, -7);
                rightCellStartTimestamp = Sch.util.Date.add(startTimestamp, Sch.util.Date.DAY, 7);
                rightCellEndTimestamp = Sch.util.Date.add(endTimestamp, Sch.util.Date.DAY, 7);

                newStartTimestamp = startTimestamp;
                newEndTimestamp = Sch.util.Date.add(endTimestamp, Sch.util.Date.DAY, -1);
                break;
            case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
                var monthMinusOneDay = Sch.util.Date.add(startTimestamp, Sch.util.Date.DAY, -1);
                var monthPlusOneDay = Sch.util.Date.add(endTimestamp, Sch.util.Date.DAY, 1);

                var firstDayOfLastMonth = new Date(monthMinusOneDay.getFullYear(), monthMinusOneDay.getMonth(), 1);
                var lastDayOfLastMonth = new Date(firstDayOfLastMonth.getFullYear(), firstDayOfLastMonth.getMonth() + 1, 0);

                var firstDayOfNextMonth = new Date(monthPlusOneDay.getFullYear(), monthPlusOneDay.getMonth(), 1);
                var lastDayOfNextMonth = new Date(firstDayOfNextMonth.getFullYear(), firstDayOfNextMonth.getMonth() + 1, 0);

                leftCellStartTimestamp = firstDayOfLastMonth;
                leftCellEndTimestamp = lastDayOfLastMonth;
                rightCellStartTimestamp = firstDayOfNextMonth;
                rightCellEndTimestamp = lastDayOfNextMonth;

                newStartTimestamp = new Date(startTimestamp.getFullYear(), startTimestamp.getMonth(), 1);
                newEndTimestamp = new Date(startTimestamp.getFullYear(), startTimestamp.getMonth() + 1, 0);

                break;
        }

        // increase coverage of modified neighbor cells regardless of preset
        leftCellStartTimestamp = Sch.util.Date.min(RA.Cmp.Store.GridAllocation.farthestModifiedAllocStartTimestamp, leftCellStartTimestamp);
        RA.Cmp.Store.GridAllocation.farthestModifiedAllocStartTimestamp = leftCellStartTimestamp;
        rightCellEndTimestamp = Sch.util.Date.max(RA.Cmp.Store.GridAllocation.farthestModifiedAllocEndTimestamp, rightCellEndTimestamp);
        RA.Cmp.Store.GridAllocation.farthestModifiedAllocEndTimestamp = rightCellEndTimestamp;

        // do adjustments here. start/end date must not fall on holiday or non-working day
        var adjustedDates = this.adjustToWorkingDay(workCalendar, newStartTimestamp, newEndTimestamp);

        // compute target hours per day
        var hoursPerday = Number(newValue) / RA.Util.WorkCalendar.computeWorkDays(workCalendar, adjustedDates.startTimestamp, adjustedDates.lastDate);

        var toMergeLeft = this.getNeighborCellAllocations(resourceId, projectId, projectTaskId, leftCellStartTimestamp, leftCellEndTimestamp, 'left', workCalendar, hoursPerday);
        var toMergeRight = this.getNeighborCellAllocations(resourceId, projectId, projectTaskId, rightCellStartTimestamp, rightCellEndTimestamp, 'right', workCalendar, hoursPerday);

        RA.Util.Logger.log('toMergeLeft: ' + toMergeLeft.length);
        RA.Util.Logger.log('toMergeRight: ' + toMergeRight.length);

        var newAlloc = {
            newResourceId: resourceId,
            newProjectId: projectId,
            newCustomerId: customerId,
            newProjectTaskId: projectTaskId,
            newProjectTaskName: projectTaskName,
            newStartTimestamp: adjustedDates.startTimestamp,
            newLastDate: adjustedDates.lastDate,
            newAllocateNum: Number(newValue) || 0,
            newAllocBy: 2, // always in hours
            newComment: allComments,
            newApprover: approverId,
            newAllocType: allocType,
            newAppStatus: RA.App.Constant.PENDING_APPROVAL,
            newEndTimestamp: Sch.util.Date.add(adjustedDates.lastDate, Sch.util.Date.DAY, 1),
            allocId: allocId
        };

        // do merging if applicable
        if (toMergeLeft.length > 0) {
            newAlloc = this.mergeAllocations(newAlloc, toMergeLeft, 'left');
        }

        if (toMergeRight.length > 0) {
            newAlloc = this.mergeAllocations(newAlloc, toMergeRight, 'right');
        }

        var comments = new Set(newAlloc.newComment.split('|'));
        newAlloc.newComment = Array.from(comments).filter((comment) => comment !== '').join('|');

        // call the existing add allocation in chart
        if (newValue) {
            return RA.App.Stores.chartEvent.createNewAllocation(newAlloc, resourceModel);
        }

        return null;
    },

    /*
     * Resets the static properties used in cell display and merging/splitting logic
     */
    reset: function () {
        RA.Cmp.Store.GridAllocation.farthestModifiedAllocStartTimestamp = null;
        RA.Cmp.Store.GridAllocation.farthestModifiedAllocEndTimestamp = null;
    },

    /*
     * Converts the chart's data into grid's data
     * @param {RA.Cmp.Store.Resource} chartResource Data store of the Chart resources
     * @param {RA.Cmp.Store.Allocation} chartEvent Data store of the Chart allocations
     */
    transformChartData: function () {
        // create the mapping of working days and holidays per resource
        // apply current preset
        this.setViewPreset(RA.Cmp.Store.GridAllocation.viewPreset, RA.Cmp.Store.GridAllocation.startDate);
    },

    /*
     * Changes the view preset on the grid
     * @param {String} mode Preset mode: 'daily', 'weekly', 'monthly'
     * @param {String} startDate Date in the first column of the grid. Date string is in this format: 'YYYY/mm/dd'
     * @param {String} panDirection Direction of date panning. values: 'pan-left', 'pan-right'
     */
    setViewPreset: function (mode, startDate, panDirection) {
        // perfTestLogger.startEvent('setViewPreset()');

        var chartResource = RA.App.Stores.chartResource;

        // set default view preset here
        if (mode != RA.Cmp.Store.GridAllocation.ViewPresets.DAILY && mode != RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY && mode != RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY) {
            mode = [RA.Cmp.Store.GridAllocation.ViewPresets.DAILY, RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY, RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY][RA.App.Settings.get('dateRange') - 1];
        }

        RA.Cmp.Store.GridAllocation.viewPreset = mode;

        // create model for column titles (start, end, label)
        this.dateColHeaders = {};

        // if startDate is null, use first day of current week since default view preset is WEEKLY
        var now = startDate ? new Date(startDate) : this.getFirstDayOfWeek(new Date());

        // set now as new start date for the grid. remove the time part
        RA.Cmp.Store.GridAllocation.startDate = Ext4.Date.format(now, 'Y/m/d');
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (RA.Cmp.Store.GridAllocation.viewPreset) {
            case RA.Cmp.Store.GridAllocation.ViewPresets.DAILY:
                var columnStartDate = today;
                for (var i = 0; i < 14; i++) {
                    var dateIterator = Sch.util.Date.add(columnStartDate, Sch.util.Date.DAY, i);
                    this.dateColHeaders['w' + (i + 1)] = {
                        start: dateIterator,
                        end: Sch.util.Date.add(dateIterator, Sch.util.Date.DAY, 1),
                        label: Ext4.Date.format(dateIterator, 'M d')
                    };
                }

                break;
            case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
                // there's a bug on Sch.util.Date.getNext(new Date(), Sch.util.Date.WEEK, 0) so let's get the last week and add 1 to that, not 0
                var columnStartDate = today;
                for (var i = 0; i < 14; i++) {
                    var firstDayOfWeek = Sch.util.Date.getNext(
                        Sch.util.Date.getNext(
                            columnStartDate,
                            Sch.util.Date.WEEK,
                            i + 1,
                            RA.Util.CustomFunctions.getWeekStart()
                        ),
                        Sch.util.Date.WEEK,
                        -1,
                        RA.Util.CustomFunctions.getWeekStart()
                    );
                    this.dateColHeaders['w' + (i + 1)] = {
                        start: firstDayOfWeek,
                        end: Sch.util.Date.add(firstDayOfWeek, Sch.util.Date.DAY, 7),
                        label: Ext4.Date.format(firstDayOfWeek, 'M d')
                    };
                }

                break;
            case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
                // there's a bug on Sch.util.Date.getNext(new Date(), Sch.util.Date.MONTH, 0) so let's get the last month and add 1 to that, not 0
                var firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                var columnStartDate = Sch.util.Date.add(firstDayOfMonth, Sch.util.Date.DAY, -1);
                for (var i = 0; i < 14; i++) {

                    var firstDayOfMonth = Sch.util.Date.getNext(columnStartDate, Sch.util.Date.MONTH, i + 1);
                    var lastDayOfMonth = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth() + 1, 0);
                    this.dateColHeaders['w' + (i + 1)] = {
                        start: firstDayOfMonth,
                        end: Sch.util.Date.add(lastDayOfMonth, Sch.util.Date.DAY, 1),
                        label: Ext4.Date.format(firstDayOfMonth, 'M Y')
                    };
                }

                break;
        }

        RA.Util.Logger.log('dateColHeaders: ' + JSON.stringify(this.dateColHeaders));

        this.setEventsInView();
        var convertedData = Ext4.create('RA.Cmp.Model.GridAllocation', {
            cellid: '0',
            name: 'Root',
            expanded: true,
            children: []
        });

        // iterate on the resources
        chartResource.getRootNode().eachChild(function (res) {
            convertedData.appendChild(RA.App.Stores.gridStore.refreshGridInnerNode(res, panDirection));
        });

        // update data of store
        if (RA.App.Grid) {
            RA.App.Grid.getSelectionModel().deselectAll(); // removes the error when switching preset
        }

        this.setRootNode(convertedData);
        // perfTestLogger.stopEvent('setViewPreset()');

        RA.Util.Logger.log('\nPreset: ' + RA.Cmp.Store.GridAllocation.viewPreset + '\n' + 'First Date: ' + RA.Cmp.Store.GridAllocation.startDate);
    },

    // get a subset of the chartEvent that will be used by grid cell calculation (for performance improvement)
    setEventsInView: function () {
        var me = this;
        RA.Cmp.Store.GridAllocation.eventsInView = RA.App.Stores.chartEvent.queryBy(function (record) {
            return Sch.util.Date.intersectSpans(
                new Date(record.get("startTimestamp")), new Date(record.get("endTimestamp")),
                me.dateColHeaders['w1'].start, me.dateColHeaders['w14'].end);
        });
    },
    // refresh a specifig gridStore node by transforming the corresponding chartResource node
    refreshGridNodeFromChart: function (nodeId) {
        this.setEventsInView();
        var gridNode = RA.App.Grid.store.getResourceObjByRow(nodeId);
        var chartNode = RA.App.Stores.chartResource.getResourceObjByRow(nodeId);
        var newGridNode = this.refreshGridInnerNode(chartNode);
        RA.App.Grid.store.getRootNode().replaceChild(newGridNode, gridNode);
    },
    // Generates row data (rows that have rollup value)
    refreshGridInnerNode: function (midNode, panDirection) {
        var supervisor = midNode.get('supervisor') || midNode.raw.supervisor;
        var resourceType = midNode.get('type') || midNode.raw.type;
        var nodeId = midNode.get('Id');
        var status = midNode.get('status') || midNode.raw.status;
        var expanded = midNode.get('expanded');

        // to prevent display for 'No Results Found...'

        var newGridRow = Ext4.create('RA.Cmp.Model.GridAllocation', {
            cellid: nodeId,
            name: midNode.get('Name'),
            expanded: expanded,
            customer: '',
            comments: midNode.get('comment'),
            leaf: false,
            hover: 'none',
            status: status,
            children: [],
            hasTasks: midNode.raw.hasTasks || midNode.get('hasTasks')
        });

        if (nodeId == 0) {
            var actionColumn = Ext4.getCmp('ra-grid-axn-hdr');
            Ext4.apply(actionColumn, {tdCls: ''}); //Hide the hover icon for action column

            var emptyCellValue = Ext4.create('RA.Cmp.Model.GridAllocationPeriod', {
                totalHours: 0,
                isPercent: (RA.App.Filters.filter.data.viewByType == 1) ? true : false,
                isRollup: true
            });
            Ext4.apply(newGridRow.data, {
                restype: '',
                supervisor: '',
                resourceId: 0,
                leaf: true,
                w1: emptyCellValue,
                w2: emptyCellValue,
                w3: emptyCellValue,
                w4: emptyCellValue,
                w5: emptyCellValue,
                w6: emptyCellValue,
                w7: emptyCellValue,
                w8: emptyCellValue,
                w9: emptyCellValue,
                w10: emptyCellValue,
                w11: emptyCellValue,
                w12: emptyCellValue,
                w13: emptyCellValue,
                w14: emptyCellValue
            });
        } else {
            var actionColumn = Ext4.getCmp('ra-grid-axn-hdr');
            Ext4.apply(actionColumn, {tdCls: 'ra-action-hover-icon'}); //Show the hover icon for action column

            // to sync with initial type formatting
            if (resourceType === 'GenericRsrc' || resourceType === 'GenericResource') {
                resourceType = 'Generic resource';
            }
            resourceType = resourceType ? Ext4.util.Format.capitalize(resourceType) : '';

            Ext4.apply(newGridRow.data, {
                restype: resourceType,
                supervisor: supervisor || '',
                resourceId: midNode.get('resourceId')
            });

            if (midNode.get('nodeType') == 'resource') {
                newGridRow.set('workCalendarId', midNode.get('workCalendarId'));
                newGridRow.set('workCalendar', midNode.get('workCalendar'));
            }

            if (RA.App.Filters.filter.data.viewByType == 2 && midNode.get('nodeType') == 'project') {
                newGridRow.set('midLevel', true); // Flag to set indentation for view by customer
            }

            var child = midNode.getChildAt(0);
            if (child && child.get('expandable')) {
                midNode.eachChild(function (childNode) {
                    newGridRow.appendChild(RA.App.Stores.gridStore.refreshGridInnerNode(childNode, panDirection));
                });
            } else {
                // iterate on leaf children
                midNode.eachChild(function (childNode) {
                    newGridRow.appendChild(RA.App.Stores.gridStore.refreshGridLeafNode(childNode, midNode, panDirection));
                });
            }

            switch (panDirection) {
                case 'pan-left':
                    // only compute w1, then shift items to the right (w1 to w2, w2, to w3, etc.)
                    newGridRow.set('w1', RA.Cmp.Store.GridAllocation.getRollupValue(newGridRow, 1));

                    var nextNode = this.getNextNode(midNode);
                    for (var i = 2; i <= 14; i++) {
                        newGridRow.set('w' + i, nextNode.get('w' + (i - 1)));
                    }

                    break;
                case 'pan-right':
                    // only compute w14, then shift items to the left (w14 to w13, w13, to w12, etc.)
                    var nextNode = this.getNextNode(midNode);
                    for (var i = 1; i <= 13; i++) {
                        newGridRow.set('w' + i, nextNode.get('w' + (i + 1)));
                    }

                    newGridRow.set('w14', RA.Cmp.Store.GridAllocation.getRollupValue(newGridRow, 14));

                    break;
                default:
                    // calculate all cells
                    for (var i = 1; i <= 14; i++) {
                        newGridRow.set('w' + i, RA.Cmp.Store.GridAllocation.getRollupValue(newGridRow, i));
                    }
            }
            ;
        }

        return newGridRow;
    },

    // Generate row that are leaf node
    refreshGridLeafNode: function (leafNode, parentNode, panDirection) {
        var me = RA.App.Stores.gridStore;
        var resourceId = leafNode.get('resourceId');
        var projectId = leafNode.get('projectId');
        var customerId = leafNode.get('customerId');
        var taskId = leafNode.get('taskId');
        var event = RA.App.Stores.chartEvent.query('ResourceId', leafNode.get('Id'));

        // populate project comment store
        if (leafNode.get('comment') && projectId) {
            RA.App.Stores.projectCommentSaver.add(Ext4.create('RA.Cmp.Model.ProjectComment', {
                projectId: Number(projectId),
                comment: leafNode.get('comment')
            }));
        }

        // TODO: customer should still be available even if project has no Resource Allocation records
        var customerProject = leafNode.get('Name').split(RA.App.Constant.SEPARATOR_NAME);
        if (taskId > 0) {
            customerProject.pop();
        }
        var rowName = leafNode.get('projectTitle') || customerProject.pop();

        var newGridCell = Ext4.create('RA.Cmp.Model.GridAllocation', {
            cellid: leafNode.get('Id'),
            name: rowName,
            task: leafNode.get('taskName'),
            customer: leafNode.get('customer') || leafNode.raw.customer,
            restype: leafNode.get('type') || leafNode.raw.type,
            supervisor: leafNode.get('supervisor') || leafNode.raw.supervisor,
            comments: leafNode.get('comment'),
            status: leafNode.get('status') || leafNode.raw.status,
            leaf: true,
            resourceId: resourceId,
            projectId: projectId,
            customerId: customerId,
            taskId: taskId,
            projectTitle: leafNode.get('projectTitle'),
            hover: 'none',
            hasTasks: leafNode.get('hasTasks') || leafNode.raw.hasTasks
        });

        var workCalendarId = 0;
        var workCalendar = {};
        if (leafNode.get('nodeType') == 'resource') {
            workCalendarId = leafNode.get('workCalendarId');
            workCalendar = leafNode.get('workCalendar');
        } else if (parentNode.get('nodeType') == 'resource') {
            workCalendarId = parentNode.get('workCalendarId');
            workCalendar = parentNode.get('workCalendar');
        }
        newGridCell.set('workCalendarId', workCalendarId);
        newGridCell.set('workCalendar', workCalendar);


        switch (panDirection) {
            case 'pan-left':
                // only compute w1, then shift items to the right (w1 to w2, w2, to w3, etc.)
                newGridCell.set('w1', RA.Cmp.Store.GridAllocation.getGridValue(resourceId, projectId, taskId, me.dateColHeaders['w1'].start, me.dateColHeaders['w1'].end, workCalendar));

                var nextNode = this.getNextNode(leafNode);
                for (var i = 2; i <= 14; i++) {
                    newGridCell.set('w' + i, nextNode.get('w' + (i - 1)));
                }

                break;
            case 'pan-right':
                // only compute w14, then shift items to the left (w14 to w13, w13, to w12, etc.)
                var nextNode = this.getNextNode(leafNode);
                for (var i = 1; i <= 13; i++) {
                    newGridCell.set('w' + i, nextNode.get('w' + (i + 1)));
                }

                newGridCell.set('w14', RA.Cmp.Store.GridAllocation.getGridValue(resourceId, projectId, taskId, me.dateColHeaders['w14'].start, me.dateColHeaders['w14'].end, workCalendar));

                break;
            default:
                // calculate all cells
                for (var i = 1; i <= 14; i++) {
                    var weekNum = 'w' + i;
                    newGridCell.set(weekNum, RA.Cmp.Store.GridAllocation.getGridValue(resourceId, projectId, taskId, me.dateColHeaders[weekNum].start, me.dateColHeaders[weekNum].end, workCalendar));
                }
        }

        return newGridCell;
    },

    getNextNode: function (node) {
        var resourceId = node.get('resourceId');
        var projectId = node.get('projectId');
        var customerId = node.get('customerId');
        var leafId = node.get('Id');
        var currentType = node.get('nodeType');

        var arrCellId = [];

        switch (RA.App.Filters.filter.data.viewByType) {
            case 1:
                if (currentType == 'project') {
                    arrCellId.push(resourceId);
                }
                break;
            case 2:
                if (currentType == 'project' || currentType == 'resource') {
                    arrCellId.push(customerId);
                }
                if (currentType == 'resource') {
                    arrCellId.push(customerId + RA.App.Constant.SEPARATOR_ID + projectId);
                }
                break;
            case 3:
                if (currentType == 'resource') {
                    arrCellId.push(projectId);
                }
                break;
        }
        arrCellId.push(leafId);

        var searchNode = this.getRootNode();
        for (var i = 0; i < arrCellId.length; i++) {
            searchNode = searchNode.findChild('cellid', arrCellId[i]);
        }

        if (!searchNode) {
            console.log('Error Search for next node. Current type: ' + currentType);
        }

        return searchNode;
    },

    /*
     * Shows the grid's content one column forward in time based on the current view preset
     */
    shiftNext: function () {
        // perfTestLogger.startEvent('Grid shiftNext()');

        var now = Ext4.Date.format(new Date(), 'Y/m/d');
        var nextDate = RA.Cmp.Store.GridAllocation.startDate ? new Date(RA.Cmp.Store.GridAllocation.startDate) : now;
        switch (RA.Cmp.Store.GridAllocation.viewPreset) {
            case RA.Cmp.Store.GridAllocation.ViewPresets.DAILY:
                nextDate = Sch.util.Date.getNext(nextDate, Sch.util.Date.DAY, 1);
                break;
            case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
                nextDate = Sch.util.Date.getNext(nextDate, Sch.util.Date.WEEK, 1, RA.Util.CustomFunctions.getWeekStart());
                break;
            case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
                nextDate = Sch.util.Date.getNext(nextDate, Sch.util.Date.MONTH, 1);
                break;
        }

        nextDate = Ext4.Date.format(nextDate, 'Y/m/d');
        this.setViewPreset(RA.Cmp.Store.GridAllocation.viewPreset, nextDate, "pan-right");
        // perfTestLogger.stopEvent();

        RA.Util.Logger.log('\nPreset: ' + RA.Cmp.Store.GridAllocation.viewPreset + '\n' + 'First Date: ' + RA.Cmp.Store.GridAllocation.startDate);
    },

    /*
     * Shows the grid's content one column backward in time based on the current view preset
     */
    shiftPrevious: function () {
        // perfTestLogger.startEvent('shiftPrevious()');

        var now = Ext4.Date.format(new Date(), 'Y/m/d');
        var nextDate = RA.Cmp.Store.GridAllocation.startDate ? new Date(RA.Cmp.Store.GridAllocation.startDate) : now;
        switch (RA.Cmp.Store.GridAllocation.viewPreset) {
            case RA.Cmp.Store.GridAllocation.ViewPresets.DAILY:
                nextDate = Sch.util.Date.getNext(nextDate, Sch.util.Date.DAY, -1);
                break;
            case RA.Cmp.Store.GridAllocation.ViewPresets.WEEKLY:
                nextDate = Sch.util.Date.getNext(nextDate, Sch.util.Date.WEEK, -1, RA.Util.CustomFunctions.getWeekStart());
                break;
            case RA.Cmp.Store.GridAllocation.ViewPresets.MONTHLY:
                nextDate = Sch.util.Date.getNext(nextDate, Sch.util.Date.MONTH, -1);
                break;
        }

        nextDate = Ext4.Date.format(nextDate, 'Y/m/d');
        this.setViewPreset(RA.Cmp.Store.GridAllocation.viewPreset, nextDate, "pan-left");
        // perfTestLogger.stopEvent('shiftPrevious()');

        RA.Util.Logger.log('\nPreset: ' + RA.Cmp.Store.GridAllocation.viewPreset + '\n' + 'First Date: ' + RA.Cmp.Store.GridAllocation.startDate);
    },

    /*
     * Returns the First day of a given date. Any date (Sun-Sat) will return the first day of the week where that date belongs to.
     * Uses Sch.util.Date.getNext, but since 0 is not a valid increment value, -1 and then +1 was used consecutively.
     * @param {Date} date
     * @return {Date} Date object of computed date
     */
    getFirstDayOfWeek: function (date) {
        var weekStart = RA.Util.CustomFunctions.getWeekStart();
        var result = Sch.util.Date.getNext(Sch.util.Date.getNext(date, Sch.util.Date.WEEK, -1, weekStart), Sch.util.Date.WEEK, 1, weekStart);
        return result;
    },

    /*
     * Deletes all allocations for the given resource and project
     * @param {Object} rec  - record associated with the grid row
     */
    deleteProjectAllocations: function (rec) {

        // delete all entries in chartEvent
        var queryRet = RA.App.Stores.chartEvent.queryBy(function (element) {
            return element.get('resourceId') == rec.get('resourceId') &&
                element.get('projectId') == rec.get('projectId') &&
                element.get('taskId') == rec.get('taskId') &&
                element.get('allocId') != 0;
        });

        RA.App.Grid.suspendLayout = true;
        for (var i = 0; i < queryRet.length; i++) {
            this.deleteChartAllocation(queryRet.get(i));
        }

        // remove resource in chartResource
        RA.App.Stores.chartResource.getRootNode().eachChild(function (res) {
            // iterate on the projects
            var delProj = null;
            if (res) {
                res.eachChild(function (proj) {
                    if (rec.get('resourceId') == proj.get('resourceId') &&
                        rec.get('projectId') == proj.get('projectId') &&
                        rec.get('taskId') == proj.get('taskId')
                    ) {
                        delProj = proj;
                        // TODO: break loop here
                        // return;
                    }
                });

                res.beginEdit();
                res.removeChild(delProj);

                if (RA.App.Settings.get('includeAllResources') == 'F' && res.childNodes.length == 0) {
                    res.remove();

                    // update Resource labels in Toolbar
                    RA.App.Stores.gridStore.adjustToolbarResourceLabels();
                }

                res.endEdit();
            }
        });

        // show "No Results.." text if grid is empty
        if (RA.App.Stores.chartResource.getRootNode().lastChild == null) RA.App.Stores.chartResource.addNoResultsNode();

        // reload grid
        this.transformChartData();
        RA.App.Grid.suspendLayout = false;
        RA.App.Grid.doLayout();
        Ext4.getCmp('advFilterMain').disableFilter();
    },

    /*
     * Deletes all allocations for the given resource
     * @param {Number} resourceId
     */
    deleteResourceAllocations: function (resourceId) {

        // delete all entries in chartEvent
        var queryRet = RA.App.Stores.chartEvent.queryBy(function (element) {
            return element.get('resourceId') == resourceId &&
                element.get('allocId') != 0;
        });

        RA.App.Grid.suspendLayout = true;
        if (queryRet.length > 0) {

            for (var i = 0; i < queryRet.length; i++) {
                this.deleteChartAllocation(queryRet.get(i));
            }
        }

        // remove resource in chartResource
        RA.App.Stores.chartResource.getRootNode().eachChild(function (res) {
            if (res && res.get('resourceId') == resourceId) {
                res.removeAll();

                if (RA.App.Settings.get('includeAllResources') == 'F') {
                    res.remove();
                }
            }
        });

        // show "No Results.." text if grid is empty
        if (RA.App.Stores.chartResource.getRootNode().lastChild == null) RA.App.Stores.chartResource.addNoResultsNode();

        // reload grid
        this.transformChartData();
        RA.App.Grid.suspendLayout = false;
        RA.App.Grid.doLayout();
        Ext4.getCmp('advFilterMain').disableFilter();

        // update Resource labels in Toolbar
        this.adjustToolbarResourceLabels();
    },

    /*
     * Updates the label Total resource count
     */
    adjustToolbarResourceLabels: function () {

        // update Total. do nothing if "Include resources without allocations" settings is true
        if (RA.App.Settings.get('includeAllResources') == 'F') {
            var totalResourcesCount = Number(Ext4.getCmp('ra-total-page').getValue());
            Ext4.getCmp('ra-total-page').setValue(totalResourcesCount - 1);
        }
    },

    /*
     * Returns the treestore node of the given array-like index
     * @param {Number} index the row number (starts at 0)
     * @return {RA.Cmp.Model.GridAllocation} the row model in the tree store
     */
    getAt: function (index) {
        var current = 0;
        return (function find(nodes) {
            var len = nodes.length;
            for (var i = 0; i < len; i++) {
                if (current === index) {
                    return nodes[i];
                }
                current++;
                var found = find(nodes[i].childNodes);
                if (found) {
                    return found;
                }
            }
        }(this.tree.root.childNodes));
    },

    /*
     * Removed first child of the store if it is a 'no results' node
     */
    removeNoResultNode: function () {
        var root = this.getRootNode();
        var firstChildName = root.getChildAt(0).get('name');
        if (firstChildName == translatedStrings.getText('SS.MESSAGE.NO_RESULTS_VIEW') || firstChildName == translatedStrings.getText('SS.MESSAGE.NO_RESULTS_SEARCH')) {
            this.noResultText = firstChildName;
            root.removeChild(root.getChildAt(0));
        }
    },

    getResourceObjByRow: function (rowNum) {
        var rnode = null;
        this.getRootNode().cascadeBy(function (node) {
            if (node.get('cellid') == rowNum) {
                rnode = node;
            }
        });
        return rnode;
    },

    /*
     * Checks if a resource node has a project template child node
     * @param {RA.Cmp.Model.GridAllocation} resource node of instance Ext.data.NodeInterface
     * @return {Boolean} true if found, otherwise false
     */
    hasProjectTemplate: function (resourceNode) {
        var project = resourceNode.getChildAt(0);
        while (project) {
            if (project.raw.status == 'template') return true;
            project = project.nextSibling;
        }

        return false;
    }
});
