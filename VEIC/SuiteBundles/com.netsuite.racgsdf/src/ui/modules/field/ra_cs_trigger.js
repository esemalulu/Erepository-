/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.SearchResource', {
	extend: 'Ext.form.field.Trigger',
	cls: 'ra-resource-search',
	width: 250,
	triggerCls: 'ra-search-resource-trigger',
	triggerWrapCls: 'ra-search-resource-trigger',
	onTriggerClick: function () {
		perfTestLogger.start('Search Resource (inline)');
		if (RA.App.Stores.chartEvent.areThereChanges()) {
			alert(translatedStrings.getText('MESSAGE.ERROR.UNSAVED_PENDING_CHANGES'));
			return false;
		}
		var searchString = Ext4.String.trim(this.getValue());
		if ((searchString.length < 3) && (searchString.length > 0)) {
			alert(translatedStrings.getText('MESSAGE.ERROR.MIN_CHAR_SEARCH'));
			return false;
		}
		RA.App.Stores.chartResource.loadWithFilters(RA.App.Constant.LOAD_MODE_SEARCH);
	}
});

Ext4.define('RA.Cmp.ColorField', {
	extend: 'Ext4.form.field.Trigger',
	value: '',
	editable: false,
	labelSeparator: '',
	labelAlign: 'left',
	hiddenValue: '',
	labelWidth: 100,
	width: 145,
	onTriggerClick: function (event) {
		this.fireEvent('triggerclick', event);
	},
	getValue: function () {
		return this.hiddenValue;
	},
	setValue: function (color) {
		if (color !== this.getValue()) {
			this.fireEvent('change', this, color, this.getValue());
		}
		this.hiddenValue = color;
		this.setFieldStyle('background-color: #' + color + '; background-image: none;');
	},
	initComponent: function () {
		this.hiddenValue = this.value;
		this.value = '';
		var config = {}, me = this;
		Ext4.apply(this, Ext4.apply(this.initialConfig, config));
		this.callParent(arguments);
		me.on('triggerclick', function (event) {
			var oldColourMenu = Ext4.getCmp('ra-picker-' + me.id);
			if (oldColourMenu) {
				oldColourMenu.destroy();
			}
			var colourMenu = Ext4.create('Ext4.menu.ColorPicker', {
				id: 'ra-picker-' + me.id,
				cls: 'ra-color-picker',
				colors: [
					'000000', '993300', '333300', '003300', '003366', '000080', '333399', '333333', // row 1
					'800000', 'FF6600', '808000', '008000', '008080', '0000FF', '666699', '808080', // row 2
					'FF0000', 'FF9900', '99CC00', '339966', '33CCCC', '3366FF', '800080', '969696', // row 3
					'FF00FF', 'FFCC00', 'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0', // row 4
					'FF99CC', 'FFCC99', 'FFFF99', 'CCFFCC', 'CCFFFF', '99CCFF', 'CC99FF', 'FFFFFF' // row 5
				],
				shadow: false,
				listeners: {
					select: function (picker, color) {
						me.setValue(color);
						me.fireEvent('select', me, color);
					}
				}
			});
			colourMenu.showAt(event.getXY());
		}, this);
	},
	listeners: {
		change: function (trigger, newValue, oldValue) {
			var settings = RA.App.Settings;
			settings.beginEdit();
			settings.set(trigger.getName(), newValue);
			settings.endEdit();
		}
	}
});