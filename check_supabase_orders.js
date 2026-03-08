require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrder() {
  const { data, error } = await supabase
    .from('shop_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (error) {
    console.error("Error fetching shop_orders:", error.message);
  } else {
    console.log("Latest from 'shop_orders':\n", JSON.stringify(data, null, 2));
  }
}

checkOrder();
