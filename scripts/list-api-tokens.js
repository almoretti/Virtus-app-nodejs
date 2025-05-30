#!/usr/bin/env node

/**
 * List and optionally clean up API tokens
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listTokens() {
  try {
    console.log('🔍 Listing all API tokens...\n');

    const tokens = await prisma.apiToken.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (tokens.length === 0) {
      console.log('No API tokens found.');
      return;
    }

    console.log(`Found ${tokens.length} API tokens:\n`);

    tokens.forEach((token, index) => {
      console.log(`${index + 1}. Token ID: ${token.id}`);
      console.log(`   Name: ${token.name}`);
      console.log(`   User: ${token.user.email} (${token.user.role})`);
      console.log(`   Active: ${token.isActive}`);
      console.log(`   Created: ${token.createdAt}`);
      console.log(`   Expires: ${token.expiresAt || 'Never'}`);
      console.log(`   Last Used: ${token.lastUsedAt || 'Never'}`);
      console.log('');
    });

    // Check for issues
    const inactiveTokens = tokens.filter(t => !t.isActive);
    const expiredTokens = tokens.filter(t => t.expiresAt && t.expiresAt < new Date());
    
    if (inactiveTokens.length > 0) {
      console.log(`⚠️  ${inactiveTokens.length} inactive tokens found`);
    }
    
    if (expiredTokens.length > 0) {
      console.log(`⚠️  ${expiredTokens.length} expired tokens found`);
    }

    // Offer to clean up
    if (process.argv.includes('--cleanup')) {
      console.log('\n🧹 Cleaning up inactive and expired tokens...');
      
      const deleteResult = await prisma.apiToken.deleteMany({
        where: {
          OR: [
            { isActive: false },
            { expiresAt: { lt: new Date() } }
          ]
        }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} tokens`);
    } else if (inactiveTokens.length > 0 || expiredTokens.length > 0) {
      console.log('\n💡 Run with --cleanup to remove inactive/expired tokens');
    }

  } catch (error) {
    console.error('❌ Error listing tokens:', error);
    if (error.code === 'P1001') {
      console.error('   Database connection failed. Check your DATABASE_URL.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listTokens();