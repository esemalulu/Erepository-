//
// loginResponse
//
var loginResponse_Module_Factory = function () {
    var loginResponse = {
        name: 'loginResponse',
        typeInfos: [{
            localName: 'LoginResponseType',
            typeName: {
                namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2',
                localPart: 'LoginResponseType'
            },
            propertyInfos: [{
                name: '_return',
                required: true,
                elementName: {
                    localPart: 'return'
                },
                typeInfo: '.ReturnType'
            }]
        }, {
            localName: 'BodyType',
            typeName: {
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/',
                localPart: 'BodyType'
            },
            propertyInfos: [{
                name: 'loginResponse',
                required: true,
                elementName: {
                    localPart: 'LoginResponse',
                    namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2'
                },
                typeInfo: '.LoginResponseType'
            }]
        }, {
            localName: 'EnvelopeType',
            typeName: {
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/',
                localPart: 'EnvelopeType'
            },
            propertyInfos: [{
                name: 'body',
                required: true,
                elementName: {
                    localPart: 'Body',
                    namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
                },
                typeInfo: '.BodyType'
            }, {
                name: 'encodingStyle',
                attributeName: {
                    localPart: 'encodingStyle'
                },
                type: 'attribute'
            }]
        }, {
            localName: 'ReturnType',
            typeName: 'returnType',
            propertyInfos: [{
                name: 'token',
                required: true,
                elementName: {
                    localPart: 'token'
                }
            }, {
                name: 'resultCode',
                required: true,
                elementName: {
                    localPart: 'result_code'
                }
            }, {
                name: 'resultString',
                required: true,
                elementName: {
                    localPart: 'result_string'
                }
            }]
        }],
        elementInfos: [{
            elementName: {
                localPart: 'Envelope',
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
            },
            typeInfo: '.EnvelopeType'
        }, {
            elementName: {
                localPart: 'return'
            },
            typeInfo: '.ReturnType'
        }, {
            elementName: {
                localPart: 'LoginResponse',
                namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2'
            },
            typeInfo: '.LoginResponseType'
        }]
    };
    return {
        loginResponse: loginResponse
    };
};
if (typeof define === 'function' && define.amd) {
    define([], loginResponse_Module_Factory);
}
else {
    var loginResponse_Module = loginResponse_Module_Factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.loginResponse = loginResponse_Module.loginResponse;
    }
    else {
        //var loginResponse = loginResponse_Module.loginResponse;
        EC.XFormation.loginResponse = loginResponse_Module.loginResponse;
    }
}

