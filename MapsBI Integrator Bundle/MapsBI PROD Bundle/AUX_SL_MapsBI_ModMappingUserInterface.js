/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2013     AnJoe
 *
 */

var ctx = nlapiGetContext();
var paramMapsBiCred = ctx.getSetting('SCRIPT','custscript_mapsbi_cred');

var nsform = nlapiCreateForm('MapsBI Mapping Manager', false);

var mbitype = new Array();

var mbiMapId = '';
var reqStatusMsg = '';
//Actions:
//SyncData
var mbiAction = '';

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function auxMapsBiManageMapping(req, res){

	nsform.setScript('customscript_ax_cs_mapsbi_mgrmap_help');
	
	if (req.getParameter('custparam_statusmsg')) {
		reqStatusMsg = req.getParameter('custparam_statusmsg');
	}
	
	if (req.getParameter('custparam_mbimapid')) {
		mbiMapId = req.getParameter('custparam_mbimapid');
	}
	
	if (req.getParameter('custparam_mbiaction')) {
		mbiAction = req.getParameter('custparam_mbiaction');
	}
	
	//Error or Status Messages
	var statusfld = nsform.addField('custpage_statusfld','inlinehtml','');
	statusfld.setLayoutType('outsideabove', 'startrow');
	//check to make sure MapsBi Cred record is provided.
	if (!paramMapsBiCred) {
		statusfld.setDefaultValue('<b>API Credentials for MapsBI is not set. </b>'+
								  '<ul>'+
								  '<li>Create/Validate MapsBI credential record in <b><i>External Service Cred Manager</i></b> Custom Record</li>'+
								  '<li>Set/Validate <b><i>MapsBI Credential</i></b> is set under <i>Setup > Company > General Preferences > MapsBI Integration or Custom Preferences</i> subtab</li>'+
								  '</ul>'
								 );
	} else {
		
		if (reqStatusMsg) {
			statusfld.setDefaultValue('<span style="color: green; font-weight: bold"><br/>'+reqStatusMsg+'<br/><br/></span>');
		}
		
		try {
			var redirectParam = new Object;
			//Get API key
			var mbiApiKey = nlapiLookupField('customrecord_aux_ext_serv_cred_mgr', paramMapsBiCred, 'custrecord_aux_escm_access_api_key', false);
			
			if (!mbiApiKey) {
				throw nlapiCreateError('MBIAPIMISS_0030', 'Error Missing MapsBI API Key: '+ctx.getDeploymentId()+': Please make sure MapsBI API Key is set.', false);
			}
			
			/*********************************************************/
			//Handles Adhoc DataSyncing Action
			if (mbiAction=='SyncData') {
				try {
					var sctId = getUploaderScriptId('scriptid');
					var dplId = nlapiLookupField('customrecord_axmbi_ss_ds_map', mbiMapId, 'custrecord_axmbi_ssds_dplsctid', false);
					
					var param = new Object();
					param['custscript_syncmapid'] = mbiMapId;
					//adhoc schedule to Sync Data for this mapping
					var syncstatus = nlapiScheduleScript(sctId, dplId, param);
					//update mapId Sync Status
					var supdfld = new Array(), supdval = new Array();
					supdfld.push('custrecord_axmbi_ssds_syncstatus');
					supdval.push(syncstatus);
					supdfld.push('custrecord_axmbi_ssds_synclog');
					supdval.push('Ad-Hoc Data Sync In Progress');
					nlapiSubmitField('customrecord_axmbi_ss_ds_map', mbiMapId, supdfld, supdval, true);
					
					//update status
						
					redirectParam['custparam_statusmsg'] = 'Successfully Queued Sync Process for Mapped Record ID '+mbiMapId;
					nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
										ctx.getDeploymentId(), false, redirectParam);
				} catch (syncscherr) {
					redirectParam['custparam_statusmsg'] = 'Failed to Queue up Sync Process for Mapped Record ID '+mbiMapId+': '+getErrText(syncscherr);
					nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
										ctx.getDeploymentId(), false, redirectParam);
				}
				//Redirect to LIST page
				return;
			}
			/*********************************************************/
			
			/*********************************************************/
			//Handles Delete DataSet Action
			if (mbiAction=='DeleteDataSet') {
				try {
					var sctId = getUploaderScriptId('scriptid');
					var dplId = nlapiLookupField('customrecord_axmbi_ss_ds_map', mbiMapId, 'custrecord_axmbi_ssds_dplsctid', false);
					var deleteDataSetId = req.getParameter('custparam_deldsid');
					//1. Delete all columns first
					//Send in empty DatasetData
					//<DatasetData xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api"></DatasetData>
					//var delDsXml = '<DatasetData xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api"></DatasetData>';
					//https://mapsbi.com/services/Api/DeleteAllDatasetColumns?apiKey={APIKEY}&output=xml&datasetId={DATASET_ID}&deleteAll={deleteAll} 
					//Use 1.5 API to delete all columns
					//3/3/2016 - Api End point change and defintion change
					var delDsXml = '<DeleteDatasetModel>'+
								   '<IgnoreDashboards>true</IgnoreDashboards>'+
								   '</DeleteDatasetModel>';
					
					var delDsUrl = 'https://mapsbi.com/api/Datasets/'+deleteDataSetId+
								   '?apikey='+mbiApiKey; 
	
					log('debug','delDsUrl', delDsUrl);
					
					var deleteDsRes = nlapiRequestURL(delDsUrl, delDsXml);
					
					log('debug','Delete Dataset Response',deleteDsRes.getCode()+' // '+deleteDsRes.getBody());
					
					if (deleteDsRes.getCode()=='200') {
						//Delete Data Set NS Record
						nlapiDeleteRecord('customrecord_axmbi_ss_ds_map', mbiMapId);
						log('debug','NS Dataset deleted','ns delete success');
						
						if (dplId) {
							//Delete Script deployment
							nlapiDeleteRecord('scriptdeployment', dplId);
							log('debug','NS Deployment Deleted','Deleted Deployment record id');
						}
						
						//nlapiSubmitField('customrecord_axmbi_ss_ds_map', mbiMapId, supdfld, supdval, true);
						
						//update status
							
						redirectParam['custparam_statusmsg'] = 'Successfully Deleted Dataset and Mapped Record ID '+mbiMapId;
						
					} else {
						redirectParam['custparam_statusmsg'] = 'Failed to Delete Dataset and Mapped Record ID '+mbiMapId;
					}
					
				} catch (syncscherr) {
					redirectParam['custparam_statusmsg'] = 'Failed to Delete Dataset and Mapped Record ID '+mbiMapId+': '+getErrText(syncscherr);
					nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
										ctx.getDeploymentId(), false, redirectParam);
				}
				//Redirect to LIST page
				nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
						ctx.getDeploymentId(), false, redirectParam);
				return;
			}
			/*********************************************************/
			
			/******************************* Save PROCESS *******************************************/
			//PROCESS user request to update Dataset
			if (req.getMethod() == 'POST') {
				
				//1. If Deployment is not available, Create it NOW for this mapping
				var mapId = req.getParameter('custpage_mapid');
				var dplId = req.getParameter('custpage_syncdplid');
				var dplSctId = req.getParameter('custpage_syncdplsctid');
				var datasetId = req.getParameter('custpage_dsid');
				var sctId = getUploaderScriptId('internalid');
				var interval = req.getParameter('custpage_syncfld');
				
				//Recreate Mapping in Maps BI
				if (req.getParameter('custpage_chgmap')=='T') {
					
					var arMbiCols = req.getParameter('custpage_mapbicols').split('|');
					
					//<DatasetData xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api"></DatasetData>
					var delXml = '<DatasetData"></DatasetData>';
					
					//9/26/2014 - Correction Provided by MapsBI
					//0. Delete the data values first. https://mapsbi.com/services/Api/DeleteAllDataRows?apiKey={APIKEY}&output=xml&datasetId={DATASET_ID}
					
					//3/3/2016 - End point change
					//var delRowsUrl = 'https://mapsbi.com/services/Api/DeleteAllDataRows?apiKey='+mbiApiKey+'&output=json&datasetId='+datasetId;
					
					var delRowsUrl = 'https://mapsbi.com/api/Datasets/'+datasetId+'/Rows?apikey='+mbiApiKey;
					
					log('debug','Delete All Rows URL', delRowsUrl);
					var deleteAllRowsRes = nlapiRequestURL(delRowsUrl,null,null,'DELETE');
					
					log('debug','Delete All  Status', deleteAllRowsRes.getCode()+' // '+nlapiGetContext().getRemainingUsage());
					
					//1. Delete all columns first
					//Send in empty DatasetData
					
					//https://mapsbi.com/services/Api/DeleteAllDatasetColumns?apiKey={APIKEY}&output=xml&datasetId={DATASET_ID}&deleteAll={deleteAll} 
					//Use 1.5 API to delete all columns
					
					//3/3/2016 - End point and defintion change
					/**
					var delColsDsUrl = 'https://mapsbi.com/services/Api/DeleteAllDatasetColumns?'+
	   				   				   'apiKey='+mbiApiKey+'&output=json&datasetId='+datasetId+'&deleteAll=true';
					*/
					
					//MapsBI Change - DeleteAddress = False as URL parameter
					var delColsDsUrl = 'https://mapsbi.com/api/Datasets/'+datasetId+'/Columns?apikey='+mbiApiKey+'&deleteAddress=true'; 
					
					
					
					//MapsBI debugging. Generate XML file to send to MapsBI for debugging
					//var mapsDataColDelXml = nlapiCreateFile('DataSetColDeleteXml-'+datasetId+'.xml', 'XMLDOC',delXml);
					//mapsDataColDelXml.setFolder('2421');
					//nlapiSubmitFile(mapsDataColDelXml);
					//sent to JS for now
					//nlapiSendEmail(-5, 'joe.son@audaxium.com', 'Dataset Delete Col XML for DatasetID '+datasetId+' for '+nlapiGetContext().getCompany(), 'Delete Dataset Col XML', null, null, null, mapsDataColDelXml);
					
					log('debug','delColsDsUrl', delColsDsUrl);
					
					//nlapiRequestURL(url, postdata, headers, callback, httpMethod)
					
					var deleteColRes = nlapiRequestURL(delColsDsUrl, null,null,'DELETE');
					
					log('debug','Delete Status', deleteColRes.getBody()+' // '+ deleteColRes.getCode()+' // '+nlapiGetContext().getRemainingUsage());
					
					
					//2 recreate Data Set 
					//-----------------------------------
					var mapCount = req.getLineItemCount('custpage_fldmapsl');
					var strMap = '';
					var colName = '';
					var colType = '';
					var dsColumnXml = '';
					
					var rowIdColIndex = '';
					for (var mc=1; mc<=mapCount; mc++) {
					
						//grab index to be used as ROWID
						if (req.getLineItemValue('custpage_fldmapsl', 'custpage_fldsl_rowid', mc)=='T') {
							rowIdColIndex = req.getLineItemValue('custpage_fldmapsl', 'custpage_fldsl_index', mc);
						}
						
						if (req.getLineItemValue('custpage_fldmapsl', 'custpage_fldsl_mbitype', mc)) {
							var mmbitype = req.getLineItemValue('custpage_fldmapsl', 'custpage_fldsl_mbitype', mc);
							var label = req.getLineItemValue('custpage_fldmapsl', 'custpage_fldsl_label', mc);
							var colindex = req.getLineItemValue('custpage_fldmapsl', 'custpage_fldsl_index', mc);
							var fldid = req.getLineItemValue('custpage_fldmapsl','custpage_fldsl_name',mc);
							var fldtype = req.getLineItemValue('custpage_fldmapsl','custpage_fldsl_type',mc);
							//Format: index::label::mbitype::fldid::fldtype
							strMap += colindex+'::'+label+'::'+mmbitype+'::'+fldid+'::'+fldtype+',';
							
							colName += encodeURIComponent(label)+',';
							colType += mmbitype+',';
							
							//3/3/2016 - Changes
							//build column xml
							dsColumnXml += '<Column>'+
										   '<Name>'+label+'</Name>'+
										   '<Type>'+mmbitype+'</Type>'+
										   '</Column>';
							
						}
					}
					
					dsColumnXml = '<Dataset>'+
								  '<Columns>'+
								  dsColumnXml+
								  '</Columns>'+
								  '</Dataset>';
					
					strMap = strMap.substring(0, (strMap.length - 1));
					colName = colName.substring(0, (colName.length - 1));
					colType = colType.substring(0, (colType.length - 1));
					
					//Use API to Create new Columns
					//https://mapsbi.com/services/Api/AddDatasetColumns?apiKey={API_KEY}&output=xml&datasetId={DATASET_ID}&columnNames={columnNames}&columnTypes={columnTypes}
					//var addXml = '<DatasetData xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api"></DatasetData>';
					//var addColsDsUrl = 'https://mapsbi.com/services/Api/AddDatasetColumns?'+
	   				//   				   'apiKey='+mbiApiKey+'&output=json&datasetId='+datasetId+'&columnNames='+colName+'&columnTypes='+colType;
	
					var addColsDsUrl = 'https://mapsbi.com/api/Datasets/'+datasetId+'/ColumnsXML?apikey='+mbiApiKey;
					
					//MapsBI debugging. Generate XML file to send to MapsBI for debugging
					//var mapsDataColAddXml = nlapiCreateFile('DataSetColAddXml-'+datasetId+'.xml', 'XMLDOC',addXml);
					//mapsDataColAddXml.setFolder('2421');
					//nlapiSubmitFile(mapsDataColAddXml);
					//sent to JS for now
					//nlapiSendEmail(-5, 'joe.son@audaxium.com', 'Dataset Add Col XML for DatasetID '+datasetId+' for '+nlapiGetContext().getCompany(), 'Add Dataset Col XML', null, null, null, mapsDataColAddXml);
					
					var addColRes = nlapiRequestURL(addColsDsUrl, dsColumnXml);
					
					log('debug','Add Cols URL',addColsDsUrl);
					log('debug','new mapping',strMap);
					log('debug','new colName',colName);
					log('debug','new colType',colType);
					
					
					
					var updMapFlds = ['custrecord_axmbi_ssds_fld_map','custrecord_axmbi_ssds_rowidindex'];
					var updMapVals = [strMap,rowIdColIndex];
					
					nlapiSubmitField('customrecord_axmbi_ss_ds_map', mapId, updMapFlds, updMapVals, true);
					
					//-----------------------------------
					
				}
				
				
				var updfld = ['custrecord_axmbi_ssds_interval'];
				var updval = [interval];
				
				if (!dplId) {
				
					//Unable to find Script ID
					if (!sctId) {
						redirectParam['custparam_statusmsg'] = 'Failed to Save. Unable to get Internal ID Number of AX:SS:MapsBI Data Sync Processor';
						nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
											ctx.getDeploymentId(), false, redirectParam);
					}
					
					//Create Sync Deployment for THIS Mapping
					try {
						log('debug','dpl id',dplId);
						log('debug','sct id',sctId);
						dplSctId = 'customdeploy_ax_ss_mapsbi_dsp'+mapId;
						
						var dplrec = nlapiCreateRecord('scriptdeployment', {'script':sctId});
						dplrec.setFieldText('status','Not Scheduled');
						dplrec.setFieldValue('isdeployed','T');
						dplrec.setFieldValue('title','AX:SS:MapsBI DataSync ['+mapId+']');
						dplrec.setFieldValue('scriptid','_ax_ss_mapsbi_dsp'+mapId);
						dplrec.setFieldValue('allroles','T');
						dplId = nlapiSubmitRecord(dplrec, true, true);
						log('debug','dpl id',dplId);
						
					} catch (dplerr) {
						redirectParam['custparam_statusmsg'] = 'Failed to Create Sync Deployment Record from AX:SS:MapsBI Data Sync Processor: '+getErrText(dplerr);
						nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
											ctx.getDeploymentId(), false, redirectParam);
					}
					
					updfld.push('custrecord_axmbi_ssds_dplid');
					updval.push(dplId);
					updfld.push('custrecord_axmbi_ssds_dplsctid');
					updval.push(dplSctId);
					
				}
				//update Map record
				try {
					
					var statusMsgVal = 'Successfully Saved Changes for Mapping Record ID ['+mapId+']';
					//if chang mapping is selected, automatically queue sync data
					if (req.getParameter('custpage_chgmap')=='T') {
						var sctId = getUploaderScriptId('scriptid');
						var dplId = nlapiLookupField('customrecord_axmbi_ss_ds_map', mapId, 'custrecord_axmbi_ssds_dplsctid', false);
						
						log('debug','Queue up script',sctId+' // '+dplId+' // '+mapId);
						
						var param = new Object();
						param['custscript_syncmapid'] = mapId;
						
						//adhoc schedule to Sync Data for this mapping
						var queueStatus = nlapiScheduleScript(sctId, dplId, param);
						statusMsgVal += ' and Data Sync Queued ['+queueStatus+']';
						
						//update mapId Sync Status
						updfld.push('custrecord_axmbi_ssds_syncstatus');
						updval.push(queueStatus);
						updfld.push('custrecord_axmbi_ssds_synclog');
						updval.push('Data Sync with New Data Mapping In Progress');
					}
					
					nlapiSubmitField('customrecord_axmbi_ss_ds_map', mapId, updfld, updval, true);
					
					redirectParam['custparam_statusmsg'] = statusMsgVal;
					
					nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
										ctx.getDeploymentId(), false, redirectParam);
					
				} catch (mapupderr) {
					redirectParam['custparam_statusmsg'] = 'Failed to Update Mapping Record ID ['+mapId+']: '+getErrText(mapupderr);
					nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
										ctx.getDeploymentId(), false, redirectParam);
				}
				
				return;
			}
			/******************************* PROCESS *******************************************/
			
			//add in list of mapsBI column names
			var mapbicols = '';
			
			//if mapid is NOT passed in set, Show all available mapping for user selection
			if (!mbiMapId) {
				
				//search for all active mapping record
				var mapflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
				var mapcol = [new nlobjSearchColumn('custrecord_axmbi_ssds_dstitle'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_searchid'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_dsid'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_fld_map'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_dplid'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_dplsctid'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_interval'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_lastsyncdt'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_syncstatus'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_synclog'),
				              new nlobjSearchColumn('custrecord_axmbi_ssds_rowidindex')];
				var maprs = nlapiSearchRecord('customrecord_axmbi_ss_ds_map', null, mapflt, mapcol);
				
				//display list of mapping in sublist
				var mapsl = nsform.addSubList('custpage_mapsl', 'list', 'Active Mapping Records', '');
				mapsl.addField('custpage_mapsl_action', 'textarea', 'Action', null).setDisplayType('inline');
				mapsl.addField('custpage_mapsl_dstitle', 'text', 'Dataset Title', null);
				mapsl.addField('custpage_mapsl_searchid', 'text', 'Saved Search', null);
				mapsl.addField('custpage_mapsl_interval', 'text','Sync Interval', null);
				//mapsl.addField('custpage_mapsl_dplavail', 'text','Sync Availability', null);
				mapsl.addField('custpage_mapsl_lastsync', 'datetimetz','Last Synced', null);
				mapsl.addField('custpage_mapsl_lastsyncst', 'text','Last Sync Status', null);
				mapsl.addField('custpage_mapsl_lastsynclog', 'textarea','Last Sync Log', null).setDisplayType('inline');
				mapsl.addField('custpage_mapsl_dsdef', 'textarea', 'Dataset Definition', null).setDisplayType('inline');
				
				var mline = 1;
				for (var mapped=0; maprs && mapped < maprs.length; mapped++) {
					
					/**
					var sdcflt = [new nlobjSearchFilter('scriptid', 'scriptdeployment', 'is',maprs[mapped].getValue('custrecord_axmbi_ssds_dplsctid'))];
					var sdcol = [new nlobjSearchColumn('status'),
					             new nlobjSearchColumn('startdate').setSort(true)];
					var sdcrs = nlapiSearchRecord('scheduledscriptinstance', null, sdcflt, sdcol);
					var sdinsst = '';
					if (sdcrs && sdcrs.length > 0) {
						sdinsst = sdcrs[0].getValue('status');
					}
					*/
					
					var btnHtml = '<input type="button" style="padding: 3px" value="View/Modify" onclick="showModUi(\''+maprs[mapped].getId()+'\');">';
					
					var mapdef = maprs[mapped].getValue('custrecord_axmbi_ssds_fld_map');
					var mapdefHtml = '';
					if (mapdef) {
						var arMap = mapdef.split(',');
						for (var am=0; am < arMap.length; am++) {
							var arMapEl = arMap[am].split('::');
							//0=index, 1=Label, 2=MapsBI Datatype
							mapdefHtml += arMapEl[1]+' ('+arMapEl[0]+'): '+arMapEl[2]+'<br/>';
						}
					}
					
					mapsl.setLineItemValue('custpage_mapsl_action', mline, btnHtml);
					mapsl.setLineItemValue('custpage_mapsl_dstitle', mline, maprs[mapped].getValue('custrecord_axmbi_ssds_dstitle'));
					mapsl.setLineItemValue('custpage_mapsl_searchid', mline, maprs[mapped].getText('custrecord_axmbi_ssds_searchid'));
					mapsl.setLineItemValue('custpage_mapsl_interval', mline, maprs[mapped].getText('custrecord_axmbi_ssds_interval'));
					//mapsl.setLineItemValue('custpage_mapsl_dplavail', mline, sdinsst);
					mapsl.setLineItemValue('custpage_mapsl_lastsync', mline, maprs[mapped].getValue('custrecord_axmbi_ssds_lastsyncdt'));
					mapsl.setLineItemValue('custpage_mapsl_lastsyncst', mline, maprs[mapped].getValue('custrecord_axmbi_ssds_syncstatus'));
					mapsl.setLineItemValue('custpage_mapsl_lastsynclog', mline, maprs[mapped].getValue('custrecord_axmbi_ssds_synclog').substring(0, 300)+' ...');
					
					mapsl.setLineItemValue('custpage_mapsl_dsdef', mline, mapdefHtml);
					
					
					mline++;
				}
			
			//Show MOD UI 
			} else {
				
				var maprec = nlapiLoadRecord('customrecord_axmbi_ss_ds_map', mbiMapId);
				
				nsform.addSubmitButton('Save Mapping Configuration');
				
				//back button
				nsform.addButton('custpage_goback', 'Back To Map List', 'backtoMapList();');

				
				//Sync Now Button
				//onclick="syncDataNow(\''+maprs[mapped].getId()+'\');"
				var syncNowBtn = nsform.addButton('custpage_syncnow','Sync Now','syncDataNow(\''+mbiMapId+'\');');
				if (!maprec.getFieldValue('custrecord_axmbi_ssds_dplsctid')) {
					syncNowBtn.setDisabled(true);
				}
				
				//Delete Dataset Button
				//onclick="deleteDataSet(ns mapping id, mapsbi dataset id);"
				/**
				 * Removed until unexpected Error is resolved.
				var deldsBtn = nsform.addButton('custpage_deletedataset','Delete Dataset','deleteDataSet(\''+mbiMapId+'\',\''+maprec.getFieldValue('custrecord_axmbi_ssds_dsid')+'\');');
				if (!maprec.getFieldValue('custrecord_axmbi_ssds_dplsctid')) {
					deldsBtn.setDisabled(true);
				}
				*/
				//get list of MapsBI Datatypes
				var mbicjson = {};
				var mbitypecol = [new nlobjSearchColumn('name')];
				var mbitypers = nlapiSearchRecord('customlist_axmbi_datatypes', null, null, mbitypecol);
				for (var m=0; mbitypers && m < mbitypers.length; m++) {
					mbitype.push(mbitypers[m].getValue('name'));
					mbicjson[mbitypers[m].getValue('name')] = mbitypers[m].getValue('name');
				}
				
				var mbitypeclient = nsform.addField('custpage_mbitypeclient','inlinehtml','',null,null);
				mbitypeclient.setDefaultValue('<script language="javascript">var mbitype='+JSON.stringify(mbicjson)+';</script>');
				
				var hiddenmapid = nsform.addField('custpage_mapid','text','Map ID: ',null,null);
				hiddenmapid.setDefaultValue(mbiMapId);
				hiddenmapid.setDisplayType('hidden');

				//---------------------------show mapping details
				nsform.addFieldGroup('custpage_mapgrp', 'Mapping Details', null);
				//saved search
				var ssfld = nsform.addField('custpage_ssfld', 'text', 'Mapped Saved Search: ', null, 'custpage_mapgrp');
				ssfld.setDefaultValue(maprec.getFieldText('custrecord_axmbi_ssds_searchid'));
				ssfld.setBreakType('startcol');
				ssfld.setDisplayType('disabled');
				//dstitle and id
				var dstitleidVal = maprec.getFieldValue('custrecord_axmbi_ssds_dstitle')+' ('+maprec.getFieldValue('custrecord_axmbi_ssds_dsid')+')';
				var dsfld = nsform.addField('custpage_dsfld','text','Dataset Title (ID): ', null, 'custpage_mapgrp');
				dsfld.setDisplayType('disabled');
				dsfld.setDefaultValue(dstitleidVal);
				
				//hidden Dataset ID
				var hiddenDataSetId = nsform.addField('custpage_dsid', 'text', 'Dataset ID: ', null, 'custpage_mapgrp');
				hiddenDataSetId.setDisplayType('hidden');
				hiddenDataSetId.setDefaultValue(maprec.getFieldValue('custrecord_axmbi_ssds_dsid'));
				
				//Interval
				var syncfld = nsform.addField('custpage_syncfld','select','Sync Interval: ','customlist_axmbi_sync_interval','custpage_mapgrp');
				syncfld.setDefaultValue(maprec.getFieldValue('custrecord_axmbi_ssds_interval'));
				syncfld.setBreakType('startcol');
				
				var syncdplfld = nsform.addField('custpage_syncdplid','text','Sync Processor ID: ',null,'custpage_mapgrp');
				syncdplfld.setDefaultValue(maprec.getFieldValue('custrecord_axmbi_ssds_dplid'));
				syncdplfld.setDisplayType('disabled');
				
				//
				var syncdplsctfld = nsform.addField('custpage_syncdplsctid','text','Sync Script ID: ',null,'custpage_mapgrp');
				syncdplsctfld.setDefaultValue(maprec.getFieldValue('custrecord_axmbi_ssds_dplsctid'));
				syncdplsctfld.setDisplayType('disabled');
				
				//custrecord_axmbi_ssds_lastsyncdt
				var lastsync = nsform.addField('custpage_syncdt','datetimetz','Last Sync Date/Time: ', null, 'custpage_mapgrp');
				lastsync.setDefaultValue(maprec.getFieldValue('custrecord_axmbi_ssds_lastsyncdt'));
				lastsync.setDisplayType('disabled');
				lastsync.setBreakType('startcol');
								
				var lastsyncst = nsform.addField('custpage_syncst','text','Last Sync Status: ', null, 'custpage_mapgrp');
				lastsyncst.setDefaultValue(maprec.getFieldValue('custrecord_axmbi_ssds_syncstatus'));
				lastsyncst.setDisplayType('inline');
				
				var lastsynclg = nsform.addField('custpage_syncstlg','longtext','Last Sync Log: ', null, 'custpage_mapgrp');
				lastsynclg.setDefaultValue(maprec.getFieldValue('custrecord_axmbi_ssds_synclog'));
				lastsynclg.setDisplayType('inline');
				
				//----------------------------show Dataset Definition info
				nsform.addFieldGroup('custpage_dsdef', 'Dataset Definition', null);
				
				//get latest dataset info from MapsBI
				//3/3/2016 API End Point Change 
				//var dsDefUrl = 'https://mapsbi.com/services/api/GetDatasetDefinition?apiKey='+mbiApiKey+'&output=json&datasetId='+maprec.getFieldValue('custrecord_axmbi_ssds_dsid');
				
				var dsDefUrl = 'https://mapsbi.com/api/Datasets/'+
							   maprec.getFieldValue('custrecord_axmbi_ssds_dsid')+
							   '?apikey='+mbiApiKey;
				
				log('debug','def url',dsDefUrl);
				var dsdefres = nlapiRequestURL(dsDefUrl);
				log('debug','Response: ', dsdefres.getBody());
				var ddjson = {};
				var defstVal = '<b>API Call Failed</b>';
				var defCallSuccess = false;
				
				//Error checking
				if (dsdefres.getCode() == '200') {
					ddjson = eval('('+dsdefres.getBody()+')');
					defstVal = '<b>API Call Successful</b>';
					defCallSuccess = true;
				}
				
				//show status of API call
				var apistatusfld = nsform.addField('custpage_apistatus', 'text', 'API Call Status: ', null, 'custpage_dsdef');
				apistatusfld.setBreakType('startcol');
				apistatusfld.setDisplayType('inline');
				if (ddjson['ErrorCode']) {
					defstVal = '<b>API Call Failed: '+ddjson['Reason']+' ('+ddjson['ErrorCode']+')</b>';
					defCallSuccess = false;
				}
				apistatusfld.setDefaultValue(defstVal);
				
				//details from MapsBI
				var setstatusfld = nsform.addField('custpage_defstatus', 'text', 'Dataset Status: ', null, 'custpage_dsdef');
				setstatusfld.setBreakType('startcol');
				setstatusfld.setDisplayType('inline');
				setstatusfld.setDefaultValue((ddjson['Status'])?ddjson['Status']:'N/A');
				
				var totalrecs = nsform.addField('custpage_totalrec','text','Total Records: ', null, 'custpage_dsdef');
				totalrecs.setBreakType('startcol');
				totalrecs.setDisplayType('inline');
				totalrecs.setDefaultValue((ddjson['TotalRecords'])?ddjson['TotalRecords'].toFixed(0):'N/A');
				
				var totalrecsgeo = nsform.addField('custpage_totalrecgeo','text','Total Geocoded Records: ', null, 'custpage_dsdef');
				totalrecsgeo.setDisplayType('inline');
				totalrecsgeo.setDefaultValue((ddjson['TotalRecordsGeocoded'])?ddjson['TotalRecordsGeocoded'].toFixed(0):'N/A');
				
				//-----------------------add Data Def mapping sublist
				//load search
				var sselsc = nlapiLoadSearch(null, maprec.getFieldValue('custrecord_axmbi_ssds_searchid'));
				//get all columns from this search
				var sselcol = sselsc.getColumns();
				var mapjson = {};
				var mapdef = maprec.getFieldValue('custrecord_axmbi_ssds_fld_map');
				
				if (mapdef) {
					var arMap = mapdef.split(',');
					for (var am=0; am < arMap.length; am++) {
						//Format: index::label::mbitype::fldid::fldtype
						//0=index, 1=Label, 2=MapsBI Datatype, 3=Fld Internal ID, 4=Fld Type
						var arMapEl = arMap[am].split('::');
						mapjson[arMapEl[0]]={
							"label":arMapEl[1],
							"datatype":arMapEl[2],
							"fldid":arMapEl[3],
							"fldtype":arMapEl[4]
						};
						mapbicols += arMapEl[1]+'|';
					}
					mapbicols = mapbicols.substring(0, (mapbicols.length - 1));
				}
				var mapbicolsfld = nsform.addField('custpage_mapbicols','textarea', '',null);
				mapbicolsfld.setDefaultValue(mapbicols);
				mapbicolsfld.setDisplayType('hidden');
				
				var mappOutOfSync = true;
				var nsfldsl = nsform.addSubList('custpage_fldmapsl', 'list', 'NS to MapsBi Field Map', '');
				nsfldsl.setHelpText('<b>You MUST provide field mapping for LOCATION.COUNTRY or LOCATION.LATITUDE and LOCATION.LONGITUDE.</b>');
				nsfldsl.addField('custpage_fldsl_rowid','checkbox','Is Row ID', null);
				nsfldsl.addField('custpage_fldsl_index', 'text', 'NS Index', null).setDisplayType('hidden');
				nsfldsl.addField('custpage_fldsl_label', 'text', 'NS Col Name', null);
				nsfldsl.addField('custpage_fldsl_name', 'text', 'NS Col ID', null);
				nsfldsl.addField('custpage_fldsl_type', 'text', 'NS Col Type', null);
				nsfldsl.addField('custpage_fldsl_mplabel', 'text', 'Mapped Name', null);
				nsfldsl.addField('custpage_fldsl_mptype', 'text', 'Mapped Type', null);
				nsfldsl.addField('custpage_fldsl_ismatch', 'text', 'Mapping Valid', null);
				var mbislfld = nsfldsl.addField('custpage_fldsl_mbitype', 'select', 'MapsBI Type', null).setDisplayType('disabled');
				mbislfld.addSelectOption('', 'Do NOT Map', true);
								
				for(var mbit=0; mbit < mbitype.length; mbit++) {
					mbislfld.addSelectOption(mbitype[mbit], mbitype[mbit], false);
				}
				
				var mline = 1;
				for (var ssc=0; sselcol && ssc < sselcol.length; ssc++) {
					if (maprec.getFieldValue('custrecord_axmbi_ssds_rowidindex')==ssc) {
						nsfldsl.setLineItemValue('custpage_fldsl_rowid',mline,'T');
					}
					nsfldsl.setLineItemValue('custpage_fldsl_index', mline, ssc.toFixed(0));
					nsfldsl.setLineItemValue('custpage_fldsl_label', mline, sselcol[ssc].label);
					nsfldsl.setLineItemValue('custpage_fldsl_name', mline, sselcol[ssc].name)
					nsfldsl.setLineItemValue('custpage_fldsl_type', mline, sselcol[ssc].type);

					var valid = 'VALID';
					var mplabel = ' - ';
					var mptype = ' - ';
					if (mapjson[ssc]) {
						
						if (mapjson[ssc].fldid != sselcol[ssc].name || mapjson[ssc].fldtype != sselcol[ssc].type) {
							valid = 'NOT VALID';
							if (mappOutOfSync) {
								mappOutOfSync = false;
							}
						}
						
						mplabel = mapjson[ssc].label+' ('+mapjson[ssc].fldid+')';
						mptype = mapjson[ssc].fldtype;
						
					}
					
					nsfldsl.setLineItemValue('custpage_fldsl_mplabel', mline, mplabel);
					nsfldsl.setLineItemValue('custpage_fldsl_mptype', mline, mptype);
					nsfldsl.setLineItemValue('custpage_fldsl_ismatch', mline, valid);
					
					nsfldsl.setLineItemValue('custpage_fldsl_mbitype', mline, (mapjson[ssc])?mapjson[ssc].datatype:'');
					mline++;
				}
				
				if (!mappOutOfSync) {
					syncNowBtn.setDisabled(true);
					//make sure field display is normal
					mbislfld.setDisplayType('normal');
				}
				
				//disable sync now button if Last Sync Status is NOT COMPLETE
				if (maprec.getFieldValue('custrecord_axmbi_ssds_syncstatus') && 
					maprec.getFieldValue('custrecord_axmbi_ssds_syncstatus') != 'COMPLETE' && 
					maprec.getFieldValue('custrecord_axmbi_ssds_syncstatus') != 'ERROR') {
					syncNowBtn.setDisabled(true);
				}
				
				//only show when dploy script is set
				if (maprec.getFieldValue('custrecord_axmbi_ssds_dplsctid')) {
					//change mapping
					var chgMapping = nsform.addField('custpage_chgmap', 'checkbox','Change Mapping: ', null, 'custpage_dsdef');
					chgMapping.setBreakType('startcol');
					
					//if out of sync, check it and disable it
					if (!mappOutOfSync) {
						chgMapping.setDefaultValue('T');
						chgMapping.setDisplayType('disabled');
					}
					
					//map help
					var mapHelp = 'Check the box above to change mapping definition.<br/><br/>'+
								  '<b>When Mapping is Changed, ALL DATA will be deleted and RE-SYNCED</b>';
					nsform.addField('custpage_maphelp', 'inlinehtml', 'Help: ', null, 'custpage_dsdef').setDefaultValue(mapHelp);
				}
				
			}
			
		} catch (mbierr) {
			statusfld.setDefaultValue('<span style="color:red"><b>'+getErrText(mbierr)+'</b></span>');
		}
		
	}
	
	res.writePage(nsform);	
			
}
