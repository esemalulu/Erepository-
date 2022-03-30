/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Nov 2013     JSon
 *
 */

var ctx = nlapiGetContext();
var mapsBiCreateUrl = nlapiResolveURL('SUITELET','customscript_ax_sl_mapsbi_createds','customdeploy_ax_sl_mapsbi_createds_dpl');

//7/21/2014 - Make sure internalid column is available on the saved search
//6/21/2016 - Removed since RowID can be anything. Not Just Internal ID column
//var hasInternalIdCol = false;

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function mapsbiFieldChange(type, name, linenum){
 
	if (name == 'custpage_mbisearch' && nlapiGetFieldValue(name)) {
		window.ischanged = false;
		window.location = mapsBiCreateUrl + '&custparam_uistep=cs2&custpage_mbisearch='+nlapiGetFieldValue(name);;
	}
	
	//ONLY allow one column to be checked
	if (type=='custpage_fldmapsl' && name=='custpage_fldsl_rowid') {
	
		for (var i=1; i <= nlapiGetLineItemCount('custpage_fldmapsl'); i++) {
			
			if (linenum != i) {
			
				nlapiSetLineItemValue(type, name, i, 'F');
			}			
		}
	}
}


function onClickChangeSs() {
	window.ischanged = false;
	window.location = mapsBiCreateUrl + '&custparam_uistep=cs1&custpage_mbisearch='+nlapiGetFieldValue(name);;
}

function mapsbiOnPageInit() {
	
	for (var i=1; i <= nlapiGetLineItemCount('custpage_fldmapsl'); i++) {
		var fldtype = nlapiGetLineItemValue('custpage_fldmapsl','custpage_fldsl_type',i);
		var mapvalue = nlapiGetLineItemValue('custpage_fldmapsl','custpage_fldsl_mbitype',i);
		
		/**
		if (nlapiGetLineItemValue('custpage_fldmapsl','custpage_fldsl_name',i) == 'internalid') {
			hasInternalIdCol = true;
		}
		*/
		
		//alert(fldtype);
		//remove and repopulate list
		//alternate work around to manipulate static List Drop down field
		var fldDom = nlapiGetLineItemField('custpage_fldmapsl','custpage_fldsl_mbitype',i).uifield.parentElement;
		var ddObject = getDropdown(fldDom);
		ddObject.deleteAllOptions();
		ddObject.addOption('Do NOT Map','');
		//nlapiRemoveLineItemOption('custpage_fldmapsl','custpage_fldsl_mbitype', null);
		//nlapiInsertLineItemOption('custpage_fldmapsl', 'custpage_fldsl_mbitype', '', 'Do NOT Map', true);
		
		for(var mbit in mbitype) {
			
			if (fldtype=='date' || fldtype=='datetime') {
				
				//only allow DATE, TIME or TIMELINE
				if (mbitype[mbit]=='DATE' || mbitype[mbit]=='TIME' || mbitype[mbit]=='TIMELINE') {
					
					ddObject.addOption(mbitype[mbit],mbitype[mbit]);
				}
				
			} else {
				//only allow anything other than DATE, TIME or TIMELINE or ROWID
				if (mbitype[mbit]!='DATE' && mbitype[mbit]!='TIME' && mbitype[mbit]!='TIMELINE') {
					ddObject.addOption(mbitype[mbit],mbitype[mbit]);
				}				
			}						
		}
		ddObject.setValue(mapvalue);
	}
	
}

/**
 * Make sure LOCATION.COUNTRY or LOCATION.LATITUDE and LOCATION.LONGITUDE is selected 
 */

function mapsbiOnSave() {
	//loop through and make sure location field exists
	var isMbiCountry = false;
	var isMbiLat = false;
	var isMbiLng = false;
	
	//7/21/2014 - Require user to map Internal ID to be used as RowID.
	var hasRowId = false;
	
	/**
	if (!hasInternalIdCol) {
		alert('Saved Search must have Internal ID column that UNIQUELY identify each data row. Mapped saved search is missing Internal ID column');
		return false;
	}
	*/
	
	for (var i=1; i <= nlapiGetLineItemCount('custpage_fldmapsl'); i++) {
		var mappingValue = nlapiGetLineItemText('custpage_fldmapsl', 'custpage_fldsl_mbitype', i);
		
		if (nlapiGetLineItemValue('custpage_fldmapsl','custpage_fldsl_rowid',i)=='T') {
			hasRowId = true;
		}
		
		if (mappingValue) {
			
			//if Country is set, mark it as set
			if (!isMbiCountry && mappingValue == 'LOCATION.COUNTRY') {
				isMbiCountry = true;
			}
			
			//if Lat is set, mark it as set
			if (!isMbiLat && mappingValue == 'LOCATION.LATITUDE') {
				isMbiLat = true;
			}
			
			//if Lng is set, mark it as set
			if (!isMbiLng && mappingValue == 'LOCATION.LONGITUDE') {
				isMbiLng = true;
			}			
		}
	}
	
	//make sure ROWID is mapped to Internal ID column
	if (!hasRowId) {
		alert('You MUST select a column to be used as ROW Identifier.');
		return false;
	}
	
	//make sure location values are set
	if (!isMbiCountry && !isMbiLat && !isMbiLng) {
		alert('You Must provide Mapping for LOCATION.COUNTRY or LOCATION.LATITUDE and LOCATION.LONGITUDE');
		return false;
	}
	
	if (!isMbiCountry && ( (!isMbiLat && isMbiLng) || (isMbiLat && !isMbiLng) )) {
		alert('You Must provide Mapping for Both LOCATION.LATITUDE and LOCATION.LONGITUDE');
		return false;
	}
	
	return true;
}