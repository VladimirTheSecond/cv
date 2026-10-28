terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State is stored in S3 so every GitHub runner sees the same state.
  # The bucket name and region are passed at `terraform init` time via -backend-config.
  backend "s3" {
    key          = "cv/terraform.tfstate"
    use_lockfile = true
    encrypt      = true
  }

provider "aws" {
  region = var.aws_region
}

  default_tags {
    tags = {
      Project     = "cv"
      Environment = "personal"
      ManagedBy   = "terraform"
    }
  }
}
