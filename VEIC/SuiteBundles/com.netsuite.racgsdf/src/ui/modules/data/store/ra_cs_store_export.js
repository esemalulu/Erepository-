/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Store.ExportResource', {
	extend: 'Sch.data.ResourceTreeStore',
	model: 'RA.Cmp.Model.ChartResource',
	folderSort: true,
	proxy: {
		type: 'rest',
		url: nlapiResolveURL('SUITELET', 'customscript_proj_racg_su_resource', 'customdeploy_proj_racg_su_resource') + '&isResource=T',
		reader: {
			type: 'json'
		}
	},
	listeners: {
		beforeload: function (store) {
			store.isLoaded = false;
		},
		load: function (store, root, childNodes, success) {
			if (success) {
				store.isLoaded = true;
				RA.App.Toolbar.exportFile();
			}
		}
	}
});
Ext4.define('RA.Cmp.Store.ExportAllocations', {
	extend: 'Sch.data.EventStore',
	model: 'RA.Cmp.Model.ChartAllocation',
	proxy: {
		type: 'rest',
		url: nlapiResolveURL('SUITELET', 'customscript_proj_racg_su_allocation', 'customdeploy_proj_racg_su_allocation') + '&isResource=F',
		reader: {
			type: 'json',
			root: 'data'
		}
	},
	listeners: {
		beforeload: function (store) {
			store.isLoaded = false;
		},
		load: function (store, childNodes, success) {
			if (success) {
				store.isLoaded = true;
				RA.App.Toolbar.exportFile();
			}
		}
	}
});