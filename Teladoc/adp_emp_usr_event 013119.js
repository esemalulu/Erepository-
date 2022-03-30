/* Last Updated: 15-Feb-2018 */
/* [NETSUITE-122] 02/15/18 - Derive NS department */
/* [NETSUITE-158] 05/03/18 - set email to inactive@livongo.com for terminated employees*/
/* [NETSUITE-223] 10/31/18 - update email address with prefix "inactive." for records with termination date populated */
/* 12/08/18 - department approver default */


function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  nlapiLogExecution('DEBUG','beforeSubmit') ;
  nlapiLogExecution('DEBUG','type : '+ type) ;
  
  if ( (nlapiGetContext().getExecutionContext() == 'suitelet'))
  {
     nlapiLogExecution('DEBUG','Inside suitelet') ;
     var termdate =  nlapiGetFieldValue('releasedate');
     var email = nlapiGetFieldValue('email');
     var supervisor = nlapiGetFieldValue('supervisor');
     var deptapprover = nlapiGetFieldValue('custentity_liv_dept_approver');
     var entityid = nlapiGetFieldValue('entityid');
     
     nlapiLogExecution('DEBUG','supervisor '+ supervisor) ;
     nlapiLogExecution('DEBUG','deptapprover '+ deptapprover) ;
     
     if (supervisor  == deptapprover)
     {
         nlapiLogExecution('DEBUG','Inside supervisor == deptapprover') ;
         deptapprover = null ;
         nlapiLogExecution('DEBUG','deptapprover '+ deptapprover) ;
         nlapiSetFieldValue('custentity_liv_dept_approver', deptapprover );
     }

             // update sales rep
       if (adpdeptcode == '040500')
       {
         nlapiSetFieldValue('issalesrep', 'T' );
       }
         if (adpdeptcode == '040600')
       {
         nlapiSetFieldValue('issalesrep', 'T' );
       }
    
     if (termdate) //terminated
     {
        nlapiLogExecution('DEBUG','if termdate') ;
        var newemail = 'inactive@livongo.com' ;
        nlapiLogExecution('DEBUG','New email: '+ newemail) ;
        nlapiSetFieldValue('comments', email );
        nlapiSetFieldValue('email', newemail );
        nlapiSetFieldValue('entityid', entityid + ' (Inactive)'  );
       nlapiSetFieldValue('supervisor', null );
       nlapiSetFieldValue('giveaccess', 'F' );
       
     }
     else
     {
        
        nlapiLogExecution('DEBUG','else termdate') ;
       // nlapiLogExecution('DEBUG','New email: '+ newemail) ;
       // nlapiSetFieldValue('comments', email );
     }
  
  
  }
  

