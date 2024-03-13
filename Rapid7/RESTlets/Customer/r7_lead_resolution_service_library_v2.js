/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */ 
 
/*
 * SAMPLE REQUEST 
 * {
 *      'accountId': null, 
 *      'companyName' : 'Oracle Corporation', 
 *      'street' : '500 Oracle Parkway', 
 *      'city' : 'Redwood Shores', 
 *      'state' : 'CA', 
 *      'postalCode' : '94065', 
 *      'country' : 'US', 
 *      'contactId' : null, 
 *      'title' : 'CEO', 
 *      'firstName' : 'Larry', 
 *      'lastName' : 'Ellison', 
 *      'email' : 'larry@oracle.com', 
 *      'phone' : '999-999-9999', 
 *      'jobLevel' : 'CEO', 
 *      'leadScore' : '100', 
 *      'leadSource' : 45786523,
 *      'activityDate' : '2017-05-10T17:41:53Z', 
 *      'currencyIsoCode' : 'USD', 
 *      'description' : 'Security software purchase for all of oracle's offices in Redwood City', 
 *      'campaignId' : "9465585", 
 *      'leadStatus' : 'Converted', 
 *      'subject' : 'Interested in Metasploit' 
 *  }
 * 
 * 
 * EXPECTED RESPONSE: 
 * { 
 *      'id': 'entityid', 
 *      'meta':
 *      { 
 *          'href': 'https://system.netsuite.com/app/crm/calendar/task.nl?id=*{internalid}*' 
 *      },
 *      'account': 
 *      { 
 *          'id': 'entityId', 
 *          'meta': 
 *          { 
 *              'href': 'https://system.netsuite.com/app/common/entity/custjob.nl?id=*{internalid}*' 
 *          } 
 *      ,
 *      'contact': 
 *      { 
 *          'id': 'entityId', 
 *          'meta': 
 *          { 
 *              'href':'https://system.netsuite.com/app/common/entity/contact.nl?id=*{internalid}*' 
 *          } 
 *      },
 *      error: {
 *              name:'',
 *              message:''
 *      } 
 * }
 */

