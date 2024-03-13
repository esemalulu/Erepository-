/**
 * Module Description
 * 
 * Version    Date               Author                    Remarks
 * 1.00       17 Nov 2013     mohanboopalan
 * 1.10       01 Feb 2014     mohanboopalan       Logic to include customfield or not
 * 1.20       20 Feb 2014     mohanboopalan       Added custom field Parameters value for each segments  
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function userEventAfterSubmit(type){

if (nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_isinclCustomField') == 'T' )
 {
     var IsInclCustomField = true;
 }
 else
 {  
     var IsInclCustomField = false;
 }

var IsCallSchedule = true; 

 if ( type == 'create')
  {
     var currentid = nlapiGetRecordId();
     var currentType = nlapiGetRecordType();
     var currentrecord = nlapiGetNewRecord();

     if (currentType == 'account' || currentType == 'department' || currentType == 'classification' || currentType == 'location' || currentType == 'subsidiary')
      {


               if (IsInclCustomField) { 
                  if (currentrecord.getFieldValue(GetInclCustomField(currentType)) == 'T' )
                  { IsCallSchedule = true;} else {IsCallSchedule = false;}
                }

              if (IsCallSchedule)
               {
               var params = new Array();
               params['custscript_acctsint_userrectype'] = GetSegmentId(currentType);
               params['custscript_acctsint_userrectypeid'] = currentid;
               params['custscript_acctsint_optype'] = 'create';
              var results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched', params);

                    if ( results != 'QUEUED' )
         {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched1', params);
                    if ( results != 'QUEUED' )
            {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched2', params);
                    if ( results != 'QUEUED' )
                {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched3', params);
                    if ( results != 'QUEUED' )
                    {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched4', params);

                        if (results != 'QUEUED')
                         {
	                  nlapiLogExecution('ERROR','Process Error',  'Will not be able to trigger event due to max simultaneous call');
                         }
                     }
                }
           }
       }




               }
        }
  } 
  if ( type == 'edit')
  {

     var currentType = nlapiGetRecordType();
      var newrecord = nlapiGetNewRecord();
      var oldrecord = nlapiGetOldRecord();
      var inclopttype = '';
      var IsCallSchedule = true;

     if (currentType == 'account' || currentType == 'department' || currentType == 'classification' || currentType == 'location' || currentType == 'subsidiary')
      {

                  if (IsInclCustomField) { 

                  if ((oldrecord.getFieldValue(GetInclCustomField(currentType)) == 'T' ) &&
                     (newrecord.getFieldValue(GetInclCustomField(currentType)) == 'F' ))
                     { inclopttype = 'edit-false';}

                  if ((oldrecord.getFieldValue(GetInclCustomField(currentType)) == 'F' ) &&
                     (newrecord.getFieldValue(GetInclCustomField(currentType)) == 'T' ))
                     { inclopttype = 'edit-true';}

                  if ((oldrecord.getFieldValue(GetInclCustomField(currentType)) == 'F' ) &&
                     (newrecord.getFieldValue(GetInclCustomField(currentType)) == 'F' ))
                     { IsCallSchedule = false;}

                 }

                    nlapiLogExecution('AUDIT','Is Call Schedule',IsCallSchedule);

                    nlapiLogExecution('AUDIT','Called in 1');

               var params = new Array();
               params['custscript_acctsint_userrectype'] =  GetSegmentId(currentType);
               params['custscript_acctsint_userrectypeid'] = newrecord.getId();

               if (( newrecord.getFieldValue('isinactive') != 'T' && oldrecord.getFieldValue('isinactive') == 'T' ) ||  
                   ( newrecord.getFieldValue('isinactive') == 'F' && oldrecord.getFieldValue('isinactive') != 'F' ) &&
                   (IsCallSchedule)) 
                  {
                      if  (inclopttype != '')
                      {
                       params['custscript_acctsint_optype'] = inclopttype;

                       }
                       else
                       {
                       params['custscript_acctsint_optype'] = 'edit-true';
                       }
                        
                    nlapiLogExecution('AUDIT','Called in 2');

                    var results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched', params);
                    if ( results != 'QUEUED' )
         {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched1', params);
                    if ( results != 'QUEUED' )
            {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched2', params);
                    if ( results != 'QUEUED' )
                {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched3', params);
                    if ( results != 'QUEUED' )
                    {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched4', params);

                        if (results != 'QUEUED')
                         {
	                  nlapiLogExecution('ERROR','Process Error',  'Will not be able to trigger event due to max simultaneous call');
                         }
                     }
                }
           }
       }
   }
                    nlapiLogExecution('AUDIT','Called in 3');

             //start of if statement

              if ( (newrecord.getFieldValue('isinactive') == 'T' && oldrecord.getFieldValue('isinactive') != 'T') ||
                   (newrecord.getFieldValue('isinactive') != 'F' && oldrecord.getFieldValue('isinactive') == 'F') && (IsCallSchedule)) 
              {
                       nlapiLogExecution('AUDIT','Called in 4');

                       if  (inclopttype != '')
                       {
                       params['custscript_acctsint_optype'] = inclopttype;
                       }
                       else
                       {
                       params['custscript_acctsint_optype'] = 'edit-false';
                       }

           var results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched', params);
                    if ( results != 'QUEUED' )
         {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched1', params);
                    if ( results != 'QUEUED' )
            {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched2', params);
                    if ( results != 'QUEUED' )
                {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched3', params);
                    if ( results != 'QUEUED' )
                    {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched4', params);

                        if (results != 'QUEUED')
                         {
	                  nlapiLogExecution('ERROR','Process Error',  'Will not be able to trigger event due to max simultaneous call');
                         }
                     }
                  }
               }
            }
         }  //end of if statement

                  nlapiLogExecution('AUDIT','Is inactive new record',newrecord.getFieldValue('isinactive'));
                  nlapiLogExecution('AUDIT','Is inactive old record',oldrecord.getFieldValue('isinactive'));

             //start of if statement

              if ( (newrecord.getFieldValue('isinactive') == 'T' && oldrecord.getFieldValue('isinactive') == 'T') ||
                   (newrecord.getFieldValue('isinactive') == 'F' && oldrecord.getFieldValue('isinactive') == 'F') && 
                   (IsCallSchedule) && (IsInclCustomField)) 
              {
                       nlapiLogExecution('AUDIT','Called in 5');

                       if  (inclopttype != '')
                       {
                       params['custscript_acctsint_optype'] = inclopttype;
                       }
                       else
                       {
                       params['custscript_acctsint_optype'] = 'edit-false';
                       }

           var results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched', params);
                    if ( results != 'QUEUED' )
         {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched1', params);
                    if ( results != 'QUEUED' )
            {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched2', params);
                    if ( results != 'QUEUED' )
                {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched3', params);
                    if ( results != 'QUEUED' )
                    {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched4', params);

                        if (results != 'QUEUED')
                         {
	                  nlapiLogExecution('ERROR','Process Error',  'Will not be able to trigger event due to max simultaneous call');
                         }
                     }
                  }
               }
            }
         }  //end of if statement


     }
  }
  if ( type == 'delete')
  {
     var currentid = nlapiGetRecordId();
     var currentType = nlapiGetRecordType();
      var oldrecord = nlapiGetOldRecord();

     if (currentType == 'account' || currentType == 'department' || currentType == 'classification' || currentType == 'location' || currentType == 'subsidiary')
      {
                   //call Delete

               var params = new Array();
               params['custscript_acctsint_userrectype'] =  GetSegmentId(currentType);
               params['custscript_acctsint_userrectypeid'] = currentid;

               if ( currentType == 'account')
               {
                         params['custscript_acctsint_deletedsegmentname'] = oldrecord.getFieldValue('acctnumber') + ':' + oldrecord.getFieldValue('acctname');
                }
               if ( currentType == 'department')
               {
                         params['custscript_acctsint_deletedsegmentname'] = oldrecord.getFieldValue('name') + ':' + oldrecord.getId();
                }
               if ( currentType == 'classification' )
               {
                         params['custscript_acctsint_deletedsegmentname'] =  oldrecord.getFieldValue('name') + ':' + oldrecord.getId();
                }
               if ( currentType == 'location')
               {
                         params['custscript_acctsint_deletedsegmentname'] =  oldrecord.getFieldValue('namenohierarchy') + ':' + oldrecord.getId();
                }
               if ( currentType == 'subsidiary')
               {
                         params['custscript_acctsint_deletedsegmentname'] =  oldrecord.getFieldValue('namenohierarchy') + ':' + oldrecord.getId();
                }

               params['custscript_create_optype'] = 'delete';
              var results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched', params);
                    if ( results != 'QUEUED' )
         {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched1', params);
                    if ( results != 'QUEUED' )
            {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched2', params);
                    if ( results != 'QUEUED' )
                {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched3', params);
                    if ( results != 'QUEUED' )
                    {
results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched4', params);

                        if (results != 'QUEUED')
                         {
	                  nlapiLogExecution('ERROR','Process Error',  'Will not be able to trigger event due to max simultaneous call');
                         }
                     }
                }
           }
       }




     }
  }
  
}

function GetSegmentId(paramvalue)
{ 
      if (paramvalue == 'account') { return '1' };
      if (paramvalue == 'department') { return '2' };
      if (paramvalue == 'classification' ) { return '3' };
      if (paramvalue == 'subsidiary') { return '4' };
      if (paramvalue == 'location') { return '5' };
    	
}
function GetInclCustomField(paramvalue)
{ 
      if (paramvalue == 'account') { 
           if ( nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfacct') != null && nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfacct') != '')
             {
                  return nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfacct'); 
              }
              else
             {
                  return 'false' ;
              } 
         }
      if (paramvalue == 'department') { 
          if ( nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfdept') != null && nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfdept') != '')
             {
                  return nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfdept'); 
              }
              else
             {
                  return 'false' ;
              } 
        }
      if (paramvalue == 'classification' ) { 
          if ( nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfcls') != null && nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfcls') != '')
             {
                  return nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfcls'); 
              }
              else
             {
                  return 'false' ;
              } 
       }
      if (paramvalue == 'subsidiary') { 
          if ( nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfsubsdy') != null && nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfsubsdy') != '')
             {
                  return nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfsubsdy'); 
              }
              else
             {
                  return 'false' ;
              } 
      }
      if (paramvalue == 'location') { 
          if ( nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfloc') != null && nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfloc') != '')
             {
                  return nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_cfloc'); 
              }
              else
             {
                  return 'false' ;
              } 
      }
}