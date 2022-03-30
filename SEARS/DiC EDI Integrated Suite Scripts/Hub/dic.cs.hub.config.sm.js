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
 * 1.00       16 Nov 2016     Loi Nguyen	   	   
 *
 */
define([], DiCEDICSHubConfigSM);

function DiCEDICSHubConfigSM() {
   
    return Object.freeze({
    	CusFieldQtyShippedPO:'custpage_dic_item_shipped_qty',
    	CustomRecordId:'customrecord_dic_edi_item_shipment',
    	CustomFields:{
    		PO: {
    			Id: 'custrecord_dic_edi_itsh_ref_poid',
    			MapId: 'vendor'
    		},
    		Item: {
    			Id: 'custrecord_dic_edi_itsh_itemid',
    			MapId: 'vendor'
    		},
    		QuantityShipped:{
    			Id: 'custrecord_dic_edi_itsh_shqty',
    			MapId: 'quantityonhand'
    		},
    		TransDate:{
    			Id: 'custrecord_dic_edi_itsh_transdate',
    			MapId: 'transdate'
    		}
    	}
    	
    });
};
