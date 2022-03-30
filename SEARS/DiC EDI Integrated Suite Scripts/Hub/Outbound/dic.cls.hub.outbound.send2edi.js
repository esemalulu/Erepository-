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
/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */
define(['N/ui/dialog',
        '../../Com/dic.cs.mess',
        '../../Com/Util/dic.cs.util.string'], 
        DiCCLSHubOutboundSend2EDI);


function DiCCLSHubOutboundSend2EDI(
		nsdialog,
		dicmess,
		dicstring) {
	
    var _mod = {};
    
   
    _mod.send2DICEDI = function(options){
    	var erptransactionType = window.nlapiGetRecordType();
    	console.log(erptransactionType);
    	var internalId = window.nlapiGetRecordId();
    	var scriptContext = window.nlapiGetContext();
    	var company = scriptContext.company;
    	console.log(company);
    	if (!internalId){
    		nsdialog.alert({
				title:'DiC EDI - Send 2 DiC EDI Outbound',
				message: dicstring.stringFormat(dicmess.ERR.SEND_2_EDI_NOT_EXIST_ID.Message, 'Purchase Order')
			});
    	}
    	//alert('call in send 2 DiC EDI');
    };
    
    return {
      
        sendERPTransaction: _mod.send2DICEDI
    };
    
};
