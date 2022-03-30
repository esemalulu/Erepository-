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
   var _mapFilterType2GroupId = [];
   
  
   var _CONST = Object.freeze({
	   PRE_FLD : 'custrecord_dic_fld_hub_syn_item_',
	   FILTER_ID_DATE: 'custrecord_dic_filter_by_date',
	   FILTER_MASTER_ID: 'custrecord_dic_filter_master_syn',
	   FILTER_ID_OTHER: 'custrecord_dic_filter_other',
   });
   
   var _filterGroups = [_CONST.FILTER_ID_DATE, _CONST.FILTER_ID_OTHER];
   
   (function(){
	   _mapFilterType2GroupId["All"] = null;
	   _mapFilterType2GroupId["Lastest"] = null;
	   _mapFilterType2GroupId["No"] = _CONST.FILTER_ID_OTHER;
	   _mapFilterType2GroupId["InternalId"] = _CONST.FILTER_ID_OTHER;
	   _mapFilterType2GroupId["CreatedDate"] = _CONST.FILTER_ID_DATE;
	   _mapFilterType2GroupId["LastModifedDate"] = _CONST.FILTER_ID_DATE;
   }());
   
   return Object.freeze({
	   	SERVICE_POST:'/syn/json',
	   	DURATION: 0,
	   	PAGE_SIZE: 20,
	   	getGroupIdFilterByType: function(val){
	  		
	   		var displayFilterId = _mapFilterType2GroupId[val];
	   		return {
	   			showIds : [displayFilterId],
	   			hideIds: _filterGroups.filter(function(val){
	   				return val !== displayFilterId;
	   			}),
	   		};
	   	},
	   	getValidateTypeByFilterType: function(val){
	   		if (val === 'LastModifedDate' || val === 'CreatedDate') {
	   			return 'RangeDate';
   			} else if (val === 'No' || val === 'InternalId'){
   				return 'RequiredText';
   			}
	   		return null;
	   		
	   	},
    	Id:'customrecord_dic_hub_syn_item',
    	Title: 'Synchronize NetSuite Master Data',
    	NSSubsidiary:{
    		SearchColumns:[
    		                'address1'
    		               , 'address2'
    		               , 'address3'
    		               , 'anonymouscustomerinboundemail'
    		               , 'anonymouscustomeronlineforms'
    		               , 'caseassignmenttemplate'
    		               , 'caseautomaticclosuretemplate'
    		               , 'casecopyemployeetemplate'
    		               , 'casecreationtemplate'
    		               , 'caseescalationtemplate'
    		               , 'caseupdatetemplate'
    		               , 'city'
    		               , 'companynameforsupportmessages'
    		               , 'country'
    		               , 'currency'
    		               , 'email'
    		               , 'employeecaseupdatetemplate'
    		               , 'externalid'
    		               , 'fax'
    		               , 'formulacurrency'
    		               , 'formuladate'
    		               , 'formuladatetime'
    		               , 'formulanumeric'
    		               , 'formulapercent'
    		               , 'formulatext'
    		               , 'internalid'
    		               , 'iselimination'
    		               , 'isinactive'
    		               , 'legalname'
    		               , 'mainsupportemailaddress'
    		               
    		               , 'name'
    		               , 'namenohierarchy'
    		               , 'phone'
    		               , 'purchaseorderamount'
    		               , 'purchaseorderquantity'
    		               , 'purchaseorderquantitydiff'
    		               , 'receiptamount'
    		               , 'receiptquantity'
    		               , 'receiptquantitydiff'
    		               , 'state'
    		               , 'taxidnum'
    		               , 'tranprefix'
    		               , 'url'
    		               , 'zip'
    		               ],
               MapFilterColumns:{
     			  "InternalId"	: {
     				  Name:"internalid",
     				  Operator: 'is'
     			  }
     			  ,	"No": {
     				  Name:"name",
     				  Operator: 'contains'
     			  
     			  }
     		  }  
    	},
    	
    	NSSalesTaxCode:{
    		SearchColumns: ['custrecord_dic_edi_adj_reason'
    		   		           ,'itemid'
    		   		           , 'custrecord_dic_edi_adj_type'
    		   		           , 'custrecord_dic_edi_adj_refid'
    		   		           , 'rate'
    		   		           //, 'appliestoservice'
    		   		           //, 'availableon'
    		   		           , 'country'
    		   		           , 'description'
    		   		           , 'externalid'
    		   		           , 'internalid'
    		   		           , 'rate'
    		   		           , 'taxtype'],
    		  MapFilterColumns:{
    			  "InternalId"	: {
    				  Name:"internalid",
    				  Operator: 'is'
    			  }
    			  ,	"No": {
    				  Name:"itemid",
    				  Operator: 'contains'
    			  
    			  }
    		  }
    	},
    	ClientScript:{
    		Name:"dic.cls.hub.syn",
    		Id:"40822"
    	},
    	CustomGroupFields:{
    		MasterFilte:{
    			Id: _CONST.FILTER_MASTER_ID,
    			Text: 'Master Filter'
    			
    		},
    		FilterDate:{
    			Id: _CONST.FILTER_ID_DATE,
    			Text: 'Filter'
    			
    		},
    		OtherFilter:{
    			Id: _CONST.FILTER_ID_OTHER,
    			Text: 'Filter'
    		}
    		
    	},
    	CustomFields:{
    		FilterSynType: {
    			Id: _CONST.PRE_FLD + 'filter_syn_type',
    			Text: 'Synchronize Type',
    			Type: 'SELECT',
    			ContainerId: _CONST.FILTER_MASTER_ID,
    			Value:{
    				"NSItem" : "Item",
    				"NSTerm" : "Term",
    				"NSLocation": "Location",
    			/*	"NSSalesTaxCode":"Tax Code",
    				"NSTaxGroupCAN": "Tax Group Canada",
    				"NSTaxGroup": "Tax Group",*/
    				"NSVendor": "Vendor",
    				"NSSubsidiary": "Subsidiary"
    			}
    		},
    		FilterType:{
    			Id: _CONST.PRE_FLD + 'filter_type',
    			Text: 'Filter Type',
    			Type: 'SELECT',
    			ContainerId: _CONST.FILTER_MASTER_ID,
    			Value:{
      				
    				'All': "Get All",
    				'No': "Id",
    				'InternalId': "Internal Id",
    				'CreatedDate': "Created Date",
    				'LastModifedDate': "Last modified date",
    				'Lastest': 'Latset synchronize date'
    			}
    		},
    		FilterDateFrom: {
    			Id: _CONST.PRE_FLD + 'filter_dtefrom',
    			Text: 'Date from',
    			Type: 'DATE',
    			ContainerId: _CONST.FILTER_ID_DATE,
    		},
    		FilterDateTo: {
    			Id: _CONST.PRE_FLD + 'filter_dteto',
    			Text: 'Date to',
    			Type: 'DATE',
    			ContainerId: _CONST.FILTER_ID_DATE
    		},
    		FilterTextNo:{
    			Id: _CONST.PRE_FLD + 'filter_txt_or_numric',
    			Text: 'Code',
    			Type: 'TEXT',
    			ContainerId: _CONST.FILTER_ID_OTHER
    		},
    		
    	},
    	CustomActions:{
			Synchronize:{
				Id: _CONST.PRE_FLD + 'btnSyn',
				Text: 'Synchronize',
				Callback: 'synchronize'
			}/*,
			GetMasterData:{
				Id: _CONST.PRE_FLD + 'btnGet',
				Text: 'Get',
				Callback: 'getMasterData' 
			}*/
		},
    });
    
});
