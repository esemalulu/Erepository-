/**
 * © 2015 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.App.NSProps', {
	singleton: true,
	getDateFormat: function () {
		if (!this.dateFormat) this.dateFormat = convertNSDateFormat();
		return this.dateFormat;
	}
});

function convertNSDateFormat() {
	// convert NS format to ExtJS notation
	var dateFormat = 'Y/n/j';
	switch (RA.App.Context.getPreference('dateformat')) {
		case 'M/D/YYYY':
			dateFormat = 'n/j/Y';
			break;
		case 'D/M/YYYY':
			dateFormat = 'j/n/Y';
			break;
		case 'D-Mon-YYYY':
			dateFormat = 'j-M-Y';
			break;
		case 'D.M.YYYY':
			dateFormat = 'j.n.Y';
			break;
		case 'D-MONTH-YYYY':
			dateFormat = 'j-F-Y';
			break;
		case 'D MONTH, YYYY':
			dateFormat = 'j F, Y';
			break;
		case 'YYYY/M/D':
			dateFormat = 'Y/n/j';
			break;
		case 'YYYY-M-D':
			dateFormat = 'Y-n-j';
			break;
		case 'MM/DD/YYYY':
			dateFormat = 'm/d/Y';
			break;
		case 'DD/MM/YYYY':
			dateFormat = 'd/m/Y';
			break;
		case 'DD-Mon-YYYY':
			dateFormat = 'd-M-Y';
			break;
		case 'DD.MM.YYYY':
			dateFormat = 'd.m.Y';
			break;
		case 'DD-MONTH-YYYY':
			dateFormat = 'd-F-Y';
			break;
		case 'DD MONTH, YYYY':
			dateFormat = 'd F, Y';
			break;
		case 'YYYY/MM/DD':
			dateFormat = 'Y/m/d';
			break;
		case 'YYYY-MM-DD':
			dateFormat = 'Y-m-d';
			break;
		case 'YYYY"年"MM"月"DD"日"':
			dateFormat = 'Y年m月j日';
			break;
		case 'YYYY"년" MM"월" DD"일"':
			dateFormat = 'Y년 m월 j일';
			break;
	}
	return dateFormat;
};

function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
};

function reselectProjectFilter() {
	var arrCurrId = RA.App.Stores.projectAndTemplateStore.data.keys;
	var filterProject = Ext4.getCmp('filter-project');

	if (filterProject) {
		var prevProject = [];

		//Get previous value from settings record
		var filterCmp = Ext4.getCmp('savedFilters').getSelectedRecord();
		var filterId = filterCmp.get('id');
		var owner = filterCmp.get('owner');
		var isDefault = filterCmp.get('isDefault');

		var filterValuesIndex = RA.App.Stores.filterValues.findBy(function (filterValues) {
			return filterValues.get('filterId') == filterId && filterValues.get('owner') == (isDefault
																							 ? nlapiGetContext().user
																							 : owner);
		});
		var filterValuesRecord = RA.App.Stores.filterValues.getAt(filterValuesIndex);

		if (filterValuesRecord) {
			var filterValuesJson = filterValuesRecord.get('filterValuesJson');
			if (filterValuesJson['project']) {
				prevProject = [].concat(filterValuesJson['project']);
			}
		}

		//Remove possible preselected project template if they are no longer available
		prevProject = prevProject.filter(
			function (selectedId) {
				return (arrCurrId.indexOf(selectedId.toString()) >= 0);
			}
		);
		filterProject.setValue(null);
		if (!filterProject.isMax) {
			//Manual reload for smallData; largeData loads dynamically
			filterProject.down('ra-multiselect').createDropdownContents();
		}
		filterProject.setValue(prevProject);
	}
}

Ext4.define('RA.App.Context', {
	singleton: true,
	context: nlapiGetContext(),
	getUser: function () {
		return this.executeAndRetry('user');
	},
	getVersion: function () {
		return this.executeAndRetry('version');
	},
	getPreference: function (p) {
		return this.executeAndRetry('preference', [p]);
	},
	executeAndRetry: function (command, args) {
		var value = null;
		var isFound = false;
		var trials = 0;
		var maxTrials = 10;
		var waitingTimeInSec = 0.25;

		// to handle concurrent calls, when an error is encountered, retry command up to set max trials
		while (!isFound && trials < maxTrials) {
			try {
				// run command
				switch (command) {
					case 'user':
						value = this.context.getUser();
						break;
					case 'version':
						value = this.context.getVersion();
						break;
					case 'preference':
						value = this.context.getPreference(args[0]);
						break;
				}
				isFound = true;
			} catch (ex) {
				isFound = false;
				this.forceWait(waitingTimeInSec);
				trials++;
			}
		}
		if (!isFound) {
			console.log('Failed to find value for context');
		}
		return value;
	},
	forceWait: function (sec) {
		var start = new Date();
		while ((((new Date()) - start) / 1000) < sec) {
			// do nothing
		}
	}
});
