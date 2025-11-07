/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.FieldContainer', {
	extend: 'Ext4.form.FieldContainer'
});

Ext4.define('RA.Cmp.FlexFieldContainer', {
	extend: 'Ext4.form.FieldContainer',
	alias: 'widget.ra-flex-field-container',
	defaults: {
		flex: 1
	}
});

Ext4.define('RA.Cmp.RecurringFormFieldContainer', {
	extend: 'Ext4.form.FieldContainer',
	alias: 'widget.ra-recurring-form-fieldcontainer',
	layout: 'hbox',
	border: false,
	defaults: {
		margin: '0 5 0 0'
	},
	hidden: true,
	listeners: {
		show: function () {
			if (this.down('radio').checked) {
				this.enableFormFields();
			} else {
				this.disableFormFields();
			}
		},
		hide: function () {
			this.disableFormFields();
		}
	},
	getFormFields: function () {
		// these are the fields that are subject for client-side validation and
		// disabling/enabling
		return this.items.filter([
			new Ext4.util.Filter({
				filterFn: function (field) {
					return field.xtype == 'ra-combo-box-hidden' || field.xtype == 'ra-number-field';
				}
			})
		]).items;
	},
	disableAndRevalidateField: function (field) {
		if (field) {
			if (field.disable) {
				field.disable();
			}
			if (field.validate) {
				field.validate();
			}
		}
	},
	enableAndRevalidateField: function (field) {
		if (field) {
			if (field.enable) {
				field.enable();
			}
			if (field.validate) {
				field.validate();
			}
		}
	},
	enableFormFields: function () {
		var formFields = this.getFormFields();
		if (formFields) {
			formFields.forEach(this.enableAndRevalidateField);
		}
	},
	disableFormFields: function () {
		var formFields = this.getFormFields();
		if (formFields) {
			formFields.forEach(this.disableAndRevalidateField);
		}
	}
});