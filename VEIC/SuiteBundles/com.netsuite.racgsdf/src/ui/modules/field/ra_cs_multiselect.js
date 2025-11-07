/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

var CONSTANTS = {
	DropdownContainer: {
		HEIGHT: 26, //Small Drop down height
		WIDTH: 200, //Small Drop down width
		ENTRY_HEIGHT: 250, //Dropdown list height
		SELECTED_WIDTH: 20, //Number Count indicator width
		BUTTONSPANEL_WIDTH: 40 //clear button and view dropdown entry button width
	}
};

Ext4.define('RA.Cmp.DropdownSelected', {
	extend: Ext4.form.field.Text,
	xtype: 'dropdownselected',
	fieldStyle: {
		'background': '#EBEBEB',
		'border': '0 !important',
		'box-shadow': 'none !important',
		'background-image': 'none',
		'font-size': '12px',
		'text-align': 'center',
		'vertical-align': 'top'
	},
	width: CONSTANTS.DropdownContainer.SELECTED_WIDTH,
	height: CONSTANTS.DropdownContainer.HEIGHT,
	initComponent: function () {
		var me = this;
		me.emptyText = '0';
		me.setReadOnly(true);
		me.callParent(arguments);
	},
	listeners: {
		change: function (comp, newValue, oldValue) {
			var uncheck = Ext4.getCmp(comp.msId + '-dropdowncontainer_uncheckall');
			if (+newValue > 0) {
				uncheck.addCls('ra-dd-delete-icon-cls');
				uncheck.setDisabled(false);
			} else {
				uncheck.removeCls('ra-dd-delete-icon-cls');
				uncheck.setDisabled(true);
			}
		}
	}
});

Ext4.define('RA.Cmp.DropdownTextField', {
	extend: Ext4.form.field.Text,
	xtype: 'dropdowntextfield',
	width: CONSTANTS.DropdownContainer.WIDTH -
		   (70 + CONSTANTS.DropdownContainer.SELECTED_WIDTH),
	fieldStyle: {
		'background': 'white',
		'border': '0 !important',
		'box-shadow': 'none !important',
		'background-image': 'none',
	},
	enableKeyEvents: true,
	initComponent: function () {
		var me = this;
		me.callParent(arguments);
	},
	listeners: {
		keyup: function (f, e) {
			var me = this;
			var ddButton = Ext4.getCmp(me.msId + '-dropdowntextbuttons_showbutton');
			if (e.getKey && e.getKey() == e.UP) {
				ddButton.showDropdown(false);
			} else if (e.getKey && e.getKey() == e.DOWN) {
				ddButton.showDropdown(true);
			} else {
				var token = me.getToken();
				var dropdownList = Ext4.getCmp(me.msId + '-dropdowncontainer_list');
				if (token.length > 1) {
					ddButton.showDropdown(true);
					dropdownList.filter(token);
				} else {
					dropdownList.showAll();
				}
				var clearButton = Ext4.getCmp(me.msId + '-dropdowntextbuttons_clearbutton');
				if (token.length == 0) {
					clearButton.hide();
				} else {
					clearButton.show();
				}
			}
			me.focus(false, true);
		},
		blur: function () {
			var me = this;
			var dropdownCmp = Ext4.getCmp(me.msId + '-dropdowncontainer_list');
			dropdownCmp.hideOnBlur(me.msId);
		}
	},
	getToken: function () {
		var me = this;
		var token = me.getRawValue();
		return token.trim();
	}
});

Ext4.define('RA.Cmp.DropdownButtons', {
	extend: Ext4.container.Container,
	xtype: 'dropdowntextbuttons',
	width: CONSTANTS.DropdownContainer.BUTTONSPANEL_WIDTH,
	focusable: true,
	tabIndex: 1,
	layout: {
		type: 'hbox',
		pack: 'end'
	},
	initComponent: function () {
		var me = this;

		me.items = [
			{
				xtype: 'button',
				id: me.msId + '-dropdowntextbuttons_clearbutton',
				msId: me.msId,
				hidden: true,
				cls: 'ra-dd-clear-icon-cls',
				handler: function () {
					var dropdownTextField = Ext4.getCmp(me.msId + '-dropdowncontainer_textfield');
					dropdownTextField.setValue('');
					dropdownTextField.fireEvent('keyup', this);
				}
			}, {
				xtype: 'button',
				id: me.msId + '-dropdowntextbuttons_showbutton',
				msId: me.msId,
				cls: 'ra-dd-down-icon-cls',
				handler: function () {
					var me = this;
					me.showDropdown(!me.bShowEntry);

					var dropdownCmp = Ext4.getCmp(me.msId + '-dropdowncontainer_list');
					dropdownCmp.focus(false, true);
				},
				showDropdown: function (bool) {
					var me = this;
					if (bool != me.bShowEntry) {
						me.bShowEntry = bool;
						var dropdownContainer = Ext4.getCmp(me.msId + '-smalldropdown_container');
						var entryContainer = Ext4.getCmp(me.msId + '-dropdowncontainer_list');
						entryContainer.showBy(dropdownContainer, 'tl-bl');

						if (bool === true) {
							entryContainer.show();
						} else if (bool === false) {
							entryContainer.hide();
						}
					}
				}
			}
		];

		me.callParent(arguments);
	}
});

