# ALB Security Group (Internet Ingress)
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Controls HTTP/HTTPS traffic to Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  }
}

# Kubernetes App Workloads Security Group (EKS Worker Nodes & Pods)
resource "aws_security_group" "k8s_workloads" {
  name        = "${var.project_name}-${var.environment}-k8s-workloads-sg"
  description = "Allows ingress from ALB and internal inter-service gRPC/HTTP communication for Kubernetes workloads"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow HTTP/WebSocket ingress from ALB"
    from_port       = 4000
    to_port         = 4020
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "Allow internal inter-service gRPC communication between Kubernetes pods"
    from_port   = 3000
    to_port     = 3020
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description = "Allow internal inter-service HTTP/WebSocket communication between Kubernetes pods"
    from_port   = 4000
    to_port     = 4020
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-k8s-workloads-sg"
  }
}

# PostgreSQL RDS Security Group
resource "aws_security_group" "postgres" {
  name        = "${var.project_name}-${var.environment}-postgres-sg"
  description = "Allows PostgreSQL access from Kubernetes workloads"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from Kubernetes Workloads"
    from_port       = 5432
    to_port         = 5435
    protocol        = "tcp"
    security_groups = [aws_security_group.k8s_workloads.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres-sg"
  }
}

# DocumentDB MongoDB Security Group
resource "aws_security_group" "documentdb" {
  name        = "${var.project_name}-${var.environment}-documentdb-sg"
  description = "Allows MongoDB DocumentDB access from Kubernetes workloads"
  vpc_id      = var.vpc_id

  ingress {
    description     = "DocumentDB MongoDB port from Kubernetes Workloads"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.k8s_workloads.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-documentdb-sg"
  }
}

# ElastiCache Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Allows Redis access from Kubernetes workloads"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis port from Kubernetes Workloads"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.k8s_workloads.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }
}

# MSK Kafka Security Group
resource "aws_security_group" "kafka" {
  name        = "${var.project_name}-${var.environment}-kafka-sg"
  description = "Allows Kafka broker access from Kubernetes workloads"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Plaintext Kafka port from Kubernetes Workloads"
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [aws_security_group.k8s_workloads.id]
  }

  ingress {
    description     = "TLS Kafka port from Kubernetes Workloads"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [aws_security_group.k8s_workloads.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-kafka-sg"
  }
}