//
// addCustomerRequest
//
var addCustomerRequest_Module_Factory = function () {
    var addCustomerRequest = {
        name: 'addCustomerRequest',
        typeInfos: [{
            localName: 'EnvelopeType',
            typeName: {
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/',
                localPart: 'EnvelopeType'
            },
            propertyInfos: [{
                name: 'header',
                required: true,
                elementName: {
                    localPart: 'Header',
                    namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
                }
            }, {
                name: 'body',
                required: true,
                elementName: {
                    localPart: 'Body',
                    namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
                },
                typeInfo: '.BodyType'
            }]
        }, {
            localName: 'AddCustomerType',
            typeName: {
                namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2?wsdl',
                localPart: 'AddCustomerType'
            },
            propertyInfos: [{
                name: 'token',
                required: true,
                elementName: {
                    localPart: 'token'
                }
            }, {
                name: 'customer',
                required: true,
                elementName: {
                    localPart: 'customer'
                },
                typeInfo: '.CustomerType'
            }]
        }, {
            localName: 'BodyType',
            typeName: {
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/',
                localPart: 'BodyType'
            },
            propertyInfos: [{
                name: 'addCustomer',
                required: true,
                elementName: {
                    localPart: 'AddCustomer',
                    namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2?wsdl'
                },
                typeInfo: '.AddCustomerType'
            }]
        }, {
            localName: 'ItemType',
            typeName: 'itemType',
            propertyInfos: [{
                name: 'tagName',
                required: true,
                elementName: {
                    localPart: 'tag_name'
                }
            }, {
                name: 'value',
                required: true,
                elementName: {
                    localPart: 'value'
                }
            }]
        }, {
            localName: 'ContactType',
            typeName: 'contactType',
            propertyInfos: [{
                name: 'id',
                required: true,
                elementName: {
                    localPart: 'id'
                },
                typeInfo: 'Int'
            }, {
                name: 'name',
                required: true,
                elementName: {
                    localPart: 'name'
                }
            }, {
                name: 'email',
                required: true,
                elementName: {
                    localPart: 'email'
                }
            }, {
                name: 'customerId',
                required: true,
                elementName: {
                    localPart: 'customer_id'
                },
                typeInfo: 'Int'
            }, {
                name: 'creationTime',
                required: true,
                elementName: {
                    localPart: 'creation_time'
                }
            }, {
                name: 'updateTime',
                required: true,
                elementName: {
                    localPart: 'update_time'
                }
            }]
        }, {
            localName: 'CustomerType',
            typeName: 'customerType',
            propertyInfos: [{
                name: 'id',
                required: true,
                elementName: {
                    localPart: 'id'
                },
                typeInfo: 'Int'
            }, {
                name: 'name',
                required: true,
                elementName: {
                    localPart: 'name'
                }
            }, {
                name: 'street',
                required: true,
                elementName: {
                    localPart: 'street'
                }
            }, {
                name: 'zipCode',
                required: true,
                elementName: {
                    localPart: 'zip_code'
                }
            }, {
                name: 'city',
                required: true,
                elementName: {
                    localPart: 'city'
                }
            }, {
                name: 'state',
                required: true,
                elementName: {
                    localPart: 'state'
                }
            }, {
                name: 'country',
                required: true,
                elementName: {
                    localPart: 'country'
                }
            }, {
                name: 'phoneNumber',
                required: true,
                elementName: {
                    localPart: 'phone_number'
                }
            }, {
                name: 'faxNumber',
                required: true,
                elementName: {
                    localPart: 'fax_number'
                }
            }, {
                name: 'description',
                required: true,
                elementName: {
                    localPart: 'description'
                }
            }, {
                name: 'creationTime',
                required: true,
                elementName: {
                    localPart: 'creation_time'
                }
            }, {
                name: 'updateTime',
                required: true,
                elementName: {
                    localPart: 'update_time'
                }
            }, {
                name: 'contacts',
                required: true,
                elementName: {
                    localPart: 'Contacts'
                },
                typeInfo: '.ContactsType'
            }, {
                name: 'customTags',
                required: true,
                elementName: {
                    localPart: 'CustomTags'
                },
                typeInfo: '.CustomTagsType'
            }]
        }, {
            localName: 'ContactsType',
            propertyInfos: [{
                name: 'item',
                minOccurs: 0,
                collection: true,
                elementName: {
                    localPart: 'item'
                },
                typeInfo: '.ContactType'
            }]
        }, {
            localName: 'CustomTagsType',
            propertyInfos: [{
                name: 'item',
                minOccurs: 0,
                collection: true,
                elementName: {
                    localPart: 'item'
                },
                typeInfo: '.ItemType'
            }]
        }],
        elementInfos: [{
            elementName: {
                localPart: 'Envelope',
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
            },
            typeInfo: '.EnvelopeType'
        }, {
            elementName: {
                localPart: 'AddCustomer',
                namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2?wsdl'
            },
            typeInfo: '.AddCustomerType'
        }, {
            elementName: {
                localPart: 'token'
            }
        }, {
            elementName: {
                localPart: 'customer'
            },
            typeInfo: '.CustomerType'
        }]
    };
    return {
        addCustomerRequest: addCustomerRequest
    };
};
if (typeof define === 'function' && define.amd) {
    define([], addCustomerRequest_Module_Factory);
}
else {
    var addCustomerRequest_Module = addCustomerRequest_Module_Factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.addCustomerRequest = addCustomerRequest_Module.addCustomerRequest;
    }
    else {
        EC.XFormation.addCustomerRequest = addCustomerRequest_Module.addCustomerRequest;
    }
}