Ext4.define('RA.Cmp.DropdownEntry', {
	extend: Ext4.container.Container,
	xtype: 'dropdownentry',
	padding: 2,
	items: [
		//nbsp to show check icon
		{xtype: 'label', itemid: 'checkentry', html: '&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp', cls: 'ra-dd-entry-cls'},
		{xtype: 'label', itemid: 'displayentry', cls: 'ra-dd-entry-cls'},
	],
	initComponent: function () {
		var me = this;
		this.items[1].html = this.displayValue;
		//Need to manually set width since native extjs text wrap have bugs
		this.width = Number(this.items[1].html.length * 5);
		this.minWidth = CONSTANTS.DropdownContainer.WIDTH;

		me.callParent(arguments);
		this.selectValue = null;
		this.selected = false;
	},
	listeners: {
		afterrender: function () {
			var me = this;
			me.getEl().setStyle('background-color', '#FFFFFF');
			me.getEl().setStyle('padding-left', '5px');
			me.getEl().setStyle('padding-right', '25px');
			me.getEl().setStyle('line-height', '20px');
			me.getEl().setStyle('cursor', 'pointer');
		},
		el: {
			mouseover: function () {
				var me = Ext4.getCmp(this.id);
				me.highlight();
			},
			mouseout: function () {
				var me = Ext4.getCmp(this.id);
				me.unhighlight();
			},
			mousedown: function (f, e) {
				var me = Ext4.getCmp(this.id);

				if ((!me.selected) && Ext4.getCmp(me.msId).singleSelect) {
					var dropDownCmp = Ext4.getCmp(me.msId + '-dropdowncontainer_list');
					dropDownCmp.resetItems();
				}

				me.selected = !me.selected;
				me.selectValue = me.selected ? me.value : null;
				me.toggleIcon();

				Ext4.getCmp(me.msId).updateCount();
			}
		}
	},
	getValue: function () {
		return this.selectValue;
	},
	getDisplayValue: function () {
		return this.displayValue;
	},
	highlight: function () {
		var me = this;
		me.getEl().setStyle('background-color', '#5981B3');
	},
	unhighlight: function () {
		var me = this;
		me.getEl().setStyle('background-color', '#FFFFFF');
	},
	toggleIcon: function () {
		var me = this;
		if (me.selected) {
			me.down('label[itemid=checkentry]').addCls('ra-dd-check-icon-cls');
		} else {
			me.down('label[itemid=checkentry]').removeCls('ra-dd-check-icon-cls');
		}
	},
	doSelect: function () {
		var me = this;
		me.selected = true;
		me.selectValue = me.value;
		me.toggleIcon();
	},
	doUnselect: function () {
		var me = this;
		this.selected = false;
		me.selectValue = null;
		me.toggleIcon();
	}
});

