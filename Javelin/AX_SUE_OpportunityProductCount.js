nlapiLogExecution("audit","FLOStart",new Date().getTime())
//GLOBAL VARIABLES
var ITEM_CATEGORY = 'custcol_item_topline_category';
var CAD_QUANTITY = 'custbody_swxitems';
var PDME_QUANTITY = 'custbody_pdmeitems';
var COMPOSER_QUANTITY = 'custbody_composer';
var SIM_QUANTITY = 'custbody_simulation';
var E3_QUANTITY = 'custbody_e3wwitems';
var RP_QUANTITY = 'custbody_rapidprototyping';
var SW_ELECTRICAL_QUANTITY = 'custbody_items_swxelectrical';
var PLASTICS_QUANTITY = 'custbody_plasticsitems';  // added plastics quantity field Feb 19th, 2014 [Gama]
var SW_INSPECTION_QUANTITY = 'custbody_sw_inspection';
var SW_MECHANICAL_CONCEPTUAL_QUANTITY = 'custbody_swmechanicalconceptual';
var SW_MBD_QUANTITY = 'custbody_swxmbd';
var PCB_QUANTITY = 'custbody_sw_pcb';		//Added Feb 1, 2017 by Audaxium [A.Villanueva]


// These are the ID's of the values in a custom list for TopLine Category (ID: customlisttoplinelist)
var CAD_CATEGORY = [1, 2, 3];
var SIM_CATEGORY = [4, 5, 6, 7, 29];  // removed plastics 16 & 17 Feb 19th, 2014 [Gama], Added Sim Std Nov 2014
var PDME_CATEGORY = [8];
var COMPOSER_CATEGORY = [9];
var E3_CATEGORY = [10];
var RP_CATEGORY = [11];
var SWELEC_CATEGORY =  [18, 19, 20];
var SW_PLASTICS_CATEGORY = [16, 17, 22];  // added plastics category 16 & 17 Feb 19th, 2014 [Gama]
var SW_INSPECTION_CATEGORY = [23, 24];
var SW_MECHANICAL_CONCEPTUAL_CATEGORY = [25, 26, 27];
var SW_MBD_CATEGORY = [31];
var PCB_CATEGORY = [35, 36];				//Added Feb 1, 2017 by Audaxium [A.Villanueva]



//hash table linking all item id name with the quantity factor link to it
var ITEM_EXCEPTION_ID  = new Object();
ITEM_EXCEPTION_ID[515] = 200;
ITEM_EXCEPTION_ID[516] = 100;
ITEM_EXCEPTION_ID[591] = 50;
ITEM_EXCEPTION_ID[597] = 25;

