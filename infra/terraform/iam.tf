# IAM role for EC2 to access Secrets Manager
resource "aws_iam_role" "peerprep_ec2_role" {
  name = "peerprep-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Project = var.project_name
  }
}

# Policy to allow reading from Secrets Manager
resource "aws_iam_role_policy" "peerprep_secrets_policy" {
  name = "peerprep-secrets-policy"
  role = aws_iam_role.peerprep_ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.peerprep_secrets.arn
      }
    ]
  })
}

# Instance profile to attach role to EC2
resource "aws_iam_instance_profile" "peerprep_instance_profile" {
  name = "peerprep-instance-profile"
  role = aws_iam_role.peerprep_ec2_role.name
}