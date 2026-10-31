# EC2 Instance
resource "aws_instance" "cv" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.server.id]
  iam_instance_profile   = aws_iam_instance_profile.ssm.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name = "cv-server"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami]
  }
}

# Elastic IP
resource "aws_eip" "cv" {
  instance = aws_instance.cv.id
  domain   = "vpc"

  tags = {
    Name = "cv-eip"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Last image for Ubuntu 26.04 LTS
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-resolute-26.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
