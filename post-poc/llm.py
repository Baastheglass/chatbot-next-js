import together
import json
from models import TestModelOutput, build_schema_string
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from openai import OpenAI
import re
import boto3


class Model:
    def __init__(self, 
            id: str, 
            supports_json: bool = True, 
            is_openai: bool = False, 
            use_bedrock: bool = False, 
            is_vision: bool = False,
            supports_stream: bool = False
        ):
        
        self.id = id
        self.supports_json = supports_json
        self.is_openai = is_openai
        self.use_bedrock = use_bedrock
        self.is_vision = is_vision
        self.supports_stream = supports_stream

class Models:
    llama33_70B = Model("meta-llama/Llama-3.3-70B-Instruct-Turbo", supports_json=True, supports_stream=True)
    llama31_405B = Model("meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", supports_json=False, supports_stream=True)
    llama31_405B_bedrock = Model("us.meta.llama3-1-405b-instruct-v1:0", supports_json=False, use_bedrock=True)
    llama31_8b_fp8 = Model("meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", supports_json=False, supports_stream=True)
    llama32_3b_fp16 = Model("meta-llama/Llama-3.2-3B-Instruct-Turbo", supports_json=False, supports_stream=True)
    llama3_70b_fp16 = Model("meta-llama/Llama-3-70b-chat-hf", supports_json=False, supports_stream=True)
    qwen25_32b = Model("Qwen/Qwen2.5-Coder-32B-Instruct", supports_json=False, supports_stream=True)
    gpt4omini = Model("gpt-4o-mini", supports_json=False, is_openai=True, supports_stream=True)
    gpt4o = Model("gpt-4o", supports_json=False, is_openai=True, supports_stream=True)
    

class LLM:
    def __init__(self, model: Model):
        self.model = model.id
        self.is_openai = model.is_openai
        if model.is_openai:
            self.client = OpenAI()
        else:
            self.client = together.Client()
            
        self.supports_json = model.supports_json
        self.use_bedrock = model.use_bedrock
        self.is_vision = model.is_vision
        self.supports_stream = model.supports_stream

    def _bedrock_inference(self, messages, *args, **kwargs):
        brt = boto3.client(service_name='bedrock-runtime', region_name='us-east-2')

        body = json.dumps({
            "prompt": messages[-1]['content'],
            "temperature": 0.1,
            "top_p": 0.9,
        })

        # modelId = "meta.llama3-1-405b-instruct-v1:0"
        accept = 'application/json'
        contentType = 'application/json'

        response = brt.invoke_model(body=body, modelId=self.model, accept=accept, contentType=contentType)

        response_body = json.loads(response.get('body').read())
        return response_body.get('generation')

    def _extract_json(self, response: str) -> Dict[str, Any]:
        try:
            extracted = re.findall(r'```(json)*([\s\S]*?)```', response)
            if len(extracted) == 0:
                extracted = re.findall(r'({[\s\S]*})', response)

            if len(extracted) == 0:
                raise ValueError
            elif len(extracted) != 1:
                print("*important* Incorrect format of the response. More than 1 json found. Using the first one.", response)
                response = extracted[0]

            data = extracted[0][-1] if type(extracted[0]) in [list, tuple] else extracted[0]
            return json.loads(data)
        except:
            print("\nTrying to extract json:\n")
            print(response)
            print("\n\n-------")
            raise
    
    def _extract_code(self, response):
        try:
            return re.findall(r'```python\n?([\s\S]*?)\n```', response)[0]
        except:
            return re.findall(r'```\n?([\s\S]*?)\n```', response)[0]

    def _invoke(self, messages: List[Dict[str, str]], json_format: Optional[BaseModel] = None, code: bool = False, stream=False):
        try:
            if not self.supports_stream and stream:
                raise ValueError("Stream not supported for this model")
            
            chat_function = self._bedrock_inference if self.use_bedrock else self.client.chat.completions.create
            use_parse_key = False
            
            response_format = {}
            if json_format and self.supports_json:
                messages = [
                    {
                        "role": "system",
                        "content": "Only answer in JSON."
                    },
                    *messages
                ]
                
                if self.is_openai:
                    response_format = {
                        "response_format": json_format
                    }
                    
                    chat_function = self.client.beta.chat.completions.parse
                    use_parse_key = True
                else:
                    response_format = {
                            "response_format": {
                                "type": "json_object",
                                "schema": json_format.model_json_schema()                       
                            }
                        }
            elif json_format and not self.supports_json:
                if not self.is_vision:
                    messages[-1]['content'] = messages[-1]['content'] + build_schema_string(json_format)
                else:
                    for i, content in enumerate(messages[-1]['content']):
                        if content['type'] == 'text':
                            messages[-1]['content'][i]["text"] += build_schema_string(json_format)
            
            print('---Prompt\n', messages[-1]['content'], '\n\n---')
            response = chat_function(
                messages=messages,
                model=self.model,
                temperature=0,
                **response_format,
                **({"stream": True} if stream else {}),
            )
        except Exception as e:
            print(f"LLM API error: {str(e)}")
            raise ValueError("LLM service is unavailable.")
        
        if use_parse_key:
            raw_response = response.choices[0].message.parsed
        elif self.use_bedrock:
            raw_response = response
        else:
            if stream:
                raw_response = ""
                for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content is not None and len(content) > 0:
                        raw_response += content
                        yield content
                
                yield None
            else:
                raw_response = response.choices[0].message.content
        # print(f"Raw LLM Response: {raw_response}")
        
        if isinstance(raw_response, BaseModel):
            response = raw_response.model_dump()
        elif json_format and self.supports_json:
            response = json.loads(raw_response)
        elif json_format and not self.supports_json:
            response = self._extract_json(raw_response)
        elif code:
            response = self._extract_code(raw_response)
        else:
            response = raw_response

        yield response

    def invoke(self, messages: List[Dict[str, str]], json_format: Optional[BaseModel] = None, code: bool = False, stream=False):
        response = self._invoke(messages=messages, json_format=json_format, code=code, stream=stream)
        if not stream:
            return next(response)
        else:
            return response

llm = LLM(Models.llama33_70B)

if __name__ == "__main__":
    response = llm.invoke(
        messages=[
            {
                "role": "user", 
                "content": "Analyze the following voice note:\nGood morning! It's 7:00 AM, and I'm just waking up. Today is going to be a busy day, "
                            "so let's get started. First, I need to make a quick breakfast. I think I'll have some "
                            "scrambled eggs and toast with a cup of coffee. While I'm cooking, I'll also check my "
                            "emails to see if there's anything urgent."
            }
        ], 
        json_format=TestModelOutput
    )
    print('Test Response:', json.dumps(response, indent=4))