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
 * 1.00       01 Nov 2016     Liem Nguyen	   	   
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([
        '../../dic.cs.hub.config.vb',
        '../../../Com/Send2EDI/dic.cues.com.send2edi',
        '../../../Com/dic.cs.mess',
        ], 
        DiCEDIUESHubVB    
       );

function DiCEDIUESHubVB(dicConfigVB, 
			DICEDICUESSend2EDI,
			dicMess,
		
			serverWidget) {
   
	var _mod = {};
		
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
	_mod.beforeLoad = function(context) {
		//do nothing
		try{
	    	if (context.type === context.UserEventType.CREATE) return;
	       	DICEDICUESSend2EDI.customizeForm({
	    		config: dicConfigVB,
	    		record: context.newRecord,
	    		form: context.form
	    	});
		}catch(e){
			log.error({
				title: 'Loading Vendor Bill',
				details: e
			});
		}
    };

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
	_mod.beforeSubmit = function(context) {

    };

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    _mod.afterSubmit = function(context) {

    };

    return {
        beforeLoad: _mod.beforeLoad,
        beforeSubmit: _mod.beforeSubmit,
        afterSubmit: _mod.afterSubmit
    };
    
};