//
// addLicenseOrderRequest
//
var addLicenseOrderRequest_Module_Factory = function () {
    var addLicenseOrderRequest = {
        name: 'addLicenseOrderRequest',
        typeInfos: [{
            localName: 'HostidType',
            typeName: 'hostidType',
            propertyInfos: [{
                name: 'name',
                required: true,
                elementName: {
                    localPart: 'name'
                }
            }, {
                name: 'minAmount',
                required: true,
                elementName: {
                    localPart: 'min_amount'
                },
                typeInfo: 'Int'
            }, {
                name: 'maxAmount',
                required: true,
                elementName: {
                    localPart: 'max_amount'
                },
                typeInfo: 'Int'
            }]
        }, {
            localName: 'FeatureType',
            typeName: 'featureType',
            propertyInfos: [{
                name: 'name',
                required: true,
                elementName: {
                    localPart: 'name'
                }
            }, {
                name: 'version',
                required: true,
                elementName: {
                    localPart: 'version'
                }
            }, {
                name: 'expirationType',
                required: true,
                elementName: {
                    localPart: 'expiration_type'
                }
            }, {
                name: 'expirationDate',
                required: true,
                elementName: {
                    localPart: 'expiration_date'
                }
            }, {
                name: 'issuedType',
                required: true,
                elementName: {
                    localPart: 'issued_type'
                }
            }, {
                name: 'issuedDate',
                required: true,
                elementName: {
                    localPart: 'issued_date'
                }
            }, {
                name: 'options',
                required: true,
                elementName: {
                    localPart: 'options'
                }
            }, {
                name: 'additionalSettings',
                required: true,
                elementName: {
                    localPart: 'additional_settings'
                }
            }, {
                name: 'enabled',
                required: true,
                elementName: {
                    localPart: 'enabled'
                },
                typeInfo: 'Boolean'
            }, {
                name: 'daysFromActivation',
                required: true,
                elementName: {
                    localPart: 'days_from_activation'
                }
            }, {
                name: 'count',
                required: true,
                elementName: {
                    localPart: 'count'
                }
            }, {
                name: 'maintenanceType',
                required: true,
                elementName: {
                    localPart: 'maintenance_type'
                }
            }, {
                name: 'maintenanceDate',
                required: true,
                elementName: {
                    localPart: 'maintenance_date'
                }
            }, {
                name: 'maintenanceDaysFromActivation',
                required: true,
                elementName: {
                    localPart: 'maintenance_days_from_activation'
                }
            }, {
                name: 'comment',
                required: true,
                elementName: {
                    localPart: 'comment'
                }
            }]
        }, {
            localName: 'AddLicenseOrderType',
            typeName: {
                namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2?wsdl',
                localPart: 'AddLicenseOrderType'
            },
            propertyInfos: [{
                name: 'token',
                required: true,
                elementName: {
                    localPart: 'token'
                }
            }, {
                name: 'licenseOrder',
                required: true,
                elementName: {
                    localPart: 'licenseOrder'
                },
                typeInfo: '.LicenseOrderType'
            }]
        }, {
            localName: 'EnvelopeType',
            typeName: {
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/',
                localPart: 'EnvelopeType'
            },
            propertyInfos: [{
                name: 'header',
                required: true,
                elementName: {
                    localPart: 'Header',
                    namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
                }
            }, {
                name: 'body',
                required: true,
                elementName: {
                    localPart: 'Body',
                    namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
                },
                typeInfo: '.BodyType'
            }]
        }, {
            localName: 'HostidsType',
            propertyInfos: [{
                name: 'item',
                minOccurs: 0,
                collection: true,
                elementName: {
                    localPart: 'item'
                },
                typeInfo: '.HostidType'
            }]
        }, {
            localName: 'BodyType',
            typeName: {
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/',
                localPart: 'BodyType'
            },
            propertyInfos: [{
                name: 'addLicenseOrder',
                required: true,
                elementName: {
                    localPart: 'AddLicenseOrder',
                    namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2?wsdl'
                },
                typeInfo: '.AddLicenseOrderType'
            }]
        }, {
            localName: 'LicenseOrderType',
            typeName: 'licenseOrderType',
            propertyInfos: [{
                name: 'customerId',
                required: true,
                elementName: {
                    localPart: 'customer_id'
                }
            }, {
                name: 'productTemplateId',
                required: true,
                elementName: {
                    localPart: 'product_template_id'
                }
            }, {
                name: 'activationKey',
                required: true,
                elementName: {
                    localPart: 'activation_key'
                }
            }, {
                name: 'creationTime',
                required: true,
                elementName: {
                    localPart: 'creation_time'
                }
            }, {
                name: 'licenseType',
                required: true,
                elementName: {
                    localPart: 'license_type'
                }
            }, {
                name: 'licenseeType',
                required: true,
                elementName: {
                    localPart: 'licensee_type'
                }
            }, {
                name: 'licensee',
                required: true,
                elementName: {
                    localPart: 'licensee'
                }
            }, {
                name: 'hostidMatchRate',
                required: true,
                elementName: {
                    localPart: 'hostid_match_rate'
                },
                typeInfo: 'Int'
            }, {
                name: 'minHostids',
                required: true,
                elementName: {
                    localPart: 'min_hostids'
                },
                typeInfo: 'Int'
            }, {
                name: 'activatedLicensesCount',
                required: true,
                elementName: {
                    localPart: 'activated_licenses_count'
                }
            }, {
                name: 'enabled',
                required: true,
                elementName: {
                    localPart: 'enabled'
                },
                typeInfo: 'Boolean'
            }, {
                name: 'description',
                required: true,
                elementName: {
                    localPart: 'description'
                }
            }, {
                name: 'settingsDescription',
                required: true,
                elementName: {
                    localPart: 'settings_description'
                }
            }, {
                name: 'removal',
                required: true,
                elementName: {
                    localPart: 'removal'
                },
                typeInfo: 'Boolean'
            }, {
                name: 'removalRequestTime',
                required: true,
                elementName: {
                    localPart: 'removal_request_time'
                }
            }, {
                name: 'removalConfirmationTime',
                required: true,
                elementName: {
                    localPart: 'removal_confirmation_time'
                }
            }, {
                name: 'deactivationsAllowed',
                required: true,
                elementName: {
                    localPart: 'deactivations_allowed'
                }
            }, {
                name: 'deactivationsLeft',
                required: true,
                elementName: {
                    localPart: 'deactivations_left'
                }
            }, {
                name: 'hostids',
                required: true,
                elementName: {
                    localPart: 'Hostids'
                },
                typeInfo: '.HostidsType'
            }, {
                name: 'features',
                required: true,
                elementName: {
                    localPart: 'Features'
                },
                typeInfo: '.FeaturesType'
            }]
        }, {
            localName: 'FeaturesType',
            propertyInfos: [{
                name: 'item',
                minOccurs: 0,
                collection: true,
                elementName: {
                    localPart: 'item'
                },
                typeInfo: '.FeatureType'
            }]
        }],
        elementInfos: [{
            elementName: {
                localPart: 'Envelope',
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
            },
            typeInfo: '.EnvelopeType'
        }, {
            elementName: {
                localPart: 'licenseOrder'
            },
            typeInfo: '.LicenseOrderType'
        }, {
            elementName: {
                localPart: 'AddLicenseOrder',
                namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2?wsdl'
            },
            typeInfo: '.AddLicenseOrderType'
        }, {
            elementName: {
                localPart: 'token'
            }
        }]
    };
    return {
        addLicenseOrderRequest: addLicenseOrderRequest
    };
};
if (typeof define === 'function' && define.amd) {
    define([], addLicenseOrderRequest_Module_Factory);
}
else {
    var addLicenseOrderRequest_Module = addLicenseOrderRequest_Module_Factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.addLicenseOrderRequest = addLicenseOrderRequest_Module.addLicenseOrderRequest;
    }
    else {
        EC.XFormation.addLicenseOrderRequest = addLicenseOrderRequest_Module.addLicenseOrderRequest;
    }
}

