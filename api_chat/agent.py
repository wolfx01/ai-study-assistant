import json
import os
from dotenv import load_dotenv
from openai import OpenAI
from tools import TOOLS_SCHEMA, get_current_time, calculate_expression, search_study_materials


load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


AVAILABLE_TOOLS = {
    "get_current_time": get_current_time,
    "calculate_expression": calculate_expression,
    "search_study_materials": search_study_materials
}

def ask_agent(user_prompt: str):
    messages = [
        {"role": "system", "content": "You are a helpful AI Study Assistant. Use tools when needed."},
        {"role": "user", "content": user_prompt}
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=TOOLS_SCHEMA,
        tool_choice="auto"
    )

    response_message = response.choices[0].message

    
    if response_message.tool_calls:
        
        messages.append(response_message)

        
        for tool_call in response_message.tool_calls:
            function_name = tool_call.function.name
            function_to_call = AVAILABLE_TOOLS[function_name]
            function_args = json.loads(tool_call.function.arguments)

            print(f"-> [Agent Decision]: Executing '{function_name}' with args: {function_args}")

        
            if function_name == "get_current_time":
                tool_result = function_to_call()
            else:
                tool_result = function_to_call(**function_args)

            
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": str(tool_result)
            })

        
        final_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        return final_response.choices[0].message.content

    return response_message.content


if __name__ == "__main__":
    print("Test 1 (Math):")
    print(ask_agent("What is (450 * 12) + 85?"))

    print("\nTest 2 (Time):")
    print(ask_agent("What is the current time and date?"))

    print("\nTest 3 (Normal Chat):")
    print(ask_agent("Hello! Who are you?"))