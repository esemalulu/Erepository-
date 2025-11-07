/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Number', {
	extend: 'Ext4.form.field.Number',
	labelSeparator: '',
	labelAlign: 'top',
	labelWidth: 110,
	minValue: 0.0001, // prevents negative numbers
	allowDecimal: true,
	decimalPrecision: 4,
	// Remove spinner buttons, and arrow key and mouse wheel listeners
	hideTrigger: true,
	keyNavEnabled: false,
	mouseWheelEnabled: false,
	afterLabelTextTpl: [
		'<tpl if="allowBlank === false">',
		'<label class="ra-required-field">*</label>',
		'</tpl>'
	],
	isEnabled: function () {
		var fn = this.featureName;
		if (fn != null && fn != '' && RA.App.Stores.featureStore.getById(fn)) {
			return RA.App.Stores.featureStore.getById(fn).get('isEnabled');
		}
		return true;
	},
	listeners: {
		beforeshow: function (numberbox) {
			return this.isEnabled();
		},
		boxready: function (numberbox, width, height) {
			var isEnabled = this.isEnabled();
			if (!isEnabled) {
				this.hide();
			}
		}
	}
});

Ext4.define('RA.Cmp.NumberField', {
	extend: 'Ext4.form.field.Number',
	alias: 'widget.ra-number-field',
	allowDecimal: false,
	hideTrigger: true,
	keyNavEnabled: false,
	mouseWheelEnabled: false,
	minValue: 1,
	listeners: {
		blur: function (me) {
			if (me.getValue() == null) {
				me.setValue(1);
			}
		}
	}
});