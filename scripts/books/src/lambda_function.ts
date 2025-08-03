// IMPORTANT: AWS Lambda Runtime Compatibility
// This function is designed for AWS Lambda Node.js 22.x runtime
// Compatible with AWS SDK v3 latest versions

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// MAIN LAMBDA HANDLER

export const lambda_handler = async (
  event: APIGatewayProxyEvent | any,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle CORS preflight requests (OPTIONS method)
    if (event.httpMethod === 'OPTIONS') {
      return createCorsResponse();
    }

    // Initialize AWS Bedrock client (compatible with Node.js 22.x Lambda runtime)
    const bedrock = new BedrockRuntimeClient({
      region: 'us-east-1'
    } as any);

    // REQUEST BODY

    // Handle different event formats that AWS Lambda might receive
    let body: RequestBody | null = null;

    // Case 1: API Gateway proxy integration (most common)
    if (event.body !== null && event.body !== undefined) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    // Case 2: API Gateway test format (body data in event root)
    else if ('text' in event) {
      body = event as RequestBody;
    }
    // Case 3: Direct Lambda invocation (no API Gateway wrapper)
    else if (!('httpMethod' in event) && !('resource' in event)) {
      body = event as RequestBody;
    }
    // Case 4: Fallback - search for body data in event structure
    else {
      for (const [key, value] of Object.entries(event)) {
        if (typeof value === 'object' && value !== null && 'text' in value) {
          body = value as RequestBody;
          break;
        }
      }
    }

    // Validate that we found a valid request body
    if (body === null) {
      console.log(`Could not find body in event. Event keys: ${Object.keys(event)}`);
      if ('body' in event) {
        console.log(`Event body value: ${event.body}`);
      }
      throw new Error("Could not find request body with 'text' field");
    }

    // Extract and validate the book description
    const bookDescription = body.text || '';
    if (!bookDescription) {
      return createResponse(400, {
        error: 'Missing required field: text',
        status: 'error'
      });
    }

    console.log(`Processing book description: ${bookDescription.substring(0, 100)}...`);

    // LET'S TALK TO BEDROCK AND ASK IT FOR THINGS (Prompt Engineering)

    // Construct the prompt for Claude to generate book recommendations as JSON
    const prompt = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are a book recommendation expert. Based on the following description of books someone likes, please provide 10 similar book recommendations.

Books they like: ${bookDescription}

Please respond with ONLY a valid JSON object in this exact format:
{
  "analysis": "Brief analysis of the reading preferences and genres mentioned",
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "publication_year": "Year"
    }
  ],
  "reasoning": "Brief explanation of why these books were recommended based on the user's preferences"
}

Make sure to include exactly 10 book recommendations in the recommendations array. Return only valid JSON with no additional text.`
        }
      ]
    };

    console.log("Prompt payload:", JSON.stringify(prompt, null, 2));

    // Send request to Claude via AWS Bedrock
    console.log("Calling Bedrock...");
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      contentType: 'application/json',
      body: JSON.stringify(prompt)
    });

    const response = await bedrock.send(command as any);
    console.log("Bedrock call successful");
    console.log("Response status:", response.$metadata?.httpStatusCode);

    // PROCESS THE RESPONSE

    // Validate that we received a response body
    const responseBodyRaw = (response as any).body;
    if (!responseBodyRaw) {
      throw new Error("No response body received from Bedrock");
    }

    // Decode the response body from Uint8Array (AWS SDK v3) to string
    const responseBodyBytes = new TextDecoder().decode(responseBodyRaw);
    console.log("Raw response body (first 200 chars):", responseBodyBytes.substring(0, 200));

    // Parse the JSON response with error handling
    let parsedResponseBody;
    try {
      parsedResponseBody = JSON.parse(responseBodyBytes);
    } catch (parseError) {
      console.error("Failed to parse Bedrock response as JSON:", parseError);
      console.error("Full response body:", responseBodyBytes);
      throw new Error(`Invalid JSON response from Bedrock: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

    console.log(`Response body keys: ${Object.keys(parsedResponseBody)}`);

    // Validate response structure
    if (!parsedResponseBody.content || !Array.isArray(parsedResponseBody.content) || parsedResponseBody.content.length === 0) {
      console.error("Unexpected response structure:", parsedResponseBody);
      throw new Error("Invalid response structure from Bedrock");
    }

    // Extract and parse the JSON recommendation from Claude's response
    const recommendationText = parsedResponseBody.content[0].text;

    // Parse Claude's JSON response directly
    let parsedRecommendations: ParsedRecommendations;
    try {
      parsedRecommendations = JSON.parse(recommendationText);
    } catch (jsonError) {
      console.error("Failed to parse Claude's JSON response:", jsonError);
      console.error("Claude's raw response:", recommendationText);
      throw new Error(`Invalid JSON response from Claude: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`);
    }

    // Check the parsed response has all the right parts
    if (!parsedRecommendations.analysis || !parsedRecommendations.recommendations || !parsedRecommendations.reasoning) {
      console.error("Missing required fields in Claude's response:", parsedRecommendations);
      throw new Error("Claude's response is missing required fields (analysis, recommendations, or reasoning)");
    }

    if (!Array.isArray(parsedRecommendations.recommendations)) {
      throw new Error("Recommendations field is not an array");
    }

    // Return successful response with good JSON data
    return createResponse(200, {
      analysis: parsedRecommendations.analysis,
      recommendations: parsedRecommendations.recommendations,
      reasoning: parsedRecommendations.reasoning,
      raw_response: recommendationText,
      model: 'claude-3-5-sonnet',
      status: 'success'
    });

  } catch (error) {
    const err = error as Error;
    console.log(`Error occurred: ${err.message}`);
    console.log(`Error type: ${err.constructor.name}`);
    console.log(`Stack trace: ${err.stack}`);

    return createResponse(500, {
      error: err.message,
      error_type: err.constructor.name,
      status: 'error'
    });
  }
};

function createCorsResponse(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
    },
    body: ''
  };
}

function createResponse(statusCode: number, bodyDict: SuccessResponse | ErrorResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
    body: JSON.stringify(bodyDict)
  };
}

// TYPES USED IN THIS FUNCTION

interface BookRecommendation {
  title: string;
  author: string;
  publication_year: string;
  pizza?: string; // TODO: Remove this unused property
}

interface ParsedRecommendations {
  analysis: string;
  recommendations: BookRecommendation[];
  reasoning: string;
}

interface RequestBody {
  text: string;
}

interface SuccessResponse {
  analysis: string;
  recommendations: BookRecommendation[];
  reasoning: string;
  raw_response: string;
  model: string;
  status: string;
}

interface ErrorResponse {
  error: string;
  error_type?: string;
  status: string;
}
