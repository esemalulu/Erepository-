/**
 * 2.0 Constants file for Grand Design
 */
define([],

function() {

	return {
		//Parts Inquiry Statuses
		PARTS_INQUIRY_STATUS_OPEN: '1', //This is the Submitted status, originally it was called 'Open'
		PARTS_INQUIRY_STATUS_ANSWERED: '2',
		PARTS_INQUIRY_STATUS_CLOSED: '3',

		//Bundle File Modules
		GD_BUNDLE_FILES_MODULE_PARTSORDERPROXY: 'gd_partsorderproxy',

		// Physical Inventory Tag Items
		GD_PI_TAG_VOID: '66115',
		GD_PI_TAG_UNUSED: '66116',
		GD_PI_TAG_WIP: '66117',
		GD_PI_TAG_NPN: '66118',

		// Item Type IDs
		GD_ITEM_TYPE_MODEL: '4',
		GD_ITEM_TYPE_ASSEMBLY_ITEM: '5',
		GD_ITEM_TYPE_NONINVENTORY_ITEM: '2',
		GD_ITEM_TYPE_FREIGHTCHARGE_ITEM: '9',
		

		//Locations
		GD_LOCATIONS_CRIB_PARTSANDSERVICE: '20',
		GD_LOCATIONS_PLANT_PARTSANDSERVICE: '17',

		// Solution Source User IDs
		GD_USER_ID_BRIAN_SUTTER: '4',
		GD_USER_ID_JOY_CHRISMAN: '7343',
		GD_USER_ID_TWILA_ESHLEMAN: '1035',

		// StrongPoint Customization Type IDs
		GD_STRONGPOINT_CUSTOMIZATION_TYPE_SCHEDULED_SCRIPT: '34',
		GD_STRONGPOINT_CUSTOMIZATION_TYPE_SCRIPT_DEPLOYMENT: '51',

		// StrongPoint Change Log Status IDs
		GD_STRONGPOINT_CHANGE_LOG_STATUS_CLOSED: '10',

		//Back Office Outbound Record Types
		GD_AB_RECORDTYPE_REGISTRATION: '1',
		GD_AB_RECORDTYPE_DEALER: '2',
		GD_AB_RECORDTYPE_MODEL: '3',

		//Back Office Outbound Status
		GD_AB_OUT_STATUS_PENDING: '1',
		GD_AB_OUT_STATUS_CONNECTIONFAILURE: '2',
		GD_AB_OUT_STATUS_ERROROPEN: '3',
		GD_AB_OUT_STATUS_ERRORCANCELLEDBYUSER: '4',
		GD_AB_OUT_STATUS_COMPLETE: '5',
		GD_AB_OUT_STATUS_PENDINGRETRY: '6',

		// Print Dealer Refunds Statuses
		GD_PRINTDEALERREFUNDS_OPEN: '1',
		GD_PRINTDEALERREFUNDS_PROCESSING: '2',
		GD_PRINTDEALERREFUNDS_COMPLETE: '3',

		GD_DEALERREFUND_PAYMENTOPTION_CASH: '1',
		GD_DEALERREFUND_PAYMENTOPTION_CHECK: '2',
		GD_DEALERREFUND_PAYMENTOPTION_INVOICELINK: '166',

		// File Cabinet Folder Ids
		GD_FOLDER_DEALERREFUNDSTEMP: '37842759',

		// Unit Production Statuses
		GD_UNITPRODUCTIONSTATUS_SCHEDULED: '7',
		GD_UNITPRODUCTIONSTATUS_COMPLETE:  '1',

		// Departments
		GD_DEPARTMENT_TOWABLES: '1',
		GD_DEPARTMENT_MOTORHOME: '2',

		// Order Types
		GD_ORDERTYPE_PART: '1',
		GD_ORDERTYPE_UNIT: '2',

		// GD Chassis Scheduling Statuses
		GD_CHASSISSCHEDULINGSTATUS_OPEN: '1',
		GD_CHASSISSCHEDULINGSTATUS_PROCESSING: '2',
		GD_CHASSISSCHEDULINGSTATUS_COMPLETE: '3',
		GD_CHASSISSCHEDULINGSTATUS_ERROR: '4',
		GD_CHASSISSCHEDULINGSTATUS_COMPLETEERRORS: '5',

		//Countries
		GD_AMERICA: '230',
		GD_CANADA: '37'
	};
});
