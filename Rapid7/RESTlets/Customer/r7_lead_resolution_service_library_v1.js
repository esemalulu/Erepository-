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
 *      'activityDate' : '2017-05-10T17:41:53Z', 
 *      'currencyIsoCode' : 'USD', 
 *      'description' : 'Security software purchase for all of oracle's offices in Redwood City', 
 *      'campaignId' : 'Freemium', 
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
 *      } 
 * }
 */

define([ '/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js', 'N/error', 'N/record', 'N/search','N/format' ],
        function(common_library, error, record, search, format) {

    var leadStatusMap = {};
    leadStatusMap['CONVERTED'] = {status:'In Progress',taskDisposition:'Create New Opportunity',priority:'High'};
    leadStatusMap['OPEN_OPPORTUNITY'] = {status:'In Progress',taskDisposition:'Attach to Open Opportunity',priority:'High'};
    leadStatusMap['NURTURE'] = {status:'Completed',taskDisposition:'Close Task & Nurture Contact',priority:'Low'};
    leadStatusMap['JUNK'] = {status:'Completed',taskDisposition:'Close Task as Junk',priority:'High'};


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
                message: 'Unable to create task for new Lead and already existing Contact related to another Lead. Please check.'
            });
        }
        if(isValid(request)){
            result = proceedWithPost(request);
        }
        return result;
    }

    /**
     * Check if REQUEST object contains all required fields filled in
     * 
     * @param request -
     *                JSON request objec
     * @returns (boolean) - TRUE if request is valid, otherwise FALSE
     */
    function isValid(request){
        var fields = [
                      'leadId',
                      'companyName',
                      'street',
                      'city',
                      'state',
                      'postalCode',
                      'country',
                      'title',
                      'firstName',
                      'lastName',
                      'email',
                      'phone',
                      'jobLevel',
                      'leadScore',
                      'activityDate',
                      'currencyIsoCode',
                      'description',
                      'campaignId',
                      'leadStatus',
                      'subject'
                      ];
        for(var i = 0;i<fields.length;i++){
            var key = fields[i];
            if(common_library.isNullOrEmpty(request[key])){
                throw error.create({
                    name: 'ERROR_EMPTY_FIELD',
                    message: 'Field `'+key+'` is NULL or conatins empty value. Please check.'
                });
            }
        }
        if(common_library.isNullOrEmpty(getLeadStatusMapping(request.leadStatus))){
            throw error.create({
                name: 'ERROR_INVALID_LEAD_STATUS',
                message: 'Lead Status field(leadStatus) contains unrecognized value. Please check'
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
    function proceedWithPost(request){
        var response = initiateResponse();
        response.account.id = createLeadRecord(request);
        log.debug({
            title: 'proceedWithPost',
            details: 'Lead ID is : '+response.account.id
            });
        response.account.meta.href+=response.account.id;
        response.contact.id = createContactRecord(request,response.account.id);
        log.debug({
            title: 'proceedWithPost',
            details: 'Contact ID is : '+response.contact.id
            });
        response.contact.meta.href+=response.contact.id;
        response.id = createTaskRecord(request,response.account.id, response.contact.id);
        response.meta.href+=response.id;
        return response;
    }

    /**
     * Initiates new response object
     * 
     * @returns (Object)
     */
    function initiateResponse(){
        var endPoint = common_library.getSystemEndPoint();
        return {
            id: 'entityid',
            meta: {
                href: endPoint+'/app/crm/calendar/task.nl?id='
            },
            account: {
                id: 'entityId',
                meta: {
                    href: endPoint+'/app/common/entity/custjob.nl?id='
                }
            },
            contact: {
                id: 'entityId',
                meta: {
                    href: endPoint+'/app/common/entity/contact.nl?id='
                }
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
     * Checks is "Account" (Lead) record already exists and if it is, then
     * returns its internal ID, otherwise creates new Customer record based on
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
    function createLeadRecord(request){
        var leadId;
        var lead;
        if(!common_library.isNullOrEmpty(request.accountId)){
            lead = getExistingRecord(record.Type.LEAD, 'Account', request.accountId);
            leadId = lead.id;
        }else{
            leadId = doRealLeadCreate(request);
        }
        return leadId;
    }
    
    /**
     * Performs Real Lead record creation
     * @param request
     * @returns
     */
    function doRealLeadCreate(request){
        var leadId;
        var lead;
        var currency = common_library.getValueByFieldNameAndSearchValues(record.Type.CURRENCY, 
                ['symbol'], [request.currencyIsoCode.toUpperCase()], 'internalid');
        if(common_library.isNullOrEmpty(currency)){
            throw error.create({
                name:'ERROR_CURRENCY_INVALID',
                message:'Currency with ISO Code="'+request.currencyIsoCode.toUpperCase()+'" not found. Please check.'
            });
        }
        var campaign = getExistingRecord(record.Type.CAMPAIGN, 'Campaign', request.campaignId);
        if(common_library.isNullOrEmpty(campaign)){
            throw error.create({
                name:'ERROR_CAMPAIGN_ID_INVALID',
                message:'Campaign(campaignId) not found. Please check.'
            });
        }
        var industry = null;
        if(!common_library.isNullOrEmpty(request.industry)){
            industry = common_library.getValueByFieldNameAndSearchValues('customlistr7rapid7industry', 
                    ['name'], [request.industry], 'internalid');
            if(common_library.isNullOrEmpty(industry)){
                throw error.create({
                    name:'ERROR_INDUSTRY_INVALID',
                    message: 'Industy "'+request.industry+'" not found. Please check.'
                    });
            }
        }
        lead = record.create({type:record.Type.LEAD,isDynamic:true});
        lead.setValue({fieldId:'companyname', value:request.companyName+' '+request.leadId});
        lead.setText({fieldId:'entitystatus',text:'LEAD-1 - Marketing Qualified'});
        lead.setValue({fieldId:'currency',value:currency});
        lead.setValue({fieldId:'leadsource',value:campaign.id});
        lead.setValue({fieldId:'subsidiary',value:getSubsidiary(request.country)});
        if(!common_library.isNullOrEmpty(industry)){
            lead.setValue({fieldId:'custentityr7rapid7industry',value:industry});
        }
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
    function createContactRecord(request, company){
        var contactId;
        var contact;
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
            contact.setValue({fieldId:'lastname',value:request.lastName});
            contact.setValue({fieldId:'email',value:request.email});
            contact.setValue({fieldId:'phone',value:request.phone});
            var jobLevel = common_library.getValueByFieldNameAndSearchValues('customlistr7contactjoblevel', 
                    ['name'], [request.jobLevel], 'internalid');
            if(!common_library.isNullOrEmpty(jobLevel)){
                contact.setValue({fieldId:'custentityr7contactjoblevel',value:jobLevel});
            }else{
                log.audit({
                    title: 'createContactRecord',
                    details: 'WARNING: Job Level "'+request.jobLevel+'" not found.'
                    });
            }
            contact.setValue({fieldId:'custentityr7inferscore',value:request.leadScore});               
            contact.setValue({fieldId:'subsidiary',value:getSubsidiary(request.country)});
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
    function createTaskRecord(request, leadId, contactId){
        var leadStatusMapping =  getLeadStatusMapping(request.leadStatus);
        var task = record.create({type:record.Type.TASK,isDynamic:true});
        task.setValue({fieldId:'company',value:leadId});
        task.setValue({fieldId:'contact',value:contactId});
        task.setValue({fieldId:'title',value:request.subject});
        task.setValue({fieldId:'assigned',value:request.ownerId});
        task.setText({fieldId:'status',text: leadStatusMapping.status });
        task.setText({fieldId:'priority',text: leadStatusMapping.priority });
        task.setText({fieldId:'custeventr7taskdisposition',text: leadStatusMapping.taskDisposition });
        var completedDate = formatDate(request.activityDate);
        task.setValue({fieldId:'duedate', value: completedDate});
        task.setValue({fieldId:'message',value:request.description});
        if (request.leadStatus.toUpperCase()==='CONVERTED'||request.leadStatus.toUpperCase()==='CONVERTED - OPPORTUNITY'){
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

    /**
     * Compute subsidiary based on Country
     * @param country
     * @returns
     */
    function getSubsidiary(country){
        return country==='US'?10:1;
    }
    
    return {
        get : processGetRequest,
        put : processPutRequest,
        post : processPostRequest,
        delete : processDeleteRequest
    }
});