//
// getLicenseOrderTemplateResponse
//
var getLicenseOrderTemplateResponse_Module_Factory = function () {
    var getLicenseOrderTemplateResponse = {
        name: 'getLicenseOrderTemplateResponse',
        typeInfos: [{
            localName: 'GetLicenseOrderTemplateResponseType',
            typeName: {
                namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2',
                localPart: 'GetLicenseOrderTemplateResponseType'
            },
            propertyInfos: [{
                name: '_return',
                required: true,
                elementName: {
                    localPart: 'return'
                },
                typeInfo: '.ReturnType'
            }]
        }, {
            localName: 'BodyType',
            typeName: {
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/',
                localPart: 'BodyType'
            },
            propertyInfos: [{
                name: 'getLicenseOrderTemplateResponse',
                required: true,
                elementName: {
                    localPart: 'GetLicenseOrderTemplateResponse',
                    namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2'
                },
                typeInfo: '.GetLicenseOrderTemplateResponseType'
            }]
        }, {
            localName: 'ReturnType',
            typeName: 'returnType',
            propertyInfos: [{
                name: 'resultObject',
                required: true,
                elementName: {
                    localPart: 'result_object'
                },
                typeInfo: '.ResultObjectType'
            }, {
                name: 'resultCode',
                required: true,
                elementName: {
                    localPart: 'result_code'
                },
                typeInfo: 'Int'
            }, {
                name: 'resultString',
                required: true,
                elementName: {
                    localPart: 'result_string'
                }
            }]
        }, {
            localName: 'FeatureType',
            typeName: 'featureType',
            propertyInfos: [{
                name: 'name',
                required: true,
                elementName: {
                    localPart: 'name'
                }
            }, {
                name: 'version',
                required: true,
                elementName: {
                    localPart: 'version'
                }
            }, {
                name: 'expirationType',
                required: true,
                elementName: {
                    localPart: 'expiration_type'
                }
            }, {
                name: 'expirationDate',
                required: true,
                elementName: {
                    localPart: 'expiration_date'
                }
            }, {
                name: 'issuedType',
                required: true,
                elementName: {
                    localPart: 'issued_type'
                }
            }, {
                name: 'issuedDate',
                required: true,
                elementName: {
                    localPart: 'issued_date'
                }
            }, {
                name: 'options',
                required: true,
                elementName: {
                    localPart: 'options'
                }
            }, {
                name: 'additionalSettings',
                required: true,
                elementName: {
                    localPart: 'additional_settings'
                }
            }, {
                name: 'enabled',
                required: true,
                elementName: {
                    localPart: 'enabled'
                },
                typeInfo: 'Boolean'
            }, {
                name: 'daysFromActivation',
                required: true,
                elementName: {
                    localPart: 'days_from_activation'
                },
                typeInfo: 'Int'
            }, {
                name: 'count',
                required: true,
                elementName: {
                    localPart: 'count'
                },
                typeInfo: 'Int'
            }, {
                name: 'maintenanceType',
                required: true,
                elementName: {
                    localPart: 'maintenance_type'
                }
            }, {
                name: 'maintenanceDate',
                required: true,
                elementName: {
                    localPart: 'maintenance_date'
                }
            }, {
                name: 'maintenanceDaysFromActivation',
                required: true,
                elementName: {
                    localPart: 'maintenance_days_from_activation'
                },
                typeInfo: 'Int'
            }, {
                name: 'comment',
                required: true,
                elementName: {
                    localPart: 'comment'
                }
            }]
        }, {
            localName: 'HostidType',
            typeName: 'hostidType',
            propertyInfos: [{
                name: 'name',
                required: true,
                elementName: {
                    localPart: 'name'
                }
            }, {
                name: 'minAmount',
                required: true,
                elementName: {
                    localPart: 'min_amount'
                },
                typeInfo: 'Int'
            }, {
                name: 'maxAmount',
                required: true,
                elementName: {
                    localPart: 'max_amount'
                },
                typeInfo: 'Int'
            }]
        }, {
            localName: 'HostidsType',
            propertyInfos: [{
                name: 'item',
                minOccurs: 0,
                collection: true,
                elementName: {
                    localPart: 'item'
                },
                typeInfo: '.HostidType'
            }]
        }, {
            localName: 'EnvelopeType',
            typeName: {
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/',
                localPart: 'EnvelopeType'
            },
            propertyInfos: [{
                name: 'body',
                required: true,
                elementName: {
                    localPart: 'Body',
                    namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
                },
                typeInfo: '.BodyType'
            }, {
                name: 'encodingStyle',
                attributeName: {
                    localPart: 'encodingStyle'
                },
                type: 'attribute'
            }]
        }, {
            localName: 'FeaturesType',
            propertyInfos: [{
                name: 'item',
                minOccurs: 0,
                collection: true,
                elementName: {
                    localPart: 'item'
                },
                typeInfo: '.FeatureType'
            }]
        }, {
            localName: 'ResultObjectType',
            typeName: 'result_objectType',
            propertyInfos: [{
                name: 'customerId',
                required: true,
                elementName: {
                    localPart: 'customer_id'
                },
                typeInfo: 'Int'
            }, {
                name: 'productTemplateId',
                required: true,
                elementName: {
                    localPart: 'product_template_id'
                },
                typeInfo: 'Int'
            }, {
                name: 'activationKey',
                required: true,
                elementName: {
                    localPart: 'activation_key'
                }
            }, {
                name: 'creationTime',
                required: true,
                elementName: {
                    localPart: 'creation_time'
                }
            }, {
                name: 'licenseType',
                required: true,
                elementName: {
                    localPart: 'license_type'
                }
            }, {
                name: 'licenseeType',
                required: true,
                elementName: {
                    localPart: 'licensee_type'
                }
            }, {
                name: 'licensee',
                required: true,
                elementName: {
                    localPart: 'licensee'
                }
            }, {
                name: 'hostidMatchRate',
                required: true,
                elementName: {
                    localPart: 'hostid_match_rate'
                },
                typeInfo: 'Int'
            }, {
                name: 'minHostids',
                required: true,
                elementName: {
                    localPart: 'min_hostids'
                },
                typeInfo: 'Int'
            }, {
                name: 'activatedLicensesCount',
                required: true,
                elementName: {
                    localPart: 'activated_licenses_count'
                },
                typeInfo: 'Int'
            }, {
                name: 'enabled',
                required: true,
                elementName: {
                    localPart: 'enabled'
                },
                typeInfo: 'Boolean'
            }, {
                name: 'description',
                required: true,
                elementName: {
                    localPart: 'description'
                }
            }, {
                name: 'settingsDescription',
                required: true,
                elementName: {
                    localPart: 'settings_description'
                }
            }, {
                name: 'removal',
                required: true,
                elementName: {
                    localPart: 'removal'
                },
                typeInfo: 'Boolean'
            }, {
                name: 'removalRequestTime',
                required: true,
                elementName: {
                    localPart: 'removal_request_time'
                }
            }, {
                name: 'removalConfirmationTime',
                required: true,
                elementName: {
                    localPart: 'removal_confirmation_time'
                }
            }, {
                name: 'deactivationsAllowed',
                required: true,
                elementName: {
                    localPart: 'deactivations_allowed'
                },
                typeInfo: 'Int'
            }, {
                name: 'deactivationsLeft',
                required: true,
                elementName: {
                    localPart: 'deactivations_left'
                },
                typeInfo: 'Int'
            }, {
                name: 'hostids',
                required: true,
                elementName: {
                    localPart: 'Hostids'
                },
                typeInfo: '.HostidsType'
            }, {
                name: 'features',
                required: true,
                elementName: {
                    localPart: 'Features'
                },
                typeInfo: '.FeaturesType'
            }]
        }],
        elementInfos: [{
            elementName: {
                localPart: 'return'
            },
            typeInfo: '.ReturnType'
        }, {
            elementName: {
                localPart: 'Envelope',
                namespaceURI: 'http:\/\/schemas.xmlsoap.org\/soap\/envelope\/'
            },
            typeInfo: '.EnvelopeType'
        }, {
            elementName: {
                localPart: 'GetLicenseOrderTemplateResponse',
                namespaceURI: 'https:\/\/license.x-formation.com\/soap\/type\/vendor\/version\/2'
            },
            typeInfo: '.GetLicenseOrderTemplateResponseType'
        }]
    };
    return {
        getLicenseOrderTemplateResponse: getLicenseOrderTemplateResponse
    };
};
if (typeof define === 'function' && define.amd) {
    define([], getLicenseOrderTemplateResponse_Module_Factory);
}
else {
    var getLicenseOrderTemplateResponse_Module = getLicenseOrderTemplateResponse_Module_Factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.getLicenseOrderTemplateResponse = getLicenseOrderTemplateResponse_Module.getLicenseOrderTemplateResponse;
    }
    else {
        EC.XFormation.getLicenseOrderTemplateResponse = getLicenseOrderTemplateResponse_Module.getLicenseOrderTemplateResponse;
    }
}
