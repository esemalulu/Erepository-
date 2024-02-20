/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record','N/search','N/file','N/format','N/runtime','N/task'],

function(record, search, file,format,runtime,task)
{

function execute(scriptContext)
{
   try
   {
	    var i_starting_index = runtime.getCurrentScript().getParameter({name: 'custscript_starting_index2'});	
		log.debug('i_starting_index:--'+i_starting_index);
		if(!i_starting_index)
		{
			i_starting_index = 0;
		}//end of i_starting_index   
		var vendorbillSearchObj = search.create({
		   type: "vendorbill",
		   filters:
		   [
			  ["type","anyof","VendBill"], 
			  "AND", 
			  ["createdfrom.type","anyof","PurchOrd"], 
			  "AND", 
			  ["closedate","onorafter","3/1/2022 12:00 am"], 
			  "AND", 
			  ["closedate","onorbefore","2/31/2023 11:59 pm"], 
			  "AND", 
			  ["mainline","is","F"], 
			  "AND", 
			  ["formulanumeric: CASE WHEN ABS({quantity}) =  ABS({appliedtotransaction.quantity}) THEN 1  ELSE 0 END","equalto","1"], 
			  "AND", 
			  ["formulanumeric: CASE WHEN  ABS({linesequencenumber}) = ABS({appliedtotransaction.linesequencenumber}) THEN 1 ELSE 0 END","equalto","1"]
		   ],
		   columns:
		   [
			  search.createColumn({
				 name: "trandate", label: "Invoice Date"
			  }),
			  search.createColumn({
				 name: "closedate",
				 label: "Invoice Paid Date"
			  }),
			  search.createColumn({
				 name: "debitamount",
				 label: "Invoice Line Amount"
			  }),
			  search.createColumn({name: "linesequencenumber", label: "Invoice Line Number"}),
			  search.createColumn({name: "tranid", label: "Vendor Invoice Number"}),
			  search.createColumn({name: "terms", label: "Invoice Terms"}),
			  search.createColumn({name: "quantity", label: "Invoice Transaction qty"}),
			  search.createColumn({name: "rate", label: "Invoice Item Rate"}),
			  search.createColumn({name: "unit", label: "Invoice UOM"}),
			  search.createColumn({name: "item", label: "PO Item Number"}),
			  search.createColumn({
				 name: "assetaccount",
				 join: "item",
				 label: "PO Account"
			  }),
			  search.createColumn({
				 name: "trandate",
				 join: "createdFrom",
				label: "PO Created Date"
			  }),
			   search.createColumn({
				 name: "duedate",
				 join: "createdFrom",
				label: "PO Due Date"
			  }),
			  
			  search.createColumn({
				 name: "amount",
				 join: "appliedtotransaction",
				 label: "PO Line Amount"
			  }),
			  search.createColumn({
				 name: "linesequencenumber",
				 join: "appliedToTransaction",
				 label: "PO Line Number"
			  }),
			  search.createColumn({
				 name: "type",
				 join: "item",
				 label: "PO Item Type"
			  }),
			  search.createColumn({name: "createdfrom", label: "PO Transaction"}),
			  search.createColumn({
				 name: "terms",
				 join: "createdFrom",
				 label: "PO Terms"
			  }),
			  search.createColumn({
				 name: "quantity",
				 join: "appliedToTransaction",
				 label: "Purchase Transaction QTY"
			  }),
			  search.createColumn({
				 name: "rate",
				 join: "appliedtotransaction",
				 label: "PO Item Price"
			  }),
			  search.createColumn({name: "unit", label: "PO UOM"}),
			  search.createColumn({
				 name: "internalid",
				 join: "vendor",
				 label: "Vendor ID"
			  }),
			  search.createColumn({name: "custcolrvsvendorpartnumber", label: "PO Vendor Part Number"}),
			   search.createColumn({name: "internalid"})
		   ]
		});
		var revenueplan_Count = vendorbillSearchObj.run().getRange({ start: 0, end: 1000  });
		log.audit('revenueplan_Count length:==', revenueplan_Count.length);
		var flag = true;	
		if (revenueplan_Count != null && revenueplan_Count != '' && revenueplan_Count != ' ')
			{
				var completeResultSet = revenueplan_Count;
				var start = 1000;
				var last = 2000;
			}
		
        while (revenueplan_Count.length == 1000 && flag == true)
        {
			//log.debug('WHILE LOOP');
            revenueplan_Count = vendorbillSearchObj.run().getRange(start, last);
            completeResultSet = completeResultSet.concat(revenueplan_Count);
            start = parseFloat(start) + 1000;
            last = parseFloat(last) + 1000;
			//log.audit('revenueplan_Count length:==', revenueplan_Count.length);
			log.debug('start length:==', start+'==last:=='+last);
			log.debug('completeResultSet completeResultSet:==', completeResultSet.length);
			
			if(completeResultSet.length == parseInt(55698))//
			{
				flag = false;
			}
				
        }//end of  while (resultSet.length == 1000)
		revenueplan_Count = completeResultSet;
		if(revenueplan_Count.length)
         { 
			var file_contents = '';
			file_contents += 'Invoice Date'+','+'Invoice Due Date'+','+'Invoice Paid Date'+','+'Invoice Line Amount'+','+'Invoice Line Number'+','+'Vendor Invoice Number'+','+'Invoice Terms'+','+'Invoice Transaction qty'+','+'Invoice Item Rate'+','+'Invoice UOM'+','+'PO Item Number'+','+'PO Account'+','+'PO Created Date'+','+'PO Due Date'+','+'PO Line Amount'+','+'PO Line Number'+','+'PO Item Type'+','+'PO Transaction'+','+'PO Terms'+','+'Purchase Transaction QTY'+','+'PO Item Price'+','+'PO UOM'+','+'Vendor ID'+','+'PO Vendor Part Number';
			file_contents+='\n';
			for(var t_tran_recrd = i_starting_index ; t_tran_recrd <revenueplan_Count.length  ; t_tran_recrd++)//
			{
				var trandate = revenueplan_Count[t_tran_recrd].getValue({
				 name: "trandate",
				 label: "Invoice Date"
			  });
			   var invoce_paid_date = revenueplan_Count[t_tran_recrd].getValue({
				 name: "closedate",
				 label: "Invoice Paid Date"
			  });
			  var invoice_amount = revenueplan_Count[t_tran_recrd].getValue({
				 name: "debitamount",
				 label: "Invoice Line Amount"
			  });
			  var invoice_line_no = revenueplan_Count[t_tran_recrd].getValue({name: "linesequencenumber", label: "Invoice Line Number"});
			  var invoice_no = revenueplan_Count[t_tran_recrd].getValue({name: "tranid", label: "Vendor Invoice Number"});
			  var terms = revenueplan_Count[t_tran_recrd].getText({name: "terms", label: "Invoice Terms"});
			  var invoice_qty = revenueplan_Count[t_tran_recrd].getValue({name: "quantity", label: "Invoice Transaction qty"});
			  if(invoice_qty<0)
			  {
				  invoice_qty = invoice_qty*(-1);
			  }
			  var item_rate = revenueplan_Count[t_tran_recrd].getValue({name: "rate", label: "Invoice Item Rate"});
			  var invoice_uom = revenueplan_Count[t_tran_recrd].getValue({name: "unit", label: "Invoice UOM"});
			  var po_item_no = revenueplan_Count[t_tran_recrd].getText({name: "item", label: "PO Item Number"});
			  
			  var item_acc = revenueplan_Count[t_tran_recrd].getText({
				 name: "assetaccount",
				 join: "item",
				 label: "PO Account"
			  });
			  var po_created_date = revenueplan_Count[t_tran_recrd].getValue({
				 name: "trandate",
				 join: "createdFrom",
				 label: "PO Created Date"
			  });
			  var po_due_date = revenueplan_Count[t_tran_recrd].getValue({
				 name: "duedate",
				  join: "createdFrom",
				 label: "PO Due Date"
			  });
			  var po_line_Amount = revenueplan_Count[t_tran_recrd].getValue({
				 name: "amount",
				  join: "appliedtotransaction",
				 label: "PO Line Amount"
			  });
			  var po_line_no = revenueplan_Count[t_tran_recrd].getValue({
				 name: "linesequencenumber",
				 join: "appliedToTransaction",
				 label: "PO Line Number"
			  });
			
			  var po_item_type = revenueplan_Count[t_tran_recrd].getText({
				 name: "type",
				 join: "item",
				 label: "PO Item Type"
			  });
			  var po = revenueplan_Count[t_tran_recrd].getText({name: "createdfrom", label: "PO Transaction"});
				var po_terms = revenueplan_Count[t_tran_recrd].getText({
				 name: "terms",
				 join: "createdFrom",
				 label: "PO Terms"
			  });
			  var po_qty = revenueplan_Count[t_tran_recrd].getValue({
				 name: "quantity",
				 join: "appliedToTransaction",
				 label: "Purchase Transaction QTY"
			  });
			  var po_item_price = revenueplan_Count[t_tran_recrd].getValue({
				 name: "rate",
				  join: "appliedtotransaction",
				 label: "PO Item Price"
			  });
			  var po_uom = revenueplan_Count[t_tran_recrd].getValue({name: "unit", label: "PO UOM"});
			  var vendor = revenueplan_Count[t_tran_recrd].getText({
				 name: "internalid",
				 join: "vendor",
				 label: "Vendor ID"
			  });
			  var part_no = revenueplan_Count[t_tran_recrd].getValue({name: "custcolrvsvendorpartnumber", label: "PO Vendor Part Number"});
			  var vbid = revenueplan_Count[t_tran_recrd].getValue({name: "internalid"});
			  var fieldLookUp = search.lookupFields({
				type: search.Type.VENDOR_BILL,
				id: vbid,
				columns: ['duedate']
			 });
			 var due_date = fieldLookUp.duedate;
			// log.debug('due_date:===',due_date+'====invoice_no:==='+invoice_no);
			 
			 if(invoice_amount)
				invoice_amount = format.format({ value:invoice_amount, type: format.Type.CURRENCY });
			else
				invoice_amount = 0.00;
			 invoice_amount = '$'+invoice_amount;
			 
			 if(po_line_Amount)
				po_line_Amount = format.format({ value:po_line_Amount, type: format.Type.CURRENCY });
			else
				po_line_Amount = 0.00
			 po_line_Amount = '$'+po_line_Amount;
			 
			 if(po_item_price)
				po_item_price = format.format({ value:po_item_price, type: format.Type.CURRENCY });
			else
				po_item_price = 0.00
			 po_item_price = '$'+po_item_price;
			 
			var today = new Date(trandate);
			var yyyy = today.getFullYear();
			var mm = today.getMonth() + 1;
			var dd = today.getDate();
			if (dd < 10) 
			{
				dd = '0' + dd;
			}
			if (mm < 10)
			{
				mm = '0' + mm;
			}
			trandate = mm + '/' + dd + '/' + yyyy;
			
			var today_due_date = new Date(due_date);
			var yyyy_due_date = today_due_date.getFullYear();
			var mm_due_date = today_due_date.getMonth() + 1;
			var dd_due_date = today_due_date.getDate();
			if (dd_due_date < 10) 
			{
				dd_due_date = '0' + dd_due_date;
			}
			if (mm_due_date < 10)
			{
				mm_due_date = '0' + mm_due_date;
			}
			due_date = mm_due_date + '/' + dd_due_date + '/' + yyyy_due_date;
			
			var today_paid_date = new Date(invoce_paid_date);
			var yyyy_paid_date = today_paid_date.getFullYear();
			var mm_paid_date = today_paid_date.getMonth() + 1;
			var dd_paid_date = today_paid_date.getDate();
			if (dd_paid_date < 10) 
			{
				dd_paid_date = '0' + dd_paid_date;
			}
			if (mm_paid_date < 10)
			{
				mm_paid_date = '0' + mm_paid_date;
			}
			invoce_paid_date = mm_paid_date+ '/' + dd_paid_date + '/' + yyyy_paid_date;
			
			var today_created_date = new Date(po_created_date);
			var yyyy_created_date = today_created_date.getFullYear();
			var mm_created_date = today_created_date.getMonth() + 1;
			var dd_created_date = today_created_date.getDate();
			if (dd_created_date< 10) 
			{
				dd_created_date = '0' + dd_created_date;
			}
			if (mm_created_date < 10)
			{
				mm_created_date = '0' + mm_created_date;
			}
			po_created_date = mm_created_date+ '/' + dd_created_date + '/' + yyyy_created_date;
			
			var today_due_date = new Date(po_due_date);
			var yyyy_due_date = today_due_date.getFullYear();
			var mm_due_date= today_due_date.getMonth() + 1;
			var dd_due_date = today_due_date.getDate();
			if (dd_due_date< 10) 
			{
				dd_due_date = '0' + dd_due_date;
			}
			if (mm_due_date < 10)
			{
				mm_due_date = '0' + mm_due_date;
			}
			po_due_date = mm_due_date+ '/' + dd_due_date + '/' + yyyy_due_date;
			
			file_contents+='"' + trandate+ '","' + due_date + '","'+ invoce_paid_date+ '","' + invoice_amount + '","'+ invoice_line_no+ '","' + invoice_no + '","'+ terms+ '","' + invoice_qty + '","'+ item_rate+ '","' + invoice_uom + '","'+ po_item_no+ '","' + item_acc+ '","' + po_created_date +'","'+ po_due_date+ '","' + po_line_Amount +'","'+ po_line_no+ '","' + po_item_type +'","' + po+ '","' + po_terms +'","' + po_qty+ '","' + po_item_price +'","' + po_uom+ '","' + vendor +'","' + part_no+ '"';
			file_contents+='\n';
			if (runtime.getCurrentScript().getRemainingUsage() < 100) 
			{
				var fileObj = file.create({ name: 'PO_VB'+t_tran_recrd+'.csv',fileType: file.Type.CSV,contents: file_contents,folder: 50859930 }); 
				var savedId = fileObj.save();  
				log.debug('before sch savedId:==',savedId);
			
				 var scheduledScriptTask = task.create({ 
                                taskType: task.TaskType.SCHEDULED_SCRIPT,
                                scriptId: runtime.getCurrentScript().id,
                                deploymentId: runtime.getCurrentScript().deploymentId,
                                params: {
                                    'custscript_starting_index2': t_tran_recrd+1 
                                }
                            });
                var id = scheduledScriptTask.submit();
				var taskStatus = task.checkStatus({
					taskId: id
				});
				log.debug('taskStatus', taskStatus);
				
			}
			}
			var fileObj_one = file.create({ name: 'PO_VB'+t_tran_recrd+'.csv',fileType: file.Type.CSV,contents: file_contents,folder: 50859930 }); 
			var savedId1 = fileObj_one.save();  
			log.debug('after sch savedId1:==',savedId1);
		 }	
	}
	catch(e)
	{
		log.debug({ title: 'Debug', details: 'Exception:=='+ e }); 
	}
					
}//end of execute
    return {
        execute: execute
    };
    
});