Ext4.define('RA.Cmp.DropdownList', {
	extend: Ext4.container.Container,
	xtype: 'dropdownlist',
	autoScroll: true,
	style: {
		'border-bottom': '1px solid #CCCCCC',
		'border-left': '1px solid #CCCCCC',
		'border-right': '1px solid #CCCCCC',
		'-moz-box-shadow': '0 0 3px #C5C5C5',
		'-webkit-box-shadow': '0 0 3px #C5C5C5',
		'box-shadow': '0 0 3px #C5C5C5',
		'padding-top': '0.15cm',
		'background': 'white'
	},
	maxHeight: CONSTANTS.DropdownContainer.ENTRY_HEIGHT,
	width: CONSTANTS.DropdownContainer.WIDTH,
	floating: true,
	shadow: false,
	focusable: true,
	layout: 'vbox',
	hideOnBlur: function (msId) {
		//Use delay to allow focus property update for other component
		var task = new Ext.util.DelayedTask(function () {
			var textfieldCmp = Ext4.getCmp(msId + '-dropdowncontainer_textfield');
			var dropdownCmp = Ext4.getCmp(msId + '-dropdowncontainer_list');
			if (!(textfieldCmp.hasFocus || dropdownCmp.hasFocus)) {
				//Update flag and hide list
				var ddButton = Ext4.getCmp(msId + '-dropdowntextbuttons_showbutton');
				ddButton.showDropdown(false);
			}
		});
		task.delay(150);
	},
	initComponent: function () {
		var me = this;
		me.callParent(arguments);
	},
	listeners: {
		el: {
			focus: function () {
				var me = Ext4.getCmp(this.id);
				me.hasFocus = true;
			},
			blur: function () {
				var me = Ext4.getCmp(this.id);
				me.hasFocus = false;
				me.hideOnBlur(me.msId);
			}
		}
	},
	createItems: function (store, displayValue, value) {
		var me = this;
		Ext4.suspendLayouts();
		me.removeAll(true);

		var storeCount = store.getCount();
		var arrEntry = [], record;
		for (var i = 0; i < storeCount; i++) {
			record = store.getAt(i);

			arrEntry.push({
				xtype: 'dropdownentry',
				id: me.msId + '-dropdownentry-' + record.getId(),
				msId: me.msId,
				displayValue: record.get(displayValue),
				value: record.get(value)
			});
		}
		me.add(arrEntry);
		Ext4.resumeLayouts();
		me.doLayout();
	},
	resetItems: function () {
		var me = this;
		var arrItems = me.items;
		for (var i = 0; i < arrItems.length; i++) {
			arrItems.getAt(i).doUnselect();
		}
	},
	getArrayValue: function () {
		var arrItems = this.items;
		var arrValues = [], value = null;
		for (var i = 0; i < arrItems.length; i++) {
			value = arrItems.getAt(i).getValue();
			if (value != null) {
				arrValues.push(value);
			}
		}
		return arrValues;
	},
	getArrayDisplayValue: function () {
		var arrItems = this.items;
		var arrDisplay = [], value = null;
		for (var i = 0; i < arrItems.length; i++) {
			value = arrItems.getAt(i).getValue();
			if (value != null) {
				arrDisplay.push(arrItems.getAt(i).getDisplayValue());
			}
		}
		return arrDisplay;
	},
	filter: function (token) {
		var arrItems = this.items;
		var entry = null;
		var base, substr = token.toLowerCase();
		for (var i = 0; i < arrItems.length; i++) {
			entry = arrItems.getAt(i);
			base = entry.displayValue && entry.displayValue.toLowerCase();
			if (base.indexOf(substr) >= 0) {
				entry.show();
			} else {
				entry.hide();
			}
		}
	},
	showAll: function () {
		var arrItems = this.items;
		var entry = null;
		for (var i = 0; i < arrItems.length; i++) {
			entry = arrItems.getAt(i);
			entry.show();
		}
	}
});

Ext4.define('RA.Cmp.DropDownContainer', {
	extend: Ext4.panel.Panel,
	xtype: 'dropdowncontainer',
	layout: 'hbox',
	border: 0,
	cls: 'ra-dd-container',
	layout: 'hbox',
	height: CONSTANTS.DropdownContainer.HEIGHT,
	width: CONSTANTS.DropdownContainer.WIDTH,
	initComponent: function () {
		var me = this;

		me.items = [
			{
				xtype: 'dropdownselected',
				id: me.msId + '-dropdowncontainer_selected',
				msId: me.msId
			}, {
				xtype: 'button',
				id: me.msId + '-dropdowncontainer_uncheckall',
				msId: me.msId,
				cls: 'ra-dd-delete-bg-cls',
				handler: function () {
					Ext4.getCmp(me.msId).reset();
				}
			}, {
				xtype: 'dropdowntextfield',
				id: me.msId + '-dropdowncontainer_textfield',
				msId: me.msId
			}, {
				xtype: 'dropdowntextbuttons',
				id: me.msId + '-dropdowncontainer_buttons',
				msId: me.msId
			}
		];

		this.dropdownList = Ext4.getCmp(me.msId + '-dropdowncontainer_list') ||
							Ext4.create('RA.Cmp.DropdownList', {
								id: me.msId + '-dropdowncontainer_list',
								msId: me.msId
							});
		this.dropdownList.hide();

		me.callParent(arguments);
	},
	listeners: {
		afterrender: function () {
			var me = this;

			this.dropdownList.showBy(me, 'tl-bl');
			this.dropdownList.hide();

			var countToolTip = Ext4.create('Ext4.tip.ToolTip', {
				id: me.msId + '-tooltip',
				dismissDelay: 0,
				target: me.msId + '-dropdowncontainer_selected',
				html: ''
			});
			this.countToolTip = countToolTip;
		}
	}
});

