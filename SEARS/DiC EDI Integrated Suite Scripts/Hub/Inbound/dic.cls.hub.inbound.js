/**
 * Copyright (c) 2016 DiCentral, Inc.
 * 1199 NASA Parkway, Houston, TX 77058, USA
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
define(['N/ui/dialog', 
        'N/ui/message',
        'N/runtime',
        'N/https',
        'N/url',
        '../../Com/dic.cs.config',
        '../../Com/Util/dic.cs.util',
        '../../Com/Mailbox/dic.cls.com.mailbox',
        '../../Com/Util/dic.cs.util.url',
        '../../Com/Util/dic.cs.util.object',
        '../../Com/dic.cs.mess',
        '../../Com/Util/dic.cs.util.mailbox',
        '../../Com/Util/dic.cs.util.dialog',
        '../../Com/Util/dic.cs.util.string'],
        DICCLSInbound);

function DICCLSInbound(dialog, 
   		 nsmess,
   		 runtime,
   		 https,
   		 nsurl,
   		 diConfig,
   		 diUtil,
   		 dimailbox,
   		 diUtilUrl,
   		 diUtilObj,
   		 dicmess,
   		 dicUtilMailbox,
   		 dicDialog,
   		 dicUtilString) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
    	window.setWindowChanged(window, false);
    }


  

    
    var _count = 0,
	_number = 0,
	_startCol = -1,
	_gridConfig = diConfig.PRE_MB_CF.MAIL_GRID.Columns,
	_tableId =  'table' + diConfig.PRE_MB_CF.MAIL_GRID.ClientTableId;

	function _displayErrorMessage(){
		var $ = NS.jQuery;
		var mess = $('#' + diConfig.PRE_MB_CF.MESSAGE.Id).val();
		if (mess && mess.length > 0){
			nsmess.create({
				title:"EDI Error",
				message: dicUtilString.escapeHtml(mess),
				type: nsmess.Type.ERROR
			}).show();
		}
}


/**
 * Build the paging header for subgrid
 * 
 */
function _buildPagingHeader(){

	dimailbox.buildPagingSublist({
			mailboxType: diConfig.MAILBOX.TYPE.Inbound.Type
	});
	
};

/**
 * customize event sorting for columns in subgrid of mailbox
 * remove the event click which built by netsuite, then add a customize events 
 */
function _buildSortingColumns(){
	dimailbox.buidSortingSublist({
		mailboxType: diConfig.MAILBOX.TYPE.Inbound.Type
	});
}


/**
 * Function to be executed after page is initialized.
 *
 * @param {Object} scriptContext
 * @param {Record} scriptContext.currentRecord - Current form record
 * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
 *
 * @since 2015.2
 */
 function pageInitInner(scriptContext) {
	 _displayErrorMessage();
    _buildPagingHeader();
    _buildSortingColumns();

}
 /**
  * Build netsuite request to import edi transaction 
  * @param {Object} 
  */
 function _buildRequest(options){
	var requestPost = {
			method: https.Method.POST,
			url: options.url,
			headers: options.headers,
			body: JSON.stringify(options.data)
	};
	return requestPost;
}
 
 function _updateRowData(options){
	var doc = options.doc;
	var cells = options.cells;
		//set the message
			
    NS.jQuery(cells[_gridConfig.EDIMessage.Order + _startCol]).text(doc.Message);
		 //set the status
    
	if (doc.ErrorCode === 0){
		 NS.jQuery(cells[_gridConfig.StatusDescription.Order + _startCol]).text(
				 dicUtilMailbox.getValueOfStatus({
					 mailboxType: 1,
					 value: 4
					 
				 })
		 );
		 //update link
		
		 var linkUrl = dicUtilMailbox.getValueOfLinkField({
			 sideType: diConfig.SIDE_TYPE.HUB.Type,
			 erpTransType: doc.ErpTemplate,
			 value: doc.ErpId
		 });
		 var url = cells[_gridConfig.ERPId.Order + _startCol].children[0];
		 if (url){
			url.text = linkUrl;
			url.href= linkUrl;
		  }else{
			  NS.jQuery(cells[_gridConfig.ERPId.Order + _startCol]).append('<a target="fldUrlWindow" href="' +linkUrl
											 +'" class="dottedlink">'+linkUrl+'</a>');
		  }
		 
	 }else{
			 NS.jQuery(cells[_gridConfig.ERPId.Order + _startCol]).html('&nbsp;');
			 NS.jQuery(cells[_gridConfig.StatusDescription.Order + _startCol]).text('Error');
			 
	 }
	 NS.jQuery(cells[_gridConfig.ERPTranTypeDescription.Order + _startCol]).text(dicUtilMailbox.getValueOfERPTransaction({
		 value: doc.ErpTemplate
	 })); 
	 //erp document number
	 NS.jQuery(cells[_gridConfig.ERPTranNum.Order + _startCol]).text(doc.ErpDocNumber || '');
	 //edi document number
	 NS.jQuery(cells[_gridConfig.EDITranNum.Order + _startCol]).text(doc.DocumentNo || '');
};

	function _processResponseFailed(options){
		
		var $ = NS.jQuery;
		var cells = $(_tableId + ' tbody tr:nth-child('+ (options.data.RowNo +1) +') td');
		_updateRowData({doc: {
		Id: options.data.Id,
		YearQuarter: options.data.YearQuarter,
		ErrorCode: -1,
		DocumentNo: options.data.EDITranNum,
		ErpTemplate: dicUtilMailbox.inferErpTemplate({
			sideType: diConfig.SIDE_TYPE.HUB.Type,
			value: options.data.EDITransaction
		}),
		Message: options.reason.message
	},
		cells: cells});
	};
	
	function _updateRowDataFailed(options){
		_updateRowData({
			doc:{
				Id: options.data.Id,
			YearQuarter: options.data.YearQuarter,
			ErrorCode: -1,
			DocumentNo: options.data.EDITranNum,
			ErpTemplate: dicUtilMailbox.inferErpTemplate({
				sideType: diConfig.SIDE_TYPE.HUB.Type,
				value: options.data.EDITransaction
			}),
			Message: options.data.message
			},
		cells: options.cells
	});
	}
	
