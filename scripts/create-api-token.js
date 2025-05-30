#!/usr/bin/env node

/**
 * Create an API token for a user
 */

const { PrismaClient } = require('@prisma/client');
const { createHash, randomBytes } = require('crypto');

const prisma = new PrismaClient();

async function createApiToken() {
  try {
    // Get the first admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!adminUser) {
      console.error('No admin user found. Create an admin user first.');
      process.exit(1);
    }

    console.log(`Creating API token for admin user: ${adminUser.email}`);

    // Generate a secure token
    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    // Create the API token
    const apiToken = await prisma.apiToken.create({
      data: {
        name: 'MCP Inspector Token',
        token: hashedToken,
        scopes: JSON.stringify(['read', 'write']),
        userId: adminUser.id,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }
    });

    console.log('\n✅ API Token created successfully!');
    console.log('\n🔑 Raw Token (save this - it will not be shown again):');
    console.log(rawToken);
    console.log('\n📋 Token Details:');
    console.log(`ID: ${apiToken.id}`);
    console.log(`Name: ${apiToken.name}`);
    console.log(`User: ${adminUser.email}`);
    console.log(`Scopes: ${apiToken.scopes}`);
    console.log(`Expires: ${apiToken.expiresAt}`);
    console.log('\n📝 Update your MCP inspector config with:');
    console.log(`"Authorization": "Bearer ${rawToken}"`);

  } catch (error) {
    console.error('Error creating API token:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createApiToken();