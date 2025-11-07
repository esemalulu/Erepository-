/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.App.Cache', {
	singleton: true,

	init: function () {
		Ext4.apply(this, {
			customer: Ext4.create('RA.Cmp.Cache.Customer')
		});
	}
});