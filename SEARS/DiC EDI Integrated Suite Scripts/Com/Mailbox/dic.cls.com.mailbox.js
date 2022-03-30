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
 * Create paging and send request to DIC Service to get document corresponding
 * filters 
 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */

/**
 * @NApiVersion 2.x
 */

define(['../Util/dic.cs.util',
        '../Util/dic.cs.util.url',
        '../Util/dic.cs.util.numeric', 
        
        '../Util/dic.cs.util.object',
        '../dic.cs.config',
        '../Util/dic.cs.util.dialog'], DICEDICLSComMailbox);

function DICEDICLSComMailbox(dicutil,
		 dicUtilUrl,
		 dicUtilNum,
		
		 dicUtilObj,
		 dicUtilConfig,
		 dicUtilDialog
		 ) {
	
	 
	/**
	 *Build the next link for pagings
	 */
	function _buildNextLink(options, tp){
			
		if (options.cp == tp) return '';
		var optionsPaging = {};
		dicUtilObj.deepCopyProperty(options, optionsPaging);
		
		optionsPaging.cp = parseInt(optionsPaging.cp) + 1;
		return  '<a id="dic-edi-mailbox-next" href="'+dicUtilUrl.buildUrlObjQuery(null, optionsPaging)+'" aria-label="Next" class="navig-next">'+
	     			'<span class="content" style="right: -77px;">'+
	     			'<b>Next: '+ (parseInt(options.ps, 10) * (optionsPaging.cp - 1)+  1) + '&nbsp;-&nbsp;' + (parseInt(options.ps, 10) * (optionsPaging.cp)) +
	     			 '</b>'+
	     			'<span></span>'+
	     			'</span>'+
	     		'</a>';
		

	};
	/**
	 * Build previous link for paging
	 * 
	 */
	function _buildPreviousLink(options, tp){
		if (options.cp == 1) return '';
		var optionsPaging = {};
		dicUtilObj.deepCopyProperty(options, optionsPaging);
		optionsPaging.cp = parseInt(optionsPaging.cp) - 1;
		console.log(options);
       return '<a id="dic-edi-mailbox-previous" href="'+dicUtilUrl.buildUrlObjQuery(null, optionsPaging)+'" class="navig-prev" aria-label="Previous">' +
					'<span class="content" style="right: -14px;">' +
					'<b>' +
						'Prev:  '+ (parseInt(options.ps, 10) * (optionsPaging.cp - 1) + 1) + '&nbsp;-&nbsp;' + (parseInt(options.ps, 10) * (optionsPaging.cp)) +  
					 '</b>'+
					'<span/>'+
			
					'</span>' +
				'</a>';
		
		
	}
	/**
	 * Create object contain information of Paging 
	 * return {Object}:
	 * 		Previous: string of html previous Link
	 * 	    Next: string of html next link
	 * 
	 */
   function _createPagination(options){
	   var $ = NS.jQuery;
	   var objQuery = dicUtilUrl.parseQueryString(window.location.search.substring(1, window.location.search.length));
	   if(!objQuery.yq){
		   objQuery.yq = $('input[name="' +  dicUtilConfig.PRE_MB_CF.FILTER_GROUP_YEARQUARTER.Id+'"]').val();
	   }
	   if (!objQuery.status){
		   objQuery.status = $('input[name="' + dicUtilConfig.PRE_MB_CF.FILTER_GROUP_STATUS.Id+ '"]').val();
	   }
	   if(!objQuery.cp){
		   objQuery.cp = "1";
	   }
	   var ps = $('#' + dicUtilConfig.PRE_MB_CF.PAGINATION.FIELD_PAGE_SIZE.Id).val() || "10";
	   objQuery.ps = ps;
	   var tr = $('#' + dicUtilConfig.PRE_MB_CF.PAGINATION.FIELD_TOTAL_RECORDS.Id).val() || "0";

	   var tp = Math.ceil(tr/ps);
	 
	   
	   return {
		   prevLink: _buildPreviousLink(objQuery, tp),
		   nextLink: _buildNextLink(objQuery, tp)
	   };
   }
   /**
    * 
    * Build paging navigation for subgrid
    *  @param {Object} jQuery library
    *  @param {Object} : 
    *  	+ Id: Id of subgrid layer (inbound/outbound)
    *   + TotalRecords: total records 
    *   + CurrentPage: current page in sublist
    *   + PageSize: number of record display on sublist
    *   
    */
   function  buildPagingSublist(options){
	   if (!options) return;
	   var $ = NS.jQuery;
	   options.TotalRecords = $('#' + dicUtilConfig.PRE_MB_CF.PAGINATION.FIELD_TOTAL_RECORDS.Id).val();
	   if (options.TotalRecords === "0") return;
	 
	   var pagingInfor = _createPagination(options);
	  
	   var mailboxlayer = $(dicUtilConfig.PRE_MB_CF.MAIL_GRID.ClientLayerId + ' > div > div > table > tbody > tr');
	   if (mailboxlayer.length){
		   $('<td align="right">' +
					 '<table border="0" cellspacing="0" cellpadding="2" class="uir_list_buttonbar_right">' +
					 	'<tbody>' +
					 		'<tr>' +
					 			'<td>' +
						 			'<div class="uir-field-wrapper" data-field-type="pagination-select">' +
						 				'<span class="uir-field">' +
						 					'<span id="segment_fs"	data-fieldtype="select" data-name="segment"  class="uir-pagination-select-wrapper" >'+
						 						'<span class="uir-pagination-select-navig">' +
						 							pagingInfor.prevLink +
						 							pagingInfor.nextLink +
						 					    '</span>'+
						 					'</span>'+
						 				'</span>' +
						 			'</div>' +
						 			'</td>'+
						 			'<td style="font-size:13px" align="right">' +
						 				'&nbsp;TOTAL: ' + (options.TotalRecords ? options.TotalRecords : '0') + 
						 			' (records)</td>' +
					 		'</tr>' +
					 	'</tbody>'+							 
					 '</table>'+
				  '</td>').appendTo(mailboxlayer);
		   $('a#dic-edi-mailbox-previous,a#dic-edi-mailbox-next').bind("click", 
				   function(){
			   			dicUtilDialog.showIndeterminate({title: 'DiC EDI - Loading data ....'});
			   		});
				  
	   }
	   
   }
   
   /**
    * 
    */
   function _createSeachOptions(){
	   //get jQuery instance
	   var $ = NS.jQuery;
	   var queryString = window.location.search.substring(1, window.location.search.length);
	   var objQuery = dicUtilUrl.parseQueryString(queryString);
	   var options = {
		   		cq: 1,
		   		yq: $('input[name="' +  dicUtilConfig.PRE_MB_CF.FILTER_GROUP_YEARQUARTER.Id+'"]').val(),
		   		status: $('input[name="' + dicUtilConfig.PRE_MB_CF.FILTER_GROUP_STATUS.Id+ '"]').val()
		    	};
		//delete property to prevent override property
	   dicUtilObj.deleteProperties(objQuery, ['cp','ps','yq','status']);
	   dicUtilObj.deepCopyProperty(objQuery, options);
	   return options;
   }
   /**
    * Process search action when user click button search
    */
   
   function searchAction(){
	   window.location.href = dicUtilUrl.buildUrlObjQuery(null, _createSeachOptions());
  
   }
   
   
  
   /**
    * Build sorting column 
    * @param {Object} options{
    * 	objQuery {Object} : information of querystring, key is property name, value is value of property
    *     {
    *  		 mailboxType {Numeric}: 1: Inbound,
    *  						   2: Outbound,
    *  		 configColumn {Object}: configuration of column,
    *        oldOb: {String} : order by
    *     }
    *     
    * }
    */
   
   function buildSortingColumn(options){
	   var $ = NS.jQuery;
	   var pagingOptions = {};
	   dicUtilObj.deepCopyProperty(options.objQuery, pagingOptions) ;
	   pagingOptions.ob =  options.configColumn.Field[options.mailboxType];
	   if(!pagingOptions.yq){
		   pagingOptions.yq = $('input[name="' +  dicUtilConfig.PRE_MB_CF.FILTER_GROUP_YEARQUARTER.Id+'"]').val();
	   }
	   if (!pagingOptions.status){
		   pagingOptions.status = $('input[name="' + dicUtilConfig.PRE_MB_CF.FILTER_GROUP_STATUS.Id+ '"]').val();
	   }
	   if (options.oldOb){
		   var property = options.oldOb[0];
		   var direction = options.oldOb.length == 1 ? "asc" :  options.oldOb[1];
		 
		   if (property === options.configColumn.Field[options.mailboxType]){
			   
			   if (direction === "asc"){
				   pagingOptions.ob +=" desc";
				   options.spanDirection.removeClass().addClass("listheadersortup");
			   }else{
				   pagingOptions.ob +=" asc";
				   options.spanDirection.removeClass().addClass("listheadersortdown");
			   }			   	
		   }
		 
	   }else{
		   options.spanDirection.removeClass().addClass("listheadersort");
	   }
	   
	   var url = dicUtilUrl.buildUrlObjQuery(null, pagingOptions);
	   options.objCol.bind("click", function(){
		   dicUtilDialog.showIndeterminate({title: 'DiC EDI - Loading data ....'});
		   window.location.href = url;
	   }) ;
   }
   /**
    * rebuild sorting column for sublist
    */
   function buildSortingSublist(options){
	  
	   var $ = NS.jQuery;
	  //get the column header and remove event default ns clicks events
	   var columns = $('tr' +dicUtilConfig.PRE_MB_CF.MAIL_GRID.ClientTableHeaderId).children();

	   var queryString = window.location.search.substring(1, window.location.search.length);
	   var objQuery = dicUtilUrl.parseQueryString(queryString);
	
	   var oldOb = objQuery["ob"];
	   if (oldOb){
		   oldOb = oldOb.split(" ");
	   }
	   dicUtilObj.deleteProperties(objQuery, ["ob"]);
	   var columnSorted = dicUtilObj.toSortArray(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns, function(obj1, obj2){
			return obj1[obj1.key].Order - obj2[obj2.key].Order; 
		});
	
	   //remove event click
	   columns.each(function(){
		   var objCol = $(this);
		   objCol.css('cursor', 'pointer');
		   objCol.removeAttr("onclick");
		   var spans = objCol.find("div>span");
		   var span = $(spans[0]);
		   if (spans.length > 0){
			   var num = parseInt(span.attr("id").replace(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id + "dir", ""));
			   if(num >=0 && num < columnSorted.length){
				   var configColumn = columnSorted[num];
				   configColumn = configColumn[configColumn.key];
				   
				   if("Field" in configColumn){
					   buildSortingColumn({objQuery:objQuery,
	   					   configColumn:configColumn,
	   					   mailboxType:options.mailboxType,
	   					   oldOb: oldOb,
	   					   objCol:objCol,
	   					   spanDirection: span});
					 
				   }
			   }
		   }
		   
	   });
   }
   
   function getIdSelected(){
	   var result = new Array();
	   var rowNo = window.nlapiGetLineItemCount(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id);
	   var indexRow = 1;
	   for(; indexRow <= rowNo; indexRow++){
		   var checked = window.nlapiGetLineItemValue(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id, //id of grid
				   dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.Select.Id,//id of checkbox
				   indexRow);
		   if (checked === "T"){
			   result.push({
				   "RowNo": indexRow,
				   "Id":  nlapiGetLineItemValue(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id,
						   dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.Id.Id, 
						   indexRow),
				   "YearQuarter":nlapiGetLineItemValue(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id, 
						   dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.YearQuarter.Id,
						   indexRow),
					"EDITransaction":nlapiGetLineItemValue(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id, 
							   dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.EDITranType.Id,
							   indexRow),
					"EDITranNum": nlapiGetLineItemValue(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id, 
							   dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.EDITranNum.Id,
							   indexRow),
					"ErpId": nlapiGetLineItemValue(dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id, 
							 dicUtilConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.ErpIdVal.Id,
							   indexRow)		   
						   
			   });
		   }
		   
	   }
	   return result;
   };
   
   return {
        buildPagingSublist: buildPagingSublist,
        buidSortingSublist: buildSortingSublist,
        searchAction: searchAction,
        getIdSelected: getIdSelected
        
    };
    
};
