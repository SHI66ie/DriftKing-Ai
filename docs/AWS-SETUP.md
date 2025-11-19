# AWS S3 + CloudFront Setup Guide

This guide explains how to set up AWS S3 and CloudFront for hosting race data in production, enabling your DriftKing-Ai dashboard to work without the local Data folder.

## Overview

- **Development**: Uses local `Data/` folder (no AWS needed)
- **Production**: Uses AWS S3 + CloudFront for data hosting
- **Cost**: Free tier covers most usage (5GB storage + 1TB transfer/month)

## Step 1: Create AWS Account

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Create an account (free tier available)
3. Note your AWS Region (e.g., `us-east-1`)

## Step 2: Create S3 Bucket

### Using AWS Console

1. Navigate to **S3** service
2. Click **Create bucket**
3. Bucket name: `driftking-racing-data` (must be globally unique)
4. Region: Choose closest to your users
5. Keep default settings, click **Create bucket**

### Using AWS CLI

```bash
aws s3 mb s3://driftking-racing-data --region us-east-1
```

## Step 3: Configure Bucket Permissions

### Enable Public Access (for CloudFront)

```bash
aws s3api put-public-access-block \
  --bucket driftking-racing-data \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### Add Bucket Policy

Create a bucket policy to allow CloudFront access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::driftking-racing-data/*"
    }
  ]
}
```

Apply the policy:

```bash
aws s3api put-bucket-policy \
  --bucket driftking-racing-data \
  --policy file://bucket-policy.json
```

## Step 4: Upload Your Data

### Upload Data Folder Structure

```bash
# Upload your entire Data folder
aws s3 sync Data/ s3://driftking-racing-data/ --delete

# Verify upload
aws s3 ls s3://driftking-racing-data/
```

### Expected Folder Structure

```
driftking-racing-data/
├── barber/
│   ├── R1_barber_lap_time.json
│   ├── R1_barber_telemetry_data_index.json
│   ├── R1_barber_telemetry_data_chunk_0.json
│   ├── R1_barber_telemetry_data_chunk_1.json
│   ├── 03_Results GR Cup Race 1 Official_Anonymized.json
│   ├── 26_Weather_Race 1_Anonymized.json
│   └── Barber_Circuit_Map.pdf
├── circuit-of-the-americas/
│   └── (similar structure)
└── (other tracks)
```

## Step 5: Create CloudFront Distribution

### Using AWS Console

1. Navigate to **CloudFront** service
2. Click **Create distribution**
3. Origin domain: Select your S3 bucket
4. Viewer protocol policy: **Redirect HTTP to HTTPS**
5. Allowed HTTP methods: **GET, HEAD, OPTIONS**
6. Cache policy: **Managed-CachingOptimized**
7. Price class: **Use only US, Canada, Europe** (saves costs)
8. Click **Create distribution**

### Note the Domain

After creation, note your CloudFront domain:
```
your-distribution-id.cloudfront.net
```

## Step 6: Configure Environment Variables

Create or update your `.env.local` file:

```env
# AWS Configuration
AWS_S3_BUCKET=driftking-racing-data
AWS_CLOUDFRONT_DOMAIN=your-distribution-id.cloudfront.net
```

## Step 7: Test the Setup

### Local Development

```bash
npm run dev
```

Should use local Data folder (no AWS charges).

### Production Testing

```bash
npm run build
npm start
```

Should fetch data from AWS CloudFront.

### Verify URLs Work

Test these URLs in your browser:

```
https://your-distribution-id.cloudfront.net/barber/R1_barber_lap_time.json
https://your-distribution-id.cloudfront.net/barber/Barber_Circuit_Map.pdf
```

## Step 8: Deploy to Netlify

1. Push your changes to GitHub
2. Netlify will automatically build and deploy
3. The app will now use AWS data in production

## Cost Monitoring

### Free Tier Limits

- **S3 Storage**: 5GB free
- **S3 Requests**: 20,000 GET requests free
- **Data Transfer**: 1TB free via CloudFront

### Estimated Costs

If you exceed free tier:
- **Storage**: $0.023/GB/month (13GB over free = ~$0.30/month)
- **Data Transfer**: $0.085/GB (after 1TB free)
- **Requests**: $0.0004/1000 GET requests (after 20k free)

### Monitor Usage

```bash
# Check S3 storage
aws s3 ls s3://driftking-racing-data --recursive --human-readable --summarize

# Check CloudFront usage
aws cloudfront get-usage-statistics --distribution-id YOUR_DISTRIBUTION_ID
```

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check bucket policy and public access settings
2. **404 Not Found**: Verify file paths and folder structure
3. **CORS Errors**: Add CORS configuration to S3 bucket if needed
4. **Slow Loading**: Enable CloudFront caching and compression

### CORS Configuration (if needed)

Add this to your S3 bucket CORS configuration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

## Security Notes

- The bucket is publicly readable but not writable
- CloudFront provides additional security and caching
- Consider using AWS IAM roles for better access control
- Monitor your AWS billing regularly

## Performance Optimization

1. **Enable Compression**: CloudFront automatically compresses JSON/JS/CSS
2. **Cache Headers**: Set long cache times for static race data
3. **Chunked Telemetry**: Only load telemetry chunks when needed
4. **CDN Edge Locations**: CloudFront serves from nearest edge location

## Next Steps

1. Set up AWS billing alerts
2. Configure automated data uploads (if data changes frequently)
3. Consider AWS Lambda for data processing
4. Set up monitoring and logging

For support, check the [AWS S3 Documentation](https://docs.aws.amazon.com/s3/) and [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/).
