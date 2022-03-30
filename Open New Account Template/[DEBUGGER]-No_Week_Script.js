var dt = new Date('1/1/2016');
//set the time to 0
dt.setHours(0);
alert(dt);

var dtc = dt;

//Get first day of year
var yearStart = new Date('1/1/'+dtc.getFullYear());

//Set to nearest Thursday: current date + 4 - current day number
//Make Sunday's day number 7 instead of 0
dtc.setDate(dt.getDate() + 4 - (dtc.getDay() || 7));

alert(dtc);

//subtract first day of the year from current date and add 1 day to it.
//86400000 == 1 Day in milliseconds

//Divide # of days passed since start of the year to most recent Thursday by 7 (week)
var weekNo = Math.ceil( ( ( (dtc - yearStart) / 86400000) + 1)/7);

alert(weekNo);