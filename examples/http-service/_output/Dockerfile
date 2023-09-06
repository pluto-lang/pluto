FROM public.ecr.aws/lambda/nodejs:16

WORKDIR /app

# Copy function code
COPY dist /app

# RUN npm install

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "/app/aws-runtime.handler" ]