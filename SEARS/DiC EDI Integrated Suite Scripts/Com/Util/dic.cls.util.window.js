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
 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */

define([],DiCUtilWindow);


function DiCUtilWindow() {
	var _mod =  {};
	
	_mod.calPointCenter = function(width, height){
		var $ = NS.jQuery;
		var jWindow = $(window);
		var widthView = jWindow.width();
		var heightView = jWindow.height();
		return {
			left: (widthView - width  )/2,
			top: (heightView - height) /2
		};
	};
	
    return {
    	calPointCenter: _mod.calPointCenter,
    	
    };
    
}
