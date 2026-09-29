variable "project_name" {
  type        = string
  description = "Project name prefix"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for ALB target groups"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs where ALB is deployed"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID for ALB"
}
