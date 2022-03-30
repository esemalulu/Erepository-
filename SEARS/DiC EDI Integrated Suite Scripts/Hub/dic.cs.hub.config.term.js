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
        CUSTOM_RECORD: {
        	Name:'customrecord_dic_edi_match_term',
        	ScriptId: 480,
        	JoinFields:{
        		NSTermId:{
        			Id: 'custrecord_dic_edi_match_term_nstermid',
        			Operator: 'equalto'
        				
        		},
        	},
        	CustomRecordSearchColumns: function(){
        		return ['custrecord_dic_edi_match_term_type_code'
        		        , 'custrecord_dic_edi_match_term_bsdte_type'
        		        , 'custrecord_dic_edi_match_term_nstermid'];
        	},
        	TermSearchColumns: function(){
        		return ['datedriven'
        		        , 'daydiscountexpires'
        		        , 'dayofmonthnetdue'
        		        , 'daysuntilexpiry'
        		        , 'daysuntilnetdue'
        		        , 'discountpercent'
        		        , 'discountpercentdatedriven'
        		        , 'duenextmonthifwithindays'
        		        , 'externalid'
        		        , 'formulacurrency'
        		        , 'formuladate'
        		        , 'formuladatetime'
        		        , 'formulanumeric'
        		        , 'formulapercent'
        		        , 'formulatext'
        		        , 'internalid'
        		        , 'isinactive'
        		        , 'name'
        		        , 'preferred'];
        	},
        	 MapFilterColumns:{
   			  "InternalId"	: {
   				  Name:"internalid",
   				  Operator: 'is'
   			  }
   			  ,	"No": {
   				  Name:"name",
   				  Operator: 'contains'
   			  
   			  }
   		  },
        	CustomFields:{
        	
        		EDITermsTypeCode:{
        			IdSearchColumn: 'custrecord_dic_edi_match_term_type_code',
        			Id:'custpage_custrecord_dic_edi_match_term_type_code',
        			Type:'TEXT',
        			Text: 'EDI Terms Type Code',
        			MaxLength: 2
        				
        		},
        		EDITermsBasicDateType:{
        			Id:'custpage_custrecord_dic_edi_match_term_bsdte_type',
        			IdSearchColumn: 'custrecord_dic_edi_match_term_bsdte_type',
        			Type:'TEXT',
        			Text: 'EDI Terms Basic Date Type',
        			MaxLength: 2
        		}
        	}
        }
    });
    
});
