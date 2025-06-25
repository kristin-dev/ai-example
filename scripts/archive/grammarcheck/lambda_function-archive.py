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

#                     You are a grammar checker. Please analyze this text and provide specific feedback on grammar, punctuation, and style issues:

#                     {text_to_analyze}

#                     Please format your response like this:
#                     1. Grammar Issues:
#                     2. Punctuation Issues:
#                     3. Style Suggestions:
#                     4. Corrected Version:"""
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

#         return {
#             'statusCode': 200,
#             'headers': {
#                 'Content-Type': 'application/json',
#                 'Access-Control-Allow-Origin': '*'
#             },
#             'body': json.dumps({
#                 'feedback': response_body['content'][0]['text'],
#                 'model': 'claude-3-5-sonnet',
#                 'status': 'success'
#             })
#         }

#     except Exception as e:
#         return {
#             'statusCode': 500,
#             'body': json.dumps({
#                 'error': str(e),
#                 'status': 'error'
#             })
#         }
