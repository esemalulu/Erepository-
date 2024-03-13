// noinspection JSVoidFunctionReturnValueUsed

/**
* Module Description
* 
* Version       Date                Author                  Remarks
* 1.00       15 Nov 2013         mohanboopalan         User Event Scheduled
* 1.10       16 Jan 2014         mohanboopalan         added name with hierarchy for department, 
*                                                      account name added in error message
* 1.20       22 Jan 2014         mohanboopalan         removed parameter of response limit
* 1.30       27 Jan 2014         mohanboopalan         Map between subsidiary and Chart of accounts, filter only mapped subsidiaries
*/
/**
* @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
* @returns {Void}
*/
function scheduled(type) {

                var contents =  '' ;
                var contents1 =  '' ;
                var acctcontents = '';
                var deptcontents = '';
                var classcontents = '';
                var OpType = 'create';
                var iCounter = 0;
                var iCountRecords = 0;

                var acctsegment = '';
                var loop1content = '';
                var loop2content = '';
                var loop3content = '';
                var loop4content = '';

                var loopcontentnames = new Array();
                loopcontentnames[0] = '';
                loopcontentnames[1] = '';
                loopcontentnames[2] = '';
                loopcontentnames[3] = '';
                loopcontentnames[4] = '';

                var acctfilters = new Array();
                var acctcolumns = new Array();
                var segments = new Array(); 
                var paramvalues = new Array();
                var context = nlapiGetContext();
                
                var envType = context.getEnvironment() === 'PRODUCTION' ? 'prod' : 'sb';
                nlapiLogExecution('DEBUG', 'envType = ', envType);

                var coupaURL = context.getSetting('SCRIPT', 'custscript_coupa_oidc_client_url_' + envType);
                nlapiLogExecution('DEBUG', 'coupaURL = ' + coupaURL);

                var url = coupaURL;
                paramvalues[0] =  coupaURL;
                
                url = url +  '/api/accounts?bulk=1';
                paramvalues[1] = context.getSetting('SCRIPT' , 'custscript_acctsint_accountname');
             
                var headers = getAPIHeader('text/xml');
                paramvalues[2] = null;

                segments[0] = GetSegmentName(context.getSetting('SCRIPT' , 'custscript_acctsint_segment1'));
                paramvalues[3] = context.getSetting('SCRIPT' , 'custscript_acctsint_segment1');

                segments[1] = GetSegmentName(context.getSetting('SCRIPT' , 'custscript_acctsint_segment2'));	
                paramvalues[4] = context.getSetting('SCRIPT' , 'custscript_acctsint_segment2');

                segments[2] = GetSegmentName(context.getSetting('SCRIPT' , 'custscript_acctsint_segment3'));
                paramvalues[5] = context.getSetting('SCRIPT' , 'custscript_acctsint_segment3');

                segments[3] = GetSegmentName(context.getSetting('SCRIPT' , 'custscript_acctsint_segment4'));
                paramvalues[6] = context.getSetting('SCRIPT' , 'custscript_acctsint_segment4');

                segments[4] = GetSegmentName(context.getSetting('SCRIPT' , 'custscript_acctsint_segment5'));
                paramvalues[7] = context.getSetting('SCRIPT' , 'custscript_acctsint_segment5');

                var UserEventRecType = GetSegmentName(context.getSetting('SCRIPT' , 'custscript_acctsint_userrectype'));
                paramvalues[8] = context.getSetting('SCRIPT' , 'custscript_acctsint_userrectype');

                var UserEventRecTypeID = context.getSetting('SCRIPT' , 'custscript_acctsint_userrectypeid');
                paramvalues[9] = context.getSetting('SCRIPT' , 'custscript_acctsint_userrectypeid');

                OpType = context.getSetting('SCRIPT' , 'custscript_acctsint_optype');
                paramvalues[10] = context.getSetting('SCRIPT' , 'custscript_acctsint_optype');

                var DeletedSegmentName = context.getSetting('SCRIPT' , 'custscript_acctsint_deletedsegmentname');
                paramvalues[11] = context.getSetting('SCRIPT' ,  'custscript_acctsint_deletedsegmentname');
               
                var initialNbr = context.getSetting('SCRIPT' , 'custscript_acctsint_fromrecords');
                paramvalues[12] = context.getSetting('SCRIPT' , 'custscript_acctsint_fromrecords');

                var maxNbr= context.getSetting('SCRIPT' , 'custscript_acctsint_maxrecords');
                paramvalues[13] = context.getSetting('SCRIPT' , 'custscript_acctsint_maxrecords');

                var maxAcctsperReq = context.getSetting('SCRIPT' , 'custscript_acctsint_noofrecordsperequest');
                paramvalues[14] = context.getSetting('SCRIPT' , 'custscript_acctsint_noofrecordsperequest');

                var chartofaccounts = context.getSetting('SCRIPT' , 'custscript_acctsint_chartofaccounts');
                paramvalues[15] = context.getSetting('SCRIPT' , 'custscript_acctsint_chartofaccounts');

                var custfieldexclset = context.getSetting('SCRIPT' , 'custscript_acctsint_excl_set');
                paramvalues[16] = context.getSetting('SCRIPT' , 'custscript_acctsint_excl_set');

                var CoACnt = 1;

               //Subsidiaries
               var IncludeAllSubsidiary = context.getSetting('SCRIPT' , 'custscript_acctsint_coasubsdylstinclonly');

               //Account Nbr and Name format
               var AcctDetails = new Array();
                AcctDetails = context.getSetting('SCRIPT' , 'custscript_acctsint_glacctdetailsformat').split(':');

               //Parameter Values being passed
                nlapiLogExecution('AUDIT','Segment-1',  segments[0]);
                nlapiLogExecution('AUDIT','Segment-2',  segments[1]);               
                nlapiLogExecution('AUDIT','Segment-3',  segments[2]);
                nlapiLogExecution('AUDIT','Segment-4',  segments[3]);
                nlapiLogExecution('AUDIT','Segment-5',  segments[4]);
                nlapiLogExecution('AUDIT','User Record Type',  UserEventRecType);
                nlapiLogExecution('AUDIT','User Record Type ID',UserEventRecTypeID);
                nlapiLogExecution('AUDIT','Event Type',OpType);
                nlapiLogExecution('AUDIT','Deleted Segment Name',DeletedSegmentName);
                nlapiLogExecution('AUDIT','Process Acct Records from (default to 0)',context.getSetting('SCRIPT' , 'custscript_acctsint_fromrecords'));
                nlapiLogExecution('AUDIT','Process Max Acct Records per script',context.getSetting('SCRIPT' , 'custscript_acctsint_maxrecords'));
                nlapiLogExecution('AUDIT','Process Max. Recs per Request to Coupa',maxAcctsperReq);
                nlapiLogExecution('AUDIT','Coupa URL',coupaURL);
                nlapiLogExecution('AUDIT','Coupa Account Name',context.getSetting('SCRIPT' , 'custscript_acctsint_accountname'));
                nlapiLogExecution('AUDIT','Chart of Accounts',context.getSetting('SCRIPT' , 'custscript_acctsint_chartofaccounts'));

                var currentDate = new Date();
                var startTime = currentDate.getTime();
                nlapiLogExecution('AUDIT','Execution Start Time',startTime);

                var loopsegs = SetLoopSegments(segments);
                var GLAcctSegNo = getGLAcctSegNo(segments);
                var iValue = 0;
                var errorcode = '';
      
                contents = '';
                var iacctCnt = 0;

                acctfilters[0] = new nlobjSearchFilter('number',null,'isNotEmpty');
                acctcolumns[0] = new nlobjSearchColumn('number');
                acctcolumns[0].setSort();

                 if ( UserEventRecType == 'GL Account'  &&  OpType != 'delete' )
                 {
                   acctfilters[1] = new nlobjSearchFilter('internalid',null,'is',UserEventRecTypeID);
                 }
                 else
                 {
                      acctfilters[1] = new nlobjSearchFilter('isinactive',null,'is','F');
                 }

                 if ( OpType == 'delete' &&  UserEventRecType == 'GL Account')
                 {
                    var AcctMaxRecords  = parseInt('1');
                 }
                 else
                 {
                       if (custfieldexclset ==  'T' && UserEventRecType != 'GL Account') 
                       {                  
                             var searchresults = nlapiSearchRecord('account','customsearch_onlycoupaaccts',null,null);
                       }
                       else
                       {
                             var searchresults = nlapiSearchRecord('account',null,acctfilters,acctcolumns);
                       }
                             var AcctMaxRecords = parseInt(searchresults.length);
                  }

                  var loop1FieldName = GetAcctFieldName( loopsegs[0]);
                  var loop2FieldName = GetAcctFieldName( loopsegs[1]);
                  var loop3FieldName = GetAcctFieldName( loopsegs[2]);
                  var loop4FieldName = GetAcctFieldName( loopsegs[3]);

 
                   if ( OpType == 'delete' &&  loopsegs[0] == UserEventRecType)
                 {
                     var loop1searchresults = DeletedSegmentName;
                     var loop1MaxRecords = parseInt('1');
                 }
                 else
                  {
                          if ( loopsegs[0] != '' && loopsegs[0] != null)
                          {
            var loop1searchresults =  SetLoopSegmentSearchResults(loopsegs[0],UserEventRecType,UserEventRecTypeID,segments);
                                       var loop1MaxRecords = parseInt(loop1searchresults.length);
                          }
                  }


                   if ( OpType == 'delete' &&  loopsegs[1] == UserEventRecType)
                    {
                     var loop2searchresults = DeletedSegmentName;
                     var loop2MaxRecords = parseInt('1');
                    }
                   else
                  {
                          if ( loopsegs[1] != '' && loopsegs[1] != null)
                          {

                  var loop2searchresults =  SetLoopSegmentSearchResults(loopsegs[1],UserEventRecType,UserEventRecTypeID,segments);
                  var loop2MaxRecords = parseInt(loop2searchresults.length);

                        }

                  }

                   if ( OpType == 'delete' &&  loopsegs[2] == UserEventRecType)
                   {
                     var loop3searchresults = DeletedSegmentName;
                     var loop3MaxRecords = parseInt('1');
                    }
                   else
                   {
                          if ( loopsegs[2] != '' && loopsegs[2] != null)
                          {

                  var loop3searchresults =  SetLoopSegmentSearchResults(loopsegs[2],UserEventRecType,UserEventRecTypeID,segments);
                  var loop3MaxRecords = parseInt(loop3searchresults.length);


                          }
                  }

                   if ( OpType == 'delete' &&  loopsegs[3] == UserEventRecType)
                   {
                     var loop4searchresults = DeletedSegmentName;
                     var loop4MaxRecords = parseInt('1');
                    }
                    else
                   {
                          if ( loopsegs[3] != '' && loopsegs[3] != null)
                          {

                  var loop4searchresults =  SetLoopSegmentSearchResults(loopsegs[3],UserEventRecType,UserEventRecTypeID,segments);
                  var loop4MaxRecords = parseInt(loop4searchresults.length);

                          }
 
                  }

                  var IsCallAnotherScript = 'false';

                  if (AcctMaxRecords > parseInt(maxNbr) && parseInt(maxNbr) != 0) { IsCallAnotherScript = 'true';}
                  if (AcctMaxRecords > parseInt(maxNbr) && parseInt(maxNbr) == 0) { maxNbr= AcctMaxRecords;}

                  nlapiLogExecution('AUDIT','Processing No of Accts',AcctMaxRecords);

                  for ( var i = initialNbr;  i < Math.min (maxNbr, AcctMaxRecords); i++)
                  {

                   try
                     {

                         if ( OpType == 'delete'  &&  UserEventRecType == 'GL Account'  )
                        {

                            acctsegment = DeletedSegmentName;
                            var loop1SearchResultFieldValue = null;
                            var loop2SearchResultFieldValue = null;
                            var loop3SearchResultFieldValue = null;
                            var loop4SearchResultFieldValue = null;

                         }
                         else
                         {

                                var searchresult = nlapiLoadRecord('account',searchresults[i].getId());

                               acctsegment = searchresult.getFieldValue(AcctDetails[0]) + ':' + searchresult.getFieldValue(AcctDetails[1]) ;

                               loopcontentnames[0]= searchresult.getFieldValue('acctname');

                               //nlapiLogExecution('AUDIT','loop1FieldName',loop1FieldName);

                                 if (loop1FieldName == 'department')
                                {
                                    var loop1SearchResultFieldValue = searchresult.getFieldValue(loop1FieldName);
                                }
                                else
                                {
                                    var loop1SearchResultFieldValue = searchresult.getFieldValues(loop1FieldName);
                                 }
                                                          
                               //nlapiLogExecution('AUDIT','loop2FieldName',loop2FieldName);

                                 if (loop2FieldName == 'department')
                                {
                                    var loop2SearchResultFieldValue = searchresult.getFieldValue(loop2FieldName);
                                }
                                else
                                {
                                    var loop2SearchResultFieldValue = searchresult.getFieldValues(loop2FieldName);
                                 }
                                 if (loop3FieldName == 'department')
                                {
                                    var loop3SearchResultFieldValue = searchresult.getFieldValue(loop3FieldName);
                                }
                                else
                                {
                                    var loop3SearchResultFieldValue = searchresult.getFieldValues(loop3FieldName);
                                 }
                                 if (loop3FieldName == 'department')
                                {
                                    var loop3SearchResultFieldValue = searchresult.getFieldValue(loop3FieldName);
                                }
                                else
                                {
                                    var loop3SearchResultFieldValue = searchresult.getFieldValues(loop3FieldName);
                                 }
                                 if (loop4FieldName == 'department')
                                {
                                    var loop4SearchResultFieldValue = searchresult.getFieldValue(loop4FieldName);
                                }
                                else
                                {
                                    var loop4SearchResultFieldValue = searchresult.getFieldValues(loop4FieldName);
                                 }

                                 var IsIncludeChildSubsdy  =  searchresult.getFieldValue('includechildren');

                          }

                        //loop1 Check Start                         
                        if ( loop1SearchResultFieldValue == null || (loop1FieldName  == 'subsidiary' && (loop1SearchResultFieldValue != null && IsIncludeChildSubsdy  == 'T' ) || IncludeAllSubsidiary == 'T' ))
                        {
                                 //nlapiLogExecution('AUDIT','loop1MaxRecords',loop1MaxRecords);
                                  
                                          for ( var j = 0;  j < Math.min (500, loop1MaxRecords); j++)
                                          {
                                                   if ( OpType == 'delete' &&  loopsegs[0] == UserEventRecType)
                                                      {
                                                       loop1content = DeletedSegmentName;
                                                      }
                                                       else
                                                       {
                                                     var searchresult1 = loop1searchresults[j];
              loop1content = getRecordTypeNameField(loop1FieldName,searchresult1) + ':' + searchresult1.getValue('internalid');
                                             loopcontentnames[1]= getRecordTypeNameField(loop1FieldName,searchresult1);
                                 //nlapiLogExecution('AUDIT','loop1content',loop1content);
                                                       }

                                                          //nlapiLogExecution('AUDIT','Loop2SearchResultFieldValue',loop2SearchResultFieldValue);
                                      //nlapiLogExecution('AUDIT','loopsegs1',loopsegs[1]);

//Is loop 2 to be set ?
if ( loopsegs[1] != '' && loopsegs[1] != null)
{
                                                               //loop2 Check Start
                                                               if ( loop2SearchResultFieldValue == null || (loop2FieldName  == 'subsidiary' && (loop2SearchResultFieldValue != null && IsIncludeChildSubsdy  == 'T' ) || IncludeAllSubsidiary == 'T' ))
                                                                  {
                                                                    //nlapiLogExecution('AUDIT','check 3','Loop2 check 2 Start');

                                                                      for ( var k2 = 0;  k2 < Math.min (500, loop2MaxRecords); k2++)
                                                                      {

                                                       if ( OpType == 'delete'  &&  loopsegs[1] == UserEventRecType )
                                                        {
                                                       loop2content = DeletedSegmentName;
                                                         }
                                                        else
                                                       {
                                                                          var searchresult2 = loop2searchresults[k2];
              loop2content = getRecordTypeNameField(loop2FieldName,searchresult2) + ':' + searchresult2.getValue('internalid');
                                                                    //nlapiLogExecution('AUDIT','loop2 content',loop2content);
                                             loopcontentnames[2] = getRecordTypeNameField(loop2FieldName,searchresult2);

                                                       }

//Is loop 3 to be set ?
if ( loopsegs[2] != '' && loopsegs[2] != null)
{
     //loop3 Check Start
     if ( loop3SearchResultFieldValue == null || loop3SearchResultFieldValue == '' || (loop3FieldName  == 'subsidiary' && (loop3SearchResultFieldValue != null && IsIncludeChildSubsdy  == 'T' ) || IncludeAllSubsidiary == 'T' ))
     {

          //nlapiLogExecution('AUDIT','check 3');

         for ( var k3 = 0;  k3 < Math.min (500,loop3MaxRecords); k3++)
         {

                                                       if ( OpType == 'delete'  &&  loopsegs[2] == UserEventRecType)
                                                      {
                                                       loop3content = DeletedSegmentName;
                                                      }
                                                       else
                                                       {

             var searchresult3 = loop3searchresults[k3];
             loop3content = getRecordTypeNameField(loop3FieldName,searchresult3) + ':' + searchresult3.getValue('internalid');
                                            loopcontentnames[3]= getRecordTypeNameField(loop3FieldName,searchresult3);

                                                       }
       
             //Is loop 4 to be set ?
             if ( loopsegs[3] != '' && loopsegs[3] != null)
             {
                  //loop4 Check Start
                  if ( loop4SearchResultFieldValue == null || loop4SearchResultFieldValue == '' || (loop4FieldName  == 'subsidiary' && (loop4SearchResultFieldValue != null && IsIncludeChildSubsdy  == 'T' ) || IncludeAllSubsidiary == 'T' )) 
                   {
                        for ( var k4 = 0;  k4 < Math.min (500, loop4MaxRecords); k4++)
                        {
                                                      
                                                       if ( OpType == 'delete'   &&  loopsegs[3] == UserEventRecType)
                                                      {
                                                            loop4content = DeletedSegmentName;
                                                       }
                                                       else  
                                                       {
                   
         var searchresult4 = loop4searchresults[k4];
                            loop4content = getRecordTypeNameField(loop4FieldName,searchresult4) + ':' + searchresult4.getValue('internalid');
                           loopcontentnames[4]= getRecordTypeNameField(loop4FieldName,searchresult4);

                                                       }
                                 //nlapiLogExecution('AUDIT','check 4');
                                 //nlapiLogExecution('AUDIT','check 4',maxAcctsperReq);

                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers); iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords);
 iCounter = 0;contents1='';}
                                    loop4content = '';
                        }

                  } 
                  else 
                  {
                         var loop4results = searchresult.getFieldValues(loop4FieldName);
                         for ( var l4 = 0;  l4 < Math.min (500, loop4results.length); l4++)
                         {
                           var loop4results = searchresult.getFieldValues(loop4FieldName);
                           for ( var k4 = 0;  k4 < Math.min (500, loop4searchresults.length); k4++)
                             {
                               if (loop4results[l4] == loop4searchresults[k4].getValue('internalid'))
                                 {
                                    var searchresult4 = loop4searchresults[k4];
                                    loop4content = getRecordTypeNameField(loop4FieldName,searchresult4) + ':' + searchresult4.getValue('internalid');
                                    loopcontentnames[4] = getRecordTypeNameField(loop4FieldName,searchresult4);

                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);

                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
                                    loop4content = '';
                                 }
                             }
                         }
                   }//loop4 check End
              }
              else
              {	
                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                                // nlapiLogExecution('AUDIT','Data',contents1);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
                  loop3content = '';
             }//Is loop 4 check End
             loop3content = '';
         }
     } 
     else 
     {
        var loop3results = searchresult.getFieldValues(loop3FieldName);
        for ( var l3 = 0;  l3 < Math.min (500, loop3results.length); l3++)
        {
             var loop4results = searchresult.getFieldValues(loop3FieldName);
             for ( var k3 = 0;  k3 < Math.min (500, loop3searchresults.length); k3++)
             {
                if (loop3results[l3] == loop3searchresults[k3].getValue('internalid'))
                {
                    var searchresult3 = loop3searchresults[k3];
                    loop3content = getRecordTypeNameField(loop3FieldName,searchresult3) + ':' + searchresult3.getValue('internalid');
                    loopcontentnames[3] = getRecordTypeNameField(loop3FieldName,searchresult3);

                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
                    loop3content = '';
                }
             }
        }
     }//loop3 check End
}                                                                      
else
{	
                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
loop2content = '';
}//Is loop 3 check End


                                                                          loop2content = '';

                                                                       }
                                                                  } 
                                                                  else 
                                                                  {

                                                      //nlapiLogExecution('AUDIT','Getting into Loop2 Value',searchresult.getFieldValue(loop2FieldName));

                                                                          var loop2results = new Array();
                                                                           loop2results[0] = searchresult.getFieldValue(loop2FieldName);

                                                                           //nlapiLogExecution('AUDIT','Loop2results[0]',loop2results[0]);

                                                                           for ( var l2 = 0;  l2 < Math.min (500, loop2results.length); l2++)
                                                                           {

                                                                          // nlapiLogExecution('AUDIT','Getting into loop','Yes');

                                                                              for ( var k2 = 0;  k2 < Math.min (500, loop2searchresults.length); k2++)
                                                                              {
                                                                                    // nlapiLogExecution('AUDIT','Getting into loop2 and value',loop2results[l2]);

                                                                                 if (loop2results[l2] == loop2searchresults[k2].getValue('internalid'))
                                                                                {
                                                                                         //nlapiLogExecution('AUDIT','Both Matched','Yes');

                                                                                 var searchresult2 = loop2searchresults[k2];
                            loop2content = getRecordTypeNameField(loop2FieldName,searchresult2) + ':' + searchresult2.getValue('internalid');
                 loopcontentnames[2] = getRecordTypeNameField(loop2FieldName,searchresult2);
                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);

                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1=''; }
                                                                                  loop2content = '';
                                                                                }
                                                                              }
                                                                           }
                                                                  }//loop2 check End
                                                               } //loop2 Is Set to be check end
                                                                  else
                                                                  {

                                 //nlapiLogExecution('AUDIT','loop1content else loop',loop1content);
                                 iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                                 //nlapiLogExecution('AUDIT','contents',contents1);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers); iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords);
 iCounter = 0;contents1='';}
                                                                    } //loop2 to be set check else end

                                                loop1content = '';
                                          }
                                            
                        }   
                        else
                        {

                            var loop1results = searchresult.getFieldValues(loop1FieldName);

                            for ( var l1 = 0;  l1 < Math.min (500, loop1results.length); l1++)
                            {
                                 var loop1results = searchresult.getFieldValues(loop1FieldName);

                                 for ( var k1 = 0;  k1 < Math.min (500, loop1searchresults.length); k1++)
                                 {
 
                                   if (loop1results[l1] == loop1searchresults[k1].getValue('internalid'))
                                     {

                                        var searchresult1 = loop1searchresults[k1];

                                        loop1content = getRecordTypeNameField(loop1FieldName,searchresult1) + ':' + searchresult1.getValue('internalid');
                                        loopcontentnames[1] = getRecordTypeNameField(loop1FieldName,searchresult1);

                                
                                   //iCounter = iCounter + CoACnt;
                            //contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                             //if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}


 //loop2 Check Start
//Is loop 2 to be set ?
if ( loopsegs[1] != '' && loopsegs[1] != null)
{
                                                               if ( loop2SearchResultFieldValue == null || (loop2FieldName  == 'subsidiary' && (loop2SearchResultFieldValue != null && IsIncludeChildSubsdy  == 'T' ) || IncludeAllSubsidiary == 'T' ))
                                                                  {
                                                                    //nlapiLogExecution('AUDIT','check 3','Loop2 check 2 Start');

                                                                      for ( var k2 = 0;  k2 < Math.min (500, loop2MaxRecords); k2++)
                                                                      {

                                                       if ( OpType == 'delete'  &&  loopsegs[1] == UserEventRecType )
                                                        {
                                                       loop2content = DeletedSegmentName;
                                                         }
                                                        else
                                                       {
                                                                          var searchresult2 = loop2searchresults[k2];
              loop2content = getRecordTypeNameField(loop2FieldName,searchresult2) + ':' + searchresult2.getValue('internalid');
                                                                    //nlapiLogExecution('AUDIT','loop2 content',loop2content);
                                             loopcontentnames[2] = getRecordTypeNameField(loop2FieldName,searchresult2);

                                                       }

//Is loop 3 to be set ?
if ( loopsegs[2] != '' && loopsegs[2] != null)
{
     //loop3 Check Start
     if ( loop3SearchResultFieldValue == null || loop3SearchResultFieldValue == '' || (loop3FieldName  == 'subsidiary' && (loop3SearchResultFieldValue != null && IsIncludeChildSubsdy  == 'T' ) || IncludeAllSubsidiary == 'T' ))
     {

          //nlapiLogExecution('AUDIT','check 3');

         for ( var k3 = 0;  k3 < Math.min (500,loop3MaxRecords); k3++)
         {

                                                       if ( OpType == 'delete'  &&  loopsegs[2] == UserEventRecType)
                                                      {
                                                       loop3content = DeletedSegmentName;
                                                      }
                                                       else
                                                       {

             var searchresult3 = loop3searchresults[k3];
             loop3content = getRecordTypeNameField(loop3FieldName,searchresult3) + ':' + searchresult3.getValue('internalid');
                                            loopcontentnames[3]= getRecordTypeNameField(loop3FieldName,searchresult3);

                                                       }
       
             //Is loop 4 to be set ?
             if ( loopsegs[3] != '' && loopsegs[3] != null)
             {
                  //loop4 Check Start
                  if ( loop4SearchResultFieldValue == null || loop4SearchResultFieldValue == '' || (loop4FieldName  == 'subsidiary' && (loop4SearchResultFieldValue != null && IsIncludeChildSubsdy  == 'T' ) || IncludeAllSubsidiary == 'T' )) 
                   {
                        for ( var k4 = 0;  k4 < Math.min (500, loop4MaxRecords); k4++)
                        {
                                                      
                                                       if ( OpType == 'delete'   &&  loopsegs[3] == UserEventRecType)
                                                      {
                                                            loop4content = DeletedSegmentName;
                                                       }
                                                       else  
                                                       {
                   
         var searchresult4 = loop4searchresults[k4];
                            loop4content = getRecordTypeNameField(loop4FieldName,searchresult4) + ':' + searchresult4.getValue('internalid');
                           loopcontentnames[4]= getRecordTypeNameField(loop4FieldName,searchresult4);

                                                       }
                                 //nlapiLogExecution('AUDIT','check 4');
                                 //nlapiLogExecution('AUDIT','check 4',maxAcctsperReq);

                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
                                    loop4content = '';
                        }

                  } 
                  else 
                  {
                         var loop4results = searchresult.getFieldValues(loop4FieldName);
                         for ( var l4 = 0;  l4 < Math.min (500, loop4results.length); l4++)
                         {
                           var loop4results = searchresult.getFieldValues(loop4FieldName);
                           for ( var k4 = 0;  k4 < Math.min (500, loop4searchresults.length); k4++)
                             {
                               if (loop4results[l4] == loop4searchresults[k4].getValue('internalid'))
                                 {
                                    var searchresult4 = loop4searchresults[k4];
                                    loop4content = getRecordTypeNameField(loop4FieldName,searchresult4) + ':' + searchresult4.getValue('internalid');
                                    loopcontentnames[4] = getRecordTypeNameField(loop4FieldName,searchresult4);

                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);

                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
                                    loop4content = '';
                                 }
                             }
                         }
                   }//loop4 check End
              }
              else
              {	
                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                                // nlapiLogExecution('AUDIT','Data',contents1);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
                  loop3content = '';
             }//Is loop 4 check End
             loop3content = '';
         }
     } 
     else 
     {
        var loop3results = searchresult.getFieldValues(loop3FieldName);
        for ( var l3 = 0;  l3 < Math.min (500, loop3results.length); l3++)
        {
             var loop4results = searchresult.getFieldValues(loop3FieldName);
             for ( var k3 = 0;  k3 < Math.min (500, loop3searchresults.length); k3++)
             {
                if (loop3results[l3] == loop3searchresults[k3].getValue('internalid'))
                {
                    var searchresult3 = loop3searchresults[k3];
                    loop3content = getRecordTypeNameField(loop3FieldName,searchresult3) + ':' + searchresult3.getValue('internalid');
                    loopcontentnames[3] = getRecordTypeNameField(loop3FieldName,searchresult3);

                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
                    loop3content = '';
                }
             }
        }
     }//loop3 check End
}                                                                      
else
{	
                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1='';}
loop2content = '';
}//Is loop 3 check End


                                                                          loop2content = '';

                                                                       }
                                                                  } 
                                                                  else 
                                                                  {
                                                                           var loop2results = new Array();
                                                                           loop2results[0] = searchresult.getFieldValue(loop2FieldName);
                                                                           for ( var l2 = 0;  l2 < Math.min (500, loop2results.length); l2++)
                                                                           {
                                                                              for ( var k2 = 0;  k2 < Math.min (500, loop2searchresults.length); k2++)
                                                                              {
                                                                                 if (loop2results[l2] == loop2searchresults[k2].getValue('internalid'))
                                                                                {
                                                                                 var searchresult2 = loop2searchresults[k2];
                            loop2content = getRecordTypeNameField(loop2FieldName,searchresult2) + ':' + searchresult2.getValue('internalid');
                 loopcontentnames[2] = getRecordTypeNameField(loop2FieldName,searchresult2);
                                   iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);

                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers);iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords); iCounter = 0;contents1=''; }
                                                                                  loop2content = '';
                                                                                }
                                                                              }
                                                                           }
                                                                  }//loop2 check End
                                                                 }//loop2 to be Set Check End
                                                                 else
                                                                  {
  iCounter = iCounter + CoACnt;
                            contents1 += GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames);
                             if ( iCounter >= maxAcctsperReq)  { var responseresults = SendRequestToCoupa(contents1,url,headers); iCountRecords =iCountRecords + iCounter; nlapiLogExecution('AUDIT','Number of Records Processed',iCountRecords);
 iCounter = 0;contents1='';}
                                                                    } //loop2 to be set check else end

                                           loop1content = '';
                                      }
                                   }
                               }


                              loop1content = '';
                         }//loop1 check
                 acctcontents = '';

                     iValue++;
       }// try end
        catch(error)
	{
	        if ( error instanceof nlobjError )
	        {
		   var errordetails;
                   errorcode  = error.getCode();
		   switch(errorcode)
		   {
 			case "SSS_USAGE_LIMIT_EXCEEDED":
			errordetails = "NetSuite Scheduled Suitescript usage limit of 1000 units exceeded. Exiting script and Called another script to execute limited records per script.";
                                                       maxNbr= i - 1;  
   		nlapiLogExecution('ERROR','Process Error Max Nbr',  maxNbr);
                                                       CallAnotherScript(paramvalues,maxNbr,maxNbr,AcctMaxRecords);
			exit = true;
			break;
                                                        case "SSS_REQUEST_TIME_EXCEEDED":
                                                        errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).and Called another script to establish connection.";
                                                        i = i - 1;
                                                        break;
                                                        case "<em class='rn_Highlight'>SSS_TIME_LIMIT_EXCEEDED</em>":
                                                        errordetails = "NetSuite Suitescript execution time limit of 3600 seconds exceeded. Exiting script. and Called another script to execute next set of records per script.";
                                                       maxNbr= i - 1;  
   		nlapiLogExecution('ERROR','Process Error Max Nbr',  maxNbr);
                                                       CallAnotherScript(paramvalues,maxNbr,maxNbr,AcctMaxRecords);
			exit = true;
                                                        break;
			default:
			errordetails = error.getDetails()+ ".";
		   }
   		nlapiLogExecution('ERROR','Process Error',  errorcode + ': ' + errordetails);
   		//Send email to Netsuite admin
    		nlapiSendEmail(106223954,context.getSetting('SCRIPT' , 'custscript_acctsint_erroremailnotify'), context.getSetting('SCRIPT' ,'custscript_acctsint_accountname') + '- Error In Accounts Integration', 'Error Message: ' + errorcode + ': ' + errordetails);

	        }
               }

                var EndDate = new Date();
                var endTime = EndDate.getTime();

              if (parseInt(getExecutionTime(startTime,endTime)) >= 2800)
              {
                    initialNbr = i + 1;
                    //nlapiLogExecution('AUDIT','Loop i value',i);
                    //nlapiLogExecution('AUDIT','Loop initial Nbr value',initialNbr);
                    nlapiLogExecution('ERROR','Process Error',  'Execution Limit Exceeded 2800 secs so re-trigger new scheduled script');
                    IsCallAnotherScript = 'false';
                    contents1 = '';                    
                    CallAnotherScript(paramvalues,initialNbr,maxNbr,AcctMaxRecords);
                    exit = true;
                    break;
               }

      }
      if (contents1 != '' )
      {
            var responseresults = SendRequestToCoupa(contents1,url,headers);
       }
       if (IsCallAnotherScript == 'true')
      {
            initialNbr = maxNbr;  
             CallAnotherScript(paramvalues,initialNbr,maxNbr,AcctMaxRecords);
       }
}
function getExecutionTime(startTime,endTime)
{

var timeDiff = Math.abs(endTime - startTime);

   //nlapiLogExecution('DEBUG','Time Diff',timeDiff);

    var ss = Math.floor(timeDiff / 1000);

return ss;
}


