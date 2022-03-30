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


define(['../dic.cs.mess',
        '../Util/dic.cs.util.string',
        '../Util/dic.cs.util.dialog',
        '../Util/dic.cs.util.mailbox',
        '../Util/dic.cs.util.encoder',
        '../dic.cs.config',
        '../Util/dic.cs.util.request',
        
        'N/ui/message',
        'N/https'
        ], DICCLSSend2DICEDI);

function DICCLSSend2DICEDI(
		dicmess,
		dicstring,
		dicDialog,
		dicUtilMailbox,
		dicUtilEncoder,
		diConfig,
		dicUtilRequest,
		
		nsmess,
		https) {
    var _mod = {};
    /**
     * begin region of Abstract Send ERP Transaction 2 DIC EDI 
     */
    _mod.Send2EDIStrategy = function(options){
    	this.options = options;
    	window.DIC = window.DIC || {};
    	window.DIC.Transaction = window.DIC.Transaction || {};
    	window.DIC.Transaction.instNSmessage = window.DIC.Transaction.instNSmessage || null;
    	if (window.DIC.Transaction.instNSmessage){
    		window.DIC.Transaction.instNSmessage.hide();
    	}
    	//ns message to show 
    	
    };
    
    _mod.Send2EDIStrategy.prototype.showMessage = function(options){
    	if (window.DIC.Transaction.instNSmessage){
    		window.DIC.Transaction.instNSmessage.hide();
    	};
    	window.DIC.Transaction.instNSmessage = nsmess.create({
    		title: options.title,
    		message: options.message,
    		type: options.type
    	});
    	window.DIC.Transaction.instNSmessage.show({
    		duration: this.options.config.TimeOut
    	});
    };
    
    _mod.Send2EDIStrategy.prototype._fillData = function(){
    	var mapFieldTransId = 'tranid';
    	//get the recordType of the transaction
    	this.options.recordType = window.nlapiGetRecordType();
    	this.options.erpTransType =  dicUtilMailbox.mapRecordType2ErpTemplate({value: this.options.recordType});
    	this.options.internalId = window.nlapiGetRecordId();
    	this.options.company = window.nlapiGetContext().company;
    	this.options.erpTransName = dicUtilMailbox.getNameERPTransaction({value: this.options.recordType});
    	if (this.options.internalId){
    		var erpTranRecord = window.nlapiLoadRecord(this.options.recordType, this.options.internalId);
    		if (erpTranRecord){
    			
    			this.options.receiverid = erpTranRecord.getFieldValue('entity');
    			
    			if (this.options.config.hasOwnProperty('MapFields')){
    				var mapFields =this.options.config['MapFields'];
    				if (mapFields && mapFields.hasOwnProperty('TransId')){
    					mapFieldTransId = mapFields['TransId'];
    				}
    			};
    			this.options.tranid = erpTranRecord.getFieldValue(mapFieldTransId);
    			this.options.vendorName = erpTranRecord.getFieldValue('entityname');
    			
    		}
    	}
    };

    _mod.Send2EDIStrategy.prototype.validate = function(){
    	if (!this.options.internalId){
    		this.showMessage({
    			title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
    			message: dicstring.stringFormat(dicmess.ERR.SEND_2_EDI_NOT_EXIST_ID.Message
    											, this.options.erpTransName),
    			type: nsmess.Type.ERROR
    			
    		});
    		return false;
    	}
    	return true;
    };
    
    _mod.Send2EDIStrategy.prototype._buildHttpsRequest = function(){
    	var requesOptions = {
    			url: this._buildUrl(),
    			headers: dicUtilRequest.buildHeaderRequest(),
    			data:{
    				Company: this.options.company,
        			SideType: this.options.config.SideType || diConfig.SIDE_TYPE.HUB.Type,
        			ErpTemplate: this.options.erpTransType,
        			ReceiverId: this.options.receiverid,
        			ErpId: this.options.internalId,
        			ErpDocumentNumber: this.options.tranid,
        			DocType: dicUtilMailbox.inferEDIDoctypeFromERPRecordType({value: this.options.recordType}),
        			ReceiverName: this.options.vendorName
    			}
    	};
    	return dicUtilRequest.buildRequest(requesOptions);
    };
    _mod.Send2EDIStrategy.prototype._processResponse = function(options){
    	
    	var response = options.response;
    	
    	if (response.ErrorCode === 0){
    		var data = response.Data;
    		if (data.ErrorCode === 0){
	    		this.showMessage({
	    			title: dicstring.stringFormat(dicmess.MESS.SEND_ERP_TRANSACTION_2_EDIOUTBOUND_SUCCESS_TITLE, 
	    					this.options.erpTransName),
	    			message: dicstring.stringFormat(dicmess.MESS.SEND_ERP_TRANASCTION_2_EDIOUTBOUND_SUCCESS,
	        				this.options.erpTransName,
	        				this.options.tranid || '',
	        				response.Data.Id,
	        				response.Data.YearQuarter),
	        		type: nsmess.Type.CONFIRMATION
	    		});
    		}else{
    			this.showMessage({
        			title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
        			message: dicUtilEncoder.encodeHtml(dicstring.stringFormat("Error Code: {0}. Message: {1}", data.ErrorCode, data.Message)),
        			type: nsmess.Type.ERROR
        			
        		});
    		}
    	}else{
    		this.showMessage({
    			title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
    			message: dicUtilEncoder.encodeHtml(dicstring.stringFormat("Error Code: {0}. Message: {1}", response.ErrorCode, response.Message)),
    			type: nsmess.Type.ERROR
    			
    		});
    	}
    };
    
    _mod.Send2EDIStrategy.prototype._processReason = function(reason){
    	this.showMessage({
    		title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
    		message: dicstring.stringFormat("Error Code: {0}. Message: {1}",
    										 dicmess.ERR.UNDERTERMINE.Code,
    										 reason.message ),
    		type: nsmess.TYPE.ERROR
    		});
    };
    
    _mod.Send2EDIStrategy.prototype.send = function(){
    	try{
    		this._fillData();
    		dicDialog.showIndeterminate({title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SENDING_ERP_TRANSACTION, this.options.erpTransName)});
    		if (!this.validate()) return;
    		var httpsRequest = this._buildHttpsRequest();
    		var self = this;
    		https.request
    			 .promise(httpsRequest)
    			 .then(function(response){
    				 try{
    					// console.log(response);
	    				 var processedResponse = dicUtilRequest.processResponseDontThrowException({response: response});
	    				 self._processResponse({response: processedResponse});
    				 }
    				 catch(ie){
    					 self.showMessage({
    			    			title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
    			    			message: dicUtilEncoder.encodeHtml(ie),
    			    			type: nsmess.Type.ERROR
    			    			
    			    		});
    				 }
    				 finally{
    					 dicDialog.closeDialog();
    				 };
    			 })
    			 .catch(function(reason){
    				 self._processReason(reason);
    			 }); 
    		
    	}catch(e){
    		this.showMessage({
    			title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
    			message: dicUtilEncoder.encodeHtml(e),
    			type: nsmess.Type.ERROR
    			
    		});
    	};
    };
    
    _mod.Send2EDIStrategy.prototype._buildUrl = function(){
    	return diConfig.URL_EDI_SERVICE + this.options.config.SERVICE_POST;
    };
    /**
     * end region of Abstract Send ERP Transaction 2 DIC EDI
     **/
    
    /**
     * begin region of Send ERP Transaction 2 DIC EDI (Synchronize and send asynchronous)
     */
    _mod.Send2EDIAsyStrategy = function(options){
    	_mod.Send2EDIStrategy.call(this, options);
    };
    
    _mod.Send2EDIAsyStrategy.prototype = new _mod.Send2EDIStrategy;
    _mod.Send2EDIAsyStrategy.prototype.constructor = _mod.Send2EDIAsyStrategy;
    _mod.Send2EDIAsyStrategy.prototype._buildUrl = function(){
    	return diConfig.URL_EDI_SERVICE + this.options.config.SERVICE_POST_FULLFLOW;
    };
    _mod.Send2EDIAsyStrategy.prototype._processResponse = function(options){
    	var response = options.response;
    	//response status  === 200
    	if (response.ErrorCode === 0){
    		
    		if(response.Data.ErrorCode === 0){
	    		if (response.Data.Documents.length > 0){
		    	  	var data = response.Data.Documents[0];
		    	  	if (data.ErrorCode === 0){
			    		this.showMessage({
			    			title: dicstring.stringFormat(dicmess.MESS.SEND_ERP_TRANSACTION_2_EDIOUTBOUND_SUCCESS_TITLE, 
			    					this.options.erpTransName),
			    			message: dicstring.stringFormat(dicmess.MESS.SEND_ERP_TRANASCTION_2_EDIOUTBOUND_SUCCESS,
			        				this.options.erpTransName,
			        				this.options.tranid,
			        				data.Id,
			        				data.YearQuarter),
			        		type: nsmess.Type.CONFIRMATION
			    		});
		    	  	}else {
		    	  		this.showMessage({
		        			title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
		        			message: dicUtilEncoder.encodeHtml(dicstring.stringFormat("Error Code: {0}. Message: {1}", data.ErrorCode, data.Message)),
		        			type: nsmess.Type.ERROR
		        			
		        		});
		    	  	};
	    		};
    		
    		}else{
    			this.showMessage({
        			title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
        			message: dicUtilEncoder.encodeHtml(dicstring.stringFormat("Error Code: {0}. Message: {1}", response.Data.ErrorCode, response.Data.Message)),
        			type: nsmess.Type.ERROR
        			
        		});
    		};
    	}else{
    		this.showMessage({
    			title: dicstring.stringFormat(dicmess.MESS.DIC_EDI_SEND_ERP_TRANSACTION_2_EDI_OUTBOUND, this.options.erpTransName),
    			message: dicUtilEncoder.encodeHtml(dicstring.stringFormat("Error Code: {0}. Message: {1}", response.ErrorCode, response.Message)),
    			type: nsmess.Type.ERROR
    			
    		});
    	}
    }
    /**
     * end region of Send ERP Transaction 2 DIC EDI (Syn and send asynchronous)
     **/
    _mod.send2DICEDI = function(options){
    	var inst;
    	switch(options.mode){
    		case 'fullflow':
    			inst = new _mod.Send2EDIAsyStrategy(options);
    			
    			break;
    		default:
    			inst = new _mod.Send2EDIStrategy(options);
    			break;
    	}
    	inst.send();
    };
    
    return {
    	send2DICEDI : _mod.send2DICEDI
    	
    };
    
};
