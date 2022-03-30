/**
 * Copyright (c) 2016 DiCentral, Inc.
 * 1199 1199 NASA Parkway, Houston, TX 77058, USA
 *
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * DiCentral, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with DiCentral.
 *
 * 

 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */
define(['../dic.cs.config',
      
        'N/url'], 
		ModuleUtilMailbox);

function ModuleUtilMailbox(
			dicConfig,
			
			nsurl
		 ){
	var _mod =  {};
	
	/**
	 * encapsulation :begin private scope 
	 */
	
	/**
	 * https://system.na1.netsuite.com/app/help/helpcenter.nl?fid=chapter_N3170023.html
	 */
	_mod._mapERPTemplate2NSRecord = function(options){
		if (!options.value) return null;
		switch(options.value.toLowerCase()){
			case 'nssaleorder' : return 'salesorder';
			case 'nsitemreceipt': return 'itemreceipt';
			case 'nspurchaseorder': return 'purchaseorder';
			case 'nsvendorbill' : return 'vendorbill';
			case 'nsinventoryadv' : return 'vendor';
			case 'nsinvoice': return 'invoice';
			case 'nsdicediitemshipment': return 'purchaseorder';
			default: return null;
		}
		
		return options.value;
	};
	
	/**
	 * encapsulation :end private scope 
	 */
	
	_mod.getValueOfLinkField = function(options){
		var erpTranType = _mod._mapERPTemplate2NSRecord({value: options.erpTransType});
		if (!erpTranType) return '';
		return  nsurl.resolveRecord({
            recordType: erpTranType,
            recordId: options.value,
            isEditMode: true
        });
		
	};
	
	_mod.getValueOfERPTransaction = function(options){
		if (!options.value) return '';
		switch(options.value.toLowerCase()){
			case 'nssaleorder' :
				return 'Sale Order';
			case 'nsitemreceipt': return 'Item Receipt';
			case 'nspurchaseorder': return 'Purchase Order';
			case 'nsvendorbill' : return 'Bill';
			case 'nsinventoryadv' : return 'Inventory Advice';
			case 'nsinvoice': return 'Invoice';
			case 'nsitemfulfillment': return 'Shipment';
			case 'NSDICEDIItemShipment'.toLowerCase():return 'Item Shipment';
			default:
				return options.value;
		}
	};
	
	_mod.getValueOfEDITransaction = function(options){
		switch(options.sideType){
		//Hub
			case dicConfig.SIDE_TYPE.HUB.Type:
				switch(options.value){
					case '850': return '850 - Purchase Order';
					case '856': return '856 - Item Shipment';
					case '846': return '846 - Inventory Advice';
					case '820': return '820 - Payment Order';
				}
			break;
			//Vendor
			case dicConfig.SIDE_TYPE.VENDOR.Type:
				switch(options.value){
					case '850': return '850 - Sales Order';
					case '856': return '856 - ASN';
					case '810': return '810 - Invoice';
					case '880': return '880 - Grocery Invoice';
					 
				}
			break;
		}
		return options.value;
	};
	
	_mod._getDescriptionStatus = function(options){
		if (!options.value || !options.objStatus || options.value == '0') return 'None';
		var objStatus = options.objStatus,
			value = options.value;
		
		var statusDescription = '';
		
		Object.keys(objStatus).forEach(function(property){
			if (property > 0 && ((value & property) == property)) {
				if (statusDescription){
					statusDescription += ' - ';
				}
				statusDescription += objStatus[property];
	      
			}
		});
		return statusDescription;
	};
	
	_mod.getValueOfStatus = function(options){
		var objStatus = dicConfig.MAILBOX.STATUS[options.mailboxType];
		/*if (objStatus){
			if (options.value in objStatus){
				return objStatus[options.value];
			}
		}
		return options.value;*/
		return _mod._getDescriptionStatus({
			objStatus: objStatus,
			value: options.value
		});
	};
	
	/**
	 * infer erp template from EDI Transaction for Hub sidesd
	 * @param {Object} {
	 * 	sideType: enum {HubType = 1, VendorType =2 }
	 * 	mailboxType: enum {Inbound = 1, Outbound =2}
	 * }
	 */
	_mod._inferErpTemplateForHub = function(options) {
		if (!options.value) return null;
		switch(options.value.toLowerCase()){
			//case '856' : return 'NSItemReceipt';
			case '856' : return 'NSDICEDIItemShipment';
			case '820': return 'NSVendorBill';
			case '850': return 'NSPurchaseOrder';
			case '846': return 'NSInventoryAdv';
			
		}
		return options.value;
	};
	
	/**
	 * infer erp template from EDI Transaction for Vendor side
	 * @param {Object} {
	 * 	sideType: enum {HubType = 1, VendorType =2 }
	 * 	mailboxType: enum {Inbound = 1, Outbound =2}
	 * }
	 */  
	_mod._inferErpTemplateForVendor = function(options) {
		switch(options.value.toLowerCase()){
			case '850': return 'NSSaleOrder';
			case '875': return 'NSSaleOrder';
			case '856': return 'NSItemFulfillment';
			case '810': return 'NSInvoice';
			case '880': return 'NSInvoice';
		
		}
	};
	
	/**
	 * infer erp template from EDI Transaction Type and side type mailbox type
	 * @param {Object} {
	 * 	sideType: enum {HubType = 1, VendorType =2 }
	 * 	mailboxType: enum {Inbound = 1, Outbound =2}
	 * }
	 */
	_mod.inferErpTemplate = function(options){
		switch(options.sideType){
			case dicConfig.SIDE_TYPE.HUB.Type:
				return _mod._inferErpTemplateForHub(options);
			case dicConfig.SIDE_TYPE.VENDOR.Type:
				return _mod._inferErpTemplateForVendor(options);
		}
		return options.value;
	};
	
	_mod.mapRecordType2ErpTemplate = function(options){
		switch(options.value){
			case 'purchaseorder' :
				return 'NSPurchaseOrder';
			case 'vendorbill':
				return 'NSVendorBill';
			case 'itemfulfillment':
				return 'NSItemFulfillment';
			case 'invoice':
				return 'NSInvoice';
		};
		return options.value;
	};
	
	_mod.getNameERPTransaction = function(options){
		switch(options.value){
			case 'purchaseorder' :
				return 'Purchase Order';
			case 'vendorbill':
				return 'Vendor Bill';
			case 'itemfulfillment':
				return 'Item Fulfillment';
			case 'invoice':
				return 'Invoice';
		}
		return options.value;
	};
	
	_mod.inferEDIDoctypeFromERPRecordType = function(options){
		switch(options.value){
			case 'purchaseorder' :
				return '850';
			case 'vendorbill':
				return '820';
			case 'itemfulfillment':
				return '856';
			case 'invoice':
				return '810';
		}
		return options.value;
	};
	
    return {
    	getValueOfLinkField: _mod.getValueOfLinkField,
    	getValueOfERPTransaction: _mod.getValueOfERPTransaction,
    	getValueOfEDITransaction: _mod.getValueOfEDITransaction,
    	getValueOfStatus: _mod.getValueOfStatus,
    	inferErpTemplate: _mod.inferErpTemplate,
    	getNameERPTransaction: _mod.getNameERPTransaction,
    	mapRecordType2ErpTemplate: _mod.mapRecordType2ErpTemplate,
    	inferEDIDoctypeFromERPRecordType: _mod.inferEDIDoctypeFromERPRecordType
    	
    };
    
}