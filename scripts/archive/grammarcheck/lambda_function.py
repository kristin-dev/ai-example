import json
import boto3
import re

def lambda_handler(event, context):
    # Initialize Bedrock client
    bedrock = boto3.client('bedrock-runtime')

    try:
        # Extract text from API Gateway event
        body = json.loads(event['body'])
        text_to_analyze = body.get('text', '')

        # Prepare the prompt for grammar analysis
        prompt = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": f"""
                    You are a grammar checker. Please analyze this text and provide specific feedback on grammar, punctuation, and style issues:

                    {text_to_analyze}

                    Please format your response EXACTLY like this with clear section headers:

                    GRAMMAR ISSUES:
                    [List grammar issues here, or write "None found" if no issues]

                    PUNCTUATION ISSUES:
                    [List punctuation issues here, or write "None found" if no issues]

                    STYLE SUGGESTIONS:
                    [List style suggestions here, or write "None found" if no suggestions]

                    CORRECTED VERSION:
                    [Provide the corrected text here]

                    STYLE ENHANCED VERSION:
                    [Provide a style-enhanced version here]

                    Make sure to use these exact section headers and separate each section clearly."""
                }
            ]
        }

        # Call Bedrock with the correct model ID
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-5-sonnet-20240620-v1:0',
            body=json.dumps(prompt)
        )

        # Parse response
        response_body = json.loads(response['body'].read())
        feedback_text = response_body['content'][0]['text']

        # Parse the structured response
        parsed_feedback = parse_feedback(feedback_text)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'grammar_issues': parsed_feedback.get('grammar_issues', ''),
                'punctuation_issues': parsed_feedback.get('punctuation_issues', ''),
                'style_suggestions': parsed_feedback.get('style_suggestions', ''),
                'corrected_version': parsed_feedback.get('corrected_version', ''),
                'style_enhanced_version': parsed_feedback.get('style_enhanced_version', ''),
                'raw_feedback': feedback_text,  # Keep original for debugging
                'model': 'claude-3-5-sonnet',
                'status': 'success'
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'status': 'error'
            })
        }

def parse_feedback(feedback_text):
    """Parse the structured feedback into separate components"""
    sections = {}

    # Define section patterns
    patterns = {
        'grammar_issues': r'GRAMMAR ISSUES:\s*(.*?)(?=PUNCTUATION ISSUES:|$)',
        'punctuation_issues': r'PUNCTUATION ISSUES:\s*(.*?)(?=STYLE SUGGESTIONS:|$)',
        'style_suggestions': r'STYLE SUGGESTIONS:\s*(.*?)(?=CORRECTED VERSION:|$)',
        'corrected_version': r'CORRECTED VERSION:\s*(.*?)(?=STYLE ENHANCED VERSION:|$)',
        'style_enhanced_version': r'STYLE ENHANCED VERSION:\s*(.*?)$'
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, feedback_text, re.DOTALL | re.IGNORECASE)
        if match:
            sections[key] = match.group(1).strip()
        else:
            sections[key] = ''

    return sections
