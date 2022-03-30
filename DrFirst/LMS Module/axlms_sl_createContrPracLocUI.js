
var uival = {
	'contract':'',
	'ctrec':null,
	'ctnew':'',
	'ptnew':''
};

var nsform = null;

function createCtrPracLocUi(req, res) {
	//1. create UI form.
	nsform = nlapiCreateForm('LMS Contract/Practice/Location Creation Wizard', false);
	nsform.setScript('customscript_axlms_cs_lmscreatewiz');
	
	//Add in submit button
	nsform.addSubmitButton('Submit Request');
	
	var procmsg = nsform.addField('custpage_procmsg', 'inlinehtml', '', null, null);
	procmsg.setLayoutType('outsideabove');
	//Display what's been passed back after processing
	var slProcMsg = '';
	if (req.getParameter('custparam_procmsg')) {
		if (req.getParameter('custparam_procmsg').indexOf('ERROR') > -1) {
			slProcMsg = '<div style="color:red; font-size: 14px; font-weight:bold">'+req.getParameter('custparam_procmsg')+'</div>';
		} else {
			slProcMsg = '<div style="color:green; font-size: 14px; font-weight:bold">'+req.getParameter('custparam_procmsg')+'</div>';
		}
	}
	procmsg.setDefaultValue(slProcMsg);
	
	//log('debug','Request contract', req.getParameter('custpage_contract'));
	//log('debug','Request param contract', req.getParameter('custparam_contract'));
	
	//Grab and populate uival 
	uival.contract = req.getParameter('custpage_contract');
	if (!uival.contract) {
		uival.contract = req.getParameter('custparam_contract');
	}
	
	if (req.getParameter('custpage_newcontract') == 'T') {
		uival.ctnew = 'T';
	}
	
	
	if (req.getParameter('custpage_newpractice') == 'T') {
		uival.ptnew = 'T';
	}
	
	try {
		//------------------------- SUBMIT POST Action ------------------------------------------------------------------------
		if (req.getMethod() == 'POST') {
			
			var procStatus = '';
			
			log('debug','uival', JSON.stringify(uival));
			
			try {
				
				//Assume uival.contract is set IF user set it on the previous
				if (uival.ctnew=='T') {
					//Create NEW contract and set it as uival.contract
					var newContractRec = nlapiCreateRecord('customrecord_lmsc', {recordmode:'dynamic'});
					newContractRec.setFieldValue('name', req.getParameter('custpage_ctname'));
					newContractRec.setFieldValue('custrecord_lmsct_username', req.getParameter('custpage_ctusername'));
					newContractRec.setFieldValue('custrecord_lmsct_type', req.getParameter('custpage_cttype'));
					newContractRec.setFieldValue('custrecord_lmsct_startdate', req.getParameter('custpage_ctstartdate'));
					newContractRec.setFieldValue('custrecord_lmsct_endate', req.getParameter('custpage_ctenddate'));
					newContractRec.setFieldValue('custrecord_lmsct_ctmanager', req.getParameter('custpage_ctmanager'));
					newContractRec.setFieldValues('custrecord_lmsct_items', req.getParameterValues('custpage_ctitemsincluded'));
					newContractRec.setFieldValue('custrecord_lmsct_accessregion', req.getParameter('custpage_ctregion'));
					newContractRec.setFieldValue('custrecord_lmsct_contactfname', req.getParameter('custpage_ctfname'));
					newContractRec.setFieldValue('custrecord_lmsct_contactlname', req.getParameter('custpage_ctlname'));
					newContractRec.setFieldValue('custrecord_lmsct_contactemail', req.getParameter('custpage_ctemail'));
					log('debug','avail regions',req.getParameterValues('custpage_ctavlregion'));
					if (req.getParameterValues('custpage_ctavlregion'))
					{
						var availRegion = req.getParameterValues('custpage_ctavlregion');
						var newAvailRegion = [];
						for (var ar=0; ar < availRegion.length; ar+=1)
						{
							if (availRegion[ar]!='-1')
							{
								newAvailRegion.push(availRegion[ar]);
							}
						}
						
						newContractRec.setFieldValues('custrecord_lmsct_availregions', newAvailRegion);
					}
					
					if (req.getParameter('custpage_ctactstatus'))
					{
						newContractRec.setFieldValue('custrecord_lmsct_activestatus', req.getParameter('custpage_ctactstatus'));
					}
					
					//11/16/2015 - Modification added to track UI create/changed checkbox. 
					newContractRec.setFieldValue('custrecord_lmsct_uiupdateddt', 'T');
					
					uival.contract = nlapiSubmitRecord(newContractRec, true, true);
					
					procStatus += 'New Contract ID ('+uival.contract+') Created Successfully.';
				}
				
				//If New Practice is marked AND contract ID is set, create it
				if (uival.ptnew=='T' && uival.contract) {
					//Create NEW practice using contract ID 
					var newPracticeRec = nlapiCreateRecord('customrecord_lmsp', {recordmode:'dynamic'});
					newPracticeRec.setFieldText('custrecord_lmsp_pcountry','United States');
					newPracticeRec.setFieldValue('name', req.getParameter('custpage_pracname'));
					newPracticeRec.setFieldValue('custrecord_lmsp_username',req.getParameter('custpage_pracusername'));
					newPracticeRec.setFieldValue('custrecord_lmsp_contract', uival.contract);
					newPracticeRec.setFieldValue('custrecord_lmsp_enduser', req.getParameter('custpage_praccust'));
					newPracticeRec.setFieldValue('custrecord_lmsp_accessregion', req.getParameter('custpage_pracaccreg'));
					newPracticeRec.setFieldValue('custrecord_lmsp_billtype', req.getParameter('custpage_pracbilltype'));
					newPracticeRec.setFieldValues('custrecord_lmsp_items', req.getParameterValues('custpage_pracitemsincluded'));
					newPracticeRec.setFieldValue('custrecord_lmsp_email', req.getParameter('custpage_pracemail'));
					newPracticeRec.setFieldValue('custrecord_lmsp_phone', req.getParameter('custpage_pracphone'));
					newPracticeRec.setFieldValue('custrecord_lmsp_fax', req.getParameter('custpage_pracfax'));
					newPracticeRec.setFieldValue('custrecord_lmsp_addr1', req.getParameter('custpage_pracaddr1'));
					newPracticeRec.setFieldValue('custrecord_lmsp_addr2', req.getParameter('custpage_pracaddr2'));
					newPracticeRec.setFieldValue('custrecord_lmsp_city', req.getParameter('custpage_praccity'));
					newPracticeRec.setFieldValue('custrecord_lmsp_statetext', req.getParameter('custpage_pracstate'));
					newPracticeRec.setFieldValue('custrecord_lmsp_zip', req.getParameter('custpage_praczip'));
					newPracticeRec.setFieldValue('custrecord_lmsp_activestatus', req.getParameter('custpage_practstatus'));
					
					for (var us in usStateList)
					{
						if (usStateList[us] == req.getParameter('custpage_pracstate') )
						{
							newPracticeRec.setFieldText('custrecord_lmsp_state', us);
							log('debug','state full name',usStateList[us]);
							break;
						}
					}
					log('debug','state abbr',req.getParameter('custpage_pracstate'));
					
					//11/16/2015 - Modification added to track UI create/changed
					newPracticeRec.setFieldValue('custrecord_lmsp_uiupdateddt', 'T');
					
					var newPracId = nlapiSubmitRecord(newPracticeRec, true, true);
					
					procStatus += ' New Practice ID ('+newPracId+') Created Successfully.';
					
				}
				
			} catch (procerr) {
				
				procStatus += 'ERROR: '+getErrText(procerr);
			}
			
			var redirparam = {};
			redirparam['custparam_procmsg'] = procStatus;
			
			nlapiSetRedirectURL('SUITELET', nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), 'VIEW', redirparam);
			return;
		}
		//----------------------- END POST Action ----------------------------------------------------------------------------------------
		
		//Load the Records if Set
		if (uival.contract) {
			uival.ctrec = nlapiLoadRecord('customrecord_lmsc', uival.contract);
		}
		
		//Configuration 
		nsform.addFieldGroup('custpage_a', 'Creation Options', null);
		//--- Contract Config
		var ctfld = nsform.addField('custpage_contract', 'select', 'Contract', 'customrecord_lmsc', 'custpage_a');
		ctfld.setBreakType('startcol');
		log('debug','uival.contract',uival.contract);
		ctfld.setDefaultValue(uival.contract);
		//Note to User NOT to use Native Create New Option
		//Create new contract option
		var ctnewfld = nsform.addField('custpage_newcontract', 'checkbox','Create New Contract', null, 'custpage_a');
		ctnewfld.setDefaultValue(uival.ctnew);
		//Disable checkbox if user selected contract
		if (uival.contract) {
			ctnewfld.setDisplayType('disabled');
			ctnewfld.setDefaultValue('F');
		}
		//Help Notice
		var ctnewhelp = nsform.addField('custpage_contracthelp', 'inlinehtml', '', null, 'custpage_a');
		ctnewhelp.setDefaultValue('<i><b>CHECK THIS BOX</b> to Create New Contract As Part of this Process.<br/> Do NOT Use Native create new option</i>');
		
		
		//--- Practice Config
		var pracheaderinfo = nsform.addField('custpage_newprachead','inlinehtml',null,null,'custpage_a');
		pracheaderinfo.setBreakType('startcol');
		pracheaderinfo.setDefaultValue('<b>Check This Box to create new Practice</b>');
		
		var pracnewfld = nsform.addField('custpage_newpractice', 'checkbox','Create New Practice', null, 'custpage_a');
		
		//Contract Field Values
		nsform.addFieldGroup('custpage_b', 'Contract Information', null);
		//-----------------------------------------------Contract fields
		var ctnamefld = nsform.addField('custpage_ctname', 'text', 'Contract Name',null, 'custpage_b');
		ctnamefld.setBreakType('startcol');
		if (uival.ctrec) {
			ctnamefld.setDefaultValue(uival.ctrec.getFieldValue('name'));
			ctnamefld.setDisplayType('disabled');
		}
		ctnamefld.setMandatory(true);
		ctnamefld.setMaxLength(100);
		
		//Add in Disabled Contract External ID
		var ctrcopiaidfld = nsform.addField('custpage_ctrcopiaid','text','Contract Rcopia ID', null, 'custpage_b');
		if (uival.ctrec) {
			ctrcopiaidfld.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_externalid'));
		}
		ctrcopiaidfld.setDisplayType('disabled');
		
		//Add in Region (custrecord_lmsct_accessregion)
		var ctregionfld = nsform.addField('custpage_ctregion', 'select','Contract Default Region','customrecord_lms_regionref','custpage_b');
		ctregionfld.setMandatory(true);
		if (uival.ctrec) 
		{
			ctregionfld.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_accessregion'));
			ctregionfld.setDisplayType('disabled');
			ctregionfld.setMandatory(false);
		}
		
		//Add in Available Regions Multiselect
		var ctavlregionfld = nsform.addField('custpage_ctavlregion','multiselect','Contract Available Region','customrecord_lms_regionref','custpage_b');
		ctavlregionfld.setMandatory(true);
		if (uival.ctrec)
		{
			ctavlregionfld.setDefaultValue(uival.ctrec.getFieldValues('custrecord_lmsct_availregions'));
			ctavlregionfld.setDisplayType('disabled');
			ctavlregionfld.setMandatory(false);
		}
		
		//contract username
		var ctusername = nsform.addField('custpage_ctusername','text','Contract Username',null,'custpage_b');
		ctusername.setDisplayType('normal');
		ctusername.setBreakType('startcol');
		ctusername.setMandatory(true);
		if (uival.ctrec) {
			ctusername.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_username'));
			ctusername.setDisplayType('disabled');
			ctusername.setMandatory(false);
		}
		ctusername.setMaxLength(30);
		//NOTICE
		nsform.addField('custpage_ctusernamehelp','inlinehtml',null,null,'custpage_b').setDefaultValue('<i>New Contract Username will be prefixed with LMSC.<br/>System will check for uniqueness.</i>');
		//Add in proces marker
		var ctusernamechanged = nsform.addField('custpage_ctusernamechanged','checkbox','Validate Username', null, 'custpage_b');
		ctusernamechanged.setDisplayType('disabled');
		
		var ctusernameunique = nsform.addField('custpage_ctusernameunique','checkbox','Is Username Unique', null, 'custpage_b');
		ctusernameunique.setDisplayType('disabled');
		
		//Contract active status
		//9/14/2015
		//Used to reference 'customrecord_lms_statustypes'. Client request to ONLY display A, D, X
		var ctactstatus = nsform.addField('custpage_ctactstatus','select','Contract Status',null,'custpage_b');
		ctactstatus.addSelectOption('', '', true);
		ctactstatus.addSelectOption('1', 'A', false);
		ctactstatus.addSelectOption('2', 'D', false);
		ctactstatus.addSelectOption('4', 'X', false);
		
		if (uival.ctrec) {
			ctactstatus.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_activestatus'));
		}
		else
		{
			//Add in default as active
			ctactstatus.setDefaultValue('1');
		}
		ctactstatus.setDisplayType('disabled');
		
		//contract type
		var cttype = nsform.addField('custpage_cttype', 'select', 'Contract Type','customrecord_lmstypelist', 'custpage_b');
		if (uival.ctrec) {
			cttype.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_type'));
			cttype.setDisplayType('disabled');
		}
		cttype.setMandatory(true);
		
		//8/10/2015 - Add items that can be added/used for all practice and licenses under THIS contract
		//Add Multi select item list
		var ctItems = nsform.addField('custpage_ctitemsincluded', 'multiselect', 'Items Included','item','custpage_b');
		if (uival.ctrec) {
			ctItems.setDefaultValue(uival.ctrec.getFieldValues('custrecord_lmsct_items'));
			ctItems.setDisplayType('disabled');
		}
		
		//contract manager
		var ctmgr = nsform.addField('custpage_ctmanager', 'text', 'Contract Manager', null, 'custpage_b');
		ctmgr.setBreakType('startcol');
		if (uival.ctrec) {
			ctmgr.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_ctmanager'));
			ctmgr.setDisplayType('disabled');
		}
		ctmgr.setMaxLength(60);
		
		//Contract start date
		var ctstartdt = nsform.addField('custpage_ctstartdate','datetimetz','Contract Start Date', null, 'custpage_b');
		ctstartdt.setMandatory(true);
		if (uival.ctrec) {
			ctstartdt.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_startdate'));
			ctstartdt.setDisplayType('disabled');
			ctstartdt.setMandatory(false);
		}
		
		//Contract end date
		var ctenddt = nsform.addField('custpage_ctenddate','datetimetz','Contract End Date', null, 'custpage_b');
		ctenddt.setMandatory(true);
		if (uival.ctrec) {
			ctenddt.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_endate'));
			ctenddt.setDisplayType('disabled');
			ctenddt.setMandatory(false);
		}
		
		//--- Add in Contact first/last/email
		var ctfname = nsform.addField('custpage_ctfname','text','Contact First Name', null,'custpage_b');
		ctfname.setMandatory(true);
		if (uival.ctrec) {
			ctfname.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_contactfname'));
			ctfname.setDisplayType('disabled');
			ctfname.setMandatory(false);
		}
		ctfname.setMaxLength(35);
		
		var ctlname = nsform.addField('custpage_ctlname','text','Contact Last Name', null,'custpage_b');
		ctlname.setMandatory(true);
		if (uival.ctrec) {
			ctlname.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_contactlname'));
			ctlname.setDisplayType('disabled');
			ctlname.setMandatory(false);
		}
		ctlname.setMaxLength(35);
		
		var ctemail = nsform.addField('custpage_ctemail','text','Contact Email', null,'custpage_b');
		if (uival.ctrec) {
			ctemail.setDefaultValue(uival.ctrec.getFieldValue('custrecord_lmsct_contactemail'));
			ctemail.setDisplayType('disabled');
		}
		ctemail.setMaxLength(80);
		
		//----------------------------------------------Practice & Location Field Values
		//------ Practice --------------
		nsform.addFieldGroup('custpage_c', 'Practice Information', null);
		
		var pracnamefld = nsform.addField('custpage_pracname', 'text', 'Practice Name',null, 'custpage_c');
		pracnamefld.setBreakType('startcol');
		pracnamefld.setMaxLength(100);
		
		var praccust = nsform.addField('custpage_praccust','select','NS Customer', 'customer', 'custpage_c');
		//NOTICE
		nsform.addField('custpage_praccusthelp','inlinehtml',null,null,'custpage_c').setDefaultValue('<i>NetSuite Customer linked to THIS Practice if Known</i>');
		
		//Practice active status
		//9/14/2015
		//Used to reference 'customrecord_lms_statustypes'. Client request to ONLY display A, D, X
		var practicestatus = nsform.addField('custpage_practstatus','select','Practice Status',null,'custpage_c');
		practicestatus.addSelectOption('', '', false);
		practicestatus.addSelectOption('1', 'A', true);
		practicestatus.addSelectOption('2', 'D', false);
		practicestatus.addSelectOption('4', 'X', false);
		//Disabled it and lock it down
		practicestatus.setDisplayType('disabled');
		
		//Practice Access Region
		var pracaccessreg = nsform.addField('custpage_pracaccreg','select','Practice Access Region', 'customrecord_lms_regionref', 'custpage_c');
		
		//Practice Billing Type
		var pracbilltype = nsform.addField('custpage_pracbilltype','select','Practice Billing Type','customrecord_lms_master_billtypevalues', 'custpage_c');
		
		//Add Multi select item list
		var practiceItems = nsform.addField('custpage_pracitemsincluded', 'multiselect', 'Items Included','item','custpage_c');
		practiceItems.setDisplayType('disabled');
		//Add the values by default selected
		if (uival.ctrec) {
			practiceItems.setDefaultValue(uival.ctrec.getFieldValues('custrecord_lmsct_items'));
		}
		
		//Practice username
		var pracusername = nsform.addField('custpage_pracusername','text','Practice Username',null,'custpage_c');
		pracusername.setMandatory(false);
		pracusername.setBreakType('startcol');
		//pracusername.setDisplayType('disabled');
		//NOTICE
		nsform.addField('custpage_pracusernamehelp','inlinehtml',null,null,'custpage_c').setDefaultValue('<i>New Practice Username will be prefixed with LMSP.<br/>System will check for uniqueness.</i>');
		//Add in proces marker
		var pracusernamechanged = nsform.addField('custpage_pracusernamechanged','checkbox','Validate Username', null, 'custpage_c');
		pracusernamechanged.setDisplayType('disabled');
		
		var pracusernameunique = nsform.addField('custpage_pracusernameunique','checkbox','Is Username Unique', null, 'custpage_c');
		pracusernameunique.setDisplayType('disabled');
		
		//12/24/2015 - Add in Practice Email
		var pracEmailFld = nsform.addField('custpage_pracemail','email','Practice Email',null,'custpage_c');
		//4/11/2016 - Request to have Email field Required
		//pracEmailFld.setMandatory(true);
		
		//4/14/2016 - Seth requested that we revert back the phone and fax setting.
		//			  Removing NS formatting broke Rcopia.
		
		//Practice Phone
		var pracphone = nsform.addField('custpage_pracphone','phone','Practice Phone',null,'custpage_c');
		pracphone.setMaxLength(30);
		
		//Practice Fax
		var pracfax = nsform.addField('custpage_pracfax','phone','Practice Fax',null,'custpage_c');
		pracfax.setMaxLength(20);
		
		//------ Practice Address --------------
		var praccountryinfo = nsform.addField('custpage_praccountryinfo','inlinehtml',null,null, 'custpage_c');
		praccountryinfo.setDefaultValue('<b>This Tool Assumes Address of Practice is United States</b>');
		praccountryinfo.setBreakType('startcol');
		
		var addr1 = nsform.addField('custpage_pracaddr1','text','Practice Address 1',null, 'custpage_c');
		addr1.setMaxLength(50);
		
		var addr2 = nsform.addField('custpage_pracaddr2','text','Practice Address 2',null, 'custpage_c');
		addr2.setMaxLength(50);
		
		var cityfld = nsform.addField('custpage_praccity','text','Practice City',null, 'custpage_c');
		cityfld.setMaxLength(50);
		
		var pracstate = nsform.addField('custpage_pracstate','select','Practice State',null, 'custpage_c');
		pracstate.addSelectOption('', '', true);
		//Key is Long Name. Value is Abbr
		for (var st in usStateList) {
			pracstate.addSelectOption(usStateList[st], st, false);
		}
		
		var zipfld = nsform.addField('custpage_praczip','text','Practice Zip',null, 'custpage_c');
		zipfld.setMaxLength(20);
		
	} catch (unexpe) {
		procmsg.setDefaultValue('<div style="color:red; font-weight: bold">'+getErrText(unexpe)+'</div>');
	}
	
	//write out the form
	res.writePage(nsform);
}

