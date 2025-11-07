/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.ContextMenu', {
	extend: 'Ext4.menu.Menu',
	margin: '0 0 10 0',
	floating: true,
	plain: true,
	initComponent: function (args) {
		this.callParent(args);

		this.on('mouseenter', function (menu, e, eopts) {
			if (menu.actionParams) {
				menu.actionParams.record.set('hover', 'menu');
			}
		});

		this.on('mouseleave', function (menu, e, eopts) {
			if (menu.actionParams) {
				menu.actionParams.record.set('hover', 'none');
			}
		});
	}
});