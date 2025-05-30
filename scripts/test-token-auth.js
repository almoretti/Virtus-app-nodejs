#!/usr/bin/env node

/**
 * Test API token authentication logic
 */

const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');

// Use the public database URL for testing
const DATABASE_URL = "postgresql://postgres:gdpaAixQCgAhklDlauFqHCaBxeVfgqdd@yamabiko.proxy.rlwy.net:51568/railway";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function testTokenAuth() {
  try {
    console.log('🔍 Testing API token authentication...\n');

    // List all active tokens
    const tokens = await prisma.apiToken.findMany({
      where: {
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`Found ${tokens.length} active tokens:\n`);

    tokens.forEach((token, index) => {
      console.log(`${index + 1}. Token ID: ${token.id}`);
      console.log(`   Name: ${token.name}`);
      console.log(`   User: ${token.user.email} (${token.user.role})`);
      console.log(`   Hash: ${token.token.substring(0, 16)}...`);
      console.log(`   Expires: ${token.expiresAt || 'Never'}`);
      console.log('');
    });

    // Test token validation logic
    if (process.argv[2]) {
      console.log('\n🔐 Testing token validation...');
      const testToken = process.argv[2];
      console.log(`Raw token: ${testToken.substring(0, 16)}...`);
      
      const hashedToken = createHash('sha256').update(testToken).digest('hex');
      console.log(`Hashed token: ${hashedToken.substring(0, 16)}...`);
      
      const foundToken = await prisma.apiToken.findFirst({
        where: {
          token: hashedToken,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      });

      if (foundToken) {
        console.log('✅ Token found and valid!');
        console.log(`   User: ${foundToken.user.email}`);
        console.log(`   Role: ${foundToken.user.role}`);
        console.log(`   Scopes: ${foundToken.scopes || 'null'}`);
        
        // Update last used
        await prisma.apiToken.update({
          where: { id: foundToken.id },
          data: { lastUsedAt: new Date() }
        });
        console.log('   Last used timestamp updated');
        
      } else {
        console.log('❌ Token not found or invalid');
        
        // Check if token exists but is inactive
        const inactiveToken = await prisma.apiToken.findFirst({
          where: {
            token: hashedToken
          }
        });
        
        if (inactiveToken) {
          console.log('   Found token but it is inactive');
        } else {
          console.log('   Token does not exist in database');
        }
      }
    } else {
      console.log('💡 Run with a token as argument to test validation:');
      console.log('   node test-token-auth.js YOUR_RAW_TOKEN_HERE');
    }

  } catch (error) {
    console.error('❌ Error testing token auth:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testTokenAuth();