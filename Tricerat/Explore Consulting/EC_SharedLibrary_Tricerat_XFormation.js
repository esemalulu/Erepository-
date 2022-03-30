/**
 * Created by scurry on 12/18/2015.
 */
if (typeof EC == "undefined" || !EC)
{
    var EC = {};
}

if (typeof EC.XFormation == "undefined" || !EC.XFormation)
{
    EC.XFormation = {};
}

EC.Settings =
{
    OrderType: {
        ContractNew: "1",
        ContractUpsell: "3",
        ContractRenewal: "2",
        ContractDownsell: "13"
    }
};

EC.XFormation.userName = 'integration@tricerat.com';
EC.XFormation.password = 'a1AhedVg46AVZqQ';
EC.XFormation.URL = 'https://license.x-formation.com/soap/type/vendor/version/2';
EC.XFormation.token = null;

EC.processXFormationFulfillment = function(ifRecord, soRecord)
{
    EC.enableLazySearch();

    var logContext = 'EC.processXFormationFulfillment: ifInternalID: ' + ifRecord.getId() + ', soInternalID: ' + soRecord.getId() + 'entity: ' + soRecord.entity;
    Log.d(logContext, 'Start');
    // On creation of IF
    //   Determine if SO is a new order or renewal
    //   IF new order
    //     Search x-formation for customer by NetSuite InternalID.  If not found create.
    //     Create x-formation License Orders
    //     Create NetSuite License custom records

    if(soRecord.custbody_order_type == EC.Settings.OrderType.ContractNew || soRecord.custbody_order_type == EC.Settings.OrderType.ContractRenewal) // remove ContractRenewal
    {
        var xFormationCustomerID = null;
        var getCustomerResponse = EC.XFormation.findCustomerByCustomTag('netsuite_id', soRecord.entity, 0);
        var code = getCustomerResponse.getCode();
        var body = getCustomerResponse.getBody();
        Log.d(logContext, 'code: ' + code + ', body: ' + body);

        var xFormationCustomerID = EC.XFormation.getResponseNodeValue(body, 'result_array/item[1]/id');
        Log.d(logContext, 'xFormationCustomerID: ' + xFormationCustomerID);

        if(!xFormationCustomerID)
        {
            var customerRecord = nsdal.loadObject('customer', soRecord.entity, ['companyname', 'firstname', 'lastname','phone'])
                .withSublist('addressbook', ['addr1','city','state','country','zip','defaultbilling','defaultshipping']);

            var addCustomerResponse = EC.XFormation.addCustomer(customerRecord);

            getCustomerResponse = EC.XFormation.findCustomerByCustomTag('netsuite_id', soRecord.entity, 0);
            code = getCustomerResponse.getCode();
            body = getCustomerResponse.getBody();
            Log.d(logContext, 'code: ' + code + ', body: ' + body);

            xFormationCustomerID = EC.XFormation.getResponseNodeValue(body, 'result_array/item[1]/id');
            Log.d(logContext, 'xFormationCustomerID: ' + xFormationCustomerID);
        }

        //
        // Create XFormation License Orders
        //
        _.forEach(ifRecord.item, function(i){
            // IF item is an X-Formation item
            //   Determine the Product Template ID
            //   Add the LicenseOrder
            var itemSearchResult = EC.createSearch('item'
                ,[
                    ['internalid', 'anyof', i.item]
                ]
                ,[['itemid'],['custitem_xformationitem'],['displayname']]
            ).nsSearchResult2obj().first();
            Log.d(logContext, 'itemSearchResult:' + JSON.stringify(itemSearchResult));

            var isXFormationItem = itemSearchResult.custitem_xformationitem == 'T' ? true : false;
            if(isXFormationItem || !isXFormationItem)
            {
                var productTemplateID = EC.XFormation.getProductTemplateID(itemSearchResult);
                var addLicenseOrderResponse = EC.XFormation.addLicenseOrder(xFormationCustomerID, i, productTemplateID);
                code = addLicenseOrderResponse.getCode();
                body = addLicenseOrderResponse.getBody();
                Log.d(logContext, 'addLicenseOrderResponse code: ' + code + ', addLicenseOrderResponse body: ' + body);
            }
        });
    }
};

