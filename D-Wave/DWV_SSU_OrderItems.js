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
 * Author:		david.whiteside@gurussolutions.com
 * Date:		Jan 6, 2021 9:49:02 AM
 * File:		GRAD_SSU_ReceivePurchaseOrders.js

 ***********************************************************************/
const DWV_SSU_ORDERITEMS = {};

DWV_SSU_ORDERITEMS.ITEM_SEARCH_ID = 874;
DWV_SSU_ORDERITEMS.ITEM_SEARCH_DEPLOYMENT = 'customsearch871';

//MRS information to generate POs
DWV_SSU_ORDERITEMS.MRS_SCRIPT_ID = 'customscript_gs_orderitemsmrs';
DWV_SSU_ORDERITEMS.MRS_SCRIPT_DEPLOYMENT = 'customdeploy_gs_orderitemsmrsdeploy';

//This scripts information
DWV_SSU_ORDERITEMS.SSU_SCRIPT_ID = 'customscript_gs_orderitemsssu';
DWV_SSU_ORDERITEMS.SSU_SCRIPT_DEPLOYMENT = 'customdeploy_gs_orderitemsssudeploy';

DWV_SSU_ORDERITEMS.CLIENTPATH = './DWV_CUE_OrderItems.js';
DWV_SSU_ORDERITEMS.ITEMFILTER = '';
DWV_SSU_ORDERITEMS.LEADFILTER = 0;
DWV_SSU_ORDERITEMS.TASKID = '';
DWV_SSU_ORDERITEMS.POKEY = '';