function SendRequestToCoupa(data,url,headers)
{
       //nlapiLogExecution('AUDIT', 'Request Data',data);
    
/*objFile = nlapiCreateFile('Request_' + nlapiDateToString(new Date(),'date')  + nlapiDateToString(new Date(),'timeofday') + '.csv', 'CSV',data);
                      objFile.setFolder(15);
                      id = nlapiSubmitFile(objFile);  */


        var contents = '<?xml version=\"1.0\"  encoding=\"UTF-8\"?><accounts>' +  data+ '</accounts>';

         var response = nlapiRequestURL(url,contents, headers);

   if ( response.getCode() == '201' || response.getCode() == '200' )
   {
     //nlapiLogExecution('AUDIT', 'Response Body  for'+ response.getCode(), response.getBody());

   }
   else
  {
     nlapiLogExecution('ERROR', 'Response Body  for'+ response.getCode(), response.getBody());
    }

/* objFile = nlapiCreateFile('Response_' + nlapiDateToString(new Date(),'date')  + nlapiDateToString(new Date(),'timeofday') + '.csv', 'CSV',response.getBody());
                      objFile.setFolder(15);
                      id = nlapiSubmitFile(objFile);  */


return response;

}
function GetAcctFieldName(SegmentName)
{

  if (SegmentName == 'Department')
  {
      return 'department';
  } 

  if (SegmentName == 'Class')
  {
      return 'class';
  } 

  if (SegmentName == 'Subsidiary')
  {
      return 'subsidiary';
  } 

  if (SegmentName == 'Location' )
  {
      return 'location';
  } 

}

