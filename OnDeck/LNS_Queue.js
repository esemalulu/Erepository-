


var context = nlapiGetContext();

var autotask = '1342067';// noreply@netsuite.com
var checkpointed = false;

var dale = '3178';
var STEP_QUEUE = '2';
var log = '';
var ruleIds;
var logcnt = 0;
var today = new Date();

var configId = '';

function LNS_Queue()
{
    startScript('LNS_Queue',null,null);
    configId = context.getSetting('SCRIPT','custscript_lns_que_configid');
    
    var campFields = ['custrecord_campauto_mstr_srch', 'custrecord_campauto_currcampaign', 'custrecord_campauto_currccs', 'custrecord_campauto_step','custrecord_campauto_status_scriptid','custrecord_campauto_status_deployid'];
    var campData = nlapiLookupField('customrecord_campauto_config', configId, campFields);
    var campautoStep = campData['custrecord_campauto_step'];
    if (campautoStep != STEP_QUEUE)
    {
        nlapiLogExecution('DEBUG','Incorrect Step, not ready for Queue','step='+campautoStep);
       return;
    }

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
            ruleIds = new Array();
            if (LNS_QueueCampaign(campaignId, currccs))
                break;// break if we are out of time
        }
    }
    if (i < results.length)
    {
        //schedule myself to run again
        if (!checkpointed)
        {
            //check point first
            var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
            nlapiLogExecution('DEBUG','requeue '+status);
        }
    }
    else
    {
        nlapiSubmitField('customrecord_campauto_config', configId, ['custrecord_campauto_currcampaign', 'custrecord_campauto_currccs', 'custrecord_campauto_step'], ['0', '0', '3']);
        nlapiLogExecution('DEBUG','Queue Complete ');
        //var status='init';
        //status = nlapiScheduleScript(statusId, statusDeploy);
        //nlapiLogExecution('DEBUG','Queue Status Step '+status);
    }
    nlapiSendEmail(autotask, 'dsinor@netsuite.com', 'LNS Queue',log);
    endScript(log, logcnt);

}

function LNS_QueueCampaign(campaignId, currccs)
{
    var campaignObj = nlapiLoadRecord('campaign',campaignId);

    var arResults = new Array();
    arResults[0] = new nlobjSearchColumn( 'custrecord_car_search' );
    arResults[1] = new nlobjSearchColumn( 'custrecord_car_stage');
    arResults[2] = new nlobjSearchColumn( 'custrecord_car_waitdays');
    arResults[3] = new nlobjSearchColumn( 'custrecord_car_emails_sending_today');
    arResults[4] = new nlobjSearchColumn( 'internalid');
    arResults[5] = new nlobjSearchColumn( 'custrecord_car_total_emails');
    arResults[6] = new nlobjSearchColumn( 'custrecord_car_template');
    arResults[7] = new nlobjSearchColumn( 'custrecord_car_groupid');

    var filters = new Array();
    filters[0] = new nlobjSearchFilter('custrecord_car_campaign',null,'anyof',new Array( campaignId));

    searchresults = nlapiSearchRecord('customrecord_campauto_rules', null, filters, arResults);

    if (searchresults == null || searchresults.length==0)
    {
        // No Rules to Process
        nlapiLogExecution('DEBUG','No Rules');
        return false;
    }
    else
    {
        // Do rules in stage order
        //This can change if we sort the rules by stage
        for (var iStage=0; iStage <  100; iStage++)
        {
            if (currccs <= iStage)
            {
                for (var iRes = 0 ; iRes < searchresults.length ; iRes++)
                {
                    if (Number(searchresults[iRes].getValue('custrecord_car_stage')) == iStage)
                    {
                        nlapiLogExecution('DEBUG','doRule', 'stage='+iStage+' ');

                        var result = searchresults[iRes];
                        if (currccs==0 || currccs < iStage)
                        {
                            var sending  = result.getValue('custrecord_car_emails_sending_today');
                            var sent_total =  Number(result.getValue('custrecord_car_total_emails'));
                            sent_total += Number(sending);
                            nlapiSubmitField('customrecord_campauto_rules', result.getValue('internalid'), ['custrecord_car_emails_sending_today', 'custrecord_car_total_emails'], ['0', sent_total]);
                        }
                        do
                        {
                            queuedcnt = doRule(searchresults[iRes], campaignId, (currccs==0 || currccs < iStage));
                        }
                        while (queuedcnt==1000 && !checkpointed);

                        if (checkpointed)
                            return true;
                    }
                }
            }
        }
        execute(campaignId, campaignObj, searchresults);
     }
    return false;
}