function beforeSubmit(type) {
	var currentContext = nlapiGetContext();
	if(currentContext.getExecutionContext() == 'userinterface') {
		if ( type == 'xedit' ) {
			// Skip, do not reset all values to zero
			// no items can be changed in online editing, so no quantities need to be re-evaluated
		} else if (type != 'delete'){
			var cadQty = 0;
			var simQty = 0;
			var pdmeQty = 0;
			var threedviaQty = 0;
			var e3wwQty = 0;
			var rpQty = 0;
			var swelectQty = 0;
			var swplasticsQty = 0;
			var swinspectionQty = 0;
			var swmechanicalconceptualQty = 0;
			var swmbdQty = 0;
			var pcbQty = 0;						//Added Feb 1, 2017 by Audaxium [A.Villanueva]
			
			var itemCount = nlapiGetLineItemCount('item');
			
			//loop on all item on the opportunity
			for (var i = 1; i <= itemCount; i++) {
				var itemId = '';
				var itemCategory = '';
				var itemQuantity = 0;
				
				//load the current line item id,category and quantity
				try{
					itemId = nlapiGetLineItemValue('item', 'item',i);
					itemCategory = nlapiGetLineItemValue('item', ITEM_CATEGORY,i);
					itemQuantity = nlapiGetLineItemValue('item', 'quantity',i);
				}
				catch(Error){
					nlapiLogExecution('error', 'ERROR',' in "try" to get the information on the line item , Caught ERROR: '+Error.message); 
				}
				
				//if the item has a category
				if(itemCategory != '' && itemCategory != null){
					
					//get the quantity factor
					var quantityFactor = getQuantityFactor(itemId);
					
					//add the quantity to the good category quantity total
					if(isCadCategory(itemCategory)){
						cadQty = cadQty + (quantityFactor * itemQuantity);
					}
					else if(isSimCategory(itemCategory)){
						simQty = simQty + (quantityFactor * itemQuantity);
					}
					else if(isPdmeCategory(itemCategory)){
						pdmeQty = pdmeQty + (quantityFactor * itemQuantity);
					}
					else if(isComposerCategory(itemCategory)){
						threedviaQty = threedviaQty + (quantityFactor * itemQuantity);
					}
					else if(ise3wwCategory(itemCategory)){
						e3wwQty = e3wwQty + (quantityFactor * itemQuantity);
					}
					else if(isRPCategory(itemCategory)){
						rpQty = rpQty + (quantityFactor * itemQuantity);
					}
					else if(isswelectCategory(itemCategory)){
						swelectQty = swelectQty + (quantityFactor * itemQuantity);
					}
					else if(isswplasticsCategory(itemCategory)){  // added Feb 19th, 2014 [Gama]
						swplasticsQty = swplasticsQty + (quantityFactor * itemQuantity);  // added Feb 19th, 2014 [Gama]
					}
					else if(isswinspectionCategory(itemCategory)){
						swinspectionQty = swinspectionQty + (quantityFactor * itemQuantity);
					}
					else if(isswmechanicalconceptualCategory(itemCategory)) {
						swmechanicalconceptualQty = swmechanicalconceptualQty + (quantityFactor * itemQuantity);
					}
					else if(isswmbdCategory(itemCategory)) {
						swmbdQty = swmbdQty + (quantityFactor * itemQuantity);
					}
					else if(isPCBCategory(itemCategory)){		//Added Feb 1, 2017 by Audaxium [A.Villanueva]
						pcbQty = pcbQty + (quantityFactor * itemQuantity);
					}
				}
			}
			
			//apply the quantity count to the record
			try{
				nlapiSetFieldValue(CAD_QUANTITY, cadQty);
				nlapiSetFieldValue(SIM_QUANTITY, simQty);
				nlapiSetFieldValue(PDME_QUANTITY, pdmeQty);
				nlapiSetFieldValue(COMPOSER_QUANTITY, threedviaQty);
				nlapiSetFieldValue(E3_QUANTITY, e3wwQty);
				nlapiSetFieldValue(RP_QUANTITY, rpQty);
				nlapiSetFieldValue(SW_ELECTRICAL_QUANTITY, swelectQty);
				nlapiSetFieldValue(PLASTICS_QUANTITY, swplasticsQty);  // added Feb 19th, 2014
				nlapiSetFieldValue(SW_INSPECTION_QUANTITY, swinspectionQty);
				nlapiSetFieldValue(SW_MECHANICAL_CONCEPTUAL_QUANTITY, swmechanicalconceptualQty);
				nlapiSetFieldValue(SW_MBD_QUANTITY, swmbdQty);
				nlapiSetFieldValue(PCB_QUANTITY, pcbQty);
			}
			catch(Error){
				nlapiLogExecution('error', 'ERROR',' in "try" to set the quantity count on the record, Caught ERROR: '+Error.message); 
			}
		}
	}
}

/**
* This function look if an item is in the exception list
* if yes: the quantity factor is return from the item exception list
* if no: the quantity factor is 1
* @param item: the item id
* @return quantityFactor= the factor to multiplied to the quantity
*/
function getQuantityFactor(item){
	var quantityFactor = 1;
	var itemFactor = ITEM_EXCEPTION_ID[item];
	
	if(itemFactor != '' && itemFactor != null){
		quantityFactor = itemFactor;
	}
	return quantityFactor;
}

/**
* This function look if the item is part of the CAD category
* @param item: the item toplist category
* @return isCadCategory= boolean true or false
*/
function isCadCategory(itemCategory){
	var isCadCategory = false;
	
	for(var i = 0; i < CAD_CATEGORY.length; i++){
		
		if(itemCategory == CAD_CATEGORY[i]){
			
			isCadCategory = true;
		}
	}
	return isCadCategory;
}

/**
* This function look if the item is part of the SIMULATION category
* @param item: the item toplist category
* @return isSimCategory= boolean true or false
*/
function isSimCategory(itemCategory){
	var isSimCategory = false;
	
	for(var i = 0; i < SIM_CATEGORY.length; i++){
		
		if(itemCategory == SIM_CATEGORY[i]){
			
			isSimCategory = true;
		}
	}
	return isSimCategory;
}

