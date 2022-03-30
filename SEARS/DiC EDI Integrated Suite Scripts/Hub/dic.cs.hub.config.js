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
   var _CONST = Object.freeze({
	   SETTING:{
		   DIGeneralId: 'nsfld_dic_general_setting',
		   PRE_FLD: 'custrecord_dic_fld_hub_set_'
	   },
	   
   });
	//define constant object
    return Object.freeze({
    	get SetingForm(){
    		return this.FORMS.SETTING;
    	},
        FORMS:{
        	SETTING:{
        		Id: 'customrecord_dic_hub_setting',
				InternalId: 477,
				Text:'Setting',
				
				CustomGroupFields:{
					DIGeneral :{
						Id: _CONST.SETTING.DIGeneralId,
						Text: 'DiCentral Setting'
					}
				},
				
				CustomFields:{
					DiToken:{    
						Id: _CONST.SETTING.PRE_FLD + 'tok',
						Text: 'Token',
						Type: 'TEXTAREA',
						HelpText:'DiCentral EDI Token',
						ContainerId: _CONST.SETTING.DIGeneralId,
						StoreValue: true
							
					},
					Message: {
						Id:  _CONST.SETTING.PRE_FLD + 'message',
						Type: 'TEXT',
						DisplayType:'HIDDEN',
						Text: 'Message',
						HelpText: 'EDI Message to show detail information '
					},
					ActionType:{
						Id:  _CONST.SETTING.PRE_FLD + 'action_type',
						Text:'Action Type',
						Type: 'TEXT',
						DisplayType:'HIDDEN'
					},
					InternalId:{
						Id:  _CONST.SETTING.PRE_FLD +'id',
						Text:'InternalId',
						Type: 'TEXT',
						DisplayType:'HIDDEN'
						
					}
				},
				
				CustomActions:{
					Save:{
						Id: 'custrecord_dic_btn_hub_set_save',
						Text: 'Save',
						Callback: 'save'
					}
				},
				ClientScript:{
					Id: 6527,
					Name:'dic.cls.hub.setting.js'
				}
        	}
        }
    });
    
});
