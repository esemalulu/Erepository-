/* DotNetRemoting JavaScript Serializer/Deserializer */

//var isIE = navigator.userAgent.toLowerCase().indexOf("msie") > -1;
//var isMoz = document.implementation && document.implementation.createDocument;

var isIE = true;
var isMoz = false;

// main entry for serialization
// JavaScript object as an input
// usage: JSerialize(MyObject);
// other parameters objectName, indentSpace may be omitted
function JSerialize(ObjectToSerilize, objectName, indentSpace)
{
   indentSpace = indentSpace?indentSpace:'';

   var Type = GetTypeName(ObjectToSerilize);

   var s = indentSpace  + '<' + objectName +  ' type="' + Type + '">';

   switch(Type)
   {
		case "number":
		case "string":
		case "boolean":
		{
			s += ObjectToSerilize;
		}

		break;

	   case "date":
	   {
			s += ObjectToSerilize.toLocaleString();
	   }
	   break;

		case "array":
		{
			s += "\n";

				for(var name in ObjectToSerilize)
				{
					s += JSerialize(ObjectToSerilize[name], ('index' + name ), indentSpace + "   ");
				};

				s += indentSpace;
		}
		break;

		default:
		{
			s += "\n";

			for(var name in ObjectToSerilize)
			{
				s += JSerialize(ObjectToSerilize[name], name, indentSpace + "   ");
			};

			s += indentSpace;
		}
		break;

   }

	s += "</" + objectName + ">\n";

    return s;
};

// main entry for deserialization
// XML string as an input
function JDeserialize(XmlText)
{
	var _doc = GetDom(XmlText);
	return Deserial(_doc.childNodes[0]);
}

// get dom object . IE or Mozilla
function GetDom(strXml)
{
	var _doc = null;

	if (isIE)
	{
		_doc = new ActiveXObject("Msxml2.DOMDocument.3.0");
		_doc.loadXML(strXml);
	}
	else
	{
		var parser = new DOMParser();
		_doc = parser.parseFromString(strXml, "text/xml");
	}

	return _doc;
}

// internal deserialization
function Deserial(xn)
{
	var RetObj;

	var NodeType = "object";

	if (xn.attributes != null && xn.attributes.length != 0)
	{
		var tmp = xn.attributes.getNamedItem("type");
		if (tmp != null)
		{
			NodeType = xn.attributes.getNamedItem("type").nodeValue;
		}
	}

	if (IsSimpleVar(NodeType))
	{
		if (isIE)
		{
			return StringToObject(xn.text, NodeType);
		}
		else
		{
			return StringToObject(xn.textContent, NodeType);
		}
	}

	switch(NodeType)
	{
		case "array":
		{
			RetObj = [];
			for(var i = 0; i < xn.childNodes.length; i++)
			{
				var Node = xn.childNodes[i];
				RetObj[i] = Deserial(Node);
			}

			return RetObj;
		}

		case "object":
		default:
		{
			try
			{
				RetObj = eval("new "+ NodeType + "()");
			}
			catch(e)
			{
				// create generic class
				RetObj = new Object();
			}
		}
		break;
	}

	for(var i = 0; i < xn.childNodes.length; i++)
	{
		var Node = xn.childNodes[i];
		RetObj[Node.nodeName] = Deserial(Node);
	}

	return RetObj;
}

function IsSimpleVar(type)
{
	switch(type)
	{
		case "int":
		case "string":
		case "String":
		case "Number":
		case "number":
		case "Boolean":
		case "boolean":
		case "bool":
		case "dateTime":
		case "Date":
		case "date":
		case "float":
			return true;
	}

	return false;
}

function StringToObject(Text, Type)
{
	var RetObj = null;

	switch(Type)
	{
		case "int":
			return parseInt(Text);

		case "number":
		{
			var outNum;

			if (Text.indexOf(".") > 0)
			{
				return parseFloat(Text);
			}
			else
			{
				return parseInt(Text);
			}
 		}

		case "string":
		case "String":
			return Text;

		case "dateTime":
		case "date":
		case "Date":
			return new Date(Text);

		case "float":
			return parseFloat(Text, 10);

		case "bool":
			{
				if (Text == "true" || Text == "True")
				{
					return true;
				}
				else
				{
					return false;
				}
			}
			return parseBool(Text);
	}

	return RetObj;
}

function GetClassName(obj)
{
	try
	{
		var ClassName = obj.constructor.toString();
		ClassName = ClassName.substring(ClassName.indexOf("function") + 8, ClassName.indexOf('(')).replace(/ /g,'');
		return ClassName;
	}
	catch(e)
	{
		return "NULL";
	}
}

function GetTypeName(ObjectToSerilize)
{
	if (ObjectToSerilize instanceof Array)
		return "array";

	if (ObjectToSerilize instanceof Date)
		return "date";

	var Type  = typeof(ObjectToSerilize);

	if (IsSimpleVar(Type))
	{
		return Type;
	}

	Type = GetClassName(ObjectToSerilize);

	return Type;
}


