/**
 * Not working. The following error is thrown during runtime:
 * ```
 * {
 *     "errorType": "Runtime.UserCodeSyntaxError",
 *     "errorMessage": "SyntaxError: Identifier 'exports' has already been declared",
 *     "stack": [
 *         "Runtime.UserCodeSyntaxError: SyntaxError: Identifier 'exports' has already been declared",
 *         "    at _loadUserApp (file:///var/runtime/index.mjs:1084:17)",
 *         "    at async UserFunction.js.module.exports.load (file:///var/runtime/index.mjs:1119:21)",
 *         "    at async start (file:///var/runtime/index.mjs:1282:23)",
 *         "    at async file:///var/runtime/index.mjs:1288:1"
 *     ]
 * }
 * ```
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Initialize Pulumi configuration
const config = new pulumi.Config();
const stageName = config.require("stageName");
const huggingFaceToken = config.requireSecret("huggingFaceToken"); // Use Pulumi's secrets for sensitive data

const PARTITION_KEY = "Id";

// Lambda IAM role policy document
const lambdaPolicyDoc = aws.iam.getPolicyDocumentOutput({
  statements: [
    {
      actions: ["sts:AssumeRole"],
      effect: "Allow",
      principals: [
        {
          identifiers: ["lambda.amazonaws.com"],
          type: "Service",
        },
      ],
    },
  ],
});

// Lambda IAM role
const lambdaRole = new aws.iam.Role("lambda-role", {
  assumeRolePolicy: lambdaPolicyDoc.json,
});

const lambdaFunction = new aws.lambda.CallbackFunction("lambda-function", {
  callback: async (event: any) => {
    const queries = event.queryStringParameters ?? {};
    const sessionId = Array.isArray(queries["sessionid"])
      ? queries["sessionid"][0]
      : queries["sessionid"];
    const query = Array.isArray(queries["query"]) ? queries["query"][0] : queries["query"];
    if (!sessionId || !query) {
      return {
        statusCode: 400,
        body: "Both sessionid and query are required.",
      };
    }

    const combinedArgs = pulumi.all([sagemakerEndpoint.name, dynamoDbTable.name]);
    return combinedArgs.apply(async ([endpointName, tableName]) => {
      const chat = (await import("./app")).chat;
      const result = chat(endpointName, tableName, PARTITION_KEY, sessionId, query);
      return {
        statusCode: 200,
        body: result,
      };
    });
  },
  role: lambdaRole.arn,
  runtime: aws.lambda.Runtime.NodeJS18dX,
  timeout: 600,
});

// API Gateway
const api = new aws.apigatewayv2.Api("api", {
  protocolType: "HTTP",
});

// API Gateway integration
const integration = new aws.apigatewayv2.Integration("integration", {
  apiId: api.id,
  integrationType: "AWS_PROXY",
  integrationMethod: "POST",
  integrationUri: lambdaFunction.invokeArn,
  timeoutMilliseconds: 30000,
});

// API Gateway route
const route = new aws.apigatewayv2.Route("route", {
  apiId: api.id,
  routeKey: "GET /chat",
  target: pulumi.interpolate`integrations/${integration.id}`,
});

// API Gateway permissions for Lambda
new aws.lambda.Permission("api-lambda-permission", {
  action: "lambda:InvokeFunction",
  function: lambdaFunction.name,
  principal: "apigateway.amazonaws.com",
  sourceArn: pulumi.interpolate`${api.executionArn}/*`,
});

// API Gateway deployment
const deployment = new aws.apigatewayv2.Deployment(
  "deployment",
  {
    apiId: api.id,
  },
  { dependsOn: [route] }
);

// API Gateway stage
new aws.apigatewayv2.Stage(
  "api-stage",
  {
    apiId: api.id,
    deploymentId: deployment.id,
    name: stageName,
    autoDeploy: true,
    accessLogSettings: {
      destinationArn: pulumi.interpolate`${
        new aws.cloudwatch.LogGroup("api-loggroup", {
          retentionInDays: 7,
        }).arn
      }`,
      format: `$context.identity.sourceIp - - [$context.requestTime] "$context.httpMethod $context.routeKey $context.protocol" $context.status $context.responseLength $context.requestId $context.integrationErrorMessage $context.error.messageString $context.error.responseType`,
    },
  }, // Depends on deployment to ensure the API stage is created after deployment
  { dependsOn: [deployment] }
);

// SageMaker execution role
const sageMakerExecutionRole = new aws.iam.Role("sagemaker-role", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "sagemaker.amazonaws.com",
        },
      },
    ],
  }),
});

// SageMaker policy attachment
new aws.iam.RolePolicyAttachment("sagemaker-policy-attachment", {
  role: sageMakerExecutionRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess",
});

// SageMaker model
const sagemakerModel = new aws.sagemaker.Model("sagemaker-model", {
  executionRoleArn: sageMakerExecutionRole.arn,
  primaryContainer: {
    image:
      "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
    environment: {
      HF_MODEL_ID: "meta-llama/Llama-2-7b-chat-hf",
      HF_TASK: "text-classification",
      HUGGING_FACE_HUB_TOKEN: huggingFaceToken,
    },
  },
});

// SageMaker endpoint configuration
const endpointConfig = new aws.sagemaker.EndpointConfiguration("sagemaker-endpoint-config", {
  productionVariants: [
    {
      instanceType: "ml.g5.2xlarge",
      modelName: sagemakerModel.name,
      initialInstanceCount: 1,
      variantName: "AllTraffic",
    },
  ],
});

// SageMaker endpoint
const sagemakerEndpoint = new aws.sagemaker.Endpoint("sagemaker-endpoint", {
  endpointConfigName: endpointConfig.name,
});

// DynamoDB table
const dynamoDbTable = new aws.dynamodb.Table("dynamodb-table", {
  attributes: [
    {
      name: PARTITION_KEY,
      type: "S",
    },
  ],
  hashKey: "Id",
  billingMode: "PAY_PER_REQUEST",
});

// IAM policy for Lambda function to access DynamoDB and SageMaker
const policyDocument = aws.iam.getPolicyDocumentOutput({
  statements: [
    {
      actions: ["dynamodb:*"],
      effect: "Allow",
      resources: [dynamoDbTable.arn],
    },
    {
      actions: ["sagemaker:InvokeEndpoint"],
      effect: "Allow",
      resources: [sagemakerEndpoint.arn],
    },
  ],
});

// IAM policy
const lambdaAccessPolicy = new aws.iam.Policy("lambda-access-policy", {
  path: "/",
  description: "Policy for Lambda Function to access resources",
  policy: policyDocument.json,
});

// Attach the IAM policy to Lambda role
new aws.iam.RolePolicyAttachment("lambda-policy-attachment", {
  role: lambdaRole.name,
  policyArn: lambdaAccessPolicy.arn,
});

new aws.iam.RolePolicyAttachment("cloudwatch-policy-attachment", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// Export the API endpoint URL
export const apiEndpointUrl = api.apiEndpoint;

// Export the SageMaker endpoint name
export const sagemakerEndpointName = sagemakerEndpoint.name;

// Export the DynamoDB table name
export const dynamoDbTableName = dynamoDbTable.name;
