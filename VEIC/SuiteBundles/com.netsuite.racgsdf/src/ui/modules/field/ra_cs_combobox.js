/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.ComboBox', {
	extend: 'Ext4.form.field.ComboBox',
	alias: 'widget.ra-combo-box',
	forceSelection: true,
	selectOnFocus: true,
	emptyText: '-' + translatedStrings.getText('MESSAGE.EMPTYTEXT.ALL') + '-',
	valueField: 'id',
	displayField: 'name',
	labelAlign: 'top',
	labelWidth: 110,
	maxSelections: 25,
	labelSeparator: '',
	queryMode: 'local',
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
		beforeshow: function (combobox) {
			return this.isEnabled();
		},
		boxready: function (combobox, width, height) {
			var isEnabled = combobox.isEnabled();
			if (!isEnabled) {
				this.hide();
			}
		}
	},
	getSelectedRecord: function () {
		var value = this.getValue();
		if (value instanceof Array) {
			var arrRet = [], store = this.getStore();
			for (var i = 0; i < value.length; i++) {
				arrRet.push(store.getById(value[i]));
			}
			return arrRet;
		} else {
			return this.getStore().getById(value);
		}
	},
	filterContent: function (filterRecord) {
		var me = this, store = me.store, featureStore = RA.App.Stores.featureStore, params = {};
		if (filterRecord != null) {
			if (featureStore.getById('subsidiary').get('isEnabled')) {
				params.subsidiaryFilter = filterRecord.get('subsidiaries');
				params.childSubsidiary = filterRecord.get('subsidiariesChild');
			} else {
				params.subsidiaryFilter = '';
				params.childSubsidiary = false;
			}
		}
		store.removeAll();
		store.load({
			params: params
		});
	}
});

Ext4.define('RA.Cmp.ComboBox.Hidden', {
	extend: 'RA.Cmp.ComboBox',
	alias: 'widget.ra-combo-box-hidden',
	hidden: true
});

Ext4.define('RA.Cmp.FilterComboBox', {
	extend: 'RA.Cmp.ComboBox',
	alias: 'widget.ra-filter-combo-box',
	queryMode: 'remote',
	listeners: {
		change: function (combo, records) {
			RA.App.Filters.saveFilterValuesTask.delay(1000);
		}
	}
});

Ext4.define('RA.Cmp.PagingComboBox', {
	extend: 'Ext4.form.field.ComboBox',
	editable: false,
	forceSelection: true,
	valueField: 'id',
	displayField: 'name',
	listConfig: {
		id: 'ra-paging-bound-list',
		baseCls: 'ra-paging-bound-list',
		listeners: {
			beforerender: function (me) {
				me.minWidth = me.up('combobox').inputEl.getSize().width;
			},
			afterrender: function (me, a) {
				var box = Ext4.getCmp('ra-page-combo-box');

				me.el.on('mouseover', function (event, el) {
					if (!box.isExpanded) {
						box.expand();
					}
				});

				me.el.on('mouseleave', function (event, el) {
					box.collapse();
				});
			}
		}
	},
	listeners: {
		afterrender: function (me) {
			me.el.on('mouseover', function () {
				if (!me.isExpanded)
					me.expand();
			});
			me.triggerEl.on('mouseover', function () {
				if (!me.isExpanded)
					me.expand();
			});
			me.el.on('mouseout', function () {
				me.collapse();
			});
			me.triggerEl.on('mouseout', function () {
				me.collapse();
			});
		},
		beforeselect: function (combo, record, index) {
			if (RA.App.Stores.chartEvent.areThereChanges()) {
				combo.triggerBlur();
				alert(translatedStrings.getText('MESSAGE.ERROR.UNSAVED_PENDING_CHANGES'));
				return false;
			}
		},
		change: function (combo, newValue, oldValue) {
			combo.setWidth(RA.Util.TextMetrics.getMetrics('14px').getSize(combo.getRawValue()).width + 55);//TODO: not covered in performance runtime?

			if ((oldValue == null && newValue == 0) || (oldValue == 0 && newValue == null))
				return;

			perfTestLogger.start('Change Page');
			combo.setDisabled(true);
			Ext4.getCmp('ra-prevPage').setDisabled(true);
			Ext4.getCmp('ra-nextPage').setDisabled(true);
			var start = combo.findRecordByValue(newValue) == false ? 0 : combo.findRecordByValue(newValue).get('start');
			RA.App.Stores.chartResource.allDataParams.start = start;
			RA.App.Stores.chartResource.loadWithFilters(RA.App.Constant.LOAD_MODE_PAGE);
		}
	}
});