
var paramLastProcTrxId = nlapiGetContext().getSetting('SCRIPT', 'custscript_293_lasttrxid');

//CBL: Transaction Inactive/Active Item Swap Status
var csvFileFolderId = '668345';

function processInactiveItemCorrection() {
	
	var iajson = {};
	var hasIaMap = false;
	
	var trxtype = {
		'SalesOrd':'salesorder',
		'Estimate':'estimate'
	};
	
	var csvheader = '"Replace Status","Proc Desc","Trx Internal ID","Trx Line Number","Inactive Item Internal ID","Matching Active Item Internal ID"\n'
	var csvlinebody = '';
		
	//Set Item and Item Optioin as default first
	var columnsToSync = ['job','description','quantity','price','rate','amount','department','class','location','porate',
	                     'billingschedule',
	                     'revrec_defrevacct','revrecenddate','revrecschedule','revrecstartdate',
						 'costestimatetype', 
						 'custcol_cbl_viewbooking_llink', 
						 'custcol_inv_revrecamount',
						 'custcol_job_isjob',
						 'custcol_job_template', 
						 'custcol_lineid', 
						 'custcol_nature_of_transaction_codes',
						 'custcol_turnup_item', 
						 'custcol_turnup_logic', 
						 'custcolready_to_invoice_checkbox',
						 'custcol_desc_format',
						 'custcol_invco_amount',
						 'custcol_invco_tax1amt',
						 'custcol_invco_displayname',
						 'custcol_invco_grossamt',
						 'custcol_invco_taxrate',
						 'custbody_invco_type',
						 'custcol_revrec_amount',
						 'custbody_category',
						 'custcol_nondeductible_account']; 
	
	try {
		
		//Grab and build JSON object of inactive to active mapping for easy access.
		var iaflt = [new nlobjSearchFilter('isinactive', null,'is','F')];
		var iacol = [new nlobjSearchColumn('custrecord_cbl_iai_inactive_id'),
		             new nlobjSearchColumn('custrecord_cbl_iai_active_id')];
		var iars = nlapiSearchRecord('customrecord_cbl_inactiveactive_itemmap', null, iaflt, iacol);
		if (iars && iars.length > 0) {
			hasIaMap = true;
			for (var ia=0; ia < iars.length; ia++) {
				iajson[iars[ia].getValue('custrecord_cbl_iai_inactive_id')] = iars[ia].getValue('custrecord_cbl_iai_active_id');
			}
		}
		
		if (!hasIaMap) {
			log('audit','No Inactive to Active Mapping','No I-A Mapping Available');
			return;
		}
		
		//---------------------------- Start the process ----------------------------------------------
		//Sales Order Statuses
		//'SalesOrd:F','SalesOrd:E','SalesOrd:D','SalesOrd:B','SalesOrd:A',
        
		var trxflt = [new nlobjSearchFilter('isinactive','item', 'is','T'),
		              new nlobjSearchFilter('trandate', null, 'onorafter','1/1/2014'),
		              new nlobjSearchFilter('mainline', null, 'is', 'F'),
		              new nlobjSearchFilter('status', null, 'anyof',['Estimate:A','Estimate:B','Estimate:C','Estimate:X','Estimate:V'])];
		
		
		if (paramLastProcTrxId) {
			trxflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcTrxId));
		}
		
		var trxcol = [new nlobjSearchColumn('internalid', null,'group').setSort(true),
		              new nlobjSearchColumn('type', null, 'group')];
		//search and return grouped internal IDs to process
		var trxrs = nlapiSearchRecord('transaction', null, trxflt, trxcol);
		
		//loop through each trx internal ID 
		for (var tx=0; trxrs && tx < trxrs.length; tx++) {
			
			var trxtypeid = trxtype[trxrs[tx].getValue('type', null, 'group')]; 
			var trxid = trxrs[tx].getValue('internalid', null, 'group');
			
			//load the trx to go through
			var trx = nlapiLoadRecord(trxtypeid,trxid);
			//Loop through each line item and check to see if item is inactive against iajson object
			var updrec = false;
			for (var i=1; i <= trx.getLineItemCount('item'); i++) {
				var csvprocline = '';
				updrec = false;
				
				var itemid = trx.getLineItemValue('item', 'item', i);
				//if item id exists in iajson, process
				if (iajson[itemid]) {
					updrec = true;
					//go through and grab value of column field values for current inactive item
					var lineValueJson = {};
					for (var n=0; n < columnsToSync.length; n++) {
						lineValueJson[columnsToSync[n]] = trx.getLineItemValue('item',columnsToSync[n], i);
					}
					
					//grab and build out item Option values to be set
					var itemOptionValue = trx.getLineItemValue('item','options',i);
					var lineOptionJson = {};
					if (itemOptionValue) {
					
						var arOptions = itemOptionValue.split(String.fromCharCode(4));
						
						//loop through each item option elements
						for (var j=0; j < arOptions.length; j++) {
						
							var arOpEl = arOptions[j].split(String.fromCharCode(3));
							//0=field ID, 1=T/F, 2=Label, 3=Value of the field, 4=Text of the field
							alert(arOpEl[0]+' == '+arOpEl[3]);
							lineOptionJson[arOpEl[0]] = arOpEl[3];
						}
					}
					//alert(JSON.stringify(lineOptionJson));
					
					//select THIS line item and switch out the values
					trx.selectLineItem('item', i);
					//set item field
					trx.setCurrentLineItemValue('item', 'item', iajson[itemid]);
					//set item options
					for (var op in lineOptionJson) {
						trx.setCurrentLineItemValue('item', op, lineOptionJson[op]);
					}
					//set all other fields
					for (var opf in lineValueJson) {
						trx.setCurrentLineItemValue('item',opf, lineValueJson[opf]);
					}
					trx.commitLineItem('item');
					
					//Add to CSV
					//var csvheader = '"Replace Status","Proc Desc","Trx Internal ID","Trx Line Number","Inactive Item Internal ID","Matching Active Item Internal ID"\n'
					csvprocline += '"Sublist","Sublist of '+trxtypeid+'","'+trxid+'","'+i+'","'+itemid+'","'+iajson[itemid]+'"\n';
				}	
			}
			
			if (updrec) {
				try {
					nlapiSubmitRecord(trx, true, true);
					csvlinebody += '"Success","Swap Success","'+trxid+'","","",""\n'+csvprocline;
				} catch (savetrxerr) {
					csvlinebody += '"Fail","'+getErrText(savetrxerr)+'","'+trxid+'","","",""\n'+csvprocline;
				}
			}
			//-------------------- Reschedule --------------------------------------
			if ( (trxrs.length == 1000 && (i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 200 && (i+1) < trxrs.length) ) {
				var params = new Object();
				params['custscript_293_lasttrxid'] = trxid;
				
				var schStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);
				if (schStatus=='QUEUED') {
					break;
				}
			}
			//break
		}
		
		//create csvbody is not null, create and save CSV file
		if (csvlinebody) {
			var newFileRec = nlapiCreateFile('InactiveActiveItemSwap-'+new Date().getTime()+'.csv', 'CSV', csvheader + csvlinebody);
			newFileRec.setFolder(csvFileFolderId);
			nlapiSubmitFile(newFileRec);
		}
		
		
	} catch (switcherr) {
		log('error','Error processing switch', getErrText(switcherr));
		throw nlapiCreateError('MGERR-SwtichError', getErrText(switcherr), false);
	}
	
	
}