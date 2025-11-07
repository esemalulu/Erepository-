/**
 * © 2017 NetSuite Inc. User may not copy, modify, distribute, or re-bundle or
 * otherwise make available this code.
 */

Ext4.define('RA.Cmp.ChartDensityRadio', {
	extend: 'Ext4.form.field.Radio',
	listeners: {
		change: function (radio, newValue, oldValue) {
			if (newValue) {
				var settings = RA.App.Settings;
				settings.beginEdit();
				settings.set('chartDensity', radio.inputValue);
				settings.endEdit();
			}
		}
	}
});