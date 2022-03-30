/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Dec 2015     json
 *
 */

var icstext = 'BEGIN:VCALENDAR\n'+
			  'VERSION:2.0\n'+
			  'PRODID:-//NetSuite//Event Time//EN\n'+
			  'BEGIN:VEVENT\n'+
			  'TZID:Pacific Standard Time\n'+
			  'UID:test@test.com\n'+
			  'DTSTAMP:20151210T100000Z\n'+
			  'ORGANIZER;CN=Joe Son:MAILTO:test@test.com\n'+
			  'DTSTART:20151210T100000Z\n'+
			  'DTEND:20151210T110000Z\n'+
			  'SUMMARY:Setster Event Demo\n'+
			  'DESCRIPTION:Details of the event'+
			  'END:VEVENT\n'+
			  'END:VCALENDAR';

var icsfile = nlapiCreateFile('event.ics', 'PLAINTEXT', icstext);

nlapiSendEmail(-5, 'joe.son@audaxium.com', 'Setster Event Demo', 'Dear Blah Blah blah. Below are appt. detail. Save me', null, null, null, icsfile);