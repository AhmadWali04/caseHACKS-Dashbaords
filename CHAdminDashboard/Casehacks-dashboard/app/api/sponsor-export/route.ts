import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolFilter = searchParams.get('school'); // optional — null means all

  const supabase = adminClient();

  // Fetch users, optionally filtered by school
  let query = supabase
    .from('users')
    .select('id, name, email, school, resume')
    .not('resume', 'is', null)
    .order('name', { ascending: true });

  // Use case-insensitive match so 'Sheridan University' matches 'sheridan university' in DB
  if (schoolFilter) {
    query = query.ilike('school', schoolFilter);
  }

  const { data: users, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ error: 'No resumes found for the selected filter.' }, { status: 404 });
  }

  // Download all resume files from storage in parallel
  const downloads = await Promise.all(
    users.map(async (user) => {
      const { data, error: dlErr } = await supabase.storage
        .from('resumes')
        .download(user.resume as string);
      return { user, data, error: dlErr };
    })
  );

  const zip = new JSZip();
  const folder = zip.folder('casehacks-resumes')!;

  for (const { user, data, error: dlErr } of downloads) {
    if (dlErr || !data) continue; // skip if file missing, don't abort the whole zip
    const safeFileName = `${(user.name ?? user.email).replace(/[^a-zA-Z0-9 _.-]/g, '_')}.pdf`;
    const arrayBuffer = await data.arrayBuffer();
    folder.file(safeFileName, arrayBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  const slugDate = new Date().toISOString().slice(0, 10); // e.g. 2026-05-08
  const slugSchool = schoolFilter ? `-${schoolFilter.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  const filename = `casehacks-resumes${slugSchool}-${slugDate}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(zipBuffer.length),
    },
  });
}
