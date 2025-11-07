/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Date', {
	extend: 'Ext4.form.field.Date',
	alias: 'widget.ra-date',
	labelAlign: 'top',
	labelWidth: 110,
	allowBlank: false,
	format: convertNSDateFormat(),
	startDay: '' + RA.Util.CustomFunctions.getWeekStart(),
	labelSeparator: '',
	submit: 'Y/m/d',
	afterLabelTextTpl: [
		'<tpl if="allowBlank === false">',
		'<label class="ra-required-field">*</label>',
		'</tpl>'
	],
	listeners: {
		change: function (me, newValue) {
			if (Ext4.isDate(newValue)) {
				me.lastValidValue = newValue;
			}
		}
	}
});

Ext4.define('RA.App.RangeField', {
	extend: 'Ext4.form.field.Date',
	alias: 'widget.ra-date-picker',
	singleton: true,
	hideLabel: true,
	height: 22,
	cls: 'ra-date-picker',
	id: 'ra-date-picker',
	format: convertNSDateFormat(),
	startDay: '' + RA.Util.CustomFunctions.getWeekStart(),
	update: function () {
		this.suspendEvents();
		this.setValue(RA.App.ModeManager.getActive().getStartDate());
		this.resumeEvents();
	},
	listeners: {
		change: function (me, newDate) {
			var viewPreset = RA.App.ModeManager.getActive().getViewPreset();

			if (RA.App.ModeManager.mode == 'grid') {
				RA.App.Grid.switchViewPreset(viewPreset, newDate);
			} else {
				RA.App.Chart.setStart(newDate);
				RA.App.Chart.switchViewPreset(viewPreset);
			}
		}
	}
});