variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "EC2 key pair name"
  type        = string
  default     = "peerprep_key"
}

variable "project_name" {
  description = "Project name used for tagging resources"
  type        = string
  default     = "peerprep-g16"
}