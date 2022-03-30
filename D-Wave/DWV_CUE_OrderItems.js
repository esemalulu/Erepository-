/*
 ***********************************************************************
 *
 * The following JavaScript code is created by GURUS Solutions,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intended for NetSuite (www.netsuite.com) and uses the SuiteScript API.
 * The code is provided "as is": GURUS Solutions shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:		GURUS Solutions inc., www.gurussolutions.com
 *              	Cloud Consulting Pioneers
 * Author:		sarmad.nomani@gurussolutions.com
 * Date:		Jan 11, 2021 7:41:36 PM
 * File:		GRAD_CUE_ReceiveAllPurchaseOrders.js

 ***********************************************************************/
var vendorPicked;
var vendorFlag;
var manufacturerPicked;
var manufacturerFlag;
var line;


/**
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 */
define(['N/ui/message', 'N/url', 'N/currentRecord', 'N/search', 'N/log', 'N/ui/dialog'],
    function(messageModule, urlModule, currentRecordModule, searchModule, logModule, dialogModule) {
        vendorPicked = null;
        vendorFlag = false;
        manufacturerPicked = null;
        manufacturerFlag = false;

        var MAP_REDUCE_STATUS_PAGE_URL = 'https://1227068.app.netsuite.com/app/common/scripting/mapreducescriptstatus.nl?daterange=CUSTOM&datefrom=&dateto=&scripttype=691&primarykey=7989&jobstatefilterselect=&sortcol=dateCreated&sortdir=DESC&csv=HTML&OfficeXML=F&pdf=&size=50&_csrf=Ewd7WdOwJs7HLuO52smUxiv8NNlzTCeUcYLJEbEwGTv9AAUlJeRZiTgjsSdNJSNAi88eXyHiX3NUjFM_Dfyb4Q3tx7Wn03K_LbUUw7u2G0MM1e9Za103Z57cibdx7o0Wc4yHxB-J9we4YQgJQteEDSQ43oFkKfi7TWR47RzAS6o%3D&datemodi=WITHIN&date=CUSTOM&showall=F';

        //the suitelet this script is attached to
        var DWV_SSU_GENERATEPURCHASEORDERS_INTERNAL_ID = 'customscript_gs_orderitemsssu';
        var DWV_SSU_GENERATEPURCHASEORDERS_DEPLOYMENT_ID = 'customdeploy_gs_orderitemsssudeploy';

        /**
         * The following function will run on pageInit of GRAD_SSU_RECEIVEALLPURCHASEORDERS,
         * and will check to see if the hidden 'received POs' field is checked, and will display a message to the user accordingly.
         *
         * @author sarmad.nomani@gurussolutions.com
         * @return none
         * @governance 0
         */
        function pageInit_showSuccessMessage(context) {

            var dependantFields = ['custpage_gs_sublist_item_vendor',
                'custpage_gs_sublist_item_manufacturer',
                'custpage_gs_sublist_item_vendor_part',
                'custpage_gs_sublist_item_manufacturer_part',
                'custpage_gs_sublist_item_lead',
                'custpage_gs_sublist_item_moq',
                'custpage_gs_sublist_item_quantity_purchase',
                'custpage_gs_sublist_item_currency'
            ];

            var currentRecord = context.currentRecord; //current record is the suitelet in this case
            var lineCount = currentRecord.getLineCount('itemsublist');
            for (var k = 0; k < lineCount; k++) {
                for (var i = 0; i < dependantFields.length; i++) {
                    var temp2 = currentRecord.getSublistField({
                        sublistId: 'itemsublist',
                        fieldId: dependantFields[i],
                        line: k
                    })
                    temp2.isDisabled = true;
                }
            }

            var itemIds = currentRecord.getValue({
                fieldId: 'custpage_poids'
            });
          var suiteletKey = currentRecord.getValue({
                fieldId: 'custpage_suiteletkey'
            });
          console.log(itemIds)

            //Check to make sure that emaiSent is not null/empty and is set to one of the cases to be handled.
            if (itemIds != null && itemIds != '' && itemIds == 'TaskSubmittedSuccessfully') {
                var successMessage = messageModule.create({
                    title: 'Generated Purchase Orders',
                    message: 'Generating Purchase Orders. Check the status of the script <a href="' + MAP_REDUCE_STATUS_PAGE_URL + ' " target="_blank">here</a>. Once the other script has finished, click "Update Sublist" to see results. </br> If the script is taking too long, create a saved search on Purchase orders where "MRS Task ID" = '+suiteletKey+'.',
                    type: messageModule.Type.CONFIRMATION
                });

                successMessage.show();

            } else if (itemIds != null && itemIds != '' && itemIds == 'TaskSubmitionFailed') {
                var successMessage = messageModule.create({
                    title: 'Generating Purchase Orders Failed',
                    message: 'Purchase Orders failed to be generated. This is potentially due to the same script already running. Check the status of the script <a href="' + MAP_REDUCE_STATUS_PAGE_URL + ' ">here</a>, and try again once it has completed.',
                    type: messageModule.Type.ERROR
                });

                successMessage.show();

            } else if (itemIds != null && itemIds != '' && itemIds == 'NoItemsSelected') {
                var successMessage = messageModule.create({
                    title: 'No Purchase Orders Creared',
                    message: 'You must select at least one item to succesfully generate POs.',
                    type: messageModule.Type.WARNING
                });

                successMessage.show();

            }

        }

        /**
         * The following function will run when the update sublist button is pressed.
         * It will take in the new filter values, and will refresh the page so that the sublist can be regenerated with the correct filters.
         *
         * @author sarmad.nomani@gurussolutions.com
         * @return none
         * @governance 0
         */
        function filterSublist_reloadSuitelet() {

            //get all the vars that we need to pass back
            var currentRecord = currentRecordModule.get(); //current record is the suitelet in this case
            var vendor = currentRecord.getValue({fieldId: 'custpage_items_vendor'});
            var location = currentRecord.getValue({fieldId: 'custpage_items_location'});
            var subsidiary = currentRecord.getValue({fieldId: 'custpage_items_subsidiary'});
            var leadTime = currentRecord.getValue({fieldId: 'custpage_items_lead_time'});
            var startsWith = currentRecord.getValue({fieldId: 'custpage_items_starts_with'});
          	var taskID = currentRecord.getValue({fieldId: 'custpage_poids_page'});
            var suiteletKey = currentRecord.getValue({fieldId: 'custpage_suiteletkey'});

            //build url with params
            var suiteletURL = urlModule.resolveScript({
                scriptId: DWV_SSU_GENERATEPURCHASEORDERS_INTERNAL_ID,
                deploymentId: DWV_SSU_GENERATEPURCHASEORDERS_DEPLOYMENT_ID
            });

            suiteletURL += "&itemIds=" + '';
            suiteletURL += "&vendorField=" + vendor;
            suiteletURL += "&locationField=" + location;
            suiteletURL += "&subsidiaryField=" + subsidiary;
            suiteletURL += "&leadTimeField=" + leadTime;
            suiteletURL += "&startsWithField=" + startsWith;
          	suiteletURL += "&generatedPOsPage=" + taskID;
          	suiteletURL += "&suiteletKey=" + suiteletKey;

            window.ischanged = false; //this avoids popups asking 'do you want to leave page'
            window.location.href = suiteletURL; //redirect back to suitelet with params set

        }

        function fieldChange_autoPopulate(context) {
            var dependantFields = ['custpage_gs_sublist_item_vendor',
                'custpage_gs_sublist_item_vendor_part',
                'custpage_gs_sublist_item_manufacturer',
                'custpage_gs_sublist_item_manufacturer_part',
                'custpage_gs_sublist_item_lead',
                'custpage_gs_sublist_item_moq',
                'custpage_gs_sublist_item_price',
                'custpage_gs_sublist_item_currency'
            ];
            var customRecordFields = [
              	'custrecord_vendor_part',
                'custrecord_manufacturer',
                'custrecord_manufacture_part_no',
                'custrecord_tjinc_dwvpur_leadtime',
                'custrecord_tjinc_dwvpur_moq',
                'custrecord_price',
              	'custrecord_dw_vendor_currency'
              
            ];

            var currentRecord = context.currentRecord;
            var changedField = context.fieldId;
            var suiteletSublist = context.sublistId;
            var changedLine = context.line;
            line = changedLine;
			if (suiteletSublist == '' || suiteletSublist==null){
              return;
            }
            var currentLine = currentRecord.selectLine({sublistId: suiteletSublist, line: changedLine});
          
            var itemId = currentRecord.getSublistValue({
                sublistId: suiteletSublist,
                fieldId: 'custpage_gs_sublist_item_internal_id',
                line: changedLine
            });
            var vendorPart = currentRecord.getSublistValue({
                sublistId: suiteletSublist,
                fieldId: 'custpage_gs_sublist_item_vendor_part',
                line: changedLine
            });
            var vendor = currentRecord.getSublistValue({
                sublistId: suiteletSublist,
                fieldId: 'custpage_gs_sublist_item_vendor',
                line: changedLine
            });
            var currentLineMap = currentRecord.getSublistValue({
                sublistId: suiteletSublist,
                fieldId: 'custpage_gs_sublist_item_map',
                line: changedLine
            });

            if (currentLineMap != null && currentLineMap != '') {
                currentLineMap = JSON.parse(currentLineMap);
            }

            if (changedField == 'custpage_gs_sublist_item_dialogbox1') {
                if (currentLineMap == '' || currentLineMap == null) {
                    alert('There are no custom records associated with this item.');
                    currentRecord.setCurrentSublistValue({
                        sublistId: suiteletSublist,
                        fieldId: 'custpage_gs_sublist_item_dialogbox1',
                        value: false,
                        ignoreFieldChange: true
                    });
                    return;
                }

                var vendorObject = {};
                for (var k = 0; k < currentLineMap.length; k++) {
                    var v = currentLineMap[k].values.custrecord_tjinc_dwvpur_vendor[0].value;
                    var t = currentLineMap[k].values.custrecord_tjinc_dwvpur_vendor[0].text;
                    if (!vendorObject.hasOwnProperty(v)) {
                        vendorObject[v] = t;
                    }
                }

                var vendorButtons = [];
                var keys = Object.keys(vendorObject);
                for (var k = 0; k < Object.keys(vendorObject).length; k++) {
                    vendorButtons.push({
                        label: vendorObject[keys[k]],
                        value: keys[k]
                    })
                }
                var options = {
                    title: 'Available Vendors',
                    message: 'Please select a Vendor to continue.',
                    buttons: vendorButtons
                };

                function success(result) {

                    var recordFlag;
                    for (var k = 0; k < currentLineMap.length; k++) {
                        if (currentLineMap[k].values.custrecord_tjinc_dwvpur_vendor[0].value == result) {
                            recordFlag = k;
                            break;
                        }
                    }
                    var customRecordValues = [];
                    customRecordValues.push(currentLineMap[recordFlag].values.custrecord_tjinc_dwvpur_vendor[0].text);
					
                  	if (currentLineMap[recordFlag].values.custrecord_vendor_part != '' && currentLineMap[recordFlag].values.custrecord_vendor_part != null) {
                        customRecordValues.push(currentLineMap[recordFlag].values.custrecord_vendor_part);
                    } else {
                        customRecordValues.push('');
                    }
                  
                    if (currentLineMap[recordFlag].values.custrecord_manufacturer != '' && currentLineMap[recordFlag].values.custrecord_manufacturer != null) {
                        customRecordValues.push(currentLineMap[recordFlag].values.custrecord_manufacturer);
                    } else {
                        customRecordValues.push('');
                    }

                    if (currentLineMap[recordFlag].values.custrecord_manufacture_part_no != '' && currentLineMap[recordFlag].values.custrecord_manufacture_part_no != null) {
                        customRecordValues.push(currentLineMap[recordFlag].values.custrecord_manufacture_part_no);
                    } else {
                        customRecordValues.push('');
                    }

                    customRecordValues.push(currentLineMap[recordFlag].values.custrecord_tjinc_dwvpur_leadtime);
                    customRecordValues.push(currentLineMap[recordFlag].values.custrecord_tjinc_dwvpur_moq);
                    

                    if (currentLineMap[recordFlag].values.custrecord_price != '' && currentLineMap[recordFlag].values.custrecord_price != null) {
                        var tempPrice = parseFloat(currentLineMap[recordFlag].values.custrecord_price);
                        customRecordValues.push(tempPrice.toFixed(2));
                    }
					
                  	customRecordValues.push(currentLineMap[recordFlag].values.custrecord_dw_vendor_currency);
                  
                    for (var k = 0; k < customRecordValues.length; k++) {
                        currentRecord.setCurrentSublistValue({
                            sublistId: suiteletSublist,
                            fieldId: dependantFields[k],
                            value: customRecordValues[k],
                            ignoreFieldChange: true
                        });
                    }
                    currentRecord.commitLine({
                        sublistId: suiteletSublist
                    });

                    currentRecord.setCurrentSublistValue({
                        sublistId: suiteletSublist,
                        fieldId: 'custpage_gs_sublist_item_dialogbox1',
                        value: false,
                        ignoreFieldChange: true
                    });

                    return true;
                }

                function failure(reason) {
                    console.log('Failure: ' + reason)
                }
                if (vendorButtons.length != 0) {
                    if (vendorButtons[0] != '') {
                        dialogModule.create(options).then(success).catch(failure);
                    } else {
                        function success2(result) {
                            console.log('Success with value: ' + result)
                            nlapiFieldChanged('itemsublist', 'custpage_gs_sublist_item_dialogbox1', (line + 1), null);
                        }

                        function failure2(reason) {
                            console.log('Failure: ' + reason)
                        }

                        dialogModule.alert({
                            title: 'Custom Record Error',
                            message: 'There are no associated Vendors with this item. Press OK to continue'
                        }).then(success2).catch(failure2);
                    }
                }
                //dialogModule.create(options).then(success).catch(failure);
            } else if (changedField == 'custpage_gs_sublist_item_dialogbox2') {
                if (currentLineMap == '' || currentLineMap == null) {
                    alert('There are no custom records associated with this item.');
                    currentRecord.setCurrentSublistValue({
                        sublistId: suiteletSublist,
                        fieldId: 'custpage_gs_sublist_item_dialogbox2',
                        value: false,
                        ignoreFieldChange: true
                    });
                    return;
                }
				var vendor = currentRecord.getCurrentSublistValue({
                        sublistId: suiteletSublist,
                        fieldId: 'custpage_gs_sublist_item_vendor',
                        ignoreFieldChange: true
                    });
                var vendorPartObject = {};
                for (var k = 0; k < currentLineMap.length; k++) {
                    var v = currentLineMap[k].values.custrecord_vendor_part;
                  	var mapVendor = currentLineMap[k].values.custrecord_tjinc_dwvpur_vendor[0].text;
                    if (!vendorPartObject.hasOwnProperty(v) && mapVendor == vendor) {
                      if (v == '') {v = 'No Vendor Part Number';}
                        vendorPartObject[v] = v;
                    }
                }
                var vendorPartButtons = [];
                var keys = Object.keys(vendorPartObject);
                for (var k = 0; k < Object.keys(vendorPartObject).length; k++) {
                  if (vendorPartObject[keys[k]] == 'No Vendor Part Number'){
                    vendorPartButtons.push({
                        label: 'No Vendor Part Number',
                        value: ''
                    })
                  } else {
                    vendorPartButtons.push({
                        label: vendorPartObject[keys[k]],
                        value: keys[k]
                    })
                  }
                }
                var options = {
                    title: 'Available Vendor Part Numbers',
                    message: 'Please select a Vendor Part Number to continue.',
                    buttons: vendorPartButtons
                };

                function success(result) {
                    var vendorIndex = dependantFields.indexOf('custpage_gs_sublist_item_vendor');
                    dependantFields.splice(vendorIndex, 1);

                    var recordFlag;
                    for (var k = 0; k < currentLineMap.length; k++) {
                        if (currentLineMap[k].values.custrecord_vendor_part == result) {
                            recordFlag = k;
                            break;
                        }
                    }
                    var customRecordValues = [];
                  
                  	if (currentLineMap[recordFlag].values.custrecord_vendor_part != '' && currentLineMap[recordFlag].values.custrecord_vendor_part != null) {
                        customRecordValues.push(currentLineMap[recordFlag].values.custrecord_vendor_part);
                    } else {
                        customRecordValues.push('');
                    }

                    if (currentLineMap[recordFlag].values.custrecord_manufacturer != '' && currentLineMap[recordFlag].values.custrecord_manufacturer != null) {
                        customRecordValues.push(currentLineMap[recordFlag].values.custrecord_manufacturer);
                    } else {
                        customRecordValues.push('');
                    }

                    if (currentLineMap[recordFlag].values.custrecord_manufacture_part_no != '' && currentLineMap[recordFlag].values.custrecord_manufacture_part_no != null) {
                        customRecordValues.push(currentLineMap[recordFlag].values.custrecord_manufacture_part_no);
                    } else {
                        customRecordValues.push('');
                    }

                    customRecordValues.push(currentLineMap[recordFlag].values.custrecord_tjinc_dwvpur_leadtime);
                    customRecordValues.push(currentLineMap[recordFlag].values.custrecord_tjinc_dwvpur_moq);
                  
                    if (currentLineMap[recordFlag].values.custrecord_price != '' && currentLineMap[recordFlag].values.custrecord_price != null) {
                        var tempPrice = parseFloat(currentLineMap[recordFlag].values.custrecord_price);
                        customRecordValues.push(tempPrice.toFixed(2));
                    }
                  
                  customRecordValues.push(currentLineMap[recordFlag].values.custrecord_dw_vendor_currency);

                    for (var k = 0; k < customRecordValues.length; k++) {
                        currentRecord.setCurrentSublistValue({
                            sublistId: suiteletSublist,
                            fieldId: dependantFields[k],
                            value: customRecordValues[k],
                            ignoreFieldChange: true
                        });
                    }
                    currentRecord.commitLine({
                        sublistId: suiteletSublist
                    });

                    currentRecord.setCurrentSublistValue({
                        sublistId: suiteletSublist,
                        fieldId: 'custpage_gs_sublist_item_dialogbox2',
                        value: false,
                        ignoreFieldChange: true
                    });

                    return true;
                }

                function failure(reason) {
                    console.log('Failure: ' + reason)
                }

                if (vendorPartButtons.length != 0) {
                    if (vendorPartButtons.length != 1) {
                        dialogModule.create(options).then(success).catch(failure);
                    } else {
                        function success2(result) {
                            console.log('Success with value: ' + result)
                            nlapiFieldChanged('itemsublist', 'custpage_gs_sublist_item_map', (line + 1), null);
                        }

                        function failure2(reason) {
                            console.log('Failure: ' + reason)
                        }

                        dialogModule.alert({
                            title: 'Custom Record Error',
                            message: 'There are no different Vendor Part Numbers associated with this item. Press OK to continue'
                        }).then(success2).catch(failure2);
                    }
                }
            } else if (changedField == 'custpage_gs_sublist_order_item'){
              var vendorRequired = currentRecord.getCurrentSublistValue({
                        sublistId: suiteletSublist,
                        fieldId: 'custpage_gs_sublist_item_vendor',
                        ignoreFieldChange: true
                    });
              if (vendorRequired == '' || vendorRequired == null || vendorRequired == '- None -'){
              	function success(result) { 
                	currentRecord.setCurrentSublistValue({
                    	sublistId: suiteletSublist,
                    	fieldId: 'custpage_gs_sublist_order_item',
                    	value: false,
                    	ignoreFieldChange: true
                	});
                  currentRecord.commitLine({
                		sublistId: suiteletSublist
              		});
              	}
			  	function failure(reason) { console.log('Failure: ' + reason) }

			  	dialogModule.alert({
    					title: 'Vendor Error',
    					message: 'Items with no associated vendors cannot be selected for ordering. Click OK to continue.'
			  	}).then(success).catch(failure);
              } /*else if (currentLineMap == '' || currentLineMap == null){
              	function success(result) { 
                	currentRecord.setCurrentSublistValue({
                    	sublistId: suiteletSublist,
                    	fieldId: 'custpage_gs_sublist_order_item',
                    	value: false,
                    	ignoreFieldChange: true
                	});
              	}
			  	function failure(reason) { console.log('Failure: ' + reason) }

			  	dialogModule.alert({
    					title: 'Vendor Error',
    					message: 'Items with no associated Custom Records cannot be ordered. Click OK to continue.'
			  	}).then(success).catch(failure);
              }*/
              
            } else if (changedField == 'custpage_gs_sublist_item_map') {
                currentRecord.setCurrentSublistValue({
                    sublistId: suiteletSublist,
                    fieldId: 'custpage_gs_sublist_item_dialogbox2',
                    value: false,
                    ignoreFieldChange: true
                });
            } else if (changedField == 'custpage_gs_sublist_item_quantity') {
            	var conversionRate = currentRecord.getCurrentSublistValue({
                    sublistId: suiteletSublist,
                    fieldId: 'custpage_gs_sublist_item_conversion'
                });
            	var quantity = currentRecord.getCurrentSublistValue({
                        sublistId: suiteletSublist,
                        fieldId: 'custpage_gs_sublist_item_quantity'
                });
              
            	if (conversionRate != 0 && conversionRate != ''){
                  quantity = parseFloat(quantity*conversionRate).toFixed(4);
            	}
            		
            		currentRecord.setCurrentSublistValue({
                        sublistId: suiteletSublist,
                        fieldId: 'custpage_gs_sublist_item_quantity_purchase',
                        value: quantity,
                        ignoreFieldChange: true
                    });
              currentRecord.commitLine({
                sublistId: suiteletSublist
              });
            }
        }

        return {

            pageInit: pageInit_showSuccessMessage,
            filterSublist_reloadSuitelet: filterSublist_reloadSuitelet,
            fieldChanged: fieldChange_autoPopulate

        };
    });