if ( (nlapiGetContext().getExecutionContext() == 'csvimport') )
{
   if (type == 'create')
   {
       var firstname =  nlapiGetFieldValue('firstname');
       var lastname =  nlapiGetFieldValue('lastname');
       var employeeid = lastname + ", " + firstname;
       
       nlapiLogExecution('DEBUG','Enmployee ID : '+ employeeid) ;
       nlapiSetFieldValue('entityid', employeeid );
       
    
   }

       var adpdeptcode = nlapiGetFieldValue('custentity_liv_adp_dept_code');
       var releasedate = nlapiGetFieldValue('releasedate');

       
       nlapiLogExecution('DEBUG','ADP dept codedepartment : '+ adpdeptcode) ;
       nlapiLogExecution('DEBUG','Release Date : '+ releasedate) ;
       
       if (releasedate) //NS-158
       {
          nlapiLogExecution('DEBUG','Inside releasedate: ') ;
          nlapiSetFieldValue('email', 'inactive@livongo.com' );
          nlapiSetFieldValue('giveaccess', 'F' );
       }
    
        // update sales rep
       if (adpdeptcode == '040500')
       {
         nlapiSetFieldValue('issalesrep', 'T' );
       }
         if (adpdeptcode == '040600')
       {
         nlapiSetFieldValue('issalesrep', 'T' );
       }
  
     // Update NS Location
     /*
       if (location == 'California Office')
       {
         nlapiSetFieldText('location', 'LIV MV' );
       }
       if (location == 'Chicago Office')
       {
         nlapiSetFieldText('location', 'LIV CHI' );
       }
        if (location == 'Mountain View Office')
       {
         nlapiSetFieldText('location', 'LIV MV' );
       }
        if (location == 'San Francisco Office')
       {
         nlapiSetFieldText('location', 'LIV SF' );
       }
       */
    
    
       // Update NS Dept
    /* done in Celigo now
       if (adpdeptcode == '20700')
       {
         nlapiSetFieldText('department', 'G&A : HR' );
       }
       if (adpdeptcode == '40700')
       {
         nlapiSetFieldText('department', 'S&M : CIM' );
       }
       if (adpdeptcode == '010100')
       {
         nlapiSetFieldText('department', 'COR : CDE' );
       }
       if (adpdeptcode == '010200')
       {
         nlapiSetFieldText('department', 'COR : Member Support' );
       }
       if (adpdeptcode == '020100')
       {
         nlapiSetFieldText('department', 'G&A : CEO & Admin' );
       }
       if (adpdeptcode == '020200')
       {
         nlapiSetFieldText('department', 'COR : Member Support (Opex Alloc.)' );
       }
       if (adpdeptcode == '020300')
       {
         nlapiSetFieldText('department', 'G&A : Finance' );
       }
       if (adpdeptcode == '020400')
       {
         nlapiSetFieldText('department', 'G&A : Legal' );
       }
       if (adpdeptcode == '020500')
       {
         nlapiSetFieldText('department', 'G&A : Ops' );
       }
       if (adpdeptcode == '020600')
       {
         nlapiSetFieldText('department', 'G&A : Supply Chain' );
       }
       if (adpdeptcode == '020700')
       {
         nlapiSetFieldText('department', 'G&A : HR' );
       }
       if (adpdeptcode == '020800')
       {
         nlapiSetFieldText('department', 'G&A : Regulatory' );
       }
       if (adpdeptcode == '030100')
       {
         nlapiSetFieldText('department', 'R&D : Clinical DS' );
       }
       if (adpdeptcode == '030200')
       {
         nlapiSetFieldText('department', 'COR : Member Support (Opex Alloc.)' );
       }
       if (adpdeptcode == '030400')
       {
         nlapiSetFieldText('department', 'R&D : Product' );
       }
       if (adpdeptcode == '030500')
       {
         nlapiSetFieldText('department', 'R&D : Tech' );
       }
       if (adpdeptcode == '040100')
       {
         nlapiSetFieldText('department', 'S&M : Biz Dev' );
       }
       if (adpdeptcode == '040200')
       {
         nlapiSetFieldText('department', 'S&M : CSM' );
       }
       if (adpdeptcode == '040300')
       {
         nlapiSetFieldText('department', 'S&M : Marketing' );
       }
       if (adpdeptcode == '040500')
       {
         nlapiSetFieldText('department', 'S&M : Payor' );
       }
       if (adpdeptcode == '040600')
       {
         nlapiSetFieldText('department', 'S&M : Sales' );
       }
       if (adpdeptcode == '040700')
       {
         nlapiSetFieldText('department', 'S&M : CIM' );
       }
       // NS-260
       if (adpdeptcode == '020710')
       {
         nlapiSetFieldText('department', 'G&A : 7006 Recruiting' );
       }
       if (adpdeptcode == '020720')
       {
         nlapiSetFieldText('department', 'G&A : 7007 Learning & Development' );
       }
       if (adpdeptcode == '040310')
       {
         nlapiSetFieldText('department', '6000 Marketing : 6005 Marketing Corporate' );
       }
       if (adpdeptcode == '040320')
       {
         nlapiSetFieldText('department', '6000 Marketing : 6001 Marketing Enrollment' );
       }
       if (adpdeptcode == '040330')
       {
         nlapiSetFieldText('department', '6000 Marketing : 6004 Marketing Product' );
       }
        if (adpdeptcode == '040300')
       {
         nlapiSetFieldText('department', '6000 Marketing : 6003 Marketing Commercial/HSS' );
       }
       */
       
  }  
} // end function beforeSumit