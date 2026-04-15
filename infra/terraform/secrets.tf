# Secrets Manager

# DO NOT update actual values here
# Update should happen via AWS console or CLI

resource "aws_secretsmanager_secret" "peerprep_secrets" {
  name        = "${var.project_name}/secrets"
  description = "PeerPrep application secrets"

  tags = {
    Project = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "peerprep_secrets_version" {
  secret_id = aws_secretsmanager_secret.peerprep_secrets.id
  secret_string = jsonencode({
    MONGO_USERNAME        = "placeholder"
    MONGO_PASSWORD        = "placeholder"
    DB_CLOUD_URI          = "placeholder"
    JWT_SECRET            = "placeholder"
    JWT_REFRESH_SECRET    = "placeholder"
    ENCRYPTION_KEY        = "placeholder"
    ENCRYPTION_IV         = "placeholder"
    QUESTION_SERVICE_MONGODB_URI = "placeholder"
    COLLAB_MONGODB_URI = "placeholder"
    JUDGE0_POSTGRES_DB    = "placeholder"
    JUDGE0_POSTGRES_USER  = "placeholder"
    JUDGE0_POSTGRES_PASSWORD = "placeholder"
    PUBLIC_IP= "placeholder"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}