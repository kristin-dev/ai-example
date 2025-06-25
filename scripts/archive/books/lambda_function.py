import json
import boto3
import re
import traceback

def lambda_handler(event, context):
    try:
        # Handle CORS preflight requests
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response()

        # Initialize Bedrock client with explicit region
        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

        # Debug: Log the incoming event
        print(f"Received event: {json.dumps(event, default=str)}")

        # Handle different event formats
        body = None

        # API Gateway proxy integration format
        if 'body' in event and event['body'] is not None:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        # API Gateway test format (body data might be in the event root)
        elif 'text' in event:
            body = event
        # Check if the entire event is the body (direct invocation)
        elif 'httpMethod' not in event and 'resource' not in event:
            body = event
        else:
            # Try to find the body data in the event structure
            # Sometimes API Gateway puts test data in different places
            for key, value in event.items():
                if isinstance(value, dict) and 'text' in value:
                    body = value
                    break

        if body is None:
            # Log the event structure for debugging
            print(f"Could not find body in event. Event keys: {list(event.keys())}")
            if 'body' in event:
                print(f"Event body value: {event['body']}")
            raise ValueError("Could not find request body with 'text' field")

        book_description = body.get('text', '')

        if not book_description:
            return create_response(400, {
                'error': 'Missing required field: text',
                'status': 'error'
            })

        print(f"Processing book description: {book_description[:100]}...")

        # Prepare the prompt for book recommendations
        prompt = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1500,
            "messages": [
                {
                    "role": "user",
                    "content": f"""
                    You are a book recommendation expert. Based on the following description of books someone likes, please provide 10 similar book recommendations.

                    Books they like: {book_description}

                    Please format your response EXACTLY like this with clear section headers:

                    ANALYSIS:
                    [Brief analysis of the reading preferences and genres mentioned]

                    RECOMMENDATIONS:
                    1. Book Title | Author Name | Publication Year
                    2. Book Title | Author Name | Publication Year
                    3. Book Title | Author Name | Publication Year
                    4. Book Title | Author Name | Publication Year
                    5. Book Title | Author Name | Publication Year
                    6. Book Title | Author Name | Publication Year
                    7. Book Title | Author Name | Publication Year
                    8. Book Title | Author Name | Publication Year
                    9. Book Title | Author Name | Publication Year
                    10. Book Title | Author Name | Publication Year

                    REASONING:
                    [Brief explanation of why these books were recommended based on the user's preferences]

                    Make sure to use these exact section headers and format each book recommendation with the pipe (|) separator between title, author, and year."""
                }
            ]
        }

        # Call Bedrock with the correct model ID
        print("Calling Bedrock...")
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-5-sonnet-20240620-v1:0',
            body=json.dumps(prompt)
        )
        print("Bedrock call successful")

        # Parse response
        response_body = json.loads(response['body'].read())
        print(f"Response body keys: {response_body.keys()}")
        recommendation_text = response_body['content'][0]['text']

        # Parse the structured response
        parsed_recommendations = parse_recommendations(recommendation_text)

        return create_response(200, {
            'analysis': parsed_recommendations.get('analysis', ''),
            'recommendations': parsed_recommendations.get('recommendations', []),
            'reasoning': parsed_recommendations.get('reasoning', ''),
            'raw_response': recommendation_text,
            'model': 'claude-3-5-sonnet',
            'status': 'success'
        })

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print(f"Traceback: {traceback.format_exc()}")

        return create_response(500, {
            'error': str(e),
            'error_type': type(e).__name__,
            'status': 'error'
        })

def create_cors_response():
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*',
        },
        'body': ''
    }

def create_response(status_code, body_dict):
    """Helper function to ensure proper response format with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',  # Fixed typo
            'Access-Control-Max-Age': '86400',
        },
        'body': json.dumps(body_dict, ensure_ascii=False)
    }

def parse_recommendations(recommendation_text):
    """Parse the structured recommendations into separate components"""
    sections = {}

    # Extract analysis section
    analysis_match = re.search(r'ANALYSIS:\s*(.*?)(?=RECOMMENDATIONS:|$)', recommendation_text, re.DOTALL | re.IGNORECASE)
    sections['analysis'] = analysis_match.group(1).strip() if analysis_match else ''

    # Extract recommendations section
    recommendations_match = re.search(r'RECOMMENDATIONS:\s*(.*?)(?=REASONING:|$)', recommendation_text, re.DOTALL | re.IGNORECASE)
    recommendations_text = recommendations_match.group(1).strip() if recommendations_match else ''

    # Parse individual book recommendations
    recommendations = []
    if recommendations_text:
        lines = recommendations_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and re.match(r'^\d+\.', line):
                # Remove the number prefix
                book_info = re.sub(r'^\d+\.\s*', '', line)

                # Split by pipe separator
                parts = [part.strip() for part in book_info.split('|')]
                if len(parts) == 3:
                    recommendations.append({
                        'title': parts[0],
                        'author': parts[1],
                        'publication_year': parts[2]
                    })
                else:
                    # Fallback parsing if format is different
                    recommendations.append({
                        'title': book_info,
                        'author': 'Unknown',
                        'publication_year': 'Unknown'
                    })

    sections['recommendations'] = recommendations

    # Extract reasoning section
    reasoning_match = re.search(r'REASONING:\s*(.*?)$', recommendation_text, re.DOTALL | re.IGNORECASE)
    sections['reasoning'] = reasoning_match.group(1).strip() if reasoning_match else ''

    return sections
