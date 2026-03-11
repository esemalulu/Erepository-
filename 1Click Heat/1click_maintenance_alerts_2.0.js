/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error',
        'N/file', 
        'N/record', 
        'N/runtime', 
        'N/search', 
        'N/task',
        'N/format',
        'N/email'],
/**
 * @param {error} error
 * @param {file} file
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {transaction} transaction
 */
function(error, file, record, runtime, search, task, format, email) 
{
   	
function executeScript(context) 
{

	    	
  try
  {

        var today = new Date();

        var oneYearAgo = new Date(today);
        oneYearAgo.setDate(today.getDate() - 365 + 15); 
        oneYearAgo = format.format({value: oneYearAgo, type: format.Type.DATE});

        var twoYearsAgo = new Date(today);
        twoYearsAgo.setDate(today.getDate() - 730 + 16); 
        twoYearsAgo = format.format({value: twoYearsAgo, type: format.Type.DATE});

    	log.error('oneYearAgo', oneYearAgo);
    	log.error('twoYearsAgo', twoYearsAgo);

        var alertSearch_1yr = search.create({
            type: "customrecord_cmms_equipment_service",
           filters:
           [
              ["custrecord_cmms_eqsrv_start_date","on", oneYearAgo, oneYearAgo],
              "AND", 
              ["custrecord_cmms_eqsrv_workflow_status","noneof","7"], 
              "AND", 
              ["custrecord_cmms_eqsrv_order.status","noneof","SalesOrd:C","SalesOrd:H"], 
              "AND", 
              ["custrecord_cmms_eqsrv_order.mainline","is","T"], 
              "AND", 
              ["custrecord_cmms_eqsrv_order.class","anyof","29","28","25","9","7","6"]
             
           ],
           columns:
           [
              search.createColumn({ name: "tranid", join: "CUSTRECORD_CMMS_EQSRV_ORDER", summary: "GROUP"}),
              search.createColumn({ name: "companyname", join: "CUSTRECORD_CMMS_EQSRV_CUSTOMER", summary: "MAX"}),
              search.createColumn({ name: "custbodytechcoveragezone", join: "CUSTRECORD_CMMS_EQSRV_ORDER", summary: "MAX"}),
              search.createColumn({ name: "class", join: "CUSTRECORD_CMMS_EQSRV_ORDER", summary: "MAX"}),
              search.createColumn({ name: "custrecord_cmms_eqsrv_start_date", summary: "MAX"}),
              search.createColumn({ name: "formuladate", summary: "MAX", formula: "{custrecord_cmms_eqsrv_start_date}+365"}),
              search.createColumn({ name: "formuladate", summary: "MAX", formula: "{custrecord_cmms_eqsrv_start_date}+730"})
            ]
        }).run().getRange({start: 0, end: 1000 });	
    
   
        var alertSearch_2yrs = search.create({
            type: "customrecord_cmms_equipment_service",
           filters:
           [
              ["custrecord_cmms_eqsrv_start_date","on", twoYearsAgo, twoYearsAgo],
              "AND", 
              ["custrecord_cmms_eqsrv_workflow_status","noneof","7"], 
              "AND", 
              ["custrecord_cmms_eqsrv_order.status","noneof","SalesOrd:C","SalesOrd:H"], 
              "AND", 
              ["custrecord_cmms_eqsrv_order.mainline","is","T"], 
              "AND", 
              ["custrecord_cmms_eqsrv_order.class","anyof","29","28","25","9","7","6"]
             
           ],
           columns:
           [
              search.createColumn({ name: "tranid", join: "CUSTRECORD_CMMS_EQSRV_ORDER", summary: "GROUP"}),
              search.createColumn({ name: "companyname", join: "CUSTRECORD_CMMS_EQSRV_CUSTOMER", summary: "MAX"}),
              search.createColumn({ name: "custbodytechcoveragezone", join: "CUSTRECORD_CMMS_EQSRV_ORDER", summary: "MAX"}),
              search.createColumn({ name: "class", join: "CUSTRECORD_CMMS_EQSRV_ORDER", summary: "MAX"}),
              search.createColumn({ name: "custrecord_cmms_eqsrv_start_date", summary: "MAX"}),
              search.createColumn({ name: "formuladate", summary: "MAX", formula: "{custrecord_cmms_eqsrv_start_date}+365"}),
              search.createColumn({ name: "formuladate", summary: "MAX", formula: "{custrecord_cmms_eqsrv_start_date}+730"})
            ]
        }).run().getRange({start: 0, end: 1000 });		

    	log.error('alertSearch', JSON.stringify(alertSearch_2yrs));


        var strName = "<table width=\"550\" style=\"margin-top: 20px;\" >";
		strName += "<tr style=\"background-color: #D3D3D3;\">";
		strName += "<td colspan=\"6\">Sales Order</td>"; 
		strName += "<td colspan=\"2\">Customer</td>";
		strName += "<td colspan=\"3\">Install Date</td>";
    	strName += "<td style=\"color: red;\" colspan=\"3\">Next Maintenance Date</td>";
		strName += "</tr>";

    
        for (var i=0; alertSearch_2yrs && i < alertSearch_2yrs.length; i+=1)
        {
    	    strName += "<tr>";
		    strName += "<td colspan=\"6\">"+ alertSearch_2yrs[i].getValue({name: "tranid", join: "CUSTRECORD_CMMS_EQSRV_ORDER", summary: "GROUP"})+"</td>"; 
		    strName += "<td colspan=\"2\">"+ alertSearch_2yrs[i].getValue({name: "companyname", join: "CUSTRECORD_CMMS_EQSRV_CUSTOMER", summary: "MAX"})+"</td>"; 
		    strName += "<td colspan=\"3\">"+ alertSearch_2yrs[i].getValue({name: "custrecord_cmms_eqsrv_start_date", summary: "MAX"})+"</td>"; 
		    strName += "<td colspan=\"3\">"+ alertSearch_2yrs[i].getValue({name: "formuladate", summary: "MAX", formula: "{custrecord_cmms_eqsrv_start_date}+730"})+"</td>"; 
		    strName += "</tr>";         
        }

		strName += "</table>";      
    
        email.send({
	    		'author':754043,
	    		'recipients':['esemalulu@1clickheat.com'],
	    		//'recipients':['esemalulu@1clickheat.com', 'BTiernan@1clickheat.com'],
	    		//'bcc':['esemalulu@1clickheat.com'],
	    		'subject':'Upcoming Maintanence Due ',
	    		'body':strName
	    });                        
          
    }
    catch (err)
    {
    	log.error('Error Process File ', err);
    				
    }
    	
}

  

  function isEmpty(stValue)
  {
            if ((stValue == '') || (stValue == null) || (stValue == undefined))
            {
                return true;
            }
            else
            {
                if (stValue instanceof String)
                {
                    if ((stValue == ''))
                    {
                        return true;
                    }
                }
                else if (stValue instanceof Array)
                {
                    if (stValue.length == 0)
                    {
                        return true;
                    }
                }
                return false;
            }
  }


  

    return {
        execute: executeScript
    };
    
});
