// BEGIN SCRIPT DESCRIPTION BLOCK  ==================================
{
    /*
     Script Name:
     Author:
     Company:
     Date:
     Description:
     Script Modification Log:
     -- Date --			-- Modified By --				--Requested By--				-- Description --
     Below is a summary of the process controls enforced by this script file.  The control logic is described
     more fully, below, in the appropriate function headers and code blocks.
     SUITELET
     - suiteletFunction(request, response)
     SUB-FUNCTIONS
     - The following sub-functions are called by the above core functions in order to maintain code
     modularization:
     - NOT USED
     */
}
// END SCRIPT DESCRIPTION BLOCK  ====================================



// BEGIN GLOBAL VARIABLE BLOCK  =====================================
{
    //  Initialize any Global Variables, in particular, debugging variables...




}
// END GLOBAL VARIABLE BLOCK  =======================================





// BEGIN SUITELET ==================================================

function SearchCaseRecord(request, response){
    if (request.getMethod() == 'GET') {
        var form = nlapiCreateForm('Support Case Search Engine');
        var a_results_new = new Array();
        
        var KeyWord = ValidateValue(request.getParameter('custpage_doesnot'), 'str');
        nlapiLogExecution('DEBUG', 'Search results ', ' KeyWord =' + KeyWord)
        
        
        
        var KeyWord1 = ValidateValue(request.getParameter('custpage_content'), 'str');
        nlapiLogExecution('DEBUG', 'Search results ', ' KeyWord1 =' + KeyWord1)
        
        /// KeyWord1 = KeyWord1.replace(/\\/g, "\\\\");
        
        /*if(KeyWord1.search('(') || KeyWord1.search(')'))
         {
         KeyWord1.replace('(','\( ');
         KeyWord1.replace(')','\)');
         
         }*/
        ////KeyWord1  =ReplaceSplCharacter(request.getParameter('custpage_content'));  ////added on date june 17 for repacing special characters
        /////nlapiLogExecution('DEBUG', 'Search results ', ' KeyWord1=' + KeyWord1)
        
        var operator = ValidateValue(request.getParameter('custpage_productline'), 'num');
        nlapiLogExecution('DEBUG', 'Search results ', ' operator =' + operator)
        var operator1 = ValidateValue(request.getParameter('custpage_platform'), 'num');
        nlapiLogExecution('DEBUG', 'Search results ', ' operator1 =' + operator1)
        var status = ValidateValue(request.getParameter('custevent9'));
        nlapiLogExecution('DEBUG', 'Search results ', ' status =' + status)
        var status1 = ValidateValue(request.getParameter('custevent17'));
        nlapiLogExecution('DEBUG', 'Search results ', ' status1 =' + status1)
        var status2 = ValidateValue(request.getParameter('incomingmessage'));
        nlapiLogExecution('DEBUG', 'Search results ', ' status2 =' + status2)
        var status3 = ValidateValue(request.getParameter('title'));
        nlapiLogExecution('DEBUG', 'Search results ', ' status3 =' + status3)
        var sublist1 = form.addSubList('itemlist', 'list', 'Search results', 'tab1');
        var oldvalues = false;
        
        
        if (KeyWord == '' && operator == '' && status == '' && status1 == '' && status2 == '' && status3 == '') {
            oldvalues = false;
        }
        else {
            oldvalues = true;
        }
        
        var caseObj = nlapiCreateRecord('supportcase');
        
        var field1 = form.addField('custevent9', 'checkbox', 'Support Case Description');
        if (oldvalues) {
            field1.setDefaultValue(status);
        }
        else {
            field1.setDefaultValue('T');
        }
        
        field1.setLayoutType('normal', 'startcol')
        var field3 = form.addField('incomingmessage', 'checkbox', 'Message');
        //field3.setDefaultValue('T');
        if (oldvalues) {
            field3.setDefaultValue(status2);
        }
        else {
            field3.setDefaultValue('T');
        }
        field3.setLayoutType('startrow');
        
        var field5 = form.addField('custpage_content', 'text', 'Content to search : ');
        if (oldvalues) {
            field5.setDefaultValue(KeyWord1);
        }
        field5.setLayoutType('startrow');
        
        var myFld1 = caseObj.getField('custevent_productline');
        var options1 = myFld1.getSelectOptions();
        var select = form.addField('custpage_productline', 'select', 'Product line Criteria :');
        for (var i = 0; i < options1.length; i++) {
            nlapiLogExecution('DEBUG', 'Search results ', ' operator =' + operator)
            nlapiLogExecution('DEBUG', 'Search results ', ' options1[i].getId() =' + options1[i].getId())
            if ((parseInt(operator) == parseInt(options1[i].getId())) && oldvalues) {
                select.addSelectOption(options1[i].getId(), options1[i].getText(), true);
            }
            else {
                if (options1[i].getId() == 9 && (!oldvalues)) {
                    select.addSelectOption(options1[i].getId(), options1[i].getText(), true);
                }
                else {
                    select.addSelectOption(options1[i].getId(), options1[i].getText());
                }
                
            }
        }
        select.setLayoutType('startrow');
        //MOD Req: 1/18/2013 - JoeSon@Audaxium
        //	- hide field element
        select.setDisplayType('hidden');
        
        
        var myFld = caseObj.getField('custevent37');
        var options = myFld.getSelectOptions();
        var select1 = form.addField('custpage_platform', 'select', 'Platforms Criteria :');
        for (var i = 0; i < options.length; i++) {
            if (operator1 == options[i].getId() && oldvalues) {
                select1.addSelectOption(options[i].getId(), options[i].getText(), true);
            }
            else {
                select1.addSelectOption(options[i].getId(), options[i].getText());
            }
        }
        select1.setLayoutType('startrow')
        
        var field2 = form.addField('custevent17', 'checkbox', 'Resolution of Ticket');
        if (oldvalues) {
            field2.setDefaultValue(status1);
        }
        else {
            field2.setDefaultValue('T');
        }
        field2.setLayoutType('normal', 'startcol')
        
        var field4 = form.addField('title', 'checkbox', 'Brief Description');
        if (oldvalues) {
            field4.setDefaultValue(status3);
        }
        else {
            field4.setDefaultValue('T');
        }
        field4.setLayoutType('startrow');
        
        var field = form.addField('custpage_doesnot', 'text', 'Does not Content to search : ');
        if (oldvalues) {
            field.setDefaultValue(KeyWord);
        }
        field.setLayoutType('startrow');
        //Mod Req 1/18/2014
        //	- Hide the field
        field.setDisplayType('hidden');
        
        
        if (oldvalues) {
            //frist check box
            
            var a_columns = new Array();
            
            
            a_columns[0] = new nlobjSearchColumn('internalid');
            a_columns[1] = new nlobjSearchColumn('casenumber');
            a_columns[2] = new nlobjSearchColumn('title');
            a_columns[3] = new nlobjSearchColumn('company');
            // a_columns[4] = new nlobjSearchColumn('priority');
            a_columns[4] = new nlobjSearchColumn('custevent_productline');
            a_columns[5] = new nlobjSearchColumn('status');
            //a_columns[6] = new nlobjSearchColumn('assigned');
            a_columns[6] = new nlobjSearchColumn('custevent36');
            a_columns[7] = new nlobjSearchColumn('custevent5');
            a_columns[8] = new nlobjSearchColumn('custevent37');
            if (status == 'T') {
                var a_filters = new Array();
                
                if (KeyWord1 != '' && KeyWord1 != null && KeyWord1 != 'undefined' && KeyWord1 != 'NaN') {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent9', null, 'contains', KeyWord1);
                }
                if (KeyWord != '' && KeyWord != null && KeyWord != 'undefined' && KeyWord != 'NaN') {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent9', null, 'doesnotcontain', KeyWord);
                }
                if (operator != 0 && operator != 9) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent_productline', null, 'is', operator);
                }
                if (operator1 != 0 && operator1 != 1) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent37', null, 'is', operator1);
                }
                
                var searchresult = nlapiSearchRecord('supportcase', null, a_filters, a_columns);
                
                if (searchresult != null) {
                    nlapiLogExecution('DEBUG', 'Search results ', ' searchresult=' + searchresult.length)
                    for (var i_i = 0; i_i < searchresult.length; i_i++) {
                        a_results_new.push(searchresult[i_i]);
                    }
                }
                
            }
            
            
            
            //second check box
            if (status1 == 'T') {
            
                var a_filters = new Array();
                if (KeyWord1 != '' && KeyWord1 != null && KeyWord1 != 'undefined' && KeyWord1 != 'NaN') {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent17', null, 'contains', KeyWord1);
                }
                if (KeyWord != '' && KeyWord != null && KeyWord != 'undefined' && KeyWord != 'NaN') {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent17', null, 'doesnotcontain', KeyWord);
                }
                if (operator != 0 && operator != 9) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent_productline', null, 'is', operator);
                }
                if (operator1 != 0 && operator1 != 1) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent37', null, 'is', operator1);
                }
                
                var searchresult1 = nlapiSearchRecord('supportcase', null, a_filters, a_columns);
                
                if (searchresult1 != null) {
                    nlapiLogExecution('DEBUG', 'Search results ', ' searchresult =' + searchresult1.length)
                    for (var j = 0; j < searchresult1.length; j++) {
                        var flag = false;
                        if (a_results_new != null) {
                        
                            for (var k = 0; k < a_results_new.length; k++) {
                                if (a_results_new[k].getValue('internalid') == searchresult1[j].getValue('internalid')) {
                                    flag = true;
                                }
                            }
                            if (!flag) {
                                a_results_new.push(searchresult1[j]);
                            }
                        }
                        else {
                            a_results_new.push(searchresult1[j]);
                        }
                        
                        
                    }
                }
                
            }//
            //thrid check box
            if (status2 == 'T') {
            
                var a_filters = new Array();
                if (KeyWord1 != '' && KeyWord1 != null && KeyWord1 != 'undefined' && KeyWord1 != 'NaN') {
                    a_filters[a_filters.length] = new nlobjSearchFilter('message', null, 'contains', KeyWord1);
                }
                if (KeyWord != '' && KeyWord != null && KeyWord != 'undefined' && KeyWord != 'NaN') {
                    a_filters[a_filters.length] = new nlobjSearchFilter('message', null, 'doesnotcontain', KeyWord);
                }
                if (operator != 0 && operator != 9) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent_productline', null, 'is', operator);
                }
                if (operator1 != 0 && operator1 != 1) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent37', null, 'is', operator1);
                }
                
                var searchresult2 = nlapiSearchRecord('supportcase', null, a_filters, a_columns);
                
                if (searchresult2 != null) {
                    nlapiLogExecution('DEBUG', 'Search results ', ' searchresult2=' + searchresult2.length)
                    for (var j = 0; j < searchresult2.length; j++) {
                        var flag = false;
                        if (a_results_new != null) {
                        
                            for (var k = 0; k < a_results_new.length; k++) {
                                if (a_results_new[k].getValue('internalid') == searchresult2[j].getValue('internalid')) {
                                    flag = true;
                                }
                            }
                            if (!flag) {
                                a_results_new.push(searchresult2[j]);
                            }
                        }
                        else {
                            a_results_new.push(searchresult2[j]);
                        }
                        
                        
                    }
                    
                }//end search resulte 2
            }//
            //forth check box
            if (status3 == 'T') {
                var a_filters = new Array();
                if (KeyWord1 != '' && KeyWord1 != null && KeyWord1 != 'undefined' && KeyWord1 != 'NaN') {
                    a_filters[a_filters.length] = new nlobjSearchFilter('title', null, 'contains', KeyWord1);
                }
                if (KeyWord != '' && KeyWord != null && KeyWord != 'undefined' && KeyWord != 'NaN') {
                    a_filters[a_filters.length] = new nlobjSearchFilter('title', null, 'doesnotcontain', KeyWord);
                }
                if (operator != 0 && operator != 9) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent_productline', null, 'is', operator);
                }
                if (operator1 != 0 && operator1 != 1) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent37', null, 'is', operator1);
                }
                
                var searchresult3 = nlapiSearchRecord('supportcase', null, a_filters, a_columns);
                
                if (searchresult3 != null) {
                    nlapiLogExecution('DEBUG', 'Search results ', ' searchresult3=' + searchresult3.length)
                    for (var j = 0; j < searchresult3.length; j++) {
                        var flag = false;
                        if (a_results_new != null) {
                        
                            for (var k = 0; k < a_results_new.length; k++) {
                                if (a_results_new[k].getValue('internalid') == searchresult3[j].getValue('internalid')) {
                                    flag = true;
                                }
                            }
                            if (!flag) {
                                a_results_new.push(searchresult3[j]);
                            }
                        }
                        else {
                            a_results_new.push(searchresult3[j]);
                        }
                    }
                    
                }//end search resulte 3
            }//
            //if no any check box check but value select in platform or product line 
            if (status3 == 'F' && status2 == 'F' && status1 == 'F' && status == 'F') {
            
                var a_filters = new Array();
                if (operator != 0 && operator != 9) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent_productline', null, 'is', operator);
                }
                if (operator1 != 0 && operator1 != 1) {
                    a_filters[a_filters.length] = new nlobjSearchFilter('custevent37', null, 'is', operator1);
                }
                
                var searchresult4 = nlapiSearchRecord('supportcase', null, a_filters, a_columns);
                if (searchresult4 != null) {
                    for (var j = 0; j < searchresult4.length; j++) {
                        var flag = false;
                        if (a_results_new != null) {
                        
                            for (var k = 0; k < a_results_new.length; k++) {
                                if (a_results_new[k].getValue('internalid') == searchresult4[j].getValue('internalid')) {
                                    flag = true;
                                }
                            }
                            if (!flag) {
                                a_results_new.push(searchresult4[j]);
                            }
                        }
                        else {
                            a_results_new.push(searchresult4[j]);
                        }
                    }
                    
                }//end search resulte 3
            }//
            // reference a Customer saved search
            /*
             var results = nlapiSearchRecord('supportcase', 'customsearch589');
             
             for (var j = 0; j < results.length; j++) {
             a_results_new.push(results[j]);
             }//end save search*/
            if (a_results_new != null) {
                nlapiLogExecution('DEBUG', 'Search results ', ' i am sub list added function =')
                setSubList(sublist1, form, 1, a_results_new);
                a_results_new = new Array();
                a_filters = new Array();
            }
            else {
                nlapiLogExecution('DEBUG', 'Search results ', ' A_new_arry null');
            }
            
            
        }
        
        
        form.addSubmitButton('Submit');
        response.writePage(form);
        
    }//end get
    //start Post
    else {
        var KeyWord = ValidateValue(request.getParameter('custpage_content'), 'str');
        
        /////// KeyWord  =ReplaceSplCharacter(request.getParameter('custpage_content'));  ////added on date june 17 for repacing special characters
        
        var KeyWord1 = ValidateValue(request.getParameter('custpage_doesnot'), 'str')
        var operator = GetOperator(ValidateValue(request.getParameter('custpage_productline'), 'num'));
        var operator1 = GetOperator(ValidateValue(request.getParameter('custpage_platform'), 'num'));
        var status = ValidateValue(request.getParameter('custevent9'), 'str1');
        var status1 = ValidateValue(request.getParameter('custevent17'), 'str1');
        var status2 = ValidateValue(request.getParameter('incomingmessage'), 'str1');
        var status3 = ValidateValue(request.getParameter('title'), 'str1');
        var params = new Array();
        params['custpage_content'] = KeyWord;
        params['custpage_doesnot'] = KeyWord1;
        params['custpage_productline'] = operator;
        params['custpage_platform'] = operator1;
        params['custevent9'] = status;
        params['custevent17'] = status1;
        params['incomingmessage'] = status2;
        params['title'] = status3;
        
        nlapiSetRedirectURL('SUITELET', 'customscriptsutsearchcaserecord', 'customdeploy1', false, params);
    }//end else post
}

