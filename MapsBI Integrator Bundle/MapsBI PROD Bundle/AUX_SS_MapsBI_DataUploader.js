/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2013     AnJoe
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

var ctx = nlapiGetContext();

//get MapsBi Credential ID
var paramMapsBiCred = ctx.getSetting('SCRIPT','custscript_mapsbi_cred');
//get mapping record
var paramMapId = ctx.getSetting('SCRIPT','custscript_syncmapid');
//last processed id
var paramLastProcIndex = ctx.getSetting('SCRIPT','custscript_syncmaplastindex');
var rowLimit = ctx.getSetting('SCRIPT','custscript_syncmaprowlimit');
var nextRsIndex = rowLimit;
if (!paramLastProcIndex) {
	paramLastProcIndex=0;
} else {
	nextRsIndex = parseInt(paramLastProcIndex) + parseInt(rowLimit);
}

function syncMappedDataSet(type) {

	if (!paramMapId || !paramMapsBiCred) {
		log('error','Missing required info','Missing required info for deployment: '+ctx.getDeploymentId()+' : paramMapId='+paramMapId+' // paramMapsBiCred='+paramMapsBiCred);
		
		throw nlapiCreateError('MBISYNC_0010', 'Error Syncing data for DplID: '+ctx.getDeploymentId()+': Missing required parameters', false);		
		return;
	}
	
	var lastSyncDateTime = nlapiDateToString(new Date(), 'datetimetz');
	var syncLog = '';
	var syncStatus = '';
	try {
		//Get API key
		var mbiApiKey = nlapiLookupField('customrecord_aux_ext_serv_cred_mgr', paramMapsBiCred, 'custrecord_aux_escm_access_api_key', false);
		
		if (!mbiApiKey) {
			throw nlapiCreateError('MBIAPIMISS_0030', 'Error Missing MapsBI API Key: '+ctx.getDeploymentId()+': Please make sure MapsBI API Key is set.', false);
		}
		
		//load Mapped Sync Record
		var maprec = nlapiLoadRecord('customrecord_axmbi_ss_ds_map', paramMapId);
		var savedSearchId = maprec.getFieldValue('custrecord_axmbi_ssds_searchid');
		var datasetId = maprec.getFieldValue('custrecord_axmbi_ssds_dsid');
		var rowIdColIndex = maprec.getFieldValue('custrecord_axmbi_ssds_rowidindex');
		if (!rowIdColIndex) {
			throw nlapiCreateError('MBIAPIMISS_0040', 'Error Missing MapsBI Row ID Mapping: '+ctx.getDeploymentId()+': Please make sure MapsBI Mapping contins RowID Identification.', false);
		}
		//create mapping json 
		var mapjson = {};
		var mapdef = maprec.getFieldValue('custrecord_axmbi_ssds_fld_map');
		if (mapdef) {
			var arMap = mapdef.split(',');
			for (var am=0; am < arMap.length; am++) {
				//0=index, 1=Label, 2=MapsBI Datatype
				var arMapEl = arMap[am].split('::');
				mapjson[arMapEl[0]]={
					"label":arMapEl[1],
					"datatype":arMapEl[2]
				};
			}
		}
		
		//load search
		var sselsc = nlapiLoadSearch(null, savedSearchId);
		
		//get all columns from this search
		var sselcol = sselsc.getColumns();
		log('debug','loaded search range',paramLastProcIndex+' // '+nextRsIndex);
		var sselrs = sselsc.runSearch().getResults(paramLastProcIndex, nextRsIndex);
		
		log('debug','loaded search','search loaded');
		
		//************************ Initial Run Error **************************
		if (paramLastProcIndex==0 && !sselrs) {
			syncStatus = 'COMPLETE WITH WARNING';
			syncLog = 'Saved Search returned no data to sync with DataSet';
		} else if (paramLastProcIndex!=0 && !sselrs) {
			syncStatus = 'COMPLETE';
			syncLog = 'Results Synced with Dataset';
		} else {
			//Before Starting, if this is the FIRST time running, purge the dataset and resync
			if (!paramLastProcIndex) {
				var delXml = '<DatasetData xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api"></DatasetData>';
				//0. Delete the data values first. https://mapsbi.com/services/Api/DeleteAllDataRows?apiKey={APIKEY}&output=xml&datasetId={DATASET_ID}
				//var delRowsUrl = 'https://mapsbi.com/services/Api/DeleteAllDataRows?apiKey='+mbiApiKey+'&output=json&datasetId='+datasetId;
				
				//3/3/2016 - End point change
				var delRowsUrl = 'https://mapsbi.com/api/Datasets/'+datasetId+'/Rows?apikey='+mbiApiKey;
				
				log('debug','Delete All Rows URL', delRowsUrl);
				
				try {
					log('debug','Delete All Rows URL - Try 1', delRowsUrl);
					var deleteAllRowsRes1 = nlapiRequestURL(delRowsUrl, null,null,'DELETE');
					
					log('debug','Delete All  Status before starting', deleteAllRowsRes1.getCode()+' // '+nlapiGetContext().getRemainingUsage());
				} catch (delallerr) {
					log('debug','Delete All Rows URL - Try 2', delRowsUrl);
					var deleteAllRowsRes2 = nlapiRequestURL(delRowsUrl, null,null,'DELETE');
					
					log('debug','Delete All  Status before starting', deleteAllRowsRes2.getCode()+' // '+nlapiGetContext().getRemainingUsage());
				}
				
			}
			
			var dataRowXml = '';
			
			//loop through each result sets
			for (var sam=0; sselrs && sam < sselrs.length; sam++) 
			{
				//dataRowXml += '<DataRow><DataColumns>';
				dataRowXml += '<Row><Columns>';
				
				var rowIdValue = sselrs[sam].getValue(sselcol[rowIdColIndex]);
				log('debug','rowIdValue', nlapiEscapeXML(rowIdValue));
				//for each resultset, loop through mapping and create DataColumn XML elements
				for (var colx in mapjson) {
					
					var rsVal = sselrs[sam].getValue(sselcol[colx]);
					if (sselcol[colx].type == 'select') {
						rsVal = sselrs[sam].getText(sselcol[colx]);
					}
					
					//If rsVal is to be formatted as Date, it must be in YYYY-MM-DD format
					 
					if (rsVal && (sselcol[colx].type == 'date' || sselcol[colx].type == 'datetime') && (mapjson[colx].datatype == 'TIME' || mapjson[colx].datatype == 'DATE' || mapjson[colx].datatype == 'TIMELINE')) 
					{
						
						//Mod 7/13/2014 - Use NS Native Date API
						//var dobj = new Date(rsVal);
						var dobj = nlapiStringToDate(rsVal, 'datetime');
						//log('debug','Date object', dobj);
						//MapsBI Date Format: YYYY-MM-DD
						//MapsBI Time Format: HH:MM:SS
						//MapsBI Timeline Format: YYYY-MM-DD
						var strMonth = (dobj.getMonth()+1);
						if (parseInt(strMonth) < 10) {
							strMonth = '0'+strMonth;
						}
						
						var strDate = dobj.getDate();
						if (parseInt(strDate) < 10) {
							strDate = '0'+strDate;
						}
						
						var mapsBiTimelineAndDate = dobj.getFullYear()+'-'+strMonth+'-'+strDate;
						
						var strHours = dobj.getHours();
						if (parseInt(strHours) < 10) {
							strHours = '0'+strHours;
						}
						
						var strMin = dobj.getMinutes();
						if (parseInt(strMin) < 10) {
							strMin = '0'+strMin;
						}
						
						var strSecs = dobj.getSeconds();
						if (parseInt(strSecs) < 10) {
							strSecs = '0'+strSecs;
						}
						
						var mapsBiTime = strHours+':'+strMin+':'+strSecs;
						
						if (mapjson[colx].datatype == 'TIME') {
							rsVal = mapsBiTime;
						} else {
							rsVal = mapsBiTimelineAndDate+' '+mapsBiTime;
							//rsVal = mapsBiTimelineAndDate;
						}
						 
					}
					
					if (rsVal) {
						rsVal = nlapiEscapeXML(rsVal);
					} else {
						rsval = '';
					}
					
					dataRowXml += //'<DataColumn>'+
								  '<Column>'+
								  '<Name>'+mapjson[colx].label+'</Name>'+
								  '<Value>'+rsVal+'</Value>'+
								  //'</DataColumn>';
								  '</Column>';
				}
				
				//dataRowXml += '</DataColumns><RowId>'+rowIdValue+'</RowId></DataRow>';
				dataRowXml += '</Columns><RowId>'+nlapiEscapeXML(rowIdValue)+'</RowId></Row>';
			}
			
			//dataRowXml = '<DatasetData xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api">'+
			//			   '<DataRows>'+dataRowXml+'</DataRows>'+
			//			   '</DatasetData>';
			dataRowXml = '<Dataset>'+
		   				 '<Rows>'+dataRowXml+'</Rows>'+
		   				 '</Dataset>';
			
			
			//MapsBI debugging. Generate XML file to send to MapsBI for debugging
			//var mapsDatauploadXml = nlapiCreateFile('DatauploadXml-'+datasetId+'.xml', 'XMLDOC',dataRowXml);
			//mapsDatauploadXml.setFolder('2421');
			//nlapiSubmitFile(mapsDatauploadXml);
			//sent to JS for now
			//nlapiSendEmail(-5, 'joe.son@audaxium.com', 'Dataupload XML for DatasetID '+datasetId+' for '+nlapiGetContext().getCompany(), 'Upload XML', null, null, null, mapsDatauploadXml);
			
			//var uploadDsUrl = 'https://mapsbi.com/services/Api/UploadData?apiKey='+mbiApiKey+'&output=json&datasetId='+datasetId;
			//NEW ENd POINT: https://mapsbi.com/api/Datasets/123/Data?apikey=myApiKey
			//2/9/2015 - Changing End Point
			
			//4/27/2015
				//+'&fullGeocode=false'
				//this paramter will defer geocoding until later but not sure WHEN
				//Also it doesn't report back right away on total records.
			
			var uploadDsUrl = 'https://mapsbi.com/api/Datasets/'+datasetId+'/Data?apikey='+mbiApiKey;
			
			log('debug','api url',uploadDsUrl);
			log('debug','xml charcter size',dataRowXml.length);
			
			var headers = new Object();
			headers['Content-Type']='text/xml';
			headers['Content-Length']=dataRowXml.length;
			
			var uploadDsRes = nlapiRequestURL(uploadDsUrl, dataRowXml,headers);
			
			//var att = [nlapiCreateFile('upd.xml', 'XMLDOC', dataRowXml), nlapiCreateFile('res.txt','PLAINTEXT',uploadDsRes.getBody())];
			//nlapiSendEmail(-5, 'joe.son@audaxium.com','upload data', dataRowXml, null, null, null, att);
			
			log('debug','code',uploadDsRes.getCode());
			log('debug','err',uploadDsRes.getError());
			log('debug','body',uploadDsRes.getBody());
			var ujson = {};
			if (uploadDsRes.getBody()) {
				ujson = eval('('+uploadDsRes.getBody()+')');
			}
			
			//Check Status
			if (uploadDsRes.getCode()!=200) {
				syncStatus = 'ERROR';
				syncLog = 'Response Code '+uploadDsRes.getCode()+' returned. This is an error and no data was pushed to MapsBi';
			
			} else if (ujson['DataErrors'] && ujson['DataErrors'].length > 0) {
				syncStatus = 'ERROR';
				syncLog = ujson['DataErrors'];
				log('debug','upload errors',syncLog);
			} else {
				//If successful, check to see if we need to Reschedule to process next set
				if (sselrs.length >= rowLimit) {
					//reschedule with index of rowLimit
					var param = new Object();
					param['custscript_syncmapid'] = paramMapId;
					param['custscript_syncmaplastindex'] = nextRsIndex;
					
					nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
					
					syncStatus = 'IN PROGRESS';
					syncLog = 'All Saved Search values Synced';
					
				} else {
					syncStatus = 'COMPLETE';
					syncLog = 'All Saved Search values Synced';
				}
				
			}
			//update map record
			var updfld = ['custrecord_axmbi_ssds_lastsyncdt','custrecord_axmbi_ssds_synclog','custrecord_axmbi_ssds_syncstatus','custrecord_axmbi_ssds_erroreddt'];
			var updval = [lastSyncDateTime, syncLog, syncStatus,''];
			nlapiSubmitField('customrecord_axmbi_ss_ds_map', paramMapId, updfld, updval, false);
			
		}
		
	} catch (syncdataerr) {
		//paramMapId
		log('error','Failed MapsBI Sync','MapsBI Dataset Mapping ID: '+paramMapId+' Added/Updated to Retry Queue due to error: '+getErrText(syncdataerr));
			
		//update map record
		var eupdfld = ['custrecord_axmbi_ssds_lastsyncdt','custrecord_axmbi_ssds_synclog','custrecord_axmbi_ssds_syncstatus','custrecord_axmbi_ssds_erroreddt'];
		var eupdval = [lastSyncDateTime, getErrText(syncdataerr), 'ERROR', nlapiDateToString(new Date(),'datetimetz')];
		nlapiSubmitField('customrecord_axmbi_ss_ds_map', paramMapId, eupdfld, eupdval, false);
			
		throw nlapiCreateError('MBISYNC_0001', 'Error Syncing data for DplID: '+ctx.getDeploymentId()+': '+getErrText(syncdataerr), false);
		
	}
	
}
	