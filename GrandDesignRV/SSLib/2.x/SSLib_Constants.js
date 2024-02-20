/**
 * Constants file for Solution Source accounts
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define([],

function() {
   
    return {
    	//Maximum File Size in the file cabinet (5MB)
		 MAX_FILE_SIZE: 5242880,
		
		//NetSuite Order Status
		//These are the statuses you'll need if you are going to do a order.getFieldValue('status')
		//These are different than if you are doing a search in code. (See below)
		SO_PENDINGAPPROVAL: 'A',
		SO_PENDINGFULFILLMENT: 'B',
		SO_CANCELLED: 'C',
		SO_PARTIALLYFULFILLED: 'D',
		SO_PENDINGBILLINGPARTIALLYFULFILLED: 'E',
		SO_PENDINGBILLING: 'F',
		SO_BILLED : 'G',
		SO_CLOSED: 'H',

		//NetSuite Sales Order Search Status
		//These are the statuses you'll need if you are going to do a nlapiSearchRecord(...) using 'status' as a filter
		SO_SRCHFILTER_PENDINGAPPROVAL: 'SalesOrd:A',
		SO_SRCHFILTER_PENDINGFULFILLMENT: 'SalesOrd:B',
		SO_SRCHFILTER_CANCELLED: 'SalesOrd:C',
		SO_SRCHFILTER_PARTIALLYFULFILLED: 'SalesOrd:D',
		SO_SRCHFILTER_PENDINGBILLINGPARTIALLYFULFILLED: 'SalesOrd:E',
		SO_SRCHFILTER_PENDINGBILLING: 'SalesOrd:F',
		SO_SRCHFILTER_BILLED: 'SalesOrd:G',
		SO_SRCHFILTER_CLOSED: 'SalesOrd:H',

		//Work Order Status
		WO_PLANNED: 'A',   //No components are committed regardless of commit option settings.
		WO_RELEASED: 'B',  //No transaction has posted and no activities have been recorded. Components can be committed based on commit option settings.
		WO_FULLYBUILT_TEXT: 'fullyBuilt',

		//NetSuite Line Item Types
		//This is what NetSuite returns when using workOrder.getLineItemValue('item', 'itemtype', line)
		NS_SL_ITEMTYPE_ASSEMBLY: 'Assembly',
		NS_SL_ITEMTYPE_NONINVT: 'NonInvtPart',
		NS_SL_ITEMTYPE_INVT: 'InvtPart',
		NS_SL_ITEMTYPE_SERVICE: 'Service'
    };
    
});
