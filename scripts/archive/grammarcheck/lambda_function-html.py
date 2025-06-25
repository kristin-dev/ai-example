# import json
# import boto3
# import os

# def lambda_handler(event, context):
#     # Initialize Bedrock client
#     bedrock = boto3.client('bedrock-runtime')

#     try:
#         # Extract text from API Gateway event
#         body = json.loads(event['body'])
#         text_to_analyze = body.get('text', '')

#         # Prepare the prompt for grammar analysis
#         prompt = {
#             "anthropic_version": "bedrock-2023-05-31",
#             "max_tokens": 1000,
#             "messages": [
#                 {
#                     "role": "user",
#                     "content": f"""
#                     You are a grammar checker. Analyze this text and provide feedback:

#                     {text_to_analyze}

#                     Respond in this exact format - no lists, no explanations, just these three sections:

#                     ORIGINAL_WITH_HIGHLIGHTS: The original text with grammar and punctuation issues wrapped in <b> tags

#                     SUGGESTED_TEXT: A corrected version of the text

#                     STYLE_SUGGESTIONS: Brief style suggestions
#                     """
#                 }
#             ]
#         }

#         # Call Bedrock with the correct model ID
#         response = bedrock.invoke_model(
#             modelId='anthropic.claude-3-5-sonnet-20240620-v1:0',
#             body=json.dumps(prompt)
#         )

#         # Parse response
#         response_body = json.loads(response['body'].read())
#         raw_feedback = response_body['content'][0]['text']

#         # Parse the sections from Claude's response
#         sections = {}
#         current_section = None

#         for line in raw_feedback.split('\n'):
#             if "ORIGINAL_WITH_HIGHLIGHTS:" in line:
#                 current_section = "original"
#                 sections[current_section] = ""
#             elif "SUGGESTED_TEXT:" in line:
#                 current_section = "suggested"
#                 sections[current_section] = ""
#             elif "STYLE_SUGGESTIONS:" in line:
#                 current_section = "style"
#                 sections[current_section] = ""
#             elif current_section is not None and line.strip():
#                 sections[current_section] += line + "\n"

#         # Format the response with the requested HTML structure
#         grammar_html = f"<div class=\"grammar-punctuation\">{sections.get('original', '').strip()}</div>"
#         suggested_html = f"<div class=\"suggested\">{sections.get('suggested', '').strip()}</div>"
#         style_html = f"<div class=\"style\">{sections.get('style', '').strip()}</div>"

#         # Combine all HTML sections into one block
#         combined_html = f"{grammar_html}\n{suggested_html}\n{style_html}"

#         formatted_response = {
#             'grammar_punctuation': grammar_html,
#             'suggested': suggested_html,
#             'style': style_html,
#             'combined_html': combined_html,
#             'model': 'claude-3-5-sonnet',
#             'status': 'success'
#         }

#         return {
#             'statusCode': 200,
#             'headers': {
#                 'Content-Type': 'application/json',
#                 'Access-Control-Allow-Origin': '*'
#             },
#             'body': json.dumps(formatted_response)
#         }

#     except Exception as e:
#         return {
#             'statusCode': 500,
#             'body': json.dumps({
#                 'error': str(e),
#                 'status': 'error'
#             })
#         }