//
// XFormation SOAP Element objects
//
EC.XFormation.CustomerElement = function()
{
    this.id = undefined;
    this.name = undefined;
    this.street = undefined;
    this.zipCode = undefined;
    this.city = undefined;
    this.state = undefined;
    this.country = undefined;
    this.phoneNumber = undefined;
    this.faxNumber = undefined;
    this.vatNumber = undefined;
    this.contacts = {
        item:[]
    };
    this.customTags = {
        item:[]
    };
};

EC.XFormation.AddCustomerElement = function()
{
    this.header = undefined;
    this.body = {
        addCustomer:{
            token: undefined,
            customer: undefined
        }
    };
};

EC.XFormation.LicenseOrderElement = function()
{
    this.customerId = undefined;
    this.productTemplateId = undefined;
    this.activationKey = undefined;
    this.creationTime = undefined;
    this.licenseType = undefined;
    this.licenseeType = undefined;
    this.licensee = undefined;
    this.hostidMatchRate = undefined;
    this.minHostids = undefined;
    this.activatedLicensesCount = undefined;
    this.enabled = undefined;
    this.description = undefined;
    this.settingsDescription = undefined;
    this.removal = undefined;
    this.removalRequestTime = undefined;
    this.removalConfirmationTime = undefined;
    this.deactivationsAllowed = undefined;
    this.deactivationsLeft = undefined;
    this.hostids = {
        item:[]
    };
    this.features = {
        item:[]
    };
};

EC.XFormation.AddLicenseOrderElement = function()
{
    this.header = undefined;
    this.body = {
        addLicenseOrder:{
            token: undefined,
            licenseOrder: undefined
        }
    };
};

EC.XFormation.getToken = function()
{
    var retVal = EC.XFormation.token;

    if(!retVal)
    {
        Log.d('EC.XFormation.getToken', 'token is null.  Calling login.');

        retVal = EC.XFormation.token = EC.XFormation.login();
        Log.d('EC.XFormation.getToken', 'retVal: ' + retVal + ', EC.XFormation.token: ' + EC.XFormation.token);
    }
    return retVal;
};

EC.XFormation.getProductTemplateID = function(itemSearchResult)
{
    var retVal = null;

    retVal = '1901';

    return retVal;
};

EC.XFormation.getResponseNodeValue = function(rawXMLResponse, nodeName)
{
    var retVal = null;

    var xmlDoc = nlapiStringToXML(rawXMLResponse);
    var resultCodeNode = nlapiSelectNode(xmlDoc, '//' + nodeName);
    if(resultCodeNode)
    {
        retVal = resultCodeNode.firstChild.nodeValue;
    }

    return retVal;
};

EC.XFormation.getResponseNode = function(rawXMLResponse, nodeName)
{
    var retVal = null;

    var xmlDoc = nlapiStringToXML(rawXMLResponse);
    retVal = nlapiSelectNode(xmlDoc, '//' + nodeName);

    return retVal;
};

EC.XFormation.login = function()
{
    var retVal = null;
    var loginBody = '<ns:Login><username>' + EC.XFormation.userName + '</username><password>' + EC.XFormation.password + '</password></ns:Login>';
    var loginSoapRequest = EC.XFormation.getSOAPRequest(loginBody);
    var response = nlapiRequestURL(EC.XFormation.URL, loginSoapRequest);
    var code = response.getCode();
    var body = response.getBody();

    Log.d('login', 'code: ' + code + ', body: ' + body);
    var bodyJSON = EC.xmlToJson(EC.XFormation.loginResponse, body);
    Log.d('login', 'bodyJSON: ' + JSON.stringify(bodyJSON));

    retVal = bodyJSON.value.body.loginResponse._return.token;
    Log.d('login', 'token: ' + retVal);

    return retVal;

};


