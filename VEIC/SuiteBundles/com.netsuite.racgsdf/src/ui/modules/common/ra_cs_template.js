/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

RA.App.Templates = Ext4.create('Ext4.Component', {
	allocationHoverTpl: function () {
		return new Ext4.XTemplate(
			'<div class="record-tooltip-padding">',
			'<table class="record-tooltip">',
			'<tr class="header">',
			'<td>',
			'<div>' + translatedStrings.getText('TOOLTIP.TITLE.RESOURCE_ALLOCATION') + '</div>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td>',
			'<hr style="border: 1px solid #D5D5D5; border-top: none;">',
			'</td>',
			'</tr>',
			'<tr align="middle">',
			'<td>',
			'<table class="record-tooltip-data">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.RESOURCE') + '</td>',
			'<td class="value">{tipResource}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.CUSTOMER_PROJECT') + '</td>',
			'<td class="value">{tipProject}</td>',
			'</tr>',
			'<tpl if="RA.App.Settings.data.showProjectTasks == \'T\'">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.TASK') + '</td>',
			'<td class="value">{tipTask}</td>',
			'</tr>',
			'</tpl>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.START_DATE') + '</td>',
			'<td class="value">{tipStart}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.END_DATE') + '</td>',
			'<td class="value">{tipEnd}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.ALLOCATE') + '</td>',
			'<td class="value">{Name}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.ALLOCATION_TYPE') + '</td>',
			'<td class="value">{[this.getTranslatedType(values.type)]}</td>',
			'</tr>',
			'<tpl if="RA.App.Stores.featureStore.isRAAWEnabled()">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.APPROVAL_STATUS') + '</td>',
			'<td class="value">{tipAppStatus}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.NEXT_APPROVER') + '</td>',
			'<td class="value">{tipApprover}</td>',
			'</tr>',
			'</tpl>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.COMMENT') + '</td>',
			'<td class="value">{comment}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.LABEL.RECURRENCE') + '</td>',
			'<td class="value">{tipRecurrence}</td>',
			'</tr>',
			'</table>',
			'</td>',
			'</tr>',
			'</table>',
			'</div>',
			{
				getTranslatedType: function (type) {
					var typeIndex = RA.App.Stores.allocTypeStore.findExact('key', type);
					return (typeIndex >= 0) ? RA.App.Stores.allocTypeStore.getAt(typeIndex).get('name') : type;
				}
			}
		);
	},
	projectHoverTpl: function () {
		return new Ext4.XTemplate(
			'<div class="record-tooltip-padding">',
			'<table class="record-tooltip">',
			'<tr class="header">',
			'<td>',
			'<div>' + translatedStrings.getText('TOOLTIP.PROJECT_DETAILS') + '</div>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td>',
			'<hr style="border: 1px solid #D5D5D5; border-top: none;">',
			'</td>',
			'</tr>',
			'<tr align="middle">',
			'<td>',
			'<table class="record-tooltip-data">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PROJECT_NAME') + '</td>',
			'<td class="value">{name}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PERCENT_WORK_COMPLETE') + '</td>',
			'<td class="value">{percent}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.ESTIMATED_WORK') + '</td>',
			'<td class="value">{estimate}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.ALLOCATED_WORK') + '</td>',
			'<td class="value">',
			'{allocated}',
			'<tpl for="config">',
			'<tpl if="dirty &gt; 0">',
			'<span class="icon-warning " role="img" unselectable="on" style="">&nbsp;</span>',
			'</tpl>',
			'</tpl>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.ACTUAL_WORK') + '</td>',
			'<td class="value">{actual}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.REMAINING_WORK') + '</td>',
			'<td class="value">{remaining}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.START_DATE') + '</td>',
			'<td class="value">{start}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.CALCULATED_END_DATE') + '</td>',
			'<td class="value">{end}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PROJECT_LINK') + '</td>',
			'<td class="value">{projecturl}</td>',
			'</tr>',
			'</table>',
			'</td>',
			'</tr>',
			'</table>',
			'</div>'
		);
	},
	projectTemplateHoverTpl: function () {
		return new Ext4.XTemplate(
			'<div class="record-tooltip-padding">',
			'<table class="record-tooltip">',
			'<tr class="header">',
			'<td>',
			'<div>' + translatedStrings.getText('TOOLTIP.PROJECT_TEMPLATE_DETAILS') + '</div>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td>',
			'<hr style="border: 1px solid #D5D5D5; border-top: none;">',
			'</td>',
			'</tr>',
			'<tr align="middle">',
			'<td>',
			'<table class="record-tooltip-data">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PROJECT_NAME') + '</td>',
			'<td class="value">{name}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.ESTIMATED_WORK') + '</td>',
			'<td class="value">{estimate}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.START_DATE') + '</td>',
			'<td class="value">{start}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PROJECT_TEMPLATE_LINK') + '</td>',
			'<td class="value">{projecttemplateurl}</td>',
			'</tr>',
			'</table>',
			'</td>',
			'</tr>',
			'</table>',
			'</div>'
		);
	},
	employeeHoverTpl: function () {
		return new Ext4.XTemplate(
			'<div class="record-tooltip-padding">',
			'<table class="record-tooltip">',
			'<tr class="header">',
			'<td>',
			'<div>' + translatedStrings.getText('TOOLTIP.EMPLOYEE_DETAILS') + '</div>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td>',
			'<hr style="border: 1px solid #D5D5D5; border-top: none;">',
			'</td>',
			'</tr>',
			'<tr align="middle">',
			'<td>',
			'<table class="record-tooltip-data">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.EMPLOYEE_NAME') + '</td>',
			'<td class="value">{name}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.EMPLOYEE_TYPE') + '</td>',
			'<td class="value">{emp_labortype}</td>',
			'</tr>',
			'<tpl if="emp_billingclass != null">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('COLUMN.BILLING_CLASS') + '</td>',
			'<td class="value">{emp_billingclass}</td>',
			'</tr>',
			'</tpl>',
			'<tpl if="showbillingrate == true">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.BILLING_RATE') + '</td>',
			'<td class="value">{emp_billingrate}</td>',
			'</tr>',
			'</tpl>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('COLUMN.LABOR_COST') + '</td>',
			'<td class="value">{emp_laborcost}</td>',
			'</tr>',
			'<tpl if="skillurl != null">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.SKILLS') + '</td>',
			'<td class="value">{skillurl}</td>',
			'</tr>',
			'</tpl>',
			'</table>',
			'</td>',
			'</tr>',
			'</table>',
			'</div>'
		);
	},
	genericResourceHoverTpl: function () {
		return new Ext4.XTemplate(
			'<div class="record-tooltip-padding">',
			'<table class="record-tooltip">',
			'<tr class="header">',
			'<td>',
			'<div>' + translatedStrings.getText('TOOLTIP.GENERIC_DETAILS') + '</div>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td>',
			'<hr style="border: 1px solid #D5D5D5; border-top: none;">',
			'</td>',
			'</tr>',
			'<tr align="middle">',
			'<td>',
			'<table class="record-tooltip-data">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.GENERIC_NAME') + '</td>',
			'<td class="value">{name}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('COLUMN.LABOR_COST') + '</td>',
			'<td class="value">{genrsrc_laborcost}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PRICE') + '</td>',
			'<td class="value">{genrsrc_price}</td>',
			'</tr>',
			'<tpl>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.GENERIC_LINK') + '</td>',
			'<td class="value">{genericresourceurl}</td>',
			'</tr>',
			'</tpl>',
			'</table>',
			'</td>',
			'</tr>',
			'</table>',
			'</div>'
		);
	},
	vendorHoverTpl: function () {
		return new Ext4.XTemplate(
			'<div class="record-tooltip-padding">',
			'<table class="record-tooltip">',
			'<tr class="header">',
			'<td>',
			'<div>' + translatedStrings.getText('TOOLTIP.VENDOR_DETAILS') + '</div>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td>',
			'<hr style="border: 1px solid #D5D5D5; border-top: none;">',
			'</td>',
			'</tr>',
			'<tr align="middle">',
			'<td>',
			'<table class="record-tooltip-data">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.VENDOR_NAME') + '</td>',
			'<td class="value">{name}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.VENDOR_1099') + '</td>',
			'<td class="value">{vend_is1099eligible_text}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('COLUMN.LABOR_COST') + '</td>',
			'<td class="value">{vend_laborcost}</td>',
			'</tr>',
			'</table>',
			'</td>',
			'</tr>',
			'</table>',
			'</div>'
		);
	},
	resourceHoverTpl: function (record) {
		var tpl = new Array();
		tpl.push('<div class="record-tooltip-padding">');
		tpl.push('<table class="record-tooltip">');
		if (record.get('type') == 'employee') {
			tpl.push('<tr class="header employee-header">');
		} else {
			tpl.push('<tr class="header vendor-header">');
		}
		tpl.push('<td>');
		tpl.push('<div>' + translatedStrings.getText('TOOLTIP.RESOURCE') + '</div>');
		tpl.push('</td>');
		tpl.push('</tr>');
		tpl.push('<tr>');
		tpl.push('<td>');
		tpl.push('<hr style="border: 1px solid #D5D5D5; border-top: none;">');
		tpl.push('</td>');
		tpl.push('</tr>');
		tpl.push('<tr align="middle">');
		tpl.push('<td>');
		tpl.push('<table class="record-tooltip-data">');
		tpl.push('<tr>');
		tpl.push('<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.RESOURCE_ID') + '</td>');
		tpl.push('<td class="value">' + record.get('name') + '</td>');
		tpl.push('</tr>');
		if (record.get('type') == 'employee') {
			tpl.push('<tr>');
			tpl.push('<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.JOB_TITLE') + '</td>');
			tpl.push('<td class="value">' + record.get('jobtitle') + '</td>');
			tpl.push('</tr>');
			tpl.push('<tr>');
			tpl.push('<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.DEPARTMENT') + '</td>');
			tpl.push('<td class="value">' + record.get('department') + '</td>');
			tpl.push('</tr>');
			tpl.push('<tr>');
			tpl.push('<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.SUPERVISOR') + '</td>');
			tpl.push('<td class="value">' + record.get('supervisor') + '</td>');
			tpl.push('</tr>');
		} else {
			tpl.push('<tr>');
			tpl.push('<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.CATEGORY') + '</td>');
			tpl.push('<td class="value">' + record.get('vcategory') + '</td>');
			tpl.push('</tr>');
			tpl.push('<tr>');
			tpl.push('<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.TYPE') + '</td>');
			tpl.push('<td class="value">' + (record.get('vendortype') == 'Company'
											 ? translatedStrings.getText('STORE.COMPANY')
											 : translatedStrings.getText('STORE.INDIVIDUAL')) + '</td>');
			tpl.push('</tr>');
		}
		tpl.push('<tr>');
		tpl.push('<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PHONE') + '</td>');
		tpl.push('<td class="value">' + record.get('phone') + '</td>');
		tpl.push('</tr>');
		tpl.push('<tr>');
		tpl.push('<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.EMAIL') + '</td>');
		tpl.push('<td class="value">' + record.get('email') + '</td>');
		tpl.push('</tr>');
		tpl.push('</table>');
		tpl.push('</td>');
		tpl.push('</tr>');
		tpl.push('</table>');
		tpl.push('</div>');
		return tpl.join('');
	},
	customerHoverTpl: function () {
		return new Ext4.XTemplate(
			'<div class="record-tooltip-padding">',
			'<table class="record-tooltip">',
			'<tr class="header">',
			'<td>',
			'<div>' + translatedStrings.getText('TOOLTIP.CUSTOMER_DETAILS') + '</div>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td>',
			'<hr style="border: 1px solid #D5D5D5; border-top: none;">',
			'</td>',
			'</tr>',
			'<tr align="middle">',
			'<td>',
			'<table class="record-tooltip-data">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.CUSTOMER_ID') + '</td>',
			'<td class="value">{customerId}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.COMPANY_NAME') + '</td>',
			'<td class="value">{companyName}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.CATEGORY') + '</td>',
			'<td class="value">{category}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PRIMARY_SUBSIDIARY') + '</td>',
			'<td class="value">{primarySubsidiary}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.PRIMARY_CONTACT') + '</td>',
			'<td class="value">{primaryContact}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.CITY') + '</td>',
			'<td class="value">{city}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.STATE_PROVINCE') + '</td>',
			'<td class="value">{state}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.COUNTRY') + '</td>',
			'<td class="value">{country}</td>',
			'</tr>',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.VIEW_RECORD') + '</td>',
			'<td class="value"><a target="_blank" href="{url}">' + translatedStrings.getText('TOOLTIP.VIEW') + '</a></td>',
			'</tr>',
			'</table>',
			'</td>',
			'</tr>',
			'</table>',
			'</div>'
		);
	},
	timeoffHoverTpl: function () {
		return new Ext4.XTemplate(
			'<div class="record-tooltip-padding">',
			'<table class="record-tooltip">',
			'<tr class="header">',
			'<td>',
			'<div>' + translatedStrings.getText('TOOLTIP.TITLE.TIMEOFF') + '</div>',
			'</td>',
			'</tr>',
			'<tr>',
			'<td>',
			'<hr style="border: 1px solid #D5D5D5; border-top: none;">',
			'</td>',
			'</tr>',
			'<tr align="middle">',
			'<td>',
			'<table class="record-tooltip-data">',
			'<tr>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.TIMEOFFDATE') + '</td>',
			'<td class="value">{tipTimeOffDate}</td>',
			'</tr>',

			'<tr>',
			'<tpl if="tipConflict==true">',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.TIMEOFFCONFLICT') + '</td>',
			'<tpl else>',
			'<td class="label" nowrap="nowrap">' + translatedStrings.getText('TOOLTIP.TIMEOFFHOUR') + '</td>',
			'</tpl>',
			'<td class="value">{tipTimeOffHour}</td>',
			'</tr>',

			'</table>',
			'</td>',
			'</tr>',
			'</table>',
			'</div>'
		);
	},
});