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
define([], DiCEDICSHubConfigPO);

function DiCEDICSHubConfigPO() {
   
    return Object.freeze({
    	SERVICE_POST:'/mailbox/send2outbound/json',
    	SERVICE_POST_FULLFLOW: '/mailbox/send2edi/json',
    	TimeOut: 0, //ms
    	ClientScript:{
    		Name:"dic.cls.hub.po.js",
    		Id:40816 
    			
    	},
    	
    	CheckEnabledSend: function(options){
    		return ['2'].indexOf(options.approvalStatus) >= 0;
    	},
    	MapFields: {
    		TransId: 'tranid'
    	},
    	CustomActions:{
    		Send2EDI:{
    			Id:'custpage_dic_edi_po_send2edi',
    			Text: 'Send to Outbox',
    			Callback: 'sendERPTransaction'
    		},
    		SendNSPurchaseOrde2EDIFile:{
    			Id: 'custpage_dic_edi_po_send2edi_fullflow',
    			Text: 'Send & Export to Outbox',
    			Callback: 'sendERPTransaction2EDIFullflow'
    				
    		}
    	}
    });
    
};
