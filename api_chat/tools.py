import datetime
import math
from db import search_documents

def search_study_materials(query: str) -> str:
    return search_documents(query)
def get_current_time():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def calculate_expression(expression: str):
    allowed_names = {"math": math, "sqrt": math.sqrt, "pow": math.pow, "abs": abs}
    try:
        result = eval(expression, {"__builtins__": None}, allowed_names)
        return str(result)
    except Exception as e:
        return f"Error: {e}"

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "Returns the current date and time. Use this whenever the user asks about time or today's date.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_expression",
            "description": "Performs mathematical operations accurately. Use this whenever calculations or arithmetic are required.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The math expression to evaluate, e.g., '25 * 4 + 10'"
                    }
                },
                "required": ["expression"]
            }
        }
    },
    {
    "type": "function",
    "function": {
        "name": "search_study_materials",
        "description": "Searches the uploaded study materials and documents for relevant information. Use this whenever the user asks questions about specific concepts, notes, or uploaded content.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query or keyword to look up in the notes"
                }
            },
            "required": ["query"]
        }
    }
}
]