function doRule(result, campaignId, firstTime)
{
    var searchId = result.getValue('custrecord_car_search');
    var stage    = result.getValue('custrecord_car_stage');
    var wait     = result.getValue('custrecord_car_waitdays');
    var sending  = result.getValue('custrecord_car_emails_sending_today');
    if (firstTime)
        sending = '0';
    var sent_total =  result.getValue('custrecord_car_total_emails');
    var ruleId   =  result.getValue('internalid');
    ruleIds[stage] = ruleId;

    var contactResults = new Array();
    contactResults[0] = new nlobjSearchColumn( 'internalid' ,'custrecord_cs_contact');

    var filters = new Array();
    filters[0] = new nlobjSearchFilter('custrecord_cs_campaign','custrecord_cs_contact','anyof',new Array( campaignId));
    filters[1] = new nlobjSearchFilter('custrecord_cs_stage','custrecord_cs_contact','lessthan',Number(stage)+'');
    filters[2] = new nlobjSearchFilter('custrecord_cs_status','custrecord_cs_contact','anyof',new Array( '1','3','6','8','14'));/*,'Not Started', 'Sent' Recv, clickthru, viewed*/
    if (wait != '' && wait != '0')
    {
        var daysago = 'daysago'+wait;
        filters[3] = new nlobjSearchFilter('custrecord_cs_last_email_sent','custrecord_cs_contact','onorbefore', daysago);
    }

    if (searchId=='')
        searchId = null;

    nlapiLogExecution('DEBUG','ready to search CCS','search='+searchId);
    contactResults = nlapiSearchRecord('contact', searchId, filters, contactResults);
    if (contactResults == null || contactResults.length==0)
    {
        nlapiLogExecution('DEBUG','No Contact (ccs) results');
        // No contacts to Process
        nlapiSubmitField('customrecord_campauto_rules', ruleId, ['custrecord_car_emails_sending_today'], ['0']);
        return 0;
    }
    else
    {
        for(var iRes = 0; iRes < contactResults.length ; iRes++)
        {
            var cssId = contactResults[iRes].getValue('internalid', 'custrecord_cs_contact');
            //queue the record
            logcnt++;
            nlapiLogExecution('DEBUG','Queue CCS '+cssId);
            nlapiSubmitField('customrecord_ccs', cssId, ['custrecord_cs_stage' , 'custrecord_cs_status' , 'custrecord_cs_last_email_sent' ],[stage, '2' , nlapiDateToString(today) ]);
            if (outOfTime())
            {
                sending = Number(sending) + iRes;
                nlapiSubmitField('customrecord_campauto_rules', ruleId, ['custrecord_car_emails_sending_today'], [sending+'']);
                log += 'sending '+sending;
                var campData = new Array();
                var campFields = new Array();
                campData[0] = 'custrecord_campauto_currcampaign';
                campFields[0] = campaignId;
                campData[1] = 'custrecord_campauto_currccs';
                currccs = stage;
                campFields[1] = currccs;
                nlapiSubmitField('customrecord_campauto_config', configId, campFields, campData);
                var scriptstatus = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
                nlapiLogExecution('DEBUG','checkpoint in do rule '+scriptstatus,'currcampaign='+campaignId+' currccs='+currccs);

                checkpointed = true;
                return iRes;
            }
        }
        sending = Number(sending) + iRes;
        nlapiSubmitField('customrecord_campauto_rules', ruleId, ['custrecord_car_emails_sending_today'], [sending+'']);
        log += 'sending '+sending+'\n';
        return contactResults.length;
    }
}

