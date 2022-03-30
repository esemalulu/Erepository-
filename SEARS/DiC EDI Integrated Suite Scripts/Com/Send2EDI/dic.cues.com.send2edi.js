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
 * Build Actions for Transactions form. Using in User Event Script
 *  
 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */


define(['../Util/dic.ss.com.util'
        ], DICEDICESSend2EDI);

function DICEDICESSend2EDI(DiCEDISSUtil) {
	var _mod = {};
	
	_mod.customizeForm = function(options){
		
		var config = options.config;
		var currentRecord = options.record;
		
		if (!config.CheckEnabledSend({approvalStatus: currentRecord.getValue({fieldId:'approvalstatus'})}))
			return;
		
		var form = options.form;
		form.clientScriptFileId = config.ClientScript.Id;
		DiCEDISSUtil.buildActions({
			form: form,
			config: config.CustomActions
		});
	};
	
    return {
        customizeForm: _mod.customizeForm
    };
    
};
