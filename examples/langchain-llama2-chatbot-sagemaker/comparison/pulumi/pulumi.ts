// Not verified if it'll work.
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Initialize Pulumi configuration
const config = new pulumi.Config();
const stageName = config.require("stageName");
const codeDir = config.require("codeDir");
const huggingFaceToken = config.requireSecret("huggingFaceToken"); // Use Pulumi's secrets for sensitive data

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

// Lambda function
const lambdaFunction = new aws.lambda.Function("lambda-function", {
  code: new pulumi.asset.FileArchive(codeDir),
  role: lambdaRole.arn,
  handler: "main.handler",
  runtime: aws.lambda.Runtime.NodeJS18dX,
  environment: {
    variables: {},
  },
  timeout: 600, // 10 minutes
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
  routeKey: "POST /hello",
  target: pulumi.interpolate`integrations/${integration.id}`,
});

// API Gateway permissions for Lambda
const permission = new aws.lambda.Permission("api-lambda-permission", {
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
const stage = new aws.apigatewayv2.Stage(
  "api-stage",
  {
    apiId: api.id,
    deploymentId: deployment.id,
    name: stageName,
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
      name: "Id",
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

// Export the API endpoint URL
export const apiEndpointUrl = api.apiEndpoint;

// Export the SageMaker endpoint name
export const sagemakerEndpointName = sagemakerEndpoint.name;

// Export the DynamoDB table name
export const dynamoDbTableName = dynamoDbTable.name;
