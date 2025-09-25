# DPNR Production Database Setup with Supabase

## Why Supabase?

✅ **Best choice for DPNR because:**
- Free tier: 500MB storage, perfect for initial deployment
- Full PostgreSQL 15+ with all advanced features your schema needs
- Automatic backups and point-in-time recovery
- Built-in security (Row Level Security, SSL by default)
- Easy scaling path as you grow
- Great developer experience with dashboard

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up with GitHub (recommended)
3. Click **"New Project"**
4. Configure:
   - **Name**: `dpnr-production`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: `Europe West` (closest to Israel)
   - **Plan**: `Free` (can upgrade later)

### 2. Get Connection String

Once created (takes ~2 minutes):

1. Go to **Settings → Database**
2. Scroll to **"Connection pooling"** section
3. **Copy the Connection String** - it looks like:
   ```
   postgresql://postgres.abc123:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### 3. Deploy Database Schema

Run the setup script with your connection string:

```bash
./setup-production-db.sh 'your-connection-string-here'
```

**Or manually:**

```bash
# 1. Update .env file with your DATABASE_URL
# Replace the DATABASE_URL line with your Supabase connection string

# 2. Deploy schema to Supabase
npx prisma db push

# 3. Generate Prisma client
npx prisma generate

# 4. Seed initial data (optional)
npm run db:seed
```

### 4. Verify Setup

```bash
# Quick health check
./check-db-health.sh

# Or use the comprehensive check
npm run db:health

# Open database dashboard
npx prisma studio
```

## Production Deployment Script

For production deployment with comprehensive checks:

```bash
# Deploy to production with all safety checks
npm run db:deploy:prod

# Or dry run first to see what will happen
npm run db:deploy:dry-run
```

## Supabase Dashboard Features

After setup, you can:

1. **View Data**: https://supabase.com/dashboard → Table Editor
2. **SQL Editor**: Write and run custom queries
3. **Database Logs**: Monitor queries and performance
4. **Backups**: Automatic daily backups (7-day retention on free tier)

## Connection String for Different Environments

Your `.env` should have:

```env
# Production Supabase (connection pooling for serverless)
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# For direct connection (if needed for migrations)
DIRECT_DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
```

## Security Best Practices

1. **Connection Pooling**: Always use pooled connection for Lambda functions
2. **Environment Variables**: Never commit real DATABASE_URL to git
3. **Row Level Security**: Enable RLS policies in Supabase dashboard if needed
4. **IP Restrictions**: Consider enabling if you need extra security

## Monitoring & Maintenance

1. **Performance**: Monitor via Supabase dashboard
2. **Storage**: Track usage in Settings → Usage
3. **Backups**: Automatic, but verify they're working
4. **Upgrades**: Free tier → Pro when you need more resources

## Troubleshooting

### Connection Issues
- Verify URL format is correct (pooler vs direct)
- Check password special characters are URL-encoded
- Ensure Supabase project is running (not paused)

### Migration Issues
- Use `npx prisma db push` for initial setup
- Use `npx prisma migrate deploy` for subsequent schema changes
- Check Prisma logs for specific errors

### Performance Issues
- Use connection pooling URL for serverless functions
- Consider read replicas for read-heavy operations (Pro tier)
- Monitor slow queries in Supabase dashboard

## Next Steps After Database Setup

1. ✅ Database deployed and accessible
2. Update production environment variables in Vercel/AWS
3. Test API endpoints against production database
4. Configure monitoring and alerting
5. Plan backup and disaster recovery procedures

---

**Files created by this setup:**
- `setup-production-db.sh` - Automated setup script
- `check-db-health.sh` - Health check script
- `SUPABASE_SETUP.md` - This guide

**Existing database tools you can use:**
- `npm run db:deploy:prod` - Full production deployment
- `npm run db:health` - Comprehensive health check
- `npm run validate:prod` - Production validation
- `npx prisma studio` - Database GUI