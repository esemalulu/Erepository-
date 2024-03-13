/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Mar 2013     mburstein
 *
 */
function formatXMLSubObjects(object){
	/*
	 * This function handles building XML child elements for sub-objects 
	 * if the object property is string then it just prints the value
	 * if the object property is object then it builds xml tags for each sub property
	 */
	var xmlText = '';
	for (var prop in object) {
		xmlText += '<' + prop + '>';
		if (typeof object[prop] == 'object' || typeof object[prop] == 'array') {
			xmlText += formatXMLSubObjects(object[prop]);
		}
		else {
			xmlText += object[prop];
		}
		xmlText += '</' + prop + '>';
	}
	return xmlText;
}