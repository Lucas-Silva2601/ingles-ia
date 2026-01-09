import { NextResponse } from 'next/server';

/**
 * Endpoint de health check.
 */
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        service: 'linguas-ia-backend',
        version: '1.0.0',
    });
}
