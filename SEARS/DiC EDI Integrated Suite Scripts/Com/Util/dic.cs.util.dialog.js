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
define(['./dic.cs.util.string',
        './dic.cls.util.window'
        ],DiCDialog);

function DiCDialog(dicUtilString,
		dicUtilWindow) {
    var _mod =  {};
    var _config =  Object.freeze({
    	startZIndex: 9000,
    	width: 440
    });
    //var _$ = window.NS.jQuery;
    
    
    _mod.closeDialog= function() {
    	var _$ = window.NS.jQuery;
    	var backgroundElement = _$('div#dic-edi-waiting-dialog-backgroud');
    	if (backgroundElement.length > 0){
    		backgroundElement.remove();
    	}
    	var ediDialog = _$('div#dic-edi-message-box-waiting-dialog');
    	if (ediDialog.length > 0){
    		ediDialog.remove();
    	}
    };
    
    _mod._createBackground = function(){
    	var _$ = window.NS.jQuery;
    	var jBackgroundShadow = _$('div#dic-edi-waiting-dialog-backgroud').length;
    	if (jBackgroundShadow.length > 0){
    		jBackgroundShadow.remove();
    	}
    	
    	if (_$('div#dic-edi-waiting-dialog-backgroud').length === 0){
    		_$('<div id="dic-edi-waiting-dialog-backgroud" class="ext-el-mask"  style="visibility: visible;position: absolute;width:100%; height: 1000px;display: block; z-index: 9000;"></div>').insertAfter('div#pageContainer');
    		   		
    		    		
    	}
    	
    };
    
    _mod._createDiCDialog = function(options){
    	var _$ = window.NS.jQuery;
	   	var divProgressBar = null;
	   	var divMessage = null;
	   	if (options.hasOwnProperty('isProgress') && options.isProgress === true) { 
	   		divProgressBar = '<div id="dic-edi-progressbar" style="margin: 8px"></div>'; 
	   	}					
	  
	   	
	   	var isModeIndermine = false;
	   	if (options.hasOwnProperty('mode') && options.mode === 'Indeterminate'){
	   		isModeIndermine = true;
	   	}
	   	if (!isModeIndermine){
	   		divMessage = '	<div class="uir-message-popup">'+
	   				  	 '		<span class="uir-message-text" id="dic-edi-message-box-waiting-dialog-mess"> '+ (options.message|| ' Please wait some seconds ') +'</span>'+
					  	 '	</div>';
	   	}
	   	var ediWaiting =  _$('div#dic-edi-message-box-waiting-dialog');
	   	if (ediWaiting.length > 0) ediWaiting.remove();
	  	
	  
		_$('<div id="dic-edi-message-box-waiting-dialog" ' + 
				 '    class="x-window"' + 
					 'style="position: absolute;' +
					 '		z-index: 9003;' + 
					 '		visibility: visible;' + 
					 '		width: '+ (_config.width) + 'px;'+
					 '		display: block;' + 
					 '		background-color: rgb(255, 255, 255);">'+
					'<div class="x-window-header x-unselectable x-window-draggable uir-message-header" id="ext-gen4">' +
					'	<span class="x-window-header-text"  id="dic-edi-message-box-waiting-dialog-title">' +(options.title || 'DiCental NetSuite ' )+'</span>'+
					'</div>' +
					'<div class="x-window-bwrap" id="ext-gen5">' +
					
				/*	'	<div class="uir-message-popup">'+
					'		<span class="uir-message-text" id="dic-edi-message-box-waiting-dialog-mess"> '+ (options.message|| ' Please wait some seconds ') +'</span>'+
				
					'	</div>'+*/
						(divMessage || '') +
						(divProgressBar || '')+	
					
					'</div>'+
				'</div>').insertAfter('div#pageContainer'); 
	
		var height =  (_$('div#dic-edi-message-box-waiting-dialog').height());
		var position = dicUtilWindow.calPointCenter(_config.width, height);
	
		ediWaiting =_$('div#dic-edi-message-box-waiting-dialog');
		ediWaiting.css({top: position.top, left: position.left});
		if (divProgressBar!= ''){
			var jProgres = _$( "div#dic-edi-progressbar" );
			if (!isModeIndermine){
				jProgres.progressbar({
	    		      value: options.initialValue || 0,
	    		      max: options.max || 100
	    		      
	    		 });
			}else{
				jProgres.progressbar({
	    		      value: false
	    		 });
			}
			jProgres.find( ".ui-progressbar-value" ).css({
		          "background": '#607799'
		        });
		}

    	
    };
    
    _mod.showDialog= function(title, message){
    	 _mod._createBackground();
    	 _mod._createDiCDialog({
    		 					title: title,
    		 					message: message });
    
    	// window.setTimeout(function(){_mod.closeDialog()}, 3000);
    };
    
    _mod.showProgressDialog = function(options){
    	 _mod._createBackground();
    	 _mod._createDiCDialog({isProgress: true,
    		 					title: options.title,
    		 					message: options.message,
    		 					initialValue: options.initialValue || 0,
    		 					max: options.max ||100
    		 					});
    };
    
    _mod.updateValueProgress = function(options){
    	var _$ = window.NS.jQuery;
    	var jProgressBar = _$( "div#dic-edi-progressbar" );
    	if(jProgressBar.length > 0){
    		jProgressBar.progressbar( "option", "value", options.value );
    		
    	}
    	if (options.hasOwnProperty('title')){
    		_$('span#dic-edi-message-box-waiting-dialog-title').text(options.title);
    	}
    	_$('span#dic-edi-message-box-waiting-dialog-mess').text(options.message);
    };
    
    _mod.updateMaxValue = function(options){
    	var _$ = window.NS.jQuery;
    	if (options.hasOwnProperty('value')){
	    	var jProgressBar = _$( "div#dic-edi-progressbar" );
	    	if(jProgressBar.length > 0){
	    		jProgressBar.progressbar( "option", "max", options.value );
	    		
	    	}
    	}
    };
    _mod.refreshBackgroundShadow = function(){
    	var _$ = window.NS.jQuery;
    	_$('div#dic-edi-waiting-dialog-backgroud').css({height: '100%'});    	
    };
    
    _mod.showIndeterminate = function(options){
    	 _mod._createBackground();
    	 _mod._createDiCDialog({
    		 title: options.title,
    		 isProgress: true,
    		 mode: 'Indeterminate'
    	 });
    };
    return {
        showDialog: _mod.showDialog,
        showProgressDialog: _mod.showProgressDialog,
        showIndeterminate: _mod.showIndeterminate,
        updateValueProgess: _mod.updateValueProgress,
        updateMaxValue: _mod.updateMaxValue, 
        closeDialog: _mod.closeDialog,
        refreshBackgroundShadow: _mod.refreshBackgroundShadow
    };
    
};
