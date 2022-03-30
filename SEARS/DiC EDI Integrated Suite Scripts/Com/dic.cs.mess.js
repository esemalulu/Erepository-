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
define([],

function() {
   
    return Object.freeze({
    	   	
    	"MESS":{    		   		
    		"DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND": "Send {0} to DiC EDI Outbound",
    		"DIC_EDI_SENDING_ERP_TRANSACTION": 'Sending {0} to DIC EDI Outbound ...',
    		"SEND_ERP_TRANASCTION_2_EDIOUTBOUND_SUCCESS":"NetSuite {0} [{1}] is sent to DiC EDI Outbound [Outbound Id: {2}, YearQuarter: {3}] Success", 
    		"SEND_ERP_TRANSACTION_2_EDIOUTBOUND_SUCCESS_TITLE": "Send {0} to DiC EDI outbound success",   		   		
    		"SEND_NS_VENDOR_BILL_2_EDIOUTBOUND_SUCCESS":"NetSuite Vendor Bill [{0}] is sent to DiC EDI Outbound [Outbound Id: {1}, YearQuarter: {2}] Success",    		
    		"SEND_NS_VENDOR_BILL_2EDIOUTBOUND_SUCCESS_TITLE": "Send NetSuite Vendor Bill to DiC EDI outbound success",
    		"SYN_MASTER_DATA" : "{0}/{1} record(s) synchronized."	
    	},
        "ERR":{
        	
        	"UNAUTHORIZED":{
    			"Code": 90401,
    			"Message": "You dont have permission to access Di Service."
    		},
    		"SERVICE_NOT_FOUND":{
    			"Code": 90404,
    			"Message":"The endpoint is invalid"
    		},
    	
    		
    		
        	"SELECTED_MAIL":{
        		1:"Please selected Inbound Id to Import",
        		2: "Please select Outbound Id to Export"
        	},
        	"UNDERTERMINE":{
        		"Code": 90001,
        		"Message": "Undertermine"
        	},
            "REQUIRED": {
                "Code": 90002,
                "Message":"The {0} requires."
            },
    		"RANGE_YEAR_INVALID":{
    			"Code": 90003,
    			"Message": "The start year {0} is less than end year {1}"
    		},
    		"INVALID":{
    			"Code":90004,
    			"Message":"The {0} is invalid"
    		},
    		"MONTH_IS_INVALID":{
    			"Code": 90005,
    			"Message": "The month is numeric, is greater than equal 1 and less than equal 12"
    		},
    		"RANGE_MONTH_INVALID":{
    			"Code":90006,
    			"Message":"The start month {0} is less than equal end month {1}"
    		},
    		
    		"SEND_2_EDI_NOT_EXIST_ID":{
    			"Code": 90007,
    			"Message": "Please save the {0}, before you send to DiC EDI Outbound"
    		},
    		"INVALID_RANGE_DATE":{
    			"Code": 90008,
    			"Message": "The to date [{0}] is must be greater or equal than from date [{1}]."
    		}
    	}
    });
    
});
