/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.CheckBox', {
	extend: 'Ext4.form.field.Checkbox',
	style: 'margin-top : 0px', // make checkboxes vertically aligned to center
	isEnabled: function () {
		var fn = this.featureName;
		if (fn != null && fn != '' && RA.App.Stores.featureStore.getById(fn)) {
			return RA.App.Stores.featureStore.getById(fn).get('isEnabled');
		}
		return true;
	},
	listeners: {
		change: function (checkbox, newValue, oldValue) {
			var value = 'F';
			if (newValue == true) {
				value = 'T';
			}
			var settings = RA.App.Settings;
			settings.beginEdit();
			settings.set(checkbox.getName(), value);
			settings.endEdit();
		}
	}
});