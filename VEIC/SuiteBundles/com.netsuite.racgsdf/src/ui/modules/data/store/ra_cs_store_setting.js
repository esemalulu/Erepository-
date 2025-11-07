/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Store.Settings', {
	extend: 'RA.Cmp.Store.GenericDropDown',
	model: 'RA.Cmp.Model.Settings',
	listeners: {
		load: function (store, records, success) {
			if (success) {
				store.isLoaded = true;
				RA.App.Settings = store.getAt(0);
			}
		}
	},

	getExpandedAllocations: function () {
		return RA.App.Settings.get('expandedAllocations').split(',').filter(function (element) {
				   return !!element;
			   })
			   || [];
	},

	setExpandedAllocations: function (resourceArray) {
		RA.App.Settings.beginEdit();
		RA.App.Settings.set('expandedAllocations', resourceArray.join(','));
		RA.App.Settings.endEdit();
	},

	handleRowCollapse: function (nodeId) {
		var expandedAllocations = this.getExpandedAllocations(),
			newExpandedAllocations = expandedAllocations.filter(function (element, index, array) {
				var parentElement = (element.split(RA.App.Constant.SEPARATOR_ID)[0]); //also remove child entry for collapseAll
				return !(parentElement == nodeId || element == nodeId);
			});

		this.setExpandedAllocations(newExpandedAllocations);
	},

	handleRowExpand: function (nodeId) {
		var expandedAllocations = this.getExpandedAllocations();

		if (expandedAllocations.indexOf(nodeId) == -1) {
			expandedAllocations.push(nodeId);
			this.setExpandedAllocations(expandedAllocations);
		}
	},

	getLimit: function () {
		var chartDensity = this.getAt(0).get('chartDensity');
		var resPerPage;
		switch (chartDensity) {
			case 1:
				resPerPage = 25;
				break;
			case 2:
				resPerPage = 20;
				break;
			case 3:
				resPerPage = 15;
				break;
		}
		return resPerPage;
	}
});