/************************ Client Script ****************************/
//10/28/2015 - Seth requested to have the Practice Address be Required
var reqPracticeFields = ['custpage_pracusername','custpage_pracname','custpage_pracaccreg','custpage_pracbilltype',
                         'custpage_pracaddr1','custpage_praccity','custpage_pracstate','custpage_praczip','custpage_pracphone','custpage_pracfax'];
/**
 * Page init function
 */
function createWizPageInit() {
	//try to remove - New - Option
	//nlapiRemoveSelectOption('custpage_contract', -1);	
	
	//ONLY Allow Practice creation when there is a value for contract rcopia ID
	//if (!nlapiGetFieldValue('custpage_ctrcopiaid'))
	//{
	//	nlapiDisableField('custpage_newpractice', true);
	//}
	
}

/**
 * field changed function
 * @param type
 * @param name
 * @param linenum
 */
function createWizFieldChange(type, name, linenum) {

	var wizurl = nlapiResolveURL('SUITELET', 'customscript_axlms_lmscreatewiz', 'customdeploy_axlms_createwizard', 'VIEW');
	
	//When configuration drop down changes, refresh the page passing in necessary values
	if (name == 'custpage_contract') 
	{
		
		window.ischanged = false;
		window.location = wizurl + '&custparam_contract='+nlapiGetFieldValue('custpage_contract')+'&custparam_practice='+nlapiGetFieldValue('custpage_practice');
	}
	
	//8/10/2015 --- Add in Defaults
	//New Contract checkbox
	if (name == 'custpage_newcontract')
	{
		if (nlapiGetFieldValue(name)=='T' && !nlapiGetFieldValue('custpage_ctregion'))
		{
			//default contract access region to R3
			nlapiSetFieldText('custpage_ctregion','R3',true, true);
		}
		
	}
	
	//Contract access region drop down
	if (name == 'custpage_ctregion')
	{
		if (nlapiGetFieldValue('custpage_newpractice')=='T' && nlapiGetFieldValue(name))
		{
			nlapiSetFieldValue('custpage_pracaccreg', nlapiGetFieldValue(name));
		}
	}
	
	//New Practice checkbox
	if (name == 'custpage_newpractice')
	{
		if (nlapiGetFieldValue(name) == 'T' && nlapiGetFieldValue('custpage_ctregion') )
		{
			nlapiSetFieldValue('custpage_pracaccreg', nlapiGetFieldValue('custpage_ctregion'));
		}
		
		//clear if unchecked
		if (nlapiGetFieldValue(name) == 'F')
		{
			nlapiSetFieldValue('custpage_pracaccreg', '');
			nlapiSetFieldValue('custpage_pracitemsincluded','');
		}
		
		//Sync Items 
		if (nlapiGetFieldValue(name) == 'T')
		{
			if (nlapiGetFieldValues('custpage_ctitemsincluded'))
			{
				nlapiSetFieldValues('custpage_pracitemsincluded',nlapiGetFieldValues('custpage_ctitemsincluded'));
			}
		}
		
		//9/14/2015 - Loop through and make Practice visually required or NOT
		//reqPracticeFields
		for (var p=0; p < reqPracticeFields.length; p+=1)
		{
			var setRequired = false;
			if (nlapiGetFieldValue(name) == 'T')
			{
				setRequired = true;
			}
			
			nlapiSetFieldMandatory(reqPracticeFields[p],setRequired);
		}
		
	}
	
	//8/10/2015 --- Match contract items with practice items by default
	if (name == 'custpage_ctitemsincluded' && nlapiGetFieldValue('custpage_newpractice') == 'T')
	{
		if (nlapiGetFieldValues(name))
		{
			nlapiSetFieldValues('custpage_pracitemsincluded',nlapiGetFieldValues(name));
		}
		else
		{
			nlapiSetFieldValue('custpage_pracitemsincluded','');
		}
	}
	
	//8/10/2015 --- Addin defaulting, validation and search for username fields
	if ( (name=='custpage_pracusername' || name=='custpage_ctusername') )
	{
		if (!nlapiGetFieldValue(name))
		{
			//reset the fields
			if (name == 'custpage_pracusername')
			{
				nlapiSetFieldValue('custpage_pracusernamechanged','F');
				nlapiSetFieldValue('custpage_pracusernameunique','F');
			}
			else
			{
				nlapiSetFieldValue('custpage_ctusernamechanged','F');
				nlapiSetFieldValue('custpage_ctusernameunique','F');
			}
		}
		else
		{
			//Append LMSP or LMSC in front of the username provided 
			var usernameVal = nlapiGetFieldValue(name);
			var isUniqueFieldId = '';
			if (name == 'custpage_pracusername')
			{
				
				//check for LMSP for Practice
				if (usernameVal.toLowerCase().substr(0,4) != 'lmsp')
				{
					usernameVal = 'lmsp-'+usernameVal;
					nlapiSetFieldValue(name, usernameVal, false, true);
				}
				
				nlapiSetFieldValue('custpage_pracusernamechanged','T');
				isUniqueFieldId = 'custpage_pracusernameunique';
			}
			else
			{
				//Default to LMSC for Contract
				if (usernameVal.toLowerCase().substr(0,4) != 'lmsc')
				{
					usernameVal = 'lmsc-'+usernameVal;
					nlapiSetFieldValue(name, usernameVal, false, true);
				}
				
				nlapiSetFieldValue('custpage_ctusernamechanged','T');
				isUniqueFieldId = 'custpage_ctusernameunique';
			}
			
			//Need to check uniqueness
			//alert('Running check with this value: '+usernameVal);
			var slUrl = nlapiResolveURL(
				'SUITELET', 
				'customscript_axlms_lmsuniqueusername', 
				'customdeploy_axlms_lmsuniqueusername', 
				'VIEW'
			);
			
			slUrl += '&custparam_username='+usernameVal;
			
			try
			{
				var res = nlapiRequestURL(slUrl);
				var resjson = eval(res.getBody());
				
				if (resjson.haserr)
				{
					throw nlapiCreateError('LMS-UNIQUE-ERR', resjson.message, true);
				}
				
				if (resjson.hasmatch)
				{
					nlapiSetFieldValue(isUniqueFieldId,'F');
					alert(resjson.message);
				}
				else
				{
					nlapiSetFieldValue(isUniqueFieldId,'T');
				}
				
			}
			catch (uniquecheckerr)
			{
				alert('Error while validating uniqueness of username: '+getErrText(uniquecheckerr));
			}
		}
		
	}	
	
}

