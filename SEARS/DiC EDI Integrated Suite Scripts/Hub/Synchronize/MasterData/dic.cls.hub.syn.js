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
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['../../dic.cs.hub.config.syn'
        , '../../dic.cs.hub.config.term'
        , '../../dic.cs.hub.config.taxgroup'
        , '../../../Com/Util/dic.cs.util.string'
        , '../../../Com/dic.cs.mess'
        , '../../../Com/Util/dic.cs.util.dialog'
        , '../../../Com/dic.cs.config'
        , '../../../Com/Util/dic.cs.util.request'
        , '../../../Com/Util/dic.cs.util'
           
        , 'N/record'
        , 'N/search'
        , 'N/ui/message'
        , 'N/ui/dialog'
        , 'N/format'
        , 'N/https'
        ], DiCCSSynMasterData);

function DiCCSSynMasterData(dicHubConfigSyn
		, dicHubConfigTerm
		, dicHubConfigTaxGroup
		
		, dicUtilString
		, dicMess
		, dicDialog
		, diConfig
		, dicRequest
		, diutil
		
		, nsRecord
		, nsSearch
		, nsMess
		, nsDialog
		, nsFormat
		, https) {
    /******************************
     * region of fields
     *****************************/
	var _mod = {
    	NSInstMess : null,
    	
    };
	
	/******************************
     * end region of fields
     *****************************/
	
    /**
     *abstract class strategy syn 
     */
    _mod.StrategySyn = function(options){
    	this.options = options;
    	
    };
    
    _mod.StrategySyn.prototype.syn = function(){
    	
    };
    
    /**
     *end region of  abstract class stratey syn 
     **/
    
   
    /**
     * Stratey using HTTPS module of NETSUITE
     */
    _mod.StrategySynHttps = function(options){
    	_mod.StrategySyn.call(this, options);
    };
    
    _mod.StrategySynHttps.prototype = new _mod.StrategySyn();
    _mod.StrategySynHttps.prototype.constructor =  _mod.StrategySynHttps;
    
    /*
     * build body data of request
     */
    _mod.StrategySynHttps.prototype.buildPOSTData = function(options){
    	var result = {
        		FilterType: options.FilterType
        		, EmailAccount: options.EmailAccount
        		, SideType: "1"
        		, Company: options.Company  
        		, SynchronizeType: options.FilterMaster
        		, CurrentPage: options.CurrentPage
        		, PageSize: options.PageSize
        	};
    	if (options.CurrentPage === 1){
    		if (options.hasOwnProperty("Type")){
    			switch(options.Type){
    			case 'Text':
    				result.Code = options.Code;
    				break;
    			case 'Date':
    				result.FromDate = options.FromDate;
    				result.ToDate = options.ToDate;
    				break;
    			}
    		}
    	}else{
    		result.SearchId = options.SearchId;
    	}
        return result;
    };
    /**
     *End Strategy using HTTPS module of NETSUITE 
     **/
    
    _mod.Syn2EDIUsingSOAP = function(options){
    	
    	//call parent constructor
    	options.SynchronizedTotalItem = 0;
    	options.TotalItems = 0;
    	
    	_mod.StrategySynHttps.call(this, options);
    };
    
    _mod.Syn2EDIUsingSOAP.prototype = new _mod.StrategySynHttps;
    _mod.Syn2EDIUsingSOAP.prototype.constructor = _mod.Syn2EDIUsingSOAP;
    _mod.Syn2EDIUsingSOAP.prototype.syn = function(){
    	var self = this;
    	var selfOptions = this.options;
    	try{
	    	var request = dicRequest.buildRequest({
	    					url: this.options.URL
	    					, headers: this.options.HeaderRequest
	    					, data: this.buildPOSTData(this.options)
	    				 });
	    
	    	//console.log(selfOptions);
	    	https
			 .request
			 .promise(request)
	    	 .then(function(response){
	    			 var resJSON = dicRequest.processResponseDontThrowException({response: response});
	    			 if (resJSON.ErrorCode === 0){
	    				 if (resJSON.Data.ErrorCode === 0){
	    					 selfOptions.TotalItems = resJSON.Data.TotalItems;
	    					// console.log(resJSON.Data);
	    					 selfOptions.SynchronizedTotalItem  +=  resJSON.Data.MasterData != null ? resJSON.Data.MasterData.length: 0;
	    					 if (resJSON.Data.CurrentPage === 1){
	    						 dicDialog.updateMaxValue({value: resJSON.Data.TotalPages});
	    					 }
	    					 if (resJSON.Data.CurrentPage === resJSON.Data.TotalPages || resJSON.Data.TotalPages === 0){
	    						 _mod._showMessage({
	    		   		   			 ErrorCode: 0,
	    		   		   			 Message: ' Successfully',
	    		   		   			 SynchronizedTotalItem: resJSON.Data.TotalItems, 
	    		   		   			 TotalItems:  selfOptions.TotalItems,
	    		   		   			 NSMessType: nsMess.Type.CONFIRMATION
	    	      				 });
	    					 } else{
	    						 selfOptions.CurrentPage++;
	    						 selfOptions.SearchId = resJSON.Data.SearchId;
	    						 _mod._updateMessageWaitingDialog({
	    	    					 FilterMaster:  selfOptions.FilterMaster,
	    	    					 CurrentPage: selfOptions.CurrentPage,
	    	    					 TotalPages: resJSON.Data.TotalPages,
	    	    					 TotalItems: selfOptions.TotalItems,
	    	    					 SynchronizedTotalItem:  selfOptions.SynchronizedTotalItem 
	    	    				 });
	    						 self.syn();
	    					 };
	    				 }else{
	    					 _mod._showMessage({
	       					  ErrorCode: resJSON.Data.ErrorCode,
	       					  Message: resJSON.Data.Message,
	       					  SynchronizedTotalItem:  selfOptions.SynchronizedTotalItem, 
	       					  TotalItems:  selfOptions.TotalItems,
	       					  NSMessType: nsMess.Type.ERROR}); 
	    				 }
	    			 }else{
	    				 _mod._showMessage({
	    					  ErrorCode: resJSON.ErrorCode,
	    					  Message: ErrorCode.Message,
	    					  SynchronizedTotalItem:  selfOptions.SynchronizedTotalItem, 
	    					  TotalItems:  selfOptions.TotalItems,
	    					  NSMessType: nsMess.Type.ERROR}); 
	    			 };
	    		})
	    		.catch(function(reason){
	    			dicDialog.closeDialog();
	    			_mod._showMessage({
	     				  ErrorCode: dicMess.ERR.UNDERTERMINE.Code,
	     				  Message: reason.message,
	     				  SynchronizedTotalItem: selfOptions.SynchronizedTotalItem, 
	     				  TotalItems:  selfOptions.TotalItems,
	     				  NSMessType: nsMess.Type.ERROR}); 
	    		});
    	
    	}catch(e){
    		dicDialog.closeDialog();
			_mod._showMessage({
 				  ErrorCode: dicMess.ERR.UNDERTERMINE.Code,
 				  Message: e,
 				  SynchronizedTotalItem: selfOptions.SynchronizedTotalItem, 
 				  TotalItems:  selfOptions.TotalItems,
 				  NSMessType: nsMess.Type.ERROR}); 
    	};
    };
    
    
    _mod.Syn2EDIUsingSuiteScript = function(options){
    	_mod.StrategySyn.call(this, options);
    };
    
    _mod.Syn2EDIUsingSuiteScript.prototype = new _mod.StrategySynHttps();
    _mod.Syn2EDIUsingSuiteScript.prototype.constructor = _mod.Syn2EDIUsingSuiteScript;
    
    _mod.Syn2EDIUsingSuiteScript.prototype.buildObjectSearch = function(){
       	return nsSearch.create({
    		type: this.getNSSearchType(),
    		filters: this.buildFilterSearch(),
    		columns: this.buildSearchColumns()
    	});
    };
    _mod.Syn2EDIUsingSuiteScript.prototype.synPaging = function(){
    
      	var currentPageRange = this.options.pageData.pageRanges[this.options.currentPage];
    	var page = this.options.pageData.fetch({index: currentPageRange.index});
    	var dataInst = this.buildPOSTData(this.options);
    	dataInst.Data = this.getData({Data: page.data});
    	
    	var request = dicRequest.buildRequest({
			url: this.options.URL
			, headers: this.options.HeaderRequest
			, data: dataInst
	    });
    	var self = this;
    	
    	https
		 	.request
		 	.promise(request)
		 	.then(function(response){
		 		var resJSON = dicRequest.processResponseDontThrowException({response: response});
		 		if(resJSON.ErrorCode === 0){
					 if (resJSON.Data.ErrorCode == 0){
					 //add 
						 self.options.totalSynchronizedItems +=  resJSON.Data.MasterData.length;
						 self.options.currentPage++;
						 if (self.options.currentPage >= self.options.pageData.pageRanges.length){
							 //stop the get data
							 _mod._showMessage({
			   		   			 ErrorCode: 0,
			   		   			 Message: ' Successfully',
			   		   			 SynchronizedTotalItem: self.options.totalSynchronizedItems, 
			   		   			 TotalItems: self.options.totalItems,
			   		   			 NSMessType: nsMess.Type.CONFIRMATION
		      				 });
						 }else{
							 _mod._updateMessageWaitingDialog({
		    					 FilterMaster: self.options.FilterMaster,
		    					 CurrentPage: self.options.currentPage,
		    					 TotalPages: self.options.pageData.pageRanges.length,
		    					 TotalItems: self.options.totalItems,
		    					 SynchronizedTotalItem: self.options.totalSynchronizedItems 
		    				 });
													
							 self.synPaging();
						 };
					 }else{
						 _mod._showMessage({
	     					  ErrorCode: resJSON.Data.ErrorCode,
	     					  Message: resJSON.Data.Message,
	     					  SynchronizedTotalItem: self.options.totalSynchronizedItems, 
	     					  TotalItems: self.options.totalItems,
	     					  NSMessType: nsMess.Type.ERROR});  
					 };
				 }else{
					 _mod._showMessage({
						  ErrorCode: resJSON.ErrorCode,
						  Message: resJSON.Message,
						  SynchronizedTotalItem: self.options.totalSynchronizedItems, 
						  TotalItems: self.options.totalItems,
						  NSMessType: nsMess.Type.ERROR});  
				 };
		 })
		 .catch(function(reason){
			 dicDialog.closeDialog();
			_mod._showMessage({
				  ErrorCode: dicMess.ERR.UNDERTERMINE.Code,
				  Message: reason.message,
				  SynchronizedTotalItem: self.options.totalSynchronizedItems, 
				  TotalItems: self.options.totalItems,
				  NSMessType: nsMess.Type.ERROR}); 
		 });
    };
    
    _mod.Syn2EDIUsingSuiteScript.prototype.syn = function(){
    	try{
	    	 var search =  this.buildObjectSearch();
	    	 var pageData = search.runPaged({
	    		 pageSize: dicHubConfigSyn.PAGE_SIZE
	   	 	 });
	    	 if (pageData.count === 0){
	    		 _mod._showMessage({
		   			 ErrorCode: 0,
		   			 Message: ' Successfully',
		   			 SynchronizedTotalItem: 0, 
		   			 TotalItems: 0,
		   			 NSMessType: nsMess.Type.CONFIRMATION
				 });
	    	 }else{
	    		 dicDialog.updateMaxValue({value: pageData.pageRanges.length});
	    		 this.options.pageData = pageData;
	    		 this.options.totalItems =  pageData.count;
	    		 this.synPaging();
	    	
	    	 };
	    } catch(e){
	    	_mod._showMessage({
	   			 ErrorCode: dicMess.ERR.UNDERTERMINE.Code,
	   			 Message: e,
	   			 SynchronizedTotalItem: this.options.totalSynchronizedItems, 
	   			 TotalItems: this.options.totalItems,
	   			 NSMessType: nsMess.Type.ERROR
			 });
	    };
    };
    
    _mod.Syn2EDIUsingSuiteScript.prototype.getData = function(options){
    	return JSON.stringify(options.Data);
    };
    
    
    _mod.Syn2EDINSTermSuiteScriptHttps = function(options){
    	options.currentPage = 0;
    	options.totalItems = 0;
    	options.totalSynchronizedItems = 0;
    	_mod.Syn2EDIUsingSuiteScript.call(this, options);
    }
    
    /**
     * begin region of class Synchronize Net Suite Term
     */
    _mod.Syn2EDINSTermSuiteScriptHttps.prototype = new _mod.Syn2EDIUsingSuiteScript;
    _mod.Syn2EDINSTermSuiteScriptHttps.prototype.constructor =  _mod.Syn2EDINSTermSuiteScriptHttps;
    
   
    
    _mod.Syn2EDINSTermSuiteScriptHttps.prototype.buildSearchColumns = function(){
    	return dicHubConfigTerm.CUSTOM_RECORD.TermSearchColumns();
    };
    
    _mod.Syn2EDINSTermSuiteScriptHttps.prototype.getNSSearchType = function(){
    	return nsSearch.Type.TERM;
    };
    
    _mod.Syn2EDINSTermSuiteScriptHttps.prototype.getData = function(options){
    	var nsTerms = JSON.parse(JSON.stringify(options.Data));
    	try{
    		var nsTermsId = nsTerms.map(function(nsTerm){
	    		return nsTerm.id;
	    	});
    		var searchCustomRecordTerms = nsSearch.create({
	    		type: dicHubConfigTerm.CUSTOM_RECORD.Name, 
	    		columns: dicHubConfigTerm.CUSTOM_RECORD.CustomRecordSearchColumns(),
	    		filter:[[dicHubConfigTerm.CUSTOM_RECORD.JoinFields.NSTermId.Id, 'anyof',nsTermsId]]
	    	});
    		 var resultCustomTerms = JSON.parse(JSON.stringify(searchCustomRecordTerms.run().getRange({start: 0, end: 1000})));
	    	 if (resultCustomTerms){
	    		 var htLookupCustomFields =  {};
	    		 resultCustomTerms.forEach(function(nsTerm){
	    			 htLookupCustomFields[nsTerm.values[dicHubConfigTerm.CUSTOM_RECORD.JoinFields.NSTermId.Id]] = nsTerm;
	    		 });
	    		 
	    		 nsTerms.forEach(function(nsTerm){
	    			 if (htLookupCustomFields.hasOwnProperty(nsTerm.id)){
	    				 nsTerm['customfields'] = htLookupCustomFields[nsTerm.id].values;
	    			 }});
	    		 
	    	 };
    	}catch(e){
    		try{
    			log.error({title: 'DIC Loading/Filling Custom Terms record', details: e});
    		}catch(ie){
    			console.log(ie);
    		};
    		
    	}
    	return JSON.stringify(nsTerms);
    };
    
    _mod.Syn2EDINSTermSuiteScriptHttps.prototype.buildFilterSearch = function(){
    	var nsMapFilterColumns = dicHubConfigTerm.CUSTOM_RECORD.MapFilterColumns;
    	if (!nsMapFilterColumns.hasOwnProperty(this.options.FilterType)) return null;
    	var filterInfor = dicHubConfigTerm.CUSTOM_RECORD.MapFilterColumns[this.options.FilterType];
    	   	
		if (filterInfor){
			return [[filterInfor.Name, filterInfor.Operator, this.options.Code]];
		};
    	return null;
    };
    

    /**
     * end region of Synchronize NetSuite Term 
     **/
    
    /**
     *begion region of Synchronize NetSuite Sales Tax Code
     */
    _mod.Syn2EDINSSaleTaxCodeSuiteScriptHttps = function(options){
    	options.currentPage = 0;
    	options.totalItems = 0;
    	options.totalSynchronizedItems = 0;
    	_mod.Syn2EDIUsingSuiteScript.call(this, options);
    };
    
    _mod.Syn2EDINSSaleTaxCodeSuiteScriptHttps.prototype = new _mod.Syn2EDIUsingSuiteScript;
    _mod.Syn2EDINSSaleTaxCodeSuiteScriptHttps.prototype.constructor =  _mod.Syn2EDINSSaleTaxCodeSuiteScriptHttps;
    
  
    _mod.Syn2EDINSSaleTaxCodeSuiteScriptHttps.prototype.getNSSearchType = function(){
    	return nsSearch.Type.SALES_TAX_ITEM;
    };
    
    _mod.Syn2EDINSSaleTaxCodeSuiteScriptHttps.prototype.buildSearchColumns = function(){
    	return dicHubConfigSyn[this.options.FilterMaster].SearchColumns
    };
    
    _mod.Syn2EDINSSaleTaxCodeSuiteScriptHttps.prototype.buildFilterSearch = function(){
    	if (!dicHubConfigSyn.hasOwnProperty(this.options.FilterMaster)) return null;
    	var nsMasterInfor = dicHubConfigSyn[this.options.FilterMaster];
    	if (nsMasterInfor.MapFilterColumns.hasOwnProperty(this.options.FilterType)){
    		var filterInfor = nsMasterInfor.MapFilterColumns[this.options.FilterType];
    		if (filterInfor){
    			return [[filterInfor.Name, filterInfor.Operator, this.options.Code]];
    		};
    	}
    	return null;
    };
   
   
    /**
     * end region of Synchronization NetSuite Sales Tax Code
     **/
    
    /**
     * begin region of class Synchronize NetSuite Tax Group
     */
    _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps = function(options){
    	options.currentPage = 0;
    	options.totalItems = 0;
    	options.totalSynchronizedItems = 0;
    	_mod.Syn2EDIUsingSuiteScript.call(this, options);
    };
    
    _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps.prototype = new _mod.Syn2EDIUsingSuiteScript;
    _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps.prototype.constructor = _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps;
    
    _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps.prototype.getNSSearchType = function(){
    	return nsSearch.Type.TAX_GROUP;
    };
    
    _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps.prototype.buildSearchColumns = function(){
    	return dicHubConfigTaxGroup.CUSTOM_RECORD.TaxGroupCANSearchColumns();
    };
    
    _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps.prototype.buildFilterSearch = function(){
    	var nsMapFilterColumns = dicHubConfigTaxGroup.CUSTOM_RECORD.MapFilterColumns;
    	if (!nsMapFilterColumns.hasOwnProperty(this.options.FilterType)) return null;
    	var filterInfor = dicHubConfigTaxGroup.CUSTOM_RECORD.MapFilterColumns[this.options.FilterType];
    	   	
		if (filterInfor){
			return [[filterInfor.Name, filterInfor.Operator, this.options.Code]];
		};
    	return null;
    };
    
 
    _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps.prototype.getData = function(options){
    	var nsTaxGroups = JSON.parse(JSON.stringify(options.Data));
    	try{
    		var nsTaxGroupsId = nsTaxGroups.map(function(nsTaxGroup){
	    		return nsTaxGroup.id;
	    	});
    		
    		var searchCustomRecordTaxGroup = nsSearch.create({
	    		type: dicHubConfigTaxGroup.CUSTOM_RECORD.Name, 
	    		columns: dicHubConfigTaxGroup.CUSTOM_RECORD.CustomRecordSearchColumns(),
	    		filter:[[dicHubConfigTaxGroup.CUSTOM_RECORD.JoinFields.NSTaxGroupId.Id, 'anyof',nsTaxGroupsId]]
	    	});
    		 var resultCustomTaxGroups = JSON.parse(JSON.stringify(searchCustomRecordTaxGroup.run().getRange({start: 0, end: 1000})));
	    	
    		 if (resultCustomTaxGroups){
	    		 var htLookupCustomFields =  {};
	    		 resultCustomTaxGroups.forEach(function(nsTaxGroup){
	    			 htLookupCustomFields[nsTaxGroup.values[dicHubConfigTaxGroup.CUSTOM_RECORD.JoinFields.NSTaxGroupId.Id]] = nsTaxGroup;
	    		 });
	    		 
	    		 nsTaxGroups.forEach(function(nsTaxGroup){
	    			 if (htLookupCustomFields.hasOwnProperty(nsTaxGroup.id)){
	    				 nsTaxGroup['customfields'] = htLookupCustomFields[nsTaxGroup.id].values;
	    			 }});
	    		 
	    	 };
    	}catch(e){
    		try{
    			//console.log(e.toString());
    			console.log(JSON.stringify(e));
    			log.error({title: 'DIC Loading/Filling Custom Terms record', details: e});
    		}catch(ie){
    			console.log(ie);
    		};
    		
    	}
    //	console.log(JSON.stringify(nsTaxGroups));
    	return JSON.stringify(nsTaxGroups);
    };
    
     /**
     * end region of class Synchronize NetSuite Tax Group
     **/
    
    
    /**
     * Begin region of Synchronization of Tax Group 
     * 
     */
    _mod.Syn2EDINSTaxGroupSuiteScriptHttps = function(options){
    	options.currentPage = 0;
    	options.totalItems = 0;
    	options.totalSynchronizedItems = 0;
    	_mod.Syn2EDIUsingSuiteScript.call(this, options);
    }
    
    _mod.Syn2EDINSTaxGroupSuiteScriptHttps.prototype = new _mod.Syn2EDIUsingSuiteScript;
    _mod.Syn2EDINSTaxGroupSuiteScriptHttps.prototype.constructor = _mod.Syn2EDINSTaxGroupSuiteScriptHttps;
    
    _mod.Syn2EDINSTaxGroupSuiteScriptHttps.prototype.getNSSearchType = function(){
    	return nsSearch.Type.TAX_GROUP;
    };
    
    _mod.Syn2EDINSTaxGroupSuiteScriptHttps.prototype.buildSearchColumns = function(){
    	return dicHubConfigTaxGroup.CUSTOM_RECORD.TaxGroupSearchColumns();
    };
    
    _mod.Syn2EDINSTaxGroupSuiteScriptHttps.prototype.buildFilterSearch = function(){
    	
    	var filterNotCA = [['country', 'noneof',['CA']]];
    	var nsMapFilterColumns = dicHubConfigTaxGroup.CUSTOM_RECORD.MapFilterColumns;
    	
    	if (!nsMapFilterColumns.hasOwnProperty(this.options.FilterType)) return filterNotCA;
    	var filterInfor = dicHubConfigTaxGroup.CUSTOM_RECORD.MapFilterColumns[this.options.FilterType];
    	   	
		if (filterInfor){
			filterNotCA.push("and");
			filterNotCA.push([filterInfor.Name, filterInfor.Operator, this.options.Code]);
		};
	
    	return filterNotCA;
    };
    
    _mod.Syn2EDINSTaxGroupSuiteScriptHttps.prototype._fillTaxItem = function(options){
    	var nsTaxGroup = options.NSTaxGroup;
    	//
    	var obj = nsRecord.load({
    		type: nsRecord.Type.TAX_GROUP,
    		id: nsTaxGroup.id
    	});
    	if (obj){
    		if (!this.SaleTaxFields){
    			this.SaleTaxFields = obj.getSublistFields({sublistId:'taxitem'});
    		};
    		var taxitems = {
    				taxitem: []
    		};
    		nsTaxGroup["taxitems"] = taxitems;
    		var lineCount = obj.getLineCount({sublistId:'taxitem'});
    		for(var line = 0; line < lineCount; line++){
    			var taxitem = {};
    			taxitems.taxitem.push(taxitem);
    			this.SaleTaxFields.forEach(function(fieldName){
    				taxitem[fieldName] = obj.getSublistValue({
    					line: line,
    					fieldId: fieldName,
    					sublistId: 'taxitem'
    				});
    			});
    		}
    		console.log(nsTaxGroup['taxitems']);
    	};
    };
    
    _mod.Syn2EDINSTaxGroupSuiteScriptHttps.prototype.getData = function(options){
    	var nsTaxGroups = JSON.parse(JSON.stringify(options.Data));
		var nsTaxGroupsId = nsTaxGroups.map(function(nsTaxGroup){
    		return nsTaxGroup.id;
    	});
		
		var searchCustomRecordTaxGroup = nsSearch.create({
    		type: dicHubConfigTaxGroup.CUSTOM_RECORD.Name, 
    		columns: dicHubConfigTaxGroup.CUSTOM_RECORD.CustomRecordSearchColumns(),
    		filter:[[dicHubConfigTaxGroup.CUSTOM_RECORD.JoinFields.NSTaxGroupId.Id, 'anyof',nsTaxGroupsId]]
    	});
		 var resultCustomTaxGroups = JSON.parse(JSON.stringify(searchCustomRecordTaxGroup.run().getRange({start: 0, end: 1000})));
    	
		 if (resultCustomTaxGroups){
    		 var htLookupCustomFields =  {};
    		 resultCustomTaxGroups.forEach(function(nsTaxGroup){
    			 htLookupCustomFields[nsTaxGroup.values[dicHubConfigTaxGroup.CUSTOM_RECORD.JoinFields.NSTaxGroupId.Id]] = nsTaxGroup;
    		 });
    		 //closure in scope function
    		 var self = this;
    		 nsTaxGroups.forEach(function(nsTaxGroup){
    			 self._fillTaxItem({NSTaxGroup: nsTaxGroup});
    			 if (htLookupCustomFields.hasOwnProperty(nsTaxGroup.id)){
    				 nsTaxGroup['customfields'] = htLookupCustomFields[nsTaxGroup.id].values;
    			 }});
    		 
    	 };
    	
   
    	return JSON.stringify(nsTaxGroups);
    }
    /**
     * end region of Synchronization of TaxGroup
     **/
    
     /**
      * Begin region of Synchronization of Subsidiary
      */
    _mod.Syn2EDINSSubsidiarySuiteScriptHttps = function(options){
    	options.currentPage = 0;
    	options.totalItems = 0;
    	options.totalSynchronizedItems = 0;
    	_mod.Syn2EDIUsingSuiteScript.call(this, options);
    }
    
    _mod.Syn2EDINSSubsidiarySuiteScriptHttps.prototype = new _mod.Syn2EDIUsingSuiteScript;
    _mod.Syn2EDINSSubsidiarySuiteScriptHttps.prototype.constructor =  _mod.Syn2EDINSSubsidiarySuiteScriptHttps;
    
    _mod.Syn2EDINSSubsidiarySuiteScriptHttps.prototype.getNSSearchType = function(){
   
    	return nsSearch.Type.SUBSIDIARY;
    };
    
    _mod.Syn2EDINSSubsidiarySuiteScriptHttps.prototype.buildSearchColumns = function(){
    
    	return dicHubConfigSyn[this.options.FilterMaster].SearchColumns;
    };
    
    _mod.Syn2EDINSSubsidiarySuiteScriptHttps.prototype.buildFilterSearch = function(){
    	if (!dicHubConfigSyn.hasOwnProperty(this.options.FilterMaster)) return null;
    	var nsMasterInfor = dicHubConfigSyn[this.options.FilterMaster];
    	if (nsMasterInfor.MapFilterColumns.hasOwnProperty(this.options.FilterType)){
    		var filterInfor = nsMasterInfor.MapFilterColumns[this.options.FilterType];
    		if (filterInfor){
    			return [[filterInfor.Name, filterInfor.Operator, this.options.Code]];
    		};
    	}
    	return null;
    };
    
  
    /**
     * End region of Synchronization of Subsidiary
     **/
    _mod.algorithSyn = function(options){
    	//hoist in the function
    	var inst;
    	switch (options.FilterMaster) {
    		case 'NSSubsidiary':
    			inst = new _mod.Syn2EDINSSubsidiarySuiteScriptHttps(options);
    			break;
    		case 'NSSalesTaxCode':
    			inst = new _mod.Syn2EDINSSaleTaxCodeSuiteScriptHttps(options);
    			break;
    		
    		case 'NSTerm':
    			inst = new _mod.Syn2EDINSTermSuiteScriptHttps(options);
    			break;
    		
    		case 'NSTaxGroupCAN': 
    			inst = new _mod.Syn2EDINSTaxGroupCANSuiteScriptHttps(options);
    			break;
    		
    		case 'NSTaxGroup':
    			inst = new _mod.Syn2EDINSTaxGroupSuiteScriptHttps(options);
    			break;
    		
    		default:
    			inst = new _mod.Syn2EDIUsingSOAP(options);
		 		break;
    	};
    	inst.syn();
    };
        
    
    _mod._buildURLServiceSyn = function(){
    	return diConfig.URL_EDI_SERVICE + dicHubConfigSyn.SERVICE_POST;
    };
    
    _mod._showMessage = function(options){
    	//close waiting dialog
    	dicDialog.closeDialog();
    	var mess = dicUtilString.stringFormat('Error Code: {0}. Message: {1}', options.ErrorCode, options.Message) + '.<br/>';
    	mess +=   dicUtilString.stringFormat(dicMess.MESS.SYN_MASTER_DATA, options.SynchronizedTotalItem, options.TotalItems);
    	if (_mod.NSInstMess){
    		_mod.NSInstMess.hide();
    	}
    	_mod.NSInstMess = nsMess.create({
    		title: 'Result of Synchronization',
    		message: mess,
    		type: options.NSMessType
    	});
    	_mod.NSInstMess.show({
            duration: dicHubConfigSyn.DURATION
        });
    };
    
    _mod._updateMessageWaitingDialog = function(options){
    	var title = 'DiCentral EDI - Synchronize NetSuite ' + dicHubConfigSyn.CustomFields.FilterSynType.Value[options.FilterMaster];
    	title += ' (' + options.CurrentPage + '/'+ options.TotalPages + ')';
    	var mess = options.SynchronizedTotalItem + ' / ' + options.TotalItems + ' record(s) synchronized';
    	dicDialog.updateValueProgess({
    		value: options.CurrentPage,
    		title: title,
    		message: mess
    	});
    };
    

    
     _mod.getMasterData =  function(){
	   alert('the function is being constructing');
	   
   /* 	 var search = nsSearch.create({
    		 type: nsSearch.Type.SALES_TAX_ITEM,
    		 columns:['custrecord_dic_edi_adj_reason'
    		          ,'itemid'
    		          , 'custrecord_dic_edi_adj_type'
    		          , 'custrecord_dic_edi_adj_refid'
    		          , 'rate'
    		          , 'appliestoservice'
    		          , 'availableon'
    		          , 'country'
    		          , 'description'
    		          , 'externalid'
    		          , 'internalid'
    		          , 'rate'
    		          , 'taxtype']
    	 });
    	 var res = search.run().getRange({
    		 start: 0,
    		 end: 4
    	 });*/
	   
   };

   /****************************
    * region of entry points 
    *  
    *****************************/
   _mod._processSynMasterData = function(options){
	   	_mod.algorithSyn(options);
   };
   
   /**
    * Fill addional information of DIServices
    */
   _mod._fillAdditionalValues = function(options){
       var val =  options.value;
       var context = window.nlapiGetContext();
	   val.Company= context.company;
	   val.EmailAccount = context.email;
	   val.URL = _mod._buildURLServiceSyn();
	   val.PageSize = dicHubConfigSyn.PAGE_SIZE;
	   val.HeaderRequest = dicRequest.buildHeaderRequest();
	   val.CurrentPage = 1;
	   val.SynchronizedTotalItem = 0;
	   val.TotalItems = 0;
	   return val;
    };
    
    /**
     * Validate fields on NetSuite synchronize form
     */
    _mod._validateGUI = function(){
    	var valFilterType = window.NS.jQuery('input[name="' + dicHubConfigSyn.CustomFields.FilterType.Id + '"]').val();
    	var filterType = dicHubConfigSyn.getValidateTypeByFilterType(valFilterType);
    	
    	var result= {
    			isValid: true,
    			FilterType: valFilterType,
    			FilterMaster: window.nlapiGetFieldValue(dicHubConfigSyn.CustomFields.FilterSynType.Id)
    		}
    		, messValidate = null;
    	if (!filterType){
    		return result;
    	}
    	if(filterType === 'RequiredText'){
    		var val = window.nlapiGetFieldValue(dicHubConfigSyn.CustomFields.FilterTextNo.Id);
    		if (!val || dicUtilString.trim(val) === ''){
    			messValidate = dicUtilString.stringFormat(dicMess.ERR.REQUIRED.Message, dicHubConfigSyn.CustomFields.FilterType.Value[valFilterType]);
    			//show ns dialog
    			result.isValid = false;
    		}
    		else{
    			result.Code = val;
    			result.Type = "Text";
    		};
    	}else if (filterType === 'RangeDate'){
    		var frmDate = window.nlapiGetFieldValue(dicHubConfigSyn.CustomFields.FilterDateFrom.Id),
    			toDate = window.nlapiGetFieldValue(dicHubConfigSyn.CustomFields.FilterDateTo.Id);
    		if (!frmDate){
    			messValidate = dicUtilString.stringFormat(dicMess.ERR.REQUIRED.Message, 'Date from');
    			result.isValid = false;
    		} else if (result.isValid && !toDate){
    			result.isValid = false;
    			messValidate = dicUtilString.stringFormat(dicMess.ERR.REQUIRED.Message, 'Date to');
    		} ;

    		if (result.isValid){
    			var dateFrom = nsFormat.parse({
    				value: frmDate
    				, type: nsFormat.Type.DATE
    			});
    			var dateTo = nsFormat.parse({
    				value: toDate
    				, type: nsFormat.Type.DATE
    			});
    			dateTo.setHours(23,59,59,999);
    			if (dateFrom > dateTo){
    				result.isValid = false;
    				messValidate = dicUtilString.stringFormat(dicMess.ERR.INVALID_RANGE_DATE.Message, toDate, frmDate); 
    			}else{
    				result.Type= "Date";
    				result.FromDate = dicUtilString.stringFormat('/Date({0})/' ,dateFrom.getTime());
    				result.ToDate = dicUtilString.stringFormat('/Date({0})/',dateTo.getTime());
    			}
    		}
    	}
    	if(!result.isValid){
    		nsDialog.alert({
    			title:'DiCentral EDI Synchronize Master Data - Error'
    			, message: messValidate
    		});
    	} 
    	return result;
    };
    
   _mod.synchronize = function(){
	   try{

		   if (_mod.NSInstMess){
	    		_mod.NSInstMess.hide();
	    	}
		   var val = _mod._validateGUI();
		
		   if(!val || !val.isValid){
			   return; 
		   }
		   dicDialog.showProgressDialog({
		   		title: 'DiCentral EDI - Synchronize NetSuite ' + dicHubConfigSyn.CustomFields.FilterSynType.Value[val.FilterMaster],
		   		message: 'Synchronizing ...',
		   		initialValue: 0,
		   		max: 100
	   		});
		   //get the current company
		   _mod._processSynMasterData( _mod._fillAdditionalValues({value: val}));
	   }catch(e){
		 
		    dicDialog.closeDialog();
			var mess = diutil.processException(e, {title: "Synchronize Master Data"});
			_mod._showMessage({
 				  ErrorCode: dicMess.ERR.UNDERTERMINE.Code,
 				  Message: mess,
 				  SynchronizedTotalItem: 0, 
 				  TotalItems: 0,
 				  NSMessType: nsMess.Type.ERROR}); 

		}
    };
   
   
   _mod._processDisplayFilter = function(options){
	   var inforFilterIds = dicHubConfigSyn.getGroupIdFilterByType(window.nlapiGetFieldValue(dicHubConfigSyn.CustomFields.FilterType.Id));
	   inforFilterIds.hideIds.forEach(function(id){
		   window.NS.jQuery('tbody>tr>td#fg_' + id).closest('table').hide();
	   });
	   
	   inforFilterIds.showIds.forEach(function(id){
		   window.NS.jQuery('tbody>tr>td#fg_' + id).closest('table').show();
	   });
   },
   
   _mod._filterTypeChange = function(options){
	   _mod._processDisplayFilter();
  
   };
   
   /**
    * Function to be executed after page is initialized.
    *
    * @param {Object} scriptContext
    * @param {Record} scriptContext.currentRecord - Current form record
    * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
    *
    * @since 2015.2
    */
    _mod.pageInit = function(scriptContext) {

   	 	_mod._processDisplayFilter();
    };

   /**
    * prevent the confirm dialog "You have not yet submitted this record"
    */
   _mod.fieldChanged = function(scriptContext){
	   switch(scriptContext.fieldId){
	   	
		   case dicHubConfigSyn.CustomFields.FilterType.Id:
			   
			   _mod._filterTypeChange({
				   filedId : scriptContext.fieldId
			   });
			   break;
	   }
	   window.setWindowChanged(window, false);
   };
   
   /*******************************
    * end region of entry points
    *******************************/
    return {
        pageInit: _mod.pageInit,
        synchronize: _mod.synchronize,
        fieldChanged: _mod.fieldChanged,
        getMasterData: _mod.getMasterData
              
    };
    
};
