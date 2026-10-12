import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { config } from '../config/env.js';

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  if (!pool || isFallbackActive()) {
    console.log('[Migrations] Operating in fallback mode. Initializing schema in memory...');
    await seedFallbackStore();
    return;
  }

  console.log('[Migrations] Running MySQL schema migrations...');
  const schemaPath = path.resolve(process.cwd(), 'src/database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Split schema into individual statements
  const statements = schemaSql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  const connection = await pool.getConnection();
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log('[Migrations] All database tables successfully initialized.');
  } catch (error) {
    console.error('[Migrations] Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }

  // Ensure default admin user and seed data exist
  await seedDefaultData();
}

export async function seedDefaultData(): Promise<void> {
  const pool = getPool();
  if (!pool || isFallbackActive()) {
    await seedFallbackStore();
    return;
  }

  const connection = await pool.getConnection();
  try {
    // 1. Check if admin exists
    const [userRows]: any = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      [config.defaultAdmin.username]
    );

    if (userRows.length === 0) {
      console.log(`[Seed] Creating default administrator: ${config.defaultAdmin.username}`);
      const hashedPassword = await bcrypt.hash(config.defaultAdmin.password, 10);
      await connection.query(
        'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        [config.defaultAdmin.username, hashedPassword, config.defaultAdmin.name, 'admin']
      );
    }

    // 2. Check if categories exist
    const [catRows]: any = await connection.query('SELECT COUNT(*) as count FROM categories');
    if (catRows[0].count === 0) {
      console.log('[Seed] Seeding default canteen categories & food products...');
      
      const categories = [
        { name: 'Breakfast & Tiffin', local: 'காலை உணவு', icon: 'Coffee', color: '#15803D', order: 1 },
        { name: 'Meals & Biryani', local: 'மதிய உணவு', icon: 'UtensilsCrossed', color: '#B45309', order: 2 },
        { name: 'Snacks & Chaat', local: 'சிற்றுண்டி', icon: 'Cookie', color: '#EA580C', order: 3 },
        { name: 'Beverages', local: 'சூடான பானங்கள்', icon: 'CupSoda', color: '#0369A1', order: 4 },
        { name: 'Fresh Juices', local: 'குளிர் பழச்சாறு', icon: 'Citrus', color: '#16A34A', order: 5 },
        { name: 'Desserts & Sweets', local: 'இனிப்புகள்', icon: 'IceCream', color: '#DB2777', order: 6 }
      ];

      for (const cat of categories) {
        const [res]: any = await connection.query(
          'INSERT INTO categories (name, local_name, icon, color, display_order) VALUES (?, ?, ?, ?, ?)',
          [cat.name, cat.local, cat.icon, cat.color, cat.order]
        );
        const catId = res.insertId;

        if (cat.name === 'Breakfast & Tiffin') {
          await insertProduct(connection, catId, 'Idli (2 Pcs)', 'இட்லி', 'B01', 30.00, 12.00, 'veg', 3);
          await insertProduct(connection, catId, 'Medu Vada (1 Pc)', 'மெது வடை', 'B02', 15.00, 6.00, 'veg', 2);
          await insertProduct(connection, catId, 'Ghee Roast Dosa', 'நெய் ரோஸ்ட் தோசை', 'B03', 60.00, 24.00, 'veg', 7);
          await insertProduct(connection, catId, 'Masala Dosa', 'மசாலா தோசை', 'B04', 55.00, 22.00, 'veg', 6);
          await insertProduct(connection, catId, 'Poori Masala (2 Pcs)', 'பூரி மசாலா', 'B05', 45.00, 18.00, 'veg', 5);
          await insertProduct(connection, catId, 'Ven Pongal', 'வெண் பொங்கல்', 'B06', 45.00, 17.00, 'veg', 4);
        } else if (cat.name === 'Meals & Biryani') {
          await insertProduct(connection, catId, 'South Indian Full Meals', 'தென்னிந்திய சாப்பாடு', 'M01', 70.00, 32.00, 'veg', 5);
          await insertProduct(connection, catId, 'Chicken Dum Biryani', 'சிக்கன் பிரியாணி', 'M02', 120.00, 65.00, 'non-veg', 5);
          await insertProduct(connection, catId, 'Veg Fried Rice', 'வெஜ் ஃப்ரைட் ரைஸ்', 'M03', 75.00, 35.00, 'veg', 8);
          await insertProduct(connection, catId, 'Egg Fried Rice', 'முட்டை ஃப்ரைட் ரைஸ்', 'M04', 85.00, 40.00, 'non-veg', 8);
          await insertProduct(connection, catId, 'Malabar Parotta (2 Pcs)', 'பரோட்டா', 'M05', 40.00, 16.00, 'veg', 4);
          await insertProduct(connection, catId, 'Chicken Chilly Plate', 'சிக்கன் சில்லி', 'M06', 90.00, 48.00, 'non-veg', 10);
        } else if (cat.name === 'Snacks & Chaat') {
          await insertProduct(connection, catId, 'Crispy Onion Samosa', 'வெங்காய சமோசா', 'S01', 15.00, 6.00, 'veg', 2);
          await insertProduct(connection, catId, 'Egg Puff', 'முட்டை பஃப்ஸ்', 'S02', 20.00, 9.00, 'non-veg', 2);
          await insertProduct(connection, catId, 'Veg Cutlet (2 Pcs)', 'வெஜ் கட்லட்', 'S03', 25.00, 10.00, 'veg', 3);
          await insertProduct(connection, catId, 'Sundal & Mixture Bowl', 'சுண்டல்', 'S04', 20.00, 8.00, 'veg', 1);
        } else if (cat.name === 'Beverages') {
          await insertProduct(connection, catId, 'Special Masala Tea', 'மசாலா டீ', 'D01', 12.00, 4.50, 'beverage', 2);
          await insertProduct(connection, catId, 'Kumbakonam Degree Coffee', 'டிகிரி காபி', 'D02', 15.00, 5.50, 'beverage', 2);
          await insertProduct(connection, catId, 'Chilled Badam Milk', 'பாதாம் பால்', 'D03', 25.00, 11.00, 'beverage', 1);
          await insertProduct(connection, catId, 'Ginger Lemon Tea', 'இஞ்சி எலுமிச்சை டீ', 'D04', 15.00, 5.00, 'beverage', 2);
        } else if (cat.name === 'Fresh Juices') {
          await insertProduct(connection, catId, 'Fresh Watermelon Juice', 'தர்பூசணி சாறு', 'J01', 30.00, 12.00, 'beverage', 3);
          await insertProduct(connection, catId, 'Fresh Lime Soda / Sweet', 'எலுமிச்சை சோடா', 'J02', 25.00, 9.00, 'beverage', 3);
          await insertProduct(connection, catId, 'Mosambi (Sweet Lime) Juice', 'சாத்துக்குடி சாறு', 'J03', 40.00, 18.00, 'beverage', 4);
        } else if (cat.name === 'Desserts & Sweets') {
          await insertProduct(connection, catId, 'Hot Gulab Jamun (2 Pcs)', 'குலாப் ஜாமுன்', 'SW01', 30.00, 12.00, 'veg', 2);
          await insertProduct(connection, catId, 'Vanilla Ice Cream Cup', 'ஐஸ்கிரீம்', 'SW02', 25.00, 12.00, 'veg', 1);
        }
      }
    }

    // 3. Check business settings
    const defaultSettings: Record<string, string> = {
      business_name: 'Suvai Canteen',
      college_name: 'PSG College of Technology & Sciences',
      campus_branch: 'Campus Food Court, Block-3',
      phone: '+91 98765 43210',
      email: 'canteen@suvaifoods.edu',
      tax_name: 'GST',
      tax_percentage: '5.00',
      tax_inclusive: 'true',
      currency_symbol: '₹',
      timezone: 'Asia/Kolkata',
      invoice_prefix: 'SUV-',
      printer_width: '80',
      printer_auto_cut: 'true',
      printer_header: 'SUVAI CANTEEN\nPSG Tech Campus Food Court\nPh: +91 98765 43210',
      printer_footer: 'Thank you for choosing Suvai!\nFood tokens valid for today only.\nPlease collect your meal at counter.',
      upi_vpa: 'suvaicanteen@okaxis',
      upi_merchant_name: 'Suvai Canteen PSG'
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await connection.query(
        'INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [key, value]
      );
    }

    console.log('[Seed] Database initialization and default data seeding complete.');
  } finally {
    connection.release();
  }
}

