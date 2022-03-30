/**
 * Copyright Explore Consulting, LLC
 * User: stalbert
 * Date: 1/31/12
 * Time: 11:56 AM
 * Provides object-oriented view of some netsuite API interactions
 * nsdal takes a simple ActiveRecord facade approach to netsuite record objects. NetSuite's own object loading and persistence API seems to lend itself
 * most readily to an Active Record pattern.
 * By deriving from nlobjRecord all the original methods and properties are still available on the ActiveRecord object.
 */


// declare the nsdal 'namespace' if it's not already defined
if( typeof nsdal == "undefined" || !nsdal)
{
    var nsdal = {
        // these are functions that nlobjRecord defines which we want to expose on this object and pass through
        // to the underling nlobjRecord instance.
        functionsToPassThru: [
        "getId",
        "getRecordType",
        "getField",
        "getSubList",
        "getMatrixField",
        "getLineItemField",
        "getLineItemMatrixField",
        "setFieldValue",
        "setFieldValues",
        "getFieldValue",
        "getFieldValues",
        "setFieldText",
        "setFieldTexts",
        "getFieldText",
        "getFieldTexts",
        "getMatrixValue",
        "setMatrixValue",
        "getAllFields",
        "getAllLineItemFields",
        "setLineItemValue",
        "getLineItemValue",
        "getLineItemText",
        "setCurrentLineItemValue",
        "getCurrentLineItemValue",
        "getCurrentLineItemText",
        "setCurrentLineItemMatrixValue",
        "getCurrentLineItemMatrixValue",
        "getMatrixCount",
        "getLineItemCount",
        "findLineItemValue",
        "findLineItemMatrixValue",
        "insertLineItem",
        "removeLineItem",
        "selectNewLineItem",
        "selectLineItem",
        "commitLineItem"]
    };
}

    /**
     * Returns an object derived from the nlobjRecord that allows simple property access for the body fields of an nlobjRecord
     *
     * e.g. to add a the comments and title properties for a contact record:
     * var contact = addProperties( mycontactobject, ['comments','title'] );
     * @param theRecord - the object to add properties to, generally just pass the result from something like nlapiGetNewRecord()
     * @param propNames - one or more strings of the body field names that will appear as properties on the object
     * @returns new object with read/write properties for each field name.
     */
    nsdal.addFieldProperties = function (/*nlobjRecord*/ theRecord, /*Array*/ propNames ) {
        // create a new object - for some reason the object returned from nlapiGetNewRecord() doesn't behave like an ECMAScript5 object
        // for instance, we can't call Object.create(theRecord) and expect theRecord set as the prototype. I suspect inheritance doesn't really
        // work with NetSuite's javascript, at least for their SuiteScript native objects.
        var obj = Object.create({});

        propNames.forEach(function (name) {
            switch ( theRecord.getField(name).type )
            {
                // if field is a multiselect, expose it as a true array property via getFieldValueS (plural)
                case 'multiselect':

                    Object.defineProperty(obj, name,
                    {
                        get:function () {
                            // EDIT BY KYL: This fails if the multiselect field has nothing selected.  In this case we
                            // return an empty array.
                            if ( theRecord.getFieldValues(name))
                                return theRecord.getFieldValues(name).slice(0);
                            else
                                return new Array();
                        },
                        set:function (value) {
                            theRecord.setFieldValues(name, value)
                        },
                        enumerable:true // default is false - this lets you JSON.stringify() this prop
                    });
                  break;

                // expose checkbox fields as boolean true/false
                case 'checkbox':
                    Object.defineProperty(obj, name,
                        {
                            get:function () {
                                return theRecord.getFieldValue(name) === 'T';
                            },
                            set:function (value) {
                                theRecord.setFieldValue(name, (value === true) ? 'T' : 'F' )
                            },
                            enumerable:true // default is false - this lets you JSON.stringify() this prop
                        });
                    break;

                // all other properties are treated as simple  values
                default:
                    Object.defineProperty(obj, name,
                    {
                        get:function () {
                            return theRecord.getFieldValue(name);
                        },
                        set:function (value) {
                            theRecord.setFieldValue(name, value)
                        },
                        enumerable:true //default is false
                    });
            }
        });

        // preserve the original non-javascript record reference, as it doesn't behave quite like a native javascript object
        Object.defineProperty(obj,'nlobjRecord',
            {
                value: theRecord,
                enumerable: false,
                writable: false,
                configurable: false
            });
        obj.save = nsdal.save;
        return obj;
    };

    /**
     * Saves this object to netsuite via nlapiSubmitRecord()
     * @param {Boolean} doSourcing see nlapiSubmitRecord
     * @param  {Boolean} ignoreMandatoryFields see nlapiSubmitRecord
     * @returns {String} internal id of the newly created record
     */
    nsdal.save = function (doSourcing, ignoreMandatoryFields) {
        // netsuite expects only the base type (nlobjRecord) to be passed to SubmitRecord()
        return nlapiSubmitRecord(this.nlobjRecord, doSourcing, ignoreMandatoryFields);
    };

/**
 * Creates a new netsuite record via nlapiCreateRecord() with the passed fields exposed as properties on the returned object.
 * @param {String} typeName type of netsuite record to create
 * @param {Array} propNames string array of record field names to include as properties on the object
 * @returns {Object} an friendlier nlobjRecord.
 */
nsdal.createObject = function (typeName, propNames)
{
    return this.fromRecord(nlapiCreateRecord(typeName), propNames);
};

/**
 * Loads a given record  via nlapiLoadRecord() and makes properties available.
 * @param {String} recordType the type of record you want to load
 * @param {String} id unique identifier for the record
 * @param {Array} propNames string array of record field names to include as properties on the object
 * @returns {Object} an friendlier nlobjRecord
 */
nsdal.loadObject = function (recordType, id, propNames) {
    return this.fromRecord(nlapiLoadRecord(recordType, id), propNames);
};

/**
 * Wraps an existing netsuite record to expose properties. The record may have been obtained (for example) via an nlapiGetNewRecord()
 * call in a UserEvent script.
 *
 * @param {nlobjRecord} theRecord existing netsuite record to wrap in the ActiveRecord pattern
 * @param propNames propNames string array of record field names to include as properties on the object
 * @returns {Object} an friendlier nlobjRecord
 */
nsdal.fromRecord = function( theRecord, propNames )
{
    var obj = nsdal.addFieldProperties(theRecord, propNames);

    // pass through calls to nlobjRecord when invoked on this object
    _.each(nsdal.functionsToPassThru, function(name) {
            obj[name] = theRecord[name].bind(theRecord);
        });

    return obj;
};


