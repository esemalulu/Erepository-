/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.LargeDataTextField', {
	extend: 'Ext4.form.field.Text',
	labelAlign: 'top',
	flex: 10,
	readOnly: true,
	labelSeparator: '',
	fieldLabel: translatedStrings.getText('COMBOBOX.RESOURCE'),
	emptyText: translatedStrings.getText('MESSAGE.EMPTYTEXT.RESOURCE'),
	hidden: true,
	allowBlank: true,
	afterLabelTextTpl: [
		'<tpl if="allowBlank === false">',
		'<label class="ra-required-field">*</label>',
		'</tpl>'
	]
});

Ext4.define('RA.Cmp.Text', {
	extend: 'Ext4.form.field.Text',
	labelSeparator: '',
	labelAlign: 'top',
	afterLabelTextTpl: [
		'<tpl if="allowBlank === false">',
		'<label class="ra-required-field">*</label>',
		'</tpl>'
	]
});

Ext4.define('RA.Cmp.LegendLabel', {
	extend: 'Ext4.toolbar.TextItem',
	margin: '0 15 0 -10'
});

Ext4.define('RA.Cmp.RightLabel', {
	extend: 'Ext4.toolbar.TextItem',
	margin: '0 0 0 5'
});