define([ '/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js', 'N/error', 'N/record', 'N/search','N/format','N/runtime' ],
        function(common_library, error, record, search, format, runtime) {

    var leadStatusMap = {};
    leadStatusMap['CONVERTED'] = {status:'Completed',taskDisposition:'Create New Opportunity',priority:'High'};
    leadStatusMap['OPEN_OPPORTUNITY'] = {status:'In Progress',taskDisposition:'Attach to Open Opportunity',priority:'High'};
    leadStatusMap['NURTURE'] = {status:'Completed',taskDisposition:'Close Task & Nurture Contact',priority:'Low'};
    leadStatusMap['JUNK'] = {status:'Completed',taskDisposition:'Close Task as Junk',priority:'High'};
    
    var jobLevels = null;

    function processGetRequest(request) {
        return null;
    }

    function processDeleteRequest(request) {
        return null;
    }

    function processPutRequest(request) {
        return null;
    }

    function processPostRequest(request) {
        var result = null;
        if(common_library.isNullOrEmpty(request.accountId) && 
                !common_library.isNullOrEmpty(request.contactId)){
            throw error.create({
                name: 'ERROR_UNABLE_TO_USE_EXISTING_CONTACT',
                message: 'Unable to create task for new Lead. Contact is related to another Lead.'
            });
        }
        if(isValid(request)){
            request = validateLeadAndContact(request);
            result = processLeadResolutionRequest(request);
        }
        return result;
    }
    /**
     * Check if REQUEST object lead and Contact exist in the system. If not - create new, if yes, leave as is
     * 
     * @param request - JSON request object
     * @returns request - JSON request object, modified if necessary
     */
    function validateLeadAndContact(request){
        if(!common_library.isNullOrEmpty(request.contactId)){
            try{var lRecord = record.load({type: record.Type.CONTACT, id: request.contactId, isDynamic: true});
            }catch(ex){             
             request.contactId = '';
         }
        }
        if(!common_library.isNullOrEmpty(request.accountId)){
            try{var lRecord = record.load({type: record.Type.LEAD, id: request.accountId, isDynamic: true});
            }catch(ex){
             request.accountId = '';             
         }
        }
        if(!common_library.isNullOrEmpty(request.contactId)&&common_library.isNullOrEmpty(request.accountId)){
            try{var lRecord = record.load({type: record.Type.CONTACT, id: request.contactId, isDynamic: true});
                var lRecordAccount = record.load({type: record.Type.LEAD, id: lRecord.getValue({fieldId:'company'}), isDynamic: true});
                request.accountId = lRecordAccount.id;
            }catch(ex){
                request.accountId = '';             
            }            
        }
        if(common_library.isNullOrEmpty(request.contactId)&&
           common_library.isNullOrEmpty(request.accountId)&&
           !common_library.isNullOrEmpty(request.email)){
            try{
                var lsearch = search.create({
                    type: search.Type.CONTACT,
                    filters:[
                                 ['email','is',request.email]                                 
                             ],
                    columns:[{name:'entityid'},{name:'company'}]
                });                
                lsearch.run().each(function(result){
                    var name            = result.getValue('entityid').toString();
                    var requestName      = request.firstName+' '+request.lastName; 
                    if(name===requestName){
                        request.contactId = result.id;
                        request.accountId = result.getValue('company');
                    }else{
                        request.accountId = '';
                        request.contactId = '';
                    }
                    return true;
                });
            }catch(ex){
                request.accountId = '';
                request.contactId = '';
            }
        }        
      return request;  
    }
    

    /**
     * Check if REQUEST object has all required fields
     * 
     * @param request -
     *                JSON request object
     * @returns (boolean) - TRUE if request is valid, otherwise FALSE
     */
    function isValid(request){
        var fields = [
                      'leadId',
                      'country',
                      'companyName',
                      'email',
                      'ownerId',
                      'campaignId',
                      'leadStatus',
                      'subject'
                      ];
        for(var i = 0;i<fields.length;i++){
            var key = fields[i];
            if(common_library.isNullOrEmpty(request[key])){
                throw error.create({
                    name: 'ERROR_EMPTY_FIELD',
                    message: 'Field `'+key+'` is NULL or conatins empty value.'
                });
            }
        }
        if(common_library.isNullOrEmpty(getLeadStatusMapping(request.leadStatus))){
            throw error.create({
                name: 'ERROR_INVALID_LEAD_STATUS',
                message: 'Lead Status field(leadStatus) contains unrecognized value. Please check.'
            });
        }
        return true;
    }

    
    function getLeadStatusMapping(leadStatus){
        var key = leadStatus.toUpperCase().replace(' ','_');
        return leadStatusMap[key];
    }
    
    /**
     * Performs main logic: 
     * - Checks and creates "Account" (Customer) record 
     * - Checks and creates Contact record 
     * - Creates Lead record
     * 
     * @param request
     * @returns (Object) response in predefined structure
     */
    function processLeadResolutionRequest(request){
        jobLevels = initiateJobLevels();
        var response = initiateResponse();
        var referenceIDs = {
                currency     : null,
                campaignid   : null,
                // industry : null,
                leadSourceId : null,
                subsidiary   : null
        };
        getReferencedIDs(request, referenceIDs);
        try{
            response.account.id = checkAndCreateLeadRecord(request,referenceIDs);
            log.debug({
                title: 'processLeadResolutionRequest',
                details: 'Lead ID is : '+response.account.id
            });
        }catch(errLead){
            response.error = errLead;
            return response;
        }
        response.account.meta.href+=response.account.id;
        try{
            response.contact.id = createContactRecord(request,response.account.id,referenceIDs);
        }catch(errContact){
            response.error = errContact;
            return response;
        }
        log.debug({
            title: 'processLeadResolutionRequest',
            details: 'Contact ID is : '+response.contact.id
        });
        response.contact.meta.href+=response.contact.id;
        try{
            response.id = createTaskRecord(request,response.account.id, response.contact.id, request.campaignId );
        }catch(errTask){
            response.error = errTask;
            return response;
        }
        response.meta.href+=response.id;
        return response;
    }

    function getReferencedIDs(request, referenceIDs){
        referenceIDs.currency = common_library.getValueByFieldNameAndSearchValues(record.Type.CURRENCY, 
                ['symbol'], [request.currencyIsoCode.toUpperCase()], 'internalid');
        if(common_library.isNullOrEmpty(referenceIDs.currency)){
            throw error.create({
                name:'ERROR_CURRENCY_INVALID',
                message:'Currency with ISO Code="'+request.currencyIsoCode.toUpperCase()+'" not found. Please check.'
            });
        }
       /* if(!common_library.isNullOrEmpty(request.industry)){
            referenceIDs.industry = common_library.getValueByFieldNameAndSearchValues('customlistr7rapid7industry', 
                    ['name'], [request.industry], 'internalid');
            if(common_library.isNullOrEmpty(referenceIDs.industry)){
                throw error.create({
                    name:'ERROR_INDUSTRY_INVALID',
                    message: 'Industy "'+request.industry+'" not found. Please check.'
                    });
            }
        }*/
        referenceIDs.leadSourceId = common_library.isNullOrEmpty(request.leadSource) ? 
                runtime.getCurrentScript().getParameter({name: 'custscript_r7_def_leadSource'})
                :
                common_library.getValueByFieldNameAndSearchValues(record.Type.CAMPAIGN, ['title'], [request.leadSource],'internalid');
        if(common_library.isNullOrEmpty(referenceIDs.leadSourceId)){
            throw error.create({
                name:'ERROR_LEAD_SOURCE_NOT_PROVIDED',
                message:'Lead Source not provided or not found and no default Lead Source set up. Please check.'
            });
        }
        referenceIDs.subsidiary = getSubsidiary(request.country);   
    }
    
    /**
     * Initiates new response object
     * 
     * @returns (Object)
     */
    function initiateResponse(){
        var endPoint = common_library.getSystemEndPoint();
        return {
            id: '',
            meta: {
                href: endPoint+'/app/crm/calendar/task.nl?id='
            },
            account: {
                id: '',
                meta: {
                    href: endPoint+'/app/common/entity/custjob.nl?id='
                }
            },
            contact: {
                id: '',
                meta: {
                    href: endPoint+'/app/common/entity/contact.nl?id='
                }
            },
            error: {
                name:'',
                message:''
            } 
        };
    }

    /**
     * Checks if record exists and is active
     * 
     * @param recordType
     *                (String) - name of the record type
     * @param recordName
     *                (String) - Printed name
     * @param id -
     *                (Integer) - Internal ID
     * @returns (Boolean) - TRUE if record exists and active, otherwise
     *          exceptions are thrown
     */
    function getExistingRecord(recordType,recordName,id){
        var lRecord = record.load({type: recordType, id: id, isDynamic: true});
        if(common_library.isNullOrEmpty(lRecord)){
            throw error.create({
                name : 'ERROR_INVALID_'+recordName.toUpper()+'_ID',
                message : recordName+' with specified ID does not exists. Please check.'
            });
        } 
        if(lRecord.getValue({fieldId:'isinactive'})){
            throw error.create({
                name : 'ERROR_INACTIVE_'+recordName.toUpper(),
                message : recordName+' with specified ID is not active. Please check.'
            });
        }
        return lRecord;
    }
    
    /**
     * Checks if "Account" (Lead) record already exists. If it does, then
     * returns internal ID. Otherwise, creates new Lead record based on
     * information from request:
     * 
     *      'companyName' : 'Oracle Corporation', 
     *      'street' : '500 Oracle Parkway', 
     *      'city' : 'Redwood Shores', 
     *      'state' : 'CA', 
     *      'postalCode' : '94065', 
     *      'country' : 'US', 
     *      'currencyIsoCode' : 'USD', 
     * 
     * @param request
     * @returns (integer) - internal ID of Customer record
     */
    function checkAndCreateLeadRecord(request, referenceIDs){
        var leadId;
        var lead;
        var recordId
        if(!common_library.isNullOrEmpty(request.accountId)){
            lead = getExistingRecord(record.Type.LEAD, 'Account', request.accountId);
            if (!common_library.isNullOrEmpty(lead.getValue('salesrep'))){
            leadId = lead.id;
            }else {
                try{
                    lead.setValue({
                        fieldId: 'salesrep',
                        value: request.ownerId
                    });
                    recordId = lead.save();
                }catch(ex){
                    var filter = search.createFilter({name:'entityid',operator: search.Operator.IS, values:'Swofford, Caitlin'});
                    var salesRepSearch = search.create({
                    type: search.Type.EMPLOYEE,
                    filters:filter,
                    columns:[{name:'entityid'}]
                    });
                    var salesRep;
                    salesRepSearch.run().each(function(result){
                        salesRep = result.id;                    
                    }); 
                    lead.setValue({
                        fieldId: 'salesrep',
                        value: salesRep
                    });
                    recordId = lead.save();
                }
                leadId = lead.id;
            }
        }else{
            leadId = createLeadRecord(request, referenceIDs);
        }
        return leadId;
    }
    
    /**
     * Checks if Lead with requested Company Name already exists and if it is,
     * then returns Company Name concatenated with leadId from SalesForce,
     * otherwise returns Company Name
     */
    function checkAndGetCompanyName(request){
        var firstCompanyName = request.companyName;
        var secondCompanyName = request.companyName+' '+request.leadId;
        if(secondCompanyName.length>32){
            secondCompanyName = secondCompanyName.substr(0,32);
        }
        var firstCompanyNameFound = false;
        var secondCompanyNameFound = false;
        
        var lsearch = search.create({
            type: search.Type.CUSTOMER,
            filters:[
                     ['entityid','is',firstCompanyName],
                     'or',
                     ['entityid','is',secondCompanyName]
                 ],
            columns:[{name:'entityid'}]
        });
        var searchResult = lsearch.run();        
        
            var resultSlice = searchResult.getRange({
                start : 0,
                end : 1000
            });

            if ((!common_library.isNullOrEmpty(resultSlice)) && resultSlice.length > 0) {
                for ( var i in resultSlice) {
                    var name = resultSlice[i].getValue('entityid').toString();
                    if(name==firstCompanyName){
                        firstCompanyNameFound = true;
                    }
                    if(name==secondCompanyName){
                        secondCompanyNameFound = true;
                    }
                    if(firstCompanyNameFound && secondCompanyNameFound){
                        break;
                    }   
                }
            }
        if(firstCompanyNameFound && secondCompanyNameFound){
            throw error.create({
                name : 'ERROR_LEAD_ALREADY_EXISTS',
                message : 'Leads with specified Name and Name + Lead ID already exists. Please check.'
            });
        }
        return firstCompanyNameFound ? secondCompanyName : firstCompanyName;
    }
    
    function checkAndGetContactName(request, company){
        var secondNameToReturn = request.lastName+' '+request.leadId;
        if(secondNameToReturn.length>32){
            secondNameToReturn = secondNameToReturn.substr(0,32);
        }
        var firstContactName = request.firstName+' '+request.lastName;
        var secondContactName = request.firstName+' '+secondNameToReturn;
        var firstNameToReturn = request.lastName;
        var lsearch = search.create({
            type: search.Type.CONTACT,
            filters:[
                         ['entityid','is',firstContactName],
                         'or',
                         ['entityid','is',secondContactName]
                     ],
            columns:[{name:'entityid'}]
        });
        var firstContactNameFound = false;
        var secondCContactNameFound = false;
        lsearch.run().each(function(result){
            var name = result.getValue('entityid').toString();
            if(name==firstContactName){
                firstContactNameFound = true;
            }
            if(name==secondContactName){
                secondCContactNameFound = true;
            }
            return true;
        });
        if(firstContactNameFound && secondCContactNameFound){
            throw error.create({
                name : 'ERROR_CONTACT_ALREADY_EXISTS',
                message : 'Contact with specified First and Second Name and First and Second Name + Lead ID already exists. Please check.'
            });
        }
        return firstContactNameFound ? secondNameToReturn : firstNameToReturn;
    }
    
    /**
     * Performs Real Lead record creation
     * @param request
     * @returns {Integer}
     */
    function createLeadRecord(request, referenceIDs){
        var leadId;
        var lead;
        var companyName = checkAndGetCompanyName(request);
        var now = new Date();
        lead = record.create({type:record.Type.LEAD,isDynamic:true});
        lead.setValue({fieldId:'companyname', value:companyName});
        lead.setText({fieldId:'entitystatus',text:'LEAD-1 - Marketing Qualified'});
        lead.setValue({fieldId:'currency',value:referenceIDs.currency});
        lead.setValue({fieldId:'leadsource',value:request.campaignId});
        lead.setValue({fieldId:'email',value:request.email});
        lead.setValue({fieldId:'phone',value:request.phone});
        lead.setValue({fieldId:'custentityr7autoscrubdateprocessed',value:now});
        lead.setValue({fieldId:'subsidiary',value:referenceIDs.subsidiary});
       /* if(!common_library.isNullOrEmpty(referenceIDs.industry)){
            lead.setValue({fieldId:'custentityr7rapid7industry',value:referenceIDs.industry});
        }*/
        if(!common_library.isNullOrEmpty(request.dunsNumber)){
            lead.setValue({fieldId:'custentityr7dunsnumber',value:request.dunsNumber});
        }
        lead.selectNewLine({sublistId: 'addressbook'});
        addAddressToLead(lead, request);
        leadId = lead.save();
        return leadId;        
    }

    /**
     * Add new address line to Account(Customer) record
     * @param account
     * @param request
     * @returns
     */
    function addAddressToLead(lead,request){
        var address = lead.getCurrentSublistSubrecord({sublistId: 'addressbook', fieldId: 'addressbookaddress'});
        address.setValue({fieldId: 'country', value: request.country});
        address.setValue({fieldId: 'addr1', value: request.street});
        address.setValue({fieldId: 'city', value: request.city});
        address.setValue({fieldId: 'zip', value: request.postalCode});
        address.setValue({fieldId: 'state', value: request.state});
        lead.commitLine({sublistId: 'addressbook'});
    }
    
    /**
     * Checks is Contact record already exists and if it is, then returns its
     * internal ID, otherwise creates new Contact record based on information
     * from request:
     * 
     *      'title' : 'CEO', 
     *      'firstName' : 'Larry', 
     *      'lastName' : 'Ellison', 
     *      'email' : 'larry@oracle.com', 
     *      'phone' : '999-999-9999', 
     *      'jobLevel' : 'CEO', 
     * 
     * 
     * @param request
     * @returns (integer) - internal ID of Contact record
     */
    function createContactRecord(request, company, referenceIDs){
        var contactId;
        var contact;
        var now = new Date();
        if(!common_library.isNullOrEmpty(request.contactId)){ 
            contact = getExistingRecord(record.Type.CONTACT, 'Contact', request.contactId);
            var leadId = contact.getValue({fieldId:'company'});
            if(!common_library.isNullOrEmpty(request.accountId) && leadId != request.accountId){
                throw error.create({
                    name:'ERROR_CONTACT_NOT_FROM_COMPANY',
                    message:'Contact not related to company. Please check.'
                });
            }
            contactId = contact.id;
        }else{
            contact = record.create({
                    type:record.Type.CONTACT,
                    isDynamic:true
                });
            contact.setValue({fieldId:'title',value:request.title});
            contact.setValue({fieldId:'company',value:company});
            contact.setValue({fieldId:'firstname',value:request.firstName});
            var lastname = checkAndGetContactName(request, company);
            contact.setValue({fieldId:'lastname',value:lastname});
            contact.setValue({fieldId:'subsidiary',value:referenceIDs.subsidiary});
            contact.setValue({fieldId:'email',value:request.email});
            contact.setValue({fieldId:'phone',value:request.phone});
            contact.setValue({fieldId:'contactsource',value:request.campaignId});
            contact.setValue({fieldId:'custentityr7autoscrubdateprocessed',value:now});
            var jobLevel = getJobLevel(request.jobLevel);
            if(!common_library.isNullOrEmpty(jobLevel)){
                contact.setValue({fieldId:'custentityr7contactjoblevel',value:jobLevel});
            }else{
                log.audit({
                    title: 'createContactRecord',
                    details: 'WARNING: Job Level "'+request.jobLevel+'" not found.'
                    });
            }
            contact.setValue({fieldId:'custentityr7inferscore',value:request.leadScore});               
            contactId = contact.save();
        }
        return contactId;
    } 

    
    
    /**
     * Creates Lead Record based on Customer ID, Contact ID and other info from request:
     * 
     *      'leadScore' : '100', 
     *      'activityDate' : '2017-05-10T17:41:53Z', 
     *      'currencyIsoCode' : 'USD', 
     *      'description' : 'Security software purchase for all of oracle's offices in Redwood City', 
     *      'campaignId' : 'Freemium', 
     *      'leadStatus' : 'Converted', 
     *      'subject' : 'Interested in Metasploit' 
     * 
     * 
     * @param request
     * @param accountId
     * @param contactId
     * @returns (integer) - internal ID of Lead record
     */
    function createTaskRecord(request, leadId, contactId, campaignid ){
        var leadStatusMapping =  getLeadStatusMapping(request.leadStatus);
        var task = record.create({type:record.Type.TASK,isDynamic:true});
        task.setValue({fieldId:'company',value:leadId});
        task.setValue({fieldId:'contact',value:contactId});
        task.setValue({fieldId:'title',value:request.subject});
        task.setValue({fieldId:'assigned',value:request.ownerId});
        task.setValue({fieldId:'custeventr7taskleadsource',value:campaignid});
        task.setText({fieldId:'status',text: leadStatusMapping.status });
        if(leadStatusMapping.status==='Completed'){
            var now = new Date();
            task.setValue({fieldId:'completeddate',value:now});
        }
        task.setText({fieldId:'priority',text: leadStatusMapping.priority });
        task.setText({fieldId:'custeventr7taskdisposition',text: leadStatusMapping.taskDisposition });
        var completedDate = formatDate(request.activityDate);
        task.setValue({fieldId:'duedate', value: completedDate});
        task.setValue({fieldId:'message',value:request.description});
        if (request.leadStatus.toUpperCase()==='CONVERTED'||request.leadStatus.toUpperCase()==='OPEN OPPORTUNITY'){
            var taskStage = common_library.getValueByFieldNameAndSearchValues('customlistzco_taskprofile_stage', 
                    ['name'], ['1-Marketing Qualified'], 'internalid');
            task.setValue({fieldId:'custeventzco_task_stage',value:taskStage});           
        }
        return task.save();
    }

    /**
     * Convert date from SFDC to NS
     * @param theDate
     * @returns
     */
    function formatDate(theDate){
        var dateTime = theDate.split('T'); // split date from time
        var dateComponent = dateTime[0].split('-'); // break date into year, month day
        var year = dateComponent[0];
        var month = dateComponent[1];
        var date = dateComponent[2];

        var date_signed =  month +'/'+date+'/'+year;
        return format.parse({
            value: date_signed,
            type: format.Type.DATE
        });         
    }
    
    function initiateJobLevels(){
        var jobLevels = {};
        var lsearch = search.create({
            type : 'customlistr7contactjoblevel',
            columns:['name']
        });
        
        lsearch.run().each(function(result){
            jobLevels[result.getValue('name').toUpperCase().replace(' ','_').replace('/','_')] = result.id;
            return true;
        });
        return jobLevels;
     }
    
    function getJobLevel(jobLevel){
        return common_library.isNullOrEmpty(jobLevel)?'':jobLevels[jobLevel.toUpperCase().replace(' ','_').replace('/','_')];
    }

    /**
     * Compute subsidiary based on Country
     * @param country
     * @returns
     */
    function getSubsidiary(country){
        return country==='US'?1:10;
    }
    
    return {
        get : processGetRequest,
        put : processPutRequest,
        post : processPostRequest,
        delete : processDeleteRequest
    }
});
