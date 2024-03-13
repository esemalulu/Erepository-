/*
 * @author mburstein
 */

/**
 * Select XML Nodes and Values
 * 	Simple functions for selecting nodes and retrieving node values from XML using node/element name declarations
 * 
 * @xml, node, node_, nodeOrXML 					= input nodes or xml, interchangeable for the most part 
 * @name 											= Name of specific node you want to access
 * @xpath 											= xpath to nodes/elements
 * @arrNodeNames 									= Array of node names, can be built dynamically using buildeNodeNameArray().
 * 
 * 
 * selectNodeByName(nodeOrXml,name) 				- This function can be used to select a node Object by passing it's name as a parameter.
 * selectNodesByName(nodeOrXml,name) 				- This function can be used to select an array of node Objects by passing their name as a parameter.
 * selectNodeValueByName(nodeOrXml,name) 			- This function can be used to select an element value by passing it's name as a parameter.
 * selectNodeValuesByName(nodeOrXml,arrNodeNames) 	- This function takes an array of node names and returns an assoiative array of nodeName:value pairs (object[nodeName] = value;).
 * buildNodeNameArray(nodeOrXml,xpath)				- This function can be used to build an array of element names.  
 * 														This is useful for passing a dynamic list of elements into the selectNodeValuesByName() function.
 */
function selectNodeByName(xml,name){
	var node = nlapiSelectNode(xml, "//*[name()='"+name+"']");
	return node;
}

function selectNodesByName(xml,name){
	var nodes = nlapiSelectNodes(xml, "//*[name()='"+name+"']");
	return nodes;
}

function selectNodeValueByName(node,name){
	var value = nlapiSelectValue(node, "//*[name()='"+name+"']");
	return value;
}

function selectNodeValuesByName(node_,arrNodeNames){
	var values = new Object;
	for(var n=0; n<arrNodeNames.length; n++){
		var name = arrNodeNames[n];
		var value = nlapiSelectValue(node_, "//*[name()='"+name+"']");
		values[name] = value;
	}
	return values;
}

function buildNodeNameArray(nodeOrXml,xpath){  
	var arrNodes = nlapiSelectNodes(nodeOrXml,xpath);
	var arrNodeNames = new Array();
	for (var i = 0; i < arrNodes.length; i++) {
		var arrNode = arrNodes[i];
		arrNodeNames.push(arrNode.nodeName);
	}
	return 	arrNodeNames;
}
