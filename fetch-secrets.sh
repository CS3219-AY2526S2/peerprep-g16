#!/bin/bash

echo "Fetching secrets from AWS Secrets Manager..."

SECRET=$(aws secretsmanager get-secret-value \
  --secret-id peerprep-g16/secrets \
  --region ap-southeast-1 \
  --query SecretString \
  --output text)

# Parse JSON and write to .env
echo $SECRET | python3 -c "
import json, sys
secrets = json.load(sys.stdin)
with open('.env', 'w') as f:
    for key, value in secrets.items():
        f.write(f'{key}={value}\n')
"

echo ".env file generated successfully"
