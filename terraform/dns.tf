data "aws_route53_zone" "main" {
  name = var.domain_name
}

locals {
  cv_fqdn = "${var.cv_subdomain}.${var.domain_name}"
}

resource "aws_route53_record" "cv" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.cv_fqdn
  type    = "A"
  ttl     = 86400
  records = [aws_eip.cv.public_ip]
}
