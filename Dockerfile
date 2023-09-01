FROM public.ecr.aws/lambda/nodejs:16

WORKDIR /app

# Copy function code
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY node_modules /app/node_modules
COPY .dapr /.dapr
COPY deploy/aws/dapr /.dapr/components
COPY dist /app

# RUN npm install

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "/app/aws-runtime.handler" ]