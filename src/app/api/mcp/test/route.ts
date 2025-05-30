import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';

// Simple test endpoint for n8n to verify connection
export async function GET(request: NextRequest) {
  try {
    // Validate API authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { 
          success: false,
          error: auth.error 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "MCP server is working correctly",
      user: {
        id: auth.user?.id,
        email: auth.user?.email,
        role: auth.user?.role
      },
      scopes: auth.scopes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Test failed' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}