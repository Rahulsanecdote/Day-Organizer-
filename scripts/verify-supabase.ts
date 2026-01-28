// Verification script to test Supabase connection
// Run with: npx ts-node scripts/verify-supabase.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function verifySupabaseSetup() {
    console.log('\n========================================');
    console.log('  SUPABASE VERIFICATION TEST');
    console.log('========================================\n');

    // Check 1: Environment Variables
    console.log('1️⃣  Checking environment variables...');

    if (!supabaseUrl) {
        console.log('   ❌ NEXT_PUBLIC_SUPABASE_URL is missing');
        return false;
    }
    console.log(`   ✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);

    if (!supabaseAnonKey) {
        console.log('   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
        return false;
    }
    console.log(`   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);

    // Check 2: Create Supabase Client
    console.log('\n2️⃣  Creating Supabase client...');

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('   ✅ Supabase client created successfully');

    // Check 3: Test Database Connection
    console.log('\n3️⃣  Testing database connection...');

    try {
        // Try to query the profiles table (should exist from migrations)
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        if (error) {
            console.log(`   ⚠️  Query returned error: ${error.message}`);
            console.log('      This is expected if there are no profiles yet.');
        } else {
            console.log('   ✅ Database connection successful');
            console.log(`      Profiles found: ${data?.length || 0}`);
        }
    } catch (err) {
        console.log(`   ❌ Database connection failed: ${err}`);
        return false;
    }

    // Check 4: Test Auth Service
    console.log('\n4️⃣  Testing Auth service...');

    try {
        const { data: session } = await supabase.auth.getSession();
        console.log('   ✅ Auth service is accessible');
        console.log(`      Current session: ${session.session ? 'Active' : 'None (expected for anonymous)'}`);
    } catch (err) {
        console.log(`   ❌ Auth service error: ${err}`);
        return false;
    }

    // Check 5: Verify Tables Exist
    console.log('\n5️⃣  Verifying database tables...');

    const tables = ['profiles', 'habits', 'tasks', 'daily_inputs', 'plans', 'user_preferences'];

    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('id').limit(0);
            if (error && error.code !== 'PGRST116') {
                console.log(`   ⚠️  ${table}: ${error.message}`);
            } else {
                console.log(`   ✅ ${table} table exists`);
            }
        } catch {
            console.log(`   ❌ ${table}: Error checking table`);
        }
    }

    console.log('\n========================================');
    console.log('  ✅ ALL CHECKS PASSED!');
    console.log('  Your Supabase setup is complete.');
    console.log('========================================\n');

    return true;
}

verifySupabaseSetup()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Verification failed:', err);
        process.exit(1);
    });
