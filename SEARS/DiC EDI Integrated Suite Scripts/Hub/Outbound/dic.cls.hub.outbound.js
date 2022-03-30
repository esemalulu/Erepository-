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
        '../../Com/Util/dic.cs.util.string',
        '../../Com/dic.cs.mess',
        '../../Com/Util/dic.cs.util.dialog',
        '../../Com/Util/dic.cs.util.request',
        '../../Com/Util/dic.cs.util.mailbox',
        '../../Com/dic.cs.dierror'], 
        DiCCLSHubOutbound);

function DiCCLSHubOutbound(dialog, 
		 nsmess,
		 runtime,
		 https,
		 nsurl,
		 diConfig,
		 diUtil,
		 dimailbox,
		 diUtilUrl,
		 diUtilObj,
		 dicUtilString,
		 dicmess,
		 dicDialog,
		 dicUtilRequest,
		 dicUtilMailbox,
		 diError) {
	
	var _mod = {
			count: 0,
			number: 0,
			tableId: 'table' + diConfig.PRE_MB_CF.MAIL_GRID.ClientTableId,
			gridConfig: diConfig.PRE_MB_CF.MAIL_GRID.Columns,
			startCol: -1
	};
    /**
     *create a ns error message in create custom form  
     */
	_mod._displayErrorMessage = function(){
		var $ = NS.jQuery;
		var mess = $('#' + diConfig.PRE_MB_CF.MESSAGE.Id).val();
		if (mess && mess.length > 0){
			nsmess.create({
				title:"EDI Error",
				message: dicUtilString.escapeHtml(mess),
				type: nsmess.Type.ERROR
			}).show();
		}
	};
	
	/**
	 * Build the paging header for subgrid
	 * 
	 */
	_mod._buildPagingHeader = function(){
		dimailbox.buildPagingSublist({
			mailboxType: diConfig.MAILBOX.TYPE.Outbound.Type
		});
	
	};
	
	/**
	 * customize event sorting for columns in subgrid of mailbox
	 * remove the event click which built by netsuite, then add a customize events 
	 */
	_mod._buildSortingColumns = function(){
		dimailbox.buidSortingSublist({
			mailboxType: diConfig.MAILBOX.TYPE.Outbound.Type
		});
	};
	
	_mod._initailizeGrid = function(){
		 var indexRow = 1;
		 var $ = window.NS.jQuery;
		 var rowNo = window.nlapiGetLineItemCount(diConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id);	
		 for(; indexRow <= rowNo; indexRow++){
			 var cells = $(_mod.tableId + ' tbody tr:nth-child('+ (indexRow+1) +') td');
			 var status = window.nlapiGetLineItemValue(diConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Id,
					 diConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.Status.Id, 
					   indexRow);
			 if ((status & 8) == 8 || (status&16) == 16){
				 $(cells[diConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.Select.Order + _mod.startCol]).children().remove();
			 }
			
			   
		   }
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
    _mod.pageInitInner = function(scriptContext) {
    	
    	_mod._displayErrorMessage();
 	    _mod._buildPagingHeader();
 	    _mod._buildSortingColumns();
 	    _mod._initailizeGrid();
    };
   
    _mod.searchAction = function(){
       	window.setWindowChanged(window, false);
       	dicDialog.showIndeterminate({title: 'DiC EDI Outbound - Loading data ....'});
    	dimailbox.searchAction();
	};
	
	_mod._buidlUrl = function(){
		return diConfig.URL_EDI_SERVICE + diConfig.MAILBOX.SERVICE_SEND_EDI;
	};
	
	_mod._updateRowData = function(options){
		var doc = options.doc;
		var cells = options.cells;
		var mess = doc.Message || '';
		if (doc.ErrorCode === 0) {
			mess= 'Sending';
			NS.jQuery(cells[diConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.Select.Order + _mod.startCol]).children().remove();
		}

		NS.jQuery(cells[_mod.gridConfig.EDIMessage.Order + _mod.startCol]).text(mess);
		
		NS.jQuery(cells[_mod.gridConfig.StatusDescription.Order + _mod.startCol]).text(
				 dicUtilMailbox.getValueOfStatus({
					 mailboxType: diConfig.MAILBOX.TYPE.Outbound.Type,
					 value: doc.Status
					 
				 })
		 );
	};
	
	_mod.updateRowDataFail = function(options){
		var cells = options.cells;
		
		NS.jQuery(cells[_mod.gridConfig.EDIMessage.Order + _mod.startCol]).text(options.message || '');
		
	};
	
	_mod._processResponseSuccess = function(options){
		
		var $ = window.NS.jQuery;
		var cells = $(_mod.tableId + ' tbody tr:nth-child('+ (options.data.RowNo +1) +') td');
			//NS.jQuery(cells[_gridConfig.EDIMessage.Order + _startCol]).text(doc.Message);
		var res = options.response;
		console.log(res);
		if (res.code === 200){
			var exportResult = JSON.parse(res.body);
			
			if (exportResult
				&& exportResult.Documents	
				&& exportResult.Documents.length > 0 
				&& exportResult.ErrorCode === 0){
				_mod._updateRowData({doc: exportResult.Documents[0],cells: cells});
			}else{
				_mod.updateRowDataFail({
					message: exportResult.Message,
					errorCode: exportResult.ErrorCode,
					cells: cells
				});
			}
			
		}else if (res.code === 401){
			_mod.updateRowDataFail({
				message: dicmess.ERR.UNAUTHORIZED.Message,
				errorCode: dicmess.ERR.UNAUTHORIZED.Code,
				cells: cells
			});
		} else if(res.code === 404){
			_mod.updateRowDataFail({
				message: dicmess.ERR.SERVICE_NOT_FOUND.Message,
				errorCode: dicmess.ERR.SERVICE_NOT_FOUND.Code,
				cells: cells
			});
		} else {
			_mod.updateRowDataFail({
				message: dicUtilString.escapeHtml(res.body) ,
				errorCode: dicmess.ERR.UNDERTERMINE.Code,
				cells: cells
			});
		}
		
		
	};
	
	_mod._processRresponseFail = function (options){
		var $ = window.NS.jQuery;
		var cells = $(_mod.tableId + ' tbody tr:nth-child('+ (options.data.RowNo +1) +') td');
		_mod.updateRowDataFail({
			message:  dicUtilString.escapeHtml(options.reason) ,
			errorCode: dicmess.ERR.UNDERTERMINE.Code,
			cells: cells
		});
	};
	
	_mod._processExport = function(options){
		var row = options.data.shift();
		
		dicDialog.updateValueProgess({
			value: (++_mod.number),
			message: 'Exporting ' + (_mod.number) + '/' + _mod.count +'. Outbound Id: ' + row.Id + ', year quarter: ' + row.YearQuarter,
			title: 'DiC EDI - Exporting Outbound ' + (_mod.number) + '  / '+ (_mod.count) +' item(s)'
		});
		
		var httpsRequest = dicUtilRequest.buildRequest({
			url: options.url,
			headers: options.header,
			data:{
				Id: row.Id,
				YearQuarter: row.YearQuarter,
				Company: options.compId,
				ErpId: row.ErpId,
				ErpTemplate:  dicUtilMailbox.inferErpTemplate({
					sideType: diConfig.SIDE_TYPE.HUB.Type,
					value: row.EDITransaction
				}),
				SideType: diConfig.SIDE_TYPE.HUB.Type
			}
		});
		
		https
			.request
			.promise(httpsRequest)
			.then(function(response){
				_mod._processResponseSuccess({
					response: response,
					data: row
				});
				if (options.data.length > 0){
					_mod._processExport(options);
				}
				else{
					 dicDialog.closeDialog();
				}
			})
			.catch(function(reason) {
				_mod._processRresponseFail({
					reason:reason,
					data: row
				});
				if (options.data.length > 0)
				{
					_mod._processExport(options);
			    }
				else{
					//messWaiting.hide();
					dicDialog.closeDialog();
				}
			});
			
	};
	
	_mod._export = function(rows){
		_mod.count = rows.length;
		_mod.number = 0;
		dicDialog.showProgressDialog({
			title: 'DiC EDI - Exporting Outbound  0 / '+ (_mod.count) +' item(s)',
			message: 'Exporting ...',
			initalValue: 0,
			max: _mod.count + 0.2
			});
		_mod._processExport({
			data:rows,
			compId: window.nlapiGetContext().company,
			header: dicUtilRequest.buildHeaderRequest(),
			url: _mod._buidlUrl()
		});
		
		
	};
	
	
	_mod.invokeEDIServices = function(){
		var rows = dimailbox.getIdSelected();
		if (rows.length === 0){
			
			dialog.alert({
				title:'DiC EDI - Export Error',
				message: dicmess.ERR.SELECTED_MAIL[diConfig.MAILBOX.TYPE.Outbound.Type]
			});
			return;
		};
		_mod._export(rows);
	};
	_mod.sublistChanged = function(scriptContext){
		window.setWindowChanged(window, false);
	};
	_mod._fieldChanged = function(scriptContext){
		window.setWindowChanged(window, false);
	}
    return {
    	fieldChanged: _mod._fieldChanged,
    	sublistChanged:  _mod.sublistChanged,
    	searchAction: _mod.searchAction,
        pageInit: _mod.pageInitInner,
        invokeEDIServices: _mod.invokeEDIServices
        
    };
      

    
    
};
