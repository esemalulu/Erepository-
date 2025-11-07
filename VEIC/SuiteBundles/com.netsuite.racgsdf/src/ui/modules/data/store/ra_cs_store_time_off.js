/**
 * © Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Store.TimeOff', {
	extend: 'Ext4.data.JsonStore',
	model: 'RA.Cmp.Model.ApprovedTimeOff',
	constructor: function (config) {
		Ext4.apply(config, {
			proxy: {
				type: 'ajax',
				url: config.url,
				reader: {
					type: 'json',
					root: 'data',
					idProperty: 'internalId'
				}
			}
		});

		this.callParent([
			config
		]);

		var me = this;

		me.on('load', function (me) {
			me.isDoneLoading = true;
		});

		me.timeOffCache = {};
	},
	getResourceTimeOffDates: function (resourceId) {
		var dates = this.getDatesFromCache(resourceId);

		if (dates == null) {
			dates = [];

			if (this.data && this.data.items) {
				for (i in this.data.items) {
					var timeOff = this.data.items[i];

					if (timeOff.get('employeeId') == resourceId) {
						dates.push(timeOff.get('timeOffDate').getTime());
					}
				}
			}

			this.setDatesToCache(resourceId, dates);
		}

		return dates;
	},
	getDatesFromCache: function (resourceId) {
		if (this.timeOffCache.hasOwnProperty(resourceId)) {
			return this.timeOffCache[resourceId];
		}

		return null;
	},
	clearTimeOffCache: function (resourceId, dates) {
		this.timeOffCache = {};
	},
	setDatesToCache: function (resourceId, dates) {
		this.timeOffCache[resourceId] = dates;
	},
	getHoursFromDatesAndResource: function (resourceId, arrDates) {
		var totalHours = 0,
			matchDate, timeOffDate, timeOff;
		arrDates = arrDates || [];

		if (this.data && this.data.items) {
			for (i in this.data.items) {
				timeOff = this.data.items[i];

				if (timeOff.get('employeeId') == resourceId) {
					for (var i = 0; i < arrDates.length; i++) {
						//Align hour components
						timeOffDate = new Date(timeOff.get('timeOffDate').getTime());
						timeOffDate.setHours(0, 0, 0, 0);
						matchDate = new Date(arrDates[i].getTime());
						matchDate.setHours(0, 0, 0, 0);
						//Date comparison
						if (timeOffDate.getTime() == matchDate.getTime()) {
							totalHours = totalHours + timeOff.get('amountOfTime');
						}
					}
				}
			}
		}

		return totalHours;
	},
	listeners: {
		load: function () {
			if (RA.App.Chart) {
				RA.App.Chart.refreshNonWorking(true);
			}
		}
	}
});