/**
 *@NApiVersion 2.0
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/log', 'N/task', 'N/search', 'N/redirect', 'N/url', './DWV_LIB_GeneralLibrary2.0','N/record'],
    function(uiModule, logModule, taskModule, searchModule, redirectModule, urlModule, generalLibraryModule, recordModule) {
        /**
         * This Suitelet will display a list of receivable purchase order records.
         * The user will be able to select and filter all purchase order records
         * Each line in the list will have a checkbox for the user to indicate whether or not they wish to receive that purchase order.
         * Upon submitting the form, an array of all transactions selected is sent to a map reduce script, which will transform all purchase order records to item receipts
         *
         * @author david.whiteside@gurussolutions.com
         * @param context : the context object
         * @goveranance 'GET' request: , 'POST' request: .
         */
        function onRequest(context) {

        	if (context.request.method == 'GET') {
            	var params = context.request.parameters;
              
              	if (params.generatedPOsPage != null && params.generatedPOsPage != ''){
              		var currentStatus = taskModule.checkStatus({taskId:params.generatedPOsPage});
                  
                  	if (currentStatus.status === 'COMPLETE'){
                  		var form = createSuiteletResults(context,params.suiteletKey);
                  		context.response.writePage(form);
                  	} else {
                  		var form = createSuiteletForm(context);
                  		context.response.writePage(form);
                  	}
                } else {
                	//Creates the form and adds the fields and sublist to the page. Governance:
                	var form = createSuiteletForm(context);
                	context.response.writePage(form);
                }

            } else if (context.request.method == 'POST') {
              
                //call function that will set up and call the map reduce script.
                var request = context.request;
                var itemIds = '';

                //get list of transactions selected.
                var itemsSelected = getSelectedItems(request, context);

                logModule.debug('selecteditems?', JSON.stringify(itemsSelected));

                if (itemsSelected != null && itemsSelected != '' && Object.keys(itemsSelected).length > 0) {

                    //Governance:
                    itemIds = generatePOScript(request, itemsSelected);

                } else {
                    //No transactions selected.
                    itemIds = "NoItemsSelected";
                }
                //redirect back to same suitelet with receivedPOs param set to true to show a success message
                redirectModule.toSuitelet({
                    scriptId: DWV_SSU_ORDERITEMS.SSU_SCRIPT_ID,
                    deploymentId: DWV_SSU_ORDERITEMS.SSU_SCRIPT_DEPLOYMENT,
                    parameters: {
                        generatedPOs: itemIds,
                      	generatedPOsPage: DWV_SSU_ORDERITEMS.TASKID,
                      	suiteletKey: DWV_SSU_ORDERITEMS.POKEY
                    }
                });
            }
        }
  
 		 function createSuiteletResults(context,key){
           	var form = uiModule.createForm({
                title: 'Generated Purchase Orders'
            });
           
           	var purchaseOrderSublist = form.addSublist({
                id: 'purchaseordersublist',
                type: uiModule.SublistType.LIST,
                label: 'Generated Purchase Orders'
            });
           	var orderItemField = purchaseOrderSublist.addField({
                id: 'custpage_gs_sublist_purchase_order',
                label: 'PO #',
                type: uiModule.FieldType.TEXT
            });
           
           var poIdList = searchMapReduceResults(key);
           
           for(var i=0;i<poIdList.length;i++){
             var currentInternalId = poIdList[i].getValue({name:'internalid'});
             var documentId = poIdList[i].getValue({name:'tranid'});
             
            var purchaseOrderUrl = urlModule.resolveRecord({
                        recordType: 'purchaseorder',
                        recordId: currentInternalId,
                        isEditMode: false
           	})
                        purchaseOrderSublist.setSublistValue({
                            id: 'custpage_gs_sublist_purchase_order',
                            line: i,
                            value: '<a href = ' + purchaseOrderUrl + ' target="_blank">' + documentId + '</a>'
                        });
           }
           return form;
         }

        /**
         * This function will be called on GET to create the form, link the client script to the form, and then call other functions
         * to create the body fields and to create and populate the sublist.
         *
         * @author david.whiteside@gurussolutions.com
         * @param {Object} context
         * @return {serverwidget.Form} form : the form created for the UI
         * @governance
         */
        function createSuiteletForm(context) {

            //Create the form.
            var form = uiModule.createForm({
                title: 'Order Items'
            });

            //Attach client script to form through script path.
            form.clientScriptModulePath = DWV_SSU_ORDERITEMS.CLIENTPATH;
          	var itemIds = searchOnPurchaseOrders(context,1);
            addBodyFieldsToForm(form, context,itemIds);
            createAndPopulateSublist(form, context,itemIds);

            return form;

        }

        /**
         * This function is called from the form creation function, and adds the body fields to the form and sets the field default values.
         *
         * @author david.whiteside@gurussolutions.com
         * @param {serverwidget.Form} form : the form created for the UI
         * @param {Object} context
         * @return none
         * @governance
         */
        function addBodyFieldsToForm(form, context,itemIds) {
            //Add body fields to form.
            var params = context.request.parameters;
          	
          	var locationList = createLocationSelect(itemIds);
          	var vendorList = createVendorSelect(itemIds);
          	//var subsidiaryList = createSubsidiarySelect(itemIds);
            logModule.debug({
                title: "params",
                details: params
            });

            var mainInformationFieldGroup = form.addFieldGroup({
                id: 'mainInformationFieldGroupId',
                label: 'Filters'
            });

            form.addButton({
                id: 'custpage_filter_sublist',
                label: 'Update Sublist',
                functionName: 'filterSublist_reloadSuitelet'
            });

            form.addSubmitButton({
                label: 'Generate Purchase Orders'
            });

            //vendor filter
            var vendorField = form.addField({
                id: 'custpage_items_vendor',
                type: uiModule.FieldType.SELECT,
                label: 'Vendors',
                container: 'mainInformationFieldGroupId'
            });
          vendorField.addSelectOption({value:'',text:''})
          	for(var k=0;k<vendorList.length;k++){
              vendorField.addSelectOption(vendorList[k])
            }

            if (params.vendorField != null && params.vendorField != '') {
                vendorField.defaultValue = params.vendorField;
            }

            vendorField.setHelpText({
                help: "This field will filter by vendor of the purchase order"
            });

            //location filter
            var locationField = form.addField({
                id: 'custpage_items_location',
                type: uiModule.FieldType.SELECT,
                label: 'Location',
                container: 'mainInformationFieldGroupId'
            });
          locationField.addSelectOption({value:'',text:''})
			for(var k=0;k<locationList.length;k++){
              locationField.addSelectOption(locationList[k])
            }
            if (params.locationField != null && params.locationField != '') {
                locationField.defaultValue = params.locationField;
            }

            locationField.setHelpText({
                help: "This field will filter by item location"
            });

            //Lead Time filter
            var leadTimeField = form.addField({
                id: 'custpage_items_lead_time',
                type: uiModule.FieldType.TEXT,
                label: 'Lead Time(days)',
                container: 'mainInformationFieldGroupId'
            });

            if (params.leadTimeField != null && params.leadTimeField != '') {
                leadTimeField.defaultValue = params.leadTimeField;
                DWV_SSU_ORDERITEMS.LEADFILTER = params.leadTimeField;
            }

            leadTimeField.setHelpText({
                help: "This field will filter by number of lead days, with the filter being less than or equal to the number entered."
            });

            var startsWithField = form.addField({
                id: 'custpage_items_starts_with',
                type: uiModule.FieldType.TEXT,
                source: 'customlist_gs_shipment_approver',
                label: 'Item Starts With',
                container: 'mainInformationFieldGroupId'
            });

            if (params.startsWithField != null && params.startsWithField != '') {
                startsWithField.defaultValue = params.startsWithField;
                DWV_SSU_ORDERITEMS.ITEMFILTER = params.startsWithField;
            }

            startsWithField.setHelpText({
                help: "This field will filter items by filtering out items that do not start with the entered characters."
            });

            //create a field that will remember if the page was submitted and map/reduce was called
            var generatedPOs = form.addField({
                id: 'custpage_poids',
                type: uiModule.FieldType.TEXT,
                label: 'Purchase Orders Received?',
                container: 'mainInformationFieldGroupId'
            });

            logModule.debug({
                title: "params.generatedPOs",
                details: params.generatedPOs
            });

            if (params.generatedPOs != null && params.generatedPOs != '') {
                generatedPOs.defaultValue = params.generatedPOs;
            }
            //hide the field from the user, they dont need to use this
            generatedPOs.updateDisplayType({
                displayType: uiModule.FieldDisplayType.HIDDEN
            });
          
          var generatedPOsPage = form.addField({
                id: 'custpage_poids_page',
                type: uiModule.FieldType.TEXT,
                label: 'Purchase Orders Received?',
                container: 'mainInformationFieldGroupId'
            });

            if (params.generatedPOsPage != null && params.generatedPOsPage != '') {
                generatedPOsPage.defaultValue = params.generatedPOsPage;
            }
            //hide the field from the user, they dont need to use this
            generatedPOsPage.updateDisplayType({
                displayType: uiModule.FieldDisplayType.HIDDEN
            });
          
          	var suiteletSubmitKey = form.addField({
                id: 'custpage_suiteletkey',
                type: uiModule.FieldType.TEXT,
                label: 'suiteletStuff',
                container: 'mainInformationFieldGroupId'
            });

            if (params.suiteletKey != null && params.suiteletKey != '') {
                suiteletSubmitKey.defaultValue = params.suiteletKey;
            }
            //hide the field from the user, they dont need to use this
            suiteletSubmitKey.updateDisplayType({
                displayType: uiModule.FieldDisplayType.HIDDEN
            });

        }

        /**
         * This function is called from the form creation function, and creates and populates the sublist of purchase orders.
         *
         * @author david.whiteside@gurussolutions.com
         * @param {serverwidget.Form} form : the form created for the UI
         * @param {Object} context
         * @return none
         * @governance
         */
        function createAndPopulateSublist(form, context,itemIds) {
            
            var leadTimeFilter = 1000;
            //create the sublist
            var itemSublist = form.addSublist({
                id: 'itemsublist',
                type: uiModule.SublistType.LIST,
                label: 'Items to Order'
            });
            itemSublist.addMarkAllButtons();

            //checkbox to send item to PO generation
            var orderItemField = itemSublist.addField({
                id: 'custpage_gs_sublist_order_item',
                label: 'Order Item',
                type: uiModule.FieldType.CHECKBOX
            });

            //this is used for the MRS, not for the actual display
            var internalIdSublistField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_internal_id',
                label: 'Internal ID',
                type: uiModule.FieldType.TEXT
            });
            internalIdSublistField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.HIDDEN
            });

            //begin adding required fields
            var itemIdField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_id',
                label: 'Item',
                type: uiModule.FieldType.TEXT //hyperlink? -> first column
            });

            var itemDescriptionField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_description',
                label: 'Description',
                type: uiModule.FieldType.TEXT //-> 6th column
            });

            var openVendorDialogField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_dialogbox1',
                label: 'Open Available Vendors',
                type: uiModule.FieldType.CHECKBOX //-> 6th column
            });

            var vendorField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_vendor',
                label: 'Vendor',
                type: uiModule.FieldType.TEXT
            }); 
            vendorField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });
			
          	var openVendorPartDialogField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_dialogbox2',
                label: 'Open Available Vendor Part Numbers',
                type: uiModule.FieldType.CHECKBOX //-> 6th column
            });
          	
            var vendorPartField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_vendor_part',
                label: 'Vendor Part #',
                type: uiModule.FieldType.TEXT 
            });
          	vendorPartField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });

            var manufacturerField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_manufacturer',
                label: 'Manufacturer',
                type: uiModule.FieldType.TEXT 
            });
            manufacturerField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });

            var manufacturerPartField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_manufacturer_part',
                label: 'Manufacturer Part #',
                type: uiModule.FieldType.TEXT 
            });
            manufacturerPartField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });

            var quantityField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_quantity',
                label: 'Quantity To Order (Stock Units)',
                type: uiModule.FieldType.FLOAT 
            });
            quantityField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });

            var uomField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_uom',
                label: 'Stock Units',
                type: uiModule.FieldType.TEXT 
            });
            
            var quantityFieldPurchaseUnit = itemSublist.addField({
                id: 'custpage_gs_sublist_item_quantity_purchase',
                label: 'Quantity To Order (Purchasing Units)',
                type: uiModule.FieldType.FLOAT 
            });
            quantityFieldPurchaseUnit.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });
            
            var purchasingUnitsField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_purchase_unit',
                label: 'Purchasing Units',
                type: uiModule.FieldType.TEXT 
            });

            var moqField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_moq',
                label: 'MOQ',
                type: uiModule.FieldType.INTEGER 
            });
            moqField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });

            var priceField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_price',
                label: 'Price',
                type: uiModule.FieldType.FLOAT 
            });
            priceField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });

            var currencyField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_currency',
                label: 'Currency',
                type: uiModule.FieldType.TEXT 
            });
            currencyField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });

            var leadTimeField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_lead',
                label: '# Lead Days',
                type: uiModule.FieldType.TEXT 
            });
            leadTimeField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.ENTRY
            });

            var backOrderField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_backorder',
                label: 'Quantity BackOrdered',
                type: uiModule.FieldType.FLOAT //9th column
            });

            var orderedField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_ordered',
                label: 'Quantity On Order',
                type: uiModule.FieldType.FLOAT //10th column
            });

            var reOrderField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_reorder',
                label: 'Reorder Point',
                type: uiModule.FieldType.FLOAT //11th column
            });

            var stockField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_stock',
                label: 'Preferred Stock Level',
                type: uiModule.FieldType.FLOAT //12th column
            });
          
          	var pendingApprovalField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_pending',
                label: 'Quantity Pending Approval (Stock Units)',
                type: uiModule.FieldType.FLOAT //12th column
            });

            var mapField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_map',
                label: 'Custom Record Map',
                type: uiModule.FieldType.TEXTAREA
            });

            mapField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.HIDDEN
            });

            var locationField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_location',
                label: 'Custom Record Map',
                type: uiModule.FieldType.TEXT
            });
            locationField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.HIDDEN
            });
            
            var conversionField = itemSublist.addField({
                id: 'custpage_gs_sublist_item_conversion',
                label: 'Conversion Rate',
                type: uiModule.FieldType.FLOAT
            });
            conversionField.updateDisplayType({
                displayType: uiModule.FieldDisplayType.HIDDEN
            });

            //Run saved search
            //var itemIds = searchOnPurchaseOrders(context); //Governance:

            //The second search will use a list of itemIds from the first search, so they are stored in an array to make a filter
            var itemIdList = [];
            for (var k = 0; k < itemIds.length; k++) {
                itemIdList.push(itemIds[k].getValue({
                    name: 'internalid',
                    summary: searchModule.Summary.GROUP
                }));
            }
            var itemCustomRecords = searchItemCustomRecords(itemIdList);
            var itemCustomRecordsMap = createMaps(itemCustomRecords);
          
            if (itemIds != null && itemIds.length > 0) {
				
              var lineEntry=0;
                for (var i = 0; i < itemIds.length; i++) {
                    //Get values
                    var currentInternalId = itemIds[i].getValue({
                        name: 'internalid',
                        summary: searchModule.Summary.GROUP
                    });

                    var itemName = itemIds[i].getValue({
                        name: 'itemid',
                        summary: searchModule.Summary.GROUP
                    });

                    //The suitelet utilizes a 1-many relationship between items and custom Records used for the creation of POs.
                    //This field on the suitlet hosts an object used as a dictionary for the item to all of its different custom records
                    var defaultFlag = 0;
                    if (itemCustomRecordsMap.hasOwnProperty(itemName)) {
                        for (var k = 0; k < itemCustomRecordsMap[itemName].length; k++) {
                        	//the fieldId here states the 'default' custom record to use, if there is any
                            if (itemCustomRecordsMap[itemName][k].getValue('custrecord155963581') == true) {
                                defaultFlag = k;
                                break;
                            }
                        }
                    } else if (typeof(defaultFlag) != 'number' && itemCustomRecordsMap.hasOwnProperty(itemName)){
                        defaultFlag = 0;
                    } else {
                      defaultFlag = '';
                    }
                    var itemUrl = urlModule.resolveRecord({
                        recordType: 'inventoryitem',
                        recordId: currentInternalId,
                        isEditMode: false
                    })

                    var itemDescription = itemIds[i].getValue({
                        name: 'salesdescription',
                        summary: searchModule.Summary.GROUP
                    });

                    var location = itemIds[i].getValue({
                        name: 'inventorylocation',
                        summary: searchModule.Summary.GROUP
                    });
					
                    var vendor;
                    if (typeof(defaultFlag) != 'number') {
                        vendor = null;
                    } else {
                        vendor = itemCustomRecordsMap[itemName][defaultFlag].getText({
                            name: 'custrecord_tjinc_dwvpur_vendor'
                        });
                        if (vendor == '' || vendor == null) {
                            vendor = itemIds[i].getText({
                                name: 'vendor',
                                summary: searchModule.Summary.GROUP
                            });
                        }
                    }

                    var manufacturer;
                    if (typeof(defaultFlag) != 'number') {
                        var manufacturer = '';
                    } else {
                        manufacturer = itemCustomRecordsMap[itemName][defaultFlag].getValue({
                            name: 'custrecord_manufacturer'
                        });
                    }

                    var vendorPartNumber;
                    if (typeof(defaultFlag) != 'number') {
                        var vendorPartNumber = '';
                    } else {
                        vendorPartNumber = itemCustomRecordsMap[itemName][defaultFlag].getValue({
                            name: 'custrecord_vendor_part'
                        });
                    }

                    var manufacturerPartNumber;
                    if (typeof(defaultFlag) != 'number') {
                        var manufacturerPartNumber = '';
                    } else {
                        manufacturerPartNumber = itemCustomRecordsMap[itemName][defaultFlag].getValue({
                            name: 'custrecord_manufacture_part_no'
                        });
                    }
					
                  var currency;
                  if (typeof(defaultFlag) != 'number') {
                        currency = itemIds[i].getValue({
                        name: 'formulatext',
                        summary: searchModule.Summary.GROUP
                    });
                    } else {
                        currency = itemCustomRecordsMap[itemName][defaultFlag].getValue({
                            name: 'custrecord_dw_vendor_currency'
                        });
                    }
                  if (currency == '' || currency == null){
                    if (vendor != '- None -' && vendor != null){
                    var vendorSearch = searchVendor(vendor);
                    var tempVendor = vendorSearch[0].getValue({
              			name: 'internalid'
            		});
                    var tempcurrency = searchModule.lookupFields({
    					type: searchModule.Type.VENDOR,
    					id: tempVendor,
    					columns: ['currency']
					});
                    currency = tempcurrency['currency'][0].text;
                    }
                  }

                    var leadTime;
                    if (typeof(defaultFlag) != 'number') {
                        leadTime = '';
                    } else {
                        leadTime = itemCustomRecordsMap[itemName][defaultFlag].getValue({
                            name: 'custrecord_tjinc_dwvpur_leadtime'
                        });
                    }

                    var moq;
                    if (typeof(defaultFlag) != 'number') {
                        moq = '';
                    } else {
                        moq = itemCustomRecordsMap[itemName][defaultFlag].getValue({
                            name: 'custrecord_tjinc_dwvpur_leadtime'
                        });
                    }

                    var price;
                    if (typeof(defaultFlag) != 'number') {
                        price = itemIds[i].getValue({
                            name: 'formulacurrency',
                            summary: searchModule.Summary.GROUP
                        });
                    } else {
                        price = itemCustomRecordsMap[itemName][defaultFlag].getValue({
                            name: 'custrecord_price'
                        });
                        if (price == '' || price == null) {
                            price = itemIds[i].getValue({
                                name: 'formulacurrency',
                                summary: searchModule.Summary.GROUP
                            });
                        }
                    }
                    price = parseFloat(price).toFixed(2);
                  if (price.toString() == 'NaN'){
                    price = '';
                  }

                    var uom = itemIds[i].getText({
                        name: 'stockunit',
                        summary: searchModule.Summary.GROUP
                    });
                    
                    var uomId = itemIds[i].getValue({
                        name: 'stockunit',
                        summary: searchModule.Summary.GROUP
                    });
                    
                    var purchaseUnit = itemIds[i].getText({
                        name: 'purchaseunit',
                        summary: searchModule.Summary.GROUP
                    });
                    
                    var purchaseUnitId = itemIds[i].getValue({
                        name: 'purchaseunit',
                        summary: searchModule.Summary.GROUP
                    });
                    
                    var unitTypeId = itemIds[i].getValue({
                        name: 'unitstype',
                        summary: searchModule.Summary.GROUP
                    });

                    var quantityAvailable = itemIds[i].getValue({
                        name: 'locationquantityavailable',
                        summary: searchModule.Summary.MAX
                    });
                    if (quantityAvailable != '' && quantityAvailable != null) {
                        quantityAvailable = parseFloat(quantityAvailable);
                        quantityAvailable.toFixed(0)
                    }

                    var quantityBackOrder = itemIds[i].getValue({
                        name: 'locationquantitybackordered',
                        summary: searchModule.Summary.MAX
                    });
                    if (quantityBackOrder != '' && quantityBackOrder != null) {
                        quantityBackOrder = parseFloat(quantityBackOrder);
                        quantityBackOrder.toFixed(0)
                    }

                    var quantityOnOrder = itemIds[i].getValue({
                        name: 'locationquantityonorder',
                        summary: searchModule.Summary.MAX
                    });
                    if (quantityOnOrder != '' && quantityOnOrder != null) {
                        quantityOnOrder = parseFloat(quantityOnOrder);
                        quantityOnOrder.toFixed(0)
                    }

                    var quantityReOrder = itemIds[i].getValue({
                        name: 'locationreorderpoint',
                        summary: searchModule.Summary.MAX
                    });
                    if (quantityReOrder != '' && quantityReOrder != null) {
                        quantityReOrder = parseFloat(quantityReOrder);
                        quantityReOrder.toFixed(0)
                    }

                    var quantityPreferred = itemIds[i].getValue({
                        name: 'locationpreferredstocklevel',
                        summary: searchModule.Summary.MAX
                    });
                    if (quantityPreferred != '' && quantityPreferred != null) {
                        quantityPreferred = parseFloat(quantityPreferred);
                        quantityPreferred.toFixed(0)
                    }

                    //this value needs further manipulation
                    var quantitySuggested = itemIds[i].getValue({
                        name: 'formulanumeric',
                        summary: searchModule.Summary.MAX
                    });
                    if (quantitySuggested != '' && quantitySuggested != null) {
                        quantitySuggested = parseFloat(quantitySuggested);
                        quantitySuggested.toFixed(0)
                    }

                    //WE HAVE A PROBLEM FOR THIS
                    var quantityApproved = itemIds[i].getValue({
                        name: 'formulanumeric',
                        summary: searchModule.Summary.SUM
                    });
                    if (quantityApproved != '' && quantityApproved != null) {
                        quantityApproved = parseFloat(quantityApproved);
                        quantityApproved.toFixed(4)
                    }
                  	
                    var conversionRate = 0;
                  	if (uomId != purchaseUnitId){
                      conversionRate = convertUnits(unitTypeId,purchaseUnitId,uomId);
                  	} 
                  	var quantity;
                  	var quantityPurchaseUnit;
                  	if (conversionRate != 0 && conversionRate != ''){
                      quantityApproved = parseFloat(quantityApproved/conversionRate).toFixed(4);
                      quantity = quantitySuggested - quantityApproved;
                      quantityPurchaseUnit = parseFloat(quantity*conversionRate).toFixed(4);
                    } else {
                      quantity = quantitySuggested - quantityApproved;
                      quantityPurchaseUnit = quantity;
                    }
                    
                    quantity = parseFloat(quantity).toFixed(0);
                  	if (quantity <= 0 ){
                  		continue;
                  	}
                  
                  	if (conversionRate != 0 && conversionRate != ''){
                      itemSublist.setSublistValue({
                			id: 'custpage_gs_sublist_item_conversion',
                			line: lineEntry,
                			value: conversionRate
            			});
                  	} 
                  	
                  	var itemNameFilter = itemName.substring(0,DWV_SSU_ORDERITEMS.ITEMFILTER.length);
                  
                  	if (leadTime != '') {
                        if (parseInt(leadTime,10) < parseInt(DWV_SSU_ORDERITEMS.LEADFILTER,10)) {
                            continue;
                        }
                    } 
                  	if (itemNameFilter != DWV_SSU_ORDERITEMS.ITEMFILTER){
                      continue;
                    }

                    if (currentInternalId != '' && currentInternalId != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_internal_id',
                            line: lineEntry,
                            value: currentInternalId
                        });
                    }

                    if (itemName != '' && itemName != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_id',
                            line: lineEntry,
                            value: "<a href = " + itemUrl + ">" + itemName + "</a>"
                        });
                    }

                    if (itemDescription != '' && itemDescription != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_description',
                            line: lineEntry,
                            value: itemDescription
                        });
                    }
                    if (vendor != '' && vendor != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_vendor',
                            line: lineEntry,
                            value: vendor
                        });
                    }
                  
                  	if (vendorPartNumber != '' && vendorPartNumber != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_vendor_part',
                            line: lineEntry,
                            value: vendorPartNumber
                        });
                    }

                    if (manufacturerPartNumber != '' && manufacturerPartNumber != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_manufacturer_part',
                            line: lineEntry,
                            value: manufacturerPartNumber
                        });
                    }

                    if (manufacturer != '' && manufacturer != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_manufacturer',
                            line: lineEntry,
                            value: manufacturer
                        });
                    }

                    if (currency != '' && currency != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_currency',
                            line: lineEntry,
                            value: currency
                        });
                    }

                    if (leadTime != '' && leadTime != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_lead',
                            line: lineEntry,
                            value: leadTime
                        });
                    }
                  
                  	if (uom != '' && uom != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_uom',
                            line: lineEntry,
                            value: uom
                        });
                    }
                  	
                  	if (purchaseUnit != '' && purchaseUnit != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_purchase_unit',
                            line: lineEntry,
                            value: purchaseUnit
                        });
                    }

                    if (moq != '' && moq != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_moq',
                            line: lineEntry,
                            value: moq
                        });
                    }

                    if (price != '' && price != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_price',
                            line: lineEntry,
                            value: price
                        });
                    }
                    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                    if (quantityApproved != '' && quantityApproved != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_pending',
                            line: lineEntry,
                            value: quantityApproved
                        });
                    }

                    if (quantityBackOrder != '' && quantityBackOrder != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_backorder',
                            line: lineEntry,
                            value: quantityBackOrder
                        });
                    }

                    if (quantityOnOrder != '' && quantityOnOrder != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_ordered',
                            line: lineEntry,
                            value: quantityOnOrder
                        });
                    }

                    if (quantityReOrder != '' && quantityReOrder != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_reorder',
                            line: lineEntry,
                            value: quantityReOrder
                        });
                    }

                    //preferred here is the preferred stock level
                    if (quantityPreferred != '' && quantityPreferred != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_stock',
                            line: lineEntry,
                            value: quantityPreferred
                        });
                    }

                    //THIS IS WHAT THEY ARE ORDERING
                    if (quantity != '' && quantity != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_quantity',
                            line: lineEntry,
                            value: quantity
                        });
                    }
                    
                    if (quantityPurchaseUnit != '' && quantityPurchaseUnit != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_quantity_purchase',
                            line: lineEntry,
                            value: quantityPurchaseUnit
                        });
                    }

                    if (typeof(defaultFlag) == 'number') {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_map',
                            line: lineEntry,
                            value: JSON.stringify(itemCustomRecordsMap[itemName])
                        });
                    }

                    if (location != '' && location != null) {
                        itemSublist.setSublistValue({
                            id: 'custpage_gs_sublist_item_location',
                            line: lineEntry,
                            value: location
                        });
                    }
                  lineEntry++;
                }
            }
        }

        /**
         * This function creates and runs a scripted search on transactions of type purchase order that have not been received
         *
         * @author sarmad.nomani@gurussolutions.com
         * @param {Object} context
         * @return {Array} purchaseOrders : search results for purchase orders meeting the filter criteria.
         * @governance 5 + 5R units (R is per 1000 records)
         */
        function searchOnPurchaseOrders(context,flag) {

            //load saved search
            var searchObject = searchModule.load({
                id: DWV_SSU_ORDERITEMS.ITEM_SEARCH_ID
            })

            var params = context.request.parameters;
            var filters = searchObject.filters;

            //if the parameter exists and is being passed in, add it to the filters.
            if (params.vendorField != null && params.vendorField != '') {
                filters.push(searchModule.createFilter({
                    name: 'vendor',
                    operator: searchModule.Operator.ANYOF,
                    values: params.vendorField
                }));
            }

            if (params.locationField != null && params.locationField != '') {
                filters.push(searchModule.createFilter({
                    name: 'location',
                    operator: searchModule.Operator.ANYOF,
                    values: params.locationField
                }));
            } else if (flag == 1){
              filters.push(searchModule.createFilter({
                    name: 'inventorylocation',
                    operator: searchModule.Operator.ANYOF,
                    values: 22
                }));
            }
            //Governance:
            //5 + 5R units (R is per 1000 records)
            var itemIds = generalLibraryModule.guruSearchRecord('inventoryitem', filters, searchObject.columns);

            return itemIds;

        }
  
  		function searchMapReduceResults(key) {
            var columns = [];
            columns.push(searchModule.createColumn({name: 'internalid'}));
            columns.push(searchModule.createColumn({name: 'tranid'}));

			var filters = [["type","anyof","PurchOrd"],"AND",["custbody_gs_mrstaskid","contains",key],"AND",["mainline","is","T"]];
			//5 + 5R units (R is per 1000 records)
            return generalLibraryModule.guruSearchRecord('transaction', filters, columns);
        }

        /**
         * This function creates and runs a scripted search on transactions of type purchase order that have not been received
         *
         * @author sarmad.nomani@gurussolutions.com
         * @param {Object} context
         * @return {Array} purchaseOrders : search results for purchase orders meeting the filter criteria.
         * @governance 5 + 5R units (R is per 1000 records)
         */
        function searchItemCustomRecords(idList) {
            var columns = [];
            columns.push(searchModule.createColumn({name: 'custrecord_tjinc_dwvpur_itemname',sort: searchModule.Sort.ASC}));
            columns.push(searchModule.createColumn({name: 'custrecord_price'}));
            columns.push(searchModule.createColumn({name: 'custrecord_manufacturer'}));
            columns.push(searchModule.createColumn({name: 'custrecord_manufacture_part_no'}));
            columns.push(searchModule.createColumn({name: 'custrecord_tjinc_dwvpur_vendor'}));
          	columns.push(searchModule.createColumn({name: 'custrecord_vendor_part'}));
            columns.push(searchModule.createColumn({name: 'custrecord_tjinc_dwvpur_leadtime'}));
            columns.push(searchModule.createColumn({name: 'custrecord_tjinc_dwvpur_vensub'})); //subsidiary
            columns.push(searchModule.createColumn({name: 'custrecord_tjinc_dwvpur_moq'}));
            columns.push(searchModule.createColumn({name: 'custrecord_dw_vendor_currency'}));
            columns.push(searchModule.createColumn({name: 'custrecord155963581'})); //might not actually need this value

            //create filters
            
            var filters = ["custrecord_tjinc_dwvpur_itemname", "anyof", idList];
            //5 + 5R units (R is per 1000 records)
            return generalLibraryModule.guruSearchRecord('customrecord_tjinc_dwvpur_vendorlead', filters, columns);
        }

        /**
         * This function takes in the serverRequest on 'POST' and identifies all transactions that were selected to be received, and returns them in an array.
         *
         * @author sarmad.nomani@gurussolutions.com
         * @param {http.ServerRequest} serverRequest : the 'POST' request
         * @return {Array} transactionsSelected : Array of transaction internal Id's of the purchase orders selected to be received.
         * @governance 0
         */
        function getSelectedItems(serverRequest, context) {
            logModule.debug('server', serverRequest);
            logModule.debug('context', context);
            // Create an array of accounts that had select Item selected
            var itemsSelected = {};
            var itemsCount = serverRequest.getLineCount({
                group: 'itemsublist'
            });

            var lineCheckboxValue;
            var lineVendor;
            var lineCurrency;
            var purchaseOrderKey;
            var customMap;

            if (itemsCount != null && itemsCount != '' && itemsCount > 0) {

                for (var j = 0; j < itemsCount; j++) {

                    lineCheckboxValue = serverRequest.getSublistValue({
                        group: 'itemsublist',
                        name: 'custpage_gs_sublist_order_item',
                        line: j
                    });
                    if (lineCheckboxValue != null && lineCheckboxValue != '' && lineCheckboxValue == 'T') {

                        lineVendor = serverRequest.getSublistValue({
                            group: 'itemsublist',
                            name: 'custpage_gs_sublist_item_vendor',
                            line: j
                        });

                        customMap = serverRequest.getSublistValue({
                            group: 'itemsublist',
                            name: 'custpage_gs_sublist_item_map',
                            line: j
                        });

                        lineVendor = retrieveVendorId(lineVendor, customMap);

                        lineCurrency = serverRequest.getSublistValue({
                            group: 'itemsublist',
                            name: 'custpage_gs_sublist_item_currency',
                            line: j
                        });

                        purchaseOrderKey = lineVendor + '___' + lineCurrency;

                        if (!itemsSelected.hasOwnProperty(purchaseOrderKey)) {
                            itemsSelected[purchaseOrderKey] = [];
                            itemsSelected[purchaseOrderKey].push(sendLineInformation(serverRequest, j));
                        } else {
                            itemsSelected[purchaseOrderKey].push(sendLineInformation(serverRequest, j));
                        }
                    }
                }
            }

            logModule.debug({
                title: "itemsSelected",
                details: itemsSelected
            });

            return itemsSelected;

        }

        /**
         * This function takes in the serverRequest on 'POST' and creates and submits the map-reduce script that will handle the transformations to Item Receipts.
         *
         * @author sarmad.nomani@gurussolutions.com
         * @param {http.ServerRequest} serverRequest : the 'POST' request
         * @param {Array} transactionsSelected : Array of transaction Id's selected.
         * @return {String} receivedPOsValue : returns a string to be used as a code for determining which message to show upon redirecting Suitelet.
         * @governance
         */
        function generatePOScript(serverRequest, itemsSelected) {
            var receivedItemsValue = '';

            try {
				var suiteletKey = new Date().getTime();
              DWV_SSU_ORDERITEMS.POKEY = suiteletKey.toString();
                // Map reduce script call.
                var mrsTask = taskModule.create({
                    taskType: taskModule.TaskType.MAP_REDUCE,
                    scriptId: DWV_SSU_ORDERITEMS.MRS_SCRIPT_ID,
                    //deploymentId: DWV_SSU_ORDERITEMS.MRS_SCRIPT_DEPLOYMENT,
                    params: {
                        custscript_gs_orderitems: itemsSelected,
                      	custscript_gs_suiteletkey: suiteletKey
                    }
                });
                var mrsTaskId = mrsTask.submit(); //20 units
              	DWV_SSU_ORDERITEMS.TASKID = mrsTaskId;
              logModule.debug('Purchase Order Unique Key',DWV_SSU_ORDERITEMS.POKEY)

                receivedItemsValue = "TaskSubmittedSuccessfully";

            } catch (errMsg) {

                receivedItemsValue = "TaskSubmitionFailed";

            }

            logModule.debug({
                title: "mrsTaskId",
                details: mrsTaskId
            });

            logModule.debug({
                title: "receivedItemsValue",
                details: receivedItemsValue
            });

            return receivedItemsValue;

        }

        /**
         * This function takes in the line to be passed into the object required by the MRS.
         *
         * @author david.whiteside@gurussolutions.com
         * @param {lineNumber} integer : the line number associated with the item to be included
         * @return {Object} returnLine : All fields of the sublist contained within an object, using the item internalID as the key
         * @governance 0
         */
        function sendLineInformation(serverRequest, lineNumber) {
            var fieldsToSend = ['custpage_gs_sublist_item_description',
                'custpage_gs_sublist_item_manufacturer',
                'custpage_gs_sublist_item_vendor_part',
                'custpage_gs_sublist_item_manufacturer_part',
                'custpage_gs_sublist_item_lead',
                'custpage_gs_sublist_item_quantity_purchase',
                'custpage_gs_sublist_item_price',
                'custpage_gs_sublist_item_uom',
                'custpage_gs_sublist_item_location'
            ]
            var returnLine = {};

            var itemId = serverRequest.getSublistValue({
                group: 'itemsublist',
                name: 'custpage_gs_sublist_item_internal_id',
                line: lineNumber
            });

            returnLine[itemId] = [];
            //the first field [0] can be skipped, as it will be the key for the object anyways
            for (var i = 0; i < fieldsToSend.length; i++) {
                returnLine[itemId].push(serverRequest.getSublistValue({
                    group: 'itemsublist',
                    name: fieldsToSend[i],
                    line: lineNumber
                }));
              if (i==5){
                logModule.debug('obj: '+itemId,JSON.stringify(returnLine[itemId]));
              }
            }
          logModule.debug('obj: '+itemId,JSON.stringify(returnLine[itemId]));
            return returnLine;
        }
        /**
         * This function creates a dictionary for the particular item; given the 1-many relationship between items and the custom records,
         * a dictionary is used to easily manipulate fields.
         *
         * @author david.whiteside@gurussolutions.com
         * @param {search Result} itemSearchResults : the search result of all custom records for items on the suitelet
         * @return {Object} returnObject : The dictionary of all items on the suitelet to the custom records.
         * @governance 0
         */
        function createMaps(itemSearchResults) {
            var returnObject = {};
            var itemName;

            for (var i = 0; i < itemSearchResults.length; i++) {
                itemName = itemSearchResults[i].getText('custrecord_tjinc_dwvpur_itemname');
                if (returnObject.hasOwnProperty(itemName)) {
                    returnObject[itemName].push(itemSearchResults[i])
                } else {
                    returnObject[itemName] = [];
                    returnObject[itemName].push(itemSearchResults[i])
                }
            }
            return returnObject;
        }
        /**
         * This function is used to retrieve the internalid of a vendor before PO creation
         *
         * @author david.whiteside@gurussolutions.com
         * @param {string} vendorName : the text representation of the name of a vendor
         * @return {Search Result} results : An object containing the vendor information
         * @governance 0
         */
        function retrieveVendorId(vendorName, customMap, context) {
            var vendorId;

            if (customMap == '' || customMap == null) {
                var results = searchVendor(vendorName);
          		if (results[0] != '' || results[0] != null){
            		vendor = results[0].getValue({
              		name: 'internalid'
            		});
          		}
              return vendor;
            }
            customMap = JSON.parse(customMap);
            for (var i = 0; i < customMap.length; i++) {
                if (customMap[i].values.custrecord_tjinc_dwvpur_vendor[0].text == vendorName) {
                    vendorId = customMap[i].values.custrecord_tjinc_dwvpur_vendor[0].value;
                    break;
                }
            }

            return vendorId;
        }
        
  		/**
         * This function is used to search for a vendors internalid using their Name as a filter
         *
         * @author david.whiteside@gurussolutions.com
         * @param {string} vendorName : the text representation of the name of a vendor
         * @return {Search Result} results : An object containing the vendor information
         * @governance 5 + 5R units (R is per 1000 records)
         */
  		function searchVendor(vendorName){
  			var columns = [];
  			columns.push(searchModule.createColumn({name: 'entityid', sort: searchModule.Sort.ASC}));
			columns.push(searchModule.createColumn({name: 'internalid'}));
			var filters;          
            filters = ['entityid','is',vendorName];
            //5 + 5R units (R is per 1000 records)
            var results = generalLibraryModule.guruSearchRecord('vendor', filters, columns);
            return results;
        }
  	  
  		/**
         * This function creates a unique list of locations that are available across all items on the suitelet
         *
         * @author david.whiteside@gurussolutions.com
         * @param {search Result} itemIds : the internal IDs of the items on the suitelet
         * @return {Object} result : An object containing the internalid and text values of the locations
         * @governance 0
         */
  		function createLocationSelect(itemIds){
          var result = [];
          var compare = [];
          var location;
          var locationLabel;
          var tempObj;
          for (var i=0;i<itemIds.length;i++){
            locationLabel = itemIds[i].getText({
              name: 'inventorylocation',
              summary: searchModule.Summary.GROUP
           	});
            location = itemIds[i].getValue({
              name: 'inventorylocation',
              summary: searchModule.Summary.GROUP
           	});
            if (compare.indexOf(location) == -1){
              result.push({value:location,text:locationLabel});
              compare.push(location);
            }
          }
          return result;
        }
  	  
  		/**
         * This function creates a unique list of vendors that are available across all items on the suitelet
         *
         * @author david.whiteside@gurussolutions.com
         * @param {search Result} itemIds : the internal IDs of the items on the suitelet
         * @return {Object} result : An object containing the internalid and text values of the vendors
         * @governance 5 + 5R units (R is per 1000 records)
         */
  		function createVendorSelect(itemIds){
  			var result = [];
  			var compare = [];
  			var vendor;
  			var vendorLabel;
          
  			var itemIdList = [];
  				for (var k = 0; k < itemIds.length; k++) {
  					itemIdList.push(itemIds[k].getValue({
  						name: 'internalid',
  						summary: searchModule.Summary.GROUP
  					}));
  				}
          
  			var columns = [];
			columns.push(searchModule.createColumn({name: 'vendor'}));
			var filters;          
           	filters = ['internalid','anyof',itemIdList];
          logModule.debug('ids?',itemIdList);
           	//5 + 5R units (R is per 1000 records)
           	var results = generalLibraryModule.guruSearchRecord('inventoryitem', filters, columns);
          
           	for (var i=0;i<results.length;i++){
           		vendorLabel = results[i].getText({
           			name: 'vendor'
           		});
           		vendor = results[i].getValue({
           			name: 'vendor'
           		});
           		if (vendor == null || vendor == ''){
           			continue;
           		}
           		if (compare.indexOf(vendor) == -1){
           			result.push({value: vendor, text: vendorLabel});
           			compare.push(vendor)
           		}
           	}
           	return result;
        }
  		
  		/**
         * This function cconverts the quantity to order field from stock unit to purchasing unit, in the case they are not the same.
         *
         * @author david.whiteside@gurussolutions.com
         * @param {search Result} itemIds : the internal IDs of the items on the suitelet
         * @return {Object} result : An object containing the internalid and text values of the vendors
         * @governance 5 + 5R units (R is per 1000 records)
         */
  		function convertUnits(unitType,purchaseUnit,uomId){
  			var unitList = recordModule.load({
  				type: recordModule.Type.UNITS_TYPE,
  				id: unitType
  			});
  			var unitListLineCount = unitList.getLineCount({sublistId:'uom'});
  			var unitInternalId;
  			var conversionRate1;
  			var conversionRate2;
  			
  			for (var i=0;i<unitListLineCount;i++){
  				unitInternalId = unitList.getSublistValue({
  					sublistId: 'uom',
  					fieldId: 'internalid',
  					line: i
  				});
  				if (unitInternalId == purchaseUnit){
  					conversionRate1 = unitList.getSublistValue({
  	  					sublistId: 'uom',
  	  					fieldId: 'conversionrate',
  	  					line: i
  	  				});
  				} else if (unitInternalId == uomId){
  					conversionRate2 = unitList.getSublistValue({
  	  					sublistId: 'uom',
  	  					fieldId: 'conversionrate',
  	  					line: i
  	  				});
  				}
  			}       
  			
  			return ((1/conversionRate1)*conversionRate2);
  		}

        return {
            onRequest: onRequest
        };
    });