EC.XFormation.getProductList = function(offset)
{
    var retVal = null;

    var soapBody = '<ns:GetProductList><token>' + EC.XFormation.getToken() + '</token><offset>' + offset + '</offset></ns:GetProductList>';
    var soapRequest = EC.XFormation.getSOAPRequest(soapBody);
    Log.d('getProductList', 'soapRequest: ' + soapRequest);
    retVal = nlapiRequestURL(EC.XFormation.URL, soapRequest);

    return retVal;
};

EC.XFormation.getLicenseOrderTemplate = function(productTemplateID)
{
    var retVal = null;

    var soapBody = '<ns:GetLicenseOrderTemplate><token>' + EC.XFormation.getToken() + '</token><productTemplateId>' + productTemplateID + '</productTemplateId></ns:GetLicenseOrderTemplate>';
    var soapRequest = EC.XFormation.getSOAPRequest(soapBody);
    Log.d('getLicenseOrderTemplate', 'soapRequest: ' + soapRequest);
    retVal = nlapiRequestURL(EC.XFormation.URL, soapRequest);

    return retVal;
};

EC.XFormation.customerExists = function(internalID)
{
    var retVal = false;

    var getCustomerResponse = EC.XFormation.findCustomerByCustomTag('netsuite_id', internalID, 0);
    Log.d('EC.XFormation.customerExists', 'code: ' + getCustomerResponse.getCode() + ', body: ' + getCustomerResponse.getBody());

    var resultArray = EC.XFormation.getResponseNode(getCustomerResponse.getBody(), 'result_array');
    if(resultArray)
    {
        if(resultArray.hasChildNodes())
        {
            retVal = true;
        }
    }

    return retVal;
};

EC.XFormation.findCustomerByCustomTag = function(tagName, tagValue, offset)
{
    var retVal = null;

    var soapBody = '<ns:FindCustomerByCustomTag><token>' + EC.XFormation.getToken() + '</token><name>' + tagName + '</name><value>' + tagValue + '</value><offset>' + offset + '</offset></ns:FindCustomerByCustomTag>';
    var soapRequest = EC.XFormation.getSOAPRequest(soapBody);
    retVal = nlapiRequestURL(EC.XFormation.URL, soapRequest);

    return retVal;
};

EC.XFormation.findLicenseOrderByActivationKey = function(activationKey, offset)
{
    var retVal = null;

    var soapBody = '<ns:FindLicenseOrderByActivationKey><token>' + EC.XFormation.getToken() + '</token><activationKey>' + activationKey + '</activationKey><offset>' + offset + '</offset></ns:FindLicenseOrderByActivationKey>';
    var soapRequest = EC.XFormation.getSOAPRequest(soapBody);
    retVal = nlapiRequestURL(EC.XFormation.URL, soapRequest);

    return retVal;
};


