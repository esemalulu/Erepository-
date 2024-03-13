/******************************************************************************************************
	Script Name - AVA_TaxLibrary.js
	Company -     Avalara Technologies Pvt Ltd.
******************************************************************************************************/

/**
* @NApiVersion 2.0
* @NModuleScope Public
*/

define(['N/runtime', 'N/log', 'N/search', 'N/url', 'N/record', 'N/error', 'N/https', 'N/format', './AVA_Library', './r7.avalara.library'],
	function(runtime, log, search, url, record, error, https, format, ava_library, r7){
		var exchangeRate = 1, AVA_SubCurrency, AVA_InitTaxCall, AVA_FieldChangeTaxCall, AVA_InitFlag = 0;
		var AVA_EditionChecked = 0, AVA_AdjustmentLineCnt, AVA_TempDocCode, AVA_BillableTimeArr, AVA_DocNo;
		var AVA_ErrorCode = 0, AVA_ShipCode, AVA_HandlingCode, responseLineTax, BillCostToCust, AvaTax, Transaction;
		var AVA_DefaultTaxCode, AVA_BarcodesFeature, AVA_ConnectorStartTime, AVA_ConnectorEndTime, AVA_LatencyTime = 0;
		var AVA_Def_Addressee, AVA_Def_Addr1, AVA_Def_Addr2, AVA_Def_City, AVA_Def_State, AVA_Def_Zip, AVA_Def_Country;
		var ShippingCode, AVA_CreateFromRecord, AVA_CreatedFromNS_Lines, AVA_ShipToAddress, AVA_LocationDetails, AVA_TriangulationFlag = 0, AVA_FoundVatCountry;
		
		// Array to store lines which are actually sent to service. This array doesn't include Shipping and Handling lines.
		var AVA_TaxRequestLines;//AVA_TaxRequestLines[i][0]=Tab, AVA_TaxRequestLines[i][1]=Item Name, AVA_TaxRequestLines[i][2]=Index, AVA_TaxRequestLines[i][3]=TaxcodeArrayIndex
		
		var AVA_NS_Lines; // Array to store the tab names and the line numbers.
		var BillItemTAmt = 0, BillExpTAmt = 0, BillTimeTAmt = 0; // Fields for the totals in each billable section.
		var BillItemFlag = 'F', BillExpFlag = 'F', BillTimeFlag = 'F'; // Flags to identify if there is atleast an item existing in the tab.
		
		var AVA_ItemInfoArr; // to save item name, UDF1, UDF2,Income account and Taxcode mapping values
		var AVA_ShipToLatitude, AVA_ShipToLongitude, AVA_BillToLatitude, AVA_BillToLongitude;
		var AVA_DocID, AVA_DocCode, AVA_DocDate, AVA_DocStatus, AVA_TaxDate, AVA_TotalAmount, AVA_TotalDiscount, AVA_LandedCost = 0, AVA_GSTTotal = 0, AVA_PSTTotal = 0, AVA_ResultCode, AVA_LineCount = 0;
		var AVA_LineNames, AVA_LineType, AVA_LineAmount, AVA_TaxLines, AVA_TaxCodes, AVA_Taxable, AVA_LineQty, AVA_PickUpFlag, AVA_TaxOverrideFlag, AVA_ShippingAmt, AVA_HandlingAmt, ShipLineCount;
		var AVA_TotalExemption, AVA_TotalTaxable, AVA_TotalTax = 0, AVA_DocumentType, AVA_LocationArray, AVA_TaxcodeArray, AVA_HeaderLocation, AVA_HeaderTaxcode, AVA_MultiShipAddArray, AVA_ShipGroupTaxcodes;
		
		function AVA_TransactionBeforeLoad(context, cForm, ui, transactionRecord, configCache, connectorStartTime){
			try{
				if(configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.search('TaxSvc') != -1){
					var executionContextValue = runtime.executionContext;
					AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', transactionRecord.getValue('nexus_country'));
					
					var executionContext = cForm.addField({
						id: 'custpage_ava_context',
						label: 'Execution Context',
						type: ui.FieldType.TEXT
					});
					executionContext.updateDisplayType({
						displayType: ui.FieldDisplayType.HIDDEN
					});
					executionContext.defaultValue = executionContextValue;
					
					var recordType = cForm.addField({
						id: 'custpage_ava_recordtype',
						label: 'Record Type',
						type: ui.FieldType.TEXT
					});
					recordType.updateDisplayType({
						displayType: ui.FieldDisplayType.HIDDEN
					});
					
					var createdFromRecordId = cForm.addField({
						id: 'custpage_ava_createdfromrecordid',
						label: 'Created from Record id',
						type: ui.FieldType.TEXT
					});
					createdFromRecordId.updateDisplayType({
						displayType: ui.FieldDisplayType.HIDDEN
					});
					
					var createdFromRecordType = cForm.addField({
						id: 'custpage_ava_createdfromrecordtype',
						label: 'Created from Record Type',
						type: ui.FieldType.TEXT
					});
					createdFromRecordType.updateDisplayType({
						displayType: ui.FieldDisplayType.HIDDEN
					});
					
					if(AVA_FoundVatCountry == 1){
						//EVAT fields
						var vatAddresses = cForm.addField({
							id: 'custpage_ava_vataddresses',
							label: 'VAT Addresses',
							type: ui.FieldType.LONGTEXT
						});
						vatAddresses.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						
						var transportList = cForm.addField({
							id: 'custpage_ava_transportlist',
							label: 'Transport',
							type: ui.FieldType.SELECT
						});
						transportList.addSelectOption({
							value : '0',
							text: ''
						});
						transportList.addSelectOption({
							value : '1',
							text: 'None'
						});
						transportList.addSelectOption({
							value : '2',
							text: 'Seller'
						});
						transportList.addSelectOption({
							value : '3',
							text: 'Buyer'
						});
						transportList.addSelectOption({
							value : '4',
							text: 'ThirdPartyForSeller'
						});
						transportList.addSelectOption({
							value : '5',
							text: 'ThirdPartyForBuyer'
						});
						transportList.defaultValue = '0';
						
						if(transactionRecord.getValue('custbody_ava_transport') != null && transactionRecord.getValue('custbody_ava_transport').toString().length > 0){
							transportList.defaultValue = (transactionRecord.getValue('custbody_ava_transport') == 6 || transactionRecord.getValue('custbody_ava_transport') == '' || transactionRecord.getValue('custbody_ava_transport') == ' ') ? '0' : transactionRecord.getValue('custbody_ava_transport').toString();
						}
						
						if(transactionRecord.type == 'salesorder'){
							if(context.type == context.UserEventType.VIEW){
								var entityid = transactionRecord.getValue({
									fieldId: 'entity'
								});
								var purchaseOrderRef = transactionRecord.getValue({
									fieldId: 'custbody_ava_purchaseorder_ref'
								});
								
								if(! AVA_Validation(purchaseOrderRef)){
									cForm.addButton({
										id: 'custpage_button_dropship',
										label: 'Drop Ship Purchase Order',
										functionName: 'AVA_OpenPurchaseOrder(\'' + entityid + '\',\'' + transactionRecord.id + '\')'
									});
								}
							}
						}
					}
					
					if(transactionRecord.type != 'salesorder' || AVA_FoundVatCountry == 0){
						if(cForm.getField('custbody_ava_purchaseorder_ref') != null){
							var purchaseOrderRef = cForm.getField({
								id: 'custbody_ava_purchaseorder_ref'
							});
							purchaseOrderRef.updateDisplayType({
								displayType: ui.FieldDisplayType.HIDDEN
							});
						}
					}
					
					// Field added to check if 'Tax' fields are enabled or not on transaction form - For CONNECT-3696
					var taxFieldFlag = cForm.addField({
						id: 'custpage_ava_taxfieldflag',
						label: 'Tax Fields Flag',
						type: ui.FieldType.CHECKBOX
					});
					taxFieldFlag.updateDisplayType({
						displayType: ui.FieldDisplayType.HIDDEN
					});
					
					// Field to store posting period closed status.
					var postingPeriodStatus = cForm.addField({
						id: 'custpage_ava_postingperiod',
						label: 'Posting Period Status',
						type: ui.FieldType.CHECKBOX
					});
					postingPeriodStatus.updateDisplayType({
						displayType: ui.FieldDisplayType.HIDDEN
					});
					
					if(context.type == context.UserEventType.EDIT && transactionRecord.getValue('postingperiod') != null && transactionRecord.getValue('postingperiod').length > 0){
						var status = search.lookupFields({
							type: search.Type.ACCOUNTING_PERIOD,
							id: transactionRecord.getValue('postingperiod'),
							columns: 'closed'
						});
						postingPeriodStatus.defaultValue = (status.closed == true) ? 'T' : 'F';
					}
					
					var itemSublist = cForm.getSublist({
						id: 'item'
					});
					
					if(executionContextValue == 'USERINTERFACE'){
						if(configCache.AVA_UDF1 == false){
							if(transactionRecord.getSublistField('item', 'custcol_ava_udf1', 0) != null){
								var udf1 = itemSublist.getField({
									id: 'custcol_ava_udf1'
								});
								udf1.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
						}
						
						if(configCache.AVA_UDF2 == false){
							if(transactionRecord.getSublistField('item', 'custcol_ava_udf2', 0) != null){
								var udf2 = itemSublist.getField({
									id: 'custcol_ava_udf2'
								});
								udf2.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
						}
						
						var taxOverrideDate = cForm.getField('custbody_ava_taxoverridedate');
						if(taxOverrideDate != null){
							if(transactionRecord.getValue('custbody_ava_taxdateoverride') == null || transactionRecord.getValue('custbody_ava_taxdateoverride') == false){
								taxOverrideDate.updateDisplayType({
									displayType: ui.FieldDisplayType.DISABLED
								});
							}
						}
						
						if(AVA_FoundVatCountry == 0){
							var middleManVatId = cForm.getField('custbody_ava_vatregno');
							middleManVatId.updateDisplayType({
								displayType: ui.FieldDisplayType.HIDDEN
							});
						}
						
						if(context.type == context.UserEventType.CREATE || context.type == context.UserEventType.COPY){
							if(transactionRecord.getValue('nexus_country') != 'IN'){
								var customerGstIn = cForm.getField('custbody_ava_customergstin');
								if(customerGstIn != null){
									customerGstIn.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_hsncode', 0) != null){
								var hsnCode = itemSublist.getField({
									id: 'custcol_ava_hsncode'
								});
								hsnCode.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_customergstin', 0) != null){
								var customerGstIn = itemSublist.getField({
									id: 'custcol_ava_customergstin'
								});
								customerGstIn.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_cgstrate', 0) != null){
								var cgstRate = itemSublist.getField({
									id: 'custcol_ava_cgstrate'
								});
								cgstRate.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_cgstamt', 0) != null){
								var cgstAmt = itemSublist.getField({
									id: 'custcol_ava_cgstamt'
								});
								cgstAmt.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_sgstrate', 0) != null){
								var sgstRate = itemSublist.getField({
									id: 'custcol_ava_sgstrate'
								});
								sgstRate.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_sgstamt', 0) != null){
								var sgstAmt = itemSublist.getField({
									id: 'custcol_ava_sgstamt'
								});
								sgstAmt.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_igstrate', 0) != null){
								var igstRate = itemSublist.getField({
									id: 'custcol_ava_igstrate'
								});
								igstRate.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_igstamt', 0) != null){
								var igstAmt = itemSublist.getField({
									id: 'custcol_ava_igstamt'
								});
								igstAmt.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_utgstrate', 0) != null){
								var utgstRate = itemSublist.getField({
									id: 'custcol_ava_utgstrate'
								});
								utgstRate.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_utgstamt', 0) != null){
								var utgstAmt = itemSublist.getField({
									id: 'custcol_ava_utgstamt'
								});
								utgstAmt.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_compensationcessrate', 0) != null){
								var compensationCessRate = itemSublist.getField({
									id: 'custcol_ava_compensationcessrate'
								});
								compensationCessRate.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_compensationcessamt', 0) != null){
								var compensationCessAmt = itemSublist.getField({
									id: 'custcol_ava_compensationcessamt'
								});
								compensationCessAmt.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_compulsorycessrate', 0) != null){
								var compulsoryCessRate = itemSublist.getField({
									id: 'custcol_ava_compulsorycessrate'
								});
								compulsoryCessRate.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(transactionRecord.getSublistField('item', 'custcol_ava_compulsorycessamt', 0) != null){
								var compulsoryCessAmt = itemSublist.getField({
									id: 'custcol_ava_compulsorycessamt'
								});
								compulsoryCessAmt.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
						}
						else if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.VIEW){
							var cgstFlag = 0, sgstFlag = 0, igstFlag = 0, utgstFlag = 0, compensationFlag = 0, compulsoryFlag = 0, hsnCode = 0, custGstin = 0;
							
							if(transactionRecord.getValue('nexus_country') == 'IN'){
								for(var i = 0; i < transactionRecord.getLineCount('item'); i++){
									if(hsnCode == 0 && transactionRecord.getSublistValue('item', 'custcol_ava_hsncode', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_hsncode', i).length > 0){
										hsnCode = 1;
									}
									if(custGstin == 0 && transactionRecord.getSublistValue('item', 'custcol_ava_customergstin', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_customergstin', i).length > 0){
										custGstin = 1 ;
									}
									if(cgstFlag == 0 && transactionRecord.getSublistValue('item', 'custcol_ava_cgstrate', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_cgstrate', i).toString().length > 0){
										cgstFlag = 1;
									}
									if(sgstFlag == 0 && transactionRecord.getSublistValue('item', 'custcol_ava_sgstrate', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_sgstrate', i).toString().length > 0){
										sgstFlag = 1;
									}
									if(igstFlag == 0 && transactionRecord.getSublistValue('item', 'custcol_ava_igstrate', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_igstrate', i).toString().length > 0){
										igstFlag = 1;
									}
									if(utgstFlag == 0 && transactionRecord.getSublistValue('item', 'custcol_ava_utgstrate', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_utgstrate', i).toString().length > 0){
										utgstFlag = 1;
									}
									if(compensationFlag == 0 && transactionRecord.getSublistValue('item', 'custcol_ava_compensationcessamt', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_compensationcessamt', i).toString().length > 0){
										compensationFlag = 1;
									}
									if(compulsoryFlag == 0 && transactionRecord.getSublistValue('item', 'custcol_ava_compulsorycessrate', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_compulsorycessrate', i).toString().length > 0){
										compulsoryFlag = 1;
									}
									
									if(cgstFlag == 1 && sgstFlag == 1 && igstFlag == 1 && utgstFlag == 1 && compensationFlag == 1 && compulsoryFlag == 1){
										break;
									}
								}
								
								if(hsnCode == 0){
									var hsnCode = itemSublist.getField({
										id: 'custcol_ava_hsncode'
									});
									hsnCode.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(cgstFlag == 0){
									var cgstRate = itemSublist.getField({
										id: 'custcol_ava_cgstrate'
									});
									cgstRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
									var cgstAmt = itemSublist.getField({
										id: 'custcol_ava_cgstamt'
									});
									cgstAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(sgstFlag == 0){
									var sgstRate = itemSublist.getField({
										id: 'custcol_ava_sgstrate'
									});
									sgstRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
									var sgstAmt = itemSublist.getField({
										id: 'custcol_ava_sgstamt'
									});
									sgstAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(igstFlag == 0){
									var igstRate = itemSublist.getField({
										id: 'custcol_ava_igstrate'
									});
									igstRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
									var igstAmt = itemSublist.getField({
										id: 'custcol_ava_igstamt'
									});
									igstAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(utgstFlag == 0){
									var utgstRate = itemSublist.getField({
										id: 'custcol_ava_utgstrate'
									});
									utgstRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
									var utgstAmt = itemSublist.getField({
										id: 'custcol_ava_utgstamt'
									});
									utgstAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(compensationFlag == 0){
									var compensationCessRate = itemSublist.getField({
										id: 'custcol_ava_compensationcessrate'
									});
									compensationCessRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
									var compensationCessAmt = itemSublist.getField({
										id: 'custcol_ava_compensationcessamt'
									});
									compensationCessAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(compulsoryFlag == 0){
									var compulsoryCessRate = itemSublist.getField({
										id: 'custcol_ava_compulsorycessrate'
									});
									compulsoryCessRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
									var compulsoryCessAmt = itemSublist.getField({
										id: 'custcol_ava_compulsorycessamt'
									});
									compulsoryCessAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
							}
							else{
								var customerGstIn = cForm.getField('custbody_ava_customergstin');
								if(customerGstIn != null){
									customerGstIn.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_customergstin', 0) != null){
									var customerGstIn = itemSublist.getField({
										id: 'custcol_ava_customergstin'
									});
									customerGstIn.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_cgstrate', 0) != null){
									var cgstRate = itemSublist.getField({
										id: 'custcol_ava_cgstrate'
									});
									cgstRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_cgstamt', 0) != null){
									var cgstAmt = itemSublist.getField({
										id: 'custcol_ava_cgstamt'
									});
									cgstAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_sgstrate', 0) != null){
									var sgstRate = itemSublist.getField({
										id: 'custcol_ava_sgstrate'
									});
									sgstRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_sgstamt', 0) != null){
									var sgstAmt = itemSublist.getField({
										id: 'custcol_ava_sgstamt'
									});
									sgstAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_igstrate', 0) != null){
									var igstRate = itemSublist.getField({
										id: 'custcol_ava_igstrate'
									});
									igstRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_igstamt', 0) != null){
									var igstAmt = itemSublist.getField({
										id: 'custcol_ava_igstamt'
									});
									igstAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_utgstrate', 0) != null){
									var utgstRate = itemSublist.getField({
										id: 'custcol_ava_utgstrate'
									});
									utgstRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_utgstamt', 0) != null){
									var utgstAmt = itemSublist.getField({
										id: 'custcol_ava_utgstamt'
									});
									utgstAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_compensationcessrate', 0) != null){
									var compensationCessRate = itemSublist.getField({
										id: 'custcol_ava_compensationcessrate'
									});
									compensationCessRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_compensationcessamt', 0) != null){
									var compensationCessAmt = itemSublist.getField({
										id: 'custcol_ava_compensationcessamt'
									});
									compensationCessAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_compulsorycessrate', 0) != null){
									var compulsoryCessRate = itemSublist.getField({
										id: 'custcol_ava_compulsorycessrate'
									});
									compulsoryCessRate.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
								if(transactionRecord.getSublistField('item', 'custcol_ava_compulsorycessamt', 0) != null){
									var compulsoryCessAmt = itemSublist.getField({
										id: 'custcol_ava_compulsorycessamt'
									});
									compulsoryCessAmt.updateDisplayType({
										displayType: ui.FieldDisplayType.HIDDEN
									});
								}
							}
						}
					}
					
					var docTaxCode = 'T';
					if(cForm.getField('taxitem') == null){
						docTaxCode = 'F';
					}
					
					if(docTaxCode == 'F'  && transactionRecord.getSublistField('item', 'taxcode', 0) == null){
						docTaxCode = 'F';
					}
					else{
						docTaxCode = 'T';
					}
					
					// Fix for CONNECT-3696 
					taxFieldFlag.defaultValue = docTaxCode;
					
					if(docTaxCode == 'T'){
						if(configCache.AVA_EntityUseCode == true){
							var entityUseCode = cForm.addField({
								id: 'custpage_ava_usecodeusuage',
								label: 'Entity/Use Code',
								type: ui.FieldType.CHECKBOX
							});
							entityUseCode.updateDisplayType({
								displayType: ui.FieldDisplayType.HIDDEN
							});
						}
						
						var avaExists = cForm.addField({
							id: 'custpage_ava_exists',
							label: 'AVA_Exists',
							type: ui.FieldType.INTEGER
						});
						avaExists.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						avaExists.defaultValue = 0;
						
						var lineLocation = cForm.addField({
							id: 'custpage_ava_lineloc',
							label: 'LineLoc',
							type: ui.FieldType.CHECKBOX
						});
						lineLocation.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						lineLocation.defaultValue = 'F';
						
						if(configCache.AVA_TaxInclude == false){
							if(cForm.getField('custbody_ava_taxinclude') != null){
								var taxInclude = cForm.getField({
									id: 'custbody_ava_taxinclude'
								});
								taxInclude.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							if(cForm.getField('custbody_ava_shippingtaxinclude') != null){
								var shippingTaxInlcude = cForm.getField({
									id: 'custbody_ava_shippingtaxinclude'
								});
								shippingTaxInlcude.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
						}
						else{
							if(transactionRecord.getValue('custbody_ava_taxinclude') == false && executionContextValue == 'USERINTERFACE'){
								var shippingTaxInlcude = cForm.getField({
									id: 'custbody_ava_shippingtaxinclude'
								});
								shippingTaxInlcude.updateDisplayType({
									displayType: ui.FieldDisplayType.DISABLED
								});
							}
						}
						
						if(transactionRecord.type != 'creditmemo' && transactionRecord.type != 'cashrefund' && cForm.getField('custbody_ava_taxcredit') != null){
							var taxCredit = cForm.getField({
								id: 'custbody_ava_taxcredit'
							});
							taxCredit.updateDisplayType({
								displayType: ui.FieldDisplayType.HIDDEN
							});
						}
						
						// Update custpage_ava_lineloc based on form level fields rather than Preferences
						// Check Line level locations first
						if(transactionRecord.getSublistField('item', 'location', 0) != null){
							lineLocation.defaultValue = 'T'; //Line-level locations
						}
						
						var createdFromDate = cForm.addField({
							id: 'custpage_ava_createfromdate',
							label: 'Created From Date',
							type: ui.FieldType.TEXT
						});
						createdFromDate.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						
						if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0){
							var createdDate;
							var cols = new Array();
							cols[0] = 'trandate';
							cols[1] = 'createdfrom';
							cols[2] = 'type';
							if(runtime.isFeatureInEffect('ACCOUNTINGPERIODS') == true && configCache.AVA_UsePostingPeriod == true){
								cols[3] = 'postingperiod';
							}
							
							var createdFrom = search.lookupFields({
								type: search.Type.TRANSACTION,
								id: transactionRecord.getValue('createdfrom'),
								columns: cols
							});
							
							if(createdFrom.type[0].value == 'SalesOrd' || createdFrom.type[0].value == 'RtnAuth'){
								var avaFlag = 'F';
								var filter = new Array();
								filter[0] = search.createFilter({
									name: 'mainline',
									operator: search.Operator.IS,
									values: false
								});
								
								if(createdFrom.type[0].value != 'RtnAuth'){
									filter[1] = search.createFilter({
										name: 'internalid',
										operator: search.Operator.ANYOF,
										values: transactionRecord.getValue('createdfrom')
									});
								}
								else{
									if(createdFrom.createdfrom != null && createdFrom.createdfrom.length > 0){
										createdFromRecordId.defaultValue = createdFrom.createdfrom[0].value;
										filter[1] = search.createFilter({
											name: 'internalid',
											operator: search.Operator.ANYOF,
											values: createdFrom.createdfrom[0].value
										});
									}
									else{
										filter[1] = search.createFilter({
											name: 'internalid',
											operator: search.Operator.ANYOF,
											values: transactionRecord.getValue('createdfrom')
										});
									}
								}
								
								var searchRecord = search.create({
									type: search.Type.TRANSACTION,
									filters: filter,
									columns: ['applyingtransaction', 'type', 'applyinglinktype']
								});
								var searchResult = searchRecord.run();
								searchResult = searchResult.getRange({
									start: 0,
									end: 100
								});
								
								for(var ii=0; searchResult != null && ii < searchResult.length; ii++){
									var createdFromRecType = ((searchResult[ii].getValue('type') == 'CustInvc') ? 'invoice' : ((searchResult[ii].getValue('type') == 'CashSale') ? 'cashsale' : ((searchResult[ii].getValue('type') == 'SalesOrd') ? 'salesorder' : 'returnauthorization')));
									createdFromRecordType.defaultValue = createdFromRecType;
									
									if(searchResult[ii].getValue('type') == 'SalesOrd' && searchResult[ii].getValue('applyinglinktype') == 'OrdBill'){
										if(runtime.isFeatureInEffect('ACCOUNTINGPERIODS') == true && configCache.AVA_UsePostingPeriod == true){
											var postingDate = search.lookupFields({
												type: search.Type.TRANSACTION,
												id: searchResult[ii].getValue('applyingtransaction'),
												columns: 'postingperiod'
											});
											postingDate = postingDate.postingperiod[0].text;
											createdDate = postingDate.substring(4, postingDate.length) + '-' + ava_library.mainFunction('AVA_GetMonthName', postingDate.substring(0, 3)) + '-01';
										}
										else{
											createdDate = search.lookupFields({
												type: search.Type.TRANSACTION,
												id: searchResult[ii].getValue('applyingtransaction'),
												columns: 'trandate'
											});
											createdDate = ava_library.mainFunction('AVA_ConvertDate', createdDate.trandate);
										}
										
										avaFlag = 'T';
										break;
									}
								}
								
								if(avaFlag == 'F'){
									if(createdFrom.createdfrom != null && createdFrom.createdfrom.length > 0){
										if(runtime.isFeatureInEffect('ACCOUNTINGPERIODS') == true && configCache.AVA_UsePostingPeriod == true){
											var postingDate = search.lookupFields({
												type: search.Type.TRANSACTION,
												id: createdFrom.createdfrom[0].value,
												columns: 'postingperiod'
											});
											postingDate = postingDate.postingperiod[0].text;
											createdDate = postingDate.substring(4, postingDate.length) + '-' + ava_library.mainFunction('AVA_GetMonthName', postingDate.substring(0, 3)) + '-01';
										}
										else{
											if(runtime.isFeatureInEffect('ACCOUNTINGPERIODS') == true && configCache.AVA_UsePostingPeriod == true){
												var postingDate = createdFrom.postingperiod[0].text;
												createdDate = postingDate.substring(4, postingDate.length) + '-' + ava_library.mainFunction('AVA_GetMonthName', postingDate.substring(0, 3)) + '-01';
											}
											else{
												createdDate = search.lookupFields({
													type: search.Type.TRANSACTION,
													id: createdFrom.createdfrom[0].value,
													columns: 'trandate'
												});
												createdDate = ava_library.mainFunction('AVA_ConvertDate', createdDate.trandate);
											}
										}
									}
									else{
										if(runtime.isFeatureInEffect('ACCOUNTINGPERIODS') == true && configCache.AVA_UsePostingPeriod == true){
											var postingDate = createdFrom.postingperiod[0].text;
											createdDate = postingDate.substring(4, postingDate.length) + '-' + ava_library.mainFunction('AVA_GetMonthName', postingDate.substring(0, 3)) + '-01';
										}
										else{
											createdDate = ava_library.mainFunction('AVA_ConvertDate', createdFrom.trandate);
										}
									}
								}
							}
							else if(createdFrom.type[0].value == 'CustInvc' || createdFrom.type[0].value == 'CashSale'){
								if(runtime.isFeatureInEffect('ACCOUNTINGPERIODS') == true && configCache.AVA_UsePostingPeriod == true){
									var postingDate = createdFrom.postingperiod[0].text;
									createdDate = postingDate.substring(4, postingDate.length) + '-' + ava_library.mainFunction('AVA_GetMonthName', postingDate.substring(0, 3)) + '-01';
								}
								else{
									createdDate = ava_library.mainFunction('AVA_ConvertDate', createdFrom.trandate);
								}
							}
							else{
								if(createdFrom.createdfrom != null && createdFrom.createdfrom.length > 0){
									createdDate = search.lookupFields({
										type: search.Type.TRANSACTION,
										id: createdFrom.createdfrom[0].value,
										columns: 'trandate'
									});
									createdDate = ava_library.mainFunction('AVA_ConvertDate', createdDate.trandate);
								}
								else{
									createdDate = ava_library.mainFunction('AVA_ConvertDate', createdFrom.trandate);
								}
							}
							
							createdFromDate.defaultValue = createdDate;
							
							if(configCache.AVA_UseInvoiceAddress == true){
								var createdFromRecType = ((createdFrom.type[0].value == 'CustInvc') ? 'invoice' : ((createdFrom.type[0].value == 'CashSale') ? 'cashsale' : ((createdFrom.type[0].value == 'SalesOrd') ? 'salesorder' : 'returnauthorization')));
								recordType.defaultValue = createdFromRecType;
								
								if(transactionRecord.type == 'creditmemo' && transactionRecord.getValue('custpage_ava_createdfromrecordid') != null && transactionRecord.getValue('custpage_ava_createdfromrecordid').length > 0){
									AVA_CreateFromRecord = record.load({
										type: transactionRecord.getValue('custpage_ava_createdfromrecordtype'),
										id: transactionRecord.getValue('custpage_ava_createdfromrecordid')
									});
								}
								else{
									AVA_CreateFromRecord = record.load({
										type: transactionRecord.getValue('custpage_ava_recordtype'),
										id: transactionRecord.getValue('createdfrom')
									});
								}
								
								if(AVA_CreateFromRecord.getSublistField('item','location', 0) != null){
									lineLocation.defaultValue = 'T'; //Line-level locations
								}
								else{
									lineLocation.defaultValue = 'F';
								}
							}
						}
						
						var defTax = cForm.addField({
							id: 'custpage_ava_deftax',
							label: 'Def Tax',
							type: ui.FieldType.TEXT
						});
						defTax.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						
						var defTaxId = cForm.addField({
							id: 'custpage_ava_deftaxid',
							label: 'Def Tax ID',
							type: ui.FieldType.TEXT
						});
						defTaxId.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						
						var taxCodeStatus = cForm.addField({
							id: 'custpage_ava_taxcodestatus',
							label: 'TaxCode Status',
							type: ui.FieldType.INTEGER
						});
						taxCodeStatus.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						taxCodeStatus.defaultValue = 0;
						
						var taxHeaderId = cForm.addField({
							id: 'custpage_ava_headerid',
							label: 'TaxHeader Id',
							type: ui.FieldType.INTEGER
						});
						taxHeaderId.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						
						var avataxDoc = cForm.addField({
							id: 'custpage_ava_document',
							label: 'AvaTax Document',
							type: ui.FieldType.CHECKBOX
						});
						avataxDoc.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						
						var billCostToCust = runtime.isFeatureInEffect('BILLSCOSTS');
						var billCostFeature = cForm.addField({
							id: 'custpage_ava_billcost',
							label: 'Bill Cost Feature',
							type: ui.FieldType.CHECKBOX
						});
						billCostFeature.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						billCostFeature.defaultValue = (billCostToCust == true) ? 'T' : 'F';
						
						var noteMsg = cForm.addField({
							id: 'custpage_ava_notemsg',
							label: 'Note Message',
							type: ui.FieldType.LONGTEXT
						});
						noteMsg.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						
						var beforeLoadConnector = cForm.addField({
							id: 'custpage_ava_beforeloadconnector',
							label: 'BeforeLoad Connector',
							type: ui.FieldType.INTEGER
						});
						beforeLoadConnector.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						beforeLoadConnector.defaultValue = 0;
						
						var clientLatency = cForm.addField({
							id: 'custpage_ava_clientlatency',
							label: 'Client Latency',
							type: ui.FieldType.INTEGER
						});
						clientLatency.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						clientLatency.defaultValue = 0;
						
						var clientConnector = cForm.addField({
							id: 'custpage_ava_clientconnector',
							label: 'Client Connector',
							type: ui.FieldType.INTEGER
						});
						clientConnector.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						clientConnector.defaultValue = 0;
						
						var beforeSubmitLatency = cForm.addField({
							id: 'custpage_ava_beforesubmitlatency',
							label: 'BeforeSubmit Latency',
							type: ui.FieldType.INTEGER
						});
						beforeSubmitLatency.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						beforeSubmitLatency.defaultValue = 0;
						
						var beforeSubmitConnector = cForm.addField({
							id: 'custpage_ava_beforesubmitconnector',
							label: 'BeforeSubmit Connector',
							type: ui.FieldType.INTEGER
						});
						beforeSubmitConnector.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						beforeSubmitConnector.defaultValue = 0;
						
						// Field to store 'Expense Report' Feature value - CONNECT-4033
						var expReportFeature = cForm.addField({
							id: 'custpage_ava_expensereport',
							label: 'Expense Report Feature',
							type: ui.FieldType.CHECKBOX
						});
						expReportFeature.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						expReportFeature.defaultValue = (runtime.isFeatureInEffect('EXPREPORTS') == true) ? 'T' : 'F';
						
						// Fix for CONNECT-4821 & CONNECT-7026
						if(executionContextValue != 'USERINTERFACE' && executionContextValue != 'WEBSTORE' && executionContextValue != 'USEREVENT' && context.type == context.UserEventType.EDIT){
							// Field to store Shipping Address ID
							var shippingAddressId = cForm.addField({
								id: 'custpage_ava_shippingaddressid',
								label: 'Shipping Address ID',
								type: ui.FieldType.TEXT
							});
							shippingAddressId.updateDisplayType({
								displayType: ui.FieldDisplayType.HIDDEN
							});
							shippingAddressId.defaultValue = transactionRecord.getValue('shipaddresslist');
						}
						
						// Field to store Default AvaTax Company Code
						var defCompanyCode = cForm.addField({
							id: 'custpage_ava_defcompcode',
							label: 'Default AvaTax Company Code',
							type: ui.FieldType.TEXT
						});
						defCompanyCode.updateDisplayType({
							displayType: ui.FieldDisplayType.HIDDEN
						});
						
						if(runtime.getCurrentUser().getPreference('CHARGE_FOR_SHIPPING') == true && transactionRecord.type != 'returnauthorization'){
							if(cForm.getField('shipmethod') != null){
								var shippingExists = cForm.addField({
									id: 'custpage_ava_shipping',
									label: 'Shipping Exists',
									type: ui.FieldType.CHECKBOX
								});
								shippingExists.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
								shippingExists.defaultValue = 'T';
							}
							
							if(cForm.getField('taxitem') == null){
								var shipTaxcode = cForm.addField({
									id: 'custpage_ava_shiptaxcode',
									label: 'Ship Tax Code',
									type: ui.FieldType.TEXT
								});
								shipTaxcode.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
						}
						
						if(runtime.getCurrentUser().getPreference('CHARGE_FOR_HANDLING') == true && transactionRecord.type != 'returnauthorization'){
							if(cForm.getField('shipmethod') != null){
								var handlingExists = cForm.addField({
									id: 'custpage_ava_handling',
									label: 'Handling Exists',
									type: ui.FieldType.CHECKBOX
								});
								handlingExists.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
								handlingExists.defaultValue = 'T';
							}
							
							if(cForm.getField('taxitem') == null){
								var handlingTaxcode = cForm.addField({
									id: 'custpage_ava_handlingtaxcode',
									label: 'Handling Tax Code',
									type: ui.FieldType.TEXT
								});
								handlingTaxcode.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
						}
						
						if(billCostToCust == true){
							if(transactionRecord.getSublist('itemcost') == null || transactionRecord.getSublist('expcost') == null || transactionRecord.getSublist('time') == null){
								billCostFeature.defaultValue = 'F';
							}
						}
						
						if(context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT || context.type == context.UserEventType.COPY){
							if(cForm.getField('taxitem') != null){
								var formTaxCode = cForm.addField({
									id: 'custpage_ava_formtaxcode',
									label: 'Form Tax Code',
									type: ui.FieldType.TEXT
								});
								formTaxCode.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							
							if(executionContextValue == 'WEBSTORE'){
								var partnerId = cForm.addField({
									id: 'custpage_ava_partnerid',
									label: 'Partner ID',
									type: ui.FieldType.TEXT
								});
								partnerId.updateDisplayType({
									displayType: ui.FieldDisplayType.HIDDEN
								});
							}
							
							if(configCache.AVA_CalculateonDemand == true){
								cForm.addButton({
									id: 'custpage_ava_calculatetax',
									label: 'Calculate Tax',
									functionName: 'AVA_CalculateOnDemand'
								});
							}
						}
						
						if(configCache.AVA_EnableDiscount == true && (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT || context.type == context.UserEventType.COPY || context.type == context.UserEventType.VIEW)){
							var discountMapping = cForm.addField({
								id: 'custpage_ava_formdiscountmapping',
								label: 'Discount Mapping',
								type: ui.FieldType.SELECT,
								container: 'items'
							});
							discountMapping.addSelectOption({
								value : '0',
								text: 'Gross Amount'
							});
							discountMapping.addSelectOption({
								value : '1',
								text: 'Net Amount'
							});
							
							if(transactionRecord.getValue('custbody_ava_discountmapping') != null && transactionRecord.getValue('custbody_ava_discountmapping').toString().length > 0){
								discountMapping.defaultValue = transactionRecord.getValue('custbody_ava_discountmapping').toString();
							}
							else{
								discountMapping.defaultValue = configCache.AVA_DiscountMapping;
							}
						}
						
						var avaDocType = AVA_RecordType(transactionRecord.type);
						cForm.addTab({
							id: 'custpage_avatab',
							label: 'AvaTax'
						});
						
						if(avaDocType == 'SalesInvoice' || avaDocType == 'ReturnInvoice'){
							AVA_AddAvataxTabDetails(context, cForm, ui, transactionRecord, avaDocType, taxHeaderId);
						}
						
						if(executionContextValue == 'USERINTERFACE'){
							AVA_AddLogsSubList(context, cForm, ui, transactionRecord);
						}
						
						// If transactions are created from New Menu bar.
						if(context.type == context.UserEventType.CREATE && transactionRecord.getValue('entity') != null && transactionRecord.getValue('entity').length > 0){
							taxCodeStatus.defaultValue = 1;
							
							if(executionContextValue == 'WEBSTORE'){
								AVA_GetEntity(transactionRecord);
							}
							
							//Ship-To Address Fields
							if(transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0 && transactionRecord.getValue('shipaddresslist') > 0 && transactionRecord.getValue('custbody_ava_shiptousecode') != null){
								//Check for Entity/Use Code Values from Config and fetch the Entity/Use Code Mapping if any
								if(configCache.AVA_EntityUseCode == true){
									var shipToUseCode = AVA_GetEntityUseCodes(executionContextValue, transactionRecord.getValue('entity'), transactionRecord.getValue('shipaddresslist'), '1');
									if(shipToUseCode != null && shipToUseCode.length > 0){
										transactionRecord.setValue({
											fieldId: 'custbody_ava_shiptousecode',
											value: shipToUseCode,
											ignoreFieldChange: true
										});
									}
								}
								
								//Fetch Lat/Long for Ship-To Address List
								var coordinates = AVA_ReturnCoordinates(transactionRecord.getValue('entity'), transactionRecord.getValue('shipaddresslist'));
								if(coordinates[0] == 1){
									transactionRecord.setValue({
										fieldId: 'custbody_ava_shipto_latitude',
										value: coordinates[1],
										ignoreFieldChange: true
									});
									transactionRecord.setValue({
										fieldId: 'custbody_ava_shipto_longitude',
										value: coordinates[2],
										ignoreFieldChange: true
									});
								}
							}
							
							//Bill-To Address Fields
							if(transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0 && transactionRecord.getValue('billaddresslist') > 0 && transactionRecord.getValue('custbody_ava_billtousecode') != null){
								//Check for Entity/Use Code Values from Config and fetch the Entity/Use Code Mapping if any
								if(configCache.AVA_EntityUseCode == true){
									var useCodeExists = 'F';
									if(transactionRecord.getValue('shipaddresslist') != null && (transactionRecord.getValue('shipaddresslist') == transactionRecord.getValue('billaddresslist'))){
										if(transactionRecord.getValue('custbody_ava_shiptousecode') != null && transactionRecord.getValue('custbody_ava_shiptousecode').length > 0){
											transactionRecord.setValue({
												fieldId: 'custbody_ava_billtousecode',
												value: transactionRecord.getValue('custbody_ava_shiptousecode'),
												ignoreFieldChange: true
											});
											useCodeExists = 'T';
										}
									}
									
									if(useCodeExists == 'F'){
										var billToUseCode = AVA_GetEntityUseCodes(executionContextValue, transactionRecord.getValue('entity'), transactionRecord.getValue('billaddresslist'), '1');
										if(billToUseCode != null && billToUseCode.length > 0){
											transactionRecord.setValue({
												fieldId: 'custbody_ava_billtousecode',
												value: billToUseCode,
												ignoreFieldChange: true
											});
										}
									}
								}
								
								//Fetch Lat/Long for Bill-To Address List
								if(transactionRecord.getValue('custbody_ava_shipto_latitude') != null && transactionRecord.getValue('custbody_ava_shipto_longitude') != null && transactionRecord.getValue('custbody_ava_billto_latitude') != null && transactionRecord.getValue('custbody_ava_billto_longitude') != null){
									var latLong = 'F';
									if(transactionRecord.getValue('shipaddresslist') == transactionRecord.getValue('billaddresslist')){
										if(transactionRecord.getValue('custbody_ava_shipto_latitude').length > 0 && transactionRecord.getValue('custbody_ava_shipto_longitude').length > 0){
											transactionRecord.setValue({
												fieldId: 'custbody_ava_billto_latitude',
												value: transactionRecord.getValue('custbody_ava_shipto_latitude'),
												ignoreFieldChange: true
											});
											transactionRecord.setValue({
												fieldId: 'custbody_ava_billto_longitude',
												value: transactionRecord.getValue('custbody_ava_shipto_longitude'),
												ignoreFieldChange: true
											});
											latLong = 'T';
										}
									}
									
									if(latLong == 'F'){
										var coordinates = AVA_ReturnCoordinates(transactionRecord.getValue('entity'), transactionRecord.getValue('billaddresslist'));
										if(coordinates[0] == 1){
											transactionRecord.setValue({
												fieldId: 'custbody_ava_billto_latitude',
												value: coordinates[1],
												ignoreFieldChange: true
											});
											transactionRecord.setValue({
												fieldId: 'custbody_ava_billto_longitude',
												value: coordinates[2],
												ignoreFieldChange: true
											});
										}
									}
								}
							}
							
							taxCodeStatus.defaultValue = 0;
						}
					}
				}
				
				if(configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.search('AddressSvc') != -1){
					if(configCache.AVA_EnableAddValonTran == true && (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT || context.type == context.UserEventType.COPY)){
						cForm.addButton({
							id: 'custpage_ava_validatebillto',
							label: 'Validate Bill-To Address',
							functionName: 'AVA_ValidateAddress(2)'
						});
						cForm.addButton({
							id: 'custpage_ava_validateshipto',
							label: 'Validate Ship-To Address',
							functionName: 'AVA_ValidateAddress(3)'
						});
					}
				}
				
				if(context.type != context.UserEventType.VIEW && cForm.getField('custpage_ava_beforeloadconnector') != null){
					var connectorEndTime = new Date();
					var connectorTime = connectorEndTime.getTime() - connectorStartTime.getTime();
					var beforeLoadTime = cForm.getField({
						id: 'custpage_ava_beforeloadconnector'
					});
					beforeLoadTime.defaultValue = connectorTime;
				}
			}
			catch(err){
				log.debug({
					title: 'BeforeLoad Try/Catch Error',
					details: err.message
				});
				log.debug({
					title: 'BeforeLoad Try/Catch Error Stack',
					details: err.stack
				});
			}
		}
		
		function AVA_TransactionBeforeSubmit(context, transactionRecord, configCache, subsidiaryCache, connectorStartTime){
			var e1;
			AVA_LineCount = 0;
			
			if(configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.search('TaxSvc') != -1){
				try{
					if(context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT){
						transactionRecord.setValue({
							fieldId: 'custpage_ava_taxcodestatus',
							value: 3,
							ignoreFieldChange: true
						});
						
						if(transactionRecord.getValue('custpage_ava_context') == null || transactionRecord.getValue('custpage_ava_context') == '' || transactionRecord.getValue('custpage_ava_postingperiod') == true || transactionRecord.getValue('custpage_ava_postingperiod') == 'T'){
							// Skip tax call if BeforeLoad event is not triggered or posting period is closed.
							return;
						}
						
						if(transactionRecord.getValue('custbody_ava_taxdateoverride') == true && (transactionRecord.getValue('custbody_ava_taxoverridedate') == null || transactionRecord.getValue('custbody_ava_taxoverridedate').toString().length == 0)){
							transactionRecord.setValue({
								fieldId: 'custpage_ava_document',
								value: false,
								ignoreFieldChange: true
							});
							return;
						}
						
						if(transactionRecord.getValue('custbody_ava_taxoverride') == true){
							// Skip tax call if Tax Override option is checked.
							transactionRecord.setValue({
								fieldId: 'custpage_ava_document',
								value: true,
								ignoreFieldChange: true
							});
							return;
						}
						
						if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK' || transactionRecord.getValue('source') == 'SCIS'){
							if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK'){
								transactionRecord.setValue({
									fieldId: 'custbody_ava_scis_trans_flag',
									value: true,
									ignoreFieldChange: true
								});
							}
							
							if(transactionRecord.type == 'creditmemo' && transactionRecord.getValue('custbody_ns_pos_created_from') != null && transactionRecord.getValue('custbody_ns_pos_created_from').length > 0){
								var createDate = search.lookupFields({
									type: search.Type.TRANSACTION,
									id: transactionRecord.getValue('custbody_ns_pos_created_from'),
									columns: 'trandate'
								});
								transactionRecord.setValue({
									fieldId: 'custpage_ava_createfromdate',
									value: ava_library.mainFunction('AVA_ConvertDate', createDate.trandate),
									ignoreFieldChange: true
								});
							}
						}
						
						if(transactionRecord.getValue('nexus_country') == 'IN'){
							//GSTin
							var foundGSTIN = '';
							var customerAddressObj = [];
							var shipToAddressId = transactionRecord.getValue('shipaddresslist');
							var tranCustGSTIN = transactionRecord.getValue('custbody_ava_customergstin');
							
							var searchRecord = search.create({
								type: 'customer',
								filters:
									[
										['internalid', 'anyof', transactionRecord.getValue('entity')],
										'and',
										['address.custrecord_ava_customergstin', 'isnotempty', '']
									],
								columns:
									[
										search.createColumn({
											name: 'addressinternalid',
											join: 'Address'
										}),
										search.createColumn({
											name: 'custrecord_ava_customergstin',
											join: 'Address'
										})
									]
							});
							var customerSearchResult = searchRecord.run();
							customerSearchResult = customerSearchResult.getRange({
								start: 0,
								end: 1000
							});
							
							for(var shipToCnt = 0; customerSearchResult != null && shipToCnt < customerSearchResult.length; shipToCnt++){
								var customerAddress = {};
								customerAddress['addressInternalid'] = customerSearchResult[shipToCnt].getValue({
									name: 'addressinternalid',
									join: 'Address'
								});
								customerAddress['shipToGstin'] = customerSearchResult[shipToCnt].getValue({
									name: 'custrecord_ava_customergstin',
									join: 'Address'
								});
								customerAddressObj.push(customerAddress);
							}
							
							if(shipToAddressId != '' && shipToAddressId != null){
								customerAddressObj.forEach(
									function(jsonObj){
										if(jsonObj['addressInternalid'] == shipToAddressId){
											foundGSTIN = jsonObj['shipToGstin'];
										}
									}
								)
							}
							
							if(tranCustGSTIN != foundGSTIN){
								transactionRecord.setValue({
									fieldId: 'custbody_ava_customergstin',
									value: foundGSTIN,
									ignoreFieldChange: true
								});
							}
							
							if(transactionRecord.getValue('ismultishipto') == true){
								transactionRecord.setValue({
									fieldId: 'custbody_ava_customergstin',
									value: '',
									ignoreFieldChange: true
								});
								
								for(var lineCount = 0; customerSearchResult != null && customerSearchResult.length > 0 && lineCount < transactionRecord.getLineCount('item'); lineCount++){
									foundGSTIN = '';
									var lineShipTo = transactionRecord.getSublistValue('item', 'shipaddress', lineCount);
									var lineGstin = transactionRecord.getSublistValue('item', 'custcol_ava_customergstin', lineCount);
									
									if(lineShipTo != null && lineShipTo != ''){
										customerAddressObj.forEach(
											function(jsonObj){
												if(jsonObj['addressInternalid'] == lineShipTo){
													foundGSTIN = jsonObj['shipToGstin'];
												}
											}
										)

										if(lineGstin != foundGSTIN || lineGstin == null || lineGstin == ''){
											transactionRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'custcol_ava_customergstin',
												line: lineCount,
												value: foundGSTIN
											});
										}
									}
								}
							}
							else{
								for(var lineCount = 0; lineCount < transactionRecord.getLineCount('item'); lineCount++){
									transactionRecord.setSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_customergstin',
										line: lineCount,
										value: ''
									});
								}
							}
							//end GSTin
						}
						
						if(configCache.AVA_EntityUseCode == true){
							transactionRecord.setValue({
								fieldId: 'custpage_ava_usecodeusuage',
								value: true,
								ignoreFieldChange: true
							});
							
							// Fix for CONNECT-4821 & CONNECT-7026. Fetch Entity Use Code from customer master for respective shipping address.
							if(transactionRecord.getValue('custpage_ava_context') != 'USERINTERFACE' && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE' && transactionRecord.getValue('custpage_ava_context') != 'USEREVENT' && context.type == context.UserEventType.EDIT){
								if(transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0 && transactionRecord.getValue('shipaddresslist') > 0 && transactionRecord.getValue('custbody_ava_shiptousecode') != null){
									if(transactionRecord.getValue('shipaddresslist') != transactionRecord.getValue('custpage_ava_shippingaddressid')){
										var shipToUseCode = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getValue('shipaddresslist'), '1');
										if(shipToUseCode != null && shipToUseCode.length > 0){
											transactionRecord.setValue({
												fieldId: 'custbody_ava_shiptousecode',
												value: shipToUseCode,
												ignoreFieldChange: true
											});
										}
										else{
											transactionRecord.setValue({
												fieldId: 'custbody_ava_shiptousecode',
												value: '',
												ignoreFieldChange: true
											});
										}
									}
								}
							}
						}
						
						if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custbody_ava_discountmapping') != null && transactionRecord.getValue('custpage_ava_formdiscountmapping') != null && transactionRecord.getValue('custpage_ava_formdiscountmapping').length > 0){
							transactionRecord.setValue({
								fieldId: 'custbody_ava_discountmapping',
								value: parseInt(transactionRecord.getValue('custpage_ava_formdiscountmapping')),
								ignoreFieldChange: true
							});
						}
						
						if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') == true){
							var discountRate = transactionRecord.getValue('discountrate').toString();
							
							if(discountRate != null && discountRate.indexOf('%') != -1){
								if(transactionRecord.getValue('custbody_ava_discountamount') == null || transactionRecord.getValue('custbody_ava_discountamount').toString().length <= 0){
									// Store original discount amount
									transactionRecord.setValue({
										fieldId: 'custbody_ava_discountamount',
										value: transactionRecord.getValue('discounttotal'),
										ignoreFieldChange: true
									});
								}
							}
						}
						
						//EVAT
						AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', transactionRecord.getValue('nexus_country'));
						
						if(AVA_FoundVatCountry == 1){
							transactionRecord.setValue({
								fieldId: 'custbody_ava_transport',
								value: (transactionRecord.getValue('custpage_ava_transportlist') == null || transactionRecord.getValue('custpage_ava_transportlist') == '0' || transactionRecord.getValue('custpage_ava_transportlist') == '' || transactionRecord.getValue('custpage_ava_transportlist') == ' ') ? 6 : parseInt(transactionRecord.getValue('custpage_ava_transportlist')),
								ignoreFieldChange: true
							});
						}
						
						if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
							if(transactionRecord.type == 'creditmemo' && transactionRecord.getValue('custpage_ava_createdfromrecordid') != null && transactionRecord.getValue('custpage_ava_createdfromrecordid').length > 0){
								AVA_CreateFromRecord = record.load({
									type: transactionRecord.getValue('custpage_ava_createdfromrecordtype'),
									id: transactionRecord.getValue('custpage_ava_createdfromrecordid')
								});
							}
							else{
								AVA_CreateFromRecord = record.load({
									type: transactionRecord.getValue('custpage_ava_recordtype'),
									id: transactionRecord.getValue('createdfrom')
								});
							}
						}
						
						AVA_GetSubsidiaryInfo(transactionRecord, subsidiaryCache);
						
						if(AVA_RequiredFields(transactionRecord, configCache) == 0){
							if(AVA_ItemsTaxLines(transactionRecord, configCache) != false){
								var calculateTax = AVA_CalculateTax(transactionRecord, configCache);
								if(calculateTax == false){
									AVA_LogTaxResponse(transactionRecord, configCache, 'T');
									if(AVA_EvaluateTranAbort(transactionRecord, configCache) == 'T'){
										e1 = error.create({
											message: 'AvaTax - Aborting the save operation due to tax calculation error(s)/incomplete data.',
											name: 'Aborting Save'
										});
										throw e1.message;
									}
								}
								
								transactionRecord.setValue({
									fieldId: 'custpage_ava_document',
									value: true,
									ignoreFieldChange: true
								});
							}
							else{
								AVA_LogTaxResponse(transactionRecord, configCache, 'F');
								transactionRecord.setValue({
									fieldId: 'custpage_ava_document',
									value: false,
									ignoreFieldChange: true
								});
								
								if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK'){
									transactionRecord.setValue({
										fieldId: 'custbody_avalara_status',
										value: 3,
										ignoreFieldChange: true
									});
								}
							}
						}
						else{
							if(AVA_EvaluateTranAbort(transactionRecord, configCache) == 'T' && (AVA_ErrorCode == 12 || AVA_ErrorCode == 14)){
								e1 = error.create({
									message: 'AvaTax - Aborting the save operation due to tax calculation error(s)/incomplete data.',
									name: 'Aborting Save'
								});
								throw e1.message;
							}
							
							if(AVA_ErrorCode != 0 && AVA_ErrorCode != 1 && AVA_ErrorCode != 5 && AVA_ErrorCode != 6 && AVA_ErrorCode != 9 && AVA_ErrorCode != 10 && AVA_ErrorCode != 11 && AVA_ErrorCode != 17 && AVA_ErrorCode != 19 && AVA_ErrorCode != 30 && AVA_ErrorCode != 31){
								//0,1,5,6,9,10,11,17,19,30,31
								if(transactionRecord.getValue('istaxable') != null){
									transactionRecord.setValue({
										fieldId: 'taxrate',
										value: 0,
										ignoreFieldChange: true
									});
								}
								else{
									var canadaFlag = 'F';
									
									if(transactionRecord.getValue('tax2total') != null){
										canadaFlag = 'T';
									}
									
									for(var line = 0 ; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
										var linetype = transactionRecord.getSublistValue({
											sublistId: AVA_NS_Lines[line][0],
											fieldId: 'itemtype',
											line: AVA_NS_Lines[line][1]
										});
										
										if(!(linetype == 'Description' || linetype == 'Subtotal' || linetype == 'Group' || linetype == 'EndGroup' || linetype == 'Discount')){
											// Fix for CONNECT-3519
											transactionRecord.setSublistValue({
												sublistId: AVA_NS_Lines[line][0],
												fieldId: 'taxrate1',
												line: AVA_NS_Lines[line][1],
												value: 0
											});
											
											if(canadaFlag == 'T'){
												transactionRecord.setSublistValue({
													sublistId: AVA_NS_Lines[line][0],
													fieldId: 'taxrate2',
													line: AVA_NS_Lines[line][1],
													value: 0
												});
											}
										}
									}
									
									if(transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false){
										if(transactionRecord.getValue('shippingtax1rate') != null){
											transactionRecord.setValue({
												fieldId: 'shippingtax1rate',
												value: 0,
												ignoreFieldChange: true
											});
										}
										
										if(canadaFlag == 'T' && transactionRecord.getValue('shippingtax2rate') != null){
											transactionRecord.setValue({
												fieldId: 'shippingtax2rate',
												value: 0,
												ignoreFieldChange: true
											});
										}
																
										if(transactionRecord.getValue('handlingtax1rate') != null){
											transactionRecord.setValue({
												fieldId: 'handlingtax1rate',
												value: 0,
												ignoreFieldChange: true
											});
										}
										
										if(canadaFlag == 'T' && transactionRecord.getValue('handlingtax2rate') != null){
											transactionRecord.setValue({
												fieldId: 'handlingtax2rate',
												value: 0,
												ignoreFieldChange: true
											});
										}
									}
								}
								
								AVA_TotalTax = 0;
								AVA_SetDocTotal(transactionRecord, configCache, AVA_RecordType(transactionRecord.type));
							}
							
							if(transactionRecord.getValue('custpage_ava_context') != 'USERINTERFACE'){
								AVA_LogTaxResponse(transactionRecord, configCache, 'F');
								transactionRecord.setValue({
									fieldId: 'custpage_ava_document',
									value: false,
									ignoreFieldChange: true
								});
								
								if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK'){
									transactionRecord.setValue({
										fieldId: 'custbody_avalara_status',
										value: 1,
										ignoreFieldChange: true
									});
								}
							}
						}
						
						if(AVA_ResultCode == 'Success'){
							var connectorEndTime = new Date();
							var connectorTime = (AVA_ConnectorEndTime.getTime() - connectorStartTime.getTime()) + (connectorEndTime.getTime() - AVA_ConnectorStartTime.getTime());
							transactionRecord.setValue({
								fieldId: 'custpage_ava_beforesubmitlatency',
								value: AVA_LatencyTime,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custpage_ava_beforesubmitconnector',
								value: connectorTime,
								ignoreFieldChange: true
							});
							
							if(configCache.AVA_EnableLogEntries == '1'){
								var avaDocType = AVA_RecordType(transactionRecord.type);
								var docCode = (AVA_TempDocCode != null) ? AVA_TempDocCode.toString().substring(0, 50) : '';
								ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + docCode + '~~' + connectorTime + '~~' + AVA_LatencyTime + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Performance' + '~~' + 'Informational' + '~~' + transactionRecord.type + '~~' + 'AVA_TransactionBeforeSubmit' + '~~' + 'CONNECTORMETRICS Type - GETTAX, LineCount - ' + AVA_LineCount + ', DocCode - ' + docCode + ', ConnectorTime - ' + connectorTime + ', LatencyTime - ' + AVA_LatencyTime + '~~' + '' + '~~' + 0 + '~~' + transactionRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + transactionRecord.getValue('custpage_ava_details')));
							}
						}
					}
					
					transactionRecord.setValue({
						fieldId: 'custpage_ava_taxcodestatus',
						value: 1,
						ignoreFieldChange: true
					});
				}
				catch(err){
					if(configCache.AVA_EnableLogEntries == '1'){
						var avaDocType = AVA_RecordType(transactionRecord.type);
						ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + transactionRecord.id + '~~' + '' + '~~' + '' + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Debug' + '~~' + 'Exception' + '~~' + transactionRecord.type + '~~' + 'AVA_TransactionBeforeSubmit' + '~~' + err.message + '~~' + err.stack + '~~' + 0 + '~~' + transactionRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + transactionRecord.getValue('custpage_ava_details')));
					}
					
					log.debug({
						title: 'BeforeSubmit Try/Catch Error',
						details: err.message
					});
					log.debug({
						title: 'BeforeSubmit Try/Catch Error Stack',
						details: err.stack
					});
					
					// Fix for CONNECT-9767
					if(e1 != null && e1.name == 'Aborting Save'){
						e1 = error.create({
							message: 'AvaTax - Aborting the save operation due to tax calculation error(s)/incomplete data.',
							name: 'Aborting Save'
						});
						throw e1.message;
					}
				}
			}
		}
		
		function AVA_TransactionAfterSubmit(context, transactionRecord, configCache, subsidiaryCache, connectorStartTime, details){
			AVA_LineCount = 0;
			
			if(configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.search('TaxSvc') != -1){
				try{
					var avaDoc = 'F', cancelType, cancelStatus;
					transactionRecord.setValue({
						fieldId: 'custpage_ava_taxcodestatus',
						value: 1,
						ignoreFieldChange: true
					});
					
					var avaDocType = AVA_RecordType(transactionRecord.type);
					
					if(transactionRecord.getValue('edition') == 'US' || transactionRecord.getValue('edition') == 'CA'){
						if(transactionRecord.getValue('nexus_country') != 'US' && transactionRecord.getValue('nexus_country') != 'CA'){
							AVA_EditionChecked = 1; // if subsidiary is US/CA and address is not US/CA
						}
					}
					else{
						if(transactionRecord.getValue('nexus_country') == 'US' || transactionRecord.getValue('nexus_country') == 'CA'){
							AVA_EditionChecked = 2; // if subsidiary is UK/AU and address is US/CA
						}
						else{
							AVA_EditionChecked = 3; // if subsidiary is UK/AU and address is not US/CA
						}
					}
					
					if(avaDocType == 'SalesInvoice' || avaDocType == 'ReturnInvoice'){
						var searchRecord = search.create({
							type: search.Type.TRANSACTION,
							filters:
								[
								 	['mainline', 'is', 'T'],
								 	'and',
								 	['memorized', 'is', 'T'],
								 	'and',
								 	['internalid', 'is', transactionRecord.id]
								]
						});
						var searchResult = searchRecord.run();
						searchResult = searchResult.getRange({
							start: 0,
							end: 5
						});
						
						if(searchResult == null || searchResult.length == 0){
							if(transactionRecord.getValue('custpage_ava_docstatus') != 'Cancelled' && (transactionRecord.getValue('custpage_ava_document') == true || transactionRecord.getValue('custpage_ava_document') == 'T')){
								if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
									if(transactionRecord.type == 'creditmemo' && transactionRecord.getValue('custpage_ava_createdfromrecordid') != null && transactionRecord.getValue('custpage_ava_createdfromrecordid').length > 0){
										AVA_CreateFromRecord = record.load({
											type: transactionRecord.getValue('custpage_ava_createdfromrecordtype'),
											id: transactionRecord.getValue('custpage_ava_createdfromrecordid')
										});
									}
									else{
										AVA_CreateFromRecord = record.load({
											type: transactionRecord.getValue('custpage_ava_recordtype'),
											id: transactionRecord.getValue('createdfrom')
										});
									}
								}
								
								AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', transactionRecord.getValue('nexus_country'));
								AVA_GetSubsidiaryInfo(transactionRecord, subsidiaryCache);
								AVA_GetNSLines(transactionRecord, configCache);
								AVA_GetTaxcodes(transactionRecord);
								AVA_ShipToAddress = AVA_GetDestinationAddress(transactionRecord, configCache);
								
								var tempPOS = 0;
								AVA_LocationPOS = 0;
								if(configCache.AVA_DisableLocationCode == false){
									AVA_GetLocations(transactionRecord, configCache);
									
									if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
										if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F') && AVA_CreateFromRecord.getValue('location') != null && AVA_CreateFromRecord.getValue('location').length > 0 && AVA_CreateFromRecord.getValue('custbody_ava_pickup') == true){
											AVA_LocationPOS = 1;
											
											if(AVA_LocationArray != null && AVA_LocationArray.length > 0 && transactionRecord.getValue('ismultishipto') == true){
												tempPOS = 1;
											}
										}
									}
									else{
										if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F') && transactionRecord.getValue('location') != null && transactionRecord.getValue('location').length > 0 && transactionRecord.getValue('custbody_ava_pickup') == true){
											AVA_LocationPOS = 1;
										}
									}
								}
								
								if(AVA_LocationPOS == 0 || tempPOS == 1){
									AVA_GetMultiShipAddr(transactionRecord, configCache);
								}
								
								if(AVA_ItemsTaxLines(transactionRecord, configCache) != false){
									avaDoc = 'T';
									var docNo = search.lookupFields({
										type: search.Type.TRANSACTION,
										id: transactionRecord.id,
										columns: 'tranid'
									});
									AVA_DocNo = docNo.tranid;
								}
								else{
									avaDoc = 'F';
								}
							}
							
							if(context.type == context.UserEventType.CREATE && avaDoc == 'T'){
								if(runtime.getCurrentUser().getPreference('CUSTOMAPPROVALCUSTINVC') == true && configCache.AVA_CommitTransaction == true && transactionRecord.type == 'invoice' && (transactionRecord.getValue('approvalstatus') == 1 || transactionRecord.getValue('approvalstatus') == 3)){
									AVA_LogTaxResponse(transactionRecord, configCache, 'F');
									return;
								}
								
								if(AVA_CalculateTax(transactionRecord, configCache) == true){
									var rec = record.create({
										type: 'customrecord_avataxheaderdetails'
									});
									
									AVA_UpdateHeaderRecord(transactionRecord, rec);
								}
								else{
									AVA_LogTaxResponse(transactionRecord, configCache, 'T');
								}
							}
							else if(context.type == context.UserEventType.EDIT && transactionRecord.getValue('custpage_ava_docstatus') != 'Cancelled'){
								var searchRecord1 = search.create({
									type: transactionRecord.type,
									filters:
										[
										 	['mainline', 'is', 'T'],
										 	'and',
										 	['internalid', 'anyof', transactionRecord.id],
										 	'and',
										 	['voided', 'is', 'T'],
										]
								});
								var searchResult1 = searchRecord1.run();
								searchResult1 = searchResult1.getRange({
									start: 0,
									end: 5
								});
								
								if(searchResult1 != null && searchResult1.length > 0){
									cancelType = 'DocVoided';
									cancelStatus = 'Cancelled';
									var cancelTax = AVA_CancelTax(transactionRecord, configCache, cancelType, details);
									var headerId = transactionRecord.getValue('custpage_ava_headerid');
									
									if(headerId != null && headerId.length > 0){
										if(cancelTax == 0){
											record.submitFields({
												type: 'customrecord_avataxheaderdetails',
												id: headerId,
												values: {'custrecord_ava_documentstatus': AVA_DocumentStatus(cancelStatus)}
											});
										}
									}
									else{
										// Void document if transaction is voided using NetSuite API
										var searchRecord1 = search.create({
											type: 'customrecord_avataxheaderdetails',
											filters: ['custrecord_ava_documentinternalid', 'anyof', transactionRecord.id]
										});
										var searchResult1 = searchRecord1.run();
										searchResult1 = searchResult1.getRange({
											start: 0,
											end: 5
										});
										
										if(searchResult1 != null){
											if(cancelTax == 0){
												record.submitFields({
													type: 'customrecord_avataxheaderdetails',
													id: searchResult1[0].id,
													values: {'custrecord_ava_documentstatus': AVA_DocumentStatus(cancelStatus)}
												});
											}
										}
									}
								}
								else{
									if(transactionRecord.getValue('custpage_ava_context') == null || transactionRecord.getValue('custpage_ava_context') == '' || transactionRecord.getValue('custpage_ava_postingperiod') == true || transactionRecord.getValue('custpage_ava_postingperiod') == 'T'){
										// Skip tax call if BeforeLoad event is not triggered or posting period is closed.
										return;
									}
									
									if(runtime.getCurrentUser().getPreference('CUSTOMAPPROVALCUSTINVC') == true && configCache.AVA_CommitTransaction == true && transactionRecord.type == 'invoice' && (transactionRecord.getValue('approvalstatus') == 1 || transactionRecord.getValue('approvalstatus') == 3)){
										AVA_LogTaxResponse(transactionRecord, configCache, 'F');
										return;
									}
									
									if(avaDoc == 'T'){
										if(AVA_CalculateTax(transactionRecord, configCache) == true){
											var rec;
											if(transactionRecord.getValue('custpage_ava_headerid') != null && transactionRecord.getValue('custpage_ava_headerid').length > 0){
												rec = record.load({
													type: 'customrecord_avataxheaderdetails',
													id: transactionRecord.getValue('custpage_ava_headerid')
												});
											}
											else{
												rec = record.create({
													type: 'customrecord_avataxheaderdetails'
												});
											}
										
											AVA_UpdateHeaderRecord(transactionRecord, rec);
										}
										else{
											AVA_LogTaxResponse(transactionRecord, configCache, 'T');
										}
									}
									else{
										AVA_LogTaxResponse(transactionRecord, configCache, 'F');
									}
								}
							}
							else if(context.type == context.UserEventType.DELETE){
								AVA_DocDelete(transactionRecord, configCache, details);
							}
							else if(avaDoc == 'F' && (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT)){
								AVA_LogTaxResponse(transactionRecord, configCache, 'F');
							}
						}
					}
					else{
						AVA_LogTaxResponse(transactionRecord, configCache, 'F');
					}
					
					if(context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT){
						var connectorEndTime = new Date();
						if(avaDocType == 'SalesInvoice' || avaDocType == 'ReturnInvoice'){
							if(AVA_ResultCode == 'Success'){
								var connectorTime = (AVA_ConnectorEndTime.getTime() - connectorStartTime.getTime()) + (connectorEndTime.getTime() - AVA_ConnectorStartTime.getTime());
								var connectorMetrics = ', BeforeLoad(CONNECTORTIME - ' + transactionRecord.getValue('custpage_ava_beforeloadconnector') + ' ms), TransactionSave(CONNECTORTIME - ' + transactionRecord.getValue('custpage_ava_clientconnector') + ' ms, LATENCY - ' + transactionRecord.getValue('custpage_ava_clientlatency') + ' ms), BeforeSubmit(CONNECTORTIME - ' + transactionRecord.getValue('custpage_ava_beforesubmitconnector') + ' ms, LATENCY - ' + transactionRecord.getValue('custpage_ava_beforesubmitlatency') + ' ms), AfterSubmit(CONNECTORTIME - ' + connectorTime + ' ms, LATENCY - ' + AVA_LatencyTime + '  ms)';
								log.debug({
									title: 'CONNECTORMETRICS',
									details: 'Doc No - ' + transactionRecord.id + connectorMetrics
								});
								
								if(configCache.AVA_EnableLogEntries == '1'){
									var avaDocType = AVA_RecordType(transactionRecord.type);
									ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + transactionRecord.id + '~~' + connectorTime + '~~' + AVA_LatencyTime + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Performance' + '~~' + 'Informational' + '~~' + transactionRecord.type + '~~' + 'AVA_TransactionAfterSubmit' + '~~' + 'CONNECTORMETRICS Type - GETTAX, LineCount - ' + AVA_LineCount + ', DocCode - ' + transactionRecord.id + ', ConnectorTime - ' + connectorTime + ', LatencyTime - ' + AVA_LatencyTime + '~~' + '' + '~~' + 0 + '~~' + transactionRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + transactionRecord.getValue('custpage_ava_details')));
								}
							}
						}
						else{
							var connectorTime = connectorEndTime.getTime() - connectorStartTime.getTime();
							var connectorMetrics = ', BeforeLoad(CONNECTORTIME - ' + transactionRecord.getValue('custpage_ava_beforeloadconnector') + ' ms), TransactionSave(CONNECTORTIME - ' + transactionRecord.getValue('custpage_ava_clientconnector') + ' ms, LATENCY - ' + transactionRecord.getValue('custpage_ava_clientlatency') + ' ms), BeforeSubmit(CONNECTORTIME - ' + transactionRecord.getValue('custpage_ava_beforesubmitconnector') + ' ms, LATENCY - ' + transactionRecord.getValue('custpage_ava_beforesubmitlatency') + ' ms), AfterSubmit(CONNECTORTIME - ' + connectorTime + '  ms)';
							log.debug({
								title: 'CONNECTORMETRICS',
								details: 'Doc No - ' + transactionRecord.id + connectorMetrics
							});
						}
					}
				}
				catch(err){
					if(configCache.AVA_EnableLogEntries == '1'){
						var avaDocType = AVA_RecordType(transactionRecord.type);
						ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + transactionRecord.id + '~~' + '' + '~~' + '' + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Debug' + '~~' + 'Exception' + '~~' + transactionRecord.type + '~~' + 'AVA_TransactionAfterSubmit' + '~~' + err.message + '~~' + err.stack + '~~' + 0 + '~~' + transactionRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + transactionRecord.getValue('custpage_ava_details')));
					}
					
					log.debug({
						title: 'AfterSubmit Try/Catch Error',
						details: err.message
					});
					log.debug({
						title: 'AfterSubmit Try/Catch Error Stack',
						details: err.stack
					});
				}
			}
		}
		
		function AVA_RecordType(doctype){
			doctype = doctype.toLowerCase();
			
			if(doctype == 'estimate' || doctype == 'salesorder'){
				return 'SalesOrder';
			}
			else if(doctype == 'invoice' || doctype == 'cashsale'){
				return 'SalesInvoice';
			}
			else if(doctype == 'returnauthorization'){
				return 'ReturnOrder';
			}
			else if(doctype == 'creditmemo' || doctype == 'cashrefund'){
				return 'ReturnInvoice';
			}
			else if(doctype == 'vendorbill' || doctype == 'vendorcredit'){
				return 'PurchaseInvoice';
			}
			else if(doctype == 'purchaseorder'){
				return 'PurchaseOrder';
			}
			else{
				log.debug({
					title: 'DocType',
					details: doctype
				});
				return 0;
			}
		}
		
		function AVA_DocumentStatus(docStatus){
			switch(docStatus){
				case 'Temporary':
					return 0;
					break;
				
				case '0':
					return 'Temporary';
					break;
					
				case 'Saved':
					return 1;
					break;
				
				case '1':
					return 'Saved';
					break;
						
				case 'Posted':
					return 2;
					break;
				
				case '2':
					return 'Posted';
					break;
					
				case 'Committed':
					return 3;
					break;
				
				case '3':
					return 'Committed';
					break;
						
				case 'Cancelled':
					return 4;
					break;
				
				case '4':
					return 'Cancelled';
					break;
						
				case 'Adjusted':
					return 5;
					break;
				
				case '5':
					return 'Adjusted';
					break;
						
				default:
					return -1;
					break;    
			}
		}
			
		function AVA_GetEntityUseCodes(executionContext, entityId, addressId, mode){
			var entityMap;
			
			try{
				var searchRecord = search.create({
					type:  'customrecord_avaentityusemapping',
					filters:
						[
							['custrecord_ava_customerid', 'anyof', entityId],
							'and',
							['custrecord_ava_addressid', 'is', addressId]
						],
					columns: ['custrecord_ava_entityusemap']
				});
				var searchResult = searchRecord.run();
				searchResult = searchResult.getRange({
					start: 0,
					end: 5
				});
				
				for(var i = 0; searchResult != null && i < searchResult.length; i++){
					if(mode == '1'){
						entityMap = searchResult[i].getValue('custrecord_ava_entityusemap');
					}
					else{
						entityMap = searchResult[i].getText('custrecord_ava_entityusemap');
					}
				}
				
				if(mode != null && mode.length > 0 && mode == '1'){
					entityMap = (entityMap != null && entityMap.length > 0) ? entityMap : '';
				}
				else{
					if(entityMap != null && entityMap.length > 0){
						if(executionContext != 'WEBSTORE'){
							entityMap = entityMap.substring(0, 25);
						}
						else{
							entityMap = (entityMap != null && entityMap.length > 0) ? entityMap : '';
						}
					}
				}
			}
			catch(err){
				if(mode != null && mode.length > 0 && mode == '1'){
					entityMap = '';
				}
			}
			
			return entityMap;
		}
			
		function AVA_ReturnCoordinates(entityId, addressId){
			var result = new Array();
			
			var searchRecord = search.create({
				type:  'customrecord_avacoordinates',
				filters: 
					[
					 	['custrecord_ava_custid', 'is', entityId],
					 	'and',
					 	['custrecord_ava_addid', 'is', addressId]
					],
				columns: ['custrecord_ava_latitude', 'custrecord_ava_longitude']
			});
			var searchResult = searchRecord.run();
			searchResult = searchResult.getRange({
				start: 0,
				end: 5
			});
			
			if(searchResult != null){
				for(var m = 0; searchResult != null && m < searchResult.length; m++){
					result[0] = 1;
					result[1] = searchResult[m].getValue('custrecord_ava_latitude');
					result[2] = searchResult[m].getValue('custrecord_ava_longitude');
				}
			}
			else{
				result[0] = 0;
			}
			
			return result;
		}
		
		function AVA_AddAvataxTabDetails(context, cForm, ui, transactionRecord, avaDocType, taxHeaderId){
			var docNo = cForm.addField({
				id: 'custpage_ava_docno',
				label: 'AvaTax Document Number',
				type: ui.FieldType.TEXT,
				container: 'custpage_avatab'
			});
			docNo.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var docDate = cForm.addField({
				id: 'custpage_ava_docdate',
				label: 'Document Date',
				type: ui.FieldType.TEXT,
				container: 'custpage_avatab'
			});
			docDate.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var docStatus = cForm.addField({
				id: 'custpage_ava_docstatus',
				label: 'Document Status',
				type: ui.FieldType.TEXT,
				container: 'custpage_avatab'
			});
			docStatus.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var taxDate = cForm.addField({
				id: 'custpage_ava_taxdate',
				label: 'Tax Calculation Date',
				type: ui.FieldType.TEXT,
				container: 'custpage_avatab'
			});
			taxDate.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var totolAmount = cForm.addField({
				id: 'custpage_ava_totalamount',
				label: 'Total Amount',
				type: ui.FieldType.CURRENCY,
				container: 'custpage_avatab'
			});
			totolAmount.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var totolDiscount = cForm.addField({
				id: 'custpage_ava_totaldiscount',
				label: 'Total Discount',
				type: ui.FieldType.CURRENCY,
				container: 'custpage_avatab'
			});
			totolDiscount.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var totolNonTaxable = cForm.addField({
				id: 'custpage_ava_totalnontaxable',
				label: 'Total Non-Taxable',
				type: ui.FieldType.CURRENCY,
				container: 'custpage_avatab'
			});
			totolNonTaxable.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var totolTaxable = cForm.addField({
				id: 'custpage_ava_totaltaxable',
				label: 'Total Taxable',
				type: ui.FieldType.CURRENCY,
				container: 'custpage_avatab'
			});
			totolTaxable.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var totolTax = cForm.addField({
				id: 'custpage_ava_totaltax',
				label: 'Total Tax',
				type: ui.FieldType.CURRENCY,
				container: 'custpage_avatab'
			});
			totolTax.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});
			
			var gstHstTax, pstTax;
			if(transactionRecord.getValue('tax2total') != null){
				gstHstTax = cForm.addField({
					id: 'custpage_ava_gsttax',
					label: 'GST/HST Tax',
					type: ui.FieldType.CURRENCY,
					container: 'custpage_avatab'
				});
				gstHstTax.updateDisplayType({
					displayType: ui.FieldDisplayType.INLINE
				});
				
				pstTax = cForm.addField({
					id: 'custpage_ava_psttax',
					label: 'PST Tax',
					type: ui.FieldType.CURRENCY,
					container: 'custpage_avatab'
				});
				pstTax.updateDisplayType({
					displayType: ui.FieldDisplayType.INLINE
				});
			}
			
			if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.VIEW){
				var multiplier = (avaDocType == 'SalesInvoice') ? 1 : -1;
				
				var searchRecord = search.create({
					type: 'customrecord_avataxheaderdetails',
					filters: ['custrecord_ava_documentinternalid', 'anyof', transactionRecord.id],
					columns:
						[
						 	'custrecord_ava_documentinternalid',
						 	'custrecord_ava_documentno',
						 	'custrecord_ava_documentdate',
						 	'custrecord_ava_documentstatus',
						 	'custrecord_ava_taxcalculationdate',
						 	'custrecord_ava_totalamount',
						 	'custrecord_ava_totaldiscount',
						 	'custrecord_ava_totalnontaxable',
						 	'custrecord_ava_totaltaxable',
						 	'custrecord_ava_totaltax',
						 	'custrecord_ava_shipcode',
						 	'custrecord_ava_subsidiaryid',
						 	'custrecord_ava_gsttax',
						 	'custrecord_ava_psttax'
						]
				});
				var searchResult = searchRecord.run();
				searchResult = searchResult.getRange({
					start: 0,
					end: 1000
				});
				
				for(var i = 0; searchResult != null && i < searchResult.length; i++){
					if(context.type == context.UserEventType.EDIT){
						docNo.defaultValue = searchResult[i].getValue('custrecord_ava_documentinternalid');
					}
					else{
						AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', transactionRecord.getValue('nexus_country'));
						var url1 = url.resolveScript({
							scriptId: 'customscript_avagettaxhistory_suitelet',
							deploymentId: 'customdeploy_gettaxhistory'
						});
						url1 += '&doctype=' + avaDocType +'&doccode=' + transactionRecord.id + '&rectype=' + transactionRecord.type + '&subid=' + searchResult[i].getValue('custrecord_ava_subsidiaryid') + '&ns_transid=' + transactionRecord.getValue('tranid')  + '&AVA_FoundVatCountry=' + AVA_FoundVatCountry;
						
						var finalURL = '<a href="' + url1 + '" target="_blank">' + searchResult[i].getValue('custrecord_ava_documentinternalid') + '</a>';
						docNo.defaultValue = finalURL;
					}
					
					docDate.defaultValue = searchResult[i].getValue('custrecord_ava_documentdate');
					docStatus.defaultValue = AVA_DocumentStatus(searchResult[i].getValue('custrecord_ava_documentstatus'));
					taxDate.defaultValue = searchResult[i].getValue('custrecord_ava_taxcalculationdate');
					
					var totalAmt = parseFloat(searchResult[i].getValue('custrecord_ava_totalamount'));
					totalAmt = (totalAmt != 0) ? totalAmt * multiplier : totalAmt;
					totolAmount.defaultValue = totalAmt;
					
					var totalDis = parseFloat(searchResult[i].getValue('custrecord_ava_totaldiscount'));
					totalDis = (totalDis != 0) ? totalDis * multiplier : totalDis;
					totolDiscount.defaultValue = totalDis;
					
					var totalNonTax = parseFloat(searchResult[i].getValue('custrecord_ava_totalnontaxable'));
					totalNonTax = (totalNonTax != 0) ? totalNonTax * multiplier : totalNonTax;
					totolNonTaxable.defaultValue = totalNonTax;
					
					var totalTaxableAmount = parseFloat(searchResult[i].getValue('custrecord_ava_totaltaxable'));
					totalTaxableAmount = (totalTaxableAmount != 0) ? totalTaxableAmount * multiplier : totalTaxableAmount;
					totolTaxable.defaultValue = totalTaxableAmount;
					
					var totalTaxAmt = parseFloat(searchResult[i].getValue('custrecord_ava_totaltax'));
					totalTaxAmt = (totalTaxAmt != 0) ? totalTaxAmt * multiplier : totalTaxAmt;
					totolTax.defaultValue = totalTaxAmt;
					
					if(transactionRecord.getValue('tax2total') != null){
						var gstTax = parseFloat(searchResult[i].getValue('custrecord_ava_gsttax'));
						gstTax = (gstTax != 0) ? gstTax * multiplier : gstTax;
						gstHstTax.defaultValue = gstTax;
						
						var pstTaxAmt = parseFloat(searchResult[i].getValue('custrecord_ava_psttax'));
						pstTaxAmt = (pstTaxAmt != 0) ? pstTaxAmt * multiplier : pstTaxAmt;
						pstTax.defaultValue = pstTaxAmt;
					}
					
					taxHeaderId.defaultValue = searchResult[i].id;
				}
			}
		}
		
		function AVA_AddLogsSubList(context, cForm, ui, transactionRecord){
			if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.VIEW){
				var logSubList = cForm.addSublist({
					id: 'custpage_avanotestab',
					label: 'Logs',
					tab: 'custpage_avatab',
					type: ui.SublistType.STATICLIST
				});
				logSubList.addField({
					id: 'custpage_ava_datetime',
					label: 'Date',
					type: ui.FieldType.TEXT
				});
				var author = logSubList.addField({
					id: 'custpage_ava_author',
					label: 'Author',
					type: ui.FieldType.SELECT,
					source: 'employee'
				});
				author.updateDisplayType({
					displayType: ui.FieldDisplayType.INLINE
				});
				logSubList.addField({
					id: 'custpage_ava_title',
					label: 'Title',
					type: ui.FieldType.TEXT
				});
				logSubList.addField({
					id: 'custpage_ava_memo',
					label: 'Memo',
					type: ui.FieldType.TEXTAREA
				});
				
				var searchRecord = search.create({
					type: 'customrecord_avatransactionlogs',
					filters: ['custrecord_ava_transaction', 'is', transactionRecord.id],
					columns:
						[
						 	'custrecord_ava_title',
						 	'custrecord_ava_note',
						 	'custrecord_ava_creationdatetime',
						 	'custrecord_ava_author'
						]
				});
				var searchResult = searchRecord.run();
				
				var i = 0;
				searchResult.each(function(result){
					logSubList.setSublistValue({
						id: 'custpage_ava_datetime',
						line: i,
						value: result.getValue('custrecord_ava_creationdatetime')
					});
					if(result.getValue('custrecord_ava_author') != null && result.getValue('custrecord_ava_author').length > 0){
						logSubList.setSublistValue({
							id: 'custpage_ava_author',
							line: i,
							value: result.getValue('custrecord_ava_author')
						});
					}
					logSubList.setSublistValue({
						id: 'custpage_ava_title',
						line: i,
						value: result.getValue('custrecord_ava_title')
					});
					
					if(result.getValue('custrecord_ava_note') != null && result.getValue('custrecord_ava_note').length > 175){
						var url1 = url.resolveScript({
							scriptId: 'customscript_avatransactionlog_suitelet',
							deploymentId: 'customdeploy_ava_transactionlog'
						});
						url1 += '&noteid=' + result.id;
						
						var finalUrl = '<a href="' + url1 + '" target="_blank">more...</a>';
						logSubList.setSublistValue({
							id: 'custpage_ava_memo',
							line: i,
							value: result.getValue('custrecord_ava_note').substring(0, 175) + ' ' + finalUrl
						});
					}
					else{
						logSubList.setSublistValue({
							id: 'custpage_ava_memo',
							line: i,
							value: result.getValue('custrecord_ava_note')
						});
					}
					
					if(i == 3999){
						return false;
					}
					else{
						i++;
						return true;
					}
				});
			}
		}
		
		function AVA_GetEntity(transactionRecord){
			if(transactionRecord.getValue('partner') != null && transactionRecord.getValue('partner').length > 0){
				var searchRecord = search.create({
					type:  search.Type.PARTNER,
					filters: ['internalid', 'anyof', transactionRecord.getValue('partner')],
					columns:
						[
						 	'isperson',
						 	'firstname',
						 	'middlename',
						 	'lastname',
						 	'companyname',
						 	'entityid'
						]
				});
				var searchResult = searchRecord.run();
				searchResult = searchResult.getRange({
					start: 0,
					end: 5
				});
				
				if(searchResult != null && searchResult.length > 0){
					transactionRecord.setValue({
						fieldId: 'custpage_ava_partnerid',
						value: JSON.stringify(searchResult),
						ignoreFieldChange: true
					});
				}
			}
			else{
				transactionRecord.setValue({
					fieldId: 'custpage_ava_partnerid',
					value: '',
					ignoreFieldChange: true
				});
			}
		}
		
		function AVA_GetSubsidiaryInfo(transactionRecord, subsidiaryCache){
			var subId = transactionRecord.getValue('subsidiary');
			
			try{
				for(var i = 0; subsidiaryCache != null && i < subsidiaryCache.length; i++){
					if(subId == subsidiaryCache[i].values.custrecord_ava_subsidiary[0].value){
						var addrFlag = subsidiaryCache[i].values.custrecord_ava_iscompanyaddr;
						
						AVA_Def_Addressee  = (addrFlag == true) ? transactionRecord.getValue('custbody_ava_subsidiaryaddressee') : 'Default Shipping Address';
						AVA_Def_Addr1      = (addrFlag == true) ? transactionRecord.getValue('custbody_ava_subsidiaryaddress1')  : transactionRecord.getValue('custbody_ava_subsidiaryshipaddress1');
						AVA_Def_Addr2      = (addrFlag == true) ? transactionRecord.getValue('custbody_ava_subsidiaryaddress2')  : transactionRecord.getValue('custbody_ava_subsidiaryshipaddress2');
						AVA_Def_City       = (addrFlag == true) ? transactionRecord.getValue('custbody_ava_subsidiarycity')      : transactionRecord.getValue('custbody_ava_subsidiaryshipcity');
						AVA_Def_State      = (addrFlag == true) ? transactionRecord.getValue('custbody_ava_subsidiarystate')     : transactionRecord.getValue('custbody_ava_subsidiaryshipstate');
						AVA_Def_Zip        = (addrFlag == true) ? transactionRecord.getValue('custbody_ava_subsidiaryzip')		 : transactionRecord.getValue('custbody_ava_subsidiaryshipzip');
						var returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (addrFlag == true) ? transactionRecord.getValue('custbody_ava_subsidiarycountry') : transactionRecord.getValue('custbody_ava_subsidiaryshipcountry'));  
						AVA_Def_Country    = returnCountryName[1];
						AVA_SubCurrency    = transactionRecord.getValue('custbody_ava_subsidiarycurrency');
						
						var taxcode = subsidiaryCache[i].values.custrecord_ava_subdeftaxcode;
						AVA_DefaultTaxCode = (taxcode != null) ? taxcode.substring(0, taxcode.lastIndexOf('+')) : '';
						if(transactionRecord.getValue('nexus_country') == 'JP'){
							AVA_SubCurrency = 'JPY';
							AVA_DefaultTaxCode = AVA_DefaultTaxCode.substring(AVA_DefaultTaxCode.indexOf(':') + 1, AVA_DefaultTaxCode.length + 1);
						}
						
						transactionRecord.setValue({
							fieldId: 'custpage_ava_deftax',
							value: AVA_DefaultTaxCode,
							ignoreFieldChange: true
						});
						transactionRecord.setValue({
							fieldId: 'custpage_ava_deftaxid',
							value: (taxcode != null) ? taxcode.substring(taxcode.lastIndexOf('+') + 1, taxcode.length) : '',
							ignoreFieldChange: true
						});
						transactionRecord.setValue({
							fieldId: 'custpage_ava_defcompcode',
							value: subsidiaryCache[i].values.custrecord_ava_defcompanycode,
							ignoreFieldChange: true
						});
						
						break;
					}
				}
			}
			catch(err){
				log.debug({
					title: 'AVA_GetSubsidiaryInfo - Try/catch error',
					details: err.message
				});
			}
		}
		
		function AVA_RequiredFields(transactionRecord, configCache){
			// 1. Check if AvaTax is enabled
			if(configCache.AVA_DisableTax == true){
				AVA_ErrorCode = 1;
				return 1;
			}
			
			// 2. Check if Tax Calculation is enabled for Estimate/Quotes
			if(transactionRecord.type == 'estimate' && configCache.AVA_DisableTaxQuote == true){
				AVA_ErrorCode = 30;
				return 1;
			}
			
			// 3. Check if Tax Calculation is enabled for Sales Order
			if(transactionRecord.type == 'salesorder' && configCache.AVA_DisableTaxSalesOrder == true){
				AVA_ErrorCode = 31;
				return 1;
			}
			
			// 4. Check if the Environment is correct
			if(runtime.envType != 'PRODUCTION' && configCache.AVA_ServiceUrl == '0'){
				AVA_ErrorCode = 19;
				return 1;
			}
			
			// 5. Check if Lines exist
			if(transactionRecord.getValue('custpage_ava_context') == 'WEBSTORE'){
				if(transactionRecord.getLineCount('item') <= 0){
					AVA_ErrorCode = 2;			
					return 1;
				}
			}
			else if(transactionRecord.getValue('haslines') == false){
				AVA_ErrorCode = 2;
				return 1;
			}
			
			// 6. Check for Customers
			if(transactionRecord.getValue('custpage_ava_context') == 'WEBSTORE'){
				if(transactionRecord.getValue('entity') <= 0){
					AVA_ErrorCode = 3;
					return 1;
				}
			}
			else if(transactionRecord.getValue('entity') == null || transactionRecord.getValue('entity').length <= 0){
				AVA_ErrorCode = 3;
				return 1;
			}
			
			// 6.1 Check for CustomerCode in AVACONFIG record
			if(configCache.AVA_CustomerCode != null && configCache.AVA_CustomerCode > 8){
				AVA_ErrorCode = 24;
				return 1;
			}
			
			// 7. Check for Date
			if(transactionRecord.getValue('trandate') == null || transactionRecord.getValue('trandate').length == 0){
				AVA_ErrorCode = 4;
				return 1;
			}
			
			// 8. Check if Default Taxcode assigned for the subsidiary in the Configurations settings
			var taxcode = transactionRecord.getValue('custpage_ava_deftax');
			if(taxcode == null || taxcode.length == 0){
				AVA_ErrorCode = 17;
				return 1;
			}
			
			// 9. Check if Taxable at Header Level or at Line level
			var checkTax = AVA_MainTaxCodeCheck(transactionRecord, configCache);
			if(checkTax == 1){
				return 1;
			}
			
			// 10. Check for Ship to
			if(AVA_LocationPOS == 0){
				if(transactionRecord.getField('taxitem') != null){
					var taxcode = transactionRecord.getValue('custpage_ava_formtaxcode');
					taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
			
					if(taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POS'){
						AVA_ShipToAddress = AVA_GetDestinationAddress(transactionRecord, configCache);
						var addressResult = (AVA_ShipToAddress == 1) ? 1 : ((AVA_ShipToAddress == 0) ? 0 : (AVA_ShipToAddress[7] == null) ? 1 : 0);
						if(addressResult == 1){
							AVA_ErrorCode = (AVA_ShipToAddress == 1) ? AVA_ErrorCode : 14;
							return 1;
						}
					}
				}
				else{
					if(transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false){
						AVA_ShipToAddress = AVA_GetDestinationAddress(transactionRecord, configCache);
						
						for(var line = 0; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
							var taxcode = AVA_TaxcodeArray[line];
							taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
				
							if(taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POS'){
								var addressResult = (AVA_ShipToAddress == 1) ? 1 : ((AVA_ShipToAddress == 0) ? 0 : (AVA_ShipToAddress[7] == null) ? 1 : 0);
								if(addressResult == 1){
									AVA_ErrorCode = (AVA_ShipToAddress == 1) ? AVA_ErrorCode : 14;
									return 1;
								}
								break;
							}
						}		
			
						if(transactionRecord.getValue('shippingtaxcode') != null && transactionRecord.getValue('shippingcost') != null && transactionRecord.getValue('shippingcost') > 0){
							var taxcode = transactionRecord.getValue('custpage_ava_shiptaxcode');
							taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
				
							if(taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POS'){
								var addressResult = (AVA_ShipToAddress == 1) ? 1 : ((AVA_ShipToAddress[7] == null) ? 1 : 0);
								if(addressResult == 1){
									AVA_ErrorCode = (AVA_ShipToAddress == 1) ? AVA_ErrorCode : 14;
									return 1;
								}
							}
						}
							
						if(transactionRecord.getValue('handlingtaxcode') != null && transactionRecord.getValue('handlingcost') != null && transactionRecord.getValue('handlingcost') > 0){
							var taxcode = transactionRecord.getValue('custpage_ava_handlingtaxcode');
							taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
				
							if(taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POS'){
								var addressResult = (AVA_ShipToAddress == 1) ? 1 : ((AVA_ShipToAddress[7] == null) ? 1 : 0);
								if(addressResult == 1){
									AVA_ErrorCode = (AVA_ShipToAddress == 1) ? AVA_ErrorCode : 14;
									return 1;
								}
							}
						}
					}
					else if(transactionRecord.getValue('ismultishipto') == true){
						// This will check ship addresses of Item lines as well as Ship Groups.
						for(var addrIndex = 0; AVA_MultiShipAddArray != null && addrIndex < AVA_MultiShipAddArray.length; addrIndex++){
							AVA_ShipToAddress = AVA_MultiShipAddArray[addrIndex][1];
							
							if(AVA_ShipToAddress == null || (AVA_ShipToAddress != null && AVA_ShipToAddress.length <= 0)){
								AVA_ShipToAddress = AVA_GetDestinationAddress(transactionRecord, configCache);
							}
							
							var addressResult = (AVA_ShipToAddress == 1) ? 1 : ((AVA_ShipToAddress != null && AVA_ShipToAddress.length > 0) ? 0 :(AVA_ShipToAddress[7] == null) ? 1 : 0);
							if(addressResult == 1){
								AVA_ErrorCode = (AVA_ShipToAddress == 1) ? AVA_ErrorCode : 14;
								return 1;
							}
						}
					}
				}
			}
			
			// 11. Check if Inventory Items Type exist
			var itemsExist = 'F', euTriangulationCheck = 0;
			for(var i = 0; i < transactionRecord.getLineCount('item'); i++){
				var lineType = transactionRecord.getSublistValue({
					sublistId: 'item',
					fieldId: 'itemtype',
					line: i
				});
				
				//EVAT 
				if(AVA_FoundVatCountry == 1 && (transactionRecord.getSublistValue('item', 'custcol_5892_eutriangulation', i) == true || transactionRecord.getSublistValue('item', 'custcol_5892_eutriangulation', i) == 'T')){
					euTriangulationCheck = 1;
				}
				
				switch(lineType){
					case 'Discount':
					case 'Markup':
					case 'Description':
					case 'Subtotal':
					case 'Group':
					case 'EndGroup':
						break;
					
					default:
						itemsExist = 'T';
						break;
				}
			}
			
			if(itemsExist == 'F' && BillItemFlag == 'F' && BillExpFlag == 'F' && BillTimeFlag == 'F'){
				AVA_ErrorCode = 15;
				return 1;
			}
			
			// 12. Check if Middle Man VAT ID is entered
			if(AVA_FoundVatCountry == 1 && euTriangulationCheck == 1 && (transactionRecord.getValue('custbody_ava_vatregno') == null || transactionRecord.getValue('custbody_ava_vatregno').length <= 0)){
				AVA_ErrorCode = 38;
				return 1;
			}
			
			// 13. Check if AVA_RecordType value is not '0'
			if(transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE' && AVA_RecordType(transactionRecord.type) == 0){
				AVA_ErrorCode = 23;
				return 1;
			}
			
			return 0;
		}
		
		function AVA_MainTaxCodeCheck(transactionRecord, configCache){
			AVA_GetNSLines(transactionRecord, configCache);
			
			AVA_GetTaxcodes(transactionRecord);

			var tempPOS = 0;
			AVA_LocationPOS = 0;
			if(configCache.AVA_DisableLocationCode == false){
				AVA_GetLocations(transactionRecord, configCache);
				
				if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
					if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F') && AVA_CreateFromRecord.getValue('location') != null && AVA_CreateFromRecord.getValue('location').length > 0 && AVA_CreateFromRecord.getValue('custbody_ava_pickup') == true){
						AVA_LocationPOS = 1;
						
						if(AVA_LocationArray != null && AVA_LocationArray.length > 0 && transactionRecord.getValue('ismultishipto') == true){
							tempPOS = 1;
						}
					}
				}
				else{
					if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F') && transactionRecord.getValue('location') != null && transactionRecord.getValue('location').length > 0 && transactionRecord.getValue('custbody_ava_pickup') == true){
						AVA_LocationPOS = 1;
					}
				}
			}
			
			if(AVA_LocationPOS == 0 || tempPOS == 1){
				AVA_GetMultiShipAddr(transactionRecord, configCache);
			}
			
			if(transactionRecord.getValue('edition') == 'US' || transactionRecord.getValue('edition') == 'CA'){
				if(transactionRecord.getValue('nexus_country') != 'US' && transactionRecord.getValue('nexus_country') != 'CA'){
					AVA_EditionChecked = 1; // if subsidiary is US/CA and address is not US/CA
				}
			}
			else{
				if(transactionRecord.getValue('nexus_country') == 'US' || transactionRecord.getValue('nexus_country') == 'CA'){
					AVA_EditionChecked = 2; // if subsidiary is UK/AU and address is US/CA
				}
				else{
					AVA_EditionChecked = 3; // if subsidiary is UK/AU and address is not US/CA
				}
			}
			
			var taxcode = transactionRecord.getValue('custpage_ava_deftax');
			
			if(transactionRecord.getField('taxitem') != null){
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') == null){
					AVA_ErrorCode = 5;
					return 1;
				}
				
				if(transactionRecord.getValue('custpage_ava_formtaxcode') != '-Not Taxable-'){
					if(transactionRecord.getValue('istaxable') == true || (transactionRecord.getValue('custpage_ava_formtaxcode') != null && transactionRecord.getValue('custpage_ava_formtaxcode').length > 0)){
						if(AVA_EditionChecked == 2){
							var formTaxcode = transactionRecord.getValue('custpage_ava_formtaxcode');
							if(formTaxcode.search('POD') != -1 || formTaxcode.search('POS') != -1 || formTaxcode.indexOf('-') != -1){
								// Fix for CONNECT-3789
								formTaxcode = formTaxcode.substring(0, 6);
							}
							
							if(formTaxcode != taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + formTaxcode.length + 1)){
								AVA_ErrorCode = 6;
								return 1;
							}
						}
						else{
							if(taxcode.indexOf('-') != -1){
								taxcode = taxcode.substring(0, taxcode.indexOf('-'));
							}
							
							if((transactionRecord.getValue('custpage_ava_formtaxcode') != null && transactionRecord.getValue('custpage_ava_formtaxcode').substring(0, taxcode.length) != taxcode)){
								AVA_ErrorCode = 6;
								return 1; 
							}
						}
					}
					
					if(transactionRecord.getValue('istaxable') == false && ((transactionRecord.getValue('custpage_ava_formtaxcode') == null) || (transactionRecord.getValue('custpage_ava_formtaxcode') != null && transactionRecord.getValue('custpage_ava_formtaxcode').length > 0 && transactionRecord.getValue('custpage_ava_formtaxcode').substring(0, taxcode.length) != taxcode) || (transactionRecord.getValue('custpage_ava_formtaxcode') != null && transactionRecord.getValue('custpage_ava_formtaxcode').length <= 0))){
						AVA_ErrorCode = 6;
						return 1;
					}
				}
				
				if(transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false){
					if((transactionRecord.getValue('custpage_ava_shipping') == false || transactionRecord.getValue('custpage_ava_shipping') == 'F') && transactionRecord.getValue('shippingcost') != null && transactionRecord.getValue('shippingcost') > 0){
						AVA_ErrorCode = 10;
						return 1;
					}
					
					if((transactionRecord.getValue('custpage_ava_handling') == false || transactionRecord.getValue('custpage_ava_handling') == 'F') && transactionRecord.getValue('handlingcost') != null && transactionRecord.getValue('handlingcost') > 0){
						AVA_ErrorCode = 11;
						return 1;
					}
				}
			}
			else{
				var avaLines = 'F', lineTaxCode;
				
				for(var line = 0; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
					lineTaxCode = AVA_TaxcodeArray[line];
					var linetype = transactionRecord.getSublistValue({
						sublistId: AVA_NS_Lines[line][0],
						fieldId: 'itemtype',
						line: AVA_NS_Lines[line][1]
					});
					if(lineTaxCode != '-Not Taxable-' && !(linetype == 'Description' || linetype == 'Subtotal' || linetype == 'Group' || linetype == 'EndGroup' || linetype == 'Discount')){
						if(lineTaxCode != null && lineTaxCode.length > 0){
							if(AVA_EditionChecked == 0){
								if(taxcode.indexOf('-') != -1){
									taxcode = taxcode.substring(0, taxcode.indexOf('-'));
								}
								
								if(lineTaxCode.substring(0, taxcode.length) != taxcode){
									avaLines = 'T';
									break;
								}
							}
							else if(AVA_EditionChecked == 1){
								// Substring lineTaxCode from ':' to DefaultTaxCode length
								if(lineTaxCode.substring(lineTaxCode.indexOf(':') + 1, lineTaxCode.indexOf(':') + taxcode.length + 1) != taxcode){
									avaLines = 'T';
									break;
								}
							}
							else if(AVA_EditionChecked == 2){
								if(lineTaxCode.search('POD') != -1 || lineTaxCode.search('POS') != -1 || lineTaxCode.indexOf('-') != -1){
									// Fix for CONNECT-3789
									lineTaxCode = lineTaxCode.substring(0, 6);
								}
								
								// Substring DefaultTaxCode from ':' to lineTaxCode length
								if(lineTaxCode != taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + lineTaxCode.length + 1)){
									avaLines = 'T';
									break;
								}
							}
							else{
								if(lineTaxCode.indexOf('-') != -1){
									lineTaxCode = lineTaxCode.substring(0, lineTaxCode.indexOf('-'));
								}
								
								if(taxcode.indexOf('-') != -1){
									taxcode = taxcode.substring(0, taxcode.indexOf('-'));
								}
								
								if(lineTaxCode.substring(lineTaxCode.indexOf(':') + 1) != taxcode.substring(taxcode.indexOf(':') + 1)){
									avaLines = 'T';
									break;
								}
							}
						}
						else{
							avaLines = 'T';
							break;
						}
					}
				}
				
				if(avaLines == 'T'){
					AVA_ErrorCode = 9;
					return 1;
				}
				
				// Check for Billable Discount Taxcodes
				if(transactionRecord.getValue('custpage_ava_billcost') == true || transactionRecord.getValue('custpage_ava_billcost') == 'T'){
					if(BillItemFlag == 'T'){
						// If Billable Item tab have atleast one item selected
						lineTaxCode = null;
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 0){
							if(transactionRecord.getValue('itemcosttaxcode') != null && transactionRecord.getValue('itemcosttaxcode').length > 0){
								lineTaxCode = search.lookupFields({
									type: search.Type.SALES_TAX_ITEM,
									id: transactionRecord.getValue('itemcosttaxcode'),
									columns: 'itemid'
								});
								if(lineTaxCode.itemid == null){
									lineTaxCode = search.lookupFields({
										type: search.Type.TAX_GROUP,
										id: transactionRecord.getValue('itemcosttaxcode'),
										columns: 'itemid'
									});
									lineTaxCode = lineTaxCode.itemid;
								}
							}
						}
						else{
							lineTaxCode = transactionRecord.getText('itemcosttaxcode');
						}
						
						if(lineTaxCode != null && lineTaxCode.length > 0 && lineTaxCode != '-Not Taxable-'){
							if(AVA_EditionChecked == 0){
								if(taxcode.indexOf('-') != -1){
									taxcode = taxcode.substring(0, taxcode.indexOf('-'));
								}
								
								if(lineTaxCode.substring(0, taxcode.length) != taxcode){
									AVA_ErrorCode = 20;
									return 1;
								}
							}
							else if(AVA_EditionChecked == 1){
								if(lineTaxCode.substring(lineTaxCode.indexOf(':') + 1, lineTaxCode.indexOf(':') + taxcode.length + 1) != taxcode){
									AVA_ErrorCode = 20;
									return 1;
								}
							}
							else if(AVA_EditionChecked == 2){
								if(lineTaxCode.search('POD') != -1 || lineTaxCode.search('POS') != -1 || lineTaxCode.indexOf('-') != -1){
									// Fix for CONNECT-3789
									lineTaxCode = lineTaxCode.substring(0, 6);
								}
								
								if(lineTaxCode != taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + lineTaxCode.length + 1)){
									AVA_ErrorCode = 20;
									return 1;
								}
							}
							else{
								if(lineTaxCode.indexOf('-') != -1){
									lineTaxCode = lineTaxCode.substring(0, lineTaxCode.indexOf('-'));
								}
								
								if(taxcode.indexOf('-') != -1){
									taxcode = taxcode.substring(0, taxcode.indexOf('-'));
								}
								
								if(lineTaxCode.substring(lineTaxCode.indexOf(':') + 1) != taxcode.substring(taxcode.indexOf(':') + 1)){
									AVA_ErrorCode = 20;
									return 1;
								}
							}
						}
					}

					if(BillExpFlag == 'T'){
						// If Billable Expense tab have atleast one item selected
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 0){
							lineTaxCode = null;
							if(transactionRecord.getValue('expcosttaxcode') != null && transactionRecord.getValue('expcosttaxcode').length > 0){
								lineTaxCode = search.lookupFields({
									type: search.Type.SALES_TAX_ITEM,
									id: transactionRecord.getValue('expcosttaxcode'),
									columns: 'itemid'
								});
								if(lineTaxCode.itemid == null){
									lineTaxCode = search.lookupFields({
										type: search.Type.TAX_GROUP,
										id: transactionRecord.getValue('expcosttaxcode'),
										columns: 'itemid'
									});
									lineTaxCode = lineTaxCode.itemid;
								}
							}
						}
						else{
							lineTaxCode = transactionRecord.getText('expcosttaxcode');
						}
						
						if(lineTaxCode != null && lineTaxCode.length > 0 && lineTaxCode != '-Not Taxable-'){
							if(AVA_EditionChecked == 0){
								if(taxcode.indexOf('-') != -1){
									taxcode = taxcode.substring(0, taxcode.indexOf('-'));
								}
								
								if(lineTaxCode.substring(0, taxcode.length) != taxcode){
									AVA_ErrorCode = 21;
									return 1;
								}
							}
							else if(AVA_EditionChecked == 1){
								if(lineTaxCode.substring(lineTaxCode.indexOf(':') + 1, lineTaxCode.indexOf(':') + taxcode.length + 1) != taxcode){
									AVA_ErrorCode = 21;
									return 1;
								}
							}
							else if(AVA_EditionChecked == 2){
								if(lineTaxCode.search('POD') != -1 || lineTaxCode.search('POS') != -1 || lineTaxCode.indexOf('-') != -1){
									// Fix for CONNECT-3789
									lineTaxCode = lineTaxCode.substring(0, 6);
								}
								
								if(lineTaxCode != taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + lineTaxCode.length + 1)){
									AVA_ErrorCode = 21;
									return 1;
								}
							}
							else{
								if(lineTaxCode.indexOf('-') != -1){
									lineTaxCode = lineTaxCode.substring(0, lineTaxCode.indexOf('-'));
								}
								
								if(taxcode.indexOf('-') != -1){
									taxcode = taxcode.substring(0, taxcode.indexOf('-'));
								}
								
								if(lineTaxCode.substring(lineTaxCode.indexOf(':') + 1) != taxcode.substring(taxcode.indexOf(':') + 1)){
									AVA_ErrorCode = 21;
									return 1;
								}
							}
						}
					}
					
					if(BillTimeFlag == 'T'){
						// If Billable Time tab have atleast one item selected
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 0){
							lineTaxCode = null;
							if(transactionRecord.getValue('timetaxcode') != null && transactionRecord.getValue('timetaxcode').length > 0){
								lineTaxCode = search.lookupFields({
									type: search.Type.SALES_TAX_ITEM,
									id: transactionRecord.getValue('timetaxcode'),
									columns: 'itemid'
								});
								if(lineTaxCode.itemid == null){
									lineTaxCode = search.lookupFields({
										type: search.Type.TAX_GROUP,
										id: transactionRecord.getValue('timetaxcode'),
										columns: 'itemid'
									});
									lineTaxCode = lineTaxCode.itemid;
								}
							}
						}
						else{
							lineTaxCode = transactionRecord.getText('timetaxcode');
						}
						
						if(lineTaxCode != null && lineTaxCode.length > 0 && lineTaxCode != '-Not Taxable-'){
							if(AVA_EditionChecked == 0){
								if(taxcode.indexOf('-') != -1){
									taxcode = taxcode.substring(0, taxcode.indexOf('-'));
								}
								
								if(lineTaxCode.substring(0, taxcode.length) != taxcode){
									AVA_ErrorCode = 22;
									return 1;
								}
							}
							else if(AVA_EditionChecked == 1){
								if(lineTaxCode.substring(lineTaxCode.indexOf(':') + 1, lineTaxCode.indexOf(':') + taxcode.length + 1) != taxcode){
									AVA_ErrorCode = 22;
									return 1;
								}
							}
							else if(AVA_EditionChecked == 2){
								if(lineTaxCode.search('POD') != -1 || lineTaxCode.search('POS') != -1 || lineTaxCode.indexOf('-') != -1){
									// Fix for CONNECT-3789
									lineTaxCode = lineTaxCode.substring(0, 6);
								}
								
								if(lineTaxCode != taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + lineTaxCode.length + 1)){
									AVA_ErrorCode = 22;
									return 1;
								}
							}
							else
							{
								if(lineTaxCode.indexOf('-') != -1){
									lineTaxCode = lineTaxCode.substring(0, lineTaxCode.indexOf('-'));
								}
								
								if(taxcode.indexOf('-') != -1){
									taxcode = taxcode.substring(0, taxcode.indexOf('-'));
								}
								
								if(lineTaxCode.substring(lineTaxCode.indexOf(':') + 1) != taxcode.substring(taxcode.indexOf(':') + 1)){
									AVA_ErrorCode = 22;
									return 1;
								}
							}
						}
					}
				}
				
				if(transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false){
					/* 2. Check for Shipping Tax Code equals 'AVATAX' */
					if((transactionRecord.getValue('custpage_ava_shipping') == true || transactionRecord.getValue('custpage_ava_shipping') == 'T') && transactionRecord.getValue('shippingcost') != null && transactionRecord.getValue('shippingcost') > 0){
						var shipTaxCode = transactionRecord.getValue('custpage_ava_shiptaxcode');
						
						if(shipTaxCode != null && shipTaxCode.length > 0){
							if(shipTaxCode != '-Not Taxable-'){
								if(AVA_EditionChecked == 0){
									if(taxcode.indexOf('-') != -1){
										taxcode = taxcode.substring(0, taxcode.indexOf('-'));
									}
									
									if(shipTaxCode.substring(0, taxcode.length) != taxcode){
										AVA_ErrorCode = 10;
										return 1;
									}
								}
								else if(AVA_EditionChecked == 1){
									if(shipTaxCode.substring(shipTaxCode.indexOf(':') + 1, shipTaxCode.indexOf(':') + taxcode.length + 1) != taxcode){
										AVA_ErrorCode = 10;
										return 1;
									}
								}
								else if(AVA_EditionChecked == 2){
									if(shipTaxCode.search('POD') != -1 || shipTaxCode.search('POS') != -1 || shipTaxCode.indexOf('-') != -1){
										// Fix for CONNECT-3789
										shipTaxCode = shipTaxCode.substring(0, 6);
									}
									
									if(shipTaxCode != taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + shipTaxCode.length + 1)){
										AVA_ErrorCode = 10;
										return 1;
									}
								}
								else{
									if(shipTaxCode.indexOf('-') != -1){
										shipTaxCode = shipTaxCode.substring(0, shipTaxCode.indexOf('-'));
									}
									
									if(taxcode.indexOf('-') != -1){
										taxcode = taxcode.substring(0, taxcode.indexOf('-'));
									}
									
									if(shipTaxCode.substring(shipTaxCode.indexOf(':') + 1) != taxcode.substring(taxcode.indexOf(':') + 1)){
										AVA_ErrorCode = 10;
										return 1;
									}
								}
							}
						}
						else{
							AVA_ErrorCode = 10;
							return 1;
						}
					}
					else if(transactionRecord.getValue('shippingcost') != null && transactionRecord.getValue('shippingcost') > 0){
						//If Ship method is not selected and amount is greater than 0 and (taxcode is missing or not missing) then we should restrict the call
						AVA_ErrorCode = 10;
						return 1;
					}
					
					/* 3. Check for Handling Tax Code equals 'AVATAX' */
					if((transactionRecord.getValue('custpage_ava_handling') == true || transactionRecord.getValue('custpage_ava_handling') == 'T') && transactionRecord.getValue('handlingcost') != null && transactionRecord.getValue('handlingcost') > 0){
						var handlingTaxCode = transactionRecord.getValue('custpage_ava_handlingtaxcode');
						
						if(handlingTaxCode != null && handlingTaxCode.length > 0){
							if(handlingTaxCode != '-Not Taxable-'){
								if(AVA_EditionChecked == 0){
									if(taxcode.indexOf('-') != -1){
										taxcode = taxcode.substring(0, taxcode.indexOf('-'));
									}
									
									if((handlingTaxCode.substring(0, taxcode.length) != taxcode)){
										AVA_ErrorCode = 11;
										return 1;
									}
								}
								else if(AVA_EditionChecked == 1){
									if(handlingTaxCode.substring(handlingTaxCode.indexOf(':') + 1, handlingTaxCode.indexOf(':') + taxcode.length + 1) != taxcode){
										AVA_ErrorCode = 11;
										return 1;
									}
								}
								else if(AVA_EditionChecked == 2){
									if(handlingTaxCode.search('POD') != -1 || handlingTaxCode.search('POS') != -1 || handlingTaxCode.indexOf('-') != -1){
										// Fix for CONNECT-3789
										handlingTaxCode = handlingTaxCode.substring(0, 6);
									}
									
									if(handlingTaxCode != taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + handlingTaxCode.length + 1)){
										AVA_ErrorCode = 11;
										return 1;
									}
								}
								else{
									if(handlingTaxCode.indexOf('-') != -1){
										handlingTaxCode = handlingTaxCode.substring(0, handlingTaxCode.indexOf('-'));
									}
									
									if(taxcode.indexOf('-') != -1){
										taxcode = taxcode.substring(0, taxcode.indexOf('-'));
									}
									
									if(handlingTaxCode.substring(handlingTaxCode.indexOf(':') + 1) != taxcode.substring(taxcode.indexOf(':') + 1)){
										AVA_ErrorCode = 11;
										return 1;
									}
								}
							}
						}
						else{
							AVA_ErrorCode = 11;
							return 1;
						}
					}
					else if(transactionRecord.getValue('handlingcost') != null && transactionRecord.getValue('handlingcost') > 0){
						//If Ship method is not selected and handling amount is greater than 0 and (taxcode is missing or not missing) then we should restrict the call
						AVA_ErrorCode = 11;
						return 1;
					}
				}
			}
			
			return 0;
		}
		
		function AVA_GetNSLines(transactionRecord, configCache){
			var tabType, tabCount;
			AVA_NS_Lines = new Array();
			AVA_CreatedFromNS_Lines = new Array();
			
			BillItemFlag = 'F';
			BillExpFlag = 'F';
			BillTimeFlag = 'F';
			BillItemTAmt = BillExpTAmt = BillTimeTAmt = 0;
			
			if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
				for(var tab = 0; tab < 4; tab++){
					tabType = (tab == 0) ? 'item' : ((tab == 1) ? 'itemcost' : ((tab == 2) ? 'expcost' : 'time'));
					
					for(var line = 0; line < AVA_CreateFromRecord.getLineCount(tabType); line++){
						//Continue only if its a line from Items tab or when the apply checkbox is marked true for a Billable line.
						if(tabType != 'item' && AVA_CreateFromRecord.getSublistValue(tabType, 'apply', line) != true){
							continue;
						}
						
						var arrIndex = AVA_CreatedFromNS_Lines.length;
						AVA_CreatedFromNS_Lines[arrIndex] = new Array();
						AVA_CreatedFromNS_Lines[arrIndex][0] = tabType;
						AVA_CreatedFromNS_Lines[arrIndex][1] = parseFloat(line);
						AVA_CreatedFromNS_Lines[arrIndex][2] = AVA_CreateFromRecord.getSublistValue(tabType, 'item', line);
					}
				}
			}
			
			//1: Items tab, 2: Billable Items, 3: Billable Exp, 4: Billable Time
			tabCount = (transactionRecord.getValue('custpage_ava_billcost') == true || transactionRecord.getValue('custpage_ava_billcost') == 'T') ? 4 : 1;
			
			for(var tab = 0; tab < tabCount; tab++){
				tabType = (tab == 0) ? 'item' : ((tab == 1) ? 'itemcost' : ((tab == 2) ? 'expcost' : 'time'));
				
				for(var line = 0; line < transactionRecord.getLineCount(tabType); line++){
					//Continue only if its a line from Items tab or when the apply checkbox is marked true for a Billable line.
					if(tabType != 'item' && transactionRecord.getSublistValue(tabType, 'apply', line) != true){
						continue;
					}
					
					var arrIndex = AVA_NS_Lines.length;
					AVA_NS_Lines[arrIndex] = new Array();
					AVA_NS_Lines[arrIndex][0] = tabType;
					AVA_NS_Lines[arrIndex][1] = parseFloat(line);
					
					if(tabType == 'itemcost'){
						BillItemFlag = 'T';
						BillItemTAmt += (transactionRecord.getSublistValue(tabType, 'amount', line) != null && transactionRecord.getSublistValue(tabType, 'amount', line).toString().length > 0) ? parseFloat(transactionRecord.getSublistValue(tabType, 'amount', line)) : 0;
					}
					else if(tabType == 'expcost'){
						BillExpFlag = 'T';
						BillExpTAmt += (transactionRecord.getSublistValue(tabType, 'amount', line) != null && transactionRecord.getSublistValue(tabType, 'amount', line).toString().length > 0) ? parseFloat(transactionRecord.getSublistValue(tabType, 'amount', line)) : 0;
					}
					else if(tabType == 'time'){
						BillTimeFlag = 'T';
						BillTimeTAmt += (transactionRecord.getSublistValue(tabType, 'amount', line) != null && transactionRecord.getSublistValue(tabType, 'amount', line).toString().length > 0) ? parseFloat(transactionRecord.getSublistValue(tabType, 'amount', line)) : 0;
					}
				}
			}
		}
		
		function AVA_GetTaxcodes(transactionRecord){
			var taxcodeArray = new Array();
			
			if(transactionRecord.getField('taxitem') != null){
				if(transactionRecord.getValue('taxitem') != null && transactionRecord.getValue('taxitem').length > 0){
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
						transactionRecord.setValue({
							fieldId: 'custpage_ava_formtaxcode',
							value: transactionRecord.getText('taxitem'),
							ignoreFieldChange: true
						});
					}
					else{
						var taxcode = search.lookupFields({
							type: search.Type.SALES_TAX_ITEM,
							id: transactionRecord.getValue('taxitem'),
							columns: 'itemid'
						});
						
						if(taxcode.itemid == null || taxcode.itemid.length == 0){
							taxcode = search.lookupFields({
								type: search.Type.TAX_GROUP,
								id: transactionRecord.getValue('taxitem'),
								columns: 'itemid'
							});
						}
						
						transactionRecord.setValue({
							fieldId: 'custpage_ava_formtaxcode',
							value: taxcode.itemid,
							ignoreFieldChange: true
						});
					}
				}
			}
			else{
				AVA_TaxcodeArray = new Array();
				
				if(((BillItemFlag == 'T' || BillExpFlag == 'T' || BillTimeFlag == 'T') && transactionRecord.getValue('custpage_ava_taxcodestatus') != 0) || (transactionRecord.getValue('custpage_ava_context') != 'USERINTERFACE' && (transactionRecord.getValue('custpage_ava_taxcodestatus') != 0 || (transactionRecord.getValue('ismultishipto') == true && transactionRecord.getLineCount('shipgroup') > 0)))){
					var searchTaxItem = search.create({
						type: search.Type.SALES_TAX_ITEM,
						filters: ['isinactive', 'is', 'F'],
						columns: 'itemid'
					});
					searchTaxItem = searchTaxItem.run();
					var searchResultTaxItem = searchTaxItem.getRange({
						start: 0,
						end: 1000
					});
					
					var j = 0;
					while(searchResultTaxItem != null && searchResultTaxItem.length > 0){
						for(var i = 0; i < searchResultTaxItem.length; i++){
							taxcodeArray[taxcodeArray.length] = new Array();
							taxcodeArray[taxcodeArray.length - 1][0] = searchResultTaxItem[i].id;
							taxcodeArray[taxcodeArray.length - 1][1] = searchResultTaxItem[i].getValue('itemid');
							j++;
						}
						
						if(searchResultTaxItem.length == 1000){
							searchResultTaxItem = searchTaxItem.getRange({
								start: j,
								end: j + 1000
							});
						}
						else{
							break;
						}
					}
					
					var searchTaxGroup = search.create({
						type: search.Type.TAX_GROUP,
						filters: ['isinactive', 'is', 'F'],
						columns: 'itemid'
					});
					searchTaxGroup = searchTaxGroup.run();
					var searchResultTaxGroup = searchTaxGroup.getRange({
						start: 0,
						end: 1000
					});
					
					j = 0;
					while(searchResultTaxGroup != null && searchResultTaxGroup.length > 0){
						for(var i = 0; i < searchResultTaxGroup.length; i++){
							taxcodeArray[taxcodeArray.length] = new Array();
							taxcodeArray[taxcodeArray.length - 1][0] = searchResultTaxGroup[i].id;
							taxcodeArray[taxcodeArray.length - 1][1] = searchResultTaxGroup[i].getValue('itemid');
							j++;
						}
						
						if(searchResultTaxGroup.length == 1000){
							searchResultTaxGroup = searchTaxGroup.getRange({
								start: j,
								end: j + 1000
							});
						}
						else{
							break;
						}
					}
				}
				
				for(var line = 0; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
						AVA_TaxcodeArray[AVA_TaxcodeArray.length] = transactionRecord.getSublistText(AVA_NS_Lines[line][0], 'taxcode', AVA_NS_Lines[line][1]);
					}
					else{
						if(AVA_NS_Lines[line][0] == 'item'){
							if(transactionRecord.getValue('custpage_ava_context') != 'USERINTERFACE'){
								var taxcode = '';
								
								for(var i = 0; i < taxcodeArray.length; i++){
									if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'taxcode', AVA_NS_Lines[line][1]) == taxcodeArray[i][0]){
										taxcode = taxcodeArray[i][1];
										break;
									}
								}
								
								AVA_TaxcodeArray[AVA_TaxcodeArray.length] = taxcode;
							}
							else{
								AVA_TaxcodeArray[AVA_TaxcodeArray.length] = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'taxcode_display', AVA_NS_Lines[line][1]);
							}
						}
						else{
							var taxcode = '';
							
							for(var i = 0; i < taxcodeArray.length; i++){
								if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'taxcode', AVA_NS_Lines[line][1]) == taxcodeArray[i][0]){
									taxcode = taxcodeArray[i][1];
									break;
								}
							}
							
							AVA_TaxcodeArray[AVA_TaxcodeArray.length] = taxcode;
						}
					}
				}
				
				if(transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false){
					if(transactionRecord.getValue('shippingtaxcode') != null && transactionRecord.getValue('shippingtaxcode').length > 0){
						var taxcode;
						
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
							taxcode = transactionRecord.getText('shippingtaxcode');
						}
						else{
							if(transactionRecord.getValue('tax2total') != null){
								taxcode = search.lookupFields({
									type: search.Type.TAX_GROUP,
									id: transactionRecord.getValue('shippingtaxcode'),
									columns: 'itemid'
								});
							}
							else{
								taxcode = search.lookupFields({
									type: search.Type.SALES_TAX_ITEM,
									id: transactionRecord.getValue('shippingtaxcode'),
									columns: 'itemid'
								});
							}
							
							taxcode = taxcode.itemid;
						}
						
						transactionRecord.setValue({
							fieldId: 'custpage_ava_shiptaxcode',
							value: taxcode,
							ignoreFieldChange: true
						});
					}
					
					if(transactionRecord.getValue('handlingtaxcode') != null && transactionRecord.getValue('handlingtaxcode').length > 0){
						var taxcode;
						
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
							taxcode = transactionRecord.getText('handlingtaxcode');
						}
						else{
							if(transactionRecord.getValue('tax2total') != null){
								taxcode = search.lookupFields({
									type: search.Type.TAX_GROUP,
									id: transactionRecord.getValue('handlingtaxcode'),
									columns: 'itemid'
								});
							}
							else{
								taxcode = search.lookupFields({
									type: search.Type.SALES_TAX_ITEM,
									id: transactionRecord.getValue('handlingtaxcode'),
									columns: 'itemid'
								});
							}
							
							taxcode = taxcode.itemid;
						}
						
						transactionRecord.setValue({
							fieldId: 'custpage_ava_handlingtaxcode',
							value: taxcode,
							ignoreFieldChange: true
						});
					}
				}
				else{
					AVA_ShipGroupTaxcodesDetails(transactionRecord, taxcodeArray);
				}
			}
		}
		
		function AVA_ShipGroupTaxcodesDetails(transactionRecord, taxcodeArray){
			var defTaxCodeId = transactionRecord.getValue('custpage_ava_deftaxid');
			var defTaxCode = transactionRecord.getValue('custpage_ava_deftax');
			
			AVA_ShipGroupTaxcodes = new Array();
			
			for(var j = 0, i = 0; j < transactionRecord.getLineCount('shipgroup'); j++){
				var entityUseCode = '';
				AVA_ShipGroupTaxcodes[i] = new Array();
				AVA_ShipGroupTaxcodes[i][0] = j; //LineNumber
				AVA_ShipGroupTaxcodes[i][1] = transactionRecord.getSublistValue('shipgroup', 'shippingtaxcode', j); //Shipping line taxcode Id
				
				if(AVA_ShipGroupTaxcodes[i][1] != null && AVA_ShipGroupTaxcodes[i][1].length > 0){
					if(transactionRecord.getValue('custpage_ava_context') != 'USERINTERFACE'){
						var taxcode = '';
						
						for(var k = 0; k < taxcodeArray.length; k++){
							if(AVA_ShipGroupTaxcodes[i][1] == taxcodeArray[k][0]){
								taxcode = taxcodeArray[k][1];
								break;
							}
						}
						
						AVA_ShipGroupTaxcodes[i][2] = taxcode;
					}
					else{
						AVA_ShipGroupTaxcodes[i][2] = transactionRecord.getSublistValue('shipgroup', 'shippingtaxcode_display', AVA_ShipGroupTaxcodes[i][0]);
					}
				}
				else{
					AVA_ShipGroupTaxcodes[i][1] = defTaxCodeId;
					AVA_ShipGroupTaxcodes[i][2] = defTaxCode;
				}
				
				AVA_ShipGroupTaxcodes[i][3] = 'FREIGHT';
				AVA_ShipGroupTaxcodes[i][4] = entityUseCode;
				
				for(var line = 0; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
					var shipAddress = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'shipaddress', AVA_NS_Lines[line][1]);
					var shipMethod  = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'shipmethod', AVA_NS_Lines[line][1]);
					
					if(shipAddress != null && shipAddress.length > 0 && shipMethod != null && shipMethod.length > 0){
						if(shipAddress == transactionRecord.getSublistValue('shipgroup', 'destinationaddressref', AVA_ShipGroupTaxcodes[i][0]) && shipMethod == transactionRecord.getSublistValue('shipgroup', 'shippingmethodref', AVA_ShipGroupTaxcodes[i][0])){
							entityUseCode = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_shiptousecodetext', AVA_NS_Lines[line][1]);
							AVA_ShipGroupTaxcodes[i][4] = entityUseCode;
							break;
						}
					}
				}
				
				i++;
				if(transactionRecord.getValue('custpage_ava_handling') != null){
					AVA_ShipGroupTaxcodes[i] = new Array();
					AVA_ShipGroupTaxcodes[i][0] = j; //LineNumber
					AVA_ShipGroupTaxcodes[i][1] = transactionRecord.getSublistValue('shipgroup', 'handlingtaxcode', j); //Handling line taxcode Id
					
					if(AVA_ShipGroupTaxcodes[i][1] != null && AVA_ShipGroupTaxcodes[i][1].length > 0){
						if(transactionRecord.getValue('custpage_ava_context') != 'USERINTERFACE'){
							var taxcode = '';
							
							for(var k = 0; k < taxcodeArray.length; k++){
								if(AVA_ShipGroupTaxcodes[i][1] == taxcodeArray[k][0]){
									taxcode = taxcodeArray[k][1];
									break;
								}
							}
							
							AVA_ShipGroupTaxcodes[i][2] = taxcode;
						}
						else{
							AVA_ShipGroupTaxcodes[i][2] = transactionRecord.getSublistValue('shipgroup', 'handlingtaxcode_display', AVA_ShipGroupTaxcodes[i][0]);
						}
					}
					else{
						AVA_ShipGroupTaxcodes[i][1] = defTaxCodeId;
						AVA_ShipGroupTaxcodes[i][2] = defTaxCode;
					}
					
					AVA_ShipGroupTaxcodes[i][3] = 'MISCELLANEOUS';
					AVA_ShipGroupTaxcodes[i][4] = entityUseCode;
					i++;
				}
			}
		}
		
		function AVA_GetLocations(transactionRecord, configCache){
			if(transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
				AVA_GetAllLocations();
			}
			else{
				var response = https.get({
					url: url.resolveScript({
						scriptId: 'customscript_ava_recordload_suitelet',
						deploymentId: 'customdeploy_ava_recordload',
						params: {'type': 'location'},
						returnExternalUrl: true
					})
				});
				
				if(response.body.length > 0){
					AVA_LocationDetails = JSON.parse(response.body);
				}
			}
			
			if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
				AVA_HeaderLocation = new Array();
				
				if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
					if(AVA_CreateFromRecord.getValue('location') != null && AVA_CreateFromRecord.getValue('location').length > 0){
						AVA_HeaderLocation = AVA_GetAddresses(transactionRecord, configCache, AVA_CreateFromRecord.getValue('location'), 2);
					}
					
					if(transactionRecord.getSublistField('item', 'location', 0) != null){
						var taxcode = null;
						AVA_LocationArray = new Array();
						
						if(transactionRecord.getValue('taxitem') != null){
							taxcode = transactionRecord.getValue('custpage_ava_formtaxcode');
							taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
						}
						
						for(var line = 0; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
							var flag = 1;
							
							for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
								if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
									flag = 0;
									break;
								}
							}
							
							if(flag == 1){
								AVA_GetMultiLocationAddr(transactionRecord, configCache, line, taxcode);
							}
						}
					}
				}
				else{
					if(transactionRecord.getValue('location') != null && transactionRecord.getValue('location').length > 0){
						AVA_HeaderLocation = AVA_GetAddresses(transactionRecord, configCache, transactionRecord.getValue('location'), 2);
					}
				}
			}
			else{
				AVA_LocationPOS = 1;
				var taxcode = null;
				AVA_LocationArray = new Array();
				
				if(transactionRecord.getValue('taxitem') != null){
					taxcode = transactionRecord.getValue('custpage_ava_formtaxcode');
					taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
				}
				
				for(var line = 0; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
					if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
						var flag = 1;
						
						for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
							if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
								var existFlag = 'F'; // Flag to check if an address already exists in the Location Array
								var locArrIndex; // Index whose location details need to be copied into a different Array item
								var locArrLen = (AVA_LocationArray != null) ? AVA_LocationArray.length : 0; // Length of Location Array
								var locationId = AVA_CreateFromRecord.getSublistValue(AVA_CreatedFromNS_Lines[i][0], 'location', AVA_CreatedFromNS_Lines[i][1]); // Location internal ID of a line item.
								var pickUpCheck = AVA_CreateFromRecord.getSublistValue(AVA_CreatedFromNS_Lines[i][0], 'custcol_ava_pickup', AVA_CreatedFromNS_Lines[i][1]);
								if(pickUpCheck != true){
									AVA_LocationPOS = 0;
								}
								
								if(transactionRecord.getValue('taxitem') == null){
									taxcode = (AVA_TaxcodeArray[line] == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : AVA_TaxcodeArray[line];
								}
								
								if(taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POD'){
									// Loop to find if the current line location internal id exists in the location array
									for(var locCtr = 0; locCtr < locArrLen; locCtr++){
										if(AVA_LocationArray[locCtr][0] != null && locationId == AVA_LocationArray[locCtr][0]){
											existFlag = 'T';
											locArrIndex = locCtr;
											break;
										}
									}
									
									AVA_LocationArray[locArrLen] = new Array();
									
									if(locationId != null && locationId.length > 0){
										AVA_LocationArray[locArrLen][0] = locationId;
										
										if(existFlag == 'T'){
											// Location Details exists in Location Array, so copy the details
											AVA_LocationArray[locArrLen][1] = new Array();
											AVA_LocationArray[locArrLen][1] = AVA_LocationArray[locArrIndex][1];
										}
										else{
											AVA_LocationArray[locArrLen][1] = new Array();
											AVA_LocationArray[locArrLen][1] = AVA_GetAddresses(transactionRecord, configCache, locationId, 2);
										}
										if(AVA_CreatedFromNS_Lines[i][0] != 'item' && AVA_LocationArray[locArrLen][1][8] == false){
											AVA_LocationPOS = 0;
										}
									}
									else{
										AVA_LocationArray[locArrLen][0] = null;
										AVA_LocationArray[locArrLen][1] = null;
									}
								}
								else{
									AVA_LocationArray[locArrLen] = new Array();
									AVA_LocationArray[locArrLen][0] = null;
									AVA_LocationArray[locArrLen][1] = null;
								}
								
								flag = 0;
								break;
							}
						}
						
						if(flag == 1){
							AVA_GetMultiLocationAddr(transactionRecord, configCache, line, taxcode);
						}
					}
					else{
						AVA_GetMultiLocationAddr(transactionRecord, configCache, line, taxcode);
					}
				}
				
				if(transactionRecord.getValue('ismultishipto') == true){
					var shipLineTaxcode = null;
					
					for(var ship = 0; AVA_ShipGroupTaxcodes != null && ship < AVA_ShipGroupTaxcodes.length; ship++){
						var locationId;
						var existFlag = 'F'; // Flag to check if an address already exists in the Location Array
						var locArrIndex; // Index whose location details need to be copied into a different Array item
						var locArrLen = (AVA_LocationArray != null) ? AVA_LocationArray.length : 0; //Length of Location Array
						
						if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
							locationId = AVA_CreateFromRecord.getSublistValue('shipgroup', 'sourceaddressref',AVA_ShipGroupTaxcodes[ship][0]); // Location internal ID of a line item.
						}
						else{
							locationId = transactionRecord.getSublistValue('shipgroup', 'sourceaddressref',AVA_ShipGroupTaxcodes[ship][0]); // Location internal ID of a line item.
						}
						var amtField = (AVA_ShipGroupTaxcodes[ship][3] == 'FREIGHT') ? 'shippingrate' : 'handlingrate';
						
						shipLineTaxcode = (AVA_ShipGroupTaxcodes[ship][2] == null || AVA_ShipGroupTaxcodes[ship][2] == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : AVA_ShipGroupTaxcodes[ship][2];
						
						//If the shipping/handling taxcode is AVATAX or AVATAX-POS only then include location in location array
						if(transactionRecord.getSublistValue('shipgroup', amtField, AVA_ShipGroupTaxcodes[ship][0]) > 0 && shipLineTaxcode != null && shipLineTaxcode.substr((shipLineTaxcode.length - 3), 3) != 'POD'){
							// Loop to find if the current line location internal id exists in the location array
							for(var locCtr = 0; locCtr < locArrLen; locCtr++){
								if(AVA_LocationArray[locCtr][0] != null && locationId == AVA_LocationArray[locCtr][0]){
									existFlag = 'T';
									locArrIndex = locCtr;
									break;
								}
							}
							
							AVA_LocationArray[locArrLen] = new Array();
							
							if(locationId != null && locationId.length > 0){
								AVA_LocationArray[locArrLen][0] = locationId;
								
								if(existFlag == 'T'){
									// Location Details exists in Location Array, so copy the details
									AVA_LocationArray[locArrLen][1] = new Array();
									AVA_LocationArray[locArrLen][1] = AVA_LocationArray[locArrIndex][1];
								}
								else{
									AVA_LocationArray[locArrLen][1] = new Array();
									AVA_LocationArray[locArrLen][1] = AVA_GetAddresses(transactionRecord, configCache, locationId, 2);
								}
							}
							else{
								AVA_LocationArray[locArrLen][0] = null;
								AVA_LocationArray[locArrLen][1] = null;
							}
						}
						else{
							AVA_LocationArray[locArrLen] = new Array();
							AVA_LocationArray[locArrLen][0] = null;
							AVA_LocationArray[locArrLen][1] = null;
						}
					}
				}
			}
		}
		
		function AVA_GetAllLocations(){
			var j = 0;
			AVA_LocationDetails = [];
			
			var searchRecord = search.create({
				type: search.Type.LOCATION,
				filters: ['isinactive', 'is', 'F'],
				columns:
					[
					 	'name',
					 	'address1',
					 	'address2',
					 	'city',
					 	'state',
					 	'zip',
					 	'country',
					 	'custrecord_ava_ispos',
						search.createColumn({
							name: 'internalid',
							sort: search.Sort.ASC
						})
					]
			});
			searchRecord = searchRecord.run();
			var searchResult = searchRecord.getRange({
				start: 0,
				end: 1000
			});
			
			while(searchResult != null && searchResult.length > 0){
				for(var i = 0; i < searchResult.length; i++){
					AVA_LocationDetails.push(searchResult[i]);
					j++;
				}
				
				if(searchResult.length == 1000){
					searchResult = searchRecord.getRange({
						start: j,
						end: j + 1000
					});
				}
				else{
					break;
				}
			}
		}
		
		function AVA_GetAddresses(transactionRecord, configCache, typeId, recordType){
			var returnCountryName;
			var addressList = new Array();
			if(recordType == 1){
				if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
					if(typeId == 1){
						// Ship To address
						var shipAddr = AVA_CreateFromRecord.getSubrecord({
							fieldId: 'shippingaddress'
						});
						addressList[0] = ((AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist') > 0) ? 'Ship-To Address': 'Custom Ship-To Address').substring(0, 50);
						
						if(shipAddr != null){
							addressList[1] = (shipAddr.getValue('addr1') != null) ? (shipAddr.getValue('addr1')).substring(0, 50) : '';
							addressList[2] = (shipAddr.getValue('addr2') != null) ? (shipAddr.getValue('addr2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (shipAddr.getValue('city') != null) ? (shipAddr.getValue('city')).substring(0, 50) : '';
							addressList[5] = (shipAddr.getValue('state') != null) ? shipAddr.getValue('state') : '';
							addressList[6] = (shipAddr.getValue('zip') != null) ? (shipAddr.getValue('zip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (shipAddr.getValue('country') != null) ? shipAddr.getValue('country') : '');
						}
						else{
							addressList[1] = (AVA_CreateFromRecord.getValue('shipaddr1') != null) ? (AVA_CreateFromRecord.getValue('shipaddr1')).substring(0, 50) : '';
							addressList[2] = (AVA_CreateFromRecord.getValue('shipaddr2') != null) ? (AVA_CreateFromRecord.getValue('shipaddr2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (AVA_CreateFromRecord.getValue('shipcity') != null) ? (AVA_CreateFromRecord.getValue('shipcity')).substring(0, 50) : '';
							addressList[5] = (AVA_CreateFromRecord.getValue('shipstate') != null) ? AVA_CreateFromRecord.getValue('shipstate') : '';
							addressList[6] = (AVA_CreateFromRecord.getValue('shipzip') != null) ? (AVA_CreateFromRecord.getValue('shipzip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (AVA_CreateFromRecord.getValue('shipcountry') != null) ? AVA_CreateFromRecord.getValue('shipcountry') : '');
						}
						
						addressList[7] = returnCountryName[1];
						addressList[8] = (AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude') != null) ? AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude') : '';
						addressList[9] = (AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude') != null) ? AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude') : '';
					}
					else{
						// Bill To address
						var billAddr = transactionRecord.getSubrecord({
							fieldId: 'billingaddress'
						});
						addressList[0] = ((AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist') > 0) ? 'Bill-To Address' : 'Custom Bill-To Address').substring(0, 50);
						
						if(billAddr != null){
							addressList[1] = (billAddr.getValue('addr1') != null) ? (billAddr.getValue('addr1')).substring(0, 50) : '';
							addressList[2] = (billAddr.getValue('addr2') != null) ? (billAddr.getValue('addr2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (billAddr.getValue('city') != null) ? (billAddr.getValue('city')).substring(0, 50) : '';
							addressList[5] = (billAddr.getValue('state') != null) ? billAddr.getValue('state') : '';
							addressList[6] = (billAddr.getValue('zip') != null) ? (billAddr.getValue('zip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (billAddr.getValue('country') != null) ? billAddr.getValue('country') : '');
						}
						else{
							addressList[1] = (AVA_CreateFromRecord.getValue('billaddr1') != null) ? (AVA_CreateFromRecord.getValue('billaddr1')).substring(0, 50) : '';
							addressList[2] = (AVA_CreateFromRecord.getValue('billaddr2') != null) ? (AVA_CreateFromRecord.getValue('billaddr2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (AVA_CreateFromRecord.getValue('billcity') != null) ? (AVA_CreateFromRecord.getValue('billcity')).substring(0, 50) : '';
							addressList[5] = (AVA_CreateFromRecord.getValue('billstate') != null) ? AVA_CreateFromRecord.getValue('billstate') : '';
							addressList[6] = (AVA_CreateFromRecord.getValue('billzip') != null) ? (AVA_CreateFromRecord.getValue('billzip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (AVA_CreateFromRecord.getValue('billcountry') != null) ? AVA_CreateFromRecord.getValue('billcountry') : '');
						}
						
						addressList[7] = returnCountryName[1];
						addressList[8] = (AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude') != null) ? AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude') : '';
						addressList[9] = (AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude') != null) ? AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude') : '';
					}
				}
				else{
					if(typeId == 1){
						// Ship To address
						var shipAddr = transactionRecord.getSubrecord({
							fieldId: 'shippingaddress'
						});
						addressList[0] = ((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist') > 0) ? 'Ship-To Address' : 'Custom Ship-To Address').substring(0, 50);
						
						if(shipAddr != null){
							addressList[1] = (shipAddr.getValue('addr1') != null) ? (shipAddr.getValue('addr1')).substring(0, 50) : '';
							addressList[2] = (shipAddr.getValue('addr2') != null) ? (shipAddr.getValue('addr2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (shipAddr.getValue('city') != null) ? (shipAddr.getValue('city')).substring(0, 50) : '';
							addressList[5] = (shipAddr.getValue('state') != null) ? shipAddr.getValue('state') : '';
							addressList[6] = (shipAddr.getValue('zip') != null) ? (shipAddr.getValue('zip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (shipAddr.getValue('country') != null) ? shipAddr.getValue('country') : '');
						}
						else{
							addressList[1] = (transactionRecord.getValue('shipaddr1') != null) ? (transactionRecord.getValue('shipaddr1')).substring(0, 50) : '';
							addressList[2] = (transactionRecord.getValue('shipaddr2') != null) ? (transactionRecord.getValue('shipaddr2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (transactionRecord.getValue('shipcity') != null) ? (transactionRecord.getValue('shipcity')).substring(0, 50) : '';
							addressList[5] = (transactionRecord.getValue('shipstate') != null) ? transactionRecord.getValue('shipstate') : '';
							addressList[6] = (transactionRecord.getValue('shipzip') != null) ? (transactionRecord.getValue('shipzip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (transactionRecord.getValue('shipcountry') != null) ? transactionRecord.getValue('shipcountry') : '');
						}
						
						addressList[7] = returnCountryName[1];
						addressList[8] = (transactionRecord.getValue('custbody_ava_shipto_latitude') != null) ? transactionRecord.getValue('custbody_ava_shipto_latitude') : '';
						addressList[9] = (transactionRecord.getValue('custbody_ava_shipto_longitude') != null) ? transactionRecord.getValue('custbody_ava_shipto_longitude') : '';
					}
					else{
						// Bill To address
						var billAddr = transactionRecord.getSubrecord({
							fieldId: 'billingaddress'
						});
						addressList[0] = ((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist') > 0) ? 'Bill-To Address' : 'Custom Bill-To Address').substring(0, 50);
						
						if(billAddr != null){
							addressList[1] = (billAddr.getValue('addr1') != null) ? (billAddr.getValue('addr1')).substring(0, 50) : '';
							addressList[2] = (billAddr.getValue('addr2') != null) ? (billAddr.getValue('addr2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (billAddr.getValue('city') != null) ? (billAddr.getValue('city')).substring(0, 50) : '';
							addressList[5] = (billAddr.getValue('state') != null) ? billAddr.getValue('state') : '';
							addressList[6] = (billAddr.getValue('zip') != null) ? (billAddr.getValue('zip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (billAddr.getValue('country') != null) ? billAddr.getValue('country') : '');
						}
						else{
							addressList[1] = (transactionRecord.getValue('billaddr1') != null) ? (transactionRecord.getValue('billaddr1')).substring(0, 50) : '';
							addressList[2] = (transactionRecord.getValue('billaddr2') != null) ? (transactionRecord.getValue('billaddr2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (transactionRecord.getValue('billcity') != null) ? (transactionRecord.getValue('billcity')).substring(0, 50) : '';
							addressList[5] = (transactionRecord.getValue('billstate') != null) ? transactionRecord.getValue('billstate') : '';
							addressList[6] = (transactionRecord.getValue('billzip') != null) ? (transactionRecord.getValue('billzip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (transactionRecord.getValue('billcountry') != null) ? transactionRecord.getValue('billcountry') : '');
						}
						
						addressList[7] = returnCountryName[1];
						addressList[8] = (transactionRecord.getValue('custbody_ava_billto_latitude') != null) ? transactionRecord.getValue('custbody_ava_billto_latitude') : '';
						addressList[9] = (transactionRecord.getValue('custbody_ava_billto_longitude') != null) ? transactionRecord.getValue('custbody_ava_billto_longitude') : '';
					}
				}
			}
			else if(recordType == 2){
				// Location record to be fetched
				if(transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
					for(var i = 0; AVA_LocationDetails != null && i < AVA_LocationDetails.length; i++){
						if(AVA_LocationDetails[i].id == typeId){
							addressList[0] = (AVA_LocationDetails[i].getValue('name') != null) ? (AVA_LocationDetails[i].getValue('name')).substring(0, 50) : '';
							addressList[1] = (AVA_LocationDetails[i].getValue('address1') != null) ? (AVA_LocationDetails[i].getValue('address1')).substring(0, 50) : '';
							addressList[2] = (AVA_LocationDetails[i].getValue('address2') != null) ? (AVA_LocationDetails[i].getValue('address2')).substring(0, 100) : '';
							addressList[3] = '';
							addressList[4] = (AVA_LocationDetails[i].getValue('city') != null) ? (AVA_LocationDetails[i].getValue('city')).substring(0, 50) : '';
							addressList[5] = (AVA_LocationDetails[i].getValue('state') != null) ? AVA_LocationDetails[i].getValue('state') : '';
							addressList[6] = (AVA_LocationDetails[i].getValue('zip') != null) ? (AVA_LocationDetails[i].getValue('zip')).substring(0, 11) : '';
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (AVA_LocationDetails[i].getValue('country') != null) ? AVA_LocationDetails[i].getValue('country') : '');
							addressList[7] = returnCountryName[1];
							addressList[8] = AVA_LocationDetails[i].getValue('custrecord_ava_ispos');
							break;
						}
					}
				}
				else{
					for(var i = 0; AVA_LocationDetails != null && i < AVA_LocationDetails.length; i++){
						if(AVA_LocationDetails[i].id == typeId){
							addressList[0] = AVA_LocationDetails[i].values.name;
							addressList[1] = AVA_LocationDetails[i].values.address1;
							addressList[2] = AVA_LocationDetails[i].values.address2;
							addressList[3] = '';
							addressList[4] = AVA_LocationDetails[i].values.city;
							addressList[5] = AVA_LocationDetails[i].values.state;
							addressList[6] = AVA_LocationDetails[i].values.zip;
							returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', AVA_LocationDetails[i].values.country);
							addressList[7] = returnCountryName[1];
							addressList[8] = AVA_LocationDetails[i].values.custrecord_ava_ispos;
							break;
						}
					}
				}
			}
			
			return addressList;
		}
		
		function AVA_GetMultiLocationAddr(transactionRecord, configCache, line, taxcode){
			var existFlag = 'F'; // Flag to check if an address already exists in the Location Array
			var locArrIndex; // Index whose location details need to be copied into a different Array item
			var locArrLen = (AVA_LocationArray != null) ? AVA_LocationArray.length : 0; //Length of Location Array
			var locationId = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]); // Location internal ID of a line item.
			var pickUpCheck = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_pickup', AVA_NS_Lines[line][1]);
			if(pickUpCheck != true){
				AVA_LocationPOS = 0;
			}
			
			if(transactionRecord.getValue('taxitem') == null){	
				taxcode = (AVA_TaxcodeArray[line] == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : AVA_TaxcodeArray[line];
			}
			
			if(taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POD'){
				// Loop to find if the current line location internal id exists in the location array
				for(var locCtr = 0; locCtr < locArrLen; locCtr++){
					if(AVA_LocationArray[locCtr][0] != null && locationId == AVA_LocationArray[locCtr][0]){
						existFlag = 'T';
						locArrIndex = locCtr;
						break;
					}
				}
				
				AVA_LocationArray[locArrLen] = new Array();
				
				if(locationId != null && locationId.length > 0){
					AVA_LocationArray[locArrLen][0] = locationId;
					
					if(existFlag == 'T'){
						// Location Details exists in Location Array, so copy the details
						AVA_LocationArray[locArrLen][1] = new Array();
						AVA_LocationArray[locArrLen][1] = AVA_LocationArray[locArrIndex][1];
					}
					else{
						AVA_LocationArray[locArrLen][1] = new Array();
						AVA_LocationArray[locArrLen][1] = AVA_GetAddresses(transactionRecord, configCache, locationId, 2);
					}
					if(AVA_NS_Lines[line][0] != 'item' && AVA_LocationArray[locArrLen][1][8] == false){
						AVA_LocationPOS = 0;
					}
				}
				else{
					AVA_LocationArray[locArrLen][0] = null;
					AVA_LocationArray[locArrLen][1] = null;
				}
			}
			else{
				AVA_LocationArray[locArrLen] = new Array();
				AVA_LocationArray[locArrLen][0] = null;
				AVA_LocationArray[locArrLen][1] = null;
			}
		}
		
		function AVA_GetMultiShipAddr(transactionRecord, configCache){
			var arrIndex = 0, taxcode;
			
			if(transactionRecord.getValue('taxitem') != null){
				taxcode = transactionRecord.getValue('custpage_ava_formtaxcode');
			}
			
			if(transactionRecord.getValue('ismultishipto') == true){
				AVA_MultiShipAddArray = new Array();
				
				for(var line = 0; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
					var flag = 1;
					
					if(AVA_LocationPOS == 0){
						if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
							for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
								if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
									if(AVA_CreatedFromNS_Lines[i][0] == 'item'){
										var linetype = AVA_CreateFromRecord.getSublistValue(AVA_CreatedFromNS_Lines[i][0], 'itemtype', AVA_CreatedFromNS_Lines[i][1]);
										
										if(transactionRecord.getValue('taxitem') == null){
											taxcode = AVA_TaxcodeArray[line];
										}
										
										taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
										
										if(taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POS' && !(linetype == 'Description' || linetype == 'Subtotal' || linetype == 'Group' || linetype == 'EndGroup' || linetype == 'Discount')){
											var addrExist = 'F';
											
											for(var m = 0; m < AVA_MultiShipAddArray.length; m++){
												if(AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) == AVA_MultiShipAddArray[m][0]){
													addrExist = 'T';
													break;
												}
											}
											
											if(addrExist == 'F'){
												arrIndex = (AVA_MultiShipAddArray != null && AVA_MultiShipAddArray.length > 0) ? AVA_MultiShipAddArray.length : arrIndex;
												AVA_MultiShipAddArray[arrIndex] = new Array();
												
												if(AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length > 0){
													//if ship-to field selected at line level
													AVA_MultiShipAddArray[arrIndex] = new Array();
													AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]);
													AVA_MultiShipAddArray[arrIndex][1] = new Array();
													
													for(var k = 0; k < AVA_CreateFromRecord.getLineCount('iladdrbook'); k++){
														if(AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) == AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k)){
															AVA_MultiShipAddArray[arrIndex][1][0] = 'Ship-To Address - ' + AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k);
															AVA_MultiShipAddArray[arrIndex][1][1] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).substring(0, 50) : '';
															AVA_MultiShipAddArray[arrIndex][1][2] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).substring(0, 100) : '';
															AVA_MultiShipAddArray[arrIndex][1][3] = '';
															AVA_MultiShipAddArray[arrIndex][1][4] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).substring(0, 50) : '';
															AVA_MultiShipAddArray[arrIndex][1][5] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) : '';
															AVA_MultiShipAddArray[arrIndex][1][6] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).substring(0, 11) : '';
															AVA_MultiShipAddArray[arrIndex][1][7] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) : '';
															AVA_MultiShipAddArray[arrIndex][1][8] = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) : '';
															AVA_MultiShipAddArray[arrIndex][1][9] = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) : '';
															arrIndex++;
															break;
														}
													}
												}
												else{
													var latLong = 'F';
													if(AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]).length > 0){
														AVA_MultiShipAddArray[arrIndex][0] = 'Ship-To Lat/Long-' + AVA_NS_Lines[line][1];
														AVA_MultiShipAddArray[arrIndex][1] = new Array();
														AVA_MultiShipAddArray[arrIndex][1][0] = 'Ship-To Lat/Long-' + AVA_NS_Lines[line][1];
														AVA_MultiShipAddArray[arrIndex][1][1] = AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]);
														AVA_MultiShipAddArray[arrIndex][1][2] = AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]);
														latLong = 'T';
													}
													
													if(latLong == 'F'){
														//no ship-to selected at line level
														if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK' || transactionRecord.getValue('source') == 'SCIS'){
															if(configCache.AVA_DisableLocationCode == false){
																if((transactionRecord.getValue('custpage_ava_lineloc') == true || transactionRecord.getValue('custpage_ava_lineloc') == 'T') && AVA_CreateFromRecord.getSublistValue('item', 'location', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'location', AVA_CreatedFromNS_Lines[i][1]).length > 0){
																	AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getSublistValue('item', 'location', AVA_CreatedFromNS_Lines[i][1]);
																	AVA_MultiShipAddArray[arrIndex][1] = new Array();
																	AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, AVA_CreateFromRecord.getSublistValue('item', 'location', AVA_CreatedFromNS_Lines[i][1]), 2);
																}
																else if(AVA_CreateFromRecord.getValue('location') != null && AVA_CreateFromRecord.getValue('location').length > 0){
																	if(AVA_HeaderLocation == null || AVA_HeaderLocation.length == 0){
																		AVA_HeaderLocation = AVA_GetAddresses(transactionRecord, configCache, AVA_CreateFromRecord.getValue('location'), 2);
																	}
																	
																	AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getValue('location');
																	AVA_MultiShipAddArray[arrIndex][1] = new Array();
																	AVA_MultiShipAddArray[arrIndex][1] = AVA_HeaderLocation;
																}
																else{
																	AVA_MultiShipAddArray[arrIndex][0] = 'Default Address';
																	AVA_MultiShipAddArray[arrIndex][1] = new Array();
																	AVA_MultiShipAddArray[arrIndex][1][0] = 'Default Address';
																	AVA_MultiShipAddArray[arrIndex][1][1] = AVA_Def_Addr1;
																	AVA_MultiShipAddArray[arrIndex][1][2] = AVA_Def_Addr2;
																	AVA_MultiShipAddArray[arrIndex][1][3] = '';
																	AVA_MultiShipAddArray[arrIndex][1][4] = AVA_Def_City;
																	AVA_MultiShipAddArray[arrIndex][1][5] = AVA_Def_State;
																	AVA_MultiShipAddArray[arrIndex][1][6] = AVA_Def_Zip;
																	AVA_MultiShipAddArray[arrIndex][1][7] = AVA_Def_Country;
																}
															}
															else{
																AVA_MultiShipAddArray[arrIndex][0] = 'Default Address';
																AVA_MultiShipAddArray[arrIndex][1] = new Array();
																AVA_MultiShipAddArray[arrIndex][1][0] = 'Default Address';
																AVA_MultiShipAddArray[arrIndex][1][1] = AVA_Def_Addr1;
																AVA_MultiShipAddArray[arrIndex][1][2] = AVA_Def_Addr2;
																AVA_MultiShipAddArray[arrIndex][1][3] = '';
																AVA_MultiShipAddArray[arrIndex][1][4] = AVA_Def_City;
																AVA_MultiShipAddArray[arrIndex][1][5] = AVA_Def_State;
																AVA_MultiShipAddArray[arrIndex][1][6] = AVA_Def_Zip;
																AVA_MultiShipAddArray[arrIndex][1][7] = AVA_Def_Country;
															}
														}
														else{
															if(AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0 && AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0){
																AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getValue('shipaddress');
																AVA_MultiShipAddArray[arrIndex][1] = new Array();
																AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 1, 1);
															}
															else{
																if(AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude').length > 0 && AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude').length > 0){
																	AVA_MultiShipAddArray[arrIndex][0] = 'Header Ship-To Lat/Long';
																	AVA_MultiShipAddArray[arrIndex][1] = new Array();
																	AVA_MultiShipAddArray[arrIndex][1][0] = 'Header Ship-To Lat/Long';
																	AVA_MultiShipAddArray[arrIndex][1][1] = AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude');
																	AVA_MultiShipAddArray[arrIndex][1][2] = AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude');
																}
																else if(AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0 && AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0){
																	AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getValue('billaddress');
																	AVA_MultiShipAddArray[arrIndex][1] = new Array();
																	AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
																}
																else if(AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude').length > 0 && AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude').length > 0){
																	AVA_MultiShipAddArray[arrIndex][0] = 'Header Bill-To Lat/Long';
																	AVA_MultiShipAddArray[arrIndex][1] = new Array();
																	AVA_MultiShipAddArray[arrIndex][1][0] = 'Header Bill-To Lat/Long';
																	AVA_MultiShipAddArray[arrIndex][1][1] = AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude');
																	AVA_MultiShipAddArray[arrIndex][1][2] = AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude');
																}
															}
														}
													}
												}
											}
										}
									}
									else{
										arrIndex = (AVA_MultiShipAddArray != null && AVA_MultiShipAddArray.length > 0) ? AVA_MultiShipAddArray.length : arrIndex;
										AVA_MultiShipAddArray[arrIndex] = new Array();
												
										if(AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0 && AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0){
											AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getValue('shipaddress');
											AVA_MultiShipAddArray[arrIndex][1] = new Array();
											AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 1, 1);
										}
										else{
											if(AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude').length > 0 && AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude').length > 0){
												AVA_MultiShipAddArray[arrIndex][0] = 'Header Ship-To Lat/Long';
												AVA_MultiShipAddArray[arrIndex][1] = new Array();
												AVA_MultiShipAddArray[arrIndex][1][0] = 'Header Ship-To Lat/Long';
												AVA_MultiShipAddArray[arrIndex][1][1] = AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude');
												AVA_MultiShipAddArray[arrIndex][1][2] = AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude');
											}
											else if(AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0 && AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0){
												AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getValue('billaddress');
												AVA_MultiShipAddArray[arrIndex][1] = new Array();
												AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
											}
											else if(AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude').length > 0 && AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude').length > 0){
												AVA_MultiShipAddArray[arrIndex][0] = 'Header Bill-To Lat/Long';
												AVA_MultiShipAddArray[arrIndex][1] = new Array();
												AVA_MultiShipAddArray[arrIndex][1][0] = 'Header Bill-To Lat/Long';
												AVA_MultiShipAddArray[arrIndex][1][1] = AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude');
												AVA_MultiShipAddArray[arrIndex][1][2] = AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude');
											}
										}
									}
									
									flag = 0;
									break;
								}
							}
						}
					}
					
					if(flag == 1){
						if(AVA_NS_Lines[line][0] == 'item'){
							var linetype = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'itemtype', AVA_NS_Lines[line][1]);
							
							if(transactionRecord.getValue('taxitem') == null){
								taxcode = AVA_TaxcodeArray[line];
							}
							
							taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
							
							if(taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POS' && !(linetype == 'Description' || linetype == 'Subtotal' || linetype == 'Group' || linetype == 'EndGroup' || linetype == 'Discount')){
								var addrExist = 'F';
								
								for(var m = 0; m < AVA_MultiShipAddArray.length; m++){
									if(transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) == AVA_MultiShipAddArray[m][0]){
										addrExist = 'T';
										break;
									}
								}
								
								if(addrExist == 'F'){
									arrIndex = (AVA_MultiShipAddArray != null && AVA_MultiShipAddArray.length > 0) ? AVA_MultiShipAddArray.length : arrIndex;
									AVA_MultiShipAddArray[arrIndex] = new Array();
									
									if(transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length > 0){
										//if ship-to field selected at line level
										AVA_MultiShipAddArray[arrIndex] = new Array();
										AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]);
										AVA_MultiShipAddArray[arrIndex][1] = new Array();
										
										for(var k = 0; k < transactionRecord.getLineCount('iladdrbook'); k++){
											if(transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) == transactionRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k)){
												AVA_MultiShipAddArray[arrIndex][1][0] = 'Ship-To Address - ' + transactionRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k);
												AVA_MultiShipAddArray[arrIndex][1][1] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).substring(0, 50) : '';
												AVA_MultiShipAddArray[arrIndex][1][2] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).substring(0, 100) : '';
												AVA_MultiShipAddArray[arrIndex][1][3] = '';
												AVA_MultiShipAddArray[arrIndex][1][4] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).substring(0, 50) : '';
												AVA_MultiShipAddArray[arrIndex][1][5] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) : '';
												AVA_MultiShipAddArray[arrIndex][1][6] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).substring(0, 11) : '';
												AVA_MultiShipAddArray[arrIndex][1][7] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) : '';
												AVA_MultiShipAddArray[arrIndex][1][8] = (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) : '';
												AVA_MultiShipAddArray[arrIndex][1][9] = (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) : '';
												arrIndex++;
												break;
											}
										}
									}
									else{
										var latLong = 'F';
										if(transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]).length > 0){
											AVA_MultiShipAddArray[arrIndex][0] = 'Ship-To Lat/Long-' + AVA_NS_Lines[line][1];
											AVA_MultiShipAddArray[arrIndex][1] = new Array();
											AVA_MultiShipAddArray[arrIndex][1][0] = 'Ship-To Lat/Long-' + AVA_NS_Lines[line][1];
											AVA_MultiShipAddArray[arrIndex][1][1] = transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]);
											AVA_MultiShipAddArray[arrIndex][1][2] = transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]);
											latLong = 'T';
										}
										
										if(latLong == 'F'){
											//no ship-to selected at line level
											if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK' || transactionRecord.getValue('source') == 'SCIS'){
												if(configCache.AVA_DisableLocationCode == false){
													if((transactionRecord.getValue('custpage_ava_lineloc') == true || transactionRecord.getValue('custpage_ava_lineloc') == 'T') && transactionRecord.getSublistValue('item', 'location', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'location', AVA_NS_Lines[line][1]).length > 0){
														AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getSublistValue('item', 'location', AVA_NS_Lines[line][1]);
														AVA_MultiShipAddArray[arrIndex][1] = new Array();
														AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, transactionRecord.getSublistValue('item', 'location', AVA_NS_Lines[line][1]), 2);
													}
													else if(transactionRecord.getValue('location') != null && transactionRecord.getValue('location').length > 0){
														if(AVA_HeaderLocation == null || AVA_HeaderLocation.length == 0){
															AVA_HeaderLocation = AVA_GetAddresses(transactionRecord, configCache, transactionRecord.getValue('location'), 2);
														}
														
														AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getValue('location');
														AVA_MultiShipAddArray[arrIndex][1] = new Array();
														AVA_MultiShipAddArray[arrIndex][1] = AVA_HeaderLocation;
													}
													else{
														AVA_MultiShipAddArray[arrIndex][0] = 'Default Address';
														AVA_MultiShipAddArray[arrIndex][1] = new Array();
														AVA_MultiShipAddArray[arrIndex][1][0] = 'Default Address';
														AVA_MultiShipAddArray[arrIndex][1][1] = AVA_Def_Addr1;
														AVA_MultiShipAddArray[arrIndex][1][2] = AVA_Def_Addr2;
														AVA_MultiShipAddArray[arrIndex][1][3] = '';
														AVA_MultiShipAddArray[arrIndex][1][4] = AVA_Def_City;
														AVA_MultiShipAddArray[arrIndex][1][5] = AVA_Def_State;
														AVA_MultiShipAddArray[arrIndex][1][6] = AVA_Def_Zip;
														AVA_MultiShipAddArray[arrIndex][1][7] = AVA_Def_Country;
													}
												}
												else{
													AVA_MultiShipAddArray[arrIndex][0] = 'Default Address';
													AVA_MultiShipAddArray[arrIndex][1] = new Array();
													AVA_MultiShipAddArray[arrIndex][1][0] = 'Default Address';
													AVA_MultiShipAddArray[arrIndex][1][1] = AVA_Def_Addr1;
													AVA_MultiShipAddArray[arrIndex][1][2] = AVA_Def_Addr2;
													AVA_MultiShipAddArray[arrIndex][1][3] = '';
													AVA_MultiShipAddArray[arrIndex][1][4] = AVA_Def_City;
													AVA_MultiShipAddArray[arrIndex][1][5] = AVA_Def_State;
													AVA_MultiShipAddArray[arrIndex][1][6] = AVA_Def_Zip;
													AVA_MultiShipAddArray[arrIndex][1][7] = AVA_Def_Country;
												}
											}
											else{
												if(transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0 && transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0){
													AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getValue('shipaddress');
													AVA_MultiShipAddArray[arrIndex][1] = new Array();
													AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 1, 1);
												}
												else{
													if(transactionRecord.getValue('custbody_ava_shipto_latitude') != null && transactionRecord.getValue('custbody_ava_shipto_latitude').length > 0 && transactionRecord.getValue('custbody_ava_shipto_longitude') != null && transactionRecord.getValue('custbody_ava_shipto_longitude').length > 0){
														AVA_MultiShipAddArray[arrIndex][0] = 'Header Ship-To Lat/Long';
														AVA_MultiShipAddArray[arrIndex][1] = new Array();
														AVA_MultiShipAddArray[arrIndex][1][0] = 'Header Ship-To Lat/Long';
														AVA_MultiShipAddArray[arrIndex][1][1] = transactionRecord.getValue('custbody_ava_shipto_latitude');
														AVA_MultiShipAddArray[arrIndex][1][2] = transactionRecord.getValue('custbody_ava_shipto_longitude');
													}
													else if(transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0 && transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0){
														AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getValue('billaddress');
														AVA_MultiShipAddArray[arrIndex][1] = new Array();
														AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
													}
													else if(transactionRecord.getValue('custbody_ava_billto_latitude') != null && transactionRecord.getValue('custbody_ava_billto_latitude').length > 0 && transactionRecord.getValue('custbody_ava_billto_longitude') != null && transactionRecord.getValue('custbody_ava_billto_longitude').length > 0){
														AVA_MultiShipAddArray[arrIndex][0] = 'Header Bill-To Lat/Long';
														AVA_MultiShipAddArray[arrIndex][1] = new Array();
														AVA_MultiShipAddArray[arrIndex][1][0] = 'Header Bill-To Lat/Long';
														AVA_MultiShipAddArray[arrIndex][1][1] = transactionRecord.getValue('custbody_ava_billto_latitude');
														AVA_MultiShipAddArray[arrIndex][1][2] = transactionRecord.getValue('custbody_ava_billto_longitude');
													}
												}
											}
										}
									}
								}
							}
						}
						else{
							arrIndex = (AVA_MultiShipAddArray != null && AVA_MultiShipAddArray.length > 0) ? AVA_MultiShipAddArray.length : arrIndex;	
							AVA_MultiShipAddArray[arrIndex] = new Array();
							
							if(transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0 && transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0){
								AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getValue('shipaddress');
								AVA_MultiShipAddArray[arrIndex][1] = new Array();
								AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 1, 1);
							}
							else{
								if(transactionRecord.getValue('custbody_ava_shipto_latitude') != null && transactionRecord.getValue('custbody_ava_shipto_latitude').length > 0 && transactionRecord.getValue('custbody_ava_shipto_longitude') != null && transactionRecord.getValue('custbody_ava_shipto_longitude').length > 0){
									AVA_MultiShipAddArray[arrIndex][0] = 'Header Ship-To Lat/Long';
									AVA_MultiShipAddArray[arrIndex][1] = new Array();
									AVA_MultiShipAddArray[arrIndex][1][0] = 'Header Ship-To Lat/Long';
									AVA_MultiShipAddArray[arrIndex][1][1] = transactionRecord.getValue('custbody_ava_shipto_latitude');
									AVA_MultiShipAddArray[arrIndex][1][2] = transactionRecord.getValue('custbody_ava_shipto_longitude');
								}
								else if(transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0 && transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0){
									AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getValue('billaddress');
									AVA_MultiShipAddArray[arrIndex][1] = new Array();
									AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
								}
								else if(transactionRecord.getValue('custbody_ava_billto_latitude') != null && transactionRecord.getValue('custbody_ava_billto_latitude').length > 0 && transactionRecord.getValue('custbody_ava_billto_longitude') != null && transactionRecord.getValue('custbody_ava_billto_longitude').length > 0){
									AVA_MultiShipAddArray[arrIndex][0] = 'Header Bill-To Lat/Long';
									AVA_MultiShipAddArray[arrIndex][1] = new Array();
									AVA_MultiShipAddArray[arrIndex][1][0] = 'Header Bill-To Lat/Long';
									AVA_MultiShipAddArray[arrIndex][1][1] = transactionRecord.getValue('custbody_ava_billto_latitude');
									AVA_MultiShipAddArray[arrIndex][1][2] = transactionRecord.getValue('custbody_ava_billto_longitude');
								}
							}
						}
					}
				}
				
				for(var ship = 0; AVA_ShipGroupTaxcodes != null && ship < AVA_ShipGroupTaxcodes.length; ship++){
					var amtField = (AVA_ShipGroupTaxcodes[ship][3] == 'FREIGHT') ? 'shippingrate' : 'handlingrate';
					
					var taxcode = AVA_ShipGroupTaxcodes[ship][2];
					taxcode = (taxcode == '-Not Taxable-') ? ((AVA_DefaultTaxCode != null && AVA_DefaultTaxCode.lastIndexOf('+') != -1) ? AVA_DefaultTaxCode.substring(0, AVA_DefaultTaxCode.lastIndexOf('+')) : AVA_DefaultTaxCode) : taxcode;
					
					if(transactionRecord.getSublistValue('shipgroup', amtField, AVA_ShipGroupTaxcodes[ship][0]) > 0 && taxcode != null && taxcode.substr((taxcode.length - 3), 3) != 'POS'){
						var addrExist = 'F', shipAddId;
						
						if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
							shipAddId = AVA_CreateFromRecord.getSublistValue('shipgroup', 'destinationaddressref', AVA_ShipGroupTaxcodes[ship][0]);
						}
						else{
							shipAddId = transactionRecord.getSublistValue('shipgroup', 'destinationaddressref', AVA_ShipGroupTaxcodes[ship][0]);
						}
						
						if(shipAddId == null || shipAddId.length <= 0){
							if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
								shipAddId = (AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0) ? AVA_CreateFromRecord.getValue('shipaddress') : AVA_CreateFromRecord.getValue('billaddress');
							}
							else{
								shipAddId = (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0) ? transactionRecord.getValue('shipaddress') : transactionRecord.getValue('billaddress');
							}
						}
						
						if(line != 0){
							for(var m = 0; AVA_MultiShipAddArray != null && m < AVA_MultiShipAddArray.length; m++){
								if(shipAddId == AVA_MultiShipAddArray[m][0]){
									addrExist = 'T';
									break;
								}
							}
						}
						
						if(addrExist == 'F'){
							arrIndex = (AVA_MultiShipAddArray != null && AVA_MultiShipAddArray.length > 0) ? AVA_MultiShipAddArray.length : arrIndex;
							
							AVA_MultiShipAddArray[arrIndex] = new Array();
							
							if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
								if(AVA_CreateFromRecord.getSublistValue('shipgroup', 'destinationaddressref', AVA_ShipGroupTaxcodes[ship][0]) == null || AVA_CreateFromRecord.getSublistValue('shipgroup', 'destinationaddressref', AVA_ShipGroupTaxcodes[ship][0]).length <= 0){
									if(AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0){
										AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getValue('shipaddress');
										AVA_MultiShipAddArray[arrIndex][1] = new Array();
										AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 1, 1);
									}
									else{
										AVA_MultiShipAddArray[arrIndex][0] = AVA_CreateFromRecord.getValue('billaddress');
										AVA_MultiShipAddArray[arrIndex][1] = new Array();
										AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
									}
								}
								else{
									AVA_MultiShipAddArray[arrIndex][0] = shipAddId;
									AVA_MultiShipAddArray[arrIndex][1] = new Array();
									
									for(var k = 0; k < AVA_CreateFromRecord.getLineCount('iladdrbook'); k++){
										if(shipAddId == AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k)){
											AVA_MultiShipAddArray[arrIndex][1][0] = 'Ship-To Address - ' + AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k);
											AVA_MultiShipAddArray[arrIndex][1][1] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).substring(0, 50) : '';
											AVA_MultiShipAddArray[arrIndex][1][2] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).substring(0, 100) : '';
											AVA_MultiShipAddArray[arrIndex][1][3] = '';
											AVA_MultiShipAddArray[arrIndex][1][4] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).substring(0, 50) : '';
											AVA_MultiShipAddArray[arrIndex][1][5] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) : '';
											AVA_MultiShipAddArray[arrIndex][1][6] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).substring(0, 11) : '';
											AVA_MultiShipAddArray[arrIndex][1][7] = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) : '';
											arrIndex++;
										}
									}
								}
							}
							else{
								if(transactionRecord.getSublistValue('shipgroup', 'destinationaddressref', AVA_ShipGroupTaxcodes[ship][0]) == null || transactionRecord.getSublistValue('shipgroup', 'destinationaddressref', AVA_ShipGroupTaxcodes[ship][0]).length <= 0){
									if(transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0){
										AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getValue('shipaddress');
										AVA_MultiShipAddArray[arrIndex][1] = new Array();
										AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 1, 1);
									}
									else{
										AVA_MultiShipAddArray[arrIndex][0] = transactionRecord.getValue('billaddress');
										AVA_MultiShipAddArray[arrIndex][1] = new Array();
										AVA_MultiShipAddArray[arrIndex][1] = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
									}
								}
								else{
									AVA_MultiShipAddArray[arrIndex][0] = shipAddId;
									AVA_MultiShipAddArray[arrIndex][1] = new Array();
									
									for(var k = 0; k < transactionRecord.getLineCount('iladdrbook'); k++){
										if(shipAddId == transactionRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k)){
											AVA_MultiShipAddArray[arrIndex][1][0] = 'Ship-To Address - ' + transactionRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k);
											AVA_MultiShipAddArray[arrIndex][1][1] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).substring(0, 50) : '';
											AVA_MultiShipAddArray[arrIndex][1][2] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).substring(0, 100) : '';
											AVA_MultiShipAddArray[arrIndex][1][3] = '';
											AVA_MultiShipAddArray[arrIndex][1][4] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).substring(0, 50) : '';
											AVA_MultiShipAddArray[arrIndex][1][5] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) : '';
											AVA_MultiShipAddArray[arrIndex][1][6] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).substring(0, 11) : '';
											AVA_MultiShipAddArray[arrIndex][1][7] = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) : '';
											arrIndex++;
										}
									}
								}
							}
						}
					}
				}
			}
		}
		
		function AVA_GetDestinationAddress(transactionRecord, configCache){
			var shipAddress = 'F', addressList;
			
			if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
				if((AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0)){
					//If ship-address is selected
					addressList = AVA_GetAddresses(transactionRecord, configCache, 1, 1);
					shipAddress = 'T';
				}
				else{
					//If Ship-To List empty, then use Ship-To Lat/Long values
					AVA_ShipToLatitude = (AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude').length > 0) ? AVA_CreateFromRecord.getValue('custbody_ava_shipto_latitude') : '';
					AVA_ShipToLongitude = (AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude').length > 0) ? AVA_CreateFromRecord.getValue('custbody_ava_shipto_longitude') : '';
					if(AVA_ShipToLatitude.length > 0 && AVA_ShipToLongitude.length > 0){
						shipAddress = 'T';
						return 0;	//Proper
					}
				}
				
				if(shipAddress == 'F'){
					if((AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0)){
						addressList = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
					}
					else{
						if(AVA_CreateFromRecord.getValue('billaddress') == null || (AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length == 0)){
							AVA_BillToLatitude = (AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude').length> 0) ? AVA_CreateFromRecord.getValue('custbody_ava_billto_latitude') : '';
							AVA_BillToLongitude = (AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude') != null && AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude').length > 0) ? AVA_CreateFromRecord.getValue('custbody_ava_billto_longitude') : '';
							if(AVA_BillToLatitude.length == 0 && AVA_BillToLongitude.length == 0){
								AVA_ErrorCode = 12;
								return 1; //Invalid
							}
							else{
								return 0; //Proper
							}
						}
						else{
							addressList = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
						}
					}
				}
			}
			else{
				if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
					//If ship-address is selected
					addressList = AVA_GetAddresses(transactionRecord, configCache, 1, 1);
					shipAddress = 'T';
				}
				else{
					//If Ship-To List empty, then use Ship-To Lat/Long values
					AVA_ShipToLatitude = (transactionRecord.getValue('custbody_ava_shipto_latitude') != null && transactionRecord.getValue('custbody_ava_shipto_latitude').length > 0) ? transactionRecord.getValue('custbody_ava_shipto_latitude') : '';
					AVA_ShipToLongitude = (transactionRecord.getValue('custbody_ava_shipto_longitude') != null && transactionRecord.getValue('custbody_ava_shipto_longitude').length > 0) ? transactionRecord.getValue('custbody_ava_shipto_longitude') : '';
					if(AVA_ShipToLatitude.length > 0 && AVA_ShipToLongitude.length > 0){
						shipAddress = 'T';
						return 0;	//Proper
					}
				}
				
				if(shipAddress == 'F'){
					if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
						addressList = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
					}
					else{
						if(transactionRecord.getValue('billaddress') == null || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length == 0)){
							AVA_BillToLatitude = (transactionRecord.getValue('custbody_ava_billto_latitude') != null && transactionRecord.getValue('custbody_ava_billto_latitude').length> 0) ? transactionRecord.getValue('custbody_ava_billto_latitude') : '';
							AVA_BillToLongitude = (transactionRecord.getValue('custbody_ava_billto_longitude') != null && transactionRecord.getValue('custbody_ava_billto_longitude').length > 0) ? transactionRecord.getValue('custbody_ava_billto_longitude') : '';
							if(AVA_BillToLatitude.length == 0 && AVA_BillToLongitude.length == 0){
								AVA_ErrorCode = 12;
								return 1; //Invalid
							}
							else{
								return 0; //Proper
							}
						}
						else{
							addressList = AVA_GetAddresses(transactionRecord, configCache, 2, 1);
						}
					}
				}
			}
			
			return addressList;
		}
		
		function AVA_ItemsTaxLines(transactionRecord, configCache){
			var prev_lineno = 0;
			AVA_BarcodesFeature = runtime.isFeatureInEffect('BARCODES'); // Fix for CONNECT-3479
			var AVA_GroupBegin, AVA_GroupEnd;
			
			AVA_LineNames   = new Array(); // Stores the line names
			AVA_LineType    = new Array(); // Stores the Line Type
			AVA_LineAmount  = new Array(); // Stores the Line amounts 
			AVA_TaxLines    = new Array(); // Stores the value 'T' for Item Type and 'F' for Non-Item Type like discount, payment, markup, description, subtotal, groupbegin and endgroup
			AVA_Taxable     = new Array(); // Stores the value 'T' if line is taxable else 'F'
			AVA_LineQty     = new Array(); // Stores the Line Qty
			AVA_TaxCodes    = new Array(); // Stores the Tax Code Status
			AVA_PickUpFlag  = new Array(); // Stores the Point of Sale flag for each line
			
			AVA_TaxOverrideFlag = 0;
			AVA_AdjustmentLineCnt = 0;
			
			for(var i = 0; i < transactionRecord.getLineCount('item'); i++){
				AVA_LineType[i] = transactionRecord.getSublistValue('item', 'itemtype', i);
				
				if(AVA_LineType[i] != 'EndGroup'){
					if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true && (transactionRecord.getSublistValue('item', 'custcol_ava_upccode', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_upccode', i).length > 0)){
						AVA_LineNames[i] = 'UPC:' + transactionRecord.getSublistValue('item', 'custcol_ava_upccode', i).substring(0, 46);
					}
					else{
						AVA_LineNames[i] = (transactionRecord.getSublistValue('item', 'custcol_ava_item', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_item', i).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_item', i).substring(0, 50) : '';
					}
				}
				else{
					AVA_LineNames[i] = 'End Group';
				}
				
				if(AVA_LineType[i] == 'Payment'){
					AVA_LineQty[i] = 1;
				}
				else{
					AVA_LineQty[i] = transactionRecord.getSublistValue('item', 'quantity', i);
				}
				
				if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i).toString().length > 0){
					if(parseFloat(transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount1', i)) != parseFloat(transactionRecord.getSublistValue('item', 'amount', i))){
						AVA_LineAmount[i] = transactionRecord.getSublistValue('item', 'amount', i);
					}
					else{
						AVA_LineAmount[i] = transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i);
					}
				}
				else{
					AVA_LineAmount[i] = transactionRecord.getSublistValue('item', 'amount', i);
				}
				
				if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund') && AVA_LineNames[i] == 'Sales Tax Adjustment'){
					AVA_TaxOverrideFlag = 1; // Not to send Tax override details at header level.
					AVA_AdjustmentLineCnt++; // Count for Sales Tax Adjustment line.
					
					if(AVA_LineAmount[i] > 0){
						alert('Sales Tax Adjustment\'s line amount should be zero.');
						AVA_ErrorCode = false;
						return false;
					}
				}
				
				if(transactionRecord.getField('taxitem') != null){
					AVA_Taxable[i]  = (transactionRecord.getSublistValue('item', 'istaxable', i) == true) ? 'T' : 'F';
					AVA_TaxCodes[i] = AVA_IdentifyTaxCode(transactionRecord.getValue('custpage_ava_formtaxcode'), transactionRecord.getValue('custpage_ava_deftax'));
				}
				else{
					AVA_Taxable[i]  = (AVA_TaxcodeArray[i] == '-Not Taxable-') ? 'F' : 'T';
					AVA_TaxCodes[i] = AVA_IdentifyTaxCode(AVA_TaxcodeArray[i], transactionRecord.getValue('custpage_ava_deftax'));
				}
				
				AVA_PickUpFlag[i] = transactionRecord.getSublistValue('item', 'custcol_ava_pickup', i);
				
				if(i == AVA_GroupBegin && AVA_GroupEnd != 0){
					var k;
					for(k = i; k <= AVA_GroupEnd; k++){
						AVA_LineType[k] = transactionRecord.getSublistValue('item', 'itemtype', k);

						if(AVA_LineType[k] != 'EndGroup'){
							if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true && (transactionRecord.getSublistValue('item', 'custcol_ava_upccode', k) != null && transactionRecord.getSublistValue('item', 'custcol_ava_upccode', k).length > 0)){
								AVA_LineNames[k] = 'UPC:' + transactionRecord.getSublistValue('item', 'custcol_ava_upccode', k).substring(0, 46);
							}
							else{
								AVA_LineNames[k] = (transactionRecord.getSublistValue('item', 'custcol_ava_item', k) != null && transactionRecord.getSublistValue('item', 'custcol_ava_item', k).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_item', k).substring(0, 50) : '';
							}
						}
						else{
							AVA_LineNames[k] = 'End Group';
						}
						
						if(AVA_LineType[k] == 'Payment'){
							AVA_LineQty[k] = 1;
						}
						else{
							AVA_LineQty[k] = transactionRecord.getSublistValue('item', 'quantity', k);
						}
						
						if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k) != null && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k).toString().length > 0){
							if(parseFloat(transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount1', k)) != parseFloat(transactionRecord.getSublistValue('item', 'amount', k))){
								AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'amount', k);
							}
							else{
								AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k);
							}
						}
						else{
							AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'amount', k);
						}
						
						if(transactionRecord.getValue('taxitem') != null){
							AVA_Taxable[k]  = (transactionRecord.getSublistValue('item', 'istaxable', k) == true) ? 'T' : 'F';
							AVA_TaxCodes[k] = AVA_IdentifyTaxCode(transactionRecord.getValue('custpage_ava_formtaxcode'), transactionRecord.getValue('custpage_ava_deftax'));
						}
						else{
							AVA_Taxable[k]  = (AVA_TaxcodeArray[k] == '-Not Taxable-') ? 'F' : 'T';
							AVA_TaxCodes[k] = AVA_IdentifyTaxCode(AVA_TaxcodeArray[k], transactionRecord.getValue('custpage_ava_deftax'));
						}
						
						switch(AVA_LineType[k]){
							case 'Discount':
							case 'Markup':
								if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0){
									//Discount Mechanism
									AVA_LineQty[k] = 1;
									AVA_TaxLines[k] = 'T';
									AVA_Taxable[k] = 'F';
									if(k == i){
										AVA_TaxLines[k] = 'F';
									}
								}
								else{
									if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
										AVA_LineQty[k] = 1;
										AVA_TaxLines[k] = 'T';
										if(k == i){
											AVA_TaxLines[k] = 'F';
										}
									}
									else{
										AVA_TaxLines[k] = 'F';
										AVA_Taxable [k] = 'F';
										var discountItem = transactionRecord.getSublistValue('item', 'amount', k).toString(); //here current lines discount is fetched
										if(discountItem != null && discountItem.indexOf('%') != -1){
											discountItem = discountItem.substring(0, discountItem.indexOf('%'));
										}
										
										if(discountItem != 0){
											if(k == i){
												//when there is no preceeding Inv Item before a Discount item
												AVA_LineQty[k] = 1;
												AVA_LineAmount[k] = discountItem;
												AVA_TaxLines[k] = 'T'; //This section's discount will be sent as Line exempt
											}
											else{
												var totallines = 0, prev;
												for(prev = k; AVA_LineType[prev] != 'InvtPart' && AVA_LineType[prev] != 'Subtotal' && AVA_LineType[prev] != 'Kit' && AVA_LineType[prev] != 'Assembly' && AVA_LineType[prev] != 'NonInvtPart' && AVA_LineType[prev] != 'OthCharge' && AVA_LineType[prev] != 'Service' && AVA_LineType[prev] != 'Group' && AVA_LineType[prev] != 'GiftCert' && AVA_LineType[prev] != 'DwnLdItem'; prev--); //searches for the preceeding Inv Item, subtotal or Kit item
												var prevItemAmt = AVA_LineAmount[prev]; //this fetches the preceeding InvItem's amount
												AVA_LineAmount[k] = discountItem;
												
												if(AVA_LineType[prev] == 'Group'){
													AVA_LineQty[k] = 1;
													AVA_LineAmount[k] = discountItem;
													AVA_TaxLines[k] = 'T';
												}
												
												if((AVA_LineType[prev] == 'InvtPart' || AVA_LineType[prev] == 'Kit' || AVA_LineType[prev] == 'Assembly' || AVA_LineType[prev] == 'NonInvtPart' || AVA_LineType[prev] == 'OthCharge' || AVA_LineType[prev] == 'Service' || AVA_LineType[prev] == 'GiftCert' || AVA_LineType[prev] == 'DwnLdItem') && AVA_Taxable[prev] == 'T'){ //when the preceeding item is Inventory and is taxable
													AVA_LineAmount[prev] = parseFloat(prevItemAmt) + parseFloat(discountItem); //as we wud hve set some value earlier for the Inv item, that's why when Discount is identified below it, the Inv item's amount is exchanged with the discounted amt
												}
												
												if((AVA_LineType[prev] == 'InvtPart' || AVA_LineType[prev] == 'Kit' || AVA_LineType[prev] == 'Assembly' || AVA_LineType[prev] == 'NonInvtPart' || AVA_LineType[prev] == 'OthCharge' || AVA_LineType[prev] == 'Service' || AVA_LineType[prev] == 'GiftCert' || AVA_LineType[prev] == 'DwnLdItem') && AVA_Taxable[prev] == 'F'){ //when the preceeding item is Inventory but is not taxable
													AVA_LineQty[k] = 1;
													AVA_LineAmount[k] = discountItem;
													AVA_TaxLines[k] = 'T';
												}
												
												if(AVA_LineType[prev] == 'Subtotal'){ //when the preceeding item is a Subtotal item
													var j;
													var totalamt = 0; //to get total of all taxable items
													for(j = prev - 1; AVA_LineType[j] != 'Subtotal' && AVA_LineType[j] != 'Group'; j--){ //finds the last subtotal line, so that the discount can be divided among the taxable items which appears between these two subtotals
														if(AVA_LineType[j] != 'Description' && AVA_LineType[j] != 'Discount' && AVA_LineType[j] != 'Markup' && AVA_LineType[j] != 'Group' && AVA_LineType[j] != 'EndGroup' && AVA_LineType[j] != 'Subtotal'){
															var lineAmt = (AVA_LineAmount[j] == null || (AVA_LineAmount[j] != null && AVA_LineAmount[j].length == 0)) ? 0 : AVA_LineAmount[j];
															totalamt += parseFloat(lineAmt);
															totallines++;
														}
													}
													
													var totalDiscount = 0, lines = 1;
													for(j = j + 1; j != prev; j++){ //to add part of discount to all taxable items which appears between two subtotal items(this doesn't include subtotal which appear in a group item)
														var discAmt = 0;
														if(AVA_LineType[j] != 'Description' && AVA_LineType[j] != 'Discount' && AVA_LineType[j] != 'Markup' && AVA_LineType[j] != 'Group' && AVA_LineType[j] != 'EndGroup' && AVA_LineType[j] != 'Subtotal'){
															var lineAmt = (AVA_LineAmount[j] == null || (AVA_LineAmount[j] != null && AVA_LineAmount[j].length == 0)) ? 0 : AVA_LineAmount[j];
															if(lines == totallines){
																discAmt = (parseFloat(discountItem) + parseFloat(totalDiscount)).toFixed(2);
															}
															else{
																if(totalamt > 0){
																	discAmt = (parseFloat(discountItem / totalamt.toFixed(2)) * parseFloat(lineAmt));
																}
															}
															AVA_LineAmount[j] = parseFloat(lineAmt) + parseFloat(discAmt);
															totalDiscount = (parseFloat(totalDiscount) + (discAmt * -1)).toFixed(2);
															lines++;
														}
													}
													
													if(totallines == 0){
														AVA_LineQty[k] = 1;
														AVA_LineAmount[k] = discountItem;
														AVA_TaxLines[k] = 'T';
													}
												}
											}
										}
									}
								}
								
								break;
							
							case 'Description':
							case 'Subtotal':
								AVA_TaxLines[k] = 'F';
								break;
							
							case 'Payment':
								AVA_TaxLines[k] = 'T';
								AVA_Taxable[k] = 'F';
								break;
							
							case 'EndGroup':
								AVA_LineNames[k] = 'EndGroup';
								AVA_LineType[k] = 'EndGroup';
								if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k) != null && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k).toString().length > 0){
									if(parseFloat(transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount1', k)) != parseFloat(transactionRecord.getSublistValue('item', 'amount', k))){
										AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'amount', k);
									}
									else{
										AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k);
									}
								}
								else{
									AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'amount', k);
								}
								
								AVA_TaxLines[k] = 'F';
								AVA_Taxable[k]  = 'F';
								break;
							
							default:
								AVA_TaxLines[k] = 'T';
								//EndGroup Item from Webservice call
								if(transactionRecord.getSublistValue('item', 'item', k) == 0){
									AVA_LineNames[k] = 'EndGroup';
									AVA_LineType[k]  = 'EndGroup';
									if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k) != null && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k).toString().length > 0){
										if(parseFloat(transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount1', k)) != parseFloat(transactionRecord.getSublistValue('item', 'amount', k))){
											AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'amount', k);
										}
										else{
											AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', k);
										}
									}
									else{
										AVA_LineAmount[k] = transactionRecord.getSublistValue('item', 'amount', k);
									}
									
									AVA_TaxLines[k] = 'F';
									AVA_Taxable[k]  = 'F';
								}
								break;
						}
					}
					
					i = k - 1; //as i would be incremented when the loop ends, that's why deducted 1 so that i be equal to the End of Group line
				}
				
				switch(AVA_LineType[i]){
					case 'Discount':
					case 'Markup':
						if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0){
							//Discount Mechanism
							AVA_LineQty[i] = 1;
							AVA_TaxLines[i] = 'T';
							AVA_Taxable[i] = 'F';
							if(i == 0){
								AVA_TaxLines[i] = 'F';
							}
						}
						else{
							if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
								AVA_LineQty[i] = 1;
								AVA_TaxLines[i] = 'T';
								if(i == 0){
									AVA_TaxLines[i] = 'F';
								}
							}
							else{
								var discountItem = transactionRecord.getSublistValue('item', 'amount', i).toString();//here current lines discount is fetched
								if(discountItem != null && discountItem.indexOf('%') != -1){
									discountItem = discountItem.substring(0, discountItem.indexOf('%'));
								}
								if(discountItem != 0){
									if(i == 0){
										AVA_LineQty[i] = 1;
										AVA_LineAmount[i] = discountItem;
										AVA_TaxLines[i] = 'T';
									}
									else{
										var totallines = 0, prev;
										AVA_TaxLines[i] = 'F';
										for(prev = i - 1; AVA_LineType[prev] != 'InvtPart' && AVA_LineType[prev] != 'EndGroup' && AVA_LineType[prev] != 'Subtotal' && AVA_LineType[prev] != 'Kit' && AVA_LineType[prev] != 'Assembly' && AVA_LineType[prev] != 'NonInvtPart' && AVA_LineType[prev] != 'OthCharge' && AVA_LineType[prev] != 'Service' && AVA_LineType[prev] != 'GiftCert' && AVA_LineType[prev] != 'DwnLdItem' && prev >= 0; prev--); //checks whether the prev item is an Inv Item, a Group or a Subtotal  
												
										if(prev < 0){
											AVA_LineQty[i] = 1;
											AVA_LineAmount[i] = discountItem;
											AVA_TaxLines[i] = 'T';
										}
										
										if(AVA_LineType[prev] == 'EndGroup'){ //if prev item is a Group item
											var j;
											var totalamt = 0; // this var will save the total of taxable items' amounts so that we can divide the discount amount proportionately
											for(j = prev - 1; AVA_LineType[j] != 'Group'; j--){ //it finds the start of the Group
												if(AVA_LineType[j] != 'Description' && AVA_LineType[j] != 'Discount' && AVA_LineType[j] != 'Markup' && AVA_LineType[j] != 'Group' && AVA_LineType[j] != 'EndGroup' && AVA_LineType[j] != 'Subtotal'){
													var lineAmt = (AVA_LineAmount[j] == null || (AVA_LineAmount[j] != null && AVA_LineAmount[j].length == 0)) ? 0 : AVA_LineAmount[j];
													totalamt += parseFloat(lineAmt);
													totallines++;
												}
											}
											
											var totalDiscount = 0, lines = 1;
											for(var m = j + 1; m != prev; m++){
												var discAmt = 0;
												if(AVA_LineType[m] != 'Description' && AVA_LineType[m] != 'Discount' && AVA_LineType[m] != 'Markup' && AVA_LineType[m] != 'Group' && AVA_LineType[m] != 'EndGroup' && AVA_LineType[m] != 'Subtotal'){
													var lineAmt = (AVA_LineAmount[m] == null || (AVA_LineAmount[m] != null && AVA_LineAmount[m].length == 0)) ? 0 : AVA_LineAmount[m];
													if(lines == totallines){
														discAmt = (parseFloat(discountItem) + parseFloat(totalDiscount)).toFixed(2);
													}
													else{
														if(totalamt > 0){
															discAmt = (parseFloat(discountItem / totalamt.toFixed(2)) * parseFloat(lineAmt));
														}
													}
													
													AVA_LineAmount[m] = parseFloat(lineAmt) + parseFloat(discAmt);
													totalDiscount = (parseFloat(totalDiscount) + (discAmt * -1)).toFixed(2);
													lines++;
												}
											}
										}
										
										if(AVA_LineType[prev] == 'Subtotal'){ //if prev item is a Subtotal
											var totalamt = 0; //to get total of all taxable items
											var groupFlag = 0; //to avoid those subtotal items which appear in a group item
											var subtotalFlag = 0, j;
											
											for(j = prev - 1; j >= 0; j--){ //finds the last subtotal line, so that the discount can be divided among the taxable items which appears between these two subtotals
												if(AVA_LineType[j] == 'EndGroup'){
													 groupFlag = 1;
												}
												
												if(AVA_LineType[j] == 'Group'){
													 groupFlag = 0;
												}
												
												if(AVA_LineType[j] == 'Subtotal' && groupFlag == 0){
													if(subtotalFlag == 0){
														var n;
														for(n = j - 1; n >= 0; n--){
															if(AVA_LineType[n] == 'EndGroup'){
																 groupFlag = 1;
															}
															
															if(AVA_LineType[n] == 'Group'){
																 groupFlag = 0;
															}
															
															if(AVA_LineType[n] != 'Description' && AVA_LineType[n] != 'Discount' && AVA_LineType[n] != 'Markup' && AVA_LineType[n] != 'Group' && AVA_LineType[n] != 'EndGroup' && AVA_LineType[n] != 'Subtotal'){
																var lineAmt = (AVA_LineAmount[n] == null || (AVA_LineAmount[n] != null && AVA_LineAmount[n].length == 0)) ? 0 : AVA_LineAmount[n];
																totalamt += parseFloat(lineAmt);
																totallines++;
															}
															else if(AVA_LineType[n] == 'Subtotal' && groupFlag == 0){ //for scenario where subtotal is not inside a group item
																break;
															}
														}
														
														var totalDiscount = 0, lines = 1;
														for(n = n + 1 ; n != j; n++){
															var discAmt = 0;
															if(AVA_LineType[n] != 'Description' && AVA_LineType[n] != 'Discount' && AVA_LineType[n] != 'Markup' && AVA_LineType[n] != 'Group' && AVA_LineType[n] != 'EndGroup' && AVA_LineType[n] != 'Subtotal'){
																if(lines == totallines){
																	discAmt = (parseFloat(discountItem) + parseFloat(totalDiscount)).toFixed(2);
																}
																else{
																	if(totalamt > 0){
																		discAmt = (parseFloat(discountItem / totalamt.toFixed(2)) * parseFloat(AVA_LineAmount[n]));
																	}
																}
																
																AVA_LineAmount[n] = parseFloat(AVA_LineAmount[n]) + parseFloat(discAmt);
																totalDiscount = (parseFloat(totalDiscount) + (discAmt * -1)).toFixed(2);
																lines++;
															}
														}
														break;
													}
													else{
														break;
													}
												}
												else{
													if(AVA_LineType[j] != 'Description' && AVA_LineType[j] != 'Discount' && AVA_LineType[j] != 'Markup' && AVA_LineType[j] != 'Group' && AVA_LineType[j] != 'EndGroup' && AVA_LineType[j] != 'Subtotal'){
														subtotalFlag = 1
														totalamt += parseFloat(AVA_LineAmount[j]);
														totallines++;
													}
												}
											}
											
											var totalDiscount = 0, lines = 1;
											for(j = j + 1; j != prev; j++){ //to add part of discount to all taxable items which appears between two subtotal items(this doesn't include subtotal which appear in a group item)
												var discAmt = 0;
												if(AVA_LineType[j] != 'Description' && AVA_LineType[j] != 'Discount' && AVA_LineType[j] != 'Markup' && AVA_LineType[j] != 'Group' && AVA_LineType[j] != 'EndGroup' && AVA_LineType[j] != 'Subtotal'){
													if(lines == totallines){
														discAmt = (parseFloat(discountItem) + parseFloat(totalDiscount)).toFixed(2);
													}
													else{
														if(totalamt > 0){
															discAmt = (parseFloat(discountItem / totalamt.toFixed(2)) * parseFloat(AVA_LineAmount[j]));
														}
													}
													
													AVA_LineAmount[j] = parseFloat(AVA_LineAmount[j]) + parseFloat(discAmt);
													totalDiscount = (parseFloat(totalDiscount) + (discAmt * -1)).toFixed(2);
													lines++;
												}
											}
										}
										
										if((AVA_LineType[prev] == 'Subtotal' || AVA_LineType[prev] == 'EndGroup') && totallines == 0){
											AVA_LineQty[i] = 1;
											AVA_LineAmount[i] = discountItem;
											AVA_TaxLines[i] = 'T';
										}
										
										if(AVA_LineType[prev] == 'InvtPart' || AVA_LineType[prev] == 'Kit' || AVA_LineType[prev] == 'Assembly' || AVA_LineType[prev] == 'NonInvtPart' || AVA_LineType[prev] == 'OthCharge' || AVA_LineType[prev] == 'Service' || AVA_LineType[prev] == 'GiftCert' || AVA_LineType[prev] == 'DwnLdItem'){ //if prev item is an Inventory
											var invItem = AVA_LineAmount[prev]; //this fetches the preceeding InvItem's amount
											AVA_LineAmount[prev] = parseFloat(invItem) + parseFloat(discountItem); //as we wud hve set some value earlier for the Inv item, that's why when Discount is identified below it, the Inv item's amount is exchanged with the discounted amt
										}
									}
								}
							}
						}
						
						break;
					
					case 'Description':
					case 'Subtotal':
						AVA_TaxLines[i] = 'F';
						break;
					
					case 'Group':
						var k;
						AVA_GroupEnd = 0;
						AVA_GroupBegin = i + 1; //will save the item line num of the first member of group
						for(k = AVA_GroupBegin; transactionRecord.getSublistValue('item', 'itemtype', k) != 'EndGroup' && transactionRecord.getSublistValue('item', 'item', k) != 0; k++){}
						AVA_GroupEnd = k;
						AVA_TaxLines[i] = 'F';
						AVA_Taxable[i]  = 'F';
						continue;
					
					case 'EndGroup':
						AVA_LineNames[i] = 'EndGroup';
						AVA_LineType[i]  = 'EndGroup';
						if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i).toString().length > 0){
							if(parseFloat(transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount1', i)) != parseFloat(transactionRecord.getSublistValue('item', 'amount', i))){
								AVA_LineAmount[i] = transactionRecord.getSublistValue('item', 'amount', i);
							}
							else{
								AVA_LineAmount[i] = transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i);
							}
						}
						else{
							AVA_LineAmount[i] = transactionRecord.getSublistValue('item', 'amount', i);
						}
						AVA_TaxLines[i] = 'F';
						AVA_Taxable[i]  = 'F';
						break;
					
					case 'Payment':
						prev_lineno = i;
						AVA_TaxLines[i] = 'T';
						AVA_Taxable[i] = 'F';
						break;
					
					default:
						prev_lineno = i;
						AVA_TaxLines[i] = 'T';
						//EndGroup Item from Webservice call
						if(transactionRecord.getSublistValue('item', 'item', i) == 0){
							AVA_LineNames[i] = 'EndGroup';
							AVA_LineType[i]  = 'EndGroup';
							if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i) != null && transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i).toString().length > 0){
								if(parseFloat(transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount1', i)) != parseFloat(transactionRecord.getSublistValue('item', 'amount', i))){
									AVA_LineAmount[i] = transactionRecord.getSublistValue('item', 'amount', i);
								}
								else{
									AVA_LineAmount[i] = transactionRecord.getSublistValue('item', 'custcol_ava_gross_amount', i);
								}
							}
							else
							{
								AVA_LineAmount[i]   = transactionRecord.getSublistValue('item', 'amount', i);
							}
							AVA_TaxLines[i] = 'F';
							AVA_Taxable[i]  = 'F';
						}
						break;
				}
			}
			
			if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund') && AVA_AdjustmentLineCnt > 1){
				alert('Multiple \'Sales Tax Adjustment\' line not allowed.');
				AVA_ErrorCode = 34;
				return false;
			}
			
			if((transactionRecord.getValue('custpage_ava_billcost') == true || transactionRecord.getValue('custpage_ava_billcost') == 'T') && (BillItemFlag == 'T' || BillExpFlag == 'T' || BillTimeFlag == 'T')){
				if(AVA_GetBillables(transactionRecord, configCache) == false){ //to get items from Billable subtabs of a transaction
					return false;
				}
			}
		}
		
		function AVA_IdentifyTaxCode(taxcode, defTaxCode){
			if(taxcode != null){
				if(AVA_EditionChecked == 1){
					taxcode = taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + defTaxCode.length + 1);
				}
				else if(AVA_EditionChecked == 2){
					defTaxCode = defTaxCode.substring(defTaxCode.indexOf(':') + 1, defTaxCode.indexOf(':') + taxcode.length + 1);
				}
			}
			
			if(taxcode != null){
				if(taxcode.substr((taxcode.length - 3), 3) != 'POD' && taxcode.substr((taxcode.length - 3), 3) != 'POS' && taxcode != '-Not Taxable-'){
					return 0;
				}
				else{
					if(taxcode.substr((taxcode.length - 3), 3) == 'POD'){
						return 1;
					}
					else if(taxcode.substr((taxcode.length - 3), 3) == 'POS'){
						return 2;
					}
					else if(taxcode == '-Not Taxable-'){
						if(defTaxCode.substr((defTaxCode.length - 3), 3) == 'POS'){
							return 2;
						}
						else if(defTaxCode.substr((defTaxCode.length - 3), 3) == 'POD'){
							return 1;
						}
						else{
							return 0;
						}
					}
					else{
						return 0;
					}
				}
			}
			else{
				if(defTaxCode.substr((defTaxCode.length - 3), 3) == 'POS'){
					return 2;
				}
				else if(defTaxCode.substr((defTaxCode.length - 3), 3) == 'POD'){
					return 1;
				}
				else{
					return 0;
				}
			}
		}
		
		function AVA_GetBillables(transactionRecord, configCache){
			AVA_ItemInfoArr = new Array();
			AVA_BillableTimeArr = new Array();
			var itemExpCostArr = new Array();
			
			var qtyField, discAmtField;
			var line = transactionRecord.getLineCount('item');
			var discountAmt, tabTotalAmt;
			
			if(BillExpFlag == 'T' && (transactionRecord.getValue('custpage_ava_expensereport') == true || transactionRecord.getValue('custpage_ava_expensereport') == 'T') && runtime.getCurrentUser().getPermission('LIST_CATEGORY') != runtime.Permission.NONE){ // Check if 'Expense Report' Feature is enabled - CONNECT-4033
				// Fix for CONNECT-3357
				var searchRecord = search.create({
					type: search.Type.EXPENSE_CATEGORY,
					filters: ['isinactive', 'is', 'F'],
					columns: ['name']
				});
				var searchResult = searchRecord.run();
				
				var i = 0;
				searchResult.each(function(result){ // Fetching all expense item details and storing in temporary array
					itemExpCostArr[i] = new Array();
					itemExpCostArr[i][0] = result.id;
					itemExpCostArr[i][1] = result.getValue('name');
					
					if(i == 3999){
						return false;
					}
					else{
						i++;
						return true;
					}
				});
			}
			
			if(configCache.AVA_BillableTimeName == 1){
				var searchAccount, k = 0;
				
				if(configCache.AVA_ItemAccount == true){
					// Fetch details of accounts and stored in array
					var searchRecord = search.create({
						type: search.Type.ACCOUNT,
						filters: ['isinactive', 'is', 'F'],
						columns: ['name']
					});
					searchAccount = searchRecord.run();
					searchAccount = searchAccount.getRange({
						start: 0,
						end: 1000
					});
				}
				
				// Fetch details of Service type item and stored in array
				var column = new Array();
				column[column.length] = search.createColumn({
					name: 'itemid'
				});
				column[column.length] = search.createColumn({
					name: 'custitem_ava_udf1'
				});
				column[column.length] = search.createColumn({
					name: 'custitem_ava_udf2'
				});
				column[column.length] = search.createColumn({
					name: 'custitem_ava_taxcode'
				});
				column[column.length] = search.createColumn({
					name: 'incomeaccount'
				});
				if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true){
					column[column.length] = search.createColumn({
						name: 'upccode'
					});
				}
				
				column[column.length] = search.createColumn({
					name: 'internalid',
					sort: search.Sort.ASC
				});
				
				var searchRecord = search.create({
					type: search.Type.ITEM,
					filters: 
						[
							['isinactive', 'is', 'F'],
							'and',
							['type', 'is', 'Service']
						],
					columns: column
				});
				searchRecord = searchRecord.run();
				var searchResult = searchRecord.getRange({
					start: 0,
					end: 1000
				});
				
				while(searchResult != null && searchResult.length > 0){
					for(var i = 0; i < searchResult.length; i++){
						AVA_BillableTimeArr[k] = new Array();
						AVA_BillableTimeArr[k][0] = searchResult[i].id;
						AVA_BillableTimeArr[k][1] = searchResult[i].getValue('itemid');
						AVA_BillableTimeArr[k][2] = searchResult[i].getValue('custitem_ava_udf1');
						AVA_BillableTimeArr[k][3] = searchResult[i].getValue('custitem_ava_udf2');
						AVA_BillableTimeArr[k][4] = searchResult[i].getValue('custitem_ava_taxcode');
						
						var incomeAccount = '';
						
						if(configCache.AVA_ItemAccount == true){
							if(searchResult[i].getValue('incomeaccount') != null && searchResult[i].getValue('incomeaccount').length > 0){
								for(var j = 0; searchAccount != null && j < searchAccount.length; j++){
									if(searchResult[i].getValue('incomeaccount') == searchAccount[j].id){
										incomeAccount = searchAccount[j].getValue('name');
										break;
									}
								}
							}
						}
						
						AVA_BillableTimeArr[k][5] = incomeAccount;
						
						if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true){
							AVA_BillableTimeArr[k][6] = searchResult[i].getValue('upccode');
						}
						else{
							AVA_BillableTimeArr[k][6] = '';
						}
						
						k++;
					}
					
					if(searchResult.length == 1000){
						searchResult = searchRecord.getRange({
							start: k,
							end: k + 1000
						});
					}
					else{
						break;
					}
				}
			}
			
			for( ; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
				qtyField     = (AVA_NS_Lines[line][0] == 'itemcost') ? 'itemcostcount' : ((AVA_NS_Lines[line][0] == 'expcost') ? '' : 'qty');
				tabTotalAmt  = (AVA_NS_Lines[line][0] == 'itemcost') ? BillItemTAmt : ((AVA_NS_Lines[line][0] == 'expcost') ? BillExpTAmt : BillTimeTAmt);
				discAmtField = (AVA_NS_Lines[line][0] == 'itemcost') ? 'itemcostdiscamount' : ((AVA_NS_Lines[line][0] == 'expcost') ? 'expcostdiscamount' : 'timediscamount');
				
				if(AVA_NS_Lines[line][0] == 'expcost' && transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'category', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'category', AVA_NS_Lines[line][1]).length > 0){
					var itemName;
					
					for(var i = 0; itemExpCostArr != null && i < itemExpCostArr.length; i++){
						if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'category', AVA_NS_Lines[line][1]) == itemExpCostArr[i][0]){
							itemName = itemExpCostArr[i][1];
							break;
						}
					}
					
					AVA_LineNames[line] = (itemName != null && itemName.length > 0) ? itemName : 'Billable Expense';
				}
				else if(AVA_NS_Lines[line][0] != 'expcost' && transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]).length > 0){
					var arrLength = AVA_ItemInfoArr.length;
					AVA_ItemInfoArr[arrLength] = new Array();
					if(AVA_GetItemInfo(transactionRecord, configCache, line, arrLength) == false){
						return false;
					}
				}
				else if(AVA_NS_Lines[line][0] == 'expcost'){
					AVA_LineNames[line] = 'Billable Expense';
				}
				
				AVA_LineType[line] = 'Billable ' + AVA_NS_Lines[line][0];
				
				//Get Item Qty
				AVA_LineQty[line] = (AVA_NS_Lines[line][0] == 'itemcost' || AVA_NS_Lines[line][0] == 'time') ? transactionRecord.getSublistValue(AVA_NS_Lines[line][0], qtyField, AVA_NS_Lines[line][1]) : 1;
				
				//Get Item amount
				if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue(AVA_NS_Lines[line][0],'custcol_ava_gross_amount',AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue(AVA_NS_Lines[line][0],'custcol_ava_gross_amount',AVA_NS_Lines[line][1]).toString().length > 0){
					if(parseFloat(transactionRecord.getSublistValue(AVA_NS_Lines[line][0],'custcol_ava_gross_amount1',AVA_NS_Lines[line][1])) != parseFloat(transactionRecord.getSublistValue(AVA_NS_Lines[line][0],'amount',AVA_NS_Lines[line][1]))){
						AVA_LineAmount[line] = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'amount', AVA_NS_Lines[line][1]);
					}
					else{
						AVA_LineAmount[line] = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_gross_amount', AVA_NS_Lines[line][1]);
					}
				}
				else{
					AVA_LineAmount[line] = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'amount', AVA_NS_Lines[line][1]);
				}
				
				discountAmt = transactionRecord.getValue(discAmtField);
				
				if(discountAmt != null && discountAmt.toString().length > 0){
					if((configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 1) || (configCache.AVA_EnableDiscount == false)){
						AVA_LineAmount[line] = parseFloat(AVA_LineAmount[line]) + (parseFloat(AVA_LineAmount[line]/tabTotalAmt) * parseFloat(discountAmt));
					}
				}
				
				//Get Taxability
				if(transactionRecord.getValue('taxitem') != null){
					AVA_Taxable[line] = (transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'taxable', AVA_NS_Lines[line][1]) == true || transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'taxable', AVA_NS_Lines[line][1]) == 'T') ? 'T' : 'F';
					AVA_TaxCodes[line] = AVA_IdentifyTaxCode(transactionRecord.getValue('custpage_ava_formtaxcode'), transactionRecord.getValue('custpage_ava_deftax'));
				}
				else{
					AVA_Taxable[line] = (AVA_TaxcodeArray[line] == '-Not Taxable-') ? 'F' : 'T';
					AVA_TaxCodes[line] = AVA_IdentifyTaxCode(AVA_TaxcodeArray[line], transactionRecord.getValue('custpage_ava_deftax'));
				}
				
				AVA_TaxLines[line] = 'T';
			}
			
			return true;
		}
		
		function AVA_GetItemInfo(transactionRecord, configCache, nsArrLine, itemArrIndx){
			if(AVA_NS_Lines[nsArrLine][0] == 'time'){
				if(configCache.AVA_BillableTimeName == 0){
					AVA_LineNames[nsArrLine] = 'Billable Time';// Item name
					AVA_ItemInfoArr[itemArrIndx][0] = nsArrLine;
				}
				else{
					for(var i = 0; i < AVA_BillableTimeArr.length; i++){
						if(transactionRecord.getSublistValue(AVA_NS_Lines[nsArrLine][0], 'item', AVA_NS_Lines[nsArrLine][1]) == AVA_BillableTimeArr[i][0]){
							AVA_ItemInfoArr[itemArrIndx][0] = nsArrLine;
							AVA_ItemInfoArr[itemArrIndx][1] = AVA_BillableTimeArr[i][2];//UDF1
							AVA_ItemInfoArr[itemArrIndx][2] = AVA_BillableTimeArr[i][3];//UDF2
							AVA_ItemInfoArr[itemArrIndx][3] = AVA_BillableTimeArr[i][4];//taxcodemapping
							AVA_ItemInfoArr[itemArrIndx][4] = AVA_BillableTimeArr[i][5];//incomeAccount
							
							if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true && (AVA_BillableTimeArr[i][5] != null && AVA_BillableTimeArr[i][5].length > 0)){
								AVA_LineNames[nsArrLine] = 'UPC:' + AVA_BillableTimeArr[i][5];//UPC Code
							}
							else{
								AVA_LineNames[nsArrLine] = AVA_BillableTimeArr[i][1];// Item name
							}
							
							break;
						}
					}
				}
			}
			else{
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
					try{
						var upcCodeFlag = 'F';
						if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true){
							upcCodeFlag = 'T';
						}
						
						var webstoreFlag = (transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION') ? true : false;
						var response = https.get({
							url: url.resolveScript({
								scriptId: 'customscript_ava_recordload_suitelet',
								deploymentId: 'customdeploy_ava_recordload',
								params: {'type': 'item', 'id': transactionRecord.getSublistValue(AVA_NS_Lines[nsArrLine][0], 'item', AVA_NS_Lines[nsArrLine][1]), 'upccodeflag': upcCodeFlag},
								returnExternalUrl: webstoreFlag
							})
						});
						
						var fieldValues = response.body.split('+');
						if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true && (fieldValues[5] != null && fieldValues[5].length > 0)){
							AVA_LineNames[nsArrLine] = 'UPC:' + fieldValues[5];//UPC Code
						}
						else{
							AVA_LineNames[nsArrLine] = fieldValues[0];// Item name
						}
						
						AVA_ItemInfoArr[itemArrIndx][0] = nsArrLine;
						AVA_ItemInfoArr[itemArrIndx][1] = fieldValues[1];//UDF1
						AVA_ItemInfoArr[itemArrIndx][2] = fieldValues[2];//UDF2
						AVA_ItemInfoArr[itemArrIndx][3] = fieldValues[3];//taxcodemapping
						AVA_ItemInfoArr[itemArrIndx][4] = fieldValues[4];//incomeAccount
					}
					catch(err){
						AVA_ErrorCode = 'Unable to fetch information of Item at line: ' + AVA_NS_Lines[nsArrLine][1] + ' selected in the Billable Items tab.';
						return false;
					}
				}
				else{
					var cols = new Array();
					cols[0] = 'itemid';
					cols[1] = 'custitem_ava_udf1';
					cols[2] = 'custitem_ava_udf2';
					cols[3] = 'custitem_ava_taxcode';
					cols[4] = 'incomeaccount';
					if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true){
						cols[5] = 'upccode';
					}
					
					try{
						var itemRec = search.lookupFields({
							type: search.Type.ITEM,
							id: transactionRecord.getSublistValue(AVA_NS_Lines[nsArrLine][0], 'item', AVA_NS_Lines[nsArrLine][1]),
							columns: cols
						});
						var incomeAccount = null;		
				
						try{			
							incomeAccount = search.lookupFields({
								type: search.Type.ACCOUNT,
								id: itemRec.incomeaccount[0].value,
								columns: 'acctname'
							});
							incomeAccount = incomeAccount.acctname;
						}
						catch(err){
							incomeAccount = itemRec.incomeaccount[0].text;
						}
						
						if(AVA_BarcodesFeature == true && configCache.AVA_EnableUpcCode == true && (itemRec.upccode != null && itemRec.upccode.length > 0)){
							AVA_LineNames[nsArrLine] = 'UPC:' + itemRec.upccode;//UPC Code
						}
						else{
							AVA_LineNames[nsArrLine] = itemRec.itemid;// Item name
						}
						
						AVA_ItemInfoArr[itemArrIndx][0] = nsArrLine;
						AVA_ItemInfoArr[itemArrIndx][1] = itemRec.custitem_ava_udf1;//UDF1
						AVA_ItemInfoArr[itemArrIndx][2] = itemRec.custitem_ava_udf2;//UDF2
						AVA_ItemInfoArr[itemArrIndx][3] = itemRec.custitem_ava_taxcode;//taxcodemapping
						AVA_ItemInfoArr[itemArrIndx][4] = incomeAccount;//incomeAccount
					}
					catch(err){
						AVA_ErrorCode = 'Unable to fetch information of Item at line: ' + AVA_NS_Lines[nsArrLine][1] + ' selected in the Billable Items tab.';
						return false;
					}
				}
			}
			
			return true;
		}
		
		function AVA_CalculateTax(transactionRecord, configCache){
			var avaDocType = AVA_RecordType(transactionRecord.type);
			AvaTax = ava_library.mainFunction('AVA_InitSignatureObject', configCache.AVA_ServiceUrl);
			Transaction = new AvaTax.transaction();
			AVA_GetTaxBody(transactionRecord, configCache, avaDocType, 0);
			var createoradjust = Transaction.createoradjust(transactionRecord.getValue('custpage_ava_details'));

			try{

				AVA_ConnectorEndTime = new Date();
				
				var startTime = new Date();

				var response;
				var taxCalculated = false;
				var usedApi = false;

				if (r7.shouldUseBillingAddress(transactionRecord)) {
					createoradjust.data = r7.replaceShipToWithBillTo(createoradjust.data, transactionRecord, AVA_CreateFromRecord);
				}

				if (r7.shouldSkipTaxCalculation(transactionRecord, createoradjust.data)) {
					response = r7.getPreviousResponse(transactionRecord, createoradjust.data);
					taxCalculated = true;
				}

				if (!response) {
					response = https.post({
						body: createoradjust.data,
						url: createoradjust.url,
						headers: createoradjust.headers
					});

					usedApi = true;
					taxCalculated = true;
				}

				var endTime = new Date();

				if (taxCalculated) {
					r7.logRequestAndResponse(transactionRecord, createoradjust.data, response, usedApi);
				}

				AVA_ConnectorStartTime = new Date();
				AVA_LatencyTime = endTime.getTime() - startTime.getTime();
				
				var resp = AVA_ReadResponse(transactionRecord, configCache, response, avaDocType, startTime);
				return resp;
			}
			catch(err){
				log.debug('AVA_CalculateTax error stack', err.stack);
				if(configCache.AVA_EnableLogEntries == '1' && err.code != 'GetTaxError' && err.code != 'InvalidAddress' && err.code != 'ValueRequiredError'){
					var avaDocType = AVA_RecordType(transactionRecord.type);
					ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + transactionRecord.id + '~~' + '' + '~~' + '' + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Debug' + '~~' + 'Error' + '~~' + transactionRecord.type + '~~' + 'AVA_CalculateTax' + '~~' + err.message + '~~' + err.code + '~~' + 0 + '~~' + transactionRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + transactionRecord.getValue('custpage_ava_details')));
				}
				
				if(err.code == 'SSS_CONNECTION_TIME_OUT' || err.code == 'SSS_REQUEST_TIME_EXCEEDED'){ // Logic for Retry of GetTax call - CLOUDERP-5326
					log.debug({
						title: 'Retry calling AvaTax',
						details: err.code
					});
					try{
						var startTime = new Date();
						var response = https.post({
							body: createoradjust.data,
							url: createoradjust.url,
							headers: createoradjust.headers
						});
						var endTime = new Date();
						
						AVA_ConnectorStartTime = new Date();
						AVA_LatencyTime = endTime.getTime() - startTime.getTime();
						
						var resp = AVA_ReadResponse(transactionRecord, configCache, response, avaDocType, startTime);
						return resp;
					}
					catch(err){
						if(configCache.AVA_EnableLogEntries == '1' && err.code != 'GetTaxError' && err.code != 'InvalidAddress'){
							var avaDocType = AVA_RecordType(transactionRecord.type);
							ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + transactionRecord.id + '~~' + '' + '~~' + '' + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Debug' + '~~' + 'Error' + '~~' + transactionRecord.type + '~~' + 'AVA_CalculateTax' + '~~' + 'After Retry - ' + err.message + '~~' + err.code + '~~' + 0 + '~~' + transactionRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + transactionRecord.getValue('custpage_ava_details')));
						}
						
						if(err.code == 'GetTaxError' || err.code == 'InvalidAddress' || err.code == 'ValueRequiredError'){
							AVA_TotalTax = 0;
							
							if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && (configCache.AVA_ShowMessages == 2 || configCache.AVA_ShowMessages == 3)){
								AVA_ErrorCode = err.message;
								alert("This Document has used AvaTax Services. " + err.message);
							}
							else{
								AVA_ErrorCode = err.message;
								log.debug({
									title: 'Error Message',
									details: err.message
								});
							}
							
							AVA_SetDocTotal(transactionRecord, configCache, avaDocType);
						}
						else{
							if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && (configCache.AVA_ShowMessages == 2 || configCache.AVA_ShowMessages == 3)){
								alert("Please contact the administrator. " + err.message);
								AVA_ErrorCode = 'Please contact the Administrator. ' + err.message;
							}
							else{
								log.debug({
									title: 'Please contact the administrator'
								});
								log.debug({
									title: 'Try/Catch Error',
									details: err.message
								});
								AVA_ErrorCode = err.message;
							}
						}
						
						return false;
					}
				}
				
				if(err.code == 'GetTaxError' || err.code == 'InvalidAddress' || err.code == 'ValueRequiredError'){
					AVA_TotalTax = 0;
					
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && (configCache.AVA_ShowMessages == 2 || configCache.AVA_ShowMessages == 3)){
						AVA_ErrorCode = err.message;
						alert("This Document has used AvaTax Services. " + err.message);
					}
					else{
						AVA_ErrorCode = err.message;
						log.debug({
							title: 'Error Message',
							details: err.message
						});
					}
					
					AVA_SetDocTotal(transactionRecord, configCache, avaDocType);
				}
				else{
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && (configCache.AVA_ShowMessages == 2 || configCache.AVA_ShowMessages == 3)){
						alert("Please contact the administrator. " + err.message);
						AVA_ErrorCode = 'Please contact the Administrator. ' + err.message;
					}
					else{
						log.debug({
							title: 'Please contact the administrator'
						});
						log.debug({
							title: 'Try/Catch Error',
							details: err.message
						});
						AVA_ErrorCode = err.message;
					}
				}
				
				return false;
			}
			
			AVA_LogTaxResponse(transactionRecord, configCache, 'T', response, startTime);
			return true;
		}
		
		function AVA_GetTaxBody(transactionRecord, configCache, avaDocType, scisFlag){
			var avaDate, docType, multiplier, custCode;
			
			if(runtime.isFeatureInEffect('ACCOUNTINGPERIODS') == true && configCache.AVA_UsePostingPeriod == true && transactionRecord.getValue('postingperiod') != null && transactionRecord.getValue('postingperiod').length > 0){
				var postDate = transactionRecord.getValue('custbody_ava_postingperiodname');
				if(postDate != null && postDate.length > 0){
					avaDate = postDate.substring(4, postDate.length) + '-' + ava_library.mainFunction('AVA_GetMonthName', postDate.substring(0, 3)) + '-01';
				}
				else{
					avaDate = ava_library.mainFunction('AVA_ConvertDate', transactionRecord.getValue('trandate'));
				}
			}
			else{
				avaDate = ava_library.mainFunction('AVA_ConvertDate', transactionRecord.getValue('trandate'));
			}
			
			var webstoreFlag = (transactionRecord.getValue('custpage_ava_context') == 'WEBSTORE') ? true : false;
			
			if(webstoreFlag == true){
				docType = 'SalesOrder';
				multiplier = 1;
			}
			else{
				docType =  (avaDocType == 'SalesInvoice' || avaDocType == 'SalesOrder') ? 'SalesOrder' : 'ReturnOrder';
				multiplier = (avaDocType == 'SalesInvoice' || avaDocType == 'SalesOrder') ? 1 : -1;
			}
			
			Transaction.companyCode = ((transactionRecord.getValue('custpage_ava_defcompcode') != null && transactionRecord.getValue('custpage_ava_defcompcode').length > 0) ? transactionRecord.getValue('custpage_ava_defcompcode') : transactionRecord.getValue('subsidiary'));
			
			if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 1){ // Fix for CONNECT-3223
				Transaction.type = avaDocType;
				Transaction.code = transactionRecord.id;
			}
			else{
				AVA_TempDocCode = new Date();
				Transaction.type = docType;
				Transaction.code = (AVA_TempDocCode != null) ? (AVA_TempDocCode).toString().substring(0, 50) : '';
			}
			
			Transaction.date = avaDate;
			
			switch(configCache.AVA_CustomerCode){
				case '0':
					custCode = transactionRecord.getValue('custbody_ava_customerentityid');
					if(custCode != null && custCode.length > 0){
						Transaction.customerCode = custCode.substring(0, 50);
					}
					else{
						var entityId = search.lookupFields({
							type: search.Type.CUSTOMER,
							id: transactionRecord.getValue('entity'),
							columns: 'entityid'
						});
						Transaction.customerCode = (entityId.entityid != null && entityId.entityid.length > 0) ? entityId.entityid.substring(0, 50) : '';
					}
					break;
					
				case '1':
					custCode = (transactionRecord.getValue('custbody_ava_customerisperson') == true) ? (transactionRecord.getValue('custbody_ava_customerfirstname') + ((transactionRecord.getValue('custbody_ava_customermiddlename') != null && transactionRecord.getValue('custbody_ava_customermiddlename').length > 0) ? ( ' ' + transactionRecord.getValue('custbody_ava_customermiddlename')) : ' ') + ((transactionRecord.getValue('custbody_ava_customerlastname') != null && transactionRecord.getValue('custbody_ava_customerlastname').length > 0) ? ( ' ' + transactionRecord.getValue('custbody_ava_customerlastname')) : '')) : (transactionRecord.getValue('custbody_ava_customercompanyname'));
					Transaction.customerCode = ((custCode != null && custCode.length > 0) ? custCode.substring(0, 50) : '');
					break;
					
				case '2':
					Transaction.customerCode = transactionRecord.getValue('entity').substring(0, 50);
					break;
					
				case '3':
					if(runtime.isFeatureInEffect('MULTIPARTNER') != true && transactionRecord.getValue('partner') != null && transactionRecord.getValue('partner').length > 0){
						if(transactionRecord.getValue('custpage_ava_context') == 'WEBSTORE'){
							var custRec = JSON.parse(transactionRecord.getValue('custpage_ava_partnerid'));
							custCode = custRec[0].columns['entityid'];
						}
						else{
							custCode = transactionRecord.getValue('custbody_ava_partnerentityid');
						}
					}
					else{
						custCode = transactionRecord.getValue('custbody_ava_customerentityid');
					}
					
					Transaction.customerCode = (custCode != null && custCode.length > 0) ? custCode.substring(0, 50) : '';
					break;
					
				case '4':
					if(runtime.isFeatureInEffect('MULTIPARTNER') != true && transactionRecord.getValue('partner') != null && transactionRecord.getValue('partner').length > 0){
						if(transactionRecord.getValue('custpage_ava_context') == 'WEBSTORE'){
							var custRec = JSON.parse(transactionRecord.getValue('custpage_ava_partnerid'));
							custCode = (custRec[0].columns['isperson'] == false) ? (custRec[0].columns['companyname']) : (custRec[0].columns['firstname'] + ((custRec[0].columns['middlename'] != null && custRec[0].columns['middlename'].length > 0) ? ( ' ' + custRec[0].columns['middlename']) : ' ') + ((custRec[0].columns['lastname'] != null && custRec[0].columns['lastname'].length > 0) ? ( ' ' + custRec[0].columns['lastname']) : ''));
						}
						else{
							custCode = (transactionRecord.getValue('custbody_ava_partnerisperson') == true) ? (transactionRecord.getValue('custbody_ava_partnerfirstname') + ((transactionRecord.getValue('custbody_ava_partnermiddlename') != null && transactionRecord.getValue('custbody_ava_partnermiddlename').length > 0) ? ( ' ' + transactionRecord.getValue('custbody_ava_partnermiddlename')) : ' ') + ((transactionRecord.getValue('custbody_ava_partnerlastname') != null && transactionRecord.getValue('custbody_ava_partnerlastname').length > 0) ? ( ' ' + transactionRecord.getValue('custbody_ava_partnerlastname')) : '')) : (transactionRecord.getValue('custbody_ava_partnercompanyname'));
						}
					}
					else{
						custCode = (transactionRecord.getValue('custbody_ava_customerisperson') == true) ? (transactionRecord.getValue('custbody_ava_customerfirstname') + ((transactionRecord.getValue('custbody_ava_customermiddlename') != null && transactionRecord.getValue('custbody_ava_customermiddlename').length > 0) ? ( ' ' + transactionRecord.getValue('custbody_ava_customermiddlename')) : ' ') + ((transactionRecord.getValue('custbody_ava_customerlastname') != null && transactionRecord.getValue('custbody_ava_customerlastname').length > 0) ? ( ' ' + transactionRecord.getValue('custbody_ava_customerlastname')) : '')) : (transactionRecord.getValue('custbody_ava_customercompanyname'));
					}
					
					Transaction.customerCode = (custCode != null && custCode.length > 0) ? custCode.substring(0, 50) : '';
					break;
					
				case '5':
					if(runtime.isFeatureInEffect('MULTIPARTNER') != true && transactionRecord.getValue('partner') != null && transactionRecord.getValue('partner').length > 0){
						custCode = transactionRecord.getValue('partner');
					}
					else{
						custCode = transactionRecord.getValue('entity');
					}
					
					Transaction.customerCode = (custCode != null && custCode.length > 0) ? custCode.substring(0, 50) : '';
					break;
					
				case '6':
					custCode = AVA_LoadCustomerId(transactionRecord, 'customer', transactionRecord.getValue('entity'));
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
						Transaction.customerCode = (custCode[8] != null && custCode[8].length > 0) ? custCode[8].substring(0, 50) : '';
					}
					else{
						Transaction.customerCode = (custCode != null && custCode.length > 0) ? custCode.substring(0, 50) : '';
					}
					break;
					
				case '7':
					var recordType, id;
					
					if(runtime.isFeatureInEffect('MULTIPARTNER') != true && transactionRecord.getValue('partner') != null && transactionRecord.getValue('partner').length > 0){
						recordType = 'partner';
						id = transactionRecord.getValue('partner');
					}
					else{
						recordType = 'customer';
						id = transactionRecord.getValue('entity');
					}
					
					custCode = AVA_LoadCustomerId(transactionRecord, recordType, id);
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
						Transaction.customerCode = (custCode[8] != null && custCode[8].length > 0) ? custCode[8].substring(0, 50) : '';
					}
					else{
						Transaction.customerCode = (custCode != null && custCode.length > 0) ? custCode.substring(0, 50) : '';
					}
					break;
					
				case '8':
					if(transactionRecord.getValue('custbody_ava_custexternalid') != null && transactionRecord.getValue('custbody_ava_custexternalid').length > 0){
						Transaction.customerCode = transactionRecord.getValue('custbody_ava_custexternalid').substring(0, 50);
					}
					else{
						custCode = transactionRecord.getValue('custbody_ava_customerentityid');
						if(custCode != null && custCode.length > 0){
							Transaction.customerCode = custCode.substring(0, 50);
						}
						else{
							var entityId = search.lookupFields({
								type: search.Type.CUSTOMER,
								id: transactionRecord.getValue('entity'),
								columns: 'entityid'
							});
							Transaction.customerCode = (entityId.entityid != null && entityId.entityid.length > 0) ? entityId.entityid.substring(0, 50) : '';
						}
					}
					break;
					
				default :
					break;
			}
			
			if(webstoreFlag == false && transactionRecord.getValue('custbody_ava_salesresp') != null && transactionRecord.getValue('custbody_ava_salesresp').length > 0){
				Transaction.salespersonCode = transactionRecord.getValue('custbody_ava_salesresp').substring(0, 25);
			}
			
			if(transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization'){
				if(configCache.AVA_EntityUseCode == true){
					var entityMapHeader = '';
					
					if(transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
							if((AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0)){
								if(AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode').length > 0){
									var entityUseCode = search.lookupFields({
										type: 'customrecord_avaentityusecodes',
										id: AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode'),
										columns: 'custrecord_ava_entityid'
									});
									entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
								}
							}
							else if((AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0)){
								if(AVA_CreateFromRecord.getValue('custbody_ava_billtousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_billtousecode').length > 0){
									var entityUseCode = search.lookupFields({
										type: 'customrecord_avaentityusecodes',
										id: AVA_CreateFromRecord.getValue('custbody_ava_billtousecode'),
										columns: 'custrecord_ava_entityid'
									});
									entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
								}
							}
						}
						else{
							if(transactionRecord.getValue('custpage_ava_usecodeusuage') != null && (transactionRecord.getValue('custpage_ava_usecodeusuage') == true || transactionRecord.getValue('custpage_ava_usecodeusuage') == 'T') && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
								//extract values from client side since its set
								if((AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0)){
									entityMapHeader = (AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode').length > 0) ? AVA_CreateFromRecord.getText('custbody_ava_shiptousecode').substring(0, 25) : '';
								}
								else if((AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0)){
									entityMapHeader = (AVA_CreateFromRecord.getValue('custbody_ava_billtousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_billtousecode').length > 0) ? AVA_CreateFromRecord.getText('custbody_ava_billtousecode').substring(0, 25) : '';
								}
							}
							else{
								//Existing logic for server side processing only.
								if(AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0){
									entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), AVA_CreateFromRecord.getValue('shipaddresslist'));
								}
								else if(AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0){
									entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), AVA_CreateFromRecord.getValue('billaddresslist'));
								}
							}
						}
					}
					else{
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
							if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
								entityMapHeader = (transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25) : '';
							}
							else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
								entityMapHeader = (transactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25) : '';
							}
						}
						else{
							if(transactionRecord.getValue('custpage_ava_usecodeusuage') != null && (transactionRecord.getValue('custpage_ava_usecodeusuage') == true || transactionRecord.getValue('custpage_ava_usecodeusuage') == 'T') && transactionRecord.getValue('custpage_ava_context') == 'USERINTERFACE'){
								//extract values from client side since its set
								if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
									entityMapHeader = (transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25) : '';
								}
								else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
									entityMapHeader = (transactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25) : '';
								}
							}
							else{
								//Existing logic for server side processing only.
								if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
									if(transactionRecord.getValue('custbody_ava_shiptousecode') != null && transactionRecord.getValue('custbody_ava_shiptousecode').length > 0 && transactionRecord.getValue('custbody_ava_shiptousecode') != ' '){
										if(transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0){
											entityMapHeader = transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25);
										}
										else{
											var entityUseCode = search.lookupFields({
												type: 'customrecord_avaentityusecodes',
												id: transactionRecord.getValue('custbody_ava_shiptousecode'),
												columns: 'custrecord_ava_entityid'
											});
											entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
										}
									}
									else if(transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist') > 0){
										entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getValue('shipaddresslist'));
									}
								}
								else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
									if(transactionRecord.getValue('custbody_ava_billtousecode') != null && transactionRecord.getValue('custbody_ava_billtousecode').length > 0 && transactionRecord.getValue('custbody_ava_billtousecode') != ' '){
										if(ransactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0){
											entityMapHeader = transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25);
										}
										else{
											var entityUseCode = search.lookupFields({
												type: 'customrecord_avaentityusecodes',
												id: transactionRecord.getValue('custbody_ava_billtousecode'),
												columns: 'custrecord_ava_entityid'
											});
											entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
										}
									}
									else if(transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist') > 0){
										entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getValue('billaddresslist'));
									}
								}
							}
						}
					}
					
					if(entityMapHeader != null && entityMapHeader.length > 0){
						if(transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
							Transaction.entityUseCode = entityMapHeader;
						}
						else{
							Transaction.entityUseCode = entityMapHeader.substring(0, 25);
						}
					}
				}
			}
			
			var amount = transactionRecord.getValue('discounttotal');
			
			if(avaDocType == 'SalesInvoice' || avaDocType == 'SalesOrder'){
				amount = amount * -1;
			}
			
			if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0){
				Transaction.discount = 0;
			}
			else if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getValue('custbody_ava_discountamount') != null && transactionRecord.getValue('custbody_ava_discountamount').toString().length > 0){
				if(avaDocType == 'SalesInvoice' || avaDocType == 'SalesOrder'){
					Transaction.discount = (transactionRecord.getValue('custbody_ava_discountamount') * -1);
				}
				else{
					Transaction.discount = transactionRecord.getValue('custbody_ava_discountamount');
				}
			}
			else{
				Transaction.discount = amount;
			}
			
			Transaction.purchaseOrderNo = (transactionRecord.getValue('otherrefnum') != null && transactionRecord.getValue('otherrefnum').length > 0) ? transactionRecord.getValue('otherrefnum').substring(0, 50) : '';
						
			if(transactionRecord.getValue('custbody_ava_exemptcertno') != null && transactionRecord.getValue('custbody_ava_exemptcertno').length > 0){
				Transaction.exemptionNo = transactionRecord.getValue('custbody_ava_exemptcertno').substring(0, 25);
			}
			else{
				if(transactionRecord.getValue('istaxable') != null && transactionRecord.getField('taxitem') != null){
					if(transactionRecord.getValue('istaxable') != true){
						Transaction.exemptionNo = 'Exempt';
					}
				}
				else{
					if(transactionRecord.getValue('custbody_ava_customertaxable') != true){
						Transaction.exemptionNo = 'Exempt';
					}
				}
			}
			
			if(configCache.AVA_DisableLocationCode == false){
				if(transactionRecord.getValue('location') != null && transactionRecord.getValue('location').length > 0){
					var location = AVA_GetAddresses(transactionRecord, configCache, transactionRecord.getValue('location'), 2);
					Transaction.reportingLocationCode = location[0];
				}
			}
			
			AVA_GetTaxLines(transactionRecord, configCache, avaDocType, multiplier);
			Transaction.debugLevel = 'Diagnostic';
			
			if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 1){
				Transaction.referenceCode = (AVA_DocNo != null ? AVA_DocNo.substring(0, 50) : '');
			}
			
			Transaction.commit = (transactionRecord.getValue('custpage_ava_taxcodestatus') == 1) ? 1 : 0;
			
			if(transactionRecord.getValue('currencysymbol') != null && transactionRecord.getValue('currencysymbol').length > 0){
				if(transactionRecord.getValue('nexus_country') == 'JP'){
					Transaction.currencyCode = 'JPY';
				}
				else{
					if(AVA_FoundVatCountry == 1){
						if(transactionRecord.getValue('custbody_ava_subsidiarycurrency') != null && transactionRecord.getValue('custbody_ava_subsidiarycurrency').length > 0){
							Transaction.currencyCode = transactionRecord.getValue('custbody_ava_subsidiarycurrency');
						}
					}
					else{
						Transaction.currencyCode = transactionRecord.getValue('currencysymbol');
					}
				}
				
				Transaction.exchangeRate = transactionRecord.getValue('exchangerate');
				Transaction.exchangeRateEffectiveDate = ava_library.mainFunction('AVA_ConvertDate', transactionRecord.getValue('trandate'));
				
				if(AVA_FoundVatCountry == 1 && transactionRecord.getValue('exchangerate') != null && transactionRecord.getValue('exchangerate').toString().length > 0){
					Transaction.exchangeRateCurrencyCode = transactionRecord.getValue('currencysymbol');
				}
			}
			
			if(scisFlag == 1){
				if(transactionRecord.getValue('custpage_ava_rectype') == 'creditmemo' && transactionRecord.getValue('custbody_ns_pos_created_from') != null && transactionRecord.getValue('custbody_ns_pos_created_from').length > 0){
					Transaction.taxOverride.type = 'TaxDate';
					Transaction.taxOverride.taxDate = ava_library.mainFunction('AVA_ConvertDate', transactionRecord.getValue('custpage_ava_createfromdate'));
					Transaction.taxOverride.reason = 'Tax has already been determined by AvaTax';
				}
				else{
					Transaction.taxOverride.type = 'TaxAmount';
					Transaction.taxOverride.taxAmount = (parseFloat(transactionRecord.getValue('taxtotal')) + (transactionRecord.getValue('tax2total') != null ? parseFloat(transactionRecord.getValue('tax2total')) : 0)) * multiplier;
					Transaction.taxOverride.reason = 'Tax has already been determined by AvaTax';
				}
			}
			else{
				if((transactionRecord.getValue('custbody_ava_taxoverride') == true || transactionRecord.getValue('custbody_ava_taxdateoverride') == true) && AVA_TaxOverrideFlag == 0){
					if(transactionRecord.getValue('custbody_ava_taxoverride') == true && transactionRecord.getValue('custbody_ava_taxdateoverride') == true){
						Transaction.taxOverride.type = 'TaxAmount';
						Transaction.taxOverride.taxAmount = (parseFloat(transactionRecord.getValue('taxtotal')) + (transactionRecord.getValue('tax2total') != null ? parseFloat(transactionRecord.getValue('tax2total')) : 0)) * multiplier;
						Transaction.taxOverride.taxDate = ava_library.mainFunction('AVA_ConvertDate', transactionRecord.getValue('custbody_ava_taxoverridedate'));
						Transaction.taxOverride.reason = 'Tax Amount and Date has been provided by another service';
					}
					else if(transactionRecord.getValue('custbody_ava_taxoverride') == true){
						Transaction.taxOverride.type = 'TaxAmount';
						Transaction.taxOverride.taxAmount = (parseFloat(transactionRecord.getValue('taxtotal')) + (transactionRecord.getValue('tax2total') != null ? parseFloat(transactionRecord.getValue('tax2total')) : 0)) * multiplier;
						Transaction.taxOverride.reason = 'Tax has been provided by another service';
					}
					else{
						Transaction.taxOverride.type = 'TaxDate';
						Transaction.taxOverride.taxDate = ava_library.mainFunction('AVA_ConvertDate', transactionRecord.getValue('custbody_ava_taxoverridedate'));
						Transaction.taxOverride.reason = 'Tax Date has been provided by another service';
					}
				}
				else if((avaDocType == 'ReturnInvoice' || avaDocType == 'ReturnOrder') && ((transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0) || (transactionRecord.getValue('custbody_ns_pos_created_from') != null && transactionRecord.getValue('custbody_ns_pos_created_from').length > 0)) && AVA_TaxOverrideFlag == 0){
					Transaction.taxOverride.type = 'TaxDate';
					Transaction.taxOverride.taxDate = transactionRecord.getValue('custpage_ava_createfromdate');
					Transaction.taxOverride.reason = 'Tax Override';
				}
			}
			
			if(transactionRecord.getValue('nexus_country') == 'IN' && (transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false) && transactionRecord.getValue('custbody_ava_customergstin') != null && transactionRecord.getValue('custbody_ava_customergstin').length > 0){
				Transaction.businessIdentificationNo = transactionRecord.getValue('custbody_ava_customergstin');
			}
			else if(transactionRecord.getValue('custbody_ava_vatbusinessid') != null && transactionRecord.getValue('custbody_ava_vatbusinessid').length > 0){
				Transaction.businessIdentificationNo = transactionRecord.getValue('custbody_ava_vatbusinessid').substring(0, 25);
			}
			
			// Fix for CONNECT-3663
			Transaction.isSellerImporterOfRecord = (transactionRecord.getValue('custbody_ava_is_sellerimporter') == true) ? 1 : 0;
			
			//EVAT transport
			if(AVA_FoundVatCountry == 1 && AVA_TriangulationFlag == 0){
				var transportListValue = transactionRecord.getValue('custpage_ava_transportlist');
				var parameter = Transaction.getNewTransactionParameters();
				parameter.name = 'Transport';
				parameter.value = (transportListValue == 0) ? 'Seller' : ((transportListValue == 1) ? 'None' : ((transportListValue == 2) ? 'Seller' : ((transportListValue == 3) ? 'Buyer' : ((transportListValue == 4) ? 'ThirdPartyForSeller' : 'ThirdPartyForBuyer'))));
				
				Transaction.parameters.push(parameter);
			}
		}
		
		function AVA_LoadCustomerId(transactionRecord, recordType, recordId){
			if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
				var webstoreFlag = (transactionRecord.getValue('custpage_ava_context') == 'WEBSTORE' || transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION') ? true : false;	
				
				var response = https.get({
					url: url.resolveScript({
						scriptId: 'customscript_ava_recordload_suitelet',
						deploymentId: 'customdeploy_ava_recordload',
						params: {'type': recordType, 'id': recordId, 'recordopr': 'load'},
						returnExternalUrl: webstoreFlag
					})
				});
				return response.body.split('+');
			}
			else{
				var rec = record.load({
					type: recordType,
					id: recordId
				});
				return rec.getValue('entitytitle'); // Fix for CONNECT-3326
			}
		}
		
		function AVA_GetTaxLines(transactionRecord, configCache, avaDocType, multiplier){
			AVA_TaxRequestLines = new Array();
			var soapLine = 1, tabType, shipToEntityFlag = 0, tempPOS;
			tempPOS = AVA_LocationPOS;
			
			if(transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization'){
				shipToEntityFlag = 1;
			}
			
			// When there is only one shipping/billing address, fetching the entitymap for that address only once
			var entityMapHeader = '';
			
			if(configCache.AVA_EntityUseCode == true && shipToEntityFlag == 0){
				if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
					if(AVA_CreateFromRecord.getValue('ismultishipto') == null || AVA_CreateFromRecord.getValue('ismultishipto') == false){
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
							if((AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0)){
								if(AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode').length > 0){
									var entityUseCode = search.lookupFields({
										type: 'customrecord_avaentityusecodes',
										id: AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode'),
										columns: 'custrecord_ava_entityid'
									});
									entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
								}
							}
							else if((AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0)){
								if(AVA_CreateFromRecord.getValue('custbody_ava_billtousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_billtousecode').length > 0){
									var entityUseCode = search.lookupFields({
										type: 'customrecord_avaentityusecodes',
										id: AVA_CreateFromRecord.getValue('custbody_ava_billtousecode'),
										columns: 'custrecord_ava_entityid'
									});
									entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
								}
							}
						}
						else{
							if(transactionRecord.getValue('custpage_ava_usecodeusuage') != null && (transactionRecord.getValue('custpage_ava_usecodeusuage') == true || transactionRecord.getValue('custpage_ava_usecodeusuage') == 'T') && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
								//extract values from client side since its set
								if((AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('shipaddress') != null && AVA_CreateFromRecord.getValue('shipaddress').length > 0)){
									entityMapHeader = (AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_shiptousecode').length > 0) ? AVA_CreateFromRecord.getText('custbody_ava_shiptousecode').substring(0, 25) : '';
								}
								else if((AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0)){
									entityMapHeader = (AVA_CreateFromRecord.getValue('custbody_ava_billtousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_billtousecode').length > 0) ? AVA_CreateFromRecord.getText('custbody_ava_billtousecode').substring(0, 25) : '';
								}
							}
							else{
								//Existing logic for server side processing only.
								if(AVA_CreateFromRecord.getValue('shipaddresslist') != null && AVA_CreateFromRecord.getValue('shipaddresslist').length > 0){
									entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), AVA_CreateFromRecord.getValue('shipaddresslist'));
								}
								else if(AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0){
									entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), AVA_CreateFromRecord.getValue('billaddresslist'));
								}
							}
						}
					}
				}
				else{
					if(transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false){
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
							if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
								entityMapHeader = (transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25) : '';
							}
							else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
								entityMapHeader = (transactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25) : '';
							}
						}
						else{
							if(transactionRecord.getValue('custpage_ava_usecodeusuage') != null && (transactionRecord.getValue('custpage_ava_usecodeusuage') == true || transactionRecord.getValue('custpage_ava_usecodeusuage') == 'T') && transactionRecord.getValue('custpage_ava_context') == 'USERINTERFACE'){
								//extract values from client side since its set
								if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
									entityMapHeader = (transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25) : '';
								}
								else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
									entityMapHeader = (transactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25) : '';
								}
							}
							else{
								//Existing logic for server side processing only.
								if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
									if(transactionRecord.getValue('custbody_ava_shiptousecode') != null && transactionRecord.getValue('custbody_ava_shiptousecode').length > 0 && transactionRecord.getValue('custbody_ava_shiptousecode') != ' '){
										if(transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0){
											entityMapHeader = transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25);
										}
										else{
											var entityUseCode = search.lookupFields({
												type: 'customrecord_avaentityusecodes',
												id: transactionRecord.getValue('custbody_ava_shiptousecode'),
												columns: 'custrecord_ava_entityid'
											});
											entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
										}
									}
									else if(transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist') > 0){
										entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getValue('shipaddresslist'));
									}
								}
								else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
									if(transactionRecord.getValue('custbody_ava_billtousecode') != null && transactionRecord.getValue('custbody_ava_billtousecode').length > 0 && transactionRecord.getValue('custbody_ava_billtousecode') != ' '){
										if(ransactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0){
											entityMapHeader = transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25);
										}
										else{
											var entityUseCode = search.lookupFields({
												type: 'customrecord_avaentityusecodes',
												id: transactionRecord.getValue('custbody_ava_billtousecode'),
												columns: 'custrecord_ava_entityid'
											});
											entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
										}
									}
									else if(transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist') > 0){
										entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getValue('billaddresslist'));
									}
								}
							}
						}
					}
				}
			}
			
			for(var line = 0; AVA_TaxLines != null && line < AVA_TaxLines.length; line++){
				var descField  = (AVA_NS_Lines[line][0] == 'item') ? 'description' : 'memo';
				
				if(AVA_TaxLines[line] == 'T'){
					var taxLine = Transaction.getNewTransactionLine();
					taxLine.number = parseInt(soapLine);
					
					var locat;
					if(configCache.AVA_DisableLocationCode == false && (transactionRecord.getValue('custpage_ava_lineloc') == true || transactionRecord.getValue('custpage_ava_lineloc') == 'T')){
						var locPOS, flag = 1;
						
						if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
							for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
								if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
									for(var j = 0; j < AVA_LocationArray.length; j++){
										if(AVA_CreateFromRecord.getSublistValue(AVA_CreatedFromNS_Lines[i][0], 'location', AVA_CreatedFromNS_Lines[i][1]) == AVA_LocationArray[j][0]){
											locat = (AVA_LocationArray[j] != null && AVA_LocationArray[j][0] != null && AVA_LocationArray[j][1] != null && AVA_LocationArray[j][1][0] != null && AVA_LocationArray[j][1][0].length > 0) ? AVA_LocationArray[j][1][0] : null;
											var posCheck = (AVA_LocationArray[j] != null && AVA_LocationArray[j][0] != null && AVA_LocationArray[j][1] != null && AVA_LocationArray[j][1][0] != null && AVA_LocationArray[j][1][0].length > 0) ? AVA_LocationArray[j][1][8] : null;
											
											if(locat != null && locat.length > 0 && ((AVA_CreatedFromNS_Lines[i][0] == 'item' && AVA_CreateFromRecord.getSublistValue(AVA_CreatedFromNS_Lines[i][0], 'custcol_ava_pickup', AVA_CreatedFromNS_Lines[i][1]) == true) || (AVA_CreatedFromNS_Lines[i][0] != 'item' && posCheck == true))){
												locPOS = 1;
											}
											else{
												locPOS = 0;
											}
											
											break;
										}
									}
									
									flag = 0;
									break;
								}
							}
						}
						
						if(flag == 1){
							if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]) != null){
								locat = (AVA_LocationArray[line] != null && AVA_LocationArray[line][0] != null && AVA_LocationArray[line][1] != null && AVA_LocationArray[line][1][0] != null && AVA_LocationArray[line][1][0].length > 0) ? AVA_LocationArray[line][1][0] : null;
								var posCheck = (AVA_LocationArray[line] != null && AVA_LocationArray[line][0] != null && AVA_LocationArray[line][1] != null && AVA_LocationArray[line][1][0] != null && AVA_LocationArray[line][1][0].length > 0) ? AVA_LocationArray[line][1][8] : null;
								var tabType = (AVA_NS_Lines[line][0] == 'item') ? 'item' : ((AVA_NS_Lines[line][0] == 'itemcost') ? 'itemcost' : 'expcost');
								
								if(locat != null && locat.length > 0 && ((tabType == 'item' && AVA_PickUpFlag[line] == true) || (tabType != 'item' && posCheck == true))){
									locPOS = 1;
								}
								else{
									locPOS = 0;
								}
							}
						}
					}
					
					if(AVA_LocationPOS == 1 || locPOS == 1){
						if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
							if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
								taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headerlocation');
							}
							else{
								taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
							}
						}
						else{
							if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]).length > 0){
								if(AVA_LocationArray[line] != null && AVA_LocationArray[line][0] != null && AVA_LocationArray[line][1] != null && AVA_LocationArray[line][1][0] != null && AVA_LocationArray[line][1][0].length > 0){
									taxLine.addresses.SingleLocation = AVA_GetAddressDetails('linelocation', AVA_LocationArray[line][1]);
								}
								else{
									taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
								}
							}
							else{
								taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
							}
						}
					}
					else{
						if(AVA_TaxCodes[line] == 0){
							var flag = 1;
							
							if(configCache.AVA_DisableLocationCode == true){
								taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
							}
							else{
								if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
									if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
										if(AVA_LocationArray != null && AVA_LocationArray.length > 0){
											for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
												if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
													flag = 0;
													break;
												}
											}
										}
										else{
											flag = 0;
										}
										
										if(flag == 0){
											if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
												taxLine.addresses.ShipFrom = AVA_GetAddressDetails('headerlocation');
											}
											else{
												taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
											}
										}
										else{
											if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]) != null){
												var locationExists = 0;
												for(var j = 0; j < AVA_LocationArray.length; j++){
													if(AVA_LocationArray[j][0] != null && (transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]) == AVA_LocationArray[j][0])){
														taxLine.addresses.ShipFrom = AVA_GetAddressDetails('linelocation', AVA_LocationArray[j][1]);
														locationExists = 1;
														break;
													}
												}
												
												if(locationExists == 0){
													taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
												}
											}
										}
									}
									else{
										if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
											taxLine.addresses.ShipFrom = AVA_GetAddressDetails('headerlocation');
										}
										else{
											taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
										}
									}
								}
								else{
									var locationExists = 0;
									flag = 1;
									
									if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
										for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
											if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
												for(var j = 0; j < AVA_LocationArray.length; j++){
													if(AVA_LocationArray[j][0] != null && (AVA_CreateFromRecord.getSublistValue(AVA_CreatedFromNS_Lines[i][0], 'location', AVA_CreatedFromNS_Lines[i][1]) == AVA_LocationArray[j][0])){
														taxLine.addresses.ShipFrom = AVA_GetAddressDetails('linelocation', AVA_LocationArray[j][1]);
														locationExists = 1;
														break;
													}
												}
												
												flag = 0;
												break;
											}
										}
										
										if(locationExists == 0){
											taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
										}
									}
									
									if(flag == 1){
										if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]).length > 0){
											if(AVA_LocationArray[line] != null && AVA_LocationArray[line][0] != null && AVA_LocationArray[line][1] != null && AVA_LocationArray[line][1][0] != null && AVA_LocationArray[line][1][0].length > 0){
												taxLine.addresses.ShipFrom = AVA_GetAddressDetails('linelocation', AVA_LocationArray[line][1]);
											}
											else{
												taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
											}
										}
										else{
											taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
										}
									}
								}
							}
							
							flag = 1;
							if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
								for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
									if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
										if(AVA_CreatedFromNS_Lines[i][0] == 'item' && AVA_CreateFromRecord.getValue('ismultishipto') == true){
											//When Multi Line Shipping Route is enabled
											if(AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length > 0){
												for(var k = 0; k < AVA_CreateFromRecord.getLineCount('iladdrbook'); k++){
													if(AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) == AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k)){
														var ShipTo = new AvaTax.address();
														
														ShipTo.line1 	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).substring(0, 50) : '';
														ShipTo.line2 	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).substring(0, 100) : '';
														ShipTo.line3 	  = '';
														ShipTo.city 	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).substring(0, 50) : '';
														ShipTo.region 	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) : '';
														ShipTo.postalCode = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).substring(0, 11) : '';
														ShipTo.country	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) : '';
														ShipTo.latitude	  = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) : '';
														ShipTo.longitude  = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) : '';
														
														taxLine.addresses.ShipTo = ShipTo;
														break;
													}
												}
											}
											else if((AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) && (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]).length > 0)){
												var ShipTo = new AvaTax.address();
												
												ShipTo.latitude	 = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) : '';
												ShipTo.longitude = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) : '';
												
												taxLine.addresses.ShipTo = ShipTo;
											}
											else{
												if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK' || transactionRecord.getValue('source') == 'SCIS'){
													if(configCache.AVA_DisableLocationCode == false){
														if((transactionRecord.getValue('custpage_ava_lineloc') == true || transactionRecord.getValue('custpage_ava_lineloc') == 'T') && AVA_CreateFromRecord.getSublistValue('item', 'location', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'location', AVA_CreatedFromNS_Lines[i][1]).length > 0){
															taxLine.addresses.ShipTo = AVA_GetAddressDetails('linelocation', AVA_LocationArray[i][1]);
														}
														else if(AVA_CreateFromRecord.getValue('location') != null && AVA_CreateFromRecord.getValue('location').length > 0){
															if(AVA_HeaderLocation == null || AVA_HeaderLocation.length == 0){
																AVA_HeaderLocation = AVA_GetAddresses(transactionRecord, configCache, AVA_CreateFromRecord.getValue('location'), 2);
															}
															
															taxLine.addresses.ShipTo = AVA_GetAddressDetails('headerlocation');
														}
														else{
															taxLine.addresses.ShipTo = AVA_GetAddressDetails('default');
														}
													}
													else{
														taxLine.addresses.ShipTo = AVA_GetAddressDetails('default');
													}
												}
												else{
													taxLine.addresses.ShipTo = AVA_GetAddressDetails('headershipto');
												}
											}
										}
										else{
											taxLine.addresses.ShipTo = AVA_GetAddressDetails('headershipto');
										}
										
										flag = 0;
										break;
									}
								}
							}
							
							if(flag == 1){
								if(AVA_NS_Lines[line][0] == 'item' && transactionRecord.getValue('ismultishipto') == true){
									//When Multi Line Shipping Route is enabled
									if(transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length > 0){
										for(var k = 0; k < transactionRecord.getLineCount('iladdrbook'); k++){
											if(transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) == transactionRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k)){
												var ShipTo = new AvaTax.address();
												
												ShipTo.line1 	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).substring(0, 50) : '';
												ShipTo.line2 	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).substring(0, 100) : '';
												ShipTo.line3 	  = '';
												ShipTo.city 	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).substring(0, 50) : '';
												ShipTo.region 	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) : '';
												ShipTo.postalCode = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).substring(0, 11) : '';
												ShipTo.country	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) : '';
												ShipTo.latitude	  = (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) : '';
												ShipTo.longitude  = (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) : '';
												
												taxLine.addresses.ShipTo = ShipTo;
												break;
											}
										}
									}
									else if((transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]).length > 0) && (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]).length > 0)){
										var ShipTo = new AvaTax.address();
										
										ShipTo.latitude		= (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) : '';
										ShipTo.longitude	= (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) : '';
										
										taxLine.addresses.ShipTo = ShipTo;
									}
									else{
										if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK' || transactionRecord.getValue('source') == 'SCIS'){
											if(configCache.AVA_DisableLocationCode == false){
												if((transactionRecord.getValue('custpage_ava_lineloc') == true || transactionRecord.getValue('custpage_ava_lineloc') == 'T') && transactionRecord.getSublistValue('item', 'location', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'location', AVA_NS_Lines[line][1]).length > 0){
													taxLine.addresses.ShipTo = AVA_GetAddressDetails('linelocation', AVA_LocationArray[line][1]);
												}
												else if(transactionRecord.getValue('location') != null && transactionRecord.getValue('location').length > 0){
													if(AVA_HeaderLocation == null || AVA_HeaderLocation.length == 0){
														AVA_HeaderLocation = AVA_GetAddresses(transactionRecord, configCache, transactionRecord.getValue('location'), 2);
													}
													
													taxLine.addresses.ShipTo = AVA_GetAddressDetails('headerlocation');
												}
												else{
													taxLine.addresses.ShipTo = AVA_GetAddressDetails('default');
												}
											}
											else{
												taxLine.addresses.ShipTo = AVA_GetAddressDetails('default');
											}
										}
										else{
											taxLine.addresses.ShipTo = AVA_GetAddressDetails('headershipto');
										}
									}
								}
								else{
									taxLine.addresses.ShipTo = AVA_GetAddressDetails('headershipto');
								}
							}
							
							//EVAT code 
							if(AVA_FoundVatCountry == 1){
								var addressValue = transactionRecord.getValue('custpage_ava_vataddresses');
								
								if(addressValue != null && addressValue.length > 0){
									addressValue = JSON.parse(addressValue);
									
									if(addressValue[0] == true){
										taxLine.addresses.goodsPlaceOrServiceRendered = AVA_GetAddressDetails('goodsplaceorserviceaddress', addressValue);
									}
									
									if(addressValue[7] == true){
										taxLine.addresses.pointOfOrderOrigin = AVA_GetAddressDetails('pointoforderoriginaddress', addressValue);
									}
									
									if(addressValue[14] == true){
										taxLine.addresses.import = AVA_GetAddressDetails('importaddress', addressValue);
									}
								}
								else{
									var vatAddr = AVA_GetVatAddresses(transactionRecord);
									
									if(vatAddr != null && vatAddr.length > 0){
										if(vatAddr[0] == true){
											taxLine.addresses.goodsPlaceOrServiceRendered = AVA_GetAddressDetails('goodsplaceorserviceaddress', vatAddr);
										}
										
										if(vatAddr[7] == true){
											taxLine.addresses.pointOfOrderOrigin = AVA_GetAddressDetails('pointoforderoriginaddress', vatAddr);
										}
										
										if(vatAddr[14] == true){
											taxLine.addresses.import = AVA_GetAddressDetails('importaddress', vatAddr);
										}
									}
								}
							}
						}
						else if(AVA_TaxCodes[line] == 1){ // POD case
							var flag = 1;
							
							if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
								for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
									if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
										if(AVA_CreatedFromNS_Lines[i][0] == 'item' && AVA_CreateFromRecord.getValue('ismultishipto') == true){
											//When Multi Line Shipping Route is enabled
											if(AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length > 0){
												for(var k = 0; k < AVA_CreateFromRecord.getLineCount('iladdrbook'); k++){
													if(AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) == AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k)){
														var SingleLocation = new AvaTax.address();
														
														SingleLocation.line1 	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).substring(0, 50) : '';
														SingleLocation.line2 	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).substring(0, 100) : '';
														SingleLocation.line3 	  = '';
														SingleLocation.city 	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).substring(0, 50) : '';
														SingleLocation.region 	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) : '';
														SingleLocation.postalCode = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).substring(0, 11) : '';
														SingleLocation.country	  = (AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) != null && AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k).length > 0) ? AVA_CreateFromRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) : '';
														SingleLocation.latitude	  = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) : '';
														SingleLocation.longitude  = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) : '';
														
														taxLine.addresses.SingleLocation = SingleLocation;
														break;
													}
												}
											}
											else if((AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) && (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]).length > 0)){
												var SingleLocation = new AvaTax.address();
												
												SingleLocation.latitude	 = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_CreatedFromNS_Lines[i][1]) : '';
												SingleLocation.longitude = (AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]).length > 0) ? AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_CreatedFromNS_Lines[i][1]) : '';
												
												taxLine.addresses.SingleLocation = SingleLocation;
											}
											else{
												taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headershipto');
											}
										}
										else{
											taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headershipto');
										}
										
										flag = 0;
										break;
									}
								}
							}
							
							if(flag == 1){
								if(AVA_NS_Lines[line][0] == 'item' && transactionRecord.getValue('ismultishipto') == true){
									//When Multi Line Shipping Route is enabled
									if(transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length > 0){
										for(var k = 0; k < transactionRecord.getLineCount('iladdrbook'); k++){
											if(transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) == transactionRecord.getSublistValue('iladdrbook', 'iladdrinternalid', k)){
												var SingleLocation = new AvaTax.address();
												
												SingleLocation.line1 	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr1', k).substring(0, 50) : '';
												SingleLocation.line2 	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipaddr2', k).substring(0, 100) : '';
												SingleLocation.line3 	  = '';
												SingleLocation.city 	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcity', k).substring(0, 50) : '';
												SingleLocation.region 	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipstate', k) : '';
												SingleLocation.postalCode = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipzip', k).substring(0, 11) : '';
												SingleLocation.country	  = (transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) != null && transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k).length > 0) ? transactionRecord.getSublistValue('iladdrbook', 'iladdrshipcountry', k) : '';
												SingleLocation.latitude	  = (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) : '';
												SingleLocation.longitude  = (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) : '';
												
												taxLine.addresses.SingleLocation = SingleLocation;
												break;
											}
										}
									}
									else if((transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]).length > 0) && (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]).length > 0)){
										var SingleLocation = new AvaTax.address();
										
										SingleLocation.latitude	 = (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_latitude', AVA_NS_Lines[line][1]) : '';
										SingleLocation.longitude = (transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]).length > 0) ? transactionRecord.getSublistValue('item', 'custcol_ava_shipto_longitude', AVA_NS_Lines[line][1]) : '';
										
										taxLine.addresses.SingleLocation = SingleLocation;
									}
									else{
										taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headershipto');
									}
								}
								else{
									taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headershipto');
								}
							}
						}
						else if(AVA_TaxCodes[line] == 2){ // POS case
							var flag = 1;
							
							if(configCache.AVA_DisableLocationCode == true){
								taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
							}
							else{
								if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
									if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
										if(AVA_LocationArray != null && AVA_LocationArray.length > 0){
											for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
												if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
													flag = 0;
													break;
												}
											}
										}
										else{
											flag = 0;
										}
										
										if(flag == 0){
											if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
												taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headerlocation');
											}
											else{
												taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
											}
										}
										else{
											if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]) != null){
												var locationExists = 0;
												for(var j = 0; j < AVA_LocationArray.length; j++){
													if(AVA_LocationArray[j][0] != null && (transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]) == AVA_LocationArray[j][0])){
														taxLine.addresses.SingleLocation = AVA_GetAddressDetails('linelocation', AVA_LocationArray[j][1]);
														locationExists = 1;
														break;
													}
												}
												
												if(locationExists == 0){
													taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
												}
											}
										}
									}
									else{
										if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
											taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headerlocation');
										}
										else{
											taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
										}
									}
								}
								else{
									flag = 1;
									
									if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
										for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
											if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
												for(var j = 0; j < AVA_LocationArray.length; j++){
													if(AVA_LocationArray[j][0] != null && (AVA_CreateFromRecord.getSublistValue(AVA_CreatedFromNS_Lines[i][0], 'location', AVA_CreatedFromNS_Lines[i][1]) == AVA_LocationArray[j][0])){
														taxLine.addresses.SingleLocation = AVA_GetAddressDetails('linelocation', AVA_LocationArray[j][1]);
														locationExists = 1;
														break;
													}
												}
												
												flag = 0;
												break;
											}
										}
										
										if(locationExists == 0){
											taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
										}
									}
									
									if(flag == 1){
										if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'location', AVA_NS_Lines[line][1]).length > 0){
											if(AVA_LocationArray[line] != null && AVA_LocationArray[line][0] != null && AVA_LocationArray[line][1] != null && AVA_LocationArray[line][1][0] != null && AVA_LocationArray[line][1][0].length > 0){
												taxLine.addresses.SingleLocation = AVA_GetAddressDetails('linelocation', AVA_LocationArray[line][1]);
											}
											else{
												taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
											}
										}
										else{
											taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
										}
									}
								}
							}
						}
					}
					
					taxLine.itemCode = (AVA_LineNames[line] != null) ? AVA_LineNames[line].substring(0, 50) : '';
					
					AVA_TaxRequestLines[soapLine-1] = new Array();
					AVA_TaxRequestLines[soapLine-1][0] = AVA_NS_Lines[line][0]; // Tab name
					AVA_TaxRequestLines[soapLine-1][1] = (AVA_LineNames[line] != null) ? AVA_LineNames[line].substring(0,50) : '';
					AVA_TaxRequestLines[soapLine-1][2] = AVA_NS_Lines[line][1];//Line Number
					AVA_TaxRequestLines[soapLine-1][3] = line;//Taxcode Array's Index(Used in AVA_SetTaxFlagsOnServer())

					if(configCache.AVA_TaxCodeMapping == true){
						var taxcode = null;
						
						if(AVA_NS_Lines[line][0] != 'item' && AVA_NS_Lines[line][0] != 'expcost'){
							for(var item = 0; item < AVA_ItemInfoArr.length; item++){
								if(AVA_ItemInfoArr[item][0] == line){
									taxcode = AVA_ItemInfoArr[item][3];
									break;
								}
							}
						}
						else if(AVA_NS_Lines[line][0] == 'item'){
							taxcode = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_taxcodemapping', AVA_NS_Lines[line][1]);
						}
						
						if(taxcode != null && taxcode != ''){
							if(configCache.AVA_TaxCodePrecedence == false){
								taxLine.taxCode = taxcode.substring(0, 25);
							}
							else{
								if(AVA_Taxable[line] == 'F'){
									taxLine.taxCode = 'NT';
								}
								else{
									taxLine.taxCode = taxcode.substring(0, 25);
								}
							}
						}
						else{
							if(AVA_Taxable[line] == 'F'){
								if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0 && (configCache.AVA_DiscountTaxCode != null && configCache.AVA_DiscountTaxCode.length > 0)){
									taxLine.taxCode = configCache.AVA_DiscountTaxCode;
								}
								else{
									taxLine.taxCode = 'NT';
								}
							}
						}
					}
					else{
						if(AVA_Taxable[line] == 'F'){
							if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0 && (configCache.AVA_DiscountTaxCode != null && configCache.AVA_DiscountTaxCode.length > 0)){
								taxLine.taxCode = configCache.AVA_DiscountTaxCode;
							}
							else{
								taxLine.taxCode = 'NT';
							}
						}
					}
					
					var qty = (AVA_LineQty[line] > 0) ? AVA_LineQty[line] : (AVA_LineQty[line] * -1);
					taxLine.quantity = qty;
					
					var amount = (AVA_LineAmount[line] * multiplier);
					taxLine.amount = amount;
					
					//Discount Mechanism
					if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0){
						taxLine.discounted = 0;
					}
					else{
						if(parseFloat(transactionRecord.getValue('discounttotal')) != 0.0){
							taxLine.discounted = 1;
						}
						else{
							taxLine.discounted = 0;
						}
					}
					
					if(configCache.AVA_ItemAccount == true){
						var itemAccount = null;
						
						if(AVA_NS_Lines[line][0] != 'item' && AVA_NS_Lines[line][0] != 'expcost'){
							for(var item = 0; item < AVA_ItemInfoArr.length; item++){
								if(AVA_ItemInfoArr[item][0] == line){
									itemAccount = AVA_ItemInfoArr[item][4];
									break;
								}
							}
						}
						else if(AVA_NS_Lines[line][0] == 'item'){
							itemAccount = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_incomeaccount', AVA_NS_Lines[line][1]);
						}
						
						if(itemAccount != null && itemAccount.length != 0){
							taxLine.revenueAccount = itemAccount.substring(0, 50);
						}
					}
					
					if(configCache.AVA_UDF1 == true){
						var udf = null;
						
						if(AVA_NS_Lines[line][0] != 'item' && AVA_NS_Lines[line][0] != 'expcost'){
							for(var item = 0; item < AVA_ItemInfoArr.length; item++){
								if(AVA_ItemInfoArr[item][0] == line){
									udf = AVA_ItemInfoArr[item][1];
									break;
								}
							}
						}
						else if(AVA_NS_Lines[line][0] == 'item'){
							udf = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_udf1', AVA_NS_Lines[line][1]);
						}
						
						if(udf != null && udf != ''){
							taxLine.ref1 = udf.substring(0, 250);
						}
					}
					
					if(configCache.AVA_UDF2 == true){
						var udf = null;
						
						if(AVA_NS_Lines[line][0] != 'item' && AVA_NS_Lines[line][0] != 'expcost'){
							for(var item = 0; item < AVA_ItemInfoArr.length; item++){
								if(AVA_ItemInfoArr[item][0] == line){
									udf = AVA_ItemInfoArr[item][2];
									break;
								}
							}
						}
						else if(AVA_NS_Lines[line][0] == 'item'){
							udf = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_udf2', AVA_NS_Lines[line][1]);
						}
						
						if(udf != null && udf != ''){
							taxLine.ref2 = udf.substring(0, 250);
						}
					}
					
					if(configCache.AVA_EntityUseCode == true && AVA_TaxCodes[line] != 2){
						var entitymap = '', entityusecode = '', flag = 1;
						
						if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
							for(var i = 0; AVA_CreatedFromNS_Lines != null && i < AVA_CreatedFromNS_Lines.length; i++){
								if(transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'item', AVA_NS_Lines[line][1]) == AVA_CreatedFromNS_Lines[i][2]){
									if(AVA_CreatedFromNS_Lines[i][0] == 'item' && (AVA_CreateFromRecord.getValue('ismultishipto') == true || shipToEntityFlag == 1)){
										if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
											if((AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length > 0) || shipToEntityFlag == 1){
												if(AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shiptousecode', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shiptousecode', AVA_CreatedFromNS_Lines[i][1]).length > 0){
													entityusecode = search.lookupFields({
														type: 'customrecord_avaentityusecodes',
														id: AVA_CreateFromRecord.getSublistValue('item', 'custcol_ava_shiptousecode', AVA_CreatedFromNS_Lines[i][1]),
														columns: 'custrecord_ava_entityid'
													});
													entityusecode = (entityusecode.custrecord_ava_entityid != null && entityusecode.custrecord_ava_entityid.length > 0) ? entityusecode.custrecord_ava_entityid : '';
												}
												
												taxLine.entityUseCode = (entityusecode != null && entityusecode.length > 0) ? entityusecode.substring(0, 25) : '';
											}
											else if((AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) == null || AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length == 0) && (AVA_CreateFromRecord.getValue('shipaddresslist') == null || AVA_CreateFromRecord.getValue('shipaddresslist').length == 0) && (AVA_CreateFromRecord.getValue('shipaddress') == null || AVA_CreateFromRecord.getValue('shipaddress').length == 0)){
												if((AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0)){
													if(AVA_CreateFromRecord.getValue('custbody_ava_billtousecode') != null && AVA_CreateFromRecord.getValue('custbody_ava_billtousecode').length > 0){
														entityusecode = search.lookupFields({
															type: 'customrecord_avaentityusecodes',
															id: AVA_CreateFromRecord.getValue('custbody_ava_billtousecode'),
															columns: 'custrecord_ava_entityid'
														});
														entityusecode = (entityusecode.custrecord_ava_entityid != null && entityusecode.custrecord_ava_entityid.length > 0) ? entityusecode.custrecord_ava_entityid : '';
													}
													
													taxLine.entityUseCode = (entityusecode != null && entityusecode.length > 0) ? entityusecode.substring(0, 25) : '';
												}
											}
										}
										else{
											if(transactionRecord.getValue('custpage_ava_usecodeusuage') != null && (transactionRecord.getValue('custpage_ava_usecodeusuage') == true || transactionRecord.getValue('custpage_ava_usecodeusuage') == 'T')){
												if((AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length > 0) || shipToEntityFlag == 1){
													entityusecode = AVA_CreateFromRecord.getSublistText('item', 'custcol_ava_shiptousecode', AVA_NS_Lines[line][1]);
													taxLine.entityUseCode = (entityusecode != null && entityusecode.length > 0) ? entityusecode.substring(0, 25) : '';
												}
												else if((AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) == null || AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length == 0) && (AVA_CreateFromRecord.getValue('shipaddresslist') == null || AVA_CreateFromRecord.getValue('shipaddresslist').length == 0) && (AVA_CreateFromRecord.getValue('shipaddress') == null || AVA_CreateFromRecord.getValue('shipaddress').length == 0)){
													if((AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0) || (AVA_CreateFromRecord.getValue('billaddress') != null && AVA_CreateFromRecord.getValue('billaddress').length > 0)){
														entityusecode = AVA_CreateFromRecord.getText('custbody_ava_billtousecode');
														taxLine.entityUseCode = (entityusecode != null && entityusecode.length > 0) ? entityusecode.substring(0, 25) : '';
													}
												}
											}
											else{
												if(shipToEntityFlag == 0 && AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) != null && AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length > 0){
													taxLine.entityUseCode = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]));
												}
												else if((AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]) == null || AVA_CreateFromRecord.getSublistValue('item', 'shipaddress', AVA_CreatedFromNS_Lines[i][1]).length == 0) && (AVA_CreateFromRecord.getValue('shipaddresslist') == null || AVA_CreateFromRecord.getValue('shipaddresslist').length == 0) && (AVA_CreateFromRecord.getValue('shipaddress') == null || AVA_CreateFromRecord.getValue('shipaddress').length == 0)){
													if(AVA_CreateFromRecord.getValue('billaddresslist') != null && AVA_CreateFromRecord.getValue('billaddresslist').length > 0){
														taxLine.entityUseCode = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), AVA_CreateFromRecord.getValue('billaddresslist'));
													}
												}
											}
										}
									}
									else if(entityMapHeader != null && entityMapHeader.length > 0){
										if(transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
											taxLine.entityUseCode = entityMapHeader;
										}
										else{
											taxLine.entityUseCode = entityMapHeader.substring(0, 25);
										}
									}
									
									flag = 0;
									break;
								}
							}
						}
						
						if(flag == 1){
							if(AVA_NS_Lines[line][0] == 'item' && (transactionRecord.getValue('ismultishipto') == true || shipToEntityFlag == 1)){
								if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
									if((transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length > 0) || (shipToEntityFlag == 1)){
										entityusecode = transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecodetext', AVA_NS_Lines[line][1]);
										taxLine.entityUseCode = (entityusecode != null && entityusecode.length > 0) ? entityusecode.substring(0, 25) : '';
									}
									else if((transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) == null || transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length == 0) && (transactionRecord.getValue('shipaddresslist') == null || transactionRecord.getValue('shipaddresslist').length == 0) && (transactionRecord.getValue('shipaddress') == null || transactionRecord.getValue('shipaddress').length == 0)){
										if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
											taxLine.entityUseCode = (transactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25) : '';
										}
									}
								}
								else{
									if(transactionRecord.getValue('custpage_ava_usecodeusuage') != null && (transactionRecord.getValue('custpage_ava_usecodeusuage') == true || transactionRecord.getValue('custpage_ava_usecodeusuage') == 'T') && transactionRecord.getValue('custpage_ava_context') == 'USERINTERFACE'){
										if((transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length > 0) || (shipToEntityFlag == 1)){
											entityusecode = transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecodetext', AVA_NS_Lines[line][1]);
											taxLine.entityUseCode = (entityusecode != null && entityusecode.length > 0) ? entityusecode.substring(0, 25) : '';
										}
										else if((transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) == null || transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length == 0) && (transactionRecord.getValue('shipaddresslist') == null || transactionRecord.getValue('shipaddresslist').length == 0) && (transactionRecord.getValue('shipaddress') == null || transactionRecord.getValue('shipaddress').length == 0)){
											if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
												taxLine.entityUseCode = (transactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25) : '';
											}
										}
									}
									else{
										if(shipToEntityFlag == 0 && transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length > 0){
											if(transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecode', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecode', AVA_NS_Lines[line][1]).length > 0 && transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecode', AVA_NS_Lines[line][1]) != ' '){
												if(transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecodetext', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecodetext', AVA_NS_Lines[line][1]).length > 0){
													taxLine.entityUseCode = transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecodetext', AVA_NS_Lines[line][1]).substring(0, 25);
												}
												else{
													var entityUseCode = search.lookupFields({
														type: 'customrecord_avaentityusecodes',
														id: transactionRecord.getSublistValue('item', 'custcol_ava_shiptousecode', AVA_NS_Lines[line][1]),
														columns: 'custrecord_ava_entityid'
													});
													taxLine.entityUseCode = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
												}
											}
											else{
												taxLine.entityUseCode = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]));
											}
										}
										else if((transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]) == null || transactionRecord.getSublistValue('item', 'shipaddress', AVA_NS_Lines[line][1]).length == 0) && (transactionRecord.getValue('shipaddresslist') == null || transactionRecord.getValue('shipaddresslist').length == 0) && (transactionRecord.getValue('shipaddress') == null || transactionRecord.getValue('shipaddress').length == 0)){
											if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
												if(transactionRecord.getValue('custbody_ava_billtousecode') != null && transactionRecord.getValue('custbody_ava_billtousecode').length > 0 && transactionRecord.getValue('custbody_ava_billtousecode') != ' '){
													if(ransactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0){
														taxLine.entityUseCode = transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25);
													}
													else{
														var entityUseCode = search.lookupFields({
															type: 'customrecord_avaentityusecodes',
															id: transactionRecord.getValue('custbody_ava_billtousecode'),
															columns: 'custrecord_ava_entityid'
														});
														taxLine.entityUseCode = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
													}
												}
												else if(transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist') > 0){
													taxLine.entityUseCode = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getValue('billaddresslist'));
												}
											}
										}
									}
								}
							}
							else if(entityMapHeader != null && entityMapHeader.length > 0){
								if(transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
									taxLine.entityUseCode = entityMapHeader;
								}
								else{
									taxLine.entityUseCode = entityMapHeader.substring(0, 25);
								}
							}
						}
					}
					
					var description = '';
					var itemDesc = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], descField, AVA_NS_Lines[line][1]);
					
					for(var ii = 0; itemDesc != null && ii < itemDesc.length; ii++){
						if(itemDesc.charCodeAt(ii) != 5){
							description = description + itemDesc.charAt(ii);
						}
					}
					
					if(description != null && description.length != 0){
						taxLine.description = description.substring(0, 2048);
					}
					else{
						taxLine.description = (AVA_LineNames[line] != null) ? AVA_LineNames[line].substring(0, 2048) : '';
					}
					
					if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund') && AVA_LineNames[line] == 'Sales Tax Adjustment'){
						taxLine.taxOverride = new taxLine.taxOverride();
						taxLine.taxOverride.type = 'TaxAmount';
						taxLine.taxOverride.taxAmount = (transactionRecord.getValue('custbody_ava_taxcredit') * multiplier);
						taxLine.taxOverride.reason = 'AvaTax Sales Tax Only Adjustment';
					}
					
					if(configCache.AVA_TaxInclude == true && configCache.AVA_EnableDiscount == false && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
						taxLine.taxIncluded = 1;
					}
					
					if(transactionRecord.getValue('nexus_country') == 'IN' && transactionRecord.getValue('ismultishipto') == true && (transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_customergstin', AVA_NS_Lines[line][1]) != null && transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_customergstin', AVA_NS_Lines[line][1]).length > 0)){
						taxLine.businessIdentificationNo = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_customergstin', AVA_NS_Lines[line][1]);
					}
					
					//parameters for EVAT
					if(AVA_FoundVatCountry == 1){
						var IsGoodsSecondHand = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_ava_preowned', AVA_NS_Lines[line][1]);
						var parameter = taxLine.getNewTransactionLineParameters();
						parameter.name = 'IsGoodsSecondHand';
						parameter.value = (IsGoodsSecondHand == true || IsGoodsSecondHand == 'T') ? true : false;
						taxLine.parameters.push(parameter);
						
						var IsTriangulation = transactionRecord.getSublistValue(AVA_NS_Lines[line][0], 'custcol_5892_eutriangulation', AVA_NS_Lines[line][1]);
						parameter = taxLine.getNewTransactionLineParameters();
						parameter.name = 'IsTriangulation';
						parameter.value = (IsTriangulation == true || IsTriangulation == 'T') ? true : false;
						taxLine.parameters.push(parameter);
						
						if(IsTriangulation == true){	
							var MiddlemanVatId =  transactionRecord.getValue('custbody_ava_vatregno');					
							parameter = taxLine.getNewTransactionLineParameters();
							parameter.name = 'MiddlemanVatId';
							parameter.value = (MiddlemanVatId != null && MiddlemanVatId.length > 0) ? MiddlemanVatId : '';
							taxLine.parameters.push(parameter);
							
							parameter = taxLine.getNewTransactionLineParameters();
							parameter.name = 'Transport';
							parameter.value = 'None' ;
							taxLine.parameters.push(parameter);
							
							AVA_TriangulationFlag = 1;
						}
					}
					
					soapLine++;
					AVA_LineCount++;
					Transaction.Lines.push(taxLine);
				}
			}
			
			// For Billable Items, Billable Expenses, Billable Time discount.
			if(configCache.AVA_EnableDiscount == true && (transactionRecord.getValue('custpage_ava_billcost') == true || transactionRecord.getValue('custpage_ava_billcost') == 'T') && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0){
				for(var tab = 0; tab < 3; tab++){
					var amountField = (tab == 0) ? 'itemcostdiscamount' : ((tab == 1) ? 'expcostdiscamount' : 'timediscamount');
					var discountField = (tab == 0) ? 'itemcostdiscount' : ((tab == 1) ? 'expcostdiscount' : 'timediscount');
					if(transactionRecord.getValue(amountField) != null && transactionRecord.getValue(amountField).length > 0){
						AVA_GetDiscountSoap(transactionRecord, configCache, soapLine, discountField, amountField, multiplier);
						soapLine++;
						AVA_LineCount++;
					}
				}
			}
			
			// For Header leve discount.
			if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0 && (transactionRecord.getValue('discounttotal') != null && parseFloat(transactionRecord.getValue('discounttotal')) != 0)){
				AVA_GetDiscountSoap(transactionRecord, configCache, soapLine, 'discountitem', 'discounttotal', multiplier);
				soapLine++;
				AVA_LineCount++;
			}
			
			if(transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false){
				if(transactionRecord.getValue('shipmethod') != null && transactionRecord.getValue('shippingcost') != null && transactionRecord.getValue('shippingcost') > 0){
					AVA_LineNames[AVA_LineNames.length] = 'FREIGHT';
					soapLine++;
					AVA_GetShipAndHandling(transactionRecord, configCache, parseFloat(soapLine - 1), 'FREIGHT', multiplier);
					AVA_LineCount++;
				}
				
				if(transactionRecord.getValue('shipmethod') != null && transactionRecord.getValue('handlingcost') != null && transactionRecord.getValue('handlingcost') > 0){
					AVA_LineNames[AVA_LineNames.length] = 'MISCELLANEOUS';
					soapLine++;
					AVA_GetShipAndHandling(transactionRecord, configCache, parseFloat(soapLine - 1), 'MISCELLANEOUS', multiplier);
					AVA_LineCount++;
				}
			}
			else{
				ShipLineCount   = 0;
				AVA_ShippingAmt = new Array();
				AVA_HandlingAmt = new Array();
				
				for(var i = 0; AVA_ShipGroupTaxcodes != null && i < AVA_ShipGroupTaxcodes.length; i++){
					var fieldName = (AVA_ShipGroupTaxcodes[i][3] == 'FREIGHT') ? 'shippingrate' : 'handlingrate';
					if(transactionRecord.getSublistValue('shipgroup', fieldName, AVA_ShipGroupTaxcodes[i][0]) != null && transactionRecord.getSublistValue('shipgroup', fieldName, AVA_ShipGroupTaxcodes[i][0]) > 0){
						soapLine++;
						AVA_MultiShipHandlingLines(transactionRecord, configCache, parseFloat(soapLine - 1), AVA_ShipGroupTaxcodes[i], multiplier);
						AVA_LineCount++;
					}
				}
			}
		}
		
		function AVA_GetAddressDetails(addressType, addr){
			var address = new AvaTax.address();
			
			if(addressType == 'default'){
				address.line1 	   = (AVA_Def_Addr1 != null ? AVA_Def_Addr1.substring(0, 50) : '');
				address.line2 	   = (AVA_Def_Addr2 != null ? AVA_Def_Addr2.substring(0, 100) : '');
				address.line3 	   = '';
				address.city 	   = (AVA_Def_City != null ? AVA_Def_City.substring(0, 50) : '');
				address.region 	   = (AVA_Def_State != null ? AVA_Def_State : '');
				address.postalCode = (AVA_Def_Zip != null ? AVA_Def_Zip.substring(0, 11) : '');
				address.country    = (AVA_Def_Country != null ? AVA_Def_Country : '');
			}
			else if(addressType == 'headerlocation'){
				address.line1 	   = (AVA_HeaderLocation[1] != null ? AVA_HeaderLocation[1] : '');
				address.line2 	   = (AVA_HeaderLocation[2] != null ? AVA_HeaderLocation[2] : '');
				address.line3 	   = '';
				address.city 	   = (AVA_HeaderLocation[4] != null ? AVA_HeaderLocation[4] : '');
				address.region 	   = (AVA_HeaderLocation[5] != null ? AVA_HeaderLocation[5] : '');
				address.postalCode = (AVA_HeaderLocation[6] != null ? AVA_HeaderLocation[6] : '');
				address.country    = (AVA_HeaderLocation[7] != null ? AVA_HeaderLocation[7] : '');
			}
			else if(addressType == 'linelocation'){
				address.line1 	   = (addr[1] != null ? addr[1] : '');
				address.line2 	   = (addr[2] != null ? addr[2] : '');
				address.line3 	   = '';
				address.city 	   = (addr[4] != null ? addr[4] : '');
				address.region 	   = (addr[5] != null ? addr[5] : '');
				address.postalCode = (addr[6] != null ? addr[6] : '');
				address.country    = (addr[7] != null ? addr[7] : '');
			}
			else if(addressType == 'goodsplaceorserviceaddress'){
				address.line1 	   = addr[1];
				address.line2 	   = addr[2];
				address.line3 	   = '';
				address.city 	   = addr[3];
				address.region 	   = addr[4];
				address.postalCode = addr[5];
				address.country    = addr[6];
			}
			else if(addressType == 'pointoforderoriginaddress'){
				address.line1 	   = addr[8];
				address.line2 	   = addr[9];
				address.line3 	   = '';
				address.city 	   = addr[10];
				address.region 	   = addr[11];
				address.postalCode = addr[12];
				address.country    = addr[13];
			}
			else if(addressType == 'importaddress'){
				address.line1 	   = addr[15];
				address.line2 	   = addr[16];
				address.line3 	   = '';
				address.city 	   = addr[17];
				address.region 	   = addr[18];
				address.postalCode = addr[19];
				address.country    = addr[20];
			}
			else{
				address.line1 	   = (AVA_ShipToAddress[1] != null ? AVA_ShipToAddress[1] : '');
				address.line2 	   = (AVA_ShipToAddress[2] != null ? AVA_ShipToAddress[2] : '');
				address.line3 	   = '';
				address.city 	   = (AVA_ShipToAddress[4] != null ? AVA_ShipToAddress[4] : '');
				address.region 	   = (AVA_ShipToAddress[5] != null ? AVA_ShipToAddress[5] : '');
				address.postalCode = (AVA_ShipToAddress[6] != null ? AVA_ShipToAddress[6] : '');
				address.country	   = (AVA_ShipToAddress[7] != null ? AVA_ShipToAddress[7] : '');
				address.latitude   = AVA_ShipToAddress[8];
				address.longitude  = AVA_ShipToAddress[9];
			}
			
			return address;
		}
		
		function AVA_GetVatAddresses(transactionRecord){
			var vatAddresses = new Array();
			
			var searchRecord = search.create({
				type: 'customrecord_vataddresses',
				filters: ['custrecord_ava_vatcustomerinternalid', 'equalto', transactionRecord.getValue('entity')],
				columns: ['custrecord_ava_gsrenderedflag', 'custrecord_ava_gosaddr1', 'custrecord_ava_gosaddr2', 'custrecord_ava_goscity', 'custrecord_ava_gosstate', 'custrecord_ava_goszip', 'custrecord_ava_goscountry', 'custrecord_ava_originflag', 'custrecord_ava_originaddr1', 'custrecord_ava_originaddr2', 'custrecord_ava_origincity', 'custrecord_ava_originstate', 'custrecord_ava_originzip', 'custrecord_ava_origincountry' ,'custrecord_ava_importflag', 'custrecord_ava_importaddr1', 'custrecord_ava_importaddr2', 'custrecord_ava_importcity', 'custrecord_ava_importstate', 'custrecord_ava_importzip', 'custrecord_ava_importcountry']
			});
			
			var customerSearchResult = searchRecord.run();
			customerSearchResult = customerSearchResult.getRange({
				start: 0,
				end: 1000
			});
			
			for(var i = 0; customerSearchResult != null && i < customerSearchResult.length; i++){
				vatAddresses[0] = customerSearchResult[i].getValue('custrecord_ava_gsrenderedflag');
				vatAddresses[1] = (customerSearchResult[i].getValue('custrecord_ava_gosaddr1') != null && customerSearchResult[i].getValue('custrecord_ava_gosaddr1').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_gosaddr1').substring(0, 50) : '';
				vatAddresses[2] = (customerSearchResult[i].getValue('custrecord_ava_gosaddr2') != null && customerSearchResult[i].getValue('custrecord_ava_gosaddr2').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_gosaddr2').substring(0, 100) : '';
				vatAddresses[3] = (customerSearchResult[i].getValue('custrecord_ava_goscity') != null && customerSearchResult[i].getValue('custrecord_ava_goscity').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_goscity').substring(0, 50) : '';
				vatAddresses[4] = (customerSearchResult[i].getValue('custrecord_ava_gosstate') != null && customerSearchResult[i].getValue('custrecord_ava_gosstate').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_gosstate') : '';
				vatAddresses[5] = (customerSearchResult[i].getValue('custrecord_ava_goszip') != null && customerSearchResult[i].getValue('custrecord_ava_goszip').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_goszip').substring(0, 11) : '';
				returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (customerSearchResult[i].getValue('custrecord_ava_goscountry') != null && customerSearchResult[i].getValue('custrecord_ava_goscountry').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_goscountry') : '');
				vatAddresses[6] = returnCountryName[1];
				
				vatAddresses[7] = customerSearchResult[i].getValue('custrecord_ava_originflag');
				vatAddresses[8] = (customerSearchResult[i].getValue('custrecord_ava_originaddr1') != null && customerSearchResult[i].getValue('custrecord_ava_originaddr1').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_originaddr1').substring(0, 50) : '';
				vatAddresses[9] = (customerSearchResult[i].getValue('custrecord_ava_originaddr2') != null && customerSearchResult[i].getValue('custrecord_ava_originaddr2').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_originaddr2').substring(0, 100) : '';
				vatAddresses[10] = (customerSearchResult[i].getValue('custrecord_ava_origincity') != null && customerSearchResult[i].getValue('custrecord_ava_origincity').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_origincity').substring(0, 50) : '';
				vatAddresses[11] = (customerSearchResult[i].getValue('custrecord_ava_originstate') != null && customerSearchResult[i].getValue('custrecord_ava_originstate').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_originstate') : '';
				vatAddresses[12] = (customerSearchResult[i].getValue('custrecord_ava_originzip') != null && customerSearchResult[i].getValue('custrecord_ava_originzip').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_originzip').substring(0, 11) : '';
				returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (customerSearchResult[i].getValue('custrecord_ava_origincountry') != null && customerSearchResult[i].getValue('custrecord_ava_origincountry').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_origincountry') : '');
				vatAddresses[13] = returnCountryName[1];
				
				vatAddresses[14] = customerSearchResult[i].getValue('custrecord_ava_importflag');
				vatAddresses[15] = (customerSearchResult[i].getValue('custrecord_ava_importaddr1') != null && customerSearchResult[i].getValue('custrecord_ava_importaddr1').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_importaddr1').substring(0, 50) : '';
				vatAddresses[16] = (customerSearchResult[i].getValue('custrecord_ava_importaddr2') != null && customerSearchResult[i].getValue('custrecord_ava_importaddr2').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_importaddr2').substring(0, 100) : '';
				vatAddresses[17] = (customerSearchResult[i].getValue('custrecord_ava_importcity') != null && customerSearchResult[i].getValue('custrecord_ava_importcity').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_importcity').substring(0, 50) : '';
				vatAddresses[18] = (customerSearchResult[i].getValue('custrecord_ava_importstate') != null && customerSearchResult[i].getValue('custrecord_ava_importstate').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_importstate') : '';
				vatAddresses[19] = (customerSearchResult[i].getValue('custrecord_ava_importzip') != null && customerSearchResult[i].getValue('custrecord_ava_importzip').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_importzip').substring(0, 11) : '';
				returnCountryName = ava_library.mainFunction('AVA_CheckCountryName', (customerSearchResult[i].getValue('custrecord_ava_importcountry') != null && customerSearchResult[i].getValue('custrecord_ava_importcountry').length > 0) ? customerSearchResult[i].getValue('custrecord_ava_importcountry') : '');
				vatAddresses[20] = returnCountryName[1];
				
				//add address to vat address field
				transactionRecord.setValue({
					fieldId: 'custpage_ava_vataddresses',
					value: JSON.stringify(vatAddresses)
				});
			}
			
			return vatAddresses;
		}
		
		function AVA_GetDiscountSoap(transactionRecord, configCache, soapLine, discountField, amountField, multiplier){
			var taxLine = Transaction.getNewTransactionLine();
			taxLine.number = parseInt(soapLine);
			
			if(AVA_LocationPOS == 1){
				if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
					if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
						taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headerlocation');
					}
					else{
						taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
					}
				}
				else{
					taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
				}
			}
			else{
				if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
					if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
						taxLine.addresses.ShipFrom = AVA_GetAddressDetails('headerlocation');
					}
					else{
						taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
					}
				}
				else{
					taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
				}
				
				taxLine.addresses.ShipTo = AVA_GetAddressDetails('headershipto');
			}
			
			taxLine.itemCode = transactionRecord.getValue(discountField);
			
			if(configCache.AVA_DiscountTaxCode != null && configCache.AVA_DiscountTaxCode.length > 0){
				taxLine.taxCode = configCache.AVA_DiscountTaxCode;
			}
			
			taxLine.quantity = 1;
			taxLine.amount = parseFloat(transactionRecord.getValue(amountField)) * multiplier;
			taxLine.discounted = 0;
			
			Transaction.Lines.push(taxLine);
		}
		
		function AVA_MultiShipHandlingLines(transactionRecord, configCache, lineNo, shipGroupTaxcode, multiplier){
			var locat, dest, locPOS = 0, sourceAddr, destAddr;
			var taxLine = Transaction.getNewTransactionLine();
			
			taxLine.number = parseInt(lineNo);
			
			var taxCodestatus = AVA_IdentifyTaxCode(shipGroupTaxcode[2], transactionRecord.getValue('custpage_ava_deftax'));
			
			if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
				sourceAddr = AVA_CreateFromRecord.getSublistValue('shipgroup', 'sourceaddressref', shipGroupTaxcode[0]);//Gets current shipgroup's line source address id
				destAddr = AVA_CreateFromRecord.getSublistValue('shipgroup', 'destinationaddressref', shipGroupTaxcode[0]);//Gets current shipgroup's line dest address id
			}
			else{
				sourceAddr = transactionRecord.getSublistValue('shipgroup', 'sourceaddressref', shipGroupTaxcode[0]);//Gets current shipgroup's line source address id
				destAddr = transactionRecord.getSublistValue('shipgroup', 'destinationaddressref', shipGroupTaxcode[0]);//Gets current shipgroup's line dest address id
			}

			if((transactionRecord.getValue('custpage_ava_lineloc') == true || transactionRecord.getValue('custpage_ava_lineloc') == 'T')){
				if(taxCodestatus == 0 || taxCodestatus == 2){
					for(var i = 0; AVA_LocationArray != null && i < AVA_LocationArray.length; i++){
						if(AVA_LocationArray[i][0] == sourceAddr){
							locat = AVA_LocationArray[i][1][0];
							
							if((transactionRecord.type == 'creditmemo' || transactionRecord.type == 'cashrefund' || transactionRecord.type == 'returnauthorization') && transactionRecord.getValue('createdfrom') != null && transactionRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
								if(locat != null && locat.length > 0 && AVA_LocationArray[i][1][8] == true){
									locPOS = 1;
								}
							}
							else{
								if(locat != null && locat.length > 0 && AVA_PickUpFlag[i] == true)
								{
									locPOS = 1;
								}
							}
							
							break;
						}
					}
				}
			}
			
			if(AVA_LocationPOS == 1 || locPOS == 1 || taxCodestatus == 2){
				if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
					if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
						taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headerlocation');
					}
					else{
						taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
					}
				}
				else{
					locat = 0;
					
					for(var i = 0; AVA_LocationArray != null && i < AVA_LocationArray.length; i++){
						if(AVA_LocationArray[i][0] == sourceAddr){
							if(AVA_LocationArray[i][1][0] != null && AVA_LocationArray[i][1][0].length > 0){
								taxLine.addresses.SingleLocation = AVA_GetAddressDetails('linelocation', AVA_LocationArray[i][1]);
							}
							else{
								taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
							}
							
							locat = 1;
							break;
						}
					}
					
					if(locat == 0){
						taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
					}
				}
			}
			else{
				if(taxCodestatus == 0){
					if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
						if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
							taxLine.addresses.ShipFrom = AVA_GetAddressDetails('headerlocation');
						}
						else{
							taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
						}
					}
					else{
						locat = 0;
						for(var i = 0; AVA_LocationArray != null && i < AVA_LocationArray.length; i++){
							if(AVA_LocationArray[i][0] == sourceAddr){
								if(AVA_LocationArray[i][1][0] != null && AVA_LocationArray[i][1][0].length > 0){
									taxLine.addresses.ShipFrom = AVA_GetAddressDetails('linelocation', AVA_LocationArray[i][1]);
								}
								else{
									taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
								}
								
								locat = 1;
								break;
							}
						}
						
						if(locat == 0){
							taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
						}
					}
					
					dest = 0;
					
					for(var i = 0; AVA_MultiShipAddArray != null && i < AVA_MultiShipAddArray.length; i++){
						if(AVA_MultiShipAddArray[i][0] == destAddr){
							var ShipTo = new AvaTax.address();
							
							ShipTo.line1 	  = (AVA_MultiShipAddArray[i][1][1] != null ? AVA_MultiShipAddArray[i][1][1] : '');
							ShipTo.line2 	  = (AVA_MultiShipAddArray[i][1][2] != null ? AVA_MultiShipAddArray[i][1][2] : '');
							ShipTo.line3 	  = '';
							ShipTo.city 	  = (AVA_MultiShipAddArray[i][1][4] != null ? AVA_MultiShipAddArray[i][1][4] : '');
							ShipTo.region 	  = (AVA_MultiShipAddArray[i][1][5] != null ? AVA_MultiShipAddArray[i][1][5] : '');
							ShipTo.postalCode = (AVA_MultiShipAddArray[i][1][6] != null ? AVA_MultiShipAddArray[i][1][6] : '');
							ShipTo.country	  = (AVA_MultiShipAddArray[i][1][7] != null ? AVA_MultiShipAddArray[i][1][7] : '');
							ShipTo.latitude	  = AVA_MultiShipAddArray[i][1][8];
							ShipTo.longitude  = AVA_MultiShipAddArray[i][1][9];
							
							taxLine.addresses.ShipTo = ShipTo;
							dest = 1;
							break;
						}
					}
					
					if(dest == 0){
						taxLine.addresses.ShipTo = AVA_GetAddressDetails('headershipto');
					}
				}
				else if(taxCodestatus == 1){
					dest = 0;
					
					for(var i = 0; AVA_MultiShipAddArray != null && i < AVA_MultiShipAddArray.length; i++){
						if(AVA_MultiShipAddArray[i][0] == destAddr){
							var SingleLocation = new AvaTax.address();
							
							SingleLocation.line1 	  = (AVA_MultiShipAddArray[i][1][1] != null ? AVA_MultiShipAddArray[i][1][1] : '');
							SingleLocation.line2 	  = (AVA_MultiShipAddArray[i][1][2] != null ? AVA_MultiShipAddArray[i][1][2] : '');
							SingleLocation.line3 	  = '';
							SingleLocation.city 	  = (AVA_MultiShipAddArray[i][1][4] != null ? AVA_MultiShipAddArray[i][1][4] : '');
							SingleLocation.region 	  = (AVA_MultiShipAddArray[i][1][5] != null ? AVA_MultiShipAddArray[i][1][5] : '');
							SingleLocation.postalCode = (AVA_MultiShipAddArray[i][1][6] != null ? AVA_MultiShipAddArray[i][1][6] : '');
							SingleLocation.country	  = (AVA_MultiShipAddArray[i][1][7] != null ? AVA_MultiShipAddArray[i][1][7] : '');
							SingleLocation.latitude	  = AVA_MultiShipAddArray[i][1][8];
							SingleLocation.longitude  = AVA_MultiShipAddArray[i][1][9];
							
							taxLine.addresses.SingleLocation = SingleLocation;
							dest = 1;
							break;
						}
					}

					if(dest == 0){
						taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headershipto');
					}
				}
			}
			
			if(shipGroupTaxcode[3] == 'FREIGHT'){
				if(shipGroupTaxcode[0] != null && shipGroupTaxcode[0].length > 0){
					taxLine.itemCode = transactionRecord.getSublistValue('shipgroup', 'shippingmethod', shipGroupTaxcode[0]).substring(0, 50);
				}
				else{
					taxLine.itemCode = 'FREIGHT';
				}
				
				AVA_ShipCode = 'T';
				
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
					if(transactionRecord.getValue('custbody_avashippingcode') == null || (transactionRecord.getValue('custbody_avashippingcode') != null && transactionRecord.getValue('custbody_avashippingcode').length == 0)){
						taxLine.taxCode = (configCache.AVA_DefaultShippingCode != null && configCache.AVA_DefaultShippingCode.length > 0) ? configCache.AVA_DefaultShippingCode.substring(0, 25) : '';
					}
					else{
						taxLine.taxCode = (transactionRecord.getValue('custbody_avashippingcodetext') != null) ? transactionRecord.getValue('custbody_avashippingcodetext').substring(0, 25) : '';
					}
				}
				else{
					if(transactionRecord.getValue('custbody_avashippingcode') == null || (transactionRecord.getValue('custbody_avashippingcode') != null && transactionRecord.getValue('custbody_avashippingcode').length == 0)){
						taxLine.taxCode = (configCache.AVA_DefaultShippingCode != null && configCache.AVA_DefaultShippingCode.length > 0) ? configCache.AVA_DefaultShippingCode.substring(0, 25) : '';
						ShippingCode = configCache.AVA_DefaultShippingCode;
					}
					else{
						var shipcode = search.lookupFields({
							type: 'customrecord_avashippingcodes',
							id: transactionRecord.getValue('custbody_avashippingcode'),
							columns: 'custrecord_ava_shippingcode'
						});
						ShippingCode = shipcode.custrecord_ava_shippingcode;
						taxLine.taxCode = (ShippingCode != null && ShippingCode.length > 0) ? ShippingCode.substring(0, 25) : '';
					}
				}
			}
			else{
				if(shipGroupTaxcode[0] != null && shipGroupTaxcode[0].length > 0){
					taxLine.itemCode = transactionRecord.getSublistValue('shipgroup', 'shippingmethod', shipGroupTaxcode[0]).substring(0, 50);
				}
				else{
					taxLine.itemCode = 'MISCELLANEOUS';
				}
				
				AVA_HandlingCode = 'T';
			}
			
			taxLine.quantity = 1;
			
			if(shipGroupTaxcode[3] == 'FREIGHT'){
				var amount;
				if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue('item', 'custcol_ava_shippingamount', ShipLineCount) != null && transactionRecord.getSublistValue('item', 'custcol_ava_shippingamount', ShipLineCount).toString().length > 0){
					if(parseFloat(transactionRecord.getSublistValue('item', 'custcol_ava_shippingamount1', ShipLineCount)) != parseFloat(transactionRecord.getSublistValue('shipgroup', 'shippingrate', shipGroupTaxcode[0]))){
						amount = (transactionRecord.getSublistValue('shipgroup', 'shippingrate', shipGroupTaxcode[0]) * multiplier);
					}
					else{
						amount = (transactionRecord.getSublistValue('item', 'custcol_ava_shippingamount', ShipLineCount) * multiplier);
					}
				}
				else{
					amount = (transactionRecord.getSublistValue('shipgroup', 'shippingrate', shipGroupTaxcode[0]) * multiplier);
				}
				
				ShipLineCount++;
				AVA_ShippingAmt[AVA_ShippingAmt.length] = amount;
			}
			else{
				var amount;
				ShipLineCount--;
				if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getSublistValue('item', 'custcol_ava_handlingamount', ShipLineCount) != null && transactionRecord.getSublistValue('item', 'custcol_ava_handlingamount', ShipLineCount).toString().length > 0){
					if(parseFloat(transactionRecord.getSublistValue('item', 'custcol_ava_handlingamount1', ShipLineCount)) != parseFloat(transactionRecord.getSublistValue('shipgroup', 'handlingrate', shipGroupTaxcode[0]))){
						amount = (transactionRecord.getSublistValue('shipgroup', 'handlingrate', shipGroupTaxcode[0]) * multiplier);
					}
					else{
						amount = (transactionRecord.getSublistValue('item', 'custcol_ava_handlingamount', ShipLineCount) * multiplier);
					}
				}
				else{
					amount = (transactionRecord.getSublistValue('shipgroup', 'handlingrate', shipGroupTaxcode[0]) * multiplier);
				}
				
				ShipLineCount++;
				AVA_HandlingAmt[AVA_HandlingAmt.length] = amount;
			}
			
			taxLine.amount = amount;
			taxLine.discounted = 0;
			
			if(configCache.AVA_EntityUseCode == true){ // Pass Entity Use Code for Shipping & Handling Lines
				taxLine.entityUseCode = (shipGroupTaxcode[4] != null && shipGroupTaxcode[4].length > 0) ? shipGroupTaxcode[4].substring(0, 25) : '';
			}
			
			taxLine.description = (shipGroupTaxcode[3] != null) ? shipGroupTaxcode[3].substring(0, 2048) : '';
			
			if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
				taxLine.taxIncluded = 1;
			}
			
			Transaction.Lines.push(taxLine);
		}
		
		function AVA_GetShipAndHandling(transactionRecord, configCache, lineNo, itemCode, multiplier){
			var taxCodestatus;
			var fieldName = (itemCode == 'FREIGHT') ? 'custpage_ava_shiptaxcode' : 'custpage_ava_handlingtaxcode';
			var taxLine = Transaction.getNewTransactionLine();
			
			taxLine.number = parseInt(lineNo);
			
			if(transactionRecord.getValue('taxitem') != null){
				taxCodestatus = AVA_IdentifyTaxCode(transactionRecord.getValue('custpage_ava_formtaxcode'), transactionRecord.getValue('custpage_ava_deftax'));
			}
			else{
				taxCodestatus = AVA_IdentifyTaxCode(transactionRecord.getValue(fieldName), transactionRecord.getValue('custpage_ava_deftax'));
			}
			
			if(AVA_LocationPOS == 1 || taxCodestatus == 2){
				if(configCache.AVA_DisableLocationCode == true){
					taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
				}
				else{
					if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
						if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
							taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headerlocation');
						}
						else{
							taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
						}
					}
					else{
						if(transactionRecord.getValue('location') != null && transactionRecord.getValue('location').length > 0){
							AVA_HeaderLocation = AVA_GetAddresses(transactionRecord, configCache, transactionRecord.getValue('location'), 2);
							taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headerlocation');
						}
						else{
							taxLine.addresses.SingleLocation = AVA_GetAddressDetails('default');
						}
					}
				}
			}
			else{
				if(taxCodestatus == 0){
					if(configCache.AVA_DisableLocationCode == true){
						taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
					}
					else{
						if((transactionRecord.getValue('custpage_ava_lineloc') == false || transactionRecord.getValue('custpage_ava_lineloc') == 'F')){
							if(AVA_HeaderLocation != null && AVA_HeaderLocation.length > 0){
								taxLine.addresses.ShipFrom = AVA_GetAddressDetails('headerlocation');
							}
							else{
								taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
							}
						}
						else{
							if(transactionRecord.getValue('location') != null && transactionRecord.getValue('location').length > 0){
								AVA_HeaderLocation = AVA_GetAddresses(transactionRecord, configCache, transactionRecord.getValue('location'), 2);
								taxLine.addresses.ShipFrom = AVA_GetAddressDetails('headerlocation');
							}
							else{
								taxLine.addresses.ShipFrom = AVA_GetAddressDetails('default');
							}
						}
					}
					
					taxLine.addresses.ShipTo = AVA_GetAddressDetails('headershipto');
				}
				else if(taxCodestatus == 1){
					taxLine.addresses.SingleLocation = AVA_GetAddressDetails('headershipto');
				}
			}
			
			if(itemCode == 'FREIGHT'){
				AVA_ShipCode = 'T';
				taxLine.itemCode = 'FREIGHT';
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
					if(transactionRecord.getValue('custbody_avashippingcode') == null || (transactionRecord.getValue('custbody_avashippingcode') != null && transactionRecord.getValue('custbody_avashippingcode').length == 0)){
						taxLine.taxCode = (configCache.AVA_DefaultShippingCode != null && configCache.AVA_DefaultShippingCode.length > 0) ? configCache.AVA_DefaultShippingCode.substring(0, 25) : '';
					}
					else{
						taxLine.taxCode = (transactionRecord.getValue('custbody_avashippingcodetext') != null ? transactionRecord.getValue('custbody_avashippingcodetext').substring(0, 25) : '');
					}
				}
				else{
					if(transactionRecord.getValue('custbody_avashippingcode') == null || (transactionRecord.getValue('custbody_avashippingcode') != null && transactionRecord.getValue('custbody_avashippingcode').length == 0)){
						taxLine.taxCode = (configCache.AVA_DefaultShippingCode != null && configCache.AVA_DefaultShippingCode.length > 0) ? configCache.AVA_DefaultShippingCode.substring(0, 25) : '';
						ShippingCode = configCache.AVA_DefaultShippingCode;
					}
					else{
						var shipcode = search.lookupFields({
							type: 'customrecord_avashippingcodes',
							id: transactionRecord.getValue('custbody_avashippingcode'),
							columns: 'custrecord_ava_shippingcode'
						});
						ShippingCode = shipcode.custrecord_ava_shippingcode;
						taxLine.taxCode = (ShippingCode != null && ShippingCode.length > 0) ? ShippingCode.substring(0, 25) : '';
					}
				}
			}
			else{
				AVA_HandlingCode = 'T';
				taxLine.itemCode = (itemCode != null) ? itemCode.substring(0, 50) : '';
			}
			
			taxLine.quantity = 1;
			
			var amount;
			if(itemCode == 'FREIGHT'){
				if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getValue('custbody_ava_shippingtaxinclude') != null && transactionRecord.getValue('custbody_ava_shippingtaxinclude') == true && transactionRecord.getValue('custbody_ava_shippingamount') != null && transactionRecord.getValue('custbody_ava_shippingamount').toString().length > 0){
					if(parseFloat(transactionRecord.getValue('custbody_ava_shippingamount1')) != parseFloat(transactionRecord.getValue('shippingcost'))){
						amount = (transactionRecord.getValue('shippingcost') * multiplier);
					}
					else{
						amount = (transactionRecord.getValue('custbody_ava_shippingamount') * multiplier);
					}
				}
				else{
					amount = (transactionRecord.getValue('shippingcost') * multiplier);
				}
				
				AVA_ShippingAmt = amount;
			}
			else{
				if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getValue('custbody_ava_shippingtaxinclude') != null && transactionRecord.getValue('custbody_ava_shippingtaxinclude') == true && transactionRecord.getValue('custbody_ava_handlingamount') != null && transactionRecord.getValue('custbody_ava_handlingamount').toString().length > 0){
					if(parseFloat(transactionRecord.getValue('custbody_ava_handlingamount1')) != parseFloat(transactionRecord.getValue('handlingcost'))){
						amount = (transactionRecord.getValue('handlingcost') * multiplier);
					}
					else{
						amount = (transactionRecord.getValue('custbody_ava_handlingamount') * multiplier);
					}
				}
				else{
					amount = (transactionRecord.getValue('handlingcost') * multiplier);
				}
				
				AVA_HandlingAmt = amount;
			}
			
			taxLine.amount = amount;
			taxLine.discounted = 0;

			if(configCache.AVA_EntityUseCode == true){
				// When there is only one shipping/billing address, fetching the entitymap for that address only once
				var entityMapHeader = '';
				if(transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false){
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
						if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
							entityMapHeader = (transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25) : '';
						}
						else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
							entityMapHeader = (transactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25) : '';
						}
					}
					else{
						if(transactionRecord.getValue('custpage_ava_usecodeusuage') != null && (transactionRecord.getValue('custpage_ava_usecodeusuage') == true || transactionRecord.getValue('custpage_ava_usecodeusuage') == 'T') && transactionRecord.getValue('custpage_ava_context') == 'USERINTERFACE'){
							//extract values from client side since its set
							if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
								entityMapHeader = (transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25) : '';
							}
							else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
								entityMapHeader = (transactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0) ? transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25) : '';
							}
						}
						else{
							//Existing logic for server side processing only.
							if((transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist').length > 0) || (transactionRecord.getValue('shipaddress') != null && transactionRecord.getValue('shipaddress').length > 0)){
								if(transactionRecord.getValue('custbody_ava_shiptousecode') != null && transactionRecord.getValue('custbody_ava_shiptousecode').length > 0 && transactionRecord.getValue('custbody_ava_shiptousecode') != ' '){
									if(transactionRecord.getValue('custbody_ava_shiptousecodetext') != null && transactionRecord.getValue('custbody_ava_shiptousecodetext').length > 0){
										entityMapHeader = transactionRecord.getValue('custbody_ava_shiptousecodetext').substring(0, 25);
									}
									else{
										var entityUseCode = search.lookupFields({
											type: 'customrecord_avaentityusecodes',
											id: transactionRecord.getValue('custbody_ava_shiptousecode'),
											columns: 'custrecord_ava_entityid'
										});
										entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
									}
								}
								else if(transactionRecord.getValue('shipaddresslist') != null && transactionRecord.getValue('shipaddresslist') > 0){
									entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getValue('shipaddresslist'));
								}
							}
							else if((transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist').length > 0) || (transactionRecord.getValue('billaddress') != null && transactionRecord.getValue('billaddress').length > 0)){
								if(transactionRecord.getValue('custbody_ava_billtousecode') != null && transactionRecord.getValue('custbody_ava_billtousecode').length > 0 && transactionRecord.getValue('custbody_ava_billtousecode') != ' '){
									if(ransactionRecord.getValue('custbody_ava_billtousecodetext') != null && transactionRecord.getValue('custbody_ava_billtousecodetext').length > 0){
										entityMapHeader = transactionRecord.getValue('custbody_ava_billtousecodetext').substring(0, 25);
									}
									else{
										var entityUseCode = search.lookupFields({
											type: 'customrecord_avaentityusecodes',
											id: transactionRecord.getValue('custbody_ava_billtousecode'),
											columns: 'custrecord_ava_entityid'
										});
										entityMapHeader = (entityUseCode.custrecord_ava_entityid != null && entityUseCode.custrecord_ava_entityid.length > 0) ? entityUseCode.custrecord_ava_entityid.substring(0, 25) : '';
									}
								}
								else if(transactionRecord.getValue('billaddresslist') != null && transactionRecord.getValue('billaddresslist') > 0){
									entityMapHeader = AVA_GetEntityUseCodes(transactionRecord.getValue('custpage_ava_context'), transactionRecord.getValue('entity'), transactionRecord.getValue('billaddresslist'));
								}
							}
						}
					}
				}
				
				if(entityMapHeader != null && entityMapHeader.length > 0){
					taxLine.entityUseCode = entityMapHeader;
				}
			}
			
			taxLine.description = (itemCode != null) ? itemCode.substring(0, 2048) : '';
			
			if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getValue('custbody_ava_shippingtaxinclude') != null && transactionRecord.getValue('custbody_ava_shippingtaxinclude') == true){
				taxLine.taxIncluded = 1;
			}
			
			Transaction.Lines.push(taxLine);
		}
		
		function AVA_ReadResponse(transactionRecord, configCache, response, avaDocType, startTime){
			var getTaxResult = JSON.parse(response.body);
			
			if(getTaxResult.error == null){
				AVA_ResultCode = 'Success';
				
				AVA_DocID          = getTaxResult.id;
				AVA_DocCode        = getTaxResult.code;
				AVA_DocDate        = getTaxResult.date;
				AVA_DocumentType   = getTaxResult.type;
				AVA_DocStatus      = getTaxResult.status;
				AVA_TaxDate        = getTaxResult.taxDate;
				AVA_TotalAmount    = getTaxResult.totalAmount;
				AVA_TotalDiscount  = getTaxResult.totalDiscount;
				AVA_TotalExemption = getTaxResult.totalExempt;
				AVA_TotalTaxable   = getTaxResult.totalTaxable;
				AVA_TotalTax       = getTaxResult.totalTax;
				
				AVA_LandedCost = 0;
				var landedCostMsg = '';
				var messages = getTaxResult.messages;
				var summary = getTaxResult.summary;
				var multiplier = (avaDocType == 'SalesInvoice') ? 1 : -1;
				
				for(var i= 0; messages != null && i < messages.length; i++){
					if(messages[i].refersTo == 'LandedCost' || messages[i].refersTo == 'VAT'){
						landedCostMsg += messages[i].summary + '\n';
					}
				}
				
				if(landedCostMsg != null && landedCostMsg.length > 0){
					alert(landedCostMsg);
				}
				
				for(var i = 0; summary != null && i < summary.length; i++){
					if(summary[i].taxType == 'LandedCost'){
						AVA_LandedCost = summary[i].tax;
						break;
					}
				}
				
				transactionRecord.setValue({
					fieldId: 'custbody_ava_customduty',
					value: (AVA_LandedCost * multiplier),
					ignoreFieldChange: true
				});
				
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 3){
					var success = AVA_SetTaxFlagsOnServer(transactionRecord, configCache, getTaxResult, avaDocType);
					
					if(success == false){
						return false;
					}
					
					// Fix for CONNECT-3641
					if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('tax2total') != null && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0 && (transactionRecord.getValue('discounttotal') != null && parseFloat(transactionRecord.getValue('discounttotal')) != 0)){
						AVA_GetCanadianResponseDetails(getTaxResult);
					}
					
					if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK'){
						transactionRecord.setValue({
							fieldId: 'custbody_avalara_status',
							value: 1,
							ignoreFieldChange: true
						});
					}
					else{
						transactionRecord.setValue({
							fieldId: 'custbody_avalara_status',
							value: 2,
							ignoreFieldChange: true
						});
						transactionRecord.setValue({
							fieldId: 'custbody_ava_scis_trans_flag',
							value: false,
							ignoreFieldChange: true
						});
					}
				}
				else{
					if(transactionRecord.getValue('tax2total') != null){
						AVA_GetCanadianResponseDetails(getTaxResult);
					}
				}
				
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 1){
					AVA_SetDocTotal(transactionRecord, configCache, avaDocType, getTaxResult);
				}
				
				AVA_LogTaxResponse(transactionRecord, configCache, 'T', response, startTime);
				return true;
			}
			else{
				var severity, message;
				var errorDetails = getTaxResult.error.details;
				
				for(var i = 0; errorDetails != null && i < errorDetails.length; i++){
					message = errorDetails[i].message;
					severity = errorDetails[i].severity;
					break;
				}
				
				if(severity == null || severity == '' || severity == 'Error'){
					AVA_TotalTax = 0;
					AVA_LandedCost = 0;
					
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && (configCache.AVA_ShowMessages == 2 || configCache.AVA_ShowMessages == 3)){
						AVA_ErrorCode = message;
						alert("This Document has used AvaTax Services. " + message);
					}
					else{
						AVA_ErrorCode = message;
						log.debug({
							title: 'Error Message',
							details: message
						});
						log.debug({
							title: 'Error',
							details: response.code
						});
					}
					
					if(message != null && message.search('locked') != -1){
						var multiplier = (avaDocType == 'SalesInvoice') ? 1 : -1;
						
						AVA_TotalTax = transactionRecord.getValue('custpage_ava_totaltax') * multiplier;
						
						if(transactionRecord.getValue('tax2total') != null){
							AVA_GSTTotal = transactionRecord.getValue('custpage_ava_gsttax') * multiplier;
							AVA_PSTTotal = transactionRecord.getValue('custpage_ava_psttax') * multiplier;
						}
					}
					
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 1){
						AVA_SetDocTotal(transactionRecord, configCache, avaDocType);
					}
					
					if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK'){
						transactionRecord.setValue({
							fieldId: 'custbody_avalara_status',
							value: 3,
							ignoreFieldChange: true
						});
					}
					
					transactionRecord.setValue({
						fieldId: 'custbody_ava_invoicemessage',
						value: '',
						ignoreFieldChange: true
					});
					
					return false;
				}
				else if(severity == 'Exception'){
					if(configCache.AVA_EnableLogEntries == '1'){
						var avaDocType = AVA_RecordType(transactionRecord.type);
						ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + transactionRecord.id + '~~' + '' + '~~' + '' + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Debug' + '~~' + 'Error' + '~~' + transactionRecord.type + '~~' + 'AVA_ReadResponse' + '~~' + 'GetTax Exeception - ' + message + '~~' + '' + '~~' + 0 + '~~' + transactionRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + transactionRecord.getValue('custpage_ava_details')));
					}
					
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && (configCache.AVA_ShowMessages == 2 || configCache.AVA_ShowMessages == 3)){
						AVA_ErrorCode = message;
						alert("This Document has used AvaTax Services. " + message);
					}
					else{
						AVA_ErrorCode = message;
						log.debug({
							title: 'Exception',
							details: message
						});
						log.debug({
							title: 'Exception',
							details: response.code
						});
					}
					
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 1){
						AVA_SetDocTotal(transactionRecord, configCache, avaDocType);
					}
					
					if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK'){
						transactionRecord.setValue({
							fieldId: 'custbody_avalara_status',
							value: 3,
							ignoreFieldChange: true
						});
					}
					
					return false;
				}
			}
		}
		
		function AVA_SetTaxFlagsOnServer(transactionRecord, configCache, getTaxResult, avaDocType){
			var invoiceMsg = '';
			var responseLineTax = new Array();
			var defTaxCode = AVA_DefaultTaxCode, defTaxCodeId;
			var showTaxRate, showDecimalPlaces;
			
			showTaxRate = configCache.AVA_TaxRate;
			showDecimalPlaces = configCache.AVA_DecimalPlaces;
			
			var messages = getTaxResult.messages;
			
			for(var i = 0; messages != null && i < messages.length; i++){
				if(messages[i].summary == 'Invoice  Messages for the transaction'){
					var messageInfo = JSON.parse(messages[i].details);
					var masterList = messageInfo.InvoiceMessageMasterList;
					
					for(var j in masterList){
						if(j != 0){
							invoiceMsg += masterList[j].Message + '.\n';
						}
					}
					
					break;
				}
				else if(messages[i].refersTo == 'LandedCost' || messages[i].refersTo == 'VAT'){
					invoiceMsg += messages[i].summary + '\n';
				}
			}
			
			transactionRecord.setValue({
				fieldId: 'custbody_ava_invoicemessage',
				value: invoiceMsg,
				ignoreFieldChange: true
			});
			
			var multiplier = (avaDocType == 'SalesInvoice' || avaDocType == 'SalesOrder') ? 1 : -1;
			defTaxCodeId = transactionRecord.getValue('custpage_ava_deftaxid');
			
			var responseLineArray = getTaxResult.lines;
			
			for(var i = 0; responseLineArray != null && i<responseLineArray.length; i++){
				responseLineTax[i] = (responseLineArray[i].tax != 0 ) ? 'T' : 'F';
			}
			
			var discount;
			if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
				var discountRate = transactionRecord.getValue('discountrate').toString();
				
				if(discountRate != null && discountRate.indexOf('%') != -1){
					var discountPercent = parseFloat(discountRate.substring(0, discountRate.indexOf('%')));
					
					if(discountPercent < 0)
					{
						discountPercent *= -1;
					}
					
					discount = 100 - discountPercent;
				}
			}
			
			if(transactionRecord.getValue('taxitem') != null){
				var taxcode = transactionRecord.getValue('custpage_ava_formtaxcode');
				if(AVA_TotalTax != 0){
					transactionRecord.setValue({
						fieldId: 'istaxable',
						value: true,
						ignoreFieldChange: true
					});
					
					if(AVA_EditionChecked != 2){
						if(taxcode != defTaxCode && taxcode == '-Not Taxable-'){
							transactionRecord.setValue({
								fieldId: 'taxitem',
								value: defTaxCodeId,
								ignoreFieldChange: true
							});
							
							if(transactionRecord.getValue('taxitem') != defTaxCodeId){
								AVA_ErrorCode = 'Unable to flip the Transaction tax code to Configuration tax code.';
								return false;
							}
						}
					}
				}
				
				var totalTaxRate;
				if(showTaxRate == 0){
					//show base rate
					totalTaxRate = (AVA_TotalTaxable != 0) ? parseFloat((AVA_TotalTax / AVA_TotalTaxable) * 100) : 0; 
				}
				else{
					//show net rate
					totalTaxRate = (AVA_TotalAmount != 0) ? parseFloat(AVA_TotalTax * 100) / parseFloat(AVA_TotalAmount) : 0; 
				}
				
				transactionRecord.setValue({
					fieldId: 'taxrate',
					value: totalTaxRate.toFixed(showDecimalPlaces),
					ignoreFieldChange: true
				});
				
				for(var i = 0; AVA_TaxRequestLines != null && i < AVA_TaxRequestLines.length; i++){
					var taxableField = (AVA_TaxRequestLines[i][0] == 'item') ? 'istaxable' : 'taxable';
					
					var currentLine = (transactionRecord.getSublistValue(AVA_TaxRequestLines[i][0], taxableField, parseInt(AVA_TaxRequestLines[i][2])) == true) ? 'T' : 'F';
					
					if(currentLine != responseLineTax[i] && currentLine != 'T'){
						transactionRecord.setSublistValue({
							sublistId: AVA_TaxRequestLines[i][0],
							fieldId: taxableField,
							line: parseInt(AVA_TaxRequestLines[i][2]),
							value: true
						});
					}
					
					if(configCache.AVA_TaxInclude == true && configCache.AVA_EnableDiscount == false && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
						if(transactionRecord.getValue('discountrate') != null && transactionRecord.getValue('discountrate').toString().indexOf('%') != -1){ // Fix for CONNECT-6173
							var lineAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount);
							if(lineAmt != 0){
								lineAmt = (100 * lineAmt) / discount;
								transactionRecord.setSublistValue({
									sublistId: AVA_TaxRequestLines[i][0],
									fieldId: 'amount',
									line: AVA_TaxRequestLines[i][2],
									value: lineAmt.toFixed(showDecimalPlaces) * multiplier
								});
								transactionRecord.setSublistValue({
									sublistId: AVA_TaxRequestLines[i][0],
									fieldId: 'custcol_ava_gross_amount1',
									line: AVA_TaxRequestLines[i][2],
									value: lineAmt.toFixed(showDecimalPlaces) * multiplier
								});
							}
						}
						else{
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'amount',
								line: AVA_TaxRequestLines[i][2],
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount) + parseFloat(responseLineArray[i].discountAmount)).toFixed(showDecimalPlaces) * multiplier
							});
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'custcol_ava_gross_amount1',
								line: AVA_TaxRequestLines[i][2],
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount) + parseFloat(responseLineArray[i].discountAmount)).toFixed(showDecimalPlaces) * multiplier
							});
						}

						transactionRecord.setSublistValue({
							sublistId: AVA_TaxRequestLines[i][0],
							fieldId: 'custcol_ava_gross_amount',
							line: AVA_TaxRequestLines[i][2],
							value: AVA_LineAmount[AVA_TaxRequestLines[i][3]]
						});
					}
				}
				
				if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getValue('custbody_ava_shippingtaxinclude') != null && transactionRecord.getValue('custbody_ava_shippingtaxinclude') == true){
					if(transactionRecord.getValue('shippingcost') != null && parseFloat(transactionRecord.getValue('shippingcost')) > 0){
						transactionRecord.setValue({
							fieldId: 'shippingcost',
							value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier,
							ignoreFieldChange: true
						});
						transactionRecord.setValue({
							fieldId: 'custbody_ava_shippingamount1',
							value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier,
							ignoreFieldChange: true
						});
						transactionRecord.setValue({
							fieldId: 'custbody_ava_shippingamount',
							value: parseFloat(AVA_ShippingAmt) * multiplier,
							ignoreFieldChange: true
						});
						
						if(transactionRecord.getValue('handlingcost') != null && parseFloat(transactionRecord.getValue('handlingcost')) > 0){
							i++;
							transactionRecord.setValue({
								fieldId: 'handlingcost',
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_handlingamount1',
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_handlingamount',
								value: parseFloat(AVA_HandlingAmt) * multiplier,
								ignoreFieldChange: true
							});
						}
					}
				}
			}
			else{
				for(var i = 0; AVA_TaxRequestLines != null && i < AVA_TaxRequestLines.length; i++){
					var taxcode = AVA_TaxcodeArray[AVA_TaxRequestLines[i][3]];
					
					if(transactionRecord.getValue('nexus_country') != 'US' && transactionRecord.getValue('nexus_country') != 'CA' && AVA_EditionChecked != 2){
						var lineTotalAmt, taxAmount;
						
						if(configCache.AVA_TaxInclude == true && configCache.AVA_EnableDiscount == false && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
							var taxrate = 0;
							var details = responseLineArray[i].details;
							
							for(var j = 0; details != null && j < details.length; j++){
								taxrate += details[j].rate;
							}
							
							if(transactionRecord.getValue('discountrate') != null && transactionRecord.getValue('discountrate').toString().indexOf('%') != -1){ // Fix for CONNECT-6173
								lineTotalAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount);
								if(lineTotalAmt != 0){
									lineTotalAmt = (100 * lineTotalAmt) / discount; 
									taxAmount = lineTotalAmt * taxrate.toFixed(showDecimalPlaces);
								}
								else{
									taxAmount = 0;
								}
							}
							else if(parseFloat(transactionRecord.getValue('discounttotal')) != 0.0){ // Update tax amount at line level as per tax rate.
								lineTotalAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount) + parseFloat(responseLineArray[i].discountAmount);
								taxAmount = lineTotalAmt * taxrate.toFixed(showDecimalPlaces);
							}
							else{
								taxAmount = responseLineArray[i].tax;
							}
						}
						else if(parseFloat(transactionRecord.getValue('discounttotal')) != 0.0){ // Update tax amount at line level as per tax rate.
							var taxrate = 0;
							var details = responseLineArray[i].details;
							
							for(var j = 0; details != null && j < details.length; j++){
								taxrate += details[j].rate;
							}
							
							lineTotalAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount) + parseFloat(responseLineArray[i].discountAmount);
							taxAmount = lineTotalAmt * taxrate.toFixed(showDecimalPlaces);
						}
						else{
							taxAmount = responseLineArray[i].tax;
						}
						
						transactionRecord.setSublistValue({
							sublistId: AVA_TaxRequestLines[i][0],
							fieldId: 'tax1amt',
							line: AVA_TaxRequestLines[i][2],
							value: format.parse({
								value: taxAmount * multiplier,
								type: format.Type.CURRENCY
							})
						});
					}
					
					if(transactionRecord.getSublistValue(AVA_TaxRequestLines[i][0], 'amount', AVA_TaxRequestLines[i][2]) == null || transactionRecord.getSublistValue(AVA_TaxRequestLines[i][0], 'amount', AVA_TaxRequestLines[i][2]).length == 0){
						transactionRecord.setSublistValue({
							sublistId: AVA_TaxRequestLines[i][0],
							fieldId: 'amount',
							line: AVA_TaxRequestLines[i][2],
							value: 0
						});
					}
					
					if(taxcode != null && AVA_EditionChecked == 1){
						taxcode = taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + defTaxCode.length + 1);
					}
					
					if(AVA_EditionChecked != 2 && AVA_EditionChecked != 3)
					{
						if(responseLineTax[i] == 'T' && (taxcode != defTaxCode && taxcode == '-Not Taxable-')){
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'taxcode',
								line: AVA_TaxRequestLines[i][2],
								value: defTaxCodeId
							});
							
							if(transactionRecord.getSublistValue(AVA_TaxRequestLines[i][0], 'taxcode', AVA_TaxRequestLines[i][2]) != defTaxCodeId){
								AVA_ErrorCode = 'Unable to flip the tax code of Item at Line: ' + AVA_TaxRequestLines[i][2] + 'in Tab: ' + AVA_TaxRequestLines[i][0] + ' to Configuration tax code.';
								return false;
							}
						}
					}
					
					if(configCache.AVA_TaxInclude == true && configCache.AVA_EnableDiscount == false && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
						if(transactionRecord.getValue('discountrate') != null && transactionRecord.getValue('discountrate').toString().indexOf('%') != -1){
							var lineAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount);
							if(lineAmt != 0){
								lineAmt = (100 * lineAmt) / discount;
								transactionRecord.setSublistValue({
									sublistId: AVA_TaxRequestLines[i][0],
									fieldId: 'amount',
									line: AVA_TaxRequestLines[i][2],
									value: lineAmt.toFixed(showDecimalPlaces) * multiplier
								});
								transactionRecord.setSublistValue({
									sublistId: AVA_TaxRequestLines[i][0],
									fieldId: 'custcol_ava_gross_amount1',
									line: AVA_TaxRequestLines[i][2],
									value: lineAmt.toFixed(showDecimalPlaces) * multiplier
								});
							}
						}
						else{
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'amount',
								line: AVA_TaxRequestLines[i][2],
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount) + parseFloat(responseLineArray[i].discountAmount)).toFixed(showDecimalPlaces) * multiplier
							});
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'custcol_ava_gross_amount1',
								line: AVA_TaxRequestLines[i][2],
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount) + parseFloat(responseLineArray[i].discountAmount)).toFixed(showDecimalPlaces) * multiplier
							});
						}
						
						transactionRecord.setSublistValue({
							sublistId: AVA_TaxRequestLines[i][0],
							fieldId: 'custcol_ava_gross_amount',
							line: AVA_TaxRequestLines[i][2],
							value: AVA_LineAmount[AVA_TaxRequestLines[i][3]]
						});
					}
					
					if(transactionRecord.getValue('tax2total') != null){
						if((responseLineArray[i].tax * multiplier) == 0){
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'taxrate1',
								line: AVA_TaxRequestLines[i][2],
								value: 0
							});
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'taxrate2',
								line: AVA_TaxRequestLines[i][2],
								value: 0
							});
						}
						else{
							var lineTaxRate = 0, lineTaxRate1 = 0;
							var details = responseLineArray[i].details;
							
							for(var j = 0; details != null && j < details.length; j++){
								var taxName1 = details[j].taxName;
								
								if(taxName1.search('GST') != -1){
									if(showTaxRate == 0){
										lineTaxRate = details[j].rate * 100;
									}
									else{
										var lineTotalAmt = parseFloat(details[j].taxableAmount) + parseFloat(details[j].exemptAmount);
										lineTaxRate = (lineTotalAmt != 0) ? parseFloat(details[j].tax * 100) / parseFloat(lineTotalAmt) : 0;
									}
									
									transactionRecord.setSublistValue({
										sublistId: AVA_TaxRequestLines[i][0],
										fieldId: 'taxrate1',
										line: AVA_TaxRequestLines[i][2],
										value: lineTaxRate.toFixed(showDecimalPlaces)
									});
									
									AVA_GSTTotal += parseFloat(details[j].tax);
								}
								else{
									if(taxName1.search('HST') != -1){
										if(showTaxRate == 0){
											lineTaxRate1 = details[j].rate * 100;
										}
										else{
											var lineTotalAmt = parseFloat(details[j].taxableAmount) + parseFloat(details[j].exemptAmount);
											lineTaxRate1 = (lineTotalAmt != 0) ? parseFloat(details[j].tax * 100) / parseFloat(lineTotalAmt) : 0;
										}
										
										transactionRecord.setSublistValue({
											sublistId: AVA_TaxRequestLines[i][0],
											fieldId: 'taxrate1',
											line: AVA_TaxRequestLines[i][2],
											value: (lineTaxRate + lineTaxRate1).toFixed(showDecimalPlaces)
										});
										
										AVA_GSTTotal += parseFloat(details[j].tax);
									}
									else{
										if(showTaxRate == 0){
											lineTaxRate = details[j].rate * 100;
										}
										else{
											var lineTotalAmt = parseFloat(details[j].taxableAmount) + parseFloat(details[j].exemptAmount);
											lineTaxRate = (lineTotalAmt != 0) ? parseFloat(details[j].tax * 100) / parseFloat(lineTotalAmt) : 0;
										}
										
										transactionRecord.setSublistValue({
											sublistId: AVA_TaxRequestLines[i][0],
											fieldId: 'taxrate2',
											line: AVA_TaxRequestLines[i][2],
											value: lineTaxRate.toFixed(showDecimalPlaces)
										});
										
										AVA_PSTTotal += parseFloat(details[j].tax);
									}
								}
								
								if(details[j].taxType == 'LandedCost'){
									transactionRecord.setSublistValue({
										sublistId: AVA_TaxRequestLines[i][0],
										fieldId: 'custcol_ava_customdutyrate',
										line: AVA_TaxRequestLines[i][2],
										value: (details[j].rate * 100)
									});
								}
							}
						}
					}
					else{
						if((responseLineArray[i].tax * multiplier) == 0){
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'taxrate1',
								line: AVA_TaxRequestLines[i][2],
								value: 0
							});
						}
						else if(responseLineTax[i] == 'T'){
							if(showTaxRate == 0){
								//show base rate
								var taxrate = 0;
								var details = responseLineArray[i].details;
								
								if(responseLineArray[i].hsCode != null && responseLineArray[i].hsCode.length > 0){
									transactionRecord.setSublistValue({
										sublistId: AVA_TaxRequestLines[i][0],
										fieldId: 'custcol_ava_hsncode',
										line: AVA_TaxRequestLines[i][2],
										value: responseLineArray[i].hsCode
									});
								}
								
								for(var j = 0; details != null && j < details.length; j++){
									if(details[j].country == 'IN'){
										var uomFlag = 0;
										if(details[j].unitOfBasis == 'PerCurrencyUnit'){
											taxrate += details[j].rate;
											uomFlag = 1;
										}
										
										if(details[j].taxName == 'CGST'){
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_cgstrate',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].rate * 100)
											});
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_cgstamt',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].tax * multiplier)
											});
										}
										else if(details[j].taxName == 'SGST'){
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_sgstrate',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].rate * 100)
											});
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_sgstamt',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].tax * multiplier)
											});
										}
										else if(details[j].taxName == 'IGST'){
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_igstrate',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].rate * 100)
											});
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_igstamt',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].tax * multiplier)
											});
										}
										else if(details[j].taxName == 'UTGST'){
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_utgstrate',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].rate * 100)
											});
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_utgstamt',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].tax * multiplier)
											});
										}
										else if(details[j].taxName == 'COMPENSATION CESS'){
											if(uomFlag == 1){
												transactionRecord.setSublistValue({
													sublistId: AVA_TaxRequestLines[i][0],
													fieldId: 'custcol_ava_compensationcessrate',
													line: AVA_TaxRequestLines[i][2],
													value: (details[j].rate * 100)
												});
											}
											
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_compensationcessamt',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].tax * multiplier)
											});
										}
										else if(details[j].taxName == 'COMPULSORY CESS'){
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_compulsorycessrate',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].rate * 100)
											});
											transactionRecord.setSublistValue({
												sublistId: AVA_TaxRequestLines[i][0],
												fieldId: 'custcol_ava_compulsorycessamt',
												line: AVA_TaxRequestLines[i][2],
												value: (details[j].tax * multiplier)
											});
										}
									}
									else{
										if(details[j].taxType != 'LandedCost'){
											taxrate += details[j].rate;
										}
									}
									
									if(details[j].taxType == 'LandedCost'){
										transactionRecord.setSublistValue({
											sublistId: AVA_TaxRequestLines[i][0],
											fieldId: 'custcol_ava_customdutyrate',
											line: AVA_TaxRequestLines[i][2],
											value: (details[j].rate * 100)
										});
									}
								}
								
								transactionRecord.setSublistValue({
									sublistId: AVA_TaxRequestLines[i][0],
									fieldId: 'taxrate1',
									line: AVA_TaxRequestLines[i][2],
									value: (taxrate * 100).toFixed(showDecimalPlaces)
								});
							}
							else{
								var lineTotalAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount);
								var lineTaxRate = (lineTotalAmt != 0) ? parseFloat(responseLineArray[i].tax * 100) / parseFloat(lineTotalAmt) : 0;
								transactionRecord.setSublistValue({
									sublistId: AVA_TaxRequestLines[i][0],
									fieldId: 'taxrate1',
									line: AVA_TaxRequestLines[i][2],
									value: parseFloat(lineTaxRate).toFixed(showDecimalPlaces)
								});
							}
						}
						
						//for vatcode
						if(AVA_FoundVatCountry == 1 && responseLineArray[i].vatCode != null && responseLineArray[i].vatCode.length > 0){
							transactionRecord.setSublistValue({
								sublistId: AVA_TaxRequestLines[i][0],
								fieldId: 'custcol_ava_vatcode',
								line: AVA_TaxRequestLines[i][2],
								value: responseLineArray[i].vatCode
							});
						}
					}
				}
				
				if((transactionRecord.getValue('ismultishipto') == null || transactionRecord.getValue('ismultishipto') == false) && (AVA_ShipCode == 'T' || AVA_HandlingCode == 'T')){
					// Fix for CONNECT-3641
					if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0 && (transactionRecord.getValue('discounttotal') != null && parseFloat(transactionRecord.getValue('discounttotal')) != 0)){
						i++;
					}
					
					if(transactionRecord.getValue('shippingtaxcode') != null && parseFloat(transactionRecord.getValue('shippingcost')) > 0){
						var taxcode = transactionRecord.getValue('custpage_ava_shiptaxcode');
						
						if(taxcode != null && AVA_EditionChecked == 1){
							taxcode = taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + defTaxCode.length + 1);
						}
						
						if(AVA_EditionChecked != 2 && AVA_EditionChecked != 3){
							if(responseLineTax[i] == 'T' && AVA_ShipCode == 'T' && i < responseLineTax.length && (taxcode != defTaxCode && taxcode == '-Not Taxable-')){
								transactionRecord.setValue({
									fieldId: 'shippingtaxcode',
									value: defTaxCodeId,
									ignoreFieldChange: true
								});
								
								if(transactionRecord.getValue('shippingtaxcode') != defTaxCodeId){
									AVA_ErrorCode = 'Unable to flip the Shipping tax code to Configuration tax code.';
									return false;
								}
							}
						}
						
						if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getValue('custbody_ava_shippingtaxinclude') != null && transactionRecord.getValue('custbody_ava_shippingtaxinclude') == true){
							transactionRecord.setValue({
								fieldId: 'shippingcost',
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_shippingamount1',
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_shippingamount',
								value: parseFloat(AVA_ShippingAmt) * multiplier,
								ignoreFieldChange: true
							});
						}
						
						if(transactionRecord.getValue('tax2total') == null){
							if(responseLineArray[i].tax == 0){
								transactionRecord.setValue({
									fieldId: 'shippingtax1rate',
									value: 0,
									ignoreFieldChange: true
								});
							}
							else{
								if(showTaxRate == 0){
									//show base rate
									var taxrate = 0;
									var details = responseLineArray[i].details;
									
									for(var j = 0; details != null && j < details.length; j++){
										taxrate += details[j].rate;
									}
									
									transactionRecord.setValue({
										fieldId: 'shippingtax1rate',
										value: (taxrate * 100).toFixed(showDecimalPlaces),
										ignoreFieldChange: true
									});
								}
								else{
									//show net rate							
									var lineTotalAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount);
									var lineTaxRate = (lineTotalAmt != 0) ? parseFloat(responseLineArray[i].tax * 100) / parseFloat(lineTotalAmt) : 0;
									transactionRecord.setValue({
										fieldId: 'shippingtax1rate',
										value: parseFloat(lineTaxRate).toFixed(showDecimalPlaces),
										ignoreFieldChange: true
									});
								}
							}
						}
						else{
							if((responseLineArray[i].tax * multiplier) == 0){
								transactionRecord.setValue({
									fieldId: 'shippingtax1rate',
									value: 0,
									ignoreFieldChange: true
								});
								transactionRecord.setValue({
									fieldId: 'shippingtax2rate',
									value: 0,
									ignoreFieldChange: true
								});
							}
							else{
								var pstFlag = 'F';
								var detailNodes = responseLineArray[i].details;

								var lineTaxRate;
								var taxName = detailNodes[0].taxName;
								if(taxName.search('GST') != -1){
									if(showTaxRate == 0){
										//show base rate
										lineTaxRate = detailNodes[0].rate * 100;
									}
									else{
										//show net rate
										var lineTotalAmt = parseFloat(detailNodes[0].taxableAmount) + parseFloat(detailNodes[0].exemptAmount);
										lineTaxRate = (lineTotalAmt != 0) ? parseFloat(detailNodes[0].tax * 100) / parseFloat(lineTotalAmt) : 0;
									}
									
									transactionRecord.setValue({
										fieldId: 'shippingtax1rate',
										value: lineTaxRate.toFixed(showDecimalPlaces),
										ignoreFieldChange: true
									});
									AVA_GSTTotal += parseFloat(detailNodes[0].tax);
									pstFlag = 'T';
								}
								else{
									var detailNode = (detailNodes.length == 2) ? detailNodes[1] : detailNodes[0];
									
									if(showTaxRate == 0){
										//show base rate
										lineTaxRate = detailNode.rate * 100;
									}
									else{
										//show net rate
										var lineTotalAmt = parseFloat(detailNode.taxableAmount) + parseFloat(detailNode.exemptAmount);
										lineTaxRate = (lineTotalAmt != 0) ? parseFloat(detailNode.tax * 100) / parseFloat(lineTotalAmt) : 0;
									}
									
									transactionRecord.setValue({
										fieldId: 'shippingtax2rate',
										value: lineTaxRate.toFixed(showDecimalPlaces),
										ignoreFieldChange: true
									});
									AVA_PSTTotal += parseFloat(detailNode.tax);
									pstFlag = 'F';
								}
								
								if(pstFlag == 'T'){
									var lineTaxRate1;
									if(showTaxRate == 0){
										//show base rate
										lineTaxRate1 = detailNodes[1].rate * 100;
									}
									else{
										//show net rate
										var lineTotalAmt = parseFloat(detailNodes[1].taxableAmount) + parseFloat(detailNodes[1].exemptAmount);
										lineTaxRate1 = (lineTotalAmt != 0) ? parseFloat(detailNodes[1].tax * 100) / parseFloat(lineTotalAmt) : 0;
									}
									
									taxName = detailNodes[1].taxName;
									if(taxName.search('HST') != -1){
										transactionRecord.setValue({
											fieldId: 'shippingtax1rate',
											value: (lineTaxRate + lineTaxRate1).toFixed(showDecimalPlaces),
											ignoreFieldChange: true
										});
										AVA_GSTTotal += parseFloat(detailNodes[1].tax);
									}
									else{
										transactionRecord.setValue({
											fieldId: 'shippingtax2rate',
											value: lineTaxRate1.toFixed(showDecimalPlaces),
											ignoreFieldChange: true
										});
										AVA_PSTTotal += parseFloat(detailNodes[1].tax);
									}
									
									pstFlag = 'F';
								}
							}
						}
						
						if(transactionRecord.getValue('nexus_country') != 'US' && transactionRecord.getValue('nexus_country') != 'CA' && AVA_EditionChecked != 2){
							transactionRecord.setValue({
								fieldId: 'shippingtax1amt',
								value: format.parse({
									value: responseLineArray[i].tax * multiplier,
									type: format.Type.CURRENCY
								}),
								ignoreFieldChange: true
							});
						}
					}
					
					if(AVA_ShipCode == 'T' && AVA_HandlingCode == 'T'){
						i++;
					}
					
					if(transactionRecord.getValue('handlingtaxcode') != null && parseFloat(transactionRecord.getValue('handlingcost')) > 0){
						var taxcode = transactionRecord.getValue('custpage_ava_handlingtaxcode');
						
						if(taxcode != null && AVA_EditionChecked == 1){
							taxcode = taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + defTaxCode.length + 1);
						}
						
						if(AVA_EditionChecked != 2 && AVA_EditionChecked != 3){
							if(responseLineTax[i] == 'T' && AVA_HandlingCode == 'T' && i < responseLineTax.length && (taxcode != defTaxCode && taxcode == '-Not Taxable-')){
								transactionRecord.setValue({
									fieldId: 'handlingtaxcode',
									value: defTaxCodeId,
									ignoreFieldChange: true
								});
								
								if(transactionRecord.getValue('handlingtaxcode') != defTaxCodeId){
									AVA_ErrorCode = 'Unable to flip the Handling tax code to Configuration tax code.';
									return false;
								}
							}
						}
						
						if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && transactionRecord.getValue('custbody_ava_shippingtaxinclude') != null && transactionRecord.getValue('custbody_ava_shippingtaxinclude') == true){
							transactionRecord.setValue({
								fieldId: 'handlingcost',
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_handlingamount1',
								value: (parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_handlingamount',
								value: parseFloat(AVA_HandlingAmt) * multiplier,
								ignoreFieldChange: true
							});
						}
						
						if(transactionRecord.getValue('tax2total') == null){
							if((responseLineArray[i].tax * multiplier) == 0){
								transactionRecord.setValue({
									fieldId: 'handlingtax1rate',
									value: 0,
									ignoreFieldChange: true
								});
							}
							else{
								if(showTaxRate == 0){
									//show base rate
									var taxrate = 0;
									var details = responseLineArray[i].details;
									
									for(var j = 0; details != null && j < details.length; j++){
										taxrate += details[j].rate;
									}
									
									transactionRecord.setValue({
										fieldId: 'handlingtax1rate',
										value: (taxrate * 100).toFixed(showDecimalPlaces),
										ignoreFieldChange: true
									});
								}
								else{
									//show net rate
									var lineTotalAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount);
									var lineTaxRate = (lineTotalAmt != 0) ? parseFloat(responseLineArray[i].tax * 100) / parseFloat(lineTotalAmt) : 0;
									transactionRecord.setValue({
										fieldId: 'handlingtax1rate',
										value: parseFloat(lineTaxRate).toFixed(showDecimalPlaces),
										ignoreFieldChange: true
									});
								}
							}
						}
						else{
							if((responseLineArray[i].tax * multiplier) == 0){
								transactionRecord.setValue({
									fieldId: 'handlingtax1rate',
									value: 0,
									ignoreFieldChange: true
								});
								transactionRecord.setValue({
									fieldId: 'handlingtax2rate',
									value: 0,
									ignoreFieldChange: true
								});
							}
							else{
								var pstFlag = 'F';
								var detailNodes = responseLineArray[i].details;

								var lineTaxRate;
								var taxName = detailNodes[0].taxName;
								if(taxName.search('GST') != -1){
									if(showTaxRate == 0){
										//show base rate
										lineTaxRate = detailNodes[0].rate * 100;
									}
									else{
										//show net rate
										var lineTotalAmt = parseFloat(detailNodes[0].taxableAmount) + parseFloat(detailNodes[0].exemptAmount);
										lineTaxRate = (lineTotalAmt != 0) ? parseFloat(detailNodes[0].tax * 100) / parseFloat(lineTotalAmt) : 0;
									}
									
									transactionRecord.setValue({
										fieldId: 'handlingtax1rate',
										value: lineTaxRate.toFixed(showDecimalPlaces),
										ignoreFieldChange: true
									});
									AVA_GSTTotal += parseFloat(detailNodes[0].tax);
									pstFlag = 'T';
								}
								else{
									var detailNode = (detailNodes.length == 2) ? detailNodes[1] : detailNodes[0];
									
									if(showTaxRate == 0){
										//show base rate
										lineTaxRate = detailNode.rate * 100;
									}
									else{
										//show net rate
										var lineTotalAmt = parseFloat(detailNode.taxableAmount) + parseFloat(detailNode.exemptAmount);
										lineTaxRate = (lineTotalAmt != 0) ? parseFloat(detailNode.Tax * 100) / parseFloat(lineTotalAmt) : 0;
									}
									
									transactionRecord.setValue({
										fieldId: 'handlingtax2rate',
										value: lineTaxRate.toFixed(showDecimalPlaces),
										ignoreFieldChange: true
									});
									AVA_PSTTotal += parseFloat(detailNode.Tax);
									pstFlag = 'F';
								}
								
								if(pstFlag == 'T'){
									var lineTaxRate1;
									if(showTaxRate == 0){
										//show base rate
										lineTaxRate1 = detailNodes[1].rate * 100;
									}
									else{
										//show net rate
										var lineTotalAmt = parseFloat(detailNodes[1].taxableAmount) + parseFloat(detailNodes[1].exemptAmount);
										lineTaxRate1 = (lineTotalAmt != 0) ? parseFloat(detailNodes[1].tax * 100) / parseFloat(lineTotalAmt) : 0;
									}
									
									var taxName = detailNodes[1].taxName;
									if(taxName.search('HST') != -1){
										transactionRecord.setValue({
											fieldId: 'handlingtax1rate',
											value: (lineTaxRate + lineTaxRate1).toFixed(showDecimalPlaces),
											ignoreFieldChange: true
										});
										AVA_GSTTotal += parseFloat(detailNodes[1].tax);
									}
									else{
										transactionRecord.setValue({
											fieldId: 'handlingtax2rate',
											value: lineTaxRate1.toFixed(showDecimalPlaces),
											ignoreFieldChange: true
										});
										AVA_PSTTotal += parseFloat(detailNodes[1].tax);
									}
									
									pstFlag = 'F';
								}
							}
						}
						
						if(transactionRecord.getValue('nexus_country') != 'US' && transactionRecord.getValue('nexus_country') != 'CA' && AVA_EditionChecked != 2){
							transactionRecord.setValue({
								fieldId: 'handlingtax1amt',
								value: format.parse({
									value: responseLineArray[i].tax * multiplier,
									type: format.Type.CURRENCY
								}),
								ignoreFieldChange: true
							});
						}
					}
				}
				else if(transactionRecord.getValue('ismultishipto') == true && (AVA_ShipCode == 'T' || AVA_HandlingCode == 'T')){
					var j = 0;
					
					// Fix for CONNECT-3641
					if(configCache.AVA_EnableDiscount == true && transactionRecord.getValue('custpage_ava_formdiscountmapping') == 0 && (transactionRecord.getValue('discounttotal') != null && parseFloat(transactionRecord.getValue('discounttotal')) != 0)){
						i++;
					}
					
					for(var k = 0; AVA_ShipGroupTaxcodes != null && k < AVA_ShipGroupTaxcodes.length; k++){
						var fieldName = (AVA_ShipGroupTaxcodes[k][3] == 'FREIGHT') ? 'shippingrate' : 'handlingrate';
						
						if(transactionRecord.getSublistValue('shipgroup', fieldName, AVA_ShipGroupTaxcodes[k][0]) != null && transactionRecord.getSublistValue('shipgroup', fieldName, AVA_ShipGroupTaxcodes[k][0]) > 0){
							var taxcode = AVA_ShipGroupTaxcodes[k][2];
							
							/*if(responseLineTax[i] == 'T' && AVA_ShipCode == 'T' && i < responseLineTax.length && (taxcode != defTaxCode && taxcode != defTaxCode + '-POD' && taxcode != defTaxCode + '-POS')){
								var fieldName = (AVA_ShipGroupTaxcodes[k][3] == 'FREIGHT') ? 'shippingtaxcode' : 'handlingtaxcode';
								if(transactionRecord.getSublistValue('shipgroup', fieldName, AVA_ShipGroupTaxcodes[k][0]) != null){
									// AVATAX - CONFIG   AVATAX-CAN - TRANSACTION
									if(defTaxCode != taxcode.substring(0, defTaxCode.length)){
										nlapiSetLineItemValue('shipgroup', fieldName, AVA_ShipGroupTaxcodes[k][0], defTaxCodeId);
										
										if(transactionRecord.getSublistValue('shipgroup', fieldName, AVA_ShipGroupTaxcodes[k][0]) != defTaxCodeId){
											AVA_ErrorCode = 'Unable to flip the Shipping tax code to Configuration tax code.';
											return false;
										}
									}
								}
							}*/
							
							if(transactionRecord.getValue('tax2total') != null){
								var pstFlag = 'F';
								var detailNodes = responseLineArray[i].details;
								
								var taxName = detailNodes[0].taxName;
								if(taxName.search('GST') != -1){
									AVA_GSTTotal += parseFloat(detailNodes[0].tax);
									pstFlag = 'T';
								}
								else{
									var detailNode = (detailNodes.length == 2) ? detailNodes[1] : detailNodes[0];
									AVA_PSTTotal += parseFloat(detailNode.tax);
								}
								
								if(pstFlag == 'T' && detailNodes[1] != null){
									taxName = detailNodes[1].taxName;
									if(taxName.search('HST') != -1){
										AVA_GSTTotal += parseFloat(detailNodes[1].tax);
									}
									else{
										AVA_PSTTotal += parseFloat(detailNodes[1].tax);
									}
								}
							}
							else{
								if((responseLineArray[i].tax * multiplier) == 0){
									if(AVA_ShipGroupTaxcodes[k][3] == 'FREIGHT'){
										transactionRecord.setSublistValue({
											sublistId: 'shipgroup',
											fieldId: 'shippingtaxrate',
											line: AVA_ShipGroupTaxcodes[k][0],
											value: 0
										});
									}
									else{
										transactionRecord.setSublistValue({
											sublistId: 'shipgroup',
											fieldId: 'handlingtaxrate',
											line: AVA_ShipGroupTaxcodes[k][0],
											value: 0
										});
									}
								}
								else{
									if(showTaxRate == 0){
										//show base rate
										var taxrate = 0;
										var details = responseLineArray[i].details;
										
										for(var j = 0; details != null && j < details.length; j++){
											taxrate += details[j].rate;
										}
										
										if(AVA_ShipGroupTaxcodes[k][3] == 'FREIGHT'){
											transactionRecord.setSublistValue({
												sublistId: 'shipgroup',
												fieldId: 'shippingtaxrate',
												line: AVA_ShipGroupTaxcodes[k][0],
												value: (taxrate * 100).toFixed(showDecimalPlaces)
											});
										}
										else{
											transactionRecord.setSublistValue({
												sublistId: 'shipgroup',
												fieldId: 'handlingtaxrate',
												line: AVA_ShipGroupTaxcodes[k][0],
												value: (taxrate * 100).toFixed(showDecimalPlaces)
											});
										}
									}
									else{
										//show net rate							
										var lineTotalAmt = parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount);
										var lineTaxRate = (lineTotalAmt != 0) ? parseFloat(responseLineArray[i].tax * 100) / parseFloat(lineTotalAmt) : 0;
										
										if(AVA_ShipGroupTaxcodes[k][3] == 'FREIGHT'){
											transactionRecord.setSublistValue({
												sublistId: 'shipgroup',
												fieldId: 'shippingtaxrate',
												line: AVA_ShipGroupTaxcodes[k][0],
												value: parseFloat(lineTaxRate).toFixed(showDecimalPlaces)
											});
										}
										else{
											transactionRecord.setSublistValue({
												sublistId: 'shipgroup',
												fieldId: 'handlingtaxrate',
												line: AVA_ShipGroupTaxcodes[k][0],
												value: parseFloat(lineTaxRate).toFixed(showDecimalPlaces)
											});
										}
									}
								}
							}
							
							if(configCache.AVA_TaxInclude == true && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true){
								if(AVA_ShipGroupTaxcodes[k][3] == 'FREIGHT'){
									var shipAmt = ((parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier);
									transactionRecord.setSublistValue({
										sublistId: 'shipgroup',
										fieldId: 'shippingrate',
										line: j,
										value: shipAmt
									});
									transactionRecord.setSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_shippingamount1',
										line: j,
										value: shipAmt
									});
									transactionRecord.setSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_shippingamount',
										line: j,
										value: parseFloat(AVA_ShippingAmt[j]) * multiplier
									});
									j++;
								}
								else{
									j--;
									var handlingAmt = ((parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(showDecimalPlaces) * multiplier);
									transactionRecord.setSublistValue({
										sublistId: 'shipgroup',
										fieldId: 'handlingrate',
										line: j,
										value: handlingAmt
									});
									transactionRecord.setSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_handlingamount1',
										line: j,
										value: handlingAmt
									});
									transactionRecord.setSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_handlingamount',
										line: j,
										value: parseFloat(AVA_HandlingAmt[j]) * multiplier
									});
									j++;
								}
							}
							
							i++;
						}
					}
				}
			}
		}
		
		function AVA_GetCanadianResponseDetails(getTaxResult){
			AVA_GSTTotal = AVA_PSTTotal = 0;
			var taxLines = getTaxResult.lines;
			
			for(var i = 0; taxLines != null && i < taxLines.length; i++){
				var detailNodes = taxLines[i].details;
				
				for(var j = 0; detailNodes != null && j < detailNodes.length; j++){
					var taxName = detailNodes[j].taxName;
					if(taxName.search('GST') != -1){
						AVA_GSTTotal += parseFloat(detailNodes[j].tax);
					}
					else{
						if(taxName.search('HST') != -1){
							AVA_GSTTotal += parseFloat(detailNodes[j].tax);
						}
						else{
							AVA_PSTTotal += parseFloat(detailNodes[j].tax);
						}
					}
				}
			}
		}
		
		function AVA_SetDocTotal(transactionRecord, configCache, avaDocType, getTaxResult){
			var taxTotal = 0, pstTotal = 0;
			exchangeRate = transactionRecord.getValue('exchangerate');
			
			if(transactionRecord.getValue('custpage_ava_context') == 'WEBSTORE'){
				avaDocType = 'SalesOrder';
			}
			
			var multiplier = (avaDocType == 'SalesInvoice' || avaDocType == 'SalesOrder') ? 1 : -1;
			
			if(configCache.AVA_TaxInclude == true && configCache.AVA_EnableDiscount == false && transactionRecord.getValue('custbody_ava_taxinclude') != null && transactionRecord.getValue('custbody_ava_taxinclude') == true && AVA_ResultCode == 'Success'){
				var subtotal = 0, amt;
				var shippingCost = 0;
				var handlingCost = 0;
				
				transactionRecord.setValue({
					fieldId: 'taxamountoverride',
					value: format.parse({
						value: AVA_TotalTax * multiplier,
						type: format.Type.CURRENCY
					})
				});
				
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
					if(this.document){
						document.forms['main_form'].elements['taxamountoverride'].value = format_currency(AVA_TotalTax * multiplier);
						setInlineTextValue(document.getElementById('taxamountoverride_val'), format_currency(AVA_TotalTax * multiplier));
					}
				}
				
				taxTotal = (transactionRecord.getValue('taxamountoverride') != null && transactionRecord.getValue('taxamountoverride').toString().length > 0 ) ? parseFloat(transactionRecord.getValue('taxamountoverride')) : 0;
				
				if(transactionRecord.getValue('tax2total') != null){
					transactionRecord.setValue({
						fieldId: 'taxamountoverride',
						value: format.parse({
							value: AVA_GSTTotal * multiplier,
							type: format.Type.CURRENCY
						})
					});
					transactionRecord.setValue({
						fieldId: 'taxamount2override',
						value: format.parse({
							value: AVA_PSTTotal * multiplier,
							type: format.Type.CURRENCY
						})
					});
					
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0 && transactionRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
						if(this.document){
							document.forms['main_form'].elements['taxamountoverride'].value = format_currency(AVA_GSTTotal * multiplier);
							setInlineTextValue(document.getElementById('taxamountoverride_val'),format_currency(AVA_GSTTotal * multiplier));
							
							document.forms['main_form'].elements['taxamount2override'].value = format_currency(AVA_PSTTotal * multiplier);
							setInlineTextValue(document.getElementById('taxamount2override_val'),format_currency(AVA_PSTTotal * multiplier));
						}
					}
					
					taxTotal = (transactionRecord.getValue('taxamountoverride') != null && transactionRecord.getValue('taxamountoverride').toString().length > 0 ) ? parseFloat(transactionRecord.getValue('taxamountoverride')) : 0;
					pstTotal = (transactionRecord.getValue('taxamount2override') != null && transactionRecord.getValue('taxamount2override').toString().length > 0 ) ? parseFloat(transactionRecord.getValue('taxamount2override')) : 0;
				}
				
				var discountRate = transactionRecord.getValue('discountrate');
				var responseLineArray = getTaxResult.lines;
				
				for(var i = 0; AVA_TaxRequestLines != null && i < AVA_TaxRequestLines.length; i++){
					if(discountRate != null && discountRate.toString().indexOf('%') != -1){
						amt = ((parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(2) * multiplier);
					}
					else{
						amt = ((parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount) + parseFloat(responseLineArray[i].discountAmount)).toFixed(2) * multiplier);
					}
					
					subtotal = (parseFloat(subtotal) + parseFloat(amt)).toFixed(2);
				}
				
				if(transactionRecord.getValue('ismultishipto') == true){
					if(AVA_ShipCode == 'T' || AVA_HandlingCode == 'T'){
						if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
							shippingCost = parseFloat(transactionRecord.getValue('shippingcost'));
							handlingCost = parseFloat(transactionRecord.getValue('handlingcost'));
						}
						else{
							for(var j = 0 ; AVA_ShipGroupTaxcodes != null && j < AVA_ShipGroupTaxcodes.length; j++){
								if(AVA_ShipGroupTaxcodes[j][3] == 'FREIGHT'){
									shippingCost += ((parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(2) * multiplier);
								}
								else{
									handlingCost += ((parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(2) * multiplier);
								}
								
								i++;
							}
							
							if(transactionRecord.getValue('shippingcost') != null && transactionRecord.getValue('shippingcost').toString().length > 0){
								transactionRecord.setValue({
									fieldId: 'shippingcost',
									value: shippingCost
								});
								shippingCost = parseFloat(transactionRecord.getValue('shippingcost'));
							}
							
							if(transactionRecord.getValue('handlingcost') != null && transactionRecord.getValue('handlingcost').toString().length > 0){
								transactionRecord.setValue({
									fieldId: 'handlingcost',
									value: handlingCost
								});
								handlingCost = parseFloat(transactionRecord.getValue('handlingcost'));
							}
						}
					}
				}
				else{
					if(transactionRecord.getValue('custbody_ava_shippingtaxinclude') != null && transactionRecord.getValue('custbody_ava_shippingtaxinclude') == true){
						if(parseFloat(transactionRecord.getValue('shippingcost')) > 0){
							shippingCost = ((parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(2) * multiplier);
							transactionRecord.setValue({
								fieldId: 'shippingcost',
								value: shippingCost
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_shippingamount1',
								value: shippingCost,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_shippingamount',
								value: parseFloat(AVA_ShippingAmt) * multiplier,
								ignoreFieldChange: true
							});
							i++;
							shippingCost = parseFloat(transactionRecord.getValue('shippingcost'));
						}
						if(parseFloat(transactionRecord.getValue('handlingcost')) > 0){
							handlingCost = ((parseFloat(responseLineArray[i].taxableAmount) + parseFloat(responseLineArray[i].exemptAmount)).toFixed(2) * multiplier);
							transactionRecord.setValue({
								fieldId: 'handlingcost',
								value: handlingCost
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_handlingamount1',
								value: handlingCost,
								ignoreFieldChange: true
							});
							transactionRecord.setValue({
								fieldId: 'custbody_ava_handlingamount',
								value: parseFloat(AVA_HandlingAmt) * multiplier,
								ignoreFieldChange: true
							});
							handlingCost = parseFloat(transactionRecord.getValue('handlingcost'));
						}
					}
					else{
						if(transactionRecord.getValue('shippingcost') != null && transactionRecord.getValue('shippingcost').toString().length > 0){
							shippingCost = parseFloat(transactionRecord.getValue('shippingcost'));
						}
						if(transactionRecord.getValue('handlingcost') != null && transactionRecord.getValue('handlingcost').toString().length > 0){
							handlingCost = parseFloat(transactionRecord.getValue('handlingcost'));
						}
					}
				}
				
				if(discountRate != null && discountRate.toString().indexOf('%') != -1 && amt != 0){
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 0){
						discountRate = parseFloat(discountRate.toString().substring(0, discountRate.toString().indexOf('%')));
					}
					
					if(discountRate < 0){
						discountRate *= -1;
					}
					
					var discount = 100 - discountRate;
					subtotal = ((100 * subtotal) / discount).toFixed(2);
				}
				
				transactionRecord.setValue({
					fieldId: 'subtotal',
					value: format.parse({
						value: subtotal,
						type: format.Type.CURRENCY
					})
				});
				
				subtotal = parseFloat(transactionRecord.getValue('subtotal'));
				
				if(discountRate != null && discountRate.toString().indexOf('%') != -1 && amt != 0){
					var disc = (subtotal * (discountRate / 100)).toFixed(2);
					transactionRecord.setValue({
						fieldId: 'discounttotal',
						value: format.parse({
							value: disc * -1,
							type: format.Type.CURRENCY
						})
					});
				}
				
				var discount = parseFloat(transactionRecord.getValue('discounttotal'));
				
				var giftCertCost = 0;
				if(transactionRecord.getValue('giftcertapplied') != null && transactionRecord.getValue('giftcertapplied').toString().length > 0){
					giftCertCost = parseFloat(transactionRecord.getValue('giftcertapplied'));
				}
				
				var netTotal;
				if(transactionRecord.getValue('tax2total') != null){
					netTotal =  parseFloat(subtotal + discount + taxTotal + pstTotal + shippingCost + handlingCost + giftCertCost);
				}
				else{
					netTotal =  parseFloat(subtotal + discount + taxTotal + shippingCost + handlingCost + giftCertCost);
				}
				
				transactionRecord.setValue({
					fieldId: 'total',
					value: format.parse({
						value: netTotal,
						type: format.Type.CURRENCY
					})
				});
				
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
					if(this.document){
						document.forms['main_form'].elements['total'].value = format_currency(netTotal);
						setInlineTextValue(document.getElementById('total_val'), format_currency(netTotal));
					}
				}
			}
			else{
				transactionRecord.setValue({
					fieldId: 'taxamountoverride',
					value: format.parse({
						value: AVA_TotalTax * multiplier,
						type: format.Type.CURRENCY
					})
				});
				transactionRecord.setValue({
					fieldId: 'custbody_ava_customduty',
					value: AVA_LandedCost * multiplier,
					ignoreFieldChange: true
				});
				
				taxTotal = (transactionRecord.getValue('taxamountoverride') != null && transactionRecord.getValue('taxamountoverride').toString().length > 0 ) ? parseFloat(transactionRecord.getValue('taxamountoverride')) : 0;
				
				if(transactionRecord.getValue('tax2total') != null){
					transactionRecord.setValue({
						fieldId: 'taxamountoverride',
						value: format.parse({
							value: AVA_GSTTotal * multiplier,
							type: format.Type.CURRENCY
						})
					});
					transactionRecord.setValue({
						fieldId: 'taxamount2override',
						value: format.parse({
							value: AVA_PSTTotal * multiplier,
							type: format.Type.CURRENCY
						})
					});
					
					taxTotal = (transactionRecord.getValue('taxamountoverride') != null && transactionRecord.getValue('taxamountoverride').toString().length > 0 ) ? parseFloat(transactionRecord.getValue('taxamountoverride')) : 0;
					pstTotal = (transactionRecord.getValue('taxamount2override') != null && transactionRecord.getValue('taxamount2override').toString().length > 0 ) ? parseFloat(transactionRecord.getValue('taxamount2override')) : 0;
				}
			}
			
			if(transactionRecord.type == 'creditmemo' && transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
				if(transactionRecord.getValue('autoapply') == true){
					AVA_UnApply(transactionRecord);
					AVA_CreditAutoApply(transactionRecord, avaDocType, taxTotal, pstTotal);
				}
				else{
					AVA_CreditManualApply(transactionRecord, taxTotal, pstTotal);
				}
			}
		}
		
		function AVA_UnApply(transactionRecord){
			for(var i = 0; i < transactionRecord.getLineCount('apply'); i++){
				if(transactionRecord.getSublistValue('apply', 'apply', i) == true){
					nlapiSetLineItemValue('apply', 'apply', i + 1, 'F');
					nlapiSetLineItemValue('apply', 'amount', i + 1, 0);
				}
			}
		}

		function AVA_CreditAutoApply(transactionRecord, avaDocType, taxTotal, pstTotal){
			var multiplier = (avaDocType == 'SalesInvoice' || avaDocType == 'SalesOrder') ? 1 : -1;
			
			var total = transactionRecord.getValue('total');
			var appliedAmt = 0;
			
			if(parseFloat(total) != 0){
				for(var i = 0; i < transactionRecord.getLineCount('apply'); i++){
					var origAmt = transactionRecord.getSublistValue('apply', 'due', i);
					
					if(parseFloat(total) > parseFloat(origAmt)){
						nlapiSetLineItemValue('apply', 'amount', i + 1, parseFloat(origAmt));
						nlapiSetLineItemValue('apply', 'apply',	 i + 1, 'T');
						
						appliedAmt = parseFloat(appliedAmt) + parseFloat(origAmt);
						total = parseFloat(total) - parseFloat(origAmt);
					}
					else if(parseFloat(total) == 0){
						transactionRecord.setValue({
							fieldId: 'taxamountoverride',
							value: taxTotal * multiplier
						});
						
						if(transactionRecord.getValue('tax2total') != null){
							transactionRecord.setValue({
								fieldId: 'taxamount2override',
								value: pstTotal * multiplier
							});
						}
						
						break;
					}
					else{
						nlapiSetLineItemValue('apply', 'amount', i + 1, parseFloat(total));	
						nlapiSetLineItemValue('apply', 'apply',	 i + 1, 'T');
						
						appliedAmt = parseFloat(appliedAmt) + parseFloat(total);
						total = parseFloat(total) - parseFloat(total);
					}
				}
				
				transactionRecord.setValue({
					fieldId: 'taxamountoverride',
					value: taxTotal
				});
				
				if(transactionRecord.getValue('tax2total') != null){
					transactionRecord.setValue({
						fieldId: 'taxamount2override',
						value: pstTotal
					});
				}
				
				var unapplied = parseFloat(total);
				transactionRecord.setValue({
					fieldId: 'unapplied',
					value: unapplied
				});
				transactionRecord.setValue({
					fieldId: 'applied',
					value: parseFloat(appliedAmt)
				});
			}
		}
		
		function AVA_CreditManualApply(transactionRecord, taxTotal, pstTotal){
			var appliedAmt = 0;
			
			for(var i = 0; i < transactionRecord.getLineCount('apply'); i++){
				if(transactionRecord.getSublistValue('apply', 'apply', i) == true){
					appliedAmt = appliedAmt + parseFloat(transactionRecord.getSublistValue('apply', 'amount', i));
				}
			}
			
			var netTotal = transactionRecord.getValue('total');
			
			var unapplied = (parseFloat(appliedAmt) == 0) ? netTotal : parseFloat(netTotal - appliedAmt);
			transactionRecord.setValue({
				fieldId: 'unapplied',
				value: unapplied
			});
			transactionRecord.setValue({
				fieldId: 'applied',
				value: parseFloat(appliedAmt)
			});
		}
		
		function AVA_LogTaxResponse(transactionRecord, configCache, avataxDoc, response, startTime, errorCode){
			var memoText, authorname;
			var avaDocType = AVA_RecordType(transactionRecord.type);
			
			if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 0){
				memoText = AVA_LoggingTextBody(transactionRecord, configCache, avataxDoc, response, startTime, avaDocType, errorCode);
				transactionRecord.setValue({
					fieldId: 'custpage_ava_notemsg',
					value: memoText,
					ignoreFieldChange: true
				});
				
				if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK'){
					transactionRecord.setValue({
						fieldId: 'custbody_ava_scisnotemsg',
						value: memoText,
						ignoreFieldChange: true
					});
				}
			}
			else{
				if(transactionRecord.getValue('custpage_ava_taxcodestatus') == 3){
					if(transactionRecord.getValue('custpage_ava_context') != 'USERINTERFACE'){
						memoText = AVA_LoggingTextBody(transactionRecord, configCache, avataxDoc, response, startTime, avaDocType, errorCode);
						transactionRecord.setValue({
							fieldId: 'custpage_ava_notemsg',
							value: memoText,
							ignoreFieldChange: true
						});
						
						if(transactionRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' || transactionRecord.getValue('custpage_ava_context') == 'PAYMENTPOSTBACK'){
							transactionRecord.setValue({
								fieldId: 'custbody_ava_scisnotemsg',
								value: memoText,
								ignoreFieldChange: true
							});
						}
					}
				}
				else{
					var dateTime = new Date();
					var userId = runtime.getCurrentUser().id;
					
					//Client side or BeforeSubmit(only if order go processed thru Bill Sales Order) log
					if((transactionRecord.getValue('custpage_ava_notemsg') != null && transactionRecord.getValue('custpage_ava_notemsg').length > 0) || (transactionRecord.getValue('custbody_ava_scisnotemsg') != null && transactionRecord.getValue('custbody_ava_scisnotemsg').length > 0)){
						var rec = record.create({
							type: 'customrecord_avatransactionlogs'
						});
						rec.setValue({
							fieldId: 'custrecord_ava_transaction',
							value: transactionRecord.id
						});
						var memoText = (transactionRecord.getValue('custpage_ava_notemsg') != null && transactionRecord.getValue('custpage_ava_notemsg').length > 0) ? transactionRecord.getValue('custpage_ava_notemsg') : transactionRecord.getValue('custbody_ava_scisnotemsg');
						rec.setValue({
							fieldId: 'custrecord_ava_note',
							value: (memoText != null) ? memoText.substring(0, 3990) : ''
						});
						rec.setValue({
							fieldId: 'custrecord_ava_title',
							value: 'AvaTax Log - Client'
						});
						rec.setValue({
							fieldId: 'custrecord_ava_creationdatetime',
							value: ava_library.mainFunction('AVA_DateFormat', ava_library.mainFunction('AVA_ConvertDate', dateTime))
						});
						if(userId != null && userId > 0){
							rec.setValue({
								fieldId: 'custrecord_ava_author',
								value: userId
							});
						}
						rec.save();
					}
					
					if(avaDocType == 'SalesInvoice' || avaDocType == 'ReturnInvoice' || avaDocType == 'PurchaseInvoice'){
						var memoText = AVA_LoggingTextBody(transactionRecord, configCache, avataxDoc, response, startTime, avaDocType, errorCode);
						//Server side After Submit log
						var rec = record.create({
							type: 'customrecord_avatransactionlogs'
						});
						rec.setValue({
							fieldId: 'custrecord_ava_transaction',
							value: transactionRecord.id
						});
						rec.setValue({
							fieldId: 'custrecord_ava_note',
							value: (memoText != null) ? memoText.substring(0, 3990) : ''
						});
						rec.setValue({
							fieldId: 'custrecord_ava_title',
							value: 'AvaTax Log - Server'
						});
						rec.setValue({
							fieldId: 'custrecord_ava_creationdatetime',
							value: ava_library.mainFunction('AVA_DateFormat', ava_library.mainFunction('AVA_ConvertDate', dateTime))
						});
						if(userId != null && userId > 0){
							rec.setValue({
								fieldId: 'custrecord_ava_author',
								value: userId
							});
						}
						rec.save();
					}
				}
			}
		}
		
		function AVA_LoggingTextBody(transactionRecord, configCache, avataxDoc, response, startTime, avaDocType, errorCode){
			var memoText;
			AVA_ErrorCode = (transactionRecord.type == 'vendorbill' || transactionRecord.type == 'vendorcredit' || transactionRecord.type == 'purchaseorder') ? errorCode : AVA_ErrorCode;
			
			if(configCache.AVA_EnableLogging == true){
				if(avataxDoc == 'T'){
					if(response != null){
						var getTaxResult = JSON.parse(response.body);
						
						memoText = 'The Document has used AvaTax Services.';
						memoText += '\n ************************** REST Request Start ******************** ';
						memoText += '\n REST Request Date & Time - ' + startTime;
						memoText += '\n AvaTax Document Type - ' + getTaxResult.type;
						memoText += '\n AvaTax Document Number - ' + getTaxResult.code;
						
						var recordType;
						if(avaDocType == 'SalesInvoice' || avaDocType == 'ReturnInvoice'){
							recordType = (transactionRecord.type == 'invoice') ? 'Invoice' : ((transactionRecord.type == 'cashsale')? 'Cash Sale' : ((transactionRecord.type == 'cashrefund') ? 'Cash Refund' : 'Credit Memo'));
						}
						else if(avaDocType == 'PurchaseInvoice'){
							recordType = (transactionRecord.type == 'vendorbill') ? 'Vendor Bill' : 'Vendor Credit';
						}
						else if(avaDocType == 'PurchaseOrder'){
							recordType = 'Purchase Order';
						}
						else{
							recordType = (transactionRecord.type == 'salesorder') ? 'Sales Order' : ((transactionRecord.type == 'estimate') ? 'Estimate/Quote' : 'Return Authorization');
						}
						
						memoText += '\n NetSuite Document Type - ' + recordType + (transactionRecord.getValue('custpage_ava_context') == 'WEBSTORE' ? '- Web Store' : '');
						memoText += '\n NetSuite Document Date - ' + ava_library.mainFunction('AVA_DateFormat', ava_library.mainFunction('AVA_ConvertDate', transactionRecord.getValue('trandate')));
						memoText += '\n ************************** REST Request End ******************** ';
						memoText += '\n ************************** REST Response Start ****************** ';
						
						if(getTaxResult.error == null){
							getTaxResult.lines		   = undefined;
							getTaxResult.addresses	   = undefined;
							getTaxResult.locationTypes = undefined;
							getTaxResult.summary	   = undefined;
							getTaxResult.parameters	   = undefined;
							getTaxResult.messages	   = undefined;
							
							memoText += '\n REST Response - ' + JSON.stringify(getTaxResult);
						}
						else{
							memoText += '\n REST Response Status - Error: Invalid keys were entered';
						}
						
						memoText += '\n ************************** REST Response End ********************';
					}
					else{
						memoText = 'This Document has used AvaTax Services. ';
						
						if(AVA_ErrorCode != null && AVA_ErrorCode != 0 && IsNumeric(AVA_ErrorCode.toString()) == false){
							memoText += AVA_ErrorCode;
						}
					}
				}
				else{
					memoText = 'This Document has not used AvaTax Services. ';
					
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 1){
						memoText += (IsNumeric(ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode).toString()) == false) ? ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode) : '';
					}
				}
			}
			else
			{
				if(avataxDoc == 'T'){
					memoText = 'The Tax calculation call to AvaTax was successful. ';
					
					if(AVA_ErrorCode != null && AVA_ErrorCode != 0 && IsNumeric(AVA_ErrorCode.toString()) == false){
						memoText += AVA_ErrorCode;
					}
				}
				else{
					memoText = 'This Document has not used AvaTax Services. ';
					
					if(transactionRecord.getValue('custpage_ava_taxcodestatus') != 1){
						memoText += (IsNumeric(ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode).toString()) == false) ? ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode) : '';
					}
				}
			}
				
			return memoText;
		}
		
		function IsNumeric(sText){
			var validChars = "0123456789";
			var isNumber = true;
			var Char;
			
			for (i = 0; (i < 4 || (sText != null && i < sText.length)) && isNumber == true; i++){
				Char = sText.charAt(i);
				if(validChars.indexOf(Char) == -1){
					isNumber = false;
				}
			}
			
			return isNumber;
		}
		
		function AVA_EvaluateTranAbort(transactionRecord, configCache){
			var abortSave = 'F';
			
			switch(transactionRecord.getValue('custpage_ava_context')){
				case 'USEREVENT':
					abortSave = (configCache.AVA_AbortBulkBilling == true) ? 'T' : 'F';
					break;
					
				case 'USERINTERFACE':
					abortSave = (configCache.AVA_AbortUserInterfaces == true) ? 'T' : 'F';
					break;
					
				case 'WEBSERVICES':
					abortSave = (configCache.AVA_AbortWebServices == true) ? 'T' : 'F';
					break;
					
				case 'CSVIMPORT':
					abortSave = (configCache.AVA_AbortCSVImports == true) ? 'T' : 'F';
					break;
					
				case 'SCHEDULED':
					abortSave = (configCache.AVA_AbortScheduledScripts == true) ? 'T' : 'F';
					break;
					
				case 'SUITELET':
					abortSave = (configCache.AVA_AbortSuitelets == true) ? 'T' : 'F';
					break;
					
				case 'WORKFLOW':
					abortSave = (configCache.AVA_AbortWorkflowActionScripts == true) ? 'T' : 'F';
					break;
					
				default:
					break;
			}
			
			return abortSave;
		}
		
		function AVA_UpdateHeaderRecord(transactionRecord, rec){
			rec.setValue({
				fieldId: 'custrecord_ava_documentinternalid',
				value: transactionRecord.id
			});
			rec.setValue({
				fieldId: 'custrecord_ava_documentid',
				value: AVA_DocID
			});
			rec.setValue({
				fieldId: 'custrecord_ava_documentno',
				value: AVA_DocNo
			});
			rec.setValue({
				fieldId: 'custrecord_ava_documentdate',
				value: ava_library.AVA_FormatDate(ava_library.mainFunction('AVA_DateFormat', AVA_DocDate))
			});
			rec.setValue({
				fieldId: 'custrecord_ava_documenttype',
				value: AVA_DocType(AVA_DocumentType)
			});
			rec.setValue({
				fieldId: 'custrecord_ava_documentstatus',
				value: AVA_DocumentStatus(AVA_DocStatus)
			});
			rec.setValue({
				fieldId: 'custrecord_ava_netsuitedoctype',
				value: AVA_DocType(transactionRecord.type)
			});
			rec.setValue({
				fieldId: 'custrecord_ava_taxcalculationdate',
				value: ava_library.AVA_FormatDate(ava_library.mainFunction('AVA_DateFormat', AVA_TaxDate))
			});
			rec.setValue({
				fieldId: 'custrecord_ava_totalamount',
				value: format.parse({
					value: AVA_TotalAmount,
					type: format.Type.CURRENCY
				})
			});
			rec.setValue({
				fieldId: 'custrecord_ava_totaldiscount',
				value: format.parse({
					value: AVA_TotalDiscount,
					type: format.Type.CURRENCY
				})
			});
			rec.setValue({
				fieldId: 'custrecord_ava_totalnontaxable',
				value: format.parse({
					value: AVA_TotalExemption,
					type: format.Type.CURRENCY
				})
			});
			rec.setValue({
				fieldId: 'custrecord_ava_totaltaxable',
				value: format.parse({
					value: AVA_TotalTaxable,
					type: format.Type.CURRENCY
				})
			});
			rec.setValue({
				fieldId: 'custrecord_ava_totaltax',
				value: format.parse({
					value: AVA_TotalTax,
					type: format.Type.CURRENCY
				})
			});
			rec.setValue({
				fieldId: 'custrecord_ava_shipcode',
				value: ShippingCode
			});
			rec.setValue({
				fieldId: 'custrecord_ava_subsidiaryid',
				value: transactionRecord.getValue('subsidiary')
			});
			rec.setValue({
				fieldId: 'custrecord_ava_basecurrency',
				value: AVA_SubCurrency
			});
			
			var foreignCur;
			if(transactionRecord.getValue('isbasecurrency')== false){
				foreignCur = transactionRecord.getValue('currencysymbol');
				rec.setValue({
					fieldId: 'custrecord_ava_multicurrency',
					value: true
				});
			}
			else{
				foreignCur = AVA_SubCurrency;
			}
			
			rec.setValue({
				fieldId: 'custrecord_ava_foreigncurr',
				value: foreignCur
			});
			rec.setValue({
				fieldId: 'custrecord_ava_exchangerate',
				value: exchangeRate
			});
			
			if(transactionRecord.getValue('tax2total') != null){
				rec.setValue({
					fieldId: 'custrecord_ava_gsttax',
					value: format.parse({
						value: AVA_GSTTotal,
						type: format.Type.CURRENCY
					})
				});
				rec.setValue({
					fieldId: 'custrecord_ava_psttax',
					value: format.parse({
						value: AVA_PSTTotal,
						type: format.Type.CURRENCY
					})
				});
			}
			
			rec.save();
		}
		
		function AVA_DocType(documentType){
			switch(documentType){
				case 'SalesOrder':
				case 'invoice':
					return 1;
					break;
					
				case 'SalesInvoice':
				case 'cashsale':
					return 2;
					break;
					
				case 'PurchaseOrder':
				case 'creditmemo':
					return 3;
					break;
					
				case 'PurchaseInvoice':
				case 'cashrefund':
					return 4;
					break;
					
				case 'ReturnOrder':
				case 'returnauthorization':
					return 5;
					break;
					
				case 'ReturnInvoice':
					return 6;
					break;
					
				default:
					return 0;
					break;
			}
		}
		
		function AVA_CancelTax(transactionRecord, configCache, cancelType, details){
			var defCompanyCode;
			AvaTax = ava_library.mainFunction('AVA_InitSignatureObject', configCache.AVA_ServiceUrl);
			Transaction = new AvaTax.transaction();
			
			if(transactionRecord.getValue('subsidiary') != null && transactionRecord.getValue('subsidiary').length > 0){
				defCompanyCode = ava_library.mainFunction('AVA_GetDefaultCompanyCode', transactionRecord.getValue('subsidiary'));
				defCompanyCode = (defCompanyCode[0] != null && defCompanyCode[0].length > 0) ? defCompanyCode[0] : transactionRecord.getValue('subsidiary');
			}
			else{
				var subsidiary = search.lookupFields({
					type: transactionRecord.type,
					id: transactionRecord.id,
					columns: 'subsidiary'
				});
				defCompanyCode = ava_library.mainFunction('AVA_GetDefaultCompanyCode', subsidiary.subsidiary[0].value);
				defCompanyCode = (defCompanyCode[0] != null && defCompanyCode[0].length > 0) ? defCompanyCode[0] : subsidiary.subsidiary[0].value;
			}
			
			var voided = Transaction.voided(details, defCompanyCode, transactionRecord.id, cancelType);
			
			var response = https.post({
				body: voided.data,
				url: voided.url,
				headers: voided.headers
			});
			
			if(response.code == 200){
				return 0;
			}
			else{
				return 1;
			}
		}
		
		function AVA_DocDelete(transactionRecord, configCache, details){
			if(transactionRecord.getValue('custpage_ava_headerid') != null && transactionRecord.getValue('custpage_ava_headerid').length > 0){
				var docStatus = search.lookupFields({
					type: 'customrecord_avataxheaderdetails',
					id: transactionRecord.getValue('custpage_ava_headerid'),
					columns: 'custrecord_ava_documentstatus'
				});
				var cancelType = (docStatus.custrecord_ava_documentstatus == 1)? 'DocDeleted' : 'DocVoided';
				
				var cancelTax = AVA_CancelTax(transactionRecord, configCache, cancelType, details);
				if(cancelTax == 0 && docStatus.custrecord_ava_documentstatus == 1){
					record.delete({
						type: 'customrecord_avataxheaderdetails',
						id: transactionRecord.getValue('custpage_ava_headerid')
					});
				}
				else
				{
					record.submitFields({
						type: 'customrecord_avataxheaderdetails',
						id: transactionRecord.getValue('custpage_ava_headerid'),
						values: {'custrecord_ava_documentstatus': AVA_DocumentStatus('Cancelled')}
					});
				}
			}
		}
		
		function AVA_TransactionPageInitEvent(context){
			try{
				var cRecord = context.currentRecord;
				
				if(cRecord.getValue('custpage_ava_configobj') != null && cRecord.getValue('custpage_ava_configobj').length > 0){
					var configCache = JSON.parse(cRecord.getValue('custpage_ava_configobj'));
					
					if(cRecord.getValue('custpage_ava_context') == 'USERINTERFACE' && (configCache.AVA_AdditionalInfo == null || configCache.AVA_AdditionalInfo.length == 0)){
						alert("Please re-run the AvaTax configuration at 'Avalara > Setup > Configure Avalara' to proceed further with AvaTax services. Please contact the administrator");
						return;
					}
					
					if(configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.length > 0 && configCache.AVA_ServiceTypes.search('TaxSvc') != -1){
						AVA_InitTaxCall = 'T';
						cRecord.setValue({
							fieldId: 'custpage_ava_taxcodestatus',
							value: 0,
							ignoreFieldChange: true
						});
						
						if(context.mode == 'edit' || context.mode == 'create' || context.mode == 'copy'){
							if(cRecord.getValue('taxitem') != null){
								cRecord.setValue({
									fieldId: 'custpage_ava_formtaxcode',
									value: cRecord.getText('taxitem'),
									ignoreFieldChange: true
								});
							}
							else{
								if(cRecord.getValue('ismultishipto') == null || cRecord.getValue('ismultishipto') == false){
									cRecord.setValue({
										fieldId: 'custpage_ava_shiptaxcode',
										value: (cRecord.getText('shippingtaxcode') != null && cRecord.getText('shippingtaxcode').length > 0) ? cRecord.getText('shippingtaxcode') : '',
										ignoreFieldChange: true
									});
									cRecord.setValue({
										fieldId: 'custpage_ava_handlingtaxcode',
										value: (cRecord.getText('handlingtaxcode') != null && cRecord.getText('handlingtaxcode').length > 0) ? cRecord.getText('handlingtaxcode') : '',
										ignoreFieldChange: true
									});
								}
							}
							
							if(cRecord.getValue('custpage_ava_context') == 'USERINTERFACE'){
								AVA_EnableDisableEntityFields(cRecord, configCache);
							}
						}
						
						if(context.mode == 'edit' && cRecord.getValue('custpage_ava_headerid') != null && cRecord.getValue('custpage_ava_headerid').length > 0){
							if((cRecord.type == 'creditmemo' || cRecord.type == 'cashrefund' || cRecord.type == 'returnauthorization') && cRecord.getValue('createdfrom') != null && cRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
								if(cRecord.type == 'creditmemo' && cRecord.getValue('custpage_ava_createdfromrecordid') != null && cRecord.getValue('custpage_ava_createdfromrecordid').length > 0){
									AVA_CreateFromRecord = record.load({
										type: cRecord.getValue('custpage_ava_createdfromrecordtype'),
										id: cRecord.getValue('custpage_ava_createdfromrecordid')
									});
								}
								else{
									AVA_CreateFromRecord = record.load({
										type: cRecord.getValue('custpage_ava_recordtype'),
										id: cRecord.getValue('createdfrom')
									});
								}
							}
							
							AVA_GetSubsidiaryInfo(cRecord, JSON.parse(cRecord.getValue('custpage_ava_subsidiaryobj')));
							if(cRecord.getValue('custpage_ava_docstatus') != 'Cancelled' && AVA_MainTaxCodeCheck(cRecord, configCache) == 0){
								var taxTotal = 0, pstTotal = 0;
								taxTotal = parseFloat(cRecord.getValue('custpage_ava_totaltax')); 
								
								if(cRecord.getValue('tax2total') != null){
									taxTotal = parseFloat(cRecord.getValue('custpage_ava_gsttax'));
									pstTotal = parseFloat(cRecord.getValue('custpage_ava_psttax'));
									cRecord.setValue({
										fieldId: 'taxamount2override',
										value: pstTotal
									});
								}
								
								cRecord.setValue({
									fieldId: 'taxamountoverride',
									value: taxTotal
								});
								
								if(cRecord.type == 'creditmemo'){
									if(cRecord.getValue('autoapply') == true){
										AVA_UnApply(cRecord);
										AVA_CreditAutoApply(cRecord, 'ReturnInvoice', taxTotal, pstTotal);
									}
									else{
										AVA_CreditManualApply(cRecord, taxTotal, pstTotal);
									}
								}
							}
						}
						
						AVA_InitTaxCall = 'F';
					}
					else{
						if(configCache.AVA_AccountValue != null && configCache.AVA_AccountValue.length > 0 && configCache.AVA_LicenseKey != null && configCache.AVA_LicenseKey.length > 0 && configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.length == 0){
							alert("Please re-run the AvaTax configuration at 'Avalara > Setup > Configure Avalara' to proceed further with AvaTax services. Please contact the administrator");
						}
					}
				}
			}
			catch(err){
				log.debug({
					title: 'AVA_TransactionPageInitEvent - Error',
					details: err.message
				});
			}
		}
		
		function AVA_EnableDisableEntityFields(cRecord, configCache){
			var billToEntityUseCode = cRecord.getField({
				fieldId: 'custbody_ava_billtousecode'
			});
			var shipToEntityUseCode = cRecord.getField({
				fieldId: 'custbody_ava_shiptousecode'
			});
			
			if(configCache.AVA_EntityUseCode == true){
				billToEntityUseCode.isDisabled = false;
				
				if(cRecord.getValue('ismultishipto') == true){
					shipToEntityUseCode.isDisabled = true;
					nlapiDisableLineItemField('item', 'custcol_ava_shiptousecode', false);
				}
				else{
					shipToEntityUseCode.isDisabled = false;
					
					if(cRecord.type == 'cashrefund' || cRecord.type == 'returnauthorization'){
						nlapiDisableLineItemField('item', 'custcol_ava_shiptousecode', false);
					}
					else{
						if(AVA_InitFlag == 1){
							for(var i = 0; i < cRecord.getLineCount('item'); i++){
								nlapiSetLineItemValue('item', 'custcol_ava_shiptousecode', i + 1, '');
							}
						}
						
						nlapiDisableLineItemField('item', 'custcol_ava_shiptousecode', true);
					}
				}
			}
			else{
				billToEntityUseCode.isDisabled = true;
				shipToEntityUseCode.isDisabled = true;
				nlapiDisableLineItemField('item', 'custcol_ava_shiptousecode', true);
			}
		}
		
		function AVA_TransactionFieldChangedEvent(context){
			try{
				var cRecord = context.currentRecord;
				
				if(cRecord.getValue('custpage_ava_configobj') != null && cRecord.getValue('custpage_ava_configobj').length > 0){
					var configCache = JSON.parse(cRecord.getValue('custpage_ava_configobj'));
					
					if(configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.search('TaxSvc') != -1){
						var webstoreFlag = (cRecord.getValue('custpage_ava_context') == 'WEBSTORE' || cRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION') ? true : false;
						
						if(cRecord.getValue('custpage_ava_context') == 'USERINTERFACE' && cRecord.getValue('nexus_country') == 'IN'){
							//GSTin
							var shipToAddressId = cRecord.getValue('shipaddresslist');
							var shipToAddress = cRecord.getValue('shipaddress');
							
							if(context.fieldId == 'shipaddresslist' && shipToAddressId != '' && shipToAddressId != null && shipToAddress != '' && shipToAddress != null){
								var searchRecord = search.create({
									type: 'customer',
									filters:
										[
											['internalid', 'anyof', cRecord.getValue('entity')],
											'and',
											['formulanumeric: {address.addressinternalid}', 'equalto', shipToAddressId]
										],
									columns:
										[
											search.createColumn({
												name: 'custrecord_ava_customergstin',
												join: 'Address'
											})
										]
								});
								
								var customerSearchResult = searchRecord.run();
								customerSearchResult = customerSearchResult.getRange({
									start: 0,
									end: 5
								});
								
								if(customerSearchResult != null && customerSearchResult.length > 0){
									var custGSTIN = customerSearchResult[0].getValue({
										name: 'custrecord_ava_customergstin',
										join: 'Address'
									});
									
									if(cRecord.getValue('custbody_ava_customergstin') != custGSTIN){
										cRecord.setValue({
											fieldId: 'custbody_ava_customergstin',
											value: custGSTIN,
											ignoreFieldChange: true
										});
									}
								}
							}
							
							if(context.sublistId == 'item' && context.fieldId == 'shipaddress' && cRecord.getValue('ismultishipto') == true){
								var lineShipToAddressId = cRecord.getCurrentSublistValue(context.sublistId, 'shipaddress');
								var tranLineCustGSTIN = cRecord.getCurrentSublistValue(context.sublistId, 'custcol_ava_customergstin');
								
								var searchRecord = search.create({
									type: 'customer',
									filters:
										[
											['internalid', 'anyof', cRecord.getValue('entity')],
											'and',
											['formulanumeric: {address.addressinternalid}', 'equalto', lineShipToAddressId]
										],
									columns:
										[
											search.createColumn({
												name: 'custrecord_ava_customergstin',
												join: 'Address'
											})
										]
								});
								var customerSearchResult = searchRecord.run();
								customerSearchResult = customerSearchResult.getRange({
									start: 0,
									end: 5
								});
								
								if(customerSearchResult != null && customerSearchResult.length > 0){
									var custGSTIN = customerSearchResult[0].getValue({
										name: 'custrecord_ava_customergstin',
										join: 'Address'
									});
									
									if(tranLineCustGSTIN != custGSTIN){
										cRecord.setCurrentSublistValue({
											sublistId: context.sublistId,
											fieldId: 'custcol_ava_customergstin',
											value: custGSTIN
										});
									}
								}
							}
							//end GSTin
						}
						
						if(cRecord.getValue('ismultishipto') == true){
							if(context.sublistId == 'item' && context.fieldId == 'shipaddress'){
								if(configCache.AVA_EntityUseCode == true){
									if(cRecord.getCurrentSublistValue('item', 'shipaddress') != null && cRecord.getCurrentSublistValue('item', 'shipaddress').length > 0){
										if(cRecord.getCurrentSublistValue('item', 'custcol_ava_shiptousecode') != null){
											var response = https.get({
												url: url.resolveScript({
													scriptId: 'customscript_ava_recordload_suitelet',
													deploymentId: 'customdeploy_ava_recordload',
													params: {'type': 'customrecord_avaentityusemapping', 'custid': cRecord.getValue('entity'), 'addid': cRecord.getCurrentSublistValue('item', 'shipaddress')},
													returnExternalUrl: webstoreFlag
												})
											});
											var shipToUseCode = response.body;
											
											if(shipToUseCode != null && shipToUseCode.length > 0){
												cRecord.setCurrentSublistText({
													sublistId: 'item',
													fieldId: 'custcol_ava_shiptousecode',
													text: shipToUseCode,
													ignoreFieldChange: true
												});
											}
											else{
												cRecord.setCurrentSublistText({
													sublistId: 'item',
													fieldId: 'custcol_ava_shiptousecode',
													text: '',
													ignoreFieldChange: true
												});
											}
										}
									}
									else{
										if(cRecord.getCurrentSublistValue('item', 'custcol_ava_shiptousecode') != null){
											cRecord.setCurrentSublistText({
												sublistId: 'item',
												fieldId: 'custcol_ava_shiptousecode',
												text: '',
												ignoreFieldChange: true
											});
										}
									}
								}
								
								if(cRecord.getCurrentSublistValue('item', 'shipaddress') != null && cRecord.getCurrentSublistValue('item', 'shipaddress').length > 0){
									if(cRecord.getCurrentSublistValue('item', 'custcol_ava_shipto_latitude') != null && cRecord.getCurrentSublistValue('item', 'custcol_ava_shipto_longitude') != null){
										var coordinates = AVA_ReturnCoordinates(cRecord.getValue('entity'), cRecord.getCurrentSublistValue('item', 'shipaddress'));
										
										if(coordinates[0] == 1){
											cRecord.setCurrentSublistValue({
												sublistId: 'item',
												fieldId: 'custcol_ava_shipto_latitude',
												value: coordinates[1],
												ignoreFieldChange: true
											});
											cRecord.setCurrentSublistValue({
												sublistId: 'item',
												fieldId: 'custcol_ava_shipto_longitude',
												value: coordinates[2],
												ignoreFieldChange: true
											});
										}
										else{
											cRecord.setCurrentSublistValue({
												sublistId: 'item',
												fieldId: 'custcol_ava_shipto_latitude',
												value: '',
												ignoreFieldChange: true
											});
											cRecord.setCurrentSublistValue({
												sublistId: 'item',
												fieldId: 'custcol_ava_shipto_longitude',
												value: '',
												ignoreFieldChange: true
											});
										}
									}
								}
								else{
									if(cRecord.getCurrentSublistValue('item', 'custcol_ava_shipto_latitude') != null && cRecord.getCurrentSublistValue('item', 'custcol_ava_shipto_longitude') != null){
										cRecord.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_ava_shipto_latitude',
											value: '',
											ignoreFieldChange: true
										});
										cRecord.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_ava_shipto_longitude',
											value: '',
											ignoreFieldChange: true
										});
									}
								}
								
								if(cRecord.getValue('custpage_ava_context') == 'USERINTERFACE' && cRecord.getValue('nexus_country') == 'IN'){
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_cgstrate',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_cgstamt',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_sgstrate',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_sgstamt',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_igstrate',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_igstamt',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_utgstrate',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_utgstamt',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_compensationcessrate',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_compensationcessamt',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_compulsorycessrate',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_ava_compulsorycessamt',
										value: '',
										ignoreFieldChange: true
									});
								}
							}
						}
						
						if(context.sublistId == 'item' && context.fieldId == 'custcol_ava_shiptousecode'){
							if(cRecord.getCurrentSublistText('item', 'custcol_ava_shiptousecode') != null && cRecord.getCurrentSublistText('item', 'custcol_ava_shiptousecode').length > 0){
								if(cRecord.getCurrentSublistValue('item', 'shipaddress') != null && cRecord.getCurrentSublistValue('item', 'shipaddress').length <= 0){
									alert('Please select Ship-To Address for passing the required Entity/Use-Code');
									cRecord.setCurrentSublistText({
										sublistId: 'item',
										fieldId: 'custcol_ava_shiptousecode',
										text: '',
										ignoreFieldChange: true
									});
								}
							}
						}
						
						if(context.fieldId == 'shipmethod'){
							if(cRecord.getValue('shipmethod') != null && cRecord.getValue('shipmethod').length > 0){
								cRecord.setValue({
									fieldId: 'custpage_ava_shipping',
									value: true,
									ignoreFieldChange: true
								});
								cRecord.setValue({
									fieldId: 'custpage_ava_handling',
									value: true,
									ignoreFieldChange: true
								});
							}
							else{
								cRecord.setValue({
									fieldId: 'custpage_ava_shipping',
									value: false,
									ignoreFieldChange: true
								});
								cRecord.setValue({
									fieldId: 'custpage_ava_handling',
									value: false,
									ignoreFieldChange: true
								});
							}
						}
						
						if(cRecord.getLineCount('item') > 0 && (context.fieldId == 'billaddresslist' || context.fieldId == 'shipaddresslist')){
							AVA_FieldChangeTaxCall = 'F';
							
							if(cRecord.getValue('custpage_ava_context') == 'USERINTERFACE' && cRecord.getValue('nexus_country') == 'IN'){
								for(var i = 0; i < cRecord.getLineCount('item'); i++){
									nlapiSetLineItemValue('item', 'custcol_ava_customergstin', i + 1, '');
									
									nlapiSetLineItemValue('item', 'custcol_ava_cgstrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_cgstamt', i + 1, '');
								
									nlapiSetLineItemValue('item', 'custcol_ava_sgstrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_sgstamt', i + 1, '');

									nlapiSetLineItemValue('item', 'custcol_ava_igstrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_igstamt', i + 1, '');
								
									nlapiSetLineItemValue('item', 'custcol_ava_utgstamt', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_utgstrate', i + 1, '');
							
									nlapiSetLineItemValue('item', 'custcol_ava_compensationcessrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_compensationcessamt', i + 1, '');
						
									nlapiSetLineItemValue('item', 'custcol_ava_compulsorycessrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_compulsorycessamt', i + 1, '');
								}
							}
						}
						
						if(context.sublistId == 'itemcost' || context.sublistId == 'expcost' || context.sublistId == 'time'){
							if(context.fieldId != 'apply'){
								AVA_FieldChangeTaxCall = 'F';
							}
						}
						
						if(context.fieldId == 'shipaddresslist'){
							//Check for Entity/Use Code Values from Config and fetch the Entity/Use Code Mapping if any
							if(configCache.AVA_EntityUseCode == true && (cRecord.getValue('ismultishipto') == null || cRecord.getValue('ismultishipto') == false)){
								if(cRecord.getValue('shipaddresslist') != null && cRecord.getValue('shipaddresslist').length > 0 && cRecord.getValue('custbody_ava_shiptousecode') != null){
									var response = https.get({
										url: url.resolveScript({
											scriptId: 'customscript_ava_recordload_suitelet',
											deploymentId: 'customdeploy_ava_recordload',
											params: {'type': 'customrecord_avaentityusemapping', 'custid': cRecord.getValue('entity'), 'addid': cRecord.getValue('shipaddresslist')},
											returnExternalUrl: webstoreFlag
										})
									});
									var shipToUseCode = response.body;
									
									if(shipToUseCode != null && shipToUseCode.length > 0){
										cRecord.setText({
											fieldId: 'custbody_ava_shiptousecode',
											text: shipToUseCode,
											ignoreFieldChange: true
										});
									}
									else{
										cRecord.setText({
											fieldId: 'custbody_ava_shiptousecode',
											text: '',
											ignoreFieldChange: true
										});
									}
								}
								else{
									cRecord.setText({
										fieldId: 'custbody_ava_shiptousecode',
										text: '',
										ignoreFieldChange: true
									});
								}
							}
							
							if(cRecord.getValue('custbody_ava_shipto_latitude') != null && cRecord.getValue('custbody_ava_shipto_longitude') != null){
								if(cRecord.getValue('shipaddresslist') != null && cRecord.getValue('shipaddresslist').length > 0 && cRecord.getValue('shipaddresslist') > 0){
									var coordinates = AVA_ReturnCoordinates(cRecord.getValue('entity'), cRecord.getValue('shipaddresslist'));
									if(coordinates[0] == 1){
										cRecord.setValue({
											fieldId: 'custbody_ava_shipto_latitude',
											value: coordinates[1],
											ignoreFieldChange: true
										});
										cRecord.setValue({
											fieldId: 'custbody_ava_shipto_longitude',
											value: coordinates[2],
											ignoreFieldChange: true
										});
									}
									else{
										cRecord.setValue({
											fieldId: 'custbody_ava_shipto_latitude',
											value: '',
											ignoreFieldChange: true
										});
										cRecord.setValue({
											fieldId: 'custbody_ava_shipto_longitude',
											value: '',
											ignoreFieldChange: true
										});
									}
								}
								else{
									cRecord.setValue({
										fieldId: 'custbody_ava_shipto_latitude',
										value: '',
										ignoreFieldChange: true
									});
									cRecord.setValue({
										fieldId: 'custbody_ava_shipto_longitude',
										value: '',
										ignoreFieldChange: true
									});
								}
							}
						}
						
						if(context.fieldId == 'custbody_ava_shiptousecode'){
							if(cRecord.getText('custbody_ava_shiptousecode') != null && cRecord.getText('custbody_ava_shiptousecode').length > 0){
								if((cRecord.getValue('shipaddresslist') != null && cRecord.getValue('shipaddresslist').length <= 0) && (cRecord.getValue('shipaddress') != null && cRecord.getValue('shipaddress').length <= 0)){
									alert('Please select Ship-To Address for passing the required Entity/Use-Code');
									cRecord.setText({
										fieldId: 'custbody_ava_shiptousecode',
										text: '',
										ignoreFieldChange: true
									});
								}
							}
						}
						
						if(context.fieldId == 'billaddresslist'){
							if(configCache.AVA_EntityUseCode == true){
								var useCodeExists = 'F';
								if(cRecord.getValue('shipaddresslist') == cRecord.getValue('billaddresslist')){
									if(cRecord.getText('custbody_ava_shiptousecode') != null && cRecord.getText('custbody_ava_shiptousecode').length > 0 && cRecord.getValue('billaddresslist') != null && cRecord.getValue('billaddresslist').length > 0){
										cRecord.setText({
											fieldId: 'custbody_ava_billtousecode',
											text: cRecord.getText('custbody_ava_shiptousecode'),
											ignoreFieldChange: true
										});
										useCodeExists = 'T';
									}
								}
								
								if(useCodeExists == 'F'){
									if(cRecord.getValue('billaddresslist') != null && cRecord.getValue('billaddresslist').length > 0 && cRecord.getValue('custbody_ava_billtousecode') != null){
										var response = https.get({
											url: url.resolveScript({
												scriptId: 'customscript_ava_recordload_suitelet',
												deploymentId: 'customdeploy_ava_recordload',
												params: {'type': 'customrecord_avaentityusemapping', 'custid': cRecord.getValue('entity'), 'addid': cRecord.getValue('billaddresslist')},
												returnExternalUrl: webstoreFlag
											})
										});
										var billToUseCode = response.body;
										
										if(billToUseCode != null && billToUseCode.length > 0){
											cRecord.setText({
												fieldId: 'custbody_ava_billtousecode',
												text: billToUseCode,
												ignoreFieldChange: true
											});
										}
										else{
											cRecord.setText({
												fieldId: 'custbody_ava_billtousecode',
												text: '',
												ignoreFieldChange: true
											});
										}
									}
									else{
										cRecord.setText({
											fieldId: 'custbody_ava_billtousecode',
											text: '',
											ignoreFieldChange: true
										});
									}
								}
							}
							
							if(cRecord.getValue('billaddresslist') != null && cRecord.getValue('billaddresslist').length > 0 && cRecord.getValue('billaddresslist') > 0){
								var latLong = 'F';
								if(cRecord.getValue('shipaddresslist') == cRecord.getValue('billaddresslist')){
									if(cRecord.getValue('custbody_ava_shipto_latitude') != null && cRecord.getValue('custbody_ava_shipto_longitude') != null && cRecord.getValue('custbody_ava_billto_latitude') != null && cRecord.getValue('custbody_ava_billto_longitude') != null && cRecord.getValue('custbody_ava_shipto_latitude').length > 0 && cRecord.getValue('custbody_ava_shipto_longitude').length > 0){
										cRecord.setValue({
											fieldId: 'custbody_ava_billto_latitude',
											value: cRecord.getValue('custbody_ava_shipto_latitude'),
											ignoreFieldChange: true
										});
										cRecord.setValue({
											fieldId: 'custbody_ava_billto_longitude',
											value: cRecord.getValue('custbody_ava_shipto_longitude'),
											ignoreFieldChange: true
										});
										latLong = 'T';
									}
								}
								
								if(latLong == 'F'){
									if(cRecord.getValue('custbody_ava_billto_latitude') != null && cRecord.getValue('custbody_ava_billto_longitude') != null){
										var coordinates = AVA_ReturnCoordinates(cRecord.getValue('entity'), cRecord.getValue('billaddresslist'));
										if(coordinates[0] == 1){
											cRecord.setValue({
												fieldId: 'custbody_ava_billto_latitude',
												value: coordinates[1],
												ignoreFieldChange: true
											});
											cRecord.setValue({
												fieldId: 'custbody_ava_billto_longitude',
												value: coordinates[2],
												ignoreFieldChange: true
											});
										}
										else{
											cRecord.setValue({
												fieldId: 'custbody_ava_billto_latitude',
												value: '',
												ignoreFieldChange: true
											});
											cRecord.setValue({
												fieldId: 'custbody_ava_billto_longitude',
												value: '',
												ignoreFieldChange: true
											});
										}
									}
								}
							}
							else{
								cRecord.setValue({
									fieldId: 'custbody_ava_billto_latitude',
									value: '',
									ignoreFieldChange: true
								});
								cRecord.setValue({
									fieldId: 'custbody_ava_billto_longitude',
									value: '',
									ignoreFieldChange: true
								});
							}
						}
						
						if(context.fieldId == 'custbody_ava_billtousecode'){
							if(cRecord.getText('custbody_ava_billtousecode') != null && cRecord.getText('custbody_ava_billtousecode').length > 0){
								if((cRecord.getValue('billaddresslist') != null && cRecord.getValue('billaddresslist').length <= 0) && (cRecord.getValue('billaddress') != null && cRecord.getValue('billaddress').length <= 0)){
									alert('Please select Bill-To Address for passing the required Entity/Use-Code');
									cRecord.setText({
										fieldId: 'custbody_ava_billtousecode',
										text: '',
										ignoreFieldChange: true
									});
								}
							}
						}
						
						if(context.fieldId == 'ismultishipto'){
							AVA_FieldChangeTaxCall = 'F';
							
							if(cRecord.getValue('custpage_ava_context') == 'USERINTERFACE'){
								AVA_InitFlag = 1;
								AVA_EnableDisableEntityFields(cRecord, configCache);
								
								if(configCache.AVA_TaxInclude == true){
									var shippingTaxInclude = cRecord.getField({
										fieldId: 'custbody_ava_shippingtaxinclude'
									});
									
									if(cRecord.getValue('ismultishipto') == true){
										shippingTaxInclude.isDisabled = true;
									}
									else{
										if(cRecord.getValue('custbody_ava_taxinclude') == true){
											shippingTaxInclude.isDisabled = false;
										}
									}
								}
							}
						}
						
						if(context.fieldId == 'taxitem'){
							cRecord.setValue({
								fieldId: 'custpage_ava_formtaxcode',
								value: cRecord.getText('taxitem'),
								ignoreFieldChange: true
							});
						}
						
						if(context.fieldId == 'custbody_ava_taxcredit'){
							if(cRecord.getValue('custbody_ava_taxcredit') == null || cRecord.getValue('custbody_ava_taxcredit').length <= 0){
								cRecord.setValue({
									fieldId: 'custbody_ava_taxcredit',
									value: 0,
									ignoreFieldChange: true
								});
							}
						}
						
						if(context.fieldId == 'custbody_ava_taxinclude'){
							var shippingTaxInclude = cRecord.getField({
								fieldId: 'custbody_ava_shippingtaxinclude'
							});
							
							if(cRecord.getValue('custbody_ava_taxinclude') == false){
								cRecord.setValue({
									fieldId: 'custbody_ava_shippingtaxinclude',
									value: false,
									ignoreFieldChange: true
								});
								shippingTaxInclude.isDisabled = true;
							}
							else{
								shippingTaxInclude.isDisabled = false;
							}
						}
						
						if(context.fieldId == 'discountrate'){
							cRecord.setValue({
								fieldId: 'custbody_ava_discountamount',
								value: '',
								ignoreFieldChange: true
							});
							
							if(cRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION'){
								AVA_CalculateTaxOnDemand(cRecord, new Date());
							}
						}
						
						if(context.fieldId == 'custbody_ava_suspendtaxcall'){
							if(cRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION' && cRecord.getValue('custbody_ava_suspendtaxcall') == false){
								AVA_CalculateTaxOnDemand(cRecord, new Date());
							}
						}
						
						if(context.fieldId == 'custbody_ava_taxdateoverride'){
							var taxOverrideDate = cRecord.getField({
								fieldId: 'custbody_ava_taxoverridedate'
							});
							
							if(taxOverrideDate != null){
								if(cRecord.getValue('custbody_ava_taxdateoverride') == true){
									taxOverrideDate.isDisabled = false;
								}
								else{
									taxOverrideDate.isDisabled = true;
								}
							}
						}
						
						if((context.sublistId == 'item' && context.fieldId == 'location') || context.fieldId == 'location'){
							if(cRecord.getValue('custpage_ava_context') == 'USERINTERFACE' && cRecord.getValue('nexus_country') == 'IN'){
								for(var i = 0; i < cRecord.getLineCount('item'); i++){
									nlapiSetLineItemValue('item', 'custcol_ava_cgstrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_cgstamt', i + 1, '');
								
									nlapiSetLineItemValue('item', 'custcol_ava_sgstrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_sgstamt', i + 1, '');

									nlapiSetLineItemValue('item', 'custcol_ava_igstrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_igstamt', i + 1, '');
								
									nlapiSetLineItemValue('item', 'custcol_ava_utgstamt', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_utgstrate', i + 1, '');
							
									nlapiSetLineItemValue('item', 'custcol_ava_compensationcessrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_compensationcessamt', i + 1, '');
						
									nlapiSetLineItemValue('item', 'custcol_ava_compulsorycessrate', i + 1, '');
									nlapiSetLineItemValue('item', 'custcol_ava_compulsorycessamt', i + 1, '');
								}
							}
						}
					}
				}
			}
			catch(err){
				log.debug({
					title: 'AVA_TransactionFieldChangedEvent - Error',
					details: err.message
				});
			}
		}
		
		function AVA_CalculateTaxOnDemand(cRecord, connectorStartTime){
			AVA_LineCount = 0;
			AVA_ResultCode = '';
			cRecord.setValue({
				fieldId: 'custpage_ava_taxcodestatus',
				value: 0,
				ignoreFieldChange: true
			});
			cRecord.setValue({
				fieldId: 'custpage_ava_notemsg',
				value: '',
				ignoreFieldChange: true
			});
			var configCache = JSON.parse(cRecord.getValue('custpage_ava_configobj'));
			
			try{
				if(cRecord.getValue('custbody_ava_taxdateoverride') == true && (cRecord.getValue('custbody_ava_taxoverridedate') == null || cRecord.getValue('custbody_ava_taxoverridedate').toString().length == 0)){
					alert('Please select AvaTax Override Date');
					return;
				}
				
				if(cRecord.getValue('custbody_ava_taxoverride') == true || cRecord.getValue('custpage_ava_postingperiod') == true || cRecord.getValue('custpage_ava_postingperiod') == 'T'){
					return;
				}
				
				if(cRecord.getValue('source') == 'SCIS' || cRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION'){
					if(cRecord.type == 'creditmemo' && cRecord.getValue('custbody_ns_pos_created_from') != null && cRecord.getValue('custbody_ns_pos_created_from').length > 0){
						var createDate = search.lookupFields({
							type: search.Type.TRANSACTION,
							id: cRecord.getValue('custbody_ns_pos_created_from'),
							columns: 'trandate'
						});
						cRecord.setValue({
							fieldId: 'custpage_ava_createfromdate',
							value: ava_library.mainFunction('AVA_ConvertDate', createDate.trandate),
							ignoreFieldChange: true
						});
					}
				}
				
				if(configCache.AVA_EntityUseCode == true){
					cRecord.setValue({
						fieldId: 'custpage_ava_usecodeusuage',
						value: true,
						ignoreFieldChange: true
					});
				}
				
				if(configCache.AVA_TaxInclude == true && cRecord.getValue('custbody_ava_taxinclude') != null && cRecord.getValue('custbody_ava_taxinclude') == true){
					var discountRate = cRecord.getValue('discountrate');
					
					if(discountRate != null && discountRate.toString().length > 0){
						if(cRecord.getValue('custbody_ava_discountamount') == null || cRecord.getValue('custbody_ava_discountamount').length <= 0){
							// Store original discount amount
							cRecord.setValue({
								fieldId: 'custbody_ava_discountamount',
								value: cRecord.getValue('discounttotal'),
								ignoreFieldChange: true
							});
						}
					}
				}
				
				if((cRecord.type == 'creditmemo' || cRecord.type == 'cashrefund' || cRecord.type == 'returnauthorization') && cRecord.getValue('createdfrom') != null && cRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
					if(cRecord.type == 'creditmemo' && cRecord.getValue('custpage_ava_createdfromrecordid') != null && cRecord.getValue('custpage_ava_createdfromrecordid').length > 0){
						AVA_CreateFromRecord = record.load({
							type: cRecord.getValue('custpage_ava_createdfromrecordtype'),
							id: cRecord.getValue('custpage_ava_createdfromrecordid')
						});
					}
					else{
						AVA_CreateFromRecord = record.load({
							type: cRecord.getValue('custpage_ava_recordtype'),
							id: cRecord.getValue('createdfrom')
						});
					}
				}
				
				AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', cRecord.getValue('nexus_country'));
				AVA_GetSubsidiaryInfo(cRecord, JSON.parse(cRecord.getValue('custpage_ava_subsidiaryobj')));
				
				if(AVA_RequiredFields(cRecord, configCache) == 0){
					if(AVA_ItemsTaxLines(cRecord, configCache) != false){
						AVA_CalculateTax(cRecord, configCache);
					}
				}
				else{
					if(cRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
						if((configCache.AVA_ShowMessages == 1 || configCache.AVA_ShowMessages == 3) && AVA_ErrorCode != 17){
							alert("This Document has not used AvaTax Services for Tax Calculation. " + ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode));
						}
						
						nlapiSetFieldValue('taxamountoverride', '');
					}
					else{
						if(AVA_ErrorCode == 2){ // Fix for CONNECT-8312
							nlapiSetFieldValue('taxamountoverride', '');
						}
					}
				}
				
				if(AVA_ResultCode == 'Success' && configCache.AVA_EnableLogEntries == '1'){
					var connectorEndTime = new Date();
					var connectorTime = (AVA_ConnectorEndTime.getTime() - connectorStartTime.getTime()) + (connectorEndTime.getTime() - AVA_ConnectorStartTime.getTime());
					
					var docCode = (AVA_TempDocCode != null) ? AVA_TempDocCode.toString().substring(0, 50) : '';
					var avaDocType = AVA_RecordType(cRecord.type);
					ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + docCode + '~~' + connectorTime + '~~' + AVA_LatencyTime + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Performance' + '~~' + 'Informational' + '~~' + cRecord.type + '~~' + 'AVA_CalculateTaxOnDemand' + '~~' + 'CONNECTORMETRICS Type - GETTAX, LineCount - ' + AVA_LineCount + ', DocCode - ' + docCode + ', ConnectorTime - ' + connectorTime + ', LatencyTime - ' + AVA_LatencyTime + '~~' + '' + '~~' + 0 + '~~' + cRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + cRecord.getValue('custpage_ava_details')));
				}
			}
			catch(err){
				if(configCache.AVA_EnableLogEntries == '1'){
					var avaDocType = AVA_RecordType(cRecord.type);
					ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + cRecord.id + '~~' + '' + '~~' + '' + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Debug' + '~~' + 'Exception' + '~~' + cRecord.type + '~~' + 'AVA_CalculateTaxOnDemand' + '~~' + err.message + '~~' + '' + '~~' + 0 + '~~' + cRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + cRecord.getValue('custpage_ava_details')));
				}
				alert(err.message);
			}
		}
		
		function AVA_TransactionSublistChangedEvent(context){
			try{
				AVA_FieldChangeTaxCall = 'F';
				var cRecord = context.currentRecord;
				
				if(cRecord.getValue('custpage_ava_configobj') != null && cRecord.getValue('custpage_ava_configobj').length > 0){
					var configCache = JSON.parse(cRecord.getValue('custpage_ava_configobj'));
					
					if(configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.search('TaxSvc') != -1){
						if(context.sublistId == 'item' && cRecord.getValue('custpage_ava_context') != 'WEBSTORE' && cRecord.getValue('custpage_ava_context') != 'WEBAPPLICATION'){
							if(configCache.AVA_DisableLine == false && cRecord.getCurrentSublistValue('item', 'itemtype') == 'Group'){
								//using this flag to avoid declaration of a new variable for this ITem Group blocking issue
								//This will avoid the first call out of two while adding the Group item.
								AVA_FieldChangeTaxCall = 'F';
							}
							else{
								AVA_FieldChangeTaxCall = 'T';
							}
							
							if(cRecord.getValue('custpage_ava_exists') == 0 && configCache.AVA_DisableLine == false && AVA_InitTaxCall == 'F' && AVA_FieldChangeTaxCall != 'F'){
								if(cRecord.getValue('custbody_ava_taxoverride') == true){
									// Skip tax call if Tax Override option is checked.
									return;
								}
								
								cRecord.setValue({
									fieldId: 'custpage_ava_taxcodestatus',
									value: 0,
									ignoreFieldChange: true
								});
								
								if(configCache.AVA_EntityUseCode == true){
									cRecord.setValue({
										fieldId: 'custpage_ava_usecodeusuage',
										value: true,
										ignoreFieldChange: true
									});
								}
								
								if((cRecord.type == 'creditmemo' || cRecord.type == 'cashrefund' || cRecord.type == 'returnauthorization') && cRecord.getValue('createdfrom') != null && cRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
									if(cRecord.type == 'creditmemo' && cRecord.getValue('custpage_ava_createdfromrecordid') != null && cRecord.getValue('custpage_ava_createdfromrecordid').length > 0){
										AVA_CreateFromRecord = record.load({
											type: cRecord.getValue('custpage_ava_createdfromrecordtype'),
											id: cRecord.getValue('custpage_ava_createdfromrecordid')
										});
									}
									else{
										AVA_CreateFromRecord = record.load({
											type: cRecord.getValue('custpage_ava_recordtype'),
											id: cRecord.getValue('createdfrom')
										});
									}
								}
								
								AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', cRecord.getValue('nexus_country'));
								AVA_GetSubsidiaryInfo(cRecord, JSON.parse(cRecord.getValue('custpage_ava_subsidiaryobj')));
								
								if(AVA_RequiredFields(cRecord, configCache) == 0){
									if(AVA_ItemsTaxLines(cRecord, configCache) != false){
										AVA_CalculateTax(cRecord, configCache);
									}
									else{
										if(configCache.AVA_ShowMessages == 1 || configCache.AVA_ShowMessages == 3){
											alert("This Document has not used AvaTax Services. " + ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode));
										}
									}
								}
								else{
									if((configCache.AVA_ShowMessages == 1 || configCache.AVA_ShowMessages == 3) && AVA_ErrorCode != 17){
										alert("This Document has not used AvaTax Services. " + ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode));
									}
								}
							}
							
							AVA_FieldChangeTaxCall = 'T';
						}
						else if(context.sublistId == 'itemcost' || context.sublistId == 'expcost' || context.sublistId == 'time'){
							if(cRecord.getCurrentSublistValue(context.sublistId, 'apply') == true){
								if((cRecord.getValue('custpage_ava_exists') == 0) && configCache.AVA_DisableLine == false && AVA_InitTaxCall == 'F' && AVA_FieldChangeTaxCall != 'F'){
									if(cRecord.getValue('custbody_ava_taxoverride') == true){
										// Skip tax call if Tax Override option is checked.
										return;
									}
									
									cRecord.setValue({
										fieldId: 'custpage_ava_taxcodestatus',
										value: 0,
										ignoreFieldChange: true
									});
									
									if(configCache.AVA_EntityUseCode == true){
										cRecord.setValue({
											fieldId: 'custpage_ava_usecodeusuage',
											value: true,
											ignoreFieldChange: true
										});
									}
									
									if((cRecord.type == 'creditmemo' || cRecord.type == 'cashrefund' || cRecord.type == 'returnauthorization') && cRecord.getValue('createdfrom') != null && cRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
										if(cRecord.type == 'creditmemo' && cRecord.getValue('custpage_ava_createdfromrecordid') != null && cRecord.getValue('custpage_ava_createdfromrecordid').length > 0){
											AVA_CreateFromRecord = record.load({
												type: cRecord.getValue('custpage_ava_createdfromrecordtype'),
												id: cRecord.getValue('custpage_ava_createdfromrecordid')
											});
										}
										else{
											AVA_CreateFromRecord = record.load({
												type: cRecord.getValue('custpage_ava_recordtype'),
												id: cRecord.getValue('createdfrom')
											});
										}
									}
									
									AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', cRecord.getValue('nexus_country'));
									AVA_GetSubsidiaryInfo(cRecord, JSON.parse(cRecord.getValue('custpage_ava_subsidiaryobj')));
									
									if(AVA_RequiredFields(cRecord, configCache) == 0){
										if(AVA_ItemsTaxLines(cRecord, configCache) != false){
											AVA_CalculateTax(cRecord, configCache);
										}
									}
									else{
										if((configCache.AVA_ShowMessages == 1 || configCache.AVA_ShowMessages == 3) && AVA_ErrorCode != 17){
											alert("This Document has not used AvaTax Services. " + ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode));
										}
									}
								}
							}
							
							AVA_FieldChangeTaxCall = 'T';
						}
						else if(context.sublistId == 'apply'){
							AVA_GetSubsidiaryInfo(cRecord, JSON.parse(cRecord.getValue('custpage_ava_subsidiaryobj')));
							
							if(AVA_MainTaxCodeCheck(cRecord, configCache) == 0){
								var taxTotal = parseFloat(cRecord.getValue('taxtotal')); 
								var pstTotal = parseFloat(cRecord.getValue('tax2total'));
						
								AVA_CreditManualApply(cRecord, taxTotal, pstTotal);
								cRecord.setValue({
									fieldId: 'taxamountoverride',
									value: taxTotal
								});
								
								if(cRecord.getValue('tax2total') != null){
									cRecord.setValue({
										fieldId: 'taxamount2override',
										value: pstTotal
									});
								}
							}
						}
						
						if(context.sublistId == 'item' && cRecord.getValue('custpage_ava_context') == 'WEBSTORE'){
							AVA_CalculateTaxOnDemand(cRecord, new Date());
						}
					}
				}
			}
			catch(err){
				log.debug({
					title: 'AVA_TransactionSublistChangedEvent - Error',
					details: err.message
				});
			}
		}
		
		function AVA_TransactionSaveEvent(context){
			var connectorStartTime = new Date();
			AVA_LineCount = 0;
			AVA_ResultCode = '';
			var cRecord = context.currentRecord;
			
			if(cRecord.getValue('custpage_ava_configobj') != null && cRecord.getValue('custpage_ava_configobj').length > 0){
				var configCache = JSON.parse(cRecord.getValue('custpage_ava_configobj'));
				
				// Check if 'Tax' field is disabled, Field Created and set in AVA_TransactionTabBeforeLoad() - For CONNECT-3696 
				if(cRecord.getValue('custpage_ava_taxfieldflag') == false || cRecord.getValue('custpage_ava_taxfieldflag') == 'F'){
					alert('Tax cannot be calculated. Please enable Tax fields on transaction form.');
					return true;
				}
				
				if(configCache.AVA_ServiceTypes != null && configCache.AVA_ServiceTypes.search('TaxSvc') != -1){
					try{
						if(cRecord.getValue('custbody_ava_taxdateoverride') == true && (cRecord.getValue('custbody_ava_taxoverridedate') == null || cRecord.getValue('custbody_ava_taxoverridedate').toString().length == 0)){
							alert('Please select AvaTax Override Date');
							return false;
						}
						
						if(cRecord.getValue('custbody_ava_taxoverride') == true || cRecord.getValue('custpage_ava_postingperiod') == true || cRecord.getValue('custpage_ava_postingperiod') == 'T'){
							return true;
						}
						
						if(cRecord.getValue('source') == 'SCIS' || cRecord.getValue('custpage_ava_context') == 'WEBAPPLICATION'){
							if(cRecord.type == 'creditmemo' && cRecord.getValue('custbody_ns_pos_created_from') != null && cRecord.getValue('custbody_ns_pos_created_from').length > 0){
								var createDate = search.lookupFields({
									type: search.Type.TRANSACTION,
									id: cRecord.getValue('custbody_ns_pos_created_from'),
									columns: 'trandate'
								});
								cRecord.setValue({
									fieldId: 'custpage_ava_createfromdate',
									value: ava_library.mainFunction('AVA_ConvertDate', createDate.trandate),
									ignoreFieldChange: true
								});
							}
						}
						
						if(cRecord.getValue('custpage_ava_docstatus') != null || cRecord.getValue('custpage_ava_docstatus') != 'Cancelled' && cRecord.getValue('custpage_ava_context') != 'WEBSTORE'){
							cRecord.setValue({
								fieldId: 'custpage_ava_taxcodestatus',
								value: 0,
								ignoreFieldChange: true
							});
							
							if(configCache.AVA_EntityUseCode == true){
								cRecord.setValue({
									fieldId: 'custpage_ava_usecodeusuage',
									value: true,
									ignoreFieldChange: true
								});
							}
							
							if(configCache.AVA_TaxInclude == true && cRecord.getValue('custbody_ava_taxinclude') != null && cRecord.getValue('custbody_ava_taxinclude') == true){
								var discountRate = cRecord.getValue('discountrate');
								
								if(discountRate != null && discountRate.toString().length > 0){
									if(cRecord.getValue('custbody_ava_discountamount') == null || cRecord.getValue('custbody_ava_discountamount').length <= 0){
										// Store original discount amount
										cRecord.setValue({
											fieldId: 'custbody_ava_discountamount',
											value: cRecord.getValue('discounttotal'),
											ignoreFieldChange: true
										});
									}
								}
							}
							
							if((cRecord.type == 'creditmemo' || cRecord.type == 'cashrefund' || cRecord.type == 'returnauthorization') && cRecord.getValue('createdfrom') != null && cRecord.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
								if(cRecord.type == 'creditmemo' && cRecord.getValue('custpage_ava_createdfromrecordid') != null && cRecord.getValue('custpage_ava_createdfromrecordid').length > 0){
									AVA_CreateFromRecord = record.load({
										type: cRecord.getValue('custpage_ava_createdfromrecordtype'),
										id: cRecord.getValue('custpage_ava_createdfromrecordid')
									});
								}
								else{
									AVA_CreateFromRecord = record.load({
										type: cRecord.getValue('custpage_ava_recordtype'),
										id: cRecord.getValue('createdfrom')
									});
								}
							}
							
							AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', cRecord.getValue('nexus_country'));
							AVA_GetSubsidiaryInfo(cRecord, JSON.parse(cRecord.getValue('custpage_ava_subsidiaryobj')));
							if(AVA_RequiredFields(cRecord, configCache) == 0){
								if(AVA_ItemsTaxLines(cRecord, configCache) != false){
									if(AVA_CalculateTax(cRecord, configCache) == false){
										AVA_LogTaxResponse(cRecord, configCache, 'T');
										if(configCache.AVA_AbortUserInterfaces == true){
											alert('AvaTax - Aborting the save operation due to tax calculation error(s)/incomplete data.');
											return false;
										}
									}
									
									cRecord.setValue({
										fieldId: 'custpage_ava_document',
										value: true,
										ignoreFieldChange: true
									});
								}
								else{
									if(cRecord.type == 'creditmemo' && (AVA_ErrorCode == false || AVA_ErrorCode == 34)){
										nlapiSetFieldValue('taxamountoverride', '');
										if(AVA_ErrorCode == false){
											return false;
										}
									}
									
									AVA_LogTaxResponse(cRecord, configCache, 'F');
									cRecord.setValue({
										fieldId: 'custpage_ava_document',
										value: false,
										ignoreFieldChange: true
									});
								}
							}
							else{
								// Fix for CONNECT-3488
								if(AVA_ErrorCode == 6 || AVA_ErrorCode == 9){
									if(cRecord.getValue('custpage_ava_headerid') == null || cRecord.getValue('custpage_ava_headerid').length <= 0){
										if(cRecord.getField('taxitem') != null){
											nlapiSetFieldValue('taxamountoverride', '');
										}
										else{
											var avaLines = 'F', lineTaxCode;
											var taxcode = cRecord.getValue('custpage_ava_deftax');
											
											for(var line = 0 ; AVA_NS_Lines != null && line < AVA_NS_Lines.length; line++){
												lineTaxCode = AVA_TaxcodeArray[line];
												var linetype = cRecord.getSublistValue(AVA_NS_Lines[line][0], 'itemtype', AVA_NS_Lines[line][1]);
												if(lineTaxCode != '-Not Taxable-' && !(linetype == 'Description' || linetype == 'Subtotal' || linetype == 'Group' || linetype == 'EndGroup' || linetype == 'Discount')){
													if(lineTaxCode != null && lineTaxCode.length > 0){
														if(AVA_EditionChecked == 0){
															if((lineTaxCode.substring(0, taxcode.length) == taxcode)){
																avaLines = 'T';
																break;
															}
														}
														else if(AVA_EditionChecked == 1){
															// Substring lineTaxCode from ':' to DefaultTaxCode length
															if((lineTaxCode.substring(lineTaxCode.indexOf(':') + 1, lineTaxCode.indexOf(':') + taxcode.length + 1) == taxcode)){
																avaLines = 'T';
																break;
															}
														}
														else{
															if(lineTaxCode.search('POD') != -1 || lineTaxCode.search('POS') != -1 || lineTaxCode.indexOf('-') != -1){ // Fix for CONNECT-3789
																lineTaxCode = lineTaxCode.substring(0, 6);
															}
															
															// Substring DefaultTaxCode from ':' to lineTaxCode length
															if((lineTaxCode == taxcode.substring(taxcode.indexOf(':') + 1, taxcode.indexOf(':') + lineTaxCode.length + 1))){
																avaLines = 'T';
																break;
															}
														}
													}
												}
											}
											
											if(avaLines == 'F'){
												nlapiSetFieldValue('taxamountoverride', '');
											}
										}
									}
								}
								
								if((configCache.AVA_ShowMessages == 1 || configCache.AVA_ShowMessages == 3) && AVA_ErrorCode != 17){
									alert("This Document has not used AvaTax Services for Tax Calculation. " + ava_library.mainFunction('AVA_ErrorCodeDesc', AVA_ErrorCode));
								}
								
								AVA_LogTaxResponse(cRecord, configCache, 'F');
								cRecord.setValue({
									fieldId: 'custpage_ava_document',
									value: false,
									ignoreFieldChange: true
								});
								
								if(configCache.AVA_AbortUserInterfaces == true && (AVA_ErrorCode == 12 || AVA_ErrorCode == 14)){
									alert('AvaTax - Aborting the save operation due to tax calculation error(s)/incomplete data.');
									return false;
								}
							}
						}
						
						if(cRecord.getValue('custpage_ava_context') != 'WEBSTORE' && AVA_ResultCode == 'Success'){
							var connectorEndTime = new Date();
							var connectorTime = (AVA_ConnectorEndTime.getTime() - connectorStartTime.getTime()) + (connectorEndTime.getTime() - AVA_ConnectorStartTime.getTime());
							cRecord.setValue({
								fieldId: 'custpage_ava_clientlatency',
								value: AVA_LatencyTime,
								ignoreFieldChange: true
							});
							cRecord.setValue({
								fieldId: 'custpage_ava_clientconnector',
								value: connectorTime,
								ignoreFieldChange: true
							});
							
							if(configCache.AVA_EnableLogEntries == '1'){
								var avaDocType = AVA_RecordType(cRecord.type);
								var docCode = (AVA_TempDocCode != null) ? AVA_TempDocCode.toString().substring(0, 50) : '';
								ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + docCode + '~~' + connectorTime + '~~' + AVA_LatencyTime + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Performance' + '~~' + 'Informational' + '~~' + cRecord.type + '~~' + 'AVA_TransactionSaveEvent' + '~~' + 'CONNECTORMETRICS Type - GETTAX, LineCount - ' + AVA_LineCount + ', DocCode - ' + docCode + ', ConnectorTime - ' + connectorTime + ', LatencyTime - ' + AVA_LatencyTime + '~~' + '' + '~~' + 0 + '~~' + cRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + cRecord.getValue('custpage_ava_details')));
							}
						}
						
						cRecord.setValue({
							fieldId: 'custpage_ava_taxcodestatus',
							value: 3,
							ignoreFieldChange: true
						});
						
						return true;
					}
					catch(err){
						if(configCache.AVA_EnableLogEntries == '1'){
							var avaDocType = AVA_RecordType(cRecord.type);
							ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + cRecord.id + '~~' + '' + '~~' + '' + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Debug' + '~~' + 'Exception' + '~~' + cRecord.type + '~~' + 'AVA_TransactionSaveEvent' + '~~' + err.message + '~~' + '' + '~~' + 0 + '~~' + cRecord.getValue('custpage_ava_taxcodestatus') + '~~' + avaDocType + '~~' + cRecord.getValue('custpage_ava_details')));
						}
						
						alert(err.message);
						cRecord.setValue({
							fieldId: 'custpage_ava_taxcodestatus',
							value: 0,
							ignoreFieldChange: true
						});
						return false;
					}
				}
			}
			
			return true;
		}
		
		function AVA_CommitTransaction(value){
			try{
				var rec = record.load({
					type: value.recordType,
					id: value.id
				});
				
				log.debug({
					title: 'Record loaded',
					details: value.recordType + ' - ' + value.id
				});
				
				AVA_EditionChecked = 0;
				var avaDocType = AVA_RecordType(rec.type);
				var configCache = JSON.parse(rec.getValue('custpage_ava_configobj'));
				
				rec.setValue({
					fieldId: 'custpage_ava_taxcodestatus',
					value: 1,
					ignoreFieldChange: true
				});
				
				if(rec.getValue('edition') == 'US' || rec.getValue('edition') == 'CA'){
					if(rec.getValue('nexus_country') != 'US' && rec.getValue('nexus_country') != 'CA'){
						AVA_EditionChecked = 1; // if subsidiary is US/CA and address is not US/CA
					}
				}
				else{
					if(rec.getValue('nexus_country') == 'US' || rec.getValue('nexus_country') == 'CA'){
						AVA_EditionChecked = 2; // if subsidiary is UK/AU and address is US/CA
					}
					else{
						AVA_EditionChecked = 3; // if subsidiary is UK/AU and address is not US/CA
					}
				}
				
				if(avaDocType == 'SalesInvoice' || avaDocType == 'ReturnInvoice'){
					AVA_FoundVatCountry = ava_library.mainFunction('AVA_CheckVatCountries', rec.getValue('nexus_country'));
					AVA_GetSubsidiaryInfo(rec, JSON.parse(rec.getValue('custpage_ava_subsidiaryobj')));
					AVA_GetNSLines(rec, configCache);
					AVA_GetTaxcodes(rec);
					AVA_ShipToAddress = AVA_GetDestinationAddress(rec, configCache);
					
					var tempPOS = 0;
					AVA_LocationPOS = 0;
					if(configCache.AVA_DisableLocationCode == false){
						AVA_GetLocations(rec, configCache);
						
						if((rec.type == 'creditmemo' || rec.type == 'cashrefund' || rec.type == 'returnauthorization') && rec.getValue('createdfrom') != null && rec.getValue('createdfrom').length > 0 && configCache.AVA_UseInvoiceAddress == true){
							if((rec.getValue('custpage_ava_lineloc') == false || rec.getValue('custpage_ava_lineloc') == 'F') && AVA_CreateFromRecord.getValue('location') != null && AVA_CreateFromRecord.getValue('location').length > 0 && AVA_CreateFromRecord.getValue('custbody_ava_pickup') == true){
								AVA_LocationPOS = 1;
								
								if(AVA_LocationArray != null && AVA_LocationArray.length > 0 && rec.getValue('ismultishipto') == true){
									tempPOS = 1;
								}
							}
						}
						else{
							if((rec.getValue('custpage_ava_lineloc') == false || rec.getValue('custpage_ava_lineloc') == 'F') && rec.getValue('location') != null && rec.getValue('location').length > 0 && rec.getValue('custbody_ava_pickup') == true){
								AVA_LocationPOS = 1;
							}
						}
					}
					
					if(AVA_LocationPOS == 0 || tempPOS == 1){
						AVA_GetMultiShipAddr(rec, configCache);
					}
					
					if(rec.type == 'creditmemo' && rec.getValue('custbody_ns_pos_created_from') != null && rec.getValue('custbody_ns_pos_created_from').length > 0){
						var createDate = search.lookupFields({
							type: search.Type.TRANSACTION,
							id: rec.getValue('custbody_ns_pos_created_from'),
							columns: 'trandate'
						});
						rec.setValue({
							fieldId: 'custpage_ava_createfromdate',
							value: ava_library.mainFunction('AVA_ConvertDate', createDate.trandate),
							ignoreFieldChange: true
						});
					}
					
					if(AVA_ItemsTaxLines(rec, configCache) != false){
						avaDoc = 'T';
						AVA_DocNo = rec.getValue('tranid');
						
						AvaTax = ava_library.mainFunction('AVA_InitSignatureObject', configCache.AVA_ServiceUrl);
						Transaction = new AvaTax.transaction();
						AVA_GetTaxBody(rec, configCache, avaDocType, 1);
						var createoradjust = Transaction.createoradjust(rec.getValue('custpage_ava_details'));
						
						var startTime = new Date();
						var response = https.post({
							body: createoradjust.data,
							url: createoradjust.url,
							headers: createoradjust.headers
						});
						var endTime = new Date();
						
						var resp = AVA_ReadTaxResponse(rec, configCache, response, avaDocType, startTime);
					}
				}
				else{
					record.submitFields({
						type: rec.type,
						id: rec.id,
						values: {'custbody_ava_scis_trans_flag': false, 'custbody_avalara_status': 2}
					});
					
					AVA_LogTaxResponse(rec, configCache, 'F');
				}
			}
			catch(err){
				log.debug({
					title: 'AVA_CommitTransaction Try/Catch Error',
					details: err.message
				});
				log.debug({
					title: 'AVA_CommitTransaction Try/Catch Error Stack',
					details: err.stack
				});
			}
		}
		
		function AVA_ReadTaxResponse(rec, configCache, response, avaDocType, startTime){
			var getTaxResult = JSON.parse(response.body);
			
			if(getTaxResult.error == null){
				AVA_ResultCode = 'Success';
				
				AVA_DocID          = getTaxResult.id;
				AVA_DocCode        = getTaxResult.code;
				AVA_DocDate        = getTaxResult.date;
				AVA_DocumentType   = getTaxResult.type;
				AVA_DocStatus      = getTaxResult.status;
				AVA_TaxDate        = getTaxResult.taxDate;
				AVA_TotalAmount    = getTaxResult.totalAmount;
				AVA_TotalDiscount  = getTaxResult.totalDiscount;
				AVA_TotalExemption = getTaxResult.totalExempt;
				AVA_TotalTaxable   = getTaxResult.totalTaxable;
				AVA_TotalTax       = getTaxResult.totalTax;
				
				if(rec.getValue('tax2total') != null){
					AVA_GetCanadianResponseDetails(getTaxResult);
				}
				
				AVA_LogTaxResponse(rec, configCache, 'T', response, startTime);
				
				var customRec;
				if(rec.getValue('custpage_ava_headerid') != null && rec.getValue('custpage_ava_headerid').length > 0){
					customRec = record.load({
						type: 'customrecord_avataxheaderdetails',
						id: rec.getValue('custpage_ava_headerid')
					});
				}
				else{
					customRec = record.create({
						type: 'customrecord_avataxheaderdetails'
					});
				}
				
				AVA_UpdateHeaderRecord(rec, customRec);
				
				record.submitFields({
					type: rec.type,
					id: rec.id,
					values: {'custbody_ava_scis_trans_flag': false, 'custbody_avalara_status': 2}
				});
				
				log.debug({
					title: 'Record Processed',
					details: rec.id
				});
			}
			else{
				var severity, message;
				var errorDetails = getTaxResult.error.details;
				
				for(var i = 0; errorDetails != null && i < errorDetails.length; i++){
					message = errorDetails[i].message;
					severity = errorDetails[i].severity;
					break;
				}
				
				if(severity == null || severity == '' || severity == 'Error'){
					AVA_ErrorCode = message;
					
					if(message != null && message == 'Tax override cannot be applied.'){
						log.debug({
							title: 'Error Message',
							details: message
						});
						rec.save();
						log.debug({
							title: 'Record Processed',
							details: rec.id
						});
					}
					else{
						log.debug({
							title: 'Error Message',
							details: message
						});
						log.debug({
							title: 'Error',
							details: response.code
						});
						
						AVA_LogTaxResponse(rec, configCache, 'T');
						
						record.submitFields({
							type: rec.type,
							id: rec.id,
							values: {'custbody_ava_scis_trans_flag': false, 'custbody_avalara_status': 3}
						});
					}
				}
				else if(severity == 'Exception'){
					if(configCache.AVA_EnableLogEntries == '1'){
						ava_library.mainFunction('AVA_Logs', (configCache.AVA_AccountValue + '~~' + configCache.AVA_ServiceUrl + '~~' + AVA_LineCount + '~~' + 'GetTax' + '~~' + rec.id + '~~' + '' + '~~' + '' + '~~' + 'CreateOrAdjustTransaction' + '~~' + 'Debug' + '~~' + 'Error' + '~~' + rec.type + '~~' + 'AVA_ReadTaxResponse' + '~~' + 'GetTax Exeception - ' + message + '~~' + '' + '~~' + 0 + '~~' + rec.getValue('custpage_ava_taxcodestatus')));
					}
					
					AVA_ErrorCode = message;
					log.debug({
						title: 'Exception Message',
						details: message
					});
					log.debug({
						title: 'Exception',
						details: response.code
					});
					
					AVA_LogTaxResponse(rec, configCache, 'T');
					
					record.submitFields({
						type: rec.type,
						id: rec.id,
						values: {'custbody_ava_scis_trans_flag': false, 'custbody_avalara_status': 3}
					});
				}
			}
		}
		
		function AVA_Validation(value){
			if(value != 'null' && value != '' && value != undefined && value != 'NaN' && value != 'undefined' && value != '- None -'){
				return true;
			} 
			else{
				return false;
			}
		}
		
		return{
			AVA_TransactionBeforeLoad: AVA_TransactionBeforeLoad,
			AVA_TransactionBeforeSubmit: AVA_TransactionBeforeSubmit,
			AVA_TransactionAfterSubmit: AVA_TransactionAfterSubmit,
			AVA_TransactionPageInitEvent: AVA_TransactionPageInitEvent,
			AVA_TransactionFieldChangedEvent: AVA_TransactionFieldChangedEvent,
			AVA_TransactionSublistChangedEvent: AVA_TransactionSublistChangedEvent,
			AVA_TransactionSaveEvent: AVA_TransactionSaveEvent,
			AVA_CalculateTaxOnDemand: AVA_CalculateTaxOnDemand,
			AVA_DocumentStatus: AVA_DocumentStatus,
			AVA_AddLogsSubList: AVA_AddLogsSubList,
			AVA_LogTaxResponse: AVA_LogTaxResponse,
			AVA_CancelTax: AVA_CancelTax,
			AVA_RecordType: AVA_RecordType,
			AVA_GetAllLocations: AVA_GetAllLocations,
			AVA_GetAddresses: AVA_GetAddresses,
			AVA_CommitTransaction: AVA_CommitTransaction
		};
	}
);