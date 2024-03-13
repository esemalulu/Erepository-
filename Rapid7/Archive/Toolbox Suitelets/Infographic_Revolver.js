/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	1.00
 * Date		11 Jul 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 */

function createInfoGraphicRevolver(){
	this.context = document.getElementById("myCanvas");
	this.ctx = context.getContext("2d");
	this.tempCanvas = document.getElementById('tempCanvas');
    this.tCtx = tempCanvas.getContext("2d");
	this.dataObject = getDataObject();
	// Use the scale var to scale the canvas drawing, scale is for x and y
	var scale = .6;
	ctx.scale(scale,scale);
	ctx.font="bold 40px Arial";
	// Radius of the large circle is 40% of the height (half the canvas height is the max radius)
	this.wheelRadius = context.height*.3;
	
	//drawLine(context.width / 2, context.height / 2, 200, 200);
	drawCircle(context.width / 2, context.height / 2, wheelRadius);
	// Get coords
	var newCircleCoords = getNewCircleCoords(context.width / 2, context.height / 2, context.width / 2, toRadians(18));
	// Draw circle at the new point on circumference
	
	plotCircles(numCircles, context.width / 2, context.height / 2, wheelRadius);
}

function plotCircles(numCircles, xCenter, yCenter, wheelRadius){
	var areaIndex = 0;
	var startingRadian = 0;
	var radianIncrement = toRadians(360 / numCircles);
	for (department in dataObject) {
			dataObject[department]['center'] = getNewCircleCoords(xCenter, yCenter, wheelRadius, startingRadian);
			var r = getRadiusFromArea(dataObject[department]['employeeCount']);
			//var color = get_random_color();
			//var pattern = getCroppedPattern(department);
			drawCircle(dataObject[department]['center']['x'], dataObject[department]['center']['y'], r, null);
			var centerX = dataObject[department]['center']['x'];
			var centerY = dataObject[department]['center']['y'];
			// Fix the label base on location
			if (centerX < context.width / 2) {
				ctx.textAlign = 'right';
				var sc = ((context.width / 2)-centerX)/10;
				centerX = centerX-(context.width/20);
				
			}
			else{
				ctx.textAlign = 'left';
				centerX = centerX+(context.width/20);
			}
			if (centerY < context.height / 2) {
				centerY = centerY - (context.height/20);
			}
			else {
				centerY = centerY + (context.height/20);
			}
			ctx.fillText(department, centerX, centerY);
			areaIndex++;
			numCircles--;
			startingRadian += radianIncrement;
	}
	//ctx.strokeStyle = '';
	for (department in dataObject) {
		plotLines(department);
	}
}

function plotLines(department){
	// Get current department origin point
	var x1 = dataObject[department]['center']['x'];
	var y1 = dataObject[department]['center']['y'];
	var color = get_random_color();
	for (toDepartment in dataObject[department]['nominations']) {
	
		if (toDepartment != department && toDepartment == 'Support') {
			// Get toNomination department origin point and number of nominations
			var x2 = dataObject[toDepartment]['center']['x'];
			var y2 = dataObject[toDepartment]['center']['y'];
			var width = dataObject[department]['nominations'][toDepartment];
			// Draw lines to show nominations from department to other department
			drawLine(x1, y1, x2, y2, width, color);
			var midpoint = getMidpoint(x1, y1, x2, y2);
			ctx.fillText(width, midpoint.x - 10, midpoint.y - 30);
		//alert(midpoint.x+' , '+midpoint.y);
		}
		// If same department then create circle inside department
		else {
			var r = 5 * getRadiusFromArea(dataObject[department]['nominations'][toDepartment]);
			drawCircle(x1, y1, r, color);
		}
	}
}

function drawRectangle(color, start, stop, w, h){
	ctx.fillStyle = color;
	ctx.fillRect(start, stop, w, h);
}

function drawLine(x1, y1, x2, y2, width,color){
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	if (width != null && width != '') {
		ctx.lineWidth = width/2;
	}
	if (color != null && color != '') {
		ctx.strokeStyle = color;
	}
	ctx.stroke();
}

// Area of a circle = PI * R^2
// sqrt(empNum/PI) = R
function getRadiusFromArea(circleArea){
	return Math.sqrt(circleArea / Math.PI);
}

// Equation of a circle
// r2=(x-a)2+(y-b)2

function drawCircle(xCenter, yCenter, r,color){
	ctx.beginPath();
	ctx.arc(xCenter, yCenter, r, 0, 2 * Math.PI);
	if (color != null && color != '') {
		ctx.fillStyle = color;
		ctx.fill();
	}
	ctx.strokeStyle = 'green';
	ctx.stroke();
}

function getNewCircleCoords(xCenter, yCenter, r, angleInRad){
	var newCircleCoords = {
		// Parametric Equations of a Circle
		x: xCenter + r * Math.cos(angleInRad),
		y: yCenter + r * Math.sin(angleInRad),
	};
	return newCircleCoords;
}

function toRadians(angleInDegrees){
	return angleInDegrees * Math.PI / 180;
}

