/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Jun 2016     WORK-rehanlakhani
 *
 */
function countries(country)
{
	if(country != null)
	{
		switch(country)
		{
			case "American Samoa":
			case "Anguilla":
			case "Antigua and Barbuda":
			case "Argentina":
			case "Aruba":
			case "Bahamas":
			case "Barbados":
			case "Belize":
			case "Bermuda":
			case "Bolivia":
			case "Brazil":
			case "Canada":
			case "Cayman Islands":
			case "Chile":
			case "Colombia":
			case "Costa Rica":
			case "Cuba":
			case "Dominica":
			case "Dominican Republic":
			case "Ecuador":
			case "El Salvador":
			case "Falkland Islands (Malvina)":
			case "French Guiana":
			case "French Polynesia":
			case "Grenada":
			case "Guadeloupe":
			case "Guatemala":
			case "Guyana":
			case "Haiti":
			case "Honduras":
			case "Jamaica":
			case "Martinique":
			case "Mexico":
			case "Montserrat":
			case "Netherlands Antilles":
			case "Nicaragua":
			case "Panama":
			case "Paraguay":
			case "Peru":
			case "Pitcairn Island":
			case "Puerto Rico":
			case "Reunion Island":
			case "Saint Barthélemy":
			case "Saint Kitts and Nevis":
			case "Saint Lucia":
			case "Saint Martin":
			case "Saint Vincent and Grendaines":
			case "South Georgia":
			case "St. Pierre and Miquelon":
			case "Suriname":
			case "Trinidad and Tobago":
			case "Turks and Caicos Islands":
			case "United States":
			case "Uruguay":
			case "US Minor Outlying Islands":
			case "Venezuela":
			case "Virgin Islands, British":
			case "Virgin Islands, USA":
				return "Americas";
				break;
			default:
				return "Other";
				break;
		}
	}
}