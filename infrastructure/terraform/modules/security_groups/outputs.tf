output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "ID of the ALB security group"
}

output "k8s_workloads_security_group_id" {
  value       = aws_security_group.k8s_workloads.id
  description = "ID of the Kubernetes workloads security group"
}

output "postgres_security_group_id" {
  value       = aws_security_group.postgres.id
  description = "ID of the PostgreSQL security group"
}

output "documentdb_security_group_id" {
  value       = aws_security_group.documentdb.id
  description = "ID of the DocumentDB security group"
}

output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "ID of the ElastiCache Redis security group"
}

output "kafka_security_group_id" {
  value       = aws_security_group.kafka.id
  description = "ID of the MSK Kafka security group"
}
