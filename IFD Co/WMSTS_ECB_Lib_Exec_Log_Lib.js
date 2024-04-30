define([],
    function() {
        var obj = {
         
            "postpacking": {
                "Request Success": {
                    "en": {
                        "status": "true",
                        "statusMessage": "Request Completed Successfully"
                    }                   
                },  
                "Request Failed": {
                    "en": {
                        "status": "false",
                        "statusMessage": "Request Failed "
                    }
                },
                "Committed Qty Issue": {
                    "en": {
                        "status": "false",
                        "statusMessage": "Pick Quantity for the Sales Order, Order Line , and Item , cannot be greater than the Expected Quantity from the Original Order Line."
                    }
                },
                "Preferred Bin Issue": {
                    "en": {
                        "status": "false",
                        "statusMessage": "Entered bin is not a Preferred Bin."
                    }
                },
                "Cannot Delete": {
                    "en": {
                        "status": "false",
                        "statusMessage": "We cannot DELETE a PICK Task once processed as it is not in the scope of the design "
                    }
                },
                "GetInput Failed": {
                    "en": {
                        "status": "true",
                        "statusMessage": "Request failed to process GetInput data"
                    }                   
                }, 
                "Reduce Failed": {
                    "en": {
                        "status": "true",
                        "statusMessage": "Request failed to post Item Fulfillment"
                    }                   
                },  
                "BFC Update Failed": {
                    "en": {
                        "status": "true",
                        "statusMessage": "Request failed to udpate BFC record status to Procesed"
                    }                   
                },  
                "GetLOTInfo Failed": {
                    "en": {
                        "status": "true",
                        "statusMessage": "Request failed to get LOTS with Expiry dates on FEFO based"
                    }                   
                }, 
                "Validation Success": {
                    "en": {
                        "status": "true",
                        "statusMessage": "Validation Completed Successfully"
                    }
                },
                "No Input" : {
                    "en" : {
                        "status": "false",
                        "statusMessage": "No Input"
                    }
                },
                "Bad Input JSON": {
                    "en": {
                        "status": "false",
                        "statusMessage": "Validate if the input passed is a valid JSON type value"
                    }
                },                
                "No sufficient inventory": {
                    "en": {
                        "status": "false",
                        "statusMessage": "There is no sufficient inventory to process the Pick , Order Line and Item"
                    }
                },
              
                "Values should not be null": {
                    "en": {
                        "status": "false",
                        "statusMessage": "Please correct the input vlaues"
                    }
                },
                "Duplicate Data": {
                    "en": {
                        "status": "false",
                        "statusMessage": "Data sent for the Sales Order , Order Line and Item is a duplicate send"
                    }
                },
                "Act Qty Issue": {
                    "en": {
                        "status": "false",
                        "statusMessage": "Pick Quantity for the Sales Order , Order Line , and Item cannot be greater than the Expected Quantity from the Original Order Line."
                    }
                },
                "Not a valid Transaction": {
                    "en": {
                        "status": "false",
                        "statusMessage": "Pick Data sent for the Sales Order, Order Line and Item is not valid line'"
                    }
                }
              
                
            }
          
        }
        return obj;
    });
    