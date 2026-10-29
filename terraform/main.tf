terraform {
  required_version = ">= 1.16.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # State is stored in S3 so every GitHub runner sees the same state.
  backend "s3" {
    key          = "cv/terraform.tfstate"
    use_lockfile = true
    region       = "eu-central-1"
    encrypt      = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "cv"
      Environment = "personal"
      ManagedBy   = "terraform"
    }
  }
}
