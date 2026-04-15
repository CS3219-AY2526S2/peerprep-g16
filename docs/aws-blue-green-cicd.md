# AWS Blue/Green CI/CD Setup

This repository deploys each app as a separate Amazon ECS service behind AWS CodeDeploy blue/green deployments.

## GitHub Configuration

Create these GitHub repository variables:

| Variable | Example | Purpose |
| --- | --- | --- |
| `AWS_REGION` | `ap-southeast-1` | AWS region for ECR, ECS, and CodeDeploy |
| `AWS_RESOURCE_PREFIX` | `peerprep` | Prefix for ECS services, task families, and CodeDeploy deployment groups |
| `ECR_REPOSITORY_PREFIX` | `peerprep` | Prefix for ECR repositories |
| `ECS_CLUSTER` | `peerprep-cluster` | ECS cluster name |
| `CODEDEPLOY_APPLICATION` | `peerprep` | CodeDeploy ECS application name |
| `VITE_USER_SERVICE_URL` | `https://api.example.com/users` | Frontend build-time URL for user-service |
| `VITE_QUESTION_SERVICE_URL` | `https://api.example.com/questions` | Frontend build-time URL for question-service |
| `VITE_COLLABORATION_SERVICE_URL` | `https://api.example.com/collaboration` | Frontend build-time URL for collaboration-service |
| `VITE_MATCHING_SERVICE_URL` | `https://api.example.com/matching` | Frontend build-time URL for matching-service |
| `VITE_JUDGE0_URL` | `https://api.example.com/executor` | Frontend build-time URL for code-executor |

Create this GitHub repository secret:

| Secret | Purpose |
| --- | --- |
| `AWS_ROLE_TO_ASSUME` | IAM role ARN trusted by GitHub Actions OIDC |

## AWS Resources Expected By The Workflow

With the default `peerprep` prefix, the workflow expects these ECR repositories:

- `peerprep-user-service`
- `peerprep-question-service`
- `peerprep-collaboration-service`
- `peerprep-matching-service`
- `peerprep-code-executor`
- `peerprep-frontend`

It also expects matching ECS services and ECS task definition families:

- `peerprep-user-service`
- `peerprep-question-service`
- `peerprep-collaboration-service`
- `peerprep-matching-service`
- `peerprep-code-executor`
- `peerprep-frontend`

For CodeDeploy, create one ECS deployment group per service using the same names above, under the `CODEDEPLOY_APPLICATION` application.

## Blue/Green Requirements

Each ECS service must use the `CODE_DEPLOY` deployment controller. Each CodeDeploy deployment group must have:

- One production listener.
- Optional test listener.
- Two target groups: blue and green.
- The ECS service, cluster, and load balancer configured.
- Rollback enabled for deployment failure and alarm failure.

Recommended target group health check paths:

| Service | Port | Health check path |
| --- | ---: | --- |
| `user-service` | `3001` | `/health` |
| `question-service` | `3002` | `/health` |
| `collaboration-service` | `3003` | `/health` |
| `matching-service` | `3004` | `/api/match/health` |
| `code-executor` | `2358` | `/health` |
| `frontend` | `5173` | `/` |

## How The Workflow Deploys

After `.github/workflows/ci.yml` succeeds on `main`, or when manually triggered, `.github/workflows/cd.yml`:

1. Builds every service image.
2. Scans each image with Trivy for critical vulnerabilities.
3. Pushes both the deployed commit SHA and `latest` tags to ECR.
4. Downloads the current ECS task definition from AWS.
5. Replaces the target container image with the new ECR image.
6. Starts a CodeDeploy blue/green deployment using the matching AppSpec file in `.aws/appspec`.

Runtime secrets such as database URLs, JWT keys, and Redis settings should live in ECS task definitions through AWS Secrets Manager or SSM Parameter Store. The pipeline intentionally reuses the current task definition so those values do not need to be committed to the repository.
