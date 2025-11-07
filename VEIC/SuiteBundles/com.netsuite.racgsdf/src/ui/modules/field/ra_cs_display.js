/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Display', {
	extend: 'Ext4.form.field.Display',
	alias: 'widget.ra-display',
	labelAlign: 'top',
	labelSeparator: '',
	height: 35,
	fieldStyle: {
		'overflow': 'hidden',
		'display': 'block',
		'white-space': 'nowrap',
		'text-overflow': 'ellipsis',
		'font-weight': 'bold',
		'color': '#545454'
	},
	value: translatedStrings.getText('STORE.-ALL-'),
	isEnabled: function () {
		var fn = this.featureName;
		if (fn != null && fn != '' && RA.App.Stores.featureStore.getById(fn)) {
			return RA.App.Stores.featureStore.getById(fn).get('isEnabled');
		}
		return true;
	},
	listeners: {
		beforeshow: function (me) {
			return me.isEnabled();
		},
		boxready: function (me, width, height) {
			var isEnabled = me.isEnabled();
			if (!isEnabled) {
				me.hide();
			}
		}
	}
});