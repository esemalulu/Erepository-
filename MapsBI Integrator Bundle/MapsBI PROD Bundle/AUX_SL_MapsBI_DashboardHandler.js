/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Nov 2013     AnJoe
 *
 */
var ctx = nlapiGetContext();
var paramMapsBiCred = ctx.getSetting('SCRIPT','custscript_mapsbi_cred');

var nsform = null;
var showNav = true;
var mapsBiDashboardId = '';
/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function auxMapsBiDashboardHandle(req, res){

	//get user selected dashboard id
	if (req.getParameter('custparam_dashid')) {
		mapsBiDashboardId = req.getParameter('custparam_dashid');
	}
	
	if (!req.getParameter('custparam_showanv') || req.getParameter('custparam_showanv')=='yes') {
		showNav = false;
	}
	//create nsform with or without navigation bar
	nsform = nlapiCreateForm('MapsBI Dashboard Viewer', showNav);
	
	nsform.setScript('customscript_ax_cs_mapsbi_dashbview_help');
	
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
		
		try {

			//Get API key
			var mbiApiKey = nlapiLookupField('customrecord_aux_ext_serv_cred_mgr', paramMapsBiCred, 'custrecord_aux_escm_access_api_key', false);

			if (!mbiApiKey) {
				throw nlapiCreateError('MBIAPIMISS_0030', 'Error Missing MapsBI API Key: '+ctx.getDeploymentId()+': Please make sure MapsBI API Key is set.', false);
			}
			
			//set hidden var for nav display option
			var hiddenHideNav = nsform.addField('custpage_hidenav','text', '',null,null);
			hiddenHideNav.setDisplayType('hidden');
			if (!showNav) {
				hiddenHideNav.setDefaultValue('yes');
			} else {
				hiddenHideNav.setDefaultValue('no');
			}
			
			var mbidashintro = nsform.addField('custpage_mbiintro','inlinehtml','',null,null);
			mbidashintro.setLayoutType('outsideabove','startrow');
			mbidashintro.setDefaultValue('<h1>Select MapsBI Dashboard to view. <br/><br/>IMPORTANT NOTE:<b><i>Share URL</i></b> MUST be turned ON for it to display.<br/><br/></h1>');
			
			//API call to MapsBI
			var dashlistRes = nlapiRequestURL('https://mapsbi.com/api/Dashboards?apiKey='+mbiApiKey+'&output=json');
			log('debug','Response from get dashboards',dashlistRes.getBody());
			var arDashlist = eval('('+dashlistRes.getBody()+')');
			
			//check to make sure if it has API error first otherwise build the list and show
			if (arDashlist['ErrorCode']) {
				statusfld.setDefaultValue('<span style="color:red"><b>'+arDashlist.ErrorCode+'::'+arDashlist.Reason+'</b></span>');
			} else {
				
				//Dashboard List from MapsBI
				var mbidashlist = nsform.addField('custpage_mbidash','select','MapsBI Dashboards: ',null,null);
				mbidashlist.addSelectOption('', '', true);
				mbidashlist.setLayoutType('outsideabove','startrow');
				//loop through all Dashboards
				for (var d=0; arDashlist && d < arDashlist.length; d++) {
					var djson = arDashlist[d];
					//"DashboardID":2147483647,
					//"Name":"String content",
					//"UserID":2147483647
					mbidashlist.addSelectOption(djson['DashboardID'], djson['Name'], false);
				}
				//TODO: Set default value for list
				mbidashlist.setDefaultValue(mapsBiDashboardId);
				
				//Dashboard to display selected. 
				//Grab dashboard display URL
				if (mapsBiDashboardId) {
					//show dashboard
					nsform.addFieldGroup('custpage_dashdisplay', 'Dashboard', null);
					
					//get dash share link
					var shareLinkUrl = 'https://mapsbi.com/api/Dashboards/'+mapsBiDashboardId+'/ShareUrl?apiKey='+mbiApiKey+'&output=json';
					var shareLinkRes = nlapiRequestURL(shareLinkUrl);
					//test
					//var testslink = nsform.addField('custpge_test', 'textarea', 'share link:  ', null, 'custpage_dashdisplay');
					//testslink.setDefaultValue(shareLinkRes.getBody());
					//testslink.setDisplayType('hidden');
					
					//test
					//var testehlink = nsform.addField('custpge_testhtml', 'textarea', 'embed html:  ', null, 'custpage_dashdisplay');
					//testehlink.setDefaultValue(embedHtmlRes.getBody());
					//testehlink.setDisplayType('hidden');
					
					//iFrame
					var iframeDisplay = nsform.addField('custpage_ifdashdisplay', 'inlinehtml','', null, 'custpage_dashdisplay');
					//get embed HTML
					var embedHtmlUrl = 'https://mapsbi.com/api/Dashboards/'+mapsBiDashboardId+'/EmbedHTML?apiKey='+mbiApiKey+'&output=json';
					var embedHtmlRes = nlapiRequestURL(embedHtmlUrl);
					
					var iframeHtml =embedHtmlRes.getBody();
					
					log('debug','Original iframeHTML',iframeHtml);
					
					//3/3/2016 - Fix to display. MapsBI is working on the fix
					//Swap out http:// to https://
					
					//6/6/2016 - Fix from Bernie: maps.bi is always http. need to use mapsbi.com for https
					iframeHtml = strGlobalReplace(iframeHtml, 'http://maps.bi','https://mapsbi.com');
					
					//var iframeHtml = strGlobalReplace(embedHtmlRes.getBody(), '\"', '');
					log('debug','After iframeHTML',iframeHtml);
					//iframeHtml = strGlobalReplace(iframeHtml, '\\\\','');
					//iframeHtml = strGlobalReplace(iframeHtml, 'http:','https:');
					//2/24/2015 - Issue with destination URL. Need to change http://maps.bi with https://mapsbi.com
					//iframeHtml = strGlobalReplace(iframeHtml, 'maps.bi/','mapsbi.com/');
					
					iframeDisplay.setDefaultValue(iframeHtml);
					iframeDisplay.setBreakType('startrow');
					
					/**
					var iframeUrl = strGlobalReplace(shareLinkRes.getBody(), '\"', '');
					iframeUrl = strGlobalReplace(iframeUrl, '\\\\','');
					//replace to https
					iframeUrl = strGlobalReplace(iframeUrl, 'http','https');
					//iframeDisplay.setDefaultValue("<iframe width='1000' height='800' name='mapsBIDash' id='mapsbidashiframe' src='"+iframeUrl+"'></iframe>");
					//iframeDisplay.setDefaultValue(iframeUrl);
					*/
					
					
				}
				
			}
			
		} catch (mbierr) {
			statusfld.setDefaultValue('<span style="color:red"><b>'+getErrText(mbierr)+'</b></span>');
		}		
	}
	
	res.writePage(nsform);	
}
