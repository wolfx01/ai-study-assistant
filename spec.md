json format:

{
    "name": "save",
    "description": "Save the given text to a file.",
    "parameters": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "The name to save."
            },
            "lastname": {
                "type": "string",
                "description": "The lastname to save."
            },
            "age": {
                "type": "string",
                "description": "The age to save."
            },
            "city": {
                "type": "string",
                "description": "The city to save."
            }
        },
        "required": [
            "text"
        ]
    }
}



function save(str:name ,  str:lastname , str:age , str:city){
    temp = "name :${name}\nlastname :${lastname}\nage :${age}\ncity :${city}";
    return templatetourl(temp)

}