/**
* This function look if the item is part of the PDME category
* @param item: the item toplist category
* @return isPdmeCategory= boolean true or false
*/
function isPdmeCategory(itemCategory){
	var isPdmeCategory = false;
	
	for(var i = 0; i < PDME_CATEGORY.length; i++){
		
		if(itemCategory == PDME_CATEGORY[i]){
			
			isPdmeCategory = true;
		}
	}
	return isPdmeCategory;
}

/**
* This function look if the item is part of the Composer category
* @param item: the item toplist category
* @return isComposerCategory= boolean true or false
*/
function isComposerCategory(itemCategory){
	var isComposerCategory = false;
	
	for(var i = 0; i < COMPOSER_CATEGORY.length; i++){
		
		if(itemCategory == COMPOSER_CATEGORY[i]){
			
			isComposerCategory = true;
		}
	}
	return isComposerCategory;
}
/**
* This function look if the item is part of the E3WW category
* @param item: the item toplist category
* @return ise3wwCategory= boolean true or false
*/
function ise3wwCategory(itemCategory){
	var ise3wwCategory = false;
	
	for(var i=0; i < E3_CATEGORY.length; i++){
		
		if(itemCategory == E3_CATEGORY[i]){
			
			ise3wwCategory = true;
		}
	}
	return ise3wwCategory;
}
/**
* This function look if the item is part of the Composer category
* @param item: the item toplist category
* @return isRPCategory= boolean true or false
*/
function isRPCategory(itemCategory){
	var isRPCategory = false;
	
	for(var i = 0; i < RP_CATEGORY.length; i++){
		
		if(itemCategory == RP_CATEGORY[i]){
			
			isRPCategory = true;
		}
	}
	return isRPCategory;
}
/**
* This function look if the item is part of the Composer category
* @param item: the item toplist category
* @return isswelectCategory= boolean true or false
*/
function isswelectCategory(itemCategory){
	var isswelectCategory = false;
	
	for(var i = 0; i < SWELEC_CATEGORY.length; i++){
		
		if(itemCategory == SWELEC_CATEGORY[i]){
			
			isswelectCategory = true;
		}
	}
	return isswelectCategory;
}



function isswplasticsCategory(itemCategory){  // added this section Feb 19, 2014
	var isswplasticsCategory = false;
	
	for(var i = 0; i < SW_PLASTICS_CATEGORY.length; i++){
		
		if(itemCategory == SW_PLASTICS_CATEGORY[i]){
			
			isswplasticsCategory = true;
		}
	}
	return isswplasticsCategory;
}

function isswinspectionCategory(itemCategory) {
	var isswinspectionCategory = false;
	
	for(var i = 0; i < SW_INSPECTION_CATEGORY.length; i++){
		
		if(itemCategory == SW_INSPECTION_CATEGORY[i]){
			
			isswinspectionCategory = true;
		}
	}
	return isswinspectionCategory;
}

function isswmechanicalconceptualCategory(itemCategory) {
	var isswmechanicalconceptualCategory = false;
	
	for(var i = 0; i < SW_MECHANICAL_CONCEPTUAL_CATEGORY.length; i++){
		
		if(itemCategory == SW_MECHANICAL_CONCEPTUAL_CATEGORY[i]){
			
			isswmechanicalconceptualCategory = true;
		}
	}
	return isswmechanicalconceptualCategory;
}

function isswmbdCategory(itemCategory) {
	var isswmbdCategory = false;	//Added Feb 1, 2017 by Audaxium [A.Villanueva]: to differentiate the local variable from the function; the same function and variable names causes a bug

	for(var i = 0; i < SW_MBD_CATEGORY.length; i++){
		
		if(itemCategory == SW_MBD_CATEGORY[i]){
			
			isswmbdCategory = true;
		}
	}
	return isswmbdCategory;
}

//Added Feb 1, 2017 by Audaxium [A.Villanueva]
function isPCBCategory(itemCategory){
	
	for(var i = 0; i < PCB_CATEGORY.length; i++){
		
		if(itemCategory == PCB_CATEGORY[i]){
			
			return true;
		}
	}
	return false;
}

//