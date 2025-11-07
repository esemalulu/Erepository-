/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.IconButton', {
	extend: 'Ext4.button.Button',
	cls: 'ra-icon-btn',
	scale: 'medium',
	width: 20,
	height: 24
});

Ext4.define('RA.Cmp.LargeDataButton', {
	extend: 'Ext4.button.Button',
	iconCls: 'ra-largedata-icon',
	cls: 'ra-largedata-btn',
	tooltip: translatedStrings.getText('TOOLTIP.LARGE_DATA.CHOOSE_RESOURCE'),
	margin: '20 0 0 5',
	hidden: true,
	maxWidth: 23
});

Ext4.define('RA.Cmp.LargeDataSearchButton', {
	extend: 'Ext4.button.Button',
	iconCls: 'ra-search-icon',
	cls: 'ra-search-btn',
	tooltip: translatedStrings.getText('TOOLTIP.RESOURCE_SEARCH'),
	margin: '20 0 0 5',
	hidden: true,
	isMax: null,
	formId: null,
	handler: function () {
		RA.App.Forms.resourceSearchForm.isAdd = true;
		RA.App.Forms.resourceSearchForm.isMax = this.isMax;
		RA.App.Forms.resourceSearchForm.formId = this.formId;
		RA.App.Forms.resourceSearchForm.show();
	},
	maxWidth: 23
});

Ext4.define('RA.Cmp.RectButton', {
	extend: 'Ext4.button.Button',
	cls: 'ra-rect-btn',
	initComponent: function (args) {
		this.callParent(args);
	}
});

Ext4.define('RA.Cmp.ArrowButton', {
	extend: 'RA.Cmp.RectButton',
	cls: 'ra-rect-btn-arrow'
});

Ext4.define('RA.Cmp.BlueButton', {
	extend: 'RA.Cmp.RectButton',
	alias: 'widget.ra-blue-button',
	cls: 'ra-rect-btn ra-rect-btn-blue'
});

Ext4.define('RA.Cmp.GrayButton', {
	extend: 'RA.Cmp.RectButton',
	alias: 'widget.ra-gray-button',
	cls: 'ra-rect-btn ra-rect-btn-gray'
});

Ext4.define('RA.Cmp.SquareIconButton', {
	extend: 'Ext4.button.Button',
	alias: 'widget.ra-square-icon-btn',
	cls: 'ra-icon-btn2',
	scale: 'medium',
	width: 16,
	height: 24
});