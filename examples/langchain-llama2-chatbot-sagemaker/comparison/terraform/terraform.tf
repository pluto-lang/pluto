# Not verified if it'll work.
terraform {
  required_version = ">= 0.12"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Initialize Terraform variables
variable "stageName" {
  type        = string
  description = "The name of the stage for the API Gateway."
}

variable "codeDir" {
  type        = string
  description = "The directory where the Lambda function code is located."
}

variable "huggingFaceToken" {
  type        = string
  description = "Secret token for Hugging Face API."
  sensitive   = true
}

# Use locals for common tags
locals {
  common_tags = {
    ManagedBy = "Terraform"
  }
}

# Lambda IAM role policy document
data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# Lambda IAM role
resource "aws_iam_role" "lambda_role" {
  name               = "lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
  tags               = local.common_tags
}

# Lambda function
resource "aws_lambda_function" "lambda_function" {
  function_name = "lambda-function"
  handler       = "main.handler"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs18.x"

  source_code_hash = filebase64sha256("${var.codeDir}/lambda.zip")
  filename         = "${var.codeDir}/lambda.zip"

  environment {
    variables = {
      HUGGING_FACE_TOKEN = var.huggingFaceToken
    }
  }

  timeout = 600 # 10 minutes
  tags    = local.common_tags
}

# API Gateway
resource "aws_apigatewayv2_api" "api" {
  name          = "api"
  protocol_type = "HTTP"
  tags          = local.common_tags
}

# API Gateway integration
resource "aws_apigatewayv2_integration" "integration" {
  api_id               = aws_apigatewayv2_api.api.id
  integration_type     = "AWS_PROXY"
  integration_method   = "POST"
  integration_uri      = aws_lambda_function.lambda_function.invoke_arn
  timeout_milliseconds = 30000
}

# API Gateway route
resource "aws_apigatewayv2_route" "route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /hello"
  target    = "integrations/${aws_apigatewayv2_integration.integration.id}"
}

# API Gateway permissions for Lambda
resource "aws_lambda_permission" "api_lambda_permission" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*"
}

# API Gateway deployment
resource "aws_apigatewayv2_deployment" "deployment" {
  api_id = aws_apigatewayv2_api.api.id
  # A lifecycle block is used to ensure the deployment is re-created when the route changes
  lifecycle {
    create_before_destroy = true
  }
  depends_on = [
    aws_apigatewayv2_route.route
  ]
}

# API Gateway stage
resource "aws_apigatewayv2_stage" "stage" {
  api_id        = aws_apigatewayv2_api.api.id
  name          = var.stageName
  deployment_id = aws_apigatewayv2_deployment.deployment.id

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_loggroup.arn
    format          = "$context.identity.sourceIp - - [$context.requestTime] \"$context.httpMethod $context.routeKey $context.protocol\" $context.status $context.responseLength $context.requestId $context.integrationErrorMessage $context.error.messageString $context.error.responseType"
  }

  tags = local.common_tags
}

# CloudWatch log group for API Gateway
resource "aws_cloudwatch_log_group" "api_loggroup" {
  name              = "api-loggroup"
  retention_in_days = 7
  tags              = local.common_tags
}

# SageMaker execution role
resource "aws_iam_role" "sagemaker_role" {
  name = "sagemaker-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "sagemaker.amazonaws.com"
      }
    }]
  })
  tags = local.common_tags
}

# SageMaker policy attachment
resource "aws_iam_role_policy_attachment" "sagemaker_policy_attachment" {
  role       = aws_iam_role.sagemaker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

# SageMaker model
resource "aws_sagemaker_model" "sagemaker_model" {
  name               = "sagemaker-model"
  execution_role_arn = aws_iam_role.sagemaker_role.arn

  primary_container {
    image = "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04"
    environment = {
      HF_MODEL_ID = "meta-llama/Llama-2-7b-chat-hf"
      HF_TASK     = "text-classification"
      // Sensitive data is referenced through variables and marked as sensitive
      HUGGING_FACE_HUB_TOKEN = var.huggingFaceToken
    }
  }
  tags = local.common_tags
}

# SageMaker endpoint configuration
resource "aws_sagemaker_endpoint_configuration" "endpoint_config" {
  name = "sagemaker-endpoint-config"

  production_variants {
    instance_type          = "ml.g5.2xlarge"
    model_name             = aws_sagemaker_model.sagemaker_model.name
    initial_instance_count = 1
    variant_name           = "AllTraffic"
  }
  tags = local.common_tags
}

# SageMaker endpoint
resource "aws_sagemaker_endpoint" "sagemaker_endpoint" {
  name                 = "sagemaker-endpoint"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.endpoint_config.name
  tags                 = local.common_tags
}

# DynamoDB table
resource "aws_dynamodb_table" "dynamodb_table" {
  name         = "dynamodb-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "Id"

  attribute {
    name = "Id"
    type = "S"
  }
  tags = local.common_tags
}

# IAM policy for Lambda function to access DynamoDB and SageMaker
data "aws_iam_policy_document" "lambda_access_policy_doc" {
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem"
    ]
    effect    = "Allow"
    resources = [aws_dynamodb_table.dynamodb_table.arn]
  }

  statement {
    actions   = ["sagemaker:InvokeEndpoint"]
    effect    = "Allow"
    resources = [aws_sagemaker_endpoint.sagemaker_endpoint.arn]
  }
}

# IAM policy
resource "aws_iam_policy" "lambda_access_policy" {
  name        = "lambda-access-policy"
  policy      = data.aws_iam_policy_document.lambda_access_policy_doc.json
  description = "IAM policy for Lambda to access DynamoDB and SageMaker"
  tags        = local.common_tags
}

# Attach the IAM policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_access_policy.arn
}

# Outputs
output "api_endpoint_url" {
  value       = aws_apigatewayv2_api.api.api_endpoint
  description = "The URL of the API endpoint."
}

output "sagemaker_endpoint_name" {
  value       = aws_sagemaker_endpoint.sagemaker_endpoint.name
  description = "The name of the SageMaker endpoint."
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.dynamodb_table.name
  description = "The name of the DynamoDB table."
}