EC.XFormation.addLicenseOrder = function(customerID, lineItem, productTemplateID)
{
    var retVal = null;
    var logContext = 'EC.XFormation.addLicenseOrder';
    Log.d(logContext, 'Start');

    var addLicenseOrderSOAPName =
    {
        "localPart":"Envelope",
        "namespaceURI":"http://schemas.xmlsoap.org/soap/envelope/",
        "prefix":"soapenv",
        "key":"{http://schemas.xmlsoap.org/soap/envelope/}Envelope",
        "string":"{http://schemas.xmlsoap.org/soap/envelope/}soapenv:Envelope"
    };

    var licenseOrder = new EC.XFormation.LicenseOrderElement();
    licenseOrder.customerId = customerID;
    licenseOrder.productTemplateId = productTemplateID;
    //licenseOrder.activationKey = undefined;
    //licenseOrder.creationTime = undefined;
    licenseOrder.licenseType = 'local';
    licenseOrder.licenseeType = 'customer';
    //licenseOrder.licensee = undefined;
    licenseOrder.hostidMatchRate = 100;
    licenseOrder.minHostids = 1;
    //licenseOrder.activatedLicensesCount = undefined;
    licenseOrder.enabled = true;
    licenseOrder.description = 'Test Description';
    //licenseOrder.settingsDescription = undefined;
    licenseOrder.removal = false;
    //licenseOrder.removalRequestTime = undefined;
    //licenseOrder.removalConfirmationTime = undefined;
    //licenseOrder.deactivationsAllowed = undefined;
    //licenseOrder.deactivationsLeft = undefined;
    licenseOrder.hostids.item.push({name:'Ethernet', minAmount:1, maxAmount:1});
    licenseOrder.features.item.push({name:'sdv6', version:'2016.0121',expirationType:'fixed',expirationDate:'2016-01-21',issuedType:'not_issued',maintenanceType:'no_maintenance',enabled:true});

    var addLicenseOrderSOAPValue = new EC.XFormation.AddLicenseOrderElement();
    addLicenseOrderSOAPValue.header = '';
    addLicenseOrderSOAPValue.body.addLicenseOrder.token = EC.XFormation.getToken();
    addLicenseOrderSOAPValue.body.addLicenseOrder.licenseOrder = licenseOrder;

    Log.d(logContext, 'addLicenseOrderSOAPValue: ' + JSON.stringify(addLicenseOrderSOAPValue));
    var addLicenseOrderSOAPXML = EC.jsonToXml(EC.XFormation.addLicenseOrderRequest, addLicenseOrderSOAPName, addLicenseOrderSOAPValue);
    Log.d(logContext, 'addLicenseOrderSOAPXML: ' + addLicenseOrderSOAPXML);

    retVal = nlapiRequestURL(EC.XFormation.URL, addLicenseOrderSOAPXML);
    var code = retVal.getCode();
    var body = retVal.getBody();

    Log.d(logContext, 'code: ' + code + ', body: ' + body);

    return retVal;
};

EC.XFormation.addCustomer = function(customerRecord)
{
    var retVal = null;
    var logContext = 'EC.XFormation.addCustomer';
    Log.d(logContext, 'Start');

    var addCustomerSOAPName =
    {
        "localPart":"Envelope",
        "namespaceURI":"http://schemas.xmlsoap.org/soap/envelope/",
        "prefix":"soapenv",
        "key":"{http://schemas.xmlsoap.org/soap/envelope/}Envelope",
        "string":"{http://schemas.xmlsoap.org/soap/envelope/}soapenv:Envelope"
    };
    Log.d(logContext, 'address array: ' + JSON.stringify(customerRecord.addressbook));

    var billingAddress = _.find(customerRecord.addressbook, function(a)
    {
        return a.defaultbilling;
    });


    //var customerRecord = nsdal.loadObject('customer', soRecord.entity, ['companyname', 'firstname', 'lastname','phone'])
    //    .withSublist('address', ['addr1','city','state','country','zip','defaultbilling','defaultshipping']);

    var customer = new EC.XFormation.CustomerElement();
    customer.id = '0';
    customer.name = customerRecord.companyname;
    if(billingAddress)
    {
        Log.d(logContext, 'billingaddress found')
        customer.street = billingAddress.addr1;
        customer.zipCode = billingAddress.zip;
        customer.city = billingAddress.city;
        customer.state = billingAddress.state;
        customer.country = billingAddress.country;
    }
    else
    {
        Log.d(logContext, 'billingaddress not found')
    }
    customer.phoneNumber = customerRecord.phone;
    //customer.faxNumber = '5555555555';
    //customer.vatNumber = '123';
    //customer.description = 'Test Description';
    //customer.contacts.item.push({name:'Steve Curry1', email:'test1@email.com'});
    //customer.contacts.item.push({name:'Steve Curry2', email:'test2@email.com'});
    //customer.customTags.item.push({tagName:'Tag1', value:'value1'});
    //customer.customTags.item.push({tagName:'Tag2', value:'value2'});
    customer.customTags.item.push({tagName:'netsuite_id', value:customerRecord.getId()});

    var addCustomerSOAPValue = new EC.XFormation.AddCustomerElement();
    addCustomerSOAPValue.header = '';
    addCustomerSOAPValue.body.addCustomer.token = EC.XFormation.getToken();
    addCustomerSOAPValue.body.addCustomer.customer = customer;

    Log.d(logContext, 'addCustomerSOAPValue: ' + JSON.stringify(addCustomerSOAPValue));
    var addCustomerSOAPXML = EC.jsonToXml(EC.XFormation.addCustomerRequest, addCustomerSOAPName, addCustomerSOAPValue);
    Log.d(logContext, 'addCustomerSOAPXML: ' + addCustomerSOAPXML);

    retVal = nlapiRequestURL(EC.XFormation.URL, addCustomerSOAPXML);
    var code = retVal.getCode();
    var body = retVal.getBody();

    Log.d(logContext, 'code: ' + code + ', body: ' + body);

    return retVal;
};

