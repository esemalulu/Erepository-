/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Dileep
 *
 * @Solution
 * @Description
 */
define([
        "N/search",
        "N/record",
        "N/log",
        'N/task',
        'N/config',
		'N/https',
		'N/format',
		'/SuiteScripts/moment.js',
		'N/runtime'
    ],

    function (search, record, log, task, config,https, format, moment,runtime) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {}

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {}

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
        var revRecord = scriptContext.newRecord;
        var revId = scriptContext.newRecord.id;
        var oldRevRecord = scriptContext.oldRecord;
		var recType = scriptContext.newRecord.type;
        //var oldrevId = scriptContext.newRecord.id;
        if (recType == 'customrecordrvsunit' && (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) ) {
            
            /*var mandateStatus = revRecord.getValue("custentity_amp_mandatestatus");
            var externalId = revRecord.getValue("externalid");
			var oldmandateStatus='';
			if(oldRevRecord)
			{
            oldmandateStatus = oldRevRecord.getValue("custentity_amp_mandatestatus");
			log.debug("Old Status", oldRevRecord.getValue("custentity_amp_mandatestatus"));
			}
            log.debug("New Status", revRecord.getValue("custentity_amp_mandatestatus"));*/
			
            //if (externalId && mandateStatus && mandateStatus != oldmandateStatus) {
                //var intRecord = findIntegrationRecord(runtime.accountId, 'customerPaymentSync');
                    if (recType == 'customrecordrvsunit') {
                        var headers1 = {
                            "Accept": "*/*",
                            "Content-Type": "application/json",
                            "client_id": runtime.getCurrentScript().getParameter('custscript_gd_clientid'),
							"client_secret":runtime.getCurrentScript().getParameter('custscript_gd_clientsecret')
                        }
                        //headers1['Content-Type'] = 'application/json';
                        var rec = record.load({
								type: recType,
								id: revId
							});
							
							var fieldList = new Array();
							var listRecordFieldList = new Array();
							var booleanFieldList = new Array();
							var dateFieldList = new Array();
							
							fieldList = ['custrecordunit_actualofflinedate','custrecordunit_actualshipweight',
							'custrecordgd_transport_amountbilled',
							'custrecordcustrecordgdcsasealnumber',
							'custrecordgd_unitpaintnotes',
							'custrecordgd_transportationnotes',
							'custrecordunit_graywatercapacity',
							'custrecordunit_gvwrlbs',
							'custrecordunit_hitchweight',
							'id',
							'custrecordunit_leftweight',
							'custrecordunit_lpgasweight',
							'name',
							'custrecordunit_psi',
							'custrecordunit_purchaseordernum',
							'recordid',
							'custrecordgd_transport_repairedby',
							'custrecordunit_rightweight',
							'custrecordunit_rim',
							'custrecordcustrecordgdrvianumber',
							'custrecordunit_salesreptext',
							'scriptid',
							'custrecordunit_serialnumber',
							'custrecordcustrecordgdstateseal1',
							'custrecordcustrecordgdstateseal2',
							'custrecordunit_tire',
							'custrecordgd_transport_damage',
							'custrecordgd_transport_notes',
							'custrecordgd_transport_billdiscountamoun',
							'custrecordgd_transport_unitlocation',
							'custrecordunit_uvw',
							'custrecordunit_wastewatercapacity',
							'custrecordunit_waterheatercapacity',
							'custrecordrvs_weightdiscrepancyreason',
							'custrecordyardnotes',
							'_rid',
							'_self',
							'_etag',
							'_attachments',
							'_ts',
							'custrecordunit_gawrallaxles',
							'custrecordunit_gawrsingleaxle',
							'custrecordgd_legalcasepending',
							'custrecordunit_currentprodstation',
							'custrecordunit_productionrun',
							'custrecordunit_productionrunbacklog',
							'custrecordgd_transport_responsibility',
							'custrecordgd_transport_resellstatus',
							'custrecordgd_transport_repairstatus',
							'custrecordcustrecordgdsealstate1',
							'custrecordcustrecordgdsealstate2',
							'custrecordgd_transport_buyback',
							'custrecordgd_transport_case',
							];
							
							listRecordFieldList = ['custrecordunit_axleconfiguration','custrecordunit_backlog',
							'custrecordunit_dealer',
							'custrecordunit_decor',
							'custrecordunit_location',
							'custrecordunit_model',
							'custrecordunit_modelyear',
							'owner',
							'custrecordunit_status',
							'custrecordunit_qastatus',
							'custrecordunit_salesorder',
							'custrecordunit_salesrep',
							'custrecordunit_series',
							'custrecordunit_shippingstatus',
							'custrecordunit_transportco',
							'custrecordunit_typeofvehicle',
							'custrecordunit_flooringstatus'
							]
							
							booleanFieldList = ['custrecordunit_calculatevinnumber',
							'custrecordunit_gd_dpu',
							'custrecordgd_shipping_hold',
							'custrecordgd_totaledunit',
							'custrecordgd_transportdamage',
							'custrecordhasopenchangeorders',
							'isinactive',
							'custrecordnowarranty',
							'custrecordunit_retailsoldnotregistered',
							'custrecordunit_systemshold',
							'custrecordvinwascalculated'
							
							]
							
							dateFieldList = [
							'custrecordunit_shipdate',
							'custrecordunit_datecompleted',
							'custrecordgd_transport_datereported',
							'custrecordunit_dispatchdate',
							'custrecordunit_extendedwarrantyexp',
							'custrecordunit_onlinedate',
							'custrecordunit_orderdate',
							'custrecordrvs_originalshipdate',
							'custrecordunit_productioncompletedate',
							'custrecordgd_transport_releasedate',
							'custrecordunit_reportedtorviadate',
							'custrecordunit_retailpurchaseddate',
							'custrecordgd_transport_returndate',
							'custrecordunit_offlinedate',
							'custrecordunit_warrantyexpirationdate',
							'custrecordunit_receiveddate',
							'created',
							'lastmodified'
							
							]
							
							var jsonBody={};
							
							fieldList.forEach(function (result) {
								 var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=fieldValue;
										else
											jsonBody[result]=null;
								});
								
								listRecordFieldList.forEach(function (result) {
									var fieldText = rec.getText(result);
								 var fieldValue = rec.getValue(result);
								 var listObj = {};
								 if(fieldValue && fieldText)
								 {
									 listObj["id"]=fieldValue;
								 listObj["text"]=fieldText;
								 jsonBody[result]=listObj;
								 }
								 else
								 {listObj["id"]=null;
								 listObj["text"]="";
								 jsonBody[result]=listObj;
								 }
								 
								});
								
								booleanFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]="Yes";
										else
											jsonBody[result]="No";
								});
								
								dateFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=moment(fieldValue).format('MM/DD/YYYY')
										else
											jsonBody[result]=null;
								});
								log.debug("jsonBody3",jsonBody);
										 
                      
						log.debug("request to Mule+",scriptContext.type+','+JSON.stringify(headers1)+','+jsonBody);
						var postRequest;
						if(scriptContext.type == scriptContext.UserEventType.CREATE)
								postRequest = https.post({
								url: runtime.getCurrentScript().getParameter('custscript_gd_uniturl'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
						
						if(scriptContext.type == scriptContext.UserEventType.EDIT)
							postRequest = https.put({
								url: runtime.getCurrentScript().getParameter('custscript_gd_uniturl'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
							
                            log.debug('response from Mule ' + postRequest.code, postRequest.body);
                    }
					else
					{
						log.debug("Integration record is not setup/Invalid");
					}
            //}  
        }
		
		
		
		if (recType == 'assemblyitem' && (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) ) {
            
                    if (recType == 'assemblyitem') {
                        var headers1 = {
                            "Accept": "*/*",
                            "Content-Type": "application/json",
                            "client_id": "7e1c0bbae6114639abc699217d31bbfc",
							"client_secret":"3A6306179376427191955BE9dB632Fc1"
                        }
                        var rec = record.load({
								type: recType,
								id: revId
							});
							
							var fieldList = new Array();
							var listRecordFieldList = new Array();
							var booleanFieldList = new Array();
							var dateFieldList = new Array();
							
							fieldList = ['atpmethod',
							'averagecost',
							'custitemrvsmodelawningsize',
							'custitemrvsmodelaxleweight',
							'costingmethoddisplay',
							'costingmethod',
							'custitemgd_countryoforigin',
							'description',
							'storedetaileddescription',
							'displayname',
							'demandmodifier',
							'custitemrvsmodelextheight',
							'custitemrvsmodelextlength',
							'custitemrvsextlengthdecimal',
							'custitemrvsmodelextwidth',
							'custitemrvsexteriorcolor',
							'externalid',
							'featureddescription',
							'custitem_rfs_shipping_freightclass',
							'custitemrvsmodelfreshwater',
							'custitemrvsmodelfurnace',
							'gainlossaccount',
							'custitemrvsmodelgawrallaxles',
							'custitemrvsmodelgawrsingleaxle',
							'custitemgd_lastdatetimerollupset',
							'custitemgd_msrptext',
							'custitemgd_salesdescriptionsearch',
							'froogleproductfeed',
							'custitemrvsmodelgraywater',
							'custitemrvsmodelgrossncc',
							'custitemrvsmodelgvwrlbs',
							'handlingcost',
							'custitem_rfs_packing_height',
							'custitemrvsmodelhitchweight',
							'id',
							'custitemgd_itemcomments',
							'itemid',
							'weight',
							'lastpurchaseprice',
							'custitem_rfs_packing_length',
							'custitemrvsextlengthexclhitch',
							'custitemrvs_lengthfromkingpin',
							'custitemrvslengthincludinghitch',
							'custitemrvsmodellpgascapacitylbs',
							'manufacturer',
							'mpn',
							'maximumquantity',
							'maxdonationamount',
							'metataghtml',
							'minimumquantity',
							'custitemrvsmodelcode',
							'custitemrvsmsomodel',
							'custitemrvsmodelnetncc',
							'nextagcategory',
							'nextagproductfeed',
							'nopricemessage',
							'outofstockmessage',
							'pagetitle',
							'prodpricevarianceacct',
							'prodqtyvarianceacct',
							'leadtime',
							'purchasepricevarianceacct',
							'relateditemsdescription',
							'supplyreplenishmentmethod',
							'custitemrvsrimsizeoptional',
							'custitemrvsrolledupcost',
							'custitemrvsrolledupweight',
							'custitemrvs_hitchmaxweight',
							'custitemrvs_hitchminweight',
							'custitemrvs_uvwmaxweight',
							'custitemrvs_uvwminweight',
							'safetystocklevel',
							'scrapacct',
							'searchkeywords',
							'shippingcost',
							'shoppingdotcomcategory',
							'shoppingproductfeed',
							'shopzillacategoryid',
							'shopzillaproductfeed',
							'custitemrvsmodelsquarefeet',
							'custitemrvsstandardfeatures',
							'stockdescription',
							'storedescription',
							'storedisplayname',
							'custitemgd_tariffcode',
							'custitemrvstirepsioptional',
							'custitemrvstirepsistd',
							'custitemrvstirerimstd',
							'custitemrvsmodeltiresize',
							'custitemrvstiresoptional',
							'custitemrvstiresstd',
							'totalquantityonhand',
							'totalvalue',
							'transferprice',
							'itemtype',
							'urlcomponent',
							'custitemrvsmodeluvwlbs',
							'receiptamount',
							'receiptquantitydiff',
							'receiptquantity',
							'purchaseorderamount',
							'purchaseorderquantitydiff',
							'purchaseorderquantity',
							'custitemrvsmodelwaste',
							'custitemrvsmodelwaterheater',
							'weightunits',
							'custitem_rfs_packing_width',
							'wipacct',
							'wipvarianceacct',
							'yahooproductfeed'
							];
							
							listRecordFieldList = ['assetaccount',
							'custitemrvsmodelaxleconfiguration',
							'overallquantitypricingtype',
							'custitemrvscategorylevel1',
							'custitemrvscategorylevel2',
							'custitemrvscategorylevel3',
							'class',
							'custreturnvarianceaccount',
							'department',
							'isonline',
							'effectivebomcontrol',
							'billexchratevarianceacct',
							'custitemgd_frontprotectivewrap',
							'custitemgd_subseries',
							'incomeaccount',
							'storedisplayimage',
							'storedisplaythumbnail',
							'custitem_rfs_item_labelgroup',
							'location',
							'countryofmanufacture',
							'custitemrvsmodeltype',
							'custitemrvs_msrplevel',
							'outofstockbehavior',
							'shippackage',
							'preferredlocation',
							'billpricevarianceacct',
							'pricinggroup',
							'consumptionunit',
							'saleunit',
							'stockunit',
							'unitstype',
							'quantitypricingschedule',
							'billqtyvarianceacct',
							'custitemrvsitemtype',
							'custitemrvs_modelline',
							'custitemrvsmodelseries',
							'custitemrvsseriessize',
							'sitemappriority',
							'parent',
							'unbuildvarianceaccount',
							'vendreturnvarianceaccount',
							'weightunit',
							'custitemrvsmodelyear',
							'_rid',
							'_self',
							'_etag',
							'_attachments',
							'_ts'
							]
							
							booleanFieldList = ['custitemrvsadvertisingfee',
							'custitemrvsarecompbeingcopied',
							'custitem_rfs_capture_outbound_serials',
							'custitemrvscommission',
							'dontshowprice',
							'enforceminqtyinternally',
							'custitemrvs_excludecatax',
							'excludefromsitemap',
							'custitemgd_mkhaulntowfreightavailable',
							'custitemgd_mklowboyfreightavailable',
							'custitemgd_showinbuildyourown',
							'custitemgd_unitappliancesupdated',
							'custitemrvsgefee',
							'isinactive',
							'custitemrvsitem_ismiscellaneous',
							'buildentireassembly',
							'matchbilltoreceipt',
							'custitemrvsmsrp',
							'custitemrvsneedsapproval',
							'isphantom',
							'printitems',
							'custitem_rfs_print_labels_at_receipt',
							'custitem_rfs_require_expiration',
							'roundupascomponent',
							'custitemrvs_usecdlfreight',
							'seasonaldemand',
							'shipindividually',
							'showdefaultdonationamount',
							'isspecialworkorderitem',
							'usebins',
							'usecomponentyield',
							'custitem_rfs_item_prodstaging',
							'usemarginalrates',
							'isonline',
							'custitemrvsdiscontinuedmodel',                                                
							'isdonationitem'
							]
							
							dateFieldList = [
							'createddate',
							'lastmodified',
							'lastmodifieddate'
							]
							
							var jsonBody={};
							
							fieldList.forEach(function (result) {
								 var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=fieldValue;
										else
											jsonBody[result]=null;
								});
								
								listRecordFieldList.forEach(function (result) {
									var fieldText = rec.getText(result);
								 var fieldValue = rec.getValue(result);
								 var listObj = {};
								 if(fieldValue && fieldText)
								 {
									 listObj["id"]=fieldValue;
								 listObj["text"]=fieldText;
								 jsonBody[result]=listObj;
								 }
								 else
								 {listObj["id"]=null;
								 listObj["text"]="";
								 jsonBody[result]=listObj;
								 }
								 
								});
								
								booleanFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]="Yes";
										else
											jsonBody[result]="No";
								});
								
								dateFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=moment(fieldValue).format('MM/DD/YYYY')
										else
											jsonBody[result]=null;
								});
								log.debug("jsonBody3",jsonBody);
										 
                      
						log.debug("request to Mule+",scriptContext.type+','+JSON.stringify(headers1)+','+JSON.stringify(jsonBody));
						var postRequest;
						if(scriptContext.type == scriptContext.UserEventType.CREATE)
								postRequest = https.post({
								url: runtime.getCurrentScript().getParameter('custscript_gd_assemblymaterial'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
						
						if(scriptContext.type == scriptContext.UserEventType.EDIT)
							postRequest = https.put({
								url: runtime.getCurrentScript().getParameter('custscript_gd_assemblymaterial'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
							
                            log.debug('response from Mule ' + postRequest.code, postRequest.body);
                    }
					else
					{
						log.debug("Integration record is not setup/Invalid");
					}
            //}  
        }
		
		
		
		if ((recType == 'vendor' || recType == 'customer') && (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) ) {
            
                    if (recType == 'vendor' || recType == 'customer') {
                        var headers1 = {
                            "Accept": "*/*",
                            "Content-Type": "application/json",
                            "client_id": "7e1c0bbae6114639abc699217d31bbfc",
							"client_secret":"3A6306179376427191955BE9dB632Fc1"
                        }
                        var rec = record.load({
								type: recType,
								id: revId
							});
							
							var fieldList = new Array();
							var listRecordFieldList = new Array();
							var booleanFieldList = new Array();
							var dateFieldList = new Array();
							
							fieldList = ['altphone',
							'balance',
							'baserecordtype',
							'billaddr1',
							'billaddr2',
							'billaddressee',
							'billattention',
							'billcity',
							'billcountry',
							'billstate',
							'billzip',
							'clickstream',
							'companyname',
							'consolbalance',
							'consoldepositbalance',
							'consoloverduebalance',
							'consolunbilledorders',
							'currencyprecision',
							'currid',
							'custentity_esc_annual_revenue',
							'custentity_esc_industry',
							'custentity_esc_no_of_employees',
							'custentity_ozlink_website',
							'custentitygd_defaultdealerlocatoraddrbk',
							'custentitygd_haulandtowfreightcharge',
							'custentitygd_partsshipaddress1',
							'custentitygd_partsshipaddress2',
							'custentitygd_partsshipaddressee',
							'custentitygd_partsshipcity',
							'custentitygd_partsshipcountry',
							'custentitygd_partsshipphone',
							'custentitygd_partsshipstate',
							'custentitygd_partsshipzip',
							'custentitymsoaddress',
							'custentitymsocity',
							'custentitymsocountry',
							'custentitymsozipcode',
							'custentityrvs_cdlfreightcharge',
							'custentityrvs_dealer_unitshippingmethod',
							'custentityrvsapprovedlaborrate',
							'custentityrvsparentdealername',
							'custentityrvspartsfax',
							'custentityrvswash',
							'custentityunitshippingmethod',
							'defaultaddress',
							'depositbalance',
							'displaysymbol',
							'entityid',
							'entitynumber',
							'entitytitle',
							'fax',
							'firstvisit',
							'id',
							'lastvisit',
							'nameorig',
							'negativenumberformat',
							'numberformat',
							'origaccessrole',
							'origsubstatus',
							'otherrelationships',
							'overduebalance',
							'parent',
							'phone',
							'printoncheckas',
							'receivablesacctpref',
							'rectype_1103_7619_maxnkey',
							'rectype_141_1319_maxnkey',
							'referrer',
							'salesrep',
							'sessioncountry',
							'shipaddr1',
							'shipaddr2',
							'shipaddressee',
							'shipattention',
							'shipcity',
							'shipcountry',
							'shippingitem',
							'shipstate',
							'shipzip',
							'stage',
							'submitnext_t',
							'submitnext_y',
							'type',
							'unbilledorders',
							'version',
							'visits',
							'externalid',
							'customwhence',
							'wfinstances',
							'accountnumber',
							'formatsample',
							'newaccesshelp',
							'assignedwebsite',
							'emailloginkey',
							'accesshelp',
							'password',
							'password2',
							'stagename',
							'defaultaddressee',
							'defaultaddrbook',
							'billaddr3',
							'shipaddr3',
							'estimatedbudget',
							'territory',
							'leadsource',
							'campaignevent',
							'campaigncategory',
							'sourcewebsite',
							'keywords',
							'lastpagevisited',
							'custentity_link_name_lsa',
							'custentity_date_lsa',
							'custentity_link_lsa',
							'custentityregionalsalesmanager',
							'custentitygd_lead_latitude',
							'custentitygd_lead_longitude',
							'custentitygd_contact_custombuildinfo',
							'custentityrvsmiles',
							'custentity_extend_public_link_uuid',
							'custentityrvsflooringtype',
							'custentity_ozlink_upsaccount',
							'custentityrvstransportco',
							'custentitygd_vinnumber_contact',
							'custentitygd_salesautomenuoption',
							'custentitygd_contact_workingwithdealer',
							'custentitygd_contact_timeframe',
							'custentitygd_contact_marketingseries',
							'custentitygd_contact_modelyear',
							'custentitygd_contact_marketingmodel',
							'custentitygd_contact_makemodelintersted',
							'custentitygd_iscurrentowner',
							'custentitygd_contactsmessage',
							'custentitygd_contact_campingstyle',
							'custentitygd_brochuretwochoice',
							'custentitygd_brochureonechoice',
							'custentityterritory',
							'custentitygd_localdealer_address',
							'custentitygd_verifyemail',
							'custentitygd_dealergroup',
							'custentitygd_dlrlocstateabbreviation',
							'custentitygd_dlrloccountryabbreviation',
							'custentity_flo_employee_permissions',
							'custentity_ns_sc_ext_asu_status',
							'contact',
							'isindividual',
							'salutation',
							'firstname',
							'middlename',
							'lastname',
							'title',
							'url',
							'category',
							'image',
							'defaultorderpriority',
							'custentitygdunitshipmethod',
							'comments',
							'custentitygd_statesealsrequired',
							'custentityrvsproductline',
							'custentitygd_lead_nurt_email1',
							'custentitygd_lead_nurt_email2',
							'custentitygd_lead_nurt_email3',
							'email',
							'custentityrvspartsemail',
							'altemail',
							'mobilephone',
							'homephone',
							'custentitygd_reportingdealergrp',
							'custentitymsoaddress2',
							'custentitymsostate',
							'custentitygd_dlrlocaddress1',
							'custentitygd_dlrlocaddress2',
							'custentitygd_dlrloccity',
							'custentitygd_dlrlocstate',
							'custentitygd_dlrloczipcode',
							'custentitygd_dlrloccountry',
							'custentitygd_dlrlocphone',
							'custentitygd_addresslongitude',
							'custentitygd_addresslatitude',
							'custentitygd_statecomplianceoption',
							'custentityrvstollsandpermits',
							'custentitygd_lowboyfreightcharge',
							'custentityrvsclaimpartsmarkup',
							'reminderdays',
							'pricelevel',
							'creditlimit',
							'custentityrvsimporter',
							'vatregnumber',
							'taxitem',
							'resalenumber',
							'daysoverdue',
							'consoldaysoverdue',
							'prefccprocessor',
							'custentityrvssecondaryflooringtype',
							'custentityrvspaymentrequest',
							'custentityrvsgeaccountnumber',
							'custentityrvsfees',
							'custentityrvsmso',
							'sendtransactionsvia',
							'custentity_rfs_customer_labelgroup',
							'custentitygd_rvtraderid',
							'custentitygd_localdealer',
							'custentitygd_rvtdealerid',
							'custentity_ozlink_fedexaccount',
							'custentity_ozlink_dhlaccount',
							'custentity_ozlink_email2',
							'custentity_ozlink_email3',
							'custentity_extend_public_upload_link',
							'custentity_extend_files_uploadon_record',
							'custentity_extend_files_entity_file_list',
							'custentity_extend_files_folder_info',
							'salesreadiness',
							'buyingreason',
							'buyingtimeframe'
							];
							
							listRecordFieldList = [
							'accessrole',
							'alcoholrecipienttype',
							'creditholdoverride',
							'custentitygd_freightcalculations',
							'custentityrvsdealertype',
							'custentityrvsfreightcalculations',
							'customform',
							'emailpreference',
							'entitystatus',
							'globalsubscriptionstatus',
							'receivablesaccount',
							'shippingcarrier',
							'subsidiary',
							'symbolplacement',
							'terms',
							'unsubscribe'
							]
							
							booleanFieldList = [
							'accesstabchanged',
							'endbeforestart',
							'freeformstatepref',
							'giveaccesschanged',
							'haschildren',
							'hasparent',
							'hasshipping',
							'isjob',
							'isperson',
							'origbinactive',
							'origgiveaccess',
							'propagateactivity',
							'templatestored',
							'custentityrvsusegefinancingfee',
							'emailtransactions',
							'faxtransactions',
							'giveaccess',
							'hasbillingaddress',
							'hasshippingaddress',
							'isinactive',
							'printtransactions',
							'custentity_extend_generate_public_upload',
							'custentity_ozlink_bill_shipping_to_3rd',
							'custentity_ozlink_bill_shipping_to_recip',
							'custentitygd_exemptfromdpufee',
							'custentitygd_fronprotectivewrap',
							'custentitygd_hideindealerlocator',
							'custentityrvscreditdealer',
							'custentityrvscreditdealercreated',
							'custentityrvspo',
							'custentityrvsuseadvertisingfee',
							'custentityusemsoaddress',
							'fillpassword',
							'initiallyOverrideAllowed',
							'isbudgetapproved',
							'overridecurrencyformat',
							'sendemail',
							'shipcomplete',
							'weblead',
							'taxable'
							]
							
							dateFieldList = [
							'custentity_esc_last_modified_date',
							'datecreated',
							'lastmodifieddate',
							'custentitycurrentdate',
							'startdate',
							'custentitygd_customer_dateofbirth',
							'custentitygd_laborrateeffdate',
							'enddate'
							]
							
							var jsonBody={};
							
							fieldList.forEach(function (result) {
								 var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=fieldValue;
										else
											jsonBody[result]=null;
								});
								
								listRecordFieldList.forEach(function (result) {
									var fieldText = rec.getText(result);
								 var fieldValue = rec.getValue(result);
								 var listObj = {};
								 if(fieldValue && fieldText)
								 {
									 listObj["id"]=fieldValue;
								 listObj["text"]=fieldText;
								 jsonBody[result]=listObj;
								 }
								 else
								 {listObj["id"]=null;
								 listObj["text"]="";
								 jsonBody[result]=listObj;
								 }
								 
								});
								
								booleanFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]="Yes";
										else
											jsonBody[result]="No";
								});
								
								dateFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=moment(fieldValue).format('MM/DD/YYYY')
										else
											jsonBody[result]=null;
								});
								log.debug("jsonBody3",jsonBody);
										 
                      
						log.debug("request to Mule+",scriptContext.type+','+JSON.stringify(headers1)+','+jsonBody);
						var postRequest;
						if(scriptContext.type == scriptContext.UserEventType.CREATE)
								postRequest = https.post({
								url: runtime.getCurrentScript().getParameter('custscript_gd_vendorurl'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
						
						if(scriptContext.type == scriptContext.UserEventType.EDIT)
							postRequest = https.put({
								url: runtime.getCurrentScript().getParameter('custscript_gd_vendorurl'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
							
                            log.debug('response from Mule ' + postRequest.code, postRequest.body);
                    }
					else
					{
						log.debug("Integration record is not setup/Invalid");
					}
            //}  
        }
		
		
		
		if (recType == 'contact' && (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) ) {
            
                    if (recType == 'contact') {
                        var headers1 = {
                            "Accept": "*/*",
                            "Content-Type": "application/json",
                            "client_id": "7e1c0bbae6114639abc699217d31bbfc",
							"client_secret":"3A6306179376427191955BE9dB632Fc1"
                        }
                        var rec = record.load({
								type: recType,
								id: revId
							});
							
							var fieldList = new Array();
							var listRecordFieldList = new Array();
							var booleanFieldList = new Array();
							var dateFieldList = new Array();
							
							fieldList = [
							'baserecordtype',
							'companyid',
							'defaultaddressee',
							'email',
							'entityid',
							'entitytitle',
							'firstname',
							'id',
							'lastname',
							'nameorig',
							'officephone',
							'oldparent',
							'origsubstatus',
							'otherrelationships',
							'owner',
							'parentcompany',
							'phone',
							'rectype_1103_7603_maxnkey',
							'saved_name',
							'sessioncountry',
							'submitnext_t',
							'submitnext_y',
							'type',
							'version',
							'externalid',
							'customwhence',
							'wfinstances',
							'contactrole',
							'dmodified',
							'isemployee',
							'isindividual',
							'defaultaddrbook',
							'billattention',
							'billaddressee',
							'billaddr1',
							'billaddr2',
							'billaddr3',
							'billcity',
							'billstate',
							'billzip',
							'billcountry',
							'shipattention',
							'shipaddressee',
							'shipaddr1',
							'shipaddr2',
							'shipaddr3',
							'shipcity',
							'shipstate',
							'shipzip',
							'shipcountry',
							'contactcampaignevent',
							'contactsourcecampaigncategory',
							'custentity_link_name_lsa',
							'custentity_date_lsa',
							'custentity_link_lsa',
							'custentitygd_vinnumber_contact',
							'custentitygd_salesautomenuoption',
							'custentitygd_contact_timeframe',
							'custentitygd_contact_marketingseries',
							'custentitygd_contact_modelyear',
							'custentitygd_contact_marketingmodel',
							'custentitygd_contact_makemodelintersted',
							'custentitygd_iscurrentowner',
							'custentitygd_contactsmessage',
							'custentitygd_contact_campingstyle',
							'custentitygd_brochuretwochoice',
							'custentitygd_brochureonechoice',
							'custentitygd_verifyemail',
							'custentity_flo_employee_permissions',
							'salutation',
							'middlename',
							'title',
							'comments',
							'category',
							'image',
							'altemail',
							'mobilephone',
							'homephone',
							'fax',
							'defaultaddress',
							'custentityrvsvendor',
							'custentitygd_portalaccessdealer',
							'contactsource',
							'supervisor',
							'assistant',
							'supervisorphone',
							'assistantphone'
							];
							
							listRecordFieldList = [
							'company',
							'custentitygd_uni_role',
							'customform',
							'edition',
							'globalsubscriptionstatus',
							'subsidiary',
							'unsubscribe'
							]
							
							booleanFieldList = [
							'custentitygd_uni_isactive',
							'custentitygd_useforinvoicesubmission',
							'custentityrvsisdealersalesrep',
							'freeformstatepref',
							'hasbillingaddress',
							'hasshipping',
							'hasshippingaddress',
							'isinactive',
							'isprivate',
							'templatestored'
							]
							
							dateFieldList = [
							'custentity_esc_last_modified_date',
							'custentitycurrentdate',
							'datecreated',
							'lastmodifieddate',
							'custentitygd_customer_dateofbirth'
							]
							
							var jsonBody={};
							
							fieldList.forEach(function (result) {
								 var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=fieldValue;
										else
											jsonBody[result]=null;
									if (result == 'custentitygd_portalaccessdealer')
									 {
										 jsonBody[result]=null;
									 }

								});
								
								listRecordFieldList.forEach(function (result) {
									var fieldText = rec.getText(result);
								 var fieldValue = rec.getValue(result);
								 var listObj = {};
								 if(fieldValue && fieldText)
								 {
									 listObj["id"]=fieldValue;
								 listObj["text"]=fieldText;
								 jsonBody[result]=listObj;
								 }
								 else
								 {listObj["id"]=null;
								 listObj["text"]="";
								 jsonBody[result]=listObj;
								 }
								 
								});
								
								booleanFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]="Yes";
										else
											jsonBody[result]="No";
								});
								
								dateFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=moment(fieldValue).format('MM/DD/YYYY')
										else
											jsonBody[result]=null;
								});
								log.debug("jsonBody3",jsonBody);
										 
                      
						log.debug("request to Mule+",scriptContext.type+','+JSON.stringify(headers1)+','+jsonBody);
						var postRequest;
						if(scriptContext.type == scriptContext.UserEventType.CREATE)
								postRequest = https.post({
								url: runtime.getCurrentScript().getParameter('custscript_gd_contacturl'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
						
						if(scriptContext.type == scriptContext.UserEventType.EDIT)
							postRequest = https.put({
								url: runtime.getCurrentScript().getParameter('custscript_gd_contacturl'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
							
                            log.debug('response from Mule ' + postRequest.code, postRequest.body);
                    }
					else
					{
						log.debug("Integration record is not setup/Invalid");
					}
            //}  
        }
				if (recType == 'customrecordgd_captureunitretailcustomer' && (scriptContext.type == scriptContext.UserEventType.CREATE) ) {
            
                    if (recType == 'customrecordgd_captureunitretailcustomer') {
                        var headers1 = {
                            "Accept": "*/*",
                            "Content-Type": "application/json",
                            "client_id": "ebb999aa47504c149a18e613c2c9a68d",
							"client_secret":"9b7cd778bA2e47ea9a0bb2A5Bf1ed07a"
                        }
                        var rec = record.load({
								type: recType,
								id: revId
							});
							
							var fieldList = new Array();
							var listRecordFieldList = new Array();
							var booleanFieldList = new Array();
							var dateFieldList = new Array();
							
							fieldList = [
							'custrecordregistrationcapture_address1',
							'custrecordregistrationcapture_address2',
							'custrecordregistrationcapture_cellphone',
							'custrecordregistrationcapture_city',
							'custrecordregistrationcapture_dob',
							'custrecordregistrationcapture_dealreptxt',
							'custrecordregistrationcapture_pdi_dscenter',
							'custrecordregistrationcapture_pdi_dsfront',
							'custrecordregistrationcapture_pdi_dsrear',
							'custrecordregistrationcapture_email',
							'custrecordregistrationcapture_pdi_endiwc',
							'custrecordregistrationcapture_pdi_endtime',
							'externalid',
							'custrecordregistrationcapture_firstname',
							'id',
							'custrecordregistrationcapture_lastname',
							'custrecordregistrationcapture_middlename',
							'name',
							'custrecordregistrationcapture_pdi_odscenter',
							'custrecordregistrationcapture_pdi_odsfront',
							'custrecordregistrationcapture_pdi_odsrear',
							'custrecordregistrationcapture_phone',
							'recordid',
							'scriptid',
							'custrecordregistrationcapture_spouse',
							'custrecordregistrationcapture_pdi_startiwc',
							'custrecordregistrationcapture_pdi_starttime',
							'custrecordregistrationcapture_pdi_testloc',
							'custrecordregistrationcapture_title',
							'custrecordregistrationcapture_zipcode'
							];
							
							listRecordFieldList = [
							'custrecordregistrationcapture_country',
							'custrecordregistrationcapture_dealer',
							'custrecordregistrationcapture_dealsalesrp',
							'owner',
							'custrecordregistrationcapture_dsalesrp2',
							'custrecordregistrationcapture_state',
							'custrecordregistrationcapture_unit'
							]
							
							booleanFieldList = [
							'custrecordregistrationcapture_pdi_pigtail',
							'custrecordregistrationcapture_pdi_acfunction',
							'custrecordregistrationcapture_pdi_accesswire',
							'custrecordregistrationcapture_pdi_alldoorwind',
							'custrecordregistrationcapture_pdi_extlights',
							'custrecordregistrationcapture_pdi_allfurn',
							'custrecordregistrationcapture_pdi_alllight',
							'custrecordregistrationcapture_pdi_lugsnuts',
							'custrecordregistrationcapture_pdi_outletfunct',
							'custrecordregistrationcapture_pdi_allremotes',
							'custrecordregistrationcapture_pdi_softgood',
							'custrecordregistrationcapture_pdi_allspeak',
							'custrecordregistrationcapture_pdi_wallswitch',
							'custrecordregistrationcapture_pdi_appconn',
							'custrecordregistrationcapture_pdi_autoreset',
							'custrecordregistrationcapture_pdi_awning',
							'custrecordregistrationcapture_pdi_axleubolt',
							'custrecordregistrationcapture_pdi_baggagedoor',
							'custrecordregistrationcapture_pdi_batterytray',
							'custrecordregistrationcapture_pdi_blindshade',
							'custrecordregistrationcapture_pdi_bottles',
							'custrecordregistrationcapture_pdi_breakaway',
							'custrecordregistrationcapture_pdi_cabdrawf',
							'custrecordregistrationcapture_pdi_cabdoors',
							'custrecordregistrationcapture_pdi_paneldef',
							'custrecordregistrationcapture_pdi_ceilingpan',
							'custrecordregistrationcapture_pdi_chassis',
							'custrecordregistrationcapture_pdi_closetrod',
							'custrecordregistrationcapture_pdi_cornermold',
							'custrecordregistrationcapture_pdi_countertop',
							'custrecordregistrationcapture_pdi_couplerpin',
							'custrecordregistrationcapture_currentcust',
							'custrecordregistrationcapture_custverific',
							'custrecordregistrationcapture_pdi_dinconvert',
							'custrecordregistrationcapture_pdi_dinette',
							'custrecordregistrationcapture_pdi_drawfunct',
							'custrecordregistrationcapture_pdi_entrydoor',
							'custrecordregistrationcapture_pdi_extwater',
							'custrecordregistrationcapture_pdi_faucetshow',
							'custrecordregistrationcapture_pdi_fedtags',
							'custrecordregistrationcapture_pdi_fireext',
							'custrecordregistrationcapture_pdi_fireplace',
							'custrecordregistrationcapture_pdi_flooringmat',
							'custrecordregistrationcapture_pdi_floorreg',
							'custrecordregistrationcapture_pdi_foldingdoor',
							'custrecordregistrationcapture_pdi_furnburn',
							'custrecordregistrationcapture_pdi_furnace',
							'custrecordregistrationcapture_pdi_fusepanel',
							'custrecordregistrationcapture_pdi_genfunction',
							'custrecordregistrationcapture_pdi_gfi',
							'custrecordregistrationcapture_pdi_grabhandle',
							'custrecordregistrationcapture_pdi_gravity',
							'custrecordregistrationcapture_pdi_hangers',
							'custrecordregistrationcapture_pdi_homestereo',
							'custrecordregistrationcapture_pdi_hydraulic',
							'custrecordregistrationcapture_pdi_icemaker',
							'isinactive',
							'custrecordregistrationcapture_pdi_ladder',
							'custrecordregistrationcapture_pdi_landinglegs',
							'custrecordregistrationcapture_pdi_lineconnect',
							'custrecordregistrationcapture_pdi_lowpoint',
							'custrecordregistrationcapture_pdi_lpco2',
							'custrecordregistrationcapture_pdi_bottletray',
							'custrecordregistrationcapture_pdi_lpdrop',
							'custrecordregistrationcapture_pdi_lplines',
							'custrecordregistrationcapture_pdi_lptank',
							'custrecordregistrationcapture_pdi_manover',
							'custrecordregistrationcapture_pdi_microfunct',
							'custrecordregistrationcapture_pdi_weartotires',
							'custrecordregistrationcapture_pdi_damageext',
							'custrecordregistrationcapture_pdi_extblack',
							'custrecordregistrationcapture_pdi_framedamage',
							'custrecordregistrationcapture_pdi_framerust',
							'custrecordregistrationcapture_pdi_outlets',
							'custrecordregistrationcapture_pdi_passthru',
							'custrecordregistrationcapture_pdi_powercenter',
							'custrecordregistrationcapture_pdi_powerdisc',
							'custrecordregistrationcapture_pdi_powerfans',
							'custrecordregistrationcapture_pdi_radiostereo',
							'custrecordregistrationcapture_pdi_rampdoor',
							'custrecordregistrationcapture_pdi_rangeoven',
							'custrecordregistrationcapture_pdi_rangehood',
							'custrecordregistrationcapture_pdi_reffunct',
							'custrecordregistrationcapture_pdi_regpressure',
							'custrecordregistrationcapture_pdi_reservoir',
							'custrecordregistrationcapture_pdi_roofattach',
							'custrecordregistrationcapture_pdi_roofmolding',
							'custrecordregistrationcapture_pdi_roomsfunct',
							'custrecordregistrationcapture_pdi_roomsseal',
							'custrecordregistrationcapture_pdi_safetychain',
							'custrecordregistrationcapture_pdi_shelvealign',
							'custrecordregistrationcapture_pdi_showertub',
							'custrecordregistrationcapture_pdi_showerdoor',
							'custrecordregistrationcapture_pdi_showers',
							'custrecordregistrationcapture_pdi_skirtmetal',
							'custrecordregistrationcapture_pdi_smokedetect',
							'custrecordregistrationcapture_pdi_sofaconv',
							'custrecordregistrationcapture_pdi_sparetire',
							'custrecordregistrationcapture_pdi_stateseal',
							'custrecordregistrationcapture_pdi_stepsoper',
							'custrecordregistrationcapture_pdi_tankmonitor',
							'custrecordregistrationcapture_pdi_tanktrans',
							'custrecordregistrationcapture_pdi_tankvent',
							'custrecordregistrationcapture_pdi_termhandle',
							'custrecordregistrationcapture_pdi_termsystem',
							'custrecordregistrationcapture_pdi_thermostat',
							'custrecordregistrationcapture_pdi_tirelabel',
							'custrecordregistrationcapture_pdi_tirepress',
							'custrecordregistrationcapture_pdi_toilet',
							'custrecordregistrationcapture_pdi_tvfunction',
							'custrecordregistrationcapture_pdi_underbelly',
							'custrecordregistrationcapture_pdi_underside',
							'custrecordregistrationcapture_pdi_vcr',
							'custrecordregistrationcapture_pdi_wallpandef',
							'custrecordregistrationcapture_pdi_wallpanel',
							'custrecordregistrationcapture_pdi_watercont',
							'custrecordregistrationcapture_pdi_waterbypass',
							'custrecordregistrationcapture_pdi_waterheater',
							'custrecordregistrationcapture_pdi_waterline',
							'custrecordregistrationcapture_pdi_waterpump',
							'custrecordregistrationcapture_pdi_windows',
							'custrecordregistrationcapture_pdi_winsecure',
							'custrecordregistrationcapture_pdi_windtreat',
							'custrecordregistrationcapture_pdi_wirebundle',
							'custrecordregistrationcapture_pdi_wirelooms'
							]
							
							dateFieldList = [
							'custrecordregistrationcapture_registrcvd',
							'custrecordregistrationcapture_retailsold',
							'created',
							'lastmodified'
							]
							
							var jsonBody={};
							
							fieldList.forEach(function (result) {
								 var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=fieldValue;
										else
											jsonBody[result]=null;
								});
								
								listRecordFieldList.forEach(function (result) {
									var fieldText = rec.getText(result);
								 var fieldValue = rec.getValue(result);
								 var listObj = {};
								 if(fieldValue && fieldText)
								 {
									 listObj["id"]=fieldValue;
								 listObj["text"]=fieldText;
								 jsonBody[result]=listObj;
								 }
								 else
								 {listObj["id"]=null;
								 listObj["text"]="";
								 jsonBody[result]=listObj;
								 }
								 
								});
								
								booleanFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]="Yes";
										else
											jsonBody[result]="No";
								});
								
								dateFieldList.forEach(function (result) {
									var fieldValue = rec.getValue(result);
									 if(fieldValue)
									 jsonBody[result]=moment(fieldValue).format('MM/DD/YYYY')
										else
											jsonBody[result]=null;
								});
								//log.debug("jsonBody3",jsonBody);
										 
                      
						log.debug("request to Mule+",scriptContext.type+','+JSON.stringify(headers1)+','+JSON.stringify(jsonBody));
						var postRequest;
						if(scriptContext.type == scriptContext.UserEventType.CREATE)
								postRequest = https.post({
								url: runtime.getCurrentScript().getParameter('custscript_gd_registrationcaptureurl'),
								body: JSON.stringify(jsonBody),
								headers: headers1
							})
						
						/*if(scriptContext.type == scriptContext.UserEventType.EDIT)
							postRequest = https.put({
								url: "https://gdrv-prc-owner-dev.us-e2.cloudhub.io:443/api/registration",
								body: JSON.stringify(jsonBody),
								headers: headers1
							})*/
							
                            log.debug('response from Mule ' + postRequest.code, postRequest.body);
                    }
					else
					{
						log.debug("Integration record is not setup/Invalid");
					}
            //}  
        }  // end of Registration Capture

    }
		
			
    return {
        //beforeLoad: beforeLoad
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

});