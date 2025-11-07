/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Cache.Customer', {
	extend: 'RA.Cmp.Cache.Base',
	model: 'RA.Cmp.Model.Customer',

	constructor: function (config) {
		this.callParent([
			{
				proxy: {
					type: 'ajax',
					url: nlapiResolveURL('SUITELET', 'customscript_proj_racg_su_cache_cust', 'customdeploy_proj_racg_su_cache_cust'),
					reader: {
						type: 'json',
						root: 'customers',
						idProperty: 'internalId'
					}
				}
			}
		]);
	}
});