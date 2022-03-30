/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2013     AnJoe
 *
 */

var ctx = nlapiGetContext();
var mapsBiManageUrl = nlapiResolveURL('SUITELET','customscript_ax_sl_mapsbi_mgr_mapping','customdeploy_ax_sl_mapsbi_mgr_map_dpl');
//7/21/2014 - Make sure internalid column is available on the saved search
//6/21/2016 - Removed since Any column in saved search can be RowID
//var hasInternalIdCol = false;

//reload suitelet to show details
function showModUi(_id) {
	window.ischanged = false;
	window.location = mapsBiManageUrl + '&custparam_mbimapid='+_id;
}

function syncDataNow(_id) {
	
	window.ischanged = false;
	window.location = mapsBiManageUrl + '&custparam_mbiaction=SyncData&custparam_mbimapid='+_id;
}

function deleteDataSet(_id, _dsid) {
	
	var deleteconfirm = confirm('This will delete all data included in the MapsBI Dataset, Related Dashboard and NetSuite reference. Do you wish to continue?');
	if (deleteconfirm) {
		window.ischanged = false;
		window.location = mapsBiManageUrl + '&custparam_mbiaction=DeleteDataSet&custparam_mbimapid='+_id+'&custparam_deldsid='+_dsid;
	}
	
}

function backtoMapList() {
	window.ischanged = false;
	window.location = mapsBiManageUrl;
}

function mbiMgrFieldChanged(type, name, linenum) {
	//custpage_chgmap
	if (name=='custpage_chgmap') {
		if (nlapiGetFieldValue(name)=='T') {
			//loop through each line and enable line select drop down
			for (var i=1; i <= nlapiGetLineItemCount('custpage_fldmapsl'); i++) {
				nlapiSetLineItemDisabled('custpage_fldmapsl', 'custpage_fldsl_mbitype', false, i);
				//nlapiSetLineItemDisabled('custpage_fldmapsl', 'custpage_fldsl_rowid', false, i);
			}
		} else {
			//loop through each line and enable line select drop down
			for (var i=1; i <= nlapiGetLineItemCount('custpage_fldmapsl'); i++) {
				nlapiSetLineItemDisabled('custpage_fldmapsl', 'custpage_fldsl_mbitype', true, i);
				//nlapiSetLineItemDisabled('custpage_fldmapsl', 'custpage_fldsl_rowid', true, i);
			}
		}
	}
	
	if (type == 'custpage_fldmapsl' && name == 'custpage_fldsl_rowid') {
		if (nlapiGetLineItemValue(type, name, linenum) == 'T') {
			nlapiSetFieldValue('custpage_chgmap','T');
		}
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
				//only allow anything other than DATE, TIME or TIMELINE
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
		alert('You MUST select Internal ID column as ROW Identifier.');
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