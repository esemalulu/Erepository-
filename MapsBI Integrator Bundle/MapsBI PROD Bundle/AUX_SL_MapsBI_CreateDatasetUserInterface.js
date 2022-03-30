/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Nov 2013     AnJoe
 *
 */
var ctx = nlapiGetContext();
var paramMapsBiCred = ctx.getSetting('SCRIPT','custscript_mapsbi_cred');

var nsform = nlapiCreateForm('MapsBI Create New Dataset', false);

var mbitype = new Array();

//******************** CREATE NEW DataSet ***********************************//
//list of all saved searches that has [MapsBI] in the title
//var sc = nlapiSearchGlobal('search:MapsBi');
//load search > getColumns: Properties
//name = {string} entityid
//join = null
//summary = null
//label = {string} Name
//function = null
//formula = null
//sortdir = {string} ASC
//type = {string} text

/**
 * create:
 * Step 1: (cs1) Select Saved Search
 * Step 2: (cs2) Map Fields
 * Step 3: (cs3) Create Data Set in MapsBI
 *
 */
var mbiuistep = '';
var reqStatusMsg = '';
/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function auxMapsBiCreateDataset(req, res){

	nsform.setScript('customscript_ax_cs_mapsbi_createds_help');
	
	if (req.getParameter('custparam_statusmsg')) {
		reqStatusMsg = req.getParameter('custparam_statusmsg');
	}
	
	if (req.getParameter('custparam_uistep')) {
		mbiuistep = req.getParameter('custparam_uistep');
	} else {
		mbiuistep = 'cs1';
	}
	log('debug','ui step',mbiuistep);
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

			//Get API key
			var mbiApiKey = nlapiLookupField('customrecord_aux_ext_serv_cred_mgr', paramMapsBiCred, 'custrecord_aux_escm_access_api_key', false);
			
			if (!mbiApiKey) {
				throw nlapiCreateError('MBIAPIMISS_0030', 'Error Missing MapsBI API Key: '+ctx.getDeploymentId()+': Please make sure MapsBI API Key is set.', false);
			}
			
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
			
			
			/******************************* PROCESS *******************************************/
			//PROCESS user request to create new Dataset
			if (req.getMethod() == 'POST') {
				
				var searchId = req.getParameter('custpage_mbisearch');
				var datasetTitle = req.getParameter('custpage_dstitle');
				
				var mapCount = req.getLineItemCount('custpage_fldmapsl');
				var strMap = '';
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
						
						//build column xml
						dsColumnXml += '<Column>'+
									   '<Name>'+label+'</Name>'+
									   '<Type>'+mmbitype+'</Type>'+
									   '</Column>';
					}
				}
				
				strMap = strMap.substring(0, (strMap.length - 1));
				
				//3/3/2016 - XML Definition changed
				/**
				 * Previous Version
				dsColumnXml = '<DatasetDefinition xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api">'+
							  '<ColumnSet>'+
							  dsColumnXml+
							  '</ColumnSet>'+
							  '<DatasetName>'+datasetTitle+'</DatasetName>'+
							  '</DatasetDefinition>';
				*/
				dsColumnXml = '<Dataset>'+
							  '<DatasetName>'+datasetTitle+'</DatasetName>'+
							  '<Columns>'+
							  dsColumnXml+
							  '</Columns>'+
							  '</Dataset>';
				
				var redirectParam = new Object;
				
				try {
					//var createDsUrl = 'https://mapsbi.com/services/api/CreateDatasetDefinition?apiKey='+mbiApiKey+'&output=json';
					//3/3/2016 - Failure due to MapsBI Updating the End Point for this API call
					var createDsUrl = 'https://mapsbi.com/api/Datasets?apiKey='+mbiApiKey+'&output=json';
					
					log('debug','DS URL', createDsUrl);
					
					var createDsRes = nlapiRequestURL(createDsUrl, dsColumnXml);
					
					log('debug','Body', createDsRes.getBody());
					
					//check to see if it was successful. if body is integer it was success
					if (parseInt(createDsRes.getBody())) {
						var dsId = createDsRes.getBody();
						//create
						var maprec = nlapiCreateRecord('customrecord_axmbi_ss_ds_map');
						maprec.setFieldValue('custrecord_axmbi_ssds_dstitle', datasetTitle);
						maprec.setFieldValue('custrecord_axmbi_ssds_searchid', searchId);
						maprec.setFieldValue('custrecord_axmbi_ssds_dsid', dsId);
						maprec.setFieldValue('custrecord_axmbi_ssds_fld_map', strMap);
						maprec.setFieldValue('custrecord_axmbi_ssds_rowidindex',rowIdColIndex);
						var mapId = nlapiSubmitRecord(maprec, false, true);
						
						redirectParam['custparam_statusmsg'] = 'Successfully created Dataset Definition with NS Saved Search. Make sure to Save this record after setting Sync Interval';
						redirectParam['custparam_mbimapid'] = mapId;
						redirectParam['custparam_uistep'] = 'cs1';
						nlapiSetRedirectURL('SUITELET', 'customscript_ax_sl_mapsbi_mgr_mapping', 
											'customdeploy_ax_sl_mapsbi_mgr_map_dpl', false, redirectParam);
						
					} else {
						redirectParam['custparam_statusmsg'] = 'Error while attempting to create New Dataset Definition. Try again.';
						redirectParam['custparam_uistep'] = 'cs1';
						nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
											ctx.getDeploymentId(), false, redirectParam);
					}
				} catch (createerr) {
					
					log('error','unexpected error',getErrText(createerr));
					redirectParam['custparam_statusmsg'] = 'Unexpected Runtime Error: '+getErrText(createerr);
					redirectParam['custparam_uistep'] = 'cs1';
					nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), 
										ctx.getDeploymentId(), false, redirectParam);
				}
				
				return;
			}
			/******************************* PROCESS *******************************************/
			
			
			//look for saved searches that contains MapsBI as key word
			//Make sure to remove already mapped saved searches from result set
			var mapflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
			var mapcol = [new nlobjSearchColumn('custrecord_axmbi_ssds_searchid')];
			var maprs = nlapiSearchRecord('customrecord_axmbi_ss_ds_map', null, mapflt, mapcol);
			var mappedSearches = new Array();
			for (var mapped=0; maprs && mapped < maprs.length; mapped++) {
				mappedSearches.push(maprs[mapped].getValue('custrecord_axmbi_ssds_searchid'));
			}
			
			//Step 1
			var mbiSearchList = nlapiSearchGlobal('search:MapsBi');
			var mbiSearchFld = nsform.addField('custpage_mbisearch','select','MapsBI Saved Search: ',null,null);
			mbiSearchFld.setMandatory(true);
			mbiSearchFld.addSelectOption('', '', true);
			
			for (var mbiss=0; mbiSearchList && mbiss < mbiSearchList.length; mbiss++) {
				
				//check to make sure it's not already mapped
				if (!mappedSearches.contains(mbiSearchList[mbiss].getId())) {
					mbiSearchFld.addSelectOption(mbiSearchList[mbiss].getId(), mbiSearchList[mbiss].getValue('name'), false);
				}
			}
			
			//Step 2
			if (mbiuistep == 'cs2') {

				//add submit button
				nsform.addSubmitButton('Create New MapsBI Dataset');
				
				//add Back button
				nsform.addButton('custpage_cs1', 'Change Saved Search', 'onClickChangeSs();');
				
				//add dataset title
				var mbiDsTitle = nsform.addField('custpage_dstitle', 'text', 'Dataset Title: ', null, null);
				mbiDsTitle.setMandatory(true);
				mbiSearchFld.setDisplayType('disabled');
				
				var ssel = req.getParameter('custpage_mbisearch');
				mbiSearchFld.setDefaultValue(ssel);
				
				//load search
				var sselsc = nlapiLoadSearch(null, ssel);
				
				//get all columns from this search
				var sselcol = sselsc.getColumns();
				var sselrs = sselsc.runSearch().getResults(0, 15);
				
				//Datatype map sublist
				var nsfldsl = nsform.addSubList('custpage_fldmapsl', 'list', 'NS to MapsBi Field Map', '');
				nsfldsl.setHelpText('<b>You MUST provide field mapping for LOCATION.COUNTRY or LOCATION.LATITUDE and LOCATION.LONGITUDE.</b>');
				nsfldsl.addField('custpage_fldsl_rowid','checkbox','Is Row ID', null);
				nsfldsl.addField('custpage_fldsl_index', 'text', 'NS Col Index', null).setDisplayType('hidden');
				nsfldsl.addField('custpage_fldsl_label', 'text', 'NS Col Label', null);
				nsfldsl.addField('custpage_fldsl_name', 'text', 'NS Col Fld ID', null);
				nsfldsl.addField('custpage_fldsl_type', 'text', 'NS Col Type', null);
				var mbislfld = nsfldsl.addField('custpage_fldsl_mbitype', 'select', 'MapsBI Type', null);
				mbislfld.addSelectOption('', 'Do NOT Map', true);
				for(var mbit=0; mbit < mbitype.length; mbit++) {
					mbislfld.addSelectOption(mbitype[mbit], mbitype[mbit], false);
				}
				
				var mline = 1;
				for (var ssc=0; sselcol && ssc < sselcol.length; ssc++) {
					nsfldsl.setLineItemValue('custpage_fldsl_index', mline, ssc.toFixed(0));
					nsfldsl.setLineItemValue('custpage_fldsl_label', mline, sselcol[ssc].label);
					nsfldsl.setLineItemValue('custpage_fldsl_name', mline, sselcol[ssc].name);
					nsfldsl.setLineItemValue('custpage_fldsl_type', mline, sselcol[ssc].type);
					mline++;
				}
				
				//NetSuite Sample Result sublist
				var nsrssl = nsform.addSubList('custpage_samplers', 'list','Sample Results from Saved Search','');
				//Add sublist fields
				nsrssl.addField('custpage_samplesl_id','text','ID', null);
				for (var ssc=0; sselcol && ssc < sselcol.length; ssc++) {
					nsrssl.addField('custpage_samplesl_'+ssc.toFixed(0),'text',sselcol[ssc].label+' ('+ssc.toFixed(0)+')', null);
				}
				//add results to sublist
				log('debug','sample rs',sselrs.length);
				var sline = 1;
				for (var sam=0; sselrs && sam < sselrs.length; sam++) {
					nsrssl.setLineItemValue('custpage_samplesl_id', sline, sselrs[sam].getId());
					for (var ssc=0; sselcol && ssc < sselcol.length; ssc++) {
						
						var rsVal = sselrs[sam].getValue(sselcol[ssc]);
						if (sselcol[ssc].type == 'select') {
							rsVal = sselrs[sam].getText(sselcol[ssc]);
						}
						nsrssl.setLineItemValue('custpage_samplesl_'+ssc.toFixed(0), sline, rsVal);
					}
					sline++;
				}
			}
			
			
		} catch (mbierr) {
			statusfld.setDefaultValue('<span style="color:red"><b>'+getErrText(mbierr)+'</b></span>');
		}
		
	}
	
	res.writePage(nsform);	
}
