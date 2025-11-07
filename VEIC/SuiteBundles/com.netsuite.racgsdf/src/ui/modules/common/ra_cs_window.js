/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Window', {
	extend: 'Ext4.window.Window',
	padding: 10,
	layout: 'form',
	closable: true,
	closeAction: 'hide',
	autoHeight: true,
	plain: true,
	modal: true,
	resizable: false,
	cls: 'ra-form-window',
	ghost: false,
	defaults: {
		labelSeparator: ''
	}
});