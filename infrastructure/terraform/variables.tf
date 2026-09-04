variable "aws_region" {
  description = "The AWS region to deploy infrastructure into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "The name of the project prefix for all resources"
  type        = string
  default     = "waave"
}