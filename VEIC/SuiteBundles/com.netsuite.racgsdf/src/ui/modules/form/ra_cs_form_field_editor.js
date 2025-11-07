/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.FieldEditorForm', {
	extend: 'RA.Cmp.Window',
	id: 'ra-field-editor',
	width: 300,

//    closeAction : 'destroy',

	initComponent: function (args) {
		var me = this;

		me.fields = [
			Ext4.create('RA.Cmp.LargeDataCombo.SingleSelect.Resource', {
				id: me.id + '-resource',
				formId: me.id,
				allowBlank: true
			}),
			Ext4.create('RA.Cmp.LargeDataCombo.SingleSelect.Project', {
				id: me.id + '-project',
				formId: me.id,
				allowBlank: true
			}),
			Ext4.create('RA.Cmp.LargeDataCombo.SingleSelect.ProjectTask', {
				id: me.id + '-projecttask',
				formId: me.id,
				allowBlank: true
			}),
			Ext4.create('RA.Cmp.LargeDataCombo.SingleSelect.Approver', {
				id: me.id + '-approver',
				formId: me.id,
				allowBlank: true
			})
		];

		me.items = [
			{
				xtype: 'ra-form-panel',
				padding: 20,
				items: me.fields,
				dockedItems: [
					{
						xtype: 'raformmenu',
						items: [
							{
								xtype: 'ra-blue-button',
								id: me.id + '-ok',
								text: translatedStrings.getText('BUTTON.OK')
							}, {
								xtype: 'ra-gray-button',
								id: me.id + '-cancel',
								text: translatedStrings.getText('BUTTON.CANCEL'),
								handler: function () {
									Ext4.getCmp(me.id).hide();
								}
							}
						]
					}
				],
			}
		];

		this.callParent(args);
	},
	listeners: {
		hide: function (me) {
			me.unsetOkActionFn();
		}
	},

	initForm: function (config) {
		if (this.isConfigValid(config)) {
			this.setTitle(config.formTitle);
			this.setFieldValue();
			this.setOkActionFn();

			this.show();
		} else {
			console.log('ERROR: Invalid config for RA.Cmp.FieldEditorForm.initForm');
			console.log(config);
		}
	},
	isConfigValid: function (config) {
		if (!config.recordType || !config.formTitle || !config.okActionFn) {
			return false;
		}

		this.config = config;

		return true;
	},
	setFieldValue: function () {
		var field = this.getField();
		this.hideFields();

		if (this.config.properties) {
			for (var i in this.config.properties) {
				this.getField()[i] = this.config.properties[i];
			}
		}
		field.initSize();
		field.setValue(+(this.config.value), this.config.text ? this.config.text : '');

		field.show();
	},
	hideFields: function () {
		for (i in this.fields) {
			var field = this.fields[i];

			field.hide();
		}
	},
	setOkActionFn: function (config) {
		Ext4.getCmp(this.id + '-ok').on('click', this.config.okActionFn);
	},
	unsetOkActionFn: function () {
		Ext4.getCmp(this.id + '-ok').un('click', this.config.okActionFn);
	},
	getField: function () {
		return Ext4.getCmp(this.id + '-' + this.config.recordType);
	}
});