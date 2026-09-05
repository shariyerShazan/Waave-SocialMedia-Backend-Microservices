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

# Network Variables
variable "vpc_cidr" {
  description = "CIDR block for the main VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to distribute resources across"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private application subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
}

variable "private_db_subnet_cidrs" {
  description = "CIDR blocks for private database and data storage subnets"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]
}

# PostgreSQL Database Credentials
variable "postgres_admin_user" {
  description = "Master username for PostgreSQL RDS instances"
  type        = string
  default     = "postgres"
}

variable "postgres_admin_password" {
  description = "Master password for PostgreSQL RDS instances"
  type        = string
  sensitive   = true
  default     = "WaaveSecurePass123!"
}

variable "postgres_instance_class" {
  description = "Instance class for RDS PostgreSQL instances"
  type        = string
  default     = "db.t4g.medium"
}

# DocumentDB MongoDB Credentials
variable "documentdb_admin_user" {
  description = "Master username for DocumentDB cluster"
  type        = string
  default     = "mongo"
}

variable "documentdb_admin_password" {
  description = "Master password for DocumentDB cluster"
  type        = string
  sensitive   = true
  default     = "WaaveMongoPass123!"
}

variable "documentdb_instance_class" {
  description = "Instance class for DocumentDB cluster instances"
  type        = string
  default     = "db.t4g.medium"
}

# ElastiCache Redis Variables
variable "redis_node_type" {
  description = "Instance node type for ElastiCache Redis cluster"
  type        = string
  default     = "cache.t4g.medium"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters (primary + replicas)"
  type        = number
  default     = 2
}

# MSK Kafka Variables
variable "kafka_instance_type" {
  description = "Broker instance type for AWS MSK cluster"
  type        = string
  default     = "kafka.m5.large"
}

variable "kafka_ebs_volume_size" {
  description = "EBS storage volume size per broker (in GB)"
  type        = number
  default     = 100
}

# EKS Kubernetes Variables
variable "kubernetes_version" {
  description = "Kubernetes control plane version"
  type        = string
  default     = "1.30"
}


variable "eks_node_instance_types" {
  description = "Instance types for EKS worker node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_desired_capacity" {
  description = "Desired count of worker nodes in EKS cluster"
  type        = number
  default     = 3
}

variable "eks_min_size" {
  description = "Minimum count of worker nodes in EKS cluster"
  type        = number
  default     = 2
}

variable "eks_max_size" {
  description = "Maximum count of worker nodes in EKS cluster"
  type        = number
  default     = 6
}

# OpenAI Key for MCP Service
variable "openai_api_key" {
  description = "OpenAI API Key for MCP Service"
  type        = string
  sensitive   = true
  default     = "sk-placeholder-key"
}

# JWT Secrets for Auth Service
variable "jwt_access_secret" {
  description = "JWT Access token secret key"
  type        = string
  sensitive   = true
  default     = "waave-super-secret-jwt-access-key-2026"
}

variable "jwt_refresh_secret" {
  description = "JWT Refresh token secret key"
  type        = string
  sensitive   = true
  default     = "waave-super-secret-jwt-refresh-key-2026"
}

