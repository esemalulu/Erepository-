/**
 * @author JoeSon
 * AS NEEDED scheduled script to update total roll sqft for all items
 */
var logger, beacon;
//list of processed items from result set
var aritm;
var ctx = nlapiGetContext();
var processedItems = '';
var msg, sbj;
var toEmail='ondeck@audaxium.com';
var from='-5';

function updateAllItemSqft() {
	try {
		initParameters();
		var items = getAllUniqueItemsOnRolls();
	
		if (items && items.length > 0) {
			for (var i=0; i < items.length; i++) {
				var tsqft = totalSqft(items[i].getValue('custrecord_item',null,'group'));
				var itmtype = nlapiLookupField('item',items[i].getValue('custrecord_item',null,'group'),'recordtype');
				tsqft=(!tsqft)?0.00:tsqft;
				
				logger.debug('Item/Total SQFT',items[i].getValue('custrecord_item',null,'group')+'('+itmtype+')/'+tsqft);
				
				//update item with total SQFT value
				nlapiSubmitField(itmtype,items[i].getValue('custrecord_item',null,'group'),'custitem_total_sqft',tsqft);
				
				//each iteration, check to see if script needs to be re-queued 
				processedItems+=items[i].getValue('custrecord_item',null,'group');
				if (beacon.shouldStop()) {
					//pass in already processed items as script parameter so that the search will exclude them
					var param = new Array();
					param['custscript_proced_item']=processedItems;
					
					//re-queue WITH parameter for processing
					var status = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(),param);
					if (status=='QUEUED') {
						break;	
					}
					
				} else {
					processedItems+=',';
				}
				
			}
		}	
	} catch (e) {
		sbj='ods_ss_upd_totalsqft_for_allitems';
		if (e.getDetails() != undefined) {
			sbj+=' Runtime Error';
			msg='Runtime Error Occured: '+
				'RollRecID:'+rollrec.getId()+'-'+e.getCode()+':'+e.getDetails();
			logger.error('Runtime Error','RollRecID:'+rollrec.getId()+'-'+e.getCode()+':'+e.getDetails());	
		} else {
			sbj+=' Unexpected Error';
			msg='Unexpected Error Occured: '+
				'RollRecID:'+rollrec.getId()+'-'+e.toString();
			logger.error('Unexpected Error','RollRecID:'+rollrec.getId()+'-'+e.toString());	
		}
		
		//send error email to admins	
		nlapiSendEmail(from, toEmail, sbj,msg);	
	}
		
}


//private
/**
 * Returns list of all unique items currently linked by roll records.
 * @author JoeSon
 * @return (result set)
 */
function getAllUniqueItemsOnRolls() {
	var flt=new Array();
	var col=new Array();
	flt[0]=new nlobjSearchFilter('custrecord_item',null,'noneof','@NONE@');
	//remove already processed items from search result
	if (aritm && aritm.length > 0) {
		breakout=true;
		logger.debug('aritm','Not empty'+processedItems);
		flt[1] = new nlobjSearchFilter('custrecord_item',null,'noneof',aritm);
	}
	col[0]=new nlobjSearchColumn('custrecord_item',null,'group');
	return rslt = nlapiSearchRecord('customrecord_rollrecord',null,flt,col);
}

//private

function initParameters() {
	//init logger
	logger = new Logger();
	logger.enableDebug();
	
	//init beacon
	beacon = new Beacon();
	beacon.setRemainingUsageToStop(1000);
	//comma delimited list of already processed items
	processedItems = ctx.getSetting('SCRIPT','custscript_proced_item');
	if (processedItems && processedItems.length > 0) {
		aritm = processedItems.split(',');
	}
	
}
