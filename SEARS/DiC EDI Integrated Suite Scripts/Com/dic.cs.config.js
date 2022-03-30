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
define(function(){
	
	var _CONST = Object.freeze({
		PRE_CUSTOM_MB: 'cst_dic_mb_',
		PRE_CUSTOM_FILTER_GROUP: 'fg_',
		//calculated property
		get PRE_CUSTOM_MB_FILTER_GROUP(){
			return this.PRE_CUSTOM_MB + this.PRE_CUSTOM_FILTER_GROUP;
		},
		get PRE_CUSTOM_MB_GRID(){
			return this.PRE_CUSTOM_MB + 'grid_';
		},
		get PRE_CUSTOM_PAGINATION(){
			return this.PRE_CUSTOM_MB +'paging_';
		}
		
	});
	
	return Object.freeze({
		SIDE_TYPE:{
			
			HUB: {
				Type:1,
				Text: 'Seller Side'
			},
			VENDOR: {
				Type: 2,
				Text: 'Buyer Side'
			}
		},
//		usa service development
URL_EDI_SERVICE:'https://diwebservicetest.dicentral.com/DiWebService/DiRESTServices.svc/rest',
      // usa service production
      //URL_EDI_SERVICE:'https://diwebservice.dicentral.com//DiRESTServices.svc/rest',

		//vn service		
//URL_EDI_SERVICE:'https://tfsreport.dicentral.com.vn/ERPCloud/DiRESTServices.svc/rest',
		HEADER_AUTHORIZE:{
			//DEFAULT:'Basic MjM1MDQ6ZGljZW50cmFs',
			DEFAULT:'Basic D3cheHAyiaIA0HHv1GDfG8NFlfY3rGlZMWpiXKFrpxgdBiRgMtD/OIG81vfkXyQdIB3R/IFwAGoXGGBHp/gxgnG0ld44jfrzZGtnm3SctEN7Hh5YXYW81HA10ilLypz2LnCRaEebLHa0T27el0JxHeu1BzE8xG92Rx1VcCFTyO8='
	
		},
		
		CONTENT_TYPE: 'application/json',
		get PRE_MB_CF(){
			return this.MAILBOX.CUSTOM_FIELDS; 
		},
//		Begin defining  form
		
	//	ENV:"debug",
/************************************************************************************************
*Begin Mailbox Configuration
*/	
		MAILBOX:{
			SERVICE_GET:'/doc/get/json',
			SERVICE_POST:'/mailbox/export/json',
			SERVICE_SEND_EDI: '/mailbox/import/json ',
			START_YEAR:{
				DEFAULT: new Date(2016,01,01)//default year to create year quarter
			},
			//Define type of mailbox
			TYPE:{
					Inbound: {
						Type: 1,
						Text: 'Inbound'
					},
					Outbound: {
						Type: 2,
						Text: 'Outbound'
					}
				},
			//define custom fields
			CUSTOM_FIELDS:{
				SEARCH:{
					Id: _CONST.PRE_CUSTOM_MB + 'btn_search',
					Text:'Search'
				},
				ACTION_EDI_SERVICE:{
					Id: _CONST.PRE_CUSTOM_MB + 'btn_edi_services',
					1:{
						Text: 'Import'
					},
					2:{
						Text: 'Export'
					}
				},
				MESSAGE: {
					Id: _CONST.PRE_CUSTOM_MB + 'inl_message',
					Type: 'TEXT',
					DisplayType:'HIDDEN',
					HelpText: 'EDI Message to show detail information '
				},
				FILTER_GROUP:{ 
					Id: _CONST.PRE_CUSTOM_MB_FILTER_GROUP + 'filter',
					Text: 'Filter'
					
				}, //custom_maibox_fieldgroup_filter,
				FILTER_GROUP_YEARQUARTER:{ 
					Id: _CONST.PRE_CUSTOM_MB_FILTER_GROUP + 'sel_yearquarter',
					Text: 'Year Quarter',
					HelpText: 'EDI Year quarter'
				},
				FILTER_GROUP_STATUS: {
					Id: _CONST.PRE_CUSTOM_MB_FILTER_GROUP + 'sel_status',
					Text: 'Status'
				},
				PAGINATION:{
					
					FIELD_TOTAL_RECORDS:{
						Id: _CONST.PRE_CUSTOM_PAGINATION + 'text_total_records',
						Text: 'Total Records',
						Type: 'INTEGER',
						DisplayType: 'HIDDEN'
						
						
					},
					FIELD_TOTAL_PAGES:{
						Id:_CONST.PRE_CUSTOM_PAGINATION + 'text_total_pages',
						Text: 'Total Pages',
						Type: 'INTEGER',
						DisplayType:'HIDDEN'
					},
					FIELD_PAGE_SIZE: {
						Id:_CONST.PRE_CUSTOM_PAGINATION + 'text_page_size',
						Text: 'Page sizes',
						Type: 'INTEGER',
						DisplayType:'HIDDEN',
						DefaultValue: 10
					}
				},
				MAIL_GRID:{
					Id: _CONST.PRE_CUSTOM_MB + 'mailgrid',
					ClientLayerId:'#' + _CONST.PRE_CUSTOM_MB + 'mailgrid_layer', 
					ClientTableId:'#' + _CONST.PRE_CUSTOM_MB + 'mailgrid_splits',
					ClientTableHeaderId: '#' + _CONST.PRE_CUSTOM_MB + 'mailgridheader',  
					Text: {
						1: 'EDI Inbox',
						2: 'EDI Outbox'
					},
					Columns:{
						Number:{
							Id:  _CONST.PRE_CUSTOM_MB_GRID + 'col_order',
							Text: ' ',
							Type: 'INTEGER',
							Order: 1
						},
						//add checkbox column 
						Select:{
							 Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_sel',
							 Text: 'Select',
							 Type: 'CHECKBOX',
							 Order: 2
						},
						Id:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_id',
							Text: 'Id',
							Type: 'TEXT',
							Order: 3,
							Field:{
								 1:"Id",
								 2:"Id"
							 }
							
						},
						YearQuarter:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_yq',
							Text:'Year Quarter',
							Type: 'TEXT',
							Order: 4,
							Field:{
								1: "YearQuarter",
								2:"YearQuarter"
								
							}
						},
						EDITranTypeDescription:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_edi_tran_type',
							Text: 'EDI Transaction Type',
							Type: 'TEXT',
							Order: 5,
							Field:{
								1: "EDITranType",
								2: "EDITranType"
							}
						},
						EDITranNum:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_edi_tran_num',
							Text: 'EDI Transaction Number',
							Type: 'TEXT',
							Order: 6,
							Field:{
								1: "EDITranNum",
								2: "EDITranNum"
							}
						},
						ERPTranNum:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_erp_tran_num',
							Text:{
								1:'NetSuite Transacion Number',
								2:'NetSuite Transacion Number'
							},
							Type: 'TEXT',
							Order: 7,
							Field:{
								1: "ERPTranNum",
								2: "ERPTranNum"
							}
						},
						ERPTranTypeDescription:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_erp_tran_type',
							Text:{
								1:'NetSuite Transaction',
								2:'NetSuite Transaction'
							},
							Type: 'TEXT',
							Order: 8,
							Field:{
								1: "ERPTranType",
								2: "ERPTranType"
							}
						},
						ERPId:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_erpid',
							Text: 'Link',
							Type: 'URL',
							Order: 9,
							Field:{
								1: 'ERPId',
								2: 'ERPId'
							}
						},
						StatusDescription:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_edi_status',
							Text: 'Status',
							Type: 'TEXT',
							Order: 10,
							Field: {
								1: "Status",
								2: "Status"
							}
						},
						EDIMessage:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_edi_message',
							Text: 'Message',
							Type: 'TEXT',
							Order: 11,
							Field: {
								1: "EDIMessage",
								2: "EDIMessage"
							}
						},
						
						Status:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_edi_status_val',
							Text: 'Status',
							Type: 'TEXT',
							Order: 12,
							Field: {
								1: "Status",
								2: "Status"
							},
							DisplayType:'HIDDEN'
						},
						ERPTranType:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_erp_tran_type_val',
							Text:{
								1:'NetSuite Transaction',
								2:'NetSuite Transaction'
							},
							Type: 'TEXT',
							Order: 13,
							Field:{
								1: "ERPTranType",
								2: "ERPTranType"
							},
							DisplayType:'HIDDEN'
						},
						EDITranType:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_edi_tran_type_val',
							Text: 'EDI Transaction Type',
							Type: 'TEXT',
							Order: 14,
							Field:{
								1: "EDITranType",
								2: "EDITranType"
							},
							DisplayType:'HIDDEN'
						},
						Status:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_edi_status_val',
							Text: 'Status',
							Type: 'TEXT',
							Order: 15,
							DisplayType:'HIDDEN',
							Field: {
								1: "Status",
								2: "Status"
							}
						},
						ErpIdVal:{
							Id: _CONST.PRE_CUSTOM_MB_GRID + 'col_erpid_val',
							Text: 'NetSuite Erp Id',
							Type: 'TEXT',
							Order: 16,
							DisplayType:'HIDDEN',
							Field:{
								1: 'ERPId',
								2: 'ERPId'
							}
						}
						
					}
				}
			},
			//end custom field
			CLIENT_SCRIPT:{
				1:{//Hub
					1:{//Inbound
						Id: 40796,
						Name:'dic.cls.hub.inbound.js',
						
						
						
					},
					2:{//Outbound
						Id:40809,
						Name:'dic.cls.hub.outbound.js',
						
					}
				},
				2:{//Vendor
					1:{//Inbound
						Id:6426,
						Name:'dic.cls.vendor.inbound.js'
				
					},
					2:{//Outbound
						Id: 6428,
						Name: 'dic.cls.vendor.outbound.js',
						
					}
				
				}
			},
			//define all status of mailbox that specified by type
			STATUS:{
				1://define all status of inbound
					   {
						  "-1": 'All',
						  "0": 'None',
						//  "1": 'Error',
					  	  "2": 'Processing',
					      "4": 'Imported'
					   }
				  ,//stauts of inbound
				2://define all status of outbound
				   	   {
							"-1": 'All',							
				   		   	"0": 'None',
				   		   	"1": 'Error',
				   		   	   		   	
				   		   	"8": 'Processing',
				    		"16": 'Exported'
				   	   }
				} 
			}
		
/****************************************************************************************************
 * End Mailbox Configuration
 */
	});
});