/**
 * SmallDataDropdown - Create component with MultiSelect Value for Small Data
 * @param {Object} store - Extjs store to load value
 * @param {String} displayValue - store column that will be display on dropdown entries
 * @param {String} value - Internal value used to set
 */
Ext4.define('RA.Cmp.MultiSelect', {
	extend: Ext4.panel.Panel,
	xtype: 'ra-multiselect',
	disabledCls: 'ra-dd-filter-disabled',
	width: CONSTANTS.DropdownContainer.WIDTH,
	border: 0,
	maskOnDisable: false,
	singleSelect: false,
	initComponent: function () {
		this.items = [
			{
				xtype: 'text',
				text: this.fieldLabel,
				mask: false
			},
			{
				xtype: 'dropdowncontainer',
				id: this.id + '-smalldropdown_container',
				msId: this.id,
				mask: false
			}
		];
		this.callParent(arguments);
	},
	createDropdownContents: function () {
		var me = this;
		var displayValue = this.displayValue || 'name';
		var value = this.value || 'id';
		var dropdownList = Ext4.getCmp(me.id + '-dropdowncontainer_list');
		dropdownList.createItems(me.store, displayValue, value);
	},
	getValue: function () {
		var dropdownList = Ext4.getCmp(this.id + '-dropdowncontainer_list');
		return dropdownList.getArrayValue();
	},
	getDisplayValue: function () {
		var dropdownList = Ext4.getCmp(this.id + '-dropdowncontainer_list');
		return dropdownList.getArrayDisplayValue();
	},
	setValue: function (value, bAppend) {
		var arrValue = (value && value instanceof Array) ? value : [value];
		var dropdownEntry = null;
		if (!bAppend) {
			var dropDownCmp = Ext4.getCmp(this.id + '-dropdowncontainer_list');
			dropDownCmp.resetItems();
		}
		for (var i = 0; i < arrValue.length; i++) {
			dropdownEntry = Ext4.getCmp(this.id + '-dropdownentry-' + arrValue[i]);
			if (dropdownEntry) {
				dropdownEntry.doSelect();
			}
		}
		Ext4.getCmp(this.id).updateCount();
	},
	reset: function () {
		this.setValue(null);
	},
	enable: function () {
		Ext4.getCmp(this.id + '-dropdowncontainer_list').enable();
		Ext4.getCmp(this.id + '-dropdowncontainer_uncheckall').show();
		this.callParent(arguments);
	},
	disable: function () {
		Ext4.getCmp(this.id + '-dropdowncontainer_list').disable();
		Ext4.getCmp(this.id + '-dropdowncontainer_uncheckall').hide();
		this.callParent(arguments);
	},
	listeners: {
		afterrender: function () {
			var me = this;
			me.createDropdownContents();
		},
		change: function () {
			RA.App.Filters.saveFilterValuesTask.delay(1000);
		}
	},
	updateCount: function () {
		var dropdownList = Ext4.getCmp(this.id + '-dropdowncontainer_list');
		var selectedCmp = Ext4.getCmp(this.id + '-dropdowncontainer_selected');
		var arrSelected = dropdownList.getArrayDisplayValue();

		selectedCmp.setValue(arrSelected.length);

		var dropdownContainer = Ext4.getCmp(this.id + '-smalldropdown_container');
		if (dropdownContainer && dropdownContainer.countToolTip) {
			if (arrSelected.length) {
				dropdownContainer.countToolTip.enable();
				dropdownContainer.countToolTip.update(arrSelected.join('<br>'));
			} else {
				dropdownContainer.countToolTip.update('hide');
				dropdownContainer.countToolTip.disable();
			}
		}
		Ext4.getCmp(this.id).fireEvent('change');
	}
});
