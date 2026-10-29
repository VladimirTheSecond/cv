### Commands used to create S3 bucket before this ci/cd ever existed
aws s3api create-bucket --bucket <name of the s3 bucket> --region eu-central-1 --create-bucket-configuration LocationConstraint=eu-central-1
aws s3api put-bucket-versioning --bucket <name of the s3 bucket> --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket <name of the s3 bucket> --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true  
terraform init -backend-config="bucket=<name of the s3 bucket>"  
