variable "project_name" {
   type = string
   description = "Project name prefix"
}

variable "environment" {
  type = string
  description = "environment name"
}


variable "subnet_ids" {
  type = list(string)
  description = "Private database subnet ids for RDS"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID for RDS PostgreSQL"
}

variable "admin_username" {
  type        = string
  description = "Master username for PostgreSQL databases"
}

variable "admin_password" {
  type        = string
  description = "Master password for PostgreSQL databases"
  sensitive   = true
}

variable "instance_class" {
  type        = string
  description = "RDS instance compute class"
  default     = "db.t4g.medium"
}
