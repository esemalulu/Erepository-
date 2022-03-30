
var autotask = '1342067';// noreply@netsuite.com
var context = nlapiGetContext();
var today = new Date();

var checkpointed = false;

var logcnt = 0;
var log = '';
var configId = '';

function LNS_Induct()
{
    startScript('LNS_Induct',null,null);
    configId = context.getSetting('SCRIPT','custscript_lns_ind_configid');

    var campFields = ['custrecord_campauto_mstr_srch', 'custrecord_campauto_currcampaign', 'custrecord_campauto_currccs', 'custrecord_campauto_step','custrecord_campauto_status_scriptid','custrecord_campauto_status_deployid'];
    var campData = nlapiLookupField('customrecord_campauto_config', configId, campFields);

    var mstrSrch = campData['custrecord_campauto_mstr_srch'];
    var currCampaign = campData['custrecord_campauto_currcampaign'];
    var currccs = Number(campData['custrecord_campauto_currccs']);
    if (currCampaign=='0' )
         currccs = 0;
    var statusId = campData['custrecord_campauto_status_scriptid'];
    var statusDeploy = campData['custrecord_campauto_status_deployid'];

    var results = nlapiSearchRecord('campaign', mstrSrch, null, null);

    if (results==null || results[0]==null)
        return;

    var i;
    for (i=0; i<results.length  && ! outOfTime(); i++)
    {
        var campaignId = results[i].getValue('internalid');
        if (campaignId == currCampaign || currCampaign=='0')
        {
            log += "campaign id="+ campaignId + "\n";
            if (LNS_InductCampaign(campaignId, currccs))
                break;
            var removalss = results[i].getValue('custevent_campauto_removalss');
            if (removalss  !=null && removalss != '')
                if (LNS_RemoveCampaign(campaignId,removalss))
                    break;    // break if we are out of time
        }
    }
    if (i < results.length)
    {
        //schedule myself to run again
        if (!checkpointed)
        {
            //check point first

        }
        var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
        nlapiLogExecution('DEBUG','requeue '+status);
    }
    else
    {
        results = nlapiSearchRecord('customrecord_ccs', '67966', null, null);
        if (results!=null && results.length > 0)
        {
            for(i=0; i<results.length; i++)
            {
                nlapiDeleteRecord('customrecord_ccs',results[i].getValue('internalid', null ,'max'));
            }
        }
        nlapiSubmitField('customrecord_campauto_config', configId, ['custrecord_campauto_currcampaign', 'custrecord_campauto_currccs', 'custrecord_campauto_step'], ['0', '0', '4']);
        var status='init';
        status = nlapiScheduleScript(statusId, statusDeploy);
        nlapiLogExecution('DEBUG','Queue Status Step '+status);
    }
    nlapiSendEmail(autotask, 'dsinor@netsuite.com', 'LNS Induct',log);
    endScript(log, logcnt);
}



