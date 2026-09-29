output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the Application Load Balancer"
}

output "alb_arn" {
  value       = aws_lb.main.arn
  description = "ARN of the Application Load Balancer"
}

output "api_gateway_target_group_arn" {
  value       = aws_lb_target_group.api_gateway.arn
  description = "ARN of the API Gateway target group"
}

output "chat_ws_target_group_arn" {
  value       = aws_lb_target_group.chat_ws.arn
  description = "ARN of the Chat WebSockets target group"
}

output "notification_ws_target_group_arn" {
  value       = aws_lb_target_group.notification_ws.arn
  description = "ARN of the Notification WebSockets target group"
}
