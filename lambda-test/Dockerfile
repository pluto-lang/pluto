FROM public.ecr.aws/lambda/nodejs:16

# Copy function code
COPY index.js /app/index.js

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "/app/index.handler" ]