function execute(campaignId, campaignObj, searchresults)
{
    var template ='';
    var groupid ='';
    var status ;
    var campaigngroup ;
    var templateid ='';
    var eventStage = null;

    //count the number of ccs that are in queued state by stage
    var qResults = new Array();
    qResults[0] = new nlobjSearchColumn( 'custrecord_cs_stage', null ,'group');
    qResults[1] = new nlobjSearchColumn( 'internalid', null ,'count');

    var filters = new Array();
    filters[0] = new nlobjSearchFilter('custrecord_cs_campaign',null,'anyof',new Array( campaignId));
    filters[1] = new nlobjSearchFilter('custrecord_cs_status',null,'anyof',['2']);

    qCounts = nlapiSearchRecord('customrecord_ccs', null, filters, qResults);
    if (qCounts== null || qCounts.length==0)
    {
        nlapiLogExecution('DEBUG','No Members queued');
        return;
    }

    for (iQueue=0; iQueue < qCounts.length; iQueue++)
    {
        var stageToExecute = qCounts[iQueue].getValue('custrecord_cs_stage',null,'group');
        var countToExecute = qCounts[iQueue].getValue('internalid',null,'count');

        nlapiSubmitField('customrecord_campauto_rules', ruleIds[stageToExecute], ['custrecord_car_emails_sending_today'], [countToExecute+'']);

        for (var i =0; i<searchresults.length; i++)
            if (searchresults[i].getValue('custrecord_car_stage') == stageToExecute)
            {
                templateid = searchresults[i].getValue('custrecord_car_template');
                groupid = searchresults[i].getValue('custrecord_car_groupid');
                break;
            }

        if (groupid == '' || templateid=='')
        {
            nlapiLogExecution('DEBUG','No Group or template found for stage='+stageToExecute);
            return;
        }

        var events = Number(campaignObj.getLineItemCount('campaignemail')) ;
        nlapiLogExecution('DEBUG','campaign email events='+events+' looking for stage='+stageToExecute);

        eventStage = stageToExecute;

        var i;
        for( i=1 ;i <= Number(campaignObj.getLineItemCount('campaignemail')); i++ )
        {
            if (campaignObj.getLineItemValue('campaignemail','groupid',i) == groupid &&
                 campaignObj.getLineItemValue('campaignemail','status',i)  == 'EXECUTE' )
                break;
        }

        if (i<=Number(campaignObj.getLineItemCount('campaignemail')))
        {
            nlapiLogExecution('DEBUG','Group already set to execute '+groupid);
            continue;
        }
        nlapiLogExecution('DEBUG','ADDING NEW GROUP to execute '+groupid);
        //continue;
        if (eventStage == stageToExecute)
        {
            events++;
            var newEvent = (events)+'';
            newEvent = '1';
            campaignObj.insertLineItem('campaignemail', newEvent);
            campaignObj.setLineItemValue('campaignemail','custrecord_campauto_stage',newEvent,stageToExecute);
            campaignObj.setLineItemValue('campaignemail','groupid',newEvent,groupid);
            campaignObj.setLineItemValue('campaignemail','status',newEvent,'EXECUTE');
            campaignObj.setLineItemValue('campaignemail','campaigngroup',newEvent,groupid/*campaigngroup*/);
            //campaignObj.setLineItemValue('campaignemail','templateid',newEvent, templateid);

            //Template, Title, Channel, Date
            campaignObj.setLineItemValue('campaignemail','template',newEvent,templateid);
            var email = nlapiMergeRecord( templateid, 'contact', dale);
            var subject = email.getName();
            campaignObj.setLineItemValue('campaignemail','description',newEvent,subject.substring(0,98));
            campaignObj.setLineItemValue('campaignemail','channel',newEvent,'-2');
            var today = new Date();
            today = nlapiDateToString(today);
            campaignObj.setLineItemValue('campaignemail','datescheduled',newEvent,today);
            campaignObj.setLineItemValue('campaignemail','timescheduled',newEvent,'06:00 am');
            campaignObj.setLineItemValue('campaignemail','custrecord_campauto_stage',newEvent,stageToExecute);
        }
    }
    nlapiSubmitRecord(campaignObj);
}

function outOfTime()
{
    return (context.getRemainingUsage() <1000) /*|| (context.getRemainingInstructions() < 10000000)*/ ;
}
