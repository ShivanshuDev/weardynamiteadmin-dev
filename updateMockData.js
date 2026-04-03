import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_PATH = path.join(__dirname, 'src/stores/adminStore.js');

const CATEGORIES = ['Apparel', 'Accessories', 'Footwear'];
const SUB_CATEGORIES = {
  Apparel: ['T-Shirts', 'Hoodies', 'Jackets', 'Bottoms', 'Sweaters', 'Shirts', 'Outerwear'],
  Accessories: ['Hats', 'Bags', 'Belts', 'Wallets'],
  Footwear: ['Sneakers', 'Boots', 'Formals'],
};

const COLORS = ['Pitch Black', 'Ghost White', 'Crimson Red', 'Navy Blue', 'Olive Green', 'Classic Grey', 'Mustard Yellow', 'Sand Beige', 'Deep Purple', 'Charcoal'];
const FITS = ['Oversized', 'Regular Fit', 'Slim Fit', 'Boxy Fit', 'Relaxed Fit'];
const NECK_TYPES = ['Crew Neck', 'V-Neck', 'Polo Collar', 'High Neck', 'Hooded', 'Round Neck'];
const OCCASIONS = ['Casual Wear', 'Partywear', 'Streetwear', 'Gym & Sports', 'Semi-Formal', 'Office Wear', 'Regular Use'];

const PHOTO_IDS = [
  '1521572163474-6864f9cf17ab', '1556821840-3a63f95609a7', '1594633312681-425c7b97ccd1', '1588850567045-1612b804af4b',
  '1591047139829-d91aecb6caea', '1576871337622-98d48d38537c', '1544816155-12df9643f363', '1552346154-21d32810aba3',
  '1576871337632-b9aef4c17ab9', '1541099649105-f69ad21f3246', '1576566588028-4147f3842f27', '1552902865-b72c031ac5ea',
  '1586363104864-50e2246b7211', '1551028719-00167b16eac5', '1635397174557-3588fef6b1fc', '1596755094514-f87e34085b2c',
  '1553062407-98eeb94c6a62', '1614613535308-eb5fbd3d2c17', '1503342217505-b0a15ec3261c', '1491553895911-0055eca6402d',
  '1542291026-7eec264c27ff', '1523275335684-37898b6baf30', '1485968579580-b6d095142e6e', '1505740420928-5e560c06d30e',
  '1503341455253-b2e72fbb0dbb', '1441984904996-e0b6ba687e07', '1483985988355-763728e1935b', '1523381210434-271e8be1f52b',
  '1576566588028-4147f3842f27', '1521572163474-6864f9cf17ab', '1556821840-3a63f95609a7', '1594633312681-425c7b97ccd1',
  '1588850567045-1612b804af4b', '1591047139829-d91aecb6caea', '1576871337622-98d48d38537c', '1544816155-12df9643f363',
  '1552346154-21d32810aba3', '1576871337632-b9aef4c17ab9', '1541099649105-f69ad21f3246', '1576566588028-4147f3842f27',
  '1552902865-b72c031ac5ea', '1586363104864-50e2246b7211', '1551028719-00167b16eac5', '1635397174557-3588fef6b1fc',
  '1596755094514-f87e34085b2c', '1553062407-98eeb94c6a62', '1614613535308-eb5fbd3d2c17', '1503342217505-b0a15ec3261c',
];

const generateProducts = () => {
  const products = [];
  const statusCycle = ['Active', 'In Stock', 'Under Review', 'Out of Stock', 'Delivered'];
  
  for (let i = 1; i <= 200; i++) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const subCats = SUB_CATEGORIES[category];
    const subCategory = subCats[i % subCats.length];
    const color = COLORS[i % COLORS.length];
    const fit = FITS[i % FITS.length];
    const neckType = NECK_TYPES[i % NECK_TYPES.length];
    const occasion = OCCASIONS[i % OCCASIONS.length];
    const status = statusCycle[i % statusCycle.length];
    
    const price = Math.floor(Math.random() * 2000) + 499;
    products.push({
      id: i + 100,
      name: `Premium ${color} ${subCategory}`,
      subtitle: `The Ultimate ${occasion} Essential`,
      category,
      subCategory,
      price: `₹${price}.00`,
      stock: status === 'Out of Stock' ? 0 : Math.floor(Math.random() * 200) + 10,
      status,
      fit,
      neckType,
      occasion,
      image: `https://images.unsplash.com/photo-${PHOTO_IDS[i % PHOTO_IDS.length]}?q=80&w=200&auto=format&fit=crop`
    });
  }
  return products;
};

const storeContent = fs.readFileSync(STORE_PATH, 'utf-8');
const products = generateProducts();
const productsJson = JSON.stringify(products, null, 6);

const startIdx = storeContent.indexOf('products: [');
const endIdx = storeContent.indexOf('],', startIdx) + 2;

if (startIdx !== -1 && endIdx !== -1) {
  const updatedContent = storeContent.substring(0, startIdx) + `products: ${productsJson},` + storeContent.substring(endIdx);
  fs.writeFileSync(STORE_PATH, updatedContent);
  console.log('✅ Updated adminStore.js with 200 refined products!');
} else {
  console.error('❌ Could not find products array in adminStore.js');
}