function _processResponseSuccess(options){
	var $ = NS.jQuery;
	
	var cells = $(_tableId + ' tbody tr:nth-child('+ (options.data.RowNo +1) +') td');
	if (options.response.code === 200){
		var importResult = JSON.parse(options.response.body);
		if (importResult.Documents && importResult.Documents.length > 0){
			_updateRowData({doc: importResult.Documents[0],
						cells: cells});
		}else{
			options.data.message = importResult.Message;
			_updateRowDataFailed({
				data:  options.data,
				cells: cells
			});
		}
		
    	
		
	}else{
		options.data.message = options.response.body;
		_updateRowDataFailed({
			data:  options.data,
			cells: cells
		});
	
	}

}
 
 function _processImport(options)  {
		
		var selfOptions = options;
		var row = selfOptions.data.pop();
		
		
		dicDialog.updateValueProgess({
			value: (++_number),
			message: 'Importing ' + (_number) + '/' + _count +'. Inbound Id: ' + row.Id + ', year quarter: ' + row.YearQuarter,
			title: 'DiC EDI - Importing Inbound ' + (_number) + '  / '+ (_count) +' item(s)'
		});
		dicDialog.refreshBackgroundShadow();
		row.Company = selfOptions.compId;
		row.ErpTemplate = dicUtilMailbox.inferErpTemplate({
			sideType: diConfig.SIDE_TYPE.HUB.Type,
			value: row.EDITransaction
		});
		row.SideType = "1";
		var reqInst = _buildRequest({
			url : selfOptions.url,
			headers: selfOptions.header,
			data: row
		});
	
		//using promise to send request
		https
			.request
			.promise(reqInst)
			.then(function(response){
				_processResponseSuccess({
					response: response,
					data: row
				});
			      if (selfOptions.data.length > 0){
			    	  
			    	  _processImport(options);
			      }else{
			    	  //messWaiting.hide();
			    	  dicDialog.closeDialog();
			      }
			  })
			 .catch(function(reason) {
				_processResponseFailed({
					 reason: reason,
					 data:row
				 });
				
				if (selfOptions.data.length > 0)
				{
			    	  _processImport(options);
			    }
				else{
					//messWaiting.hide();
					dicDialog.closeDialog();
				}
		});
	}
	
	function _updateWaitingMessage(title, message){
		var $ = NS.jQuery;
		$('div#div__alert  div.content  div.title').html(title);
		$('div#div__alert  div.content  div.descr').html(message);
		
	}
/**
 * process event search when uer click button search in form 
 */


function searchAction(){
	window.setWindowChanged(window, false);
	dicDialog.showIndeterminate({title: 'DiC EDI Inbound - Loading data ....'});
	dimailbox.searchAction();
}
/**
 * Build url service import edi purchase order
 */
function _buildUrl(){
	return diConfig.URL_EDI_SERVICE + diConfig.MAILBOX.SERVICE_POST;
} 

function _buildHeaderRequest(){
	var headerRequest = {};
	headerRequest["Content-Type"] = diConfig.CONTENT_TYPE;
	if (diConfig.ENV === 'debug'){
		var currentUsr = runtime.getCurrentUser();
		headerRequest["Authorization"] = diConfig.HEADER_AUTHORIZE[currentUsr.email];
	}else{
		headerRequest["Authorization"] = diConfig.HEADER_AUTHORIZE.DEFAULT;
	}

	return headerRequest;
}
function _imports(rows){
	_count = rows.length;
	_number = 0;
	dicDialog.showProgressDialog({
		title: 'DiC EDI - Importing Inbound  0 / '+ (_count) +' item(s)',
		message: 'Importing ...',
		initalValue: 0,
		max: _count + 0.2
		});
	//update 

	_processImport({
		data: rows,
		compId: diUtilUrl.parseQueryString(window.location.search.substring(1, window.location.search.length)).compid,
		header: _buildHeaderRequest(),
		url: _buildUrl()
	});
}

function invokeEDIServices(){
	var rows = dimailbox.getIdSelected();
	if (rows.length === 0){
		
		dialog.alert({
			title:'DiC EDI - Import Error',
			message: dicmess.ERR.SELECTED_MAIL[diConfig.MAILBOX.TYPE.Inbound.Type]
		});
		return;
	};
	_imports(rows);
};

function  sublistChanged(scriptContext){
	window.setWindowChanged(window, false);
};
    return {
    	 sublistChanged:  sublistChanged,
    	fieldChanged: fieldChanged,
        pageInit: pageInitInner,
        invokeEDIServices: invokeEDIServices,
        searchAction: searchAction
    };
    
};
