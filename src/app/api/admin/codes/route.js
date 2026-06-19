import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to generate a unique random code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid easily confused characters like I, O, 1, 0
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET: List all codes and who used them
export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    
    // Fetch codes, joining users to see who claimed them
    const codes = await db.all(
      `SELECT rc.code, rc.created_at, rc.used_by_user_id, u.name as student_name, u.username as student_username
       FROM registration_codes rc
       LEFT JOIN users u ON rc.used_by_user_id = u.id
       ORDER BY rc.created_at DESC`
    );

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Fetch codes error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching registration codes' },
      { status: 500 }
    );
  }
}

// POST: Generate N new codes
export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { count } = await request.json();
    const numberOfCodes = parseInt(count, 10);

    if (isNaN(numberOfCodes) || numberOfCodes < 1 || numberOfCodes > 200) {
      return NextResponse.json(
        { error: 'Invalid count. Must generate between 1 and 200 codes.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const generatedCodes = [];

    await db.run('BEGIN TRANSACTION');

    try {
      for (let i = 0; i < numberOfCodes; i++) {
        let code;
        let isUnique = false;
        let attempts = 0;

        // Ensure uniqueness
        while (!isUnique && attempts < 10) {
          code = generateCode();
          const exists = await db.get(
            'SELECT code FROM registration_codes WHERE code = ?',
            [code]
          );
          if (!exists) {
            isUnique = true;
          }
          attempts++;
        }

        if (!isUnique) {
          throw new Error('Could not generate a unique code after 10 attempts');
        }

        await db.run(
          'INSERT INTO registration_codes (code, used_by_user_id) VALUES (?, ?)',
          [code, null]
        );
        generatedCodes.push(code);
      }

      await db.run('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Successfully generated ${numberOfCodes} codes.`,
        codes: generatedCodes
      });
    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    console.error('Generate codes error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while generating codes' },
      { status: 500 }
    );
  }
}
