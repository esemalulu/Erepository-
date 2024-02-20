/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/https', './crypto-js.js'], function(record, search, runtime, https, CryptoJS) {

    var RECORD_TYPE = {
        "customrecord_3_integration_queue":"customrecordrvsunit",
        "customrecord_9_integration_queue":"customrecordrvs_recallunit",
        "customrecord_10_integration_queue":"customrecordrvsseries",
        "customrecord_4_integration_queue":"customrecordrvsunitretailcustomer",
        "customrecord_18_integration_queue":"customrecordrvsflatratecodes",
        "customrecord_6_integration_queue":"customrecordrvsclaim",
        "customrecord_5_integration_queue":"customrecordrvspreauthorization",
        "customrecord_11_integration_queue":"assemblyitem",
        "customrecord_12_integration_queue":"noninventoryitem",
        "customrecord_1_integration_queue":"customer",
        "customrecord_2_integration_queue":"contact",
        "customrecord_7_integration_queue":"vendor",
        "customrecord_8_integration_queue":"contact",
        "customrecord_13_integration_queue":"customrecordgranddesignpartsinquiry",
        "customrecord_14_integration_queue":"customrecordrvsproductchangenotice",
        "customrecord_15_integration_queue":"customrecordrvsvendorchargeback",
        "customrecord_16_integration_queue":"customrecordsrv_serviceworkorder",
        "customrecord_17_integration_queue":"customrecordrvsunitappliances",
		"customrecord_19_integration_queue":"salesorder",
		"customrecord_20_integration_queue":"estimate"
    };
    var COSMOS_COLLECTION = {
        'customrecord_3_integration_queue': 'rvunit',
        "customrecord_9_integration_queue":"recallunit",
        "customrecord_10_integration_queue":"series",
        "customrecord_4_integration_queue":"unitretailcustomer",
        "customrecord_18_integration_queue":"flatratecode",
        "customrecord_6_integration_queue":"claim",
        "customrecord_5_integration_queue":"preauthorization",
        "customrecord_11_integration_queue":"model",
        "customrecord_12_integration_queue":"decor",
        "customrecord_1_integration_queue":"dealer",
        "customrecord_2_integration_queue":"dealercontact",
        "customrecord_7_integration_queue":"vendor",
        "customrecord_8_integration_queue":"vendorcontact",
        "customrecord_13_integration_queue":"partsinquiry",
        "customrecord_14_integration_queue":"productchangenotice",
        "customrecord_15_integration_queue":"vendorchargeback",
        "customrecord_16_integration_queue":"serviceworkorder",
        "customrecord_17_integration_queue":"unitappliance",
		"customrecord_19_integration_queue":"salesorder",
		"customrecord_20_integration_queue":"weborder"
    };
    var JSON_FIELD_IDS = {
        customrecord_9_integration_queue: ['custrecordrecallunit_claim','custrecordrecallunit_date','externalid','custrecordrecallunitgd_removeunit','name','isinactive','id','altname','owner','custrecordrecallunit_recallcode','scriptid','custrecordrecallunit_status','custrecordrecallunit_unit'],
        customrecord_10_integration_queue: ['custrecordseries_dealerdiscount','custrecordseries_description','externalid','custrecordgd_aimbasebrandcode','custrecordgd_dealeronlymodchangeorder','custrecordgdseries_pcncompgrp','custrecordgdseries_pcnfinalappgrp','custrecordgdseries_pcnpendappgrp','custrecordgdseries_pcnpendappnoteonlygrp','custrecordgdseries_pcnrejectgrp','custrecordgd_serieslocation','custrecordgd_series_certificationcode','custrecordgd_series_points','isinactive','id','custrecordseries_msoname','name','owner','recordid','scriptid','custrecordgd_seriesshowinbuildyourown','custrecordspecialsportutilitytrailer','custrecordseries_vincode','custrecordseries_warrantyterm'],
        customrecord_4_integration_queue: ['custrecordunitretailcust_pdi_pigtail','custrecordunitretailcust_pdi_acfunction','custrecordunitretailcustomer_address1','custrecordunitretailcustomer_address2','custrecordunitretailcust_pdi_accesswire','custrecordunitretailcust_pdi_alldoorwind','custrecordunitretailcust_pdi_extlights','custrecordunitretailcust_pdi_allfurn','custrecordunitretailcust_pdi_alllight','custrecordunitretailcust_pdi_lugsnuts','custrecordunitretailcust_pdi_outletfunct','custrecordunitretailcust_pdi_allremotes','custrecordunitretailcust_pdi_softgood','custrecordunitretailcust_pdi_allspeak','custrecordunitretailcust_pdi_wallswitch','custrecordunitretailcust_pdi_appconn','custrecordunitretailcust_pdi_autoreset','custrecordunitretailcust_pdi_awning','custrecordunitretailcust_pdi_axleubolt','custrecordunitretailcust_pdi_baggagedoor','custrecordunitretailcust_pdi_batterytray','custrecordunitretailcust_pdi_blindshade','custrecordunitretailcust_pdi_bottles','custrecordunitretailcust_pdi_breakaway','custrecordunitretailcust_pdi_cabdrawf','custrecordunitretailcust_pdi_cabdoors','custrecordunitretailcust_pdi_paneldef','custrecordunitretailcust_pdi_ceilingpan','custrecordunitretailcustomer_cellphone','custrecordunitretailcust_pdi_chassis','custrecordunitretailcustomer_city','custrecordunitretailcust_pdi_closetrod','custrecordunitretailcust_pdi_cornermold','custrecordunitretailcust_pdi_countertop','custrecordunitretailcustomer_country','custrecordunitretailcust_pdi_couplerpin','custrecordunitretailcustomer_currentcust','custrecordunitretailcustomer_custverific','custrecordcunitretailcustomer_dob','custrecordunitretailcustomer_dealer','custrecordunitretailcustomer_dealsalesrp','custrecordunitretailcustomer_dealreptxt','custrecordunitretailcust_pdi_dinconvert','custrecordunitretailcust_pdi_dinette','custrecordunitretailcust_pdi_drawfunct','custrecordunitretailcust_pdi_dscenter','custrecordunitretailcust_pdi_dsfront','custrecordunitretailcust_pdi_dsrear','custrecordunitretailcustomer_email','custrecordunitretailcust_pdi_endiwc','custrecordunitretailcust_pdi_endtime','custrecordunitretailcust_pdi_entrydoor','custrecordunitretailcust_pdi_extwater','externalid','custrecordunitretailcust_pdi_faucetshow','custrecordunitretailcust_pdi_fedtags','custrecordunitretailcust_pdi_fireext','custrecordunitretailcust_pdi_fireplace','custrecordunitretailcustomer_firstname','custrecordunitretailcust_pdi_flooringmat','custrecordunitretailcust_pdi_floorreg','custrecordunitretailcust_pdi_foldingdoor','custrecordunitretailcust_pdi_furnburn','custrecordunitretailcust_pdi_furnace','custrecordunitretailcust_pdi_fusepanel','custrecordunitretailcust_pdi_genfunction','custrecordunitretailcust_pdi_gfi','custrecordunitretailcust_pdi_grabhandle','custrecordunitretailcust_pdi_gravity','custrecordunitretailcust_pdi_hangers','custrecordunitretailcust_pdi_homestereo','custrecordunitretailcust_pdi_hydraulic','custrecordunitretailcust_pdi_icemaker','isinactive','id','custrecordunitretailcust_pdi_ladder','custrecordunitretailcust_pdi_landinglegs','custrecordunitretailcustomer_lastname','custrecordunitretailcust_pdi_lineconnect','custrecordunitretailcust_pdi_lowpoint','custrecordunitretailcust_pdi_lpco2','custrecordunitretailcust_pdi_bottletray','custrecordunitretailcust_pdi_lpdrop','custrecordunitretailcust_pdi_lplines','custrecordunitretailcust_pdi_lptank','custrecordunitretailcust_pdi_manover','custrecordunitretailcust_pdi_microfunct','custrecordunitretailcustomer_middlename','name','custrecordunitretailcust_pdi_weartotires','custrecordunitretailcust_pdi_damageext','custrecordunitretailcust_pdi_extblack','custrecordunitretailcust_pdi_framedamage','custrecordunitretailcust_pdi_framerust','custrecordunitretailcust_pdi_odscenter','custrecordunitretailcust_pdi_odsfront','custrecordunitretailcust_pdi_odsrear','custrecordunitretailcust_pdi_outlets','owner','custrecordunitretailcust_pdi_passthru','custrecordunitretailcustomer_phone','custrecordunitretailcust_pdi_powercenter','custrecordunitretailcust_pdi_powerdisc','custrecordunitretailcust_pdi_powerfans','custrecordunitretailcust_pdi_radiostereo','custrecordunitretailcust_pdi_rampdoor','custrecordunitretailcust_pdi_rangeoven','custrecordunitretailcust_pdi_rangehood','recordid','custrecordunitretailcust_pdi_reffunct','custrecordunitretailcustomer_registrcvd','custrecordunitretailcust_pdi_regpressure','custrecordunitretailcust_pdi_reservoir','custrecordunitretailcustomer_retailsold','custrecordunitretailcust_pdi_roofattach','custrecordunitretailcust_pdi_roofmolding','custrecordunitretailcust_pdi_roomsfunct','custrecordunitretailcust_pdi_roomsseal','custrecordunitretailcust_pdi_safetychain','scriptid','custrecordunitretailcustomer_dsalesrp2','custrecordunitretailcust_pdi_shelvealign','custrecordunitretailcust_pdi_showertub','custrecordunitretailcust_pdi_showerdoor','custrecordunitretailcust_pdi_showers','custrecordunitretailcust_pdi_skirtmetal','custrecordunitretailcust_pdi_smokedetect','custrecordunitretailcust_pdi_sofaconv','custrecordunitretailcust_pdi_sparetire','custrecordunitretailcustomer_spouse','custrecordunitretailcust_pdi_startiwc','custrecordunitretailcust_pdi_starttime','custrecordunitretailcustomer_state','custrecordunitretailcust_pdi_stateseal','custrecordunitretailcust_pdi_stepsoper','custrecordunitretailcust_pdi_tankmonitor','custrecordunitretailcust_pdi_tanktrans','custrecordunitretailcust_pdi_tankvent','custrecordunitretailcust_pdi_termhandle','custrecordunitretailcust_pdi_termsystem','custrecordunitretailcust_pdi_testloc','custrecordunitretailcust_pdi_thermostat','custrecordunitretailcust_pdi_tirelabel','custrecordunitretailcust_pdi_tirepress','custrecordunitretailcustomer_title','custrecordunitretailcust_pdi_toilet','custrecordunitretailcust_pdi_tvfunction','custrecordunitretailcust_pdi_underbelly','custrecordunitretailcust_pdi_underside','custrecordunitretailcustomer_unit','custrecordunitretailcust_pdi_vcr','custrecordunitretailcust_pdi_wallpandef','custrecordunitretailcust_pdi_wallpanel','custrecordunitretailcust_pdi_watercont','custrecordunitretailcust_pdi_waterbypass','custrecordunitretailcust_pdi_waterheater','custrecordunitretailcust_pdi_waterline','custrecordunitretailcust_pdi_waterpump','custrecordunitretailcust_pdi_windows','custrecordunitretailcust_pdi_winsecure','custrecordunitretailcust_pdi_windtreat','custrecordunitretailcust_pdi_wirebundle','custrecordunitretailcust_pdi_wirelooms','custrecordunitretailcustomer_zipcode'],
        customrecord_3_integration_queue: ['custrecordunit_actualofflinedate','custrecordunit_actualshipweight','custrecordgd_transport_amountbilled','custrecordunit_axleconfiguration','custrecordunit_backlog','custrecordunit_calculatevinnumber','custrecordcustrecordgdcsasealnumber','custrecordunit_currentprodstation','custrecordunit_shipdate','custrecordunit_datecompleted','custrecordgd_transport_datereported','custrecordunit_dealer','custrecordunit_decor','custrecordunit_dispatchdate','custrecordunit_gd_dpu','custrecordunit_extendedwarrantyexp','externalid','custrecordunit_flooringstatus','custrecordunit_freshwatercapacity','custrecordgd_frontwrapcomplete','custrecordunit_gawrallaxles','custrecordunit_gawrsingleaxle','custrecordgd_hasspecialpaint','custrecordgd_incidentreport','custrecordgd_legalcasepending','custrecordgd_unitpaintnotes','custrecordgd_shipping_hold','custrecordgd_totaledunit','custrecordgd_transportationnotes','custrecordgd_transportdamage','custrecordunit_graywatercapacity','custrecordunit_gvwrlbs','custrecordhasopenchangeorders','custrecordunit_hitchweight','isinactive','id','custrecordunit_leftweight','custrecordunit_location','custrecordunit_lpgasweight','custrecordunit_model','custrecordunit_modelyear','name','custrecordnowarranty','custrecordunit_onlinedate','custrecordunit_orderdate','custrecordrvs_originalshipdate','owner','custrecordunit_productioncompletedate','custrecordunit_productionrun','custrecordunit_productionrunbacklog','custrecordunit_status','custrecordunit_psi','custrecordunit_purchaseordernum','custrecordunit_qastatus','recordid','custrecordgd_transport_releasedate','custrecordgd_transport_repairedby','custrecordgd_transport_repairstatus','custrecordunit_reportedtorviadate','custrecordgd_transport_resellstatus','custrecordgd_transport_responsibility','custrecordunit_retailsoldnotregistered','custrecordunit_retailpurchaseddate','custrecordgd_transport_returndate','custrecordunit_rightweight','custrecordunit_rim','custrecordcustrecordgdrvianumber','custrecordunit_salesorder','custrecordunit_salesrep','custrecordunit_salesreptext','custrecordunit_offlinedate','scriptid','custrecordcustrecordgdsealstate1','custrecordcustrecordgdsealstate2','custrecordunit_serialnumber','custrecordunit_series','custrecordunit_shippingstatus','custrecordcustrecordgdstateseal1','custrecordcustrecordgdstateseal2','custrecordunit_systemshold','custrecordunit_tire','custrecordgd_transport_buyback','custrecordunit_transportco','custrecordgd_transport_damage','custrecordgd_transport_case','custrecordgd_transport_notes','custrecordgd_transport_billdiscountamoun','custrecordunit_typeofvehicle','custrecordgd_transport_unitlocation','custrecordunit_uvw','custrecordvinwascalculated','custrecordunit_warrantyexpirationdate','custrecordunit_receiveddate','custrecordunit_wastewatercapacity','custrecordunit_waterheatercapacity','custrecordrvs_weightdiscrepancyreason','custrecordyardnotes'],
        customrecord_18_integration_queue: ['custrecordflatratecode_ninetydaycoverage','custrecordflatratecode_brandreqfordealer','custrecordgdflatratecode_description','externalid','custrecordflatratecode_group','name','isinactive','id','custrecordflatratecode_isrecall','custrecordflatratecode_maincategory','custrecordflatratecode_serialrequired','altname','custrecordflatratecode_description','owner','custrecordflatratecode_partreturn','custrecordflatratecode_photorequired','custrecordflatratecode_par','custrecordflatratecode_recalldate','scriptid','custrecordflatratecode_straighttime','custrecordflatratecode_subcategory','custrecordflatratecodes_timeallowed','custrecordflatratecode_treadcode','custrecordgd_flatratecode_type'],
        customrecord_6_integration_queue: ['custrecordclaim_approveddate','custrecordclaim_approvedlaborrate','custrecordgd_claim_assigneddate','custrecordgd_claim_assignedto','custrecordclaim_claimrequestedtotal','custrecordclaim_claimtotal','custrecordclaim_customername','custrecordclaim_datedroppedoff','custrecordclaim_dateworkcompleted','custrecordclaim_dateworkstarted','custrecordclaim_customer','custrecordclaim_dealernotes','custrecordclaim_dealerrefund','custrecordclaim_dealerstate','custrecordclaim_dealerclaimnumber','custrecordclaim_extendedwarrantyexp','externalid','custrecordgd_createcreditmemomessage','isinactive','id','custrecordnotes','name','custrecordclaim_nowarrantyavailable','custrecordclaim_operationstotal','custrecordgd_claim_origsubmitdate','owner','custrecordclaim_partstotal','custrecordclaim_preauthorization','custrecordclaim_isreadyapproval','custrecordclaim_requestedlabortotal','custrecordclaim_requestedpartstotal','custrecordclaim_requestedshippingtotal','custrecordclaim_requestedsublettotal','custrecordclaim_requestor','custrecordclaim_requestoremail','custrecordclaim_requestorphone','custrecordclaim_retailcustomer','custrecordclaim_retailcustomername','custrecordclaim_retailsoldnotreg','custrecordclaim_retailsolddate','scriptid','custrecordclaim_shippingtotal','custrecordclaim_status','custrecordclaim_sublettotal','custrecordclaim_unit','custrecordclaim_warrantyexpirationdate'],
        customrecord_5_integration_queue :['custrecordgd_approvedby','custrecordgd_approveddate','custrecordpreauth_laborrate','custrecordgd_preauth_assigneddate','custrecordgd_preauth_assignedto','custrecordpreauth_claim','custrecordpreauth_customer','custrecordpreauth_dealernotes','custrecordpreauth_dealerstate','custrecordpreauth_dealerworkorder','custrecordpreauth_decor','custrecordpreauth_workstartdate','custrecordgd_expirationdate','custrecordpreauth_extendedwarrantyexp','externalid','name','isinactive','id','custrecordpreauth_operationstotal','custrecordpreauth_notes','custrecordpreauth_model','custrecordpreauth_modelrecord','custrecordpreauth_modelyear','custrecordmodifiedbyemail','altname','custrecordpreauth_nowarrantyavailable','custrecordgd_preauth_origsubmitdate','owner','custrecordpreauth_partmarkup','custrecordgd_preauthexpirednoclaim','custrecordpreauth_requestedtotal','custrecordpreauth_totalamount','custrecordpreauth_requestedlabortotal','custrecordpreauth_requestedshippingtotal','custrecordpreauth_requestedsublettotal','custrecordpreauth_requestor','custrecordpreauth_requestoremail','custrecordpreauth_requestorphone','custrecordpreauth_retailcustomer','custrecordpreauth_retailcustomername','custrecordpreauth_retailpurchasedate','custrecordpreauth_retailsoldnotreg','custrecordpreauth_returnfaxnumber','scriptid','custrecordpreauth_series','custrecordpreauth_shippingtotal','custrecordpreauth_status','custrecordpreauth_sublettotal','custrecordpreauth_unit','custrecordpreauth_warrantyexpirationdate'], 
        customrecord_11_integration_queue:['custitemrvsadvertisingfee','amortizationperiod','amortizationtemplate','custitemrvsarecompbeingcopied','assetaccount','atpmethod','custitemrvsautogeneratedpartnumber','averagecost','custitemrvsmodelawningsize','custitemrvsmodelaxleconfiguration','custitemrvsmodelaxleweight','binnumbers','overallquantitypricingtype','isfulfillable','custitemrvscategorylevel1','custitemrvscategorylevel2','custitemrvscategorylevel3','custitemchemicals','class','custitem_rfs_capture_outbound_serials','custitemrvscommission','copydescription','correlateditems','costingmethoddisplay','costingmethod','custitemgd_countryoforigin','createexpenseplanson','custreturnvarianceaccount','createddate','deferralaccount','department','description','storedetaileddescription','custitemrvsdiscontinuedecor','custitemrvsdiscontinuedmodel','isonline','displayname','dontshowprice','dropshipexpenseaccount','isdropshipitem','effectivebomcontrol','enforceminqtyinternally','demandmodifier','billexchratevarianceacct','custitemrvs_excludecatax','excludefromsitemap','expenseaccount','expenseamortizationrule','custitemrvsmodelextheight','custitemrvsmodelextlength','custitemrvsextlengthdecimal','custitemrvsmodelextwidth','custitemrvsexteriorcolor','externalid','featureddescription','custitem_rfs_shipping_freightclass','custitemrvsmodelfreshwater','fullname','custitemrvsmodelfurnace','gainlossaccount','custitemrvsmodelgawrallaxles','custitemrvsmodelgawrsingleaxle','custitemgd_byooptionsgroupfield','custitemgd_byooptionstypefield','custitemgd_costforrollup','custitemgd_displaydiscountaslineitem','custitemgd_frontprotectivewrap','custitemgd_isnla','custitemgd_ispaintoption','custitemgd_itemfacets','custitemgd_itemsubfacets','custitemgd_lastdatetimerollupset','custitemgd_mkhaulntowfreightavailable','custitemgd_mklowboyfreightavailable','custitemgd_msrptext','custitemgd_nlalastupdated','custitemgd_nlareplacementitem','custitemgd_overridegawr','custitemgd_overridegawrsa','custitemgd_overridegvwr','custitemgd_overridetirepsi','custitemgd_overridetirerimsize','custitemgd_overridetiresize','custitemgd_pspreferredbin','custitemgd_salesdescriptionsearch','custitemgd_showinbuildyourown','custitemgd_stockunitconv','custitemgd_subseries','custitemgd_unitappliancesupdated','custitemgd_updateunitfields','custitemgd_voc','custitemrvsgefee','generateaccruals','froogleproductfeed','custitemrvsmodelgraywater','custitemrvsmodelgrossncc','custitemrvsmodelgvwrlbs','handlingcost','custitem_rfs_packing_height','custitemrvsmodelhitchweight','isinactive','includechildren','custitem_docupeakuse','custitemrvsincludeinpartsmanual','incomeaccount','id','inventorybalance','custitemgd_iscdlfeeoption','custitemgd_isfurrion','custitemrvsismandatoryforcanada','custitemrvsitem_ismiscellaneous','custitemrvsoption_isspecial','custitemrvsspecialviewingforproduction','custitemgd_itemcomments','storedisplayimage','storedisplaythumbnail','itemid','weight','custitem_rfs_item_labelgroup','lastmodifieddate','lastpurchaseprice','custitem_rfs_packing_length','custitemrvsextlengthexclhitch','custitemrvs_lengthfromkingpin','custitemrvslengthincludinghitch','location','locations','custitemrvsmodellpgascapacitylbs','manufacturer','countryofmanufacture','mpn','buildentireassembly','matchbilltoreceipt','maximumquantity','maxdonationamount','member','metataghtml','minimumquantity','custitemrvsmodelcode','custitemrvsmodeltype','custitemrvsmsomodel','custitemrvsmsrp','custitemrvs_msrplevel','custitemrvsmsrpnotes','custitemrvsneedsapproval','custitemrvsmodelnetncc','nextagcategory','nextagproductfeed','nopricemessage','custitemobsoleteforboms','outofstockbehavior','outofstockmessage','custitemgd_overflow_parts','shippackage','pagetitle','custitemgd_partsbin','isphantom','custitemrvspiecerate','preferredlocation','custitemgd_preferredvendorname','billpricevarianceacct','price','pricinggroup','consumptionunit','purchaseunit','saleunit','stockunit','unitstype','printitems','custitem_rfs_print_labels_at_receipt','custitemrvsproductionnotes','prodpricevarianceacct','prodqtyvarianceacct','purchasedescription','leadtime','cost','fxcost','purchasepricevarianceacct','quantitypricingschedule','billqtyvarianceacct','presentationitem','relateditemsdescription','supplyreplenishmentmethod','custitem_rfs_require_expiration','residual','custitemrvsrestrictsalespersonrole','custitemrvsrimsizeoptional','custitemrvsrolledupcost','custitemrvsrolledupweight','roundupascomponent','custitemrvsruncycle','custitemrvs_hitchmaxweight','custitemrvs_hitchminweight','custitemrvsitemtype','custitemrvs_modelline','custitemrvs_optgrpstandardoption','custitemrvs_usecdlfreight','custitemrvs_uvwmaxweight','custitemrvs_uvwminweight','safetystocklevel','scrapacct','searchkeywords','seasonaldemand','custitemgd_serialnumberdescription','custitemrvsmodelseries','custitemrvsseriesassigned','custitemrvsseriessize','shippingcost','shipindividually','shoppingdotcomcategory','shoppingproductfeed','shopzillacategoryid','shopzillaproductfeed','showdefaultdonationamount','sitecategory','sitemappriority','isspecialorderitem','isspecialworkorderitem','custitemrvsmodelsquarefeet','custitemrvsstandardfeatures','custitemrvsstate','stockdescription','storedescription','storedisplayname','parent','custitemrvssubjecttousetax','subsidiary','subtype','custitemgd_tariffcode','custitemrvstirepsioptional','custitemrvstirepsistd','custitemrvstirerimstd','custitemrvsmodeltiresize','custitemrvstiresoptional','custitemrvstiresstd','totalquantityonhand','totalvalue','transferprice','itemtype','unbuildvarianceaccount','custitemgd_updatetobackoffice','urlcomponent','urlcomponentaliases','parentonly','usebins','usecomponentyield','custitem_rfs_item_prodstaging','usemarginalrates','usernotes','custitemrvsmodeluvwlbs','isdonationitem','receiptamount','receiptquantitydiff','receiptquantity','purchaseorderamount','purchaseorderquantitydiff','purchaseorderquantity','vendorname','custitemgd_vendorpartcodessearchable','vendreturnvarianceaccount','itemvendor','custitemgd_vocconversion','custitemgd_vocunitofmeasure','custitemwarrantyamountlimit','custitemrvsmodelwaste','custitemrvsmodelwaterheater','weightunit','weightunits','custitem_rfs_packing_width','wipacct','wipvarianceacct','yahooproductfeed','custitemrvsmodelyear'],
        customrecord_12_integration_queue: ['accchange','baserecordtype','bassemblychild','binmapchange','consumptionconversionrate','createddate','custitem_docupeakuse','custitemchemicals','custitemgd_costforrollup','custitemgd_displaydiscountaslineitem','custitemgd_iscdlfeeoption','custitemgd_isnla','custitemgd_ispaintoption','custitemgd_salesdescriptionsearch','custitemgd_showinbuildyourown','custitemgd_updateunitfields','custitemgd_voc','custitemrvs_excludecatax','custitemrvsadvertisingfee','custitemrvscommission','custitemrvsdiscontinuedecor','custitemrvsgefee','custitemrvsismandatoryforcanada','custitemrvsitem_ismiscellaneous','custitemrvsitemtype','custitemrvsmsrp','custitemrvsneedsapproval','custitemrvsoption_isspecial','custitemrvspiecerate','custitemrvsrestrictsalespersonrole','custitemrvsspecialviewingforproduction','custitemrvssubjecttousetax','customform','displayname','dontshowprice','enforceminqtyinternally','excludefromsitemap','froogleproductfeed','haschildren','hasparent','id','incomeaccount','internalid','isdonationitem','isfulfillable','isgcocompliant','isinactive','isonline','istaxable','itemid','itemidorig','itemtype','itemtypename','keywordschange','lastmodifieddate','modifiableitemid','nextagproductfeed','offersupport','origbinactive','outofstockbehavior','priceheader','priceheadercount','pricematrixfields','pricequantity1','rectype_1103_7625_maxnkey','rectype_193_1904_maxnkey','rectype_194_1911_maxnkey','rectype_317_3234_maxnkey','rectype_318_3236_maxnkey','rectype_328_3378_maxnkey','rectype_443_4259_maxnkey','rectype_538_5335_maxnkey','saleconversionrate','salesdescription','shipindividually','shoppingproductfeed','shopzillaproductfeed','showdefaultdonationamount','stockdescription','subtype','templatestored','type','unitstypefracconv','unitstypewarningdisplayed','unitswarningdisplayed','usemarginalrates','vendormapchange','version','yahooproductfeed','nsbrowserenv','externalid','customwhence','vendormapcodechange','origparent','storedisplayname','storeDisplayNameOrig','storedescription','storedisplaythumbnail','storedetaileddescription','featureddescription','storedisplayimage','storeitemtemplate','pagetitle','urlcomponent','metataghtml','sitemappriority','searchkeywords','maxdonationamount','nopricemessage','outofstockmessage','relateditemsdescription','relateditemscategory','productfeed','shoppingdotcomcategory','shopzillacategoryid','nextagcategory','custitemrvs_partsorderentryattachment','custitem1','custitemgd_overflow_parts','custitemgd_overridegawr','custitemgd_overridegvwr','custitemgd_overridetirepsi','custitemgd_overridetirerimsize','custitemgd_overridetiresize','custitemgd_overridegawrsa','billingwarn','location','custitemwarrantyamountlimit','custitemrvsseriesassigned','custitemrvsruncycle','department','class','parent','unitstype','saleunit','consumptionunit','baseunit','custitemrvscategorylevel1','custitemrvsproductionnotes','custitemrvsmsrpnotes','custitemrvsstate','custitemrvscategorylevel2','custitemrvscategorylevel3','custitemgd_partsbin','custitemgd_itemcomments','custitemgd_tariffcode','custitemgd_countryoforigin','custitemgd_byooptionsgroupfield','custitemgd_byooptionstypefield','custitemgd_vocconversion','custitemgd_vocunitofmeasure','custitemgd_nlalastupdated','custitemgd_nlareplacementitem','manufacturer','mpn','countryofmanufacture','minimumquantity','minimumquantityunits','maximumquantity','maximumquantityunits','weight','weightunit','weightunits','shippackage','shippingcost','shippingcostunits','handlingcost','handlingcostunits','schedulebnumber','pricinggroup','quantitypricingschedule','overallquantitypricingtype','billpricevarianceacct','billqtyvarianceacct','billexchratevarianceacct','baseprice','onlineprice','pricelevel1','pricelevel2','pricelevel5','pricelevel6','pricelevel7','pricelevel8','pricelevel10','pricelevel11','pricelevel12','pricelevel13','pricelevel14','pricelevel15'],
        customrecord_1_integration_queue: ['accessrole','accesstabchanged','alcoholrecipienttype','altphone','balance','baserecordtype','billaddr1','billaddr2','billaddressee','billattention','billcity','billcountry','billstate','billzip','clickstream','companyname','consolbalance','consoldepositbalance','consoloverduebalance','consolunbilledorders','creditholdoverride','currencyprecision','currid','custentity_esc_annual_revenue','custentity_esc_industry','custentity_esc_last_modified_date','custentity_esc_no_of_employees','custentity_extend_generate_public_upload','custentity_ozlink_bill_shipping_to_3rd','custentity_ozlink_bill_shipping_to_recip','custentity_ozlink_website','custentitygd_defaultdealerlocatoraddrbk','custentitygd_exemptfromdpufee','custentitygd_freightcalculations','custentitygd_fronprotectivewrap','custentitygd_haulandtowfreightcharge','custentitygd_hideindealerlocator','custentitygd_partsshipaddress1','custentitygd_partsshipaddress2','custentitygd_partsshipaddressee','custentitygd_partsshipcity','custentitygd_partsshipcountry','custentitygd_partsshipphone','custentitygd_partsshipstate','custentitygd_partsshipzip','custentitymsoaddress','custentitymsocity','custentitymsocountry','custentitymsozipcode','custentityrvs_cdlfreightcharge','custentityrvs_dealer_unitshippingmethod','custentityrvsapprovedlaborrate','custentityrvscreditdealer','custentityrvscreditdealercreated','custentityrvsdealertype','custentityrvsfreightcalculations','custentityrvsparentdealername','custentityrvspartsfax','custentityrvspo','custentityrvsuseadvertisingfee','custentityrvsusegefinancingfee','custentityrvswash','custentityunitshippingmethod','custentityusemsoaddress','customform','datecreated','defaultaddress','depositbalance','displaysymbol','emailpreference','emailtransactions','endbeforestart','entityid','entitynumber','entitystatus','entitytitle','fax','faxtransactions','fillpassword','firstvisit','freeformstatepref','giveaccess','giveaccesschanged','globalsubscriptionstatus','hasbillingaddress','haschildren','hasparent','hasshipping','hasshippingaddress','id','initiallyOverrideAllowed','isbudgetapproved','isinactive','isjob','isperson','lastmodifieddate','lastvisit','nameorig','negativenumberformat','numberformat','origaccessrole','origbinactive','origgiveaccess','origsubstatus','otherrelationships','overduebalance','overridecurrencyformat','parent','phone','printoncheckas','printtransactions','propagateactivity','receivablesaccount','receivablesacctpref','rectype_1103_7619_maxnkey','rectype_141_1319_maxnkey','referrer','salesrep','sendemail','sessioncountry','shipaddr1','shipaddr2','shipaddressee','shipattention','shipcity','shipcomplete','shipcountry','shippingcarrier','shippingitem','shipstate','shipzip','stage','startdate','submitnext_t','submitnext_y','subsidiary','symbolplacement','taxable','templatestored','terms','type','unbilledorders','unsubscribe','version','visits','weblead','externalid','customwhence','wfinstances','accountnumber','formatsample','newaccesshelp','assignedwebsite','emailloginkey','accesshelp','password','password2','stagename','defaultaddressee','defaultaddrbook','billaddr3','shipaddr3','estimatedbudget','territory','leadsource','campaignevent','campaigncategory','sourcewebsite','keywords','lastpagevisited','custentity_link_name_lsa','custentity_date_lsa','custentity_link_lsa','custentityregionalsalesmanager','custentitygd_lead_latitude','custentitygd_lead_longitude','custentitygd_contact_custombuildinfo','custentityrvsmiles','custentity_extend_public_link_uuid','custentityrvsflooringtype','custentity_ozlink_upsaccount','custentityrvstransportco','custentitygd_vinnumber_contact','custentitygd_salesautomenuoption','custentitygd_contact_workingwithdealer','custentitygd_contact_timeframe','custentitygd_contact_marketingseries','custentitygd_contact_modelyear','custentitygd_contact_marketingmodel','custentitygd_contact_makemodelintersted','custentitygd_customer_dateofbirth','custentitygd_iscurrentowner','custentitycurrentdate','custentitygd_contactsmessage','custentitygd_contact_campingstyle','custentitygd_brochuretwochoice','custentitygd_brochureonechoice','custentityterritory','custentitygd_localdealer_address','custentitygd_verifyemail','custentitygd_dealergroup','custentitygd_dlrlocstateabbreviation','custentitygd_dlrloccountryabbreviation','custentity_flo_employee_permissions','custentity_ns_sc_ext_asu_status','contact','isindividual','salutation','firstname','middlename','lastname','title','url','category','image','defaultorderpriority','custentitygdunitshipmethod','comments','custentitygd_statesealsrequired','custentityrvsproductline','custentitygd_lead_nurt_email1','custentitygd_lead_nurt_email2','custentitygd_lead_nurt_email3','email','custentityrvspartsemail','altemail','mobilephone','homephone','custentitygd_reportingdealergrp','custentitymsoaddress2','custentitymsostate','custentitygd_dlrlocaddress1','custentitygd_dlrlocaddress2','custentitygd_dlrloccity','custentitygd_dlrlocstate','custentitygd_dlrloczipcode','custentitygd_dlrloccountry','custentitygd_dlrlocphone','custentitygd_addresslongitude','custentitygd_addresslatitude','custentitygd_statecomplianceoption','custentityrvstollsandpermits','custentitygd_lowboyfreightcharge','custentitygd_laborrateeffdate','custentityrvsclaimpartsmarkup','reminderdays','pricelevel','creditlimit','custentityrvsimporter','vatregnumber','taxitem','resalenumber','daysoverdue','consoldaysoverdue','prefccprocessor','enddate','custentityrvssecondaryflooringtype','custentityrvspaymentrequest','custentityrvsgeaccountnumber','custentityrvsfees','custentityrvsmso','sendtransactionsvia','custentity_rfs_customer_labelgroup','custentitygd_rvtraderid','custentitygd_localdealer','custentitygd_rvtdealerid','custentity_ozlink_fedexaccount','custentity_ozlink_dhlaccount','custentity_ozlink_email2','custentity_ozlink_email3','custentity_extend_public_upload_link','custentity_extend_files_uploadon_record','custentity_extend_files_entity_file_list','custentity_extend_files_folder_info','salesreadiness','buyingreason','buyingtimeframe'],
        customrecord_2_integration_queue: ["baserecordtype","company","companyid","custentity_esc_last_modified_date","custentitycurrentdate","custentitygd_uni_isactive","custentitygd_uni_role","custentitygd_useforinvoicesubmission","custentityrvsisdealersalesrep","customform","datecreated","defaultaddressee","edition","email","entityid","entitytitle","firstname","freeformstatepref","globalsubscriptionstatus","hasbillingaddress","hasshipping","hasshippingaddress","id","isinactive","isprivate","lastmodifieddate","lastname","nameorig","officephone","oldparent","origsubstatus","otherrelationships","owner","parentcompany","phone","rectype_1103_7603_maxnkey","saved_name","sessioncountry","submitnext_t","submitnext_y","subsidiary","templatestored","type","unsubscribe","version","externalid","customwhence","wfinstances","contactrole","dmodified","isemployee","isindividual","defaultaddrbook","billattention","billaddressee","billaddr1","billaddr2","billaddr3","billcity","billstate","billzip","billcountry","shipattention","shipaddressee","shipaddr1","shipaddr2","shipaddr3","shipcity","shipstate","shipzip","shipcountry","contactcampaignevent","contactsourcecampaigncategory","custentity_link_name_lsa","custentity_date_lsa","custentity_link_lsa","custentitygd_vinnumber_contact","custentitygd_salesautomenuoption","custentitygd_contact_timeframe","custentitygd_contact_marketingseries","custentitygd_contact_modelyear","custentitygd_contact_marketingmodel","custentitygd_contact_makemodelintersted","custentitygd_customer_dateofbirth","custentitygd_iscurrentowner","custentitygd_contactsmessage","custentitygd_contact_campingstyle","custentitygd_brochuretwochoice","custentitygd_brochureonechoice","custentitygd_verifyemail","custentity_flo_employee_permissions","salutation","middlename","title","comments","category","image","altemail","mobilephone","homephone","fax","defaultaddress","custentityrvsvendor","custentitygd_portalaccessdealer","contactsource","supervisor","assistant","supervisorphone","assistantphone"],
        customrecord_7_integration_queue: ["autoname","balance","balanceprimary","balanceprimarycurrency","baserecordtype","billaddr1","billaddressee","billcity","billcountry","billstate","billzip","companyname","contact","creditlimitcurrency","currid","custentity_docupeakuse","custentity_extend_generate_public_upload","custentitygd_printondriversheet","custentityrvsusegefinancingfee","custentityrvsvendor_approvalneeded","custentityrvsvendortype","customform","datecreated","defaultaddress","email","emailpreference","emailtransactions","entityid","entitytitle","faxtransactions","freeformstatepref","globalsubscriptionstatus","hasbillingaddress","haschildren","hasparent","hasshipping","hasshippingaddress","id","is1099eligible","isinactive","isjobresourcevend","isperson","lastmodifieddate","legalname","nameorig","origbinactive","origgiveaccess","origsubstatus","otherrelationships","payablesaccount","phone","printtransactions","rectype_1103_7620_maxnkey","sessioncountry","shipaddr1","shipaddressee","shipcity","shipcountry","shipstate","shipzip","submitnext_t","submitnext_y","subsidiary","taxidnum","templatestored","terms","type","unbilledorders","unbilledordersprimary","unbilledordersprimarycurrency","unsubscribe","version","externalid","customwhence","wfinstances","defaultaddressee","defaultaddrbook","billattention","billaddr2","billaddr3","shipattention","shipaddr2","shipaddr3","custentity_extend_public_link_uuid","custentitygd_verifyemail","custentity_flo_employee_permissions","parent","vendbillmatchkey","origaccessrole","custentitygd_winnabago_vendor","isindividual","salutation","firstname","middlename","lastname","title","url","category","image","comments","custentity_docupeak_sdr_text","altemail","altphone","mobilephone","homephone","fax","accountnumber","expenseaccount","creditlimit","incoterm","defaultvendorpaymentaccount","purchaseorderquantity","purchaseorderamount","purchaseorderquantitydiff","receiptquantity","receiptamount","receiptquantitydiff","workcalendar","printoncheckas","sendtransactionsvia","custentityrvs_vcbvendoremail","custentity_extend_public_upload_link","custentity_extend_files_uploadon_record","custentity_extend_files_entity_file_list","custentity_extend_files_folder_info"],
        customrecord_8_integration_queue: ["baserecordtype","company","companyid","custentity_esc_last_modified_date","custentitycurrentdate","custentitygd_uni_isactive","custentitygd_uni_role","custentitygd_useforinvoicesubmission","custentityrvsisdealersalesrep","customform","datecreated","defaultaddressee","edition","email","entityid","entitytitle","firstname","freeformstatepref","globalsubscriptionstatus","hasbillingaddress","hasshipping","hasshippingaddress","id","isinactive","isprivate","lastmodifieddate","lastname","nameorig","officephone","oldparent","origsubstatus","otherrelationships","owner","parentcompany","phone","rectype_1103_7603_maxnkey","saved_name","sessioncountry","submitnext_t","submitnext_y","subsidiary","templatestored","type","unsubscribe","version","externalid","customwhence","wfinstances","contactrole","dmodified","isemployee","isindividual","defaultaddrbook","billattention","billaddressee","billaddr1","billaddr2","billaddr3","billcity","billstate","billzip","billcountry","shipattention","shipaddressee","shipaddr1","shipaddr2","shipaddr3","shipcity","shipstate","shipzip","shipcountry","contactcampaignevent","contactsourcecampaigncategory","custentity_link_name_lsa","custentity_date_lsa","custentity_link_lsa","custentitygd_vinnumber_contact","custentitygd_salesautomenuoption","custentitygd_contact_timeframe","custentitygd_contact_marketingseries","custentitygd_contact_modelyear","custentitygd_contact_marketingmodel","custentitygd_contact_makemodelintersted","custentitygd_customer_dateofbirth","custentitygd_iscurrentowner","custentitygd_contactsmessage","custentitygd_contact_campingstyle","custentitygd_brochuretwochoice","custentitygd_brochureonechoice","custentitygd_verifyemail","custentity_flo_employee_permissions","salutation","middlename","title","comments","category","image","altemail","mobilephone","homephone","fax","defaultaddress","custentityrvsvendor","custentitygd_portalaccessdealer","contactsource","supervisor","assistant","supervisorphone","assistantphone"],
        customrecord_13_integration_queue: ["custrecordpartsinquiry_unit","id","isinactive","lastmodified","lastmodifiedby","linenumber","owner","ownerid","recordid","rectype","scriptid","templatestored","type","version","externalid","whence","custrecord_upldongranddesignpartsinquiry","custrecord1","custpage_tempfoldername"],
        customrecord_14_integration_queue: ['created','customform','custrecordgd_pcn_ishistorical','custrecordgd_pcn_locations','custrecordgd_pcn_prodmanagerappvl','custrecordgd_pcn_prodmanappvldate','custrecordgd_pcn_serviceappvl','custrecordgd_pcn_serviceappvldate','custrecordgd_pcnchangeimpactslamination','custrecordgd_pcnhot','custrecordgd_pcnmodelyear','custrecordgd_pcnsequence','custrecordgd_pcnsubject','custrecordgd_pcntype','custrecordpcn_selectseriesandmodel','custrecordproductchangenotice_allmodels','custrecordproductchangenotice_allseries','custrecordproductchangenotice_apprvddate','custrecordproductchangenotice_change','custrecordproductchangenotice_engapprdt','custrecordproductchangenotice_engapprvl','custrecordproductchangenotice_models','custrecordproductchangenotice_pltmgrapdt','custrecordproductchangenotice_pltmgrapvl','custrecordproductchangenotice_purchappdt','custrecordproductchangenotice_purchappvl','custrecordproductchangenotice_reqdate','custrecordproductchangenotice_requestby','custrecordproductchangenotice_salesappdt','custrecordproductchangenotice_salesappvl','custrecordproductchangenotice_series','custrecordproductchangenotice_status','custrecordproductchangenotice_ttlcostdif','custrecordproductchangenotice_ttlnewcost','custrecordproductchangenotice_ttlobscost','custrecordproductchangenotice_ttlprevcos','id','isinactive','lastmodified','lastmodifiedby','linenumber','name','owner','ownerid','recordid','rectype','scriptid','type','version','externalid','custrecordgd_pcn_purchcomplete','custrecord_upldonrvsproductchangenotice','custrecordgd_pcnnum','custrecordgd_pcnrejectedreason','custrecordgd_pcn_purchcompletedate','custrecordgd_pcn_plantmanagercomplete','custrecordgd_pcn_plantmngrcompletedate','custrecordgd_pcn_engineeringcomplete','custrecordgd_pcn_engineeringcompletedate','custrecordgd_pcn_salescomplete','custrecordgd_pcn_salescompletedate','custrecordgd_pcn_complete','custrecordgd_pcn_bomcompletedate','custrecordgd_pcn_servicecomplete','custrecordgd_pcn_servicecompletedate','custrecordgd_pcnpresapp','custrecordgd_pcnpresappdt','custrecordgd_pcn_bomappvldate','custrecordgd_pcn_bomapproval','custrecordproductchangenotice_canceldate','custrecordgd_pcn_sendcancelemailtolist','custrecordgd_pcnqcapp','custrecordgd_pcnqcappdt'],
        customrecord_15_integration_queue: ['created','customform','custrecordvcb_billcredit','custrecordvcb_claim','custrecordvcb_freighttotal','custrecordvcb_isreceivedbylippert','custrecordvcb_labortotal','custrecordvcb_partstotal','custrecordvcb_status','custrecordvcb_sublettotal','custrecordvcb_unit','custrecordvcb_vendor','custrecordvcb_vendorchargebacktotal','id','isinactive','lastmodified','lastmodifiedby','linenumber','owner','ownerid','recordid','rectype','scriptid','type','externalid','custrecord_file_upld_rvsvendorchargeback','custrecordvcb_vendoremail','custrecordcustrecordgd_deniedreason','custrecordvcb_reasonforreturn','custrecordgd_vcbtype','custrecordgd_vendorrganumber','custrecordgd_partpickupdate','custrecordvcb_reqlabortotal','custrecordvcb_reqpartstotal','custrecordvcb_reqpartsmarkuptotal','custrecordvcb_reqfreighttotal','custrecordvcb_reqsublettotal','custrecordvcb_reqvcbtotal','custrecordvcb_partsmarkuptotal','custrecordvcb_denvcbtotal'],
        customrecord_16_integration_queue: ['customform','custpage_lockedsrvparts','custpage_srvattrtab','custpage_srvcustlaborrate','custpage_srvfaultcodes','custpage_srvflatratecodes','custpage_srvitemcat1','custpage_srvitemcat2','custpage_srvparts','custpage_srvpaymenttypes','custpage_srvtimeentries','custpage_srvuoms','custpage_srvwarratylaborrate','custpage_techoptions','custpage_timetracked','custrecordsrv_swo_apptdate','custrecordsrv_swo_comments','custrecordsrv_swo_customerpay','custrecordsrv_swo_dateofmanu','custrecordsrv_swo_dealer','custrecordsrv_swo_deliverymethod','custrecordsrv_swo_estrepairtime','custrecordsrv_swo_gdstatus','custrecordsrv_swo_gdunitlocation','custrecordsrv_swo_haskeys','custrecordsrv_swo_isbackhaul','custrecordsrv_swo_isoutsourced','custrecordsrv_swo_location','custrecordsrv_swo_modelyear','custrecordsrv_swo_oplinesko','custrecordsrv_swo_orderwrittenby','custrecordsrv_swo_retailcustphone','custrecordsrv_swo_retailpurchdate','custrecordsrv_swo_retailservdealer','custrecordsrv_swo_servicedealer','custrecordsrv_swo_stage','custrecordsrv_swo_sublettotal','custrecordsrv_swo_totalamount','custrecordsrv_swo_totallabor','custrecordsrv_swo_totalparts','custrecordsrv_swo_totaltax','custrecordsrv_swo_unit','custrecordsrv_swo_unitmodel','custrecordsrv_swo_unitretailcust','custrecordsrv_swo_unitseries','custrecordsrv_swo_warrantypay','id','isinactive','linenumber','name','owner','ownerid','recordid','rectype','scriptid','type','externalid','custrecordsrv_swo_transpocompany','custrecord_file_upld_serviceworkorder','custrecordgd_swo_totalsoverride','custrecordsrv_swo_retailcustdealer','custrecordsrv_swo_custordernum','custrecordsrv_swo_appttype','custrecordsrv_swo_arriveddate','custrecordsrv_swo_expectedcompletedate','custrecordsrv_swo_startdate','custrecordsrv_swo_completedate','custrecordsrv_swo_servicetechs','custrecordsrv_swo_claim','custrecordsrv_swo_warrpartsorder','custrecordsrv_swo_custpartsorder','custrecordsrv_swo_gdcase','custrecordsrv_swo_case','custrecordsrv_swo_reqpickupdate','custrecordsrv_swo_pickuplocation','custrecordsrv_swo_pickupaddress','custrecordsrv_swo_transpocontact','custrecordsrv_swo_reasonforreturn','custrecordsrv_swo_dropofflocation','custrecordsrv_swo_specialinstructions','custrecordsrv_swo_returntolocation','custrecordsrv_swo_outsourcedcompany','custrecordsrv_swo_outsourceddate','custrecordsrv_swo_outsourcercvdate','custrecordsrv_swo_outsourcedinspect','custrecordsrv_swo_outsourcedbill','custpage_srvkodata','custrecordgd_swo_salesforcecasenum'],
        customrecord_17_integration_queue: ['created','customform','custrecordunitappliances_brandname','custrecordunitappliances_modelnumber','custrecordunitappliances_serialnumber','custrecordunitappliances_type','custrecordunitappliances_unit','id','isinactive','lastmodified','lastmodifiedby','linenumber','owner','ownerid','rectype','scriptid','type','externalid','custrecordvendor','custrecordunitappliances_desc'],
		customrecord_19_integration_queue:['id','type','allowemptycards','authcode','authorizedamount','balance','balreadyrefunded','baserecordtype','bfreeifoveractive','billaddr1','billaddr2','billaddr3','billaddress','billaddressee','billaddresslist','billattention','billcity','billcountry','billingaddress2_set','billingaddress_defaultvalue','billingaddress_key','billingaddress_text','billingaddress_type','billisresidential','billphone','billstate','billzip','binclallitemsforfreeshipping','bmaxshipcostactive','bminshipcostactive','bnopostmain','bulk','byweightamt','byweightconvratetolbs','byweightinwholeincr','byweightper','canbeunapproved','canhavestackable','carddataprovided','cardholderauthentication','cardswipe','carrier','ccapproved','ccavsstreetmatch','ccavszipmatch','cccardid','ccexpiredate','cchold','ccholdetails','cciavsmatch','ccispurchasecardbin','ccname','ccnumber','ccpanid','ccprocessaspurchasecard','ccprocessoraccount','ccstreet','ccwasapproved','cczipcode','checkcommitted','checknumber','class','collectedamount','companyid','consolidatebalance','couponcode','createddate','createdfrom','credholdentity','credholdoverride','creditcard','creditcardprocessor','credlim','currency','currencyprecision','currencysymbol','custbody1','custbody_esc_created_date','custbody_esc_last_modified_date','custbody_extend_approval_id','custbody_extend_approval_inline_field','custbody_extend_approval_url','custbody_extend_approval_url_formula','custbody_extend_display_aut_hidden','custbody_extend_external_uuid','custbody_extend_file_picker','custbody_extend_files_aut_records','custbody_extend_files_folder_info','custbody_extend_files_uploadon_record','custbody_extend_files_uploadon_record2','custbody_extend_generate_approval_url','custbody_extend_generate_public_upload','custbody_extend_multi_file_picker_json','custbody_extend_multiple_file_picker','custbody_extend_public_upload_link','custbody_extend_public_upload_url','custbody_extend_so_file_list','custbody_extend_uploaded_files_details','custbody_me_invlink_statement_ref','custbody_mes_ach_auth_type','custbody_mes_actual_depositdate','custbody_mes_anticipated_depositdate','custbody_mes_cs_meta','custbody_mes_deposit_created','custbody_mes_depost_reference','custbody_mes_dflt_cardswipe_pay_meth','custbody_mes_inv_quote_logic_ovr','custbody_mes_invl_config','custbody_mes_invl_end_customer_link','custbody_mes_invl_externalid','custbody_mes_invl_guid','custbody_mes_invl_hpp_link','custbody_mes_invl_location_zip','custbody_mes_invl_postback_link','custbody_mes_invl_related_tran','custbody_mes_invl_sendto_invl','custbody_mes_invl_sys_notes','custbody_mes_invl_track_num','custbody_mes_invl_uuid','custbody_mes_invlcf_disp_req_rsl_alert','custbody_mes_pi_pcs_ccmask','custbody_mes_pi_pcs_swped_data','custbody_mes_reconciliation_complete','custbody_mes_settlement_amount','custbody_mes_settlement_batch','custbody_mes_settlement_date','custbody_mes_settlement_discrepancy','custbody_ozlink_bill_shipping_to_3rd','custbody_ozlink_bill_shipping_to_recip','custbody_ozlink_dhlaccount','custbody_ozlink_email2','custbody_ozlink_email3','custbody_ozlink_fedexaccount','custbody_ozlink_upsaccount','custbody_ozlink_websitelink','custbody_rfs_order_score','custbody_rfs_picker','custbody_rfs_shipping_services','custbody_sps_tsetpurposecode','custbodycreatedfromvcbnumber','custbodygd_buildrequired','custbodygd_byocustomeremail','custbodygd_byocustomername','custbodygd_byocustomerphone','custbodygd_byocustomerzipcode','custbodygd_byoproductlinedealer','custbodygd_byostockdealer','custbodygd_completediscountsalesgood','custbodygd_completediscountservicegood','custbodygd_dealercomments','custbodygd_dealerfrontprotectwrapoptn','custbodygd_dealerportal_unithelp','custbodygd_dealerportalmemo','custbodygd_dealerportalponumber','custbodygd_dealerportalrequester','custbodygd_fileattachdropbox','custbodygd_flooringamountrequested','custbodygd_invoicenumber','custbodygd_invoicesubmissionemail','custbodygd_modelfrontprotectwrapoptn','custbodygd_optionoverridingunitfields','custbodygd_other_invoice_emails','custbodygd_paintnotes','custbodygd_reorderreasonbody','custbodygd_reprintrequired','custbodygd_retailcustemail','custbodygd_retaildropship','custbodygd_retauthdispose','custbodygd_retauthfilefoldername','custbodygd_retauthhold30days','custbodygd_retauthrequirementslist','custbodygd_retauthreturn','custbodygd_salesnotes','custbodygd_salesorderoptionlist','custbodygd_ship_hold_message','custbodygd_shiptophone','custbodygd_submitinvoicetoflooringbank','custbodygd_transactionstatusqv','custbodygd_unitonlinedate','custbodygd_unitscheduledofflinedate','custbodygd_usehaulandtowfreight','custbodygd_uselowboyfreight','custbodygd_weborder_billaddr1','custbodygd_weborder_billaddr2','custbodygd_weborder_billaddressee','custbodygd_weborder_billcity','custbodygd_weborder_billcountry','custbodygd_weborder_billphone','custbodygd_weborder_billstate','custbodygd_weborder_billzip','custbodygd_weborder_shipaddr1','custbodygd_weborder_shipaddr2','custbodygd_weborder_shipaddressee','custbodygd_weborder_shipcity','custbodygd_weborder_shipcountry','custbodygd_weborder_shipphone','custbodygd_weborder_shipstate','custbodygd_weborder_shipzip','custbodygd_webpartsorder_shipvia','custbodygd_websiteportalhiddenvin','custbodygdunitshippingmethodtran','custbodyincludedestinationchargemsrp','custbodyintegrationstatus','custbodymes_card_present','custbodymes_loading_animation','custbodymsoaddress','custbodymsoaddress2','custbodymsocity','custbodymsocountry','custbodymsostate','custbodymsozipcode','custbodypartsinquirynumber','custbodyrvs_buybackgenerated','custbodyrvs_canadianordertaxtempdata','custbodyrvs_configunitorderbtn','custbodyrvs_configunitorderhtml','custbodyrvs_createdfrombuyback','custbodyrvs_lockunitorderpopup','custbodyrvs_salesorder_gsttotal','custbodyrvs_salesorder_hsttotal','custbodyrvs_salesorder_psttotal','custbodyrvs_webstorepo','custbodyrvsactiontype','custbodyrvsadvertisingfee','custbodyrvsallowdecorlineitemedit','custbodyrvsallowdeletelineitems','custbodyrvscreatedfromclaim','custbodyrvscreatedfromspiff','custbodyrvscreditmemotype','custbodyrvsdatefloorplanapproved','custbodyrvsdateposubmitted','custbodyrvsdatesubmittedtoflooringco','custbodyrvsdealeraddress','custbodyrvsdealercontactemail','custbodyrvsdealercontacts','custbodyrvsdealeremail','custbodyrvsdealerfax','custbodyrvsdealerorderdate','custbodyrvsdealerphone','custbodyrvsdealerpricelevel','custbodyrvsdecor','custbodyrvsdriversheetnotes','custbodyrvsentityprintoncheckas','custbodyrvsfees','custbodyrvsflooringapprovalnumber','custbodyrvsflooringtype','custbodyrvsgeaccountnumber','custbodyrvsgefinancingfee','custbodyrvshaschangeorders','custbodyrvshotunit','custbodyrvsimporter','custbodyrvsisexternalpartweborder','custbodyrvsmodel','custbodyrvsmodelstandardfeatures','custbodyrvsmso','custbodyrvsmsrppricelevel','custbodyrvsmsrprate','custbodyrvsnoshippingcharge','custbodyrvsnot48hourrule','custbodyrvsoptionsheader','custbodyrvsoptionshtml','custbodyrvsordercopiedfrom','custbodyrvsordertype','custbodyrvspacketcomplete','custbodyrvspartsneedloaded','custbodyrvspartsnotes','custbodyrvsparttype','custbodyrvspaymentrequest','custbodyrvspo','custbodyrvspreauthorization','custbodyrvspreviousdecorid','custbodyrvsproductionnotes','custbodyrvsresend','custbodyrvsretailsoldname','custbodyrvssalesorder_isspecial','custbodyrvsseries','custbodyrvsshippingnotes','custbodyrvsshiptocustomer','custbodyrvsspecialviewingforproduction','custbodyrvstobeprinted','custbodyrvstransportco','custbodyrvsunit','custbodyrvsunitmodel','custbodyrvsunitonlinedate','custbodyrvsunitordernextrevisionnumber','custbodyrvsunitproductionrun','custbodyrvsunitscheduledofflinedate','custbodyrvsunitserialnumber','custbodyrvsunitseries','custbodyrvsuseadvertisingfee','custbodyrvsusegefinancingfee','custbodysrv_serviceworkorder','custbodyvendoraddress','custbodywebordershipvia','custcurrep','customercode','customform','customwhence','custpagervs_alldecors','custpagervs_allmodels','custpagervs_allseries','custpagervs_userissalesmanager','datafromredirect','datedriven','dbstrantype','debitksn','debitpinblock','defaultaddrbook','defaultaddressee','deletionreason','deletionreasonmemo','department','disablepromotionrecalc','discdays','discountastotal','discountistaxable','discountitem','discountrate','discounttotal','discpct','doshippingrecalc','duedays','edition','email','enddate','entity','entityfieldname','entityname','entryformquerystring','errornotificationsfield','exchangerate','expectedpaymentstatus','externalid','fax','fedexservicename','flatrateamt','fob','getauth','handling_btaxable','handlingbyweightamt','handlingbyweightconvratetolbs','handlingbyweightinwholeincr','handlingbyweightper','handlingflatrateamt','handlingmode','handlingpercentoftotalamt','handlingperitemdefaultprice','hasfedexfreightservice','haslines','ignoreavs','ignoreavsvis','ignorecsc','ignorecscvis','inputauthcode','inputpnrefnum','inputreferencecode','installmentcount','instrumentrequireslineleveldata','integrationid','internalinstrument','inventorydetailuitype','isbasecurrency','isdefaultshippingrequest','iseditbilledtransactionwithpromotion','iseitf81on','isinstallment','islegacypromo','isonlinetransaction','ispaymethundepfunds','ispurchasecard','isrecurringpayment','istaxable','istransformedbill','istransformedtransaction','lastmodifieddate','leadsource','linked','linkedclosedperioddiscounts','linkedrevrecje','linkedtrackingnumbers','location','manualcredithold','maskedcard','memo','merchantprintblock','message','messagesel','methodrequireslineleveldata','mindays','muccpromocodeinstance','nlapiCC','nldept','nlloc','nlrole','nlsub','nluser','noticenotificationsfield','nsapiCT','nsapiFC','nsapiLC','nsapiLI','nsapiPD','nsapiPI','nsapiPS','nsapiRC','nsapiSR','nsapiVD','nsapiVF','nsapiVI','nsapiVL','nsbrowserenv','ntype','oldrevenuecommitment','orderstatus','ordrecvd','originator','origstatus','origtotal','origtotal2','otherrefnum','outputauthcode','outputreferencecode','overallbalance','overallunbilledorders','overridehold','overrideholdchecked','overrideshippingcost','partnerid','paymentcancelable','paymentcardcsc','paymentcustomdata','paymentdeviceid','paymenteventdate','paymenteventholdreason','paymenteventmagiczeroused','paymenteventpurchasedatasent','paymenteventresult','paymenteventtype','paymenteventupdatedby','paymentinstrumentlimit','paymentinstrumenttype','paymentmethod','paymentmethodaccount','paymentmethodfrominstrument','paymentmethodtypeid','paymentoperation','paymentoption','paymentprocessingmode','paymentprocessingprofile','paymentrequestid','paymentsession','paymentsessionamount','paymethacct','paymethtype','percentoftotalamt','peritemdefaultprice','persistedpromocode','persistedterms','pnrefnum','prevdate','previous_billaddresslist','previous_shipaddresslist','prevrep','primarycurrency','primarycurrencyfxrate','profilesupportslineleveldata','promocode','promocodepluginimpl','promodiscount','promotionapplied','recordcreatedby','recordcreateddate','rectype_1103_7621_maxnkey','rectype_197_1922_maxnkey','rectype_207_1989_maxnkey','rectype_239_2162_maxnkey','rectype_423_4145_maxnkey','rectype_454_4517_maxnkey','redirecturl','reimbursedamount','request','response','returntrackingnumbers','returnurl','rfreeifoveramt','rmaxshipcost','rminshipamt','saleseffectivedate','salesrep','selectedtab','shadow_shipaddress','shandlingaccount','shandlingcostfunction','shipaddr1','shipaddr2','shipaddr3','shipaddress','shipaddressee','shipaddresslist','shipattention','shipcity','shipcomplete','shipcountry','shipcountry_insubrecord','shipdate','shipisresidential','shipitemhasfreeshippingitems','shipmethod','shipoverride','shipphone','shipping_btaxable','shipping_cost_function','shipping_rate','shippingaddress2_set','shippingaddress_defaultvalue','shippingaddress_key','shippingaddress_text','shippingaddress_type','shippingcost','shippingcostoverridden','shippingerrormsg','shipstate','shipstate_insubrecord','shipzip','shipzip_insubrecord','shopperprintblock','signaturerequired','source','startdate','status','statusRef','storeorder','subsidiary','subtotal','suppressusereventsandemails','synceventfield','tax_affecting_address_fields_before_recalc','taxamount2override','taxamountoverride','taxitem','taxrate','taxtotal','templatestored','terms','threedstatuscode','threedstatuscodevis','tobeemailed','tobefaxed','tobeprinted','total','trandate','tranid','transactionnumber','trantypepermcheck','unbilledorders','updatedropshiporderqty','usepaymentoption'],
		customrecord_20_integration_queue:['id','type','altshippingcost','balance','balreadyrefunded','baserecordtype','bfreeifoveractive','billaddr1','billaddr2','billaddr3','billaddress','billaddressee','billaddresslist','billattention','billcity','billcountry','billingaddress2_set','billingaddress_defaultvalue','billingaddress_key','billingaddress_text','billingaddress_type','billisresidential','billphone','billstate','billzip','binclallitemsforfreeshipping','bmaxshipcostactive','bminshipcostactive','bulk','byweightamt','byweightconvratetolbs','byweightinwholeincr','byweightper','canhavestackable','carrier','checkcommitted','class','companyid','consolidatebalance','couponcode','createddate','createdfrom','credholdentity','credholdoverride','credlim','currency','currencyprecision','currencysymbol','custbody1','custbody_esc_created_date','custbody_esc_last_modified_date','custbody_extend_approval_id','custbody_extend_approval_inline_field','custbody_extend_approval_url','custbody_extend_approval_url_formula','custbody_extend_display_aut_hidden','custbody_extend_external_uuid','custbody_extend_file_picker','custbody_extend_files_aut_records','custbody_extend_files_folder_info','custbody_extend_files_uploadon_record','custbody_extend_files_uploadon_record2','custbody_extend_generate_approval_url','custbody_extend_generate_public_upload','custbody_extend_multi_file_picker_json','custbody_extend_multiple_file_picker','custbody_extend_public_upload_link','custbody_extend_public_upload_url','custbody_extend_so_file_list','custbody_extend_uploaded_files_details','custbody_me_invlink_statement_ref','custbody_mes_ach_auth_type','custbody_mes_actual_depositdate','custbody_mes_anticipated_depositdate','custbody_mes_cs_meta','custbody_mes_deposit_created','custbody_mes_depost_reference','custbody_mes_dflt_cardswipe_pay_meth','custbody_mes_inv_quote_logic_ovr','custbody_mes_invl_config','custbody_mes_invl_end_customer_link','custbody_mes_invl_externalid','custbody_mes_invl_guid','custbody_mes_invl_hpp_link','custbody_mes_invl_location_zip','custbody_mes_invl_postback_link','custbody_mes_invl_related_tran','custbody_mes_invl_sendto_invl','custbody_mes_invl_sys_notes','custbody_mes_invl_track_num','custbody_mes_invl_uuid','custbody_mes_invlcf_disp_req_rsl_alert','custbody_mes_pi_pcs_ccmask','custbody_mes_pi_pcs_swped_data','custbody_mes_reconciliation_complete','custbody_mes_settlement_amount','custbody_mes_settlement_batch','custbody_mes_settlement_date','custbody_mes_settlement_discrepancy','custbody_ozlink_bill_shipping_to_3rd','custbody_ozlink_bill_shipping_to_recip','custbody_ozlink_dhlaccount','custbody_ozlink_email2','custbody_ozlink_email3','custbody_ozlink_fedexaccount','custbody_ozlink_upsaccount','custbody_ozlink_websitelink','custbody_rfs_order_score','custbody_rfs_picker','custbody_rfs_shipping_services','custbody_sps_tsetpurposecode','custbodycreatedfromvcbnumber','custbodygd_buildrequired','custbodygd_byocustomeremail','custbodygd_byocustomername','custbodygd_byocustomerphone','custbodygd_byocustomerzipcode','custbodygd_byoproductlinedealer','custbodygd_byostockdealer','custbodygd_completediscountsalesgood','custbodygd_completediscountservicegood','custbodygd_dealercomments','custbodygd_dealerfrontprotectwrapoptn','custbodygd_dealerportal_unithelp','custbodygd_dealerportalmemo','custbodygd_dealerportalponumber','custbodygd_dealerportalrequester','custbodygd_fileattachdropbox','custbodygd_flooringamountrequested','custbodygd_invoicenumber','custbodygd_invoicesubmissionemail','custbodygd_modelfrontprotectwrapoptn','custbodygd_optionoverridingunitfields','custbodygd_other_invoice_emails','custbodygd_paintnotes','custbodygd_reorderreasonbody','custbodygd_reprintrequired','custbodygd_retailcustemail','custbodygd_retaildropship','custbodygd_retauthdispose','custbodygd_retauthfilefoldername','custbodygd_retauthhold30days','custbodygd_retauthrequirementslist','custbodygd_retauthreturn','custbodygd_salesnotes','custbodygd_salesorderoptionlist','custbodygd_ship_hold_message','custbodygd_shiptophone','custbodygd_submitinvoicetoflooringbank','custbodygd_transactionstatusqv','custbodygd_unitonlinedate','custbodygd_unitscheduledofflinedate','custbodygd_usehaulandtowfreight','custbodygd_uselowboyfreight','custbodygd_weborder_billaddr1','custbodygd_weborder_billaddr2','custbodygd_weborder_billaddressee','custbodygd_weborder_billcity','custbodygd_weborder_billcountry','custbodygd_weborder_billphone','custbodygd_weborder_billstate','custbodygd_weborder_billzip','custbodygd_weborder_shipaddr1','custbodygd_weborder_shipaddr2','custbodygd_weborder_shipaddressee','custbodygd_weborder_shipcity','custbodygd_weborder_shipcountry','custbodygd_weborder_shipphone','custbodygd_weborder_shipstate','custbodygd_weborder_shipzip','custbodygd_webpartsorder_shipvia','custbodygd_websiteportalhiddenvin','custbodygdunitshippingmethodtran','custbodyincludedestinationchargemsrp','custbodyintegrationstatus','custbodymes_card_present','custbodymes_loading_animation','custbodymsoaddress','custbodymsoaddress2','custbodymsocity','custbodymsocountry','custbodymsostate','custbodymsozipcode','custbodypartsinquirynumber','custbodyrvs_buybackgenerated','custbodyrvs_canadianordertaxtempdata','custbodyrvs_configunitorderbtn','custbodyrvs_configunitorderhtml','custbodyrvs_createdfrombuyback','custbodyrvs_lockunitorderpopup','custbodyrvs_salesorder_gsttotal','custbodyrvs_salesorder_hsttotal','custbodyrvs_salesorder_psttotal','custbodyrvs_webstorepo','custbodyrvsactiontype','custbodyrvsadvertisingfee','custbodyrvsallowdecorlineitemedit','custbodyrvsallowdeletelineitems','custbodyrvscreatedfromclaim','custbodyrvscreatedfromspiff','custbodyrvscreditmemotype','custbodyrvsdatefloorplanapproved','custbodyrvsdateposubmitted','custbodyrvsdatesubmittedtoflooringco','custbodyrvsdealeraddress','custbodyrvsdealercontactemail','custbodyrvsdealercontacts','custbodyrvsdealeremail','custbodyrvsdealerfax','custbodyrvsdealerorderdate','custbodyrvsdealerphone','custbodyrvsdealerpricelevel','custbodyrvsdecor','custbodyrvsdriversheetnotes','custbodyrvsentityprintoncheckas','custbodyrvsfees','custbodyrvsflooringapprovalnumber','custbodyrvsflooringtype','custbodyrvsgeaccountnumber','custbodyrvsgefinancingfee','custbodyrvshaschangeorders','custbodyrvshotunit','custbodyrvsimporter','custbodyrvsisexternalpartweborder','custbodyrvsmodel','custbodyrvsmodelstandardfeatures','custbodyrvsmso','custbodyrvsmsrppricelevel','custbodyrvsmsrprate','custbodyrvsnoshippingcharge','custbodyrvsnot48hourrule','custbodyrvsoptionsheader','custbodyrvsoptionshtml','custbodyrvsordercopiedfrom','custbodyrvsordertype','custbodyrvspacketcomplete','custbodyrvspartsneedloaded','custbodyrvspartsnotes','custbodyrvsparttype','custbodyrvspaymentrequest','custbodyrvspo','custbodyrvspreauthorization','custbodyrvspreviousdecorid','custbodyrvsproductionnotes','custbodyrvsresend','custbodyrvsretailsoldname','custbodyrvssalesorder_isspecial','custbodyrvsseries','custbodyrvsshippingnotes','custbodyrvsshiptocustomer','custbodyrvsspecialviewingforproduction','custbodyrvstobeprinted','custbodyrvstransportco','custbodyrvsunit','custbodyrvsunitmodel','custbodyrvsunitonlinedate','custbodyrvsunitordernextrevisionnumber','custbodyrvsunitproductionrun','custbodyrvsunitscheduledofflinedate','custbodyrvsunitserialnumber','custbodyrvsunitseries','custbodyrvsuseadvertisingfee','custbodyrvsusegefinancingfee','custbodysrv_serviceworkorder','custbodyvendoraddress','custbodywebordershipvia','custcurrep','customform','customwhence','custpage_mes_invl_config_cache','datedriven','dbstrantype','defaultaddrbook','defaultaddressee','deletionreason','deletionreasonmemo','department','disablepromotionrecalc','discdays','discountastotal','discountistaxable','discountitem','discountrate','discounttotal','discpct','doshippingrecalc','duedate','duedays','edition','email','enddate','entity','entityfieldname','entityname','entitystatus','entryformquerystring','errornotificationsfield','exchangerate','expectedclosedate','externalid','fax','fedexservicename','flatrateamt','fob','handling_btaxable','handlingbyweightamt','handlingbyweightconvratetolbs','handlingbyweightinwholeincr','handlingbyweightper','handlingflatrateamt','handlingpercentoftotalamt','handlingperitemdefaultprice','hasfedexfreightservice','haslines','includeinforecast','installmentcount','inventorydetailuitype','isbasecurrency','iseditbilledtransactionwithpromotion','isinstallment','islegacypromo','isonlinetransaction','istaxable','istransformedbill','istransformedtransaction','lastmodifieddate','leadsource','linked','linkedclosedperioddiscounts','linkedrevrecje','linkedtrackingnumbers','location','manualcredithold','memo','message','messagesel','mindays','muccpromocodeinstance','nlapiCC','nldept','nlloc','nlrole','nlsub','nluser','noticenotificationsfield','nsapiCT','nsapiFC','nsapiLC','nsapiLI','nsapiPD','nsapiPI','nsapiPS','nsapiRC','nsapiSR','nsapiVD','nsapiVF','nsapiVI','nsapiVL','nsbrowserenv','ntype','oldrevenuecommitment','originator','origtotal','origtotal2','otherrefnum','overallbalance','overallunbilledorders','partnerid','percentoftotalamt','peritemdefaultprice','persistedpromocode','persistedterms','prevdate','previous_billaddresslist','previous_shipaddresslist','prevrep','primarycurrency','primarycurrencyfxrate','probability','promocode','promocodepluginimpl','promodiscount','promotionapplied','recordcreatedby','recordcreateddate','rectype_1103_7567_maxnkey','rectype_197_1922_maxnkey','rectype_207_1989_maxnkey','rectype_239_2162_maxnkey','rectype_423_4145_maxnkey','rectype_454_4517_maxnkey','returntrackingnumbers','rfreeifoveramt','rmaxshipcost','rminshipamt','salesrep','selectedtab','shadow_shipaddress','shandlingaccount','shandlingcostfunction','shipaddr1','shipaddr2','shipaddr3','shipaddress','shipaddressee','shipaddresslist','shipattention','shipcity','shipcountry','shipcountry_insubrecord','shipdate','shipisresidential','shipitemhasfreeshippingitems','shipmethod','shipoverride','shipphone','shipping_btaxable','shipping_cost_function','shipping_rate','shippingaddress2_set','shippingaddress_defaultvalue','shippingaddress_key','shippingaddress_text','shippingaddress_type','shippingcost','shippingcostoverridden','shippingerrormsg','shipstate','shipstate_insubrecord','shipzip','shipzip_insubrecord','source','startdate','status','statusRef','subsidiary','subtotal','synceventfield','tax_affecting_address_fields_before_recalc','taxamount2override','taxamountoverride','taxitem','taxrate','taxtotal','templatestored','terms','title','tobeemailed','tobefaxed','tobeprinted','total','trackingnumbers','trandate','tranid','transactionnumber','trantypepermcheck','unbilledorders','version','visibletocustomer','voided','warningnotificationsfield','website','weekendpreference']
    }

    function getInputData() {
        var recordType = runtime.getCurrentScript().getParameter('custscript_int_record_type');
        var fieldPrefix = 'custrecord'+ getRecordIndex(recordType);
		
		var pageSize = parseInt(runtime.getCurrentScript().getParameter('custscript_search_result_size'));
		log.debug('pageSize in getInput',pageSize);
		//If page size is empty assiging default value
		if(!pageSize)
		{
			pageSize = 100;
		}
        var queueSearch = search.create({
            type: recordType,
            filters: [fieldPrefix + 'status', 'anyof', 1],
            columns: [
                fieldPrefix + 'recordid',
                fieldPrefix + 'reference'
            ],
        });
		var result = queueSearch.run();//Running a saved search
		var searchResults = [];//Defining array to store search result objects
		var resultslice = result.getRange({start:0,end:pageSize});
		resultslice.forEach(function(slice){
				//Pushing result into Search Result array
				searchResults.push(slice);
			}
		);
		log.debug('searchResults in getInput',searchResults.length);
		return searchResults;
        //return queueSearch;
    }

    function map(context) {
		log.debug("context",context);
        var searchResult = JSON.parse(context.value);
		log.debug("searchResult",searchResult);
        var intRecordType = runtime.getCurrentScript().getParameter('custscript_int_record_type');
        var fieldPrefix = 'custrecord'+ getRecordIndex(intRecordType);

        try {
            var mainRecType = RECORD_TYPE[searchResult.recordType];
            var mainRecId = searchResult.values[fieldPrefix + 'recordid'];
            var apiMethod = searchResult.values[fieldPrefix + 'reference'];
			log.debug("mainRecId="+mainRecId,"apiMethod="+apiMethod);
            var mainRecord = record.load({
                type: mainRecType,
                id: mainRecId
            });

            var reqJson = {};

            var fieldIds = JSON_FIELD_IDS[intRecordType];
            for (var i = 0; i < fieldIds.length; i++) {
                if (fieldIds[i] == 'recordid') {
                    reqJson[fieldIds[i]] = mainRecId;
                } else {
                    var value = '';
                    try {
                        value = getFieldValue(mainRecord, fieldIds[i], mainRecord.getField({ fieldId: fieldIds[i] }).type);
                    } catch (e) {
                        //log.error('Error Field', fieldIds[i]);
                        value = mainRecord.getValue({
                            fieldId: fieldIds[i]
                        });
                    }
                    
                    reqJson[fieldIds[i]] = value;
                }
            }

            log.debug('JSON Data', JSON.stringify(reqJson));

            context.write({
                key: mainRecId,
                value: {int_rec_id: searchResult.id, method : apiMethod, data: reqJson}
            })
        } catch (e) {
            log.audit('Map Error - ' + searchResult.recordType + " : " + searchResult.id, e);
        }
    }

    function reduce(context) {
        var mainRecId = context.key;
        var jsonValues = context.values;
        
        var recordType = runtime.getCurrentScript().getParameter('custscript_int_record_type');
        var fieldPrefix = 'custrecord'+ getRecordIndex(recordType);

        var reqData = JSON.parse(jsonValues[0]);
        try {
            var collectionName = COSMOS_COLLECTION[recordType];
            var cosmosDbId = getDocument(collectionName, mainRecId);
            log.debug('Exist cosmosdb id for ' + mainRecId, cosmosDbId);

            var res = null;
            var intgRecord = record.load({
                type: recordType,
                id: reqData.int_rec_id
            });
            // reqData.method = 'Create';
            // cosmosDbId = '1995425-1';
            // reqData.data.id = cosmosDbId;
            
            if (reqData.method == 'DELETE') {
                if (cosmosDbId) {
                    res = deleteDocument(collectionName, cosmosDbId);
                } else {
                    res = {code: 400, body: "Document is not exist in db."};
                }
            } else {
                // reqData.data.id = reqData.data.id + '-1';
                // createDocument(collectionName, reqData.data);
                
                if (!cosmosDbId) {
                    // reqData.data.externalid = cosmosDbId;
                    res = createDocument(collectionName, reqData.data);
                } else {
                    res = updateDocument(collectionName, cosmosDbId, reqData.data);
                }
            }

            if ([200, 201, 204].indexOf(res.code) >= 0) {  
                intgRecord.setValue({
                    fieldId: fieldPrefix + 'status',
                    value: 5
                });
            } else {
                intgRecord.setValue({
                    fieldId: fieldPrefix + 'status',
                    value: 3
                });
                intgRecord.setValue({
                    fieldId: fieldPrefix + 'errormsg',
                    value: res.body
                });
            }

            intgRecord.save();
        } catch (e) {
            log.error('Error', e);
        }

    }

    function getRecordIndex(recordType) {
        return '_' + recordType.match(/\d+/g)[0] + '_';
    }

    function getFieldValue(rec, fieldId, fieldType) {
        // log.debug('Field Type/Id', fieldType + " / " + fieldId);
        var value = '';
        if (!fieldType) return rec.getValue({
            fieldId: fieldId
        });
    
        switch (fieldType) {
            case 'currency':
                value = Parse.forceFloat(rec.getValue(fieldId));
                break;
            case 'text':
            case 'identifier':
                value = rec.getValue(fieldId);
                break;
            case 'select':
                var id = rec.getValue(fieldId);
                if (!id) {
                    value = null;
                } else {
                    value = {
                        'id': id,
                        'text': rec.getText(fieldId)
                    };
                }
                
                break;
            case 'date':
            case 'datetime':
                value = rec.getValue(fieldId);
                break;
            case 'checkbox':
                value = rec.getValue(fieldId);
                if (value) value = 'Yes';
                if (!value) value = 'No';
                break;
            case 'integer':
                value = Parse.forceInt(rec.getValue(fieldId));
                break;
            default:
                value = rec.getValue(fieldId);
                break
        }
        return value;
    }

    // Cosmost DB Rest API
    function getDocument(colName, docId) {
        var url = 'https://grdv.documents.azure.com:443/dbs/grdv/colls/' + colName + '/docs/' + docId;
        var headerObj = generateAuth(url, 'GET');
        log.debug("Header", JSON.stringify(headerObj));

        var headers = {
            "Accept": "application/json",
            "x-ms-version": "2016-07-11",
            "Authorization": headerObj.authToken,
            "x-ms-date": headerObj.RFC1123time,
            "Content-Type": "application/json",
            "x-ms-documentdb-partitionkey": '["' + docId + '"]'
        };
        var res = https.get({
            url: url,
            headers: headers
        });
        if (res.code == 200) {
            return docId;
        } else {
            return null;
        }
    }

    function createDocument(colName, data) {
        var url = 'https://grdv.documents.azure.com:443/dbs/grdv/colls/' + colName + '/docs';
        var headerObj = generateAuth(url, 'POST');

        var headers = {
            "Accept": "application/json",
            "x-ms-version": "2016-07-11",
            "Authorization": headerObj.authToken,
            "x-ms-date": headerObj.RFC1123time,
            "Content-Type": "application/json",
            "x-ms-documentdb-partitionkey": '["' + data.id + '"]'
        };

        var res = https.post({
            body: JSON.stringify(data),
            url: url,
            headers: headers
        });
        log.debug('Create - Code', res.code);
        log.debug('Create - body', res.body);
        return {code: res.code, body: res.body};
    }

    function updateDocument(colName, cosId, data) {
        var url = 'https://grdv.documents.azure.com:443/dbs/grdv/colls/' + colName + '/docs/' + cosId;
        var headerObj = generateAuth(url, 'PUT');

        var headers = {
            "Accept": "application/json",
            "x-ms-version": "2016-07-11",
            "Authorization": headerObj.authToken,
            "x-ms-date": headerObj.RFC1123time,
            "Content-Type": "application/json",
            "x-ms-documentdb-partitionkey": '["' + cosId + '"]'
        };


        var res = https.put({
            body: JSON.stringify(data),
            url: url,
            headers: headers
        })

        log.debug('Update - Code', res.code);
        log.debug('Update - body', res.body);
        return {code: res.code, body: res.body};
    }

    function deleteDocument(colName, docId) {
        var url = 'https://grdv.documents.azure.com:443/dbs/grdv/colls/' + colName + '/docs/' + docId;
        var headerObj = generateAuth(url, 'DELETE');

        var headers = {
            "Accept": "application/json",
            "x-ms-version": "2016-07-11",
            "Authorization": headerObj.authToken,
            "x-ms-date": headerObj.RFC1123time,
            "x-ms-documentdb-partitionkey": '["' + docId + '"]'
        };

        var res = https.delete({
            url: url,
            headers: headers
        });
        log.debug('Delete - Code', res.code);
        log.debug('Delete - body', res.body);
        return res;
    }

    // CosmosDB Auth
    function generateAuth(urlStr, method) {
        var authJson = {};
        // store our master key for cosmosdb
        var mastKey = 'kkn6enUM7fzs7hA4nYKC0yCvCsabaHxmAoJXdS3OLEC5CWW4cwVkBpKfGoDVG2U2T0mVxrYndwcaACDbcvTFgQ=='

        // store our date as RFC1123 format for the request
        var today = new Date();
        var UTCstring = today.toUTCString();
        authJson["RFC1123time"] = UTCstring;

        // strip the url of the hostname up and leading slash
        var strippedurl = urlStr.replace(new RegExp('^https?://[^/]+/'),'/');

        // push the parts down into an array so we can determine if the call is on a specific item
        // or if it is on a resource (odd would mean a resource, even would mean an item)
        var strippedparts = strippedurl.split("/");
        var truestrippedcount = (strippedparts.length - 1);

        // define resourceId/Type now so we can assign based on the amount of levels
        var resourceId = "";
        var resType = "";

        // its odd (resource request)
        if (truestrippedcount % 2)
        {
            // assign resource type to the last part we found.
            resType = strippedparts[truestrippedcount];
            
            if (truestrippedcount > 1)
            {
                // now pull out the resource id by searching for the last slash and substringing to it.
                var lastPart = strippedurl.lastIndexOf("/");
                resourceId = strippedurl.substring(1,lastPart);
            }
        }
        else // its even (item request on resource)
        {
            // assign resource type to the part before the last we found (last is resource id)
            resType = strippedparts[truestrippedcount - 1];
            // finally remove the leading slash which we used to find the resource if it was
            // only one level deep.
            strippedurl = strippedurl.substring(1);
            // assign our resourceId
            resourceId = strippedurl;
        }

        // assign our verb
        var verb = method.toLowerCase();

        // assign our RFC 1123 date
        var date = UTCstring.toLowerCase();

        // parse our master key out as base64 encoding
        var key = CryptoJS.enc.Base64.parse(mastKey);

        // build up the request text for the signature so can sign it along with the key
        var text = (verb || "").toLowerCase() + "\n" + 
                    (resType || "").toLowerCase() + "\n" + 
                    (resourceId || "") + "\n" + 
                    (date || "").toLowerCase() + "\n" + 
                    "" + "\n";

        // create the signature from build up request text
        var signature = CryptoJS.HmacSHA256(text, key);

        // back to base 64 bits
        var base64Bits = CryptoJS.enc.Base64.stringify(signature);

        // format our authentication token and URI encode it.
        var MasterToken = "master";
        var TokenVersion = "1.0";
        auth = encodeURIComponent("type=" + MasterToken + "&ver=" + TokenVersion + "&sig=" + base64Bits);

        // set our auth token enviornmental variable.
        authJson['authToken'] = auth;

        return authJson;
    }

    var Parse = {
        forceFloat: function (stValue) {
            var flValue = parseFloat(stValue);
    
            if (isNaN(flValue)) {
                return 0.00;
            }
    
            return parseFloat(flValue.toFixed(2));
        },
        forceInt: function (stValue) {
            var intValue = parseInt(stValue);
    
            if (isNaN(intValue) || (stValue == Infinity)) {
                return 0;
            }
    
            return intValue;
        },
    };

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce
    }
});