function SetLoopSegments(segments)
{
   var loopseg = new Array();

         loopseg[0] = '';
         loopseg[1] = '';
         loopseg[2] = '';
         loopseg[3] = '';

    if ( segments[0] == 'GL Account')
     {
         loopseg[0] = segments[1];
         loopseg[1] = segments[2];
         loopseg[2] = segments[3];
         loopseg[3] = segments[4];

      }
    if ( segments[1] == 'GL Account')
     {
         loopseg[0] = segments[0];
         loopseg[1] = segments[2];
         loopseg[2] = segments[3];
         loopseg[3] = segments[4];

      }
    if ( segments[2] == 'GL Account')
     {
         loopseg[0] = segments[0];
         loopseg[1] = segments[1];
         loopseg[2] = segments[3];
         loopseg[3] = segments[4];

      }
    if ( segments[3] == 'GL Account')
     {
         loopseg[0] = segments[0];
         loopseg[1] = segments[1];
         loopseg[2] = segments[2];
         loopseg[3] = segments[4];

      }
     if ( segments[4] == 'GL Account')
     {
         loopseg[0] = segments[0];
         loopseg[1] = segments[1];
         loopseg[2] = segments[2];
         loopseg[3] = segments[3];

      }

 return loopseg;
}
function SetLoopSegmentSearchResults(loopsegment,userEventRecType,userEventRecTypeID,segments)
{
                var deptfilters = new Array();
                var deptcolumns = new Array();
                var classfilters = new Array();
                var classcolumns = new Array();
                var subsdyfilters = new Array();
                var subsdycolumns = new Array();
                var locfilters = new Array();
                var loccolumns = new Array();
                var context = nlapiGetContext();

                var custfieldexclset = context.getSetting('SCRIPT' , 'custscript_acctsint_excl_set');
                var custfieldinclset  =  context.getSetting('SCRIPT' , 'custscript_acctsint_coasubsdylstinclonly');

                deptfilters[0] = new nlobjSearchFilter('isinactive',null,'is','F');
                deptcolumns[0] = new nlobjSearchColumn('name');
                deptcolumns[1] = new nlobjSearchColumn('internalid');
                deptcolumns[2] = new nlobjSearchColumn('namenohierarchy');

                classfilters[0] = new nlobjSearchFilter('isinactive',null,'is','F');
                classcolumns[0] = new nlobjSearchColumn('name');
                classcolumns[1] = new nlobjSearchColumn('internalid');
                classcolumns[2] = new nlobjSearchColumn('namenohierarchy');

                subsdyfilters[0] = new nlobjSearchFilter('isinactive',null,'is','F');
                subsdycolumns[0] = new nlobjSearchColumn('name');
                subsdycolumns[1] = new nlobjSearchColumn('internalid');
                subsdycolumns[2] = new nlobjSearchColumn('namenohierarchy');

                locfilters[0] = new nlobjSearchFilter('isinactive',null,'is','F');
                loccolumns[0] = new nlobjSearchColumn('name');
                loccolumns[1] = new nlobjSearchColumn('internalid');
                loccolumns[2] = new nlobjSearchColumn('namenohierarchy');

                  if ( loopsegment == 'Department' && loopsegment == userEventRecType)
                  {
                      deptfilters[0] = new nlobjSearchFilter('internalid',null,'is',userEventRecTypeID);
                      var  loopsegsearchresults =  nlapiSearchRecord('department',null,deptfilters,deptcolumns);
                  }
                  if ( loopsegment == 'Department' && loopsegment != userEventRecType )
                  {
                      if ( custfieldexclset== 'T') 
                      {
                           var  loopsegsearchresults =  nlapiSearchRecord('department','customsearch_onlycoupadepts',null,null);
                       }
                       else 
                       {
                           var  loopsegsearchresults =  nlapiSearchRecord('department',null,deptfilters,deptcolumns);
                       }
                  }
                  if ( loopsegment == 'Class'  && loopsegment == userEventRecType)
                  {
                      classfilters[0] = new nlobjSearchFilter('internalid',null,'is',userEventRecTypeID);
                       var  loopsegsearchresults =  nlapiSearchRecord('classification',null,classfilters,classcolumns);
                  }
                  if ( loopsegment == 'Class' &&  loopsegment != userEventRecType)
                  {
                        if(custfieldexclset == 'T')
                        {
                            var  loopsegsearchresults =  nlapiSearchRecord('classification','customsearch_onlycoupaclass',null,null);
                        }
                        else
                        {
                       var  loopsegsearchresults =  nlapiSearchRecord('classification',null,classfilters,classcolumns);
                        }

                  }
                   if ( loopsegment == 'Subsidiary' && loopsegment == userEventRecType)
                  {
                      subsdyfilters[0] = new nlobjSearchFilter('internalid',null,'is',userEventRecTypeID);

                      var  loopsegsearchresults =  nlapiSearchRecord('subsidiary',null,subsdyfilters,subsdycolumns);
                  }
                   if ( loopsegment == 'Subsidiary' && loopsegment != userEventRecType)
                  {
                        if(custfieldexclset == 'T')
                        {
                            var  loopsegsearchresults =  nlapiSearchRecord('subsidiary','customsearch_onlycoupasubsdys',null,null);
                        }
                       else if (custfieldinclset == 'T')
                        {
                            var  loopsegsearchresults =  nlapiSearchRecord('subsidiary','customsearch_onlycoasubsdys',null,null);
                        }
                        else
                        {
                            var  loopsegsearchresults =  nlapiSearchRecord('subsidiary',null,subsdyfilters,subsdycolumns);
                        }
                  }
                   if ( loopsegment == 'Location'  && loopsegment == userEventRecType)
                  {
                        locfilters[0] = new nlobjSearchFilter('internalid',null,'is',userEventRecTypeID);
                      var  loopsegsearchresults =  nlapiSearchRecord('location',null,locfilters,loccolumns);
                  }
                   if ( loopsegment == 'Location' && loopsegment != userEventRecType)
                  {
                        if(custfieldexclset == 'T')
                        {
                            var  loopsegsearchresults =  nlapiSearchRecord('location','customsearch_onlycoupalocs',null,null);
                        }
                        else
                        {
                              var  loopsegsearchresults =  nlapiSearchRecord('location',null,locfilters,loccolumns);
                        }
                  }

                
return  loopsegsearchresults;

}

