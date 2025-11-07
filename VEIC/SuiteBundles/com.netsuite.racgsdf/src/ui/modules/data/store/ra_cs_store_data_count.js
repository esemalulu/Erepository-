/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Store.DataCount', {
	extend: 'Ext4.data.JsonStore',
	model: 'RA.Cmp.Model.DataCount',
	constructor: function (config) {
		Ext4.apply(config, {
			proxy: {
				type: 'ajax',
				url: config.url,
				reader: {
					type: 'json',
					root: config.root || 'dataCount',
					idProperty: config.idProperty || 'recordType'
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
	}
});


Ext4.define('RA.Cmp.Store.ResourceCount', {
	extend: 'Ext4.data.JsonStore',
	listeners: {
		load: function (store, root, childNodes, success) {
			var rawData = store.getProxy().getReader().jsonData;
			var total = +rawData.total || 0;
			Ext4.getCmp('ra-total-page').setValue(total);
		}
	}
});