function LNS_InductCampaign(campaignId, currccs)
{
    var campaignObj = nlapiLoadRecord('campaign',campaignId);
    var limit = Number(campaignObj.getFieldValue('custevent_campauto_daily_limit'));
    var searchId = campaignObj.getFieldValue('custevent_campauto_member_srch');

    var intIdStart = '0';

    do
    {
        var filters = new Array();
        filters[0] = new nlobjSearchFilter('internalidnumber', null, 'greaterthan', intIdStart);

        memberResults = nlapiSearchRecord('contact', searchId, filters);

        if (memberResults == null || memberResults.length==0)
        {
            // No more members to induct
            nlapiLogExecution('DEBUG','campaign '+campaignId,'No new Members in search');
            log += "No more members to induct\n";
            return false;
        }
        else
        {
            nlapiLogExecution('DEBUG',"Member results="+memberResults.length+' starting id='+intIdStart);
            if (memberResults[0].getValue('internalid')==null)
                throw new Error("Internal Id not included in Member Search");
            // Member search must be in internal id order
            for (var i=1; i< memberResults.length; i++)
            {
                if ( Number(memberResults[i-1].getValue('internalid')) > Number(memberResults[i].getValue('internalid')) )
                {
                    throw new Error("Member Search Not in Internal Id Order");
                }
            }

            // Now find members already inducted
            filters[1] = new nlobjSearchFilter('custrecord_cs_campaign','custrecord_cs_contact','anyof',new Array(campaignId));
            inductedResults = nlapiSearchRecord('contact', searchId, filters);
            if (inductedResults == null)
                inductedResults = new Array();
            nlapiLogExecution('DEBUG','Already Inducted='+inductedResults.length);
            var inductedIdx = 0;
            var inductedId = '0';
            if (inductedIdx < inductedResults.length)
            {
                inductedId = inductedResults[inductedIdx].getValue('internalid');
            }

            // Create Campaign Contact Stage records
            for (var i=0; i < memberResults.length && currccs < limit; i++)
            {
                var entityId = memberResults[i].getValue('internalid');
                while( entityId > inductedId)
                {
                    inductedIdx++;
                    if (inductedIdx < inductedResults.length)
                        inductedId = inductedResults[inductedIdx].getValue('internalid');
                    if (inductedIdx >= inductedResults.length)
                    {
                        filters[0] = new nlobjSearchFilter('internalidnumber', null, 'greaterthan', inductedId);
                        inductedResults = nlapiSearchRecord('contact', searchId, filters);
                        if (inductedResults == null || inductedResults.length==0)
                              inductedId = 999999999;
                        else
                            inductedIdx  = -1;
                    }
                }
                if (entityId == inductedId)
                {
                    // member already inducted, skip it...
                    continue;
                }

                var CCS = nlapiCreateRecord('customrecord_ccs');
                CCS.setFieldValue('custrecord_cs_campaign',campaignId);
                CCS.setFieldValue('custrecord_cs_contact',entityId);
                CCS.setFieldValue('custrecord_cs_stage','0');
                CCS.setFieldValue('custrecord_cs_status','1');
                CCS.setFieldValue('custrecord_cs_last_email_sent',nlapiDateToString(today));

                try
                {
                    var ccsId = nlapiSubmitRecord(CCS);
                    nlapiLogExecution('DEBUG','created CCS '+ccsId);
                    log += "added contact ="+entityId+" ccs="+ccsId+"\n";
                    logcnt++;
                    currccs++;
                }
                catch (err)
                {
                    // ignore errors
                }
                if ( outOfTime() )
                {
                    nlapiSubmitField('customrecord_campauto_config', configId, ['custrecord_campauto_currcampaign','custrecord_campauto_currccs'], [campaignId,currccs]);
                    var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    nlapiLogExecution('DEBUG','checkpoint '+status,'currcampaign='+campaignId+' currccs='+currccs);
                    checkpointed = true;
                    return true;
                }
            }
            intIdStart = entityId;
        }
    }
    while (memberResults.length == 1000 && currccs < limit);
    campaignObj.setFieldValue('custevent_campauto_member_count', (Number(campaignObj.getFieldValue('custevent_campauto_member_count'))+currccs)+'');
    nlapiSubmitRecord(campaignObj);
    return false;
}

function LNS_RemoveCampaign(campaignId,removalss)
{

    var filters = new Array();
    //filters[0] = new nlobjSearchFilter('custrecord_cs_status','custrecord_cs_contact','noneof',['7']); //not removed already
    //filters[1] = new nlobjSearchFilter('internalidnumber','custrecord_cs_contact','isnotempty');
    filters[0] = new nlobjSearchFilter('custrecord_cs_campaign','custrecord_cs_contact','anyof',campaignId);

    var resColumns = new Array();
    //resColumns[0] = new nlobjSearchColumn( 'internalid','custrecord_cs_contact');

    removeResults = nlapiSearchRecord('contact', removalss, filters, resColumns);

    if (removeResults == null || removeResults.length==0)
    {
        // No more members to induct
        nlapiLogExecution('DEBUG','campaign '+campaignId,'No More Members to remove');
        return false;
    }
    else
    {
        for (var i=0; i< removeResults.length; i++)
        {
            ccsId = removeResults[i].getValue('internalid','custrecord_cs_contact')
            nlapiLogExecution('DEBUG','Remove CCS '+ccsId);
            log += 'Removing '+ccsId+'\n';
            try
            {
                nlapiSubmitField('customrecord_ccs', ccsId, [ 'custrecord_cs_status'],[ '7']);
            }
            catch (err)
            {
                nlapiLogExecution('ERROR','Remove Err id '+ccsId,err.getDetails());
            }
            if ( outOfTime())
                return true;
        }
        return false;
    }
}

var timer=10;

function outOfTime()
{
    //if (--timer < 0)
    //    return true;
    return (context.getRemainingUsage() <100) /*|| (context.getRemainingInstructions() < 10000000)*/ ;
}
