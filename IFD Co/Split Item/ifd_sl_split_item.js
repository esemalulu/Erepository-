/**
 * Module Description
 * 
 /**
 * Copyright (c) 2015 IT Rationale, Inc (www.itrationale.com). All rights
 * reserved.
 * 
 * This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.*
 * 
  * Version     Date          Author      Remarks
 * 1.00                       ITR        Initial Development
 * 
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @author APH
 */
var PAGE_SIZE = 5;
var searchSublist;
var pageSublist;
var objSubtab;
define([
	'N/ui/serverWidget', 
	'N/log', 
	'N/runtime', 
	'N/task', 
	'N/url',
	'N/redirect',
	'N/record',
	'N/search',
	'N/format',
	'N/http' ],

	function(serverWidget, log, runtime, task, url, redirect, record,search,format,http){

		function onRequest(context) {
		try
		{
			var DEBUG_IDENTIFIER = 'onRequest';
			var request = context.request;
			var response = context.response;
			log.debug(DEBUG_IDENTIFIER, '---Start--- Request Method: '+context.request.method);
			
			//getting of script parameter values:
			var scriptObj = runtime.getCurrentScript();
			var itemSavedSearchFromParam = scriptObj.getParameter({
			name: 'custscript_ifd_param_itemsearch'
			});
			
			var subsidiaryFromParam = scriptObj.getParameter({
			name: 'custscript_ifd_param_subsidiary'
			});
			
			var adjustLocationFromParam = scriptObj.getParameter({
			name: 'custscript_ifd_param_adjlocation'
			});
			
			var accountFromParam = scriptObj.getParameter({
			name: 'custscript_ifd_param_account'
			});
			
			var adjCodeFromParam = scriptObj.getParameter({
			name: 'custscript_ifd_param_adjcode'
			});
			
			var memoFromParam = scriptObj.getParameter({
			name: 'custscript_ifd_param_memo'
			});
			var masterItemSearchFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_masteritemsearch'
				});
			var recInvAdj;
			
			log.debug(DEBUG_IDENTIFIER, 'itemSavedSearchFromParam: '+itemSavedSearchFromParam+' subsidiaryFromParam: '+subsidiaryFromParam+' adjustLocationFromParam: ' + adjustLocationFromParam + ' accountFromParam : '
					+ accountFromParam+' adjCodeFromParam: '+adjCodeFromParam+' memoFromParam: ' + memoFromParam + ' masterItemSearchFromParam: '+masterItemSearchFromParam);
			
			if (context.request.method == 'GET')
			{
				var form = serverWidget.createForm({
				title: 'Split Item',
				hideNavBar: false
				});
				
				var itemToSplit = form.addField({
				id: 'custpage_item_to_split',
				type: serverWidget.FieldType.SELECT,
				label: 'Master Item'
				});
				filterMasterItem(itemToSplit,masterItemSearchFromParam)
				itemToSplit.isMandatory = true;
				
				var casesToSplit = form.addField({
				id: 'custpage_cases_to_split',
				type: serverWidget.FieldType.INTEGER,
				label: 'Cases to Split'
				});
				casesToSplit.isMandatory = true;
				
				var submitButton = form.addSubmitButton({
						label : 'Submit'
					});	
				context.response.writePage(form);
			}
			if (context.request.method == 'POST')
			{
				var masterItemId = request.parameters.custpage_item_to_split;
				var casesToSplit = request.parameters.custpage_cases_to_split;
				var masterItemFldsArr = ['averagecost','custitem_ifd_split_item_link'];
				var splitItemItemFldsArr = ['custitem_ifd_splitconversion'];
				var lineAvailQuantity = parseInt(casesToSplit);
				var isAccumulated = false;
				
				log.debug(DEBUG_IDENTIFIER, 'masterItemId: '+masterItemId+' casesToSplit: '+casesToSplit+' lineAvailQuantity: ' + lineAvailQuantity);
				
				//validation for cases to split; should not be more than the quantity available of the preferred bin
				var itemSearch = search.load({
						id: itemSavedSearchFromParam
					});
				
				var internalIdFilter = search.createFilter({
				name: 'internalid',
				operator: search.Operator.IS,
				values: masterItemId
				});
				itemSearch.filters.push(internalIdFilter);
				
				var itemSearchResult = itemSearch.run().getRange({
	                start: 0,
	                end: 999
	                });
					
				var binTotalAvailQuantity = itemSearchResult[0].getValue({
					name: 'binonhandavail'
					});
				
				if(parseInt(casesToSplit) > parseInt(binTotalAvailQuantity))
				{
					var alertMsg = 'The total available quantity in preferred bin is '+binTotalAvailQuantity+' . <br>Please enter a cases to split value lower than or equal to '+binTotalAvailQuantity+'.';
					log.debug(DEBUG_IDENTIFIER, 'alertMsg: '+alertMsg);
					var form = serverWidget.createForm({
						title: 'Split Item',
						hideNavBar: false
						});
					/*form.addField({
						id: 'custpage_notification',
						type: serverWidget.FieldType.HELP,
						label: 'Failed to create an Inventory Adjustment record due to: '+alertMsg
						});*/
					var htmlInstruct = form.addField({
		                id: 'custpage_notification',
		                type: serverWidget.FieldType.INLINEHTML,
		                label: ' '
				          }).updateLayoutType({
				                 layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE  
				          }).updateBreakType({
				                 breakType: serverWidget.FieldBreakType.STARTROW
				          }).defaultValue = "<p style='font-size:14px; color:red'><b>Failed to create an Inventory Adjustment record due to: "+alertMsg+"</b></p><br>";
					
					var itemToSplit = form.addField({
						id: 'custpage_item_to_split',
						type: serverWidget.FieldType.SELECT,
						label: 'Master Item'
						});
						filterMasterItem(itemToSplit,masterItemSearchFromParam)
						itemToSplit.isMandatory = true;
						
						var casesToSplit = form.addField({
						id: 'custpage_cases_to_split',
						type: serverWidget.FieldType.INTEGER,
						label: 'Cases to Split'
						});
						casesToSplit.isMandatory = true;
						
						var submitButton = form.addSubmitButton({
								label : 'Submit'
						});
					
					context.response.writePage(form);
					return;
				}
				
				var masterItemFieldLookUp = search.lookupFields({
				type: 'item',
				id: masterItemId,
				columns: masterItemFldsArr
				});
				
				var splitItemId = masterItemFieldLookUp.custitem_ifd_split_item_link[0].value;
				var masterItemAverageCost = masterItemFieldLookUp.averagecost;
				log.debug(DEBUG_IDENTIFIER, 'binTotalAvailQuantity: '+binTotalAvailQuantity+' splitItemId: '+splitItemId+' masterItemAverageCost: ' + masterItemAverageCost);
				
				var splitItemFieldLookUp = search.lookupFields({
				type: 'item',
				id: splitItemId,
				columns: 'custitem_ifd_splitconversion'
				});
				
				var splitConversion = splitItemFieldLookUp.custitem_ifd_splitconversion;
				
				log.debug(DEBUG_IDENTIFIER, 'splitConversion : '+ splitConversion);
				
				recInvAdj = record.create({
				type: 'inventoryadjustment',
				isDynamic: true  
				});
				
				recInvAdj.setValue({
				fieldId:'subsidiary',
				value: subsidiaryFromParam
				});
				
				recInvAdj.setValue({
				fieldId:'adjlocation',
				value: adjustLocationFromParam
				});
				
				recInvAdj.setValue({
				fieldId:'account',
				value: accountFromParam
				});
				
				recInvAdj.setValue({
				fieldId:'custbody_ifd_adj_code',
				value: adjCodeFromParam
				});
				
				recInvAdj.setValue({
				fieldId:'memo',
				value: memoFromParam
				});			
	
				//creation of the master item row
				var masterItemAdjustQty = (parseInt(casesToSplit) * -1);
				log.debug(DEBUG_IDENTIFIER, 'masterItemAdjustQty: '+masterItemAdjustQty);
				
				recInvAdj.selectNewLine({
	            sublistId: 'inventory'
				});
				
				recInvAdj.setCurrentSublistValue({
	            sublistId: 'inventory',
	            fieldId: 'item',
	            value: masterItemId
				});
				
				recInvAdj.setCurrentSublistValue({
	            sublistId: 'inventory',
	            fieldId: 'adjustqtyby',
	            value: masterItemAdjustQty
				});
				
				recInvAdj.setCurrentSublistValue({
	            sublistId: 'inventory',
	            fieldId: 'location',
	            value: adjustLocationFromParam
				});
				
				//getting the most recent bin or serial or lot number									
				var binAvailQuantity = itemSearchResult[0].getValue({
				name: 'quantityavailable',
				join: 'inventorynumber'
				});		
				
				/*var subrecordInvDetail = recInvAdj.getCurrentSublistSubrecord({
	            sublistId: 'inventory',
	            fieldId: 'inventorydetail'
				});*/	
				
				for (var i = 0; i < itemSearchResult.length; i++) 
				{				
					var binNumber = itemSearchResult[i].getValue({
					name: 'binnumber'
					});
					
					var binId = itemSearchResult[i].getValue({
					name: 'internalid',
					join: 'binnumber'
					});
					
					var serialLotNumber = itemSearchResult[i].getValue({
					name: 'internalid',
					join: 'inventorynumber'
					});
					
					var expirationDate = itemSearchResult[i].getValue({
					name: 'expirationdate',
					join: 'inventorynumber'
					});
					
					var binAvailQuantity = itemSearchResult[i].getValue({
					name: 'quantityavailable',
					join: 'inventorynumber'
					});
					
					if(serialLotNumber == null || serialLotNumber == '')
						binAvailQuantity = binTotalAvailQuantity;
					
					log.debug(DEBUG_IDENTIFIER, 'binNumber: '+binNumber+' binId: '+binId+' serialLotNumber: ' + serialLotNumber + ' expirationDate : '
							+ expirationDate+' binAvailQuantity: '+binAvailQuantity+' lineAvailQuantity: '+lineAvailQuantity);
					
					var subrecordInvDetail = recInvAdj.getCurrentSublistSubrecord({
			            sublistId: 'inventory',
			            fieldId: 'inventorydetail'
						});
					
					if(isAccumulated == false && (binAvailQuantity > 0))
					{
						//if(parseInt(binTotalAvailQuantity) > 0)
						//{
							subrecordInvDetail.selectNewLine({
							sublistId: 'inventoryassignment'
							});
							
							subrecordInvDetail.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'issueinventorynumber',
							value: serialLotNumber
							});
						//Commented this out as the Script is creating the Inventory Adjustment in Dynamic Mode, no need to set the Bin Numbers
						try{
							subrecordInvDetail.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'binnumber',
							value: binId
							}); 
						}catch(err){
							
							log.debug(DEBUG_IDENTIFIER,'The item Lot Numbered Inventory Item, which has a preferred bin number. no need to set up the Bin Number Id. The script will continue');
						}
							
							/*subrecordInvDetail.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'expirationdate',
							value: expirationDate
							});*/
							
							if(parseInt(lineAvailQuantity) <= parseInt(binAvailQuantity))
							{
								subrecordInvDetail.setCurrentSublistValue({
								sublistId: 'inventoryassignment',
								fieldId: 'quantity',
								value: (lineAvailQuantity * -1)
								});
								isAccumulated = true;
								log.debug(DEBUG_IDENTIFIER, 'isAccumulated: '+isAccumulated+' lineAvailQuantity: '+lineAvailQuantity);
							}
							else if(parseInt(lineAvailQuantity) > parseInt(binAvailQuantity))
							{
								subrecordInvDetail.setCurrentSublistValue({
								sublistId: 'inventoryassignment',
								fieldId: 'quantity',
								value: (binAvailQuantity * -1)
								});
								lineAvailQuantity = (lineAvailQuantity - binAvailQuantity);
								if(lineAvailQuantity > 0)
								{
									isAccumulated = false;
								}
								else if(lineAvailQuantity <= 0)
								{
									isAccumulated = true;
								}
								log.debug(DEBUG_IDENTIFIER, 'isAccumulated: '+isAccumulated+' lineAvailQuantity: '+lineAvailQuantity);
							}
							
							subrecordInvDetail.commitLine({
								sublistId: 'inventoryassignment'
							});										
						}
					//}
				}
				
				recInvAdj.commitLine({
		            sublistId: 'inventory'
		        });
				
				//creation of split row
				//itemSearch.filters = null;
				var splitItemSearch = search.load({
					id: itemSavedSearchFromParam
				});
			
				var splitItemInternalIdFilter = search.createFilter({
				name: 'internalid',
				operator: search.Operator.IS,
				values: splitItemId
				});
				splitItemSearch.filters.push(splitItemInternalIdFilter);
				
				var splitItemSearchResult = splitItemSearch.run().getRange({
	            start: 0,
	            end: 999
	            });
				var splitItemAdjustQty = (parseInt(casesToSplit) * parseInt(splitConversion));
				var splitItemUnitCost = (parseFloat(masterItemAverageCost) / parseInt(splitConversion))*1;
				log.debug(DEBUG_IDENTIFIER, 'splitItemAdjustQty: '+splitItemAdjustQty+' splitItemSearchResult length: '+splitItemSearchResult.length+' splitItemUnitCost: '+splitItemUnitCost);
				
				recInvAdj.selectNewLine({
	            sublistId: 'inventory'
				});
				
				recInvAdj.setCurrentSublistValue({
	            sublistId: 'inventory',
	            fieldId: 'item',
	            value: splitItemId
				});
				
				recInvAdj.setCurrentSublistValue({
	            sublistId: 'inventory',
	            fieldId: 'adjustqtyby',
	            value: splitItemAdjustQty
				});
				
				recInvAdj.setCurrentSublistValue({
	            sublistId: 'inventory',
	            fieldId: 'unitcost',
	            value: splitItemUnitCost
				});
				
				recInvAdj.setCurrentSublistValue({
	            sublistId: 'inventory',
	            fieldId: 'location',
	            value: adjustLocationFromParam
				});
				
				//for (var i = 0; i < splitItemSearchResult.length; i++) 
				//{				
					var splitItemBinNumber = splitItemSearchResult[0].getValue({
					name: 'binnumber'
					});
					
					var splitItemBinId = splitItemSearchResult[0].getValue({
					name: 'internalid',
					join: 'binnumber'
					});
													
					/*var splitItemExpiration = splitItemSearchResult[0].getValue({
					name: 'expirationdate',
					join: 'inventorynumber'
					});*/
					
					log.debug(DEBUG_IDENTIFIER, 'splitItemBinNumber: '+splitItemBinNumber+' splitItemBinId: '+splitItemBinId);
					
					//if(isAccumulated == false)
					//{
					
						var subrecordInvDetail = recInvAdj.getCurrentSublistSubrecord({
			            sublistId: 'inventory',
			            fieldId: 'inventorydetail'
						});
					
						subrecordInvDetail.selectNewLine({
						sublistId: 'inventoryassignment'
						});
						
						subrecordInvDetail.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'binnumber',
						value: splitItemBinId
						});
						
						//subrecordInvDetail.setCurrentSublistValue({
						//sublistId: 'inventoryassignment',
						//fieldId: 'issueinventorynumber',
						//value: serialLotNumber
						//});
						
						/*subrecordInvDetail.setCurrentSublistValue({
						sublistId: 'inventoryassignment',
						fieldId: 'expirationdate',
						value: splitItemExpiration
						});*/
						
						//if(parseInt(lineAvailQuantity) <= parseInt(binAvailQuantity))
						//{
							subrecordInvDetail.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'quantity',
							value: splitItemAdjustQty
							});
							//isAccumulated = true;
						//}
						/*else if(parseInt(lineAvailQuantity) > parseInt(binAvailQuantity))
						//{
							subrecordInvDetail.setCurrentSublistValue({
							sublistId: 'inventoryassignment',
							fieldId: 'quantity',
							value: binAvailQuantity
							});
							lineAvailQuantity = (lineAvailQuantity - binAvailQuantity);
							if(lineAvailQuantity > 0)
							{
								isAccumulated = false;
							}
							else if(lineAvailQuantity <= 0)
							{
								isAccumulated = true;
							}
						}*/
						
						subrecordInvDetail.commitLine({
							sublistId: 'inventoryassignment'
						});
						
						recInvAdj.commitLine({
				            sublistId: 'inventory'
				        });
					//}					
						var recInvAdjID = recInvAdj.save({
							enableSourcing : true,
							ignoreMandatoryFields : true
							});
						if(recInvAdjID != null && recInvAdjID != '')
						{
							var invAdjustLookup = search.lookupFields({
								type: 'inventoryadjustment',
								id: recInvAdjID,
								columns: 'tranid'
								});
							var invAdjNumber = invAdjustLookup.tranid;
							log.debug(DEBUG_IDENTIFIER, 'Successfully created Inventory Adjustment record: '+invAdjNumber);
							var form = serverWidget.createForm({
								title: 'Split Item',
								hideNavBar: false
								});
							/*form.addField({
								id: 'custpage_notification',
								type: serverWidget.FieldType.HELP,
								label: 'Successfully created Inventory Adjustment: '+invAdjNumber
								});*/
							 var htmlInstruct = form.addField({
				                 id: 'custpage_notification',
				                 type: serverWidget.FieldType.INLINEHTML,
				                 label: ' '
						          }).updateLayoutType({
						                 layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE  
						          }).updateBreakType({
						                 breakType: serverWidget.FieldBreakType.STARTROW
						          }).defaultValue = "<p style='font-size:14px; color:green'><b>Successfully created Inventory Adjustment: "+invAdjNumber+"</b></p><br>";
							
							var itemToSplit = form.addField({
								id: 'custpage_item_to_split',
								type: serverWidget.FieldType.SELECT,
								label: 'Master Item'
								});
								filterMasterItem(itemToSplit,masterItemSearchFromParam)
								itemToSplit.isMandatory = true;
								
								var casesToSplit = form.addField({
								id: 'custpage_cases_to_split',
								type: serverWidget.FieldType.INTEGER,
								label: 'Cases to Split'
								});
								casesToSplit.isMandatory = true;
								
								var submitButton = form.addSubmitButton({
										label : 'Submit'
								});
							
							context.response.writePage(form);
						}
				}			
			//}					
		}
		catch (ex)
		{
			var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
			log.error('ERROR', 'Failed to create an Inventory Adjustment record due to: ' + ex.message);
			var form = serverWidget.createForm({
				title: 'Split Item',
				hideNavBar: false
				});
			/*form.addField({
				id: 'custpage_notification',
				type: serverWidget.FieldType.HELP,
				label: 'Failed to create an Inventory Adjustment record due to: ' + ex.message
				});*/
			var htmlInstruct = form.addField({
                id: 'custpage_notification',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
		          }).updateLayoutType({
		                 layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE  
		          }).updateBreakType({
		                 breakType: serverWidget.FieldBreakType.STARTROW
		          }).defaultValue = "<p style='font-size:14px; color:red'><b>Failed to create an Inventory Adjustment record due to: " + ex.message+"</b></p><br>";
			
			var itemToSplit = form.addField({
				id: 'custpage_item_to_split',
				type: serverWidget.FieldType.SELECT,
				label: 'Master Item'
				});
				filterMasterItem(itemToSplit,masterItemSearchFromParam)
				itemToSplit.isMandatory = true;
				
				var casesToSplit = form.addField({
				id: 'custpage_cases_to_split',
				type: serverWidget.FieldType.INTEGER,
				label: 'Cases to Split'
				});
				casesToSplit.isMandatory = true;
				
				var submitButton = form.addSubmitButton({
						label : 'Submit'
				});
			
			context.response.writePage(form);
		}
	}
		
		
		
		function filterMasterItem(masterItemFld,masterItemSearchFromParam)
		{
			masterItemFld.addSelectOption({
			    value : -1,
			    text : 'Select Master Item'
			});
			
			var masterItemSearch = search.load({
				id: masterItemSearchFromParam
			});
			
			masterItemSearch.run().each(function(result) {
				var itemIntId = result.getValue({
		            name: 'internalid'
		        });
		        var itemNumber = result.getValue({
		            name: 'itemid'
	        	});
		        var displayName = result.getValue({
		            name: 'displayname'
	        	});
		        var itemName = itemNumber + ' ' + displayName;
		        //log.debug('filterMasterItem', 'itemName: '+itemName);
		        masterItemFld.addSelectOption({
					    value: itemIntId,
					    text: itemName
					});
		        return true;
            });
		}
		return {
			onRequest : onRequest
		};
	});