function getMidpoint(x1, y1, x2, y2){
	var midpoint = {
		x: (x1 + x2) / 2,
		y: (y1 + y2) / 2,
	};
	return midpoint;
}

function getSlope(x1, y1, x2, y2){
	 var m = (y1 - y2) / (x1 - x2);
	 return m;
	 
}

/*function getStandardLineEq(x1, y1, x2, y2){
	 var m = (y1 - y2) / (x1 - x2);
	 var b = y1 - (m * x1);
	 var A = -1*B*m
	 var B = (-1*a)/m
	 var C = 
}*/
//Distance from a point to a line
function findPerpPoint(){
	// d = Math.abs()
	//http://www.tpub.com/math2/8.htm
}
function findPerpendicularPoint(x, y, m, distance){
	var mPerpendicular = -1 / m;
	// y=(-1/m)x+b
	var b = y - (mPerpendicular * x);
}

// Build an object to hold all data for each department
function getDataObject(){
	
	var departmentDataObject = getDepartmentEmployeeCount();
	departmentDataObject = getDepartmentPicks(departmentDataObject);
	departmentDataObject = getXDepartmentNominations(departmentDataObject);
	
	return departmentDataObject;
}

function getDepartmentEmployeeCount(){
	var objDepartment = new Object();
	// Department Employee Count = Circle Area
	var arrFilters = [ 
                	[ 'isinactive', 'is', 'F' ],
	   			  ];
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid',null,'count');
	arrColumns[1] = new nlobjSearchColumn('department',null,'group').setSort(true);

	var results = nlapiSearchRecord('employee',null,arrFilters,arrColumns);
	for (var i = 0; results != null && i < results.length; i++) {
		var result = results[i];
		var department = result.getText(arrColumns[1]);
		var employeeCount = 1000*result.getValue(arrColumns[0]);
		objDepartment[department] = {
			'employeeCount' : employeeCount,
		};
	}
	this.numCircles = results.length;
	return objDepartment;	
}

function getDepartmentPicks(departmentDataObject){
	
	var arrFilters = [ 
            	[ 'isinactive', 'is', 'F' ],
   			  ];

	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('custrecordr7guitarpicksdepartment').setSort(true);
	arrColumns[1] = new nlobjSearchColumn('custrecordr7guitarpickspickimage');
	arrColumns[2] = new nlobjSearchColumn('custrecordcustrecordr7guitarpickspickcol');

	var results = nlapiSearchRecord('customrecordr7guitarpicks',null,arrFilters,arrColumns);
	for (var i = 0; results != null && i < results.length; i++) {
		var result = results[i];
		var department = result.getText(arrColumns[0]);
		var pickName = result.getText(arrColumns[2]);
		var pickImg = result.getText(arrColumns[1]);
		departmentDataObject[department]['pickName'] = pickName;
		departmentDataObject[department]['pickImg'] = pickImg;
	}
	return departmentDataObject;	
}

function getXDepartmentNominations(departmentDataObject){
	var arrFilters = [['custrecordr7rockstarapproved', 'is', 'T'], ];
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid', null, 'count');
	arrColumns[1] = new nlobjSearchColumn('custrecordr7rockstarfromdepartment', null, 'group').setSort(true);
	arrColumns[2] = new nlobjSearchColumn('department', 'custrecordr7rockstarto', 'group');
	
	var results = nlapiSearchRecord('customrecordr7rockstar', null, arrFilters, arrColumns);
	for (var i = 0; results != null && i < results.length; i++) {
		var result = results[i];
		var fromDepartment = result.getText(arrColumns[1]);
		var toDepartment = result.getText(arrColumns[2]);
		var numNominations = result.getValue(arrColumns[0]);
		// If the nominations object doesn't exist then create it
		if (typeof departmentDataObject[fromDepartment]['nominations'] == 'undefined') {
			departmentDataObject[fromDepartment]['nominations'] = new Object();
		}
			departmentDataObject[fromDepartment]['nominations'][toDepartment] = numNominations;
	}
	return departmentDataObject;
}

function getCroppedPattern(department){
	var imageObj = new Image();
	var pickImg = dataObject[department]['pickImg'];
	if (pickImg != null && pickImg != '') {
		imageObj.src = pickImg;
		// Create vars for drawing cropped image
		var sourceX = imageObj.width / 3;
		var sourceY = imageObj.height / 3;
		var sourceWidth = imageObj.width / 3;
		var sourceHeight = imageObj.height / 3;
		var destinationWidth = sourceWidth;
		var destinationHeight = sourceHeight;
		// Create temporary canvas for pattern
		//var tempCanvas = document.getElementById('tempCanvas');
    	//var tCtx = tempCanvas.getContext("2d");
		tempCanvas.width = sourceWidth;
		tempCanvas.height = sourceHeight;
		// Draw the cropped image on the temp canvas
		tCtx.drawImage(imageObj, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, destinationWidth, destinationHeight);
		var pattern = ctx.createPattern(tempCanvas, 'repeat');
	return pattern;  
	}
}

function get_random_color() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}
