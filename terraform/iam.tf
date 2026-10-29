# IAM role that lets the instance register with SSM Session Manager
resource "aws_iam_role" "ssm" {
  name = "cv-server-ssm"

  # "2012-10-17" isn’t a date. It’s the version of the IAM policy language, a fixed constant defined by AWS.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm" {
  name = "cv-server-ssm"
  role = aws_iam_role.ssm.name
}
