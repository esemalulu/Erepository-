/**
 * Copyright © 2017, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.App.Forms', {
	singleton: true,
	initForms: function () {
		Ext4.apply(this, {
			largeDataForm: Ext4.create('RA.Cmp.LargeDataForm'),
			largeMultiSelectForm: Ext4.create('RA.Cmp.LargeMultiSelectForm'),
			newAllocForm: Ext4.create('RA.Cmp.NewAllocForm'),
			editAllocForm: Ext4.create('RA.Cmp.EditAllocForm'),
			reassignAllocForm: Ext4.create('RA.Cmp.ReassignAllocForm'),
			resourceSearchForm: Ext4.create('RA.Cmp.ResourceSearchForm'),
			viewForm: Ext4.create('RA.Cmp.ViewForm'),
			settingsForm: Ext4.create('RA.Cmp.SettingsForm'),
			fieldEditorForm: Ext4.create('RA.Cmp.FieldEditorForm')
		});
	}
});
