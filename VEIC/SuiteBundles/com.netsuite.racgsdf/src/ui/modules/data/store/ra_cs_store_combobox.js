/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Store.GenericDropDown', {
	extend: 'Ext4.data.JsonStore',
	constructor: function (config) {
		Ext4.apply(config, {
			proxy: {
				type: 'ajax',
				url: config.url,
				reader: {
					type: 'json',
					root: config.root || 'data',
					idProperty: config.idProperty || 'id'
				}
			}
		});

		this.callParent([
			config
		]);

		var me = this;

		me.on('load', function (me) {
			//console.log('\tdone loading: ' + me.storeId);
			me.isDoneLoading = true;
		});
	}
});
Ext4.define('RA.Cmp.Store.DropDown', {
	extend: 'RA.Cmp.Store.GenericDropDown',
	model: 'RA.Cmp.Model.DropDown'
});
Ext4.define('RA.Cmp.Store.PageDropDown', {
	extend: 'RA.Cmp.Store.DropDown',
	model: 'RA.Cmp.Model.PageDropDown'
});