EC.XFormation.addCustomerTest = function()
{
    var retVal = null;
    var logContext = 'EC.XFormation.addCustomer';
    Log.d(logContext, 'Start');

    var addCustomerSOAPName =
    {
        "localPart":"Envelope",
        "namespaceURI":"http://schemas.xmlsoap.org/soap/envelope/",
        "prefix":"soapenv",
        "key":"{http://schemas.xmlsoap.org/soap/envelope/}Envelope",
        "string":"{http://schemas.xmlsoap.org/soap/envelope/}soapenv:Envelope"
    };

    var customer = new EC.XFormation.CustomerElement();
    customer.id = '0';
    customer.name = 'Steve Curry';
    customer.street = '123 Elm';
    customer.zipCode = '55555';
    customer.city = 'Seattle';
    customer.state = 'WA';
    customer.country = 'USA';
    customer.phoneNumber = '5555555555';
    customer.faxNumber = '5555555555';
    customer.vatNumber = '123';
    customer.description = 'Test Description';
    customer.contacts.item.push({name:'Steve Curry1', email:'test1@email.com'});
    customer.contacts.item.push({name:'Steve Curry2', email:'test2@email.com'});
    customer.customTags.item.push({tagName:'Tag1', value:'value1'});
    customer.customTags.item.push({tagName:'Tag2', value:'value2'});
    customer.customTags.item.push({tagName:'netsuite_id', value:'123'});

    var addCustomerSOAPValue = new EC.XFormation.AddCustomerElement();
    addCustomerSOAPValue.header = '';
    addCustomerSOAPValue.body.addCustomer.token = EC.XFormation.getToken();
    addCustomerSOAPValue.body.addCustomer.customer = customer;

    Log.d(logContext, 'addCustomerSOAPValue: ' + JSON.stringify(addCustomerSOAPValue));
    var addCustomerSOAPXML = EC.jsonToXml(EC.XFormation.addCustomerRequest, addCustomerSOAPName, addCustomerSOAPValue);
    Log.d(logContext, 'addCustomerSOAPXML: ' + addCustomerSOAPXML);

    retVal = nlapiRequestURL(EC.XFormation.URL, addCustomerSOAPXML);
    var code = retVal.getCode();
    var body = retVal.getBody();

    Log.d(logContext, 'code: ' + code + ', body: ' + body);

    return retVal;
};

EC.XFormation.getSOAPRequest = function(body)
{
    var retVal = '<?xml version="1.0" encoding="utf-8"?>' +
    '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
    'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
    'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:ns="https://license.x-formation.com/soap/type/vendor/version/2?wsdl">' +
    '  <soapenv:Header/>' +
    '  <soapenv:Body>' + body + '  </soapenv:Body>' +
    '</soapenv:Envelope>';

    return retVal;
};

EC.jsonToXml = function(mapper, name, value){
    var retVal = null;
    // Construct a Jsonix context - a factory marshaller (serializer) and create the marshaller
    var context = new Jsonix.Context([mapper]);
    var marshaller = context.createMarshaller();

    // Create the marshal object. This structure is required for conversion with an object with name/value
    var marshalObj = {name: name, value: value};

    // Convert the JSON content to XML and return it
    retVal = marshaller.marshalString(marshalObj);
    return retVal;
};

EC.xmlToJson = function(mapper, xml)
{
    var context = new Jsonix.Context([mapper]);
    var unmarshaller = context.createUnmarshaller();
    return unmarshaller.unmarshalString(xml);
};

