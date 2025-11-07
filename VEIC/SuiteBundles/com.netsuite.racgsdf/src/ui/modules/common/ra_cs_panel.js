/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Panel', {
	extend: 'Ext4.panel.Panel',
	alias: 'widget.ra-panel',
	border: false,
	layout: {
		type: 'hbox',
		align: 'middle'
	},
	defaults: {
		margin: '0 15 0 0'
	}
});

Ext4.define('RA.Cmp.MainPanel', {
	extend: 'RA.Cmp.Panel',
	renderTo: Ext4.get('main_form'),
	minWidth: 1155
});

Ext4.define('RA.Cmp.TogglePanel', {
	extend: 'RA.Cmp.MainPanel',
	id: 'ra-toggle',
	items: [
		Ext4.create('RA.Cmp.ToggleGridChart', {
			id: 'ra-toggleGrid',
			text: translatedStrings.getText('GRID'),
			mode: RA.App.Constant.MODE_GRID,
			pressed: true
		}),
		Ext4.create('RA.Cmp.MenuSeparatorSmall'),
		Ext4.create('RA.Cmp.ToggleGridChart', {
			id: 'ra-toggleChart',
			text: translatedStrings.getText('CHART'),
			mode: RA.App.Constant.MODE_CHART
		})
	]
});

Ext4.define('RA.Cmp.FormPanel', {
	extend: 'Ext4.form.Panel',
	alias: 'widget.ra-form-panel',
	layout: 'form',
	border: false,
	padding: 20
});

Ext4.define('RA.Cmp.FormPanelColumn', {
	extend: 'RA.Cmp.FormPanel',
	alias: 'widget.ra-form-panel-column',
	padding: 0,
	cls: 'ra-form-panel-column',
	defaults: {
		cls: 'ra-form-panel-column-item'
	}
});