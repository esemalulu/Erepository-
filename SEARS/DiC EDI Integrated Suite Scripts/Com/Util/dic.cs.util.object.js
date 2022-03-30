/**
 * Copyright (c) 2016 DiCentral, Inc.
 * 1199 1199 NASA Parkway, Houston, TX 77058, USA
 *
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * DiCentral, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with DiCentral.
 *
 * 

 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */

/**
 * @NApiVersion 2.x
 */
define(['N/util'],

function(nsUtil) {

	/**
	 * copy all properties of source to dest, properties of dest is be overrided
	 * dont support array object  
	 * @param {Object} source
	 * @param {Object} dest
	 * return new Object
	 */
	function deepCopyProperty(source, dest){
		if (!source || !dest) return dest;
		//clone deep copy
		Object.keys(source).forEach(function(property){
			if(Object.prototype.toString.call(source[property]) === '[object Object]'){
				//create a new object
				dest[property] = {};
				deepCopyProperty(source[property], dest[property]);
			}else{
				dest[property] = source[property];
			}
		});
		
		
	}
	/**
	 * Create an array property value, key is index, value is  {
	 * 	key: propertyName
	 *  propertyName: value of property name
	 * }
	 * @param {Object}
	 */
	function toArray(obj){
		return Object.keys(obj).map(function(ele){
			var newObj = {};
			Object.defineProperty(newObj, ele, {
				value: obj[ele],
			    writable: true,
			  	enumerable: true,
			  	configurable: true
			});
			newObj.key = ele;
			return newObj;
		});
	}
	/**
	 * Convert all property in object and sort the property value by call back
	 * @param {Object} obj
	 * @param {Function} callback to sort
	 */
	function toSortArray(obj, cb){
		return toArray(obj).sort(cb);
	}
	/**
	 * Delete property in properties list of instObj
	 * @param {Objec t} instObj
	 * @param {Array} properties: list of property name.
	 */
	
	function deleteProperties(instObj, properties){
		if(!instObj || !properties || !nsUtil.isArray(properties)) return ;
		
		properties.forEach(function(propertyName){
			if(instObj.hasOwnProperty(propertyName) && //check existence of property 
			   Object.getOwnPropertyDescriptor(instObj, propertyName).configurable === true ){
				delete instObj[propertyName];
			} //check allowance attribute delete property 
		});
	} 
	
	/**
	 * Extract Property Value in an object to array of columns Id
	 * @param {Object} obj
	 */
	function  extractPropertyStoreValue2ArrayId(obj){
		var result = [];
		var objField = null;
		Object.keys(obj).forEach(function(property){
		  	objField = obj[property];
		    if ('StoreValue' in objField && objField.StoreValue === true) {
		         result.push(objField.Id);
		    }
		    
		 });
		return result;
	}
	
	function extractPropertyId(options){
		if (!options) return null;
		var obj = options.object;
		var propertyExtract = options.hasOwnProperty('Property') ? options.Property : 'Id';
		return Object.keys(obj).map(function(ele){
			return obj[ele][propertyExtract];
		});
		
	}
    return {
      deepCopyProperty: deepCopyProperty,
      deleteProperties: deleteProperties,
      toArray: toArray,
      toSortArray: toSortArray,
      extractPropertyStoreValue2ArrayId: extractPropertyStoreValue2ArrayId,
      extractPropertyId:  extractPropertyId
    };
    
});