//
// Temorary testing functions
//
EC.testAddCustomerSOAPJsonToXml = function()
{
    var logContext = 'EC.testAddCustomerSOAPJsonToXml';
    Log.d(logContext, 'Start');
    // Create Customer record if it does not already exist
    var addCustomerSOAPName =
    {
        "localPart":"Envelope",
        "namespaceURI":"http://schemas.xmlsoap.org/soap/envelope/",
        "prefix":"soapenv",
        "key":"{http://schemas.xmlsoap.org/soap/envelope/}Envelope",
        "string":"{http://schemas.xmlsoap.org/soap/envelope/}soapenv:Envelope"
    };

    var customer = new EC.XFormation.CustomerElement();
    customer.id = '0';
    customer.name = 'Steve Curry';
    customer.street = '123 Elm';
    customer.zipCode = '55555';
    customer.city = 'Seattle';
    customer.state = 'WA';
    customer.country = 'USA';
    customer.phoneNumber = '5555555555';
    customer.faxNumber = '5555555555';
    customer.vatNumber = '123';
    customer.description = 'Test Description';
    customer.contacts.item.push({name:'Steve Curry1', email:'test1@email.com'});
    customer.contacts.item.push({name:'Steve Curry2', email:'test2@email.com'});
    customer.customTags.item.push({tagName:'Tag1', value:'value1'});
    customer.customTags.item.push({tagName:'Tag2', value:'value2'});

    var addCustomerSOAPValue = new EC.XFormation.AddCustomerElement();
    addCustomerSOAPValue.header = '';
    addCustomerSOAPValue.body.addCustomer.token = '78987a35bdea94e9f2d797a79da0eddf6883c79a';
    addCustomerSOAPValue.body.addCustomer.customer = customer;

    Log.d(logContext, 'addCustomerSOAPValue: ' + JSON.stringify(addCustomerSOAPValue));
    var addCustomerSOAPXML = EC.jsonToXml(EC.XFormation.addCustomerRequest, addCustomerSOAPName, addCustomerSOAPValue);
    Log.d(logContext, 'addCustomerSOAPXML: ' + addCustomerSOAPXML);

};

EC.testAddCustomerSOAPXmlToJson = function()
{
    var logContext = 'EC.testAddCustomerSOAPXmlToJson';
    Log.d(logContext, 'Start');
    var rawXML = EC.getaddCustomerSOAPSampleXML();
    Log.d(logContext, 'rawXML: ' + rawXML);

    var theJson = EC.xmlToJson(EC.XFormation.addCustomerRequest, rawXML);
    Log.d(logContext, 'theJson: ' + JSON.stringify(theJson));
};

EC.getaddCustomerSOAPSampleXML = function()
{
    var retVal = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
    ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
    ' xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"' +
    ' xmlns:ns="https://license.x-formation.com/soap/type/vendor/version/1?wsdl"' +
    ' xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">' +
'<soapenv:Header/>' +
'<soapenv:Body>' +
'<ns:AddCustomer>' +
'<token>ec05a4da4a0cd8c08e6641791cc32b27cfca29e5</token>' +
'<customer>' +
'<id>0</id>' +
'<name>Explore Test</name>' +
'<street>123 Elm</street>' +
'<zip_code>98103</zip_code>' +
'<city>Seattle</city>' +
'<state>WA</state>' +
'<country>USA</country>' +
'<phone_number>5555555555</phone_number>' +
'<fax_number>5555555555</fax_number>' +
'<vat_number>123</vat_number>' +
'<description>Test description</description>' +
'<CustomTags>' +
'<item>' +
'<tag_name>Tag2</tag_name>' +
'<value>value2</value>' +
'</item>' +
'<item>' +
'<tag_name>Tag1</tag_name>' +
'<value>value1</value>' +
'</item>' +
'</CustomTags>' +
'</customer>' +
'</ns:AddCustomer>' +
'</soapenv:Body>' +
'</soapenv:Envelope>';

    return retVal;
};
