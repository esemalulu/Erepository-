/**
 * Module Description
 * 
 * Version    Date               Author                    Remarks
 * 1.00       17 Nov 2013     mohanboopalan
 *
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
                    //nlapiLogExecution('AUDIT','Queued',results);


      
                      //if ( newrecord.getFieldValue('parent') != '') 
                       //{
                       //     var filters = new Array();
                       //    filters[0] = new nlobjSearchFilter('isinactive',null,'is','F');
                       //    filters[1] = new nlobjSearchFilter('internalid',null,'is',newrecord.getFieldValue('parent'));
                       //   var searchresults = nlapiSearchRecord(currentType,null,filters,null);

                       //              for ( var i = 0;  i < searchresults.length; i++)
                       //              {
                       //      params['custscript_acctsint_userrectypeid'] = newrecord.getFieldValue('parent');
                       //var results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched', params);
                    //nlapiLogExecution('AUDIT','Queued',results);

                       //               }
                        //}
    
                }
              if ( newrecord.getFieldValue('isinactive') == 'T' && oldrecord.getFieldValue('isinactive') != 'T'  && (IsCallSchedule)) 
              {
                     
                       if  (inclopttype != '')
                      {
                       params['custscript_acctsint_optype'] = inclopttype;
                       }
                       else
                       {
                       params['custscript_acctsint_optype'] = 'edit-false';
                       }

                        //var results;
                        //do 
                       //{

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

                    nlapiLogExecution('AUDIT','Queued',results);

                       //} while (results != 'QUEUED') 

                 
                       //if ( newrecord.getFieldValue('parent') == '') 
                       //{
                       //     var filters = new Array();
                       //    filters[0] = new nlobjSearchFilter('isinactive',null,'is','F');

                      //    var searchresults = nlapiSearchRecord(currentType,null,filters,null);

                         //          for ( var i = 0;  i < searchresults.length; i++)
                            //         {
                               //             if ( newrecord.getId() != searchresults[i].getId() && searchresults[i].getId() != '')
                               //                {
                                //           params['custscript_acctsint_userrectypeid'] = searchresults[i].getId();
// as of now, no way to track down the sub department using parent department
//                      var results =  nlapiScheduleScript('customscript_acctsint_userevent_sched', 'customdeploy_acctsint_userevent_sched', params);
                                   //                nlapiLogExecution('AUDIT','Queued',results);
                                   //            }

                                   //  }
                       //}  
                 
               }

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
      if (paramvalue == 'account') { return 'custrecord_acctincludeincoupa' };
      if (paramvalue == 'department') { return 'custrecord_deptincludeincoupa' };
      if (paramvalue == 'classification' ) { return '3' };
      if (paramvalue == 'subsidiary') { return 'custrecord_subincludeincoupa' };
      if (paramvalue == 'location') { return '5' };
    	
}