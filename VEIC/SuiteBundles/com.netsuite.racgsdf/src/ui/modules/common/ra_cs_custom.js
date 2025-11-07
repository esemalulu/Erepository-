/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Clipboard', {
	extend: 'Ext4.Component',
	constructor: function () {
		this.hours = 0;
		this.type = 0;
		this.approver = 0;
	}
});

Ext4.define('RA.Cmp.FormSpacer', {
	extend: 'Ext4.Component',
	alias: 'widget.ra-spacer',
	height: 10,
	autoEl: 'div'
});

Ext4.define('RA.Cmp.HSpace', {
	extend: 'Ext4.Component',
	alias: 'widget.ra-hspace',
	width: 15,
	autoEl: 'div'
});

Ext4.define('RA.Cmp.Legend', {
	extend: 'Ext4.Component',
	autoEl: {
		tag: 'div',
		cls: 'legend-box'
	},
	initComponent: function (args) {
		if (this.cls) {
			this.autoEl = {
				tag: this.autoEl.tag,
				cls: this.autoEl.cls + ' ' + this.cls
			};
		}
		this.callParent(args);
	}
});

Ext4.define('RA.Cmp.Link', {
	extend: 'Ext4.Component',
	cls: 'ra-link'
});

Ext4.define('RA.Cmp.LinkButton', {
	extend: 'Ext4.Component',
	alias: 'widget.linkbutton',
	renderTpl: new Ext4.XTemplate('<a id="{id}-linkEl" href="#" role="link" class="toggle-link-a">', '<span id="{id}-linkInnerEl" class="toggle-link">', '{text}', '</span>', '</a>'),
	renderSelectors: {
		linkEl: 'a'
	},
	initComponent: function () {
		this.callParent(arguments);
		this.renderData = {
			text: this.text
		};
	},
	listeners: {
		render: function (c) {
			c.el.on('click', c.handler);
			if (c.pressed)
				c.addCls('toggle-link-pressed');
		}
	}
});

Ext4.define('RA.Cmp.MenuSeparator', {
	extend: 'Ext4.Component',
	renderTpl: new Ext4.XTemplate('<div class="ra-menu-separator"></div>')
});

Ext4.define('RA.Cmp.MenuSeparatorSmall', {
	extend: 'Ext4.Component',
	renderTpl: new Ext4.XTemplate('<div class="ra-menu-separator-small"></div>')
});

Ext4.define('RA.Cmp.Space', {
	extend: 'Ext4.Component',
	alias: 'widget.ra-space',
	height: 15,
	autoEl: 'div'
});

Ext4.define('RA.Cmp.ColumnSpace', {
	extend: 'RA.Cmp.Space',
	alias: 'widget.ra-col-space',
	width: 100
});

Ext4.define('RA.Cmp.ToggleLink', {
	extend: 'Ext4.Component',
	pressed: false,
	toggleGroup: 'allToggleGroup',
	renderTpl: new Ext4.XTemplate('<a id="{id}-linkEl" href="#" role="link" class="toggle-link-a">', '<span id="{id}-linkInnerEl" class="toggle-link">', '{text}', '</span>', '</a>'),
	renderSelectors: {
		linkEl: 'a'
	},
	initComponent: function () {
		this.callParent(arguments);
		this.renderData = {
			text: this.text
		};
		if (!RA.App.ToggleManager) {
			RA.App.ToggleManager = {};
		}
		if (!RA.App.ToggleManager[this.toggleGroup]) {
			RA.App.ToggleManager[this.toggleGroup] = new Array();
		}
		RA.App.ToggleManager[this.toggleGroup].push(this);
	},
	listeners: {
		render: function (c) {
			c.el.on('click', c.handler);
			if (c.pressed) {
				c.addCls('toggle-link-pressed');
				if (c.boldHighlight) {
					c.addCls('toggle-link-preset-pressed');
				}
			}
		}
	},
	toggle: function () {
		for (var i = 0; i < RA.App.ToggleManager[this.toggleGroup].length; i++) {
			var node = RA.App.ToggleManager[this.toggleGroup][i];
			if (this == node) {
				node.pressed = true;
				node.addCls('toggle-link-pressed');
				if (this.boldHighlight) {
					node.addCls('toggle-link-preset-pressed');
				}
			} else {
				node.pressed = false;
				node.removeCls('toggle-link-pressed');
				if (this.boldHighlight) {
					node.removeCls('toggle-link-preset-pressed');
				}
			}
		}
	}
});

Ext4.define('RA.Cmp.ToggleExpandCollapse', {
	extend: 'RA.Cmp.ToggleLink',
	handler: function (event) {
		var me = Ext4.getCmp(this.id);
		perfTestLogger.start(RA.App.ModeManager.mode + ' ' + me.mode + ' All');
		switch (me.mode) {
			case 'expand':
				RA.App.ModeManager.getActive().mask();
				new Ext4.util.DelayedTask(function () {
					RA.App.ModeManager.getActive().expandAll();
					RA.App.ModeManager.getActive().unmask();
					perfTestLogger.stop();
				}).delay(500);
				break;
			case 'collapse':
				RA.App.ModeManager.getActive().mask();
				new Ext4.util.DelayedTask(function () {
					RA.App.ModeManager.getActive().collapseAll();
					RA.App.ModeManager.getActive().unmask();
					perfTestLogger.stop();
				}).delay(500);
				break;
		}
		event.preventDefault();
	}
});

