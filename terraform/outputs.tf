output "server_public_ip" {
  description = "Public IP address of the cv server"
  value       = aws_eip.cv.public_ip
}

output "ssm_command" {
  description = "Open a shell on the server via SSM Session Manager"
  value       = "aws ssm start-session --target ${aws_instance.cv.id} --region ${var.aws_region}"
}

output "cv_url" {
  description = "Public URL of cv"
  value       = "https://${local.cv_fqdn}"
}

