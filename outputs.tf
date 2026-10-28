output "server_public_ip" {
  description = "Public IP address of the cv server"
  value       = aws_eip.cv.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh ubuntu@${aws_eip.cv.public_ip}"
}

output "cv_url" {
  description = "Public URL of cv"
  value       = "https://${local.cv_fqdn}"
}

