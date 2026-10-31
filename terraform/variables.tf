variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-central-1" # Frankfurt
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro" # 2 CPU 1 Gb RAM
}

variable "root_volume_size" {
  description = "Size of the root EBS volume in GB"
  type        = number
  default     = 10 # Gb
}

variable "domain_name" {
  description = "Apex domain of the Route 53 hosted zone"
  type        = string
  default     = "vladimirulasovets.de"
}

variable "cv_subdomain" {
  description = "Subdomain for cv; the app is served at <cv_subdomain>.<domain_name>"
  type        = string
  default     = "cv"
}

variable "budget_limit_usd" {
  description = "Monthly AWS spend limit in USD for the budget alert"
  type        = string
  default     = "15"
}

variable "budget_email" {
  description = "Email for budget alerts, passed from GitHub secrets (TF_VAR_budget_email)"
  type        = string
  sensitive   = true
}
