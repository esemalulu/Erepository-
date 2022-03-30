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
	       Name:'customrecord_dic_edi_match_tax_group',
	       JoinFields:{
	    	   NSTaxGroupId:{
	    		   Id:'custrecord_dic_edi_match_taxgp_taxgpid', 
	    		   Operator: 'equalto'
	    	   }
	       },
	       
	       CustomRecordSearchColumns: function(){
	    	   return ['custrecord_dic_edi_taxgp_adj_reason',
	    	           'custrecord_dic_edi_match_taxgp_taxgpid',
	    	           'custrecord_dic_edi_taxgp_adj_type'
	    	           ];
	       },
	       MapFilterColumns:{
	    	   "InternalId"	: {
	   				  Name:"internalid",
	   				  Operator: 'is'
	   			  }
	   			  ,	"No": {
	   				  Name:"itemid",
	   				  Operator: 'contains'
	   			  
	   			  }
	       },
	       TaxGroupSearchColumns: function(){
	    	 return ['country',
	    	         'county',
	    	         'externalid',
	    	         'itemid',
	    	         'rate',
	    	         'state',
	    	         'statedisplayname'//,
	    	         //'taxtype'
	    	         ];  
	       },
	       TaxGroupCANSearchColumns: function(){
	    	 return ['city',
	    	         'country',
	    	         'county',
	    	         'externalid',
	    	         'formulacurrency',
	    	         'formuladate',
	    	         'formuladatetime',
	    	         'formulanumeric',
	    	         'formulapercent',
	    	         'formulatext',
	    	         'internalid',
	    	         'isinactive',
	    	         'itemid',
	    	         'piggyback',
	    	         'rate',
	    	         'state',
	    	         'statedisplayname',
	    	                  
	    	         'taxitem1',
	    	         'taxitem2',
	    	         //'taxtype',
	    	         'unitprice1',
	    	         'unitprice2',
	    	         'zip'];  
	       },
	       CustomFields:{
	    	   EDITaxGroupEDIAdjReason:{
	    		   IdSearchColumn: 'custrecord_dic_edi_taxgp_adj_reason',
	   				Id:'custpage_custrecord_dic_edi_taxgp_adj_reason',
	   				Type:'TEXT',
	   				Text: 'Adj Reason',
	   				MaxLength: 10
	    	   },
	    	   EDITaxGroupEDIAdjType:{
	    		   IdSearchColumn: 'custrecord_dic_edi_taxgp_adj_type',
	    		   Id: 'custpage_custrecord_dic_edi_taxgp_adj_type',
	    		   Type:'TEXT',
	   			   Text: 'Adj Type',
	   			   MaxLength: 2
	    	   },
	       
	       }
    	 }
    
    	});
    
});
