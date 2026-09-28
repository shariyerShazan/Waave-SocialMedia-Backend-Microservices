variable "project_name"  {
    type = string
    description = "Project name prefix"
}

variable "environment" {
    type = string
    description = "environment name"  
}

variable "vpc_cidr" {
    type = string
    description = "cidr block for vpc"  
}


variable "availability_zones" {
    type = list(string)
    description = "List of availability zones"
}

variable "public_subnet_cidrs" {
     type = list(string)
     description = "CIDR blocks for public subnets"
}

variable "private_app_subnet_cidrs" {
     type = list(string)
     description = "CIDR blocks for Private app subnets"
}

variable "private_db_subnet_cidrs" {
     type = list(string)
     description = "CIDR blocks for Private db subnets"
}