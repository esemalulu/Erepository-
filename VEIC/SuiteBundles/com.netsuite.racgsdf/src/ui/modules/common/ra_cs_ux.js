/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.LargeDataItemSelector', {
	extend: 'Ext4.ux.form.ItemSelector',
	fromTitle: 'Click Selection to Add', // TODO:
	// translatedStrings.getText('ITEMSELECTOR.CLICK_TO_ADD'),
	toTitle: 'Current Selection', // TODO:
	// translatedStrings.getText('ITEMSELECTOR.CURRENT_SELECTION'),
	displayField: 'name',
	valueField: 'id',
	fromButtons: [
		'add',
		'remove'
	],
	toButtons: [
		'up',
		'down'
	],
	fromButtonsText: {
		up: translatedStrings.getText('TOOLTIP.MOVE_UP'),
		add: translatedStrings.getText('TOOLTIP.ADD_TO_SELECTED'),
		remove: translatedStrings.getText('TOOLTIP.REMOVE_FROM_SELECTED'),
		down: translatedStrings.getText('TOOLTIP.MOVE_DOWN')
	},
	toButtonsText: {
		up: translatedStrings.getText('TOOLTIP.MOVE_UP'),
		add: translatedStrings.getText('TOOLTIP.ADD_TO_SELECTED'),
		remove: translatedStrings.getText('TOOLTIP.REMOVE_FROM_SELECTED'),
		down: translatedStrings.getText('TOOLTIP.MOVE_DOWN')
	}
});

Ext4.define('RA.Cmp.LargeDataMultiSelect', {
	extend: 'Ext4.ux.form.MultiSelect',
	alias: 'widget.ra-multi-select-field'
});

Ext4.define('RA.Cmp.SmallDataMultiSelect', {
	extend: 'Ext4.ux.form.MultiSelect'
});