async function insertProduct(
  conn: any,
  catId: number,
  name: string,
  localName: string,
  code: string,
  sellingPrice: number,
  costPrice: number,
  foodType: string,
  prepTime: number
) {
  await conn.query(
    'INSERT INTO products (category_id, name, local_name, code, selling_price, cost_price, food_type, preparation_time_mins, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
    [catId, name, localName, code, sellingPrice, costPrice, foodType, prepTime]
  );
}

export async function seedFallbackStore(): Promise<void> {
  const hashedPassword = await bcrypt.hash(config.defaultAdmin.password, 10);
  fallbackStore.users = [
    {
      id: 1,
      username: config.defaultAdmin.username,
      password_hash: hashedPassword,
      full_name: config.defaultAdmin.name,
      role: 'admin',
      is_active: 1
    }
  ];

  fallbackStore.categories = [
    { id: 1, name: 'Breakfast & Tiffin', local_name: 'காலை உணவு', icon: 'Coffee', color: '#15803D', display_order: 1, is_active: 1 },
    { id: 2, name: 'Meals & Biryani', local_name: 'மதிய உணவு', icon: 'UtensilsCrossed', color: '#B45309', display_order: 2, is_active: 1 },
    { id: 3, name: 'Snacks & Chaat', local_name: 'சிற்றுண்டி', icon: 'Cookie', color: '#EA580C', display_order: 3, is_active: 1 },
    { id: 4, name: 'Beverages', local_name: 'சூடான பானங்கள்', icon: 'CupSoda', color: '#0369A1', display_order: 4, is_active: 1 },
    { id: 5, name: 'Fresh Juices', local_name: 'குளிர் பழச்சாறு', icon: 'Citrus', color: '#16A34A', display_order: 5, is_active: 1 },
    { id: 6, name: 'Desserts & Sweets', local_name: 'இனிப்புகள்', icon: 'IceCream', color: '#DB2777', display_order: 6, is_active: 1 }
  ];

  fallbackStore.products = [
    { id: 1, category_id: 1, name: 'Idli (2 Pcs)', local_name: 'இட்லி', code: 'B01', selling_price: 30.00, cost_price: 12.00, food_type: 'veg', preparation_time_mins: 3, is_available: 1 },
    { id: 2, category_id: 1, name: 'Medu Vada (1 Pc)', local_name: 'மெது வடை', code: 'B02', selling_price: 15.00, cost_price: 6.00, food_type: 'veg', preparation_time_mins: 2, is_available: 1 },
    { id: 3, category_id: 1, name: 'Ghee Roast Dosa', local_name: 'நெய் ரோஸ்ட் தோசை', code: 'B03', selling_price: 60.00, cost_price: 24.00, food_type: 'veg', preparation_time_mins: 7, is_available: 1 },
    { id: 4, category_id: 1, name: 'Masala Dosa', local_name: 'மசாலா தோசை', code: 'B04', selling_price: 55.00, cost_price: 22.00, food_type: 'veg', preparation_time_mins: 6, is_available: 1 },
    { id: 5, category_id: 1, name: 'Poori Masala (2 Pcs)', local_name: 'பூரி மசாலா', code: 'B05', selling_price: 45.00, cost_price: 18.00, food_type: 'veg', preparation_time_mins: 5, is_available: 1 },
    { id: 6, category_id: 1, name: 'Ven Pongal', local_name: 'வெண் பொங்கல்', code: 'B06', selling_price: 45.00, cost_price: 17.00, food_type: 'veg', preparation_time_mins: 4, is_available: 1 },
    
    { id: 7, category_id: 2, name: 'South Indian Full Meals', local_name: 'தென்னிந்திய சாப்பாடு', code: 'M01', selling_price: 70.00, cost_price: 32.00, food_type: 'veg', preparation_time_mins: 5, is_available: 1 },
    { id: 8, category_id: 2, name: 'Chicken Dum Biryani', local_name: 'சிக்கன் பிரியாணி', code: 'M02', selling_price: 120.00, cost_price: 65.00, food_type: 'non-veg', preparation_time_mins: 5, is_available: 1 },
    { id: 9, category_id: 2, name: 'Veg Fried Rice', local_name: 'வெஜ் ஃப்ரைட் ரைஸ்', code: 'M03', selling_price: 75.00, cost_price: 35.00, food_type: 'veg', preparation_time_mins: 8, is_available: 1 },
    { id: 10, category_id: 2, name: 'Egg Fried Rice', local_name: 'முட்டை ஃப்ரைட் ரைஸ்', code: 'M04', selling_price: 85.00, cost_price: 40.00, food_type: 'non-veg', preparation_time_mins: 8, is_available: 1 },
    { id: 11, category_id: 2, name: 'Malabar Parotta (2 Pcs)', local_name: 'பரோட்டா', code: 'M05', selling_price: 40.00, cost_price: 16.00, food_type: 'veg', preparation_time_mins: 4, is_available: 1 },
    { id: 12, category_id: 2, name: 'Chicken Chilly Plate', local_name: 'சிக்கன் சில்லி', code: 'M06', selling_price: 90.00, cost_price: 48.00, food_type: 'non-veg', preparation_time_mins: 10, is_available: 1 },

    { id: 13, category_id: 3, name: 'Crispy Onion Samosa', local_name: 'வெங்காய சமோசா', code: 'S01', selling_price: 15.00, cost_price: 6.00, food_type: 'veg', preparation_time_mins: 2, is_available: 1 },
    { id: 14, category_id: 3, name: 'Egg Puff', local_name: 'முட்டை பஃப்ஸ்', code: 'S02', selling_price: 20.00, cost_price: 9.00, food_type: 'non-veg', preparation_time_mins: 2, is_available: 1 },
    { id: 15, category_id: 3, name: 'Veg Cutlet (2 Pcs)', local_name: 'வெஜ் கட்லட்', code: 'S03', selling_price: 25.00, cost_price: 10.00, food_type: 'veg', preparation_time_mins: 3, is_available: 1 },
    { id: 16, category_id: 3, name: 'Sundal & Mixture Bowl', local_name: 'சுண்டல்', code: 'S04', selling_price: 20.00, cost_price: 8.00, food_type: 'veg', preparation_time_mins: 1, is_available: 1 },

    { id: 17, category_id: 4, name: 'Special Masala Tea', local_name: 'மசாலா டீ', code: 'D01', selling_price: 12.00, cost_price: 4.50, food_type: 'beverage', preparation_time_mins: 2, is_available: 1 },
    { id: 18, category_id: 4, name: 'Kumbakonam Degree Coffee', local_name: 'டிகிரி காபி', code: 'D02', selling_price: 15.00, cost_price: 5.50, food_type: 'beverage', preparation_time_mins: 2, is_available: 1 },
    { id: 19, category_id: 4, name: 'Chilled Badam Milk', local_name: 'பாதாம் பால்', code: 'D03', selling_price: 25.00, cost_price: 11.00, food_type: 'beverage', preparation_time_mins: 1, is_available: 1 },
    { id: 20, category_id: 4, name: 'Ginger Lemon Tea', local_name: 'இஞ்சி எலுமிச்சை டீ', code: 'D04', selling_price: 15.00, cost_price: 5.00, food_type: 'beverage', preparation_time_mins: 2, is_available: 1 },

    { id: 21, category_id: 5, name: 'Fresh Watermelon Juice', local_name: 'தர்பூசணி சாறு', code: 'J01', selling_price: 30.00, cost_price: 12.00, food_type: 'beverage', preparation_time_mins: 3, is_available: 1 },
    { id: 22, category_id: 5, name: 'Fresh Lime Soda / Sweet', local_name: 'எலுமிச்சை சோடா', code: 'J02', selling_price: 25.00, cost_price: 9.00, food_type: 'beverage', preparation_time_mins: 3, is_available: 1 },
    { id: 23, category_id: 5, name: 'Mosambi (Sweet Lime) Juice', local_name: 'சாத்துக்குடி சாறு', code: 'J03', shipping_price: 40.00, selling_price: 40.00, cost_price: 18.00, food_type: 'beverage', preparation_time_mins: 4, is_available: 1 },

    { id: 24, category_id: 6, name: 'Hot Gulab Jamun (2 Pcs)', local_name: 'குலாப் ஜாமுன்', code: 'SW01', selling_price: 30.00, cost_price: 12.00, food_type: 'veg', preparation_time_mins: 2, is_available: 1 },
    { id: 25, category_id: 6, name: 'Vanilla Ice Cream Cup', local_name: 'ஐஸ்கிரீம்', code: 'SW02', selling_price: 25.00, cost_price: 12.00, food_type: 'veg', preparation_time_mins: 1, is_available: 1 }
  ];

  fallbackStore.business_settings = {
    business_name: 'Suvai Canteen',
    college_name: 'PSG College of Technology & Sciences',
    campus_branch: 'Campus Food Court, Block-3',
    phone: '+91 98765 43210',
    email: 'canteen@suvaifoods.edu',
    tax_name: 'GST',
    tax_percentage: '5.00',
    tax_inclusive: 'true',
    currency_symbol: '₹',
    timezone: 'Asia/Kolkata',
    invoice_prefix: 'SUV-',
    printer_width: '80',
    printer_auto_cut: 'true',
    printer_header: 'SUVAI CANTEEN\nPSG Tech Campus Food Court\nPh: +91 98765 43210',
    printer_footer: 'Thank you for choosing Suvai!\nFood tokens valid for today only.\nPlease collect your meal at counter.',
    upi_vpa: 'suvaicanteen@okaxis',
    upi_merchant_name: 'Suvai Canteen PSG'
  };

  // Seed sample initial expense
  fallbackStore.expenses = [
    {
      id: 1,
      category: 'groceries',
      title: 'Morning Vegetables & Onions Procurement',
      amount: 1450.00,
      expense_date: new Date().toISOString().slice(0, 10),
      paid_to: 'Kovai Wholesale Mandi',
      payment_method: 'cash',
      receipt_number: 'MANDI-8412',
      notes: 'Tomatoes, onions, potatoes and curry leaves for tiffin',
      created_by: 1
    },
    {
      id: 2,
      category: 'dairy',
      title: 'Aavin Milk & Curd 20 Litres',
      amount: 880.00,
      expense_date: new Date().toISOString().slice(0, 10),
      paid_to: 'Aavin Dairy Booth #4',
      payment_method: 'upi',
      receipt_number: 'AAV-20261012',
      notes: 'Daily milk packets for tea and coffee',
      created_by: 1
    }
  ];

  console.log('[Seed] Fallback in-memory store initialized with realistic canteen products.');
}