function setSubList(sublist, form, isForm, results, request, response){
    try {
    
    
        if (isForm == 1) {
        
        
        
        
            var casenumber = sublist.addField('casenumber', 'text', 'Case Number');
            casenumber.setDisplayType('inline');
            
            
            var subject = sublist.addField('company', 'select', 'Company', 'customer');
            subject.setDisplayType('inline');
            
            //var subject = sublist.addField('priority', 'select', 'Priority', 'supportcasepriority');
            // subject.setDisplayType('inline');
            var subject = sublist.addField('custevent_productline', 'select', 'Product Line', 'customlist_product_line');
            subject.setDisplayType('inline');
            
            var subject = sublist.addField('custevent36', 'select', 'Version', 'customlist148');
            subject.setDisplayType('inline');
            
            var subject = sublist.addField('custevent5', 'select', 'Bulid PTF', 'customlist_buildptfvalues');
            subject.setDisplayType('inline');
            
            var subject = sublist.addField('custevent37', 'select', 'Platform', 'customlist84');
            subject.setDisplayType('inline');
            
            var subject = sublist.addField('status', 'select', 'Status', 'supportcasestatus');
            subject.setDisplayType('inline');
            
            // var subject = sublist.addField('assigned', 'select', 'Assigned To', 'employee');
            // subject.setDisplayType('inline');
            
            var subject = sublist.addField('title', 'text', 'Subject');
            subject.setDisplayType('inline');
            
            
            for (var h = 0; h < results.length; h++) {
                var url = 'https://system.netsuite.com/app/crm/support/supportcase.nl?id=' + results[h].getValue('internalid');
                var LinkValue = '<a href=' + url + ' target=\'_blank\'>' + results[h].getValue('casenumber') + '</a>';
                sublist.setLineItemValue('casenumber', h + 1, LinkValue);
                //var demo=results[h].getValue('custevent_productline');
			    //nlapiLogExecution('DEBUG', 'In demo', 'demo ='+ demo);
                sublist.setLineItemValue('company', h + 1, results[h].getValue('company'));
                //sublist.setLineItemValue('priority', h + 1, results[h].getValue('priority'));
                sublist.setLineItemValue('custevent_productline', h + 1, results[h].getValue('custevent_productline'));
                sublist.setLineItemValue('custevent36', h + 1, results[h].getValue('custevent36'));
                sublist.setLineItemValue('custevent5', h + 1, results[h].getValue('custevent5'));
                sublist.setLineItemValue('custevent37', h + 1, results[h].getValue('custevent37'));
                sublist.setLineItemValue('status', h + 1, results[h].getValue('status'));
                // sublist.setLineItemValue('assigned', h + 1, results[h].getValue('assigned'));
                sublist.setLineItemValue('title', h + 1, results[h].getValue('title'));
                
                
                
            }
            
            
            
        }
    } 
    catch (e) {
        nlapiLogExecution('DEBUG', 'added sub list ', 'ERROR' + e);
    }
}

function GetOperator(opr){
    if (opr != null) {
        return opr;
    }
    
    return '';
}

function ValidateValue(value, opr){
    if (value != '' && value != null && value != 'undefined' && value != 'NaN') {
        return value;
    }
    if (opr == 'str1') {
        return 'F';
    }
    else 
        if (opr == 'num') {
            return 0;
        }
    return ''
}

function ReplaceSplCharacter(str){
    var patt1 = new RegExp("&");
    var flag = patt1.test(str);
    nlapiLogExecution('DEBUG', '<Before Load>', '** flag=' + flag);
    
    if (flag) {
        str = str.replace(/&/g, "&amp;")
        nlapiLogExecution('DEBUG', '<Before Load>', '** str=' + str);
    }
    return str;
}
