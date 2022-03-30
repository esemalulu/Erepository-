function entitlementList(request, response)
{    
	var id='';
	var params = request.getAllParameters();
	if(params.length > 0){
		id = request.getParameter('id');
	}

	var searchResults = new Array(); 
	var searchResults2 = new Array(); 

	var searchfilter = new Array();
	var arrSearchColumn = new Array();
	
	var searchfilter2 = new Array();
	var arrSearchColumn2 = new Array();	

	if(( id != '') && (id != null)){
		//nlapiLogExecution('ERROR','First If');
		searchfilter[0] = new nlobjSearchFilter('custentity_sugarcrm_customer_id', 'custrecord_ins_customer', 'is', id);
		arrSearchColumn[0] = new nlobjSearchColumn('custentity_sugarcrm_customer_id','custrecord_ins_customer','group');

		searchfilter2[0] = new nlobjSearchFilter('custentity_sugarcrm_customer_id', 'customer', 'is', id);
		arrSearchColumn2[0] = new nlobjSearchColumn('custentity_sugarcrm_customer_id','customer','group');

		searchResults = nlapiSearchRecord('customrecord_installbase',1213 , searchfilter, arrSearchColumn);     
		searchResults2 = nlapiSearchRecord('transaction',1242 , searchfilter2, arrSearchColumn2);
		
		if(searchResults2 == null){
			searchfilter2[0] = new nlobjSearchFilter('custentity_sugarcrm_customer_id', 'custbody_end_customer', 'is', id);
			arrSearchColumn2[0] = new nlobjSearchColumn('custentity_sugarcrm_customer_id','custbody_end_customer','group');
			searchResults2 = nlapiSearchRecord('transaction',1242 , searchfilter2, arrSearchColumn2);     
		}
	}else{
		//nlapiLogExecution('ERROR','First Else');
		searchResults = nlapiSearchRecord('customrecord_installbase',1213 , null, null);     
		searchResults2 = nlapiSearchRecord('transaction',1242 , null, null);     
	}

	var myRows = new Array();
	var counter;

	for(var i in searchResults){
		myRows[i] = new Array();
		myRows[i]['custpage_companyname'] = searchResults[i].getValue('companyname','custrecord_ins_customer','group');
		myRows[i]['custpage_end_customer'] = '';
		myRows[i]['custpage_tranid'] = searchResults[i].getValue('custrecord_ins_invoice_number',null,'group');
		myRows[i]['custpage_ins_product_family'] = searchResults[i].getText('custrecord_ins_product_family',null,'group');
		myRows[i]['custpage_ins_version'] = searchResults[i].getValue('custrecord_ins_version',null,'group');
		myRows[i]['custpage_ins_quantity'] = searchResults[i].getValue('custrecord_ins_quantity',null,'sum');
		myRows[i]['custpage_ins_quantity_type'] = searchResults[i].getText('custrecord_ins_quantity_type',null,'group');
		myRows[i]['custpage_ins_quantity_type'] = searchResults[i].getText('custrecord_ins_quantity_type',null,'group');
		myRows[i]['custpage_ins_invoice_date'] = searchResults[i].getValue('custrecord_ins_invoice_date',null,'group');
		myRows[i]['custpage_ins_description'] = searchResults[i].getValue('custrecord_ins_item_description',null,'group');

		myRows[i]['custpage_ins_request_type'] = '';
		myRows[i]['custpage_class_of_sale'] = '';
		myRows[i]['custpage_online_notes'] = '';

		counter = i;
	}

	counter = counter + 1;
	
	var srequesttype='';
	var sdealtype='';
	var myRows2 = new Array();

	for(var j in searchResults2){
		srequesttype = '';
		sdealtype = '';
		myRows2[j] = new Array();
		myRows2[j]['custpage_companyname'] = searchResults2[j].getValue('companyname','customer','group');
		myRows2[j]['custpage_end_customer'] = searchResults2[j].getValue('companyname','custbody_end_customer','group');
		myRows2[j]['custpage_tranid'] = searchResults2[j].getValue('tranid',null,'group');
		myRows2[j]['custpage_ins_product_family'] = searchResults2[j].getText('custcol_item_type',null,'group');
		myRows2[j]['custpage_ins_version'] = searchResults2[j].getValue('custitem_version','item','group');
		myRows2[j]['custpage_ins_quantity'] = searchResults2[j].getValue('quantity',null,'sum');
		myRows2[j]['custpage_ins_quantity_type'] = searchResults2[j].getText('custcol_qty_type',null,'group');
		myRows2[j]['custpage_ins_invoice_date'] = searchResults2[j].getValue('trandate',null,'group');
		myRows2[j]['custpage_ins_description'] = searchResults2[j].getValue('memo',null,'group');
		
		srequesttype = searchResults2[j].getText('custbody_online_request_type',null,'group');
		sdealtype = searchResults2[j].getText('custbody1',null,'group');
		
		/*
		if((srequesttype == null) || (srequesttype == 'null')){
			srequesttype ='';
		}
		if((sdealtype != '') || (sdealtype != null) || (sdealtype != 'null')){
			if(srequesttype != ''){
				srequesttype = srequesttype + ' ' +  sdealtype;
			}else{
				srequesttype = sdealtype;
			}
		}
		*/
		myRows2[j]['custpage_ins_request_type'] = srequesttype;
		myRows2[j]['custpage_class_of_sale'] = searchResults2[j].getText('custbody_class_of_sale',null,'group');
		myRows2[j]['custpage_online_notes'] = searchResults2[j].getValue('custbody_online_notes',null,'group');

		//counter = counter + 1;
	}

	var list = nlapiCreateList('KANA Customer License Info', false);     
	if(request.getParameter('style') != null){
		list.setStyle(request.getParameter('style'));
	}else{
		list.setStyle('grid');
	}

	list.setTitle('KANA Customer License Info');

	list.addColumn('custpage_companyname','text', 'Customer Name');     
	list.addColumn('custpage_end_customer','text', 'End Customer');     
	list.addColumn('custpage_tranid','text', 'Sales Order Num');     
	list.addColumn('custpage_ins_product_family','text', 'Product');     
	list.addColumn('custpage_ins_version','text', 'Version');     
	list.addColumn('custpage_ins_quantity','text', 'Quantity');     
	list.addColumn('custpage_ins_quantity_type','text', 'Quantity Type');     
	list.addColumn('custpage_ins_invoice_date','text', 'Date');     
	list.addColumn('custpage_ins_description','text', 'Description');     

	list.addColumn('custpage_ins_request_type','text', 'Request Type');     
	list.addColumn('custpage_class_of_sale','text', 'Class of Sale');     
	list.addColumn('custpage_online_notes','text', 'Special Instructions');     
	
	list.addRows( myRows2);
	list.addRows( myRows);  
	
	response.setHeader('Custom-Header-Kana','KANA Customer License Info');
	response.writePage( list );
}
