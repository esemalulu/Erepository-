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
 * Module load information of Mailbox (inbox, outbox)
 * 
 * @NModuleScope Public
 */

define(['../dic.cs.config', 
        '../Util/dic.cs.util',
        '../dic.cs.mess',
        '../Util/dic.cs.util.string',
        '../Util/dic.cs.util.date',
        '../Util/dic.cs.util.object',
        '../Util/dic.cs.util.url',
        '../dic.cs.dierror',
        '../Util/dic.cs.util.mailbox',
        'N/runtime', 
        'N/ui/serverWidget',
        'N/https',
        'N/error',
        'N/url'], 
        function(dicConfig,
        		diutil,
        		dimess,
        		diUtilString,
        		diUtilData,
        		diUtilObj,
        		diUtilUrl,
        		diError,
        		diUtilMailbox,
        		runtime, 
        		serverWidget,
        		https,
        		error, 
        		nsurl) {
	
   	var dicMailbox = null,
   		txtmess = null;
	
		
	/**
	 * Build the title of Mailbox form
	 * 
	 */
	function _buildTitle(mailboxType){
		return  'EDI Mailbox - ' + 
				(mailboxType === dicMailbox.TYPE.Inbound.Type ? dicMailbox.TYPE.Inbound.Text
																	 : dicMailbox.TYPE.Outbound.Text);
	};
	
	/**
	 * Build a summary form html
	 */
	function _buildForm(options){
		var form = serverWidget.createForm({
						title: _buildTitle(options.mailboxType) 
				});	
		if (dicConfig.ENV === 'debug'){
			var currentUsr = runtime.getCurrentUser();
			form.clientScriptFileId = 	dicMailbox.CLIENT_SCRIPT[options.sideType][options.mailboxType][currentUsr.email]['Id'];
		}else{ 
			form.clientScriptFileId = 	dicMailbox.CLIENT_SCRIPT[options.sideType][options.mailboxType]['Id'];
			
		}
		return form;
	};
	/**
	 * Build Select box status for mailbox
	 * params {ServerWidget.Form}   
	 */
	function _buidlStatusSelectField(form, filterGroup, options){
		//create select control 
		var selStatusField = form.addField({
			id: dicMailbox.CUSTOM_FIELDS.FILTER_GROUP_STATUS.Id,
			type: serverWidget.FieldType.SELECT,
			label:dicMailbox.CUSTOM_FIELDS.FILTER_GROUP_STATUS.Text,
			container: dicMailbox.CUSTOM_FIELDS.FILTER_GROUP.Id //display filter group in mailbox
		}); 
		
		try{
			//default status of mailbox is all 
			options.query.status = options.query.status ||  Object.keys(dicMailbox.STATUS[options.mailboxType])[1];
			//get the all stauts by mailboxType, build select field in filter group
			if(dicMailbox.STATUS[options.mailboxType]){
				for(var valueStatus in dicMailbox.STATUS[options.mailboxType]){
					
					selStatusField.addSelectOption({
						value: valueStatus,
						text: dicMailbox.STATUS[options.mailboxType][valueStatus],
						isSelected: (options.query.status === valueStatus)
					});
					
				}
			}
			
		}catch(e){
			var mess = diutil.processException(e, {title: "Build maibox Html"});
    		if (txtmess && (mess && mess.length > 0)){
    			txtmess.defaultValue = mess;
    		}
		}
		return selStatusField;
	}
	
	/**
	 * Build textbox year quarter
	 */
	
	
	function _buildFieldYearQuarter(form, filterGroup, options){
		var selYearQuarterField = form.addField({
			id: dicMailbox.CUSTOM_FIELDS.FILTER_GROUP_YEARQUARTER.Id,
			type: serverWidget.FieldType.SELECT,
			label:dicMailbox.CUSTOM_FIELDS.FILTER_GROUP_YEARQUARTER.Text,
			container: dicMailbox.CUSTOM_FIELDS.FILTER_GROUP.Id //display filter group in mailbox
		}); 
		try{
			var yearQuarters = diUtilData.buildRangeYearQuarter(dicMailbox.START_YEAR.DEFAULT, new Date());
			options.query.yq = options.query.yq || yearQuarters[0].id;
			//var selectedYearQuarter = options.query.yq || yearQuarters[0].id;
			for (var index in yearQuarters){
				selYearQuarterField.addSelectOption({
					value: yearQuarters[index].id,
					text:  yearQuarters[index].text,
					isSelected: (options.query.yq === yearQuarters[index].id)//choose the selected option 
				});
			}
		}catch(e){
			var mess = diutil.processException(e, {title: "Build maibox Html"});
    		if (txtmess && (mess && mess.length > 0)){
    			txtmess.defaultValue = mess;
    		}
		}
		return selYearQuarterField;
	};
	/**
	 *Build Button action for form 
	 */
	function _buildButtonAction(form, filterGroup, options){
		form.addButton({
			id: dicMailbox.CUSTOM_FIELDS.SEARCH.Id,
			label: dicMailbox.CUSTOM_FIELDS.SEARCH.Text,
			functionName:'searchAction'
		});
		
		form.addButton({
			id: dicMailbox.CUSTOM_FIELDS.ACTION_EDI_SERVICE.Id,
			label: dicMailbox.CUSTOM_FIELDS.ACTION_EDI_SERVICE[options.mailboxType]['Text'],
			functionName: 'invokeEDIServices'
		});
	}
	
	 
	/**
	 * Build Fileter Field group. There  are some field exist in the group, 
	 * such as, year quarter and status
	 */
	function _buildMailboxHeaderFilter(form, options){
		var filterGroup = form.addFieldGroup({
				id: dicMailbox.CUSTOM_FIELDS.FILTER_GROUP.Id,
				label:dicMailbox.CUSTOM_FIELDS.FILTER_GROUP.Text,
				
			});
		
		_buildButtonAction(form, filterGroup, options);
		//build yearquarter filed
		_buildFieldYearQuarter(form, filterGroup, options);
		_buidlStatusSelectField(form, filterGroup, options);
		
		return filterGroup;
	}
	
	/**
	 *Create an instance sublist including title 
	 */
	function _createMailboxSublist(form, options){
		var grid = form.addSublist({
			id: dicMailbox.CUSTOM_FIELDS.MAIL_GRID.Id,
			label: dicMailbox.CUSTOM_FIELDS.MAIL_GRID.Text[options.mailboxType],
			type: serverWidget.SublistType.LIST
		});
		return grid;
	}
	/**
	 * build mailbox grid columns 
	 */
	function _buildColumnsForMailboxGrid(options, mailboxGrid){
		//
		var columns = diUtilObj.toSortArray(dicMailbox.CUSTOM_FIELDS.MAIL_GRID.Columns, function(obj1, obj2){
			return obj1[obj1.key].Order - obj2[obj2.key].Order; 
		});
		for(var instCol in columns){
			var value = columns[instCol];
			value = value[value.key];
			var field = mailboxGrid.addField({
				id: value.Id,
				type: value.Type,
				label: value.Text instanceof Object ? value.Text[options.mailboxType] : value.Text
				
			});
			if ('DisplayType' in value){
				field.updateDisplayType({ displayType: value.DisplayType });
			}
		}
	
	}
	/**
	 *Bind the information of pagination
	 *@param {Form}
	 *   
	 */
    function _buildPagination(form, options) {
        for (var instField in dicMailbox.CUSTOM_FIELDS.PAGINATION) {
            var value = dicMailbox.CUSTOM_FIELDS.PAGINATION[instField];
            var txt = form.addField({
                id: value.Id,
                type: value.Type,
                label: value.Text
            });
            txt.updateDisplayType({ displayType: value.DisplayType });
            if (value.hasOwnProperty("DefaultValue")){
            	txt.defaultValue = value.DefaultValue;
            }
            if (value.hasOwnProperty("MaxLength")){
            	txt.maxLength = value.MaxLength;
            }
          
        }
    }
	/**
	 * Build Grid contain inbox/outbox
	 */
	function _buildMailboxGrid(form, options){
		var grid =  _createMailboxSublist(form, options);
		_buildColumnsForMailboxGrid(options, grid);
		grid.addMarkAllButtons();
		//grid.addRefreshButton();
	    _buildPagination(form, options);

		return grid;
		
	} 
	
	/**
	 * Build header for mailbox including filter 
	 */
	function _buildMailboxHeader(form, options){
		_buildMailboxHeaderFilter(form, options);
		
	}
	/**
	 * Build hidden to store error message using in client script and show the content using 
	 * module message in NS
	 */
	function _buildMessage(form, options){
		var messInfor = dicMailbox.CUSTOM_FIELDS.MESSAGE;
		var txt = form.addField({
            id: messInfor.Id,
            type: messInfor.Type,
            label: "Message"
        });
		txt.maxLength = 10000;
		txt.updateDisplayType({ displayType: messInfor.DisplayType });
		return txt;
	}
	function _buildUrlGet(options){
		var query =options.query;
		var url = dicConfig.URL_EDI_SERVICE + dicConfig.MAILBOX.SERVICE_GET;
		var ps = dicConfig.MAILBOX.CUSTOM_FIELDS.PAGINATION.FIELD_PAGE_SIZE.DefaultValue || 50;
		var cp = parseInt(query.cp, 10);
		var queryString = ["$orderby=" + query.ob,
			                  "yq=" + query.yq,
			                  "status=" + query.status,
			                  "compId=" + query.compid,
			                  "dir="+options.mailboxType,
			                  "$top=" + ps,
			                  "$skip=" + ((cp - 1) * ps),
			                  "st=" + options.sideType	                  
			                  ].join("&") ;
	    return encodeURI(url+ "?" + queryString);
	}
	
	/**
	 * Create a array map between property name and id
	 *{@Object}
	 *
	 */
	function _createMapPropertyInObject2Id(options){
		var result = [];
		//get the column information in config, to get Field / Id.
		
		var cols = dicConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns;
		var listMap = null;
		
		for(var property in cols){
			if (!cols.hasOwnProperty(property)) continue;
			var obj = cols[property];
			if ("Field" in obj){
				listMap = result[obj.Field[options.mailboxType]];
				if (!listMap){
					listMap = [];
					result[obj.Field[options.mailboxType]]= listMap;
				}
				listMap.push({
					Id:obj.Id,
					Type: obj.Type
				});
				
			}
		}
					
		return result;
	}
	
	function _bindValueForCell(options){
		var mappedFields = options.mappedFields;
		var doc = options.doc;
		var property = options.property;
		var grid = options.grid; 
		var number = options.number;
		if (!mappedFields) return;
		
		mappedFields.forEach(function(currentMap, index, arr){
			var value = doc[property];
			switch(currentMap.Id){
				case dicConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.ERPId.Id:
					value = diUtilMailbox.getValueOfLinkField({
						sideType:  options.sideType,
						mailboxType: options.mailboxType,
						value: value,
						erpTransType: doc['ERPTranType']
					});
				
				break;
				case dicConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.ERPTranTypeDescription.Id:
					value = diUtilMailbox.getValueOfERPTransaction({
						sideType:  options.sideType,
						mailboxType: options.mailboxType,
						value: value,
						erpTransType: doc['ERPTranType']
					});
				break;
				case dicConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.EDITranTypeDescription.Id:
					value = diUtilMailbox.getValueOfEDITransaction({
						sideType:  options.sideType,
						mailboxType: options.mailboxType,
						value: value,
						erpTransType: doc['ERPTranType']
					});
					break;
				case dicConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.StatusDescription.Id:
					value = diUtilMailbox.getValueOfStatus({
						sideType:  options.sideType,
						mailboxType: options.mailboxType,
						value: value,
						erpTransType: doc['ERPTranType']
					});
					break;
				
			}
			
			if (value){
				grid.setSublistValue({
					id: currentMap.Id,
					line: number,
					value: value 
				});
			}
			
		});
	}
	
	function _addRow(grid, doc, number, mappedCols, options){
		for(var property in mappedCols){
			if (doc[property] == null || doc[property] === undefined) continue;
			_bindValueForCell({
				mappedFields : mappedCols[property],
				grid: grid,
				doc: doc,
				number: number,
				property: property,
				sideType: options.sideType,
				mailboxType: options.mailboxType
			});
					
		}
	}
	
	function _bindData2Grid(mails, grid, options){
		var ps = dicConfig.MAILBOX.CUSTOM_FIELDS.PAGINATION.FIELD_PAGE_SIZE.DefaultValue || 50;
		var cp = parseInt(options.query.cp, 10);
		var mappedCols = _createMapPropertyInObject2Id(options);
		var number = 0;
		for(var index = 0, max = mails.length; index < max; index++){
			_addRow(grid, mails[index], index, mappedCols, options);
			//set the order number
			number = (cp - 1) * ps + index + 1; 
			grid.setSublistValue({
				id: dicConfig.MAILBOX.CUSTOM_FIELDS.MAIL_GRID.Columns.Number.Id,
				line: index,
				value: number.toString()
			});
		}
		
	}
	
	function _getData(options){
	 	
		var headerRequest = {
				"Content-Type": dicConfig.CONTENT_TYPE,
				"Authorization": dicConfig.HEADER_AUTHORIZE.DEFAULT
			};
		
		if (dicConfig.ENV === 'debug'){
			var currentUsr = runtime.getCurrentUser();
			headerRequest["Authorization"] = dicConfig.HEADER_AUTHORIZE[currentUsr.email];
		}
		
		var res = https.request({
			method:https.Method.GET,
			url: _buildUrlGet(options),
			headers: headerRequest
			
		});
		if (200 === res.code){
			var result = JSON.parse(res.body);
			if (result.ErrorCode === 0){
			
				return result;
				//
			}
			else{
				var err = new diError.DiError(result.ErrorCode, result.Message);
				throw err;
			}
		}
		else if (401 === res.code){
			var err = new diError.DiError(dimess.ERR.UNAUTHORIZED.Code, dimess.ERR.UNAUTHORIZED.Message);
			throw err;
		} else if (404 === res.code){
			var err = new diError.DiError(dimess.ERR.SERVICE_NOT_FOUND.Code, dimess.ERR.SERVICE_NOT_FOUND.Message);
			throw err;
		} 
		else{
			var err = new diError.DiError(dimess.ERR.UNDERTERMINE.Code, res.body);
			throw err;
		}
		
	}
	/**
	 * Create a form html for mailbox
	 */
    function _buildMailboxHtml(options){
    	
    	var form = _buildForm(options);
    	
    	txtmess= _buildMessage(form, options);
    	try{
    		
	    	_buildMailboxHeader(form, options);
	    	var grid = _buildMailboxGrid(form, options);
	    	var response = _getData(options);
	    	var docs = response.Docs;
	   	 	var totalRecordField = form.getField({id: dicConfig.MAILBOX.CUSTOM_FIELDS.PAGINATION.FIELD_TOTAL_RECORDS.Id});
	   	 	
	   	 	if (totalRecordField){
	   	 		totalRecordField.defaultValue = response.TotalRecords.toString();
	   	 	}
	   	 	
	    	if (docs && docs.length > 0){
	    		
	    		_bindData2Grid(docs, grid, options);
	    	}
    	}
    	catch(e){
    		var mess = diutil.processException(e, {title: "Build maibox Html"});
    		if (txtmess && (mess && mess.length > 0)){
    			txtmess.defaultValue = mess;
    		}
    		
    	}
    	
    	return form;
    };
    
    /**
     * Fill default value for options
     */
    function _fillDefaultValue(options){
    	var query = options.query;
    	query.cp = query.cp || "1";
    	query.ob = query.ob || "Id DESC";
    }
    /**
     * Build html form for mailbox
     */
    function buildMailboxForm(options){
    	_fillDefaultValue(options);
    	dicMailbox = dicConfig.MAILBOX;
    	return _buildMailboxHtml(options);
    }
	/**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
   

    return {
    	buildMailboxForm: buildMailboxForm
    };
    
});
