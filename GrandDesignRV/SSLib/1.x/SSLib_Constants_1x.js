/**
 * Constants file for Solution Source accounts
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

//Maximum File Size in the file cabinet (5MB)
var MAX_FILE_SIZE = 5242880;

//NetSuite Order Status
//These are the statuses you'll need if you are going to do a order.getFieldValue('status')
//These are different than if you are doing a search in code. (See below)
var SO_PENDINGAPPROVAL = 'A';
var SO_PENDINGFULFILLMENT = 'B';
var SO_CANCELLED = 'C';
var SO_PARTIALLYFULFILLED = 'D';
var SO_PENDINGBILLINGPARTIALLYFULFILLED = 'E';
var SO_PENDINGBILLING = 'F';
var SO_BILLED  = 'G';
var SO_CLOSED = 'H';

//NetSuite Sales Order Search Status
//These are the statuses you'll need if you are going to do a nlapiSearchRecord(...) using 'status' as a filter
var SO_SRCHFILTER_PENDINGAPPROVAL = 'SalesOrd:A';
var SO_SRCHFILTER_PENDINGFULFILLMENT = 'SalesOrd:B';
var SO_SRCHFILTER_CANCELLED = 'SalesOrd:C';
var SO_SRCHFILTER_PARTIALLYFULFILLED = 'SalesOrd:D';
var SO_SRCHFILTER_PENDINGBILLINGPARTIALLYFULFILLED = 'SalesOrd:E';
var SO_SRCHFILTER_PENDINGBILLING = 'SalesOrd:F';
var SO_SRCHFILTER_BILLED = 'SalesOrd:G';
var SO_SRCHFILTER_CLOSED = 'SalesOrd:H';

//Work Order Status
var WO_PLANNED = 'A';   //No components are committed regardless of commit option settings.
var WO_RELEASED = 'B';  //No transaction has posted and no activities have been recorded. Components can be committed based on commit option settings.
var WO_FULLYBUILT_TEXT = 'fullyBuilt';

//NetSuite Line Item Types
//This is what NetSuite returns when using workOrder.getLineItemValue('item', 'itemtype', line)
var NS_SL_ITEMTYPE_ASSEMBLY = 'Assembly';
var NS_SL_ITEMTYPE_NONINVT = 'NonInvtPart';
var NS_SL_ITEMTYPE_INVT = 'InvtPart';
var NS_SL_ITEMTYPE_SERVICE = 'Service';
 