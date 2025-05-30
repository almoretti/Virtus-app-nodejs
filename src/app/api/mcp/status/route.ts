import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateApiAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Validate API authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }
    // Test database connectivity
    const technicianCount = await prisma.technician.count({
      where: { active: true }
    });
    
    const recentBookings = await prisma.booking.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    
    const installationTypes = await prisma.installationType.count();
    
    // Get some sample availability data
    const today = new Date();
    const availabilityCheck = await prisma.booking.count({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        status: 'SCHEDULED'
      }
    });

    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      authenticated: true,
      user: auth.user?.email,
      mcp: {
        server: 'virtus-booking-mcp',
        version: '1.0.0',
        description: 'MCP server per il sistema di prenotazione Virtus'
      },
      database: {
        connected: true,
        activeTechnicians: technicianCount,
        recentBookings,
        installationTypes,
        todayScheduled: availabilityCheck
      },
      capabilities: {
        tools: [
          'check_availability',
          'create_booking', 
          'modify_booking',
          'cancel_booking',
          'get_bookings'
        ],
        resources: [
          // 'technicians://list',
          // 'installation-types://list'
        ],
        prompts: [
          'booking_assistant'
        ]
      },
      endpoints: {
        mcp: '/api/mcp',
        sse: '/api/mcp?sessionId={sessionId}',
        status: '/api/mcp/status'
      },
      features: {
        realTimeUpdates: true,
        serverSentEvents: true,
        authentication: 'required',
        language: 'italian',
        tokenScopes: ['read', 'write']
      }
    };

    return NextResponse.json(status);
    
  } catch (error) {
    // console.error('MCP status check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        connected: false
      }
    }, { status: 500 });
  }
}