/**
 * save record function
 * @returns {Boolean}
 */
function createWizSaveRecord() {
	
	//0. Make sure user has entered in unique user names for contract and prctice IF they are to be created
	if (nlapiGetFieldValue('custpage_ctusernamechanged')=='T' && nlapiGetFieldValue('custpage_ctusernameunique') !='T')
	{
		alert('Contract Username must be unique.');
		return false;
	}
	
	if (nlapiGetFieldValue('custpage_pracusernamechanged')=='T' && nlapiGetFieldValue('custpage_pracusernameunique') !='T')
	{
		alert('Practice Username must be unique.');
		return false;
	}
	
	//1. Neither Create new Contract and Create Practice is checked, and Contract list is not set
	if (!nlapiGetFieldValue('custpage_contract') && nlapiGetFieldValue('custpage_newcontract') != 'T' && nlapiGetFieldValue('custpage_newpractice') != 'T') {
		alert('You must choose creation option. You can choose to create both Contract and Practice or Practice under an existing Contract');
		return false;
	}
	
	//2. Contract is selected but Create Practice is NOT checked
	if (nlapiGetFieldValue('custpage_contract') && nlapiGetFieldValue('custpage_newpractice') != 'T') {
		alert('If you want to create new Practice under an existing Contract, you MUST check "Create New Practice" Checkbox');
		return false;
	}
	
	//3. If create new contract is selected but no values are provided for required.
	if (nlapiGetFieldValue('custpage_newcontract')=='T') {
		var reqContractFields = ['custpage_ctname','custpage_cttype','custpage_ctstartdate', 'custpage_ctregion'];
		//loop through and make sure all fields have values
		for (var ct=0; ct < reqContractFields.length; ct++) {
			if (!nlapiGetFieldValue(reqContractFields[ct])) {
				alert('You must provide Contract Name, Contract Type and Contract Start Date');
				return false;
				break;
			}
		}
	}
	
	//4. If create new practice is selected but no values are provided for required fields
	if (nlapiGetFieldValue('custpage_newpractice') == 'T') 
	{
		
		//Make sure contract is selected
		if (!nlapiGetFieldValue('custpage_contract') && nlapiGetFieldValue('custpage_newcontract') != 'T') {
			alert('You must choose existing OR create new contract to link this practice to');
			return false;
		}
		
		//loop through and make sure all fields have values
		for (var pt=0; pt < reqPracticeFields.length; pt++) {
			if (!nlapiGetFieldValue(reqPracticeFields[pt])) {
				alert('You must provide Practice Username, Practice Name, Practice Access Region and Practice Billing Type');
				return false;
				break;
			}
		}
		
		//9/29/2016
		//Practice Email should ONLY be required if practice is to be created
		if (!nlapiGetFieldValue('custpage_pracemail'))
		{
			alert('You must provide Practice Email');
			return false;
		}
		
		//4/11/2016 - Need to make sure we change strip out any phone characters
		var phoneVal = nlapiGetFieldValue('custpage_pracphone'),
			faxVal = nlapiGetFieldValue('custpage_pracfax');
		
		//4/14/2016 - Seth requested to revert back to original state.
		//			  Removing phone number formatting and only sending 10 digit values broke Rcopia
		/**
		if (phoneVal)
		{
			phoneVal = strGlobalReplace(phoneVal, ' ', '');
			phoneVal = strGlobalReplace(phoneVal, '-', '');
			phoneVal = strGlobalReplace(phoneVal, '\\(', '');
			phoneVal = strGlobalReplace(phoneVal, '\\)', '');
			
			nlapiSetFieldValue('custpage_pracphone',phoneVal,false,true);
			
			if (phoneVal && phoneVal.length > 10)
			{
				alert('You must provide 10 digit phone number');
				return false;
			}
		}
		
		if (faxVal)
		{
			faxVal = strGlobalReplace(faxVal, ' ', '');
			faxVal = strGlobalReplace(faxVal, '-', '');
			faxVal = strGlobalReplace(faxVal, '\\(', '');
			faxVal = strGlobalReplace(faxVal, '\\)', '');
			
			nlapiSetFieldValue('custpage_pracfax',faxVal,false,true);
			
			if (faxVal && faxVal.length > 10)
			{
				alert('You must provide 10 digit fax number');
				return false;
			}
		}
		*/
	}
	
	//4/11/2016 - Enforce Lower case user name
	if (nlapiGetFieldValue('custpage_pracusername'))
	{
		nlapiSetFieldValue(
			'custpage_pracusername', 
			nlapiGetFieldValue('custpage_pracusername').toLowerCase(),
			false,
			true
		);
	}
	
	if (nlapiGetFieldValue('custpage_ctusername'))
	{
		nlapiSetFieldValue(
			'custpage_ctusername', 
			nlapiGetFieldValue('custpage_ctusername').toLowerCase(),
			false,
			true
		);
	}
	
	return true;
}