Ext4.define('RA.Cmp.ToggleGridChart', {
	extend: 'RA.Cmp.ToggleLink',
	toggleGroup: 'mode',
	boldHighlight: true,
	logViewChange: function (chosenMode) {
		var logString = '"' + RA.App.Constant.MODE_GRID + '" to "' + RA.App.Constant.MODE_CHART + '"';
		var oldMode = RA.App.Constant.MODE_GRID;
		var newMode = RA.App.Constant.MODE_CHART;

		if (chosenMode === RA.App.Constant.MODE_GRID) {
			logString = '"' + RA.App.Constant.MODE_CHART + '" to "' + RA.App.Constant.MODE_GRID + '"';
			oldMode = RA.App.Constant.MODE_CHART;
			newMode = RA.App.Constant.MODE_GRID;
		}

		RA.Util.CustomFunctions.logIntoElasticSearch(
			'[PSA] RACG view mode has been changed from ' + logString,
			{
				RACG_user: RA.App.Context.context.name,
				RACG_email: RA.App.Context.context.email,
				RACG_company: RA.App.Context.context.company,
				RACG_old_mode: oldMode,
				RACG_new_mode: newMode
			}
		);
	},
	handler: function (event) {
		var me = Ext4.getCmp(this.id);
		if (me.pressed) {
			return;
		}
		perfTestLogger.start('Switch Mode To ' + me.mode);
		me.toggle();
		RA.App.ModeManager.setMode(me.mode);

		// update user setting for last used mode
		RA.App.Settings.beginEdit();
		RA.App.Settings.set('lastUsedMode', me.mode);
		RA.App.Settings.endEdit();
		RA.App.Stores.settingStore.sync();

		event.preventDefault();

		me.logViewChange(me.mode);

		perfTestLogger.stop();
	}
});

Ext4.define('RA.Cmp.ToggleFilter', {
	extend: 'RA.Cmp.ToggleLink',
	text: translatedStrings.getText('TEXT.FILTERS').toUpperCase(),
	margin: '0 50 0 0',
	renderTpl: new Ext4.XTemplate('<tpl>', '<a id="{id}-linkEl" href="#" role="link" class="filter-toggle-link">', '{text}', '</a>', '</tpl>'),
	initComponent: function () {
		this.callParent(arguments);
		this.renderData = {
			text: this.text
		};
	},
	handler: function (event) {
		var filterBody = Ext4.getCmp('advfilter-filterBody');
		RA.App.Settings.beginEdit();
		if (filterBody.isHidden()) {
			Ext4.getCmp(this.id).removeCls('ra-filter-hidden');
			filterBody.show();
			RA.App.Settings.set('expandFilterSummary', 'T');
		} else {
			Ext4.getCmp(this.id).addCls('ra-filter-hidden');
			filterBody.hide();
			RA.App.Settings.set('expandFilterSummary', 'F');
		}
		RA.App.Stores.settingStore.sync();
		if (RA.App.Grid.isVisible()) {
			RA.App.Grid.autofit(true);
		} else {
			RA.App.Chart.autofit(true);
		}
		event.preventDefault();
	}
});

Ext4.define('RA.Cmp.TogglePreset', {
	extend: 'RA.Cmp.ToggleLink',
	toggleGroup: 'presets',
	presetClassName: {},
	boldHighlight: true,
	handler: function (event) {
		var me = Ext4.getCmp(this.id);
		if (me.pressed) {
			return;
		}
		var currentPreset = RA.App.ModeManager.getActive().getViewPreset().replace('RA.ViewPreset.', '');
		var newPreset = me.presetClassName.replace('RA.ViewPreset.', '');
		perfTestLogger.start(RA.App.ModeManager.mode + ' Switch Preset (' + currentPreset + ' to ' + newPreset + ')');
		me.toggle();
		RA.App.ModeManager.getActive().switchViewPreset(me.presetClassName);
		perfTestLogger.stop();

		RA.Util.CustomFunctions.logIntoElasticSearch(
			'[PSA] RACG time preset has been changed from ' + currentPreset + ' to ' + newPreset,
			{
				RACG_user: RA.App.Context.context.name,
				RACG_email: RA.App.Context.context.email,
				RACG_company: RA.App.Context.context.company,
				RACG_old_time_preset: currentPreset,
				RACG_new_time_preset: newPreset
			}
		);
		event.preventDefault();
	},
	setPressed: function () {
		this.addCls('toggle-link-preset-pressed');
	},
	initComponent: function (args) {
		var me = this;

		this.on('afterrender', function (me) {
			var defaultDateRange = RA.App.Settings.get('dateRange');
			if ((me.presetClassName == 'RA.ViewPreset.Daily' && defaultDateRange == 1) || (me.presetClassName == 'RA.ViewPreset.Weekly' && defaultDateRange == 2) || (me.presetClassName == 'RA.ViewPreset.Monthly' && defaultDateRange == 3)) {
				me.setPressed();
			}
		});

		this.callParent(args);
	}
});