function GetSegmentName(paramvalue)
{ 
      if (paramvalue == '1') { return 'GL Account' };
      if (paramvalue == '2') { return 'Department' };
      if (paramvalue == '3') { return 'Class' };
      if (paramvalue == '4') { return 'Subsidiary' };
      if (paramvalue == '5') { return 'Location' };
    	
}
function getGLAcctSegNo(segments)
{
   if (segments[0] == 'GL Account') { return '0'};
   if (segments[1] == 'GL Account') { return '1'};
   if (segments[2] == 'GL Account') { return '2'};
   if (segments[3] == 'GL Account') { return '3'};
   if (segments[4] == 'GL Account') { return '4'};

}
function getSegNo(segment,segments)
{
   if (segments[0] == segment) { return '0'};
   if (segments[1] == segment) { return '1'};
   if (segments[2] == segment) { return '2'};
   if (segments[3] == segment) { return '3'};
   if (segments[4] == segment) { return '4'};

}

function getGLAcctCustField(segments)
{
       var fieldname = 'custscript_acctsint_seg' + getGLAcctSegNo(segments) + '_excl_custfield';

  return fieldname;
}
function getCustField(segment,segments)
{
       var fieldname = 'custscript_acctsint_seg' + getSegNo(segment,segments) + '_excl_custfield';

  return fieldname;
}

