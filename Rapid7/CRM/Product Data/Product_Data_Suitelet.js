/**
 *
 * Module Description
 *
 * Version	1.00
 * Date		11 Jul 2013
 * Author	efagone
 * Project	${project}
 *
 * @record
 * @script
 * @link
 * @deployment
 *
 */
    /**
     * @param {nlobjRequest}
     *            request Request object
     * @param {nlobjResponse}
     *            response Response object
     * @returns {Void} Any output is written via response object
     */
function modifyProdData(request, response){

    if (request.getMethod() == 'GET') {
        this.oppId = request.getParameter('custparam_oppid');
        
        this.form = nlapiCreateForm('Product Data', true);
        form.setScript('customscriptr7productdata_suitelet_cs');
        
            // FIELD GROUPS
        form.addFieldGroup('primarygroup', 'Opportunity Details').setSingleColumn(true);
        
            // HEADER FIELDS
        form.addField('custpage_customerid', 'select', 'Customer', 'customer', 'primarygroup');
        form.getField('custpage_customerid').setDisplayType('inline');
		
        form.addField('custpage_opportunity', 'select', 'Opportunity', 'opportunity', 'primarygroup');
        form.getField('custpage_opportunity').setDisplayType('inline');
        form.getField('custpage_opportunity').setLayoutType('normal', 'startcol');
		
        form.addField('custpage_projectedtotal', 'currency', 'Projected Total', null, 'primarygroup');
        form.getField('custpage_projectedtotal').setDisplayType('inline');
        
            // SUBLIST
        var prodDataList = form.addSubList('custpage_proddatalist', 'inlineeditor', 'Product Data');
        prodDataList.addField('custpage_proddatalist_id', 'text').setDisplayType('hidden');
		
        prodDataList.addField('custpage_proddatalist_product', 'select', 'Product', '302');
		prodDataList.getField('custpage_proddatalist_product').setMandatory(true);
		
        prodDataList.addField('custpage_proddatalist_productamount', 'currency', 'Product Amount');
		prodDataList.getField('custpage_proddatalist_productamount').setMandatory(true);
        prodDataList.getField('custpage_proddatalist_productamount').setDisplayType('entry');
		prodDataList.getField('custpage_proddatalist_productamount').setDisplaySize(12);	
		
        prodDataList.addField('custpage_proddatalist_incumbent', 'select', 'Incumbent', 'competitor');
        prodDataList.addField('custpage_proddatalist_competition', 'text', 'Competition');
        prodDataList.addField('custpage_proddatalist_conclusion', 'select', 'Conclusion', '108');
        prodDataList.addField('custpage_proddatalist_lostto', 'select', 'Lost To', 'competitor');
        prodDataList.addField('custpage_proddatalist_reason', 'text', 'Win/Loss Reason');
		
       	prodDataList.addField('custpage_proddatalist_description', 'textarea', 'Description', 'competitor');
		prodDataList.getField('custpage_proddatalist_description').setDisplayType('entry');
        prodDataList.getField('custpage_proddatalist_description').setDisplaySize(150, 2);

        if (oppId != null && oppId != '') {
            var recOpportunity = nlapiLoadRecord('opportunity', oppId);
            
            form.getField('custpage_customerid').setDefaultValue(recOpportunity.getFieldValue('entity'));
            form.getField('custpage_opportunity').setDefaultValue(oppId);
                       
            populateCurrentProductList(prodDataList);
        }
        
        form.addSubmitButton('Submit');
        response.writePage(form);
        
    }
    
    if (request.getMethod() == 'POST') {
    
    }
}

function populateCurrentProductList(prodDataList){
				
    var objAllProducts = new Object();

        // Current Daya Population
    var arrFilters = [['custrecordr7competproddataopportunity', 'anyof', oppId]];
    
    var arrColumns = new Array();
    arrColumns[0] = new nlobjSearchColumn('internalid');
    arrColumns[1] = new nlobjSearchColumn('custrecordr7competproddataproduct').setSort(true);
    arrColumns[2] = new nlobjSearchColumn('custrecordr7competproddataprojtotal');
    arrColumns[3] = new nlobjSearchColumn('custrecordr7competproddataincumbent');
    arrColumns[4] = new nlobjSearchColumn('custrecordr7competproddatacompetition');
    arrColumns[5] = new nlobjSearchColumn('custrecordr7competproddataconclusion');
    arrColumns[6] = new nlobjSearchColumn('custrecordr7competproddatalostto');
    arrColumns[7] = new nlobjSearchColumn('custrecordr7competproddatareasons');
    arrColumns[8] = new nlobjSearchColumn('custrecordr7competproddatadescription');
    
    var newSearch = nlapiCreateSearch('customrecordr7competitiveproductdata');
    newSearch.setFilterExpression(arrFilters);
    newSearch.setColumns(arrColumns);
    var resultSet = newSearch.runSearch();
    
    var rowNum = 0;
    do {
        var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
        for (var rs in resultSlice) {
            var result = resultSlice[rs];
            
            var objProduct = new product();
            objProduct.recId = result.getValue(arrColumns[0]);
            objProduct.productId = result.getValue(arrColumns[1]);
            objProduct.productAmount = result.getValue(arrColumns[2]);
            objProduct.incumbent = result.getValue(arrColumns[3]);
            objProduct.competition = result.getValue(arrColumns[4]);
			objProduct.competitionText = result.getText(arrColumns[4]);
            objProduct.conclusion = result.getValue(arrColumns[5]);
            objProduct.lostto = result.getValue(arrColumns[6]);
            objProduct.reason = result.getValue(arrColumns[7]);
			objProduct.reasonText = result.getText(arrColumns[7]);
            objProduct.description = result.getValue(arrColumns[8]);
            
            objAllProducts[objProduct.productId] = objProduct;
            rowNum++;
        }
    }
    while (resultSlice.length >= 1000);
    
    var rowNum = 1;
    for (var productId in objAllProducts) {
    
        var objProduct = objAllProducts[productId];
        
        prodDataList.setLineItemValue('custpage_proddatalist_id', rowNum, objProduct.recId);
        prodDataList.setLineItemValue('custpage_proddatalist_product', rowNum, objProduct.productId);
        prodDataList.setLineItemValue('custpage_proddatalist_productamount', rowNum, objProduct.productAmount);
        prodDataList.setLineItemValue('custpage_proddatalist_incumbent', rowNum, objProduct.incumbent);
        prodDataList.setLineItemValue('custpage_proddatalist_competition', rowNum, objProduct.competitionText);
        prodDataList.setLineItemValue('custpage_proddatalist_conclusion', rowNum, objProduct.conclusion);
        prodDataList.setLineItemValue('custpage_proddatalist_lostto', rowNum, objProduct.lostTo);
        prodDataList.setLineItemValue('custpage_proddatalist_reason', rowNum, objProduct.reasonText);
        prodDataList.setLineItemValue('custpage_proddatalist_description', rowNum, objProduct.description);
        
        rowNum++;
    }
}

function product(productId){
    this.recId = '';
    this.productId = productId;
    this.productAmount = '';
    this.incumbent = '';
    this.competition = '';
	this.competitionText = '';
    this.conclusion = '';
    this.lostTo = '';
    this.reason = '';
	this.reasonText = '';
    this.description = '';
}
