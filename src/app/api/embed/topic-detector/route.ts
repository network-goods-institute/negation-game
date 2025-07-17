import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/db';
import { topicsTable } from '@/db/tables/topicsTable';
import { viewpointsTable, activeViewpointsFilter } from '@/db/tables/viewpointsTable';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceUrl = searchParams.get('source');

    if (!sourceUrl) {
      const response = NextResponse.json({ error: 'Missing source parameter' }, { status: 400 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return response;
    }

    const topic = await db
      .select({
        id: topicsTable.id,
        name: topicsTable.name,
        space: topicsTable.space,
      })
      .from(topicsTable)
      .where(eq(topicsTable.discourseUrl, sourceUrl))
      .limit(1);

    if (topic.length === 0) {
      const response = NextResponse.json({ 
        found: false,
        topicId: null,
        hasRationales: false 
      });
      
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      
      return response;
    }

    const topicData = topic[0];

    const rationales = await db
      .select({ id: viewpointsTable.id })
      .from(viewpointsTable)
      .where(
        and(
          eq(viewpointsTable.topicId, topicData.id),
          activeViewpointsFilter
        )
      )
      .limit(1);

    const response = NextResponse.json({
      found: true,
      topicId: topicData.id,
      title: topicData.name,
      spaceId: topicData.space,
      hasRationales: rationales.length > 0
    });
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;

  } catch (error) {
    console.error('Topic detector error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}