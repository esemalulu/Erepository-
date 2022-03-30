/* Last Updated: 15-Feb-2018 */
/* [NETSUITE-122] 02/15/18 - Derive NS department */
/* [NETSUITE-158] 05/03/18 - set email to inactive@livongo.com for terminated employees*/


function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  nlapiLogExecution('DEBUG','beforeSubmit') ;
  nlapiLogExecution('DEBUG','type : '+ type) ;

if ( (nlapiGetContext().getExecutionContext() == 'csvimport'))
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

       
       nlapiLogExecution('DEBUG','ADP dept code : '+ adpdeptcode) ;
       nlapiLogExecution('DEBUG','Release Date : '+ releasedate) ;
       
       if (releasedate) //NS-158
       {
          nlapiLogExecution('DEBUG','Inside releasedate: ') ;
          nlapiSetFieldValue('email', 'inactive@livongo.com' );
       }

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
         nlapiSetFieldText('department', 'COR : CDE' );
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
         nlapiSetFieldText('department', 'COR : Member Support' );
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

  }  
} // end function beforeSumit