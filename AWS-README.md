# Notes implementing on AWS

## For https
1. Got a new domain (kbradham.com)
1. Had to add CloudFront and create a new distribution - kbradham.com-distribution
1. This required custom certificate for *.kbradham.com from AWS Certificate Manager (ACM)
1. Added a new hosted zone (kbradham.com) in Route 53
   2. A record points at CloudFront (d1ccawsdlizl8k.cloudfront.net.)
2. S3 bucket must be same name as domain (kbradham.com)
3. If cached, go to CloudFront > kbradham.com-distributions > Invalidation and do a new /* invalidation
4. 
