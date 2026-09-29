# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}
 
# Target Group for API Gateway (HTTP 4000)
resource "aws_lb_target_group" "api_gateway" {
  name        = "${var.project_name}-${var.environment}-tg-gateway"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "4000"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-tg-gateway"
  }
}


# Target Group for Chat WebSockets (HTTP 4005)
resource "aws_lb_target_group" "chat_ws" {
  name        = "${var.project_name}-${var.environment}-tg-chat-ws"
  port        = 4005
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    port                = "4005"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-404"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-tg-chat-ws"
  }
}

# Target Group for Notification WebSockets (HTTP 4010)
resource "aws_lb_target_group" "notification_ws" {
  name        = "${var.project_name}-${var.environment}-tg-notif-ws"
  port        = 4010
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    port                = "4010"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-404"
  }      

  tags = {
    Name = "${var.project_name}-${var.environment}-tg-notif-ws"
  }
}

# Listener for HTTP Port 80
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_gateway.arn
  }
}

# Listener Rules for Routing Path Prefixes.            
resource "aws_lb_listener_rule" "chat_ws_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.chat_ws.arn
  }   

  condition {
    path_pattern {  
      values = ["/socket.io/chat*", "/chat/*"]
    }
  }
}  

resource "aws_lb_listener_rule" "notification_ws_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 110
           
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.notification_ws.arn
  }

  condition {
    path_pattern {
      values = ["/socket.io/notification*", "/notification/*"]
    }
  }
}                                                 
