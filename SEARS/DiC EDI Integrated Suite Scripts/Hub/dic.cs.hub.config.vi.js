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
 * 1.00       01 Nov 2016     Loi Nguyen	   	   
 *
 */
define([], DiCEDICSHubConfigVI);

function DiCEDICSHubConfigVI() {
   
    return Object.freeze({
    	CusFieldQtyOnhandOnItemVendor:'custpage_dic_vendor_item_qty_onhand',
    	CustomRecordId:'customrecord_dic_vendor_item_itemid',
    	CustomFields:{
    		Item:{
    			Id: 'custrecord_dic_vendor_item_vendorno',
    			MapId: 'item'
    		},
    		Vendor: {
    			Id: 'custrecord_dic_vendor_item_vendor',
    			MapId: 'vendor'
    		},
    		QuantityOnHand:{
    			Id: 'custrecord_vendor_item_qty_on_hand',
    			MapId: 'quantityonhand'
    		},
//    		Internal:{
//    			Id: 'internalId',
//    			MapId: 'vendor'
//    		},
    		External:{
    			Id: 'externalid',
    			MapId: 'externalid'
    		},
    		TransDate:{
    			Id: 'custrecord_dic_vendor_item_transdate',
    			MapId: 'transdate'
    		}
    	}
    	
    });
};
