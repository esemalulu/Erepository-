/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Jan 2014     ibrahima
 *
 */

var PARTS_INQUIRY_STATUS_OPEN = '1'; //This is the Submitted status, originally it was called 'Open'
var PARTS_INQUIRY_STATUS_ANSWERED = '2'; 
var PARTS_INQUIRY_STATUS_CLOSED = '3';

var GRAND_DESIGN_STOCK_UNIT = '108';

var GD_PCNSTATUS_OPEN = '1';
var GD_PCNSTATUS_APPROVED_PENDINGOBSOLETE = '2';
var GD_PCNSTATUS_PENDINGAPPROVAL = '4';
var GD_PCNSTATUS_COMPLETE = '5';
var GD_PCNSTATUS_PENDINGFINAL = '6';
var GD_PCNSTATUS_REJECTED = '7';

// GD PROGRAM TYPES
var GD_PROGRAMTYPE_SALESMENSPIFF = '1';
var GD_PROGRAMTYPE_DEALERSPIFF = '2';
var GD_PROGRAMTYPE_INTERESTREIMBURSEMENT = '3';
var GD_PROGRAMTYPE_GLOBALSPIFF = '4';
var GD_PROGRAMTYPE_SHOWCOOP = '5';

//CASE STATUSES
var GD_CASE_STATUS_CLOSED = '5';

//GD PRICE LEVEL IDs
var GD_PRICE_LEVEL_MSRP = '2';

//Item Categories
var GD_ITEM_CATEGORY_DECOR = '1';

//Ship Method
var GD_SHIPMETHOD_DPU = '6';
var GD_SHIPMETHOD_UNITSHIP = '2249';

var FREIGHT_CHARGE_ITEM_ID = nlapiGetContext().getSetting('SCRIPT', 'custscriptrvsfreightitem'); //'523';
var FUEL_CHARGE_ITEM_ID = nlapiGetContext().getSetting('SCRIPT', 'custscriptrvsfuelsurcharge'); //'524';	

var GD_PICOUNT_STATUS_NOT_STARTED = '1';
var GD_PICOUNT_STATUS_OPEN = '2';
var GD_PICOUNT_STATUS_COMPLETE = '3';

// Item Type IDs
var GD_ITEM_TYPE_ASSEMBLY_ITEM = '5';
var GD_ITEM_TYPE_FREIGHTCHARGE_ITEM = '9';

// Physical Inventory Tag Items
var GD_PI_TAG_VOID = '66115';
var GD_PI_TAG_UNUSED = '66116';
var GD_PI_TAG_WIP = '66117';
var GD_PI_TAG_NPN = '66118';

//Locations
var GD_LOCATIONS_CRIB_PARTSANDSERVICE = '20';
var GD_LOCATIONS_PLANT_PARTSANDSERVICE = '17';

//Flat Rate Code Types
var GD_FLATRATECODE_TYPE_RECALL = '4';
var GD_FLATRATECODE_TYPE_CUSTOMERSATISFACTION = '6';

// Countries
var GD_AMERICA = '230';
var GD_CANADA = '37';

// Unit Department Codes
var GD_DEPARTMENT_TOWABLES = '1';
var	GD_DEPARTMENT_MOTORHOME = '2';