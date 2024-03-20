function getRAList()
{
  //nlapiLogExecution('Debug', 'RA List');	
  var context = nlapiGetContext();
  try
  {
    var filter = new Array();
    //filter.push(new nlobjSearchFilter('custbody_ifd_rapickupdate',null,'onorafter',orderno));
    //filter[0] = new nlobjSearchFilter('custbody_ifd_rapickupdate', null, 'onOrAfter', 'today',null);
    filter[0] = new nlobjSearchFilter('custbody_ifd_rapickupdate', null, 'noton', 'today',null);
    filter[1] = new nlobjSearchFilter('mainline', null, 'is', 'T',null);
    filter[2] = new nlobjSearchFilter('custbody_ra_pickup_account', null, 'isnotempty', null,null);  
    filter[3] = new nlobjSearchFilter('status', null, 'is', 'RtnAuth:B',null);


    var columns = new Array();
    columns[0] = new nlobjSearchColumn('internalid');	
    columns[1] = new nlobjSearchColumn('custbody_ra_pickup_account');
    columns[2] = new nlobjSearchColumn('tranid');
    columns[3] = new nlobjSearchColumn('custbody_ifd_pickup_details_manual_set');
    var raList= nlapiSearchRecord('returnauthorization',null,filter,columns);
    if(raList!=null )
    { 
      if(raList.length > 0)
      {
        nlapiLogExecution('Debug', 'raList.length',raList.length );	
        for (var x = 0; x < raList.length; x++)
        {
          var usage = context.getRemainingUsage();
          //nlapiLogExecution("DEBUG", "Remaining usuage", usage);
          if( usage < 100 )
          {
            var state = nlapiYieldScript();
            if( state.status == 'FAILURE')
            {
              nlapiLogExecution("ERROR","Failed to yield script, exiting: Reason = "+state.reason + " / Size = "+ state.size);
              throw "Failed to yield script";
            } 
            else if ( state.status == 'RESUME' )
            {
              nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason+".  Size = "+ state.size);
            }	 		
          }

          var raid=raList[x].getId();
          var rectype = raList[x].getRecordType();
          var pickupaccount = raList[x].getValue('custbody_ra_pickup_account');
          var tranid = raList[x].getValue('tranid');
          var ismanual = raList[x].getValue('custbody_ifd_pickup_details_manual_set');
          //nlapiLogExecution('DEBUG','raid= ',raid + '  pickupaccount = ' + pickupaccount + ', ismanual: ' + ismanual);
          if(pickupaccount != null && pickupaccount != '' && ismanual != 'T'){
            var filters1 = new Array();
            //filter.push(new nlobjSearchFilter('custbody_ifd_rapickupdate',null,'onorafter',orderno));
            filters1[0] = new nlobjSearchFilter('shipdate', null, 'onOrAfter', 'tomorrow',null); 
            filters1[1] = new nlobjSearchFilter('mainline', null, 'is', 'T',null);
            filters1[2] = new nlobjSearchFilter('status', null, 'is', 'SalesOrd:B',null);
            filters1[3] = new nlobjSearchFilter('entity', null, 'anyof', pickupaccount);
            var columns1 = new Array();
            columns1[0] = new nlobjSearchColumn('internalid');	
            columns1[1] = new nlobjSearchColumn('status');
            columns1[2] = new nlobjSearchColumn('shipdate').setSort();
            columns1[3] = new nlobjSearchColumn('custbody_ifd_so_route_number');
            columns1[4] = new nlobjSearchColumn('custbody_ifd_stop');
            var soList= nlapiSearchRecord('salesorder',null,filters1,columns1);
            var sofound = false;
            var route = '';
            var stop = '';
            if(soList!=null )
            { 
              if(soList.length > 0)
              {
                for (var i = 0; i < soList.length; i++)
                {
                  sofound = true;
                  var soid=soList[i].getId();

                  if(i==0){
                    var sostatus = soList[i].getValue('status');
                    var shipdate = soList[i].getValue('shipdate');
                    route = soList[i].getValue('custbody_ifd_so_route_number');
                    if(route == null ){
                      route = '';
                    }                    
                    stop = soList[i].getValue('custbody_ifd_stop');
                    if(stop == null ){
                      stop = '';
                    }  
                    var rarec = nlapiLoadRecord('returnauthorization', raid);
                    rarec.setFieldValue('custbody_ifd_stop',stop);
                    rarec.setFieldValue('custbody_ifd_so_route_number',route);
                    rarec.setFieldValue('custbody_ifd_rapickupdate',shipdate);
                    var rarecid = nlapiSubmitRecord(rarec);
                    nlapiLogExecution('DEBUG','updated - so shipdate- raid= ',raid + '  tranid = ' + tranid);
                  }
                  //update all SO's
                  //var updatefields = nlapiSubmitField('salesorder', soid, 'custbody_ifd_ra', 'T');
                  //nlapiLogExecution('DEBUG','updated RA checkbox- soid = ',soid );
                }
              }
            } //soList
            nlapiLogExecution('Debug', 'sofound',sofound);
            if(sofound == false){
              var adddays = 1;
              var today = new Date();
              nlapiLogExecution('Debug', 'today',today);
              var day = today.getDay();
              nlapiLogExecution('Debug', 'day',day);
              if(day == 6){
                adddays = 2;
              }
              if(day == 5){
                adddays = 3;
              }
              var shipdate1 = nlapiAddDays(today, adddays);
              var shipdate = nlapiDateToString(shipdate1, 'date');
              nlapiLogExecution('Debug', 'shipdate',shipdate);
              var rarec = nlapiLoadRecord('returnauthorization', raid);
              rarec.setFieldValue('custbody_ifd_stop','');
              rarec.setFieldValue('custbody_ifd_so_route_number','');
              rarec.setFieldValue('shipdate',shipdate);
              var rarecid = nlapiSubmitRecord(rarec);
              nlapiLogExecution('DEBUG','updated-next business day- raid= ',raid + '  tranid = ' + tranid);
            }
          }//pickupaccount
          //break;
        } 
      }
    }
  }
  catch(exp)
  {
    nlapiLogExecution('Debug', 'unexpected error',exp);	
  }

}
