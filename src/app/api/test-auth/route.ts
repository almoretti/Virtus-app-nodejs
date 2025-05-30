import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH DEBUG START ===');
    
    // Check headers
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'MISSING');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Missing or invalid Authorization header',
        expected: 'Bearer YOUR_TOKEN',
        received: authHeader?.substring(0, 20) || 'null'
      }, { status: 400 });
    }
    
    const rawToken = authHeader.substring(7);
    console.log('Raw token length:', rawToken.length);
    console.log('Raw token start:', rawToken.substring(0, 16));
    
    // Test direct database connection
    try {
      const tokenCount = await prisma.apiToken.count();
      console.log('Database connection OK, total tokens:', tokenCount);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown DB error'
      }, { status: 500 });
    }
    
    // Test token hashing
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    console.log('Hashed token:', hashedToken.substring(0, 16));
    
    // Test token lookup
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
            role: true
          }
        }
      }
    });
    
    console.log('Token found:', !!foundToken);
    if (foundToken) {
      console.log('Token user:', foundToken.user.email);
    }
    
    // Test full validation
    const authResult = await validateApiAuth(request);
    console.log('Auth result:', authResult.success);
    console.log('=== AUTH DEBUG END ===');
    
    return NextResponse.json({
      debug: {
        hasAuthHeader: !!authHeader,
        tokenLength: rawToken.length,
        hashedTokenStart: hashedToken.substring(0, 16),
        tokenFoundInDB: !!foundToken,
        userEmail: foundToken?.user.email,
        authValidation: authResult.success,
        authError: authResult.error
      },
      result: authResult.success ? 'SUCCESS' : 'FAILED'
    });
    
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}