function getRecordTypeNameField(fieldName,searchresults)
{
    var retvalue ='' ;
    var context = nlapiGetContext();

    //nlapiLogExecution('AUDIT','Called in');

    if (fieldName == 'department' )
    {
        //nlapiLogExecution('AUDIT','Department with hy',context.getSetting('SCRIPT' ,'custscript_acctsint_deptwithhierarchy'))

        if ( context.getSetting('SCRIPT' ,'custscript_acctsint_deptwithhierarchy') == 'T')
        {
             retvalue = searchresults.getValue('name');   
        }
        else
        {
             retvalue = searchresults.getValue('namenohierarchy');   
        }
      // nlapiLogExecution('AUDIT','ret value',retvalue);

    }
    if (fieldName == 'class' || fieldName == 'subsidiary' || fieldName == 'location')
    {
       retvalue  = searchresults.getValue('namenohierarchy');   
    }

  return retvalue;

}

function GenerateLineItem(acctcontents,acctsegment,loop1content,loop2content,loop3content,loop4content,GLAcctSegNo,OpType,chartofaccounts,loopcontentnames)  
{
        var xmlcontent = '';
        var xmlcontents = '';
        var coupaacctname='';
        var coupaacctcode='';
        var coupaacctname ='';
        var acctsegmentname = loopcontentnames[0];
        var loop1contentname = loopcontentnames[1];
        var loop2contentname = loopcontentnames[2];
        var loop3contentname = loopcontentnames[3];
        var loop4contentname = loopcontentnames[4];
        var accttypenames = new Array();
            accttypenames = chartofaccounts.split(',');

          var  acctsegment = '<![CDATA[' + acctsegment + ']]>';

          if (loop1content != '')
          {
            var  loop1content = '<![CDATA[' + loop1content + ']]>';
          } 
          if (loop2content != '')
          {
             var  loop2content = '<![CDATA[' + loop2content + ']]>';
           } 
           if (loop3content != '')
           {
             var  loop3content = '<![CDATA[' + loop3content + ']]>';
           } 
           if (loop4content != '')
          {
             var loop4content = '<![CDATA[' + loop4content + ']]>';
           } 

        xmlcontent = '<account>';
        if ( OpType == 'create' || OpType == 'edit-true' )
        {
         xmlcontent += '<active type=\"boolean\">true</active>';
        }
        if ( OpType == 'delete' || OpType == 'edit-false' )
        {
         xmlcontent += '<active type=\"boolean\">false</active>';
        }

        // xmlcontent += '<name>' + acctsegmentxml + '</name>';
          
        if ( GLAcctSegNo == '0')
       {
           coupaacctname += acctsegmentname ;
          if (loop1contentname != '')
          {
              coupaacctname += '-' + loop1contentname;
          } 
          if (loop2contentname != '')
          {
              coupaacctname += '-' + loop2contentname;
           } 
           if (loop3contentname != '')
           {
               coupaacctname += '-' + loop3contentname;
           } 
           if (loop4contentname != '')
          {
              coupaacctname  += '-' + loop4contentname;
           } 
           xmlcontent +=  '<name>'  + ' <![CDATA['  + coupaacctname +  ']]>' + '</name>';
           coupaacctname  = '';

           coupaacctcode += acctsegment ;
          if (loop1content != '')
          {
              coupaacctcode += '-' + loop1content;
          } 
          if (loop2content != '')
          {
              coupaacctcode += '-' + loop2content;
           } 
           if (loop3content != '')
           {
               coupaacctcode += '-' + loop3content;
           } 
           if (loop4content != '')
          {
              coupaacctcode  += '-' + loop4content;
           } 
           xmlcontent +=  '<code>'  + coupaacctcode + '</code>';
           coupaacctcode  = '';

           xmlcontent += '<segment-1>' + acctsegment + '</segment-1>';

          if (loop1content != '')
          {
              xmlcontent += '<segment-2>' + loop1content + '</segment-2>';
          } 
          if (loop2content != '')
          {
              xmlcontent += '<segment-3>' + loop2content + '</segment-3>';
           } 
           if (loop3content != '')
           {
               xmlcontent += '<segment-4>' + loop3content + '</segment-4>';
           } 
           if (loop4content != '')
          {
               xmlcontent += '<segment-5>' + loop4content + '</segment-5>';
           } 
       }
        if ( GLAcctSegNo == '1')
       {
          if (loop1contentname != '')
           {
              coupaacctname += loop1contentname;
           } 
          coupaacctname += '-' + acctsegmentname ;

          if (loop2contentname != '')
           {
              coupaacctname += '-' + loop2contentname;
           } 
          if (loop3contentname != '')
           {
               coupaacctname += '-' + loop3contentname;
           } 
          if (loop4contentname != '')
           {
              coupaacctname  += '-' + loop4contentname;
           } 
           xmlcontent +=  '<name>'  + ' <![CDATA['  + coupaacctname +  ']]>' + '</name>';
           coupaacctname  = '';


           if (loop1content != '')
          {
              coupaacctcode += loop1content;
          } 
               coupaacctcode += '-' + acctsegment; 

          if (loop2content != '')
          {
              coupaacctcode += '-' + loop2content;
           } 
           if (loop3content != '')
           {
               coupaacctcode += '-' + loop3content;
           } 
           if (loop4content != '')
          {
               coupaacctcode += '-' + loop4content;
           } 
          // xmlcontent +=  '<code>'   + coupaacctcode +   '</code>';

           coupaacctcode  = '';

           if (loop1content != '')
          {
              xmlcontent += '<segment-1>' + loop1content + '</segment-1>';
          } 
          xmlcontent += '<segment-2>' + acctsegment + '</segment-2>';
          if (loop2content != '')
          {
              xmlcontent += '<segment-3>' + loop2content + '</segment-3>';
           } 
           if (loop3content != '')
           {
               xmlcontent += '<segment-4>' + loop3content + '</segment-4>';
           } 
           if (loop4content != '')
          {
               xmlcontent += '<segment-5>' + loop4content + '</segment-5>';
           } 
       }
        if ( GLAcctSegNo == '2')
       {
          if (loop1contentname != '')
           {
              coupaacctname += loop1contentname;
           } 
          if (loop2contentname != '')
           {
              coupaacctname += '-' + loop2contentname;
           } 
          coupaacctname += '-' + acctsegmentname ;

          if (loop3contentname != '')
           {
               coupaacctname += '-' + loop3contentname;
           } 
          if (loop4contentname != '')
           {
              coupaacctname  += '-' + loop4contentname;
           } 
           xmlcontent +=  '<name>'  + ' <![CDATA['  + coupaacctname +  ']]>' + '</name>';
           coupaacctname  = '';

           if (loop1content != '')
          {
              coupaacctcode += loop1content;
          } 
          if (loop2content != '')
          {
              coupaacctcode += '-' + loop2content;
           } 
               coupaacctcode += '-' + acctsegment; 
           if (loop3content != '')
           {
               coupaacctcode += '-' + loop3content;
           } 
           if (loop4content != '')
          {
               coupaacctcode += '-' + loop4content;
           } 
           xmlcontent +=  '<code>'  + coupaacctcode +  '</code>';

           coupaacctcode  = '';

           if (loop1content != '')
          {
              xmlcontent += '<segment-1>' + loop1content + '</segment-1>';
          } 
          if (loop2content != '')
          {
              xmlcontent += '<segment-2>' + loop2content  + '</segment-2>';
           } 
          xmlcontent += '<segment-3>' + acctsegment + '</segment-3>';
           if (loop3content != '')
           {
               xmlcontent += '<segment-4>' + loop3content + '</segment-4>';
           } 
           if (loop4content != '')
          {
               xmlcontent += '<segment-5>' + loop4content + '</segment-5>';
           } 
       }
        if ( GLAcctSegNo == '3')
       {
          if (loop1contentname != '')
           {
              coupaacctname += loop1contentname;
           } 
          if (loop2contentname != '')
           {
              coupaacctname += '-' + loop2contentname;
           } 
          if (loop3contentname != '')
           {
               coupaacctname += '-' + loop3contentname;
           } 
          coupaacctname += '-' + acctsegmentname ;
          if (loop4contentname != '')
           {
              coupaacctname  += '-' + loop4contentname;
           } 
           xmlcontent +=  '<name>'  + ' <![CDATA['  + coupaacctname +  ']]>' + '</name>';
           coupaacctname  = '';

           if (loop1content != '')
          {
              coupaacctcode += loop1content;
          } 
          if (loop2content != '')
          {
              coupaacctcode += '-' + loop2content;
           } 
           if (loop3content != '')
           {
               coupaacctcode += '-' + loop3content;
           } 
               coupaacctcode += '-' + acctsegment; 

           if (loop4content != '')
          {
               coupaacctcode += '-' + loop4content;
           } 
           xmlcontent +=  '<code>'   + coupaacctcode +  '</code>';

           coupaacctcode  = '';

           if (loop1content != '')
          {
              xmlcontent += '<segment-1>' + loop1content + '</segment-1>';
          } 
          if (loop2content != '')
          {
              xmlcontent += '<segment-2>' + loop2content + '</segment-2>';
           } 
           if (loop3content != '')
           {
               xmlcontent += '<segment-3>' + loop3content + '</segment-3>';
           } 
          xmlcontent += '<segment-4>' + acctsegment + '</segment-4>';
           if (loop4content != '')
          {
               xmlcontent += '<segment-5>' + loop4content + '</segment-5>';
           } 
       }
        if ( GLAcctSegNo == '4')
       {

          if (loop1contentname != '')
           {
              coupaacctname += loop1contentname;
           } 
          if (loop2contentname != '')
           {
              coupaacctname += '-' + loop2contentname;
           } 
          if (loop3contentname != '')
           {
               coupaacctname += '-' + loop3contentname;
           } 
          if (loop4contentname != '')
           {
              coupaacctname  += '-' + loop4contentname;
           } 
          coupaacctname += '-' + acctsegmentname ;
           xmlcontent +=  '<name>'  + ' <![CDATA['  + coupaacctname +  ']]>' + '</name>';
           coupaacctname  = '';

           if (loop1content != '')
          {
              coupaacctcode += loop1content;
          } 
          if (loop2content != '')
          {
              coupaacctcode += '-' + loop2content;
           } 
           if (loop3content != '')
           {
               coupaacctcode += '-' + loop3content;
           } 
               coupaacctcode += '-' + acctsegment; 

           if (loop4content != '')
          {
               coupaacctcode += '-' + loop4content;
           } 

           xmlcontent +=  '<code>'   + coupaacctcode + '</code>';

           coupaacctcode  = '';

           if (loop1content != '')
          {
              xmlcontent += '<segment-1>' + loop1content + '</segment-1>';
          } 
          if (loop2content != '')
          {
              xmlcontent += '<segment-2>' + loop2content + '</segment-2>';
           } 
           if (loop3content != '')
           {
               xmlcontent += '<segment-3>' + loop3content + '</segment-3>';
           } 
           if (loop4content != '')
          {
               xmlcontent += '<segment-4>' + loop4content + '</segment-4>';
           } 
           xmlcontent += '<segment-5>' + acctsegment + '</segment-5>';
       }

          if ( nlapiGetContext().getSetting('SCRIPT' , 'custscript_acctsint_coasubsdylstinclonly') == 'T' )
           {
              xmlcontent = xmlcontent + '<account-type><name>' + loop1contentname + '</name></account-type></account>'; 
             return xmlcontent;
           }
           else
           {
                 for (i=0;i<accttypenames.length;i++)
                {
                   var xmlinterim = xmlcontent + '<account-type><name>' + accttypenames[i] + '</name></account-type></account>';
                   xmlcontents += xmlinterim;
                }
                   return xmlcontents;
            }
}
function CallAnotherScript(paramvalues,initialNbr,maxNbr,AcctMaxRecords)
{
               var params = new Array();
               //params['custscript_acctsint_url'] = paramvalues[0];
               params['custscript_acctsint_accountname'] = paramvalues[1];
               //params['custscript_acctsint_apikey'] = paramvalues[2];
               params['custscript_acctsint_segment1'] = paramvalues[3];
               params['custscript_acctsint_segment2'] = paramvalues[4];
               params['custscript_acctsint_segment3'] = paramvalues[5];
               params['custscript_acctsint_segment4'] = paramvalues[6];
               params['custscript_acctsint_segment5'] = paramvalues[7];
               params['custscript_acctsint_userrectype'] = paramvalues[8];
               params['custscript_acctsint_userrectypeid'] = paramvalues[9];
               params['custscript_acctsint_optype'] = paramvalues[10];
               params['custscript_acctsint_deletedsegmentname'] = paramvalues[11];
               params['custscript_acctsint_fromrecords'] = paramvalues[12];
              params['custscript_acctsint_maxrecords'] = paramvalues[13];
              params['custscript_acctsint_noofrecordsperequest'] = paramvalues[14];
              params['custscript_acctsint_chartofaccounts'] = paramvalues[15];
              params['custscript_acctsint_excl_set'] = paramvalues[16];

               params['custscript_acctsint_fromrecords'] = parseInt(initialNbr);

              //nlapiLogExecution('AUDIT','Loop initial Nbr in params',params['custscript_acctsint_fromrecords']);

               if (parseInt(parseInt(maxNbr) + parseInt(maxNbr)) > parseInt(AcctMaxRecords))
               {
                     params['custscript_acctsint_maxrecords'] = AcctMaxRecords;
               } 
               else
               {
                     params['custscript_acctsint_maxrecords'] = parseInt(parseInt(maxNbr) + parseInt(maxNbr));
               }

               nlapiScheduleScript(nlapiGetContext().getScriptId(),nlapiGetContext().getDeploymentId(),params);
}