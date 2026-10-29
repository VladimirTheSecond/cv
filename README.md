# cv
curriculum vitae

This project is my cv.  

Everyone who visit my page cv.vladimirulasovets.de should be able to download my CV in three languages that I speak:
- German
- English
- Russian

The hook is the skippable "floppy bird" mini-game.  

Main goals:  
simple and fast as possible  
no JS  
GIT first, nothing is stored locally except secrets  

### Commands used to create S3 bucket before this ci/cd ever existed
aws s3api create-bucket --bucket vladimirulasovets-cv-tfstate --region eu-central-1 --create-bucket-configuration LocationConstraint=eu-central-1  
aws s3api put-bucket-versioning --bucket vladimirulasovets-cv-tfstate --versioning-configuration Status=Enabled  
aws s3api put-public-access-block --bucket vladimirulasovets-cv-tfstate --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true  
